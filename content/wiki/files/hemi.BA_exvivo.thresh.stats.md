---
title: "hemi.BA_exvivo.thresh.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.BA_exvivo.thresh.stats"
aliases:
  - "lh.BA_exvivo.thresh.stats"
  - "rh.BA_exvivo.thresh.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mris_anatomical_stats format)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5590`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5590)"
inputs:
  - "[[hemi.BA_exvivo.thresh.annot]]"
  - "[[hemi.white]]"
  - "[[hemi.thickness]]"
siblings:
  - "[[hemi.BA_exvivo.stats]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.BA_exvivo.thresh.annot]]"
  - "[[hemi.BA_exvivo.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.BA_exvivo.thresh.stats

> [!file] Glossary entry
> `lh.BA_exvivo.thresh.stats` / `rh.BA_exvivo.thresh.stats` report per-region morphometric statistics for the probability-thresholded Brodmann Area annotation [[hemi.BA_exvivo.thresh.annot]], produced by `mris_anatomical_stats` in the BA_exvivo Labels stage. Because the `.thresh` annotation covers only high-confidence vertices, region areas and volumes will be smaller than in [[hemi.BA_exvivo.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.BA_exvivo.thresh.stats`, `stats/rh.BA_exvivo.thresh.stats`
- **Format:** Plain text — `mris_anatomical_stats` format.

## How It Is Created

### Producing tool

`mris_anatomical_stats` using [[hemi.BA_exvivo.thresh.annot]].

```bash
# Thresh stats invocation (recon-all lines 5590–5595)
mris_anatomical_stats -th3 -mgz \
  -f ../stats/$hemi.BA_exvivo.thresh.stats \
  -b -a ./$hemi.BA_exvivo.thresh.annot \
  -c ./BA_exvivo.thresh.ctab \
  $subjid $hemi white
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5590`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5590)

### Pipeline stage

[[recon-all]] autorecon3, **BA_exvivo Labels** stage. Produced immediately after [[hemi.BA_exvivo.thresh.annot]].

## Related

- [[hemi.BA_exvivo.thresh.annot]] — source annotation.
- [[hemi.BA_exvivo.stats]] — unthresholded version.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5585–5598.
- [[subject-directory]] — lists this file in the `stats/` section.
