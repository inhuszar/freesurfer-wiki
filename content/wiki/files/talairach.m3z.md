---
title: "talairach.m3z"
type: file
fs_version: "8.2.0"
filename: "talairach.m3z"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/transforms/"
anchor: subject
hemispheric: false
format: "[[m3z-format]]"
binary: true
produced_by:
  - "[[mri_ca_register]]"
produced_in_stage: "autorecon2: CA Register (non-linear GCA registration)"
produced_at_source:
  - "[`mri_ca_register/mri_ca_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_register/mri_ca_register.cpp)"
inputs:
  - "[[norm.mgz]]"
  - "[[talairach.lta]]"
siblings: []
consumed_by:
  - "[[mri_ca_label]]"
  - "[[mri_ca_normalize]]"
downstream_files:
  - "[[aseg.auto_noCCseg.mgz]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon2: subcortical labelling (mri_ca_label)"
optional_for: []
editable: false
related:
  - "[[m3z-format]]"
  - "[[internal-gcamorph]]"
  - "[[gca-format]]"
  - "[[registration-overview]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-06-11
gaps: []
tags:
  - file
  - registration
  - nonlinear
  - atlas
---

# talairach.m3z

> [!file] Glossary entry
> `talairach.m3z` is the **non-linear** warp that registers a subject's
> intensity-normalised brain to the GCA atlas. It is written by
> [[mri_ca_register]] during `recon-all` autorecon2 and is the spatial prior
> that lets [[mri_ca_label]] assign subcortical [[aseg.mgz|aseg]] labels. It is
> a gzip-compressed [[m3z-format|`.m3z`]] dense displacement field, not a
> linear matrix.

## What it is

Despite the name, `talairach.m3z` is **not** the linear Talairach transform
(that is [[talairach.lta|`talairach.lta`]] / `talairach.xfm`). It is the dense,
non-linear `GCA_MORPH` warp field produced by atlas registration — the
non-linear successor to the affine alignment, initialised from it. The
underlying data structure and algorithm are documented in
[[internal-gcamorph]]; the on-disk byte layout is [[m3z-format]].

## Position in the pipeline

```
norm.mgz + talairach.lta + RB_all_*.gca
        │  mri_ca_register
        ▼
transforms/talairach.m3z          ← non-linear subject↔atlas warp
        │  mri_ca_label (+ norm.mgz, GCA)
        ▼
aseg.auto_noCCseg.mgz → aseg.mgz  ← subcortical segmentation
```

`mri_ca_normalize` also reads the warp when refining intensity normalisation
against the atlas. Because the whole subcortical segmentation depends on it, a
bad or missing `talairach.m3z` propagates into [[aseg.mgz]] and every measure
derived from it.

> [!gotcha] Linear vs non-linear "talairach" files
> `transforms/` holds several confusingly-named files: `talairach.auto.xfm` /
> `talairach.xfm` (linear MNI305 affine), `talairach.lta` (the same as an LTA),
> and `talairach.m3z` (this file, the non-linear GCA warp). They are produced
> by different stages and are **not** interchangeable. See
> [[registration-overview]].

## Related

- [[m3z-format]] — the on-disk format.
- [[internal-gcamorph]] — the warp algorithm and `GCA_MORPH` structure.
- [[talairach.lta]] — the linear affine that initialises this warp.
- [[mri_ca_register]] — producer; [[mri_ca_label]] — primary consumer.
