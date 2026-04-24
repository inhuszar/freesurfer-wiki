---
title: "aseg.stats"
type: file
fs_version: "8.2.0"
filename: "aseg.stats"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "plain text (mri_segstats format)"
binary: false
produced_by:
  - "[[mri_segstats]]"
produced_in_stage: "autorecon3: ASeg Stats"
produced_at_source:
  - "[`scripts/recon-all:5305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5305)"
inputs:
  - "[[aseg.mgz]]"
  - "[[norm.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[ribbon.mgz]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "volumetric subcortical region analysis"
editable: false
related:
  - "[[aseg.mgz]]"
  - "[[mri_segstats]]"
  - "[[brainvol.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aseg.stats

> [!file] Glossary entry
> `aseg.stats` is a plain-text statistics file reporting volumes and intensity statistics for all subcortical and cortical structures in [[aseg.mgz]], produced by [[mri_segstats]] in the ASeg Stats stage. It is the standard summary of volumetric brain region measurements for a subject, including estimated total intracranial volume (eTIV) based on the Talairach transform.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/aseg.stats`
- **Format:** Plain text — comment header (global brain volumes, processing info) followed by a data table with columns: `Index SegId NVoxels Volume_mm3 StructName normMean normStdDev normMin normMax normRange`.
- **Typical size:** ~10 KB.

## What It Contains

Per-structure volumetric statistics for all regions in [[aseg.mgz]], plus global measures:
- `BrainSegVol` — total brain segmentation volume
- `eTIV` — estimated total intracranial volume (from Talairach atlas scaling)
- `SubCortGrayVol` — total subcortical gray matter volume
- Per-region: volume (mm³), mean intensity in [[norm.mgz]], and intensity stats.

## How It Is Created

### Producing tool

[[mri_segstats]] — segments [[aseg.mgz]], computes volume and intensity statistics for each label, and writes the summary.

```bash
# ASeg Stats invocation (recon-all ~line 5305)
mri_segstats \
  --seg mri/aseg.mgz \
  --sum stats/aseg.stats \
  --pv mri/norm.mgz --empty \
  --brainmask mri/brainmask.mgz \
  --brain-vol-from-seg \
  --excludeid 0 --excl-ctxgmwm \
  --supratent \
  --subcortgray \
  --in mri/norm.mgz --in-intensity-name norm \
  --in-intensity-units MR \
  --etiv \
  --surf-wm-vol --surf-ctx-vol --totalgray \
  --subject $subjid
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5305)

### Pipeline stage

[[recon-all]] autorecon3, **ASeg Stats** stage (`-segstats`).

### Inputs required

- [[aseg.mgz]] — segmentation volume.
- [[norm.mgz]] — intensity reference for mean intensity computation.
- [[brainmask.mgz]] — brain mask.
- [[ribbon.mgz]] — used for supratentorial volume computation.

## Related

- [[aseg.mgz]] — source segmentation.
- [[mri_segstats]] — producer tool.
- [[brainvol.stats]] — global brain volume summary (separate file).
- [[wmparc.stats]] — WM parcellation stats (analogous file for wmparc.mgz).
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5292–5360.
- [[subject-directory]] — lists this file in the `stats/` section.
