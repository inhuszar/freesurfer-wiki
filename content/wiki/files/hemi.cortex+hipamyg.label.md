---
title: "hemi.cortex+hipamyg.label"
type: file
fs_version: "8.2.0"
filename: "hemi.cortex+hipamyg.label"
aliases:
  - "lh.cortex+hipamyg.label"
  - "rh.cortex+hipamyg.label"
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: true
format: "FreeSurfer label"
binary: false
produced_by:
  - "[[mri_label2label]]"
produced_in_stage: "autorecon2: CortexLabel"
produced_at_source:
  - "[`mri_label2label/mri_label2label.cpp:1209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_label2label/mri_label2label.cpp#L1209)"
  - "[`scripts/recon-all:3989`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3989)"
inputs:
  - "[[hemi.white.preaparc]]"
  - "[[aseg.presurf.mgz]]"
siblings:
  - "[[hemi.cortex.label]]"
consumed_by:
  - "[[mris_place_surface]]"
downstream_files:
  - "[[hemi.pial]]"
mandatory_for:
  - "[[recon-all]] autorecon3: Pial"
optional_for: []
editable: false
related:
  - "[[hemi.cortex.label]]"
  - "[[hemi.white.preaparc]]"
  - "[[aseg.presurf.mgz]]"
  - "[[hemi.pial]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.cortex+hipamyg.label

> [!file] Glossary entry
> `lh.cortex+hipamyg.label` / `rh.cortex+hipamyg.label` are an extended version of [[hemi.cortex.label]] that additionally includes the hippocampal and amygdala surface vertices. This label is used specifically as the `--rip-label` for pial surface placement ([[mris_place_surface]] with `--pial`), allowing the pial surface to extend into hippocampus/amygdala territory without ripping those vertices. It is produced immediately after [[hemi.cortex.label]] in the CortexLabel stage.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.cortex+hipamyg.label`, `label/rh.cortex+hipamyg.label`
- **Format:** FreeSurfer ASCII label file — same format as [[hemi.cortex.label]].
- **Typical size:** Slightly larger than [[hemi.cortex.label]] (additional hippocampus/amygdala vertices).

## What It Contains

The union of cortical vertices from [[hemi.cortex.label]] plus vertices that project into hippocampus/amygdala in [[aseg.presurf.mgz]] (label value `1` in the `mri_label2label --label-cortex` call).

## How It Is Created

### Producing tool

`mri_label2label --label-cortex` with flag value `1` (vs. `0` for the basic cortex label), writing the result directly to `$cortexha`.

```bash
# CortexLabel+HipAmyg invocation (recon-all line 3989)
mri_label2label --label-cortex \
  ../surf/$hemi.white.preaparc \
  $aseg 1 \
  ../label/$hemi.cortex+hipamyg.label
```

### Source reference

- **Write call:** [`mri_label2label/mri_label2label.cpp:1209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_label2label/mri_label2label.cpp#L1209) — `LabelWrite(lcortex, pargv[3])`
- **Pipeline invocation:** [`scripts/recon-all:3989`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3989)

### Pipeline stage

[[recon-all]] autorecon2, **CortexLabel** stage (`-cortex-label`). Touch sentinel: `touch/$hemi.cortex+hipamyg.touch`.

### Inputs required

- [[hemi.white.preaparc]] — surface for projecting the segmentation.
- [[aseg.presurf.mgz]] — subcortical segmentation.

### Siblings (co-produced outputs)

- [[hemi.cortex.label]] — the basic cortex label produced in the same stage.

## How It Is Used

### Direct downstream consumers

- [[mris_place_surface]] (Pial, T2/FLAIRpial) — used as `--rip-label` to allow the pial surface to extend into hippocampus/amygdala.

### Downstream files derived from this one

- [[hemi.pial]] — pial surface whose rip constraint uses this label.

## Related

- [[hemi.cortex.label]] — the basic cortex label without hippocampus/amygdala.
- [[hemi.white.preaparc]] — surface used for projection.
- [[hemi.pial]] — consumer.
- [[recon-all]] — pipeline context.

## References

- Source: `mri_label2label/mri_label2label.cpp:1209`; `scripts/recon-all` lines 3986–4000.
- [[subject-directory]] — lists this file in the `label/` section.
