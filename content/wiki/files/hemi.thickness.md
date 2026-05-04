---
title: "hemi.thickness"
type: file
fs_version: "8.2.0"
filename: "hemi.thickness"
aliases:
  - "lh.thickness"
  - "rh.thickness"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon3: Thickness"
produced_at_source:
  - "[`mris_make_surfaces/mris_place_surface.cpp:1488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1488)"
  - "[`scripts/recon-all:4785`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4785)"
inputs:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings: []
consumed_by:
  - "[[mris_anatomical_stats]]"
  - "[[mris_compute_parc_overlap]]"
  - "[[mris_thickness_diff]]"
downstream_files:
  - "[[hemi.aparc.stats]]"
  - "[[hemi.w-g.pct.mgh]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Stats"
optional_for: []
editable: false
related:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.volume]]"
  - "[[mris_place_surface]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.thickness

> [!file] Glossary entry
> `lh.thickness` / `rh.thickness` store per-vertex cortical thickness values in mm, computed by [[mris_place_surface]] with `--thickness` from [[hemi.white]] and [[hemi.pial]]. Each vertex value is the closest-point distance from the white surface vertex to the pial surface, capped at 20 mm and with 5 neighbourhood-averaging iterations. Cortical thickness is the most widely-used morphometric output of recon-all and is reported per region in [[hemi.aparc.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.thickness`, `surf/rh.thickness`
- **Format:** FreeSurfer binary curvature file (header + float32 per vertex). Values are in mm (non-negative; zero at non-cortical vertices).
- **Typical range:** 0–6 mm in healthy cortex.

## What It Contains

Per-vertex cortical thickness: the closest-point distance from each white surface vertex to the pial surface, averaged over a 5-ring neighbourhood. Non-cortical vertices (medial wall) have thickness = 0.

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--thickness` — reads [[hemi.white]] and [[hemi.pial]], computes `MRISmeasureCorticalThickness` with `nbhd_size=20` and `max_thickness=5`, and writes the result.

```bash
# Thickness invocation (recon-all line 4785)
mris_place_surface --thickness \
  ../surf/$hemi.white \
  ../surf/$hemi.pial \
  20 5 \
  ../surf/$hemi.thickness
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:1488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1488) — `MRISwriteCurvature(surf, pargv[4])`
- **Pipeline invocation:** [`scripts/recon-all:4785`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4785)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **Thickness** stage, after final pial placement.

### Inputs required

- [[hemi.white]] — white matter surface.
- [[hemi.pial]] — pial surface.

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — reports mean thickness per parcellation region in [[hemi.aparc.stats]].
- [[mris_compute_parc_overlap]] — uses thickness for parcellation QC.
- [[mris_thickness_diff]] — group-level thickness comparison.

### Downstream files derived from this one

- [[hemi.aparc.stats]] — contains per-region mean thickness.
- [[hemi.w-g.pct.mgh]] — gray-white contrast, uses thickness as a mask.

## Related

- [[hemi.white]], [[hemi.pial]] — surfaces from which thickness is derived.
- [[hemi.volume]] — cortical volume (depends on thickness and area).
- [[mris_place_surface]] — producer.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:1488`; `scripts/recon-all` lines 4779–4796.
- [[subject-directory]] — lists this file in the `surf/` section.
