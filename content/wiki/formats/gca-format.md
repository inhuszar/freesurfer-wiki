---
title: "FreeSurfer Gaussian Classifier Atlas (.gca)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".gca"
produced_by:
  - "[[mri_ca_train]]"
  - "[[gcatrain]]"
  - "[[gcainit]]"
  - "[[gcatrainskull]]"
  - "[[jkgcatrain]]"
consumed_by:
  - "[[mri_ca_label]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_register]]"
  - "[[mri_em_register]]"
  - "[[gca-apply]]"
related:
  - "[[gcsa-format]]"
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
  - "[[mgz]]"
  - "[[ctab-format]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact training subject count for each shipped atlas (RB_all_2020-01-02.gca etc.) is not recoverable from the file itself; only total_training counts per node are stored."
  - "The aseg+spmhead.ixi.gca and aseg+spmhead+vermis+pons.ixi.gca atlases are not invoked by recon-all; their precise provenance and intended use has not been traced."
  - "GCA_PARAM (T1/PD) mode: the exact on-disk difference from GCA_NORMAL has not been fully traced."
tags:
  - format
  - atlas
  - segmentation
  - gca
  - classifier
---

# FreeSurfer Gaussian Classifier Atlas (`.gca`)

## Overview

A **GCA file** (`.gca`) stores a three-dimensional **Gaussian Classifier
Atlas** — a volumetric probabilistic model of brain anatomy used for
automatic subcortical segmentation. It is the on-disk serialisation of
the `GAUSSIAN_CLASSIFIER_ARRAY` (alias `GCA`) C structure declared in
`include/gca.h` and implemented in `utils/gca.cpp`.

The atlas is defined in **MNI305 ("Talairach") space** and covers a
default volume of $256 \times 256 \times 256$ voxels at a reference
resolution of 1 mm isotropic. At each atlas location the file stores:

1. **Gaussian intensity statistics** — mean and covariance of the MRI
   signal for each anatomical class that occurs at that location (the
   *node* grid, usually at 4 mm spacing).
2. **Markov Random Field (MRF) neighbourhood priors** — for each class
   at each node, the empirical probability of each label in each of the
   six cardinal neighbours (the Gibbs field).
3. **Marginal prior probabilities** — the fraction of training subjects
   that had each label at each atlas location (the *prior* grid, usually
   at 2 mm spacing, finer than the node grid).
4. **Coordinate geometry** — the direction cosines and voxel sizes that
   define the atlas's native RAS frame.
5. **A [[color-lut|color table]]** — mapping integer label IDs to anatomical names and
   display colours.

The GCA format is distinct from, and should not be confused with, the
**GCSA format** (`.gcs` files; see [[gcsa-format]]), which is a
surface-based atlas used for cortical parcellation by `mris_ca_label`.
The GCA is a *volumetric* model; the GCSA is a *surface* model. Their
statistical machinery is related but their file formats are entirely
different.

**Primary reference:** Fischl B et al. (2002). "Whole Brain
Segmentation: Automated Labeling of Neuroanatomical Structures in the
Human Brain." *Neuron* 33(3):341–355.

---

## The GCA Statistical Model

### Per-node Gaussian likelihood

For each atlas node $\mathbf{x}$ and anatomical label $k$, the atlas
stores a multivariate Gaussian model of the MRI intensity vector
$\mathbf{v} \in \mathbb{R}^{n}$ (where $n$ = `ninputs`, typically 1 for
standard T1):

$$
p(\mathbf{v} \mid \text{label}=k,\, \mathbf{x}) =
\frac{1}{(2\pi)^{n/2}\,|\Sigma_k(\mathbf{x})|^{1/2}}
\exp\!\left(-\tfrac{1}{2}\, d^2_M\right)
$$

where the **squared Mahalanobis distance** is:

$$
d^2_M = \bigl(\mathbf{v} - \boldsymbol{\mu}_k(\mathbf{x})\bigr)^\top
         \Sigma_k(\mathbf{x})^{-1}
         \bigl(\mathbf{v} - \boldsymbol{\mu}_k(\mathbf{x})\bigr)
$$

For a single input ($n=1$) this reduces to:

$$
d^2_M = \frac{(v - \mu_k)^2}{\sigma^2_k}
$$

The parameters $\boldsymbol{\mu}_k(\mathbf{x})$ and
$\Sigma_k(\mathbf{x})$ are learned from manually labelled training
subjects (see `GCAcompleteMeanTraining()` and
`GCAcompleteCovarianceTraining()` in `utils/gca.cpp`).

> [!internal] Source reference
> `GCAcomputeConditionalDensity()` and `GCAcomputeConditionalLogDensity()`
> in `utils/gca.cpp` ([lines 12255–12318](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12255-L12318)) implement the Gaussian
> likelihood. `GCAmahDist()` ([line 12848](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12848)) computes the Mahalanobis
> distance. For a single input, `gc->covars[0]` is the scalar variance
> $\sigma^2_k$.

### Prior probabilities

At each **prior grid** location $\mathbf{x}_p$, the atlas stores the
empirical fraction of training subjects that carried each label:

$$
\pi_k(\mathbf{x}_p) = P(\text{label}=k \mid \mathbf{x}_p)
$$

These are stored as normalised floats in the `GCA_PRIOR` struct.

### MAP labeling with Gibbs MRF

Segmentation is performed as **maximum a posteriori (MAP)** estimation
over a Markov Random Field. Given intensity $\mathbf{v}$ at voxel
$\mathbf{x}$ and labels of its six face-connected neighbours
$\{L_i\}_{i=1}^{6}$, the log-posterior is:

$$
\log p(k \mid \mathbf{v}, \{L_i\}) \propto
\underbrace{\log p(\mathbf{v} \mid k,\, \mathbf{x})}_{\text{Gaussian likelihood}}
+ \underbrace{\log \pi_k(\mathbf{x}_p)}_{\text{atlas prior}}
+ \underbrace{\sum_{i=1}^{6} \log P(L_i \mid \text{label}=k,\, \mathbf{x})}_{\text{Gibbs neighbourhood prior}}
$$

The neighbourhood term uses empirical pairwise label co-occurrence
counts learned from training data (the `label_priors` arrays in `GC1D`).
The MRF is anisotropic and non-stationary: the co-occurrence
probabilities depend on both the direction of the neighbour ($i$) and
the atlas location ($\mathbf{x}$).

Inference alternates MAP updates across all voxels (iterated conditional
modes) until convergence. This is implemented in
`GCAreclassifyUsingGibbsPriors()` in `utils/gca.cpp`.

> [!internal] Source reference
> `gcaGibbsLogPosterior()` in `utils/gca.cpp` ([line 21289](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L21289)) is the core
> scoring function. It returns
> `log_likelihood + sum(log(label_priors[i][j])) + log(prior)` for a
> candidate label at a node.

---

## Key Data Structures

All structures are declared in `include/gca.h`.

### `GCA` — the atlas container

```c
typedef struct {
  float     node_spacing;    // inter-node spacing in mm (default 4.0)
  float     prior_spacing;   // inter-prior spacing in mm (default 2.0)
  int       node_width;      // = floor(width / node_spacing)
  int       node_height;
  int       node_depth;
  GCA_NODE  ***nodes;        // [node_width][node_height][node_depth]
  int       prior_width;     // = floor(width / prior_spacing)
  int       prior_height;
  int       prior_depth;
  GCA_PRIOR ***priors;       // [prior_width][prior_height][prior_depth]
  int       ninputs;         // number of MRI contrast channels
  int       flags;           // bitfield: GCA_NO_MRF, GCA_FLASH, etc.
  int       type;            // GCA_NORMAL=0, GCA_FLASH=1, GCA_PARAM=2
  double    TRs[MAX_GCA_INPUTS];  // TR (ms) per channel (FLASH only)
  double    FAs[MAX_GCA_INPUTS];  // flip angle (rad) per channel
  double    TEs[MAX_GCA_INPUTS];  // TE (ms) per channel
  // Direction cosines for the atlas RAS frame:
  float     x_r, x_a, x_s;
  float     y_r, y_a, y_s;
  float     z_r, z_a, z_s;
  float     c_r, c_a, c_s;  // RAS coords of volume centre
  int       width, height, depth;   // reference volume dimensions (voxels)
  float     xsize, ysize, zsize;    // reference voxel size (mm)
  int       total_training;
  int       max_label;
  COLOR_TABLE *ct;           // embedded color table
} GCA;
```

**`MAX_GCA_INPUTS`** is 100; **`DEFAULT_VOLUME_SIZE`** is 256; the
default reference volume is therefore $256^3$ voxels at 1 mm.

### `GCA_NODE` — per-atlas-node statistics

```c
typedef struct {
  int             nlabels;        // number of distinct labels at this node
  int             max_labels;     // capacity (allocated)
  unsigned short *labels;         // label IDs, length nlabels
  GC1D           *gcs;            // Gaussian classifiers, one per label
  int             total_training; // total training voxels mapped to this node
} GCA_NODE;
```

### `GC1D` — per-class Gaussian classifier

```c
typedef struct {
  float   *means;          // mean vector, length ninputs
  float   *covars;         // upper-triangular covariance, length ninputs*(ninputs+1)/2
  float  **label_priors;   // [GIBBS_NEIGHBORS][nlabels[i]] — MRF transition probs
  unsigned short **labels; // [GIBBS_NEIGHBORS][nlabels[i]] — neighbour label IDs
  short   *nlabels;        // [GIBBS_NEIGHBORS] — count per direction
  short    n_just_priors;  // number of entries with only prior info (no Gaussian)
  int      ntraining;      // weighted training count = total_training * prior
  char     regularized;    // flag: covariance was regularized
} GC1D;
```

**Covariance storage:** `covars` holds the upper triangle of
$\Sigma_k$ in row-major order. For $n$ inputs the array has
$n(n+1)/2$ elements: element index $i$ corresponds to entry
$(r, c)$ where $r \leq c$, enumerated as:
$(0,0),(0,1),\ldots,(0,n-1),(1,1),(1,2),\ldots,(n-1,n-1)$.
The full symmetric matrix is reconstructed by
`load_covariance_matrix()` ([[`utils/gca.cpp:12977`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12977)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12977)).

**`GIBBS_NEIGHBORS`** is 6 (the six face-connected neighbours in 3D).

### `GCA_PRIOR` — per-prior-node label probabilities

```c
typedef struct {
  short           nlabels;        // number of distinct labels at this prior node
  short           max_labels;
  unsigned short *labels;         // label IDs, length nlabels
  float          *priors;         // normalised prior probabilities, length nlabels
  int             total_training; // total training count at this prior node
} GCA_PRIOR;
```

### Flags bitfield

| Flag constant | Value | Meaning |
|---|---|---|
| `GCA_NO_FLAGS` | `0x0000` | Standard atlas |
| `GCA_NO_MRF` | `0x0001` | Omit Gibbs neighbourhood data (smaller file) |
| `GCA_XGRAD` | `0x0002` | Include x-gradient as additional input |
| `GCA_YGRAD` | `0x0004` | Include y-gradient |
| `GCA_ZGRAD` | `0x0008` | Include z-gradient |
| `GCA_NO_GCS` | `0x0010` | No Gaussian classifiers (prior only) |
| `GCA_NO_LH` | `0x0020` | Left hemisphere removed |
| `GCA_NO_RH` | `0x0040` | Right hemisphere removed |
| `GCA_NO_CEREBELLUM` | `0x0080` | Cerebellum removed |

When `GCA_NO_MRF` is set, the `label_priors`, `labels`, and `nlabels`
arrays of each `GC1D` are not allocated or written. The MRF Gibbs
posterior reduces to a pure likelihood × prior product.

---

## File Layout

The file is written and read by `GCAwrite()` and `GCAread()` in
`utils/gca.cpp` ([lines 2070–2655](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2070-L2655)). Files may optionally be gzip-compressed
(`.gcz` extension; detected from the filename suffix). All multi-byte
scalar types are written in **big-endian** byte order. On little-endian
hosts the `znzwriteInt()` and `znzwriteFloat()` functions in
`utils/fio.cpp` perform byte-swapping before writing; readers apply the
reverse swap. This matches the convention used throughout FreeSurfer
binary formats (e.g., [[mgz]]).

### Version numbering

| Version float | Label encoding | Prior grid |
|---|---|---|
| `< 4.0` (legacy) | `uint8` | Same resolution as node grid |
| `4.0` (`GCA_UCHAR_VERSION`) | `uint8` | Separate finer prior grid |
| `5.0` (`GCA_INT_VERSION`) | `int32` | Separate finer prior grid |

All files shipped with FreeSurfer 8.2.0 use version `5.0`.

### Section 1 — Fixed-size header

All fields are written in order:

| Offset (bytes) | Type | Field | Notes |
|---|---|---|---|
| 0 | `float32` | version | `5.0` for current format |
| 4 | `float32` | prior_spacing | e.g. `2.0` mm |
| 8 | `float32` | node_spacing | e.g. `4.0` mm |
| 12 | `int32` | prior_width | |
| 16 | `int32` | prior_height | |
| 20 | `int32` | prior_depth | |
| 24 | `int32` | node_width | |
| 28 | `int32` | node_height | |
| 32 | `int32` | node_depth | |
| 36 | `int32` | ninputs | number of MRI channels |
| 40 | `int32` | flags | GCA_* bitfield |

Total header: **44 bytes**.

### Section 2 — Node grid

Iterates `x` (0..node_width−1), then `y`, then `z` (innermost). For
each node:

```
int32   gcan->nlabels
int32   gcan->total_training
  for each label n in [0, nlabels):
    int32   gcan->labels[n]           (label ID as unsigned short, written as int32)
    for r in [0, ninputs):
      float32   gc->means[r]
    for r in [0, ninputs), c in [r, ninputs):   (upper triangle, row-major)
      float32   gc->covars[i]
    if NOT GCA_NO_MRF:
      for i in [0, GIBBS_NEIGHBORS):            (6 directions)
        int32   gc->nlabels[i]
        for j in [0, gc->nlabels[i]):
          int32   gc->labels[i][j]    (neighbour label, as int32)
          float32 gc->label_priors[i][j]
```

The covariance upper triangle has $n_{\text{inputs}}(n_{\text{inputs}}+1)/2$
float32 elements. For a standard single-channel atlas ($n=1$) this is
one float: the scalar variance $\sigma^2_k$.

For a 6-neighbour MRF entry with $m_i$ observed neighbour labels, the
size is $1 + m_i \times (4 + 4)$ bytes per direction.

### Section 3 — Prior grid

Iterates `x` (0..prior_width−1), then `y`, then `z`. For each prior
node:

```
int32   gcap->nlabels
int32   gcap->total_training
  for each label n in [0, nlabels):
    int32   gcap->labels[n]     (label ID as unsigned short, written as int32)
    float32 gcap->priors[n]     (normalised prior probability)
```

### Section 4 — Tagged metadata

After both data sections a **tagged section** begins with a sentinel
`int32` equal to `FILE_TAG` (`0xab2c`). Within the tagged section,
inner tags are read until EOF. Each tag block has the format:

```
int32   tag_id
[int32  nparms]   (for TAG_PARAMETERS only)
...data...
```

Defined tag IDs (declared in `include/gca.h`):

| Tag value | Constant | Contents |
|---|---|---|
| `0x0001` | `TAG_PARAMETERS` | Per-channel MR parameters (TR, FA, TE as float32 triples); FLASH atlases only |
| `0x0002` | `TAG_GCA_TYPE` | `int32 nparms=1`, `int32 type` (0=normal, 1=FLASH, 2=T1/PD) |
| `0x0003` | `TAG_GCA_DIRCOS` | 12 float32 direction cosines + centre + 3 int32 dims + 3 float32 voxel sizes |
| `0x0004` | `TAG_GCA_COLORTABLE` | Binary color table in FreeSurfer CTAB format (see [[ctab-format]]) |

The `TAG_GCA_DIRCOS` block stores:

```
float32  x_r, x_a, x_s     (row direction cosines)
float32  y_r, y_a, y_s     (column direction cosines)
float32  z_r, z_a, z_s     (slice direction cosines)
float32  c_r, c_a, c_s     (RAS coordinates of volume centre)
int32    width, height, depth
float32  xsize, ysize, zsize
```

This block is **always written** from FreeSurfer 8.x onward
(unconditionally at the end of `GCAwrite()`), and is used by readers to
reconstruct the full vox2ras transform of the atlas reference volume.

The `TAG_GCA_COLORTABLE` block embeds a complete FreeSurfer color table
(the same binary format as the colortable footers of [[annotation-format|`.annot`]] and `.mgz`
files). When present, it is loaded into `gca->ct`. The standard shipped
atlases include an embedded colortable for the FreeSurfer CMA label set.

> [!gotcha] TAG_GCA_TYPE is always written
> Despite the comment in the source (`// if (gca->type == GCA_FLASH || gca->type == GCA_PARAM)`) the
> current `GCAwrite()` unconditionally writes `TAG_GCA_TYPE`. Older readers
> that do not handle this tag will print an "unknown tag" warning on
> standard (non-FLASH) atlases.

---

## Standard Atlas Files

All atlases reside in `$FREESURFER_HOME/average/`. The suffix `.gca`
denotes a volumetric subcortical GCA; `.gcs` denotes a surface
cortical GCSA.

| File | Size | Purpose | Default in recon-all |
|---|---|---|---|
| `RB_all_2020-01-02.gca` | 69 MB | Subcortical segmentation atlas; no skull | Yes, via `mri_ca_label` |
| `RB_all_2019_10_25.talxfm.mni305.gca` | 69 MB | Same atlas, alternative registration path (talairach.xfm, not `mri_em_register`) | When `EMRegAseg=0` |
| `RB_all_2016-05-10.vc700.gca` | 69 MB | Older version of the subcortical atlas | No |
| `RB_all_withskull_2020_01_02.gca` | 74 MB | Subcortical atlas with skull labels for EM registration | Yes, via `mri_em_register` |
| `RB_all_withskull_2019_10_22.talxfm.mni305.gca` | 73 MB | Skull atlas, alternative registration path | When `EMRegStrip=0` |
| `RB_all_withskull_2016-05-10.vc700.gca` | 73 MB | Older skull atlas | No |
| `talairach_mixed_with_skull.gca` | 63 MB | Coarser atlas used for Talairach registration and defacing | Yes (defacing, skull-strip) |
| `face.gca` | 32 MB | Face model used for defacing | Yes (defacing) |
| `wmsa_new_eesmith.gca` | 67 MB | White matter signal abnormality (WMSA) atlas | Optional post-processing |
| `aseg+spmhead.ixi.gca` | 113 MB | Extended atlas covering SPM head/neck region | Not called by recon-all |
| `aseg+spmhead+vermis+pons.ixi.gca` | 113 MB | Extended atlas with vermis and pons labels | Not called by recon-all |

**Default segmentation atlas:** In a standard `recon-all` run,
`mri_ca_label` uses `RB_all_2019_10_25.talxfm.mni305.gca` (when
EM registration is performed via `mri_em_register`) or the most recent
`RB_all_2020-01-02.gca` variant depending on configuration flags.

The `withskull` atlases differ from the `all` atlases by including
additional label classes for scalp and skull, enabling `mri_em_register`
to use skull shape for robust initial alignment before skull stripping.

> [!gap] Atlas training provenance
> The `RB` prefix refers to Roger Buckner, who led early atlas training.
> The files do not embed a training subject list; only per-node training
> counts (`total_training`) are stored. The date in the filename is the
> creation date of that version.

---

## Tools That Use GCA Files

| Tool | Operation | Atlas used |
|---|---|---|
| [[mri_ca_label]] | MAP subcortical segmentation; produces `aseg.auto_noCCseg.mgz` | `RB_all_*.gca` |
| [[mri_ca_normalize]] | Intensity normalisation guided by atlas priors | `RB_all_*.gca` |
| [[mri_ca_register]] | Nonlinear atlas-space registration (`talairach.m3z`) | `RB_all_*.gca` |
| [[mri_ca_train]] | Creates or updates a GCA from training subjects | Output file |
| [[mri_em_register]] | Atlas-guided linear registration (skull-on mode) | `RB_all_withskull_*.gca` or `talairach_mixed_with_skull.gca` |

### Atlas training and application drivers

These higher-level scripts wrap the `mri_ca_*` / `mri_em_register` binaries to
build a `.gca` from a cohort of manually labelled subjects, or to apply a
trained atlas to new data:

| Driver | Operation |
|---|---|
| [[gcatrain]] | Whole pipeline: prepares each training subject and iteratively builds the subcortical GCA (`gca.iNN.gca`) |
| [[gcainit]] | Builds the **initial** one-subject seed atlas (`gca.i01.gca`) that bootstraps [[gcatrain]] |
| [[gcatrainskull]] | Trains the **with-skull** atlas (`gca.skull.iNN.gca`) used by [[mri_em_register]] |
| [[jkgcatrain]] | Jackknife (leave-one-out) re-training of a `gcatrain` atlas for cross-validation |
| [[gca-apply]] | Applies a trained GCA to one subject, reproducing the four volumetric atlas stages of `recon-all` |

---

## Multi-Channel (FLASH) GCA

The GCA format supports **multi-echo FLASH** imaging with $n > 1$
input contrasts. In this mode:

- `gca->ninputs > 1` and `gca->type == GCA_FLASH` (or `GCA_PARAM`).
- Each `GC1D.means` is a vector of length `ninputs`.
- Each `GC1D.covars` is an upper-triangular covariance matrix of size
  $n(n+1)/2$ floats.
- The tag `TAG_PARAMETERS` stores the TR, flip angle, and TE for each
  channel so that signal intensities can be predicted from tissue
  parameters.

Tools `mri_ms_EM` and related multi-echo segmentation programs use FLASH
GCA atlases. Standard `recon-all` uses single-channel atlases only
(`ninputs=1`).

A FLASH GCA can be synthesised from a GCA_PARAM atlas (T1/PD space)
using `GCAcreateFlashGCAfromParameterGCA()`. The resulting file is
still a valid `.gca` file with the standard layout, but with `type=1`
and `TAG_PARAMETERS` present.

---

## Coordinate System

The GCA is defined in **MNI305 space** (what FreeSurfer calls "Talairach
space"). The `TAG_GCA_DIRCOS` block encodes the atlas's direction cosines
and voxel sizes as stored in its reference MRI header.

To use a GCA for segmentation, the input scan must be registered to this
space via a transform stored in a [[m3z-format|`.m3z`]] (nonlinear) or [[lta-format|`.lta`]] (linear)
file:

1. **Linear registration:** `mri_em_register` computes a linear LTA
   transform aligning the input T1 to the atlas.
2. **Nonlinear registration:** `mri_ca_register` computes a volumetric
   morph (`.m3z`) refining the linear alignment.
3. **Labeling:** `mri_ca_label` applies the combined transform to map
   each input voxel to an atlas node, queries the Gaussian and prior
   statistics there, and assigns the MAP label.

Coordinate mapping within the GCA is implemented via the `mri_node__`,
`mri_prior__`, and `mri_tal__` helper MRI structures embedded in the
`GCA` struct. These store the vox2ras matrices for the node grid, prior
grid, and reference ("Talairach") space, respectively. Functions such as
`GCAsourceVoxelToNode()` and `GCAsourceVoxelToPrior()` perform the
full chain: input-image voxel → Talairach voxel → node/prior grid index.

See [[coordinate-systems]] for a full treatment of FreeSurfer's
coordinate systems and the relationship between Scanner RAS, Surface RAS,
and MNI305/Talairach space.

---

## Gotchas and Caveats

> [!gotcha] GCA and GCSA are completely different formats
> Despite superficial name similarity, `.gca` (volumetric atlas) and
> `.gcs` (surface atlas) have entirely different data structures,
> statistical models, and file layouts. See [[gcsa-format]].
> Do not pass a `.gca` file to `mris_ca_label` or a `.gcs` file to
> `mri_ca_label`.

> [!gotcha] node_spacing vs. prior_spacing mismatch
> The prior grid and node grid have different resolutions
> (`prior_spacing < node_spacing`). When `mri_ca_label` looks up the
> prior at a given voxel it maps to prior coordinates; for the Gaussian
> it maps to node coordinates. If an atlas is created with inconsistent
> spacing parameters, or if a custom atlas is loaded that does not match
> the registered image resolution, labeling errors occur silently — no
> error is thrown, but label probabilities will be computed from the wrong
> atlas cells.

> [!gotcha] No provenance for training subjects
> GCA files record only per-node training counts (`total_training`) and
> per-label weighted counts (`ntraining`). The list of training subjects,
> their FreeSurfer versions, and their segmentation protocols is not
> stored in the file. For the shipped atlases this information must be
> obtained from FreeSurfer release notes or publications.

> [!gotcha] GCA_NO_MRF flag disables neighbourhood priors
> When a GCA is read and the `GCA_NO_MRF` flag is set in the header,
> the Gibbs MRF arrays are not allocated. `mri_ca_label` checks for this
> flag (`utils/gca.cpp` line 2124, `mri_ca_label.cpp` line 326) and
> skips the Gibbs reclassification step, running a simpler MAP labeling
> based on likelihood × prior only. This reduces computational cost at
> the expense of spatial coherence.

> [!gotcha] TAG_GCA_TYPE is written unconditionally in v8
> The version constant `GCA_INT_VERSION = 5.0` is always written as the
> first float. The `TAG_GCA_TYPE` block is also always written (despite
> a historical comment suggesting it was conditional on FLASH type). Older
> FreeSurfer versions that encounter an unknown tag ID in a standard atlas
> will print a warning but continue reading.

> [!gotcha] Label IDs are stored as int32 in version 5.0
> Version 4.0 (`GCA_UCHAR_VERSION`) stored label IDs as single bytes
> (uint8), limiting labels to 0–255. Version 5.0 (`GCA_INT_VERSION`)
> stores them as int32, allowing the full CMA label set including
> high-numbered regions. The reader detects the version from the first
> float and handles both encodings.

---

## Confidence and Gaps

The file layout documented here was traced directly from `GCAwrite()` and
`GCAread()` in `utils/gca.cpp` (FreeSurfer 8.2.0) and is authoritative.

The mathematical model was confirmed against the primary reference (Fischl
et al. 2002) and the scoring functions `gcaGibbsLogPosterior()`,
`GCAcomputeConditionalLogDensity()`, and `GCAmahDist()` in the same file.

> [!gap] Atlas provenance
> The exact number of training subjects for each shipped atlas and their
> acquisition parameters are not stored in the `.gca` files. The filenames
> encode creation dates but not subject counts.

> [!gap] Extended atlases (aseg+spmhead*)
> The two IXI-derived atlases (`aseg+spmhead.ixi.gca` and
> `aseg+spmhead+vermis+pons.ixi.gca`) are not invoked by `recon-all`.
> Their intended use cases, training datasets, and any differences in
> node/prior spacing have not been traced.

> [!gap] GCA_PARAM type
> The `GCA_PARAM` type (value 2) indicates training from separate T1 and
> PD volumes. The on-disk format appears identical to `GCA_FLASH` minus
> the `TAG_PARAMETERS` block, but this has not been fully verified.
