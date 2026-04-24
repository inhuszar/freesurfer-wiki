---
title: "hemi.BA_exvivo.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.BA_exvivo.stats"
aliases:
  - "lh.BA_exvivo.stats"
  - "rh.BA_exvivo.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mris_anatomical_stats format)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5577)"
inputs:
  - "[[hemi.BA_exvivo.annot]]"
  - "[[hemi.white]]"
  - "[[hemi.thickness]]"
siblings:
  - "[[hemi.BA_exvivo.thresh.stats]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.BA_exvivo.annot]]"
  - "[[hemi.BA_exvivo.thresh.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.BA_exvivo.stats

> [!file] Glossary entry
> `lh.BA_exvivo.stats` / `rh.BA_exvivo.stats` report per-region morphometric statistics (surface area, thickness, volume, curvature) for each Brodmann Area in [[hemi.BA_exvivo.annot]], produced by `mris_anatomical_stats` in the BA_exvivo Labels stage. Format matches [[hemi.aparc.stats]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.BA_exvivo.stats`, `stats/rh.BA_exvivo.stats`
- **Format:** Plain text — `mris_anatomical_stats` format with header and one row per BA region.

## How It Is Created

### Producing tool

`mris_anatomical_stats` — reads [[hemi.BA_exvivo.annot]] on the white surface and computes per-region morphometrics.

```bash
# BA_exvivo stats invocation (recon-all lines 5577–5583)
mris_anatomical_stats -th3 -mgz \
  -f ../stats/$hemi.BA_exvivo.stats \
  -b -a ./$hemi.BA_exvivo.annot \
  -c ./BA_exvivo.ctab \
  $subjid $hemi white
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5577)

### Pipeline stage

[[recon-all]] autorecon3, **BA_exvivo Labels** stage. Produced immediately after [[hemi.BA_exvivo.annot]].

### Inputs required

- [[hemi.BA_exvivo.annot]] — Brodmann Area parcellation.
- [[hemi.white]] — white surface geometry.
- [[hemi.thickness]] — cortical thickness per vertex.

## Related

- [[hemi.BA_exvivo.annot]] — source annotation.
- [[hemi.BA_exvivo.thresh.stats]] — thresholded version.
- [[hemi.aparc.stats]] — analogous Desikan-Killiany stats file.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5572–5583.
- [[subject-directory]] — lists this file in the `stats/` section.
