---
title: "getfullpath"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/getfullpath"
families: []                     # path helper utility
recon_all_stage: null
related:
  - "[[fsrealpath]]"
  - "[[fname2stem]]"
  - "[[fname2ext]]"
  - "[[wiki/tools/dcmunpack|dcmunpack]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - path
  - shell
---

# getfullpath

## Summary

`getfullpath` converts a (possibly relative) filename into an **absolute path**
by `cd`-ing into the file's directory, reading the working directory with `pwd`,
and re-attaching the basename. Given `../data/T1.mgz` from `/home/me` it prints
`/home/data/T1.mgz`. The file itself need not exist, but its **directory must
exist** — that is what makes the absolutisation possible. It is a small tcsh
helper used throughout FreeSurfer scripts (including
[[wiki/pipelines/recon-all|recon-all]]) to canonicalise user-supplied paths so
they remain valid after the script changes directory.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/getfullpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath)
- **Binary/script location:** `$FREESURFER_HOME/bin/getfullpath`

## Purpose and Context

FreeSurfer pipeline scripts often `cd` into a subject or working directory partway
through execution. A path the user typed relative to their original location
(e.g. `-i ./scan.nii`) would then point to the wrong place. `getfullpath` solves
this by resolving the path to an absolute one **up front**, before any directory
change, so the reference stays correct for the rest of the run.

Mechanically it splits the input with `dirname`/`basename`, verifies the
directory exists, `pushd`es into it to obtain the canonical absolute directory via
`pwd`, and prints `<abs-dir>/<basename>`
([`scripts/getfullpath:27-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath#L27-L40)). It is a sibling of the newer
[[fsrealpath]] (which additionally follows symlinks and requires the *target* to
exist).

[[wiki/pipelines/recon-all|recon-all]] calls it to absolutise three user-supplied
file arguments: the EM-register mask
([`scripts/recon-all:6609`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L6609)), the GCA atlas file for `-canorm`
([`scripts/recon-all:7268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7268)), and the expert-options (xopts) file
([`scripts/recon-all:7626`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7626)). It is a utility, not a processing
stage, so it does not belong to any `autorecon` block.

## Inputs

### Required Inputs

- **A single filename** (argument 1). At least one argument is required; with none
  it prints `getfullpath filename` and exits 1
  ([`scripts/getfullpath:22-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath#L22-L25)). Extra arguments beyond the first are
  ignored (`$argv[1]` only).

### Input Assumptions

> [!assumption] The directory must exist; the file need not
> `getfullpath` resolves the **directory** with `pushd`/`pwd`, so the directory
> part must exist and be reachable. The basename is simply appended, so the file
> itself may not yet exist (useful for building absolute *output* paths). A
> missing directory is a hard error
> ([`scripts/getfullpath:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath#L30-L33)).

## Outputs

### Files Created

None. The absolute path is printed to **stdout**
([`scripts/getfullpath:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath#L40)).

### Output Specifications

- **Success:** one line, `<absolute-dir>/<basename>`, exit 0.
- **Missing directory:** `ERROR: cannot find <dir>`, exit 1.
- A bare filename with no directory (e.g. `scan.nii`) has `dirname` `.`, which
  exists, so it resolves against the current working directory →
  `<cwd>/scan.nii`.

## Mathematical Foundations

None — path manipulation only.

## Configuration Options

### Complete Flag Reference

`getfullpath` takes **no options**, only a single positional argument, and has no
`--help` flag (a `--help` argument would be treated as a filename whose directory
`.` exists, so it would print `<cwd>/--help`).

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `filename` | string | *(required)* | Path to absolutise. Its directory must exist; the file itself need not. Only the first argument is used. |

### Configuration Interactions

None — single argument, no flags.

## Typical Use Cases

### Absolutise a user argument before changing directories

```bash
# Inside a script, before any cd/pushd:
set infile = `getfullpath $argv[1]`   # ./scan.nii -> /current/dir/scan.nii
# ... later the script may cd elsewhere; $infile still points correctly.
```

### How recon-all canonicalises an atlas path

```bash
# recon-all -canorm path handling (paraphrased):
set gcafile = `getfullpath $gcafile`
set GCA     = `basename $gcafile`
set GCADIR  = `dirname  $gcafile`
```

## Pipeline Context

`getfullpath` is a leaf utility invoked by many FreeSurfer scripts. Within
[[wiki/pipelines/recon-all|recon-all]] it canonicalises the `-mask` (EM-register
mask), `-canorm` GCA file, and expert-options file paths so they survive the
subject-directory `cd`. It is also used by
[[wiki/tools/dcmunpack|dcmunpack]] (to canonicalise each `-src` DICOM directory),
`fsr-import`, `fsr-coreg`, `samseg2recon`, and others.

**Predecessor:** *(none — operates on the argument)* → **getfullpath** →
**Successor:** the calling script, which stores the absolute path and later
`cd`s freely.

## Gotchas and Caveats

> [!gotcha] Resolves the directory, not symlinks
> `getfullpath` only makes the path absolute via `pushd`/`pwd`; it does **not**
> dereference symbolic links in the path components the way
> [`realpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath) does. If you need symlink resolution and `..`/`.`
> canonicalisation, use [[fsrealpath]] instead. (Note `pwd` in tcsh may itself
> report a logical, symlink-preserving path.)

> [!gotcha] Directory must exist — output paths need their parent created first
> Because the directory is resolved with `pushd`, building an absolute path for a
> file in a not-yet-created directory fails with `ERROR: cannot find <dir>`. Make
> the parent directory before calling `getfullpath` on an intended output path.

> [!gotcha] Extra arguments are silently ignored
> Only `$argv[1]` is used; `getfullpath a b` resolves `a` and discards `b` without
> warning.

## Error Compensation and Guard Rails

- **Argument guard:** no arguments → usage + exit 1
  ([`scripts/getfullpath:22-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath#L22-L25)).
- **Missing-directory guard:** the directory is checked with `-e` before
  `pushd`; absence is a clear error and exit 1
  ([`scripts/getfullpath:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath#L30-L33)), preventing a bogus path from being
  emitted.

## Related Tools

- [[fsrealpath]] — the newer, more thorough sibling: resolves symlinks and `.`/`..` and requires the target to exist (Python `os.path.realpath`).
- [[fname2stem]] — strips an extension from a filename (string-only).
- [[fname2ext]] — returns a filename's extension (string-only).
- [[wiki/tools/dcmunpack|dcmunpack]] — uses `getfullpath` to canonicalise its DICOM source directories.
- [[wiki/pipelines/recon-all|recon-all]] — calls `getfullpath` on the mask, GCA, and expert-options file arguments.

## Confidence and Gaps

**High confidence:** the script is 42 lines and was read in full. The
`pushd`/`pwd` absolutisation, the directory-existence requirement, the
file-need-not-exist behaviour, single-argument handling, and the three
[[wiki/pipelines/recon-all|recon-all]] call sites are all confirmed from
[`scripts/getfullpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath) and
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

## References

- FreeSurfer source: [`scripts/getfullpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/getfullpath) (v8.2.0).
