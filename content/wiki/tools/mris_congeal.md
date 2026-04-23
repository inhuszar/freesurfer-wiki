---
title: "mris_congeal"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_congeal/mris_congeal.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_average_curvature]]"
  - "[[mris_ca_train]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Congealing algorithm (simultaneous vs. sequential registration) details need confirmation."
  - "gcsaSSE function semantics not documented."
  - "Output file naming convention in output_dir not verified."
tags:
  - surface
  - registration
  - atlas
  - congealing
  - group
---

# mris_congeal

## Summary

`mris_congeal` performs simultaneous group-wise surface registration (congealing) — registering all subjects simultaneously to a common template that is co-optimised with the registrations. Unlike [[mris_register]] which registers each subject to a fixed atlas, `mris_congeal` updates both the atlas and the individual registrations jointly, producing an unbiased group template.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_congeal/mris_congeal.cpp`
- Uses the GCSA infrastructure and `mris_register`-like spherical registration code.

## Purpose and Context

Standard atlas-based registration introduces a bias towards the chosen atlas. Congealing (or "groupwise registration") addresses this by simultaneously optimising all registrations so that the group average template emerges naturally from the data. This is particularly valuable for atlas construction and for population studies where no pre-existing atlas is appropriate.

The congealing approach:
1. Initialises with a preliminary atlas or identity registrations.
2. Iteratively updates individual subject registrations.
3. Simultaneously updates the group template.
4. Converges to a joint optimum.

## Inputs

Positional arguments:

| Positional | Description |
|-----------|-------------|
| `<hemi>` | Hemisphere: `lh` or `rh` |
| `<sphere_name>` | Input sphere file name (e.g., `sphere`) |
| `<canon_name>` | Canonical sphere name |
| `<annot_name>` | Annotation file name |
| `<subject1...>` | Subject names to co-register |
| `<output_dir>` | Directory for output files |

- Requires `SUBJECTS_DIR`.
- Uses `inflated.H` (mean curvature) and `sulc` (sulcal depth) as registration features.

## Outputs

| Output | Description |
|--------|-------------|
| Per-subject sphere files | Updated registered sphere files in the output directory |
| Atlas template | Group average template (exact format to be confirmed) |

## Mathematical Foundations

The congealing objective minimises the total registration energy across all subjects:

$$
E_{\text{total}} = \sum_{s=1}^{N} \left[ E_{\text{corr}}(s, \text{atlas}) + \lambda E_{\text{metric}}(s) \right]
$$

where $E_{\text{corr}}$ is the GCSA-based label correlation term and $E_{\text{metric}}$ penalises surface distortion.

The `gcsaSSE()` function (defined in the source) computes the GCSA-based sum of squared errors between a subject's features and the current group template.

Multi-scale optimisation uses sigmas: `sigmas[0..nsigmas]` for progressive blurring.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-a <n>` | int | — | Number of curvature averaging iterations |
| `-adaptive` | flag | off | Use adaptive time-step integration |
| `-addframe <field> <atlas_pos> <l_corr> <l_pcorr>` | int int float float | — | Add extra field to multiframe atlas |
| `-annot <name>` | string | — | Zero medial wall using annotation file |
| `-area <val>` | float | — | Set l_area coefficient |
| `-c <fname>` | path | — | Load curvature from file |
| `-canon <name>` | string | — | Use named surface for canonical properties |
| `-corr <val>` | float | — | Set l_corr (correlation) coefficient |
| `-curv` | flag | off | Use smoothwm curvature for final alignment |
| `-dist <val>` | float | — | Set l_dist (distance) coefficient |
| `-distance <fname> <navgs>` | path int | — | Add distance-transform overlay field |
| `-distances <nbhd> <maxnbrs>` | int int | — | Alias for `-vnum` |
| `-dt <val>` | float | — | Time step |
| `-dt_dec <val>` | float | — | dt decrease factor |
| `-dt_inc <val>` | float | — | dt increase factor |
| `-e <val>` | float | — | Set l_external coefficient |
| `-error_ratio <val>` | float | — | Error ratio for adaptive step |
| `-h` | flag | off | Print help |
| `-inflated` | flag | off | Use inflated surface for initial rigid alignment |
| `-infname <name>` | string | — | Custom inflated surface name (also sets IP_USE_INFLATED) |
| `-init` | flag | off | Use initial registration from file |
| `-jacobian <fname>` | path | — | Write Jacobian of mapping to file |
| `-l <label> <gcsa> <label_name>` | path path string | — | Specify manual label to align with atlas label |
| `-lap <val>` | float | — | Set l_laplacian coefficient |
| `-lm` | flag | off | Use line minimisation integration |
| `-m <val>` | float | — | Momentum coefficient |
| `-max_angle <val>` | float | 16.0 | Maximum search angle (degrees) |
| `-max_degrees <val>` | float | 64.0 | Maximum rotation for coarse search (degrees) |
| `-median` | flag | off | Use median normalisation |
| `-min_degrees <val>` | float | 0.5 | Minimum rotation for coarse search (degrees) |
| `-multi_scale <n>` | int | 0 | Number of scales for morphing |
| `-n <n>` | int | — | Number of integration iterations |
| `-nangles <n>` | int | 8 | Number of rotation angles per scale |
| `-nbrs <n>` | int | 1 | Neighbourhood size |
| `-nlarea <val>` | float | — | Set l_nlarea coefficient |
| `-nocurv` | flag | off | Disable smoothwm curvature for final alignment |
| `-nonorm` | flag | off | Disable normalisation |
| `-norot` | flag | off | Disable initial rigid alignment |
| `-nosulc` | flag | off | Disable initial sulcal depth alignment |
| `-nsurfaces <n>` | int | — | Number of surfaces/curvatures used for alignment |
| `-o <name>` | string | — | Original surface property name |
| `-ocorr <val>` | float | 1.0 | Overlay correlation coefficient |
| `-overlay <fname> <navgs>` | path int | — | Add overlay field (enables multiframe mode) |
| `-overlay-dir <dir>` | path | — | Directory for overlay files |
| `-p <n>` | int | 4 | Maximum registration passes |
| `-parea <val>` | float | — | Set l_parea coefficient |
| `-remove_negative <val>` | int (0/1) | — | Remove (1) or keep (0) negative triangles via iterative smoothing |
| `-reverse` | flag | off | Mirror-image reverse brain before morphing |
| `-rotate <a> <b> <g>` | float float float | — | Pre-rotate brain by (alpha, beta, gamma) degrees |
| `-s <val>` | float | — | Scale distances |
| `-sdir <dir>` | path | — | Override SUBJECTS_DIR |
| `-search` | flag | off | Use binary search line minimisation |
| `-sigma <val>` | float | — | Add smoothing sigma to multi-scale schedule (repeatable) |
| `-spring <val>` | float | — | Set l_spring coefficient |
| `-sreg <fname>` | path | — | Start registration from coordinates in file |
| `-sulc <name>` | string | — | Replace sulc file with named curvature file |
| `-tol <val>` | float | — | Convergence tolerance |
| `-topology` | flag | off | Preserve topology of positive-area triangles |
| `-u` | flag | off | Print usage |
| `-v <n>` | int | — | Set Gdiag_no diagnostic vertex |
| `-vector` | flag | off | Print multiframe field codes and exit |
| `-vnum <nbhd> <maxnbrs>` | int int | — | Set neighbourhood size and max neighbours |
| `-vsmooth` | flag | off | Use space/time varying smoothness weighting |
| `-w <n>` | int | — | Write diagnostics every N iterations |
| `-1` | — | off | Treat the target as a single subject's surface (`single_surf = True`) rather than a group average |

## Configuration Interactions

- `nsigmas` controls the number of multi-scale registration stages; each sigma defines a smoothing level.
- `atlas_size = 3` is the number of surfaces used in the atlas (hardcoded).

## Typical Use Cases

```bash
# Congeal a group of subjects
mris_congeal lh sphere sphere.reg aparc \
    bert ernie alice frank george \
    /tmp/congeal_output/
```

## Pipeline Context

Not part of `recon-all`. Used in atlas construction workflows as an alternative to registering to a fixed atlas.

## Gotchas and Caveats

> [!gotcha] Computationally intensive
> Congealing over a large subject pool is significantly more expensive than individual registration, as all subjects must be held in memory and updated simultaneously.

## Related Tools

- [[mris_register]] — per-subject registration to a fixed atlas
- [[mris_average_curvature]] — post-registration group averaging
- [[mris_ca_train]] — alternative atlas construction approach

## Confidence and Gaps

**Confident:** Core concept, GCSA usage, multi-scale structure, and surface name arrays confirmed from source.

> [!gap] Full flag set and output format
> The `get_option()` body was not fully read. Output file naming convention in `output_dir` was not verified.
