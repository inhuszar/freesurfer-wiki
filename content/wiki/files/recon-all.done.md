---
title: "recon-all.done"
type: file
fs_version: "8.2.0"
filename: "recon-all.done"
aliases: []
location: "$SUBJECTS_DIR/<subj>/scripts/"
anchor: subject
hemispheric: false
format: "plain text (sentinel)"
binary: false
produced_by:
  - "[[recon-all]]"
produced_in_stage: "all stages (written on success)"
produced_at_source:
  - "[`scripts/recon-all:5946`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5946)"
inputs: []
siblings:
  - "[[recon-all.log]]"
consumed_by: []
downstream_files: []
mandatory_for: []
optional_for: []
editable: false
related:
  - "[[recon-all.log]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# recon-all.done

> [!file] Glossary entry
> `recon-all.done` is a sentinel file written by [[recon-all]] on successful completion. It contains the subject ID, start time, end time, and total runtime. The file's existence (in the absence of `recon-all.error`) signals that the run completed without error. The `-skipDone` flag causes recon-all to exit immediately if this file exists, enabling idempotent pipeline runs.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/scripts/recon-all.done`
- **Format:** Plain text — key-value pairs: `SUBJECT`, `START_TIME`, `END_TIME`, `RUNTIME_HOURS`.

## How It Is Created

```bash
# Done file creation (recon-all lines 5946–5950)
echo "------------------------------" > $DoneFile
echo "SUBJECT $subjid"       >> $DoneFile
echo "START_TIME $StartTime" >> $DoneFile
echo "END_TIME $EndTime"     >> $DoneFile
echo "RUNTIME_HOURS $tRunHours" >> $DoneFile
```

Written only on successful completion. It is deleted at the start of each run (`rm -f $DoneFile`, line 799).

### Source reference

- **Write call:** [`scripts/recon-all:5946`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L5946)

### Pipeline stage

Written at the very end of a successful recon-all run.

## Related

- [[recon-all.log]] — full processing log.
- [[recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 5945–5954.
- [[subject-directory]] — lists this file in the `scripts/` section.
