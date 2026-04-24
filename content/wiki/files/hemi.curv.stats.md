---
title: "hemi.curv.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.curv.stats"
aliases:
  - "lh.curv.stats"
  - "rh.curv.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mris_curvature_stats format)"
binary: false
produced_by:
  - "[[mris_curvature_stats]]"
produced_in_stage: "autorecon3: CurvStats"
produced_at_source:
  - "[`scripts/recon-all:4834`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4834)"
inputs:
  - "[[hemi.smoothwm]]"
  - "[[hemi.curv]]"
  - "[[hemi.sulc]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: CurvStats (run by default)"
editable: false
related:
  - "[[hemi.curv]]"
  - "[[hemi.sulc]]"
  - "[[mris_curvature_stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.curv.stats

> [!file] Glossary entry
> `lh.curv.stats` / `rh.curv.stats` are plain-text statistics files reporting per-hemisphere and per-region mean curvature and sulcal depth statistics, produced by `mris_curvature_stats` in the CurvStats stage. The `-G` flag causes writing of smoothed curvature files (used internally), and `--writeCurvatureFiles` writes curvature values back to the surface. Output contains mean curvature (`curv`) and sulcal depth (`sulc`) statistics per cortical region.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.curv.stats`, `stats/rh.curv.stats`
- **Format:** Plain text — mean curvature and sulcal depth statistics per region.

## How It Is Created

### Producing tool

`mris_curvature_stats` — reads [[hemi.smoothwm]] and the curvature maps ([[hemi.curv]], [[hemi.sulc]]).

```bash
# CurvStats invocation (recon-all line 4834)
mris_curvature_stats \
  -m --writeCurvatureFiles -G \
  -o ../stats/$hemi.curv.stats \
  -F smoothwm \
  $subjid $hemi curv sulc
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:4834`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4834)

### Pipeline stage

[[recon-all]] autorecon3, **CurvStats** stage (`-curvstats`). Touch sentinel: `touch/$hemi.curvstats.touch`.

### Inputs required

- [[hemi.smoothwm]] — reference surface.
- [[hemi.curv]] — mean curvature map.
- [[hemi.sulc]] — sulcal depth map.

## Related

- [[hemi.curv]], [[hemi.sulc]] — input curvature maps.
- [[mris_curvature_stats]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 4825–4845.
- [[subject-directory]] — lists this file in the `stats/` section.
