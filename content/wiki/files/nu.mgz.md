---
title: "nu.mgz"
type: file
fs_version: "8.2.0"
filename: "nu.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_nu_correct.mni]]"
produced_in_stage: "autorecon1: Nu Intensity Correction"
produced_at_source:
  - "[`scripts/recon-all:2054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2054)"
inputs:
  - "[[orig.mgz]]"
siblings: []
consumed_by:
  - "[[mri_normalize]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_em_register]]"
downstream_files:
  - "[[T1.mgz]]"
  - "[[norm.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon1: Intensity Normalization"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[orig.mgz]]"
  - "[[T1.mgz]]"
  - "[[norm.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# nu.mgz

> [!file] Glossary entry
> `nu.mgz` is the bias-field-corrected T1 volume, produced from [[orig.mgz]] by [[mri_nu_correct.mni]] in autorecon1. It corrects intensity non-uniformity (NU) across the brain while preserving anatomical contrast, making subsequent intensity normalisation steps more reliable. `nu.mgz` feeds directly into [[T1.mgz]] (first intensity normalisation) and [[norm.mgz]] (canonical atlas-based normalisation).

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/nu.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; same type and dimensions as [[orig.mgz]] (256 × 256 × 256, 1 mm isotropic, typically `UCHAR` or `FLOAT`).
- **Typical size / shape:** 256 × 256 × 256, ~16 MB gzipped.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

Each voxel holds a bias-field-corrected T1 intensity value. The spatial grid and RAS orientation are identical to [[orig.mgz]]; only the intensity values change. Bias fields (slow spatially varying intensity variations from RF coil inhomogeneity) are estimated and divided out by N3/N4 or ANTs algorithms called by [[mri_nu_correct.mni]].

Like [[orig.mgz]], the Talairach transform path is embedded in the header by `mri_add_xform_to_header` after the correction step.

## How It Is Created

### Producing tool

[[mri_nu_correct.mni]] — a FreeSurfer wrapper around the MNI `nu_correct` tool (N3 algorithm). Reads [[orig.mgz]], estimates the spatially varying bias field, and writes the corrected volume to `nu.mgz`.

```bash
# Default invocation (recon-all line 2054)
mri_nu_correct.mni --i orig.mgz --o nu.mgz

# With Talairach-based brain masking (common default)
mri_nu_correct.mni --i orig.mgz --o nu.mgz \
  --uchar transforms/talairach.xfm

# 3T protocol (extra iterations)
mri_nu_correct.mni --i orig.mgz --o nu.mgz \
  --proto-iters 1000 --distance 50 --n 1
```

The `--uchar` option causes `mri_make_uchar` to run first, which uses the Talairach transform to identify a ball of brain voxels and rescale the histogram before N3, improving robustness (recon-all comment at line 2056–2062).

### Source reference

- **File:** `scripts/recon-all`
- **Lines:** 2047–2104
- **GitHub:** [`scripts/recon-all:2054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2054)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, **Nu Intensity Correction** stage (`-nuintensitycor`). Touch sentinel: `touch/nu.touch`.

### Inputs required

- [[orig.mgz]] — conformed T1 input.
- `mri/transforms/talairach.xfm` *(optional)* — used by `--uchar` for brain masking before correction.

### Siblings (co-produced outputs)

None. Only `nu.mgz` is written.

## How It Is Used

### Direct downstream consumers

- [[mri_normalize]] — reads `nu.mgz` to produce [[T1.mgz]] (first normalisation).
- [[mri_ca_normalize]] — reads `nu.mgz` to produce [[norm.mgz]] (canonical atlas-based normalisation).
- [[mri_em_register]] — may use `nu.mgz` as input for GCA-based EM registration (autorecon2).

### Downstream files derived from this one

- [[T1.mgz]] — first (non-atlas-guided) intensity normalisation of nu.
- [[norm.mgz]] — atlas-guided canonical normalisation of nu.

## Alternative Names and Variants

### Aliases

When `-skip-nu-intensity-cor` is passed to recon-all, `nu.mgz` is created as a **symbolic link** to [[orig.mgz]] rather than a corrected volume (recon-all line 2112). Downstream tools behave identically regardless.

## Gotchas

> [!gotcha] nu.mgz may be a symlink to orig.mgz
> When bias-field correction is skipped (`-skip-nu-intensity-cor`), `nu.mgz` is a symlink to `orig.mgz`. Any tool that checks for the existence of `nu.mgz` will succeed, but no actual correction was applied. Inspect with `file nu.mgz` or `ls -la nu.mgz` to distinguish.

> [!gotcha] 3T flag changes N3 parameters
> The `-3T` flag (recon-all) adjusts N3 protocol parameters (fewer iterations, shorter distance). Without this flag, the default 1.5T parameters may produce over- or under-corrected results on 3T data.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_nu_correct.mni]] — producer.
- [[orig.mgz]] — input.
- [[T1.mgz]], [[norm.mgz]] — downstream normalised volumes.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 2043–2114.
- [[subject-directory]] — lists this file in the `mri/` section.
