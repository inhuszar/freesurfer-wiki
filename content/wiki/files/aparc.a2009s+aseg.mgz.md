---
title: "aparc.a2009s+aseg.mgz"
type: file
fs_version: "8.2.0"
filename: "aparc.a2009s+aseg.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgh-format]]"
binary: true
produced_by:
  - "[[mri_surf2volseg]]"
produced_in_stage: "autorecon3: AParc2ASeg"
produced_at_source:
  - "[`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155)"
  - "[`scripts/recon-all:5082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5082)"
inputs:
  - "[[aseg.mgz]]"
  - "[[hemi.aparc.a2009s.annot]]"
  - "[[hemi.cortex.label]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings:
  - "[[aparc+aseg.mgz]]"
  - "[[aparc.DKTatlas+aseg.mgz]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.aparc.a2009s.stats]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: AParc2ASeg (produced by default)"
editable: false
related:
  - "[[aseg.mgz]]"
  - "[[hemi.aparc.a2009s.annot]]"
  - "[[aparc+aseg.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aparc.a2009s+aseg.mgz

> [!file] Glossary entry
> `aparc.a2009s+aseg.mgz` is a parcellated volumetric segmentation using the Destrieux 2009 atlas, produced in the same AParc2ASeg stage as [[aparc+aseg.mgz]]. Cortical voxels are labelled with Destrieux parcellation labels (11100–11174 for left, 12100–12174 for right) from [[hemi.aparc.a2009s.annot]]; subcortical labels come from [[aseg.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aparc.a2009s+aseg.mgz`
- **Format:** [[mgh-format]] — integer label volume.
- **Label ranges:**
  - `0–85` — subcortical regions from [[aseg.mgz]]
  - `11100–11174` — left Destrieux parcels
  - `12100–12174` — right Destrieux parcels

## How It Is Created

Same `mri_surf2volseg --label-cortex` call as [[aparc+aseg.mgz]] but using [[hemi.aparc.a2009s.annot]] and offset 11100/12100.

### Source reference

- **Write call:** [`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155)
- **Pipeline invocation:** [`scripts/recon-all:5082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5082)

### Pipeline stage

[[recon-all]] autorecon3, **AParc2ASeg** stage (`-aparc2aseg`).

## How It Is Used

- [[mris_anatomical_stats]] — produces [[hemi.aparc.a2009s.stats]].

## Related

- [[aparc+aseg.mgz]] — Desikan-Killiany version.
- [[hemi.aparc.a2009s.annot]] — source annotation.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5068–5110.
- [[subject-directory]] — lists this file in the `mri/` section.
