---
title: "mris_longitudinal_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_longitudinal_surfaces/mris_longitudinal_surfaces.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[surface-format]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Attic tool — relationship to current longitudinal pipeline (recon-all -long) unclear"
  - "Whether this tool is used in any standard pipeline is unknown"
  - "Differences from mris_make_surfaces in longitudinal mode not documented"
tags:
  - surface
  - longitudinal
  - white-matter
  - pial
  - deprecated
---

# mris_longitudinal_surfaces

## Summary

`mris_longitudinal_surfaces` places white matter and pial cortical surfaces for the FreeSurfer longitudinal processing stream. It is functionally similar to [[mris_make_surfaces]] but includes modifications for longitudinal analysis: it can use a pre-computed surface (`orig_white`) as the starting position for white surface placement, reducing the influence of single-timepoint noise. The tool is in the `attic/` directory, suggesting it may have been superseded by modifications to `mris_make_surfaces` itself.

> [!gotcha] Attic tool
> `mris_longitudinal_surfaces` resides in the `attic/` directory and may not be compiled or installed in FreeSurfer 8.2.0. The standard `recon-all -long` pipeline may use `mris_make_surfaces` with `-long` flags or `mris_place_surface` instead.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_longitudinal_surfaces/mris_longitudinal_surfaces.cpp`
- **Original author:** Bruce Fischl
- **Copyright:** 2011-2013

## Purpose and Context

In longitudinal analysis, cortical surfaces must be placed consistently across multiple timepoints of the same subject. Using a template (base) surface as the starting position for surface placement reduces measurement variability. `mris_longitudinal_surfaces` was created to enable this by:
- Accepting an `orig_white` parameter to initialize the white surface from a previous timepoint or base template
- Accepting an `orig_pial` parameter to initialize the pial surface similarly
- Using modified convergence criteria appropriate for longitudinal data

This functionality may have since been integrated into `mris_make_surfaces` via the `-orig_white` and `-orig_pial` flags.

## Inputs

| Input | Description |
|-------|-------------|
| Subject name | Positional arg 1 |
| Hemisphere | Positional arg 2 (lh or rh) |
| `orig_white` | Previous white surface to use as initialization |
| `orig_pial` | Previous pial surface to use as initialization |
| T1 volume | `brain.mgz` or equivalent |
| Filled volume | `filled.mgz` |

## Outputs

| Output | Description |
|--------|-------------|
| `?h.white` | Placed white matter surface |
| `?h.pial` | Placed pial surface |
| `?h.thickness` | Cortical thickness (distance between white and pial) |
| `?h.curv`<br>`?h.area` | Curvature and area files |

## Mathematical Foundations

Identical to [[mris_make_surfaces]] — places surfaces by minimizing a deformable model energy functional:

$$
E = \lambda_I E_{\text{intensity}} + \lambda_{\text{spring}} E_{\text{spring}} + \lambda_{\text{curv}} E_{\text{curvature}}
$$

where the intensity term drives the surface toward MRI-derived tissue boundaries and the regularization terms maintain smoothness.

The longitudinal aspect is the initialization: starting from a pre-placed surface (`orig_white`) rather than from the coarse tessellation. This reduces the risk of the surface converging to a different local minimum than in the base timepoint.

## Configuration Options

The configuration options are a subset of [[mris_make_surfaces]]:

### Surface Selection

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-whiteonly` | — | — | Place only white surface, skip pial placement |
| `-nowhite` | — | — | Skip white surface placement; read previously computed white surface instead |
| `-graymid` | — | — | Generate graymid (mid-cortical, layer IV approximation) surface |

### Longitudinal Initialization

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-orig_white name` | — | — | Use named surface as initial white surface position (key longitudinal feature) |
| `-orig_pial name` | — | — | Use named surface as initial pial surface position |
| `-long` | — | — | Enable longitudinal scheme: blends final white and orig pial for pial initialization |

### Input Volumes

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-T1 vol` | — | `brain` | T1 volume name (default: `brain`) |
| `-gvol vol` | — | — | Alias for `-T1`; specify T1/gray matter volume |
| `-wvol vol` | — | — | Separate volume for white matter deformation |
| `-mgz` | — | — | Assume MGZ format for input volumes |

### Subjects Directory

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-SDIR dir` | — | — | Override `SUBJECTS_DIR` environment variable |

### Intensity Statistics

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-noauto` | — | — | Disable auto-detection of tissue intensity border ranges (auto-detection is on by default) |
| `-mode 0\|1` | — | 1=enabled | Use class modes instead of means for intensity statistics (default: 1=enabled) |
| `-scale_std f` | — | — | Scale estimated WM and GM standard deviations by factor `f` |
| `-max_border_white f` | — | — | Override maximum border white intensity |
| `-min_border_white f` | — | — | Override minimum border white intensity |
| `-min_gray_at_white_border f` | — | — | Override minimum gray intensity at white border |
| `-max_gray f` | — | — | Override maximum gray intensity |
| `-max_gray_at_csf_border f` | — | — | Override maximum gray intensity at CSF border |
| `-min_gray_at_csf_border f` | — | — | Override minimum gray intensity at CSF border |
| `-min_csf f` | — | — | Override minimum CSF intensity |
| `-max_csf f` | — | — | Override maximum CSF intensity |

### Surface Deformation Parameters

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-dt f` | — | 0.5 | Integration time step (default: 0.5) |
| `-spring f` | — | — | Spring term weight (`l_spring`) |
| `-tspring f` | — | — | Tangential spring term weight (`l_tspring`; default: 1.0) |
| `-nspring f` | — | — | Normal spring term weight (`l_nspring`; default: 0.5) |
| `-curv f` | — | — | Curvature term weight (`l_curv`; default: 1.0) |
| `-intensity f` | — | — | Intensity term weight (`l_intensity`; default: 0.2) |
| `-grad f` | — | — | Gradient term weight (`l_grad`) |
| `-tsmooth f` | — | — | Tangential smoothing term weight (`l_tsmooth`) |
| `-lm` | — | momentum | Use line minimization integration (default: momentum) |
| `-M f` | — | — | Momentum value for integration |
| `-R f` | — | — | Surface repulsion term weight (`l_surf_repulse`) |
| `-B f` | — | — | Base time step scale factor |

### Averaging and Smoothing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-smooth n` | — | — | Average vertex positions for `n` iterations before deformation |
| `-smoothwm n` | — | — | Average white matter surface for `n` iterations after placement |
| `-vavgs n` | — | 5 | Average target intensity values for `n` iterations (default: 5) |
| `-wa max [min]` | — | — | Max (and optionally min) white surface averages |
| `-pa max [min]` | — | — | Max (and optionally min) pial surface averages |
| `-wsigma f` | — | 2.0 | Gaussian smoothing sigma for white matter deformation (default: 2.0) |
| `-psigma f` | — | 2.0 | Gaussian smoothing sigma for pial deformation (default: 2.0) |
| `-nbrs n` | — | 2 | Vertex neighborhood size (default: 2) |
| `-nbhd_size n` | — | 20 | Neighborhood size for cortical thickness calculation (default: 20) |

### Iteration Counts

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-nwhite n` | — | 25 | Number of white surface positioning iterations (default: 25) |
| `-ngray n` | — | 30 | Number of pial surface positioning iterations (default: 30) |
| `-N n` | — | — | Override total number of deformation iterations |

### Surface Naming

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-white name` | — | `white` | White matter surface name (default: `white`) |
| `-pial name` | — | `pial` | Pial surface name (default: `pial`) |
| `-output suffix` | — | — | Append suffix to output surface filenames |
| `-name name` | — | — | Base name for output files |
| `-S suffix` | — | — | Append suffix to all output names |
| `-O name` | — | — | Read original vertex positions from named surface |

### Other Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-add` | — | — | Add vertices to tessellation during deformation |
| `-inoutin` | — | — | Apply final white deformation pass after pial placement |
| `-max f` | — | 5.0 mm | Maximum cortical thickness (default: 5.0 mm) |
| `-median` | — | — | Apply 3×3×3 median filter to T1 volume before processing |
| `-overlay` | — | — | Overlay WM editing marks into T1 volume |
| `-write_vals` | — | — | Write gray/white target intensity values to `.w` files |
| `-hires label` | — | — | Load highres label; rip (exclude) all other vertices |
| `-highres label` | — | — | Alias for `-hires` |
| `-lval n` | — | — | Fill value used to identify left hemisphere in filled volume |
| `-rval n` | — | — | Fill value used to identify right hemisphere in filled volume |
| `-T xform` | — | — | Apply ventricular transform from file `xform` |
| `-Q` | — | — | Quick mode: skip self-intersection test |
| `-C` | — | — | Toggle creation of curvature and area files for white surface |
| `-W n` | — | — | Write surface every `n` iterations (enables DIAG_WRITE) |
| `-a n` | — | 10 | Average curvature values `n` times (default: 10) |
| `-V n` | — | — | Set diagnostic vertex index |

> [!gap] Flags `-nopial` and `-pd` appear in the audit source list but are not found in the `get_option` parser of the attic source file. They may derive from a different code path or a mris_make_surfaces variant.

See [[mris_make_surfaces]] for the full set of options shared between the two tools.

## Typical Use Cases

**Longitudinal white surface placement using base template:**
```bash
mris_longitudinal_surfaces -orig_white lh.white_base bert lh
```

## Pipeline Context

Historically part of `recon-all -long`. Current FreeSurfer 8.2.0 longitudinal pipeline likely uses `mris_make_surfaces` with `-orig_white` / `-orig_pial` flags or `mris_place_surface` instead.

## Gotchas and Caveats

> [!gotcha] Attic status
> This tool is in the `attic/` directory and may not be compiled in FreeSurfer 8.2.0. For current longitudinal processing, use `recon-all -long` which orchestrates the appropriate tools.

> [!gotcha] apply_median_filter flag present
> The code has `apply_median_filter = 0` as a variable, which is not in `mris_make_surfaces`. This suggests a now-disabled feature for applying median filtering to the intensity profile in longitudinal mode.

## Related Tools

- [[mris_make_surfaces]] — the current primary surface placement tool
- [[wiki/pipelines/recon-all|recon-all]] — orchestrates longitudinal processing with `-long`

## Confidence and Gaps

**Low confidence** — attic tool with unclear current status.

> [!gap] Current longitudinal pipeline
> Whether `mris_longitudinal_surfaces` is used in any current FreeSurfer 8.2.0 pipeline has not been confirmed.
