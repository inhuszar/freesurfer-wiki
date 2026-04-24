---
title: "aseg.auto_noCCseg.mgz"
type: file
fs_version: "8.2.0"
filename: "aseg.auto_noCCseg.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_ca_label]]"
produced_in_stage: "autorecon2: CA Label"
produced_at_source:
  - "[`mri_ca_label/mri_ca_label.cpp:1425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_label/mri_ca_label.cpp#L1425)"
  - "[`scripts/recon-all:3027`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3027)"
inputs:
  - "[[norm.mgz]]"
  - "[[talairach.m3z]]"
siblings: []
consumed_by:
  - "[[mri_cc]]"
  - "[[seg2cc]]"
downstream_files:
  - "[[aseg.auto.mgz]]"
mandatory_for:
  - "[[recon-all]] autorecon2: CC Segmentation"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[aseg.auto.mgz]]"
  - "[[aseg.presurf.mgz]]"
  - "[[aseg.mgz]]"
  - "[[color-lut]]"
  - "[[parcellation-schemes]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aseg.auto_noCCseg.mgz

> [!file] Glossary entry
> `aseg.auto_noCCseg.mgz` is the first-pass automatic subcortical segmentation produced by [[mri_ca_label]] in autorecon2. It contains integer labels for subcortical and ventricular structures per the FreeSurfer [[color-lut]], but without corpus callosum (CC) parcellation. The CC labels are added by the subsequent `seg2cc` / [[mri_cc]] step to produce [[aseg.auto.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/aseg.auto_noCCseg.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Each voxel holds an integer label from the FreeSurfer [[color-lut]].
- **Typical size / shape:** 256 × 256 × 256; label range typically 0–255.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A volumetric label map where each voxel is assigned the integer ID of its predicted anatomical structure from the FreeSurfer Subcortical Look-Up Table ([[color-lut]]). Labels cover subcortical gray matter nuclei (thalamus, caudate, putamen, pallidum, hippocampus, amygdala, accumbens), ventricular CSF spaces, brainstem, cerebellum, and cortical white matter, but exclude the five corpus callosum sub-labels (251–255), which are absent at this stage.

## How It Is Created

### Producing tool

[[mri_ca_label]] — a Gaussian Classifier Atlas (GCA) labeling tool. Uses [[norm.mgz]] as the intensity image and `transforms/talairach.m3z` (non-linear atlas warp) to predict per-voxel labels via the GCA probabilistic model.

```bash
# Default invocation (recon-all line 3004–3027)
mri_ca_label \
  -relabel_unlikely 9 .3 \
  -prior 0.5 \
  -align \
  norm.mgz \
  transforms/talairach.m3z \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  aseg.auto_noCCseg.mgz
```

### Source reference

- **Write call:** [`mri_ca_label/mri_ca_label.cpp:1425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_label/mri_ca_label.cpp#L1425) — `MRIwrite(mri_labeled, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:3027`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3027)

### Pipeline stage

[[recon-all]] autorecon2, **CA Label** stage (`-calabel`). Touch sentinel: `touch/calabel.touch`.

### Inputs required

- [[norm.mgz]] — atlas-normalised intensity volume.
- `transforms/talairach.m3z` — non-linear GCA registration warp (from `mri_ca_register`).
- `$FREESURFER_HOME/average/*.gca` — Gaussian classifier atlas (environment dependency).

### Siblings (co-produced outputs)

None.

## How It Is Used

### Direct downstream consumers

- `seg2cc` / [[mri_cc]] — reads `aseg.auto_noCCseg.mgz` and adds corpus callosum parcellation to produce [[aseg.auto.mgz]].

### Downstream files derived from this one

- [[aseg.auto.mgz]] — same segmentation plus CC labels.
- [[aseg.presurf.mgz]] — downstream copy of aseg.auto.mgz, used during surface placement.
- [[aseg.mgz]] — the final user-facing segmentation.

## Alternative Names and Variants

### Aliases

When SynthSeg is used (`-synthseg` flag), `aseg.auto_noCCseg.mgz` may be a symlink to `synthseg.rca.mgz` instead of being produced by mri_ca_label (recon-all line 1644–1645).

## Related

- [[mgz]] — on-disk format specification.
- [[mri_ca_label]] — producer.
- [[color-lut]] — label-to-structure mapping.
- [[parcellation-schemes]] — overview of FreeSurfer parcellation atlases.
- [[aseg.auto.mgz]], [[aseg.presurf.mgz]], [[aseg.mgz]] — downstream successors.
- [[norm.mgz]] — intensity input.
- [[recon-all]] — pipeline context.

## References

- Source: `mri_ca_label/mri_ca_label.cpp:1425`; `scripts/recon-all` lines 3001–3040.
- [[subject-directory]] — lists this file in the `mri/` section.
