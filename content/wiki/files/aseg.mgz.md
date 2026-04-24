---
title: "aseg.mgz"
type: file
fs_version: "8.2.0"
filename: "aseg.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgh-format]]"
binary: true
produced_by:
  - "[[mri_surf2volseg]]"
produced_in_stage: "autorecon3: APas-to-ASeg"
produced_at_source:
  - "[`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155)"
  - "[`scripts/recon-all:5030`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5030)"
inputs:
  - "[[aseg.presurf.hypos.mgz]]"
  - "[[ribbon.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.cortex.label]]"
siblings: []
consumed_by:
  - "[[mri_surf2volseg]]"
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[aparc+aseg.mgz]]"
  - "[[aseg.stats]]"
mandatory_for:
  - "[[recon-all]] autorecon3: AParc2ASeg, Stats"
optional_for: []
editable: false
related:
  - "[[aseg.presurf.mgz]]"
  - "[[aseg.presurf.hypos.mgz]]"
  - "[[ribbon.mgz]]"
  - "[[aparc+aseg.mgz]]"
  - "[[aseg.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aseg.mgz

> [!file] Glossary entry
> `aseg.mgz` is the final FreeSurfer subcortical segmentation volume, produced by `mri_surf2volseg` in the APas-to-ASeg stage of autorecon3. Starting from [[aseg.presurf.hypos.mgz]], it replaces WM and unlabelled voxels within the cortical ribbon ([[ribbon.mgz]]) with cortical gray matter labels (3=left, 42=right) and fixes pre-surface labels using the accurate white and pial surfaces. It is the primary segmentation volume used for region-of-interest analysis and reported in [[aseg.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aseg.mgz`
- **Format:** [[mgh-format]] — integer label volume in subject native (conformed 256³ 1mm) space. Labels follow the FreeSurfer Color Lookup Table (FreeSurferColorLUT.txt).
- **Key labels:** All FreeSurfer subcortical and cortical ribbon labels (2=left-WM, 3=left-cortex, 4=left-lateral-ventricle, 41=right-WM, 42=right-cortex, 77=WM-hypointensity, …).

## What It Contains

A complete whole-brain parcellation at the voxel level. Subcortical regions are inherited from [[aseg.presurf.hypos.mgz]] with hypointensities corrected; cortical ribbon voxels are updated based on the white and pial surfaces to ensure anatomical consistency with the final surfaces.

## How It Is Created

### Producing tool

`mri_surf2volseg` with `--fix-presurf-with-ribbon` — reads [[aseg.presurf.hypos.mgz]] as the base, uses [[ribbon.mgz]] and the white/pial surfaces to assign final cortical labels.

```bash
# APas-to-ASeg invocation (recon-all line 5030)
mri_surf2volseg \
  --o aseg.mgz \
  --i aseg.presurf.hypos.mgz \
  --fix-presurf-with-ribbon mri/ribbon.mgz \
  --lh-cortex-mask label/lh.cortex.label \
  --lh-white surf/lh.white \
  --lh-pial surf/lh.pial \
  --rh-cortex-mask label/rh.cortex.label \
  --rh-white surf/rh.white \
  --rh-pial surf/rh.pial
```

### Source reference

- **Write call:** [`mri_aparc2aseg/mri_surf2volseg.cpp:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_aparc2aseg/mri_surf2volseg.cpp#L155) — `MRIwrite(s2vseg.outvolseg, OutSegFile)`
- **Pipeline invocation:** [`scripts/recon-all:5030`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5030)

### Pipeline stage

[[recon-all]] autorecon3, **APas-to-ASeg** stage (`-apas2aseg`). Touch sentinel: `touch/apas2aseg.touch`.

### Inputs required

- [[aseg.presurf.hypos.mgz]] — base segmentation with hypointensities relabelled.
- [[ribbon.mgz]] — cortical ribbon mask.
- [[hemi.white]], [[hemi.pial]] — final surfaces.
- [[hemi.cortex.label]] — cortex mask.

## How It Is Used

### Direct downstream consumers

- `mri_surf2volseg` (AParc2ASeg) — used as base for injecting cortical parcellation labels → [[aparc+aseg.mgz]].
- [[mris_anatomical_stats]] — segments aseg regions for [[aseg.stats]].
- `mri_brainvol_stats` — computes global brain volume statistics cached in [[brainvol.stats]].

### Downstream files derived from this one

- [[aparc+aseg.mgz]] — parcellated aseg with cortical labels.
- [[aparc.a2009s+aseg.mgz]], [[aparc.DKTatlas+aseg.mgz]] — alternative atlas parcellations.
- [[aseg.stats]] — volumetric subcortical statistics.

## Related

- [[aseg.presurf.mgz]] — pre-surface version (lacks cortical ribbon correction).
- [[aseg.presurf.hypos.mgz]] — intermediate with hypointensity labels.
- [[ribbon.mgz]] — cortical ribbon mask.
- [[aparc+aseg.mgz]] — parcellated successor.
- [[recon-all]] — pipeline context.

## References

- Source: `mri_aparc2aseg/mri_surf2volseg.cpp:155`; `scripts/recon-all` lines 5022–5055.
- [[subject-directory]] — lists this file in the `mri/` section.
