---
title: "synthseg.vol.csv"
type: file
fs_version: "8.2.0"
filename: "synthseg.vol.csv"
aliases: []
location: "$SUBJECTS_DIR/<subj>/stats/"
anchor: subject
hemispheric: false
format: "CSV"
binary: false
produced_by:
  - "[[mri_synthseg]]"
produced_in_stage: "autorecon1: SynthSeg"
produced_at_source:
  - "[`scripts/recon-all:1635`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1635)"
inputs:
  - "[[orig.mgz]]"
  - "[[synthseg.rca.mgz]]"
siblings:
  - "[[synthseg.rca.mgz]]"
consumed_by:
  - "[[csvprint]]"
downstream_files:
  - "[[synthseg.tiv.dat]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon1: SynthSeg"
editable: false
related:
  - "[[synthseg.rca.mgz]]"
  - "[[synthseg.tiv.dat]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# synthseg.vol.csv

> [!file] Glossary entry
> `synthseg.vol.csv` is a CSV file produced by `mri_synthseg` simultaneously with [[synthseg.rca.mgz]], reporting volumetric statistics for each segmentation label including total intracranial volume (TIV). The TIV field is subsequently extracted by `csvprint` to produce [[synthseg.tiv.dat]], which is passed to `mri_segstats` as `--stiv` to report eTIV in the stats files.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/stats/synthseg.vol.csv`
- **Format:** CSV — header row with label names, one data row with volumes in mm³.

## How It Is Created

### Producing tool

`mri_synthseg --vol stats/synthseg.vol.csv` — volumes are written as a side product of segmentation.

```bash
# SynthSeg invocation (recon-all line 1635)
mri_synthseg --i $origvol --o synthseg.rca.mgz \
  --vol stats/synthseg.vol.csv \
  --threads $OMP_NUM_THREADS --keepgeom --addctab
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1635`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1635)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, SynthSeg stage. Co-produced with [[synthseg.rca.mgz]].

## How It Is Used

```bash
# Extracting TIV (recon-all line 1670)
csvprint --csv $synthsegcsv --f "total intracranial" > $synthsegtiv
```

The extracted TIV is used by `mri_segstats --stiv` in the stats stages.

## Related

- [[synthseg.rca.mgz]] — co-produced segmentation.
- [[synthseg.tiv.dat]] — TIV extracted from this file.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1635–1670.
- [[subject-directory]] — lists this file in the `stats/` section.
