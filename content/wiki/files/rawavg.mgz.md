---
title: "rawavg.mgz"
type: file
fs_version: "8.2.0"
filename: "rawavg.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_robust_template]]"
produced_in_stage: "autorecon1: Motion Correction / Average"
produced_at_source:
  - "[`scripts/recon-all:1474`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1474)"
inputs:
  - "[[orig/NNN.mgz]]"
siblings: []
consumed_by:
  - "[[mri_convert]]"
  - "[[lta_convert]]"
downstream_files:
  - "[[orig.mgz]]"
  - "[[rawavg2orig.lta]]"
mandatory_for:
  - "[[recon-all]] autorecon1: Conform"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[orig.mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# rawavg.mgz

> [!file] Glossary entry
> `rawavg.mgz` is the motion-corrected average of all T1-weighted input runs for a subject, stored in the native (unconformed) acquisition space. It is produced early in autorecon1 by [[mri_robust_template]] when multiple runs are present, or copied directly from the single run when only one input exists. It serves as the source from which [[orig.mgz]] is conformally resampled.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/rawavg.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary volume; same voxel type and dimensions as the input acquisition.
- **Typical size / shape:** Native acquisition dimensions (e.g. 176 × 256 × 256 for a 1 mm isotropic MPRAGE); voxel size equals the scanner resolution.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

Each voxel holds the averaged T1-weighted intensity from all input runs after robust rigid-body motion correction. The coordinate system is the **native scanner RAS** of the first (template) input run; no resampling to isotropic/cubic geometry has occurred at this stage. Voxel type is typically `UCHAR` (0–255 range) but may be `SHORT` or `FLOAT` depending on the input.

## How It Is Created

### Producing tool

[[mri_robust_template]] — performs robust intensity-based rigid registration of all input runs to an iteratively updated template, then averages the aligned volumes. The `--template` flag names the output file (`rawavg.mgz`).

When only a single run is provided, `rawavg.mgz` is created as a simple file copy of that run (no registration needed).

```bash
# Canonical multi-run invocation (recon-all line ~1474)
mri_robust_template \
  --mov <run1.mgz> <run2.mgz> ... \
  --average 1 \
  --template rawavg.mgz \
  --satit --inittp 1 --fixtp --noit --iscale \
  --subsample 200 \
  --lta <run1.lta> <run2.lta> ...
```

### Source reference

- **File:** `scripts/recon-all`
- **Lines:** 1474–1485 (multi-run case); line 1446 (single-run copy)
- **GitHub:** [`scripts/recon-all:1474`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1474)

The actual write of the averaged volume is handled inside `mri_robust_template`; the recon-all script names the output via `--template`.

### Pipeline stage

[[recon-all]] autorecon1, **Motion Correction / Average** stage (between `-motioncor` and `-talairach`). Touch sentinel: `touch/motion_correct.touch`.

### Inputs required

- [[orig/NNN.mgz]] — the individual input run volumes placed in `$SUBJECTS_DIR/<subj>/mri/orig/` before recon-all is invoked.

**Environment:** `$SUBJECTS_DIR`, `$FREESURFER_HOME`.

### Siblings (co-produced outputs)

During the same motion-correction invocation, per-run LTA transforms and iscale text files are written to `mri/orig/`:
- `mri/orig/<run>-iscale.txt` — per-run intensity scale factor.
- `mri/orig/<run>.lta` — rigid-body transform aligning that run to the template.

## How It Is Used

### Direct downstream consumers

- [[mri_convert]] — reads `rawavg.mgz`, conforms it to 256³ 1 mm isotropic, and writes [[orig.mgz]].
- [[lta_convert]] — uses `rawavg.mgz` as the source geometry to construct [[rawavg2orig.lta]], the identity-based LTA from raw to conformed space.

### Downstream files derived from this one

- [[orig.mgz]] — conformed version of rawavg.
- [[rawavg2orig.lta]] — transform from rawavg to orig space.

## Alternative Names and Variants

### Variants

- `rawavg.synthsr.mgz` — if `-synthsr` is passed to recon-all, a SynthSR super-resolution version of rawavg is created and internally substituted for the native rawavg before conform; the original rawavg.mgz is retained on disk.

## Gotchas

> [!gotcha] Multiple runs only produce a motion-corrected average
> When a single run is provided, rawavg.mgz is a straight copy. The LTA files (`mri/orig/*.lta`) are only created in the multi-run path. Downstream tools that check for these LTAs may behave differently in single-run subjects.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_robust_template]] — canonical producer.
- [[mri_convert]] — immediate downstream consumer.
- [[orig.mgz]] — conformed successor.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1438–1500.
- [[subject-directory]] — lists this file in the `mri/` section.
