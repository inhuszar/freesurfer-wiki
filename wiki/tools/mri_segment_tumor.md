---
title: "mri_segment_tumor"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_segment_tumor/mri_segment_tumor.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment_wm_damage]]"
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/ — full implementation and current status unknown."
  - "Algorithm details not accessible from source header alone."
tags:
  - segmentation
  - tumor
  - lesion
  - attic
---

# mri_segment_tumor

## Summary

`mri_segment_tumor` is a legacy C++ tool for segmenting brain tumors from MRI volumes. It resides in the `attic/` subdirectory of the FreeSurfer source tree, indicating it is no longer part of the standard build or supported pipeline.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_segment_tumor/mri_segment_tumor.cpp`
- **Status:** Attic (legacy, not actively maintained)

## Purpose and Context

Tumor segmentation in MRI is a specialised task typically requiring multi-contrast data (T1, T1-CE, T2, FLAIR). This tool was an early attempt at automated tumor delineation within the FreeSurfer ecosystem.

> [!gotcha] Attic status
> This tool is in `attic/` and is not built or installed in the standard FreeSurfer distribution. For clinical or research tumor segmentation, consider dedicated tools such as HD-Glio or BraTS challenge methods.

## Inputs

> [!gap] Inputs not fully documented
> The source file exists in `attic/` and was not fully read. Input specifications are unknown. Likely requires a T1-weighted volume and possibly contrast-enhanced T1.

## Outputs

> [!gap] Outputs not fully documented
> Output format and content are unknown from available source information.

## Mathematical Foundations

> [!gap] Algorithm unknown
> The tumor segmentation algorithm implemented in this tool is not documented in the available source header.

## Configuration Options

> [!gap] Flags unknown
> Configuration flags were not extracted from the attic source.

## Configuration Interactions

Unknown.

## Typical Use Cases

```bash
# Usage is unknown; tool may not be installed
mri_segment_tumor --help
```

## Pipeline Context

Not called by `recon-all`. Not part of the standard FreeSurfer workflow.

## Gotchas and Caveats

> [!gotcha] Not for clinical use
> This is a legacy research tool. It should not be used for clinical tumor diagnosis or treatment planning.

> [!gotcha] Likely not installed
> Since the source resides in `attic/`, the binary is likely absent from `/usr/local/freesurfer/8.2.0/bin/`.

## Related Tools

- [[mri_segment_wm_damage]] — WM lesion segmentation (also in attic)
- [[mri_binarize]] — threshold-based binary segmentation
- [[mri_segstats]] — statistics from segmentation volumes

## Confidence and Gaps

**Confident:** Source location (`attic/`), language (C++), legacy status.

**Uncertain:** Everything else.

> [!gap] Full documentation not available
> This tool lives in `attic/` and has minimal header documentation. A full source read would be required for detailed documentation.
