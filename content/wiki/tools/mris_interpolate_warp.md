---
title: "mris_interpolate_warp"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_interpolate_warp/mris_interpolate_warp.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Output format (GCA morph volume or 3-frame warp) not fully confirmed"
  - "Exact use case within the FS pipeline (if any) is unclear"
tags:
  - surface
  - warp
  - deformation
  - registration
---

# mris_interpolate_warp

## Summary

`mris_interpolate_warp` takes two surface meshes (representing the same surface at different states — e.g., original and deformed vertex positions) and interpolates the displacement vector field defined by their vertex position difference into a volumetric warp field. The resulting volume has three frames representing the (dx, dy, dz) displacement at each voxel location. Scattered vertex-to-voxel displacement values are scattered into the volume and then regularized by iterative smoothing.

## Source Information

- **Language:** C++
- **Source file:** `mris_interpolate_warp/mris_interpolate_warp.cpp`
- **Original author:** Bruce Fischl
- **Key dependencies:** `gcamorph.h` (GCA morph), `mrinorm.h`, `mri_circulars.h`

## Purpose and Context

This tool converts a surface-defined deformation field into a volumetric warp, which can then be applied to MRI data using standard volumetric registration tools. Use cases include:
- Converting surface registration deformations to volume warps
- Extending surface-defined morphometric differences to the full brain volume
- Generating volumetric representations of surface deformations for statistical analysis

The workflow:
1. For each surface vertex, compute the displacement vector: $\Delta\mathbf{x}_v = \mathbf{x}_v^{\text{current}} - \mathbf{x}_v^{\text{original}}$
2. Project vertex positions to voxel coordinates using `MRISsurfaceRASToVoxelCached`
3. Scatter displacement values into the output volume with `MRIinterpolateIntoVolumeFrame`
4. Apply iterative smoothing (500 iterations by default) to fill gaps and regularize

## Inputs

| Argument | Description |
|----------|-------------|
| `argv[1]` (positional) | Start surface (read as current vertex positions `x/y/z`) |
| `argv[2]` (positional) | End surface (saved as `origx/origy/origz`; displacement = `argv[1] − argv[2]`) |
| `-l <vol>` | Template volume defining the output geometry |
| `-a <invol> <outfile>` | Optional: input volume to warp and output path |

## Outputs

| Output | Description |
|--------|-------------|
| `<output>.m3z` (positional `argv[3]`) | GCA morph file written via `GCAMwrite`. Contains the volumetric displacement field. |
| Optional warped volume (via `-a`) | Result of applying the computed warp to an input volume, written to the specified output path. |

## Mathematical Foundations

For each surface vertex $v$, the displacement in surface RAS coordinates:
$$
\boldsymbol{\delta}_v = \mathbf{x}_v - \mathbf{x}_v^{\text{orig}}
$$

Converted to voxel coordinates via the inverse of the vox2ras matrix:
$$
(\delta x_v^{\text{vox}}, \delta y_v^{\text{vox}}, \delta z_v^{\text{vox}}) = M^{-1}_{\text{vox2ras}} \boldsymbol{\delta}_v
$$

Scattered into the volume at voxel position $(x_v^{\text{vox}}, y_v^{\text{vox}}, z_v^{\text{vox}})$ using trilinear splatting.

Gaps are filled via iterative Laplacian smoothing over `N` (default: 500, set via `-i`) iterations, solving:
$$
\mathbf{w}_{\text{smooth}} \leftarrow \text{smooth}(\mathbf{w}, \text{niter})
$$

with zero boundary conditions at the volume edges (when not in `#if 0` code block).

## Configuration Options

The parser strips one leading dash (`option = argv[1] + 1`) and dispatches on the first character (case-insensitive). Flags are single-character short options only.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-l <vol>` | path | — | Template volume defining the output geometry (like-volume) |
| `-i <N>` | integer | 500 | Number of soap-bubble smoothing iterations |
| `-n` | — | off | Suppress writing the final warp (no-write mode) |
| `-a <invol> <outfile>` | 2 paths | — | Apply computed warp to `invol` and write result to `outfile` |

Positional: `argv[1]` = surface 1 (start/original), `argv[2]` = surface 2 (end/deformed), `argv[3]` = output `.m3z` warp file (when `-n` is not used).

## Configuration Interactions

- The two input surfaces must have the same number of vertices and the same topology.
- `-l <vol>` defines the voxel grid for the output — the warp is in that volume's voxel coordinates.
- `-i <N>` controls the smoothness of the interpolated warp; more iterations = smoother but potentially less accurate.
- Zero boundary conditions at volume edges (encoded in a `#if 0` block) are disabled in the current source.
- `-n` suppresses writing `argv[3]`; `-a` applies the warp to a volume and writes the result independently.

## Typical Use Cases

**Interpolate a surface-to-sphere deformation into a warp field:**
```bash
mris_interpolate_warp -l brain.mgz lh.white lh.sphere warp.m3z
```

**Apply the computed warp to a volume:**
```bash
mris_interpolate_warp -l brain.mgz -a input.mgz warped.mgz lh.white lh.sphere warp.m3z
```

## Pipeline Context

Not part of `recon-all`. Used in post-processing morphometry and registration workflows.

## Gotchas and Caveats

> [!gotcha] Boundary conditions may be disabled
> The code for setting zero boundary conditions at the volume edges is inside a `#if 0` block and is therefore not active. This may result in edge effects in the smoothed warp.

> [!gotcha] Warp is in voxel coordinates
> The output displacement field is in voxel coordinates of the `-l` template volume, not in mm. This needs to be accounted for when applying the warp.

## Related Tools

- [[mris_make_surfaces]] — produces the surfaces used as input
- [[coordinate-systems]] — surface RAS vs. voxel coordinates

## Confidence and Gaps

**Confident (from source):**
- Displacement computation (current - original vertex positions)
- Voxel-coordinate splatting via `MRIinterpolateIntoVolumeFrame`
- Iterative smoothing to fill gaps
- Output is a GCA morph (`.m3z`) written via `GCAMwrite(gcam, argv[3])`
