---
title: "synthseg.rca.mgz"
type: file
fs_version: "8.2.0"
filename: "synthseg.rca.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "MGZ (label volume)"
binary: true
produced_by:
  - "[[mri_synthseg]]"
produced_in_stage: "autorecon1: SynthSeg"
produced_at_source:
  - "[`scripts/recon-all:1635`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1635)"
inputs:
  - "[[orig.mgz]]"
siblings:
  - "[[synthseg.vol.csv]]"
consumed_by:
  - "[[seg2recon]]"
  - "[[mri_vsinus_seg]]"
downstream_files:
  - "[[aseg.auto_noCCseg.mgz]]"
  - "[[synthseg.tiv.dat]]"
  - "[[synthseg.vol.csv]]"
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon1: SynthSeg (run by default in v8.x)"
editable: false
related:
  - "[[orig.mgz]]"
  - "[[synthseg.vol.csv]]"
  - "[[synthseg.tiv.dat]]"
  - "[[aseg.auto_noCCseg.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# synthseg.rca.mgz

> [!file] Glossary entry
> `synthseg.rca.mgz` is the whole-brain segmentation produced by `mri_synthseg` from [[orig.mgz]] during autorecon1. It is a deep-learning-based atlas-free segmentation (37 labels). In the default v8 pipeline, it is linked to [[aseg.auto_noCCseg.mgz]] and drives subsequent steps including normal-tissue estimation, entorhinal WM masking, and venous sinus segmentation. Volumetric statistics are simultaneously written to [[synthseg.vol.csv]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/synthseg.rca.mgz`
- **Format:** MGZ label volume in the conformed space of [[orig.mgz]].

## How It Is Created

### Producing tool

`mri_synthseg` — a deep-learning whole-brain segmentation tool.

```bash
# SynthSeg invocation (recon-all line 1635)
mri_synthseg \
  --i $origvol \
  --o synthseg.rca.mgz \
  --threads $OMP_NUM_THREADS \
  --vol stats/synthseg.vol.csv \
  --keepgeom --addctab
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1635`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1635)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, produced early in the pipeline before atlas-based segmentation. A symlink `mri/aseg.auto_noCCseg.mgz → synthseg.rca.mgz` is created if SynthSeg mode is active.

### Inputs required

- [[orig.mgz]] — conformed T1w input volume.

### Siblings (co-produced outputs)

- [[synthseg.vol.csv]] — volumetric stats CSV produced in the same call.

## How It Is Used

1. Linked to [[aseg.auto_noCCseg.mgz]] for downstream atlas-based processing.
2. Used by `seg2recon` to initialise skull-stripping parameters.
3. Used by `mri_vsinus_seg --rca-synthseg` to define cortex mask.
4. Volumetrics extracted to [[synthseg.tiv.dat]] for eTIV.

## Related

- [[orig.mgz]] — input volume.
- [[synthseg.vol.csv]] — co-produced volume table.
- [[synthseg.tiv.dat]] — TIV extracted from the CSV.
- [[aseg.auto_noCCseg.mgz]] — symlink target in standard pipeline.
- [[synthstrip.mgz]] — co-produced brain mask.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1627–1665.
- [[subject-directory]] — lists this file in the `mri/` section.
