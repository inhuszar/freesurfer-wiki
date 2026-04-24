---
title: "recon-all.cmd"
type: file
fs_version: "8.2.0"
filename: "recon-all.cmd"
aliases: []
location: "$SUBJECTS_DIR/<subj>/scripts/"
anchor: subject
hemispheric: false
format: "plain text (command log)"
binary: false
produced_by:
  - "[[recon-all]]"
produced_in_stage: "all stages"
produced_at_source:
  - "[`scripts/recon-all:586`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L586)"
inputs: []
siblings:
  - "[[recon-all.log]]"
  - "[[recon-all.env]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for: []
editable: false
related:
  - "[[recon-all.log]]"
  - "[[recon-all.done]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# recon-all.cmd

> [!file] Glossary entry
> `recon-all.cmd` is a command log that records every shell command executed by [[recon-all]], without the command output. It is a subset of [[recon-all.log]] containing only the tool invocations, useful for reconstructing the exact sequence of operations and re-running individual stages.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/scripts/recon-all.cmd`
- **Format:** Plain text — one command per block, separated by stage markers.

## How It Is Created

```bash
# Command log setup (recon-all line 586)
set CF = $subjdir/scripts/recon-all.cmd
```

Commands are written with `|& tee -a $CF` or `echo $cmd > $CF` throughout the pipeline.

### Source reference

- **File setup:** [`scripts/recon-all:586`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L586)

### Pipeline stage

Created at startup; appended continuously throughout all autorecon stages.

## Related

- [[recon-all.log]] — full log including command output.
- [[recon-all.env]] — environment snapshot.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 585–587.
- [[subject-directory]] — lists this file in the `scripts/` section.
