---
title: "mri_extract_largest_CC"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_extract_largest_CC/mri_extract_largest_CC.cpp"
  - "mri_extract_largest_CC/subroutines.cpp"
  - "mri_extract_largest_CC/myutils.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mri_binarize]]"
  - "[[mri_extract_label]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - connected-components
  - morphology
  - skull-stripping
  - binary-mask
---

# mri_extract_largest_CC

## Summary

`mri_extract_largest_CC` extracts the largest connected component from a binary segmentation volume and writes it to an output volume. It supports hemisphere-specific modes (for left/right WM labels), custom target values, thresholding, and inverse (background) extraction. It is used in skull-stripping and brain segmentation pipelines to remove small spurious regions. Original author: Florent Segonne.

## Source Information

- **Source language:** C++
- **Source files:** `mri_extract_largest_CC/mri_extract_largest_CC.cpp`, `subroutines.cpp`, `myutils.cpp`, `myutil.h`
- **Key dependencies:** `mri.h`, `connectcomp.h`, `mrisurf.h`

## Purpose and Context

After binary segmentation or skull stripping, the result often contains small disconnected components (noise, dura fragments, etc.) in addition to the main brain region. Retaining only the largest connected component removes these spurious regions. The tool is particularly useful after initial WM segmentation and before surface tessellation.

## Inputs

Positional arguments:
1. Input binary (or labeled) volume
2. Output volume

## Outputs

- Output volume containing only the largest connected component of the target label.

## Mathematical Foundations

Connected component labeling uses 26-connectivity (face + edge + corner neighbours) on the 3D volume. The algorithm:
1. Binarises the input: voxels above `threshold` (default: 90) become 255; others become 0. For hemispheric modes, the threshold applies to LH/RH label values.
2. Finds all connected components using `connectcomp.h` routines.
3. Retains only the component with the maximum number of voxels.
4. Writes the retained component to the output, preserving the original label values of retained voxels (using `mri_orig`).

**Inverse mode** (`-i`): Extracts the largest connected component of the background (voxels below threshold), useful for finding the skull void.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-hemi <h>` | `lh` or `rh` | `lh` | Hemisphere for label-specific mode |
| `-t <val>` | float | `90` | Threshold for binarization |
| `-i` | flag | off | Inverse: extract largest background component |
| `-l <val>` | int | `255` (or hemisphere label) | Target label value to extract (`case 'L':`) |
| `-o <vol>` | path | none | Use this volume to determine original label values for output (`case 'O':` — any flag beginning with `-o` is accepted) |

## Configuration Interactions

- If `-hemi lh` is used (default), the target value is set to `LH_LABEL` from the FreeSurfer connectcomp library. `-hemi rh` sets it to `RH_LABEL`.
- `-l <val>` overrides the hemisphere-based default target value.
- When a custom `-l <val>` is specified that is neither LH_LABEL nor RH_LABEL, the binarization maps matching voxels to 255 and all others to 0, then finds the largest CC of 255 voxels.
- `-o <vol>` allows the output to contain original (possibly non-binary) label values from a reference volume instead of the binarized values.

## Typical Use Cases

```bash
# Extract largest WM component (LH convention, threshold 90)
mri_extract_largest_CC wm.mgz wm_largest_CC.mgz

# Extract largest RH component
mri_extract_largest_CC -hemi rh filled.mgz filled_rh_CC.mgz

# Extract largest component of a custom label (42 = right cortical WM)
mri_extract_largest_CC -l 42 aseg.mgz largest_42.mgz

# Lower threshold for different intensity range
mri_extract_largest_CC -t 50 wm.mgz wm_CC.mgz
```

## Pipeline Context

Not a standard `[[recon-all]]` call, but used internally or in scripts after WM segmentation (`[[mri_segment]]`) or skull stripping (`[[mri_watershed]]`) to clean up the binary mask.

## Gotchas and Caveats

> [!gotcha] Default threshold of 90 is specific to FreeSurfer T1 convention
> The default threshold 90 corresponds to FreeSurfer's normalized intensity scale where WM is ~110. For non-normalized volumes, specify `-t <appropriate_value>`.

> [!gotcha] Memory usage
> The tool allocates a 3D integer array for connected component analysis. For a 256³ volume, this can require up to 1-2 GB depending on the component count.

## Related Tools

- `[[mri_watershed]]` — skull stripping, which can use this tool internally
- `[[mri_binarize]]` — thresholding a volume before passing to this tool
- `[[mri_extract_label]]` — extracts specific label values (not connectivity-based)

## Confidence and Gaps

**High confidence:** main logic, thresholding, and configuration options confirmed from source.
