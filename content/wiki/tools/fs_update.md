---
title: "fs_update"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/fs_update"
families: []                     # standalone installation-maintenance utility
recon_all_stage: null
related:
  - "[[fs_lib_check]]"
  - "[[fs-check-os]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether the rsync patch server (rsync://surfer.nmr.mgh.harvard.edu/pub/dist/freesurfer/patches/<build>) still hosts patches for v8.2.0 builds is not verifiable from the source; the script was written around the tutorial-patch workflow."
tags:
  - infrastructure
  - installation
  - update
  - rsync
  - patches
---

# fs_update

## Summary

`fs_update` updates an existing FreeSurfer installation in place by `rsync`-ing
patched files from the Martinos Center distribution server into
`$FREESURFER_HOME`. It reads the build identifier from
`$FREESURFER_HOME/build-stamp.txt`, constructs an `rsync` URL pointing at the
patch directory for that exact build, asks the user to confirm, and then pulls
either the entire patch set (no arguments) or only the named files/subdirectories
(any arguments). Existing files are backed up with a timestamped suffix before
being overwritten. It was written principally to let users pick up the small
binary/data patches needed to follow the FreeSurfer tutorials without
reinstalling the whole package.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/fs_update`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update)
- **Binary/script location:** `$FREESURFER_HOME/bin/fs_update`
- **External program used:** `rsync` (over the `rsync://` protocol), plus `date`
  and `cat`
- **Patch server:** `rsync://surfer.nmr.mgh.harvard.edu/pub/dist/freesurfer/patches/<build>`
  ([`scripts/fs_update:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L55))

## Purpose and Context

After a major release, the FreeSurfer team occasionally publishes small fixes —
patched binaries, corrected atlas/subject data, tutorial assets — keyed to a
specific build. Reinstalling the multi-gigabyte package to get a few changed
files is wasteful. `fs_update` is the lightweight mechanism for applying those
build-specific patches: it determines which build you have from
`build-stamp.txt`, points `rsync` at that build's patch tree on the Martinos
server, and synchronises the changed files into your install, preserving
timestamps and keeping backups of anything it overwrites.

The header comment ties it explicitly to the tutorial workflow ("download and
install patches … for running the freesurfer tutorials",
[`scripts/fs_update:3-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L3-L11)). It is a manual, interactive maintenance command,
entirely separate from the processing pipelines — [[wiki/pipelines/recon-all|recon-all]]
never calls it. It sits alongside the other `$FREESURFER_HOME` environment
utilities [[fs_lib_check]] (library check) and [[fs-check-os]] (OS check).

## Inputs

### Required Inputs

- **A valid FreeSurfer installation**, identified by:
  - `$FREESURFER_HOME` set in the environment — the script errors out if it is
    empty ([`scripts/fs_update:44-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L44-L47)).
  - `$FREESURFER_HOME/build-stamp.txt` present — the script errors out if it is
    missing ([`scripts/fs_update:49-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L49-L52)). Its contents become the `<build>`
    component of the patch URL.
- **Network access** to `surfer.nmr.mgh.harvard.edu` over the `rsync` protocol.

### Optional Inputs

- **Zero or more path arguments** naming the files or directories to update,
  relative to `$FREESURFER_HOME` (e.g. `bin/mri_convert subjects/fsaverage`).
  With no arguments, the whole patch set is pulled.

### Input Assumptions

> [!assumption] The build stamp must match a published patch directory
> The update URL is built verbatim from `build-stamp.txt`
> ([`scripts/fs_update:54-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L54-L55)). If the server has no patch tree for that
> exact build string, `rsync` finds nothing to transfer (or errors). The tool
> does no version negotiation — it assumes a `patches/<build>/` directory exists
> on the server.

## Outputs

### Files Created / Modified

`fs_update` modifies files **inside `$FREESURFER_HOME`** — it overwrites the
patched files with the server's copies and, because of `rsync -b --suffix`,
writes a timestamped backup of each file it replaces.

| Artefact | Where | Notes |
|----------|-------|-------|
| Patched files | under `$FREESURFER_HOME/` | mirror the server's `patches/<build>/` tree |
| `*.<epoch>_bak` backups | beside each replaced file | backup of the prior version; suffix is `.` + `date +%s` (Unix epoch seconds) captured once at invocation ([`scripts/fs_update:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L55)) |

### Output Specifications — the rsync command

The command assembled is ([`scripts/fs_update:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L55)):

```
rsync -zbrlv --progress --suffix=.<epoch>_bak \
  rsync://surfer.nmr.mgh.harvard.edu/pub/dist/freesurfer/patches/<build>[/* | /<file>] <dest>
```

The flags (documented in the header, [`scripts/fs_update:12-21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L12-L21)):

| rsync flag | Meaning |
|------------|---------|
| `-z` | compress data during transfer |
| `-b` | make backups of replaced files |
| `-r` | recurse into directories |
| `-l` | copy symlinks as symlinks |
| `-v` | verbose |
| `--progress` | show per-file transfer progress |
| `--suffix=.<epoch>_bak` | suffix appended to each backup file |

## Mathematical Foundations

None — `fs_update` is a file-synchronisation front end. The only computed value
is the backup suffix, the Unix epoch timestamp `date +%s`, embedded in the
`--suffix` argument so that successive updates produce distinct backup names.

## Configuration Options

### Complete Flag Reference

`fs_update` has **no option flags of its own** other than help. Its command line
is interpreted as: an optional single help flag, otherwise a list of paths to
update.

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `-h`<br>`-help`<br>`--help` | bool | — | Print usage and exit 0. Recognised **only** when it is the *sole* argument (`$# -eq 1`), [`scripts/fs_update:37-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L37-L42). |
| `<path> …` | string(s) | *(none → update everything)* | One or more files/dirs relative to `$FREESURFER_HOME` to update selectively; each is rsync'd in its own invocation ([`scripts/fs_update:67-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L67-L73)). |

There is no flag to change the server, the build, or to suppress the
confirmation prompt.

### Confirmation prompt

Before transferring anything, the script prints the detected build and asks
`Shall I proceed? [y/n/Abort]:` ([`scripts/fs_update:56-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L56-L61)). It proceeds only
if the reply matches the regex `^[Yy]$` (a single `y`/`Y`,
[`scripts/fs_update:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L62)); anything else (including `yes`, `n`, or empty) falls
through and the script ends without updating.

### Configuration Interactions

> [!gotcha] Help is recognised only as the lone argument
> The help check is guarded by `if [ "$#" -eq 1 ]`
> ([`scripts/fs_update:37-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L37-L42)). So `fs_update -h` prints help, but
> `fs_update -h bin/mri_convert` does **not** — `-h` would then be treated as a
> path to update and rsync'd as a (non-existent) patch file. Pass `-h` by itself.

> [!gotcha] Only a bare `y`/`Y` proceeds
> The proceed regex is `^[Yy]$` ([`scripts/fs_update:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L62)). Typing `yes`
> does **not** match and silently aborts the update (no error, no "Done"). Use a
> single `y`.

> [!gotcha] Per-argument re-confirmation is not done, but URL is rebuilt each loop
> With multiple path arguments the script appends each path to the *same*
> `rsync_cmd` string inside the loop ([`scripts/fs_update:68-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L68-L72)) without
> resetting it between iterations. See the corresponding gotcha below — this
> accumulation can malform the second and later commands.

## Typical Use Cases

### 1. Update the whole installation to the latest patches

```bash
echo $FREESURFER_HOME          # make sure it points at the install to patch
fs_update
#  Build is freesurfer-linux-... 
#  Shall I proceed? [y/n/Abort]: y
#  ... rsync transfers patched files, backing up replaced ones ...
#  Done.
```

### 2. Update only specific files

```bash
# Pull just a patched binary and a refreshed average subject:
fs_update bin/mri_convert subjects/fsaverage
```

### 3. Show usage

```bash
fs_update -h        # must be the only argument
```

## Pipeline Context

`fs_update` is an **out-of-band installation-maintenance** command. It is not a
processing step and is never invoked by [[wiki/pipelines/recon-all|recon-all]],
`trac-all`, or any other pipeline (the only in-tree reference besides the script
itself is `CMakeLists.txt`, for installation, and `fs_tutorial_data`).

**Predecessor:** a base FreeSurfer install with a `build-stamp.txt` →
**fs_update** → **Successor:** the now-patched install used by the tutorials /
[[wiki/pipelines/recon-all|recon-all]]. Run [[fs_lib_check]] afterward if a
patched binary still fails to load.

## Gotchas and Caveats

> [!gotcha] Multi-argument loop does not reset the rsync command string
> `rsync_cmd` is built once with the server prefix ([`scripts/fs_update:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L55))
> and then, in the selective-update loop, each path is appended with `+=`
> ([`scripts/fs_update:68-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L68-L72)) **without** restoring the base prefix between
> iterations. For a single path this is fine; for two or more paths the second
> and subsequent commands accumulate the previous path's source/dest as well,
> producing a malformed `rsync` line. **Safe pattern:** update one path per
> invocation, or update everything at once with no arguments.

> [!gotcha] Word-splitting execution of `$rsync_cmd`
> The command is run by expanding the unquoted variable `$rsync_cmd`
> ([`scripts/fs_update:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L66), [`scripts/fs_update:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L71)), relying on bash word-splitting.
> A `$FREESURFER_HOME` containing spaces would break the command. Install
> FreeSurfer in a space-free path.

> [!gotcha] In-place overwrite of your install
> `fs_update` writes directly into `$FREESURFER_HOME`. The `-b`/`--suffix`
> backups mitigate accidental loss, but they accumulate `*_bak` clutter and the
> operation modifies a live install. Confirm `$FREESURFER_HOME` is the intended
> target before answering `y`.

> [!gotcha] No success message unless you answered `y`
> The "Done." / exit-0 path ([`scripts/fs_update:74-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L74-L79)) is inside the
> `if [[ $REPLY =~ ^[Yy]$ ]]` block. If you answered anything else the script
> simply ends with whatever status the last statement left — there is no explicit
> "aborted" message.

## Error Compensation and Guard Rails

- **Pre-flight environment checks.** Refuses to run without `$FREESURFER_HOME`
  ([`scripts/fs_update:44-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L44-L47)) or without `build-stamp.txt`
  ([`scripts/fs_update:49-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L49-L52)), with clear error messages.
- **Interactive confirmation.** The `[y/n/Abort]` prompt
  ([`scripts/fs_update:60-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L60-L62)) prevents an unintended overwrite of the
  installation.
- **Automatic backups.** `rsync -b --suffix=.<epoch>_bak` preserves the prior
  version of every replaced file, so a bad patch can be rolled back by hand.
- **Timestamp preservation.** `-t` semantics (via the documented intent) keep
  file mtimes so that FSFAST and make-based steps do not needlessly re-run
  ([`scripts/fs_update:13-14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L13-L14)).

## Known Bugs

- [[00175]] — the selective-update loop appends to `rsync_cmd` with `+=` without resetting the base prefix, so passing two or more path arguments builds a malformed rsync command (every path after the first is mis-synced).

## Related Tools

- [[fs_lib_check]] — run after updating if a freshly patched binary fails to start; it diagnoses missing shared libraries.
- [[fs-check-os]] — sibling `$FREESURFER_HOME`/runtime check (OS allow-list); both are environment-maintenance helpers, not pipeline steps.
- [[wiki/pipelines/recon-all|recon-all]] — the principal consumer of a correctly-patched install; `fs_update` keeps that install current for the tutorials.
- `fs_tutorial_data` *(no wiki page yet)* — companion script that, like `fs_update`, fetches tutorial assets from the Martinos server.

## Confidence and Gaps

**High confidence:** the required environment, the build-stamp-driven URL
construction, the exact rsync flag set and backup-suffix scheme, the
single-`y` confirmation gate, the help guard, and the multi-argument loop
behaviour were all read directly from
[`scripts/fs_update`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update) and confirmed against the installed `-help` output.

> [!gap] Patch-server availability for v8.2.0
> Whether `patches/<build>/` trees are actually published for current v8.2.0
> builds on the Martinos rsync server cannot be determined from the source. The
> script predates the modern release model and centres on the tutorial-patch
> workflow; on a build with no published patches it will simply find nothing to
> transfer.

## References

- FreeSurfer source: [`scripts/fs_update`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update) (v8.2.0).
- Built-in usage: `fs_update -h` (the `show_usage` function, [`scripts/fs_update:23-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L23-L35)).
- FreeSurfer tutorials referenced in the header: `http://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial` ([`scripts/fs_update:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fs_update#L10)).
