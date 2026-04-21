---
title: "GCSA — Gaussian Classifier Surface Array (.gcs)"
type: format
fs_version: "8.2.0"
file_extensions: [".gcs"]
produced_by:
  - "[[mris_ca_train]]"
consumed_by:
  - "[[mris_ca_label]]"
  - "[[mris_register]]"
  - "[[mris_ca_train]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Embedded color-table block (TAG_OLD_COLORTABLE = 1): the binary CTAB layout is documented in utils/colortab.cpp and should get its own [[ctab-format]] page."
  - "GCSAclassify() Gibbs MRF inference loop (in gcsa.cpp around line 1500) is not yet traced — the file format documents what is *stored*, not the iterative inference that consumes it."
tags:
  - registration
  - parcellation
  - atlas
  - gibbs-mrf
  - cortical-labelling
---

# GCSA — Gaussian Classifier Surface Array (`.gcs`)

## Overview

A **GCSA** file (`.gcs`) stores a per-vertex Bayesian classifier on the
cortical sphere. It is the on-disk representation of the
`GAUSSIAN_CLASSIFIER_SURFACE_ARRAY` C++ class declared in
`include/gcsa.h` and is the format used by FreeSurfer's automatic
cortical parcellation tools ([[mris_ca_label]] for cortical
parcellation, and [[mris_register]] when manual label constraints are
imposed via `-L`).

Conceptually, a GCSA is a **per-vertex prior + likelihood model** on a
spherical icosahedral mesh:

- A **prior surface** (typically `ic7`, 163 842 vertices) stores, at
  each vertex, the marginal class prior $P(L)$ together with an
  anisotropic Gibbs Markov-random-field neighbourhood prior
  $P(L \mid L_{\text{neigh}})$ for the four cardinal directions on the
  surface.
- A **classifier surface** (typically `ic4`, 2 562 vertices, coarser
  because Gaussian fits need more samples than histograms) stores, at
  each vertex, a per-class multivariate Gaussian $N(\mu_L, \Sigma_L)$
  over the input feature vector — usually the inflated mean curvature
  and the sulcal depth.

Inference at a target vertex computes the maximum *a posteriori* label

$$\hat{L} = \arg\max_{L}\; P(L) \cdot N(x; \mu_L, \Sigma_L) \cdot \prod_{i=1}^{4} P(L_{\text{neigh}_i} \mid L)$$

where $x$ is the input feature vector at that vertex (resampled from the
subject's `?h.sphere.reg` to the GCSA's classifier mesh by nearest
neighbour via the GCSA's hash table).

The header comment of `include/gcsa.h` summarises the design as
*"the heart of the cortical parcellation code — implements an
anisotropic nonstationary MRF on the surface."*

## In-Memory Structure

```c
class GAUSSIAN_CLASSIFIER_SURFACE_ARRAY {
public:
  MRI_SURFACE     *mris_priors;       /* prior icosahedron, e.g. ic7 (163842 v) */
  MRI_SURFACE     *mris_classifiers;  /* classifier icosahedron, e.g. ic4 (2562 v) */
  CP_NODE         *cp_nodes;          /* one per prior vertex */
  GCSA_NODE       *gc_nodes;          /* one per classifier vertex */
  int              ninputs;           /* feature-vector length, ≤ GCSA_MAX_INPUTS=10 */
  int              icno_priors;       /* ico subdivision number for priors */
  int              icno_classifiers;  /* ico subdivision number for classifiers */
  MRIS_HASH_TABLE *mht_priors;        /* spatial hash for nearest-vertex lookup */
  MRIS_HASH_TABLE *mht_classifiers;
  GCSA_INPUT       inputs[GCSA_MAX_INPUTS]; /* per-input metadata */
  char            *ptable_fname;      /* color lookup table file name */
  COLOR_TABLE     *ct;
  MRI             *inputvals;         /* in-memory feature buffer; not on disk */
};
```

The hash tables (`mht_*`) and the meshes themselves are not stored in
the file; they are reconstructed on read by `GCSAalloc()` from the local
icosahedron tessellations under `$FREESURFER_HOME/lib/bem/ic<n>.tri`.
Only the icosahedral subdivision indices `icno_priors` and
`icno_classifiers` need to be persisted to make this work.

### Per-node structures

```c
typedef struct {                  /* one per classifier-mesh vertex */
  int     nlabels;                /* distinct labels seen at this node */
  int     max_labels;             /* allocation slack */
  int    *labels;                 /* nlabels-long array of annotation ints */
  GCS    *gcs;                    /* nlabels-long array of Gaussian classifiers */
  int     total_training;         /* sum of per-label sample counts */
} GCSA_NODE;

typedef struct {                  /* one Gaussian per (vertex, label) pair */
  VECTOR *v_means;                /* ninputs × 1 mean vector */
  MATRIX *m_cov;                  /* ninputs × ninputs covariance matrix */
  int     total_training;         /* per-class training-sample count */
  int     regularized;            /* 1 if covariance was regularised post-fit */
} GCS;

typedef struct {                  /* one per prior-mesh vertex */
  int     nlabels;
  int     max_labels;
  int    *labels;                 /* nlabels-long array of annotation ints */
  CP     *cps;                    /* nlabels-long class-prior records */
  int     total_training;
} CP_NODE;

typedef struct {                  /* per-(vertex, label) prior + MRF block */
  float   prior;                  /* marginal P(L) at this vertex */
  float  *label_priors[4];        /* P(L_neigh | L) for 4 directions */
  int    *labels[4];              /* neighbour labels seen, per direction */
  short   nlabels[4];             /* # of distinct neighbour labels per direction */
  int     total_nbrs[4];          /* # of neighbour samples accumulated per direction */
} CLASS_PRIORS, CP;
```

`GIBBS_SURFACE_NEIGHBORHOOD = 4` — the four "cardinal" directions on the
icosahedral mesh used for the anisotropic Gibbs MRF.

## On-Disk Structure

The GCSA file is a single-stream big-endian binary file (FreeSurfer
convention; written by `fwriteInt`/`fwriteFloat` in `utils/fio.cpp`,
which byte-swap on little-endian hosts before writing). The body of the
file is interrupted in two places by **ASCII matrix blocks** for the
mean vectors and covariance matrices — these are written by
`MatrixAsciiWriteInto` (`utils/matrix.cpp:2179`), so the file is a hybrid
binary/ASCII container.

The full layout below is from `GCSAwrite()` (`utils/gcsa.cpp:529`) and
`GCSAread()` (`utils/gcsa.cpp:777`). All multi-byte integers are
**big-endian**.

### 1. File header (16 bytes)

| Offset | Type | Field | Notes |
|--------|------|-------|-------|
| 0 | int32 | magic | `GCSA_MAGIC = 0xababcdcd` |
| 4 | int32 | `ninputs` | number of input channels in the feature vector (≤ `GCSA_MAX_INPUTS = 10`) |
| 8 | int32 | `icno_classifiers` | icosahedral subdivision number used for the classifier mesh (e.g., 4) |
| 12 | int32 | `icno_priors` | icosahedral subdivision number used for the prior mesh (e.g., 7) |

The two icosahedral indices imply the mesh sizes via the standard
recursive subdivision of an icosahedron:

| `ic<n>` | vertices | faces |
|---------|----------|-------|
| 0 | 12 | 20 |
| 1 | 42 | 80 |
| 2 | 162 | 320 |
| 3 | 642 | 1 280 |
| 4 | 2 562 | 5 120 |
| 5 | 10 242 | 20 480 |
| 6 | 40 962 | 81 920 |
| 7 | 163 842 | 327 680 |

Standard FreeSurfer GCSA atlases use `(icno_classifiers, icno_priors)
= (4, 7)`.

### 2. Per-input metadata block (`ninputs` records)

For each `i` in `[0, ninputs)`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `type` | Input type code: `GCSA_INPUT_CURVATURE = 0` (use the surface's stored curvature) or `GCSA_INPUT_CURV_FILE = 1` (read from a named [[curv-format|curvature file]]) |
| int32 | `fname_len` | length of `fname` in bytes, **including the trailing NUL** (i.e., `strlen(fname) + 1`) |
| char[`fname_len`] | `fname` | the source curvature filename (e.g., `"sulc"`, `"inflated.H"`); NUL-terminated |
| int32 | `navgs` | number of smoothing passes applied to the input before training |
| int32 | `flags` | bitfield: `GCSA_NORMALIZE = 0x1` is the only currently defined bit |

For the standard Desikan-Killiany classifier
(`?h.curvature.buckner40.filled.desikan_killiany.<date>.gcs`):
`ninputs = 2`, with `inputs[0].fname = "inflated.H"` and
`inputs[1].fname = "sulc"`.

### 3. Likelihood section — Gaussian classifiers

For each classifier-mesh vertex `vno` in `[0, ICO[icno_classifiers].nv)`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `nlabels` | number of distinct labels with non-empty Gaussian fit at this node |
| int32 | `total_training` | total number of training samples accumulated at this node |
| (then `nlabels` repetitions of the GCS record below) |

For each `n` in `[0, nlabels)`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `label` | annotation integer (RGBA-packed via `CTABannotationAtIndex`) |
| int32 | `total_training` | per-(node, label) sample count |
| ASCII matrix | `v_means` | the `ninputs × 1` mean vector |
| ASCII matrix | `m_cov` | the `ninputs × ninputs` covariance matrix |

**ASCII matrix block format** (from
`MatrixAsciiWriteInto`, `utils/matrix.cpp:2179`):

```
<type> <rows> <cols>\n
<+f> <+f> ... <+f>  \n
<+f> <+f> ... <+f>  \n
...                 (rows lines total)
```

- `type` is `MATRIX_REAL = 1` (or `MATRIX_COMPLEX = 2`, never used in
  GCSA files).
- Each value is printed with the printf format `"%+f  "` (forced sign,
  default precision 6, two trailing spaces between cells).
- The header line ends with a single newline; each data row also ends
  with a newline.
- The reader (`MatrixAsciiReadFrom`, `utils/matrix.cpp:2196`) uses
  `fgetl` to read the first line and `fscanf("%f  ")` for each cell,
  followed by a `fscanf("\n")` that swallows the row terminator.

> [!gotcha] Inline ASCII inside a binary stream
> The mean and covariance blocks are written as plain text *into the
> middle of the binary file*, with no length prefix. A reader that does
> not understand the embedded format cannot skip over them by byte count
> — it must parse them character-by-character to find where the next
> binary integer starts. This makes the GCSA file painful to inspect
> with `hexdump` and impossible to extend with a generic
> length-prefixed tag scheme.

### 4. Prior section — class priors and Gibbs MRF

For each prior-mesh vertex `vno` in `[0, ICO[icno_priors].nv)`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `nlabels` | distinct labels with non-zero observed prior at this vertex |
| int32 | `total_training` | total sample count at this vertex |
| (then `nlabels` repetitions of the CP record below) |

For each `n` in `[0, nlabels)`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `label` | annotation integer |
| float32 | `prior` | $P(L = \text{label})$ at this vertex (estimated from training frequencies) |
| (then `GIBBS_SURFACE_NEIGHBORHOOD = 4` repetitions of the directional MRF record) |

For each direction `i` in `[0, 4)`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `total_nbrs[i]` | total samples observed in direction `i` |
| int32 | `nlabels[i]` | distinct neighbour labels seen in direction `i` |
| (then `nlabels[i]` repetitions of the conditional record below) |

For each `j` in `[0, nlabels[i])`:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `labels[i][j]` | neighbour annotation integer |
| float32 | `label_priors[i][j]` | $P(L_{\text{neigh}_i} = \text{labels}[i][j] \mid L = \text{label})$ |

The four directions are *not* the four geometric edges of the icosahedral
mesh (vertices have degree 5 or 6); they are four discretised compass
directions in the local tangent plane, indexed in the same order at
training and inference time. The Gibbs MRF is therefore *anisotropic* by
construction.

### 5. Optional footer — embedded color table

After the per-vertex prior records, the file may contain one or more
TLV-style tagged blocks. The only tag currently emitted is:

| Type | Field | Notes |
|------|-------|-------|
| int32 | `tag` | `TAG_OLD_COLORTABLE = 1` (defined in `include/tags.h`) |
| (binary block) | embedded color table | written by `CTABwriteIntoBinary()` (in `utils/colortab.cpp`) |

The reader loops with `while (!feof(fp))` reading 4-byte tags; any
unknown tag is currently ignored (`default: break`), so additional tag
types can be added without breaking older readers — provided each new
block has a length prefix or self-terminating structure that
`CTABreadFromBinary`-style logic can consume.

The [[color-lut|color table]] maps each annotation integer (stored as `label` above) to
a human-readable name and an RGBA tuple. Without it, downstream tools
display labels as `** annotate` placeholders.

> [!gap] CTAB binary block
> The on-disk format of `CTABwriteIntoBinary` (and its companion
> `CTABreadFromBinary`) is not yet documented in this wiki. It includes
> a version int, a version-dependent header, and a per-entry
> `(name, R, G, B, A)` record. The format should get its own
> [[ctab-format]] page.

> [!gotcha] Mac-OS feof bug workaround
> `GCSAread` contains a hand-coded workaround for an old bug where
> `feof()` looped twice instead of once on Mac OS X Tiger, causing the
> in-memory `gcsa->ct` to be overwritten with an empty `tmp_ct`
> (`utils/gcsa.cpp:893–903`). The current code only assigns the
> embedded color table if `nentries > 0` and `fname` is non-empty.
> The bug was the cause of `mris_anatomical_stats` printing
> `** annotate` instead of label names.

## Mathematical Model

### Likelihood

For a target vertex `v` with feature vector $x \in \mathbb{R}^{n_{\text{inputs}}}$,
the per-class likelihood at the nearest classifier-mesh node is

$$p(x \mid L = \ell) \;=\; \frac{1}{(2\pi)^{n_{\text{inputs}}/2}\sqrt{\lvert \Sigma_{\ell} \rvert}} \;\exp\!\left(-\tfrac{1}{2}\,(x - \mu_{\ell})^{\!\top} \Sigma_{\ell}^{-1} (x - \mu_{\ell})\right)$$

with $(\mu_\ell, \Sigma_\ell)$ read from the GCS record for that
(node, label) pair.

### Prior with Gibbs MRF

The per-vertex prior at the nearest prior-mesh node combines a marginal
class prior with the four directional conditionals:

$$p(L = \ell \mid L_{\text{neigh}}) \;\propto\; \pi_{\ell}(v) \cdot \prod_{i=1}^{4} P\!\left(L_{\text{neigh}_i} \mid L = \ell\right)$$

where $\pi_\ell(v)$ is the `prior` field of the CP record. Note that
*neighbour labels* are conditioned on the central label, not the other
way around — this is the standard Bayes-rule re-arrangement that allows
a generative parameterisation of an MRF.

### Posterior and inference

At inference time, [[mris_ca_label]] iteratively updates each vertex's
label by:

$$\hat{L}(v) \;=\; \arg\max_{\ell}\; \pi_{\ell}(v) \cdot p(x_v \mid \ell) \cdot \prod_{i=1}^{4} P\!\left(\hat{L}(v_{\text{neigh}_i}) \mid \ell\right)$$

The product over neighbour labels couples vertices, so the
maximum-posterior assignment is solved by Iterated Conditional Modes
(ICM) — a few sweeps over the surface until convergence. The exact ICM
loop lives in the shared `gcsa.cpp` library and is invoked from
`GCSAreclassifyUsingGibbsPriors()`.

> [!gap] ICM loop details
> The convergence criterion, sweep order, and the exact handling of
> ripped vertices in the GCSAreclassifyUsingGibbsPriors() loop are not
> documented here yet. See `utils/gcsa.cpp` around line 1500 for the
> implementation.

## Standard Atlases Shipped with FreeSurfer

Found in `$FREESURFER_HOME/average/`:

| File | Parcellation | `(ic_class, ic_prior)` | Source |
|------|--------------|-----------------------|--------|
| `?h.curvature.buckner40.filled.desikan_killiany.2010-03-25.gcs` | Desikan-Killiany ([[mri_aparc2aseg]] `aparc.annot`) | `(4, 7)` | Buckner-40 training set |
| `?h.aparc.a2009s.gcs` | Destrieux (`aparc.a2009s.annot`) | `(4, 7)` | Destrieux 2010 training set |
| `?h.DKTatlas40.gcs` (or `?h.aparc.DKTatlas.gcs`) | DKT-40 (`aparc.DKTatlas.annot`) | `(4, 7)` | Klein & Tourville 2012 |

All three are read in turn by [[mris_ca_label]] in autorecon3 to produce
the three cortical annotation files; cf. `recon-all` lines 4339–4375.

## Tools That Read/Write This Format

| Tool | R/W | Notes |
|------|-----|-------|
| [[mris_ca_train]] | W | Iterates over a training subject set, accumulates per-vertex Gaussian fits and Gibbs MRF counts, writes the `.gcs` |
| [[mris_ca_label]] | R | Loads the `.gcs`, runs Gibbs ICM inference on the subject's `?h.sphere.reg`, writes an [[annotation-format|annotation file]] |
| [[mris_register]] | R | When the `-L` flag is used, reads a `.gcs` solely to look up the integer annotation associated with a manual label name (see `mris_register.cpp:1227`); the Gaussians and Gibbs MRF are not exercised |
| [[mri_ca_label]] | (read shared lib) | The volumetric counterpart `mri_ca_label` uses the related [[gca-format|`.gca`]] file format — *not* `.gcs`. Do not confuse the two: GCS is for surfaces, GCA is for volumes |

## Conversion

There is no general-purpose conversion tool for `.gcs`. To inspect the
content programmatically:

- **`mris_ca_label -dump`** (if compiled in) prints the per-vertex
  classifier statistics to stdout via the `dump_gcsan()` helper in
  `gcsa.cpp`.
- **`mris_ca_train -relabel_unlikely`** can be used to round-trip a
  GCSA through training to filter out under-trained labels.

To generate a fresh atlas, use `mris_ca_train` over a labelled training
set; see `recon-all`-tutorial scripts and the FreeSurfer wiki tutorial
on training a parcellation atlas.

## Gotchas

> [!gotcha] GCS ≠ GCA
> **GCSA / `.gcs`** is a *surface* classifier on an icosahedral
> spherical mesh. **GCA / `.gca`** is the *volumetric* counterpart used
> by [[mri_ca_label]] and [[mri_em_register]]. They share the
> "Gaussian classifier with Gibbs MRF prior" idea but their on-disk
> formats and the hash tables they use are completely different. Do not
> attempt to read a `.gca` with `GCSAread` or vice versa: the magic
> numbers differ (`GCSA_MAGIC = 0xababcdcd` vs. the GCA magic).

> [!gotcha] No length prefix on ASCII matrix blocks
> Because the per-classifier-vertex records contain inline ASCII
> matrices with no byte-length prefix, you cannot seek over a single
> classifier-vertex record by adding a constant offset. A robust reader
> must parse the ASCII blocks character-by-character (with `fgetl` /
> `fscanf` on the matrix headers) to find the start of the next binary
> integer. The total file size is therefore not a simple function of
> `(nv_class, nv_prior, ninputs)`.

> [!gotcha] `inputs[i].fname` is read with no bounds check on STRLEN
> `GCSAread` reads `fname_len` bytes directly into `gcsa->inputs[i].fname`
> (`utils/gcsa.cpp:809`), which is a fixed `STRLEN`-sized buffer
> (default 256 bytes). A maliciously crafted GCSA file with
> `fname_len > STRLEN` will produce a stack overflow. This is unlikely
> to be a problem in practice (atlases are not user-supplied) but is
> worth noting for code review.

> [!gotcha] Singular covariance matrices are silently regularised
> `GCSAread` calls `gcsaFixSingularCovarianceMatrices(gcsa)` immediately
> before returning (`utils/gcsa.cpp:911`), which adds a small ridge to
> the diagonal of any covariance matrix whose determinant is below a
> threshold and sets `regularized = 1` in the corresponding GCS. Users
> who depend on the literal stored covariances (e.g., for diffing two
> atlases at maximum precision) should re-read using `GCSAreadOnly`
> if available, or skip the fix call.

> [!gotcha] icno_priors and icno_classifiers must match the bundled icos
> `GCSAalloc()` reads the icosahedron tessellation from
> `$FREESURFER_HOME/lib/bem/ic<icno>.tri`. The atlas file does *not*
> ship with its own ico mesh — it relies on the version of FreeSurfer
> at run time providing exactly the same vertex ordering for that ico
> level. The bundled `.tri` files have been stable since at least
> FreeSurfer 5.x, but a custom rebuild that regenerates the icos with a
> different RNG seed will silently render existing GCSA atlases
> meaningless (each vertex's classifier will land at a different
> spherical location).

> [!gotcha] Annotation integers are RGBA-packed
> The `label` integers stored in the file are not class indices — they
> are RGBA-packed annotations of the form
> `R | (G << 8) | (B << 16) | (A << 24)`, the same convention used by
> FreeSurfer annotation (`.annot`) files. To map a label integer back
> to a human-readable parcellation name, the embedded color table block
> at the file's tail (or an external `?h.aparc.annot.ctab` matched by
> `ptable_fname`) must be consulted via
> `CTABfindAnnotation(ct, label, &index)`.

## References

- Fischl, B., van der Kouwe, A., Destrieux, C., Halgren, E.,
  Ségonne, F., Salat, D.H., et al. (2004). *Automatically parcellating
  the human cerebral cortex.* Cerebral Cortex 14(1): 11–22.
  (Method paper for the GCSA classifier and Gibbs MRF inference used by
  [[mris_ca_label]].)
- Desikan, R.S., Ségonne, F., Fischl, B., Quinn, B.T., Dickerson, B.C.,
  Blacker, D., et al. (2006). *An automated labeling system for
  subdividing the human cerebral cortex on MRI scans into gyral based
  regions of interest.* NeuroImage 31(3): 968–980.
  (Source of the Desikan-Killiany parcellation that ships as
  the standard `.gcs` atlas.)
- Source: `include/gcsa.h` (header comment + struct definitions),
  `utils/gcsa.cpp:529` (`GCSAwrite`), `utils/gcsa.cpp:777` (`GCSAread`),
  `utils/matrix.cpp:2179` (`MatrixAsciiWriteInto`),
  `utils/fio.cpp:270` (`fwriteInt` / big-endian convention),
  `include/tags.h:33` (`TAG_OLD_COLORTABLE`).
- Related wiki pages: [[mris_ca_label]], [[mri_ca_label]],
  [[mris_register]], [[surface-representations]], [[mrisp-tif]] for the
  companion spherical parameterization format.
