---
title: "hemi.smoothwm.nofix"
type: file
fs_version: "8.2.0"
filename: "hemi.smoothwm.nofix"
aliases:
  - "lh.smoothwm.nofix"
  - "rh.smoothwm.nofix"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_smooth]]"
produced_in_stage: "autorecon2: Smooth1"
produced_at_source:
  - "[`mris_smooth/mris_smooth.cpp:368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_smooth/mris_smooth.cpp#L368)"
  - "[`scripts/recon-all:3627`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3627)"
inputs:
  - "[[hemi.orig.nofix]]"
siblings: []
consumed_by:
  - "[[mris_inflate]]"
downstream_files:
  - "[[hemi.inflated.nofix]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Inflate1"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.orig.nofix]]"
  - "[[hemi.inflated.nofix]]"
  - "[[hemi.smoothwm]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.smoothwm.nofix

> [!file] Glossary entry
> `lh.smoothwm.nofix` / `rh.smoothwm.nofix` are smoothed versions of [[hemi.orig.nofix]], produced by [[mris_smooth]] in the Smooth1 stage. Smoothing reduces the jaggedness of the tessellated surface (an artifact of marching-cubes), making it suitable as input for the inflation step. The `-nw` flag suppresses writing of curvature and area files at this stage. As with all `.nofix` surfaces, topological defects from the original tessellation are still present.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.smoothwm.nofix`, `surf/rh.smoothwm.nofix`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS.
- **Typical size / shape:** Same vertex/face count as [[hemi.orig.nofix]]; vertex positions shifted by smoothing.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A geometrically smoothed version of [[hemi.orig.nofix]], with the same mesh topology (vertices and faces) but with vertex positions shifted toward the centroid of their neighbourhood through iterative Laplacian-like smoothing. The smoothing operates on the vertex positions only; no intensity information is used.

## How It Is Created

### Producing tool

[[mris_smooth]] with `-nw` (no-write of curvature/area). Reads [[hemi.orig.nofix]], applies the default number of smoothing iterations, and writes the smoothed surface positions.

```bash
# Smooth1 invocation (recon-all line 3624–3627)
mris_smooth -nw ../surf/lh.orig.nofix ../surf/lh.smoothwm.nofix
```

### Source reference

- **Write call:** [`mris_smooth/mris_smooth.cpp:368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_smooth/mris_smooth.cpp#L368) — `MRISwrite(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:3627`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3627)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Smooth1** stage (`-smooth1`). Touch sentinel: `touch/$hemi.smoothwm1.touch`.

### Inputs required

- [[hemi.orig.nofix]] — raw tessellated surface with possible topology defects.

### Siblings (co-produced outputs)

Both `lh.smoothwm.nofix` and `rh.smoothwm.nofix` are produced per-hemisphere in the same stage.

## How It Is Used

### Direct downstream consumers

- [[mris_inflate]] — reads `smoothwm.nofix` to produce [[hemi.inflated.nofix]] (Inflate1 stage).

### Downstream files derived from this one

- [[hemi.inflated.nofix]] — inflated version.

## Alternative Names and Variants

### Variants

- [[hemi.smoothwm]] — the topology-corrected smoothed white matter surface produced after Fix Topology. `smoothwm.nofix` is the pre-fix version.

## Related

- [[surface-format]] — on-disk format.
- [[mris_smooth]] — producer.
- [[hemi.orig.nofix]] — input.
- [[hemi.inflated.nofix]] — downstream.
- [[hemi.smoothwm]] — topology-fixed successor.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_smooth/mris_smooth.cpp:368`; `scripts/recon-all` lines 3611–3643.
- [[subject-directory]] — lists this file in the `surf/` section.
