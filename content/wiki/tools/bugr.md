---
title: "bugr"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/bugr"
families: []                     # bug-report helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[freesurfer]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - bug-report
  - support
  - environment
  - diagnostics
---

# bugr

## Summary

`bugr` (bug report) is a small diagnostic helper that prints a copy-and-paste
block of environment information to include in a FreeSurfer problem report or
mailing-list question. It reports `FREESURFER_HOME`, the installed build stamp,
the Linux distribution (RedHat/Rocky or Debian) and kernel version, and — when
run inside the MGH/Martinos network — the host name, `SUBJECTS_DIR`, working
directory, and the exact `ssh`/`setenv`/`cd` lines a developer would need to
reproduce the session. It then lists the additional details (subject name,
command line, error message, optional `recon-all.log`) the user should attach.
It takes no arguments and changes nothing.

## Source Information

- **Language:** tcsh shell script (shebang `#!/bin/tcsh -f`)
- **Source file:** [`scripts/bugr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr)
- **Binary/script location:** `$FREESURFER_HOME/bin/bugr`
- **Original author:** Nick Schmansky
- **Version string:** `bugr @FS_VERSION@` — the `@FS_VERSION@` token is
  substituted at build time by CMake (see [`CMakeLists.txt:270`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/CMakeLists.txt#L270) and
  [`cmake/functions.cmake:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/cmake/functions.cmake#L87)). The variable is set but, in
  this script, never printed.

## Purpose and Context

When a user emails the FreeSurfer support list, the maintainers need to know the
exact version and platform before they can help. `bugr` standardises that: the
user runs it, copies the delimited block into their email, and the responders get
a consistent, complete environment snapshot. It complements [[freesurfer]] (which
prints the same build stamp in a friendlier banner) by adding OS, kernel, and —
inside the Martinos Center — session-reproduction commands. It is a **support
utility**, not part of any processing pipeline, and is never called by
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

None. The script reads no command-line arguments.

### Input Assumptions

> [!assumption] FreeSurfer sourced; Linux host
> `bugr` reads `$FREESURFER_HOME`, `$SUBJECTS_DIR`, `$PWD`, and probes
> Linux-specific files (`/etc/redhat-release`, `/etc/debian_version`, `uname`). On
> a non-Linux host or with FreeSurfer unsourced the missing pieces are simply
> skipped or printed empty; the script never errors.

## Outputs

### Files Created

None. All output goes to stdout, formatted as a delimited block to paste into a
report.

### Output Specifications

A plain-text block bounded by dashed separator lines. The contents are conditional
([`scripts/bugr:33-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr#L33-L80)):

| Line | Shown when | Source |
|------|-----------|--------|
| `FREESURFER_HOME:` | always | `$FREESURFER_HOME` |
| `Build stamp:` | `build-stamp.txt` exists | `cat $FREESURFER_HOME/build-stamp.txt` |
| *old-version warning* | `build-stamp.txt` missing | static message |
| `RedHat release:` | `/etc/redhat-release` exists | that file |
| `Debian version:` | `/etc/debian_version` exists | that file |
| `Kernel info:` | always | `uname -rms` |
| NMR Center block (machine, `SUBJECTS_DIR`, `PWD`, `ssh`/`setenv`/`cd`) | `/space/freesurfer` exists | `uname -n`, env, `$PWD` |

## Mathematical Foundations

None — `bugr` only inspects environment variables and a few system files and
echoes them; it performs no computation.

## Configuration Options

### Complete Flag Reference

The script parses **no** options; any arguments are ignored and the same report
is always printed.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(none)* | — | — | No command-line options are parsed. |

### Configuration Interactions

None — there are no options. Output content varies only with which system files
and environment variables are present (see Output Specifications).

## Typical Use Cases

### Use Case 1: Gather environment info for a support email

```bash
bugr
# copy everything between the dashed lines into your problem report
```

### Use Case 2: Capture the report to a file to attach

```bash
bugr > my_fs_environment.txt
```

## Pipeline Context

Standalone support/diagnostic command; not part of the recon-all stream and not
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** *(none)* → **bugr** → **Successor:** *(none)*

## Gotchas and Caveats

> [!gotcha] The NMR Center block only appears at the Martinos Center
> The host name, `SUBJECTS_DIR`, working-directory, and `ssh`/`setenv`/`cd`
> reproduction lines are printed **only** when `/space/freesurfer` exists
> ([`scripts/bugr:63-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr#L63-L80)), i.e. on the MGH/Martinos internal network.
> Off-site users get just the version/OS/kernel lines — which is the intended,
> non-identifying subset.

> [!gotcha] `bugr` reports the environment, not the error
> It does not capture your command, output, or log. The trailing checklist
> ([`scripts/bugr:82-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr#L82-L91)) reminds you to also include the subject name, the
> full command line, the error message, and optionally `recon-all.log` — `bugr`
> itself adds none of those.

## Error Compensation and Guard Rails

Each system-dependent line is guarded by an existence test (`-e`), so missing
files never cause an error — they are simply omitted (e.g. a missing
`build-stamp.txt` prints a "very old version of FreeSurfer" notice instead,
[`scripts/bugr:38-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr#L38-L44)).

## Related Tools

- [[freesurfer]] — the sibling banner script that prints the same build stamp with documentation pointers, but no OS/kernel/session detail.
- [[wiki/pipelines/recon-all|recon-all]] — the pipeline whose `recon-all.log` the `bugr` checklist asks users to attach.

## Confidence and Gaps

**High confidence:** the script is 92 lines of conditional `echo`/`cat` with no
argument parsing; all branches were read directly from
[`scripts/bugr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr).

## References

- FreeSurfer source: [`scripts/bugr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bugr) (v8.2.0).
- Bug-reporting guidance: http://surfer.nmr.mgh.harvard.edu/fswiki/BugReporting
