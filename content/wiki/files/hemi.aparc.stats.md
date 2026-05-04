---
title: "hemi.aparc.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.stats"
aliases:
  - "lh.aparc.stats"
  - "rh.aparc.stats"
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
  - "[[aseg.mgz]]"
siblings:
  - "[[hemi.aparc.pial.stats]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "group analysis; the main per-region morphometric output"
editable: false
related:
  - "[[hemi.aparc.annot]]"
  - "[[mris_anatomical_stats]]"
  - "[[hemi.aparc.a2009s.stats]]"
  - "[[hemi.aparc.DKTatlas.stats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.aparc.stats

> [!file] Glossary entry
> `lh.aparc.stats` / `rh.aparc.stats` are plain-text statistics files reporting per-region morphometric measures for the Desikan-Killiany parcellation. Produced by [[mris_anatomical_stats]] from [[hemi.aparc.annot]] and the white/pial surfaces, each file contains one row per cortical region with columns for surface area (mm²), gray matter volume (mm³), mean thickness (mm), surface curvature, and folding index. These are the primary output files for cortical thickness and surface area group analyses.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.aparc.stats`, `stats/rh.aparc.stats`
- **Format:** Plain text — comment header lines (starting with `#`) followed by a data table with columns: `StructName NumVert SurfArea GrayVol ThickAvg ThickStd MeanCurv GausCurv FoldInd CurvInd`.
- **Typical size:** ~5 KB; 34 data rows (one per Desikan-Killiany region).

## What It Contains

Per-region morphometric statistics for the Desikan-Killiany atlas, including:
- `NumVert` — number of vertices in the region
- `SurfArea` — white surface area (mm²)
- `GrayVol` — cortical volume (mm³, TH3 method)
- `ThickAvg` / `ThickStd` — mean and SD cortical thickness
- `MeanCurv` — mean curvature of the white surface
- `FoldInd` — folding index
- Global summary statistics in the header (total cortical area, mean thickness, etc.)

## How It Is Created

### Producing tool

[[mris_anatomical_stats]] — reads [[hemi.aparc.annot]], white and pial surfaces, [[hemi.thickness]], and [[hemi.cortex.label]] to compute per-region statistics.

```bash
# ParcStats invocation (recon-all ~line 5192)
mris_anatomical_stats -mgz \
  -cortex ../label/$hemi.cortex.label \
  -f ../stats/$hemi.aparc.stats \
  -b -a ../label/$hemi.aparc.annot \
  -c ../label/aparc.annot.ctab \
  $subjid $hemi white
```

A companion call computes pial-surface stats to [[hemi.aparc.pial.stats]].

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5192)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **ParcStats** stage (`-parcstats`). Touch sentinel: `touch/$hemi.aparcstats.touch`.

### Inputs required

- [[hemi.aparc.annot]] — Desikan-Killiany parcellation.
- [[hemi.white]], [[hemi.pial]] — surfaces.
- [[hemi.thickness]] — cortical thickness map.
- [[hemi.cortex.label]] — cortex mask.
- [[aseg.mgz]] — segmentation for volume computation.

### Siblings (co-produced outputs)

- [[hemi.aparc.pial.stats]] — pial-surface-based stats (same invocation loop with `surfname=pial`).

## Related

- [[hemi.aparc.annot]] — parcellation source.
- [[mris_anatomical_stats]] — producer.
- [[hemi.aparc.a2009s.stats]] — Destrieux stats.
- [[hemi.aparc.DKTatlas.stats]] — DKT stats.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5173–5210.
- [[subject-directory]] — lists this file in the `stats/` section.
