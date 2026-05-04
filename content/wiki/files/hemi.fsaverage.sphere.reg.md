---
title: "hemi.fsaverage.sphere.reg"
type: file
fs_version: "8.2.0"
filename: "hemi.fsaverage.sphere.reg"
aliases:
  - "lh.fsaverage.sphere.reg"
  - "rh.fsaverage.sphere.reg"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]] (symlink)"
binary: true
produced_by:
  - "[[mris_register]]"
produced_in_stage: "autorecon3: SurfReg"
produced_at_source:
  - "[`scripts/rca-surfreg:127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L127)"
inputs:
  - "[[hemi.sphere.reg]]"
siblings:
  - "[[hemi.sphere.reg]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for: []
editable: false
related:
  - "[[hemi.sphere.reg]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.fsaverage.sphere.reg

> [!file] Glossary entry
> `lh.fsaverage.sphere.reg` / `rh.fsaverage.sphere.reg` are symbolic links that point to [[hemi.sphere.reg]]. They are created by `rca-surfreg` immediately after [[mris_register]] writes `hemi.sphere.reg`. The symlink provides a named alias that makes explicit which atlas (`fsaverage`) the registration targets. No additional computation is performed; the surface data is identical to [[hemi.sphere.reg]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.fsaverage.sphere.reg`, `surf/rh.fsaverage.sphere.reg`
- **Format:** Symbolic link → `hemi.sphere.reg` ([[surface-format]] binary triangular surface).

## What It Contains

Nothing additional — the file is a symlink to [[hemi.sphere.reg]]. Reading it returns the registered sphere surface data.

## How It Is Created

```bash
# rca-surfreg ~line 127
ln -sf $hemi.sphere.reg $hemi.fsaverage.sphere.reg
```

### Source reference

- **Pipeline invocation:** [`scripts/rca-surfreg:127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L127)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **SurfReg** stage (`-surfreg`), co-produced with [[hemi.sphere.reg]].

## Related

- [[hemi.sphere.reg]] — the actual registered surface file this links to.
- [[fsaverage]] — the atlas to which registration was performed.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/rca-surfreg` lines 125–130.
- [[subject-directory]] — lists this file in the `surf/` section.
