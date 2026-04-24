---
title: "hemi.inflated.K"
type: file
fs_version: "8.2.0"
filename: "hemi.inflated.K"
aliases:
  - "lh.inflated.K"
  - "rh.inflated.K"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_curvature]]"
produced_in_stage: "autorecon3: CurvHK"
produced_at_source:
  - "[`mris_curvature/mris_curvature.cpp:387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_curvature/mris_curvature.cpp#L387)"
  - "[`scripts/recon-all:4128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4128)"
inputs:
  - "[[hemi.inflated]]"
siblings:
  - "[[hemi.inflated.H]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: CurvHK (disabled by default)"
editable: false
related:
  - "[[hemi.inflated]]"
  - "[[hemi.inflated.H]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.inflated.K

> [!file] Glossary entry
> `lh.inflated.K` / `rh.inflated.K` are per-vertex Gaussian curvature (K) maps of the inflated surface ([[hemi.inflated]]), produced alongside [[hemi.inflated.H]] in the same `mris_curvature` call during the CurvHK stage.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.inflated.K`, `surf/rh.inflated.K`
- **Format:** FreeSurfer binary curvature file. Values are smoothed Gaussian curvature in mm⁻².

## How It Is Created

### Producing tool

`mris_curvature` with `-thresh .999 -n -a 5 -w -distances 10 10` applied to [[hemi.inflated]].

```bash
# CurvHK inflated invocation (recon-all line 4128)
mris_curvature -thresh .999 -n -a 5 -w -distances 10 10 $hemi.inflated
```

### Source reference

- **Write call:** [`mris_curvature/mris_curvature.cpp:387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_curvature/mris_curvature.cpp#L387) — `MRISwriteCurvature(mris, fname, curv_name)` for the `.K` output
- **Pipeline invocation:** [`scripts/recon-all:4128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4128)

### Pipeline stage

[[recon-all]] autorecon3, **CurvHK** stage. Touch sentinel: `touch/$hemi.inflate.H.K.touch`.

### Inputs required

- [[hemi.inflated]] — inflated surface geometry.

### Siblings (co-produced outputs)

- [[hemi.inflated.H]] — mean curvature, produced in the same call.

## Related

- [[hemi.inflated]] — source surface.
- [[hemi.inflated.H]] — co-produced mean curvature.
- [[hemi.white.preaparc.K]] — analogous map on white surface.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_curvature/mris_curvature.cpp:375–388`; `scripts/recon-all` lines 4126–4141.
- [[subject-directory]] — lists this file in the `surf/` section.
