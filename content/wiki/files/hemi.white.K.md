---
title: "hemi.white.K"
type: file
fs_version: "8.2.0"
filename: "hemi.white.K"
aliases:
  - "lh.white.K"
  - "rh.white.K"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "symlink → hemi.white.preaparc.K"
binary: true
produced_by:
  - "[[recon-all]]"
produced_in_stage: "autorecon3: CurvHK"
produced_at_source:
  - "[`scripts/recon-all:4105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4105)"
inputs:
  - "[[hemi.white.preaparc.K]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: CurvHK (disabled by default)"
editable: false
related:
  - "[[hemi.white.preaparc.K]]"
  - "[[hemi.white.preaparc]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.white.K

> [!file] Glossary entry
> `lh.white.K` / `rh.white.K` are symbolic links to [[hemi.white.preaparc.K]], created by [[recon-all]] immediately after the CurvHK stage so that tools expecting the canonical `?h.white.K` name can find the Gaussian curvature map of the white surface.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.white.K` → `lh.white.preaparc.K`
- **Format:** Symlink; content is a FreeSurfer binary curvature file (see [[hemi.white.preaparc.K]]).

## How It Is Created

```bash
# CurvHK symlink creation (recon-all lines 4104–4122)
rm -f $hemi.white.K
ln -s $hemi.white.preaparc.K $hemi.white.K
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:4105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4105)

### Pipeline stage

[[recon-all]] autorecon3, **CurvHK** stage. Created directly after `mris_curvature -w` writes [[hemi.white.preaparc.K]].

## Related

- [[hemi.white.preaparc.K]] — symlink target (actual data).
- [[hemi.white.H]] — co-created symlink for mean curvature.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 4103–4122.
- [[subject-directory]] — lists this file in the `surf/` section.
