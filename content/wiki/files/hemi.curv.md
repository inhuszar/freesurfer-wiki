---
title: "hemi.curv"
type: file
fs_version: "8.2.0"
filename: "hemi.curv"
aliases:
  - "lh.curv"
  - "rh.curv"
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
  - "[[hemi.white]]"
siblings: []
consumed_by:
  - "[[mris_register]]"
  - "[[mris_curvature_stats]]"
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.sphere.reg]]"
  - "[[hemi.curv.stats]]"
mandatory_for:
  - "[[recon-all]] autorecon3: SurfReg, CurvStats"
optional_for: []
editable: false
related:
  - "[[hemi.white]]"
  - "[[hemi.curv.pial]]"
  - "[[hemi.sulc]]"
  - "[[mris_place_surface]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.curv

> [!file] Glossary entry
> `lh.curv` / `rh.curv` store per-vertex mean curvature of the white matter surface ([[hemi.white]]), computed by [[mris_place_surface]] with `--curv-map`. Each vertex value is the zero-mean curvature (in 1/mm) after 2-neighbourhood averaging and 10 smoothing iterations. Mean curvature is used alongside [[hemi.sulc]] as a folding feature for spherical registration by [[mris_register]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.curv`, `surf/rh.curv`
- **Format:** FreeSurfer binary curvature file (same format as [[hemi.sulc]]): 3 int32 header values (vertex count, face count, `vals_per_vertex=1`) followed by one float32 per vertex.
- **Typical size:** ~4 × N_vertices bytes + 12-byte header.

## What It Contains

Per-vertex mean curvature of [[hemi.white]], scaled and zero-meaned. Positive values correspond to sulcal fundi (concave curvature); negative values to gyral crowns (convex curvature). The curvature is computed via `MRIScomputeSecondFundamentalForm`, averaged with `curvature_avgs=10`.

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--curv-map` — reads [[hemi.white]], computes mean curvature, and writes the result.

```bash
# recon-all ~line 4760
mris_place_surface --curv-map ../surf/$hemi.white 2 10 ../surf/$hemi.curv
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:1519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1519) — `MRISwriteCurvature(surf, pargv[3])`
- **Pipeline invocation:** [`scripts/recon-all:4760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4760)

### Pipeline stage

[[recon-all]] autorecon3, surface measurement loop (after final surface placement). No dedicated touch sentinel; runs within the post-pial measurement block.

### Inputs required

- [[hemi.white]] — white surface mesh.

## How It Is Used

### Direct downstream consumers

- [[mris_register]] (via rca-surfreg) — uses `curv` together with [[hemi.sulc]] as folding features for spherical registration.
- [[mris_curvature_stats]] (CurvStats) — produces [[hemi.curv.stats]] from `curv` and `sulc`.
- [[mris_anatomical_stats]] — reports mean curvature per parcellation region.

### Downstream files derived from this one

- [[hemi.sphere.reg]] — registered sphere uses curvature as a registration feature.
- [[hemi.curv.stats]] — anatomical curvature statistics file.

## Alternative Names and Variants

- [[hemi.curv.pial]] — mean curvature of the pial surface (analogous file for [[hemi.pial]]).

## Related

- [[hemi.white]] — source surface.
- [[hemi.curv.pial]] — pial curvature.
- [[hemi.sulc]] — complementary sulcal depth map.
- [[mris_place_surface]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:1519`; `scripts/recon-all` lines 4748–4775.
- [[subject-directory]] — lists this file in the `surf/` section.
