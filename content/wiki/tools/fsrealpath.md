---
title: "fsrealpath"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/fsrealpath"
families: []                     # path helper utility
recon_all_stage: null
related:
  - "[[getfullpath]]"
  - "[[fname2stem]]"
  - "[[fname2ext]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "No in-tree script invokes fsrealpath in v8.2.0 (only CMakeLists installs it); its intended call sites may be external wrappers or future code."
tags:
  - utility
  - path
  - python
---

# fsrealpath

## Summary

`fsrealpath` is a one-line Python wrapper around `os.path.realpath` that prints
the **canonical absolute path** of a file or directory — resolving symbolic
links and collapsing `.` and `..` components. It is the FreeSurfer-branded
equivalent of the system `realpath` command, provided so scripts have a portable
path-canonicaliser that behaves identically across the platforms FreeSurfer
supports. It is the more thorough sibling of the older tcsh helper
[[getfullpath]] (which only absolutises the directory and does not follow
symlinks).

## Source Information

- **Language:** Python 3 (`#!/usr/bin/env python3`, `argparse`)
- **Source file:** [`scripts/fsrealpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsrealpath`

## Purpose and Context

Different Unix platforms ship `realpath` with subtly different behaviour (and
macOS historically lacked a GNU-compatible one). FreeSurfer therefore bundles
`fsrealpath`, a trivial Python 3 script whose `fsrealpath()` function simply
returns `os.path.realpath(path)`
([`scripts/fsrealpath:6-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L6-L24)) and whose `__main__` block parses one
positional `path` argument and prints the result
([`scripts/fsrealpath:26-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L26-L32)).

`os.path.realpath` makes the path absolute and **eliminates symbolic links**, so
the output is free of symlinks and redundant `.`/`..` components. This is exactly
the canonicalisation [[getfullpath]] does *not* perform, which is why `fsrealpath`
exists alongside it. It is not part of [[wiki/pipelines/recon-all|recon-all]] and,
in the v8.2.0 source tree, is only referenced by the build system's
`CMakeLists.txt` (for installation) — no shipped script calls it directly (see
[Confidence and Gaps](#confidence-and-gaps)).

## Inputs

### Required Inputs

- **A single path** (positional `path`) — a file or directory whose canonical
  form is wanted. Exactly one positional argument is required; `argparse` enforces
  this and errors if it is missing ([`scripts/fsrealpath:28-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L28-L29)).

### Input Assumptions

> [!assumption] Non-existent paths are canonicalised, not rejected
> Despite the docstring mentioning `FileNotFoundError`
> ([`scripts/fsrealpath:19-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L19-L22)), the underlying `os.path.realpath` does
> **not** require the path to exist — it resolves whatever symlinks it can and
> returns an absolute canonical string for the rest. A path to a non-existent file
> in an existing directory still yields a sensible absolute path. (The docstring
> describes the contract aspirationally; the implementation does not raise for a
> missing leaf.)

## Outputs

### Files Created

None. The canonical path is printed to **stdout** via `print`
([`scripts/fsrealpath:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L32)).

### Output Specifications

- One line: the absolute, symlink-resolved, `.`/`..`-collapsed path. Exit 0 on
  success; `argparse` exits 2 with a usage error if the argument is missing.

## Mathematical Foundations

None — delegates entirely to Python's `os.path.realpath`.

## Configuration Options

### Complete Flag Reference

`fsrealpath` exposes one positional argument and the automatic `argparse` help
flag.

| Flag / argument | Type | Default | Description |
|-----------------|------|---------|-------------|
| `path` | string (positional) | *(required)* | The file or directory path to canonicalise (resolve symlinks, make absolute, collapse `.`/`..`). |
| `-h`<br>`--help` | boolean | — | Print the `argparse`-generated usage/help and exit. |

### Configuration Interactions

None — a single positional argument plus the standard help flag.

## Typical Use Cases

### Canonicalise a path, following symlinks

```bash
# Resolve a symlinked subject directory to its real location
fsrealpath $SUBJECTS_DIR/bert
# e.g. /symlink/subjects/bert -> /mnt/real/store/subjects/bert
```

### Collapse relative components

```bash
fsrealpath ./a/../b/c     # -> /current/dir/b/c
```

## Pipeline Context

`fsrealpath` is a standalone path utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]]. In the v8.2.0 tree no shipped script calls
it; it is installed by the build (`scripts/CMakeLists.txt`) for use by FreeSurfer
code and external wrappers that need GNU-`realpath`-style canonicalisation
portably.

**Predecessor:** *(none — operates on the argument)* → **fsrealpath** →
**Successor:** any caller that needs a fully resolved absolute path.

## Gotchas and Caveats

> [!gotcha] Follows symlinks — unlike `getfullpath`
> `fsrealpath` dereferences every symbolic link in the path, returning the *real*
> location. [[getfullpath]] deliberately does not: it only absolutises the
> directory via `pushd`/`pwd`. Choose `fsrealpath` when you specifically want the
> link-free physical path, `getfullpath` when you want to preserve a symlinked
> view.

> [!gotcha] Requires a working `python3`
> Being a Python 3 script, `fsrealpath` depends on the FreeSurfer Python
> environment / a `python3` on `PATH`, whereas the tcsh helpers
> ([[getfullpath]], [[fname2stem]], [[fname2ext]]) have no such dependency.

> [!gotcha] Docstring overstates the error contract
> The docstring advertises `FileNotFoundError`/`OSError`
> ([`scripts/fsrealpath:19-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L19-L23)), but `os.path.realpath` does not raise
> for a non-existent leaf path; it returns a canonicalised absolute string.

## Error Compensation and Guard Rails

- **Argument guard:** `argparse` enforces exactly one positional argument and
  prints a usage error (exit 2) if it is omitted
  ([`scripts/fsrealpath:28-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath#L28-L29)).
- **No silent failure:** the result is always a fully-formed absolute path; there
  is no error-string-on-stdout pattern as in the csh helpers.

## Related Tools

- [[getfullpath]] — the older tcsh sibling; absolutises the directory only and does **not** follow symlinks.
- [[fname2stem]] — strips an extension from a filename (string-only).
- [[fname2ext]] — returns a filename's extension (string-only).

## Confidence and Gaps

**High confidence:** the script is 32 lines and was read in full. The delegation
to `os.path.realpath`, the single positional argument, the standard `-h/--help`,
and the docstring/implementation mismatch on error handling are all confirmed from
[`scripts/fsrealpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath).

> [!gap] No in-tree caller
> A tree-wide search found no shipped FreeSurfer script that invokes `fsrealpath`
> in v8.2.0 (only `scripts/CMakeLists.txt`, which installs it). Its intended call
> sites are presumably external wrappers, C/C++ code shelling out, or future
> scripts; this could not be confirmed from the source tree alone.

## References

- FreeSurfer source: [`scripts/fsrealpath`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsrealpath) (v8.2.0).
- Python docs: `os.path.realpath` (the entire behaviour of this tool).
