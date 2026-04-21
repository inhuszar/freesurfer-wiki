---
title: "mri_transform_to_COR"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_transform_to_COR/mri_transform_to_COR.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_transform]]"
  - "[[coordinate-systems]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source in attic/ — may not be compiled or distributed in FreeSurfer 8.2.0."
  - "Source not read — all details inferred."
tags:
  - mri
  - COR
  - format
  - transform
  - attic
  - legacy
---

# mri_transform_to_COR

## Summary

`mri_transform_to_COR` converts a spatial transform to COR (coronal) format — the legacy FreeSurfer binary volume format that predated MGZ. It is located in the `attic/` directory and is almost certainly not compiled or distributed in FreeSurfer 8.2.0. This is a legacy tool for converting transforms to the old COR volume format.

## Source Information

- **Language:** C++
- **Source file(s):** `attic/mri_transform_to_COR/mri_transform_to_COR.cpp`
- **Binary/script location:** Likely not present in FreeSurfer 8.2.0 `bin/`
- **Note:** Both the `attic/` source and a test utility at `utils/test/mri_transform_to_COR.c` exist.

## Purpose and Context

COR format was the original FreeSurfer volume format: a directory of 256 coronal slices, each stored as a raw 256×256 byte file. This format is obsolete — modern FreeSurfer uses MGZ. `mri_transform_to_COR` likely converted a volume with an embedded transform into COR format, applying the transform in the process.

> [!gotcha] COR format is obsolete
> The COR format has been superseded by MGZ since FreeSurfer 3.x. Any workflow requiring this tool should be updated to use MGZ-based tools ([[mri_convert]], [[mri_transform]]).

## Inputs

> [!gap] Source not read
> Unknown. Likely a volume with an associated transform file.

## Outputs

> [!gap] Source not read  
> Likely a COR-format volume directory.

## Mathematical Foundations

Transform application and volume resampling to COR format coordinates.

## Configuration Options

> [!gap] Unknown

## Pipeline Context

Not part of `recon-all`.

## Gotchas and Caveats

> [!gotcha] Almost certainly not available
> Check whether this binary exists in the installed FreeSurfer 8.2.0.

> [!gotcha] COR format is obsolete
> Do not use COR format for new workflows. Use MGZ.

## Related Tools

- [[mri_convert]] — handles conversion between modern formats including legacy COR
- [[mri_transform]] — applies transforms to volumes in modern formats

## Confidence and Gaps

Confidence is **low**. Source not read; attic status and COR format obsolescence make this tool of historical interest only.

> [!gap] Verify installation and relevance
> Confirm whether this binary exists. If not, this page should be tagged as historical/legacy only.
