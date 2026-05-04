---
title: "hemi.qsphere.nofix"
type: file
fs_version: "8.2.0"
filename: "hemi.qsphere.nofix"
aliases:
  - "lh.qsphere.nofix"
  - "rh.qsphere.nofix"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_sphere]]"
produced_in_stage: "autorecon2: QSphere"
produced_at_source:
  - "[`mris_sphere/mris_sphere.cpp:632`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_sphere/mris_sphere.cpp#L632)"
  - "[`scripts/recon-all:3693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3693)"
inputs:
  - "[[hemi.inflated.nofix]]"
siblings: []
consumed_by:
  - "[[mris_fix_topology]]"
  - "[[mris_place_surface]]"
downstream_files:
  - "[[hemi.orig]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Fix Topology"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.inflated.nofix]]"
  - "[[hemi.orig]]"
  - "[[topology-correction]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.qsphere.nofix

> [!file] Glossary entry
> `lh.qsphere.nofix` / `rh.qsphere.nofix` are quasi-spherical mappings of [[hemi.inflated.nofix]], produced by [[mris_sphere]] with the `-q` flag (quick quasi-conformal map). This mapping is used exclusively by [[mris_fix_topology]] to identify and correct topological defects. It is not the final spherical registration surface; that is [[hemi.sphere]], produced after topology correction.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.qsphere.nofix`, `surf/rh.qsphere.nofix`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions mapped onto a unit sphere surface.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A vertex-for-vertex mapping of [[hemi.inflated.nofix]] onto a unit sphere, computed by a quasi-conformal flattening algorithm. Vertex coordinates lie on (or near) the sphere surface. The mesh topology is the same as [[hemi.inflated.nofix]] and may still contain defects. This representation is used by topology-correction algorithms to detect non-spherical topology (handles and holes) in a geometry where such defects are easily identified as non-bijective mappings.

## How It Is Created

### Producing tool

[[mris_sphere]] with `-q -p 6 -a 128` — the quasi-spherical mode applies a multi-resolution iterative map rather than the full energy-minimisation inflation.

```bash
# QSphere invocation (recon-all line 3690–3693)
mris_sphere -q -p 6 -a 128 \
  ../surf/lh.inflated.nofix \
  ../surf/lh.qsphere.nofix
```

### Source reference

- **Write call:** [`mris_sphere/mris_sphere.cpp:632`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_sphere/mris_sphere.cpp#L632) — `MRISwrite(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:3693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3693)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **QSphere** stage (`-qsphere`). Touch sentinel: `touch/$hemi.qsphere.touch`.

### Inputs required

- [[hemi.inflated.nofix]] — inflated pre-fix surface.

## How It Is Used

### Direct downstream consumers

- [[mris_fix_topology]] (or [[mris_place_surface]] in newer topology correction) — uses `qsphere.nofix` to detect and patch topological defects, producing [[hemi.orig]].

### Downstream files derived from this one

- [[hemi.orig]] — topology-corrected surface.

## Related

- [[surface-format]] — on-disk format.
- [[mris_sphere]] — producer.
- [[hemi.inflated.nofix]] — input.
- [[hemi.orig]] — topology-corrected successor.
- [[topology-correction]] — explains the role of qsphere in defect detection.
- [[hemi.sphere]] — the true spherical surface produced later after topology correction.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_sphere/mris_sphere.cpp:632`; `scripts/recon-all` lines 3678–3709.
- [[subject-directory]] — lists this file in the `surf/` section.
