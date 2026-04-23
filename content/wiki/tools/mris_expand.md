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
last_agent_update: 2026-04-22
gaps:
  - "Exact multi-surface (-n) behaviour; whether surfaces are at fractional increments or each is the full expansion."
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
- Thickness file (when `-thickness` is used): `$SUBJECTS_DIR/<subj>/surf/<hemi>.thickness`
- Pial surface (when `-thickness` is used): `$SUBJECTS_DIR/<subj>/surf/<hemi>.pial`

## Outputs

- **Expanded surface file** (positional arg 3): FreeSurfer surface file written via `MRISwrite()`.

## Mathematical Foundations

The expansion is formulated as an energy minimisation. Starting from the input surface, each vertex is moved along its normal by `mm_out` mm, subject to:

$$
E_{\text{total}} = \lambda_{\text{spring}} E_{\text{spring}} + \lambda_{\text{loc}} E_{\text{loc}} + \lambda_{\text{repulse}} E_{\text{repulse}}
$$

Default parameters:
- $\lambda_{\text{spring}} = 0.05$ — spring energy constraining inter-vertex distances
- $\lambda_{\text{loc}} = 1.0$ — location term pulling vertices to the target offset position
- $\lambda_{\text{repulse}} = 0.025$ — repulsion term preventing self-intersections

Integration uses momentum-based gradient descent (`INTEGRATE_MOMENTUM`) with:
- Initial averaging: `n_averages = 16`
- Time step: `dt = 0.25`
- Number of neighbours: `nbrs = 2`

When `-thickness` is used, the expansion distance at each vertex is scaled by the local cortical thickness:

$$
d_i = \text{mm\_out} \times T_i / T_{\max}
$$

where $T_i$ is the cortical thickness at vertex $i$ (when a `-tmap` map is provided, it is clipped and optionally smoothed before use).

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-thickness` | — | off | Scale expansion distance by cortical thickness fraction |
| `-thickness_name <name>` | string | `thickness` | Thickness overlay filename to load |
| `-pial <name>` | string | `pial` | Name of pial surface file |
| `-tmap <file>` | file | — | Use a precomputed thickness-percent target map |
| `-random <std> <min> <max> <avgs>` | 4 floats | — | Subcommand of `-tmap`: generate a random Gaussian thickness-percent map with given std, min, max, and smoothing-averages count |
| `-wd <file>` | file | — | Write the (random) tmap to this file |
| `-label <file>` | file | — | Restrict expansion to vertices in label file |
| `-nbrs <n>` | int | 2 | Neighbourhood size for spring term |
| `-n <n>` | int | 1 | Number of surfaces to write during expansion |
| `-o <name>` | string | — | Original surface name for metric properties |
| `-navgs <n> <min>` | 2 ints | — | Smoothing averages: start count and minimum count |
| `-intensity <f> <vol>` | float+file | — | Restrict target locations to voxels at intensity f in volume |
| `-convex <f>` | float | — | Convexity energy weight (`l_convex`) |
| `-norm <f>` | float | — | Normal-direction energy weight (`l_norm`) |
| `-max_spring <f>` | float | — | Maximum spring energy weight (`l_max_spring`) |
| `-curv <f>` | float | — | Curvature energy weight (`l_curv`) |
| `-location <f>` | float | 1.0 | Location (target position) energy weight (`l_location`) |
| `-nspring <f>` | float | — | Normal spring energy weight (`l_nspring`) |
| `-angle <f>` | float | — | Angle energy weight (`l_angle`) |
| `-pangle <f>` | float | — | Pial angle energy weight (`l_pangle`) |
| `-spring_norm <f>` | float | — | Spring-normal energy weight (`l_spring_norm`) |
| `-nltspring <f>` | float | — | Non-linear tangential spring energy weight (`l_nltspring`) |
| `-tspring <f>` | float | — | Tangential spring energy weight (`l_tspring`) |
| `-surf_repulse <f>` | float | — | Surface repulsion energy weight (`l_surf_repulse`) |
| `-r <f>` | float | — | Repulsion energy weight (`l_repulse`) |
| `-s <f>` | float | 0.05 | Spring energy weight (`l_spring`) |
| `-t <f>` | float | 0.25 | Time step (`dt`) |
| `-w <n>` | int | 0 | Write expansion snapshots every n iterations |
| `-a <n>` | int | — | Smooth surface with n averages after expansion |

## Configuration Interactions

- `-thickness` activates variable-expansion mode; `-tmap` provides the per-vertex fraction map. When `-tmap random` is used, the random map parameters are embedded in the same flag call (std, min, max, avgs).
- `-wd` is only meaningful when `-tmap random` is specified; it writes the generated random map to disk.
- `-label` restricts the expansion force to labelled vertices; unlabelled vertices remain at their original positions.
- `-n` controls how many intermediate surfaces are written during the expansion loop.

## Typical Use Cases

```bash
# Generate mid-cortical surface (expand white by 1mm)
mris_expand lh.white 1.0 lh.mid

# Expand to 50% of cortical thickness
mris_expand -thickness lh.white 0.5 lh.mid_thickness

# Generate a surface 2mm outside the white surface
mris_expand lh.white 2.0 lh.white.expanded

# Restrict expansion to a label
mris_expand -label lh.V1.label lh.white 0.5 lh.V1_mid
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

**Confident (from source):** Default parameter values, energy formulation, thickness-scaling option, label restriction, output naming, complete flag list from `get_option()`.

**Uncertain:** Exact multi-surface (`-n`) behaviour; whether the expanded surface is validated against pial.
