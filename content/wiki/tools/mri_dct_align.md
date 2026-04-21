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
last_agent_update: 2026-04-15
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
- LTA transform file via `-lta fname` for affine initialization
- Aseg file via `-aseg` for specialized modes (hippocampus, WM)

## Outputs

- **DCT file** (`output`): text file containing the DCT warp parameters
- **`output.mgz`**: aligned source volume (if `apply_transform = 1`, which is the default)
- Intermediate snapshot volumes during optimization (if `write_iterations > 0`)

## Mathematical Foundations

The deformation is represented as a DCT basis expansion:

$$
d(x) = \sum_{k=0}^{N} c_k \phi_k(x)
$$

where $\phi_k$ are DCT basis functions and $c_k$ are the coefficients optimized. The number of coefficients `Gncoef` defaults to 5.

**Cost function:** sum of squared intensity differences between the smoothed source (warped) and target volumes:
$$
E = \sum_{\mathbf{x}} \left[ I_\text{src}(T(\mathbf{x})) - I_\text{tgt}(\mathbf{x}) \right]^2
$$

with Gaussian smoothing applied at each scale (sigma decreasing from initial value to 0.25).

**Multi-scale strategy:**
- Outer loop over sigma (halved each iteration until sigma < 0.25)
- Inner loop over `mp.npasses = skip+1` passes per sigma level
- Skip (subsampling) starts at default 4 and halves each inner pass

**Optimization:** default is quasi-Newton minimization (`quasi_newton_minimize`) with Powell as alternative (`use_powell`).

The affine initialization converts the LTA to a vox-to-vox matrix and applies `MRITransformedCenteredMatrix()` before DCT optimization begins.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-lta fname` | file | none | LTA affine initialization transform |
| `-sigma s` | float | 4.0 | Initial Gaussian smoothing sigma |
| `-skip N` | int | 4 | Initial voxel subsampling step |
| `-ncoef N` | int | 5 | Number of DCT coefficients |
| `-powell` | — | off | Use Powell optimizer instead of quasi-Newton |
| `-noapply` | — | off | Do not apply transform to write aligned volume |
| `-upsample N` | int | 0 | Upsample source before alignment |
| `-aseg fname` | file | none | Aseg file (for specialized modes) |
| `-mode N` | int | NONE | Processing mode: 0=none, 1=angio, 2=hippo, 3=wm, 4=label |
| `-mode_filters N` | int | 0 | Apply mode filter N times to output |
| `-morph_to` | — | off | Morph from atlas to subject (reverse direction) |
| `-find_label l x y z` | int,3 floats | — | Find specific label at RAS coordinates |
| `-source_intensity_fname fname` | file | none | Use separate intensity volume for cost |
| `-cj` | — | off | Constrain Jacobian determinant |
| `-neg` | — | off | Allow negative Jacobian determinants |
| `-scale_smoothness N` | float | — | Scale smoothness regularizer |
| `-debug_voxel x y z` | 3 ints | — | Debug output at specific voxel |
| `-write_iterations N` | int | 0 | Write snapshot volumes every N iterations |

## Configuration Interactions

- `-powell` selects the optimizer; quasi-Newton is the default and generally preferred.
- `-noapply` suppresses writing the aligned `.mgz`; only the DCT parameter file is saved.
- `-mode hippo` (2) triggers hippocampus-specific preprocessing using `HIPPOestimateIntensityImage()`.
- `-cj` enables Jacobian constraint with `ratio_thresh=0.25`; implies `l_jacobian=0` and `noneg=false`.

## Typical Use Cases

Align source to target with 5 DCT coefficients:
```bash
mri_dct_align source.mgz target.mgz warp.dct
```

Initialize with affine transform:
```bash
mri_dct_align -lta affine.lta source.mgz target.mgz warp.dct
```

Increase coefficient count for finer alignment:
```bash
mri_dct_align -ncoef 10 source.mgz target.mgz warp.dct
```

## Pipeline Context

Not called by [[recon-all]]. Used in specialized registration workflows requiring smooth, low-dimensional deformation fields. Can be used in combination with [[mri_concatenate_gcam]] to compose with other morphs.

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
