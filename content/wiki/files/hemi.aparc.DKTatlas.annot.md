---
title: "hemi.aparc.DKTatlas.annot"
type: file
fs_version: "8.2.0"
filename: "hemi.aparc.DKTatlas.annot"
aliases:
  - "lh.aparc.DKTatlas.annot"
  - "rh.aparc.DKTatlas.annot"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer annotation"
binary: true
produced_by:
  - "[[mris_ca_label]]"
produced_in_stage: "autorecon3: CortParc3"
produced_at_source:
  - "[`mris_ca_label/mris_ca_label.cpp:279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_label/mris_ca_label.cpp#L279)"
  - "[`scripts/recon-all:4931`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4931)"
inputs:
  - "[[hemi.sphere.reg]]"
  - "[[hemi.cortex.label]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.aparc.DKTatlas.stats]]"
  - "[[aparc.DKTatlas+aseg.mgz]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: CortParc3 (run by default)"
editable: false
related:
  - "[[hemi.aparc.annot]]"
  - "[[hemi.aparc.a2009s.annot]]"
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

# hemi.aparc.DKTatlas.annot

> [!file] Glossary entry
> `lh.aparc.DKTatlas.annot` / `rh.aparc.DKTatlas.annot` are FreeSurfer annotation files assigning each cortical vertex a label from the Mindboggle DKT atlas (31 cortical regions per hemisphere, atlas `DKTaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs`). Produced by [[mris_ca_label]] in the CortParc3 stage. Used to generate [[aparc.DKTatlas+aseg.mgz]] and [[hemi.aparc.DKTatlas.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.aparc.DKTatlas.annot`, `label/rh.aparc.DKTatlas.annot`
- **Format:** FreeSurfer binary annotation file (same format as [[hemi.aparc.annot]]).
- **Typical regions:** 31 cortical parcels + medial wall per hemisphere (DKT atlas).

## How It Is Created

### Producing tool

[[mris_ca_label]] with the DKT GCS atlas.

```bash
# CortParc3 invocation (recon-all line 4931)
mris_ca_label \
  -l ../label/$hemi.cortex.label \
  -aseg ../mri/$AsegForSurf \
  $subjid $hemi ../surf/$hemi.sphere.reg \
  $GCSDIR/$hemi.DKTaparc.atlas.acfb40.noaparc.i12.2016-08-02.gcs \
  ../label/$hemi.aparc.DKTatlas.annot
```

### Source reference

- **Write call:** [`mris_ca_label/mris_ca_label.cpp:279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_label/mris_ca_label.cpp#L279) — `MRISwriteAnnotation(mris, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:4931`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4931)

### Pipeline stage

[[recon-all]] autorecon3, **CortParc3** stage (`-cortparc3`). Touch sentinel: `touch/$hemi.aparc2.touch`.

### Inputs required

- [[hemi.sphere.reg]], [[hemi.cortex.label]], [[aseg.presurf.mgz]], DKT GCS atlas.

## How It Is Used

- [[mris_anatomical_stats]] — produces [[hemi.aparc.DKTatlas.stats]].
- Parcellated volume tool — produces [[aparc.DKTatlas+aseg.mgz]].

## Related

- [[hemi.aparc.annot]] — Desikan-Killiany atlas (primary).
- [[hemi.aparc.a2009s.annot]] — Destrieux atlas.
- [[mris_ca_label]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_ca_label/mris_ca_label.cpp:279`; `scripts/recon-all` lines 4920–4960.
- [[subject-directory]] — lists this file in the `label/` section.
