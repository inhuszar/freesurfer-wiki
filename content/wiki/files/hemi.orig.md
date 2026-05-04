---
title: "hemi.orig"
type: file
fs_version: "8.2.0"
filename: "hemi.orig"
aliases:
  - "lh.orig"
  - "rh.orig"
location: "$SUBJECTS_DIR/<subj>/surf/"
anchor: subject
hemispheric: true
format: "[[surface-format]]"
binary: true
produced_by:
  - "[[mris_fix_topology]]"
produced_in_stage: "autorecon2: Fix Topology"
produced_at_source:
  - "[`mris_fix_topology/mris_fix_topology.cpp:312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_fix_topology/mris_fix_topology.cpp#L312)"
  - "[`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)"
inputs:
  - "[[hemi.orig.nofix]]"
  - "[[hemi.inflated.nofix]]"
  - "[[hemi.qsphere.nofix]]"
siblings: []
consumed_by:
  - "[[mris_smooth]]"
  - "[[mris_place_surface]]"
  - "[[mris_autodet_gwstats]]"
  - "[[mris_remove_intersection]]"
downstream_files:
  - "[[hemi.smoothwm]]"
  - "[[hemi.white]]"
  - "[[hemi.pial]]"
  - "[[autodet.gw.stats.hemi.dat]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: Smooth2, Inflate2, AutoDetGWStats, WhitePreAparc"
optional_for: []
editable: false
related:
  - "[[surface-format]]"
  - "[[hemi.orig.nofix]]"
  - "[[topology-correction]]"
  - "[[hemi.smoothwm]]"
  - "[[hemi.white]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# hemi.orig

> [!file] Glossary entry
> `lh.orig` / `rh.orig` are the topology-corrected initial cortical surface meshes produced by [[mris_fix_topology]] (or [[mris_topo_fixer]] as fallback) in the Fix Topology stage of autorecon2. Unlike [[hemi.orig.nofix]], these surfaces are guaranteed to be closed, genus-0 manifolds (Euler number = 2). They serve as the topologically valid starting point for all subsequent surface placement and registration steps in the recon-all pipeline.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/surf/lh.orig`, `surf/rh.orig`
- **Format:** [[surface-format]] — FreeSurfer binary triangular surface; vertex positions in tkr-RAS coordinates.
- **Typical size / shape:** ~130,000–165,000 vertices per hemisphere; same vertex count as [[hemi.orig.nofix]] unless remeshing (`-remesh`) is active.
- **Byte-accurate specification:** See [[surface-format]].

## What It Contains

A topologically corrected triangular mesh of the gray-white boundary. Topology correction patches handles and holes in [[hemi.orig.nofix]] by detecting non-spherical topology in [[hemi.qsphere.nofix]] and replacing defective patches with topologically valid alternatives. After correction, the surface passes through [[mris_remove_intersection]] to eliminate any remaining self-intersections.

## How It Is Created

### Producing tool

[[mris_fix_topology]] — reads [[hemi.orig.nofix]], [[hemi.inflated.nofix]], and [[hemi.qsphere.nofix]] to identify and correct topological defects, writing the result as `hemi.orig`.

```bash
# Fix Topology invocation (recon-all line 3732)
mris_fix_topology -threads 1 -mgz \
  -sphere qsphere.nofix \
  -inflated inflated.nofix \
  -orig orig.nofix \
  -out orig \
  $subjid $hemi
```

After topology fixing, self-intersections are eliminated:

```bash
mris_remove_intersection ../surf/$hemi.orig ../surf/$hemi.orig
```

If the Euler number check fails, [[mris_topo_fixer]] is invoked as a fallback, also producing `hemi.orig`.

### Source reference

- **Write call:** [`mris_fix_topology/mris_fix_topology.cpp:312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_fix_topology/mris_fix_topology.cpp#L312) — `MRISwrite(mris_corrected, fname)`
- **Pipeline invocation:** [`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **Fix Topology** stage (`-fix`). Touch sentinel: `touch/$hemi.topofix.touch`.

### Inputs required

- [[hemi.orig.nofix]] — raw tessellated surface with possible topology defects.
- [[hemi.inflated.nofix]] — inflated version used by the topology fixer.
- [[hemi.qsphere.nofix]] — quasi-spherical mapping used to detect defects.

### Variants

When `-remesh` (or `-remesh-quality`) is used, topology fixing first produces `hemi.orig.premesh` (at the original vertex density) and then [[mris_remesh]] resamples it to `hemi.orig` at a target face area. In this case the vertex count of `hemi.orig` differs from `hemi.orig.nofix`.

## How It Is Used

### Direct downstream consumers

- [[mris_autodet_gwstats]] (AutoDetGWStats) — uses `hemi.orig` to compute gray-white boundary statistics (`autodet.gw.stats.$hemi.dat`).
- [[mris_place_surface]] (WhitePreAparc) — uses `hemi.orig` as the starting mesh for [[hemi.white.preaparc]] placement.
- [[mris_place_surface]] (White surface, autorecon3) — uses `hemi.orig` as the starting mesh for final [[hemi.white]] placement.

### Downstream files derived from this one

- [[autodet.gw.stats.hemi.dat]] — auto-detected gray-white statistics (indirect, via mris_autodet_gwstats).
- [[hemi.white.preaparc]] — preliminary white surface.
- [[hemi.white]] — final white surface.
- [[hemi.pial]] — pial surface (inherits mesh from white placement chain).

## Related

- [[surface-format]] — on-disk format.
- [[mris_fix_topology]] — primary producer.
- [[hemi.orig.nofix]] — defect-containing predecessor.
- [[hemi.qsphere.nofix]] — quasi-sphere used for defect detection.
- [[topology-correction]] — concept explaining topological defects and correction.
- [[hemi.white.preaparc]] — first downstream surface.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_fix_topology/mris_fix_topology.cpp:302–323`; `scripts/recon-all` lines 3710–3870.
- [[subject-directory]] — lists this file in the `surf/` section.
