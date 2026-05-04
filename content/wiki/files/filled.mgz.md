---
title: "filled.mgz"
type: file
fs_version: "8.2.0"
filename: "filled.mgz"
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
  - "[`scripts/recon-all:3460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3460)"
inputs:
  - "[[wm.mgz]]"
  - "[[talairach.lta]]"
  - "[[aseg.presurf.mgz]]"
siblings:
  - "[[filled.auto.mgz]]"
consumed_by:
  - "[[mri_pretess]]"
  - "[[mri_tessellate]]"
downstream_files:
  - "[[hemi.orig.nofix]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Tessellate"
optional_for: []
editable: true
related:
  - "[[mgz]]"
  - "[[wm.mgz]]"
  - "[[filled.auto.mgz]]"
  - "[[hemi.orig.nofix]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# filled.mgz

> [!file] Glossary entry
> `filled.mgz` is the two-hemisphere flood-filled white matter volume produced by [[mri_fill]] from [[wm.mgz]]. Each cortical hemisphere is flood-filled with a distinct label (127 = left hemisphere, 255 = right hemisphere), enabling hemisphere-specific surface tessellation. It is a user-editable checkpoint: if the corpus callosum cut fails (a common failure mode), users edit `filled.mgz` to manually separate the hemispheres, then rerun tessellation.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/filled.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic, `UCHAR`. Values: 0 = background, 127 = left hemisphere WM, 255 = right hemisphere WM.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

Two flood-filled blobs — one per cortical hemisphere — labelled with distinct integer values. The pons and corpus callosum are used as anatomical cut planes to separate the hemispheres before filling. The fill is purely topological (no intensity weighting): the algorithm starts from seed points within each WM blob and assigns a label to all connected voxels within the WM mask. The brainstem and cerebellum are excluded.

## How It Is Created

### Producing tool

[[mri_fill]] — reads [[wm.mgz]], uses the Talairach transform (via [[talairach.lta]]) to locate anatomical cut planes (pons, corpus callosum), optionally uses [[aseg.presurf.mgz]] as a segmentation guide, and writes hemisphere-labelled flood-filled output to `filled.mgz`.

```bash
# Default invocation (recon-all line 3443–3460)
mri_fill \
  -a ../scripts/ponscc.cut.log \
  -xform transforms/talairach.lta \
  -segmentation aseg.presurf.mgz \
  -topofix norm.mgz \
  wm.mgz filled.mgz
```

Optional seed-point flags override the automatic pons/CC location:
```bash
mri_fill ... -Pv <col> <row> <slc> -Cv <col> <row> <slc> -lhv ... -rhv ...
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:3460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3460)
- Write happens inside the `mri_fill` binary.

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Fill** stage (`-fill`). Touch sentinel: `touch/fill.touch`.

### Inputs required

- [[wm.mgz]] — pretessed WM seed volume.
- [[talairach.lta]] — atlas alignment for anatomical cut plane locations.
- [[aseg.presurf.mgz]] *(optional)* — segmentation to guide fill boundary.
- `scripts/ponscc.cut.log` — logged coordinates of pons/CC cut planes.

### Siblings (co-produced outputs)

- [[filled.auto.mgz]] — a copy of `filled.mgz` saved on first run to preserve the automatic baseline for edit-detection in subsequent runs.

## How It Is Used

### Direct downstream consumers

- [[mri_pretess]] — reads `filled.mgz` with hemisphere value (127 or 255) and [[norm.mgz]] to remove topological face-sharing before tessellation; writes `filled-pretessNN.mgz` (temporary).
- [[mri_tessellate]] — tessellates the pretessed fill to produce [[hemi.orig.nofix]].

### Downstream files derived from this one

- [[hemi.orig.nofix]] — the initial cortical surface mesh tessellated from this volume.

## Gotchas

> [!gotcha] Corpus callosum cut failure is the most common Fill failure
> If the hemispheres are not separated (e.g. due to a missing or mis-located CC cut), the flood fill merges both hemispheres into a single blob. The symptom is a surface that spans both hemispheres. Manually edit `filled.mgz` with FreeView (paint a line of zeros across the CC to separate the blobs), then rerun from tessellate: `recon-all -s <subj> -tessellate`.

> [!gotcha] Edits are preserved across reruns when FS_ALLOW_FILLED_EDIT is set
> When the `FS_ALLOW_FILLED_EDIT` environment variable is set, `mri_fill` accepts `filled.auto.mgz` and `filled.mgz` as references to detect user edits and propagate them (recon-all lines 3453–3457).

> [!gotcha] Clean-fill discards manual edits
> Running `recon-all -clean-fill` moves `filled.mgz` to `trash/` (recon-all line 982), discarding any manual edits.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_fill]] — producer.
- [[wm.mgz]] — input WM mask.
- [[filled.auto.mgz]] — auto-backup copy.
- [[hemi.orig.nofix]] — tessellated surface produced from this volume.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 3428–3475.
- [[subject-directory]] — lists this file in the `mri/` section.
