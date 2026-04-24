---
title: "hemi.aparc.annot"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.annot"
aliases:
  - "lh.aparc.annot"
  - "rh.aparc.annot"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer annotation"
binary: true
produced_by:
  - "[[mris_ca_label]]"
produced_in_stage: "autorecon3: Parcellation (CortParc)"
produced_at_source:
  - "[`mris_ca_label/mris_ca_label.cpp:279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_label/mris_ca_label.cpp#L279)"
  - "[`scripts/recon-all:4351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4351)"
inputs:
  - "[[hemi.sphere.reg]]"
  - "[[hemi.white.preaparc]]"
  - "[[hemi.cortex.label]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mris_place_surface]]"
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.white]]"
  - "[[hemi.aparc.stats]]"
  - "[[aparc+aseg.mgz]]"
mandatory_for:
  - "[[recon-all]] autorecon3: WhiteSurfs, Stats, Parcellated volumes"
optional_for: []
editable: false
related:
  - "[[hemi.sphere.reg]]"
  - "[[mris_ca_label]]"
  - "[[hemi.aparc.a2009s.annot]]"
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[hemi.aparc.stats]]"
  - "[[fsaverage]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.aparc.annot

> [!file] Glossary entry
> `lh.aparc.annot` / `rh.aparc.annot` are FreeSurfer annotation files assigning each cortical surface vertex a label from the Desikan-Killiany atlas (34 cortical regions per hemisphere). The parcellation is produced by [[mris_ca_label]] using a trained Gaussian classifier atlas registered via [[hemi.sphere.reg]] to the fsaverage template. This is the primary parcellation used throughout recon-all for statistics, surface-guided white surface placement, and generating [[aparc+aseg.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.aparc.annot`, `label/rh.aparc.annot`
- **Format:** FreeSurfer binary annotation file — per-vertex packed RGB label (int32) plus a colour table mapping RGB values to region names and indices.
- **Typical regions:** 34 cortical parcels + medial wall (label 0 = unknown) per hemisphere.

## What It Contains

Per-vertex cortical region assignments from the Desikan-Killiany atlas. Each vertex is assigned a region label (e.g., `superiorfrontal`, `precentral`) and a corresponding colour. Medial-wall vertices receive the `unknown` label. The annotation is read by many tools as a region mask.

## How It Is Created

### Producing tool

[[mris_ca_label]] — reads the registered sphere ([[hemi.sphere.reg]]), the pre-trained GCS atlas, and the cortex label ([[hemi.cortex.label]]) to assign parcellation labels using Markov random field classification on the sphere.

```bash
# Cortical Parc invocation (recon-all line 4351)
mris_ca_label \
  -l ../label/$hemi.cortex.label \
  -aseg ../mri/$AsegForSurf \
  $subjid $hemi ../surf/$hemi.sphere.reg \
  $GCSDIR/$hemi.aparc.gcs \
  ../label/$hemi.aparc.annot
```

### Source reference

- **Write call:** [`mris_ca_label/mris_ca_label.cpp:279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_label/mris_ca_label.cpp#L279) — `MRISwriteAnnotation(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:4351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4351)

### Pipeline stage

[[recon-all]] autorecon3, **Cortical Parcellation** stage (`-cortparc`). Touch sentinel: `touch/$hemi.aparc.touch`.

### Inputs required

- [[hemi.sphere.reg]] — registered spherical surface for atlas look-up.
- [[hemi.cortex.label]] — cortex mask to restrict parcellation.
- [[aseg.presurf.mgz]] — subcortical segmentation for boundary constraints.
- Pre-trained GCS atlas (`$GCSDIR/$hemi.aparc.gcs`).

## How It Is Used

### Direct downstream consumers

- [[mris_place_surface]] (WhiteSurfs) — uses `--aparc` to constrain the final white surface placement.
- [[mris_place_surface]] (Pial) — uses `--aparc` to constrain pial placement.
- [[mris_anatomical_stats]] — computes per-region cortical statistics (thickness, area, volume) → [[hemi.aparc.stats]].

### Downstream files derived from this one

- [[hemi.aparc.stats]] — per-region morphometric statistics.
- [[aparc+aseg.mgz]] — volumetric parcellation combining aseg and aparc labels.

## Alternative Names and Variants

- [[hemi.aparc.a2009s.annot]] — Destrieux atlas parcellation (74 regions).
- [[hemi.aparc.DKTatlas.annot]] — DKT atlas parcellation (31 regions).

## Related

- [[mris_ca_label]] — producer.
- [[hemi.sphere.reg]] — registration used for atlas look-up.
- [[hemi.cortex.label]] — cortex mask.
- [[fsaverage]] — atlas registration target.
- [[hemi.aparc.stats]] — downstream statistics.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_ca_label/mris_ca_label.cpp:279`; `scripts/recon-all` lines 4335–4390.
- [[subject-directory]] — lists this file in the `label/` section.
