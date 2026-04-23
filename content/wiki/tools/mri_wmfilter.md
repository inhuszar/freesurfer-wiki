---
title: "mri_wmfilter"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_wmfilter/mri_wmfilter.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_normalize]]"
  - "[[mri_binarize]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-22
gaps:
  - "Source is in attic/ — may be deprecated."
  - "Full flag set and algorithm were not read from source."
tags:
  - white-matter
  - filtering
  - segmentation
  - attic
---

# mri_wmfilter

## Summary

`mri_wmfilter` applies intensity-based filtering to white matter voxels in a brain volume, likely to clean up or refine white matter segmentation by removing outlier intensities. The source file is located in the `attic/` subdirectory, indicating it may be a legacy or deprecated tool.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_wmfilter/mri_wmfilter.cpp`
- **Note:** Located in `attic/` — legacy/deprecated status. Not actively maintained.

## Purpose and Context

After initial white matter segmentation, it may be necessary to remove voxels with atypical intensities that are likely not white matter (e.g., partial-volume effects at boundaries, vessels, calcifications). `mri_wmfilter` appears to provide such post-processing, though the exact algorithm is not documented here.

## Inputs

> [!gap] Inputs not documented
> The source was not fully read. Run `mri_wmfilter --help` for current options.

## Outputs

> [!gap] Outputs not documented
> The source was not fully read. Run `mri_wmfilter --help` for current options.

## Mathematical Foundations

> [!gap] Algorithm not documented
> The filtering algorithm was not traced from source.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-central` | — | off | Only consider variance in the central plane (the plane passing through the origin) when computing orientation statistics. Suppresses the planar Laplacian term. |
| `-grayscale` | — | off | Use grayscale (raw intensity) image data instead of the binary-thresholded segmented image when computing the plane-of-least-variance. |
| `-slope` | `<pct>` | `0` | Modify the voting fraction by `<pct>%` per intensity unit above/below the midpoint between `white_lolim` and `white_hilim`. Argument is a percentage (e.g., `2` → 0.02/unit). |
| `-lslope` | `<pct>` | `0` | Modify the voting fraction by `<pct>%` multiplied by the binary planar Laplacian. Positive Laplacian (central plane darker than surroundings) biases toward non-white; negative biases toward white. |
| `-wlo` | `<val>` | `95` | White matter lower intensity limit. Voxels below this value are set to zero in the initial thresholding step. |
| `-whi` | `<val>` | `125` | White matter upper intensity limit. Voxels above this value are set to zero. |
| `-ghi` | `<val>` | `100` | Gray matter upper intensity limit. Voxels above `ghi` but below `whi` are treated as unambiguously white. |
| `-o` | `<name>` | `wm` | Output volume name relative to `$SUBJECTS_DIR/<subject>/mri/`. Default output is `$SUBJECTS_DIR/<subject>/mri/wm`. |

## Configuration Interactions

- `-wlo`, `-whi`, and `-ghi` define the three intensity boundaries used in classification. The midpoint `(white_lolim + gray_hilim) / 2` is `probably_white`.
- `-slope` and `-lslope` additively modify the voting fraction `cfrac` (default 0.6) during reclassification: `cfrac += (intensity - probably_white) * slope - laplacian * lslope`.
- `-central` disables the Laplacian computation; `-lslope` has no effect when `-central` is active.
- `-grayscale` switches the plane-of-least-variance computation to use the grayscale image (current grey values) instead of the binarised input; affects the plane orientation chosen but not the voting step.
- `-o` changes the output file path; the input is always read from `$SUBJECTS_DIR/<subject>/mri/brain`.

## Typical Use Cases

```bash
mri_wmfilter --help
```

## Pipeline Context

This tool is not part of the standard `recon-all` pipeline. It would be used after white matter segmentation ([[mri_segment]]) to refine the result.

## Gotchas and Caveats

> [!gotcha] Deprecated tool
> The source is in `attic/mri_wmfilter/`. Tools in `attic/` are not actively maintained. For white matter processing, consider [[mri_segment]] and [[mri_normalize]] instead.

## Related Tools

- [[mri_segment]] — primary white matter segmentation
- [[mri_normalize]] — intensity normalisation using white matter
- [[mri_binarize]] — threshold-based masking

## Confidence and Gaps

**Low confidence:** This entire page is based on the tool name, attic location, and general WM filtering knowledge. The source was not read.

> [!gap] Source not read
> `attic/mri_wmfilter/mri_wmfilter.cpp` was not fully read for this page. All sections require source review.
