---
title: "wm.asegedit.mgz"
type: file
fs_version: "8.2.0"
filename: "wm.asegedit.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_edit_wm_with_aseg]]"
produced_in_stage: "autorecon2: WM Segmentation / Edit"
produced_at_source:
  - "[`scripts/recon-all:3362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3362)"
inputs:
  - "[[wm.seg.mgz]]"
  - "[[brain.mgz]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mri_pretess]]"
downstream_files:
  - "[[wm.mgz]]"
mandatory_for:
  - "[[recon-all]] autorecon2: PreTess"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[wm.seg.mgz]]"
  - "[[wm.mgz]]"
  - "[[aseg.presurf.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# wm.asegedit.mgz

> [!file] Glossary entry
> `wm.asegedit.mgz` is the aseg-corrected white matter mask, produced by [[mri_edit_wm_with_aseg]] from [[wm.seg.mgz]], [[brain.mgz]], and [[aseg.presurf.mgz]]. It adds WM voxels from subcortical structures identified in the aseg (e.g. thalamus, basal ganglia) and corrects topological issues near subcortical boundaries. It feeds directly into [[mri_pretess]] to produce the final [[wm.mgz]] used for surface tessellation.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/wm.asegedit.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Values 0 (not WM) or 255 (WM).
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A binary WM mask combining the intensity-based [[wm.seg.mgz]] with atlas-based corrections from [[aseg.presurf.mgz]]. Subcortical white matter regions are filled according to the aseg labels; known topological problem areas near the anterior commissure and entorhinal cortex may receive additional corrections when the corresponding flags are set.

## How It Is Created

### Producing tool

[[mri_edit_wm_with_aseg]] — reads [[wm.seg.mgz]], applies subcortical WM filling from [[aseg.presurf.mgz]], and applies entorhinal/ACJ corrections when enabled.

```bash
# Default invocation (recon-all line 3362)
mri_edit_wm_with_aseg \
  -keep-in \
  wm.seg.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz

# With entorhinal WM fix
mri_edit_wm_with_aseg \
  -keep-in \
  -fix-ento-wm entowm.mgz 3 255 255 \
  wm.seg.mgz brain.mgz aseg.presurf.mgz wm.asegedit.mgz
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3362)
- Write happens inside the `mri_edit_wm_with_aseg` binary.

### Pipeline stage

[[recon-all]] autorecon2, **WM Segmentation** stage (part of `-wmseg`). Produced after `mri_segment` and before `mri_pretess`.

### Inputs required

- [[wm.seg.mgz]] — intensity-based WM mask.
- [[brain.mgz]] — intensity reference.
- [[aseg.presurf.mgz]] — subcortical atlas labels for WM filling.
- `entowm.mgz` *(optional)* — entorhinal WM mask for topological fix.

### Siblings (co-produced outputs)

None.

## How It Is Used

### Direct downstream consumers

- [[mri_pretess]] — reads `wm.asegedit.mgz` and applies pretessellation to produce [[wm.mgz]].

### Downstream files derived from this one

- [[wm.mgz]] — topologically corrected final WM mask.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_edit_wm_with_aseg]] — producer.
- [[wm.seg.mgz]] — input WM mask.
- [[aseg.presurf.mgz]] — segmentation used for corrections.
- [[wm.mgz]] — downstream pretessed output.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3352–3366.
- [[subject-directory]] — lists this file in the `mri/` section.
