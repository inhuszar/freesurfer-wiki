---
title: "talairach.xfm.lta"
type: file
fs_version: "8.2.0"
filename: "talairach.xfm.lta"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/transforms/"
anchor: subject
hemispheric: false
format: "[[lta-format]]"
binary: false
produced_by:
  - "[[lta_convert]]"
produced_in_stage: "autorecon1: Talairach (LTA conversion)"
produced_at_source:
  - "[`scripts/recon-all:1865`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1865)"
inputs:
  - "[[talairach.xfm]]"
  - "[[orig.mgz]]"
siblings:
  - "[[talairach.lta]]"
consumed_by:
  - "[[mri_em_register]]"
  - "[[mri_ca_normalize]]"
downstream_files:
  - "[[talairach.lta]]"
mandatory_for:
  - "[[wiki/pipelines/recon-all|recon-all]] autorecon1 and autorecon2: GCA-based stages"
optional_for: []
editable: false
related:
  - "[[talairach.xfm]]"
  - "[[talairach.lta]]"
  - "[[lta-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# talairach.xfm.lta

> [!file] Glossary entry
> `talairach.xfm.lta` is the LTA (Linear Transform Array) version of [[talairach.xfm]], produced by `lta_convert` immediately after the Talairach stage. It encodes the same affine registration to MNI305 space but in FreeSurfer's native LTA format, which carries source and target volume metadata. [[talairach.lta]] is a symlink to this file.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.xfm.lta`
- **Format:** [[lta-format]] — plain-text LTA with `type=0` (vox-to-vox) header, source volume info, target volume info, and the affine matrix.

## How It Is Created

```bash
# recon-all line 1865
lta_convert \
  --src orig.mgz \
  --trg $FREESURFER_HOME/average/mni305.cor.mgz \
  --inxfm transforms/talairach.xfm \
  --outlta transforms/talairach.xfm.lta \
  --subject fsaverage \
  --ltavox2vox
```

After creation, a symlink is made: `ln -sf talairach.xfm.lta talairach.lta`.

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1865`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1865)

### Pipeline stage

[[wiki/pipelines/recon-all|recon-all]] autorecon1, **Talairach** stage, immediately after `talairach.xfm` is finalised.

### Inputs required

- [[talairach.xfm]] — source XFM.
- [[orig.mgz]] — source volume metadata.

### Siblings (co-produced outputs)

- [[talairach.lta]] — symlink to this file.

## Related

- [[talairach.xfm]] — source transform.
- [[talairach.lta]] — symlink alias.
- [[lta-format]] — on-disk format.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1857–1890.
- [[subject-directory]] — lists this file in the `mri/transforms/` section.
