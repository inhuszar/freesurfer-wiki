---
title: "mris_exvivo_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_exvivo_surfaces.cpp"
  # Note: source file lives in mris_make_surfaces/ directory, NOT mris_exvivo_surfaces/
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_mef_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - ex-vivo
  - multi-echo
  - FLASH
  - surface-placement
---

# mris_exvivo_surfaces

## Summary

`mris_exvivo_surfaces` places white matter and pial surfaces on ex vivo (post-mortem) multi-echo FLASH (MEF) MRI data. It is a specialised variant of `mris_mef_surfaces` tailored for ex vivo tissue properties: the tissue has no living blood perfusion, T1 and T2\* values differ substantially from in vivo, and only a single hemisphere is typically present. The tool uses two MEF echo channels (flip angles 30° and 5°) to separately guide white and pial surface placement.

## Source Information

- **Language:** C++
- **Primary source:** `mris_make_surfaces/mris_exvivo_surfaces.cpp`
- **Note:** Source file lives in the `mris_make_surfaces/` directory, co-located with `mris_make_surfaces.cpp`, `mris_mef_surfaces.cpp`, and `mris_place_surface.cpp`.
- **Original author:** Bruce Fischl

## Purpose and Context

Ex vivo MRI of post-mortem brain tissue requires different intensity assumptions from in vivo processing:

1. **Single hemisphere:** Ex vivo data typically contains a single isolated hemisphere (assumed left, label 255).
2. **No EM segmentation:** The standard pipeline uses `mri_em_seg` to produce a probabilistic WM/GM map, but ex vivo data does not have a corresponding atlas. The tool replaces `mri_em_seg` with the filled volume (`filled.mgz`) to estimate WM and GM statistics.
3. **Differential echo properties:** The 30° flip angle echo has better contrast for detecting the pial surface (GM/CSF boundary), while the 5° flip angle echo is better for the white matter surface (WM/GM boundary).

## Inputs

Positional arguments: `<subject_name> <hemisphere>`

| Input | Description |
|-------|-------------|
| `<subject_name>` (positional 1) | FreeSurfer subject identifier. |
| `<hemisphere>` (positional 2) | `lh` or `rh`. For ex vivo single-hemisphere data, this is almost always `lh`. |
| Flash 30° volume | Provided via `-flash30`, `-T130`, or `-T1_30`. |
| Flash 5° volume | Provided via `-flash5`, `-T15`, or `-T1_5`. |
| `filled.mgz` (internal) | Used in place of EM segmentation to define WM. Must exist in `$SUBJECTS_DIR/<subject>/mri/`. |

## Outputs

| Output | Description |
|--------|-------------|
| `<hemi>.white` | White matter surface placed using the MEF 5° channel. |
| `<hemi>.pial` | Pial surface placed using the MEF 30° channel. |
| `thickness` (curvature file) | Cortical thickness measured between white and pial surfaces. |
| `<hemi>.graymid` | Layer IV mid-surface (only if `-graymid` is specified). |

## Mathematical Foundations

The surface placement follows the same energy functional as `mris_make_surfaces` and `mris_mef_surfaces`:

$$
E = w_I E_{\text{intensity}} + w_c E_{\text{curvature}} + w_t E_{\text{tangential}} + w_n E_{\text{normal}} + w_r E_{\text{repulsion}}
$$

Class statistics (WM mean $\mu_w$, WM std $\sigma_w$, GM mean $\mu_g$, GM std $\sigma_g$) are estimated from both echo channels using `MRIcomputeClassStatistics_mef()`, which computes histograms within the `filled.mgz`-defined WM region and its surrounding GM region.

For white surface placement, the 5° channel is used because its T1 weighting better discriminates WM from GM in ex vivo tissue. For pial placement, the 30° channel is used.

Border values (intensity thresholds for surface deformation) are computed by `MRIScomputeBorderValues_MEF_WHITE()` and the corresponding pial function.

## Configuration Options

### Complete Flag Reference

#### Volume inputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-flash30 <vol>`<br>`-T130 <vol>`<br>`-T1_30 <vol>` | string | — | MEF 30° flip angle volume (all three are accepted as aliases). |
| `-flash5 <vol>`<br>`-T15 <vol>`<br>`-T1_5 <vol>` | string | — | MEF 5° flip angle volume (all three are accepted as aliases). |
| `-em <vol>`<br>`-em_seg <vol>`<br>`-em_combined <vol>` | string | — | Optional EM tissue segmentation volume (all three accepted as aliases). Replaces `filled.mgz` as the WM prior if specified. |
| `-wvol <vol>` | string | — | Use this volume for white matter surface deformation (overrides the 5° channel). |
| `-PD <vol>` | string | — | Use a proton density map for surface placement. |
| `-T1 <vol>` | string | — | Use a T1 map for surface placement. |

#### Surface naming

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-white <name>` | string | `white` | Name of the output white surface file. |
| `-pial <name>` | string | `pial` | Name of the output pial surface file. |
| `-name <name>` | string | — | Override the `parms.base_name` for output file naming. |
| `-output <suffix>` | string | — | Append this suffix to all output file names. |
| `-S <suffix>` | string | — | Additional suffix appended to surface file names. |

#### Starting surface positions

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-orig_white <name>` | string | — | Read initial white surface vertex positions from this file. |
| `-orig_pial <name>` | string | — | Read initial pial surface vertex positions from this file. |
| `-O <name>` | string | — | Read original vertex positions from this file. |

#### Deformation control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-nowhite` | boolean | — | Skip white surface placement; use the previously computed surface. |
| `-whiteonly`<br>`-nopial` | boolean | — | Place the white surface only; skip pial surface deformation. |
| `-inoutin` | boolean | — | Apply a final white matter deformation pass after pial surface placement. |
| `-graymid` | boolean | — | Generate a mid-gray (layer IV) surface from the white and pial. |
| `-nwhite <n>` | integer | — | Number of deformation time steps for the white surface. |
| `-ngray <n>` | integer | — | Number of deformation time steps for the pial surface. |
| `-dt <f>` | float | — | Integration time step. |
| `-tol <f>` | float | — | Convergence tolerance. |
| `-lm` | boolean | — | Use line minimization integration instead of gradient descent. |
| `-M <f>` | float | — | Use momentum integration with the given momentum value. |
| `-add` | boolean | — | Add vertices to the tessellation during deformation. |

#### Smoothing and averaging

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-smooth <n>` | integer | — | Number of surface position smoothing iterations. |
| `-smoothwm <n>` | integer | — | Number of smoothing iterations applied to the WM surface before output. |
| `-vavgs <n>` | integer | — | Number of iterations for smoothing target intensity values. |
| `-wa <max> [<min>]` | integer(s) | — | Maximum (and optionally minimum) white surface smoothing averages. |
| `-pa <max> [<min>]` | integer(s) | — | Maximum (and optionally minimum) pial surface smoothing averages. |
| `-wsigma <f>` | float | — | Gaussian sigma (mm) for white surface volume smoothing. |
| `-psigma <f>` | float | — | Gaussian sigma (mm) for pial surface volume smoothing. |

#### Energy term weights

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-spring <f>` | float | — | Spring term weight (`parms.l_spring`). |
| `-tsmooth <f>` | float | — | Tangential smoothness weight (`l_tsmooth`). |
| `-grad <f>` | float | — | Gradient term weight (`parms.l_grad`). |
| `-tspring <f>` | float | — | Tangential spring weight (`parms.l_tspring`). |
| `-nspring <f>` | float | — | Normal spring weight (`parms.l_nspring`). |
| `-curv <f>` | float | — | Curvature term weight (`parms.l_curv`). |
| `-intensity <f>` | float | — | Intensity term weight (`parms.l_intensity`). |
| `-R <f>` | float | — | Surface repulsion weight (`l_surf_repulse`). |
| `-B <f>` | float | — | Base time step scale factor. |

#### Anatomical parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-max <f>` | float | — | Maximum cortical thickness (mm). |
| `-nbrs <n>` | integer | — | Surface neighbourhood size. |
| `-nbhd_size <n>` | integer | — | Neighbourhood size for thickness calculation. |
| `-rval <n>` | integer | — | Fill value used for the right hemisphere label. |
| `-lval <n>` | integer | — | Fill value used for the left hemisphere label. |
| `-L <label>` | string | — | Label file to restrict surface deformation. |
| `-hires <label>`<br>`-highres` | string | — | High-resolution label for local refinement (`-highres` is accepted as alias). |
| `-a <max> [<min>]` | integer(s) | — | **Dead code (`#if 0`).** Would set `max_averages` and optionally `min_averages`; disabled via preprocessor. |

#### Miscellaneous

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-SDIR <dir>` | string | `$SUBJECTS_DIR` | Override the FreeSurfer subjects directory. |
| `-long` | boolean | — | Use longitudinal processing scheme. |
| `-formalin <0|1>` | integer | — | Indicate whether the hemisphere is embedded in formalin (affects intensity assumptions). |
| `-median` | boolean | — | Apply a median filter to the volume before processing. |
| `-scale_std <f>` | float | — | Scale the estimated WM and GM standard deviation by this factor. |
| `-noauto` | boolean | — | Disable automatic detection of border intensity ranges. |
| `-fill_interior <0|1>` | integer | — | Fill surface interior during gradient computation. |
| `-overlay` | boolean | — | Toggle overlaying T1 volume with edited white matter. |
| `-write_vals` | boolean | — | Write gray and white surface intensity targets to overlay files. |
| `-mgz` | boolean | — | Assume MGZ format for volume files. |
| `-T <xform>` | string | — | Apply a ventricular transform file. |
| `-C` | boolean | — | Toggle creation of area and curvature files for the WM surface. |
| `-Q` | boolean | — | Quick mode: disable self-intersection test during surface positioning. |
| `-V <n>` | integer | — | Debug vertex index (`Gdiag_no`). |
| `-W <n>` | integer | — | Write deformation snapshots every `<n>` iterations. |
| `-N <n>` | integer | — | Set the number of deformation iterations (`parms.niterations`). |
| `--version` | boolean | — | Print version string and exit. |
| `--help` | boolean | — | Print help and exit. |

## Configuration Interactions

- `-flash30` / `-T130` / `-T1_30` are exact aliases for the same flag. Only one need be specified.
- `-flash5` / `-T15` / `-T1_5` are exact aliases for the same flag.
- `-em`, `-em_seg`, `-em_combined` are exact aliases for the same flag.
- `-whiteonly` and `-nopial` both set `white_only = 1` and are fully equivalent.
- `-nowhite` reads the previously computed white surface without recomputing it; the pial surface is still placed.
- `-PD` and `-T1` provide alternative intensity volumes for cases where a proton-density or T1 map is available instead of MEF echoes. When neither is provided, the MEF 30° and 5° channels are used for pial and white placement respectively.
- The two-channel approach means that white and pial surfaces use different underlying intensity data. The 5° channel (better WM/GM contrast) drives white surface placement; the 30° channel (better GM/CSF contrast) drives pial placement.
- Without `filled.mgz`, the WM statistics estimation will fail unless `-em` is supplied.
- `-W` (write snapshots) also sets the `DIAG_WRITE` diagnostic flag globally.
- `-M <f>` switches the integration type to `INTEGRATE_MOMENTUM`; `-lm` switches to `INTEGRATE_LINE_MINIMIZE`. Both are mutually exclusive with the default gradient-descent integration.

## Typical Use Cases

```bash
# Place white and pial surfaces on an ex vivo hemisphere
mris_exvivo_surfaces \
    --T1_30 mri/flash30.mgz \
    --T1_5 mri/flash5.mgz \
    subject01 lh
```

```bash
# White surface only, using formalin-fixed tissue assumption
mris_exvivo_surfaces \
    --T1_30 mri/flash30.mgz \
    --T1_5 mri/flash5.mgz \
    --formalin 1 \
    --whiteonly \
    subject01 lh
```

## Pipeline Context

`mris_exvivo_surfaces` is not part of the standard in vivo `recon-all` pipeline. It is used in specialised ex vivo processing protocols for post-mortem brain tissue. It may be called by custom ex vivo processing scripts.

**Conceptual sequence:**
1. MEF acquisition at 30° and 5° flip angles.
2. `mri_em_register` (or equivalent atlas registration).
3. `mris_exvivo_surfaces` → places white and pial surfaces.

## Gotchas and Caveats

> [!gotcha] Single hemisphere assumption
> The source code comment states "Exvivo data only have one hemi, assume it to be left (255)." Using this tool for a right hemisphere may require modification.

> [!gotcha] No EM segmentation required
> Unlike `mris_mef_surfaces`, this tool does not use `mri_em_seg`. The filled volume (`filled.mgz`) takes the place of the probabilistic segmentation. If `filled.mgz` is absent or incorrect, surface placement will fail unless `-em` is also supplied.

> [!gotcha] Ex vivo tissue intensities differ from in vivo
> The default intensity thresholds in `mris_make_surfaces` and `mris_mef_surfaces` are calibrated for in vivo data. This tool has separate calibration for ex vivo tissue, and the `-formalin` flag adjusts for formalin fixation.

> [!gotcha] Source file is in mris_make_surfaces/ directory
> Despite the tool name, the source file is `mris_make_surfaces/mris_exvivo_surfaces.cpp`, not in a separate `mris_exvivo_surfaces/` directory.

## Related Tools

- [[mris_make_surfaces]] — standard in vivo surface placement
- [[mris_mef_surfaces]] — multi-echo FLASH surface placement for in vivo data
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

Confidence is **high**. The complete `get_option()` function (lines 797–1127 of `mris_exvivo_surfaces.cpp`) was read from source. All flags and their aliases are confirmed.
