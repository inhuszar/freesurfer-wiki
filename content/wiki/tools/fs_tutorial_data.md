---
title: "fs_tutorial_data"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # bash
source_files:
  - "scripts/fs_tutorial_data"
families: []                       # standalone data-download helper
recon_all_stage: null
related:
  - "[[fs_install_mcr]]"
  - "[[fs_install_cuda]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - install
  - tutorial
  - data
  - download
  - rsync
---

# fs_tutorial_data

## Summary

`fs_tutorial_data` downloads the FreeSurfer **tutorial datasets** onto the local
machine via `rsync` from the Martinos Center public data server. It downloads
into the directory named by the `TUTORIAL_DATA` environment variable, or, if that
is unset, into `$FREESURFER_HOME/subjects/tutorial_data`. Any extra command-line
arguments are passed straight through to `rsync` as additional options. It is a
small **interactive download helper** used to set up the hands-on tutorials, not
a data-processing tool.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/fs_tutorial_data`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_tutorial_data`
- **External tool used:** `rsync` (over the `rsync://` protocol).

## Purpose and Context

The FreeSurfer documentation includes a set of hands-on tutorials (group
analysis, longitudinal processing, troubleshooting, diffusion, FSFAST, etc.) that
operate on a curated collection of pre-processed example subjects. That data is
hosted on the Martinos Center server rather than shipped with the binaries
because it is large (about **5 GB** at the time the script was written, and only a
subset of the full tutorial corpus — see the header comment at
[`scripts/fs_tutorial_data:3-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L3-L16)).

`fs_tutorial_data` is a thin convenience wrapper that fixes the source URL and
sensible default destination so users do not have to remember the rsync
incantation. It is run **once, by hand**, when setting up the tutorials. It is
**not** part of [[wiki/pipelines/recon-all|recon-all]] or any automated pipeline,
and it has no callers elsewhere in the distribution.

## Inputs

### Required Inputs

`fs_tutorial_data` requires **no positional arguments**. Its behaviour is steered
by one environment variable and optional pass-through `rsync` flags:

- **`TUTORIAL_DATA`** *(optional)* — destination directory. If unset, defaults to
  `$FREESURFER_HOME/subjects/tutorial_data` ([`scripts/fs_tutorial_data:54-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L54-L56)).
  The directory is created with `mkdir -p` if it does not exist
  ([`scripts/fs_tutorial_data:57-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L57-L59)).
- **Network access** to `rsync://surfer.nmr.mgh.harvard.edu`.

### Input Assumptions

> [!assumption] Outbound rsync to the Martinos public server
> The source is hard-coded to
> `rsync://surfer.nmr.mgh.harvard.edu/pub/data/tutorial_data/`
> ([`scripts/fs_tutorial_data:69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L69)). The machine must be able to reach that
> host on the rsync port and have enough free space (~5 GB+) at the destination.
> No authentication is used (anonymous public rsync module).

## Outputs

### Files Created

| Output | Where | Notes |
|--------|-------|-------|
| Tutorial subject tree | `$TUTORIAL_DATA` (or `$FREESURFER_HOME/subjects/tutorial_data`) | the mirrored contents of the server's `tutorial_data/` module |
| The destination directory itself | same path | created via `mkdir -p` if absent |

### Output Specifications

The downloaded payload is whatever the server hosts under `tutorial_data/` —
recursively mirrored. The default `rsync` invocation is
`rsync -ztrlv --progress` ([`scripts/fs_tutorial_data:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L37)):
compress in transit (`-z`), preserve modification times (`-t`), recurse (`-r`),
copy symlinks as symlinks (`-l`), verbose (`-v`), with a `--progress` meter. Note
the absence of `--delete`, so the local copy is additive (stale files are not
pruned).

## Mathematical Foundations

None — this is a download wrapper. It builds a single `rsync` command string and
executes it. No numerical computation is involved.

## Configuration Options

### Complete Flag Reference

`fs_tutorial_data` defines **one real option** (help) and treats every other
argument as an `rsync` pass-through.

| Flag / argument | Type | Default | Description |
|-----------------|------|---------|-------------|
| `-h`<br>`-help`<br>`--h`<br>`--help` | bool | — | Print the usage text and exit **1** ([`scripts/fs_tutorial_data:42-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L42-L45)). |
| `<rsync_options>` (any other args) | string (repeatable) | — | Appended verbatim to the base `rsync -ztrlv --progress` command ([`scripts/fs_tutorial_data:46-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L46-L48)). E.g. add `--bwlimit=5000` to throttle bandwidth or `-n` for a dry run. |
| `TUTORIAL_DATA` | env var (string) | `$FREESURFER_HOME/subjects/tutorial_data` | Destination directory. |
| *(proceed prompt)* | `y`/`n` keypress | — | Before downloading, the script prints the destination and asks `Shall I proceed? [y/n/Abort]`; only `y`/`Y` proceeds, anything else exits 1 ([`scripts/fs_tutorial_data:62-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L62-L73)). |

### Configuration Interactions

> [!gotcha] Extra arguments must be valid rsync flags
> There is no validation: every non-help token is concatenated onto the `rsync`
> command line ([`scripts/fs_tutorial_data:46-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L46-L48)). A typo or an
> unsupported option is passed to `rsync` and surfaces as an `rsync` error, not a
> friendly message. Useful additions are genuine rsync flags such as `-n`
> (dry-run), `--bwlimit=N`, or `--partial`.

> [!gotcha] Help exits 1, and its message has a copy-paste typo
> Requesting help returns a non-zero exit status (1), which can trip up scripts
> that treat non-zero as failure. The help text's item (3) also mistakenly says
> `fs_update -h …` instead of `fs_tutorial_data -h …`
> ([`scripts/fs_tutorial_data:32-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L32-L35)) — a documentation typo, not a
> behavioural one.

## Typical Use Cases

### Use Case 1: Download to the default location

```bash
# Goes to $FREESURFER_HOME/subjects/tutorial_data after a y/n prompt
fs_tutorial_data
```

### Use Case 2: Download to a custom directory

```bash
export TUTORIAL_DATA=/data/freesurfer/tutorial_data
fs_tutorial_data
```

### Use Case 3: Throttle bandwidth / dry-run via pass-through rsync flags

```bash
# Preview what would transfer without downloading
fs_tutorial_data -n

# Cap transfer rate at ~5 MB/s
fs_tutorial_data --bwlimit=5000
```

## Pipeline Context

`fs_tutorial_data` is a **standalone setup helper**. It is not invoked by
[[wiki/pipelines/recon-all|recon-all]], `trac-all`, or any other script in the
distribution. It runs before any tutorial work to stage the example data; the
*successors* are the tutorial exercises themselves, which point `SUBJECTS_DIR` at
(or copy from) the downloaded `tutorial_data` tree.

**Predecessor:** FreeSurfer install → **fs_tutorial_data** → **Successor:** the
hands-on FreeSurfer tutorials.

## Gotchas and Caveats

> [!gotcha] Additive mirror, no deletion
> The default flags omit `--delete`, so re-running augments the local copy and
> never removes files the server has dropped. To get an exact mirror, add
> `--delete` yourself as a pass-through argument.

> [!gotcha] Needs FREESURFER_HOME for the default path
> If `TUTORIAL_DATA` is unset and `FREESURFER_HOME` is also unset, the default
> destination collapses to `/subjects/tutorial_data` (an unwritable root path) —
> set one of them. The script does not explicitly check `FREESURFER_HOME`.

## Error Compensation and Guard Rails

- **Destination auto-creation**: missing destination directories are created with
  `mkdir -p` before the transfer ([`scripts/fs_tutorial_data:57-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L57-L59)).
- **Confirmation prompt**: the script echoes the resolved destination and waits
  for explicit `y` confirmation before pulling ~5 GB
  ([`scripts/fs_tutorial_data:62-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L62-L73)) — a guard against downloading to
  the wrong place.
- **Resumable transport**: `rsync` is restartable, so an interrupted download can
  be resumed by simply re-running the command.

## Related Tools

- [[fs_install_mcr]] — sibling post-install helper (installs the MATLAB runtime).
- [[fs_install_cuda]] — sibling post-install helper (GPU-enables fspython torch).

## Confidence and Gaps

**High confidence:** the destination-resolution logic, the hard-coded rsync
source URL, the default rsync flags, the argument pass-through, the help/exit
behaviour, and the confirmation prompt were all read directly from
[`scripts/fs_tutorial_data`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data). No open questions remain about the
script's behaviour.

## References

- FreeSurfer source: [`scripts/fs_tutorial_data`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data) (v8.2.0).
- Built-in usage text: [`scripts/fs_tutorial_data:18-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_tutorial_data#L18-L35).
- FreeSurfer tutorials (Martinos Center): the data served from
  `rsync://surfer.nmr.mgh.harvard.edu/pub/data/tutorial_data/`.
