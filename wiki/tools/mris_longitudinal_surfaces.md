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
  - "[[recon-all]]"
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
| `?h.curv`, `?h.area` | Curvature and area files |

## Mathematical Foundations

Identical to [[mris_make_surfaces]] — places surfaces by minimizing a deformable model energy functional:

$$E = \lambda_I E_{\text{intensity}} + \lambda_{\text{spring}} E_{\text{spring}} + \lambda_{\text{curv}} E_{\text{curvature}}$$

where the intensity term drives the surface toward MRI-derived tissue boundaries and the regularization terms maintain smoothness.

The longitudinal aspect is the initialization: starting from a pre-placed surface (`orig_white`) rather than from the coarse tessellation. This reduces the risk of the surface converging to a different local minimum than in the base timepoint.

## Configuration Options

The configuration options are a subset of [[mris_make_surfaces]]:

| Flag | Description |
|------|-------------|
| `-white_only` | Place only white surface, skip pial |
| `-orig_white name` | Use this as initial position for white surface |
| `-orig_pial name` | Use this as initial position for pial surface |
| `-nowhite` | Skip white surface placement (pial only) |
| `-auto_detect_stats` | Automatically detect tissue intensity statistics |
| `-graymid` | Create graymid (mid-cortical) surface |
| `-white_only` | Only place white surface |
| `-smoothwm` | Smooth the white matter surface |

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
- [[recon-all]] — orchestrates longitudinal processing with `-long`

## Confidence and Gaps

**Low confidence** — attic tool with unclear current status.

> [!gap] Current longitudinal pipeline
> Whether `mris_longitudinal_surfaces` is used in any current FreeSurfer 8.2.0 pipeline has not been confirmed.
