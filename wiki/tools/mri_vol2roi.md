---
title: "mri_vol2roi"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_vol2roi/mri_vol2roi.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2label]]"
  - "[[mri_label2vol]]"
  - "[[mri_binarize]]"
  - "[[mri_vol2surf]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is in the attic/ directory, suggesting this tool may be deprecated or unmaintained."
  - "Full flag set was not read from source."
  - "Relationship to current pipeline and preferred alternatives is unclear."
tags:
  - roi
  - sampling
  - volume
  - attic
---

# mri_vol2roi

## Summary

`mri_vol2roi` samples a volume to compute statistics within one or more regions of interest (ROIs). The tool takes an input volume and an ROI definition and extracts summary statistics (mean, max, etc.) for each ROI. It is an older utility that resides in the `attic/` subdirectory of the FreeSurfer source, suggesting it may be deprecated or superseded by other tools.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_vol2roi/mri_vol2roi.cpp`
- **Note:** Located in `attic/`, which contains legacy/deprecated FreeSurfer tools that are no longer actively developed. The binary may still be distributed and functional, but is not actively maintained.

## Purpose and Context

Region-of-interest (ROI) analyses extract summary statistics from a statistical map or functional volume restricted to anatomically defined regions. `mri_vol2roi` is an older implementation of this workflow. For current use, tools such as `mri_segstats` or `mri_label2vol` combined with `mri_vol2surf` are preferred.

## Inputs

| Input | Description |
|-------|-------------|
| Input volume | A statistical or functional MRI volume |
| ROI mask/label | Definition of the ROI in compatible format |

> [!gap] Flag documentation
> The full command-line interface was not extracted from source for this page. The source file exists at `attic/mri_vol2roi/mri_vol2roi.cpp` but was not fully read.

## Outputs

Summary statistics for each ROI printed to stdout or written to a file, depending on flags.

## Mathematical Foundations

> [!gap] Algorithm not documented
> The specific sampling and aggregation method was not traced from source.

## Configuration Options

> [!gap] Flags not documented
> The flag table for this tool was not derived from source. Run `mri_vol2roi --help` for current options.

## Configuration Interactions

> [!gap] Interactions not documented

## Typical Use Cases

```bash
# Generic ROI sampling — flags to be confirmed with --help
mri_vol2roi --help
```

## Pipeline Context

This tool is not part of the standard `recon-all` pipeline. It is a post-processing utility for ROI analyses.

> [!gotcha] Deprecated tool
> The source file is located in `attic/mri_vol2roi/`, which is the FreeSurfer subdirectory for legacy tools. Users should consider whether `mri_segstats` or a combination of `mri_label2vol` + `mri_vol2surf` better meets their current needs.

## Gotchas and Caveats

> [!gotcha] Attic location
> Tools in the `attic/` directory are not actively maintained. Behaviour may differ from documentation, and bugs may not be fixed.

## Related Tools

- [[mri_vol2label]] — converts volume values to label files
- [[mri_label2vol]] — converts label files back to volumes
- [[mri_binarize]] — creates binary ROI masks
- [[mri_vol2surf]] — samples volume onto surface for surface-based ROI analyses

## Confidence and Gaps

**Low confidence:** This entire page is based on the tool's name, its location in `attic/`, and general knowledge of ROI sampling workflows. The source was not fully read.

> [!gap] Source not read
> The source file `attic/mri_vol2roi/mri_vol2roi.cpp` was not fully read for this page. All sections marked with `[!gap]` require a dedicated reading of the source to fill in.
