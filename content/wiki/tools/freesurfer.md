---
title: "freesurfer"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/freesurfer"
families: []                     # informational banner script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[bugr]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - banner
  - version
  - info
  - environment
---

# freesurfer

## Summary

`freesurfer` is a trivial informational banner script. Run with no arguments (it
takes none), it prints a short description of the FreeSurfer suite, points the
user to the online documentation and the `recon-all --help` text, gives the
support email address, and reports the installed FreeSurfer build by `cat`-ing
`$FREESURFER_HOME/build-stamp.txt`. It performs no processing and modifies
nothing.

## Source Information

- **Language:** bash shell script (shebang `#!/usr/bin/env bash`)
- **Source file:** [`scripts/freesurfer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/freesurfer)
- **Binary/script location:** `$FREESURFER_HOME/bin/freesurfer`

## Purpose and Context

The command exists so that a user who types the suite's name at the shell gets a
friendly orientation message rather than "command not found", and a quick way to
read off which version is installed. It is the lowest-tier "where am I / what is
this / what version" helper, complementary to [[bugr]] (which gathers the same
build stamp plus OS/environment detail for a problem report). It is **not** part
of any processing pipeline and is never called by
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

None. The script reads no command-line arguments.

### Input Assumptions

> [!assumption] FreeSurfer must be sourced
> The script reads `$FREESURFER_HOME/build-stamp.txt` directly
> ([`scripts/freesurfer:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/freesurfer#L23)). If `FREESURFER_HOME` is unset or the
> file is missing, the version line prints an empty or error value; the rest of
> the banner still prints.

## Outputs

### Files Created

None. All output goes to stdout.

### Output Specifications

A multi-line text banner ending with the contents of `build-stamp.txt`, e.g.
`freesurfer-linux-centos7_x86_64-8.2.0-20260314-d932c45`.

## Mathematical Foundations

None — this is a static `echo` banner with a single embedded `cat` of the build
stamp; it performs no computation.

## Configuration Options

### Complete Flag Reference

The script has **no** options or flags; it ignores anything passed to it and
always prints the same banner.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(none)* | — | — | No command-line options are parsed. |

### Configuration Interactions

None — there are no options to interact.

## Typical Use Cases

### Use Case 1: Read the orientation banner and installed version

```bash
freesurfer
```

Prints the suite description, documentation pointers, support email, and the
installed build stamp.

## Pipeline Context

Standalone informational command; not part of the recon-all stream and not called
by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** *(none)* → **freesurfer** → **Successor:** *(none)*

## Gotchas and Caveats

> [!gotcha] "freesurfer" the command vs. the suite vs. the stream
> The banner itself notes the name is overloaded: `freesurfer` is the name of the
> whole software suite, of the structural-imaging stream within it, and of this
> tiny banner command. Typing `freesurfer` runs only the banner — to actually
> process data you want [[wiki/pipelines/recon-all|recon-all]].

## Error Compensation and Guard Rails

None. The script does no validation; a missing `build-stamp.txt` simply yields an
empty/`cat`-error version line.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the actual structural-processing pipeline the banner directs users toward.
- [[bugr]] — the sibling info script that prints the same build stamp plus OS, kernel, and environment details for bug reports.

## Confidence and Gaps

**High confidence:** the entire script is 24 lines of static `echo` plus one
`cat` of `build-stamp.txt`; behaviour is fully determined and read directly from
[`scripts/freesurfer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/freesurfer).

## References

- FreeSurfer source: [`scripts/freesurfer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/freesurfer) (v8.2.0).
- FreeSurfer documentation: http://surfer.nmr.mgh.harvard.edu
