---
title: "wm.mgz"
type: file
fs_version: "8.2.0"
filename: "wm.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_pretess]]"
produced_in_stage: "autorecon2: WM Segmentation / PreTess"
produced_at_source:
  - "[`scripts/recon-all:3382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3382)"
inputs:
  - "[[wm.asegedit.mgz]]"
  - "[[norm.mgz]]"
siblings: []
consumed_by:
  - "[[mri_fill]]"
downstream_files:
  - "[[filled.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Fill"
optional_for: []
editable: true
related:
  - "[[mgz]]"
  - "[[wm.seg.mgz]]"
  - "[[wm.asegedit.mgz]]"
  - "[[filled.mgz]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - file
---

# wm.mgz

> [!file] Glossary entry
> `wm.mgz` is the binary white matter mask used for cortical surface tessellation. It is the primary user-editable checkpoint for fixing surface reconstruction failures caused by WM segmentation errors: voxels set to 255 include that location in the WM; voxels set to 1 exclude it. `wm.mgz` is produced from [[wm.asegedit.mgz]] by [[mri_pretess]], which ensures the mask has no faces shared between opposite-label voxels (a topological requirement for [[mri_fill]] and surface tessellation). If `wm.mgz` already exists with user edits, those edits are preserved with the `-keep` flag.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/wm.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Values: 0 = not WM, 255 = WM (include), 1 = deletion edit (exclude).
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A binary-ish WM mask where:
- **255** marks voxels included in the white matter (for surface tessellation).
- **0** marks excluded voxels.
- **1** marks user deletion edits — explicitly excluded voxels that would otherwise be classified as WM.

These values are intentional edit codes: the `mri_fill` command and subsequent tools interpret 255 as "fill starting point" and 1 as "do not cross here."

## How It Is Created

### Producing tool

[[mri_pretess]] — reads [[wm.asegedit.mgz]] and modifies voxels at label boundaries to eliminate topological face-sharing (a prerequisite for marching-cubes tessellation). The output is `wm.mgz`.

```bash
# Default invocation (recon-all line 3382)
mri_pretess wm.asegedit.mgz wm norm.mgz wm.mgz

# With edit preservation (when wm.mgz already exists with edits)
mri_pretess -keep wm.asegedit.mgz wm norm.mgz wm.mgz
```

If `FixEntoWM` is set, a further `mri_edit_wm_with_aseg` pass corrects entorhinal white matter voxels in `wm.mgz` in-place (recon-all line 3388).

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3382)
- Write happens inside the `mri_pretess` binary.

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **WM Segmentation** stage (`-wmseg`). Touch sentinel: `touch/wmsegment.touch`.

### Inputs required

- [[wm.asegedit.mgz]] — aseg-edited WM mask (input to pretess).
- [[norm.mgz]] — intensity reference for boundary fixing.

### Siblings (co-produced outputs)

None.

## How It Is Used

### Direct downstream consumers

- [[mri_fill]] — reads `wm.mgz` as the seed volume for flood-filling the two cortical hemispheres, producing [[filled.mgz]].

### Downstream files derived from this one

- [[filled.mgz]] — flood-filled WM volume for tessellation.

## Gotchas

> [!gotcha] Primary user-editable checkpoint for surface reconstruction
> If surfaces are wrong due to WM segmentation errors, edit `wm.mgz` with FreeView: paint 255 to add WM, paint 0 or 1 to remove it. Then rerun from the Fill stage: `recon-all -s <subj> -fill -tessellate -smooth1 -inflate1 -qsphere -fix -white -smooth2 -inflate2 -sphere -surfreg ...`. Editing wm.mgz and rerunning is the standard intervention for topological failures.

> [!gotcha] Edits are preserved across reruns only if -clean-wm is not set
> When `recon-all -wmseg` reruns without `-clean-wm`, the `-keep` flag is passed to `mri_pretess`, preserving existing 255/1 edits. Running with `-clean-wm` (recon-all line 974–977) moves `wm.mgz` and `wm.seg.mgz` to `trash/` and discards all edits.

> [!gotcha] wm.mgz may be copied to wm.seg.mgz when edits are present
> When wm.mgz edits exist (255/1 voxels), `mri_binarize` detects them (recon-all lines 3267–3298) and `wm.mgz` is copied directly to `wm.seg.mgz`, bypassing `mri_segment`. This means the two files may differ when manual edits are present.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_pretess]] — producer.
- [[wm.asegedit.mgz]] — input.
- [[wm.seg.mgz]] — earlier WM estimate; may be copied from wm.mgz when edits exist.
- [[filled.mgz]] — downstream flood fill.
- [[mri_fill]] — primary consumer.
- [[wmedits2surf]] — maps manual `wm.mgz` edits (erase/fill voxels) onto the surface for QA.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3254–3426.
- [[subject-directory]] — lists this file in the `mri/` section.
