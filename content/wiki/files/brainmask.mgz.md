---
title: "brainmask.mgz"
type: file
fs_version: "8.2.0"
filename: "brainmask.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_watershed]]"
  - "[[mri_mask]]"
produced_in_stage: "autorecon1: Skull Stripping"
produced_at_source:
  - "[`mri_watershed/mri_watershed.cpp:1328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_watershed/mri_watershed.cpp#L1328)"
  - "[`scripts/recon-all:2380`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2380)"
inputs:
  - "[[T1.mgz]]"
siblings: []
consumed_by:
  - "[[mri_normalize]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_register]]"
  - "[[mri_mask]]"
downstream_files:
  - "[[brain.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[norm.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2 (all stages depend on brain mask)"
optional_for: []
editable: true
related:
  - "[[mgz]]"
  - "[[T1.mgz]]"
  - "[[brain.mgz]]"
  - "[[brain.finalsurfs.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - file
---

# brainmask.mgz

> [!file] Glossary entry
> `brainmask.mgz` is the binary brain mask produced by skull stripping in autorecon1. It encodes which voxels belong to the brain: values of 0 = outside brain, positive values = inside brain (brain voxels retain their T1 intensity from [[T1.mgz]]). It is a critical user-editable checkpoint — if skull stripping fails, the user corrects `brainmask.mgz` before rerunning from autorecon2. Virtually all autorecon2 tools read this mask.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/brainmask.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Brain voxels hold their T1 intensity value; non-brain voxels are 0.
- **Typical size / shape:** 256 × 256 × 256, ~16 MB gzipped.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

`brainmask.mgz` is not a pure binary mask but rather a **masked T1 volume**: brain voxels carry their `T1.mgz` intensity, non-brain voxels are zeroed. This design lets tools use the mask as either a binary (threshold > 0) or as an intensity image without needing two separate files.

Special edit voxels:
- **Voxels = 1** (deletion edits): explicitly excluded from the brain mask even if the intensity would normally include them.
- **Voxels = 255** (inclusion edits): explicitly included in the brain mask even if the intensity would normally exclude them.

These edit codes are propagated by `mri_mask -transfer 255` and `-keep_mask_deletion_edits` calls throughout recon-all.

## How It Is Created

### Producing tool

**Default path:** [[mri_watershed]] — reads [[T1.mgz]] and uses a watershed algorithm seeded from the brain interior to produce the brain mask.

**SynthStrip path:** When `-synthstrip` is passed to recon-all, [[mri_mask]] is used to apply a SynthStrip neural-network mask to `T1.mgz`, bypassing `mri_watershed`:

```bash
# mri_watershed (default, recon-all line ~2380)
mri_watershed T1.mgz brainmask.mgz

# SynthStrip path (recon-all line 2259)
mri_mask T1.mgz <synthstrip_mask> brainmask.mgz
```

### Source reference

- **mri_watershed write:** [`mri_watershed/mri_watershed.cpp:1328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_watershed/mri_watershed.cpp#L1328) — `MRIwrite(mri_without_skull, out_fname)`
- **Pipeline invocation:** [`scripts/recon-all:2380`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2380)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, **Skull Stripping** stage (`-skullstrip`). Touch sentinel: `touch/skullstrip.touch` (name may vary).

### Inputs required

- [[T1.mgz]] — intensity-normalised T1 input to the skull stripper.
- `mca-dura.mgz` / `vsinus.mgz` *(optional)* — MCA-dura and venous sinus masks applied post-strip.

**Environment:** `$FREESURFER_HOME/average/*.gca` — atlas templates used by atlas-based watershed modes.

### Siblings (co-produced outputs)

None. `brainmask.mgz` is the sole direct output of skull stripping.

## How It Is Used

### Direct downstream consumers

- [[mri_ca_normalize]] — reads `brainmask.mgz` to restrict normalisation to brain voxels (`-mask brainmask.mgz`).
- [[mri_normalize]] (Intensity Normalization2) — reads brainmask to produce [[brain.mgz]].
- [[mri_ca_register]] — uses brainmask as an exclusion mask during non-linear registration.
- [[mri_mask]] — applies `brainmask.mgz` to `brain.mgz` to create [[brain.finalsurfs.mgz]].
- Nearly all autorecon2 segmentation tools read brainmask to restrict computation.

### Downstream files derived from this one

- [[brain.mgz]] — intensity normalisation with brainmask applied.
- [[brain.finalsurfs.mgz]] — final masked brain for surface placement (via mri_mask).
- [[norm.mgz]] — atlas normalisation uses brainmask.

## Alternative Names and Variants

### Aliases

In the longitudinal stream:
- `brainmask_<baseid>.mgz` — copy of the base subject's brainmask propagated to each time point.
- `brainmask.auto.mgz` — automatically generated brainmask (before user edits are transferred to `brainmask.mgz`).

## Gotchas

> [!gotcha] User-editable checkpoint — edits survive rerun
> `brainmask.mgz` is designed to be manually edited with FreeView between autorecon1 and autorecon2. Edits (voxels set to 255 for inclusion, 1 for deletion) are transferred by subsequent `mri_mask -transfer 255` and `-keep_mask_deletion_edits` calls during the `-maskbfs` stage (recon-all line 3166–3196). When autorecon2 is re-run, edits made to `brainmask.mgz` are preserved and propagated to [[brain.finalsurfs.mgz]] and [[brain.mgz]].

> [!gotcha] Removing brainmask.mgz triggers a re-strip
> `recon-all -clean-bm` moves `brainmask.mgz` to `trash/`, forcing re-skull-stripping (recon-all line 958). This discards any manual edits.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_watershed]] — primary producer.
- [[T1.mgz]] — input.
- [[brain.mgz]], [[brain.finalsurfs.mgz]] — downstream masked volumes.
- [[norm.mgz]] — atlas normalisation (uses brainmask).
- [[bmedits2surf]] — maps manual `brainmask.mgz` edits (vs. `brainmask.auto.mgz`) onto the surface for QA.
- [[ventfix]] — ventricle-segmentation fix tool that always reads `brainmask.mgz` alongside the aseg ([[aseg.presurf.mgz]]).
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_watershed/mri_watershed.cpp:1328`; `scripts/recon-all` lines 2285–2646.
- [[subject-directory]] — lists this file in the `mri/` section.
