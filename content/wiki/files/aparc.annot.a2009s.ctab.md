---
title: "aparc.annot.a2009s.ctab"
type: file
fs_version: "8.2.0"
filename: "aparc.annot.a2009s.ctab"
aliases: []
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: false
format: "plain text (FreeSurfer color table)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: Parcellation Stats 2 (Destrieux)"
produced_at_source:
  - "[`mris_anatomical_stats/mris_anatomical_stats.cpp:347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L347)"
  - "[`scripts/recon-all:5230`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5230)"
inputs:
  - "[[hemi.aparc.a2009s.annot]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: Parcellation Stats 2"
editable: false
related:
  - "[[hemi.aparc.a2009s.annot]]"
  - "[[hemi.aparc.a2009s.stats]]"
  - "[[aparc.annot.ctab]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aparc.annot.a2009s.ctab

> [!file] Glossary entry
> `aparc.annot.a2009s.ctab` is the color table extracted from the [[hemi.aparc.a2009s.annot]] Destrieux 2009 annotation by `mris_anatomical_stats` during the ParcStats2 stage. It corresponds to the Destrieux 148-region atlas.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/aparc.annot.a2009s.ctab`
- **Format:** FreeSurfer ASCII color table — `ID Name R G B A` per line.

## How It Is Created

### Producing tool

`mris_anatomical_stats` with `-c ../label/aparc.annot.a2009s.ctab` — writes the color table embedded in [[hemi.aparc.a2009s.annot]].

```bash
# ParcStats2 invocation (recon-all line 5230)
mris_anatomical_stats -th3 -mgz \
  -f ../stats/$hemi.aparc.a2009s.stats \
  -b -a ../label/$hemi.aparc.a2009s.annot \
  -c ../label/aparc.annot.a2009s.ctab \
  $subjid $hemi white
```

### Source reference

- **Write call:** [`mris_anatomical_stats/mris_anatomical_stats.cpp:347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L347) — `CTABwriteFileASCII(mris->ct, annotctabfile)`
- **Pipeline invocation:** [`scripts/recon-all:5230`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5230)

### Pipeline stage

[[recon-all]] autorecon3, **Parcellation Stats 2** (Destrieux) stage.

## Related

- [[hemi.aparc.a2009s.annot]] — source annotation.
- [[hemi.aparc.a2009s.stats]] — co-produced stats.
- [[aparc.annot.ctab]] — Desikan-Killiany color table.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_anatomical_stats/mris_anatomical_stats.cpp:344–348`; `scripts/recon-all` lines 5218–5241.
- [[subject-directory]] — lists this file in the `label/` section.
