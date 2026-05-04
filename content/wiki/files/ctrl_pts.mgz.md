---
title: "ctrl_pts.mgz"
type: file
fs_version: "8.2.0"
filename: "ctrl_pts.mgz"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[mgz]]"
binary: true
produced_by:
  - "[[mri_ca_normalize]]"
produced_in_stage: "autorecon2: CA Normalize"
produced_at_source:
  - "[`mri_ca_normalize/mri_ca_normalize.cpp:673`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_normalize/mri_ca_normalize.cpp#L673)"
  - "[`scripts/recon-all:2730`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2730)"
inputs:
  - "[[nu.mgz]]"
  - "[[talairach.lta]]"
siblings:
  - "[[norm.mgz]]"
consumed_by:
  - "[[mri_ca_normalize]]"
  - "[[mri_normalize]]"
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] longitudinal: provides base control points for time-point normalisation"
editable: true
related:
  - "[[mgz]]"
  - "[[norm.mgz]]"
  - "[[talairach.lta]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-04-23
gaps:
  - "Clarify whether ctrl_pts.mgz or control.dat (text) is the canonical user-edit form in FS 8.x"
tags:
  - file
---

# ctrl_pts.mgz

> [!file] Glossary entry
> `ctrl_pts.mgz` is a volume encoding the control points used by [[mri_ca_normalize]] to set the white matter intensity target. It is co-produced with [[norm.mgz]] during the CA Normalize stage. In the longitudinal stream, the base subject's `ctrl_pts.mgz` is passed to time-point normalisation to ensure consistent intensity calibration across sessions. Users may also provide custom control points (e.g. via `-f control.dat`) to guide normalisation in abnormal brains.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/ctrl_pts.mgz`
- **Format:** [[mgz]] — MGH/MGZ binary; 256 × 256 × 256, 1 mm isotropic. Control point voxels are marked with a non-zero value; all other voxels are 0.
- **Byte-accurate specification:** See [[mgz]].

## What It Contains

A sparse volume where non-zero voxels mark the control points identified by [[mri_ca_normalize]] as reliable white matter representatives. The GCA atlas is used to identify candidate WM voxels, which are then filtered for intensity consistency. These control points anchor the normalisation curve that maps the subject's WM intensities to the target (≈ 110 on the `UCHAR` scale).

## How It Is Created

### Producing tool

[[mri_ca_normalize]] — as a side effect of normalisation, writes the identified control points volume to the path specified by `-c ctrl_pts.mgz`.

```bash
# Recon-all invocation (line 2730)
mri_ca_normalize \
  -c ctrl_pts.mgz \
  -mask brainmask.mgz \
  nu.mgz \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  transforms/talairach.lta \
  norm.mgz
```

### Source reference

- **Write call:** [`mri_ca_normalize/mri_ca_normalize.cpp:673`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_normalize/mri_ca_normalize.cpp#L673) — `MRIwrite(mri_ctrl, ctrl_point_fname)`
- **Pipeline invocation:** [`scripts/recon-all:2730`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2730)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **CA Normalize** stage. Co-produced with [[norm.mgz]].

### Inputs required

- [[nu.mgz]], [[talairach.lta]], [[brainmask.mgz]] — same as for [[norm.mgz]].

### Siblings (co-produced outputs)

- [[norm.mgz]] — the normalised volume produced in the same invocation.

## How It Is Used

### Direct downstream consumers

- [[mri_normalize]] — in some pipeline configurations, reads `ctrl_pts.mgz` via `-f` to guide the second normalisation pass.
- [[mri_ca_normalize]] (longitudinal) — reads the base subject's `ctrl_pts.mgz` via `-l` flag to constrain time-point normalisation.

> [!gap] User edit workflow
> The canonical method for users to add custom control points in modern FS (8.x) may be via the text-format `control.dat` (using `-f control.dat` with mri_normalize) rather than by editing `ctrl_pts.mgz` directly. The exact recommended workflow for pathological cases needs confirmation.

## Related

- [[mgz]] — on-disk format specification.
- [[mri_ca_normalize]] — producer.
- [[norm.mgz]] — co-produced sibling.
- [[talairach.lta]] — atlas transform used during production.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_ca_normalize/mri_ca_normalize.cpp:673`; `scripts/recon-all` lines 2707–2748.
- [[subject-directory]] — lists this file in the `mri/` section.
