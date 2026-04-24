---
title: "hemi.defect_chull"
type: file
fs_version: "8.2.0"
filename: "hemi.defect_chull"
aliases:
  - "lh.defect_chull"
  - "rh.defect_chull"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_fix_topology]]"
produced_in_stage: "autorecon2: Fix Topology"
produced_at_source:
  - "[`utils/mrisurf_defect.cpp:8149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L8149)"
  - "[`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)"
inputs:
  - "[[hemi.orig.nofix]]"
  - "[[hemi.qsphere.nofix]]"
siblings:
  - "[[hemi.defect_labels]]"
  - "[[hemi.defect_borders]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon2: Fix Topology"
editable: false
related:
  - "[[hemi.defect_labels]]"
  - "[[hemi.defect_borders]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.defect_chull

> [!file] Glossary entry
> `lh.defect_chull` / `rh.defect_chull` are per-vertex curvature files marking the convex-hull vertices of each topological defect. Vertices inside a defect convex hull are assigned the defect ID (1-indexed); border vertices within the hull are assigned −1; all others are 0. Produced by `mris_fix_topology` alongside [[hemi.defect_labels]] and [[hemi.defect_borders]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.defect_chull`, `surf/rh.defect_chull`
- **Format:** FreeSurfer binary curvature file. Values: defect ID (interior), −1 (border), 0 (outside).

## How It Is Created

### Producing tool

`mris_fix_topology` (via `mrisurf_defect.cpp`). Co-produced with [[hemi.defect_labels]] and [[hemi.defect_borders]].

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

- **Write call:** [`utils/mrisurf_defect.cpp:8149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L8149) — `MRISwriteCurvature(mris, tmpstr, "defect_chull")`
- **Pipeline invocation:** [`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)

### Pipeline stage

[[recon-all]] autorecon2, **Fix Topology** stage. Produced unconditionally at the end of the topology repair loop.

## Related

- [[hemi.defect_labels]] — interior defect vertex labels.
- [[hemi.defect_borders]] — border vertex labels.
- [[hemi.orig.nofix]] — input surface.
- [[recon-all]] — pipeline context.

## References

- Source: `utils/mrisurf_defect.cpp:8132–8149`; `scripts/recon-all` lines 3725–3787.
- [[subject-directory]] — lists this file in the `surf/` section.
