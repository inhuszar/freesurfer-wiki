---
title: "hemi.white.preaparc"
type: file
fs_version: "8.2.0"
filename: "hemi.white.preaparc"
aliases:
  - "lh.white.preaparc"
  - "rh.white.preaparc"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_place_surface]]"
produced_in_stage: "autorecon2: WhitePreAparc"
produced_at_source:
  - "[`scripts/recon-all:3937`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3937)"
inputs:
  - "[[hemi.orig]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wm.mgz]]"
  - "[[autodet.gw.stats.hemi.dat]]"
siblings: []
consumed_by:
  - "[[mris_smooth]]"
  - "[[mris_ca_label]]"
  - "[[mris_place_surface]]"
downstream_files:
  - "[[hemi.smoothwm]]"
  - "[[hemi.aparc.annot]]"
  - "[[hemi.white]]"
mandatory_for:
  - "[[recon-all]] autorecon2: Smooth2, CortexLabel, Smooth2, SurfReg, Parcellation"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.orig]]"
  - "[[hemi.white]]"
  - "[[hemi.smoothwm]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.white.preaparc

> [!file] Glossary entry
> `lh.white.preaparc` / `rh.white.preaparc` is the preliminary white matter surface produced before cortical parcellation. It is the first placement of the gray-white interface, used as input to [[mris_ca_label]] (parcellation) and to subsequent smoothing that creates [[hemi.smoothwm]]. The "preaparc" label distinguishes it from [[hemi.white]], which is the final, possibly parcellation-guided placement produced in autorecon3.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.white.preaparc`, `surf/rh.white.preaparc`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS.
- **Typical size / shape:** ~130,000–165,000 vertices per hemisphere.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A triangular mesh approximating the gray-white matter interface, with vertex coordinates in the subject's tkr-RAS frame. The surface is positioned by [[mris_place_surface]] using the intensity gradient in [[brain.finalsurfs.mgz]] and auto-detected gray-white boundary statistics from [[autodet.gw.stats.hemi.dat]].

## How It Is Created

### Producing tool

[[mris_place_surface]] with `--white` — reads [[hemi.orig]] as the starting mesh, uses [[brain.finalsurfs.mgz]] as the intensity volume and [[wm.mgz]] as the WM reference, and places the white surface by following intensity gradients. The auto-detected gray-white statistics file guides the intensity thresholds.

```bash
# WhitePreAparc invocation (recon-all line 3937)
mris_place_surface \
  --adgws-in autodet.gw.stats.$hemi.dat \
  --wm wm.mgz \
  --invol brain.finalsurfs.mgz \
  --$hemi \
  --i ../surf/$hemi.orig \
  --o ../surf/$hemi.white.preaparc \
  --white \
  --seg aseg.presurf.mgz \
  --nsmooth 5
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3937`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3937)
- Write happens inside `mris_place_surface`.

### Pipeline stage

[[recon-all]] autorecon2, **WhitePreAparc** stage (`-white-preaparc`). Touch sentinel: `touch/$hemi.white.preaparc.touch`.

### Inputs required

- [[hemi.orig]] — topology-corrected starting surface.
- [[brain.finalsurfs.mgz]] — intensity reference for surface placement.
- [[wm.mgz]] — WM constraint.
- [[autodet.gw.stats.hemi.dat]] — auto-detected gray-white boundary statistics.
- [[aseg.presurf.mgz]] *(optional)* — subcortical segmentation for boundary constraints.

### Siblings (co-produced outputs)

Also during this stage: `hemi.white.preaparc.H` and `hemi.white.preaparc.K` (mean and Gaussian curvature of the preaparc white surface, via `mris_curvature`).

## How It Is Used

### Direct downstream consumers

- [[mris_smooth]] (Smooth2) — reads `white.preaparc` to produce [[hemi.smoothwm]]: `mris_smooth -n 3 -nw white.preaparc smoothwm`.
- [[mris_ca_label]] — uses `white.preaparc` for cortical parcellation (produces [[hemi.aparc.annot]]).
- [[mris_place_surface]] (White surface refinement, autorecon3) — uses `white.preaparc` as the starting mesh for the final [[hemi.white]] placement.

### Downstream files derived from this one

- [[hemi.smoothwm]] — smooth version for inflation and spherical mapping.
- [[hemi.aparc.annot]] — parcellation produced using this surface's registration.
- [[hemi.white]] — refined white surface produced in autorecon3.

## Related

- [[surface-format]] — on-disk format.
- [[mris_place_surface]] — producer.
- [[hemi.orig]] — input topology-corrected surface.
- [[hemi.white]] — final successor.
- [[hemi.smoothwm]] — downstream smooth version.
- [[brain.finalsurfs.mgz]], [[wm.mgz]] — key inputs.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3925–3963.
- [[subject-directory]] — lists this file in the `surf/` section.
