---
title: "hemi.BA_exvivo.label"
type: file
fs_version: "8.2.0"
filename: "hemi.BA_exvivo.label"
aliases:
  - "lh.BA1_exvivo.label"
  - "lh.BA2_exvivo.label"
  - "lh.BA3a_exvivo.label"
  - "lh.BA3b_exvivo.label"
  - "lh.BA4a_exvivo.label"
  - "lh.BA4p_exvivo.label"
  - "lh.BA6_exvivo.label"
  - "lh.BA44_exvivo.label"
  - "lh.BA45_exvivo.label"
  - "lh.V1_exvivo.label"
  - "lh.V2_exvivo.label"
  - "lh.MT_exvivo.label"
  - "lh.entorhinal_exvivo.label"
  - "lh.perirhinal_exvivo.label"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer ASCII label"
binary: false
produced_by:
  - "[[mri_label2label]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5453)"
inputs:
  - "[[hemi.sphere.reg]]"
siblings: []
consumed_by:
  - "[[mris_label2annot]]"
downstream_files:
  - "[[hemi.BA_exvivo.annot]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.sphere.reg]]"
  - "[[hemi.BA_exvivo.annot]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.BA_exvivo.label

> [!file] Glossary entry
> The `?h.BA*_exvivo.label` files (one per Brodmann Area region) are individual ASCII label files produced by mapping the corresponding fsaverage BA labels onto the subject surface via surface-based registration. There are 14 regions: BA1, BA2, BA3a, BA3b, BA4a, BA4p, BA6, BA44, BA45, V1, V2, MT, entorhinal_exvivo, and perirhinal_exvivo. Together they are merged into [[hemi.BA_exvivo.annot]] by `mris_label2annot`.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.{BA_NAME}_exvivo.label` (one file per region, both hemispheres)
- **Format:** FreeSurfer ASCII label file (vertex index, x, y, z, value).

## Regions Covered

| Label File | Area |
|---|---|
| `?h.BA1_exvivo.label` | Primary somatosensory cortex (area 1) |
| `?h.BA2_exvivo.label` | Primary somatosensory cortex (area 2) |
| `?h.BA3a_exvivo.label` | Primary somatosensory cortex (area 3a) |
| `?h.BA3b_exvivo.label` | Primary somatosensory cortex (area 3b) |
| `?h.BA4a_exvivo.label` | Primary motor cortex (anterior) |
| `?h.BA4p_exvivo.label` | Primary motor cortex (posterior) |
| `?h.BA6_exvivo.label` | Premotor cortex |
| `?h.BA44_exvivo.label` | Broca's area (pars opercularis) |
| `?h.BA45_exvivo.label` | Broca's area (pars triangularis) |
| `?h.V1_exvivo.label` | Primary visual cortex |
| `?h.V2_exvivo.label` | Secondary visual cortex |
| `?h.MT_exvivo.label` | Middle temporal visual area |
| `?h.entorhinal_exvivo.label` | Entorhinal cortex |
| `?h.perirhinal_exvivo.label` | Perirhinal cortex |

## How It Is Created

### Producing tool

`mri_label2label --regmethod surface` — maps each fsaverage Brodmann Area label to the subject surface using [[hemi.sphere.reg]].

```bash
# BA_exvivo label mapping (recon-all line 5453)
mri_label2label \
  --srcsubject fsaverage \
  --srclabel $SUBJECTS_DIR/fsaverage/label/${hemi}.${balabel}.label \
  --trgsubject $subjid \
  --trglabel ./${hemi}.${balabel}.label \
  --hemi ${hemi} \
  --regmethod surface
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5453)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **BA_exvivo Labels** stage. Labels are generated in three parallel batches before the annotation is assembled.

### Inputs required

- fsaverage `?h.{region}.label` files from `$SUBJECTS_DIR/fsaverage/label/`.
- [[hemi.sphere.reg]] — subject's spherical registration for the mapping.

## How It Is Used

All 14 files are passed to `mris_label2annot` to produce [[hemi.BA_exvivo.annot]].

## Related

- [[hemi.BA_exvivo.annot]] — annotation assembled from these labels.
- [[hemi.BA_exvivo.thresh.label]] — probability-thresholded variants.
- [[fsaverage]] — atlas source subject.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5429–5474.
- [[subject-directory]] — lists these files in the `label/` section.
