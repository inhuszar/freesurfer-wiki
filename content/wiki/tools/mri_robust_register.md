---
title: "mri_robust_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_robust_register/mri_robust_register.cpp"
  - "mri_robust_register/Registration.cpp"
  - "mri_robust_register/RegRobust.cpp"
  - "mri_robust_register/CostFunctions.cpp"
  - "mri_robust_register/RobustGaussian.cpp"
  - "mri_robust_register/Regression.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_robust_template]]"
  - "[[mri_em_register]]"
  - "[[mri_rigid_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Exact saturation parameter auto-detection (--satit) algorithm"
tags:
  - registration
  - robust
  - linear
  - longitudinal
  - outlier-rejection
---

# mri_robust_register

## Summary

`mri_robust_register` performs linear registration (rigid, affine, or translation-only) of two MRI volumes using robust statistics to handle outliers. It implements the algorithm from Nestares and Heeger (2000) extended to MRI brain registration. The registration is insensitive to partial image overlap, intensity differences, and brain-extracted vs. non-brain-extracted inputs. It is the standard FreeSurfer tool for inter-session and cross-subject linear registration, and is particularly important for longitudinal processing.

## Source Information

- **Language:** C++
- **Source directory:** `mri_robust_register/`
- **Main source:** `mri_robust_register/mri_robust_register.cpp`
- **Key modules:** `Registration.cpp`, `RegRobust.cpp`, `CostFunctions.cpp`, `RobustGaussian.cpp`, `Regression.cpp`, `MultiRegistration.cpp`
- **Algorithm reference:** Nestares O, Heeger DJ. "Robust Multiresolution Alignment of MRI Brain Volumes." Magn Reson Med 2000; 43:705-715.
- **Original author:** Martin Reuter (Nov. 4th, 2008)
- **Key library:** VNL (VXL numerics library) for SVD and matrix operations

## Purpose and Context

`mri_robust_register` provides robust linear registration for:
1. **Longitudinal studies:** Registering timepoints within the same subject, where subtle intensity changes and small motion must be handled carefully.
2. **Multi-modality registration:** Registering FLASH, MPRAGE, T2, and other modalities.
3. **Partial overlap:** When images are cropped or have different FOVs.

The key innovation is the use of robust M-estimation to down-weight or exclude outlier voxels (those with large intensity discrepancies, typically at boundaries, lesions, or motion-corrupted regions). This is controlled by the saturation parameter (`--sat` or auto-detected with `--satit`).

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Moving volume | `--mov <fname>` | The volume to be registered (source) |
| Destination volume | `--dst <fname>` | The reference volume (target) |
| Initial transform | `--transform <lta>` | Starting transform (optional) |
| Moving mask | `--maskmov <fname>` | Brain mask for moving volume |
| Destination mask | `--maskdst <fname>` | Brain mask for destination volume |

## Outputs

| Output | Flag | Description |
|--------|------|-------------|
| [[lta-format|LTA file]] | `--lta <fname>` | Output linear transform in LTA format |
| Weight volume | `--weights <fname>` | Per-voxel robust weights (1=trusted, 0=outlier) |
| Half-way moving | `--halfmov <fname>` | Moving volume warped to half-way space |
| Half-way destination | `--halfdst <fname>` | Destination volume warped to half-way space |
| Intensity scale | `--iscaleout <fname>` | Estimated global intensity scale factor |

## Mathematical Foundations

The robust registration minimizes a cost function:

$$
E(T) = \sum_v w_v \cdot \rho\!\left(\frac{I_\text{mov}(T(v)) - I_\text{dst}(v)}{\sigma}\right)
$$

where:
- $T$ is the registration transform (rigid, affine, etc.)
- $w_v$ are voxel-wise robust weights (initialized to 1, iteratively re-estimated)
- $\rho(\cdot)$ is a robust cost function (Tukey biweight by default)
- $\sigma$ is estimated from the residuals

The saturation parameter $c$ of the Tukey biweight determines the outlier rejection threshold: residuals beyond $c \cdot \sigma$ receive weight 0.

**Multi-resolution strategy:** The optimization proceeds at multiple resolution levels (coarse-to-fine), with the transform estimated at each level using the result from the previous level as initialization.

**Half-way registration:** By default, the registration is symmetric — the transform is estimated to the "half-way space" between source and target, minimizing bias toward either image. Symmetry is on by default and disabled with `--nosym`.

> [!math] Intensity scale
> With `--iscale`, the optimization also estimates a global intensity scale factor $s$ such that:
> $$
> E(T, s) = \sum_v w_v \cdot \rho\!\left(\frac{s \cdot I_\text{mov}(T(v)) - I_\text{dst}(v)}{\sigma}\right)
> $$

## Configuration Options

All flags use `--` prefix and are case-insensitive. Single-letter aliases are noted in parentheses.

### Required inputs/outputs

| Flag | Alias | Argument | Default | Description |
|------|-------|----------|---------|-------------|
| `--mov` / `--m` | `-m` | `<fname>` | required | Moving (source) volume to be registered |
| `--dst` / `--d` | `-d` | `<fname>` | required | Destination (target/reference) volume |
| `--lta` | — | `<fname>` | required (unless `--iscaleonly`) | Output linear transform in LTA format |

### Degrees of freedom

| Flag | Alias | Argument | Default | Description |
|------|-------|----------|---------|-------------|
| `--affine` / `--a` | `-a` | (none) | off | Use affine (12 DOF) registration instead of rigid (6 DOF) |
| `--transonly` | — | (none) | off | Translation-only (3 DOF) registration |
| `--isoscale` | — | (none) | off | Add isotropic scale (7 DOF: rigid + uniform scale) |
| `--iscale` / `--i` | `-i` | (none) | off | Also estimate a global intensity scale factor jointly with the transform |
| `--iscaleonly` | — | (none) | off | Estimate intensity scale only; skip all spatial registration |

### Robust cost function

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sat` | `<float>` | −1 (auto) | Saturation parameter for Tukey biweight M-estimator; voxels with residual > `sat·σ` receive weight 0 |
| `--satit` | (none) | off | Iteratively auto-detect `--sat` to ensure outlier fraction stays below `--wlimit` |
| `--wlimit` | `<float>` | 0.16 | Target maximum outlier fraction used by `--satit` |
| `--cost` | `<string>` | `ROB` | Cost function: `ROB` (robust M-estimator), `LS` (least-squares), `MI`, `NMI`, `ECC`, `NCC`, `SCR`, `TB`, `LNCC`, `SAD`, `SB`, `ROBENT` (robust + entropy) |
| `--leastsquares` | (none) | off | Shorthand for `--cost LS`; disables robust outlier rejection |
| `--satest` | (none) | off | Attempt to estimate saturation value (parsed but effectively dead code — the implementing block is annotated "never reached???"; use `--satit` instead) |

### Initialisation

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--transform` / `--ixform` | `<lta>` | none | Load a pre-computed initial transform (LTA) before optimisation |
| `--initorient` | (none) | off | Initialise orientation by aligning principal axes of the two images |
| `--initscaling` | (none) | off (inittrans=on) | Initialise scale from image dimensions; note: translation initialisation from centre-of-mass is **on by default** and disabled by `--noinit` |
| `--noinit` | (none) | off | Skip centre-of-mass translation initialisation |

### Multi-resolution control

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--nomulti` | (none) | off | Skip multi-resolution pyramid; optimise only at native resolution |
| `--maxit` | `<int>` | 5 | Maximum iterations at each resolution level |
| `--highit` | `<int>` | −1 (use `--maxit`) | Override maximum iterations at the finest (highest) resolution level only |
| `--epsit` | `<float>` | 0.01 | Convergence threshold: stop iterating when parameter change is less than this value |
| `--subsample` | `<int>` | −1 (off) | Subsampling threshold: subsample all axes if the largest dimension exceeds this value (−1 = never subsample) |
| `--minsize` | `<int>` | −1 (no limit) | Coarsest resolution level: smallest dimension of the pyramid (voxels) |
| `--maxsize` | `<int>` | −1 (no limit) | Finest resolution level: largest dimension allowed for the pyramid (voxels) |

### Symmetry and output space

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--nosym` | (none) | off | Disable symmetric (half-way space) registration; resample source directly into target space |
| `--vox2vox` | (none) | off | Write the output LTA as a voxel-to-voxel transform instead of RAS-to-RAS |

> [!gotcha] Symmetric registration is ON by default
> With symmetry enabled (the default), the `--lta` output is the transform to the **half-way space**, not from source to destination. For a full source-to-destination transform, use `--halfmovlta` and `--halfdstlta`, or add `--nosym`.

### Masking

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--maskmov` | `<fname>` | none | Binary mask applied to the moving volume before registration |
| `--maskdst` | `<fname>` | none | Binary mask applied to the destination volume before registration |

### Output volumes

| Flag | Alias | Argument | Default | Description |
|------|-------|----------|---------|-------------|
| `--mapmov` / `--warp` | `--warp` | `<fname>` | none | Save the moving volume resampled into the destination (or half-way) space |
| `--mapmovhdr` | — | `<fname>` | none | Save the moving volume with only its header adjusted to the target space (no resampling) |
| `--weights` | — | `<fname>` | none | Save the per-voxel robust weights (1 = inlier, 0 = outlier) in destination space |
| `--halfmov` | — | `<fname>` | none | Save the moving volume warped to the half-way space |
| `--halfdst` | — | `<fname>` | none | Save the destination volume warped to the half-way space |
| `--halfweights` | — | `<fname>` | none | Save the robust weights in the half-way space (from the last iteration) |
| `--halfmovlta` | — | `<fname>` | none | Save the LTA from moving to half-way space |
| `--halfdstlta` | — | `<fname>` | none | Save the LTA from destination to half-way space |
| `--iscalein` | — | `<fname>` | none | Load an initial global intensity scale factor from a text file |
| `--iscaleout` | — | `<fname>` | none | Write the estimated intensity scale factor to a text file (implies `--iscale`) |
| `--oneminusw` | — | (none) | off | Invert weight output so that 0 = inlier, 1 = outlier (matches older behaviour) |

### Entropy-based cost (experimental)

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--entradius` / `--radius` | `<int>` | 5 | Half-side of the local box used for entropy computation; box side = 2·radius + 1 |
| `--entball` | (none) | off | Use a spherical neighbourhood instead of a cubic box for entropy computation |
| `--entcorrection` | (none) | off | Enable 'correction' mode in entropy image computation |
| `--entmov` | `<fname>` | none | Save the entropy image computed from the moving volume |
| `--entdst` | `<fname>` | none | Save the entropy image computed from the destination volume |

### Image preprocessing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--conform` | (none) | off | Conform both volumes to 256³ voxels at 1 mm isotropic before registration |
| `--floattype` | (none) | off | Force internal conversion of both volumes to float (MRI_FLOAT) regardless of input type |
| `--doubleprec` | (none) | off | Use double-precision floating-point arithmetic throughout (higher memory usage) |
| `--uchar` | (none) | off | Convert volumes to unsigned char (with intensity rescaling and histogram clipping) before registration |
| `--sobel` | (none) | off | Replace intensity images with their Sobel gradient magnitude before registration |
| `--whitebgmov` | (none) | off | Invert the moving volume before registration (use when background is white, not black) |
| `--whitebgdst` | (none) | off | Invert the destination volume before registration |

### Optimiser

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--powelltol` | `<float>` | 1e-5 | Tolerance for Powell optimiser convergence |

### Diagnostics

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--verbose` | `<int>` | 1 | Verbosity level (0 = silent, 1 = normal, higher = more detail) |
| `--debug` | (none) | off | Enable debug output and write intermediate files |
| `--test` | `<int> <file>` | — | Developer test mode: calls `RegRobust::testRobust(file, int)` and exits immediately; not intended for production use |
| `--help` / `--h` | (none) | — | Print usage and exit |
| `--version` | (none) | — | Print version string and exit |

> [!gotcha] Dead code: `--satest`
> The `--satest` flag is parsed (sets `P.dosatest = true`) but the source comment explicitly marks the block "never reached???" and advises using --satit instead. This flag has no functional effect.

## Configuration Interactions

- `--affine`, `--transonly`, and `--iscaleonly` select degrees of freedom and are mutually exclusive. `--iscaleonly` also implicitly disables `--affine`, `--isoscale`, `--initscaling`, `--transonly`, `--initorient`, and `--noinit`.
- `--satit` iteratively adjusts `--sat`; providing `--sat <val>` directly bypasses iteration. When neither is given the tool will error unless `--cost` is non-ROB or `--leastsquares` is set.
- Symmetric registration is enabled by default. Disable with `--nosym` to produce a direct source-to-destination LTA. All `--half*` outputs require the default symmetric mode.
- `--iscaleout` implies `--iscale`; specifying `--iscaleout` without `--iscale` is legal (the flag adds `--iscale` automatically).
- `--mapmov` and --weights cannot be the same filename (checked at startup).
- `--cost ROBENT` is equivalent to `--cost ROB --entradius <default>` and activates entropy-based robust cost.
- `--leastsquares` is equivalent to `--cost LS`; both set `P.leastsquares = true`.
- `--maskmov` / `--maskdst` restrict the optimisation to brain voxels; without masks the full FOV is used, which may include neck/skull.
- `--powelltol` is independent of `--epsit`; `--epsit` controls the outer convergence loop while `--powelltol` controls the inner Powell optimiser.

## Typical Use Cases

```bash
# Standard rigid registration (longitudinal)
mri_robust_register --mov tp2/mri/orig.mgz --dst tp1/mri/orig.mgz \
  --lta tp2_to_tp1.lta --satit

# Affine registration with intensity scaling
mri_robust_register --mov flash.mgz --dst mprage.mgz \
  --lta flash_to_mprage.lta --affine --iscale --satit

# Registration with brain masks and half-way outputs
mri_robust_register \
  --mov tp2/mri/brain.mgz \
  --dst tp1/mri/brain.mgz \
  --maskmov tp2/mri/brainmask.mgz \
  --maskdst tp1/mri/brainmask.mgz \
  --lta tp2_to_tp1.lta \
  --halfmov halfway_tp2.mgz \
  --halfdst halfway_tp1.mgz \
  --satit
```

## Pipeline Context

`mri_robust_register` is not a standard step in the main [[recon-all]] cross-sectional pipeline, but it is central to:

1. **Longitudinal pipeline (`recon-all -long`):** Registers each timepoint to the base template.
2. **`mri_robust_template`:** Called internally by [[mri_robust_template]] to register each input to the evolving template.

## Gotchas and Caveats

> [!gotcha] Saturation parameter is critical
> The `--sat` parameter controls outlier rejection aggressiveness. A value too low will reject too many voxels (making registration unreliable); too high will not reject sufficient outliers. `--satit` is recommended for automated pipelines.

> [!gotcha] Symmetric registration produces half-way transforms
> With symmetric registration on by default, the `--lta` output is a transform to the **half-way space**, not from source to destination. For a full source-to-destination transform, use `--halfmovlta` and `--halfdstlta`, or add `--nosym`.

> [!gotcha] VNL/ITK dependency
> `mri_robust_register` depends on the VNL (VXL numerics library) and uses ITK/VXL includes. It must be compiled with these libraries. In pre-built FreeSurfer distributions this is handled automatically.

## Related Tools

- [[mri_robust_template]] — Multi-image template creation using robust registration
- [[mri_em_register]] — Atlas-based EM registration
- [[mri_rigid_register]] — Older, less reliable rigid registration (legacy)
- [[coordinate-systems]] — Coordinate system reference

## Confidence and Gaps

**High confidence:** Complete flag list verified from `parseNextCommand()` in source; all default values read from the `static struct Parameters P = {…}` initializer; algorithm reference (Nestares & Heeger 2000); symmetric registration default (on); VNL dependency.

> [!gap] satit algorithm
> The auto-detection algorithm for the saturation parameter (`--satit`) is implemented in `RegRobust.cpp`; its exact iterative method was not read in detail.
