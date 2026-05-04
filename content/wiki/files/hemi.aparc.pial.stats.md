---
title: "hemi.aparc.pial.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.pial.stats"
aliases:
  - "lh.aparc.pial.stats"
  - "rh.aparc.pial.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mris_anatomical_stats format)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: ParcStats"
produced_at_source:
  - "[`scripts/recon-all:5192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5192)"
inputs:
  - "[[hemi.aparc.annot]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.thickness]]"
  - "[[hemi.cortex.label]]"
siblings:
  - "[[hemi.aparc.stats]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "pial surface area analysis"
editable: false
related:
  - "[[hemi.aparc.stats]]"
  - "[[hemi.pial]]"
  - "[[mris_anatomical_stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.aparc.pial.stats

> [!file] Glossary entry
> `lh.aparc.pial.stats` / `rh.aparc.pial.stats` are per-region morphometric statistics files computed from the pial surface rather than the white surface, produced in the same [[mris_anatomical_stats]] loop as [[hemi.aparc.stats]]. The primary difference is that surface area and curvature statistics reflect the pial surface geometry. Pial area is often larger than white area due to cortical folding.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.aparc.pial.stats`, `stats/rh.aparc.pial.stats`
- **Format:** Same plain-text mris_anatomical_stats format as [[hemi.aparc.stats]].

## How It Is Created

### Producing tool

[[mris_anatomical_stats]] — same invocation as [[hemi.aparc.stats]] but with `surfname=pial`.

```bash
# ParcStats pial iteration (recon-all ~line 5192)
mris_anatomical_stats -mgz \
  -cortex ../label/$hemi.cortex.label \
  -f ../stats/$hemi.aparc.pial.stats \
  -b -a ../label/$hemi.aparc.annot \
  -c ../label/aparc.annot.ctab \
  $subjid $hemi pial
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5192)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **ParcStats** stage (`-parcstats`), pial iteration.

### Siblings (co-produced outputs)

- [[hemi.aparc.stats]] — white-surface stats produced in the same loop.

## Related

- [[hemi.aparc.stats]] — white surface counterpart.
- [[hemi.pial]] — source surface.
- [[mris_anatomical_stats]] — producer.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5173–5210.
- [[subject-directory]] — lists this file in the `stats/` section.
