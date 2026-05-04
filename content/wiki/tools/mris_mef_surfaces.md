---
title: "mris_mef_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_mef_surfaces.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_exvivo_surfaces]]"
  - "[[surface-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Whether this tool is still called by recon-all or has been superseded by mris_make_surfaces -T2 needs confirmation."
  - "The MEF normalisation step (MRInormalizeMEF) and its effect on intensity statistics needs documentation."
tags:
  - surface
  - multi-echo
  - FLASH
  - surface-placement
  - MEF
---

# mris_mef_surfaces

## Summary

`mris_mef_surfaces` places white matter and pial cortical surfaces using **multi-echo FLASH (MEF)** MRI data. It is a specialised variant of `mris_make_surfaces` that uses two FLASH echo channels (flip angles 30° and 5°) together with an EM-synthesized tissue probability map to compute tissue class statistics and guide surface deformation. It is co-located with `mris_make_surfaces` in the source tree and shares most of its logic.

## Source Information

- **Language:** C++
- **Primary source:** `mris_make_surfaces/mris_mef_surfaces.cpp`
- **Original author:** Bruce Fischl
- **Default input volumes:**
  - `flash30_T1` (INU-corrected 30° flip angle T1 map)
  - `flash5_T1` (INU-corrected 5° flip angle T1 map)
  - `atlas_EM_combined` (EM-synthesized tissue probability volume)

## Purpose and Context

Multi-echo FLASH MRI provides quantitative T1 maps with different contrast properties at different flip angles. The 5° flip angle FLASH image has better WM/GM contrast, while the 30° flip angle image is better for the GM/CSF (pial) boundary. Combined with an expectation-maximisation (EM) segmentation, the two channels provide complementary information for surface placement.

This tool was developed when multi-echo FLASH data acquisition was more common in the MGH FreeSurfer lab (ca. 2000–2010). With the advent of standard multimodal protocols using T2 or FLAIR alongside T1, this tool may have been partly superseded by the `-T2`/`-FLAIR` pathway in `mris_make_surfaces`.

## Inputs

| File | Path | Description |
|------|------|-------------|
| `flash30_T1.mgz` | `mri/flash30_T1.mgz` | INU-corrected FLASH 30° flip angle T1 volume. |
| `flash5_T1.mgz` | `mri/flash5_T1.mgz` | INU-corrected FLASH 5° flip angle T1 volume. |
| `atlas_EM_combined.mgz` | `mri/atlas_EM_combined.mgz` | EM-synthesized combined tissue map. |
| Initial surface | `surf/<hemi>.orig` | Topology-correct surface to deform. |
| WM volume | `mri/wm.mgz` | White matter binary mask. |
| Filled volume | `mri/filled.mgz` | Filled WM volume. |

## Outputs

| File | Path | Description |
|------|------|-------------|
| `<hemi>.white` | `surf/` | White matter surface (WM/GM boundary). |
| `<hemi>.pial` | `surf/` | Pial surface (GM/CSF boundary). |
| Curvature/thickness | `surf/` | Standard surface metric files. |

## Mathematical Foundations

The MEF surface placement extends the standard `mris_make_surfaces` energy functional to a two-channel formulation. Class statistics (WM mean and standard deviation, GM mean and standard deviation) are computed for both the 30° and 5° channels using `MRIcomputeClassStatistics_mef()`:

$$
\{(\mu_{w,30}, \sigma_{w,30}, \mu_{g,30}, \sigma_{g,30}),\ (\mu_{w,5}, \sigma_{w,5}, \mu_{g,5}, \sigma_{g,5})\}
$$

These statistics are used in `MRIScomputeBorderValues_MEF_WHITE()` and `MRIScomputeBorderValues_MEF_PIAL()` to compute border values for the white and pial surfaces respectively.

The EM-synthesized volume `atlas_EM_combined` is normalised using `MRInormalizeMEF()` to bring its intensity scale in line with the FLASH volumes before class statistics computation.

The deformation uses the same multi-scale integration framework as `mris_make_surfaces`:
- `nwhite = 20` iterations for white surface placement (vs. 100 in `mris_make_surfaces`)
- `ngray = 30` iterations for pial surface placement (vs. 100 in `mris_make_surfaces`)

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| (positional 1) | string | required | FreeSurfer subject name |
| (positional 2) | string | required | Hemisphere (`lh` or `rh`) |
| `-a <n>` | int | 10 | Average curvature values N times |
| `-add` | flag | off | Add vertices to tessellation during deformation |
| `-b <val>` | float | — | Base dt scale factor |
| `-c` | flag | off | Create curvature and area files from WM surface |
| `-curv` | — | — | Alias; see source |
| `-dt <val>` | float | — | Time step (also sets integration type to momentum) |
| `-em <name>` | string | `atlas_EM_combined` | Name of the EM tissue segmentation volume |
| `-em_combined <name>` | string | `atlas_EM_combined` | Alias for `-em` |
| `-em_seg <name>` | string | `atlas_EM_combined` | Alias for `-em` |
| `-flash30 <name>` | string | `flash30_T1` | Alias for `-t1_30` |
| `-flash5 <name>` | string | `flash5_T1` | Alias for `-t1_5` |
| `-grad <val>` | float | — | Set l_grad coefficient |
| `-graymid` | flag | off | Generate graymid (layer IV) surface |
| `-highres <label>` | path | — | Read high-resolution label; alias for `-hires` |
| `-hires <label>` | path | — | Read high-resolution deformation label |
| `-inoutin` | flag | off | Apply final WM deformation after pial pass |
| `-intensity <val>` | float | — | Set l_intensity coefficient |
| `-lm` | flag | off | Use line minimisation integration |
| `-long` | flag | off | Longitudinal scheme mode |
| `-lval <n>` | int | — | Fill value for left hemisphere |
| `-m <val>` | float | — | Momentum coefficient |
| `-max <val>` | float | — | Maximum cortical thickness |
| `-median` | flag | off | Apply median filter to intensity volumes |
| `-mgz` | flag | off | Assume MGZ format for volumes |
| `-n <n>` | int | — | Number of iterations |
| `-name <base>` | string | — | Base name for output files |
| `-nbhd_size <n>` | int | — | Neighbourhood size for thickness calculation |
| `-nbrs <n>` | int | — | Neighbourhood size for surface deformation |
| `-ngray <n>` | int | 30 | Pial surface integration steps |
| `-noauto` | flag | off | Disable auto-detection of border ranges |
| `-nowhite` | flag | off | Skip white surface placement; read previously computed surface |
| `-nspring <val>` | float | — | Set l_nspring (normal spring) coefficient |
| `-nwhite <n>` | int | 20 | White surface integration steps |
| `-o <name>` | string | — | Original vertex position surface name |
| `-orig_pial <surf>` | string | — | Starting pial surface name |
| `-orig_white <surf>` | string | — | Starting white surface name |
| `-output <suffix>` | string | — | Append suffix to output filenames |
| `-overlay` | flag | off | Toggle overlay of edited WM on T1 |
| `-pa <max> [<min>]` | int [int] | 16 [2] | Max (and optional min) pial curvature averages |
| `-pial <name>` | string | — | Write pial surface to named file |
| `-psigma <val>` | float | 2.0 | Gaussian sigma for pial gradient smoothing |
| `-q` | flag | off | Quick mode: no self-intersection test; gray/white only |
| `-r <val>` | float | — | Set l_surf_repulse coefficient |
| `-rval <n>` | int | — | Fill value for right hemisphere |
| `-s <suffix>` | string | — | Output filename suffix |
| `-scale_std <val>` | float | — | Scale estimated WM and GM standard deviation |
| `-sdir <dir>` | path | — | Override SUBJECTS_DIR |
| `-smooth <n>` | int | 5 | Surface smoothing iterations |
| `-smoothwm <n>` | int | — | Write smoothed WM surface with N smoothing iterations |
| `-spring <val>` | float | — | Set l_spring coefficient |
| `-t <fname>` | path | — | Apply ventricular transform from file |
| `-t130 <name>` | string | `flash30_T1` | Alias for `-t1_30` |
| `-t15 <name>` | string | `flash5_T1` | Alias for `-t1_5` |
| `-t1_30 <name>` | string | `flash30_T1` | INU-normalised FLASH 30° flip angle T1 volume name |
| `-t1_5 <name>` | string | `flash5_T1` | INU-normalised FLASH 5° flip angle T1 volume name |
| `-tsmooth <val>` | float | — | Set l_tsmooth coefficient |
| `-tspring <val>` | float | — | Set l_tspring (tangential spring) coefficient |
| `-u` | flag | off | Print usage |
| `-v <n>` | int | — | Set Gdiag_no diagnostic vertex |
| `-vavgs <n>` | int | 5 | Vertex value averaging iterations |
| `-w <n>` | int | — | Write diagnostics every N iterations |
| `-wa <max> [<min>]` | int [int] | 4 [0] | Max (and optional min) white curvature averages |
| `-white <name>` | string | — | White matter volume name |
| `-whiteonly` | flag | off | Generate white matter surface only; skip pial |
| `-write_vals` | flag | off | Write gray and white surface targets to `.w` files |
| `-wsigma <val>` | float | 2.0 | Gaussian sigma for white gradient smoothing |
| `-wvol <fname>` | path | — | Use named volume for white matter deformation |

## Configuration Interactions

- `-nowhite` and `-whiteonly` are mutually exclusive.
- Both FLASH channels must be present. The 5° channel guides white surface placement; the 30° channel guides pial placement.
- The EM volume (`atlas_EM_combined`) is required for class statistics estimation. Without it, the tool will fail.
- The `apply_median_filter` option (default: 0) applies a median filter to the intensity volumes before surface placement. This may help with noisy FLASH data.

## Typical Use Cases

```bash
# Standard MEF surface placement
mris_mef_surfaces subject01 lh

# Pial only (white surface already placed)
mris_mef_surfaces -nowhite subject01 lh
```

## Pipeline Context

`mris_mef_surfaces` was historically called in `recon-all` when MEF data was available. The current standard pipeline uses `mris_make_surfaces` with optional `-T2`/`-FLAIR` for multimodal pial refinement.

> [!gap] Current pipeline status
> Whether `mris_mef_surfaces` is still invoked by any current `recon-all` path (e.g., via a `-mef` flag) needs confirmation by inspecting the `recon-all` script.

## Gotchas and Caveats

> [!gotcha] Requires EM segmentation volume
> Unlike `mris_make_surfaces`, this tool explicitly requires the EM-synthesized `atlas_EM_combined` volume for class statistics. This volume is produced by `mri_em_seg` and is not part of the standard T1-only pipeline.

> [!gotcha] MGZ format off by default
> Unlike `mris_make_surfaces` where MGZ is the default, `mris_mef_surfaces` has `MGZ = 0` by default. Volumes in the subject's `mri/` directory should be MGZ format but the tool may need `-mgz` to read them correctly.

> [!gotcha] Fewer deformation iterations
> `nwhite = 20` and `ngray = 30` vs. `nwhite = 100` and `ngray = 100` in `mris_make_surfaces`. The MEF version uses fewer iterations, presumably because the MEF class statistics provide a cleaner signal.

## Related Tools

- [[mris_make_surfaces]] — the standard T1-only surface placement tool (supersedes this for most use cases)
- [[mris_exvivo_surfaces]] — ex vivo variant of MEF surface placement
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

Confidence is **medium**. The source was read through the global variables and function signatures, confirming the two-channel MEF approach and the key parameters. Full flag documentation requires reading `get_option()`.

> [!gap] Current pipeline integration
> Whether this tool is still called by `recon-all` or any processing script, and under what conditions, requires inspecting the pipeline scripts.
