---
title: "mri_extract_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_extract_label/mri_extract_label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_extract_largest_CC]]"
  - "[[mri_label2vol]]"
  - "[[mri_ca_label]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - label
  - extraction
  - segmentation
---

# mri_extract_label

## Summary

`mri_extract_label` creates a binary or label-value output volume containing only the voxels that match one or more specified integer label values from an input segmentation volume. It supports optional Gaussian smoothing, morphological dilation/erosion, and can use a transform to place the output in a different coordinate space. The tool accepts multiple label values on the command line.

## Source Information

- **Source language:** C++
- **Source file:** `mri_extract_label/mri_extract_label.cpp`
- **Key dependencies:** `mri.h`, `cma.h`, `gca.h`, `transform.h`

## Purpose and Context

When working with segmentation volumes (aseg, aparc+aseg, etc.), it is often necessary to isolate one or more specific anatomical structures into a separate binary volume. `mri_extract_label` provides this functionality with optional morphological post-processing. The CMA label name lookup (`cma_label_to_name()`) provides human-readable labels in verbose output.

## Inputs

Positional arguments:
1. Input segmentation volume
2. One or more integer label values (e.g., `17` for left hippocampus, `53` for right hippocampus)
3. Output volume (last positional argument)

## Outputs

- Output volume of the same dimensions as input, with non-matching voxels set to 0 and matching voxels set to their original label value (or a Gaussian-smoothed float if `-sigma` is used).

## Mathematical Foundations

1. **Label extraction:** For each label value on the command line, calls `extract_labeled_image()` which sets matching voxels to the label value and all others to 0.

2. **Gaussian smoothing** (optional): If `-s <s>` is specified, a 3D Gaussian kernel of standard deviation `s` is convolved with the binary mask:
$$
\text{out}(x) = \mathcal{G}_\sigma * \text{mask}(x)
$$

3. **Dilation/erosion** (optional): Morphological dilation (`-dilate <n>`) or erosion (`-erode <n>`) is applied to the binary mask.

4. **Transform** (optional): If `-T <lta>` is specified, the extracted label is mapped to a different space via the LTA transform.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-T <file>` | path | none | LTA transform to apply to the output |
| `-out_like <vol>` / `-ol` | path | none | Output volume has geometry of this template |
| `-s <s>` | float | 0 | Smooth the output with Gaussian of std dev `s` mm (`case 'S':`) |
| `-dilate <n>` | int | 0 | Dilate the binary mask `n` times |
| `-erode <n>` | int | 0 | Erode the binary mask `n` times |
| `-exit_none_found` | flag | off | Exit with error code if no voxels of specified label found |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Set global debug voxel `(Gx,Gy,Gz)` for verbose per-voxel output |

## Configuration Interactions

- `-s` converts the output to floating-point; use carefully if downstream tools expect integer labels.
- `-T` and `-out_like` can be combined to remap labels to a different space.
- `-dilate` and `-erode` are sequential operations; dilation followed by erosion is a morphological closing.
- Multiple label values are extracted cumulatively into the same output volume.

## Typical Use Cases

```bash
# Extract left hippocampus (label 17)
mri_extract_label aseg.mgz 17 lh_hippo.mgz

# Extract both hippocampi (labels 17 and 53)
mri_extract_label aseg.mgz 17 53 both_hippo.mgz

# Extract and dilate by 3 voxels
mri_extract_label aseg.mgz 17 lh_hippo_dilated.mgz -dilate 3

# Extract with Gaussian smoothing
mri_extract_label aseg.mgz 17 lh_hippo_smooth.mgz -s 1.5

# Exit with error if label not found
mri_extract_label aseg.mgz 999 dummy.mgz -exit_none_found
```

## Pipeline Context

Not called by `[[recon-all]]` directly. Used in post-processing scripts to isolate specific structures for ROI analysis, mask generation, or further processing.

## Gotchas and Caveats

> [!gotcha] Multiple labels create a combined mask
> When multiple labels are specified, the output contains all of them in a single volume. Voxels from different labels retain their original integer values, not a unified binary mask.

> [!gotcha] `-s` produces float output
> Gaussian smoothing converts the output type to float, which may cause issues with tools expecting integer segmentation values.

> [!gotcha] nvoxels is tracked globally
> The global variable `nvoxels` tracks the number of extracted voxels. When `-exit_none_found` is set and no matching voxels are found, the tool exits with a non-zero code.

## Related Tools

- `[[mri_binarize]]` — thresholds a volume to produce a binary mask
- `[[mri_extract_largest_CC]]` — extracts the largest connected component
- `[[mri_label2vol]]` — maps surface labels to volume space

## Confidence and Gaps

**High confidence:** all arguments and main logic confirmed from source.
