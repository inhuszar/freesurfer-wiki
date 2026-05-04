---
title: "entowm.mgz"
type: file
fs_version: "8.2.0"
filename: "entowm.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "MGZ (label volume)"
binary: true
produced_by:
  - "[[mri_entowm_seg]]"
produced_in_stage: "autorecon2: EntoWM Segmentation"
produced_at_source:
  - "[`scripts/recon-all:2867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2867)"
inputs:
  - "[[nu.mgz]]"
siblings:
  - "[[entowm.stats]]"
consumed_by:
  - "[[mri_edit_wm_with_aseg]]"
  - "[[bfsfixentowm]]"
downstream_files:
  - "[[wm.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2 (run by default in v8.x)"
editable: false
related:
  - "[[nu.mgz]]"
  - "[[entowm.stats]]"
  - "[[wm.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# entowm.mgz

> [!file] Glossary entry
> `entowm.mgz` is a binary segmentation of entorhinal cortex white matter (entoWM), produced by `mri_entowm_seg` from [[nu.mgz]] during autorecon2. The entorhinal WM region is particularly susceptible to misclassification as gray matter due to its thin laminar structure, so this dedicated segmentation is used to force-include it in [[wm.mgz]] and correct surface placement in that area. Volumetric statistics are co-produced in [[entowm.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/entowm.mgz`
- **Format:** MGZ binary label volume. Labels indicate entorhinal WM sub-regions.

## How It Is Created

### Producing tool

`mri_entowm_seg` — a deep-learning-based entorhinal WM segmentation tool.

```bash
# EntoWM segmentation (recon-all line 2867)
mri_entowm_seg \
  --s $subjid \
  --conform \
  --threads $OMP_NUM_THREADS
```

Outputs are written to `mri/entowm.mgz` and `stats/entowm.stats`.

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:2867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2867)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **EntoWM Segmentation** stage. Volumes are checked after creation; if they are implausibly low, the entoWM fix is disabled.

### Inputs required

- [[nu.mgz]] — N3/N4-corrected T1 intensity volume.

### Siblings (co-produced outputs)

- [[entowm.stats]] — volumetric statistics for the entoWM segmentation.

## How It Is Used

1. `mri_edit_wm_with_aseg -sa-fix-ento-wm entowm.mgz 2 255 255 wm.mgz wm.mgz` — forces entoWM voxels into [[wm.mgz]].
2. Used to correct `brain.finalsurfs.mgz` so that surface placement respects the entorhinal region.

## Related

- [[nu.mgz]] — input intensity volume.
- [[entowm.stats]] — co-produced stats.
- [[wm.mgz]] — downstream WM volume incorporating this mask.
- [[brain.finalsurfs.mgz]] — also corrected using this segmentation.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 2861–2895.
- [[subject-directory]] — lists this file in the `mri/` section.
