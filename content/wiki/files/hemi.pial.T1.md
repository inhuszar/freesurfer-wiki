---
title: "hemi.pial.T1"
type: file
fs_version: "8.2.0"
filename: "hemi.pial.T1"
aliases:
  - "lh.pial.T1"
  - "rh.pial.T1"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon3: T1PialSurf"
produced_at_source:
  - "[`mris_make_surfaces/mris_place_surface.cpp:881`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L881)"
  - "[`scripts/recon-all:4510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4510)"
inputs:
  - "[[hemi.white]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wm.mgz]]"
  - "[[autodet.gw.stats.hemi.dat]]"
  - "[[hemi.aparc.annot]]"
  - "[[hemi.cortex.label]]"
  - "[[hemi.cortex+hipamyg.label]]"
  - "[[aseg.presurf.mgz]]"
siblings:
  - "[[hemi.pial]]"
consumed_by: []
downstream_files:
  - "[[hemi.pial]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Thickness, Stats (via hemi.pial symlink)"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.pial.T1

> [!file] Glossary entry
> `lh.pial.T1` / `rh.pial.T1` are the T1-only pial surfaces produced by [[mris_place_surface]] with `--pial` in the T1PialSurf stage of autorecon3. These surfaces trace the gray matter–CSF interface computed from [[brain.finalsurfs.mgz]] alone (no T2 or FLAIR contrast). In the standard pipeline without T2/FLAIR refinement, `hemi.pial` is a symlink to `hemi.pial.T1`. When T2 or FLAIR pial refinement is used, `hemi.pial.T1` is retained as the T1-only intermediate and `hemi.pial` is updated by the T2/FLAIR stage.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.pial.T1`, `surf/rh.pial.T1`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS (gray matter–CSF boundary).
- **Typical size / shape:** ~130,000–165,000 vertices per hemisphere.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A triangular mesh tracing the gray matter–CSF boundary, computed by [[mris_place_surface]] using T1 intensity gradients in [[brain.finalsurfs.mgz]]. Starting from [[hemi.white]], vertices are displaced outward following the intensity gradient. The placement uses `--repulse-surf $white` to prevent the pial surface from intersecting the white surface, and `--pin-medial-wall $cortex` to fix medial-wall vertices.

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--pial` — reads [[hemi.white]] as the starting mesh, uses [[brain.finalsurfs.mgz]] for intensity, and incorporates cortex and parcellation constraints.

```bash
# T1PialSurf invocation (recon-all line 4510)
mris_place_surface \
  --adgws-in autodet.gw.stats.$hemi.dat \
  --seg aseg.presurf.mgz \
  --wm wm.mgz \
  --invol brain.finalsurfs.mgz \
  --$hemi \
  --i ../surf/$hemi.white \
  --o ../surf/$hemi.pial.T1 \
  --pial --nsmooth 0 \
  --rip-label ../label/$hemi.cortex+hipamyg.label \
  --pin-medial-wall ../label/$hemi.cortex.label \
  --aparc ../label/$hemi.aparc.annot \
  --repulse-surf ../surf/$hemi.white \
  --white-surf ../surf/$hemi.white
```

After placement, when T2/FLAIR pial is not used:
```bash
ln -sf $hemi.pial.T1 $hemi.pial
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:881`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L881) — `MRISwrite(surf, outsurfpath)`
- **Pipeline invocation:** [`scripts/recon-all:4510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4510)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **T1PialSurf** stage (`-pial`). Touch sentinel: `touch/$hemi.pial.touch`.

### Inputs required

- [[hemi.white]] — starting mesh for pial placement.
- [[brain.finalsurfs.mgz]] — T1 intensity reference.
- [[wm.mgz]] — WM constraint.
- [[autodet.gw.stats.hemi.dat]] — auto-detected gray-white statistics.
- [[hemi.aparc.annot]] — parcellation constraints.
- [[hemi.cortex.label]] — medial-wall pin constraint.
- [[hemi.cortex+hipamyg.label]] — rip label (includes hippocampus/amygdala).
- [[aseg.presurf.mgz]] — subcortical segmentation.

### Siblings (co-produced outputs)

- [[hemi.pial]] — symlink created pointing to `hemi.pial.T1` when no T2/FLAIR refinement is used.

## How It Is Used

### Downstream files derived from this one

- [[hemi.pial]] — symlink to this file in the standard (T1-only) pipeline.

## Related

- [[surface-format]] — on-disk format.
- [[mris_place_surface]] — producer.
- [[hemi.white]] — input white surface.
- [[hemi.pial]] — symlink alias in T1-only mode; the T2/FLAIR-refined pial otherwise.
- [[brain.finalsurfs.mgz]] — intensity reference.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:881`; `scripts/recon-all` lines 4493–4555.
- [[subject-directory]] — lists this file in the `surf/` section.
