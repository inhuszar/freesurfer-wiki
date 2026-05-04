---
title: "aparc+aseg.mgz"
type: file
fs_version: "8.2.0"
filename: "aparc+aseg.mgz"
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
  - "[[hemi.aparc.annot]]"
  - "[[hemi.cortex.label]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings:
  - "[[aparc.a2009s+aseg.mgz]]"
  - "[[aparc.DKTatlas+aseg.mgz]]"
consumed_by:
  - "[[mri_surf2volseg]]"
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[wmparc.mgz]]"
  - "[[hemi.aparc.stats]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: WMParc, Stats"
optional_for: []
editable: false
related:
  - "[[aseg.mgz]]"
  - "[[hemi.aparc.annot]]"
  - "[[wmparc.mgz]]"
  - "[[aparc.a2009s+aseg.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aparc+aseg.mgz

> [!file] Glossary entry
> `aparc+aseg.mgz` is a parcellated volumetric segmentation produced by `mri_surf2volseg` in the AParc2ASeg stage. It starts from [[aseg.mgz]] and injects Desikan-Killiany cortical parcellation labels ([[hemi.aparc.annot]]) into the cortical ribbon voxels. Left cortical parcels receive labels 1000–1035; right cortical parcels receive labels 2000–2035. Subcortical labels are inherited from [[aseg.mgz]]. This is one of the most commonly used outputs for region-of-interest analysis and VBM-style studies.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aparc+aseg.mgz`
- **Format:** [[mgh-format]] — integer label volume in conformed space.
- **Label ranges:**
  - `0–85` — subcortical and special regions (inherited from [[aseg.mgz]])
  - `1000–1035` — left hemisphere Desikan-Killiany parcels
  - `2000–2035` — right hemisphere Desikan-Killiany parcels

## What It Contains

A whole-brain parcellation combining subcortical segmentation from [[aseg.mgz]] with cortical parcellation from [[hemi.aparc.annot]]. Every voxel within the cortical ribbon is assigned a region-specific label based on which parcel the nearest surface vertex belongs to.

## How It Is Created

### Producing tool

`mri_surf2volseg` with `--label-cortex` — reads [[aseg.mgz]] and the aparc annotations, assigns cortical parcellation labels to voxels in the cortical ribbon.

```bash
# AParc2ASeg invocation (recon-all line 5082)
mri_surf2volseg \
  --o aparc+aseg.mgz \
  --label-cortex \
  --i aseg.mgz \
  --lh-annot label/lh.aparc.annot 1000 \
  --lh-cortex-mask label/lh.cortex.label \
  --lh-white surf/lh.white --lh-pial surf/lh.pial \
  --rh-annot label/rh.aparc.annot 2000 \
  --rh-cortex-mask label/rh.cortex.label \
  --rh-white surf/rh.white --rh-pial surf/rh.pial
```

### Source reference

- **Write call:** [`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155) — `MRIwrite(s2vseg.outvolseg, OutSegFile)`
- **Pipeline invocation:** [`scripts/recon-all:5082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5082)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **AParc2ASeg** stage (`-aparc2aseg`). Touch sentinel: `touch/apas2aseg.touch`.

### Inputs required

- [[aseg.mgz]] — base subcortical segmentation.
- [[hemi.aparc.annot]] — Desikan-Killiany cortical parcellation.
- [[hemi.cortex.label]] — cortex mask.
- [[hemi.white]], [[hemi.pial]] — boundary surfaces.

### Siblings (co-produced outputs)

- [[aparc.a2009s+aseg.mgz]] — Destrieux atlas version.
- [[aparc.DKTatlas+aseg.mgz]] — DKT atlas version.

## How It Is Used

### Direct downstream consumers

- `mri_surf2volseg` (WMParc) — uses `aparc+aseg.mgz` as base for white matter parcellation → [[wmparc.mgz]].
- [[mris_anatomical_stats]] — parcellated volume stats per region.

### Downstream files derived from this one

- [[wmparc.mgz]] — white matter parcellation derived from this file.
- [[hemi.aparc.stats]] — parcellation-based morphometric statistics.

## Related

- [[aseg.mgz]] — base subcortical segmentation.
- [[hemi.aparc.annot]] — cortical parcellation injected here.
- [[aparc.a2009s+aseg.mgz]], [[aparc.DKTatlas+aseg.mgz]] — alternative atlas versions.
- [[wmparc.mgz]] — WM parcel extension.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_aparc2aseg/mri_surf2volseg.cpp:155`; `scripts/recon-all` lines 5068–5110.
- [[subject-directory]] — lists this file in the `mri/` section.
