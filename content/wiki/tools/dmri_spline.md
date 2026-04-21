---
title: "dmri_spline"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_spline.cxx"
  - "trc/spline.h"
  - "trc/spline.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_train]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Spline type (cubic, Catmull-Rom, etc.) not confirmed from header"
tags:
  - diffusion
  - tractography
  - spline
  - interpolation
  - tracula
---

# dmri_spline

## Summary

`dmri_spline` interpolates a smooth spline curve from a set of control points, producing a dense path representation suitable for visualization and analysis. It reads control point coordinates from a text file, fits a spline through them (optionally within a brain mask), and writes the interpolated path as a volume file, a text file, or a set of tangent vector files. This tool is used in the TRACULA pipeline to convert the sparse control-point path representation into a dense path.

## Source Information

- **Language:** C++
- **Source files:** `trc/dmri_spline.cxx`, `trc/spline.h`, `trc/spline.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_spline`
- **Original author:** Anastasia Yendiki (MGH)

## Purpose and Context

TRACULA represents white-matter paths as sequences of control points that define a spline. `dmri_spline` interpolates this sparse control-point representation to a dense set of voxel coordinates, enabling:
1. Visualization of the tract as a continuous curve.
2. Computation of path length, tangent directions, and curvature.
3. Extraction of diffusion measures at each point along the path.

## Inputs

| Variable | Flag | Description | Format |
|----------|------|-------------|--------|
| `inFile` | `--cpts` | Input control points file | text (voxel coordinates) |
| `maskFile` | `--mask` | Brain mask (optional) | MGZ/NIfTI |
| `outVolFile` | `--out` | Output path volume | MGZ/NIfTI |
| `outTextFile` | `--outpts` | Output path as text coordinates | text |
| `outVecBase` | `--outvec` | Base filename for output tangent vectors | text |
| `showControls` | `--show` | Include control points in output | flag |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Volume file | Binary volume marking interpolated path voxels | MGZ/NIfTI |
| Text file | Voxel coordinates of interpolated path points | text |
| Vector files | Tangent vectors at each path point | text |

## Mathematical Foundations

The `Spline` class (in `trc/spline.cxx`) fits a parametric curve through the control points. The spline is parameterized by arc length and interpolated to produce a densely-sampled path. At each interior point, the tangent vector $\mathbf{t}$ and curvature $\kappa$ can be computed:

$$
\mathbf{t}(s) = \frac{d\mathbf{r}}{ds}, \quad \kappa(s) = \left\|\frac{d\mathbf{t}}{ds}\right\|
$$

where $\mathbf{r}(s)$ is the path position at arc length $s$.

> [!gap] Spline type
> Whether the implementation uses cubic B-splines, Catmull-Rom splines, or another variant is not confirmed without reading `spline.cxx`.

The code instantiates the spline as:
```cpp
Spline myspline(inFile, maskFile);
```
indicating it reads control points from the input file and optionally constrains points to the brain mask.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--cpts` | `<file>` | required | Input control points file |
| `--mask` | `<file>` | — | Brain mask (optional) |
| `--out` | `<file>` | — | Output path volume |
| `--outpts` | `<file>` | — | Output path as text coordinates |
| `--outvec` | `<base>` | — | Output tangent vector base filename |
| `--show` | — | false | Include control points in output |
| `--debug` | — | false | Enable debug output |

## Typical Use Cases

```bash
# Interpolate a spline from control points
dmri_spline \
  --cpts path_control_points.txt \
  --mask brain_mask.nii.gz \
  --out path_volume.nii.gz \
  --outpts path_coordinates.txt \
  --outvec path_tangents
```

## Pipeline Context

`dmri_spline` is used within the TRACULA pipeline by `dmri_pathstats` for path parameterization, and potentially by `dmri_paths` for visualization of the inferred path trajectory.

## Gotchas and Caveats

> [!gotcha] Control point format
> The input file format (number of columns, whether coordinates are in voxel or RAS space) is not confirmed without reading the `Spline` constructor.

## Related Tools

- [[dmri_paths]] — uses spline representation for path parameterization
- [[dmri_pathstats]] — uses spline for arc-length parameterization of measures
- [[dmri_train]] — generates the prior files that encode path control points

## Confidence and Gaps

> [!gap] Spline implementation
> `trc/spline.cxx` was not read. The spline type and coordinate system of inputs/outputs are not confirmed.
