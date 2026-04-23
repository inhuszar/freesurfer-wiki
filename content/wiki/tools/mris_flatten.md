---
title: "mris_flatten"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_flatten/mris_flatten.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_sphere]]"
  - "[[mris_inflate]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact energy functional convergence criteria for the unfolding optimization not fully traced"
  - "Interaction between -dist and -nlarea coefficients not documented"
tags:
  - surface
  - flattening
  - retinotopy
  - visualization
---

# mris_flatten

## Summary

`mris_flatten` takes a cortical surface patch (a subset of the full triangulated surface mesh) and flattens it into a 2D plane by minimizing metric distortion. The primary use case is preparing visual cortex or other cortical regions for retinotopic mapping, where the 2D layout of cortical folding must be visualized in a flat representation. The algorithm, described in Fischl et al. (1999), iteratively minimizes an energy functional that penalizes deviations from original inter-vertex distances and local area elements.

## Source Information

- **Language:** C++
- **Source file:** `mris_flatten/mris_flatten.cpp`
- **Original author:** Bruce Fischl
- **Key reference:** Fischl, B., Sereno, M.I., Dale, A.M. (1999). "Cortical Surface-Based Analysis II: Inflation, Flattening, and a Surface-Based Coordinate System." *NeuroImage*, 9(2):195-207.

## Purpose and Context

Flattening is used to create 2D unfolded representations of cortical regions, most commonly for:
- **Retinotopic mapping** of visual cortex (V1, V2, V3, etc.)
- **Auditory cortex** visualization
- Custom ROI analyses requiring a 2D spatial layout

The tool requires a pre-cut surface patch file (typically created using `tksurfer` or `freeview` by cutting boundaries around the region of interest, e.g., the calcarine sulcus). The patch must be a connected 2D manifold with free boundary — the cut lines define where the surface is "torn" to allow it to unfold.

The flattening algorithm first projects the patch onto a plane (`MRISflattenPatch`), then uses gradient descent optimization (`MRISunfold`) to minimize metric distortion over multiple passes.

## Inputs

| Input | Description |
|-------|-------------|
| `in_patch_fname` | Input surface patch file (positional arg 1). Usually `?h.cortex.patch` or named `.flat.patch`. Must reside in the same directory as the associated surface (`?h.smoothwm` by default). |
| `out_patch_fname` | Output flattened patch file (positional arg 2). |
| `?h.smoothwm` | Full hemisphere surface file, auto-located from patch path (unless `-O` or `-copy-coords` specified). Used to provide the original metric properties. |

The hemisphere is inferred from the patch filename (two characters before the first `.` after the last `/`). Defaults to `lh` if not determinable.

> [!assumption] Input data assumption
> The patch file must already have boundary cuts applied (ripflag set on boundary vertices). The tool reads the unripped surface geometry from `?h.smoothwm` (default) to obtain original metric properties for distortion minimization.

## Outputs

| Output | Description |
|--------|-------------|
| `out_patch_fname` | Flattened patch in FreeSurfer binary patch format. Vertex coordinates are 2D (z=0). |
| `flatten.log` | Log file written when `-plane` or `-sphere` flags are used, containing analytic distance error metrics. |
| Intermediate snapshots | If `-w N` is set, writes intermediate snapshots every N iterations. |
| Flattened overlay image | If `-overlay` is specified, writes a 2D MGZ image with overlay data projected onto the flat map (written to the `out_patch_fname` path). |

## Mathematical Foundations

The flattening energy functional (from Fischl et al. 1999) minimizes two competing terms:

$$
E = \lambda_d \sum_{(i,j) \in \mathcal{N}} \left(\frac{d_{ij} - d^0_{ij}}{d^0_{ij}}\right)^2 + \lambda_A \sum_k \left(\frac{A_k - A^0_k}{A^0_k}\right)^2
$$

where:
- $d_{ij}$ is the current geodesic distance between vertices $i$ and $j$ in the flat map
- $d^0_{ij}$ is the original geodesic distance in the 3D surface
- $A_k$ is the current area of face $k$
- $A^0_k$ is the original area of face $k$
- $\lambda_d$ (`l_dist`, default 1.0) and $\lambda_A$ (`l_nlarea`, default 1.0) are regularization weights
- $\mathcal{N}$ is the neighborhood set (out to `nbhd_size`=7, max 12 neighbors per distance)

Optimization uses line minimization with momentum:
- Initial `dt = 0.1`, base dt = `base_dt_scale * dt`
- `n_averages = 1024` (spatial averaging of gradients)
- `niterations = 40` per pass, `max_passes = 1` by default

Overlay projection onto flat map uses barycentric interpolation within triangular faces.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-w N` | integer | 0 | Write intermediate patch snapshots every N iterations |
| `-n N` | integer | 40 | Number of iterations per pass |
| `-s scale` | float | 3.0 | Scale factor applied to surface before flattening |
| `-d disturb` | float | 0 | Perturbation magnitude added to vertex positions before optimization |
| `-O surf` | string | `smoothwm` | Name of surface file to use for original metric properties |
| `-ou name` | string | `orig` | Name of original unfolding surface |
| `-p N` | integer | 1 | Maximum number of unfolding passes |
| `-a N` | integer | 1024 | Number of gradient smoothing averages |
| `-m momentum` | float | 0.9 | Momentum for gradient descent |
| `-b val` | float | 1.0 | Base dt scale factor (`base_dt_scale`) |
| `-v N` | integer | — | Set Gdiag_no to vertex N for verbose diagnostics |
| `-r` | — | off | Randomly flatten (project to plane without optimization) |
| `-i` | — | off | Inflate the brain before flattening |
| `-dist coef` | float | 1.0 | Weight for distance preservation term (`l_dist`) |
| `-nlarea coef` | float | 1.0 | Weight for non-linear area preservation term (`l_nlarea`) |
| `-area coef` | float | — | Weight for linear area preservation term (`l_area`) |
| `-spring coef` | float | — | Weight for spring energy term (`l_spring`) |
| `-curv coef` | float | — | Weight for curvature energy term (`l_curv`) |
| `-angle coef` | float | — | Weight for angle preservation term (`l_angle`) |
| `-boundary coef` | float | — | Weight for boundary energy term (`l_boundary`) |
| `-expand coef` | float | — | Weight for expansion energy term (`l_expand`) |
| `-unfold coef dist_map` | float path | — | Weight for unfolding energy and distance map file |
| `-nbrs N` | integer | 2 | Neighborhood size for distance computation |
| `-distances nbhd max` | 2 ints | 7 12 | Neighborhood size and max neighbors for distance computation |
| `-vnum nbhd max` | 2 ints | 7 12 | Alias for `-distances` |
| `-complete` | — | off | Use complete distance matrix |
| `-plane` | — | off | Compute analytic error for a plane (writes to `flatten.log`) |
| `-sphere` | — | off | Compute analytic error for a sphere (writes to `flatten.log`) |
| `-nospring` | — | off | Disable spring term in integration parameters |
| `-dilate N` | integer | 0 | Dilate the patch N times before flattening |
| `-rescale r` | float | 1.0 | Rescale patch by factor r before optimization |
| `-as val` | float | 1.0 | Area coefficient scale |
| `-name name` | string | — | Base name for intermediate output files |
| `-overlay fname` | path | — | Project this overlay onto flat map (disables flattening optimization) |
| `-overlay_label fname` | path | — | Constrain overlay projection to this label |
| `-label_overlay fname` | path | — | Alias for `-overlay_label` |
| `-l label [ndil]` | path [int] | — | Create input patch from (optionally dilated) label file |
| `-seg seg ndil [segids...]` | path int [ints] | — | Create input patch from dilated segmentation mask |
| `-copy-coords surf` | path | — | Copy xyz coordinates from this surface before flattening |
| `-norand` | — | off | Set random seed to 0 (repeatable flattening) |
| `-seed val` | integer | — | Set random seed to a specific value |
| `-synth name` | path | — | Synthesize overlay from label files for testing |
| `-lm` | — | off | Use line minimization integration |
| `-adaptive` | — | off | Use adaptive time step integration |
| `-dt val` | float | 0.1 | Time step for gradient descent |
| `-dt_inc val` | float | 1.01 | Time step increase factor |
| `-dt_dec val` | float | 0.98 | Time step decrease factor |
| `-error_ratio val` | float | 1.03 | Error ratio threshold for step size adaptation |
| `-tol val` | float | 0.2 | Convergence tolerance |
| `-threads N` | integer | — | Number of OpenMP threads (alias: `-nthreads`) |
| `-nthreads N` | integer | — | Number of OpenMP threads (alias: `-threads`) |
| `-1` | — | off | Patch file is the only (and whole) surface file; skip normal patch-from-surface loading |

## Configuration Interactions

- `-r` skips the optimization entirely and only performs the initial planar projection via `MRISflattenPatchRandomly` — useful for debugging or creating a rough flat map quickly.
- `-overlay fname` activates overlay projection mode: after flattening, the overlay is resampled onto the 2D flat map using barycentric coordinates. The output is written to the `out_patch_fname` path. Also sets `niterations=0`, disabling the flattening optimization itself.
- `-overlay_label` / `-label_overlay` constrain the overlay projection to the vertices within a label; other vertices are ripped before the projection.
- `-nospring` disables the spring energy term in `INTEGRATION_PARMS`; usually the spring term provides smoothing, so disabling it may result in a more irregular flat map.
- `-O` and `-copy-coords` affect pre-flattening surface coordinates by different mechanisms: `-O` changes which surface provides the original metric properties, while `-copy-coords` copies vertex positions from a second surface before optimization.
- `-dilate` (topological dilation of ripped edges) and `-l`/`-seg` (label/segmentation dilation via `-dilate_label` argument in those flags) both expand the patch region by different mechanisms.

## Typical Use Cases

**Flatten a visual cortex patch (standard workflow):**
```bash
mris_flatten -w 10 lh.occipital.patch.flat lh.occipital.patch.flat.out
```

**Flatten and project an overlay:**
```bash
mris_flatten -overlay lh.retinotopy.mgz lh.occipital.patch.flat lh.flat_retinotopy.mgz
```

**Create patch from a label and flatten:**
```bash
mris_flatten -l lh.V1.label 0 lh.patch.flat lh.V1.flat
```

**Use a segmentation to define the patch region:**
```bash
mris_flatten -seg aseg.mgz 0 1 2 3 lh.patch.flat lh.flat
```

## Pipeline Context

`mris_flatten` is not part of the standard `recon-all` pipeline. It is a post-processing tool invoked manually after `recon-all` has completed and after the user has defined a patch region (typically via `tksurfer` or `freeview`).

Typical dependency chain:
1. [[recon-all]] completes, producing `?h.smoothwm`, `?h.pial`, etc.
2. User creates a patch using `tksurfer` or `freeview` (cut + save patch)
3. `mris_flatten` flattens the patch
4. Retinotopy or other functional analyses are performed on the flat map

Related surface tools that run before this in typical workflows: [[mris_inflate]], [[mris_sphere]], [[mris_smooth]].

## Gotchas and Caveats

> [!gotcha] Patch must have boundary cuts
> `mris_flatten` cannot flatten a closed surface. The patch must have explicit boundary cuts (vertices with `ripflag=1`). If the patch is not properly cut, the optimization will fail to converge or produce nonsensical results.

> [!gotcha] Hemisphere detection from filename
> The hemi is detected by taking the two characters before the first `.` in the filename. If the patch file is not named with a standard FreeSurfer convention (e.g., `lh.something`), the hemi will default to `lh` regardless of the actual hemisphere.

> [!gotcha] Surface file must be in same directory as patch
> Unless `-O` is used (or the patch is read as the surface itself via a workaround), the tool constructs the surface filename by combining the directory from the patch file path with `?h.smoothwm`. If these are not co-located, the tool will fail.

> [!gotcha] Scale factor and distortion
> The `-s scale` (default 3.0) rescales the patch before optimization. This is a heuristic for improving convergence and does not affect the final stored vertex coordinates (which are in surface RAS space), but it does affect the optimization trajectory.

## Related Tools

- [[mris_sphere]] — spherical parameterization (prerequisite for many analyses)
- [[mris_inflate]] — inflation step that precedes flattening in the full surface pipeline
- [[mris_smooth]] — surface smoothing
- [[surface-format]] — binary surface file format documentation
- [[coordinate-systems]] — surface RAS coordinates

## Confidence and Gaps

**Confident (from source code):**
- Energy functional structure (l_dist + l_nlarea terms)
- Default parameter values (dt, n_averages, nbhd_size, etc.)
- Hemisphere detection logic
- Overlay projection via barycentric interpolation
- Single-surface mode flag behavior

**Needs verification:**
- Exact output format of the `.flat` patch file vs. standard patch format
- Behavior of the segmentation ID list in `-seg` with multiple IDs (space-separated positional arguments)

> [!gap] Overlay projection resolution
> The resolution of the output flat map image when using `-mri` is not clearly documented; it appears to use `res=1.0` (1mm/pixel) but this may not be configurable from the command line.
