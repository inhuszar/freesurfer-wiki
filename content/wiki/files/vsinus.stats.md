---
title: "vsinus.stats"
type: file
fs_version: "8.2.0"
filename: "vsinus.stats"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "plain text (mri_segstats format)"
binary: false
produced_by:
  - "[[mri_vsinus_seg]]"
produced_in_stage: "autorecon2: Venous Sinus Segmentation"
produced_at_source:
  - "[`scripts/mri_vsinus_seg:214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_vsinus_seg#L214)"
  - "[`scripts/recon-all:2241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2241)"
inputs:
  - "[[vsinus.mgz]]"
  - "[[nu.mgz]]"
siblings:
  - "[[vsinus.mgz]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon2"
editable: false
related:
  - "[[vsinus.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# vsinus.stats

> [!file] Glossary entry
> `vsinus.stats` reports volumetric statistics for the venous sinus segmentation ([[vsinus.mgz]]), produced inside `mri_vsinus_seg` by `mri_segstats`. The file is primarily informational and used for QC of the venous sinus segmentation.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/vsinus.stats`
- **Format:** Plain text — `mri_segstats` summary with per-label volumes.

## How It Is Created

### Producing tool

`mri_segstats` called from within `mri_vsinus_seg`.

```bash
# Inside mri_vsinus_seg (line 214)
mri_segstats --i $invol --seg $seg --sum $stats \
  --subject $subject --etiv
```

### Source reference

- **Write call:** [`scripts/mri_vsinus_seg:214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_vsinus_seg#L214)
- **Pipeline invocation:** [`scripts/recon-all:2241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2241)

### Pipeline stage

[[recon-all]] autorecon2, **Venous Sinus Segmentation** stage.

## Related

- [[vsinus.mgz]] — co-produced segmentation.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/mri_vsinus_seg` lines 209–218.
- [[subject-directory]] — lists this file in the `stats/` section.
