---
title: "synthstrip.mgz"
type: file
fs_version: "8.2.0"
filename: "synthstrip.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "MGZ (binary brain mask)"
binary: true
produced_by:
  - "[[mri_synthstrip]]"
produced_in_stage: "autorecon1: SynthStrip"
produced_at_source:
  - "[`scripts/recon-all:1616`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1616)"
inputs:
  - "[[orig.mgz]]"
siblings: []
consumed_by:
  - "[[seg2recon]]"
  - "[[mri_mask]]"
downstream_files:
  - "[[brainmask.mgz]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon1 (run by default in v8.x)"
editable: false
related:
  - "[[orig.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# synthstrip.mgz

> [!file] Glossary entry
> `synthstrip.mgz` is a binary brain mask produced by `mri_synthstrip` from [[orig.mgz]] in autorecon1. It is used to create [[brainmask.mgz]] via `mri_mask`, and is passed to `seg2recon` and other tools as a skull-stripping mask. SynthStrip uses a deep-learning model that is robust to non-standard contrasts and artifacts.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/synthstrip.mgz`
- **Format:** MGZ binary mask (1 = brain, 0 = non-brain), same geometry as [[orig.mgz]].

## How It Is Created

### Producing tool

`mri_synthstrip` — deep-learning skull-stripping tool.

```bash
# SynthStrip invocation (recon-all line 1616)
mri_synthstrip --threads $OMP_NUM_THREADS \
  -i $origvol \
  -o synthstrip.mgz
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1616`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1616)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1. Produced before [[synthseg.rca.mgz]] and used by `seg2recon` to improve brain mask quality.

### Inputs required

- [[orig.mgz]] — conformed T1w input.

## How It Is Used

1. `mri_mask $T1 synthstrip.mgz brainmask.mgz` — creates the initial [[brainmask.mgz]].
2. Passed to `seg2recon --m synthstrip.mgz` as external brain mask.
3. Used by `mri_vsinus_seg` and other tools to restrict segmentation to brain.

## Related

- [[orig.mgz]] — input volume.
- [[brainmask.mgz]] — brain-masked T1 derived from this mask.
- [[synthseg.rca.mgz]] — complementary DL segmentation.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1611–1626.
- [[subject-directory]] — lists this file in the `mri/` section.
