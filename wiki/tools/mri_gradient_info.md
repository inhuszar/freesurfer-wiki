---
title: "mri_gradient_info"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_robust_register/mri_gradient_info.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_gradunwarp]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not traced — no BEGINUSAGE block in source"
  - "Exact output format not confirmed"
  - "Tool purpose beyond edge detection statistics unclear"
tags:
  - gradient
  - quality-control
  - diagnostics
---

# mri_gradient_info

## Summary

`mri_gradient_info` computes and reports gradient information from an MRI volume, specifically analyzing the spatial gradient image to detect and characterize edges. It is located in the `mri_robust_register/` source directory, suggesting it was written as a diagnostic or supporting utility for the robust registration workflow. The tool scans gradient images along each axis to detect edge transitions and reports statistics such as edge widths and gradient magnitudes.

## Source Information

- **Source language:** C++
- **Source file:** `mri_robust_register/mri_gradient_info.cpp`
- **Original author:** Martin Reuter

## Purpose and Context

`mri_gradient_info` appears to be a diagnostic utility for inspecting the quality of gradient images. It scans the gradient (first-order derivative) of an MRI volume to identify edge transitions — locations where intensity changes rapidly across voxels — and reports statistics about those transitions. This information is useful for:

- Assessing image sharpness or blur prior to registration
- Diagnosing gradient-related issues in scanner acquisitions
- Supporting the robust registration pipeline (`mri_robust_register`)

The tool performs edge detection by scanning rows/columns in gradient images and identifying local maxima that exceed a threshold, computing left/right boundaries of edges and their widths.

> [!gap] Full purpose unclear
> The complete intended use case for `mri_gradient_info` as a standalone tool is not documented in the source. It may primarily be a developer diagnostic tool rather than a user-facing utility.

## Inputs

| Input | Description |
|-------|-------------|
| Gradient image (MRI) | 3D volume containing pre-computed gradient values |
| Mask volume (optional) | Binary mask; only masked voxels are analyzed |

> [!gap] Exact CLI not confirmed
> The command-line argument parsing for `mri_gradient_info` was not fully extracted. The above is inferred from function signatures in the source code.

## Outputs

- Statistics printed to stdout, including edge widths and gradient magnitudes summed over edges

## Mathematical Foundations

The edge detection algorithm scans each row along one dimension of the gradient image. For each position, it identifies transitions where the gradient:

1. Rises (left boundary) then falls (right boundary) — the span defines an edge
2. The maximum gradient value within the edge span is recorded
3. A threshold (`thres = 5.0` by default) gates which transitions count as edges

The edge width is defined as the distance between the left and right boundaries, weighted by gradient magnitude:

$$\bar{w}_\text{edge} = \frac{\sum_\text{edges} w_i \cdot g_i}{\sum_\text{edges} g_i}$$

where $w_i$ is the width and $g_i$ is the maximum gradient at edge $i$.

## Configuration Options

> [!gap] Flag list not verified
> No `BEGINUSAGE` block was found in the source. Flags inferred from function calls only.

| Flag | Description |
|------|-------------|
| (positional) | Gradient volume filename |
| (positional, optional) | Mask volume filename |

## Configuration Interactions

No multi-flag interactions identified from available source.

## Typical Use Cases

**Inspect gradient image edges (inferred):**
```bash
mri_gradient_info gradient.mgz mask.mgz
```

## Pipeline Context

This tool is not called by `recon-all`. It resides in the `mri_robust_register/` source directory alongside `mri_robust_register` tools, suggesting use as a preprocessing diagnostic within the robust registration workflow.

## Gotchas and Caveats

> [!gap] Developer tool
> Based on source location and lack of help documentation, this appears to be a developer-facing diagnostic tool rather than a general user tool. It may not be useful outside of debugging gradient image issues.

## Related Tools

- [[mri_gradunwarp]] — corrects gradient non-linearity distortions

## Confidence and Gaps

**Confident (from source):** Edge detection logic operates on gradient images; analyzes all three spatial dimensions; computes weighted mean edge width statistics.

**Uncertain:** Full command-line syntax; output format; whether tool is installed in standard FreeSurfer distribution.

> [!gap] Help output not retrievable
> The `--help` output for `mri_gradient_info` could not be run in this environment. Full flag documentation needs verification from a live FreeSurfer installation.
