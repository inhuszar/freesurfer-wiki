---
title: "mris_thickness"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_thickness/mris_thickness.cpp"
  - "mris_thickness/mris_gradient.cpp"
  - "mris_thickness/mris_intensity_profile.cpp"
  - "mris_thickness/mris_cluster_profiles.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_smooth]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_thickness_diff]]"
  - "[[mris_thickness_comparison]]"
  - "[[surface-format]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The -fmin (variational thickness) mode convergence behavior is not fully documented."
  - "The fill_thickness_holes() function behavior in regions of missing correspondence is not documented."
tags:
  - cortical-thickness
  - morphometry
  - autorecon3
  - surface
  - pipeline
---

# mris_thickness

## Summary

`mris_thickness` computes the cortical thickness at each vertex of a FreeSurfer surface by measuring the distance between the white matter and pial surfaces. It is one of the most important outputs of the FreeSurfer pipeline and is called during `autorecon3`. The default method measures the closest-point distance from each pial vertex to the white surface (and vice versa), while alternative modes include Laplacian streamline thickness and a variational approach. The tool is attributed to Bruce Fischl, with reference to Fischl and Dale, PNAS 2000.

## Source Information

- **Language:** C++
- **Source files:**
  - `mris_thickness/mris_thickness.cpp` — main thickness computation
  - `mris_thickness/mris_gradient.cpp` — gradient computation companion
  - `mris_thickness/mris_intensity_profile.cpp` — intensity profile companion
  - `mris_thickness/mris_cluster_profiles.cpp` — cluster profile companion
- **Reference:** Fischl B, Dale AM. *Measuring the thickness of the human cerebral cortex from magnetic resonance images.* PNAS 97(20):11050–11055, 2000.
- **Key internal functions:** `MRISmeasureDistanceBetweenSurfaces()`, `MRIScomputeDistanceToSurface()`, `MRISsolveLaplaceEquation()`, `MRISmeasureLaplaceStreamlines()`

## Purpose and Context

Cortical thickness is a fundamental morphometric measure reflecting neuronal density, myelination, and cortical development. In FreeSurfer, thickness is computed as the distance between the white/gray matter boundary (white surface) and the pial surface (outer cortical boundary). The standard FreeSurfer thickness map is widely used in morphometric studies and is an input to `mri_segstats` and [[mris_anatomical_stats]] for regional statistics.

`mris_thickness` is called during `recon-all -autorecon3` as part of the standard morphometric analysis stage.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Subject name (positional arg 1) | FreeSurfer subject directory name. | — |
| Hemisphere (positional arg 2) | `lh` or `rh` | — |
| Output filename (positional arg 3) | Thickness file name (stored in `surf/` directory). | Curvature-format binary |
| Pial surface | `<subject>/surf/<hemi>.pial` by default. | FreeSurfer binary surface |
| White surface | Read via `MRISreadOriginalProperties()` using `white_name` (default: `white`). | FreeSurfer binary surface |
| Cortex label (optional, `-cortex_label`) | Label restricting thickness computation. | `.label` |
| fsaverage label (optional, `-fsaverage_label`) | Used by `fill_thickness_holes()`. | `.label` |
| Sphere surface (optional, for `-fmin`) | Used for variational thickness mode. | FreeSurfer binary surface |

**Usage:** `mris_thickness [options] <subject> <hemi> <output_thickness>`

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Thickness file (`lh.thickness` / `rh.thickness`) | Per-vertex cortical thickness in mm, stored as a curvature file. | Curvature binary |
| Optional output surface (`-osurf`) | Surface with thickness written to it. | FreeSurfer binary surface |
| Optional longitudinal file (`-long`) | Output path for longitudinal thickness. | Curvature binary |

## Mathematical Foundations

### Default method: Closest-point distance

For each vertex $v$ on the pial surface at position $\mathbf{p}_v$, find the closest point on the white surface and compute the Euclidean distance:

$$
t_v = \min_{w \in \text{white surface}} \|\mathbf{p}_v - \mathbf{p}_w\|_2
$$

The same computation is done from white to pial. The final thickness is the average:

$$
T_v = \frac{t_v^{\text{pial}\to\text{white}} + t_v^{\text{white}\to\text{pial}}}{2}
$$

The function `MRISmeasureDistanceBetweenSurfaces(mris, mris2, signed_dist)` implements this with signed distance support.

The neighborhood size for the search is controlled by `nbhd_size` (default: 2), limiting the search to 2-hop neighbors for efficiency.

Maximum allowed thickness is `max_thick = 5.0 mm` (default). Vertices with computed thickness > 5 mm are clamped or handled by `fill_thickness_holes()`.

### Laplacian streamline method (`-laplace_thick`)

Solves the Laplace equation $\nabla^2 \phi = 0$ in the cortical ribbon (the volume between white and pial surfaces):
$$
\phi = 0 \text{ on white surface}, \quad \phi = 1 \text{ on pial surface}
$$

Thickness is measured along the streamlines of $\nabla \phi$ (which are perpendicular to both surfaces). Resolution: `laplace_res = 0.5 mm` by default.

### Variational thickness method (`-fmin`)

Minimizes an energy functional to find the mapping between pial and white surface vertices that minimizes total path length while maintaining the topology constraint. Uses INTEGRATION_PARMS with:
- $\lambda_{\text{thick\_min}} = 1$ (minimize thickness)
- $\lambda_{\text{thick\_normal}} = 1$ (maintain normal direction)
- $\lambda_{\text{Ashburner\_triangle}} = 1$ (Ashburner & Friston triangle penalty)
- $\lambda_{\text{Ashburner\_lambda}} = 0.1$
- Integration type: momentum (dt = 0.1, momentum = 0.1, tol = 1e-3, 1000 iterations)

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-pial name` | surface name | Pial surface name (default: `pial`) |
| `-white name` | surface name | White surface name (default: `white`) |
| `-max_thick T` | float | Maximum allowed thickness in mm (default: 5.0) |
| `-nbhd_size N` | integer | Neighborhood size for closest-point search (default: 2) |
| `-osurf fname` | filename | Write thickness to output surface file |
| `-sphere name` | surface name | Sphere name for `-fmin` mode (default: `sphere`) |
| `-laplace_thick` | — | Use Laplacian streamline thickness method |
| `-laplace_res R` | float | Laplacian resolution in mm (default: 0.5) |
| `-fmin` | — | Use variational (functional minimization) thickness method |
| `-signed` | — | Compute signed distances (negative = white inside pial) |
| `-sdir path` | directory | Overrides `SUBJECTS_DIR` |
| `-long fname` | filename | Longitudinal output filename |
| `-cortex_label fname` | label file | Cortex label restricting analysis |
| `-fsaverage_label fname` | label file | fsaverage label for hole-filling |
| `-write_vertices` | — | Write vertex correspondence data |

## Configuration Interactions

- `-laplace_thick` and `-fmin` are alternative thickness methods; only one should be used at a time. Without either flag, the default closest-point method is used.
- `-laplace_res` only applies when `-laplace_thick` is specified.
- `-osurf` allows writing the thickness to a second surface file in addition to the standard curvature output.
- `-cortex_label` restricts computation to cortical vertices; medial wall and other non-cortical vertices are excluded (set to 0).
- `-max_thick` caps the output; vertices with true thickness > max are filled in by `fill_thickness_holes()`.

## Typical Use Cases

**Standard thickness computation (as called by recon-all):**
```bash
mris_thickness \
  -cortex_label $SUBJECTS_DIR/sub01/label/lh.cortex.label \
  sub01 lh lh.thickness
```

**Laplacian streamline thickness:**
```bash
mris_thickness -laplace_thick -laplace_res 0.5 \
  sub01 lh lh.laplace_thickness
```

**Distance between two arbitrary surfaces:**
```bash
mris_thickness -osurf lh.pial_2y lh.pial \
  sub01 lh lh.pial_change
```
(The `-osurf` flag triggers `MRISmeasureDistanceBetweenSurfaces()` directly.)

## Pipeline Context

`mris_thickness` is called in `recon-all -autorecon3`:
1. White and pial surfaces are fully reconstructed by `autorecon2`.
2. `mris_thickness` measures the distance between them.
3. The output `lh.thickness` (and `rh.thickness`) are used by:
   - [[mris_smooth]] to produce `lh.thickness.fwhm*.mgh` smoothed maps.
   - [[mris_anatomical_stats]] to compute mean thickness per parcellation label.
   - `mris_register` for group-level registration using thickness as a feature.

The `lh.thickness` file is stored in `<subject>/surf/` and the smoothed versions go to `<subject>/surf/`.

## Gotchas and Caveats

> [!gotcha] Max thickness cap at 5 mm
> Vertices where the closest-point distance exceeds `max_thick` (default: 5 mm) are handled by `fill_thickness_holes()`. This can affect regions with poorly reconstructed surfaces or severe cortical folding artifacts. Inspect thickness maps for suspiciously large values near the maximum.

> [!gotcha] Neighborhood size limits search
> The default `nbhd_size = 2` restricts the closest-point search to 2-hop neighborhood vertices. For highly curved surfaces, the true closest point may be outside this neighborhood. The Laplacian method is more accurate but much slower.

> [!gotcha] Laplacian resolution vs. accuracy
> Coarser `laplace_res` values speed up the Laplacian computation but reduce accuracy. The default 0.5 mm is a compromise; anatomically accurate results may require finer resolution at significant computational cost.

> [!gotcha] Cortex label required for accurate results
> Without `-cortex_label`, thickness is computed everywhere including the medial wall, where the white-pial distance has no anatomical meaning. The `recon-all` call always uses `-cortex_label`.

> [!math] Reference method
> The default closest-point method is described in Fischl & Dale, PNAS 2000. The Laplacian approach follows Jones et al. (2000). The variational approach is unpublished but uses the Ashburner & Friston (1999) triangle energy.

## Related Tools

- [[mris_smooth]] — smoothes the thickness map
- [[mris_anatomical_stats]] — computes regional mean thickness from this output
- [[mris_thickness_diff]] — computes per-vertex thickness differences between time points or groups
- [[mris_thickness_comparison]] — compares thickness maps for a subject
- [[recon-all]] — orchestrates the pipeline that calls this tool
- [[surface-format]] — surface and curvature file format reference

## Confidence and Gaps

**High confidence.** The default closest-point algorithm and Laplacian method are clearly described in the source and in the reference paper. The variational `-fmin` mode is implemented but less well documented.

> [!gap] Variational mode documentation
> The `-fmin` variational thickness mode uses a complex energy functional with multiple lambda parameters. The exact behavior, convergence guarantees, and comparison to the default method are not documented.
