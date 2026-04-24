---
title: "aseg.auto.mgz"
type: file
fs_version: "8.2.0"
filename: "aseg.auto.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[seg2cc]]"
produced_in_stage: "autorecon2: CC Segmentation"
produced_at_source:
  - "[`mri_cc/mri_cc.cpp:676`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cc/mri_cc.cpp#L676)"
  - "[`scripts/recon-all:3074`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3074)"
inputs:
  - "[[aseg.auto_noCCseg.mgz]]"
  - "[[norm.mgz]]"
siblings: []
consumed_by:
  - "[[mri_seg_diff]]"
downstream_files:
  - "[[aseg.presurf.mgz]]"
mandatory_for:
  - "[[recon-all]] autorecon2: ASeg Merge"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[aseg.auto_noCCseg.mgz]]"
  - "[[aseg.presurf.mgz]]"
  - "[[aseg.mgz]]"
  - "[[color-lut]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aseg.auto.mgz

> [!file] Glossary entry
> `aseg.auto.mgz` is the fully automatic subcortical segmentation including corpus callosum (CC) parcellation, produced by `seg2cc` ([[mri_cc]]) from [[aseg.auto_noCCseg.mgz]]. It is the intermediate between the raw GCA output and the user-facing [[aseg.presurf.mgz]] / [[aseg.mgz]]. User edits (stored in `aseg.manedit.mgz`) are merged into `aseg.presurf.mgz` at the ASeg Merge step, leaving `aseg.auto.mgz` as the immutable automatic baseline.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aseg.auto.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Integer labels from the FreeSurfer [[color-lut]] including CC sub-labels 251–255.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A volumetric label map identical in structure to [[aseg.auto_noCCseg.mgz]] but with corpus callosum voxels reclassified into five CC sub-labels (251 = CC_Posterior, 252 = CC_Mid_Posterior, 253 = CC_Central, 254 = CC_Mid_Anterior, 255 = CC_Anterior), as determined by the `seg2cc` / `mri_cc` tool.

## How It Is Created

### Producing tool

`seg2cc` (a wrapper script for [[mri_cc]]) — reads [[aseg.auto_noCCseg.mgz]], identifies the corpus callosum region, and subdivides it into the five standard CC parcels, writing `aseg.auto.mgz`.

```bash
# Recon-all invocation (line 3074)
seg2cc --s <subjid>
```

`seg2cc` internally calls `mri_cc` to perform the actual CC subdivision.

### Source reference

- **Write call in mri_cc:** [`mri_cc/mri_cc.cpp:676`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cc/mri_cc.cpp#L676) — `MRIwrite(mri_aseg, ofname)`
- **Pipeline invocation:** [`scripts/recon-all:3074`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3074)

### Pipeline stage

[[recon-all]] autorecon2, **CC Segmentation** stage (`-ccseg`). Immediately follows CA Label.

### Inputs required

- [[aseg.auto_noCCseg.mgz]] — GCA output without CC labels.
- [[norm.mgz]] — intensity reference for CC boundary estimation.

### Siblings (co-produced outputs)

`mri_cc` also writes `cc_up.lta` (corpus callosum upright transform) and intermediate CC volumes. The primary user-facing output is `aseg.auto.mgz`.

## How It Is Used

### Direct downstream consumers

- `mri_seg_diff` — compares `aseg.auto.mgz` with `aseg.presurf.mgz` to detect and encode user edits into `aseg.manedit.mgz` (recon-all line 2924).
- The **ASeg Merge** step (`-asegmerge`) uses `aseg.auto.mgz` + `aseg.manedit.mgz` to produce [[aseg.presurf.mgz]].

### Downstream files derived from this one

- [[aseg.presurf.mgz]] — either a direct copy or a manual-edit-merged version of aseg.auto.
- [[aseg.mgz]] — the final segmentation (produced later at autorecon3 via surface-based corrections).

## Related

- [[mgz]] — on-disk format specification.
- [[mri_cc]] — CC subdivision producer.
- [[aseg.auto_noCCseg.mgz]] — input.
- [[aseg.presurf.mgz]], [[aseg.mgz]] — downstream successors.
- [[color-lut]] — label scheme.
- [[recon-all]] — pipeline context.

## References

- Source: `mri_cc/mri_cc.cpp:676`; `scripts/recon-all` lines 3066–3113.
- [[subject-directory]] — lists this file in the `mri/` section.
