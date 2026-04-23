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

From `main()`: `argv[1]` = surface, `argv[2]` = transform, `argv[3]` = hires volume, `argv[4]` = output path.

| Positional | Description |
|------------|-------------|
| `argv[1]` | Reference surface (closed mesh; interior is filled at hires resolution) |
| `argv[2]` | Transform file (LTA or similar) from surface space to hires volume space |
| `argv[3]` | High-resolution T1 volume |
| `argv[4]` | Output updated white matter segmentation volume |

## Outputs

- Updated white matter segmentation volume.

## Mathematical Foundations

The update uses three criteria (based on global thresholds):
- `-mthresh` (default 3): gradient magnitude threshold — voxels near boundaries with gradient magnitude below this value are candidates for boundary refinement.
- `-ithresh` (default 4): intensity difference threshold from expected WM intensity.
- `-dthresh` (default 0.5 mm): maximum distance from the current boundary for a voxel to be updated.

`MRIupdateSegmentation()` applies these criteria to move the WM boundary to the high-resolution position.

Morphological closing (hardcoded `nclose = 1`) is applied to ensure connectivity. `nclose` is a compile-time constant; there is no command-line flag to change it.

## Configuration Options

The parser strips one leading dash (`option = argv[1] + 1`) and dispatches via case-insensitive string comparisons.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-mthresh <t>` | float | 3.0 | Gradient magnitude threshold; voxels with gradient magnitude above this value are skipped during boundary refinement |
| `-ithresh <t>` | float | 4.0 | Intensity difference threshold; candidate voxels must differ from the WM mean by less than this value |
| `-dthresh <t>` | float | 0.5 | Distance threshold (mm); only voxels within this distance of the current WM boundary are considered |
| `-debug_voxel <x> <y> <z>` | 3 integers | — | Enable diagnostic output for the voxel at coordinates `(x, y, z)` |
| `-mask <vol> <thresh>` | path + float | — | Load `vol` as a binary mask (thresholded at `thresh`); processing is restricted to masked voxels |

## Typical Use Cases

```bash
# Refine WM boundary using high-resolution T1 data
mri_multiscale_segment lh.white xform.lta hires_T1.mgz wm_refined.mgz
```

**Override thresholds:**
```bash
mri_multiscale_segment -mthresh 5 -ithresh 6 -dthresh 0.8 \
  lh.white xform.lta hires_T1.mgz wm_refined.mgz
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
