---
title: "mri_extract"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_extract/mri_extract.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_binarize]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - sub-volume
  - cropping
  - extraction
---

# mri_extract

## Summary

`mri_extract` extracts a rectangular sub-volume (region of interest) from an input MRI volume. The ROI is specified either by explicit voxel origin and size in the source image's voxel space, or by matching the field of view of a template volume. Negative values for origin or size trigger automatic bounding-box detection based on a threshold.

## Source Information

- **Source language:** C++
- **Source file:** `mri_extract/mri_extract.cpp`
- **Key dependencies:** `mri.h`

## Purpose and Context

`mri_extract` provides a fast way to crop or sub-sample a volume. It is useful for reducing the size of a large scan to a region of interest before further processing, or for extracting a matching sub-field from one volume based on another template volume's geometry.

## Inputs

**Mode 1 — Explicit region:**
```
mri_extract <src_volume> x0 y0 z0 dx dy dz <dst_volume>
```
- `<src_volume>`: Input volume
- `x0 y0 z0`: Voxel origin (CRS indices) of the extracted region. Negative values trigger bounding-box detection.
- `dx dy dz`: Size of the extracted region (voxels). Negative values trigger bounding-box detection.
- `<dst_volume>`: Output volume

**Mode 2 — Template-matched region:**
```
mri_extract -like <template_vol> <src_volume> <dst_volume>
```
- The tool computes the voxel coordinates in `src_volume` that correspond to the corners of the template, and extracts the matching sub-region.

## Outputs

- Cropped/extracted sub-volume at the specified output path.

## Mathematical Foundations

**Mode 2 coordinate mapping:**

The template's corner voxels $(0,0,0)$ and $(W-1, H-1, D-1)$ are mapped to source voxel coordinates using `MRIvoxelToVoxel()`, which applies the composition of the template-to-RAS and RAS-to-source affines:

$$v_{\text{src}} = A_{\text{src}}^{-1} \cdot A_{\text{tmpl}} \cdot v_{\text{tmpl}}$$

The extracted region is the bounding box of these two mapped corners.

**Bounding-box mode (negative origin/size):**

When `x0`, `y0`, `z0` are negative, they are replaced by the bounding box of non-zero (above threshold) voxels: `MRIboundingBox(mri_src, thresh, &box)`. The padding value `-pad` can expand the bounding box.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-like <vol>` | path | none | Extract region matching the geometry of template volume |
| `-R <n>` | int | `1` | Number of reductions (downsampling factor) before extraction |
| `-v` / `-verbose` | flag | off | Verbose output |
| `-pad <n>` | int | `0` | Padding voxels added to bounding box |
| `-thresh <value>` | float | `0.0` | Threshold for bounding-box computation |

> [!gap] Full flag list
> The above is inferred from global variables. The `get_option()` function body was not fully read.

## Configuration Interactions

- In `-like` mode, the `x0 y0 z0 dx dy dz` arguments must not be provided; only the source and destination paths follow `-like <template>`.
- Negative `x0` (or `y0`/`z0`) combined with `-pad` expands the auto-detected bounding box by `pad` voxels on each side.
- `-R <n>` reduces the input by factor $n$ before extraction.

## Typical Use Cases

```bash
# Extract a 64x64x64 sub-volume starting at voxel (100, 80, 90)
mri_extract brain.mgz 100 80 90 64 64 64 roi.mgz

# Auto-crop to bounding box of non-zero voxels, with 5-voxel padding
mri_extract brain.mgz -1 -1 -1 -1 -1 -1 cropped.mgz -pad 5

# Extract region matching a template volume
mri_extract -like template.mgz brain.mgz extracted.mgz
```

## Pipeline Context

Not called by `[[recon-all]]`. Useful as a preprocessing step to reduce computational load, or to extract ROIs for focused analyses.

## Gotchas and Caveats

> [!gotcha] Negative origin values trigger bounding-box mode
> Passing `-1` (or any negative value) for `x0`, `y0`, `z0`, `dx`, `dy`, `dz` activates automatic bounding-box detection. The manual says these trigger special behaviour, so they are not regular values.

> [!gotcha] Template-mode output space follows field coordinates
> In `-like` mode, the extracted region is in the source image's voxel space, clipped to the mapped template corners. The output affine may differ from both source and template.

## Related Tools

- `[[mri_convert]]` — general-purpose volume conversion, including cropping
- `[[mri_binarize]]` — thresholding (useful to produce bounding box inputs)

## Confidence and Gaps

**High confidence:** both usage modes, coordinate mapping, and bounding-box behaviour confirmed from source code.
