---
title: "hemi.aparc.a2009s.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.a2009s.stats"
aliases:
  - "lh.aparc.a2009s.stats"
  - "rh.aparc.a2009s.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mris_anatomical_stats format)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: ParcStats2"
produced_at_source:
  - "[`scripts/recon-all:5236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5236)"
inputs:
  - "[[hemi.aparc.a2009s.annot]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.cortex.label]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "Destrieux atlas cortical morphometry"
editable: false
related:
  - "[[hemi.aparc.a2009s.annot]]"
  - "[[hemi.aparc.stats]]"
  - "[[mris_anatomical_stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.aparc.a2009s.stats

> [!file] Glossary entry
> `lh.aparc.a2009s.stats` / `rh.aparc.a2009s.stats` are per-region morphometric statistics for the Destrieux 2009 atlas (74 regions), produced by [[mris_anatomical_stats]] in the ParcStats2 stage using [[hemi.aparc.a2009s.annot]]. Same format and columns as [[hemi.aparc.stats]] but with 74 data rows.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.aparc.a2009s.stats`, `stats/rh.aparc.a2009s.stats`
- **Format:** Same plain-text mris_anatomical_stats format as [[hemi.aparc.stats]].

## How It Is Created

```bash
# ParcStats2 invocation (recon-all ~line 5236)
mris_anatomical_stats -mgz \
  -cortex ../label/$hemi.cortex.label \
  -f ../stats/$hemi.aparc.a2009s.stats \
  -b -a ../label/$hemi.aparc.a2009s.annot \
  -c ../label/aparc.annot.a2009s.ctab \
  $subjid $hemi white
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5236)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **ParcStats2** stage (`-parcstats2`).

## Related

- [[hemi.aparc.a2009s.annot]] — parcellation source.
- [[hemi.aparc.stats]] — Desikan-Killiany version.
- [[mris_anatomical_stats]] — producer.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5213–5255.
- [[subject-directory]] — lists this file in the `stats/` section.
