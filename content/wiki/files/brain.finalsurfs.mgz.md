---
title: "brain.finalsurfs.mgz"
type: file
fs_version: "8.2.0"
filename: "brain.finalsurfs.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_mask]]"
produced_in_stage: "autorecon2: Mask BFS"
produced_at_source:
  - "[`scripts/recon-all:3166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3166)"
inputs:
  - "[[brain.mgz]]"
  - "[[brainmask.mgz]]"
siblings: []
consumed_by:
  - "[[mris_make_surfaces]]"
downstream_files: []
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: White and Pial surface placement"
optional_for: []
editable: true
related:
  - "[[mgz]]"
  - "[[brain.mgz]]"
  - "[[brainmask.mgz]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# brain.finalsurfs.mgz

> [!file] Glossary entry
> `brain.finalsurfs.mgz` is the final intensity volume used by [[mris_make_surfaces]] for white and pial surface placement. It is produced from [[brain.mgz]] by [[mri_mask]] with a threshold of 5 (`-T 5`) to remove near-zero-intensity voxels near the brain boundary. It is a user-editable file: `brain.finalsurfs.manedit.mgz` stores manual edits that are transferred back to `brain.finalsurfs.mgz` on each rerun, allowing targeted correction of surface placement failures without affecting other pipeline stages.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/brain.finalsurfs.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Non-brain voxels are 0; brain voxels retain `brain.mgz` intensities.
- **Typical size / shape:** 256 × 256 × 256, ~16 MB gzipped.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

An intensity-normalised, skull-stripped brain volume identical to [[brain.mgz]] except that:
1. Voxels with intensity below the threshold of 5 are zeroed (`-T 5` flag).
2. Optional masking of MCA-dura (`mca-dura.mgz`) and venous sinuses (`vsinus.mgz`) is applied to prevent meningeal tissue from pulling the pial surface outward (recon-all lines 3173–3184).
3. Manual edit voxels (255 = include, 1 = exclude) from `brain.finalsurfs.manedit.mgz` are transferred on each run.

## How It Is Created

### Producing tool

[[mri_mask]] — applies [[brainmask.mgz]] to [[brain.mgz]] with a floor threshold of 5, then optionally inverts and applies MCA-dura and vsinus masks.

```bash
# Core step (recon-all line 3166)
mri_mask -T 5 brain.mgz brainmask.mgz brain.finalsurfs.mgz

# Additional MCA-dura masking (when FixMCADura is set)
mri_mask -oval 1 -invert brain.finalsurfs.mgz mca-dura.mgz brain.finalsurfs.mgz

# Venous sinus masking (when FixVSinus is set)
mri_mask -oval 1 -invert brain.finalsurfs.mgz vsinus.mgz brain.finalsurfs.mgz

# Transfer manual edits from manedit file
mri_mask -transfer 255 -keep_mask_deletion_edits \
  brain.finalsurfs.mgz brain.finalsurfs.manedit.mgz brain.finalsurfs.mgz
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3166)
- The actual MRIwrite happens inside the `mri_mask` binary (see [[mri_mask]] tool page).

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Mask BFS** stage (`-maskbfs`). Run immediately before WM segmentation.

### Inputs required

- [[brain.mgz]] — intensity source volume.
- [[brainmask.mgz]] — brain extraction mask.
- `mca-dura.mgz`, `vsinus.mgz` *(optional)* — additional exclusion masks applied when the respective fix flags are set.
- `brain.finalsurfs.manedit.mgz` *(optional)* — user edit volume; present only after manual editing.

### Siblings (co-produced outputs)

After the first run, `brain.finalsurfs.manedit.mgz` is also created as a copy of `brain.finalsurfs.mgz` to track the baseline state (recon-all line 3243). On subsequent runs it stores accumulated edits.

## How It Is Used

### Direct downstream consumers

- [[mris_make_surfaces]] — reads `brain.finalsurfs.mgz` as the intensity reference for both white matter and pial surface placement. This is the critical volume that determines surface quality.

### Downstream files derived from this one

- [[hemi.white]] — white matter surface placed by mris_make_surfaces using this volume.
- [[hemi.pial]] — pial surface placed by mris_make_surfaces using this volume.

## Alternative Names and Variants

### Aliases

- `brain.finalsurfs.manedit.mgz` — the editable variant where users store manual corrections (voxels = 255 to include, voxels = 1 to exclude). This file is NOT the editable copy in the sense that users edit it directly with FreeView; rather, it stores the cumulative state of manual edits.

## Gotchas

> [!gotcha] Editable checkpoint for surface placement failures
> If surfaces are incorrectly placed (e.g. pial surface extends into meningeal tissue), edit `brain.finalsurfs.mgz` with FreeView to zero out the offending region, then save as `brain.finalsurfs.manedit.mgz`. Rerunning autorecon2 from `-maskbfs` will transfer these edits on each run. See [[wiki/pipelines/recon-all|recon-all]] for the re-run procedure.

> [!gotcha] -T 5 threshold removes low-intensity brain voxels
> The `-T 5` floor in the mri_mask call removes voxels with intensities 1–4 from the brain. This prevents extremely dark brain tissue from anchoring surfaces, but it also removes any voxels that were explicitly marked as "deletion edits" (value = 1) in `brainmask.mgz`. The deletion edits logic uses a different flag (`-keep_mask_deletion_edits`) in subsequent calls.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_mask]] — producer.
- [[brain.mgz]], [[brainmask.mgz]] — inputs.
- [[hemi.white]], [[hemi.pial]] — surfaces placed using this volume.
- [[mris_make_surfaces]] — primary consumer.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3155–3250.
- [[subject-directory]] — lists this file in the `mri/` section.
