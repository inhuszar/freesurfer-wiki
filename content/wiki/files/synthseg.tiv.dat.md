---
title: "synthseg.tiv.dat"
type: file
fs_version: "8.2.0"
filename: "synthseg.tiv.dat"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "plain text (single value)"
binary: false
produced_by:
  - "[[csvprint]]"
produced_in_stage: "autorecon1: SynthSeg"
produced_at_source:
  - "[`scripts/recon-all:1670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1670)"
inputs:
  - "[[synthseg.vol.csv]]"
siblings: []
consumed_by:
  - "[[mri_segstats]]"
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: Stats stages (when SynthSeg is active)"
editable: false
related:
  - "[[synthseg.vol.csv]]"
  - "[[aseg.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# synthseg.tiv.dat

> [!file] Glossary entry
> `synthseg.tiv.dat` is a single-value plain-text file containing the total intracranial volume (TIV) in mm³ extracted from [[synthseg.vol.csv]] using `csvprint --f "total intracranial"`. It is passed to `mri_segstats --stiv` during stats generation to provide the eTIV denominator for normalised volume reporting in [[aseg.stats]], [[wmparc.stats]], and parcellation stats files.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/synthseg.tiv.dat`
- **Format:** Plain text — a single numeric value (TIV in mm³).

## How It Is Created

### Producing tool

`csvprint` — extracts one column from a CSV.

```bash
# TIV extraction (recon-all line 1670)
csvprint --csv stats/synthseg.vol.csv \
  --f "total intracranial" > stats/synthseg.tiv.dat
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1670)

### Pipeline stage

[[recon-all]] autorecon1, immediately after [[synthseg.vol.csv]] is written.

### Inputs required

- [[synthseg.vol.csv]] — SynthSeg volumetric output.

## How It Is Used

Passed as `--stiv $synthsegtiv` to `mri_segstats` when generating [[aseg.stats]], [[wmparc.stats]], and parcellation stats, replacing the atlas-based eTIV estimate with the SynthSeg-derived value.

## Related

- [[synthseg.vol.csv]] — source CSV.
- [[aseg.stats]] — primary consumer.
- [[wmparc.stats]] — also uses this value.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1667–1670.
- [[subject-directory]] — lists this file in the `stats/` section.
