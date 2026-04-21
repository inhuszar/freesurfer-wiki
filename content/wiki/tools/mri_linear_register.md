---
title: "mri_linear_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_linear_register/mri_linear_register.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_em_register]]"
  - "[[mri_robust_register]]"
  - "[[mri_linear_align]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - registration
  - linear
  - affine
---

# mri_linear_register

## Summary

`mri_linear_register` performs linear (affine or rigid) registration between two MRI volumes. It initialises the transform using PCA-based axis alignment and refines it using a gradient-based cost function with multi-resolution Powell optimisation. It is an older linear registration tool predating the `mri_linear_align` series.

## Source Information

- **Language:** C++
- **Source file:** `mri_linear_register/mri_linear_register.cpp`

## Purpose and Context

Linear registration aligns two volumes by finding the affine transform that maximises the similarity between them. `mri_linear_register` uses PCA of the brain volumes to provide a good initial alignment (aligning principal axes), followed by intensity-based refinement. It is used in protocols where `mri_em_register` or `mri_robust_register` are not applicable.

## Inputs

| Argument | Description |
|----------|-------------|
| `<ref>` | Reference (fixed) volume or directory |
| `<in>` | Input (moving) volume or directory |
| `<out>` | Output registered volume or directory |

## Outputs

- Linear transform in LTA format (written to the third positional argument).
- Optional variance file appended to the reference (diagnostic).

## Mathematical Foundations

**Initialisation (PCA):** The principal axes of the input and reference are computed from the image intensity distribution. The `pca_matrix()` function builds the rotation matrix aligning the principal axes of the two volumes:

$$M_\text{PCA} = \text{eigenvectors}(C_\text{ref}) \cdot \text{eigenvectors}(C_\text{in})^T$$

**Scaling initialisation:** `init_scaling()` sets the initial scale factor based on the ratio of the volume sizes.

**Refinement:** Multi-scale iterative optimisation with gradient-based similarity, using Powell's method. The `use_gradient` flag (default 1) uses gradient images rather than raw intensities for the similarity computation.

The number of multi-resolution levels is `nreductions` (default 1).

## Configuration Options

Positional usage: `mri_linear_register [options] <in_volume> <ref_volume> <output_lta>`

All option flags use a single `-` prefix and are case-insensitive.

### Positional arguments

| Position | Description |
|----------|-------------|
| 1 | Input (moving) volume (converted to `MRI_UCHAR` internally) |
| 2 | Reference (fixed) volume (converted to `MRI_UCHAR` internally) |
| 3 | Output LTA transform file |

### Transform DOF and initialisation

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-invert` | (none) | off | Invert the final transform before writing |
| `-voxel` | (none) | off | Output transform in voxel coordinates instead of RAS |
| `-nopca` | (none) | off | Skip PCA-based principal-axis initialisation |
| `-d <tx> <ty> <tz>` | 3 floats | 0 0 0 | Apply an initial translation (voxels) to the input volume before registration |
| `-r <rx> <ry> <rz>` | 3 floats | 0 0 0 | Apply initial rotations (degrees, converted to radians) around X, Y, Z axes |
| `-t <lta_file>` | path | none | Load a previously computed LTA transform as the initialisation |
| `-num <n>` | int | 1 | Number of simultaneous transforms to find (mixture model) |

### Multi-resolution

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-reduce <n>` | int | 1 | Number of times to halve resolution before registering (pyramid levels) |
| `-full_res` | (none) | off | Keep full-resolution diagnostic images in `parms` struct (for visualisation) |

### Similarity and regularisation

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-intensity <w>` / `-corr <w>` | float | 1.0 | Weight for intensity (cross-correlation) similarity term `l_intensity` |
| `-dist <w>` | float | (from `parms`) | Weight for distance term `l_dist` |
| `-area <w>` | float | (from `parms`) | Weight for area preservation term `l_area` |
| `-nlarea <w>` | float | (from `parms`) | Weight for nonlinear area term `l_nlarea` |
| `-priors <w>` | float | 1.0 | Weight for prior term (requires `-x` to load mean/covariance) |

### Optimiser

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-n <n>` | int | 25 | Number of gradient-descent iterations |
| `-dt <val>` | float | 5e-6 | Integration time step |
| `-tol <val>` | float | 1e-3 | Convergence tolerance |
| `-w <n>` | int | (from `parms`) | Write diagnostic snapshots every `n` iterations (enables `DIAG_WRITE`) |
| `-m <val>` | float | 0.8 | Momentum for gradient update |
| `-s <val>` | float | (from `parms`) | Upper bound on blurring sigma at coarsest level |
| `-levels <n>` | int | −1 (use default) | Override number of pyramid levels for morph optimiser |
| `-scout` | (none) | off | Limit integration domain to central slices |
| `-factor <val>` | float | 1.0 | Time step scaling factor |

### Image preprocessing

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-b <sigma>` / `-blur <sigma>` | float | 2.0 | Pre-blur input with Gaussian of the given sigma before registration |
| `-thresh <t>` | uchar | 40 | Low-intensity threshold: voxels below this are excluded from the cost |
| `-window <r>` | float | 0.0 | Apply Hanning window with radius `r` around the centre-of-mass before registration (0 = disabled) |

### Variance/prior inputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-v <var_file>` | path | none | Read a standard-deviation volume and concatenate it with the reference (adds uncertainty weighting) |
| `-x <mean_file> <cov_file>` | 2 paths | none | Read transform mean and covariance from ASCII files (for prior-regularised registration); enables prior term |
| `-nlevels <n>` | int | (from `parms`) | Maximum number of pyramid levels for the morph |
| `-image_size <n>` | int | (from code default) | Default output image size for diagnostic snapshots |
| `-crop` | (none) | off | Enable crop-region detection before registration |

## Configuration Interactions

- `-nopca` skips the PCA axis-alignment initialisation; useful when the initial alignment is already close.
- `-d tx ty tz` and `-r rx ry rz` apply a rigid pre-transformation to the input *before* PCA initialisation; they do not disable PCA.
- `-t <lta>` loads a full precomputed transform and sets `transform_loaded = 1`, skipping the `LTAalloc` default.
- `-num <n>` > 1 enables a multi-transform (mixture) registration mode and requires `-x` mean/covariance files.
- `-x <mean> <cov>` enables prior-regularised registration; `-priors` controls the weight; without `-x`, `-priors` has no effect.
- `-v <var>` appends a variance frame to the reference volume; only meaningful when the optimiser is configured to use it.
- Internally, both input and reference are converted to `MRI_UCHAR` before processing; very bright images may saturate.

## Typical Use Cases

```bash
# Register moving to reference
mri_linear_register ref.mgz moving.mgz registered.mgz

# Skip PCA, start from provided translation
mri_linear_register ref.mgz moving.mgz registered.mgz \
  -nopca -tx 5.0 -ty -2.0 -tz 3.0
```

## Pipeline Context

Not a standard `recon-all` stage. An older registration tool; newer alternatives include `mri_em_register` (atlas-based) and `mri_robust_register` (robust affine).

## Gotchas and Caveats

- The PCA initialisation binarises the input by default. Images with non-uniform intensity or multiple tissue classes may produce poor axis estimates.
- `blur_sigma` of 2.0 mm is applied before similarity computation; this may be too much for high-resolution data.
- The tool uses morph-parms (`MORPH_PARMS`) internally, a legacy structure that may interact with other registration tools unexpectedly.

## Related Tools

- [[mri_em_register]] — atlas-based affine registration (preferred for atlas alignment)
- [[mri_robust_register]] — robust affine registration
- [[mri_linear_align]] — newer intensity-based linear alignment

## Confidence and Gaps

**High confidence:** Full `get_option()` function read; all flags, argument counts, and defaults confirmed from source. The tool writes an LTA (not a registered volume) as output.

**Medium confidence:** Default values for `parms` sub-fields (`l_area`, `l_nlarea`, `l_dist`, `parms.sigma`, `parms.niterations` default in code = 25, `max_levels`, etc.) were read from the initialisation block at the top of `main()` but some are set in the `MORPH_PARMS` struct default elsewhere in the library.
