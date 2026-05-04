---
title: "hemi.white.preaparc.K"
type: file
fs_version: "8.2.0"
filename: "hemi.white.preaparc.K"
aliases:
  - "lh.white.preaparc.K"
  - "rh.white.preaparc.K"
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
  - "[`scripts/recon-all:4088`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4088)"
inputs:
  - "[[hemi.white.preaparc]]"
siblings:
  - "[[hemi.white.preaparc.H]]"
consumed_by: []
downstream_files:
  - "[[hemi.white.K]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: CurvHK (disabled by default)"
editable: false
related:
  - "[[hemi.white.preaparc]]"
  - "[[hemi.white.K]]"
  - "[[hemi.white.preaparc.H]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.white.preaparc.K

> [!file] Glossary entry
> `lh.white.preaparc.K` / `rh.white.preaparc.K` are per-vertex Gaussian curvature (K) maps of the [[hemi.white.preaparc]] surface, computed by `mris_curvature -w` in the CurvHK stage. After creation, [[wiki/pipelines/recon-all|recon-all]] makes [[hemi.white.K]] a symlink pointing to this file. Gaussian curvature is negative in saddle regions, positive on gyral crests and sulcal depths.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.white.preaparc.K`, `surf/rh.white.preaparc.K`
- **Format:** FreeSurfer binary curvature file. Values are Gaussian curvature in mm⁻².

## How It Is Created

### Producing tool

`mris_curvature` with the `-w` flag — same invocation that produces [[hemi.white.preaparc.H]]. The `.K` file is written first in the output loop.

```bash
# CurvHK invocation (recon-all line 4088)
mris_curvature -w $hemi.white.preaparc
```

### Source reference

- **Write call:** [`mris_curvature/mris_curvature.cpp:387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_curvature/mris_curvature.cpp#L387) — `MRISwriteCurvature(mris, fname, curv_name)` for the `.K` file
- **Pipeline invocation:** [`scripts/recon-all:4088`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4088)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **CurvHK** stage (`-curvHK`). Disabled by default. Touch sentinel: `touch/$hemi.white.H.K.touch`.

### Inputs required

- [[hemi.white.preaparc]] — pre-parcellation white surface geometry.

### Siblings (co-produced outputs)

- [[hemi.white.preaparc.H]] — mean curvature, produced in the same call.

## How It Is Used

A symlink [[hemi.white.K]] is created pointing to this file immediately after production.

## Related

- [[hemi.white.preaparc]] — source surface.
- [[hemi.white.K]] — symlink alias.
- [[hemi.white.preaparc.H]] — co-produced mean curvature.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_curvature/mris_curvature.cpp:375–388`; `scripts/recon-all` lines 4086–4124.
- [[subject-directory]] — lists this file in the `surf/` section.
