---
title: "hemi.orig.nofix"
type: file
fs_version: "8.2.0"
filename: "hemi.orig.nofix"
aliases:
  - "lh.orig.nofix"
  - "rh.orig.nofix"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mri_tessellate]]"
produced_in_stage: "autorecon2: Tessellate"
produced_at_source:
  - "[`mri_tessellate/mri_tessellate.cpp:224`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_tessellate/mri_tessellate.cpp#L224)"
  - "[`scripts/recon-all:3580`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3580)"
inputs:
  - "[[filled.mgz]]"
siblings:
  - "[[hemi.orig.nofix]]"
consumed_by:
  - "[[mris_extract_main_component]]"
  - "[[mris_smooth]]"
  - "[[mris_fix_topology]]"
  - "[[mris_place_surface]]"
downstream_files:
  - "[[hemi.smoothwm.nofix]]"
  - "[[hemi.orig]]"
mandatory_for:
  - "[[recon-all]] autorecon2: Smooth1, Inflate1, QSphere, Fix Topology"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[filled.mgz]]"
  - "[[hemi.orig]]"
  - "[[topology-correction]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.orig.nofix

> [!file] Glossary entry
> `lh.orig.nofix` / `rh.orig.nofix` are the initial cortical surface meshes produced by [[mri_tessellate]] from the flood-filled white matter volume ([[filled.mgz]]). They may contain topological defects (handles and holes) because the marching-cubes tessellation has not yet been corrected. These surfaces feed the topology-correction pipeline (Smooth1 → Inflate1 → QSphere → Fix Topology), which produces the topologically correct [[hemi.orig]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.orig.nofix`, `surf/rh.orig.nofix`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS coordinates.
- **Typical size / shape:** ~130,000–165,000 vertices, ~260,000–330,000 faces per hemisphere. Exact count depends on the subject's brain size and voxel resolution.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A triangular surface mesh tessellating the boundary of one hemisphere's white matter blob in [[filled.mgz]]. Vertex coordinates are in **tkr-RAS** (FreeSurfer surface RAS), the same frame as [[orig.mgz]]. The topology is not guaranteed to be a closed genus-0 sphere — handles (extra connections) and holes (missing patches) can exist and must be corrected before spherical registration.

## How It Is Created

### Producing tool

[[mri_tessellate]] — reads the pretessed fill volume (`filled-pretessNN.mgz`, a temporary file created from [[filled.mgz]] by [[mri_pretess]]) and applies marching-cubes tessellation at the specified label value (127 for lh, 255 for rh) to extract the hemisphere surface.

After tessellation, [[mris_extract_main_component]] is run to keep only the largest connected component (removing isolated surface fragments), writing the result back to `lh.orig.nofix`.

```bash
# Pretess step (creates temporary filled-pretessNN.mgz)
mri_pretess ../mri/filled.mgz 255 ../mri/norm.mgz ../mri/filled-pretess255.mgz

# Tessellate step (recon-all line 3580)
mri_tessellate ../mri/filled-pretess255.mgz 255 ../surf/rh.orig.nofix

# Keep largest component
mris_extract_main_component rh.orig.nofix rh.orig.nofix
```

### Source reference

- **Write call:** [`mri_tessellate/mri_tessellate.cpp:224`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_tessellate/mri_tessellate.cpp#L224) — `MRISwrite(mris, ofpref)`
- **Pipeline invocation:** [`scripts/recon-all:3580`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3580)

### Pipeline stage

[[recon-all]] autorecon2, **Tessellate** stage (`-tessellate`). Touch sentinel: `touch/$hemi.tessellate.touch`.

### Inputs required

- [[filled.mgz]] — hemisphere-labelled WM volume (via pretessed derivative).
- [[norm.mgz]] — reference intensity volume for pretessellation step.

### Siblings (co-produced outputs)

- Both `lh.orig.nofix` and `rh.orig.nofix` are produced in the same pipeline stage (in separate iterations of the hemisphere loop).

## How It Is Used

### Direct downstream consumers

- [[mris_smooth]] — reads `hemi.orig.nofix` to produce [[hemi.smoothwm.nofix]] (Smooth1 stage, `mris_smooth -nw ../surf/$hemi.orig.nofix $hemi.smoothwm.nofix`).
- [[mris_fix_topology]] / [[mris_place_surface]] — reads `orig.nofix` as input for topology correction, producing the topologically correct [[hemi.orig]].

### Downstream files derived from this one

- [[hemi.smoothwm.nofix]] — smoothed version for inflation and spherical mapping.
- [[hemi.orig]] — topology-corrected successor.

## Alternative Names and Variants

### Variants

- `hemi.orig.nofix.predec` — present when `-decimate` is enabled; the raw tessellation before downsampling to the target face area. [[mris_remesh]] converts this to `hemi.orig.nofix` (recon-all line 3600).

## Related

- [[surface-format]] — on-disk format specification.
- [[mri_tessellate]] — producer.
- [[filled.mgz]] — source volume.
- [[hemi.orig]] — topology-corrected successor.
- [[hemi.smoothwm.nofix]], [[hemi.inflated.nofix]], [[hemi.qsphere.nofix]] — downstream nofix intermediates.
- [[topology-correction]] — concept explaining why nofix surfaces exist.
- [[recon-all]] — pipeline context.

## References

- Source: `mri_tessellate/mri_tessellate.cpp:224`; `scripts/recon-all` lines 3555–3608.
- [[subject-directory]] — lists this file in the `surf/` section.
