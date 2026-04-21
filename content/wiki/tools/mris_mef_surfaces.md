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
  - "[[recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full flag list requires reading get_option() in mris_mef_surfaces.cpp."
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

> [!gap] Full flag list requires source read
> The following are confirmed from global variables in the source.

| Flag (inferred/confirmed) | Default | Description |
|--------------------------|---------|-------------|
| Subject name (positional 1) | — | FreeSurfer subject. |
| Hemisphere (positional 2) | — | `lh` or `rh`. |
| `-nowhite` | 0 | Skip white surface placement (pial only). |
| `-white_only` | 0 | Place white surface only (skip pial). |
| `-orig_white <surf>` | null | Starting white surface override. |
| `-orig_pial <surf>` | null | Starting pial surface override. |
| `-max_pial_averages <N>` | 16 | Max pial curvature averaging. |
| `-min_pial_averages <N>` | 2 | Min pial curvature averaging. |
| `-max_white_averages <N>` | 4 | Max white curvature averaging. |
| `-smooth <N>` | 5 | Smoothing iterations. |
| `-vavgs <N>` | 5 | Vertex average iterations. |
| `-pial_sigma <val>` | 2.0 | Gaussian sigma for pial gradient. |
| `-white_sigma <val>` | 2.0 | Gaussian sigma for white gradient. |
| `-mgz` | 0 | Use MGZ format (default: off in this tool). |
| `-long` | 0 | Longitudinal mode. |
| `-T1_30 <name>` | `flash30_T1` | Name of the 30° FLASH T1 volume. |
| `-T1_5 <name>` | `flash5_T1` | Name of the 5° FLASH T1 volume. |
| `-em <name>` | `atlas_EM_combined` | Name of the EM combined volume. |

## Configuration Interactions

- `-nowhite` and `-white_only` are mutually exclusive.
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
