---
title: "brain.mgz"
type: file
fs_version: "8.2.0"
filename: "brain.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_normalize]]"
produced_in_stage: "autorecon2: Intensity Normalization2"
produced_at_source:
  - "[`mri_normalize/mri_normalize.cpp:981`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L981)"
  - "[`scripts/recon-all:3145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3145)"
inputs:
  - "[[norm.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mri_mask]]"
  - "[[mri_segment]]"
downstream_files:
  - "[[brain.finalsurfs.mgz]]"
  - "[[wm.seg.mgz]]"
mandatory_for:
  - "[[recon-all]] autorecon2: Mask BFS, WM Segmentation"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[norm.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# brain.mgz

> [!file] Glossary entry
> `brain.mgz` is the skull-stripped, intensity-normalised T1 volume produced by a second pass of [[mri_normalize]] in autorecon2. It takes [[norm.mgz]] as intensity input and [[brainmask.mgz]] as the brain restriction mask. `brain.mgz` feeds directly into [[brain.finalsurfs.mgz]] (after applying the final surface-placement mask) and [[wm.seg.mgz]] (white matter segmentation for surface tessellation).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/brain.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic. Voxel type is typically `UCHAR`; non-brain voxels are 0.
- **Typical size / shape:** 256 × 256 × 256, ~16 MB gzipped.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

Each voxel holds an atlas-calibrated intensity within the brain mask; voxels outside the brain are 0. Like [[brainmask.mgz]], `brain.mgz` is a masked intensity volume rather than a pure binary file. The normalisation targets white matter at ≈ 110 (UCHAR scale). The spatial grid and RAS frame are identical to [[orig.mgz]].

## How It Is Created

### Producing tool

[[mri_normalize]] — second normalisation invocation; reads [[norm.mgz]] as the intensity source and applies [[brainmask.mgz]] as a mask. Also uses the [[aseg.presurf.mgz]] segmentation to guide normalisation when available.

```bash
# Default invocation (recon-all line 3145)
mri_normalize -mask brainmask.mgz norm.mgz brain.mgz

# With aseg guidance
mri_normalize -aseg aseg.presurf.mgz -mask brainmask.mgz norm.mgz brain.mgz

# Fallback when norm.mgz is absent (-noaseg)
mri_normalize brainmask.mgz brain.mgz
```

### Source reference

- **Write call:** [`mri_normalize/mri_normalize.cpp:981`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L981) — `MRIwrite(mri_dst, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:3145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3145)

### Pipeline stage

[[recon-all]] autorecon2, **Intensity Normalization2** stage (`-normalization2`). Touch sentinel: `touch/inorm2.touch`.

### Inputs required

- [[norm.mgz]] — atlas-normalised T1 source (or [[brainmask.mgz]] when norm.mgz is absent).
- [[brainmask.mgz]] — brain extraction mask.
- [[aseg.presurf.mgz]] *(optional when `-noaseg` is not set)* — subcortical segmentation used to guide normalisation.

### Siblings (co-produced outputs)

None.

## How It Is Used

### Direct downstream consumers

- [[mri_mask]] — applies the final surface-placement mask to `brain.mgz` to create [[brain.finalsurfs.mgz]].
- [[mri_segment]] — reads `brain.mgz` (or the ANTs-denoised variant) to produce [[wm.seg.mgz]].
- [[mri_pretess]] — uses `brain.mgz` or `norm.mgz` as intensity reference during WM pretessellation.

### Downstream files derived from this one

- [[brain.finalsurfs.mgz]] — `brain.mgz` with additional masking for surface placement.
- [[wm.seg.mgz]] — white matter segmentation derived from `brain.mgz`.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_normalize]] — producer.
- [[norm.mgz]], [[brainmask.mgz]] — inputs.
- [[brain.finalsurfs.mgz]] — immediate successor for surface placement.
- [[wm.seg.mgz]] — white matter derived from this volume.
- [[recon-all]] — pipeline context.

## References

- Source: `mri_normalize/mri_normalize.cpp:981`; `scripts/recon-all` lines 3116–3153.
- [[subject-directory]] — lists this file in the `mri/` section.
