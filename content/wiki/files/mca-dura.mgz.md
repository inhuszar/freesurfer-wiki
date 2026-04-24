---
title: "mca-dura.mgz"
type: file
fs_version: "8.2.0"
filename: "mca-dura.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "MGZ (label volume)"
binary: true
produced_by:
  - "[[mri_mcadura_seg]]"
produced_in_stage: "autorecon2: MCA/Dura Segmentation"
produced_at_source:
  - "[`scripts/recon-all:2220`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2220)"
inputs:
  - "[[nu.mgz]]"
siblings: []
consumed_by:
  - "[[mri_mask]]"
downstream_files:
  - "[[brainmask.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon2 (run by default in v8.x)"
editable: false
related:
  - "[[nu.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# mca-dura.mgz

> [!file] Glossary entry
> `mca-dura.mgz` is a binary segmentation of middle cerebral artery (MCA) branches and dura mater produced by `mri_mcadura_seg` from [[nu.mgz]] in autorecon2. MCA flow voids and dura can appear similar to brain tissue on T1w images, causing skull-stripping errors and incorrect surface placement. This segmentation is used to mask them out of [[brainmask.mgz]] and [[brain.finalsurfs.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/mca-dura.mgz`
- **Format:** MGZ binary label volume. Non-zero voxels indicate MCA/dura tissue.

## How It Is Created

### Producing tool

`mri_mcadura_seg` — a segmentation tool for MCA branches and dura.

```bash
# MCA/Dura segmentation (recon-all line 2220)
mri_mcadura_seg \
  --i $nu \
  --o mca-dura.mgz \
  --threads $OMP_NUM_THREADS
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:2220`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2220)

### Pipeline stage

[[recon-all]] autorecon2, **MCA/Dura Segmentation** stage. Produced before brain mask refinement.

### Inputs required

- [[nu.mgz]] — N3/N4-corrected intensity volume.

## How It Is Used

Masked out of [[brainmask.mgz]] and [[brain.finalsurfs.mgz]]:

```bash
mri_mask -invert $BM mri/mca-dura.mgz $BM
mri_mask -oval 1 -invert brain.finalsurfs.mgz mca-dura.mgz brain.finalsurfs.mgz
```

## Related

- [[nu.mgz]] — input intensity volume.
- [[brainmask.mgz]] — modified to exclude MCA/dura.
- [[brain.finalsurfs.mgz]] — also corrected.
- [[vsinus.mgz]] — analogous venous sinus segmentation.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 2213–2232.
- [[subject-directory]] — lists this file in the `mri/` section.
