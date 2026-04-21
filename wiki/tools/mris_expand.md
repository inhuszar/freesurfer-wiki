---
title: "mris_expand"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_expand/mris_expand.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_inflate]]"
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The tmap (thickness map) feature for variable expansion distance is not fully documented."
tags:
  - surface
  - expansion
  - deformation
  - white-matter
---

# mris_expand

## Summary

`mris_expand` expands a surface outward by a specified distance (in mm) while maintaining smoothness and preventing self-intersections. It is primarily used to generate mid-cortical surfaces (between white and pial) or surfaces at a fixed distance into the cortex. The expansion uses an energy-minimisation framework with spring, location, and repulsion terms.

## Source Information

- **Language:** C++
- **Source file:** `mris_expand/mris_expand.cpp`
- **Author:** Bruce Fischl
- **Key types:** `INTEGRATION_PARMS`

## Purpose and Context

Expanding a surface outward by a fixed fraction or absolute distance from the white matter boundary generates:
- **Mid-cortical surfaces** (e.g., 50% into the grey matter)
- **Pial-adjacent surfaces** for laminar fMRI analysis
- **WM-adjacent surfaces** for superficial white matter analysis

This is distinct from [[mris_inflate]] (which inflates to a sphere) — `mris_expand` preserves the local shape while shifting vertices outward.

## Inputs

- **Input surface** (positional arg 1): Any FreeSurfer surface (e.g., `lh.white`).
- **Expansion distance** (positional arg 2): Float in mm. How far to expand outward along vertex normals.
- **Output surface** (positional arg 3): Output filename.

Optional:
- Thickness file (when `--thickness` is used): `$SUBJECTS_DIR/<subj>/surf/<hemi>.thickness`
- Pial surface (when `--thickness` is used): `$SUBJECTS_DIR/<subj>/surf/<hemi>.pial`

## Outputs

- **Expanded surface file** (positional arg 3): FreeSurfer surface file written via `MRISwrite()`.

## Mathematical Foundations

The expansion is formulated as an energy minimisation. Starting from the input surface, each vertex is moved along its normal by `mm_out` mm, subject to:

$$E_{\text{total}} = \lambda_{\text{spring}} E_{\text{spring}} + \lambda_{\text{loc}} E_{\text{loc}} + \lambda_{\text{repulse}} E_{\text{repulse}}$$

Default parameters:
- $\lambda_{\text{spring}} = 0.05$ — spring energy constraining inter-vertex distances
- $\lambda_{\text{loc}} = 1.0$ — location term pulling vertices to the target offset position
- $\lambda_{\text{repulse}} = 0.025$ — repulsion term preventing self-intersections

Integration uses momentum-based gradient descent (`INTEGRATE_MOMENTUM`) with:
- Initial averaging: `n_averages = 16`
- Time step: `dt = 0.25`
- Number of neighbours: `nbrs = 2`

When `--thickness` is used, the expansion distance at each vertex is scaled by the local cortical thickness:

$$d_i = \text{mm\_out} \times T_i / T_{\max}$$

where $T_i$ is the cortical thickness at vertex $i$ (clipped to `[tmap_min, tmap_max]` and optionally averaged over `tmap_avgs` iterations).

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--thickness` | — | off | Scale expansion by cortical thickness |
| `--thickness-name` | `<name>` | `thickness` | Name of thickness file |
| `--pial-name` | `<name>` | `pial` | Name of pial surface |
| `--tmap-std` | `<float>` | 0.0 | Standard deviation for thickness smoothing |
| `--tmap-min` | `<float>` | 0.25 | Minimum thickness fraction |
| `--tmap-max` | `<float>` | 0.75 | Maximum thickness fraction |
| `--tmap-avgs` | `<int>` | 0 | Smoothing iterations for thickness map |
| `--tmap-write` | `<file>` | — | Write thickness map to file |
| `--orig` | `<name>` | — | Original surface name |
| `--label` | `<file>` | — | Restrict expansion to vertices in label |
| `--nbrs` | `<int>` | 2 | Number of vertex neighbours for spring term |
| `--nsurfaces` | `<int>` | 1 | Number of surfaces to expand (multi-layer) |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `--thickness` activates the variable-expansion mode; `--tmap-min`, `--tmap-max`, and `--tmap-avgs` only have effect when `--thickness` is set.
- `--label` restricts the expansion force to labelled vertices; unlabelled vertices remain at their original positions.
- `--nsurfaces > 1` generates multiple expansion surfaces, presumably at fractional increments.

## Typical Use Cases

```bash
# Generate mid-cortical surface (expand white by 1mm)
mris_expand lh.white 1.0 lh.mid

# Expand to 50% of cortical thickness
mris_expand --thickness lh.white 0.5 lh.mid_thickness

# Generate a surface 2mm outside the white surface
mris_expand lh.white 2.0 lh.white.expanded

# Restrict expansion to a label
mris_expand --label lh.V1.label lh.white 0.5 lh.V1_mid
```

## Pipeline Context

Not called by `recon-all` in the standard pipeline. Used in research workflows for:
- Laminar fMRI cortical depth sampling
- Mid-surface definition for surface-based analysis
- Generating multiple cortical depth surfaces

Related tools in the surface deformation family: [[mris_inflate]], [[mris_smooth]].

## Gotchas and Caveats

> [!gotcha] No volume constraints
> Unlike `mris_make_surfaces`, `mris_expand` does not use intensity information from an MRI volume. It expands purely geometrically. The expanded surface may cross the pial boundary if the expansion distance is too large.

> [!gotcha] Output name determines base_name
> The tool parses the output filename to extract the extension after the first `.` and uses it as `parms.base_name`. This affects internal naming but does not change the output path.

> [!gotcha] Repulsion does not guarantee non-intersection
> The repulsion term reduces self-intersections but does not eliminate them entirely, especially for large expansion distances in sulcal depths.

## Related Tools

- [[mris_inflate]] — inflates surface to a sphere (different purpose)
- [[mris_smooth]] — surface smoothing
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from source):** Default parameter values, energy formulation, thickness-scaling option, label restriction, output naming.

**Uncertain:** Exact multi-surface (`--nsurfaces`) behaviour; whether the expanded surface is validated against pial.
