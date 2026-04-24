---
title: "hemi.aparc.DKTatlas.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.DKTatlas.stats"
aliases:
  - "lh.aparc.DKTatlas.stats"
  - "rh.aparc.DKTatlas.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mris_anatomical_stats format)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: ParcStats3"
produced_at_source:
  - "[`scripts/recon-all:5277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5277)"
inputs:
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.cortex.label]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "DKT atlas cortical morphometry"
editable: false
related:
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[hemi.aparc.stats]]"
  - "[[mris_anatomical_stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.aparc.DKTatlas.stats

> [!file] Glossary entry
> `lh.aparc.DKTatlas.stats` / `rh.aparc.DKTatlas.stats` are per-region morphometric statistics for the Mindboggle DKT atlas (31 regions), produced by [[mris_anatomical_stats]] in the ParcStats3 stage using [[hemi.aparc.DKTatlas.annot]]. Same format as [[hemi.aparc.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.aparc.DKTatlas.stats`, `stats/rh.aparc.DKTatlas.stats`
- **Format:** Same plain-text mris_anatomical_stats format as [[hemi.aparc.stats]].

## How It Is Created

```bash
# ParcStats3 invocation (recon-all ~line 5277)
mris_anatomical_stats -mgz \
  -cortex ../label/$hemi.cortex.label \
  -f ../stats/$hemi.aparc.DKTatlas.stats \
  -b -a ../label/$hemi.aparc.DKTatlas.annot \
  -c ../label/aparc.annot.DKTatlas.ctab \
  $subjid $hemi white
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5277)

### Pipeline stage

[[recon-all]] autorecon3, **ParcStats3** stage (`-parcstats3`).

## Related

- [[hemi.aparc.DKTatlas.annot]] — parcellation source.
- [[hemi.aparc.stats]] — Desikan-Killiany version.
- [[mris_anatomical_stats]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5255–5295.
- [[subject-directory]] — lists this file in the `stats/` section.
