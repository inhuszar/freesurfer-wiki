---
title: "hemi.area"
type: file
fs_version: "8.2.0"
filename: "hemi.area"
aliases:
  - "lh.area"
  - "rh.area"
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
  - "[[hemi.white]]"
siblings: []
consumed_by:
  - "[[mris_anatomical_stats]]"
  - "[[vertexvol]]"
downstream_files:
  - "[[hemi.area.mid]]"
  - "[[hemi.volume]]"
mandatory_for:
  - "[[recon-all]] autorecon3: Stats"
optional_for: []
editable: false
related:
  - "[[hemi.white]]"
  - "[[hemi.area.pial]]"
  - "[[hemi.area.mid]]"
  - "[[mris_place_surface]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.area

> [!file] Glossary entry
> `lh.area` / `rh.area` store per-vertex surface area of the white matter surface ([[hemi.white]]), computed by [[mris_place_surface]] with `--area-map`. Each vertex value is one-third of the summed areas of all faces incident to that vertex (the vertex's share of the total white surface area). Used by [[mris_anatomical_stats]] for surface-area statistics and by `vertexvol` for cortical volume estimation.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.area`, `surf/rh.area`
- **Format:** FreeSurfer binary curvature file — same binary format as [[hemi.curv]] (header + float32 per vertex). Values are in mm².
- **Typical size:** ~4 × N_vertices bytes + 12-byte header.

## What It Contains

Per-vertex surface area contribution from the white matter surface, computed via `MRISwriteArea` which stores the vertex area (one-third of each adjacent face's area) in the curvature field and writes it as a curvature file.

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--area-map` — reads [[hemi.white]], computes vertex areas, and writes the result.

```bash
# recon-all ~line 4760 (white iteration of the surftype loop)
mris_place_surface --area-map ../surf/$hemi.white ../surf/$hemi.area
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:1540`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L1540) — `MRISwriteArea(surf, pargv[1])`
- **Pipeline invocation:** [`scripts/recon-all:4760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4760)

### Pipeline stage

[[recon-all]] autorecon3, surface measurement loop (white iteration).

### Inputs required

- [[hemi.white]] — white surface mesh.

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — reports total and mean vertex area per parcellation region.
- `vertexvol` — uses white and pial areas to compute [[hemi.area.mid]] and [[hemi.volume]].

### Downstream files derived from this one

- [[hemi.area.mid]] — midthickness surface area (average of white and pial).
- [[hemi.volume]] — cortical volume per vertex.

## Alternative Names and Variants

- [[hemi.area.pial]] — vertex area of the pial surface.
- [[hemi.area.mid]] — midthickness surface area.

## Related

- [[hemi.white]] — source surface.
- [[hemi.area.pial]] — pial area counterpart.
- [[hemi.area.mid]] — midthickness area.
- [[hemi.volume]] — derived cortical volume.
- [[mris_place_surface]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:1540`; `scripts/recon-all` lines 4748–4775.
- [[subject-directory]] — lists this file in the `surf/` section.
