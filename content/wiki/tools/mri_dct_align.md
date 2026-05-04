---
title: "mri_dct_align"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_dct_align/mri_dct_align.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_dct_align_binary]]"
  - "[[mri_concatenate_gcam]]"
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "DCT warp format (.dct file) not described in wiki — needs a format spec page"
  - "Number of DCT coefficients and their physical meaning not fully documented"
  - "quasi_newton_minimize vs. powell_minimize trade-offs not fully characterized"
tags:
  - registration
  - nonlinear
  - DCT
  - alignment
---

# mri_dct_align

## Summary

`mri_dct_align` computes a nonlinear alignment between two volumes using a Discrete Cosine Transform (DCT) basis representation for the deformation field. Starting from an affine initialization (LTA), it optimizes DCT coefficients at multiple spatial frequencies and scales using Powell or quasi-Newton minimization of a sum-of-squares intensity cost. The DCT warp and optionally the aligned source volume are written to output.

## Source Information

- **Language:** C++
- **Source file:** `mri_dct_align/mri_dct_align.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

DCT-based nonlinear registration parameterizes the deformation field using a small number of smooth basis functions, constraining the warp to be spatially smooth by construction. This is useful for:
- Fine alignment of structures after an initial affine registration
- Registration of binary label maps (for which voxel-level dense deformation is unnecessary)
- Regularized nonlinear alignment with control over the spatial frequency of the warp

The tool operates in a coarse-to-fine manner: it starts with a large Gaussian smoothing sigma and progressively reduces it to capture finer deformation details.

## Inputs

- **`source`** (argv[1]): source volume
- **`target`** (argv[2]): target/reference volume
- **`output`** (argv[3]): output DCT file (and optionally `output.mgz`)

Optional:
- LTA transform file via `-t fname` for affine initialization
- Aseg file via `-hippo aseg.mgz` for hippocampus mode

## Outputs

- **DCT file** (`output`): text file containing the DCT warp parameters
- **`output.mgz`**: aligned source volume (if `apply_transform = 1`, which is the default)
- Intermediate snapshot volumes during optimization (if `write_iterations > 0`)

## Mathematical Foundations

The deformation is represented as a DCT basis expansion:

$$
d(x) = \sum_{k=0}^{N} c_k \phi_k(x)
$$

where $\phi_k$ are DCT basis functions and $c_k$ are the coefficients optimized. The number of coefficients defaults to 5 (set with `-n`).

**Cost function:** sum of squared intensity differences between the smoothed source (warped) and target volumes:
$$
E = \sum_{\mathbf{x}} \left[ I_\text{src}(T(\mathbf{x})) - I_\text{tgt}(\mathbf{x}) \right]^2
$$

with Gaussian smoothing applied at each scale (sigma decreasing from initial value to 0.25).

**Multi-scale strategy:**
- Outer loop over sigma (halved each iteration until sigma < 0.25)
- Inner loop over `mp.npasses` passes per sigma level (default = skip+1 = 5)
- Skip (subsampling) starts at default 4 (`-skip`) and halves each inner pass

The affine initialization converts the LTA to a vox-to-vox matrix and applies `MRITransformedCenteredMatrix()` before DCT optimization begins.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-t <fname>` | file | — | LTA affine initialization transform |
| `-sigma <f>` | float | 4.0 | Initial Gaussian smoothing sigma |
| `-skip <n>` | int | 4 | Initial voxel subsampling step |
| `-n <n>` | int | 5 | Number of DCT coefficients (`Gncoef`) |
| `-m <f>` | float | — | Momentum for integration (`mp.momentum`) |
| `-momentum` | — | — | Use fixed-step integration (alias for `-fixed`) |
| `-fixed` | — | — | Use fixed-step integration (`GCAM_INTEGRATE_FIXED`) |
| `-area <f>` | float | — | Area energy weight (`l_area`) |
| `-tol <f>` | float | — | Convergence tolerance (`mp.tol`) |
| `-si <f>` | float | -1.0 | Smooth GCAM intensities with sigma f |
| `-rthresh <f>` | float | — | Jacobian ratio compression threshold |
| `-dt <f>` | float | — | Integration time step (`mp.dt`) |
| `-passes <n>` | int | — | Number of integration passes per sigma level |
| `-levels <n>` | int | — | Number of multi-resolution levels |
| `-upsample <n>` | int | 0 | Upsample source N times before alignment |
| `-hippo <aseg>` | file | — | Hippocampus mode: source is hires hippo, target is aseg |
| `-wm` | — | — | WM mode: source and target are white matter volumes |
| `-none` | — | — | No assumptions about label types (default mode) |
| `-morph_to` | — | off | Morph from atlas to subject (reverse direction) |
| `-find_label <l> <x> <y> <z>` | int+3 floats | — | Find label l at RAS coordinates (x, y, z) |
| `-i <fname>` | file | — | Intensity image for debugging (`source_intensity_fname`) |
| `-f <n>` | int | 0 | Apply n mode filters to output before writing |
| `-b <f>` | float | — | Binary energy weight (`l_binary`) |
| `-j <f>` | float | — | Jacobian energy weight (`l_jacobian`) |
| `-a <n>` | int | — | Smooth gradient with n averages (`mp.navgs`) |
| `-k <f>` | float | — | Exponential coefficient (`mp.exp_k`) |
| `-w <n>` | int | 0 | Write snapshot volumes every n iterations |
| `-view <x> <y> <z>` | 3 ints | — | View diagnostic output at voxel (x, y, z) |
| `-cj` | — | off | Constrain Jacobian; enables ratio threshold, sets `l_jacobian=0` |
| `-neg` | — | off | Allow negative Jacobian determinants |
| `-scale_smoothness <n>` | int | — | Scale smoothness coefficient and set npasses=2 |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Debug output at voxel (x, y, z) |

## Configuration Interactions

- Quasi-Newton minimization (`quasi_newton_minimize`) is the default optimizer; there is no user-accessible flag to switch to Powell in this version (the `use_powell` variable is set internally).
- `-hippo` uses a specialized intensity estimation preprocessing step (`HIPPOestimateIntensityImage()`); requires an aseg volume as argument.
- `-wm` and `-none` select simpler processing modes; `-none` is the default.
- `-cj` enables Jacobian constraint with `ratio_thresh=0.25`; implies `l_jacobian=0` and `noneg=false`.
- `-momentum` and `-fixed` are aliases selecting the fixed-step integration type.

## Typical Use Cases

Align source to target with 5 DCT coefficients:
```bash
mri_dct_align source.mgz target.mgz warp.dct
```

Initialize with affine transform:
```bash
mri_dct_align -t affine.lta source.mgz target.mgz warp.dct
```

Increase coefficient count for finer alignment:
```bash
mri_dct_align -n 10 source.mgz target.mgz warp.dct
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]]. Used in specialized registration workflows requiring smooth, low-dimensional deformation fields. Can be used in combination with [[mri_concatenate_gcam]] to compose with other morphs.

## Gotchas and Caveats

> [!gotcha] Output format is non-standard
> The `.dct` output file is a text dump of DCT coefficients, not a standard GCAM or LTA. It can only be applied using `DCTapply()` called from within `mri_dct_align` itself (with `-morph_to` or similar). There is no standalone tool to apply a `.dct` file to an arbitrary volume.

> [!gotcha] Initial smoothing sigma
> The default sigma of 4 may be too high or too low depending on the image resolution and expected deformation magnitude. For sub-millimeter data, a smaller initial sigma may be appropriate.

## Related Tools

- [[mri_dct_align_binary]] — DCT alignment specialized for binary label volumes
- [[mri_concatenate_gcam]] — compose DCT/GCAM morphs

## Confidence and Gaps

Confidence is **medium**. Core logic is clear. DCT file format and full optimization details require further investigation.

> [!gap] DCT file format
> The `.dct` file written by `DCTdump(dct, fp)` is not documented elsewhere in the wiki. A format specification page should be created.
