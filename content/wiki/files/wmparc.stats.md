---
title: "wmparc.stats"
type: file
fs_version: "8.2.0"
filename: "wmparc.stats"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "plain text (mri_segstats format)"
binary: false
produced_by:
  - "[[mri_segstats]]"
produced_in_stage: "autorecon3: WMParc"
produced_at_source:
  - "[`scripts/recon-all:5150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5150)"
inputs:
  - "[[wmparc.mgz]]"
  - "[[norm.mgz]]"
  - "[[brainmask.mgz]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "WM parcellation volume analysis"
editable: false
related:
  - "[[wmparc.mgz]]"
  - "[[aseg.stats]]"
  - "[[mri_segstats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# wmparc.stats

> [!file] Glossary entry
> `wmparc.stats` is a plain-text statistics file reporting volumes and intensity statistics for white matter parcels in [[wmparc.mgz]], produced by [[mri_segstats]] in the WMParc stage. Each row corresponds to a WM parcel (region-adjacent WM), with volume (mm³) and intensity statistics from [[norm.mgz]]. Used for WM volume group analyses.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/wmparc.stats`
- **Format:** Same plain-text `mri_segstats` format as [[aseg.stats]] (header + data table).

## How It Is Created

```bash
# WMParc stats invocation (recon-all line 5150)
mri_segstats \
  --seg mri/wmparc.mgz \
  --sum stats/wmparc.stats \
  --pv mri/norm.mgz \
  --excludeid 0 \
  --brainmask mri/brainmask.mgz \
  --in mri/norm.mgz \
  --in-intensity-name norm \
  --in-intensity-units MR \
  --subject $subjid \
  --surf-wm-vol \
  --ctab $FREESURFER_HOME/WMParcStatsLUT.txt
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5150)

### Pipeline stage

[[recon-all]] autorecon3, **WMParc** stage (`-wmparc`), produced immediately after [[wmparc.mgz]].

### Inputs required

- [[wmparc.mgz]] — WM parcellation segmentation.
- [[norm.mgz]] — intensity reference.
- [[brainmask.mgz]] — brain mask.

## Related

- [[wmparc.mgz]] — source segmentation.
- [[aseg.stats]] — analogous subcortical stats file.
- [[mri_segstats]] — producer.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5146–5168.
- [[subject-directory]] — lists this file in the `stats/` section.
