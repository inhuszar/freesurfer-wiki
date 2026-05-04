---
title: "wmparc.mgz"
type: file
fs_version: "8.2.0"
filename: "wmparc.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgh-format]]"
binary: true
produced_by:
  - "[[mri_surf2volseg]]"
produced_in_stage: "autorecon3: WMParc"
produced_at_source:
  - "[`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155)"
  - "[`scripts/recon-all:5121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5121)"
inputs:
  - "[[aparc+aseg.mgz]]"
  - "[[hemi.aparc.annot]]"
  - "[[hemi.cortex.label]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings: []
consumed_by:
  - "[[mri_segstats]]"
downstream_files:
  - "[[wmparc.stats]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: WMParc stats"
optional_for: []
editable: false
related:
  - "[[aparc+aseg.mgz]]"
  - "[[aseg.mgz]]"
  - "[[hemi.aparc.annot]]"
  - "[[wmparc.stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# wmparc.mgz

> [!file] Glossary entry
> `wmparc.mgz` is a white matter parcellation volume produced by `mri_surf2volseg` with `--label-wm` in the WMParc stage. Starting from [[aparc+aseg.mgz]], it assigns WM voxels (labels 2, 41) that fall near a specific cortical parcel to that parcel's WM label (3000–3035 for left, 4000–4035 for right). Subcortical structures are inherited unchanged. WM parcellation statistics are reported in [[wmparc.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/wmparc.mgz`
- **Format:** [[mgh-format]] — integer label volume.
- **Label ranges:**
  - `0–85` — subcortical/special regions (inherited from [[aparc+aseg.mgz]])
  - `3000–3035` — left hemisphere WM parcels
  - `4000–4035` — right hemisphere WM parcels
  - Cortical ribbon voxels retain their cortical parcel labels from [[aparc+aseg.mgz]].

## What It Contains

Voxels within WM assigned to the nearest cortical parcel based on surface proximity, using the Desikan-Killiany parcellation. Voxels outside the WM and cortical ribbon retain their [[aparc+aseg.mgz]] labels.

## How It Is Created

### Producing tool

`mri_surf2volseg` with `--label-wm` — reads [[aparc+aseg.mgz]], and for each WM voxel (labels 2 or 41), assigns a WM parcel label corresponding to the nearest cortical parcel vertex.

```bash
# WMParc invocation (recon-all line 5121)
mri_surf2volseg \
  --o wmparc.mgz \
  --label-wm \
  --i aparc+aseg.mgz \
  --lh-annot label/lh.aparc.annot 3000 \
  --lh-cortex-mask label/lh.cortex.label \
  --lh-white surf/lh.white --lh-pial surf/lh.pial \
  --rh-annot label/rh.aparc.annot 4000 \
  --rh-cortex-mask label/rh.cortex.label \
  --rh-white surf/rh.white --rh-pial surf/rh.pial
```

### Source reference

- **Write call:** [`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155) — `MRIwrite(s2vseg.outvolseg, OutSegFile)`
- **Pipeline invocation:** [`scripts/recon-all:5121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5121)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **WMParc** stage (`-wmparc`). Touch sentinel: `touch/apas2aseg.touch`.

### Inputs required

- [[aparc+aseg.mgz]] — base parcellated segmentation.
- [[hemi.aparc.annot]] — cortical parcellation for WM assignment.
- [[hemi.cortex.label]] — cortex mask.
- [[hemi.white]], [[hemi.pial]] — surfaces for proximity assignment.

## How It Is Used

### Direct downstream consumers

- `mri_segstats` — produces [[wmparc.stats]] from `wmparc.mgz`.

### Downstream files derived from this one

- [[wmparc.stats]] — per-region WM volume statistics.

## Related

- [[aparc+aseg.mgz]] — base parcellated volume.
- [[aseg.mgz]] — base subcortical segmentation.
- [[hemi.aparc.annot]] — cortical parcellation.
- [[wmparc.stats]] — WM stats file.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_aparc2aseg/mri_surf2volseg.cpp:155`; `scripts/recon-all` lines 5111–5160.
- [[subject-directory]] — lists this file in the `mri/` section.
