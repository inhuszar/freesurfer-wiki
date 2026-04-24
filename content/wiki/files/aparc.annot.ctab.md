---
title: "aparc.annot.ctab"
type: file
fs_version: "8.2.0"
filename: "aparc.annot.ctab"
aliases: []
location: "$SUBJECTS_DIR/<subj>/label/"
anchor: subject
hemispheric: false
format: "plain text (FreeSurfer color table)"
binary: false
produced_by:
  - "[[mris_anatomical_stats]]"
produced_in_stage: "autorecon3: Parcellation Stats"
produced_at_source:
  - "[`mris_anatomical_stats/mris_anatomical_stats.cpp:347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L347)"
  - "[`scripts/recon-all:5190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5190)"
inputs:
  - "[[hemi.aparc.annot]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "[[recon-all]] autorecon3: Parcellation Stats"
editable: false
related:
  - "[[hemi.aparc.annot]]"
  - "[[hemi.aparc.stats]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# aparc.annot.ctab

> [!file] Glossary entry
> `aparc.annot.ctab` is a plain-text color table extracted from the [[hemi.aparc.annot]] Desikan-Killiany annotation by `mris_anatomical_stats` during the ParcStats stage. It lists each parcellation region with its label ID and RGBA color, providing a subject-local copy of the annotation's color table for use with analysis tools.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/label/aparc.annot.ctab`
- **Format:** FreeSurfer ASCII color table — one region per line: `ID Name R G B A`.

## How It Is Created

### Producing tool

`mris_anatomical_stats` with the `-c $ctab` flag — extracts and writes the color table embedded in the annotation file.

```bash
# ParcStats invocation (recon-all lines 5190–5194)
mris_anatomical_stats -th3 -mgz \
  -f ../stats/$hemi.aparc.stats \
  -b -a ../label/$hemi.aparc.annot \
  -c ../label/aparc.annot.ctab \
  $subjid $hemi white
```

### Source reference

- **Write call:** [`mris_anatomical_stats/mris_anatomical_stats.cpp:347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L347) — `CTABwriteFileASCII(mris->ct, annotctabfile)`
- **Pipeline invocation:** [`scripts/recon-all:5190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5190)

### Pipeline stage

[[recon-all]] autorecon3, **Parcellation Stats** stage. Written once (on the first `mris_anatomical_stats` call for the white surface).

### Inputs required

- [[hemi.aparc.annot]] — annotation whose embedded color table is extracted.

## Related

- [[hemi.aparc.annot]] — annotation containing the source color table.
- [[hemi.aparc.stats]] — co-produced stats file.
- [[aparc.annot.a2009s.ctab]] — Destrieux atlas color table.
- [[aparc.annot.DKTatlas.ctab]] — DKT atlas color table.
- [[recon-all]] — pipeline context.

## References

- Source: `mris_anatomical_stats/mris_anatomical_stats.cpp:344–348`; `scripts/recon-all` lines 5184–5205.
- [[subject-directory]] — lists this file in the `label/` section.
