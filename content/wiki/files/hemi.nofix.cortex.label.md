---
title: "hemi.nofix.cortex.label"
type: file
fs_version: "8.2.0"
filename: "hemi.nofix.cortex.label"
aliases:
  - "lh.nofix.cortex.label"
  - "rh.nofix.cortex.label"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer ASCII label"
binary: false
produced_by:
  - "[[defect2seg]]"
produced_in_stage: "autorecon2: Fix Topology (via defect2seg)"
produced_at_source:
  - "[`scripts/defect2seg:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L96)"
  - "[`scripts/recon-all:3783`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3783)"
inputs:
  - "[[hemi.orig.nofix]]"
  - "[[aseg.presurf.mgz]]"
siblings: []
consumed_by:
  - "[[mris_defects_pointset]]"
downstream_files:
  - "[[hemi.defects.pointset]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon2: Fix Topology"
editable: false
related:
  - "[[hemi.orig.nofix]]"
  - "[[aseg.presurf.mgz]]"
  - "[[hemi.defects.pointset]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.nofix.cortex.label

> [!file] Glossary entry
> `lh.nofix.cortex.label` / `rh.nofix.cortex.label` are cortex masks in the pre-topology-correction surface space ([[hemi.orig.nofix]]), produced by `defect2seg` using `mri_label2label --label-cortex`. They identify cortical vertices (excluding medial wall) using the pre-surface segmentation [[aseg.presurf.mgz]] and are passed to `mris_defects_pointset` as `--label` to restrict defect pointsets to cortex only.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.nofix.cortex.label`, `label/rh.nofix.cortex.label`
- **Format:** FreeSurfer ASCII label file (vertex indices and coordinates).

## How It Is Created

### Producing tool

`defect2seg` (called by [[recon-all]] after Fix Topology) uses `mri_label2label --label-cortex` to derive the cortex label on the nofix surface.

```bash
# Inside defect2seg (line 96)
mri_label2label --label-cortex $lhsurf $aseg 0 $lhlabel
```

where `$aseg = mri/aseg.presurf.mgz` and output `$lhlabel = label/lh.nofix.cortex.label`.

### Source reference

- **Write call:** [`scripts/defect2seg:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/defect2seg#L96)
- **Pipeline invocation:** [`scripts/recon-all:3783`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3783)

### Pipeline stage

[[recon-all]] autorecon2, **Fix Topology** stage, via `defect2seg --s $subjid --cortex`. Only created when the `--cortex` flag is active (which is the default in standard recon-all).

### Inputs required

- [[hemi.orig.nofix]] — pre-correction surface.
- [[aseg.presurf.mgz]] — segmentation for cortex/non-cortex determination.

## Related

- [[hemi.orig.nofix]] — source surface.
- [[aseg.presurf.mgz]] — segmentation input.
- [[hemi.defects.pointset]] — downstream file that uses this label for masking.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/defect2seg` lines 69–133; `scripts/recon-all` line 3783.
- [[subject-directory]] — lists this file in the `label/` section.
