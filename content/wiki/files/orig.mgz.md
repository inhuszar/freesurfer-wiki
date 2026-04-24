---
title: "orig.mgz"
type: file
fs_version: "8.2.0"
filename: "orig.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_convert]]"
produced_in_stage: "autorecon1: Conform"
produced_at_source:
  - "[`scripts/recon-all:1534`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1534)"
inputs:
  - "[[rawavg.mgz]]"
siblings:
  - "[[rawavg2orig.lta]]"
consumed_by:
  - "[[mri_nu_correct.mni]]"
  - "[[mri_em_register]]"
  - "[[mri_watershed]]"
  - "[[talairach_avi]]"
downstream_files:
  - "[[nu.mgz]]"
  - "[[T1.mgz]]"
  - "[[rawavg2orig.lta]]"
mandatory_for:
  - "[[recon-all]] autorecon1 and all downstream stages"
optional_for: []
editable: false
related:
  - "[[mgz]]"
  - "[[rawavg.mgz]]"
  - "[[nu.mgz]]"
  - "[[coordinate-systems]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# orig.mgz

> [!file] Glossary entry
> `orig.mgz` is the conformed (256 × 256 × 256, 1 mm isotropic) T1-weighted volume that serves as the spatial reference frame for all FreeSurfer processing. It is produced from [[rawavg.mgz]] by [[mri_convert]] with `--conform` in autorecon1. Every subsequent MRI volume and surface coordinate in the subject's directory is defined relative to `orig.mgz`'s RAS frame. The Talairach transform embedded in its header is the entry point for atlas registration.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/orig.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; `UCHAR` (0–255), 256 × 256 × 256 voxels, 1 mm isotropic.
- **Typical size / shape:** 256 × 256 × 256, ~16 MB gzipped.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

Each voxel holds a T1-weighted intensity value in the 0–255 range. The volume is in **conformed space**: exactly 256³ voxels at 1 mm isotropic resolution, with the standard FreeSurfer orientation (coronal slices, RAS voxel ordering). The scanner FOV is padded or cropped to fit this grid.

The volume's header embeds the `talairach.xfm` transform path even before Talairach registration runs — a deliberate design choice (recon-all ~line 1557) to avoid updating the timestamp after registration.

### Coordinate system

`orig.mgz` defines the **tkr-RAS** (surface RAS) coordinate origin for the subject. All FreeSurfer surfaces are expressed relative to this frame. See [[coordinate-systems]].

## How It Is Created

### Producing tool

[[mri_convert]] — reads [[rawavg.mgz]], applies `--conform` to resample to 256³ 1 mm isotropic with standard orientation. Optionally applies `--conform_min` (high-res subjects), `--conform-dc` (keep direction cosines), or `--cw256` (force FOV to 256 when scanner FOV > 256).

```bash
# Default conformation (recon-all line 1534)
mri_convert rawavg.mgz orig.mgz --conform

# High-res subjects (-hires flag)
mri_convert rawavg.mgz orig.mgz --conform_min

# Wide FOV (>256 mm)
mri_convert rawavg.mgz orig.mgz --conform --cw256
```

After the convert step, `mri_add_xform_to_header` embeds the (not yet computed) Talairach xfm path:

```bash
mri_add_xform_to_header -c transforms/talairach.xfm orig.mgz orig.mgz
```

### Source reference

- **File:** `scripts/recon-all`
- **Lines:** 1534–1564
- **GitHub:** [`scripts/recon-all:1534`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1534)

The actual write happens inside `mri_convert`; see the [[mri_convert]] tool page for `MRIwrite` line references.

### Pipeline stage

[[recon-all]] autorecon1, **Conform** stage (`-conform`). Touch sentinel: `touch/conform.touch`.

### Inputs required

- [[rawavg.mgz]] — native-resolution average; source for conform resampling.

### Siblings (co-produced outputs)

- [[rawavg2orig.lta]] — LTA mapping rawavg space to orig space, created immediately after conform (recon-all line 1600).

## How It Is Used

### Direct downstream consumers

- [[mri_nu_correct.mni]] — reads `orig.mgz` to produce [[nu.mgz]] (bias-field corrected volume).
- [[talairach_avi]] / [[mri_em_register]] — reads `orig.mgz` (or `nu.mgz`) to estimate the Talairach transform [[talairach.xfm]].
- [[mri_watershed]] — reads `T1.mgz` (derived from orig) for skull stripping.
- Many downstream tools use `orig.mgz` as a geometry reference when creating new volumes.

### Downstream files derived from this one

- [[nu.mgz]] — bias-field corrected from orig.
- [[T1.mgz]] — intensity-normalised from nu.
- [[norm.mgz]] — canonically normalized from nu.
- [[rawavg2orig.lta]] — transform encoding the conform resampling.

## Alternative Names and Variants

### Variants

- `mri/orig/` (directory) — contains the per-run input volumes (`001.mgz`, `002.mgz`, …) that were averaged into [[rawavg.mgz]]. These are distinct files.

## Gotchas

> [!gotcha] FOV > 256 mm causes a hard error
> If the conformed volume width exceeds 256 mm, recon-all aborts with `ERROR! FOV > 256`. The fix is to rerun with `-cw256` (recon-all line 1584–1590). This is a common failure mode for subjects scanned with a large FOV.

> [!gotcha] Talairach xfm embedded before registration
> The `talairach.xfm` path is written into orig.mgz's header at the conform step (line 1557–1563), before `talairach.xfm` itself exists. This means the header field points to a file that is created later. Tools that read this field before Talairach registration has run will encounter a missing file.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_convert]] — producer.
- [[rawavg.mgz]] — source input.
- [[nu.mgz]], [[T1.mgz]], [[norm.mgz]] — downstream derived volumes.
- [[coordinate-systems]] — the RAS/tkr-RAS frame this volume defines.
- [[recon-all]] — pipeline context.
- [[subject-directory]] — directory layout.

## References

- Source: `scripts/recon-all` lines 1529–1608.
- [[subject-directory]] — lists this file in the `mri/` section.
