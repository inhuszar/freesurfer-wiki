---
title: "hemi.BA_exvivo.thresh.label"
type: file
fs_version: "8.2.0"
filename: "hemi.BA_exvivo.thresh.label"
aliases:
  - "lh.BA1_exvivo.thresh.label"
  - "lh.V1_exvivo.thresh.label"
  - "lh.entorhinal_exvivo.thresh.label"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer ASCII label"
binary: false
produced_by:
  - "[[mri_label2label]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5495`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5495)"
inputs:
  - "[[hemi.sphere.reg]]"
siblings: []
consumed_by:
  - "[[mris_label2annot]]"
downstream_files:
  - "[[hemi.BA_exvivo.thresh.annot]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.BA_exvivo.label]]"
  - "[[hemi.BA_exvivo.thresh.annot]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.BA_exvivo.thresh.label

> [!file] Glossary entry
> The `?h.{BA_NAME}_exvivo.thresh.label` files are probability-thresholded variants of [[hemi.BA_exvivo.label]], produced by mapping the corresponding `.thresh.label` files from fsaverage via surface-based registration. They cover only the 13 non-VPNL regions (BA1–BA6, BA44, BA45, V1, V2, MT, entorhinal, perirhinal) and contain only vertices that exceeded a minimum probability threshold in the original exvivo parcellation. Together they form [[hemi.BA_exvivo.thresh.annot]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.{region}_exvivo.thresh.label` (one per region)
- **Format:** FreeSurfer ASCII label file (vertex index, x, y, z, value).

## How It Is Created

### Producing tool

`mri_label2label --regmethod surface` — maps fsaverage `.thresh.label` files to the subject surface.

```bash
# Thresh label mapping (recon-all line 5495)
mri_label2label \
  --srcsubject fsaverage \
  --srclabel $SUBJECTS_DIR/fsaverage/label/${hemi}.${balabel}.thresh.label \
  --trgsubject $subjid \
  --trglabel ./${hemi}.${balabel}.thresh.label \
  --hemi ${hemi} \
  --regmethod surface
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5495`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5495)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **BA_exvivo Labels** stage. Produced in a second parallel batch after the full [[hemi.BA_exvivo.label]] files.

### Inputs required

- fsaverage `?h.{region}.thresh.label` files from `$SUBJECTS_DIR/fsaverage/label/`.
- [[hemi.sphere.reg]] — surface registration.

## How It Is Used

Merged into [[hemi.BA_exvivo.thresh.annot]] by `mris_label2annot`.

## Related

- [[hemi.BA_exvivo.label]] — unthresholded counterparts.
- [[hemi.BA_exvivo.thresh.annot]] — annotation assembled from these labels.
- [[fsaverage]] — atlas source.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5490–5516.
- [[subject-directory]] — lists these files in the `label/` section.
