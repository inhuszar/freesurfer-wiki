---
title: "hemi.defect_borders"
type: file
fs_version: "8.2.0"
filename: "hemi.defect_borders"
aliases:
  - "lh.defect_borders"
  - "rh.defect_borders"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_fix_topology]]"
produced_in_stage: "autorecon2: Fix Topology"
produced_at_source:
  - "[`utils/mrisurf_defect.cpp:8131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L8131)"
  - "[`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)"
inputs:
  - "[[hemi.orig.nofix]]"
  - "[[hemi.qsphere.nofix]]"
siblings:
  - "[[hemi.defect_labels]]"
  - "[[hemi.defect_chull]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon2: Fix Topology"
editable: false
related:
  - "[[hemi.defect_labels]]"
  - "[[hemi.defect_chull]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.defect_borders

> [!file] Glossary entry
> `lh.defect_borders` / `rh.defect_borders` are per-vertex curvature files where each border vertex of a topological defect is assigned that defect's 1-indexed ID; all other vertices are 0. Produced alongside [[hemi.defect_labels]] and [[hemi.defect_chull]] by `mris_fix_topology` during the Fix Topology stage. Used for visualisation and debugging of topology corrections.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.defect_borders`, `surf/rh.defect_borders`
- **Format:** FreeSurfer binary curvature file. Per-vertex float value encoding the defect border ID (0 = not a border).

## How It Is Created

### Producing tool

`mris_fix_topology` (via `mrisurf_defect.cpp`). Produced unconditionally after the topology correction loop.

```bash
# Fix Topology invocation (recon-all line 3732)
mris_fix_topology -threads 1 -mgz \
  -sphere qsphere.nofix \
  -inflated inflated.nofix \
  -orig orig.nofix \
  -out orig \
  $subjid $hemi
```

### Source reference

- **Write call:** [`utils/mrisurf_defect.cpp:8131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L8131) — `MRISwriteCurvature(mris, tmpstr, "defect_borders")`
- **Pipeline invocation:** [`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)

### Pipeline stage

[[recon-all]] autorecon2, **Fix Topology** stage. Co-produced with [[hemi.defect_labels]] and [[hemi.defect_chull]].

## Related

- [[hemi.defect_labels]] — full defect interior vertex labels.
- [[hemi.defect_chull]] — convex hull vertices.
- [[hemi.orig.nofix]] — input surface.
- [[recon-all]] — pipeline context.

## References

- Source: `utils/mrisurf_defect.cpp:8120–8131`; `scripts/recon-all` lines 3725–3787.
- [[subject-directory]] — lists this file in the `surf/` section.
