---
title: "mris_thickness"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_thickness/mris_thickness.cpp"
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
| Cortex label (optional, via `-fill_holes`) | Two labels restricting thickness computation and hole-filling. | `.label` |
| Sphere surface (hardcoded as `sphere`, for `-fmin`) | Used for variational thickness mode; name is not user-configurable. | FreeSurfer binary surface |

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

The neighborhood size for the search is controlled by `-N` (default: 2), limiting the search to 2-hop neighbors for efficiency.

Maximum allowed thickness is 5.0 mm by default (set with `-max`). Vertices with computed thickness > this value are clamped or handled by `fill_thickness_holes()`.

### Laplacian streamline method (`-laplace`)

Solves the Laplace equation $\nabla^2 \phi = 0$ in the cortical ribbon (the volume between white and pial surfaces):
$$
\phi = 0 \text{ on white surface}, \quad \phi = 1 \text{ on pial surface}
$$

Thickness is measured along the streamlines of $\nabla \phi$ (which are perpendicular to both surfaces). The resolution (in mm) is passed as an argument to `-laplace` (default: 0.5 mm).

### Variational thickness method (`-fmin`)

Minimizes an energy functional to find the mapping between pial and white surface vertices that minimizes total path length while maintaining the topology constraint. Uses INTEGRATION_PARMS with:
- $\lambda_{\text{thick\_min}} = 1$ (minimize thickness)
- $\lambda_{\text{thick\_normal}} = 1$ (maintain normal direction)
- $\lambda_{\text{Ashburner\_triangle}} = 1$ (Ashburner & Friston triangle penalty)
- $\lambda_{\text{Ashburner\_lambda}} = 0.1$
- Integration type: momentum (dt = 0.1, momentum = 0.1, tol = 1e-3, 1000 iterations)

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-pial name` | surface name | `pial` | Pial surface name |
| `-white name` | surface name | `white` | White surface name |
| `-max T` | float | 5.0 | Maximum allowed thickness in mm |
| `-N N` | integer | 2 | Neighborhood size for closest-point search |
| `-osurf fname` | filename | — | Measure distance to this second surface; write result as curvature; implies unsigned distance |
| `-nsurf fname` | filename | — | Like `-osurf` but measures signed distance |
| `-laplace res`<br>`-laplacian res` | float | — | Use Laplacian streamline thickness; `res` is PDE resolution in mm (e.g., 0.5) |
| `-fmin`<br>`-variational`<br>`-new`<br>`-vector` | — | off | Use variational (functional minimization) thickness method |
| `-SDIR path` | directory | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` |
| `-long fname` | filename | — | Longitudinal output: file listing timepoint subjects |
| `-fill_holes cortex_label fsaverage_label` | two label files | — | Fill holes in cortex thickness using fsaverage reference label via soap-bubble interpolation |
| `-V` | — | off | Write vertex correspondences to output instead of thickness |
| `-W N` | integer | — | Write diagnostic surface snapshots every N iterations (for `-fmin` mode) |
| `-M val` | float | 0.1 | Momentum value for variational minimization |
| `-DT val` | float | 0.1 | Time step for variational minimization |
| `-tol val` | float | 1e-3 | Convergence tolerance for variational minimization |
| `-optimal` | — | off | Use line-search minimization instead of momentum gradient descent |
| `-momentum` | — | on | Use gradient descent with momentum (default for `-fmin`) |
| `-ic order` | integer | — | Use icosahedron of given order for variational mode |
| `-THICK_MIN val` | float | 1.0 | Lambda for minimum-thickness term in variational mode |
| `-THICK_NORMAL val` | float | 1.0 | Lambda for surface-normal thickness term in variational mode |
| `-THICK_PARALLEL val` | float | 0 | Lambda for parallel-thickness term in variational mode |
| `-THICK_SPRING val` | float | 0 | Lambda for spring thickness term in variational mode |
| `-spring val` | float | — | Lambda for tangential spring term in variational mode |
| `-nlarea val` | float | — | Lambda for nonlinear area term in variational mode |
| `-triangle l lam` | float float | 1.0, 0.1 | Ashburner 1999 triangle regularization weights `l` and `lam` |
| `-neg` | — | off | Allow negative-area vertices during variational integration |
| `-noneg` | — | on | Disallow negative-area vertices during variational integration (default) |
| `-vno N` | integer | — | Debug: trace a specific vertex number |
| `-thickness-from-seg surf label seg dmax ddelta out` | multiple args | — | Standalone: compute thickness from a segmentation volume by normal-ray tracing |

## Configuration Interactions

- `-laplace`/`-laplacian` and `-fmin`/`-variational` are alternative thickness methods; only one should be used at a time. Without either flag, the default closest-point method is used.
- The Laplacian resolution is passed as a required argument directly to `-laplace` (e.g., `-laplace 0.5`); there is no separate `-laplace_res` flag.
- `-osurf` causes early exit after measuring inter-surface distance — normal thickness computation is skipped entirely.
- `-nsurf` is identical to `-osurf` but sets `signed_dist = 1`.
- `-fill_holes` restricts thickness to cortical vertices; medial wall and other non-cortical vertices receive 0 thickness via soap-bubble fill.
- `-max` caps the output; vertices with true thickness > max are handled by `fill_thickness_holes()`.
- The variational mode flags (`-DT`, `-tol`, `-M`, `-THICK_MIN`, `-THICK_NORMAL`, etc.) only affect the `-fmin` mode; they are ignored in default or Laplacian mode.

## Typical Use Cases

**Standard thickness computation (as called by recon-all):**
```bash
mris_thickness \
  -fill_holes $SUBJECTS_DIR/sub01/label/lh.cortex.label \
             $SUBJECTS_DIR/fsaverage/label/lh.cortex.label \
  sub01 lh lh.thickness
```

**Laplacian streamline thickness (0.5 mm resolution):**
```bash
mris_thickness -laplace 0.5 \
  sub01 lh lh.laplace_thickness
```

**Distance between two arbitrary surfaces:**
```bash
mris_thickness -osurf lh.pial_2y \
  sub01 lh lh.pial_change
```
(The `-osurf` flag triggers `MRISmeasureDistanceBetweenSurfaces()` directly and exits immediately.)

**Thickness from segmentation (standalone):**
```bash
mris_thickness -thickness-from-seg \
  lh.white lh.cortex.label aseg.mgz 6 0.01 lh.thick_from_seg.mgz
```

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
> Vertices where the closest-point distance exceeds the `-max` threshold (default: 5 mm) are handled by `fill_thickness_holes()`. This can affect regions with poorly reconstructed surfaces or severe cortical folding artifacts. Inspect thickness maps for suspiciously large values near the maximum.

> [!gotcha] Neighborhood size limits search
> The default neighborhood size (`-N 2`) restricts the closest-point search to 2-hop neighborhood vertices. For highly curved surfaces, the true closest point may be outside this neighborhood. The Laplacian method is more accurate but much slower.

> [!gotcha] Laplacian resolution vs. accuracy
> Coarser resolution values (the argument to `-laplace`) speed up computation but reduce accuracy. The default 0.5 mm is a compromise; anatomically accurate results may require finer resolution at significant computational cost.

> [!gotcha] Cortex label required for accurate results
> Without `-fill_holes`, thickness is computed everywhere including the medial wall, where the white-pial distance has no anatomical meaning. The `recon-all` call always uses `-fill_holes`.

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
