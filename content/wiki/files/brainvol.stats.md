---
title: "brainvol.stats"
type: file
fs_version: "8.2.0"
filename: "brainvol.stats"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "plain text (key-value pairs)"
binary: false
produced_by:
  - "[[mri_brainvol_stats]]"
produced_in_stage: "autorecon3: ASeg Stats (pre-computation)"
produced_at_source:
  - "[`scripts/recon-all:5059`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5059)"
inputs:
  - "[[aseg.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings: []
consumed_by:
  - "[[mri_segstats]]"
downstream_files:
  - "[[aseg.stats]]"
  - "[[wmparc.stats]]"
  - "[[hemi.aparc.stats]]"
mandatory_for:
  - "[[recon-all]] autorecon3: Stats"
optional_for: []
editable: false
related:
  - "[[aseg.mgz]]"
  - "[[aseg.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# brainvol.stats

> [!file] Glossary entry
> `brainvol.stats` is a plain-text cache file containing global brain volume statistics computed by `mri_brainvol_stats` from [[aseg.mgz]] and the white/pial surfaces. It is produced once and read by subsequent `mri_segstats` calls for [[aseg.stats]], [[wmparc.stats]], and [[hemi.aparc.stats]], avoiding redundant recomputation of global brain volumes. The file stores values such as total gray/white matter volumes, eTIV, and cortical thickness.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/brainvol.stats`
- **Format:** Plain text — one key-value pair per line (e.g., `BrainSegVol 1234567.0`).

## How It Is Created

```bash
# recon-all line 5059
mri_brainvol_stats --subject $subjid
```

Reads [[aseg.mgz]], the white and pial surfaces, computes global brain volume metrics, and writes the cache to `stats/brainvol.stats`.

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5059`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5059)

### Pipeline stage

[[recon-all]] autorecon3, computed before the per-region stats stages (ASeg Stats, WMParc, ParcStats).

### Inputs required

- [[aseg.mgz]] — segmentation for volume computation.
- [[hemi.white]], [[hemi.pial]] — for surface-based volume estimates.

## How It Is Used

Read by [[mri_segstats]] when producing [[aseg.stats]], [[wmparc.stats]], and [[hemi.aparc.stats]] to fill global volume header fields.

## Related

- [[aseg.mgz]] — source segmentation.
- [[aseg.stats]] — primary consumer (header fields).
- [[recon-all]] — pipeline context.

## References

- Source: `mri_brainvol_stats/mri_brainvol_stats.cpp:34`; `scripts/recon-all` lines 5056–5065.
- [[subject-directory]] — lists this file in the `stats/` section.
