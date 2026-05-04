---
title: "hemi.sulc"
type: file
fs_version: "8.2.0"
filename: "hemi.sulc"
aliases:
  - "lh.sulc"
  - "rh.sulc"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "FreeSurfer curvature (binary)"
binary: true
produced_by:
  - "[[mris_inflate]]"
produced_in_stage: "autorecon2: Inflate2"
produced_at_source:
  - "[`mris_inflate/mris_inflate.cpp:248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L248)"
  - "[`scripts/recon-all:4055`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4055)"
inputs:
  - "[[hemi.smoothwm]]"
siblings:
  - "[[hemi.inflated]]"
consumed_by:
  - "[[mris_register]]"
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.sphere.reg]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: SurfReg"
optional_for: []
editable: false
related:
  - "[[hemi.inflated]]"
  - "[[hemi.curv]]"
  - "[[mris_inflate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.sulc

> [!file] Glossary entry
> `lh.sulc` / `rh.sulc` store per-vertex sulcal depth values computed as a by-product of the [[hemi.inflated]] step in [[mris_inflate]]. Each vertex value encodes the signed distance (in mm, zero-mean) between the inflated and the non-inflated surface projected onto the white surface normal, approximating how deep into a sulcus (positive) or how elevated on a gyrus (negative) the vertex lies. Sulcal depth is a key feature used by [[mris_register]] for cross-subject spherical registration.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.sulc`, `surf/rh.sulc`
- **Format:** FreeSurfer binary curvature file — same format as [[hemi.curv]] (3 int32 header + float32 per vertex). Values are zero-mean sulcal depth in mm.
- **Typical size:** ~4 × N_vertices bytes + small header.

## What It Contains

Per-vertex sulcal depth: a scalar value per cortical surface vertex representing the vertex's position relative to the mean folding level of the hemisphere. Positive values indicate sulcal fundi (buried cortex); negative values indicate gyral crowns. The distribution is zero-mean across the hemisphere.

## How It Is Created

### Producing tool

[[mris_inflate]] — produced as a co-product of computing [[hemi.inflated]]. After writing the inflated surface, `mris_inflate` calls `MRISzeroMeanCurvature` to zero-mean the depth values, then writes them as a curvature file named `lh.sulc` / `rh.sulc`.

```bash
# Inflate2 invocation (recon-all line 4055) — writes hemi.inflated AND hemi.sulc
mris_inflate \
  ../surf/$hemi.smoothwm \
  ../surf/$hemi.inflated
```

### Source reference

- **Write call:** [`mris_inflate/mris_inflate.cpp:248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_inflate/mris_inflate.cpp#L248) — `MRISwriteCurvature(mris, fname)` where `fname` = `lh.sulc` / `rh.sulc`
- **Pipeline invocation:** [`scripts/recon-all:4055`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4055)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Inflate2** stage (`-inflate2`). Co-produced with [[hemi.inflated]].

### Inputs required

- [[hemi.smoothwm]] — input to mris_inflate; sulcal depth is derived from the displacement during inflation.

### Siblings (co-produced outputs)

- [[hemi.inflated]] — the inflated surface written in the same invocation.

## How It Is Used

### Direct downstream consumers

- [[mris_register]] (via rca-surfreg, SurfReg) — uses `sulc` as a folding feature for cross-subject spherical registration.
- [[mris_anatomical_stats]] — reports mean sulcal depth per parcellation region.

### Downstream files derived from this one

- [[hemi.sphere.reg]] — registered sphere produced using sulcal depth as a registration feature.

## Related

- [[hemi.inflated]] — co-produced inflated surface.
- [[mris_inflate]] — producer.
- [[hemi.curv]] — analogous per-vertex curvature map.
- [[mris_register]] — primary consumer for cross-subject registration.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_inflate/mris_inflate.cpp:235–252`; `scripts/recon-all` lines 4047–4065.
- [[subject-directory]] — lists this file in the `surf/` section.
