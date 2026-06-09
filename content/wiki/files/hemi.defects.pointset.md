---
title: "hemi.defects.pointset"
type: file
fs_version: "8.2.0"
filename: "hemi.defects.pointset"
aliases:
  - "lh.defects.pointset"
  - "rh.defects.pointset"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer pointset (JSON)"
binary: false
produced_by:
  - "[[mris_defects_pointset]]"
produced_in_stage: "autorecon2: Fix Topology (via defect2seg)"
produced_at_source:
  - "[`mris_defects_pointset/mris_defects_pointset.cpp:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_defects_pointset/mris_defects_pointset.cpp#L125)"
  - "[`scripts/defect2seg:105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L105)"
  - "[`scripts/recon-all:3783`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3783)"
inputs:
  - "[[hemi.orig.nofix]]"
  - "[[hemi.defect_labels]]"
  - "[[hemi.nofix.cortex.label]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Fix Topology (via defect2seg)"
editable: false
related:
  - "[[hemi.defect_labels]]"
  - "[[hemi.orig.nofix]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - file
---

# hemi.defects.pointset

> [!file] Glossary entry
> `lh.defects.pointset` / `rh.defects.pointset` are JSON pointset files listing the centroid coordinates of each topological defect region in the pre-correction surface ([[hemi.orig.nofix]]). Produced by `mris_defects_pointset` inside `defect2seg` after the Fix Topology stage. Loadable in FreeView to visualise defect locations overlaid on the surface.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.defects.pointset`, `surf/rh.defects.pointset`
- **Format:** FreeSurfer JSON pointset (scanner-RAS coordinates if geometry is valid, otherwise tkreg space).

## How It Is Created

### Producing tool

`mris_defects_pointset` — reads [[hemi.orig.nofix]] and [[hemi.defect_labels]], computes defect centroids, and writes the pointset. Called from [[defect2seg]], which is called by [[wiki/pipelines/recon-all|recon-all]] after Fix Topology.

```bash
# defect2seg invocation (recon-all line 3783)
defect2seg --s $subjid [--cortex]

# Inside defect2seg (line 105)
mris_defects_pointset -s $lhsurf -d $lhdefects -o $lhpointset \
  [--label $lhlabel]
```

### Source reference

- **Write call:** [`mris_defects_pointset/mris_defects_pointset.cpp:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_defects_pointset/mris_defects_pointset.cpp#L125) — `centroids.save(outfile)`
- **defect2seg invocation:** [`scripts/defect2seg:105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L105)
- **Pipeline invocation:** [`scripts/recon-all:3783`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3783)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, immediately after **Fix Topology** via `defect2seg`.

### Inputs required

- [[hemi.orig.nofix]] — pre-correction surface for centroid computation.
- [[hemi.defect_labels]] — per-vertex defect ID map.
- [[hemi.nofix.cortex.label]] — cortex mask (used via `--label` to restrict pointset to cortex).

## Related

- [[hemi.defect_labels]] — defect ID map used as input.
- [[hemi.orig.nofix]] — input surface geometry.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_defects_pointset/mris_defects_pointset.cpp`; `scripts/defect2seg` lines 92–133; `scripts/recon-all` lines 3782–3787.
- [[subject-directory]] — lists this file in the `surf/` section.
