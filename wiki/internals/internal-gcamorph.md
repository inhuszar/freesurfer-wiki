---
title: "internal-gcamorph"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/gcamorph.h"
  - "utils/gcamorph.cpp"
related:
  - "[[mri_nl_align]]"
  - "[[mri_nl_align_binary]]"
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps: []
tags:
  - internal
  - registration
  - nonlinear
  - warp
---

# internal-gcamorph

## Summary

The `gcamorph` library (`include/gcamorph.h`, `utils/gcamorph.cpp`) implements the Gaussian Classifier Atlas Morphology (GCAM) framework: a dense, non-linear volumetric warp field that maps voxels from a source image into registration with an atlas or target image. The library was written by Bruce Fischl and underlies all non-linear registration in FreeSurfer. It is used directly by [[mri_nl_align]], [[mri_nl_align_binary]], and [[mri_ca_register]] (the non-linear step of atlas-based segmentation), and is consumed downstream by tools such as [[mri_vol2vol]] and [[mri_concatenate_gcam]].

The conceptual model is that of a deformable lattice: a 3-D grid of nodes, each anchored at a position in the target (atlas) coordinate frame, stores a displaced position in the source image space. Moving the grid nodes optimises a registration energy that balances image likelihood against regularisation terms. The persisted form of this warp is the `.m3z` (Morph-3D, gzip-compressed) binary file.

Primary references:
- Fischl et al. (2002) "Whole Brain Segmentation", *Neuron* 33:341–355
- Fischl et al. (2004) non-linear morph work, *NeuroImage* (cited in `mri_nl_align.cpp` header)

## Key Structures

### `GCA_MORPH` (`GCA_MORPH` / `GCAM`)

The top-level warp field container, defined in `include/gcamorph.h` (lines 138–157):

| Field | Type | Meaning |
|-------|------|---------|
| `width`, `height`, `depth` | `int` | Dimensions of the node lattice (in atlas/target voxel space) |
| `nodes` | `GMN ***` | 3-D array of `GCA_MORPH_NODE` structures indexed `[x][y][z]` |
| `spacing` | `int` | Voxel spacing between adjacent nodes (default 1; stored in `.m3z` header) |
| `exp_k` | `double` | Exponential coefficient for the Jacobian penalty (default 20.0, `EXP_K`) |
| `gca` | `GCA *` | Optional pointer to an atlas GCA (not saved to disk) |
| `image` | `VOL_GEOM` | Geometry of the source (moving) image |
| `atlas` | `VOL_GEOM` | Geometry of the target (atlas/fixed) image |
| `ninputs` | `int` | Number of input channels (e.g., 1 for T1) |
| `type` | `int` | Coordinate type: `GCAM_VOX` (2) or `GCAM_RAS` (1) |
| `m_affine` | `MATRIX *` | Optional affine transform used for initialisation (stored as `TAG_MGH_XFORM`) |
| `det` | `double` | Determinant of `m_affine`; used to normalise original node areas |
| `neg` | `int` | Count of nodes with negative Jacobian (i.e., folded/inverted warp) |
| `mri_xind`, `mri_yind`, `mri_zind` | `MRI *` | Cached inverse-warp lookup volumes (not saved) |

> [!internal] The `gca`, `mri_xind/yind/zind`, and `vgcam_ms` fields are runtime-only and are **not** written to the `.m3z` file.

### `GCA_MORPH_NODE` (`GMN`)

Per-node displacement record; one exists for every voxel in the lattice. Defined in `include/gcamorph.h` (lines 89–136). The hottest struct in the inner registration loop — fields are ordered to minimise cache misses.

| Field | Type | Meaning |
|-------|------|---------|
| `x`, `y`, `z` | `double` | Current displaced position in source voxel coordinates |
| `origx`, `origy`, `origz` | `double` | Original (initial) source voxel position (set from the LTA initialisation) |
| `saved_origx/y/z` | `double` | Checkpoint copy of original position |
| `xs`, `ys`, `zs` | `double` | Temporary storage (not saved) |
| `xs2`, `ys2`, `zs2` | `double` | Additional temporary storage (not saved) |
| `xn`, `yn`, `zn` | `int` | Node lattice coordinates (integer grid indices) |
| `n` | `int` | Index into the associated GCA node structure |
| `dx`, `dy`, `dz` | `float` | Current gradient for gradient descent |
| `odx`, `ody`, `odz` | `float` | Previous gradient (for momentum) |
| `jx`, `jy`, `jz` | `float` | Jacobian gradient contribution |
| `area`, `area1`, `area2` | `float` | Current volumes of the two oriented tetrahedra around the node |
| `orig_area`, `orig_area1`, `orig_area2` | `float` | Original reference tetrahedron volumes |
| `log_p` | `float` | Current log-probability of this node |
| `prior` | `float` | Atlas label prior |
| `gc` | `GC1D *` | Pointer to the 1-D Gaussian classifier for this node's label |
| `label` | `int` | Current anatomical label assigned to this node |
| `status` | `int` | Bitmask (`GCAM_IGNORE_LIKELIHOOD`, `GCAM_LABEL_NODE`, etc.) |
| `invalid` | `char` | 0 = valid; `GCAM_POSITION_INVALID` (2) = all-zero, skip; `GCAM_AREA_INVALID` (1) = border node |

### `GCA_MORPH_PARMS` (`GMP`)

Optimisation hyperparameter bag passed to `GCAMregister()` and related functions. Defined in `include/gcamorph.h` (lines 194–277). Key fields used in `mri_nl_align`:

| Field | Default (mri_nl_align) | Meaning |
|-------|------------------------|---------|
| `l_log_likelihood` | 0.025 | Weight for the atlas log-likelihood term |
| `l_jacobian` | 1.0 | Weight for the Jacobian (volume-preservation) penalty |
| `l_smoothness` | 2.0 | Weight for the displacement smoothness term |
| `l_elastic` | 0.0 (unused by default) | Weight for elastic regularisation |
| `l_label` | — | Weight for label-matching distance term |
| `l_distance` | 0.0 | Weight for label-distance term |
| `l_binary` | — | Weight for binary mask term |
| `dt` | 0.005 | Integration time step |
| `momentum` | 0.9 | Momentum coefficient for gradient descent |
| `exp_k` | 20 | Exponential constant for Jacobian penalty (overrides `GCAM::exp_k` at init) |
| `sigma` | 8.0 | Initial Gaussian smoothing scale for gradient |
| `min_sigma` | 0.4 | Minimum smoothing scale |
| `navgs` | 256 | Number of gradient smoothing averages at coarsest level |
| `levels` | 6 | Number of multi-resolution levels |
| `npasses` | 3 | Number of passes through all levels |
| `niterations` | 1000 | Maximum iterations per level |
| `tol` | 0.1 | Convergence tolerance (fractional RMS change) |
| `noneg` | True | If set, prevents warp folds (nodes with negative Jacobian) |
| `integration_type` | `GCAM_INTEGRATE_BOTH` | Line search strategy |
| `lame_mu` | 0.38462 | Lamé shear modulus for elastic regularisation |
| `lame_lambda` | 0.57692 | Lamé first parameter for elastic regularisation |

The Lamé constants satisfy the physical relationships:

$$\mu = \frac{E}{2(1+\nu)}, \quad \lambda = \frac{E\nu}{(1+\nu)(1-2\nu)}$$

where $E$ is Young's modulus and $\nu$ is Poisson's ratio.

## The .m3z File Format

`.m3z` is a gzip-compressed binary file identified by the `MGH_MORPH` type constant (value 29) in `include/mri.h`. The extension `.m3d` is also accepted (uncompressed variant). File identification is performed by `mri_identify()` in `utils/mri_identify.cpp`.

The format is implemented in `__m3zWrite()` / `__m3zRead()` in `utils/gcamorph.cpp`, using the `znz` (zlib-based) I/O library for compressed reads and writes. The file layout is:

### Binary Header (fixed-width, all fields little-endian)

| Offset | Size | Field | Notes |
|--------|------|-------|-------|
| 0 | 4 B (float) | Version | Must equal `GCAM_VERSION = 1.0` |
| 4 | 4 B (int) | `width` | Lattice width |
| 8 | 4 B (int) | `height` | Lattice height |
| 12 | 4 B (int) | `depth` | Lattice depth |
| 16 | 4 B (int) | `spacing` | Inter-node spacing in voxels |
| 20 | 4 B (float) | `exp_k` | Jacobian exponential coefficient |

### Node Data Block

Immediately after the header, a flat 3-D scan in `[x][y][z]` order (x fastest-varying axis in write order, z innermost loop): for each of the $W \times H \times D$ nodes:

| Size | Field | Notes |
|------|-------|-------|
| 4 B (float) | `origx` | Original source x position |
| 4 B (float) | `origy` | Original source y position |
| 4 B (float) | `origz` | Original source z position |
| 4 B (float) | `x` | Displaced source x position |
| 4 B (float) | `y` | Displaced source y position |
| 4 B (float) | `z` | Displaced source z position |
| 4 B (int) | `xn` | Node lattice index x |
| 4 B (int) | `yn` | Node lattice index y |
| 4 B (int) | `zn` | Node lattice index z |

Per-node record: **36 bytes**. For a typical 256³ volume at `spacing=1`, the raw (uncompressed) node data alone is $256^3 \times 36 \approx 603$ MB, which compresses to roughly 300–600 MB on disk depending on deformation magnitude. `.m3z` files from `mri_ca_register` are smaller because spacing > 1 reduces the lattice size.

### Tagged Sections (after node data)

After the node data the file contains tagged blocks (using `znzTAGreadStart`):

| Tag constant | Content |
|--------------|---------|
| `TAG_GCAMORPH_GEOM` | Source (`image`) and atlas (`atlas`) `VOL_GEOM` geometry blocks |
| `TAG_GCAMORPH_TYPE` | Integer: `GCAM_VOX` (2) or `GCAM_RAS` (1) coordinate type |
| `TAG_GCAMORPH_LABELS` | Per-node integer label array (written only if `gcam->status == GCAM_LABELED`) |
| `TAG_MGH_XFORM` | Affine initialisation matrix (written only if `gcam->m_affine != NULL`) |

> [!gotcha] Node validity on read
> During `__m3zRead`, a node is marked `GCAM_POSITION_INVALID` if all six position fields (`origx`, `origy`, `origz`, `x`, `y`, `z`) are identically zero. Border nodes (first/last slice in any axis) are marked `GCAM_AREA_INVALID`. Both statuses cause the node to be skipped in energy/gradient computations.

### Alternative Wire Formats

`GCAMwrite`/`GCAMread` also dispatch to a separate `Warpfield` class (in `utils/warpfield.cpp`) when the filename ends in `.mgz` or `.nii`/`.nii.gz`. In that case the warp is stored as a standard MGZ/NIfTI volume with displacement vectors as frame values. This path is distinct from the `.m3z` format.

## Energy Functional

Registration is framed as the minimisation of a composite sum-of-squared-errors (SSE) objective computed in `gcamComputeSSE()` (`utils/gcamorph.cpp`, line 5633). The total energy is:

$$E = \lambda_\text{ll} \, E_\text{ll} + \lambda_J \, E_J + \lambda_s \, E_s + \lambda_l \, E_l + \lambda_d \, E_d + \lambda_b \, E_b + \cdots$$

where each $\lambda$ is the corresponding `GCA_MORPH_PARMS::l_*` coefficient. Only terms with non-zero coefficients are evaluated. The dominant terms in the default `mri_nl_align` configuration are:

### Log-likelihood term $E_\text{ll}$ (`gcamLogLikelihoodEnergy`)

At each valid, non-ignored node $i$, the atlas provides a Gaussian classifier `gc` describing the expected intensity distribution for the node's label. The source image is sampled at the displaced position $(x_i, y_i, z_i)$ using trilinear interpolation, yielding intensity vector $\mathbf{v}_i$. The per-node contribution is:

$$e_i = D^2_M(\mathbf{v}_i;\, \boldsymbol{\mu}_i, \Sigma_i) + \log|\Sigma_i|$$

where $D^2_M$ is the squared Mahalanobis distance. The full term sums over valid nodes:

$$E_\text{ll} = \sum_{i \in \text{valid}} e_i$$

When no Gaussian classifier is present at a node, a fallback uses $e_i = \sum_n v_{i,n}^2 / \sigma^2_\text{min}$ (minimum variance prior).

### Jacobian (volume-preservation) term $E_J$ (`gcamJacobianEnergy`)

Prevents the warp from folding. For each non-invalid node $i$, two oriented tetrahedral volumes $a_{i,1}$ and $a_{i,2}$ are maintained (one per handedness). The penalty uses a soft barrier via a softplus function:

$$e_{i,k} = \log\!\left(1 + \exp\!\left(-k \cdot \frac{a_{i,k}}{a^\text{orig}_{i,k}}\right)\right), \quad k \in \{1,2\}$$

where $k = \texttt{exp\_k} = 20$ by default. This approaches zero when $a_{i,k} / a^\text{orig}_{i,k} \gg 0$ (no fold) and grows without bound as the ratio approaches zero or goes negative:

$$E_J = \sum_i \left(e_{i,1} + e_{i,2}\right)$$

### Smoothness term $E_s$ (`gcamSmoothnessEnergy`)

Measures variation in the displacement field across the lattice. For each valid node $i$ with displacement $\mathbf{u}_i = (x_i - x^\text{orig}_i,\; y_i - y^\text{orig}_i,\; z_i - z^\text{orig}_i)$, the term compares $\mathbf{u}_i$ against each of its 26 neighbours $j \in \mathcal{N}(i)$:

$$E_s = \sum_i \frac{1}{|\mathcal{N}(i)|} \sum_{j \in \mathcal{N}(i)} \|\mathbf{u}_i - \mathbf{u}_j\|^2$$

This penalises spatially inhomogeneous displacements.

### Other terms (conditionally active)

| Parameter | Energy | Purpose |
|-----------|--------|---------|
| `l_label` | `gcamLabelEnergy` | Distance-weighted label matching |
| `l_distance` | `gcamDistanceEnergy` | Distance-transform driven term |
| `l_binary` | `gcamBinaryEnergy` | Binary mask alignment |
| `l_elastic` | `gcamElasticEnergy` | Lamé elastic regularisation via Laplacian of displacement |
| `l_map` | `gcamMapEnergy` | MAP label probability term |
| `l_expansion` | `gcamExpansionEnergy` | Ventricle expansion term |
| `l_dtrans` | `gcamDistanceTransformEnergy` | Distance transform energy |
| `l_area` / `l_area_smoothness` | `gcamAreaEnergy` | Direct area-ratio penalty |
| `l_spring` | `gcamSpringEnergy` | Spring-like compression penalty |

Gradient descent with momentum (coefficient `parms->momentum`) is used, with gradient averaging (controlled by `navgs`) at each multi-resolution level. The integration type `GCAM_INTEGRATE_BOTH` uses a hybrid of fixed and optimal (line-search) time stepping.

## Tools That Use gcamorph

| Tool | Source | Role |
|------|--------|------|
| [[mri_nl_align]] | `mri_hires_register/mri_nl_align.cpp` | Intensity-based non-linear registration; writes `.m3z` |
| [[mri_nl_align_binary]] | `mri_hires_register/mri_nl_align_binary.cpp` | Binary-mask-based variant; writes `.m3z` |
| [[mri_ca_register]] | `mri_ca_register/mri_ca_register.cpp` | Atlas-based non-linear registration (non-linear step of `recon-all`); writes `transforms/talairach.m3z` |
| `mri_vol2vol` | `mri_vol2vol/mri_vol2vol.cpp` | Applies a GCAM warp to reslice a volume |
| `mri_concatenate_gcam` | `mri_concatenate_gcam/mri_concatenate_gcam.cpp` | Composes a chain of transforms (LTA + GCAM + LTA) |
| `mri_warp_convert` | `mri_warp_convert/mri_warp_convert.cpp` | Converts between `.m3z` and other warp formats |
| `mri_jacobian` | `mri_jacobian/mri_jacobian.cpp` | Computes the Jacobian determinant map from a GCAM warp |

> [!gap] Incomplete tool inventory
> The above list covers the primary user-facing tools. The full list of binaries that `#include "gcamorph.h"` spans 68 files (as of v8.2.0); some are attic/legacy tools. The table above covers the actively maintained, user-documented tools only.

## Gotchas

> [!gotcha] `.m3z` is not an LTA
> A `.m3z` warp is a dense non-linear deformation field, not a linear transform (`.lta`). It cannot be passed to tools that expect a linear transform. Composition of LTAs and GCAMs is handled by `mri_concatenate_gcam` which uses `GCAMconcat3(lta1, gcam, lta2, out)`.

> [!gotcha] File size
> An uncompressed GCAM node array for a 256³ lattice at `spacing=1` is ~603 MB. After gzip compression, `.m3z` files from `mri_nl_align` are typically 300–600 MB. Files from `mri_ca_register` are smaller because the GCA atlas imposes a coarser node grid. Applications that load and invert the warp (`GCAMinvert`) allocate the inverse-warp lookup volumes (`mri_xind/yind/zind`) in addition, doubling peak RAM usage.

> [!gotcha] Coordinate system stored in the file
> The `type` field (either `GCAM_VOX` or `GCAM_RAS`) indicates whether the displacement vectors are in voxel or RAS coordinates. On read, `mri_vol2vol` checks this field and converts as needed (`GCAMrasToVox`). Mixing up the coordinate type is a silent source of incorrect warps. The default type set by `GCAMalloc` is `GCAM_VOX`.

> [!gotcha] Negative-Jacobian nodes (folded warp)
> The `gcam->neg` field counts nodes with negative area. When `parms->noneg = True` (default in `mri_nl_align`), gradient steps that would increase the fold count are rejected. However, heavily initialised warps can still accumulate invalid nodes at borders; these are then marked `GCAM_AREA_INVALID` and silently skipped in all energy computations.

> [!gotcha] Not all pipeline stages support GCAM warps
> Tools that apply transforms via `LTAtransform()` (the linear transform API) do not automatically fall back to GCAM. Only tools that explicitly call `GCAMmorphFromAtlas()`, `GCAMmorphToAtlas()`, or `GCAMread()` can handle `.m3z` files. Passing a `.m3z` file to a linear-transform-only tool will typically fail with a file type error.

> [!gotcha] Spacing field is declared `int`, not `float`
> The `GCA_MORPH::spacing` field is an integer (see comment in `gcamorph.h`: "poor choice to make this an int"). Sub-voxel spacing is not representable. In practice spacing is always a small integer (1 or 2) and the limitation is benign, but it means the node lattice is always an integer downsampling of the target volume.

## Related Pages

- [[mri_nl_align]] — primary user-facing tool using this library
- [[mri_nl_align_binary]] — binary-mask-driven variant
- [[mri_ca_register]] — atlas registration using GCAM in the `recon-all` stream
- [[coordinate-systems]] — relationship between voxel and RAS coordinate systems embedded in `VOL_GEOM`
- [[lta-format]] — linear transform format, contrast with `.m3z`
