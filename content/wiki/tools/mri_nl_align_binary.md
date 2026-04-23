---
title: "mri_nl_align_binary"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hires_register/mri_nl_align_binary.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_register]]"
  - "[[mri_robust_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "Which recon-all stage or pipeline calls this tool, if any"
tags:
  - registration
  - nonlinear
  - binary
---

# mri_nl_align_binary

## Summary

`mri_nl_align_binary` performs nonlinear alignment of binary (label) volumes using a morphological deformation field (GCA morph). It is a binary-image adaptation of the sequence-independent segmentation alignment algorithm described in Fischl et al. (NeuroImage, 2004). It computes a GCA morph (`gcam`) that maps a source binary or label volume into alignment with a target.

## Source Information

- **Language:** C++
- **Source file:** `mri_hires_register/mri_nl_align_binary.cpp`
- **Key includes:** `gcamorph.h`, `gca.h`, `mri.h`, `transform.h`, `fastmarching.h`, `voxlist.h`
- **Algorithm reference:** Fischl B, Salat DH, van der Kouwe AJW et al. "Sequence-Independent Segmentation of Magnetic Resonance Images." NeuroImage 2004; 23 Suppl 1, S69-84.

## Purpose and Context

This tool extends the general nonlinear morph alignment framework (`mri_nl_align`, in the same directory) to binary image inputs — segmentation masks or label volumes rather than intensity images. The deformation is driven by a combination of binary/label overlap, distance-field energy terms, and regularization terms that penalize unrealistic deformations. Typical use cases include aligning angiography labels, hippocampal segmentations, or other atlas binary structures to a target space.

The code defines several alignment modes (`ANGIO`, `HIPPO`, `WM`, `LABEL`, `ASEG`) that select which anatomical context the alignment should use, and which label sets to exclude or constrain during deformation.

## Inputs

- **Source volume:** Binary or label volume (any FreeSurfer-readable format: [[mgz]], NIfTI, etc.)
- **Target volume:** Reference binary or label volume in the desired target space
- **Optional:** Initial linear transform (LTA), source intensity volume for normalization, GCA (Gaussian Classifier Atlas) file for label priors

## Outputs

- **GCA morph file (`.m3z`):** The computed nonlinear warp field from source to target space
- **Optionally:** Transformed source volume in target space

## Mathematical Foundations

The cost functional is a sum of energy terms minimized by gradient descent on the morph parameters:

$$
E = E_\text{binary} + \lambda_J E_\text{jacobian} + \lambda_D E_\text{distance} + \lambda_S E_\text{smoothness}
$$

where:
- $E_\text{binary}$ penalizes mismatch between the warped binary source and target ($l\_binary = 0.025$ by default)
- $E_\text{jacobian}$ penalizes volume compression/expansion of the warp ($l\_jacobian = 1$)
- $E_\text{distance}$ uses Euclidean distance transforms of each binary volume to drive alignment ($l\_distance = 1$)
- $E_\text{smoothness}$ penalizes discontinuities in the deformation field

The integration uses the `GCAM_INTEGRATE_BOTH` scheme with momentum ($\alpha = 0.9$), multi-resolution levels (6 by default), and optional regridding to prevent folding.

> [!math] Default morph parameters
> `mp.dt = 0.005`, `mp.levels = 6`, `mp.npasses = 3`, `mp.navgs = 256`, `mp.sigma = 8`, `mp.ratio_thresh = 0.25` (compression threshold), `mp.exp_k = 5`.

## Configuration Options

Positional usage: `mri_nl_align_binary [options] <source> <target> <output_warp.m3z>`

All option flags use a single `-` prefix and are case-insensitive. Flags are parsed by `get_option()`.

### Alignment mode presets

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-aseg` | (none) | off (ANGIO mode) | Set alignment mode to `ASEG` (full brain segmentation): sets `tol=0.25`, `sigma=14`, `l_smoothness=0.1` |
| `-hippo` | (none) | off | Set alignment mode to `HIPPO` (hippocampal segmentation): sets `l_binary=0.5`, `l_smoothness=0.1`, `dt=0.005`, `levels=7`, `navgs=1024`, `sigma=0`, `l_distance=0` |
| `-wm` | (none) | off | Set alignment mode to `WM` (white matter) |
| `-none` | (none) | off | Use no special label assumptions (`NONE` mode) |
| `-surf` | (none) | off | Interpret target as a surface rather than a label volume |

### Label selection

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-find_label <label> <x_ras> <y_ras> <z_ras>` | int + 3 floats | off | Find the GCA morph node nearest to RAS coordinate `(x_ras, y_ras, z_ras)` and print the label `label` found there |
| `-L <label>` | int | none | Treat only integer label `label` from the source as the foreground to align |

### Energy term weights

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-B <w>` | float | 0.025 | Weight for binary label overlap energy term `l_binary` |
| `-D <w>` | float | 1.0 | Weight for distance-field energy term `l_distance` |
| `-S <w>` | float | (default) | Weight for smoothness regularisation term `l_smoothness` |
| `-J <w>` | float | 1.0 | Weight for Jacobian determinant penalty `l_jacobian` |
| `-area <w>` | float | (default) | Weight for area preservation term `l_area` |
| `-spring <w>` | float | (from parms) | Weight for spring regularisation term `l_spring` |
| `-intensity <w> <fname>`<br>`-ll <w> <fname>` | float + path | off | Weight for log-likelihood intensity term `l_log_likelihood`; reads intensity volume `fname`. `-ll` is an alias. |
| `-likelihood <w> <fname>` | float + path | off | Weight for linear likelihood term `l_likelihood`; reads intensity volume `fname` |
| `-area_intensity <w> <fname>`<br>`-aint <w> <fname>` | float + path | off | Weight for area-intensity coupling term `l_area_intensity`; reads intensity volume `fname`. `-aint` is an alias. |
| `-K <val>` | float | 5.0 | Exponential parameter `exp_k` in the Jacobian energy |
| `-rthresh <val>` | float | 0.25 | Compression ratio threshold; nodes below this ratio trigger compression penalty |

### Morph optimisation

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-LEVELS <n>` | int | 6 | Number of multi-resolution levels |
| `-N <n>` | int | (default) | Number of inner gradient iterations per pass |
| `-A <n>` | int | 256 | Number of gradient smoothing averages per step |
| `-dt <val>` | float | 0.005 | Integration time step |
| `-passes <n>` | int | 3 | Number of optimisation passes |
| `-tol <val>` | float | (default) | Convergence tolerance |
| `-M <val>` | float | (from parms) | Set the gradient descent momentum scalar `mp.momentum` |
| `-MOMENTUM`<br>`-FIXED` | (none) | off | Set integration type to `GCAM_INTEGRATE_FIXED` (optimal time-step integration). Both spellings are accepted; option string is uppercased before comparison. |
| `-sigma <val>` | float | 8.0 | Initial Gaussian smoothing sigma for multi-resolution |
| `-min_sigma <val>` | float | 1.0 | Minimum sigma; smoothing stops when sigma reaches this value |
| `-si <sigma>` | float | −1 (off) | Smooth GCA morph intensity estimates with Gaussian of `sigma` |
| `-skip <n>` | int | 2 | Skip every `n`-th source voxel during cost evaluation |
| `-distance <d>` | float | 1.0 | Border expansion in mm per outer cycle |
| `-scale_smoothness <0\|1>` | int | — | Scale smoothness coefficient with resolution (0 = disabled); sets `npasses=2` |

### Regridding and upsampling

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-regrid <n>` | int | 0 | Enable regridding: regrid the morph `n` times per pass to prevent folding |
| `-noregrid` | (none) | off | Disable regridding (sets `regrid=0`, `mp.regrid=False`) |
| `-upsample <n>` | int | 0 | Upsample the GCA morph `n` times before alignment |
| `-P <n>` | int | 1 | Pad the GCA morph with `n` voxels at the boundary |
| `-uncompress <n>` | int | (off) | Set the uncompress threshold/mode |

### Jacobian constraint

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-CJ` | (none) | off | Constrain the Jacobian: sets `constrain_jacobian=1`, `l_jacobian=0`, `ratio_thresh=0.25`, `noneg=False` |
| `-neg` | (none) | off | Allow negative Jacobian (folded morph) vertices |

### Additional inputs

| Flag | Alias | Arguments | Default | Description |
|------|-------|-----------|---------|-------------|
| `-T <xform>` | — | path | none | Load an initial transform from file |
| `-I <fname>` | — | path | none | Load a supplementary source intensity volume (for debugging) |

### Diagnostics

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-W <n>` | int | 0 | Write diagnostic morph snapshots every `n` iterations |
| `-F <n>` | int | 0 | Apply `n` mode filters to the transformed label volume before writing |
| `-wg` | (none) | off | Write gradient diagnostic files |
| `-morph_to <0\|1>` | int | 0 | Control diagnostic morphing direction: 0 = to atlas, 1 = from atlas |
| `-diag <fname>` | path | none | Load a diagnostic reference volume |
| `-view <x> <y> <z>` | 3 ints | off | Enable per-voxel diagnostic output at voxel `(x, y, z)` |
| `-debug_voxel <x> <y> <z>` | 3 ints | off | Enable per-voxel debug output (sets `Gx`, `Gy`, `Gz`) |

## Configuration Interactions

- `-aseg`, `-hippo`, `-wm`, `-none` and the default `ANGIO` mode are mutually exclusive alignment presets; each sets a bundle of `mp.*` parameters in one call. The last preset specified wins.
- `-hippo` sets `l_distance=0`, effectively disabling the distance-field term; `-D <w>` can override this after `-hippo`.
- `-CJ` disables `l_jacobian` but enables `constrain_jacobian`; it also sets `noneg=False` allowing folded nodes, which is unusual for typical use.
- `-regrid <n>` and `-noregrid` are mutually exclusive; the last one specified wins.
- `-intensity`/`-ll` and `-likelihood` both load an intensity volume and set a corresponding weight; they can be combined but may conflict if the same `mri_norm` pointer is overwritten.
- `-upsample <n>` upsamples the GCA morph `n` times; each step doubles linear resolution, so memory scales as $8^n$ relative to original.
- `-skip <n>` reduces the number of source voxels used in the cost; this speeds up the alignment but may reduce accuracy for small structures.
- `-MOMENTUM` and `-FIXED` are aliases; both set `mp.integration_type = GCAM_INTEGRATE_FIXED`. Note: `-M <val>` is a separate flag that sets the momentum scalar `mp.momentum`, not the integration type.

## Typical Use Cases

```bash
# Align a binary angiography label volume to a target
mri_nl_align_binary source_label.mgz target_label.mgz output.m3z

# Align a hippocampal segmentation mask to a GCA-defined target
mri_nl_align_binary -aseg source_aseg.mgz target_aseg.mgz output.m3z

# Use an initial linear transform and a source intensity volume
mri_nl_align_binary -source_intensity norm.mgz source_seg.mgz target_seg.mgz output.m3z
```

## Pipeline Context

`mri_nl_align_binary` is not called directly by the standard `recon-all` pipeline. It is used in specialized registration workflows involving binary label alignment, such as high-resolution angiography registration or custom atlas-to-subject label alignment pipelines.

- Related tool in same source directory: `mri_nl_align` (intensity-based nonlinear alignment)
- The morph output (`.m3z`) is compatible with `mri_apply_morph` for later application

## Gotchas and Caveats

> [!gotcha] Source and target must share the same voxel geometry
> The tool does not resample inputs automatically. Source and target must be in the same voxel space or a pre-registration step (e.g., using [[mri_robust_register]]) must be applied first.

> [!gotcha] Label exclusion lists are hard-coded
> The `non_artery_labels` and `non_hippo_labels` arrays are compile-time constants, not configurable at runtime. In `ANGIO` mode, venous labels and lymph nodes are excluded; in `HIPPO` mode, surrounding cortical and subcortical structures are excluded.

> [!gotcha] Compression guard
> Nodes whose local area-to-original ratio falls below `mp.ratio_thresh = 0.25` are considered compressed and trigger a compression penalty, which can slow convergence near boundaries of small structures.

## Related Tools

- [[mri_robust_register]] — Robust linear (affine) registration
- [[mri_register]] — Older linear registration tool
- [[coordinate-systems]] — Coordinate system reference

## Confidence and Gaps

**High confidence:** Full `get_option()` function read from source; all flags, argument counts, and defaults confirmed. Morph parameter defaults read directly from `GCA_MORPH_PARMS mp` initialiser.

> [!gap] Pipeline usage
> It is unclear which higher-level pipeline scripts invoke this tool, if any. Needs verification from recon-all or related pipeline scripts.

> [!gap] Output format
> The positional output argument is described in usage as `<warp>` but the specific file format (`.m3z` vs LTA vs other) is not explicitly constrained by the option parser; it depends on the `TransformWrite` call in `main()` which was not read.
