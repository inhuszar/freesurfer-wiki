---
title: "hemi.inflated.nofix"
type: file
fs_version: "8.2.0"
filename: "hemi.inflated.nofix"
aliases:
  - "lh.inflated.nofix"
  - "rh.inflated.nofix"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_inflate]]"
produced_in_stage: "autorecon2: Inflate1"
produced_at_source:
  - "[`mris_inflate/mris_inflate.cpp:368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L368)"
  - "[`scripts/recon-all:3660`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3660)"
inputs:
  - "[[hemi.smoothwm.nofix]]"
siblings: []
consumed_by:
  - "[[mris_sphere]]"
downstream_files:
  - "[[hemi.qsphere.nofix]]"
mandatory_for:
  - "[[recon-all]] autorecon2: QSphere"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.smoothwm.nofix]]"
  - "[[hemi.qsphere.nofix]]"
  - "[[hemi.inflated]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.inflated.nofix

> [!file] Glossary entry
> `lh.inflated.nofix` / `rh.inflated.nofix` are inflated versions of [[hemi.smoothwm.nofix]], produced by [[mris_inflate]] with `-no-save-sulc` in the Inflate1 stage. The inflation reduces sulcal folding to create a shape suitable for spherical mapping, while the `-no-save-sulc` flag prevents writing of sulcal depth at this intermediate stage (sulcal depth is computed later on the topology-corrected surface). Like all `.nofix` surfaces, topological defects are still present.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.inflated.nofix`, `surf/rh.inflated.nofix`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; same topology as [[hemi.smoothwm.nofix]], vertex positions inflated toward a sphere.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

Vertex positions representing the inflated (low-curvature) version of the hemisphere surface, computed by an iterative inflation procedure that expands sulci while contracting gyri. This surface is nearly spherical but may have self-intersections due to topological defects from the original tessellation.

## How It Is Created

### Producing tool

[[mris_inflate]] with `-no-save-sulc` — reads [[hemi.smoothwm.nofix]] and inflates it without saving the sulcal depth map.

```bash
# Inflate1 invocation (recon-all line 3658–3660)
mris_inflate -no-save-sulc \
  ../surf/lh.smoothwm.nofix \
  ../surf/lh.inflated.nofix
```

### Source reference

- **Write call:** [`mris_inflate/mris_inflate.cpp:368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L368) — `MRISwrite(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:3660`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3660)

### Pipeline stage

[[recon-all]] autorecon2, **Inflate1** stage (`-inflate1`). Touch sentinel: `touch/$hemi.inflate1.touch`.

### Inputs required

- [[hemi.smoothwm.nofix]] — smoothed raw surface.

## How It Is Used

### Direct downstream consumers

- [[mris_sphere]] with `-q` flag — reads `inflated.nofix` to produce [[hemi.qsphere.nofix]] (the quasi-spherical mapping used by topology correction).

### Downstream files derived from this one

- [[hemi.qsphere.nofix]] — quasi-spherical mapping of this surface.

## Alternative Names and Variants

### Variants

- [[hemi.inflated]] — the topology-corrected inflated surface produced after Fix Topology (a different stage).

## Related

- [[surface-format]] — on-disk format.
- [[mris_inflate]] — producer.
- [[hemi.smoothwm.nofix]] — input.
- [[hemi.qsphere.nofix]] — downstream.
- [[hemi.inflated]] — topology-fixed successor.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_inflate/mris_inflate.cpp:368`; `scripts/recon-all` lines 3645–3676.
- [[subject-directory]] — lists this file in the `surf/` section.
