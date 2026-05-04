---
title: "filled.auto.mgz"
type: file
fs_version: "8.2.0"
filename: "filled.auto.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_fill]]"
produced_in_stage: "autorecon2: Fill"
produced_at_source:
  - "[`scripts/recon-all:3467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3467)"
inputs:
  - "[[filled.mgz]]"
siblings:
  - "[[filled.mgz]]"
consumed_by:
  - "[[mri_fill]]"
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Fill (edit-detection reference)"
editable: false
related:
  - "[[mgz]]"
  - "[[filled.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# filled.auto.mgz

> [!file] Glossary entry
> `filled.auto.mgz` is an automatic backup copy of [[filled.mgz]] created after the first successful Fill stage run. It preserves the unedited automatic output of [[mri_fill]] and is used on subsequent runs to detect which voxels the user has changed. When `FS_ALLOW_FILLED_EDIT` is set, recon-all passes both `filled.auto.mgz` and `filled.mgz` to `mri_fill` to enable automatic propagation of edits.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/filled.auto.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; identical structure to [[filled.mgz]]: 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Values 0 / 127 / 255.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

An exact byte-for-byte copy of [[filled.mgz]] as produced automatically by [[mri_fill]], before any manual edits are applied. The contents are identical to [[filled.mgz]] at the time of first creation; on subsequent reruns, [[filled.mgz]] may diverge if the user has edited it.

## How It Is Created

### Producing tool

`cp filled.mgz filled.auto.mgz` — a plain file copy executed by recon-all after the first successful Fill run (recon-all line 3467).

```bash
# Executed only when filled.auto.mgz does not yet exist
cp filled.mgz filled.auto.mgz
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3467)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Fill** stage, immediately after [[filled.mgz]] is written.

### Inputs required

- [[filled.mgz]] — copied as-is.

### Siblings (co-produced outputs)

- [[filled.mgz]] — the source file.

## How It Is Used

### Direct downstream consumers

- [[mri_fill]] (on subsequent runs) — reads `filled.auto.mgz` alongside `filled.mgz` to identify edit voxels when `FS_ALLOW_FILLED_EDIT` is set.

> [!gap] Edit propagation mechanism
> The exact mechanism by which `mri_fill` uses `filled.auto.mgz` and `filled.mgz` to detect and propagate edits (via `tmp/filled.edits.txt`, recon-all line 3456) is not fully documented in the public wiki. Requires source-level investigation of the `-auto-man` flag in `mri_fill`.

## Related

- [[mgz]] — on-disk format specification.
- [[filled.mgz]] — the editable counterpart; source of this copy.
- [[mri_fill]] — producer and consumer.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3463–3471.
- [[subject-directory]] — lists this file in the `mri/` section.
