---
title: "mri_label_accuracy"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_label_accuracy/mri_label_accuracy.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_hausdorff_dist]]"
  - "[[mri_binarize]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be distributed"
  - "Multiple algorithm options not confirmed"
  - "Output format not specified"
tags:
  - evaluation
  - segmentation
  - accuracy
  - boundary
  - attic
---

# mri_label_accuracy

## Summary

`mri_label_accuracy` computes the accuracy of a segmentation label volume compared to a reference (ground truth) volume. The default algorithm computes the mean of the symmetric minimum boundary distances between the two label boundaries. Multiple segmentation accuracy metrics may be available via options. The tool is in `attic/`, indicating legacy status.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_label_accuracy/mri_label_accuracy.cpp`
- **Original author:** Bruce Fischl

> [!gotcha] Attic location
> This tool is in `attic/` and may not be compiled or installed in FreeSurfer 8.2.0.

## Purpose and Context

Quantitative evaluation of segmentation accuracy requires comparing an automated segmentation against a manual reference ("ground truth"). `mri_label_accuracy` computes boundary-based accuracy metrics, which are generally more sensitive to segmentation quality than simple overlap metrics (e.g., Dice coefficient) because they measure geometric boundary agreement rather than volumetric overlap.

The default metric is the mean symmetric boundary distance (a variant of the Hausdorff distance), which measures how far the boundaries of two segmentations deviate from each other on average.

## Inputs

| Input | Positional | Description |
|-------|-----------|-------------|
| Source/test segmentation | argv[1] | Automated segmentation to evaluate |
| Reference/ground truth | argv[2] | Manual or reference segmentation |

Both volumes are treated as binary (non-zero = foreground), or a specific label can be targeted with `-target`.

## Outputs

- Accuracy metric value printed to stdout (and optionally a log file)

## Mathematical Foundations

**Default: mean symmetric boundary distance**

Let $\partial A$ and $\partial B$ be the boundary voxel sets of the source and reference segmentations. The symmetric mean boundary distance is:

$$d_\text{sym}(A, B) = \frac{1}{2}\left[\frac{1}{|\partial A|}\sum_{a \in \partial A} \min_{b \in \partial B} \|a - b\| + \frac{1}{|\partial B|}\sum_{b \in \partial B} \min_{a \in \partial A} \|a - b\|\right]$$

The implementation pads the volumes by `PAD = 20` voxels to ensure all boundary computations are valid. Morphological operations (erode, dilate, close, open) may be applied to preprocess the binary masks.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-target` | `<label>` | Target label value (default: any non-zero) |
| (morphological flags) | — | Various erosion/dilation operations (inferred from header) |

> [!gap] Flag list not fully traced
> The `ERODE`, `DILATE`, `CLOSE`, `OPEN`, `DILATE_LABEL`, `MODE_FILTER` constants suggest configurable morphological preprocessing. Exact flags require help output verification.

## Typical Use Cases

**Evaluate segmentation against ground truth:**
```bash
mri_label_accuracy auto_seg.mgz manual_gt.mgz
```

## Pipeline Context

Not part of `recon-all`. Standalone evaluation tool.

## Related Tools

- [[mri_hausdorff_dist]] — similar boundary distance computation (not in attic)
- [[mri_binarize]] — creates binary masks for evaluation

## Confidence and Gaps

**Confident (from source):** Mean symmetric boundary distance as default metric, PAD=20 padding, morphological preprocessing options.

**Uncertain:** Complete flag set; output format; whether multiple algorithms can be selected via CLI; availability in v8.2.0.
