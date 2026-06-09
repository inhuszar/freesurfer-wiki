---
title: "hemi.cortex.label"
type: file
fs_version: "8.2.0"
filename: "hemi.cortex.label"
aliases:
  - "lh.cortex.label"
  - "rh.cortex.label"
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
  - "[`scripts/recon-all:3972`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3972)"
inputs:
  - "[[hemi.white.preaparc]]"
  - "[[aseg.presurf.mgz]]"
siblings:
  - "[[hemi.cortex+hipamyg.label]]"
consumed_by:
  - "[[mris_place_surface]]"
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
downstream_files:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[hemi.aparc.annot]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: WhiteSurfs, Pial, Parcellation, Stats"
optional_for: []
editable: false
related:
  - "[[hemi.white.preaparc]]"
  - "[[aseg.presurf.mgz]]"
  - "[[hemi.cortex+hipamyg.label]]"
  - "[[mri_label2label]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - file
---

# hemi.cortex.label

> [!file] Glossary entry
> `lh.cortex.label` / `rh.cortex.label` are FreeSurfer label files that identify the set of cortical surface vertices — i.e., all vertices except the medial wall (corpus callosum region and subcortical structures). The label is derived from [[aseg.presurf.mgz]] via `mri_label2label --label-cortex` and defines which vertices are "cortex" for parcellation, surface placement, and statistics. It is produced in the CortexLabel stage via the `label-cortex` wrapper script.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/lh.cortex.label`, `label/rh.cortex.label`
- **Format:** FreeSurfer ASCII label file — header line with vertex count, then one line per vertex: `vertex_index  R  A  S  value`.
- **Typical size:** ~90–95% of all surface vertices (the medial wall accounts for the remainder).

## What It Contains

A list of vertex indices (with their RAS coordinates and a value of 1.0) identifying all vertices that fall within cortex, as determined by projecting the subcortical segmentation onto the surface. Vertices that fall inside corpus callosum, subcortical structures (hippocampus, amygdala, etc.) in [[aseg.presurf.mgz]] are excluded.

> [!gotcha]
> The gyrus ambiens (entorhinal–hippocampal junction) is a known problematic area: inaccuracies in the segmentation can incorrectly exclude these vertices from `cortex.label`. The `label-cortex` script has a `-fix-ga` path that attempts to correct this using `entowm.mgz`.

## How It Is Created

### Producing tool

[[label-cortex]] wrapper script, which calls `mri_label2label --label-cortex $whitepreaparc $aseg 0 $ctxlabel` — projects [[aseg.presurf.mgz]] labels onto the [[hemi.white.preaparc]] surface and writes vertices not overlapping subcortical labels as cortex.

```bash
# CortexLabel invocation (recon-all line 3972)
label-cortex --s $subjid --$hemi
```

### Source reference

- **Write call:** [`mri_label2label/mri_label2label.cpp:1209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_label2label/mri_label2label.cpp#L1209) — `LabelWrite(lcortex, pargv[3])`
- **Pipeline invocation:** [`scripts/recon-all:3972`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3972)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **CortexLabel** stage (`-cortex-label`). Touch sentinel: `touch/$hemi.cortex.touch`.

### Inputs required

- [[hemi.white.preaparc]] — surface for projecting the segmentation.
- [[aseg.presurf.mgz]] — subcortical segmentation defining non-cortex regions.

### Siblings (co-produced outputs)

- [[hemi.cortex+hipamyg.label]] — extended cortex label including hippocampus/amygdala borders (produced immediately after in the same stage).

## How It Is Used

### Direct downstream consumers

- [[mris_place_surface]] (WhiteSurfs, Pial) — uses `--rip-label cortex.label` to fix non-cortex vertices during surface placement.
- [[mris_ca_label]] — uses `-l cortex.label` to restrict parcellation to cortical vertices.
- [[mris_anatomical_stats]] — uses cortex label to mask stats to cortical vertices.

### Downstream files derived from this one

- [[hemi.white]] — final white surface placement constrained by this label.
- [[hemi.pial]] — pial surface pinned at medial wall by this label.
- [[hemi.aparc.annot]] — parcellation restricted to cortex vertices.

## Related

- [[hemi.white.preaparc]] — surface from which the label is derived.
- [[aseg.presurf.mgz]] — segmentation used to identify non-cortex.
- [[hemi.cortex+hipamyg.label]] — extended version including hippocampus/amygdala.
- [[mri_label2label]] — tool that writes the label file.
- [[make_cortex_label]] — legacy/alternative wrapper that also produces `?h.cortex.label` from the aseg.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_label2label/mri_label2label.cpp:1209`; `scripts/label-cortex`; `scripts/recon-all` lines 3965–4000.
- [[subject-directory]] — lists this file in the `label/` section.
