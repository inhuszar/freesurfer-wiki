---
title: "talairach.xfm"
type: file
fs_version: "8.2.0"
filename: "talairach.xfm"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/transforms/"
anchor: subject
hemispheric: false
format: "MNI XFM (plain text)"
binary: false
produced_by:
  - "[[talairach_avi]]"
produced_in_stage: "autorecon1: Talairach"
produced_at_source:
  - "[`scripts/recon-all:1811`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1811)"
inputs:
  - "[[orig.mgz]]"
siblings:
  - "[[talairach.xfm.lta]]"
  - "[[talairach.lta]]"
consumed_by:
  - "[[mri_em_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_register]]"
  - "[[mri_ca_label]]"
downstream_files:
  - "[[talairach.xfm.lta]]"
  - "[[talairach.lta]]"
  - "[[norm.mgz]]"
  - "[[aseg.auto_noCCseg.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon1: all GCA-based downstream steps"
optional_for: []
editable: true
related:
  - "[[orig.mgz]]"
  - "[[talairach.xfm.lta]]"
  - "[[talairach.lta]]"
  - "[[mri_em_register]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# talairach.xfm

> [!file] Glossary entry
> `talairach.xfm` is the affine registration transform from the subject's native space ([[orig.mgz]]) to the MNI305 (Talairach-like) atlas coordinate system, produced by [[talairach_avi]] (or an alternative method when `-samseg-tal` is used). It is the core spatial normalisation used throughout recon-all: atlas-guided intensity normalisation, GCA-based subcortical segmentation, cortical parcellation, and eTIV estimation all depend on this transform. The file is in the MNI `.xfm` format; an LTA version ([[talairach.xfm.lta]]) is generated automatically from it.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.xfm`
- **Format:** MNI XFM plain text — contains a `Linear_Transform` block with a 4×4 affine matrix mapping subject voxels to MNI305 voxels (12 degrees of freedom).

> [!gotcha]
> `talairach.xfm` is user-editable: if the automated registration fails, the corrected transform can be manually placed in this location. A backup (`talairach.auto.xfm`) is always preserved. Running [[wiki/pipelines/recon-all|recon-all]] with `-talairach` regenerates only the auto version; to override, copy a corrected XFM to `talairach.xfm` before running downstream stages.

## What It Contains

A 12-DOF affine transformation matrix (rotation, scaling, shearing, translation) aligning the subject brain to the MNI305 reference. Used via `lta_convert` to produce [[talairach.xfm.lta]] and passed directly to GCA-based tools.

## How It Is Created

### Producing tool

[[talairach_avi]] (default) — performs a 12-DOF registration of `orig_nu.mgz` to the MNI305 atlas.

```bash
# Talairach invocation (recon-all line 1811)
talairach_avi --i orig_nu.mgz --xfm transforms/talairach.auto.xfm
```

After the auto transform is created, the pipeline copies `talairach.auto.xfm` to `talairach.xfm` (unless a user-edited version already exists that differs from auto).

Alternative methods: `talairach --i orig_nu.mgz` (older FSL-based) or `lta_convert --inlta samseg/samseg.talairach.lta --outmni` (samseg mode).

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1811`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1811)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, **Talairach** stage (`-talairach`). Touch sentinel: `touch/talairach.touch`.

### Inputs required

- `orig_nu.mgz` — bias-corrected T1 derived from [[orig.mgz]] (temporary, produced in the same stage).

### Siblings (co-produced outputs)

- [[talairach.xfm.lta]] — LTA version, converted from `talairach.xfm` by `lta_convert`.
- [[talairach.lta]] — symlink to `talairach.xfm.lta`.

## How It Is Used

### Direct downstream consumers

- [[mri_em_register]] — uses `talairach.xfm` as initialisation for GCA registration.
- [[mri_ca_normalize]] — uses the Talairach transform for atlas-guided normalisation.
- [[mri_ca_register]] — uses `talairach.xfm` for GCA atlas registration.
- [[mri_ca_label]] — uses the transform for atlas look-up in GCA subcortical labelling.

### Downstream files derived from this one

- [[talairach.xfm.lta]] — LTA version required by tools that cannot read the raw XFM.
- [[talairach.lta]] — symlink alias.
- [[norm.mgz]] — atlas-guided normalisation depends on this transform.
- [[aseg.auto_noCCseg.mgz]] — GCA-based segmentation uses this transform.

## Related

- [[talairach.xfm.lta]], [[talairach.lta]] — derived LTA versions.
- [[talairach_avi]] — producer tool.
- [[mri_em_register]] — GCA registration that builds on this.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1737–1860.
- [[subject-directory]] — lists this file in the `mri/transforms/` section.
