---
title: "hemi.mpm.vpnl.annot"
type: file
fs_version: "8.2.0"
filename: "hemi.mpm.vpnl.annot"
aliases:
  - "lh.mpm.vpnl.annot"
  - "rh.mpm.vpnl.annot"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer annotation (binary)"
binary: true
produced_by:
  - "[[mris_label2annot]]"
produced_in_stage: "autorecon3: BA_exvivo Labels"
produced_at_source:
  - "[`scripts/recon-all:5480`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5480)"
inputs:
  - "[[hemi.BA_exvivo.label]]"
siblings:
  - "[[hemi.BA_exvivo.annot]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: BA_exvivo Labels (`-balabels`)"
editable: false
related:
  - "[[hemi.BA_exvivo.label]]"
  - "[[hemi.BA_exvivo.annot]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.mpm.vpnl.annot

> [!file] Glossary entry
> `lh.mpm.vpnl.annot` / `rh.mpm.vpnl.annot` are per-vertex annotations of ventral visual pathway parcels from the Stanford Vision and Perception Neuroscience Lab (VPNL) Maximum Probability Map (MPM) atlas. The atlas defines eight fusiform gyrus regions (FG1–FG4) and occipital areas (hOc1, hOc2, hOc3v, hOc4v). Produced by `mris_label2annot` in the BA_exvivo Labels stage using the color table `$FREESURFER_HOME/average/colortable_vpnl.txt`.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.mpm.vpnl.annot`, `label/rh.mpm.vpnl.annot`
- **Format:** FreeSurfer binary annotation. Color table: `$FREESURFER_HOME/average/colortable_vpnl.txt`.

## How It Is Created

### Producing tool

`mris_label2annot` — merges 8 VPNL label files (FG1–FG4, hOc1, hOc2, hOc3v, hOc4v) mapped from fsaverage.

```bash
# VPNL annotation invocation (recon-all line 5480)
mris_label2annot --s $subjid --ctab $ctabvpnl --hemi $hemi \
  --a mpm.vpnl --maxstatwinner --noverbose \
  --l $hemi.FG1.mpm.vpnl.label   --l $hemi.FG2.mpm.vpnl.label \
  --l $hemi.FG3.mpm.vpnl.label   --l $hemi.FG4.mpm.vpnl.label \
  --l $hemi.hOc1.mpm.vpnl.label  --l $hemi.hOc2.mpm.vpnl.label \
  --l $hemi.hOc3v.mpm.vpnl.label --l $hemi.hOc4v.mpm.vpnl.label
```

Labels are mapped from fsaverage via `mri_label2label --regmethod surface`.

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:5480`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5480)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **BA_exvivo Labels** stage, produced before the main BA_exvivo annotations in the same stage block.

### Inputs required

- Individual `.mpm.vpnl.label` files mapped from fsaverage (EV_LABELS_4 group).
- [[hemi.sphere.reg]] — for surface-based label mapping.

## Related

- [[hemi.BA_exvivo.annot]] — main Brodmann Area annotation produced in the same stage.
- [[fsaverage]] — source atlas subject.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5435–5488.
- [[subject-directory]] — lists this file in the `label/` section.
