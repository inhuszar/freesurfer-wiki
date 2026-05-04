---
title: "hemi.defect_labels"
type: file
fs_version: "8.2.0"
filename: "hemi.defect_labels"
aliases:
  - "lh.defect_labels"
  - "rh.defect_labels"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_fix_topology]]"
produced_in_stage: "autorecon2: Fix Topology"
produced_at_source:
  - "[`utils/mrisurf_defect.cpp:8119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L8119)"
  - "[`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)"
inputs:
  - "[[hemi.orig.nofix]]"
  - "[[hemi.qsphere.nofix]]"
  - "[[hemi.inflated.nofix]]"
siblings:
  - "[[hemi.defect_borders]]"
  - "[[hemi.defect_chull]]"
consumed_by:
  - "[[defect2seg]]"
downstream_files:
  - "[[hemi.defects.pointset]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Fix Topology"
editable: false
related:
  - "[[hemi.orig.nofix]]"
  - "[[hemi.defect_borders]]"
  - "[[hemi.defect_chull]]"
  - "[[hemi.defects.pointset]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.defect_labels

> [!file] Glossary entry
> `lh.defect_labels` / `rh.defect_labels` are per-vertex curvature files where each vertex is assigned its topological defect number (1-indexed) or 0 if not part of any defect. Produced by `mris_fix_topology` (via `MRISwriteCurvature` in `mrisurf_defect.cpp`) during the Fix Topology stage. Read by `defect2seg` to convert defect positions into a volumetric segmentation and a pointset.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.defect_labels`, `surf/rh.defect_labels`
- **Format:** FreeSurfer binary curvature file. Per-vertex integer defect ID (float-encoded); 0 = no defect.

## How It Is Created

### Producing tool

`mris_fix_topology` internally calls `MRIScorrectTopology` which invokes the topology repair loop in `mrisurf_defect.cpp`. Defect labelling is written unconditionally after the loop.

```bash
# Fix Topology invocation (recon-all line 3732)
mris_fix_topology -threads 1 -mgz \
  -sphere qsphere.nofix \
  -inflated inflated.nofix \
  -orig orig.nofix \
  -out orig \
  $subjid $hemi
```

The output filename is resolved by `MRISwriteCurvature_getfilename` using the surface's hemisphere and path, producing `surf/lh.defect_labels`.

### Source reference

- **Write call:** [`utils/mrisurf_defect.cpp:8119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L8119) — `MRISwriteCurvature(mris, tmpstr, "defect_labels")`
- **Pipeline invocation:** [`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Fix Topology** stage (`-fix`). Produced alongside [[hemi.defect_borders]] and [[hemi.defect_chull]].

### Siblings (co-produced outputs)

- [[hemi.defect_borders]] — border vertices of each defect.
- [[hemi.defect_chull]] — convex-hull vertices of each defect.

## How It Is Used

Read by `defect2seg` as `$lhdefects` / `$rhdefects` to:
1. Convert defect positions to a volumetric segmentation (`mri/surface.defects.mgz`).
2. Generate a pointset ([[hemi.defects.pointset]]) for FreeView display.

```bash
defect2seg --s $subjid
```

## Related

- [[hemi.orig.nofix]] — input surface geometry before topology correction.
- [[hemi.defect_borders]] — co-produced border file.
- [[hemi.defect_chull]] — co-produced convex hull file.
- [[hemi.defects.pointset]] — downstream pointset derived from this file.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `utils/mrisurf_defect.cpp:8107–8119`; `scripts/recon-all` lines 3725–3787.
- [[subject-directory]] — lists this file in the `surf/` section.
