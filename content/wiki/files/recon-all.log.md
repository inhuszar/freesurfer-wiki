---
title: "recon-all.log"
type: file
fs_version: "8.2.0"
filename: "recon-all.log"
aliases: []
location: "$SUBJECTS_DIR/<subj>/scripts/"
anchor: subject
hemispheric: false
format: "plain text (log)"
binary: false
produced_by:
  - "[[recon-all]]"
produced_in_stage: "all stages"
produced_at_source:
  - "[`scripts/recon-all:620`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L620)"
inputs: []
siblings:
  - "[[recon-all.cmd]]"
  - "[[recon-all.env]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for: []
editable: false
related:
  - "[[recon-all.cmd]]"
  - "[[recon-all.done]]"
  - "[[recon-all.env]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# recon-all.log

> [!file] Glossary entry
> `recon-all.log` is the primary log file for a [[recon-all]] run, capturing all standard output and error from every tool invoked during processing. It is appended to throughout the entire pipeline. Timestamps and stage markers (e.g. `#@# CurvStats lh 2024-...`) are embedded in the log to allow stage-level post-hoc timing and debugging.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/scripts/recon-all.log`
- **Format:** Plain text — chronological log output, interleaved from all stages.

## How It Is Created

The log file is opened at the start of each `recon-all` invocation and all commands redirect their output to it:

```bash
# Log file setup (recon-all line 620)
set LF = $subjdir/scripts/recon-all.log
```

All tool output is piped through `|& tee -a $LF` throughout the pipeline. If `recon-all` is run again on the same subject (e.g., resuming), output is appended.

### Source reference

- **File setup:** [`scripts/recon-all:620`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L620)

### Pipeline stage

Created at startup; appended continuously throughout all autorecon stages.

## Related

- [[recon-all.cmd]] — command log (just the commands, without output).
- [[recon-all.env]] — environment snapshot at start of run.
- [[recon-all.done]] — sentinel file written on success.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 619–621.
- [[subject-directory]] — lists this file in the `scripts/` section.
