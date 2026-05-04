---
title: "hemi.sphere.reg"
type: file
fs_version: "8.2.0"
filename: "hemi.sphere.reg"
aliases:
  - "lh.sphere.reg"
  - "rh.sphere.reg"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_register]]"
produced_in_stage: "autorecon3: SurfReg"
produced_at_source:
  - "[`mris_register/mris_register.cpp:632`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_register/mris_register.cpp#L632)"
  - "[`scripts/rca-surfreg:120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L120)"
inputs:
  - "[[hemi.sphere]]"
  - "[[hemi.sulc]]"
  - "[[hemi.curv]]"
  - "[[hemi.smoothwm]]"
siblings:
  - "[[hemi.fsaverage.sphere.reg]]"
consumed_by:
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_thickness_diff]]"
downstream_files:
  - "[[hemi.aparc.annot]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Parcellation, Stats"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.sphere]]"
  - "[[hemi.fsaverage.sphere.reg]]"
  - "[[fsaverage]]"
  - "[[mris_register]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.sphere.reg

> [!file] Glossary entry
> `lh.sphere.reg` / `rh.sphere.reg` are spherical surfaces registered to the fsaverage template atlas, produced by [[mris_register]] (invoked via `rca-surfreg`) in the SurfReg stage of autorecon3. Registration aligns the subject's spherical surface to the fsaverage atlas using sulcal depth ([[hemi.sulc]]) and mean curvature ([[hemi.curv]]) as folding features. The registered sphere enables atlas-based parcellation ([[mris_ca_label]]) and inter-subject morphometric comparisons. A symlink `hemi.fsaverage.sphere.reg` → `hemi.sphere.reg` is created immediately after.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.sphere.reg`, `surf/rh.sphere.reg`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex coordinates on a unit sphere aligned to fsaverage atlas space.
- **Typical size / shape:** Same vertex/face count as [[hemi.sphere]].
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

Vertex positions on a unit sphere, re-parameterised so that each vertex's angular position corresponds to the matched location on the fsaverage atlas sphere. The mesh topology is identical to [[hemi.sphere]]; only the vertex positions differ (rotated/warped to align with the atlas).

## How It Is Created

### Producing tool

[[mris_register]] with `-curv` — reads [[hemi.sphere]] (or a prior base registration in longitudinal mode) and iteratively deforms it to match the fsaverage curvature atlas (`.tif` file), using [[hemi.sulc]] and [[hemi.curv]] as cost-function features.

```bash
# SurfReg invocation via rca-surfreg (scripts/rca-surfreg ~line 120)
mris_register -curv -threads $OMP_NUM_THREADS \
  $surfdir/$hemi.sphere \
  ${AvgCurvTifPath}/$hemi.${AvgCurvTif} \
  $surfdir/$hemi.sphere.reg

# Symlink created immediately after
ln -sf $hemi.sphere.reg $hemi.fsaverage.sphere.reg
```

### Source reference

- **Write call:** [`mris_register/mris_register.cpp:632`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_register/mris_register.cpp#L632) — `MRISwrite(mris, out_fname)`
- **Pipeline invocation:** [`scripts/rca-surfreg:120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L120)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **SurfReg** stage (`-surfreg`), invoked via `rca-surfreg`.

### Inputs required

- [[hemi.sphere]] — unregistered spherical surface.
- [[hemi.sulc]] — sulcal depth folding feature.
- [[hemi.curv]] — mean curvature folding feature.
- [[hemi.smoothwm]] — listed as a dependency for update-checking.
- fsaverage curvature atlas `.tif` file (from `$FREESURFER_HOME/average/`).

### Siblings (co-produced outputs)

- [[hemi.fsaverage.sphere.reg]] — symlink pointing to `hemi.sphere.reg`, created immediately after registration.

## How It Is Used

### Direct downstream consumers

- [[mris_ca_label]] (Parcellation) — uses `sphere.reg` to look up atlas-based parcellation labels from a trained classifier, producing [[hemi.aparc.annot]] and related annotations.
- [[mris_anatomical_stats]] — uses `sphere.reg` for parcellation-based stats.
- [[mris_thickness_diff]] — uses inter-subject sphere.reg for group-level thickness comparisons.

### Downstream files derived from this one

- [[hemi.aparc.annot]] — cortical parcellation derived using the registered sphere.
- [[hemi.aparc.a2009s.annot]], [[hemi.aparc.DKTatlas.annot]] — alternative atlas parcellations.

## Related

- [[surface-format]] — on-disk format.
- [[mris_register]] — producer.
- [[hemi.sphere]] — input unregistered sphere.
- [[hemi.fsaverage.sphere.reg]] — symlink alias.
- [[fsaverage]] — atlas target.
- [[hemi.sulc]], [[hemi.curv]] — folding features used for registration.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_register/mris_register.cpp:632`; `scripts/rca-surfreg` lines 100–135.
- [[subject-directory]] — lists this file in the `surf/` section.
