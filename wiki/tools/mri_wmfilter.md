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
last_agent_update: 2026-04-15
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

> [!gap] Flags not documented
> See `mri_wmfilter --help` for current options.

## Configuration Interactions

> [!gap] Interactions not documented

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
