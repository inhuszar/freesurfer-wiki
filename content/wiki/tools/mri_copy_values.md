---
title: "mri_copy_values"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_copy_values/mri_copy_values.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - label
  - voxel
  - copy
  - segmentation
---

# mri_copy_values

## Summary

`mri_copy_values` copies voxels with a specific label value from a source volume into a destination volume, overwriting only the voxels that carry that label in the source. The destination volume is read from disk, modified in-place, and written back. This is a targeted label-transplant operation.

## Source Information

- **Language:** C++
- **Source file:** `mri_copy_values/mri_copy_values.cpp`

## Purpose and Context

This simple utility is used when you want to copy a specific region (identified by a label integer) from one segmentation or mask volume into another, without disturbing the other labels in the destination. A common use case is inserting a manually corrected structure from an edit volume into an automated segmentation.

## Inputs

Positional arguments:
1. **`in_fname`**: source volume (any `MRIread`-compatible format)
2. **`label`**: integer label value to copy
3. **`out_fname`**: destination volume (read from disk, modified, written back)

## Outputs

The destination volume `out_fname` with all voxels carrying `label` replaced by the corresponding voxels from `in_fname`. File is written back to the same path.

## Mathematical Foundations

Calls `MRIcopyLabel(mri_src, mri_dst, label)`, which iterates over all voxels and, wherever `mri_src` equals `label`, writes that value to the corresponding voxel in `mri_dst`.

```
for each voxel (x,y,z):
    if mri_src(x,y,z) == label:
        mri_dst(x,y,z) = label
```

The function returns the count of copied voxels.

## Configuration Options

No options other than the three required positional arguments.

| Argument | Description |
|----------|-------------|
| `in_fname` | Source volume |
| `label` | Integer label value to copy |
| `out_fname` | Destination volume (read-modify-write) |

## Configuration Interactions

None. The tool has no optional flags.

## Typical Use Cases

Copy the left caudate (label 11) from a manually corrected segmentation into the automated aseg:
```bash
mri_copy_values manual_edit.mgz 11 auto_aseg.mgz
```

Note: `auto_aseg.mgz` is overwritten in place.

## Pipeline Context

Not part of [[recon-all]]. Used in manual editing workflows:
1. Manually edit a structure in a copy of the segmentation.
2. Use `mri_copy_values` to transplant only that structure back into the main segmentation.

## Gotchas and Caveats

> [!gotcha] Overwrites destination in place
> `out_fname` is read, modified, and written back to the **same path**. There is no option to specify a separate output filename. Back up the destination before running.

> [!gotcha] No geometry check
> The tool does not verify that `in_fname` and `out_fname` have identical geometry. Mismatched volumes will produce silent errors (wrong voxels copied or out-of-bounds access).

> [!gotcha] Minimal interface
> This tool has essentially one function: `MRIcopyLabel`. For more complex label operations, consider [[mri_binarize]] (thresholding and masking) or custom scripting with Python/nibabel.

## Related Tools

- [[mri_binarize]] — threshold-based label extraction and manipulation
- [[mri_convert]] — general volume processing
- `mri_label2vol` — convert surface labels to volumes

## Confidence and Gaps

Confidence is **high**. Source is 115 lines and completely read.
