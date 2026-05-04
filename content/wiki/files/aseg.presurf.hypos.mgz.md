---
title: "aseg.presurf.hypos.mgz"
type: file
fs_version: "8.2.0"
filename: "aseg.presurf.hypos.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgh-format]]"
binary: true
produced_by:
  - "[[mri_relabel_hypointensities]]"
produced_in_stage: "autorecon3: Relabel Hypointensities"
produced_at_source:
  - "[`mri_relabel_hypointensities/mri_relabel_hypointensities.cpp:124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_relabel_hypointensities/mri_relabel_hypointensities.cpp#L124)"
  - "[`scripts/recon-all:5013`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5013)"
inputs:
  - "[[aseg.presurf.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings: []
consumed_by:
  - "[[mri_surf2volseg]]"
downstream_files:
  - "[[aseg.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Final Aseg"
optional_for: []
editable: false
related:
  - "[[aseg.presurf.mgz]]"
  - "[[aseg.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aseg.presurf.hypos.mgz

> [!file] Glossary entry
> `aseg.presurf.hypos.mgz` is a copy of [[aseg.presurf.mgz]] with white matter hypointensities (WM signal dropouts) relabelled from the generic WM label to the dedicated WM hypointensity label (77) by [[mri_relabel_hypointensities]]. It is an intermediate used solely to produce the final [[aseg.mgz]] via `mri_surf2volseg`. When `-nowmsa` is used, `aseg.presurf.hypos.mgz` is simply a copy of [[aseg.presurf.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aseg.presurf.hypos.mgz`
- **Format:** [[mgh-format]] — same label encoding as [[aseg.presurf.mgz]] but with WM hypointensity voxels relabelled to label 77 (WM hypointensity).

## What It Contains

A subcortical segmentation volume identical to [[aseg.presurf.mgz]] except that voxels that fall between the white and pial surfaces and have unexpectedly low intensity (WM hypointensities / leukoaraiosis) are relabelled from the general WM labels (2, 41) to the specific WM hypointensity label (77).

## How It Is Created

### Producing tool

`mri_relabel_hypointensities` — reads [[aseg.presurf.mgz]] and the surface files, identifies WM hypointensity voxels, and writes the updated segmentation.

```bash
# Relabel Hypointensities (recon-all line 5013)
mri_relabel_hypointensities \
  aseg.presurf.mgz \
  ../surf \
  aseg.presurf.hypos.mgz
```

When `-nowmsa` is active: `cp aseg.presurf.mgz aseg.presurf.hypos.mgz`.

### Source reference

- **Write call:** [`mri_relabel_hypointensities/mri_relabel_hypointensities.cpp:124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_relabel_hypointensities/mri_relabel_hypointensities.cpp#L124) — `MRIwrite(mri_aseg, out_aseg_name)`
- **Pipeline invocation:** [`scripts/recon-all:5013`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5013)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **Relabel Hypointensities** stage. Touch sentinel: `touch/relabelhypos.touch`.

### Inputs required

- [[aseg.presurf.mgz]] — pre-surface subcortical segmentation.
- White and pial surfaces (to identify the cortical ribbon).

## How It Is Used

### Direct downstream consumers

- `mri_surf2volseg` (Final Aseg stage) — uses `aseg.presurf.hypos.mgz` as the base segmentation for injecting cortical ribbon labels to produce [[aseg.mgz]].

### Downstream files derived from this one

- [[aseg.mgz]] — the final subcortical+cortical segmentation.

## Related

- [[aseg.presurf.mgz]] — source segmentation.
- [[aseg.mgz]] — final output derived from this file.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_relabel_hypointensities/mri_relabel_hypointensities.cpp:124`; `scripts/recon-all` lines 5000–5020.
- [[subject-directory]] — lists this file in the `mri/` section.
