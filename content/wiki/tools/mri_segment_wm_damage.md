---
title: "mri_segment_wm_damage"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_segment_wm_damage/mri_segment_wm_damage.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment_tumor]]"
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/ — full implementation unknown."
  - "Whether this was ever included in a standard build is unclear."
tags:
  - segmentation
  - white-matter
  - lesion
  - WMH
  - attic
---

# mri_segment_wm_damage

## Summary

`mri_segment_wm_damage` is a legacy C++ tool for segmenting white matter damage or lesions (e.g., white matter hyperintensities, WMH) from MRI volumes. It resides in the `attic/` subdirectory of the FreeSurfer source tree and is not part of the current standard build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_segment_wm_damage/mri_segment_wm_damage.cpp`
- **Status:** Attic (legacy, not actively maintained)

## Purpose and Context

White matter lesions (hyperintensities on FLAIR, hypointensities on T1) are markers of cerebrovascular disease, multiple sclerosis, and other conditions. This tool provided an early FreeSurfer-integrated method for their automated delineation. For current practice, dedicated WMH segmentation tools (e.g., `SynthSeg`, LST, BIANCA) are preferred.

> [!gotcha] Attic status
> This tool is in `attic/` and is not built or installed in the standard FreeSurfer distribution.

## Inputs

> [!gap] Inputs not fully documented
> The source file was not fully read. Input specifications are unknown, but likely require T1 and/or FLAIR volumes.

## Outputs

> [!gap] Outputs not fully documented
> Output format unknown. Likely a binary or labelled volume indicating WM damage regions.

## Mathematical Foundations

> [!gap] Algorithm unknown
> The WM damage segmentation algorithm is not documented from available source information.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Set global debug voxel `(Gx,Gy,Gz)` for verbose per-voxel diagnostic output (attic tool, single-dash-strip parser) |

## Configuration Interactions

Unknown.

## Typical Use Cases

```bash
# Usage likely not available in standard installation
mri_segment_wm_damage --help
```

## Pipeline Context

Not called by `recon-all`. Not part of the standard FreeSurfer workflow.

## Gotchas and Caveats

> [!gotcha] Likely not installed
> The binary is likely absent from `/usr/local/freesurfer/8.2.0/bin/` given the attic source location.

> [!gotcha] FLAIR typically required
> WMH segmentation generally requires FLAIR contrast. Whether this tool accepts only T1 or also FLAIR is unknown.

## Related Tools

- [[mri_segment_tumor]] — tumor segmentation (also in attic)
- [[mri_binarize]] — threshold-based binary segmentation
- [[mri_segstats]] — statistics from segmentation volumes

## Confidence and Gaps

**Confident:** Source location (`attic/`), language (C++), legacy status.

**Uncertain:** Everything else.

> [!gap] Full documentation not available
> This tool lives in `attic/`. A full source read is required for detailed documentation.
