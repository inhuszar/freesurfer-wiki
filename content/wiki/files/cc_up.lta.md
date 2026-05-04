---
title: "cc_up.lta"
type: file
fs_version: "8.2.0"
filename: "cc_up.lta"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/transforms/"
anchor: subject
hemispheric: false
format: "[[lta-format]]"
binary: false
produced_by:
  - "[[mri_cc]]"
produced_in_stage: "autorecon2: CC Segmentation"
produced_at_source:
  - "[`mri_cc/mri_cc.cpp:2127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cc/mri_cc.cpp#L2127)"
  - "[`scripts/seg2cc:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L96)"
inputs:
  - "[[aseg.auto_noCCseg.mgz]]"
  - "[[norm.mgz]]"
siblings:
  - "[[aseg.auto.mgz]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "QA tools (fornix segmentation evaluation)"
editable: false
related:
  - "[[mri_cc]]"
  - "[[aseg.auto.mgz]]"
  - "[[lta-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# cc_up.lta

> [!file] Glossary entry
> `cc_up.lta` is an LTA transform produced by [[mri_cc]] alongside [[aseg.auto.mgz]] during the corpus callosum segmentation stage. It encodes a rigid alignment (translation only) that places the best-fitting CC slice at MNI Y=128, effectively "uprighting" the subject's orientation with respect to the CC mid-sagittal plane. It is primarily used by QA tools (fornix segmentation evaluation) and is not consumed by any standard recon-all downstream stage.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/transforms/cc_up.lta`
- **Format:** [[lta-format]] — plain-text LTA encoding a rigid transform.

## What It Contains

A rigid alignment (mainly a Y-translation) that maps from the subject's native conformed space to a CC-centred orientation where the best CC slice is at MNI column 128. Used by QA scripts to standardise the viewing frame.

## How It Is Created

### Producing tool

[[mri_cc]] with the `-lta` flag — writes the transform alongside the corpus callosum segmentation.

```bash
# seg2cc invocation (scripts/seg2cc line 96)
mri_cc \
  -aseg aseg.auto_noCCseg.mgz \
  -o aseg.auto.mgz \
  -lta transforms/cc_up.lta \
  $subjid
```

### Source reference

- **Write call:** [`mri_cc/mri_cc.cpp:2127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cc/mri_cc.cpp#L2127) — `LTAwrite(lta2, lta_fname)`
- **Pipeline invocation:** [`scripts/seg2cc:96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/seg2cc#L96)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon2, **CC Segmentation** stage (`-calabel`). Co-produced with [[aseg.auto.mgz]].

### Inputs required

- [[aseg.auto_noCCseg.mgz]], [[norm.mgz]] — read by [[mri_cc]] for CC slice finding.

### Siblings (co-produced outputs)

- [[aseg.auto.mgz]] — CC-labelled segmentation produced in the same call.

## Related

- [[mri_cc]] — producer.
- [[aseg.auto.mgz]] — co-produced CC segmentation.
- [[lta-format]] — transform format.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `mri_cc/mri_cc.cpp:2127`; `scripts/seg2cc` line 96.
- [[subject-directory]] — lists this file in the `mri/transforms/` section.
