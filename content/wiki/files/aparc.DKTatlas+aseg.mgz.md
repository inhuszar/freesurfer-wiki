---
title: "aparc.DKTatlas+aseg.mgz"
type: file
fs_version: "8.2.0"
filename: "aparc.DKTatlas+aseg.mgz"
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
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[hemi.cortex.label]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings:
  - "[[aparc+aseg.mgz]]"
  - "[[aparc.a2009s+aseg.mgz]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.aparc.DKTatlas.stats]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: AParc2ASeg (produced by default)"
editable: false
related:
  - "[[aseg.mgz]]"
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[aparc+aseg.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aparc.DKTatlas+aseg.mgz

> [!file] Glossary entry
> `aparc.DKTatlas+aseg.mgz` is a parcellated volumetric segmentation using the Mindboggle DKT atlas, produced in the same AParc2ASeg stage as [[aparc+aseg.mgz]]. Cortical voxels are labelled with DKT parcellation labels (1000–1031 for left, 2000–2031 for right) from [[hemi.aparc.DKTatlas.annot]]; subcortical labels come from [[aseg.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aparc.DKTatlas+aseg.mgz`
- **Format:** [[mgh-format]] — integer label volume.
- **Label ranges:**
  - `0–85` — subcortical regions from [[aseg.mgz]]
  - `1000–1031` — left DKT parcels
  - `2000–2031` — right DKT parcels

## How It Is Created

Same `mri_surf2volseg --label-cortex` call as [[aparc+aseg.mgz]] but using [[hemi.aparc.DKTatlas.annot]] and offset 1000/2000.

### Source reference

- **Write call:** [`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155)
- **Pipeline invocation:** [`scripts/recon-all:5082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5082)

### Pipeline stage

[[recon-all]] autorecon3, **AParc2ASeg** stage (`-aparc2aseg`).

## How It Is Used

- [[mris_anatomical_stats]] — produces [[hemi.aparc.DKTatlas.stats]].

## Related

- [[aparc+aseg.mgz]] — Desikan-Killiany version.
- [[hemi.aparc.DKTatlas.annot]] — source annotation.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5068–5110.
- [[subject-directory]] — lists this file in the `mri/` section.
