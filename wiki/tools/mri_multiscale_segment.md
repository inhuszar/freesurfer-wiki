---
title: "mri_multiscale_segment"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_multiscale_segment/mri_multiscale_segment.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "Multiscale update algorithm not fully traced"
tags:
  - segmentation
  - white-matter
  - high-resolution
  - attic
---

# mri_multiscale_segment

## Summary

`mri_multiscale_segment` updates a conformed segmentation (white matter mask) using high-resolution image data. It refines a coarser segmentation by applying gradient and intensity criteria at the high-resolution scale, correcting boundaries that were ambiguous at the conformed resolution.

> [!gotcha] Attic tool
> Source is in `attic/`. May not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_multiscale_segment/mri_multiscale_segment.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Standard FreeSurfer processing uses conformed (1mm isotropic) volumes for segmentation. When higher-resolution T1 data is available, the surface boundary can be refined using the full-resolution data. `mri_multiscale_segment` provides this refinement step, updating the white matter segmentation by incorporating high-resolution intensity gradients near the current WM boundary.

## Inputs

| Argument | Description |
|----------|-------------|
| `<hires_vol>` | High-resolution T1 volume |
| `<wm_seg>` | White matter segmentation at conformed resolution |
| `<surface>` | Reference surface |
| `<transform>` | Transform between conformed and high-resolution spaces |
| `<output>` | Output updated segmentation |

The exact argument order was not confirmed.

## Outputs

- Updated white matter segmentation volume.

## Mathematical Foundations

The update uses three criteria (based on global thresholds):
- `mag_thresh` (default 3): gradient magnitude threshold — voxels near boundaries with high gradient are candidates for boundary refinement.
- `intensity_thresh` (default 4): intensity difference threshold from expected WM intensity.
- `dist_thresh` (default 0.5 mm): maximum distance from current boundary for a voxel to be updated.

`MRIupdateSegmentation()` applies these criteria to move the WM boundary to the high-resolution position.

Morphological closing (`nclose`, default 1) is applied to ensure connectivity.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mag_thresh <t>` | float | 3.0 | Gradient magnitude threshold |
| `-intensity_thresh <t>` | float | 4.0 | Intensity difference threshold |
| `-dist_thresh <t>` | float | 0.5 | Distance threshold (mm) |
| `-nclose <n>` | int | 1 | Number of morphological close operations |
| `-mask <vol>` | volume | — | External mask |

> [!gap] Complete option list and positional args
> The `get_option()` function and main argument parsing were not fully read.

## Typical Use Cases

```bash
# Refine WM segmentation using high-resolution data
mri_multiscale_segment hires_T1.mgz wm.mgz lh.white xform.lta wm_refined.mgz
```

## Pipeline Context

Not part of standard `recon-all`. Relevant to high-resolution processing protocols (e.g., sub-millimetre T1 data).

## Gotchas and Caveats

- Tool is in `attic/`; may not be available.
- The threshold values must be tuned for the specific acquisition; defaults are based on standard 1mm T1 protocols.

## Related Tools

- [[mri_segment]] — standard WM segmentation
- [[mri_convert]] — format conversion

## Confidence and Gaps

**Low confidence:** tool is in attic; algorithm partially inferred from global variable names.
