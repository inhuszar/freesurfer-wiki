---
title: "hemi.ribbon.mgz"
type: file
fs_version: "8.2.0"
filename: "hemi.ribbon.mgz"
aliases:
  - "lh.ribbon.mgz"
  - "rh.ribbon.mgz"
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: true
format: "[[mgh-format]]"
binary: true
produced_by:
  - "[[mris_volmask]]"
produced_in_stage: "autorecon3: CortRibbon"
produced_at_source:
  - "[`mris_volmask/mris_volmask.cpp:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_volmask/mris_volmask.cpp#L309)"
  - "[`scripts/recon-all:4854`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4854)"
inputs:
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
siblings:
  - "[[ribbon.mgz]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: CortRibbon (produced when --save_ribbon is set)"
editable: false
related:
  - "[[ribbon.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.ribbon.mgz

> [!file] Glossary entry
> `lh.ribbon.mgz` / `rh.ribbon.mgz` are per-hemisphere cortical ribbon mask volumes produced alongside [[ribbon.mgz]] when [[mris_volmask]] is called with `--save_ribbon`. Each hemisphere file contains only that hemisphere's ribbon (WM and cortical gray matter), analogous to the per-hemisphere slice of [[ribbon.mgz]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/lh.ribbon.mgz`, `mri/rh.ribbon.mgz`
- **Format:** [[mgh-format]] — same format as [[ribbon.mgz]], but contains only one hemisphere's labels.

## What It Contains

Voxels labelled with white matter interior and cortical ribbon labels for a single hemisphere. Same label scheme as [[ribbon.mgz]] but restricted to one hemisphere.

## How It Is Created

Produced in the same [[mris_volmask]] invocation as [[ribbon.mgz]] when `--save_ribbon` is active.

### Source reference

- **Write call:** [`mris_volmask/mris_volmask.cpp:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_volmask/mris_volmask.cpp#L309)
- **Pipeline invocation:** [`scripts/recon-all:4854`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4854)

### Siblings (co-produced outputs)

- [[ribbon.mgz]] — combined both-hemisphere ribbon.

## Related

- [[ribbon.mgz]] — combined ribbon volume.
- [[hemi.white]], [[hemi.pial]] — source surfaces.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_volmask/mris_volmask.cpp:309`; `scripts/recon-all` lines 4845–4870.
- [[subject-directory]] — lists this file in the `mri/` section.
