---
title: "vsinus.mgz"
type: file
fs_version: "8.2.0"
filename: "vsinus.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "MGZ (label volume)"
binary: true
produced_by:
  - "[[mri_vsinus_seg]]"
produced_in_stage: "autorecon2: Venous Sinus Segmentation"
produced_at_source:
  - "[`scripts/recon-all:2241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2241)"
inputs:
  - "[[nu.mgz]]"
  - "[[synthseg.rca.mgz]]"
siblings:
  - "[[vsinus.stats]]"
consumed_by:
  - "[[mri_mask]]"
downstream_files:
  - "[[brainmask.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2 (run by default in v8.x)"
editable: false
related:
  - "[[nu.mgz]]"
  - "[[vsinus.stats]]"
  - "[[brainmask.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# vsinus.mgz

> [!file] Glossary entry
> `vsinus.mgz` is a binary segmentation of venous sinuses (sagittal, transverse, sigmoid sinuses and straight sinus) produced by `mri_vsinus_seg` from [[nu.mgz]] in autorecon2. Venous sinuses appear bright on T1w images and can be misclassified as white matter, causing surface placement errors. This segmentation is used to mask them out of [[brainmask.mgz]] and [[brain.finalsurfs.mgz]]. Volumetric statistics are written to [[vsinus.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/vsinus.mgz`
- **Format:** MGZ binary label volume. Non-zero voxels indicate venous sinus tissue.

## How It Is Created

### Producing tool

`mri_vsinus_seg` — a deep-learning venous sinus segmentation script.

```bash
# Venous sinus segmentation (recon-all line 2241)
mri_vsinus_seg \
  --s $subjid \
  --rca-synthseg \
  --threads $OMP_NUM_THREADS
```

Uses [[nu.mgz]] as the intensity input and [[synthseg.rca.mgz]] to define the cortex mask for post-processing.

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:2241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2241)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Venous Sinus Segmentation** stage. Produced before skull-stripping refinement.

### Siblings (co-produced outputs)

- [[vsinus.stats]] — volumetric statistics, produced by `mri_segstats` inside `mri_vsinus_seg`.

## How It Is Used

Masked out of brain volumes:
```bash
mri_mask -invert $BM mri/vsinus.mgz $BM   # brainmask
mri_mask -oval 1 -invert brain.finalsurfs.mgz vsinus.mgz brain.finalsurfs.mgz
```

## Related

- [[nu.mgz]] — input intensity volume.
- [[vsinus.stats]] — co-produced volumetric stats.
- [[brainmask.mgz]] — modified to exclude venous sinuses.
- [[brain.finalsurfs.mgz]] — also corrected.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 2234–2280; `scripts/mri_vsinus_seg` lines 160–220.
- [[subject-directory]] — lists this file in the `mri/` section.
