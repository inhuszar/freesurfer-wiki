---
title: "hemi.curv.pial"
type: file
fs_version: "8.2.0"
filename: "hemi.curv.pial"
aliases:
  - "lh.curv.pial"
  - "rh.curv.pial"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon3: surface measurement"
produced_at_source:
  - "[`mris_make_surfaces/mris_place_surface.cpp:1519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1519)"
  - "[`scripts/recon-all:4760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4760)"
inputs:
  - "[[hemi.pial]]"
siblings: []
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: Stats (pial curvature stats)"
editable: false
related:
  - "[[hemi.pial]]"
  - "[[hemi.curv]]"
  - "[[mris_place_surface]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.curv.pial

> [!file] Glossary entry
> `lh.curv.pial` / `rh.curv.pial` store per-vertex mean curvature of the pial surface ([[hemi.pial]]), computed by [[mris_place_surface]] with `--curv-map` in the same measurement loop that produces [[hemi.curv]]. Pial curvature complements white surface curvature and is used in surface-based anatomical statistics.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.curv.pial`, `surf/rh.curv.pial`
- **Format:** FreeSurfer binary curvature file — identical format to [[hemi.curv]] (header + float32 per vertex).

## What It Contains

Per-vertex mean curvature of [[hemi.pial]], computed with `curvature_avgs=10` smoothing iterations. Positive values indicate sulcal fundi; negative values indicate gyral crowns. Semantically analogous to [[hemi.curv]] but derived from the pial surface.

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--curv-map` — same invocation pattern as [[hemi.curv]] but applied to [[hemi.pial]].

```bash
# recon-all ~line 4760 (pial iteration of the surftype loop)
mris_place_surface --curv-map ../surf/$hemi.pial 2 10 ../surf/$hemi.curv.pial
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:1519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1519) — `MRISwriteCurvature(surf, pargv[3])`
- **Pipeline invocation:** [`scripts/recon-all:4760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4760)

### Pipeline stage

[[recon-all]] autorecon3, surface measurement loop (pial iteration).

### Inputs required

- [[hemi.pial]] — pial surface mesh.

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — reports mean pial curvature per parcellation region.

## Related

- [[hemi.pial]] — source surface.
- [[hemi.curv]] — analogous white surface curvature.
- [[mris_place_surface]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:1519`; `scripts/recon-all` lines 4748–4775.
- [[subject-directory]] — lists this file in the `surf/` section.
