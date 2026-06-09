---
title: "fname2stem"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/fname2stem"
families: []                     # filename/path helper utility
recon_all_stage: null
related:
  - "[[fname2ext]]"
  - "[[stem2fname]]"
  - "[[getfullpath]]"
  - "[[wiki/tools/dcmunpack|dcmunpack]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - filename
  - shell
---

# fname2stem

## Summary

`fname2stem` is a tiny csh helper that strips a recognised FreeSurfer image
**extension** from a filename to leave the **stem**. Given `f.nii.gz` it prints
`f`; given `here/f.mgh` it prints `here/f` (the directory is preserved). It works
purely on the string passed to it — the file does **not** need to exist — and
only recognises a fixed list of FreeSurfer-relevant extensions. Scripts use it to
derive a base name from a full filename so they can build companion paths (logs,
side-car files, alternative formats). It is the inverse of [[fname2ext]] and the
string-only complement of [[stem2fname]].

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/fname2stem`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem)
- **Binary/script location:** `$FREESURFER_HOME/bin/fname2stem`
- **Original author:** Doug Greve

## Purpose and Context

FreeSurfer scripts frequently need the "stem" of a filename — the path minus its
format extension — so they can construct related filenames (e.g. turn
`bold.nii.gz` into `bold.bvecs`, or write `stem-infodump.dat` next to a converted
volume). `fname2stem` provides that operation against the canonical FreeSurfer
extension list, returning the leading directory unchanged so the stem remains a
usable relative or absolute path.

It is a pure **string utility**: it never touches the filesystem and is therefore
safe on names that do not exist yet. It is not part of
[[wiki/pipelines/recon-all|recon-all]], but it is one of the most widely used
helper scripts in the tree — called by [[wiki/tools/dcmunpack|dcmunpack]] (to
strip any extension from the user-supplied `stem` argument), `mris_preproc`,
`mri_glmfit-sim`, `mideface`, and many others.

## Inputs

### Required Inputs

- **A single filename** (argument 1). The directory part and basename are split
  with `dirname`/`basename` ([`scripts/fname2stem:36-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L36-L38)). Exactly one
  argument is required; otherwise the usage message is printed and the script
  exits 1 ([`scripts/fname2stem:28-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L28-L34)).

### Input Assumptions

> [!assumption] String-only, fixed extension list
> The file need not exist. The extension is matched against the hard-coded list
> `mgh mgz nii nii.gz img bhdr annot m3z gii`
> ([`scripts/fname2stem:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L40)). A name with no recognised extension
> is reported as an error rather than echoed unchanged.

## Outputs

### Files Created

None. The stem is printed to **stdout**. The leading directory is retained unless
it is `.` (current directory), in which case only the bare stem is printed
([`scripts/fname2stem:43-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L43-L47)).

### Output Specifications

| Input | Output | Note |
|-------|--------|------|
| `f.mgh` | `f` | no directory |
| `f.nii.gz` | `f` | compound extension stripped whole |
| `here/f.mgh` | `here/f` | directory preserved |
| `./f.nii` | `f` | leading `.` dropped |
| `foo.txt` | `ERROR: cannot determine stem` (exit 1) | extension not recognised |

## Mathematical Foundations

None — string manipulation only.

## Configuration Options

### Complete Flag Reference

`fname2stem` takes **no options**, only a single positional argument, and has no
`--help` flag (a `--help` argument is treated as a filename and fails the
extension match).

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `filename` | string | *(required)* | Path whose stem to return. The directory component is preserved (except a bare `.`); the file need not exist. |

### Configuration Interactions

None — single argument, no flags.

## Typical Use Cases

### Derive a base name for companion files

```bash
set stem = `fname2stem $dwi`     # e.g. /data/dwi.nii.gz -> /data/dwi
cp $stem.bvecs $outdir/
```

### Strip a user-supplied extension before re-adding a chosen format

```bash
# How dcmunpack normalises its `stem` argument:
set stem = `fname2stem $userstem`   # f.nii -> f, f -> f
set out  = $stem.$format            # then append the real format
```

## Pipeline Context

`fname2stem` is a leaf utility, not a pipeline stage, and is **not** called by
[[wiki/pipelines/recon-all|recon-all]]. It is invoked by many FreeSurfer scripts;
notably [[wiki/tools/dcmunpack|dcmunpack]] uses it to strip any extension from the
`stem` field of a `-run` specification before appending the requested output
format.

**Predecessor:** *(none — pure string op)* → **fname2stem** → **Successor:** a
caller that appends an extension or builds a side-car path (often
[[wiki/tools/mri_convert|mri_convert]] or [[stem2fname]]).

## Gotchas and Caveats

> [!gotcha] Extension list is fixed and FreeSurfer-specific
> Only `mgh mgz nii nii.gz img bhdr annot m3z gii` are stripped
> ([`scripts/fname2stem:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L40)). A name ending in any other suffix
> (`.txt`, `.lta`, `.gz` alone, `.dat`) is **not** stemmed and returns the error
> string. This differs from a generic "strip everything after the last dot".

> [!gotcha] Only one extension is stripped, and it must be the trailing one
> The check uses `basename $fname .$ext`, which removes the suffix only if the
> name actually ends in it. `f.nii.gz` correctly yields `f` because `nii.gz` is a
> distinct list entry tried before any single-component fallback would apply.

> [!gotcha] Error message goes to stdout
> The `ERROR: cannot determine stem` text is printed with `echo` to stdout
> ([`scripts/fname2stem:52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L52)), so a caller capturing the output in a
> variable will silently store the error text unless it checks `$status` (1 on
> failure).

## Error Compensation and Guard Rails

- **Argument-count guard:** wrong argument count → usage + exit 1
  ([`scripts/fname2stem:28-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L28-L34)).
- **Unknown extension guard:** explicit error + exit 1 instead of returning the
  unmodified name ([`scripts/fname2stem:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L52-L53)).
- **Directory normalisation:** a leading `./` is dropped so the stem is clean
  ([`scripts/fname2stem:43-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem#L43-L44)).

## Related Tools

- [[fname2ext]] — the complement: returns the extension instead of the stem.
- [[stem2fname]] — goes the other way and resolves a stem to an *existing* file by probing extensions on disk.
- [[getfullpath]] — canonicalises a path to an absolute filename (sibling shell helper).
- [[wiki/tools/dcmunpack|dcmunpack]] — a heavy user; calls `fname2stem` on its `-run … stem` argument.
- [[wiki/tools/mri_convert|mri_convert]] — frequently the next step, given the stem plus a chosen extension.

## Confidence and Gaps

**High confidence:** the script is 53 lines and was read in full. The extension
list, directory preservation (with `.` special-cased), string-only behaviour, and
the stdout error channel are all confirmed from
[`scripts/fname2stem`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem).

## References

- FreeSurfer source: [`scripts/fname2stem`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2stem) (v8.2.0).
