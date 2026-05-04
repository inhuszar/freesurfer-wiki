---
title: "wm.seg.mgz"
type: file
fs_version: "8.2.0"
filename: "wm.seg.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_segment]]"
  - "[[mri_mask]]"
produced_in_stage: "autorecon2: WM Segmentation"
produced_at_source:
  - "[`mri_segment/mri_segment.cpp:442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_segment/mri_segment.cpp#L442)"
  - "[`scripts/recon-all:3328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3328)"
inputs:
  - "[[brain.mgz]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mri_edit_wm_with_aseg]]"
downstream_files:
  - "[[wm.asegedit.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: WM Editing"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[wm.mgz]]"
  - "[[wm.asegedit.mgz]]"
  - "[[brain.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# wm.seg.mgz

> [!file] Glossary entry
> `wm.seg.mgz` is the initial white matter segmentation produced by [[mri_segment]] (intensity thresholding) from [[brain.mgz]], before aseg-based topology corrections. It is an intermediate file that feeds into [[mri_edit_wm_with_aseg]] to produce [[wm.asegedit.mgz]]. Users do not typically edit `wm.seg.mgz` directly — editing is done on [[wm.mgz]] (the pretessed version).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/wm.seg.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. WM voxels = 255, non-WM = 0.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A binary WM mask from intensity-based thresholding. [[mri_segment]] applies windowed intensity analysis to [[brain.mgz]] to classify voxels as white matter (output = 255) or not (output = 0), based on the assumption that WM has the highest T1 intensity within a local neighbourhood window. The mask is `UCHAR` with values 0 or 255.

## How It Is Created

### Producing tool

[[mri_segment]] — reads [[brain.mgz]] (or `antsdn.brain.mgz` when ANTs denoising is enabled), applies intensity-based segmentation within a search window of `MriSegWsizemm` mm (default 13 mm), and writes `wm.seg.mgz`.

```bash
# Default invocation (recon-all line 3322–3328)
mri_segment -wsizemm 13 brain.mgz wm.seg.mgz

# With edit preservation (when wm.mgz exists with prior edits)
mri_segment -wsizemm 13 -keep brain.mgz wm.seg.mgz
```

**Alternate path (WMSegFromASeg = 1):** `wm.seg.mgz` is produced from [[aseg.presurf.mgz]] WM labels via `mri_binarize` + `mri_mask` instead of `mri_segment` (recon-all line 3335–3348).

### Source reference

- **Write call:** [`mri_segment/mri_segment.cpp:442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_segment/mri_segment.cpp#L442) — `MRIwrite(mri_dst, output_file_name)`
- **Pipeline invocation:** [`scripts/recon-all:3328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3328)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **WM Segmentation** stage (`-wmseg`).

### Inputs required

- [[brain.mgz]] — intensity-normalised brain volume (or `antsdn.brain.mgz`).
- [[aseg.presurf.mgz]] *(alternate path only)* — used to derive WM mask when `-segfromwmaseg` is enabled.

### Siblings (co-produced outputs)

None.

## How It Is Used

### Direct downstream consumers

- [[mri_edit_wm_with_aseg]] — reads `wm.seg.mgz`, applies subcortical segmentation-based corrections using [[aseg.presurf.mgz]] to produce [[wm.asegedit.mgz]].

### Downstream files derived from this one

- [[wm.asegedit.mgz]] — aseg-corrected WM mask.
- [[wm.mgz]] — topologically pretessed final WM mask.

## Gotchas

> [!gotcha] wm.seg.mgz may be bypassed by wm.mgz edits
> When user edits exist in `wm.mgz` (voxels = 255 or 1), recon-all copies `wm.mgz` directly to `wm.seg.mgz` (line 3296) and skips `mri_segment` entirely. This means `wm.seg.mgz` will then reflect user edits, not the mri_segment output.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_segment]] — primary producer.
- [[brain.mgz]] — input.
- [[wm.asegedit.mgz]] — downstream aseg-corrected WM.
- [[wm.mgz]] — final pretessed WM used for fill and tessellation.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_segment/mri_segment.cpp:442`; `scripts/recon-all` lines 3305–3350.
- [[subject-directory]] — lists this file in the `mri/` section.
