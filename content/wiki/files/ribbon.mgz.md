---
title: "ribbon.mgz"
type: file
fs_version: "8.2.0"
filename: "ribbon.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgh-format]]"
binary: true
produced_by:
  - "[[mris_volmask]]"
produced_in_stage: "autorecon3: CortRibbon"
produced_at_source:
  - "[`mris_volmask/mris_volmask.cpp:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_volmask/mris_volmask.cpp#L309)"
  - "[`scripts/recon-all:4854`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4854)"
inputs:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[aseg.presurf.mgz]]"
siblings:
  - "[[hemi.ribbon.mgz]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
  - "[[mri_aparc2aseg]]"
downstream_files:
  - "[[aseg.mgz]]"
  - "[[aparc+aseg.mgz]]"
mandatory_for:
  - "[[recon-all]] autorecon3: Stats, Parcellated volumes"
optional_for: []
editable: false
related:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.ribbon.mgz]]"
  - "[[aseg.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# ribbon.mgz

> [!file] Glossary entry
> `ribbon.mgz` is a volumetric mask of the cortical ribbon, produced by [[mris_volmask]] in the CortRibbon stage. Each voxel is labelled 2 (left white matter), 3 (left cortical ribbon), 41 (right white matter), 42 (right cortical ribbon), or 0 (outside). The ribbon defines the cortical gray matter voxel set used for generating parcellated volumes ([[aparc+aseg.mgz]]) and for surface-based cortical statistics.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/ribbon.mgz`
- **Format:** [[mgh-format]] — signed 16-bit integer (MRI_SHORT) volume in subject's native conformed space (256³ 1mm isotropic).
- **Label values:**
  - `0` — outside cortex
  - `2` — left hemisphere WM interior
  - `3` — left hemisphere cortical ribbon (gray matter)
  - `41` — right hemisphere WM interior
  - `42` — right hemisphere cortical ribbon (gray matter)

## What It Contains

A binary label volume delineating the cortical ribbon: the voxels between the white and pial surfaces for each hemisphere. Produced by the same `mris_volmask` call that also writes per-hemisphere ribbon files ([[hemi.ribbon.mgz]]).

## How It Is Created

### Producing tool

[[mris_volmask]] — intersects [[hemi.white]] and [[hemi.pial]] against the conformed volume grid to label each voxel as inside white matter, inside gray matter (ribbon), or outside.

```bash
# CortRibbon invocation (recon-all line 4854)
mris_volmask \
  --aseg_name aseg.presurf \
  --label_left_white   2 \
  --label_left_ribbon  3 \
  --label_right_white 41 \
  --label_right_ribbon 42 \
  --save_ribbon \
  --parallel \
  $subjid
```

### Source reference

- **Write call:** [`mris_volmask/mris_volmask.cpp:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_volmask/mris_volmask.cpp#L309) — `MRIwrite(finalMask, ...)`
- **Pipeline invocation:** [`scripts/recon-all:4854`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4854)

### Pipeline stage

[[recon-all]] autorecon3, **CortRibbon** stage (`-cortribbon`). Touch sentinel: `touch/cortical_ribbon.touch`.

### Inputs required

- [[hemi.white]] — white matter surface (both hemispheres).
- [[hemi.pial]] — pial surface (both hemispheres).
- [[aseg.presurf.mgz]] — used as the template volume for voxel grid.

### Siblings (co-produced outputs)

- [[hemi.ribbon.mgz]] — per-hemisphere ribbon files written when `--save_ribbon` is used.

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — uses `ribbon.mgz` to identify gray matter voxels for statistical sampling.
- `mri_aparc2aseg` — uses the ribbon to inject cortical parcellation labels into the final volumetric segmentation.

### Downstream files derived from this one

- [[aseg.mgz]] — updated aseg with ribbon labels.
- [[aparc+aseg.mgz]] — parcellated volume using the ribbon.

## Related

- [[hemi.white]], [[hemi.pial]] — source surfaces.
- [[hemi.ribbon.mgz]] — per-hemisphere ribbon volumes.
- [[aseg.mgz]] — downstream volumetric segmentation.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_volmask/mris_volmask.cpp:309`; `scripts/recon-all` lines 4845–4870.
- [[subject-directory]] — lists this file in the `mri/` section.
