---
title: "hemi.area.pial"
type: file
fs_version: "8.2.0"
filename: "hemi.area.pial"
aliases:
  - "lh.area.pial"
  - "rh.area.pial"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon3: surface measurement"
produced_at_source:
  - "[`mris_make_surfaces/mris_place_surface.cpp:1540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1540)"
  - "[`scripts/recon-all:4760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4760)"
inputs:
  - "[[hemi.pial]]"
siblings: []
consumed_by:
  - "[[mris_anatomical_stats]]"
  - "[[vertexvol]]"
downstream_files:
  - "[[hemi.area.mid]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Stats"
optional_for: []
editable: false
related:
  - "[[hemi.pial]]"
  - "[[hemi.area]]"
  - "[[hemi.area.mid]]"
  - "[[mris_place_surface]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.area.pial

> [!file] Glossary entry
> `lh.area.pial` / `rh.area.pial` store per-vertex surface area of the pial surface ([[hemi.pial]]), computed by [[mris_place_surface]] with `--area-map` in the pial iteration of the measurement loop. It is the pial analogue of [[hemi.area]] and is used together with `hemi.area` by `vertexvol` to compute midthickness area ([[hemi.area.mid]]) and cortical volume ([[hemi.volume]]).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.area.pial`, `surf/rh.area.pial`
- **Format:** FreeSurfer binary curvature file — same format as [[hemi.curv]] (header + float32 per vertex). Values are in mm².

## What It Contains

Per-vertex surface area contribution from the pial surface, analogous to [[hemi.area]] but derived from [[hemi.pial]].

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--area-map` — reads [[hemi.pial]], computes vertex areas, writes result.

```bash
# recon-all ~line 4760 (pial iteration)
mris_place_surface --area-map ../surf/$hemi.pial ../surf/$hemi.area.pial
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:1540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1540) — `MRISwriteArea(surf, pargv[1])`
- **Pipeline invocation:** [`scripts/recon-all:4760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4760)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, surface measurement loop (pial iteration).

### Inputs required

- [[hemi.pial]] — pial surface mesh.

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — reports pial surface area statistics per parcellation region.
- `vertexvol` — uses `area.pial` and `area` to compute [[hemi.area.mid]] and [[hemi.volume]].

### Downstream files derived from this one

- [[hemi.area.mid]] — midthickness area averaged from white and pial areas.

## Related

- [[hemi.pial]] — source surface.
- [[hemi.area]] — white surface area counterpart.
- [[hemi.area.mid]] — derived midthickness area.
- [[mris_place_surface]] — producer.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:1540`; `scripts/recon-all` lines 4748–4775.
- [[subject-directory]] — lists this file in the `surf/` section.
