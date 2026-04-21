---
title: "mri_strip_nonwhite"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_strip_nonwhite/mri_strip_nonwhite.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_segment]]"
  - "[[mri_binarize]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps: []
tags:
  - mri
  - white-matter
  - masking
  - segmentation
---

# mri_strip_nonwhite

## Summary

`mri_strip_nonwhite` removes non-white-matter voxels from an MRI volume using a morphological transform (M3D morph) to define a template, then applying neighborhood-based threshold masking. It reads a T1 volume, a template volume with an associated M3D nonlinear transform, and produces a masked output volume where voxels outside white matter regions (as determined by the template warp) are zeroed out.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_strip_nonwhite/mri_strip_nonwhite.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_strip_nonwhite`

## Purpose and Context

In the FreeSurfer white matter segmentation pipeline, it is sometimes necessary to restrict a volume to only white matter tissue. `mri_strip_nonwhite` uses a nonlinear deformable atlas (M3D morph) to warp a template mask and then applies it to the input volume with a threshold, producing a white-matter-only volume. This is an older tool that uses M3D (3D morphable) transforms, predating the GCAM/LTA infrastructure in modern FreeSurfer.

## Inputs

### Required Inputs

Positional arguments in order (from `main()`): `<in_fname> <xform_fname> <template_fname> <out_fname>`

- **`<in_fname>`** — Input T1 MRI volume (`argv[1]`).
- **`<xform_fname>`** — M3D nonlinear transform file (`.m3d`) (`argv[2]`).
- **`<template_fname>`** — Template volume (white matter atlas) (`argv[3]`).
- **`<out_fname>`** — Output masked volume (`argv[4]`).

> [!gotcha] Argument order
> The transform argument comes **before** the template, not after. Incorrect ordering silently produces wrong results.

### Input Assumptions

> [!assumption] M3D transform format
> This tool uses the legacy M3D transform format (`M3D *m3d = MRI3Dmorph_read()`). This is an older nonlinear warp format predating the GCAM (`.m3z`) format used in newer FreeSurfer tools.

## Outputs

### Files Created

- **Masked volume** — input volume with non-white-matter voxels set to 0.

## Mathematical Foundations

1. The template volume is warped to the input space using the M3D inverse transform (`MRIapplyInverse3DMorph`).
2. `MRImaskThresholdNeighborhood()` is applied:
   - First, a bounding box `[xmin, xmax] × [ymin, ymax] × [zmin, zmax]` is computed from voxels in the inverse-warped template that exceed `pct`. The bounding box is expanded by `nsize` voxels in each direction.
   - Voxels outside this bounding box in the input are set to zero.
   - For voxels inside the bounding box: each voxel is retained if **any** voxel in its `nsize`-radius neighbourhood (in the inverse-warped template) exceeds `pct`. Otherwise, the voxel is set to zero.
3. The masked volume is written to `out_fname`. Additionally, the tool always writes the inverse-warped template to `inverse.mgh` in the current directory as a side effect.

> [!gotcha] Side effect: `inverse.mgh` is always written
> The code unconditionally calls `MRIwrite(mri_inverse_template, "inverse.mgh")` before the masking step. This creates a file named `inverse.mgh` in the current working directory on every run.

## Configuration Options

Flag list fully verified from `get_option()` in source. The option parser uses a `switch` on the first character (`toupper()`) — there are no long-form named flags.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-N` | `<int>` | `0` (auto) | Neighbourhood radius in voxels for the masking operation. If 0, it is automatically set to `node_spacing + 1` from the M3D transform. |
| `-T` or `-P` | `<float>` | `0.0` | Threshold for the neighbourhood masking criterion. Both `-T` and `-P` set the same `pct` variable; a voxel is retained only if any voxel in its neighbourhood exceeds this threshold in the inverse-warped template. |

### Configuration Interactions

`-T`/`-P` and `-N` together control the masking aggressiveness. Higher threshold with larger neighbourhood radius produces more conservative masking (retains only regions with strong local white matter signal in the template space). If `-N 0` (default), the neighbourhood size is derived automatically from the M3D transform's `node_spacing` field.

## Typical Use Cases

### Use Case 1: Strip non-white tissue from T1 volume

```bash
mri_strip_nonwhite \
  orig.mgz orig_to_template.m3d wm_template.mgz stripped.mgz
```

## Pipeline Context

`mri_strip_nonwhite` is not called by standard `recon-all`. It is a legacy utility for white matter volume preparation.

## Gotchas and Caveats

> [!gotcha] Legacy M3D transform format
> The M3D morph format is a legacy format. Modern FreeSurfer uses GCAM (`.m3z`) transforms. This tool cannot use GCAM transforms without modification.

## Related Tools

- [[mri_edit_wm_with_aseg]] — edits white matter segmentation using aseg labels
- [[mri_segment]] — white matter segmentation
- [[mri_binarize]] — general-purpose volume thresholding

## Confidence and Gaps

Confidence is **high**. Full source including `get_option()`, `main()`, and `MRImaskThresholdNeighborhood()` was read. Positional argument order, flag names, defaults, and masking algorithm are all verified.
