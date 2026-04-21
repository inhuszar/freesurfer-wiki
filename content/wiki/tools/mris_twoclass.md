---
title: "mris_twoclass"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_twoclass/mris_twoclass.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_twoclass]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is in the attic/ directory, indicating it may be deprecated or unmaintained."
  - "Source file was not read — functionality is inferred from name and analogy with mri_twoclass."
tags:
  - surface
  - group-comparison
  - statistics
  - attic
---

# mris_twoclass

## Summary

`mris_twoclass` performs a two-class statistical comparison of surface morphometric measures (e.g., cortical thickness, curvature) between two groups of subjects, analogous to [[mri_twoclass]] for volumetric data. It is located in the `attic/` directory of the FreeSurfer source, indicating it may be deprecated, unmaintained, or superseded by other tools. The tool likely produces per-vertex statistical maps (t-statistics or similar) comparing two subject groups on a surface.

## Source Information

- **Language:** C++
- **Source file(s):** `attic/mris_twoclass/mris_twoclass.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_twoclass` (if present)
- **Note:** Source is in `attic/` — may not be compiled or distributed in FreeSurfer 8.2.0.

## Purpose and Context

Surface-based group analysis comparing two classes (e.g., patients vs. controls) on per-vertex morphometric measures. The surface-based analogue of [[mri_twoclass]].

> [!gotcha] Attic status
> The source file is in `attic/mris_twoclass/`, the FreeSurfer repository location for deprecated and experimental code that is not part of the active build. This tool may not be compiled or installed in FreeSurfer 8.2.0. Users seeking surface-based group comparison should consider `mri_glmfit` with surface data or [[mris_anatomical_stats]].

## Inputs

> [!gap] Source not read
> The source file `attic/mris_twoclass/mris_twoclass.cpp` was not read. Inputs, outputs, and flags are unknown.

## Outputs

> [!gap] Source not read
> Output format and content unknown.

## Mathematical Foundations

Expected to compute per-vertex t-statistics or similar group comparison statistics by analogy with [[mri_twoclass]].

## Configuration Options

> [!gap] Flags unknown
> Source not read.

## Pipeline Context

Not part of `recon-all`. Standalone group-analysis utility.

## Gotchas and Caveats

> [!gotcha] May not be installed
> As an attic tool, `mris_twoclass` may not be present in the installed FreeSurfer 8.2.0 `bin/` directory.

## Related Tools

- [[mri_twoclass]] — volumetric analogue
- [[mris_anatomical_stats]] — surface morphometric statistics per subject
- `mri_glmfit` — general linear model on surface or volume data (preferred modern alternative)

## Confidence and Gaps

Confidence is **low**. Source was not read; the tool's attic status raises questions about its current functionality.

> [!gap] Verify installation
> Check whether `mris_twoclass` is present in `/usr/local/freesurfer/8.2.0/bin/`. If not, this page should note that it is not available.

> [!gap] Source code review
> Read `attic/mris_twoclass/mris_twoclass.cpp` to document actual functionality if the tool is of interest.
