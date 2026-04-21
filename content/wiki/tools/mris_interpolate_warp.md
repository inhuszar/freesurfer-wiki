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

| Positional | Description |
|------------|-------------|
| `argv[1]` | First surface (with `origx/origy/origz` representing original positions) |
| `argv[2]` | Second surface (providing `x/y/z` representing deformed positions) |
| `--like vol` | Template volume defining the output geometry |
| `--i invol` | Optional input volume (unclear usage) |
| `--o outfile` | Output volume filename |

## Outputs

| Output | Description |
|--------|-------------|
| 3-frame warp volume | Volume with frames (dx, dy, dz) per voxel, in voxel coordinates. Saved to `--o outfile`. |

## Mathematical Foundations

For each surface vertex $v$, the displacement in surface RAS coordinates:
$$\boldsymbol{\delta}_v = \mathbf{x}_v - \mathbf{x}_v^{\text{orig}}$$

Converted to voxel coordinates via the inverse of the vox2ras matrix:
$$(\delta x_v^{\text{vox}}, \delta y_v^{\text{vox}}, \delta z_v^{\text{vox}}) = M^{-1}_{\text{vox2ras}} \boldsymbol{\delta}_v$$

Scattered into the volume at voxel position $(x_v^{\text{vox}}, y_v^{\text{vox}}, z_v^{\text{vox}})$ using trilinear splatting.

Gaps are filled via iterative Laplacian smoothing over `niter` (default: 500) iterations, solving:
$$\mathbf{w}_{\text{smooth}} \leftarrow \text{smooth}(\mathbf{w}, \text{niter})$$

with zero boundary conditions at the volume edges (when not in `#if 0` code block).

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--like vol` | path | required | Template volume for output geometry |
| `--i invol` | path | — | Input volume |
| `--o outfile` | path | required | Output warp volume filename |
| `-niter N` | integer | 500 | Number of smoothing iterations |
| `-no_write` | — | off | Compute but do not write output |
| `-pad N` | integer | 20 | Padding added around the surface bounding box |

Positional: `argv[1]` = surface 1 (original), `argv[2]` = surface 2 (deformed).

## Configuration Interactions

- The two input surfaces must have the same number of vertices and the same topology.
- `--like vol` defines the voxel grid for the output — the warp is in that volume's voxel coordinates.
- `niter` controls the smoothness of the interpolated warp; more iterations = smoother but potentially less accurate.
- Zero boundary conditions at volume edges (encoded in the `#if 0` block) appear disabled in the current source.

## Typical Use Cases

**Interpolate a surface-to-sphere deformation into a volume:**
```bash
mris_interpolate_warp --like brain.mgz --o warp.mgz \
    lh.white lh.sphere
```

## Pipeline Context

Not part of `recon-all`. Used in post-processing morphometry and registration workflows.

## Gotchas and Caveats

> [!gotcha] Boundary conditions may be disabled
> The code for setting zero boundary conditions at the volume edges is inside a `#if 0` block and is therefore not active. This may result in edge effects in the smoothed warp.

> [!gotcha] Warp is in voxel coordinates
> The output displacement field is in voxel coordinates of the `--like` template volume, not in mm. This needs to be accounted for when applying the warp.

## Related Tools

- [[mris_make_surfaces]] — produces the surfaces used as input
- [[coordinate-systems]] — surface RAS vs. voxel coordinates

## Confidence and Gaps

**Confident (from source):**
- Displacement computation (current - original vertex positions)
- Voxel-coordinate splatting via `MRIinterpolateIntoVolumeFrame`
- Iterative smoothing to fill gaps

> [!gap] Output format
> Whether the output is a standard 3-frame MGZ volume or a GCA morph file has not been confirmed.
