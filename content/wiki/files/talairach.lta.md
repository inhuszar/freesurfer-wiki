---
title: "talairach.lta"
type: file
fs_version: "8.2.0"
filename: "talairach.lta"
aliases: []
location: "$SUBJECTS_DIR/<subj>/mri/transforms/"
anchor: subject
hemispheric: false
format: "[[lta-format]] (symlink)"
binary: false
produced_by:
  - "[[lta_convert]]"
produced_in_stage: "autorecon1: Talairach"
produced_at_source:
  - "[`scripts/recon-all:1885`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1885)"
inputs:
  - "[[talairach.xfm.lta]]"
siblings:
  - "[[talairach.xfm.lta]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for: []
editable: false
related:
  - "[[talairach.xfm.lta]]"
  - "[[talairach.xfm]]"
  - "[[lta-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# talairach.lta

> [!file] Glossary entry
> `talairach.lta` is a symbolic link to [[talairach.xfm.lta]]. It is created by `recon-all` immediately after converting `talairach.xfm` to LTA format, providing a clean alias without the `.xfm` suffix that some downstream tools expect. The underlying transform data is identical to [[talairach.xfm.lta]].

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.lta`
- **Format:** Symbolic link → `talairach.xfm.lta` ([[lta-format]]).

## How It Is Created

```bash
# recon-all line 1885
ln -sf talairach.xfm.lta talairach.lta
```

### Source reference

- **Pipeline invocation:** [`scripts/recon-all:1885`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1885)

## Related

- [[talairach.xfm.lta]] — the actual LTA file this symlinks to.
- [[talairach.xfm]] — the XFM source.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 1883–1890.
- [[subject-directory]] — lists this file in the `mri/transforms/` section.
