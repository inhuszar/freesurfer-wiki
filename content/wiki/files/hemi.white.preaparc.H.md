---
title: "hemi.white.preaparc.H"
type: file
fs_version: "8.2.0"
filename: "hemi.white.preaparc.H"
aliases:
  - "lh.white.preaparc.H"
  - "rh.white.preaparc.H"
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
  - "[`scripts/recon-all:4088`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4088)"
inputs:
  - "[[hemi.white.preaparc]]"
siblings:
  - "[[hemi.white.preaparc.K]]"
consumed_by: []
downstream_files:
  - "[[hemi.white.H]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: CurvHK (disabled by default, enabled with `-all` or `-curvHK`)"
editable: false
related:
  - "[[hemi.white.preaparc]]"
  - "[[hemi.white.H]]"
  - "[[hemi.white.preaparc.K]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.white.preaparc.H

> [!file] Glossary entry
> `lh.white.preaparc.H` / `rh.white.preaparc.H` are per-vertex mean curvature (H) maps of the [[hemi.white.preaparc]] surface, computed by `mris_curvature -w` in the CurvHK stage. After creation, [[recon-all]] makes [[hemi.white.H]] a symlink pointing to this file so that downstream consumers find the canonical `?h.white.H` name.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.white.preaparc.H`, `surf/rh.white.preaparc.H`
- **Format:** FreeSurfer binary curvature file (same format as [[hemi.curv]]). Values are mean curvature in mm⁻¹.

## How It Is Created

### Producing tool

`mris_curvature` with the `-w` flag — reads [[hemi.white.preaparc]] and writes both the `.H` (mean curvature) and `.K` (Gaussian curvature) outputs in one pass.

```bash
# CurvHK invocation (recon-all line 4088)
mris_curvature -w $hemi.white.preaparc
```

Output filenames are derived by `MRISwriteCurvature_getfilename` which prepends the hemisphere and path from the surface's `fname` attribute.

### Source reference

- **Write call:** [`mris_curvature/mris_curvature.cpp:406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_curvature/mris_curvature.cpp#L406) — `MRISwriteCurvature(mris, fname, curv_name)` for the `.H` file
- **Pipeline invocation:** [`scripts/recon-all:4088`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4088)

### Pipeline stage

[[recon-all]] autorecon3, **CurvHK** stage (`-curvHK`). Disabled by default; enabled when running with `-all` or the explicit flag. Touch sentinel: `touch/$hemi.white.H.K.touch`.

### Inputs required

- [[hemi.white.preaparc]] — pre-parcellation white surface geometry.

### Siblings (co-produced outputs)

- [[hemi.white.preaparc.K]] — Gaussian curvature, produced in the same `mris_curvature -w` call.

## How It Is Used

A symlink [[hemi.white.H]] is created pointing to this file immediately after production:

```bash
ln -s $hemi.white.preaparc.H $hemi.white.H
```

This allows tools expecting `?h.white.H` to find the file under the canonical name.

## Related

- [[hemi.white.preaparc]] — source surface.
- [[hemi.white.H]] — symlink alias.
- [[hemi.white.preaparc.K]] — co-produced Gaussian curvature.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_curvature/mris_curvature.cpp:399–407`; `scripts/recon-all` lines 4086–4124.
- [[subject-directory]] — lists this file in the `surf/` section.
