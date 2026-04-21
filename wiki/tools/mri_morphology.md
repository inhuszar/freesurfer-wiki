---
title: "mri_morphology"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_morphology/mri_morphology.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - morphology
  - preprocessing
  - segmentation
---

# mri_morphology

## Summary

`mri_morphology` applies 3D morphological operations (dilate, erode, open, close, mode filter, erode with threshold, dilate with threshold, fill holes) to an MRI volume. Operations can be applied to the whole volume or restricted to a specific integer label within it. This is a utility for post-processing binary or labeled segmentation volumes.

## Source Information

- **Language:** C++
- **Source file:** `mri_morphology/mri_morphology.cpp`
- **Author:** Bruce Fischl

## Purpose and Context

Morphological operations are fundamental tools in medical image processing for:
- **Dilation:** expanding a structure to fill small gaps.
- **Erosion:** shrinking a structure to remove thin protrusions.
- **Opening (erode then dilate):** removing small protrusions while preserving overall shape.
- **Closing (dilate then erode):** filling small holes while preserving overall shape.
- **Mode filter:** replacing each voxel with the most common (mode) label in its neighbourhood (useful for smoothing discrete label volumes).
- **Fill holes:** filling enclosed cavities in a binary volume.

These are used throughout FreeSurfer's segmentation pipeline to clean up binary white matter, brain masks, and other binary volumes.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volume | [[mgz]] | Binary or labeled volume |
| Operation | string | One of: `dilate`, `erode`, `open`, `close`, `mode`, `erode_thresh`, `dilate_thresh`, `erode_bottom`, `fill_holes` |
| Iterations | int | Number of times to apply the operation |
| Output filename | string | Positional argument 4 |

**Usage:** `mri_morphology [options] <in_vol> <operation> <niter> <out_vol>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Processed volume | [[mgz]] | Volume after morphological operation |

## Mathematical Foundations

For 3D binary morphological operations with structuring element $B$ (typically a 3×3×3 cube):

**Dilation:** $A \oplus B = \{\mathbf{x} \mid B_{\mathbf{x}} \cap A \neq \emptyset\}$

**Erosion:** $A \ominus B = \{\mathbf{x} \mid B_{\mathbf{x}} \subseteq A\}$

**Opening:** $(A \ominus B) \oplus B$ — removes thin protrusions.

**Closing:** $(A \oplus B) \ominus B$ — fills small holes.

The `mode` filter assigns each voxel the most common label value in its $3^3 = 27$-voxel neighbourhood, requiring `MRI_UCHAR` input (automatically converted).

`erode_thresh` and `dilate_thresh` are intensity-threshold-aware variants.

`erode_bottom` (`MRIerodeBottom()`) is a specialized operation that erodes only the inferior boundary of a labeled structure — used for refining inferior subcortical boundaries.

`fill_holes` uses a flood-fill approach to identify and fill enclosed cavities in a binary volume.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-l <label>` | int | -1 (all) | Restrict operation to this integer label value |
| `-mask <fname>` | string | null | Apply operation only within this mask volume |

## Configuration Interactions

- `-l <label>` causes the tool to extract only the specified label from the volume, apply the morphological operation, then reinsert the result back into the original volume. All other labels are preserved.
- `-mask` further restricts the operation to within the mask region.
- The `mode` operation requires `MRI_UCHAR` type; the tool auto-converts if the input is a different type.
- `open` and `close` are compound operations (erode+dilate and dilate+erode); the `niter` argument specifies the number of times each sub-operation is applied.

> [!gotcha] niter for open/close
> For `open` and `close`, `niter` applies to each step (erosion and dilation separately). `mri_morphology input.mgz open 2 output.mgz` erodes 2 times then dilates 2 times, not erode-1-dilate-1 twice.

## Typical Use Cases

```bash
# Dilate white matter segmentation by 2 voxels
mri_morphology wm.mgz dilate 2 wm_dilated.mgz

# Erode brain mask by 1 voxel
mri_morphology brainmask.mgz erode 1 brainmask_eroded.mgz

# Opening: remove small WM protrusions
mri_morphology wm.mgz open 1 wm_opened.mgz

# Mode filter on segmentation (smooth label boundaries)
mri_morphology aseg.mgz mode 1 aseg_smooth.mgz

# Restrict operation to left WM label (label 2) only
mri_morphology aseg.mgz dilate 1 aseg_lhwm_dilated.mgz -l 2

# Fill holes in binary brain mask
mri_morphology brainmask.mgz fill_holes 1 brainmask_filled.mgz
```

## Pipeline Context

Used throughout `recon-all` in several places:
- White matter segmentation cleanup (dilate/erode WM binary mask).
- Brain mask refinement (fill holes, erode to remove thin strands).
- Surface reconstruction preprocessing.

The operations are also called programmatically from within other tools (e.g., [[mri_segment]] calls morphological operations internally).

## Gotchas and Caveats

> [!gotcha] Mode filter requires UCHAR
> If the input is not `MRI_UCHAR`, the mode filter converts it before processing. This conversion may clip values outside [0, 255] for float inputs.

> [!gotcha] Label-restricted operation reinserts result into full volume
> When `-l` is used, the tool temporarily zeros all non-specified labels, applies the operation, then reinserts the result. If the dilated label overlaps with another label's voxels in the original volume, those voxels will be overwritten.

> [!gotcha] erode_bottom is specialized
> `erode_bottom` erodes only the inferior (−Z) boundary of a structure. It is a domain-specific operation designed for subcortical segmentation cleanup and may behave unexpectedly on other structures.

## Related Tools

- [[mri_binarize]] — for thresholding and binarization before morphological operations
- [[mri_mask]] — for masking volumes (also has `-dilate` and `-erode` flags)
- [[mri_segment]] — segmentation tool that uses morphological operations internally

## Confidence and Gaps

**Confident:** All operations (from complete source reading), `-l` label restriction logic, mode filter UCHAR requirement, open/close compound operation behaviour.
