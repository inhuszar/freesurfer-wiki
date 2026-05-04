---
title: "hemi.volume"
type: file
fs_version: "8.2.0"
filename: "hemi.volume"
aliases:
  - "lh.volume"
  - "rh.volume"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_convert]]"
produced_in_stage: "autorecon3: area and vertex vol"
produced_at_source:
  - "[`mris_convert/mris_convert.cpp:869`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_convert/mris_convert.cpp#L869)"
  - "[`scripts/vertexvol:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L81)"
  - "[`scripts/recon-all:4807`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4807)"
inputs:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings:
  - "[[hemi.area.mid]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files: []
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Stats"
optional_for: []
editable: false
related:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.thickness]]"
  - "[[hemi.area.mid]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.volume

> [!file] Glossary entry
> `lh.volume` / `rh.volume` store per-vertex cortical volume estimates (in mm³), computed by `mris_convert --volume` using the TH3 (three-tetrahedra) method from [[hemi.white]] and [[hemi.pial]]. The TH3 method is more accurate than the simple `thickness × midarea` approximation. This file is produced in the same `vertexvol` call that produces [[hemi.area.mid]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.volume`, `surf/rh.volume`
- **Format:** FreeSurfer binary curvature file (header + float32 per vertex). Values are in mm³.

## What It Contains

Per-vertex cortical volume estimated by the TH3 method: the volume element at each vertex is computed as the sum of three tetrahedra connecting white-surface faces and corresponding pial-surface faces. Summing across all vertices gives the total cortical volume of the hemisphere.

## How It Is Created

### Producing tool

`mris_convert --volume` (called via `vertexvol`) — reads [[hemi.white]] and [[hemi.pial]], computes `ComputeMRISvolumeTH3`, and writes the per-vertex volume as a curvature file.

```bash
# vertexvol line 81
mris_convert --volume $subject $hemi $subjdir/surf/$hemi.volume
```

### Source reference

- **Write call:** [`mris_convert/mris_convert.cpp:869`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_convert/mris_convert.cpp#L869) — `ComputeMRISvolumeTH3(argv[2], argv[3], 1, argv[4])`
- **Pipeline script:** [`scripts/vertexvol:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L81)
- **recon-all invocation:** [`scripts/recon-all:4807`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4807)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **area and vertex vol** step, invoked via `vertexvol --th3`.

### Inputs required

- [[hemi.white]] — white matter surface.
- [[hemi.pial]] — pial surface.

### Siblings (co-produced outputs)

- [[hemi.area.mid]] — midthickness area (computed in the same `vertexvol` call).

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — reports mean and total cortical volume per parcellation region.

## Related

- [[hemi.white]], [[hemi.pial]] — source surfaces.
- [[hemi.thickness]] — alternative thickness-based volume estimator.
- [[hemi.area.mid]] — midthickness area co-produced in the same step.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_convert/mris_convert.cpp:869`; `scripts/vertexvol` lines 74–85; `scripts/recon-all` lines 4796–4815.
- [[subject-directory]] — lists this file in the `surf/` section.
