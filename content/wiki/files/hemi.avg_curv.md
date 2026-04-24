---
title: "hemi.avg_curv"
type: file
fs_version: "8.2.0"
filename: "hemi.avg_curv"
aliases:
  - "lh.avg_curv"
  - "rh.avg_curv"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mrisp_paint]]"
produced_in_stage: "autorecon3: AvgCurv"
produced_at_source:
  - "[`scripts/recon-all:4315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4315)"
inputs:
  - "[[hemi.sphere.reg]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: AvgCurv (run by default)"
editable: false
related:
  - "[[hemi.sphere.reg]]"
  - "[[hemi.curv]]"
  - "[[fsaverage]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.avg_curv

> [!file] Glossary entry
> `lh.avg_curv` / `rh.avg_curv` are per-vertex average curvature maps painted from the fsaverage atlas onto the subject's registered sphere ([[hemi.sphere.reg]]), produced by `mrisp_paint` in the AvgCurv stage. They represent the expected (atlas-average) curvature at each vertex position, used for display and visualisation in FreeView (shown as the characteristic folding pattern when no other overlay is loaded).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.avg_curv`, `surf/rh.avg_curv`
- **Format:** FreeSurfer binary curvature file (same format as [[hemi.curv]]).

## How It Is Created

### Producing tool

`mrisp_paint` with `-a 5` — paints atlas curvature (frame 6 from the `.tif` atlas file, smoothed 5 iterations) onto the subject surface via [[hemi.sphere.reg]].

```bash
# AvgCurv invocation (recon-all line 4315)
mrisp_paint -a 5 \
  "$AvgCurvTif#6" \
  ../surf/$hemi.sphere.reg \
  ../surf/$hemi.avg_curv
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:4315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4315)

### Pipeline stage

[[recon-all]] autorecon3, **AvgCurv** stage (`-avgcurv`). Touch sentinel: `touch/$hemi.avgcurv.touch`.

### Inputs required

- [[hemi.sphere.reg]] — registered sphere for atlas look-up.
- fsaverage curvature atlas `.tif` file (from `$FREESURFER_HOME/average/`).

## How It Is Used

Primarily used for display in FreeView as an underlay showing atlas-based folding patterns. Not consumed by any standard downstream computation step.

## Related

- [[hemi.sphere.reg]] — registration used for atlas paint.
- [[hemi.curv]] — subject's own curvature.
- [[fsaverage]] — atlas source.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 4304–4335.
- [[subject-directory]] — lists this file in the `surf/` section.
