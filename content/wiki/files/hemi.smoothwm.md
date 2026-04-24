---
title: "hemi.smoothwm"
type: file
fs_version: "8.2.0"
filename: "hemi.smoothwm"
aliases:
  - "lh.smoothwm"
  - "rh.smoothwm"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_smooth]]"
produced_in_stage: "autorecon2: Smooth2"
produced_at_source:
  - "[`mris_smooth/mris_smooth.cpp:166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_smooth/mris_smooth.cpp#L166)"
  - "[`scripts/recon-all:4034`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4034)"
inputs:
  - "[[hemi.white.preaparc]]"
siblings: []
consumed_by:
  - "[[mris_inflate]]"
  - "[[mris_register]]"
downstream_files:
  - "[[hemi.inflated]]"
  - "[[hemi.sphere.reg]]"
mandatory_for:
  - "[[recon-all]] autorecon2: Inflate2; autorecon3: SurfReg"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.white.preaparc]]"
  - "[[hemi.inflated]]"
  - "[[hemi.smoothwm.nofix]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.smoothwm

> [!file] Glossary entry
> `lh.smoothwm` / `rh.smoothwm` are smoothed versions of [[hemi.white.preaparc]], produced by [[mris_smooth]] in the Smooth2 stage. With 3 smoothing iterations and `-nw` (no-write of curvature/area), this surface provides the geometrically smooth mesh needed for the Inflate2 step and later spherical registration. It is the topology-corrected successor to [[hemi.smoothwm.nofix]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.smoothwm`, `surf/rh.smoothwm`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS.
- **Typical size / shape:** Same vertex/face count as [[hemi.white.preaparc]]; vertex positions shifted by smoothing.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A geometrically smoothed version of [[hemi.white.preaparc]], with vertex positions shifted toward their neighbourhood centroid by 3 iterations of Laplacian-like smoothing. The smoothing reduces high-frequency tessellation artifacts, making the surface suitable as input for iterative inflation. No intensity information is used; vertex connectivity is unchanged.

## How It Is Created

### Producing tool

[[mris_smooth]] with `-n 3 -nw` — reads [[hemi.white.preaparc]], applies 3 smoothing iterations, and writes the result without curvature or area files.

```bash
# Smooth2 invocation (recon-all line 4034)
mris_smooth -n 3 -nw \
  ../surf/$hemi.white.preaparc \
  ../surf/$hemi.smoothwm
```

### Source reference

- **Write call:** [`mris_smooth/mris_smooth.cpp:166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_smooth/mris_smooth.cpp#L166) — `MRISwrite(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:4034`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4034)

### Pipeline stage

[[recon-all]] autorecon2, **Smooth2** stage (`-smooth2`). Touch sentinel: `touch/$hemi.smoothwm2.touch`.

### Inputs required

- [[hemi.white.preaparc]] — preliminary white surface.

## How It Is Used

### Direct downstream consumers

- [[mris_inflate]] (Inflate2) — reads `smoothwm` to produce [[hemi.inflated]] (full inflation for spherical mapping).
- [[mris_register]] (via rca-surfreg) — uses `smoothwm` as one of the registration dependency inputs.

### Downstream files derived from this one

- [[hemi.inflated]] — inflated version for spherical mapping.
- [[hemi.sphere.reg]] — registered sphere (depends on smoothwm via inflate → sphere chain).

## Alternative Names and Variants

### Variants

- [[hemi.smoothwm.nofix]] — the pre-topology-fix smoothed surface produced in Smooth1. `smoothwm` is the topology-corrected successor.

## Related

- [[surface-format]] — on-disk format.
- [[mris_smooth]] — producer.
- [[hemi.white.preaparc]] — input surface.
- [[hemi.inflated]] — downstream.
- [[hemi.smoothwm.nofix]] — pre-fix predecessor.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_smooth/mris_smooth.cpp:166`; `scripts/recon-all` lines 4007–4046.
- [[subject-directory]] — lists this file in the `surf/` section.
