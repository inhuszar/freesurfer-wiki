---
title: "hemi.aparc.a2009s.annot"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.a2009s.annot"
aliases:
  - "lh.aparc.a2009s.annot"
  - "rh.aparc.a2009s.annot"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer annotation"
binary: true
produced_by:
  - "[[mris_ca_label]]"
produced_in_stage: "autorecon3: CortParc2"
produced_at_source:
  - "[`mris_ca_label/mris_ca_label.cpp:279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_label/mris_ca_label.cpp#L279)"
  - "[`scripts/recon-all:4887`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4887)"
inputs:
  - "[[hemi.sphere.reg]]"
  - "[[hemi.cortex.label]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.aparc.a2009s.stats]]"
  - "[[aparc.a2009s+aseg.mgz]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: CortParc2 (run by default)"
editable: false
related:
  - "[[hemi.aparc.annot]]"
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[mris_ca_label]]"
  - "[[hemi.sphere.reg]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.aparc.a2009s.annot

> [!file] Glossary entry
> `lh.aparc.a2009s.annot` / `rh.aparc.a2009s.annot` are FreeSurfer annotation files assigning each cortical vertex a label from the Destrieux 2009 atlas (74 cortical regions per hemisphere, atlas `CDaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs`). The parcellation is produced by [[mris_ca_label]] in the CortParc2 stage using the registered sphere ([[hemi.sphere.reg]]). It provides finer-grained parcellation than the Desikan-Killiany atlas ([[hemi.aparc.annot]]).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.aparc.a2009s.annot`, `label/rh.aparc.a2009s.annot`
- **Format:** FreeSurfer binary annotation file (same format as [[hemi.aparc.annot]]).
- **Typical regions:** 74 cortical parcels + medial wall per hemisphere (Destrieux atlas).

## How It Is Created

### Producing tool

[[mris_ca_label]] with the Destrieux GCS atlas.

```bash
# CortParc2 invocation (recon-all line 4887)
mris_ca_label \
  -l ../label/$hemi.cortex.label \
  -aseg ../mri/$AsegForSurf \
  $subjid $hemi ../surf/$hemi.sphere.reg \
  $GCSDIR/$hemi.CDaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs \
  ../label/$hemi.aparc.a2009s.annot
```

### Source reference

- **Write call:** [`mris_ca_label/mris_ca_label.cpp:279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_label/mris_ca_label.cpp#L279) — `MRISwriteAnnotation(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:4887`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4887)

### Pipeline stage

[[recon-all]] autorecon3, **CortParc2** stage (`-cortparc2`). Touch sentinel: `touch/$hemi.aparc2.touch`.

### Inputs required

- [[hemi.sphere.reg]], [[hemi.cortex.label]], [[aseg.presurf.mgz]], Destrieux GCS atlas.

## How It Is Used

- [[mris_anatomical_stats]] — produces [[hemi.aparc.a2009s.stats]].
- Parcellated volume tool — produces [[aparc.a2009s+aseg.mgz]].

## Related

- [[hemi.aparc.annot]] — Desikan-Killiany atlas (primary parcellation).
- [[hemi.aparc.DKTatlas.annot]] — DKT atlas.
- [[mris_ca_label]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_ca_label/mris_ca_label.cpp:279`; `scripts/recon-all` lines 4874–4918.
- [[subject-directory]] — lists this file in the `label/` section.
