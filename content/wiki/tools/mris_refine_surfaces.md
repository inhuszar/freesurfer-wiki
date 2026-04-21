---
title: "mris_refine_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_refine_surfaces.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_place_surface]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact format of lowtohires.xfm (LTA vs XFM) not determined from source."
tags:
  - surface
  - refinement
  - high-resolution
  - label
---

# mris_refine_surfaces

## Summary

`mris_refine_surfaces` refines the white and pial cortical surfaces (`?h.white` and `?h.pial`) in a labelled region using high-resolution MRI data. Given a label file defining a region of interest, it produces higher-resolution versions of the surfaces (`?h.whitehires` and `?h.pialhires`) restricted to that region. The subject must have already been processed through `recon-all` to provide the required input files.

## Source Information

- **Language:** C++ (with C origins)
- **Source file:** `mris_make_surfaces/mris_refine_surfaces.cpp`
- **Original author:** Bruce Fischl (June 16, 1998)
- **Key functions:** `pial_errfunc_gradient`, `pial_errfunc_sse`, `pial_errfunc_rms`, `make_pial_location_mask`

## Purpose and Context

Standard `recon-all` processes brain MRI at the native resolution (typically 1 mm isotropic). When high-resolution MRI data are available (e.g., sub-millimetre T1, 0.5 mm isotropic), surfaces can be refined in specific regions of interest using this higher-resolution volume. This is particularly useful for:
- Detailed analysis of primary sensory cortex
- Hippocampal or parahippocampal detailed parcellation
- Research requiring sub-millimetre surface accuracy in specific sulci

The tool requires a transformation from the low-resolution to the high-resolution space (`lowtohires.xfm`) if the two volumes are not co-registered.

## Inputs

```
mris_refine_surfaces [options] <subject_name> <hemi> <hires_volume> <label> [<lowtohires.xfm>]
```

| Argument | Description |
|---------|-------------|
| `<subject_name>` | FreeSurfer subject ID (read from `$SUBJECTS_DIR` or `-SDIR`). |
| `<hemi>` | Hemisphere: `lh` or `rh`. |
| `<hires_volume>` | High-resolution MRI volume name (looked up in `<subject>/mri/<hires_volume>`). |
| `<label>` | Label file name (looked up in `<subject>/label/<label>`). Defines the ROI. |
| `[<lowtohires.xfm>]` | Optional fifth positional argument: transform from standard to high-res space (read by `TransformRead`). |

Prerequisites (must already exist in subject directory): `mri/filled`, `mri/wm`, `surf/?h.orig`, `surf/?h.white`, `surf/?h.pial`.

## Outputs

- `?h.whitehires` — refined white surface in the labelled region
- `?h.pialhires` — refined pial surface in the labelled region

## Mathematical Foundations

The pial surface refinement uses a custom error functional with gradient, SSE (sum of squared errors), and RMS components:

- `pial_errfunc_gradient` — computes the gradient of the pial placement error
- `pial_errfunc_sse` — computes the sum of squared intensity errors
- `pial_errfunc_rms` — computes the RMS error

The refinement deforms the surface to minimise intensity mismatch between the predicted and observed intensity profiles at the pial boundary, using the high-resolution volume:

$$E_{pial} = \sum_{v \in \text{label}} \left(I(v + t\hat{n}) - I_{target}\right)^2$$

where $t$ is the normal offset, $\hat{n}$ is the outward normal, and $I_{target}$ is the expected pial intensity from the high-resolution volume.

## Configuration Options

### Complete Flag Reference

All flags use single-dash prefix; names are case-insensitive.

| Flag | Argument type | Default | Description |
|------|--------------|---------|-------------|
| `-SDIR <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory (`sdir`). |
| `-MGZ` | boolean | — | Force MGZ volume format (`MGZ=1`). |
| `-SUFFIX <str>` | string | `""` | Append `<str>` to output surface names. |
| `-O <str>` | string | `""` | Set output surface name suffix (`output_suffix`). |
| `-reg <file>` | string | — | Registration file to transform the high-res volume into surface space. |
| `-fill_interior` | boolean | false | Limit gradient calculations to the interior of the surface only. |
| `-nowhite` or `-pialonly` | boolean | false | Skip white surface refinement; process pial only (`nowhite=1`). |
| `-whiteonly` or `-nopial` | boolean | false | Refine white surface only; skip pial (`white_only=1`). |
| `-wa <max> [<min>]` | int(s) | — | Set maximum (and optionally minimum) white-matter-surface averaging iterations. |
| `-orig_pial <name>` | string | — | Starting pial surface name (`orig_pial`). |
| `-orig_white <name>` | string | — | Starting white surface name (`orig_white`). |
| `-median` | boolean | false | Apply a median filter to the volume before surface placement (`apply_median_filter=1`). |
| `-dilate <N>` | int | — | Dilate the input label `N` times before use. |
| `-min_border_white <val>` | float | — | Minimum intensity at the white-matter border. |
| `-wsigma <val>` | float | — | Gaussian smoothing sigma for the white-surface placement volume. |
| `-psigma <val>` | float | — | Gaussian smoothing sigma for the pial-surface placement volume. |
| `-min_gray_at_white_border <val>` | float | — | Minimum gray-matter intensity at the white surface border. |
| `-max_gray <val>` | float | — | Maximum gray-matter intensity. |
| `-max_gray_at_csf_border <val>` | float | — | Maximum gray-matter intensity at the CSF border. |
| `-min_gray_at_csf_border <val>` | float | — | Minimum gray-matter intensity at the CSF border. |
| `-min_csf <val>` | float | — | Minimum CSF intensity. |
| `-max_csf <val>` | float | — | Maximum CSF intensity. |
| `-noauto` | boolean | — | Disable auto-detection of intensity border ranges (`auto_detect_stats=0`). |
| `-intensity <val>` | float | — | Weight of intensity term in deformation (`parms.l_intensity`). |
| `-spring <val>` | float | — | Weight of spring term (`parms.l_spring`). |
| `-tspring <val>` | float | — | Weight of tangential spring term (`parms.l_tspring`). |
| `-nspring <val>` | float | — | Weight of normal spring term (`parms.l_nspring`). |
| `-curv <val>` | float | — | Weight of curvature term (`parms.l_curv`). |
| `-smooth <N>` | int | — | Number of smoothing iterations (`smooth`). |
| `-tsmooth <val>` | float | — | Weight of tangential smoothing (`l_tsmooth`). |
| `-L <labelfile>` | string | — | Additional label file(s) for multi-label processing (up to array limit). |
| `-V <n>` | int | — | Debug vertex `n` (`Gdiag_no`). |
| `-W <N>` | int | — | Write intermediate surfaces every `N` iterations (`parms.write_iterations`). |
| `--version` or `-version` | boolean | — | Print version string and exit. |
| `--help` or `-help` | boolean | — | Print help text and exit. |

### Configuration Interactions

- `-nowhite`/`-pialonly` and `-whiteonly`/`-nopial` are complementary; specifying both together would process neither surface.
- `-noauto` disables intensity range auto-detection; if used, manual values should be provided via `-min_border_white`, `-max_gray`, etc.
- `-median` applies a smoothing step to the MRI volume before placement; it can help in noisy acquisitions but blurs fine-scale detail.
- The label file (positional argument 4) restricts refinement to the specified vertices; the rest of the surface is copied unchanged from the standard-resolution reconstruction.

## Typical Use Cases

```bash
# Refine surfaces in a hand-drawn label using sub-mm T1
mris_refine_surfaces bert lh my_roi.label hires_T1.mgz

# With low-to-hires transform
mris_refine_surfaces bert lh my_roi.label hires_T1.mgz lowtohires.xfm

# Refine white surface only
mris_refine_surfaces -white_only bert lh my_roi.label hires_T1.mgz
```

## Pipeline Context

Not part of standard `recon-all`. Run after initial surface placement:

1. `recon-all -autorecon2 -s subject` — produces standard surfaces
2. Acquire high-resolution MRI of the ROI
3. `mris_refine_surfaces subject hemi roi.label hires.mgz` — refine in ROI

## Gotchas and Caveats

> [!gotcha] Prerequisites
> The subject must have `mri/filled`, `mri/wm`, `surf/?h.orig`, `surf/?h.white`, and `surf/?h.pial` before running. Missing any of these will cause an error.

> [!gotcha] lowtohires.xfm format
> The transform file format is not documented in the source. It is likely an `.xfm` or `.lta` file, but this needs verification.

> [!gotcha] Output naming convention
> The output surfaces are named `?h.whitehires` and `?h.pialhires`. These are not automatically used by downstream tools; scripts must be updated to use the hires surfaces where needed.

## Related Tools

- [[mris_make_surfaces]] — standard surface placement that precedes this tool
- [[mris_place_surface]] — modern replacement for mris_make_surfaces
- [[mris_nudge]] — for single-vertex manual corrections

## Confidence and Gaps

**High confidence (from full source read):** Prerequisites (filled, wm, orig, white, pial); output naming (whitehires, pialhires); complete flag list from `get_option()`; positional argument order; label-restricted processing.

**Uncertain:** Exact format of `lowtohires.xfm` (passed to `TransformRead()` — likely LTA or XFM).

> [!gap] lowtohires.xfm format
> The transform is read via `TransformRead()`, which accepts LTA, XFM, and other formats. The exact expected format for this specific use case has not been confirmed.
