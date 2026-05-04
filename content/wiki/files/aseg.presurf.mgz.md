---
title: "aseg.presurf.mgz"
type: file
fs_version: "8.2.0"
filename: "aseg.presurf.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_seg_diff]]"
produced_in_stage: "autorecon2: ASeg Merge"
produced_at_source:
  - "[`scripts/recon-all:3105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3105)"
inputs:
  - "[[aseg.auto.mgz]]"
siblings: []
consumed_by:
  - "[[mri_normalize]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mris_make_surfaces]]"
downstream_files:
  - "[[wm.asegedit.mgz]]"
  - "[[brain.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Intensity Normalization2, WM Segmentation"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[aseg.auto.mgz]]"
  - "[[aseg.mgz]]"
  - "[[color-lut]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aseg.presurf.mgz

> [!file] Glossary entry
> `aseg.presurf.mgz` is the subcortical segmentation used during surface reconstruction, produced by merging [[aseg.auto.mgz]] with any user-edits stored in `aseg.manedit.mgz`. When no edits exist, it is a direct copy of [[aseg.auto.mgz]]. It feeds the second intensity normalisation ([[brain.mgz]]), white matter editing ([[wm.asegedit.mgz]]), and surface placement ([[mris_make_surfaces]]). It is distinct from [[aseg.mgz]], which is the final, surface-corrected segmentation produced at autorecon3.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aseg.presurf.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Integer labels from the FreeSurfer [[color-lut]].
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A subcortical label volume identical in structure to [[aseg.auto.mgz]], representing the best available subcortical segmentation at the time of surface reconstruction. If the user has edited `aseg.manedit.mgz`, those edits are merged in via `mri_seg_diff` (recon-all line 3092–3101). If no edits exist, `aseg.presurf.mgz` is a direct copy of `aseg.auto.mgz` (recon-all line 3105).

## How It Is Created

### Producing tool

- **No edits present:** `cp aseg.auto.mgz aseg.presurf.mgz` (recon-all line 3105).
- **Edits present:** `mri_seg_diff --seg aseg.auto.mgz --diff-in aseg.manedit.mgz --merged aseg.presurf.mgz` (line 3092).

```bash
# Default (no edits) — recon-all line 3105
cp aseg.auto.mgz aseg.presurf.mgz

# With user edits (aseg.manedit.mgz exists) — recon-all line 3092
mri_seg_diff \
  --seg aseg.auto.mgz \
  --diff-in aseg.manedit.mgz \
  --merged aseg.presurf.mgz
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3105) (no-edit path) and line 3092 (edit-merge path).

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **ASeg Merge** stage (`-asegmerge`). Touch sentinel: `touch/asegmerge.touch`.

### Inputs required

- [[aseg.auto.mgz]] — automatic segmentation (always).
- `aseg.manedit.mgz` *(optional)* — user-applied edits; if absent, copy path is used.

### Siblings (co-produced outputs)

None.

## How It Is Used

### Direct downstream consumers

- [[mri_normalize]] (Normalization2) — guided by `aseg.presurf.mgz` to avoid including CSF/gray voxels in the WM normalisation (recon-all line 3140).
- [[mri_edit_wm_with_aseg]] — uses `aseg.presurf.mgz` to add WM voxels from subcortical structures and correct topology errors in [[wm.asegedit.mgz]].
- [[mris_make_surfaces]] — reads `aseg.presurf.mgz` to initialise surface placement in the vicinity of basal ganglia and other subcortical structures.

### Downstream files derived from this one

- [[wm.asegedit.mgz]] — WM mask edited with aseg guidance.
- [[brain.mgz]] — normalised brain with aseg-guided WM estimation.

## Alternative Names and Variants

### Variants

- [[aseg.mgz]] — the **final** segmentation produced at autorecon3, which incorporates cortical ribbon corrections. `aseg.presurf.mgz` does not contain cortical parcellation or ribbon-corrected boundaries.
- [[aseg.presurf.hypos.mgz]] — a variant of aseg.presurf with hypointensity labels added. See that page.

## Gotchas

> [!gotcha] aseg.presurf is distinct from aseg.mgz
> `aseg.presurf.mgz` is used during surface placement and should not be confused with the final [[aseg.mgz]]. Many structures (especially near the cortex) will have slightly different boundaries because cortical surface information has not yet been used to correct the subcortical segmentation. `mri_segstats` should be run on [[aseg.mgz]], not `aseg.presurf.mgz`.

## Related

- [[mgz]] — on-disk format specification.
- [[aseg.auto.mgz]] — input (automatic baseline).
- [[aseg.mgz]] — final segmentation successor.
- [[color-lut]] — label scheme.
- [[mri_edit_wm_with_aseg]], [[mris_make_surfaces]] — primary consumers.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3082–3113.
- [[subject-directory]] — lists this file in the `mri/` section.
