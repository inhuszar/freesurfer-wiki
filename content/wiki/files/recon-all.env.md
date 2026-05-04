---
title: "recon-all.env"
type: file
fs_version: "8.2.0"
filename: "recon-all.env"
aliases: []
location: "$SUBJECTS_DIR/<subj>/scripts/"
anchor: subject
hemispheric: false
format: "plain text (environment dump)"
binary: false
produced_by:
  - "[[wiki/pipelines/recon-all|recon-all]]"
produced_in_stage: "startup"
produced_at_source:
  - "[`scripts/recon-all:591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L591)"
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
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps: []
tags:
  - file
---

# recon-all.env

> [!file] Glossary entry
> `recon-all.env` is an environment snapshot written at the start of each [[wiki/pipelines/recon-all|recon-all]] run. It captures the `FREESURFER_HOME` paths, `SUBJECTS_DIR`, the full command-line invocation, system information (`uname -a`), OS release, resource limits, and the complete shell environment (`printenv`). It is overwritten (backed up as `recon-all.env.bak`) at the start of each new run.

## Location and Format

- **Canonical path:** `$SUBJECTS_DIR/<subj>/scripts/recon-all.env`
- **Format:** Plain text — human-readable dump of environment variables and system info.

## How It Is Created

```bash
# Environment snapshot (recon-all lines 591–605)
set ENVF = $subjdir/scripts/recon-all.env
if(-e $ENVF) mv -f $ENVF $ENVF.bak
date                                     >> $ENVF
echo "FREESURFER_HOME $FREESURFER_HOME"  >> $ENVF
echo $inputargs                          >> $ENVF
uname -a                                 >> $ENVF
if(-e /etc/os-release) cat /etc/os-release >> $ENVF
limit                                    >> $ENVF
printenv                                 >> $ENVF
```

### Source reference

- **File creation:** [`scripts/recon-all:591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L591)

### Pipeline stage

Written at startup, before any processing begins.

## Related

- [[recon-all.log]] — processing log.
- [[recon-all.cmd]] — command log.
- [[wiki/pipelines/recon-all|recon-all]] — pipeline context.

## References

- Source: `scripts/recon-all` lines 591–605.
- [[subject-directory]] — lists this file in the `scripts/` section.
