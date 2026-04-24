---
title: "hemi.BA_exvivo.annot"
type: file
fs_version: "8.2.0"
filename: "hemi.BA_exvivo.annot"
aliases:
  - "lh.BA_exvivo.annot"
  - "rh.BA_exvivo.annot"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer annotation (binary)"
binary: true
produced_by:
  - "[[mris_label2annot]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5519)"
inputs:
  - "[[hemi.BA_exvivo.label]]"
siblings:
  - "[[hemi.BA_exvivo.thresh.annot]]"
  - "[[hemi.mpm.vpnl.annot]]"
consumed_by:
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.BA_exvivo.stats]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.BA_exvivo.label]]"
  - "[[hemi.BA_exvivo.stats]]"
  - "[[hemi.BA_exvivo.thresh.annot]]"
  - "[[fsaverage]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.BA_exvivo.annot

> [!file] Glossary entry
> `lh.BA_exvivo.annot` / `rh.BA_exvivo.annot` are per-vertex Brodmann Area parcellation annotations produced by merging 14 individual [[hemi.BA_exvivo.label]] files (mapped from fsaverage) using `mris_label2annot`. The annotation covers primary and secondary somatosensory cortex, motor cortex, visual and auditory areas, and entorhinal/perirhinal cortex, based on post-mortem cytoarchitectonic maps registered to the surface atlas. The companion stats file is [[hemi.BA_exvivo.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.BA_exvivo.annot`, `label/rh.BA_exvivo.annot`
- **Format:** FreeSurfer binary annotation. Color table: `$FREESURFER_HOME/average/colortable_BA.txt`.

## How It Is Created

### Producing tool

`mris_label2annot` — merges per-BA label files into a single annotation using the `colortable_BA.txt` color table, with `--maxstatwinner` to handle overlapping labels.

```bash
# BA_exvivo Labels invocation (recon-all lines 5519–5543)
mris_label2annot \
  --s $subjid --hemi $hemi \
  --ctab $FREESURFER_HOME/average/colortable_BA.txt \
  --l $hemi.BA1_exvivo.label \
  --l $hemi.BA2_exvivo.label \
  --l $hemi.BA3a_exvivo.label \
  --l $hemi.BA3b_exvivo.label \
  --l $hemi.BA4a_exvivo.label \
  --l $hemi.BA4p_exvivo.label \
  --l $hemi.BA6_exvivo.label \
  --l $hemi.BA44_exvivo.label \
  --l $hemi.BA45_exvivo.label \
  --l $hemi.V1_exvivo.label \
  --l $hemi.V2_exvivo.label \
  --l $hemi.MT_exvivo.label \
  --l $hemi.perirhinal_exvivo.label \
  --l $hemi.entorhinal_exvivo.label \
  --a BA_exvivo \
  --maxstatwinner --noverbose
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5519)

### Pipeline stage

[[recon-all]] autorecon3, **BA_exvivo Labels** stage (`-balabels`). Requires fsaverage in `$SUBJECTS_DIR`. Run by default in standard `recon-all -all`.

### Inputs required

- [[hemi.BA_exvivo.label]] — individual Brodmann Area label files (14 regions) mapped from fsaverage.
- [[hemi.sphere.reg]] — spherical registration used when mapping labels.

### Siblings (co-produced outputs)

- [[hemi.BA_exvivo.thresh.annot]] — thresholded version.
- [[hemi.mpm.vpnl.annot]] — ventral pathway (VPNL) annotation from Grill-Spector atlas.

## How It Is Used

Passed to `mris_anatomical_stats -a $annot` to produce [[hemi.BA_exvivo.stats]].

## Related

- [[hemi.BA_exvivo.label]] — individual input label files.
- [[hemi.BA_exvivo.stats]] — downstream stats file.
- [[hemi.BA_exvivo.thresh.annot]] — probability-thresholded annotation.
- [[fsaverage]] — source atlas subject.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5518–5543.
- [[subject-directory]] — lists this file in the `label/` section.
