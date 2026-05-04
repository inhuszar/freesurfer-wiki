---
title: "norm.mgz"
type: file
fs_version: "8.2.0"
filename: "norm.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_ca_normalize]]"
produced_in_stage: "autorecon2: CA Normalize"
produced_at_source:
  - "[`mri_ca_normalize/mri_ca_normalize.cpp:646`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_normalize/mri_ca_normalize.cpp#L646)"
  - "[`scripts/recon-all:2742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2742)"
inputs:
  - "[[nu.mgz]]"
  - "[[talairach.lta]]"
  - "[[ctrl_pts.mgz]]"
siblings:
  - "[[ctrl_pts.mgz]]"
consumed_by:
  - "[[mri_ca_register]]"
  - "[[mri_normalize]]"
  - "[[mri_pretess]]"
downstream_files:
  - "[[brain.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: CA Reg, Intensity Normalization2"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[nu.mgz]]"
  - "[[T1.mgz]]"
  - "[[ctrl_pts.mgz]]"
  - "[[talairach.lta]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# norm.mgz

> [!file] Glossary entry
> `norm.mgz` is the atlas-guided canonically intensity-normalised T1 volume, produced from [[nu.mgz]] by [[mri_ca_normalize]] in autorecon2. Unlike [[T1.mgz]] (which normalises using local WM histogram statistics), `norm.mgz` uses the GCA atlas aligned via [[talairach.lta]] to robustly set the WM intensity target. It feeds the Canonical Registration step (`mri_ca_register`) and the second intensity normalisation that creates [[brain.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/norm.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic. Voxel type is typically `UCHAR` (WM ≈ 110) or `FLOAT`.
- **Typical size / shape:** 256 × 256 × 256, ~16 MB gzipped.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

Each voxel holds an atlas-calibrated T1 intensity, normalised to the GCA white matter target (typically 110 on the `UCHAR` 0–255 scale). Compared to [[T1.mgz]], `norm.mgz` uses the Gaussian classifier atlas for robustness against local WM inhomogeneity or pathology. The spatial grid and RAS frame are identical to [[orig.mgz]]. Control points used during normalisation are saved to [[ctrl_pts.mgz]].

## How It Is Created

### Producing tool

[[mri_ca_normalize]] — reads [[nu.mgz]], uses [[talairach.lta]] to align to the GCA atlas, estimates normalisation control points from atlas-predicted WM regions, and writes the normalised volume.

```bash
# Default invocation (recon-all line 2718–2742)
mri_ca_normalize \
  -c ctrl_pts.mgz \
  -mask brainmask.mgz \
  nu.mgz \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  transforms/talairach.lta \
  norm.mgz
```

### Source reference

- **Write call (norm.mgz):** [`mri_ca_normalize/mri_ca_normalize.cpp:646`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_normalize/mri_ca_normalize.cpp#L646) — `MRIwrite(mri_norm, fname)`
- **Write call (ctrl_pts):** [`mri_ca_normalize/mri_ca_normalize.cpp:673`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_normalize/mri_ca_normalize.cpp#L673) — `MRIwrite(mri_ctrl, ctrl_point_fname)`
- **Pipeline invocation:** [`scripts/recon-all:2742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2742)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **CA Normalize** stage (`-canorm`). Touch sentinel: `touch/ca_normalize.touch`.

### Inputs required

- [[nu.mgz]] — bias-corrected T1 input.
- [[talairach.lta]] — GCA-based linear transform to atlas space (from mri_em_register).
- [[brainmask.mgz]] — brain mask applied during normalisation.
- `$FREESURFER_HOME/average/*.gca` — Gaussian classifier atlas (environment dependency).

### Siblings (co-produced outputs)

- [[ctrl_pts.mgz]] — the control points volume derived from the atlas WM estimate during the same normalisation run.

## How It Is Used

### Direct downstream consumers

- [[mri_ca_register]] — reads `norm.mgz` as input for non-linear GCA registration (creates `talairach.m3z`).
- [[mri_normalize]] (Intensity Normalization2) — reads `norm.mgz` with `brainmask.mgz` to produce [[brain.mgz]]; command: `mri_normalize norm.mgz brain.mgz -mask brainmask.mgz`.
- [[mri_pretess]] — uses `norm.mgz` as the reference intensity volume for pretessellation of the WM fill volume.

### Downstream files derived from this one

- [[brain.mgz]] — masked, normalised volume for surface placement (via second mri_normalize pass).
- `transforms/talairach.m3z` — non-linear GCA warp (from mri_ca_register, using norm.mgz as input).

## Alternative Names and Variants

### Variants

When `-noaseg` or `-nosubcortseg` is passed, `norm.mgz` is not created and `brainmask.mgz` is used directly in its place (recon-all line 3141–3143).

## Related

- [[mgz]] — on-disk format specification.
- [[mri_ca_normalize]] — producer.
- [[nu.mgz]] — input.
- [[T1.mgz]] — earlier (non-atlas) normalisation; different pipeline role.
- [[ctrl_pts.mgz]] — co-produced control points.
- [[talairach.lta]] — atlas transform input.
- [[brain.mgz]] — next downstream normalised volume.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_ca_normalize/mri_ca_normalize.cpp:646`; `scripts/recon-all` lines 2696–2749.
- [[subject-directory]] — lists this file in the `mri/` section.
