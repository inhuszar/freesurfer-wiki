---
title: "hemi.inflated.H"
type: file
fs_version: "8.2.0"
filename: "hemi.inflated.H"
aliases:
  - "lh.inflated.H"
  - "rh.inflated.H"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_curvature]]"
produced_in_stage: "autorecon3: CurvHK"
produced_at_source:
  - "[`mris_curvature/mris_curvature.cpp:406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_curvature/mris_curvature.cpp#L406)"
  - "[`scripts/recon-all:4128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4128)"
inputs:
  - "[[hemi.inflated]]"
siblings:
  - "[[hemi.inflated.K]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: CurvHK (disabled by default)"
editable: false
related:
  - "[[hemi.inflated]]"
  - "[[hemi.inflated.K]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.inflated.H

> [!file] Glossary entry
> `lh.inflated.H` / `rh.inflated.H` are per-vertex mean curvature (H) maps of the inflated surface ([[hemi.inflated]]), computed by `mris_curvature` with averaging and thresholding options in the CurvHK stage. The options (`-thresh .999 -n -a 5 -distances 10 10`) apply outlier clipping and multi-scale averaging, giving a smoothed curvature useful for visualisation and group analysis on the inflated template.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.inflated.H`, `surf/rh.inflated.H`
- **Format:** FreeSurfer binary curvature file. Values are smoothed mean curvature in mm⁻¹.

## How It Is Created

### Producing tool

`mris_curvature` with outlier thresholding, normalisation, averaging, and write flags applied to [[hemi.inflated]].

```bash
# CurvHK inflated invocation (recon-all line 4128)
mris_curvature -thresh .999 -n -a 5 -w -distances 10 10 $hemi.inflated
```

### Source reference

- **Write call:** [`mris_curvature/mris_curvature.cpp:406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_curvature/mris_curvature.cpp#L406) — `MRISwriteCurvature(mris, fname, curv_name)` for the `.H` output
- **Pipeline invocation:** [`scripts/recon-all:4128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4128)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **CurvHK** stage (`-curvHK`). Disabled by default. Touch sentinel: `touch/$hemi.inflate.H.K.touch`.

### Inputs required

- [[hemi.inflated]] — inflated surface geometry.

### Siblings (co-produced outputs)

- [[hemi.inflated.K]] — Gaussian curvature of inflated surface, produced in the same call.

## Related

- [[hemi.inflated]] — source surface.
- [[hemi.inflated.K]] — co-produced Gaussian curvature.
- [[hemi.white.preaparc.H]] — analogous map on white surface.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_curvature/mris_curvature.cpp:399–407`; `scripts/recon-all` lines 4126–4141.
- [[subject-directory]] — lists this file in the `surf/` section.
