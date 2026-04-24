---
title: "hemi.white"
type: file
fs_version: "8.2.0"
filename: "hemi.white"
aliases:
  - "lh.white"
  - "rh.white"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon3: WhiteSurfs"
produced_at_source:
  - "[`mris_make_surfaces/mris_place_surface.cpp:881`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L881)"
  - "[`scripts/recon-all:4436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4436)"
inputs:
  - "[[hemi.white.preaparc]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wm.mgz]]"
  - "[[autodet.gw.stats.hemi.dat]]"
  - "[[hemi.aparc.annot]]"
  - "[[hemi.cortex.label]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mris_place_surface]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_jacobian]]"
downstream_files:
  - "[[hemi.pial]]"
  - "[[hemi.thickness]]"
  - "[[hemi.area]]"
  - "[[hemi.jacobian_white]]"
mandatory_for:
  - "[[recon-all]] autorecon3: Pial, Thickness, Stats"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.white.preaparc]]"
  - "[[hemi.pial]]"
  - "[[hemi.thickness]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.white

> [!file] Glossary entry
> `lh.white` / `rh.white` are the final gray-white matter interface surfaces produced by [[mris_place_surface]] with `--white` in the WhiteSurfs stage of autorecon3. Unlike [[hemi.white.preaparc]], this placement uses the cortical parcellation ([[hemi.aparc.annot]]) and cortex label ([[hemi.cortex.label]]) for parcellation-guided refinement and medial-wall ripping. `hemi.white` is the primary reference surface for cortical thickness computation, surface-based statistics, and is the starting point for pial surface placement.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.white`, `surf/rh.white`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS (gray-white boundary).
- **Typical size / shape:** ~130,000–165,000 vertices per hemisphere.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A triangular mesh approximating the gray-white matter interface, positioned by following intensity gradients in [[brain.finalsurfs.mgz]] from the [[hemi.white.preaparc]] starting position. The placement is refined using parcellation-based constraints: `--rip-label` (cortex label) and `--aparc` suppress placement at non-cortical vertices. The result is geometrically similar to [[hemi.white.preaparc]] but with improved placement at parcellation boundaries and medial-wall regions.

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--white` — reads [[hemi.white.preaparc]] as starting mesh, uses [[brain.finalsurfs.mgz]] for intensity, and incorporates [[hemi.aparc.annot]] and [[hemi.cortex.label]] for constraint-based refinement.

```bash
# WhiteSurfs invocation (recon-all line 4436)
mris_place_surface \
  --adgws-in autodet.gw.stats.$hemi.dat \
  --seg aseg.presurf.mgz \
  --wm wm.mgz \
  --invol brain.finalsurfs.mgz \
  --$hemi \
  --i ../surf/$hemi.white.preaparc \
  --o ../surf/$hemi.white \
  --white --nsmooth 0 \
  --rip-label ../label/$hemi.cortex.label \
  --rip-bg \
  --rip-surf ../surf/$hemi.white.preaparc \
  --aparc ../label/$hemi.aparc.annot
```

### Source reference

- **Write call:** [`mris_make_surfaces/mris_place_surface.cpp:881`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_surfaces/mris_place_surface.cpp#L881) — `MRISwrite(surf, outsurfpath)`
- **Pipeline invocation:** [`scripts/recon-all:4436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4436)

### Pipeline stage

[[recon-all]] autorecon3, **WhiteSurfs** stage (`-white`). Touch sentinel: `touch/$hemi.white.touch`.

### Inputs required

- [[hemi.white.preaparc]] — starting mesh from autorecon2.
- [[brain.finalsurfs.mgz]] — intensity reference for surface placement.
- [[wm.mgz]] — WM constraint.
- [[autodet.gw.stats.hemi.dat]] — auto-detected gray-white statistics.
- [[hemi.aparc.annot]] — cortical parcellation for constraint-based refinement.
- [[hemi.cortex.label]] — cortex mask (medial wall ripping).
- [[aseg.presurf.mgz]] — subcortical segmentation for boundary constraints.

## How It Is Used

### Direct downstream consumers

- [[mris_place_surface]] (Pial) — reads `white` as the starting mesh for pial surface placement.
- [[mris_place_surface]] (Thickness) — computes [[hemi.thickness]] from `white` and [[hemi.pial]].
- [[mris_anatomical_stats]] — uses `white` for cortical surface area and thickness statistics.
- [[mris_jacobian]] — uses `white` and [[hemi.sphere.reg]] to compute [[hemi.jacobian_white]].

### Downstream files derived from this one

- [[hemi.pial]] — pial surface placed starting from `white`.
- [[hemi.thickness]] — cortical thickness (distance white–pial).
- [[hemi.area]] — surface area map computed from white surface.
- [[hemi.jacobian_white]] — Jacobian of the white-to-sphere deformation.

## Alternative Names and Variants

- [[hemi.white.preaparc]] — the preliminary white surface placed before parcellation in autorecon2.

> [!gotcha]
> `lh.white.H` and `lh.white.K` are symlinks to `lh.white.preaparc.H` and `lh.white.preaparc.K`. The curvature files are computed from `white.preaparc`, not `white`, but are named after `white` for compatibility.

## Related

- [[surface-format]] — on-disk format.
- [[mris_place_surface]] — producer.
- [[hemi.white.preaparc]] — pre-parcellation predecessor.
- [[hemi.pial]] — companion pial surface.
- [[hemi.thickness]] — derived from white–pial distance.
- [[brain.finalsurfs.mgz]], [[wm.mgz]] — key inputs.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_make_surfaces/mris_place_surface.cpp:881`; `scripts/recon-all` lines 4421–4492.
- [[subject-directory]] — lists this file in the `surf/` section.
