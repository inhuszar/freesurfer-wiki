---
title: "fname2ext"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/fname2ext"
families: []                     # filename/path helper utility
recon_all_stage: null
related:
  - "[[fname2stem]]"
  - "[[stem2fname]]"
  - "[[getfullpath]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - filename
  - shell
---

# fname2ext

## Summary

`fname2ext` is a tiny csh helper that prints the recognised FreeSurfer image
**extension** of a filename. Given `f.nii.gz` it prints `nii.gz`; given
`here/f.mgh` it prints `mgh`. It operates purely on the string passed to it —
the file does **not** need to exist on disk — and only recognises a fixed list
of FreeSurfer-relevant extensions. It is used inside FreeSurfer shell scripts to
decide an output format or to branch on file type, and is the inverse-direction
companion of [[fname2stem]] (which strips the extension to leave the stem).

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/fname2ext`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext)
- **Binary/script location:** `$FREESURFER_HOME/bin/fname2ext`
- **Original author:** Doug Greve

## Purpose and Context

FreeSurfer image files come in several formats whose type is encoded only in the
filename suffix (`mgh`, `mgz`, `nii`, `nii.gz`, …). Many shell scripts need to
know which format a given path refers to so they can pass the right flag to
[[wiki/tools/mri_convert|mri_convert]], pick a matching output name, or skip an
unsupported file. `fname2ext` centralises that logic in one place: it walks a
fixed list of known extensions and echoes the first one that matches the tail of
the basename.

It is a pure **string utility** — it never touches the filesystem — so it is
safe to call on names that have not been created yet. It is not part of
[[wiki/pipelines/recon-all|recon-all]]; it is a low-level building block invoked
by other FreeSurfer scripts (e.g. `fscalc`, `epidewarp.fsl`, `mri_glmfit-sim`).

## Inputs

### Required Inputs

- **A single filename** (argument 1). Any path is accepted; only its basename is
  examined ([`scripts/fname2ext:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L37-L38)). Exactly one argument is
  required — zero or more than one prints the usage message and exits 1
  ([`scripts/fname2ext:28-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L28-L34)).

### Input Assumptions

> [!assumption] String-only, fixed extension list
> The file need not exist. The match is against a hard-coded list — `mgh mgz nii
> nii.gz img bhdr annot m3z gii` ([`scripts/fname2ext:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L40)). A filename
> whose extension is not on this list (e.g. `.txt`, `.dcm`, `.lta`) is reported
> as an error, not echoed back.

## Outputs

### Files Created

None. The result is printed to **stdout**; the recognised extension (without the
leading dot) on success, or `ERROR: cannot determine extension` on failure
([`scripts/fname2ext:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L48)).

### Output Specifications

- **Success:** a single line, e.g. `nii.gz`, and exit status 0.
- **Failure:** the literal error string and exit status 1.

Because the list is tried in order with `nii` before `nii.gz` would be relevant,
the loop instead checks each extension independently via `basename $fname
.$ext`; the compound extension `nii.gz` is a distinct list entry and is matched
correctly (`f.nii.gz` → `nii.gz`, not `nii`).

## Mathematical Foundations

None — this is a string-matching utility with no numerical computation.

## Configuration Options

### Complete Flag Reference

`fname2ext` takes **no options**, only a single positional argument. There is no
`--help` flag: any single argument is treated as a filename. (Passing `--help`
makes the script try to match `--help` against the extension list and fail with
`ERROR: cannot determine extension`.)

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `filename` | string | *(required)* | Path whose extension to report. Only the basename is examined; the file need not exist. |

### Configuration Interactions

None — single argument, no flags.

## Typical Use Cases

### Determine a file's format inside a script

```bash
set ext = `fname2ext $infile`
# ext is now one of: mgh mgz nii nii.gz img bhdr annot m3z gii
```

### Branch on format

```bash
if (`fname2ext $vol` == nii.gz) then
  echo "compressed NIfTI"
endif
```

## Pipeline Context

`fname2ext` is a leaf utility, not a pipeline stage. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]]. It is invoked by other FreeSurfer shell
scripts that need to inspect a filename's format, including `fscalc`,
`epidewarp.fsl`, `mri_glmfit-sim`, `vol2symsurf`, and `dmri_bset`.

**Predecessor:** *(none — pure string op)* → **fname2ext** → **Successor:** a
caller that switches on the returned extension (often
[[wiki/tools/mri_convert|mri_convert]]).

## Gotchas and Caveats

> [!gotcha] Copy-paste artefacts in the script text
> Several internal strings are mislabelled "fname2stem": the header comment
> ([`scripts/fname2ext:2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L2)), the `VERSION` string
> ([`scripts/fname2ext:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L26) — `set VERSION = 'fname2ext @FS_VERSION@'`
> is correct, but the usage block echoes `fname2stem filename`,
> [`scripts/fname2ext:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L29)). The tool nonetheless prints the
> *extension*, as its name implies; the mislabelling is cosmetic.

> [!gotcha] Extension list is fixed and FreeSurfer-specific
> Only `mgh mgz nii nii.gz img bhdr annot m3z gii` are recognised. Common formats
> like `.dcm`, `.lta`, `.txt`, `.gz` (alone), or `.dat` are **not** matched and
> trigger the error path. The list is hard-coded at
> [`scripts/fname2ext:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L40).

> [!gotcha] Error message goes to stdout, not stderr
> Both the success value and the `ERROR:` string are emitted with plain `echo`,
> so a caller doing `set ext = \`fname2ext $f\`` will capture the error text as
> the "extension" unless it also checks the exit status. Check `$status` (it is 1
> on failure).

## Error Compensation and Guard Rails

- **Argument-count guard:** wrong number of arguments → usage + exit 1
  ([`scripts/fname2ext:28-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L28-L34)).
- **Unknown extension guard:** falls through the loop to an explicit error and
  exit 1 rather than printing garbage ([`scripts/fname2ext:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext#L48-L49)).

## Related Tools

- [[fname2stem]] — the complement: strips the extension to return the stem (keeps the directory).
- [[stem2fname]] — resolves a stem to an existing file by probing known extensions on disk.
- [[getfullpath]] — canonicalises a path to an absolute filename (a sibling shell helper).
- [[wiki/tools/mri_convert|mri_convert]] — the converter that the returned extension typically selects a flag for.
- [[mri_info]] — reads the *actual* format/geometry from a file's header (rather than guessing from the name).

## Confidence and Gaps

**High confidence:** the entire script is 50 lines and was read in full. The
extension list, the basename-only behaviour, the string-only (no-disk) nature,
the stdout error channel, and the copy-paste mislabelling are all confirmed from
[`scripts/fname2ext`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext).

## References

- FreeSurfer source: [`scripts/fname2ext`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fname2ext) (v8.2.0).
