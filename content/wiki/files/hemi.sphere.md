---
title: "hemi.sphere"
type: file
fs_version: "8.2.0"
filename: "hemi.sphere"
aliases:
  - "lh.sphere"
  - "rh.sphere"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_sphere]]"
produced_in_stage: "autorecon3: Sphere"
produced_at_source:
  - "[`mris_sphere/mris_sphere.cpp:428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_sphere/mris_sphere.cpp#L428)"
  - "[`scripts/recon-all:4188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4188)"
inputs:
  - "[[hemi.inflated]]"
siblings: []
consumed_by:
  - "[[mris_register]]"
downstream_files:
  - "[[hemi.sphere.reg]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: SurfReg"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.inflated]]"
  - "[[hemi.sphere.reg]]"
  - "[[hemi.qsphere.nofix]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.sphere

> [!file] Glossary entry
> `lh.sphere` / `rh.sphere` are the spherically-mapped cortical surfaces produced by [[mris_sphere]] in the Sphere stage of autorecon3. [[mris_sphere]] applies a full energy-minimisation inflation to map [[hemi.inflated]] onto a unit sphere with minimal area distortion. This surface is then registered to the fsaverage atlas by [[mris_register]] to produce [[hemi.sphere.reg]]. Unlike [[hemi.qsphere.nofix]], `hemi.sphere` is topologically correct and produced after the Fix Topology stage.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.sphere`, `surf/rh.sphere`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex coordinates on a unit sphere (radius ≈ 100 mm in tkr-RAS).
- **Typical size / shape:** Same vertex/face count as [[hemi.inflated]].
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

Vertex positions on a unit sphere, computed by energy-minimisation inflation of [[hemi.inflated]]. The spherical mapping preserves the mesh topology of [[hemi.inflated]] and minimises area distortion, giving each vertex a well-defined angular position on the sphere. The valid geometry (`mris->vg.valid = 0`) is cleared before writing.

## How It Is Created

### Producing tool

[[mris_sphere]] without the `-q` flag (full energy-minimisation mode, in contrast to the quasi-conformal `-q` mode that produces [[hemi.qsphere.nofix]]).

```bash
# Sphere invocation (recon-all line 4188)
mris_sphere -threads $OMP_NUM_THREADS \
  ../surf/$hemi.inflated \
  ../surf/$hemi.sphere
```

### Source reference

- **Write call:** [`mris_sphere/mris_sphere.cpp:428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_sphere/mris_sphere.cpp#L428) — `MRISwrite(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:4188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4188)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **Sphere** stage (`-sphere`). Touch sentinel: `touch/$hemi.sphmorph.touch`.

### Inputs required

- [[hemi.inflated]] — topology-corrected inflated surface.

## How It Is Used

### Direct downstream consumers

- [[mris_register]] (via rca-surfreg, SurfReg) — reads `hemi.sphere` as the unregistered spherical surface; registers it to the fsaverage atlas using [[hemi.sulc]] and [[hemi.curv]] features.

### Downstream files derived from this one

- [[hemi.sphere.reg]] — registered spherical surface aligned to the fsaverage template.

## Alternative Names and Variants

### Variants

- [[hemi.qsphere.nofix]] — earlier quasi-spherical mapping of the pre-fix surface used only for topology correction; not the same as `hemi.sphere`.

## Related

- [[surface-format]] — on-disk format.
- [[mris_sphere]] — producer.
- [[hemi.inflated]] — input surface.
- [[hemi.sphere.reg]] — downstream registered sphere.
- [[hemi.qsphere.nofix]] — early quasi-sphere for topology correction only.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_sphere/mris_sphere.cpp:420–435`; `scripts/recon-all` lines 4162–4200.
- [[subject-directory]] — lists this file in the `surf/` section.
