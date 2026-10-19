---
title: "internal-gca"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/gca.h"
  - "utils/gca.cpp"
related:
  - "[[gca-format]]"
  - "[[internal-gcamorph]]"
  - "[[talairach.m3z]]"
  - "[[talairach.lta]]"
  - "[[mri_ca_label]]"
  - "[[mri_ca_register]]"
  - "[[mri_em_register]]"
  - "[[parcellation-schemes]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "FLASH/PARAM-derived GCA synthesis (GCAcreateFlashGCAfromParameterGCA) is named but not traced in detail."
  - "The full set of renormalization-with-alignment variants is enumerated but only described at a high level."
tags:
  - internal
  - atlas
  - segmentation
  - bayesian
---

# internal-gca

## Summary

The **Gaussian Classifier Atlas (GCA)** is the probabilistic atlas that drives
FreeSurfer's whole-brain subcortical segmentation (`aseg`) and the atlas
registration that precedes it. Conceptually it is a spatial map, defined in a
fixed atlas (Talairach-like) coordinate frame, of **two things per location**:

1. a **per-tissue intensity model** — for each anatomical label that ever
   occurs at that location, a Gaussian distribution over the (possibly
   multi-contrast) image intensity, `P(intensity | label)`; and
2. a **spatial label prior** — the probability that the location belongs to
   each label, `P(label | location)`, together with neighbour-label statistics
   (a Markov Random Field / Gibbs prior).

Segmentation is then a **maximum-a-posteriori (MAP)** decision per voxel,
`argmax_label P(intensity | label) · P(label | location)`, optionally refined
by Gibbs/MRF iterations that also condition on the labels of the six
face-neighbours. The model and the reference are described in Fischl et al.
(2002), *"Whole Brain Segmentation: Automated Labeling of Neuroanatomical
Structures in the Human Brain"*, *Neuron* 33:341–355, cited in the header
([`include/gca.h:1-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L1-L8)).

The atlas lives on disk as a `.gca`/`.gcz` file (see [[gca-format]]); the
in-memory `GCA` struct mirrors that layout. A subject's image is mapped into
atlas coordinates through a **linear** transform ([[talairach.lta]], an LTA)
during EM registration, and through a **non-linear** transform
([[talairach.m3z]], a GCAM/`MORPH_3D_TYPE`) during and after deformable atlas
registration. The non-linear morph itself is the subject of
[[internal-gcamorph]]; this page covers the atlas it warps onto the subject.

Primary consumers are [[mri_em_register]] (linear alignment via atlas samples),
[[mri_ca_register]] (deformable alignment producing [[talairach.m3z]]), and
[[mri_ca_label]] (the MAP+Gibbs labeller producing `aseg`).

## Source Layout

| File | Lines | Contains |
|------|-------|----------|
| [`include/gca.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h) | ~650 | All data structures (`GCA`, `GCA_NODE`, `GCA_PRIOR`, `GC1D`, `GCA_SAMPLE`, `GCA_TISSUE_PARMS`), constants, and the public API (~250 functions). |
| [`utils/gca.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp) | ~23,600 | The implementation: allocation/I/O, coordinate mapping, training, classification, the Gibbs/MRF posterior, density and Mahalanobis computations, renormalization, and many ancillary relabelling operations. |

`utils/gca.cpp` is large; the function-level anchors named throughout this page
are the canonical entry points to read.

## Core Data Structures

There are four nested structs. From innermost (one Gaussian) to outermost (the
whole atlas): `GC1D` → `GCA_NODE` (list of `GC1D`) and `GCA_PRIOR` (list of
label priors) → `GCA`.

### `GC1D` — one per-label Gaussian classifier

[`include/gca.h:136-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L136-L147):

```c
typedef struct
{
  float   *means ;
  float   *covars ;
  float   **label_priors ;
  unsigned short    **labels ;
  short   *nlabels;
  short   n_just_priors ;
  int     ntraining ;
  char    regularized ;
}
GC1D, GAUSSIAN_CLASSIFIER_1D ;
```

A `GC1D` is the Gaussian for **one label at one node**:

- `means[ninputs]` — the mean intensity vector (one entry per input contrast).
- `covars` — the **upper-triangular packed** covariance matrix, length
  `ninputs*(ninputs+1)/2`, stored row-major over the upper triangle. For a
  single-input atlas this is just the scalar variance `covars[0]`. The packing
  is inflated/deflated by
  [`load_covariance_matrix`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12977-L12996)
  / [`set_covariance_matrix`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L13009-L13022)
  and allocated at
  [`alloc_gcs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12612-L12613).
- The **Gibbs / neighbour-label prior**, indexed by the 6 face-neighbour
  directions (`GIBBS_NEIGHBORHOOD = 6`,
  [`include/gca.h:133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L133)):
  for each direction `i`, `nlabels[i]` is the number of distinct neighbour
  labels observed, `labels[i][j]` the `j`-th such label, and
  `label_priors[i][j]` the conditional probability that the neighbour in
  direction `i` has that label given this voxel's label. This is the MRF term.
- `ntraining` — number of training voxels that contributed; `n_just_priors`
  counts voxels that contributed only a label/prior but no intensity (the
  no-intensity training path).
- `regularized` — flag set when the covariance was conditioned (see
  `GCAregularizeCovariance`).

### `GCA_NODE` — the intensity-model grid cell

[`include/gca.h:159-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L159-L167):

```c
typedef struct
{
  int  nlabels ;
  int  max_labels ;   /* amount allocated */
  unsigned short *labels ;
  GC1D *gcs ;
  int  total_training ;  /* total # of times this node was was accessed */
}
GCA_NODE ;
```

A node holds the **set of Gaussians present at one node location**: a parallel
pair of arrays `labels[n]` (the label) and `gcs[n]` (its `GC1D`), grown on
demand (`max_labels` is the allocated capacity, `nlabels` the used count). A
typical brain node carries a handful of labels (e.g. white matter, a
neighbouring grey structure, CSF). `total_training` is how many training voxels
mapped to this node.

### `GCA_PRIOR` — the spatial-prior grid cell

[`include/gca.h:149-157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L149-L157):

```c
typedef struct
{
  short nlabels ;
  short max_labels ;
  unsigned short  *labels ;
  float *priors ;
  int   total_training ;
}
GCA_PRIOR ;
```

A prior cell holds the **label histogram at one prior location**: `labels[n]`
with its probability `priors[n]` (the priors sum to ~1 after training
normalization; `total_training` is the divisor used). This is `P(label |
location)`. It is deliberately a *different, finer* grid than the node grid —
see "Two grids" below.

### `GCA` — the atlas

[`include/gca.h:182-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L182-L226):

```c
typedef struct
{
  float     node_spacing ;    /* inter-node spacing */
  float     prior_spacing ;    /* inter-prior spacing */
  int       node_width ;
  int       node_height ;
  int       node_depth ;
  GCA_NODE  ***nodes ;
  int       prior_width ;
  int       prior_height ;
  int       prior_depth ;
  GCA_PRIOR ***priors ;
  int       ninputs ;
  GCA_TISSUE_PARMS tissue_parms[MAX_GCA_LABELS] ;
  int    flags ;
  int       type ;
  double    TRs[MAX_GCA_INPUTS] ;  /* TR of training data (in msec) */
  double    FAs[MAX_GCA_INPUTS] ;  /* flip angles of training data (in radians) */
  double    TEs[MAX_GCA_INPUTS] ;  /* TE  of training data (in msec) */
  // direction cosine info (common to both prior and node)
  float         x_r, x_a, x_s;
  float         y_r, y_a, y_s;
  float         z_r, z_a, z_s;
  float         c_r, c_a, c_s;
  int           width;
  int           height;
  int           depth;
  float         xsize;
  float         ysize;
  float         zsize;
  MRI          *mri_node__;       // these three MRI are helper to get
  MRI          *mri_prior__;      // appropriate transforms
  MRI          *mri_tal__;
  MATRIX       *node_i_to_r__;
  MATRIX       *node_r_to_i__;
  MATRIX       *prior_i_to_r__;
  AffineMatrix *prior_r_to_i__;
  MATRIX       *tal_i_to_r__;
  MATRIX       *tal_r_to_i__;
  MATRIX       *tmp__;
  int          total_training ;
  int          max_label ;
  COLOR_TABLE  *ct ;
}
GAUSSIAN_CLASSIFIER_ARRAY, GCA ;
```

Key fields for a developer:

- **`ninputs`** — number of image contrasts the atlas models. `1` for the
  standard T1 atlas; >1 for multi-contrast (FLASH) atlases. This sets the
  dimensionality of every `GC1D` mean/covariance and the upper bound is
  `MAX_GCA_INPUTS = 100`
  ([`include/gca.h:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L42)).
- **Two grids:** `nodes` (`node_width × node_height × node_depth`, spaced
  `node_spacing`) holds the Gaussians; `priors` (`prior_width × … `, spaced
  `prior_spacing`) holds the spatial label histograms. Both are
  triple-pointer arrays allocated in
  [`gcaAllocMax`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1474-L1573).
- **Geometry:** `width/height/depth`, `xsize/ysize/zsize`, and the direction
  cosines `x_r…c_s` describe the underlying atlas template volume (the
  "Talairach" volume, default 256³ at 1 mm — `DEFAULT_VOLUME_SIZE = 256`,
  [`include/gca.h:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L61)).
  `gcaAllocMax` seeds these with FreeSurfer's conformed orientation
  (`x_r=-1, z_a=1, y_s=-1`) at
  [`utils/gca.cpp:1493-1507`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1493-L1507);
  on read they are overwritten from the `TAG_GCA_DIRCOS` tag.
- **Cached transform helpers** (`mri_node__`, `mri_prior__`, `mri_tal__`, and
  the `*_i_to_r__` / `*_r_to_i__` matrices) are scratch `MRI`/`MATRIX` objects
  that hold the voxel↔RAS transforms for the node, prior, and template grids;
  they are rebuilt by `GCAsetup`/`GCAreinit` and are how the coordinate-mapping
  functions convert between grids without re-deriving geometry each call.
- **`type`** — `GCA_NORMAL`, `GCA_FLASH`, or `GCA_PARAM`
  ([`include/gca.h:45-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L45-L48)),
  recording how the intensity model was built; `TRs/FAs/TEs` carry the FLASH
  acquisition parameters for synthesised atlases.
- **`flags`** — bitfield; the important one is `GCA_NO_MRF` (`0x0001`,
  [`include/gca.h:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L66)),
  which disables the Gibbs neighbour-label machinery (no `label_priors`
  allocated, no Gibbs refinement).
- **`ct`** — an optional embedded [[color-lut]] (`COLOR_TABLE`) mapping label
  IDs to names/colours, written under `TAG_GCA_COLORTABLE`.

### Why two grids (node vs prior)?

This is the most commonly misunderstood part of the GCA. The **prior grid is
finer** (`prior_spacing < node_spacing`; the standard atlas uses 2 mm priors,
4 mm nodes). The rationale: spatial label probabilities vary on a fine scale
(structure boundaries), so a dense prior grid localizes labels well; but
estimating a *Gaussian intensity model* reliably needs more samples per cell,
so the intensity classifiers sit on a coarser node grid where each cell pools
more training voxels. The header comment at
[`utils/gca.cpp:692-697`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L692-L697)
makes the constraint explicit: `node_spacing > prior_spacing`, and the
prior→node map (below) collapses several prior cells onto one node cell.

## Capabilities

Grouped by purpose; each names the canonical entry point.

**Allocation & lifecycle.**
[`GCAalloc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1461)
(thin wrapper over
[`gcaAllocMax`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1474)),
`GCAfree`, and the per-cell freers `GCANfree`/`GCAPfree`/`GC1Dfree`.
`GCAsetup`/`GCAreinit`/`GCAcleanup`
([`include/gca.h:522-525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L522-L525))
build/refresh the cached geometry transforms.

**Atlas I/O.**
[`GCAwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2070)
and
[`GCAread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2218)
serialise/deserialise the atlas; the byte layout is specified in
[[gca-format]]. `.gcz` triggers gzip transparently.

**Coordinate mapping** (see next section): the `*ToNode` / `*ToPrior` /
`*ToVoxel` family.

**Training.**
[`GCAtrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1838)
(+ [`GCAtrainCovariances`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1699)),
finalised by
[`GCAcompleteMeanTraining`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2884)
and `GCAcompleteCovarianceTraining`.

**Classification / labeling.**
[`GCAlabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L3142)
(MAP, no MRF),
[`GCAreclassifyUsingGibbsPriors`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L6170)
(MAP + Gibbs/MRF refinement), plus `GCAclassify`, `GCAanneal`,
`GCAcomputeMAPlabelAtLocation`, and topology/relabel passes
(`GCAconstrainLabelTopology`, `GCArelabel_cortical_gray_and_white`,
`GCAmaxLikelihoodBorders`).

**Density / probability.**
[`GCAcomputeConditionalDensity`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12255)
and its log form
[`GCAcomputeConditionalLogDensity`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12308),
the posterior
[`GCAcomputePosteriorDensity`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12924),
the Mahalanobis distance
[`GCAmahDist`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12848),
and the Gibbs posteriors
[`GCAvoxelGibbsLogPosterior`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L6695)
/ `GCAnbhdGibbsLogPosterior` / `GCAgibbsImageLogPosterior`. The
sample-probability functions (`GCAcomputeLogSampleProbability` and variants)
are what [[mri_em_register]] optimizes.

**Sample extraction** (for registration). `GCAfindStableSamples`,
`GCAfindAllSamples`, `GCAfindContrastSamples` build `GCA_SAMPLE` arrays —
control points at high-prior atlas locations used to drive alignment.

**Intensity renormalization.**
[`GCAnormalizeMeans`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L14251),
`GCArenormalize`, `GCAmapRenormalize`, and the alignment-aware family
`GCAmapRenormalizeWithAlignment` / `GCAcomputeRenormalizationWithAlignment`
rescale the atlas means to match a particular subject's intensity scale
(critical because the atlas means are in the training intensity units, not the
subject's). `GCAhistoScaleImageIntensities` does the inverse coarse scaling of
the image to the atlas.

**Covariance conditioning.** `GCAfixSingularCovarianceMatrices`,
`GCAregularizeCovariance`, `GCAregularizeCovarianceMatrices`,
`GCAregularizeConditionalDensities` — keep covariances invertible/well-posed.

**Most-likely volume synthesis.** `GCAbuildMostLikelyVolume`,
`GCAbuildMostLikelyLabelVolume`, `GCAmri`, `GCAtoMLLabel` — render the atlas
itself as an image (used for visualization and as a registration target).

## Algorithms and Mathematical Foundations

### The Bayesian model

For a voxel with intensity vector $\mathbf{v}$ (length `ninputs`) that maps to
node $n$ and prior cell $p$, the posterior for label $\ell$ is

$$P(\ell \mid \mathbf{v}, \text{loc}) \;\propto\; P(\mathbf{v} \mid \ell)\;P(\ell \mid p)$$

where the **likelihood** $P(\mathbf{v}\mid\ell)$ is the multivariate Gaussian of
the `GC1D` for $(\ell, n)$ and the **prior** $P(\ell\mid p)$ is `priors[·]` of
the `GCA_PRIOR` at $p$. The Gaussian density is computed in
[`GCAcomputeConditionalDensity`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12255-L12265):

$$P(\mathbf{v}\mid\ell)=\frac{1}{(2\pi)^{d/2}\,|\Sigma|^{1/2}}\exp\!\left(-\tfrac{1}{2}\,D_M^2\right),\qquad d=\texttt{ninputs}$$

with the squared **Mahalanobis distance** $D_M^2=(\mathbf{v}-\boldsymbol\mu)^\top\Sigma^{-1}(\mathbf{v}-\boldsymbol\mu)$
from
[`GCAmahDist`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12848-L12897).
For the common `ninputs == 1` case this collapses to the scalar
$(v-\mu)^2/\sigma^2$ with an early return at
[`utils/gca.cpp:12855-12860`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12855-L12860);
otherwise it inflates the packed covariance, inverts it (SVD-based,
`MatrixSVDInverse`), and forms the quadratic form. Work is done in **log space**
for numerical stability:
[`GCAcomputeConditionalLogDensity`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12308-L12318)
returns $-\log\sqrt{|\Sigma|} - \tfrac12 D_M^2$, and the labeller's helper
`gcaComputeLogDensity`
([`utils/gca.cpp:12299-12306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12299-L12306))
adds $\log P(\ell\mid p)$ to get the log-posterior (constants dropped because
only the argmax matters).

### MAP labeling (no MRF)

[`GCAlabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L3142-L3316)
loops over every image voxel, maps it to its node and prior cell
(`GCAsourceVoxelToNode` + `getGCAP`), loads the intensities (`load_vals`), and
for each candidate label present in the **prior** cell computes the
log-posterior and keeps the argmax
([`utils/gca.cpp:3207-3229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L3207-L3229)).
If a label has no Gaussian at the exact node it falls back to
`GCAfindClosestValidGC`. Voxels outside the atlas FOV are set to `Unknown` (0).
This is a pure per-voxel decision; no neighbour interaction.

### Gibbs / MRF refinement

The labels are not independent: anatomy imposes strong neighbour structure. The
GCA encodes a first-order MRF over the **6 face-neighbours**, with offsets
([`utils/gca.cpp:194-196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L194-L196)):

```c
static int xnbr_offset[] = {1, -1, 0, 0, 0, 0};
static int ynbr_offset[] = {0, 0, 1, -1, 0, 0};
static int znbr_offset[] = {0, 0, 0, 0, 1, -1};
```

The per-voxel Gibbs log-posterior is
[`GCAvoxelGibbsLogPosterior`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L6695-L6831):
it adds to the conditional log-density a weighted sum of
$\log P(\text{nbr label} \mid \text{this label}, \text{direction } i)$ over the
six directions, read from `gc->label_priors[i][j]`
([`utils/gca.cpp:6783-6811`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L6783-L6811)),
plus $\log P(\ell\mid p)$:

$$\log P(\ell\mid\mathbf{v},\text{nbrs}) = \underbrace{\log P(\mathbf{v}\mid\ell)}_{\text{Gaussian}} + \beta\!\!\sum_{i=1}^{6}\log P(\ell_{\text{nbr}_i}\mid\ell, i) + \log P(\ell\mid p)$$

where $\beta$ is `gibbs_coef` (the `prior_factor`). Unseen neighbour
configurations are floored to `log(0.1 / total_training)` so they are
unlikely-but-not-impossible.
[`GCAreclassifyUsingGibbsPriors`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L6170)
is the outer loop: it visits voxels (in a probability-ordered sweep), reassigns
each to the label maximizing the Gibbs posterior, and iterates up to `max_iter`
times (annealing `prior_factor` from `min_prior_factor` to `max_prior_factor`)
until the number of changed voxels stabilizes — an Iterated Conditional Modes
(ICM) optimization of the MRF. `GCAanneal` is the simulated-annealing variant.

### Training

`GCAtrain` ingests one labelled subject at a time (it accumulates across calls;
the same atlas struct is trained over a population). Per training voxel
([`utils/gca.cpp:1877-1924`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1877-L1924)):

1. map the voxel to its prior cell and node (`GCAsourceVoxelToPrior` /
   `GCAsourceVoxelToNode`);
2. `GCAupdatePrior` increments the label's histogram count in the `GCA_PRIOR`
   ([`utils/gca.cpp:2714-2715`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2714-L2715));
3. `GCAupdateNode` adds the intensities into the label's running `means` sum and
   bumps `ntraining`
   ([`utils/gca.cpp:2866-2879`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2866-L2879)) —
   note means are **accumulated raw, not yet divided**;
4. `GCAupdateNodeGibbsPriors` tallies each neighbour's label into the
   direction-indexed `label_priors` counts (unless `GCA_NO_MRF`).

After all subjects,
[`GCAcompleteMeanTraining`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2884-L3009)
normalizes everything to probabilities/means: priors are divided by
`total_training`
([`utils/gca.cpp:2948-2951`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2948-L2951)),
neighbour-label counts by `ntraining`
([`utils/gca.cpp:2911-2919`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2911-L2919)),
and the mean sums by `ntraining - n_just_priors`
([`utils/gca.cpp:2924-2929`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L2924-L2929)).
It then **fills holes** — nodes that received a label/prior but no usable
intensity get their mean copied from the nearest valid same-label node via
`GCAfindClosestValidGC`. Covariances are accumulated in a separate second pass
(`GCAtrainCovariances` → `GCAcompleteCovarianceTraining`) because they require
the means to be final first.

> [!math] Two-pass estimation
> Means and covariances cannot be accumulated in one pass with this code path:
> the covariance pass needs the finalised mean. Hence `GCAtrain` /
> `GCAcompleteMeanTraining` run first, then `GCAtrainCovariances` /
> `GCAcompleteCovarianceTraining`. Singular/under-sampled covariances are
> repaired afterward (`GCAfixSingularCovarianceMatrices`, `MIN_VAR = 25`,
> [`utils/gca.cpp:97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L97)).

### Intensity renormalization (atlas↔subject intensity matching)

Because the atlas means live in the training data's intensity units, they must
be matched to each subject before labeling.
[`GCAnormalizeMeans`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L14251-L14282)
rescales every `GC1D` mean vector to a fixed target norm (used to bring an atlas
to a canonical scale). The heavier-weight, per-label-aware path is
`GCAmapRenormalizeWithAlignment` / `GCAcomputeRenormalizationWithAlignment`,
which fit per-label intensity scale/offset by aligning atlas-predicted label
histograms to the subject's — this is what recon-all's normalization stages and
[[mri_ca_label]] use so the Gaussians sit on the subject's intensities. (The
full variant set is enumerated in the header but only summarised here.)

## Invariants, Conventions, and Memory Model

### Coordinate spaces and the image↔atlas mapping

Four frames are in play: **image (subject) voxel**, **atlas template
("Talairach") voxel**, **prior grid index**, and **node grid index**. The
mapping is layered:

- **image → template** is the registration transform. Two `TRANSFORM` kinds are
  handled by `GCAsourceVoxelToPrior`
  ([`utils/gca.cpp:1052-1126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1052-L1126)):
  a **linear** [[talairach.lta]] (`LINEAR_VOX_TO_VOX`, applied via its matrix at
  [`utils/gca.cpp:1061-1077`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1061-L1077)),
  or the **non-linear** [[talairach.m3z]] GCAM (`MORPH_3D_TYPE`, which samples
  the morph directly via `TransformSample` at
  [`utils/gca.cpp:1081-1084`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1081-L1084)).
  The GCAM is documented in [[internal-gcamorph]].
- **template → prior** is the affine `GCAvoxelToPrior(Real)` using the cached
  `prior_r_to_i__` against the template `mri_tal__`
  ([`utils/gca.cpp:855-882`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L855-L882)).
- **prior → node** is a pure rescale by the spacing ratio in
  [`GCApriorToNode`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L668-L705):
  `xn = (int)(xp * prior_spacing / node_spacing)` (and similarly y, z). Prior
  and node grids **share the same RAS origin and direction cosines** (the long
  comment at
  [`utils/gca.cpp:671-697`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L671-L697)
  derives this), differing only in spacing.

`GCAsourceVoxelToNode`
([`utils/gca.cpp:1202-1210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1202-L1210))
simply composes source→prior then prior→node. The reverse direction
(`GCApriorToSourceVoxel`, `GCAnodeToSourceVoxel`) inverts the same chain and is
how training and sample-generation walk the atlas back into image space.

> [!gotcha] Truncation, not rounding, in the integer mappings
> The default `GCAsourceVoxelToPrior` path and `GCApriorToNode` cast to `int`
> (truncate) rather than round; the comment at
> [`utils/gca.cpp:1066-1072`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1066-L1072)
> flags the downcast from `double` to `float` to `int` as surprising. There are
> explicit `…Real` / `…Nearest` variants when you need sub-voxel or
> round-to-nearest behaviour. Out-of-bounds prior coordinates are **clamped**
> into range (and an error code returned) at
> [`utils/gca.cpp:1103-1124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1103-L1124),
> so a returned coordinate alone does not guarantee the voxel was inside the FOV
> — check the return value.

### Covariance storage

`covars` is **upper-triangular, row-major, length `ninputs*(ninputs+1)/2`** —
not a full `ninputs²` matrix. Always go through `load_covariance_matrix` /
`set_covariance_matrix` rather than indexing it directly. `covariance_determinant`
and `load_inverse_covariance_matrix` cache scratch matrices per OpenMP thread
([`utils/gca.cpp:13041-13061`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L13041-L13061)).

### Endianness and versioning (on disk)

The atlas is written **big-endian** regardless of host (the `znz*` writers in
`utils/fio.cpp` byte-swap on little-endian machines), with a leading `float`
version. Current files are version `5.0` (`GCA_INT_VERSION`, label IDs as
`int32`); `4.0` (`GCA_UCHAR_VERSION`) stored labels as `uint8`
([`include/gca.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h),
constants at
[`utils/gca.cpp:101-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L101-L103)).
The reader switches on the version float. Full byte layout, the tagged trailer
(`TAG_GCA_TYPE`, `TAG_PARAMETERS`, `TAG_GCA_DIRCOS`, `TAG_GCA_COLORTABLE`), and
the shipped atlas files are catalogued in [[gca-format]].

### Memory ownership

`GCA` owns its `nodes`/`priors` triple-pointer arrays and every `GC1D`'s
`means`/`covars`/`label_priors`/`labels`/`nlabels` sub-allocations. `GCAfree`
walks and frees all of them; the per-cell freers (`GCANfree`, `GCAPfree`,
`GC1Dfree`, `free_gcs`) must be told `ninputs` because the covariance length
depends on it. Node label arrays grow in steps of 2 (`max_labels += 2` in
`GCAupdateNode`/`GCAupdatePrior`), reallocating and copying — so pointers into
`gcan->gcs` are invalidated by training updates. `GCAcopy`/`GCAPcopy`/`GC1Dcopy`
do deep copies (with an optional left↔right `symmetrize` flag used to build
symmetric atlases).

> [!gotcha] Means are raw sums until training is finalised
> Between `GCAtrain` and `GCAcompleteMeanTraining`, `gc->means[i]` holds the
> **sum** of intensities, not the mean (debug prints divide by `ntraining`
> on the fly,
> [`utils/gca.cpp:1983-1985`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L1983-L1985)).
> Reading a partially-trained atlas's means as means is a mistake. After
> `GCAcompleteMeanTraining` they are true means, and a "hole-filled" node's mean
> is borrowed from a neighbour rather than estimated from its own data.

## Consumers

- [[mri_em_register]] — linear (EM) alignment of subject to atlas. Optimizes
  atlas-sample log-probability (`GCAcomputeLogSampleProbability`, samples from
  `GCAfindStableSamples`) to produce the linear [[talairach.lta]]. The
  `FASTER_MRI_EM_REGISTER` macro in the header precomputes `log(prior)` per
  `GCA_SAMPLE` for speed
  ([`include/gca.h:119-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L119-L131)).
- [[mri_ca_register]] — deformable atlas registration; warps the GCA's
  most-likely volume onto the subject and writes the non-linear
  [[talairach.m3z]] (a GCAM, [[internal-gcamorph]]).
- [[mri_ca_label]] — the labeller: `GCAlabel` for the initial MAP pass then
  `GCAreclassifyUsingGibbsPriors` for MRF refinement, producing `aseg`. It also
  drives `GCAmapRenormalizeWithAlignment` to fit the atlas to the subject's
  intensities.
- [[internal-gcamorph]] — the GCAM stores a `GCA *` and uses the same densities
  (`GCAcomputeConditionalLogDensity`, `GCAfindGC`) as its registration cost; the
  GCA's per-node Gaussians are the data term the morph minimizes.
- The label IDs throughout are CMA codes from the [[color-lut]] / [[parcellation-schemes]];
  `GCAcolorTableCMA` builds a colour table from the atlas's labels.

## Related Internals

- [[internal-gcamorph]] — the non-linear morph (GCAM / [[talairach.m3z]]) that
  warps the GCA onto a subject. The GCA is the *atlas*; the GCAM is the
  *deformation* of that atlas, and embeds a `GCA *`.

## Gotchas and Sharp Edges

- **`GCA_NO_MRF` silently changes the struct.** When set, `alloc_gcs` skips the
  `nlabels`/`labels`/`label_priors` allocation
  ([`utils/gca.cpp:12621-12631`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L12621-L12631)),
  so `gc->nlabels == NULL`. Gibbs code must (and does) null-check this before
  indexing.
- **`getPrior` never returns 0 for a missing/unseen label.** It returns
  `0.1/total_training` (or `VERY_UNLIKELY`) so the log is finite
  ([`utils/gca.cpp:538-550`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp#L538-L550)).
  Absence in the prior histogram is "very unlikely", not "impossible".
- **`GCAfindGC` returns `NULL` when the label has no Gaussian at that node.**
  Callers must fall back (commonly `GCAfindClosestValidGC`) rather than
  dereference. A label can exist in a prior cell but have no `GC1D` in the
  corresponding node.
- **Node and prior cells are not 1:1.** Several prior cells share one node;
  always derive the node from the prior via `GCApriorToNode`, never assume equal
  indices.
- **Global debug coordinates.** `Ggca_x/y/z`, `Gxp/Gyp/Gzp`, `Ggca_label`, etc.
  ([`include/gca.h:551`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L551))
  are process-global breakpoint targets, not thread-safe state — they only gate
  diagnostic printing.

## Confidence and Gaps

> [!gap] Not exhaustively traced
> - FLASH/PARAM atlas synthesis (`GCAcreateFlashGCAfromParameterGCA`,
>   `GCArenormalizeToFlash`) — the multi-contrast forward-model path that builds
>   a GCA for arbitrary FLASH parameters from a parameter atlas — is named but
>   not read line-by-line here.
> - The renormalization-with-alignment family
>   (`GCAmapRenormalizeWithAlignment`, `…Longitudinal`, `…WithHistograms`,
>   `GCAseqRenormalizeWithAlignment`) is summarised at the level of *what* it
>   does, not the per-label histogram-fitting math. A developer modifying
>   intensity matching should read
>   [`GCAcomputeRenormalizationWithAlignment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gca.cpp)
>   directly.
> - The many ancillary relabel/topology passes (`GCAconstrainLabelTopology`,
>   `GCAexpandVentricle`, `GCAlabelWMandWMSAs`, WMSA halo logic) are listed under
>   Capabilities but not individually documented.

## References

- Fischl B, Salat DH, Busa E, et al. *Whole Brain Segmentation: Automated
  Labeling of Neuroanatomical Structures in the Human Brain.* Neuron (2002)
  33:341–355. (Cited in the header,
  [`include/gca.h:1-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h#L1-L8).)
- Canonical header: [`include/gca.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gca.h).
- On-disk format and shipped atlas files: [[gca-format]].
- The non-linear warp that pairs with this atlas: [[internal-gcamorph]],
  [[talairach.m3z]].
