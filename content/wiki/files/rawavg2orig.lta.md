---
title: "rawavg2orig.lta"
type: file
fs_version: "8.2.0"
filename: "rawavg2orig.lta"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/"
anchor: subject
hemispheric: false
format: "[[lta-format]]"
binary: false
produced_by:
  - "[[lta_convert]]"
produced_in_stage: "autorecon1: Motion Correction"
produced_at_source:
  - "[`scripts/recon-all:1601`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1601)"
inputs:
  - "[[rawavg.mgz]]"
  - "[[orig.mgz]]"
siblings: []
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for:
  - "mapping native resolution space back to conformed space"
editable: false
related:
  - "[[rawavg.mgz]]"
  - "[[orig.mgz]]"
  - "[[lta-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# rawavg2orig.lta

> [!file] Glossary entry
> `rawavg2orig.lta` is an identity-seeded LTA produced by `lta_convert` that maps from [[rawavg.mgz]] (native resolution, pre-conforming) to [[orig.mgz]] (conformed 256³ 1mm). The transform captures the conforming resampling applied by `mri_convert --conform`, enabling tools to relate native-resolution data back to the conformed space used throughout recon-all.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/rawavg2orig.lta`
- **Format:** [[lta-format]] — plain-text LTA; despite being derived from the identity transform, it carries the source (`rawavg.mgz`) and target (`orig.mgz`) volume metadata so tools can apply it correctly.

## How It Is Created

```bash
# recon-all line 1601
lta_convert \
  --inlta identity.nofile \
  --src rawavg.mgz \
  --trg orig.mgz \
  --outlta rawavg2orig.lta \
  --subject $subjid
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1601`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1601)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, immediately after motion correction.

### Inputs required

- [[rawavg.mgz]] — source (native resolution).
- [[orig.mgz]] — target (conformed space).

## Related

- [[rawavg.mgz]] — native space source.
- [[orig.mgz]] — conformed target.
- [[lta-format]] — on-disk format.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1594–1612.
- [[subject-directory]] — lists this file in the `mri/` section.
