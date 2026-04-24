---
title: "antsdn.brain.mgz"
type: file
fs_version: "8.2.0"
filename: "antsdn.brain.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "MGZ (intensity volume)"
binary: true
produced_by:
  - "[[AntsDenoiseImageFs]]"
produced_in_stage: "autorecon2: ANTs Denoising"
produced_at_source:
  - "[`scripts/recon-all:3312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3312)"
inputs:
  - "[[brain.mgz]]"
siblings: []
consumed_by:
  - "[[mri_segment]]"
downstream_files:
  - "[[wm.mgz]]"
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon2: ANTs Denoising (run when ANTs denoising is active)"
editable: false
related:
  - "[[brain.mgz]]"
  - "[[wm.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# antsdn.brain.mgz

> [!file] Glossary entry
> `antsdn.brain.mgz` is an ANTs-denoised version of [[brain.mgz]], produced by the `AntsDenoiseImageFs` wrapper when ANTs denoising is enabled in recon-all. It is used as the input to `mri_segment` in place of `brain.mgz`, improving WM segmentation in noisy scans.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/antsdn.brain.mgz`
- **Format:** MGZ intensity volume in the same space as [[brain.mgz]].

## How It Is Created

### Producing tool

`AntsDenoiseImageFs` — a FreeSurfer wrapper around the ANTs denoising pipeline.

```bash
# ANTs denoising (recon-all lines 3310–3312)
AntsDenoiseImageFs -i brain.mgz -o antsdn.brain.mgz
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3312)

### Pipeline stage

[[recon-all]] autorecon2, produced conditionally when ANTs denoising is enabled (controlled by `$DoAntsN3`, `$DoAntsN4`, or expert options).

### Inputs required

- [[brain.mgz]] — skull-stripped brain intensity volume.

## How It Is Used

Used as the input to `mri_segment` instead of `brain.mgz`:

```bash
set mrisegment_input = antsdn.brain.mgz
mri_segment $mrisegment_input wm.mgz
```

## Related

- [[brain.mgz]] — source intensity volume.
- [[wm.mgz]] — downstream WM segmentation.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3308–3318.
- [[subject-directory]] — lists this file in the `mri/` section.
