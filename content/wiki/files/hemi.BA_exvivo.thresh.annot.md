---
title: "hemi.BA_exvivo.thresh.annot"
type: file
fs_version: "8.2.0"
filename: "hemi.BA_exvivo.thresh.annot"
aliases:
  - "lh.BA_exvivo.thresh.annot"
  - "rh.BA_exvivo.thresh.annot"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer annotation (binary)"
binary: true
produced_by:
  - "[[mris_label2annot]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5546`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5546)"
inputs:
  - "[[hemi.BA_exvivo.thresh.label]]"
siblings:
  - "[[hemi.BA_exvivo.annot]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.BA_exvivo.thresh.stats]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.BA_exvivo.thresh.label]]"
  - "[[hemi.BA_exvivo.thresh.stats]]"
  - "[[hemi.BA_exvivo.annot]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.BA_exvivo.thresh.annot

> [!file] Glossary entry
> `lh.BA_exvivo.thresh.annot` / `rh.BA_exvivo.thresh.annot` are probability-thresholded versions of [[hemi.BA_exvivo.annot]], produced by merging `.thresh.label` files (which only include vertices exceeding a minimum probability threshold in the fsaverage atlas). The result is a sparser but higher-confidence Brodmann Area annotation. The companion stats file is [[hemi.BA_exvivo.thresh.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.BA_exvivo.thresh.annot`, `label/rh.BA_exvivo.thresh.annot`
- **Format:** FreeSurfer binary annotation. Color table: `$FREESURFER_HOME/average/colortable_BA_thresh.txt`.

## How It Is Created

### Producing tool

`mris_label2annot` — merges [[hemi.BA_exvivo.thresh.label]] files using `colortable_BA_thresh.txt`.

```bash
# Thresh annot invocation (recon-all lines 5546–5570)
mris_label2annot \
  --s $subjid --hemi $hemi \
  --ctab $FREESURFER_HOME/average/colortable_BA_thresh.txt \
  --l $hemi.BA1_exvivo.thresh.label \
  --l $hemi.BA2_exvivo.thresh.label \
  ... \
  --l $hemi.entorhinal_exvivo.thresh.label \
  --a BA_exvivo.thresh \
  --maxstatwinner --noverbose
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5546`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5546)

### Pipeline stage

[[recon-all]] autorecon3, **BA_exvivo Labels** stage. Produced in the same loop as [[hemi.BA_exvivo.annot]].

### Inputs required

- [[hemi.BA_exvivo.thresh.label]] — thresholded individual Brodmann Area label files.

## How It Is Used

Passed to `mris_anatomical_stats -a $annot` to produce [[hemi.BA_exvivo.thresh.stats]].

## Related

- [[hemi.BA_exvivo.thresh.label]] — input label files.
- [[hemi.BA_exvivo.thresh.stats]] — downstream stats.
- [[hemi.BA_exvivo.annot]] — unthresholded version.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5545–5570.
- [[subject-directory]] — lists this file in the `label/` section.
