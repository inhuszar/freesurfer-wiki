---
title: "aparc.annot.DKTatlas.ctab"
type: file
fs_version: "8.2.0"
filename: "aparc.annot.DKTatlas.ctab"
aliases: []
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: false
format: "plain text (FreeSurfer color table)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: Parcellation Stats 3 (DKT)"
produced_at_source:
  - "[`mris_anatomical_stats/mris_anatomical_stats.cpp:347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L347)"
  - "[`scripts/recon-all:5268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5268)"
inputs:
  - "[[hemi.aparc.DKTatlas.annot]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon3: Parcellation Stats 3"
editable: false
related:
  - "[[hemi.aparc.DKTatlas.annot]]"
  - "[[hemi.aparc.DKTatlas.stats]]"
  - "[[aparc.annot.ctab]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aparc.annot.DKTatlas.ctab

> [!file] Glossary entry
> `aparc.annot.DKTatlas.ctab` is the color table extracted from the [[hemi.aparc.DKTatlas.annot]] DKT atlas annotation by `mris_anatomical_stats` during the ParcStats3 stage. It corresponds to the DKT 31-region atlas used in the Mindboggle dataset.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/aparc.annot.DKTatlas.ctab`
- **Format:** FreeSurfer ASCII color table — `ID Name R G B A` per line.

## How It Is Created

### Producing tool

`mris_anatomical_stats` with `-c ../label/aparc.annot.DKTatlas.ctab` — extracts the color table from [[hemi.aparc.DKTatlas.annot]].

```bash
# ParcStats3 invocation (recon-all line 5268)
mris_anatomical_stats -th3 -mgz \
  -f ../stats/$hemi.aparc.DKTatlas.stats \
  -b -a ../label/$hemi.aparc.DKTatlas.annot \
  -c ../label/aparc.annot.DKTatlas.ctab \
  $subjid $hemi white
```

### Source reference

- **Write call:** [`mris_anatomical_stats/mris_anatomical_stats.cpp:347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L347) — `CTABwriteFileASCII(mris->ct, annotctabfile)`
- **Pipeline invocation:** [`scripts/recon-all:5268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5268)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon3, **Parcellation Stats 3** (DKT) stage.

## Related

- [[hemi.aparc.DKTatlas.annot]] — source annotation.
- [[hemi.aparc.DKTatlas.stats]] — co-produced stats.
- [[aparc.annot.ctab]] — Desikan-Killiany color table.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mris_anatomical_stats/mris_anatomical_stats.cpp:344–348`; `scripts/recon-all` lines 5256–5278.
- [[subject-directory]] — lists this file in the `label/` section.
