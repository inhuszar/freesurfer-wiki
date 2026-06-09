---
title: "hemi.area.mid"
type: file
fs_version: "8.2.0"
filename: "hemi.area.mid"
aliases:
  - "lh.area.mid"
  - "rh.area.mid"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_calc]]"
produced_in_stage: "autorecon3: area and vertex vol"
produced_at_source:
  - "[`scripts/vertexvol:54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L54)"
  - "[`scripts/recon-all:4807`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4807)"
inputs:
  - "[[hemi.area]]"
  - "[[hemi.area.pial]]"
siblings:
  - "[[hemi.volume]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files: []
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Stats"
optional_for: []
editable: false
related:
  - "[[hemi.area]]"
  - "[[hemi.area.pial]]"
  - "[[hemi.volume]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - file
---

# hemi.area.mid

> [!file] Glossary entry
> `lh.area.mid` / `rh.area.mid` store per-vertex midthickness surface area, computed as the arithmetic mean of [[hemi.area]] (white) and [[hemi.area.pial]] (pial) using `mris_calc`. Midthickness area is an estimator of the "true" cortical surface area at the mid-point of the cortical ribbon, and is used by [[mris_anatomical_stats]] and downstream group analyses.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.area.mid`, `surf/rh.area.mid`
- **Format:** FreeSurfer binary curvature file (header + float32 per vertex). Values are in mm².

## What It Contains

Per-vertex area equal to `(white_area + pial_area) / 2`. Provides a mid-cortical surface area estimate at each vertex.

## How It Is Created

### Producing tool

`mris_calc` (via the [[vertexvol]] script) — adds white and pial area maps then divides by 2.

```bash
# vertexvol lines 54–58
mris_calc -o $hemi.area.mid $hemi.area add $hemi.area.pial
mris_calc -o $hemi.area.mid $hemi.area.mid div 2
```

### Source reference

- **Pipeline invocation (vertexvol):** [`scripts/vertexvol:54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vertexvol#L54)
- **Pipeline invocation (recon-all):** [`scripts/recon-all:4807`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4807)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **area and vertex vol** step, invoked via `vertexvol`.

### Inputs required

- [[hemi.area]] — white surface vertex areas.
- [[hemi.area.pial]] — pial surface vertex areas.

### Siblings (co-produced outputs)

- [[hemi.volume]] — cortical volume per vertex (produced in the same `vertexvol` invocation).

## How It Is Used

### Direct downstream consumers

- [[mris_anatomical_stats]] — reports mean midthickness area per parcellation region.

## Related

- [[hemi.area]] — white surface area input.
- [[hemi.area.pial]] — pial surface area input.
- [[hemi.volume]] — co-produced volume estimate.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/vertexvol` lines 50–70; `scripts/recon-all` lines 4796–4815.
- [[subject-directory]] — lists this file in the `surf/` section.
