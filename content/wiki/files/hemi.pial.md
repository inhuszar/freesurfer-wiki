---
title: "hemi.pial"
type: file
fs_version: "8.2.0"
filename: "hemi.pial"
aliases:
  - "lh.pial"
  - "rh.pial"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon3: T1PialSurf (or T2/FLAIRpial)"
produced_at_source:
  - "[`scripts/recon-all:4533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4533)"
inputs:
  - "[[hemi.pial.T1]]"
siblings: []
consumed_by:
  - "[[mris_place_surface]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_compute_parc_overlap]]"
downstream_files:
  - "[[hemi.thickness]]"
  - "[[hemi.area.pial]]"
  - "[[hemi.curv.pial]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Thickness, Stats"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.pial.T1]]"
  - "[[hemi.white]]"
  - "[[hemi.thickness]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.pial

> [!file] Glossary entry
> `lh.pial` / `rh.pial` are the final gray matter–CSF boundary surfaces used throughout the rest of the recon-all pipeline and by downstream analysis tools. In the standard T1-only pipeline, `hemi.pial` is a symbolic link to [[hemi.pial.T1]]. When T2 or FLAIR pial refinement (`-T2pial` or `-FLAIRpial`) is active, `hemi.pial` points to the T2/FLAIR-refined surface instead. Cortical thickness, pial area, and pial curvature are all derived from `hemi.pial` in combination with [[hemi.white]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.pial`, `surf/rh.pial`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS (gray matter–CSF boundary).
- **Typical size / shape:** ~130,000–165,000 vertices per hemisphere.
- **Byte-accurate specification:** See [[surface-format]].

> [!gotcha]
> In the standard pipeline, `hemi.pial` is a symlink to [[hemi.pial.T1]], not an independent file. Deleting or replacing it without updating the symlink target will silently break downstream steps. When T2/FLAIR pial is used, the symlink target changes — check the link target before editing.

## What It Contains

The gray matter–CSF interface surface. Vertex positions trace the outer boundary of the cortical ribbon. In conjunction with [[hemi.white]], `hemi.pial` defines the cortical ribbon used for all thickness and area computations.

## How It Is Created

In the standard (T1-only) pipeline:
```bash
# recon-all line 4533
ln -sf $hemi.pial.T1 $hemi.pial
```

With T2 or FLAIR refinement, the T2/FLAIR stage overwrites or re-symlinks `hemi.pial` to the refined surface.

### Source reference

- **Symlink creation:** [`scripts/recon-all:4533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4533)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **T1PialSurf** stage (`-pial`); optionally updated by `-T2pial` or `-FLAIRpial`.

### Inputs required

- [[hemi.pial.T1]] — T1-only pial surface (symlink target in standard mode).

## How It Is Used

### Direct downstream consumers

- [[mris_place_surface]] (Thickness) — reads `white` and `pial` to compute per-vertex cortical thickness.
- [[mris_anatomical_stats]] — uses `pial` for pial surface area statistics.
- [[mris_compute_parc_overlap]] — uses `pial` for parcellation overlap checks.

### Downstream files derived from this one

- [[hemi.thickness]] — cortical thickness (point-to-point distance white–pial).
- [[hemi.area.pial]] — pial surface area per vertex.
- [[hemi.curv.pial]] — mean curvature of the pial surface.

## Related

- [[surface-format]] — on-disk format.
- [[hemi.pial.T1]] — symlink target in standard mode.
- [[hemi.white]] — complementary white surface.
- [[hemi.thickness]] — derived from white–pial distance.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 4493–4555.
- [[subject-directory]] — lists this file in the `surf/` section.
