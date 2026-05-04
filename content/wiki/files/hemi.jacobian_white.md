---
title: "hemi.jacobian_white"
type: file
fs_version: "8.2.0"
filename: "hemi.jacobian_white"
aliases:
  - "lh.jacobian_white"
  - "rh.jacobian_white"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_jacobian]]"
produced_in_stage: "autorecon3: JacobianWhite"
produced_at_source:
  - "[`mris_jacobian/mris_jacobian.cpp:113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_jacobian/mris_jacobian.cpp#L113)"
  - "[`scripts/recon-all:4245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4245)"
inputs:
  - "[[hemi.white.preaparc]]"
  - "[[hemi.sphere.reg]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: JacobianWhite (run by default)"
editable: false
related:
  - "[[hemi.white.preaparc]]"
  - "[[hemi.sphere.reg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.jacobian_white

> [!file] Glossary entry
> `lh.jacobian_white` / `rh.jacobian_white` store per-vertex Jacobian values of the mapping from the white surface ([[hemi.white.preaparc]]) to the registered sphere ([[hemi.sphere.reg]]), computed by `mris_jacobian`. The Jacobian captures local areal expansion/contraction during spherical registration — values near 1 indicate minimal distortion; values above or below 1 indicate expansion or compression. Used in surface-based registration quality assessment and group-level analyses.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.jacobian_white`, `surf/rh.jacobian_white`
- **Format:** FreeSurfer binary curvature file (same format as [[hemi.curv]]). Values are dimensionless (area ratio).

## How It Is Created

### Producing tool

`mris_jacobian` — reads [[hemi.white.preaparc]] and [[hemi.sphere.reg]], computes the local areal Jacobian of the registration, and writes the result.

```bash
# JacobianWhite invocation (recon-all line 4245)
mris_jacobian \
  ../surf/$hemi.white.preaparc \
  ../surf/$hemi.sphere.reg \
  ../surf/$hemi.jacobian_white
```

### Source reference

- **Write call:** [`mris_jacobian/mris_jacobian.cpp:113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_jacobian/mris_jacobian.cpp#L113) — `MRISwriteCurvature(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:4245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4245)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **JacobianWhite** stage (`-jacobian_white`). Touch sentinel: `touch/$hemi.jacobian_white.touch`.

### Inputs required

- [[hemi.white.preaparc]] — white surface geometry.
- [[hemi.sphere.reg]] — registered spherical surface.

## Related

- [[hemi.white.preaparc]] — source surface.
- [[hemi.sphere.reg]] — registered sphere.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_jacobian/mris_jacobian.cpp:113`; `scripts/recon-all` lines 4228–4265.
- [[subject-directory]] — lists this file in the `surf/` section.
