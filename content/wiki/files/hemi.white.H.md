---
title: "hemi.white.H"
type: file
fs_version: "8.2.0"
filename: "hemi.white.H"
aliases:
  - "lh.white.H"
  - "rh.white.H"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "symlink → hemi.white.preaparc.H"
binary: true
produced_by:
  - "[[wiki/pipelines/recon-all|recon-all]]"
produced_in_stage: "autorecon3: CurvHK"
produced_at_source:
  - "[`scripts/recon-all:4105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4105)"
inputs:
  - "[[hemi.white.preaparc.H]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: CurvHK (disabled by default)"
editable: false
related:
  - "[[hemi.white.preaparc.H]]"
  - "[[hemi.white.preaparc]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.white.H

> [!file] Glossary entry
> `lh.white.H` / `rh.white.H` are symbolic links to [[hemi.white.preaparc.H]], created by [[wiki/pipelines/recon-all|recon-all]] immediately after the CurvHK stage so that tools expecting the canonical `?h.white.H` name can find the mean curvature map of the white surface.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.white.H` → `lh.white.preaparc.H`
- **Format:** Symlink; content is a FreeSurfer binary curvature file (see [[hemi.white.preaparc.H]]).

## How It Is Created

```bash
# CurvHK symlink creation (recon-all lines 4104–4122)
rm -f $hemi.white.H
ln -s $hemi.white.preaparc.H $hemi.white.H
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:4105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4105)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **CurvHK** stage. Created directly after `mris_curvature -w` writes [[hemi.white.preaparc.H]].

## Related

- [[hemi.white.preaparc.H]] — symlink target (actual data).
- [[hemi.white.K]] — co-created symlink for Gaussian curvature.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 4103–4122.
- [[subject-directory]] — lists this file in the `surf/` section.
