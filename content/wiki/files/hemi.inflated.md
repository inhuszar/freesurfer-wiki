---
title: "hemi.inflated"
type: file
fs_version: "8.2.0"
filename: "hemi.inflated"
aliases:
  - "lh.inflated"
  - "rh.inflated"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_inflate]]"
produced_in_stage: "autorecon2: Inflate2"
produced_at_source:
  - "[`mris_inflate/mris_inflate.cpp:233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L233)"
  - "[`scripts/recon-all:4055`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4055)"
inputs:
  - "[[hemi.smoothwm]]"
siblings:
  - "[[hemi.sulc]]"
consumed_by:
  - "[[mris_sphere]]"
  - "[[mris_curvature]]"
downstream_files:
  - "[[hemi.sphere]]"
  - "[[hemi.sulc]]"
  - "[[hemi.inflated.H]]"
  - "[[hemi.inflated.K]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Sphere, CurvHK"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.smoothwm]]"
  - "[[hemi.sphere]]"
  - "[[hemi.sulc]]"
  - "[[hemi.inflated.nofix]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.inflated

> [!file] Glossary entry
> `lh.inflated` / `rh.inflated` are the fully inflated cortical surfaces produced by [[mris_inflate]] in the Inflate2 stage, derived from [[hemi.smoothwm]]. Unlike [[hemi.inflated.nofix]], these surfaces have passed topology correction and represent a topologically valid hemisphere. The inflated surface is the input to the spherical mapping step ([[hemi.sphere]]) and is co-produced with [[hemi.sulc]] (sulcal depth).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.inflated`, `surf/rh.inflated`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions inflated toward a sphere, centered and optionally area-scaled.
- **Typical size / shape:** Same vertex/face count as [[hemi.smoothwm]].
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

Vertex positions representing the fully inflated hemisphere, computed by iteratively expanding sulci and contracting gyri until the surface approaches a sphere. Vertex coordinates are centered (zero mean) and optionally scaled to preserve total brain area. The topology is identical to [[hemi.smoothwm]] and is guaranteed to be a closed genus-0 manifold.

## How It Is Created

### Producing tool

[[mris_inflate]] — reads [[hemi.smoothwm]], applies the full inflation procedure (unlike Inflate1 which uses `-no-save-sulc`), and writes the inflated surface. Sulcal depth (`lh.sulc`) is written as a co-product.

```bash
# Inflate2 invocation (recon-all line 4055)
mris_inflate \
  ../surf/$hemi.smoothwm \
  ../surf/$hemi.inflated
```

The sulcal depth map ([[hemi.sulc]]) is a co-product:
- written by `MRISwriteCurvature(mris, fname)` where `fname` resolves to `lh.sulc` / `rh.sulc`.

### Source reference

- **Write call (inflated):** [`mris_inflate/mris_inflate.cpp:233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L233) — `MRISwrite(mris, out_fname)`
- **Write call (sulc):** [`mris_inflate/mris_inflate.cpp:248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L248) — `MRISwriteCurvature(mris, fname)`
- **Pipeline invocation:** [`scripts/recon-all:4055`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4055)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Inflate2** stage (`-inflate2`). Touch sentinel: `touch/$hemi.inflate2.touch`.

### Inputs required

- [[hemi.smoothwm]] — topology-corrected smoothed white surface.

### Siblings (co-produced outputs)

- [[hemi.sulc]] — sulcal depth map written in the same `mris_inflate` invocation.

## How It Is Used

### Direct downstream consumers

- [[mris_sphere]] (Sphere) — reads `inflated` to produce [[hemi.sphere]] (spherical mapping).
- [[mris_curvature]] (CurvHK) — reads `inflated` to compute mean and Gaussian curvature ([[hemi.inflated.H]], [[hemi.inflated.K]]).

### Downstream files derived from this one

- [[hemi.sphere]] — spherical mapping for cross-subject registration.
- [[hemi.inflated.H]], [[hemi.inflated.K]] — curvature maps of the inflated surface.

## Alternative Names and Variants

### Variants

- [[hemi.inflated.nofix]] — the pre-topology-fix inflated surface from Inflate1. `inflated` is the topology-corrected successor, derived from the white surface rather than directly from `smoothwm.nofix`.

## Related

- [[surface-format]] — on-disk format.
- [[mris_inflate]] — producer.
- [[hemi.smoothwm]] — input.
- [[hemi.sphere]] — downstream spherical mapping.
- [[hemi.sulc]] — co-produced sulcal depth.
- [[hemi.inflated.nofix]] — pre-fix predecessor.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_inflate/mris_inflate.cpp:233`; `scripts/recon-all` lines 4047–4065.
- [[subject-directory]] — lists this file in the `surf/` section.
