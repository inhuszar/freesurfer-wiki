---
title: "entowm.stats"
type: file
fs_version: "8.2.0"
filename: "entowm.stats"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "plain text (mri_segstats format)"
binary: false
produced_by:
  - "[[mri_entowm_seg]]"
produced_in_stage: "autorecon2: EntoWM Segmentation"
produced_at_source:
  - "[`scripts/recon-all:2867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2867)"
inputs:
  - "[[entowm.mgz]]"
  - "[[nu.mgz]]"
siblings:
  - "[[entowm.mgz]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2"
editable: false
related:
  - "[[entowm.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# entowm.stats

> [!file] Glossary entry
> `entowm.stats` reports volumetric statistics for the entorhinal white matter segmentation ([[entowm.mgz]]), produced by `mri_entowm_seg` alongside the segmentation volume. The file is read by recon-all to validate the entoWM volumes — if bilateral WM volumes are implausibly small, the entoWM correction of [[wm.mgz]] and [[brain.finalsurfs.mgz]] is skipped.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/entowm.stats`
- **Format:** Plain text — `mri_segstats` summary format with per-label volumes.

## How It Is Created

### Producing tool

`mri_entowm_seg --s $subjid --conform` — co-produces the stats alongside [[entowm.mgz]].

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:2867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2867)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **EntoWM Segmentation** stage.

## How It Is Used

Read by recon-all to check per-hemisphere entorhinal WM volumes:

```bash
# recon-all validation (lines 2888–2895)
grep -v \# $entowmstats | tee -a $LF
set vols = (`grep wm-$hemi $entowmstats | awk '{print $3}'`)
# if vol is too small, skip entoWM fix
```

## Related

- [[entowm.mgz]] — co-produced segmentation.
- [[wm.mgz]] — modified using entoWM data.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 2862–2895.
- [[subject-directory]] — lists this file in the `stats/` section.
