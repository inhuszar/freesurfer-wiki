---
title: "mri_surfacemask"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_surfacemask/mri_surfacemask.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_mask]]"
  - "[[mris_volmask]]"
  - "[[mri_binarize]]"
  - "[[mri_fill]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not read from main() — only the surface voxelization algorithm was examined."
tags:
  - mri
  - mask
  - surface
  - voxelization
---

# mri_surfacemask

## Summary

`mri_surfacemask` takes an MRI volume and a cortical surface and produces a masked output volume where all voxels outside the surface have been zeroed. It works by voxelizing the triangulated surface (marking which voxels the surface passes through), then using this surface shell to define an interior region, zeroing all voxels exterior to the surface.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_surfacemask/mri_surfacemask.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_surfacemask`
- **Original Author:** Yasunari Tosa

## Purpose and Context

Given a closed cortical surface (e.g., the pial surface), this tool creates a volume that contains the original MRI signal only within the brain region bounded by the surface. Voxels outside the surface boundary are set to zero. This is a volume-space masking operation guided by surface geometry.

The voxelisation algorithm rasterises each triangular face of the surface, marking the voxels that the surface passes through, then applies filling to define the interior. This is analogous to what `mri_fill` does for the white matter surface, but can be applied to any surface.

## Inputs

### Required Inputs

(Inferred from code structure; exact positional argument syntax not confirmed)

- **MRI volume** — input MRI in any FreeSurfer-supported format.
- **Surface file** — FreeSurfer binary surface file defining the mask boundary.
- **Output volume** — destination for the masked volume.

### Input Assumptions

> [!assumption] Closed surface required
> The algorithm works by marking surface face voxels and inferring interior. A non-closed surface (with holes) will produce incorrect masking as the interior/exterior distinction breaks down.

> [!assumption] Surface in same coordinate space as volume
> The surface vertex coordinates must be in the same coordinate system as the volume (surface RAS). If the surface and volume have mismatched coordinate frames, the mask will be applied in the wrong location.

## Outputs

### Files Created

- **Masked volume** — same dimensions and geometry as the input volume. Voxels outside the surface are set to 0; voxels inside retain the original MRI intensity.

## Mathematical Foundations

**Surface rasterization:** For each triangular face defined by vertices $(x_0,y_0,z_0)$, $(x_1,y_1,z_1)$, $(x_2,y_2,z_2)$, the algorithm:

1. Computes the maximum edge length $d_{\max}$ among the three edges.
2. Parameterizes the triangle using barycentric coordinates $(u, v)$ with $u, v \in [0, 1]$, $u+v \leq 1$.
3. Evaluates the surface at a grid of $(u, v)$ points with resolution proportional to $d_{\max}$ (specifically, `numu = ceil(2*d0)`, `numv = ceil(2*dmax)` where `d0` is the first edge length).
4. For each sampled point, converts to voxel coordinates $(x_v, y_v, z_v)$ using the volume's scanner-to-voxel transform.
5. Marks that voxel as part of the surface shell.

The oversampling (factor of 2) ensures that no voxels are missed even for small triangles.

After surface rasterization, the algorithm determines interior voxels and zeros all exterior voxels.

## Configuration Options

### Complete Flag Reference

> [!gap] Command-line interface not read
> The `main()` function in the source was only partially read; it likely contains argument parsing after the voxelization function definitions. Verify via `--help`.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--version` | boolean | — | Print version string and exit. |

### Configuration Interactions

No documented interactions; the tool appears to be straightforward with positional arguments.

## Typical Use Cases

### Use Case 1: Mask volume to pial surface

```bash
mri_surfacemask T1.mgz lh.pial masked.mgz
```

Zeros all voxels outside the left pial surface in T1.

## Pipeline Context

`mri_surfacemask` is not called by `recon-all`. It is a post-processing utility for creating masked volumes bounded by surfaces.

## Gotchas and Caveats

> [!gotcha] Works on surface faces, not the filled interior directly
> The masking requires a fill step after surface rasterization. For surfaces with topological defects, the fill may not correctly identify the interior.

> [!gotcha] Only marks one hemisphere
> A single surface is provided; for a bilateral mask, the tool would need to be run twice (once per hemisphere) and the results combined.

## Related Tools

- [[mri_mask]] — masks a volume using another volume as mask (not surface-based)
- [[mris_volmask]] — creates a volume mask from cortical surfaces (fills ribbon between white and pial)
- [[mri_binarize]] — general-purpose volume thresholding
- [[mri_fill]] — fills the white matter volume (similar concept, used in pipeline)

## Confidence and Gaps

Confidence is **high** for the voxelization algorithm. The command-line interface was not fully verified.

> [!gap] Command-line argument syntax
> The exact invocation syntax (positional argument order, any optional flags) should be verified.
