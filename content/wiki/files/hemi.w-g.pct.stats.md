---
title: "hemi.w-g.pct.stats"
type: file
fs_version: "8.2.0"
filename: "hemi.w-g.pct.stats"
aliases:
  - "lh.w-g.pct.stats"
  - "rh.w-g.pct.stats"
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: true
format: "plain text (mri_segstats format)"
binary: false
produced_by:
  - "[[pctsurfcon]]"
produced_in_stage: "autorecon3: WM/GM Contrast"
produced_at_source:
  - "[`scripts/pctsurfcon:136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L136)"
  - "[`scripts/recon-all:4975`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4975)"
inputs:
  - "[[hemi.w-g.pct.mgh]]"
  - "[[hemi.aparc.annot]]"
siblings:
  - "[[hemi.w-g.pct.mgh]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: WM/GM Contrast"
editable: false
related:
  - "[[hemi.w-g.pct.mgh]]"
  - "[[hemi.aparc.annot]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.w-g.pct.stats

> [!file] Glossary entry
> `lh.w-g.pct.stats` / `rh.w-g.pct.stats` summarise the per-vertex white-gray percent contrast ([[hemi.w-g.pct.mgh]]) by Desikan-Killiany parcellation ([[hemi.aparc.annot]]) using `mri_segstats --snr`. The file reports mean, standard deviation, and SNR-like statistics for each cortical parcel, produced by `pctsurfcon` immediately after the contrast map.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/lh.w-g.pct.stats`, `stats/rh.w-g.pct.stats`
- **Format:** Plain text — `mri_segstats` summary format with header lines and one row per parcellation region.

## How It Is Created

### Producing tool

`mri_segstats` called from inside `pctsurfcon`.

```bash
# Inside pctsurfcon (line 136)
mri_segstats --in $out --annot $subject $hemi aparc \
  --sum $sum --snr
```

### Source reference

- **Write call:** [`scripts/pctsurfcon:136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/pctsurfcon#L136)
- **Pipeline invocation:** [`scripts/recon-all:4975`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4975)

### Pipeline stage

[[recon-all]] autorecon3, **WM/GM Contrast** stage. Produced in the same `pctsurfcon` run as [[hemi.w-g.pct.mgh]].

### Inputs required

- [[hemi.w-g.pct.mgh]] — per-vertex contrast overlay.
- [[hemi.aparc.annot]] — Desikan-Killiany parcellation for region labels.

## Related

- [[hemi.w-g.pct.mgh]] — source contrast map.
- [[hemi.aparc.annot]] — parcellation used for regional summaries.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/pctsurfcon` lines 134–140; `scripts/recon-all` lines 4962–4993.
- [[subject-directory]] — lists this file in the `stats/` section.
