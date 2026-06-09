---
title: "isnifti"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/isnifti"
families: []                     # standalone file-type predicate (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[isanalyze]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mris_preproc]]"
  - "[[fsl_rigid_register]]"
  - "[[fscalc.fsl]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - file-type
  - predicate
  - formats
  - nifti
---

# isnifti

## Summary

`isnifti` is a one-line shell predicate that tests whether a filename refers to a
[NIfTI](https://nifti.nimh.nih.gov/) image by inspecting its **extension only**.
It does not open the file or read its magic bytes: it checks whether the basename
ends in `.nii` or `.nii.gz`. The verdict is returned through the **exit status**,
not stdout — exit `1` for a plain `.nii`, exit `2` for a gzipped `.nii.gz`, exit
`0` if it is neither, and exit `255` on a usage error. It is the NIfTI counterpart
of [[isanalyze]] and is used by FreeSurfer shell scripts that branch on output
format.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/isnifti`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti)
- **Binary/script location:** `$FREESURFER_HOME/bin/isnifti`
- **External tools called:** none (only the shell built-ins and `basename`). It is fully self-contained.

## Purpose and Context

FreeSurfer scripts frequently need to know whether a path is NIfTI before the
file is created, so they can decide whether a conversion to or from NIfTI is
required, or whether 4D reshaping is needed. Because FreeSurfer recognises NIfTI
by the `.nii`/`.nii.gz` extension, the test is a string check. `isnifti` packages
it as a reusable predicate, additionally **distinguishing the gzipped variant**
(exit `2`) from the uncompressed one (exit `1`) so callers can, for example,
strip the right suffix to build a base name.

Real consumers in the v8.2.0 tree:

- [[mris_preproc]] — pairs `isnifti` with [[isanalyze]] on its output path and
  turns on reshaping if either matches
  ([`scripts/mris_preproc:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L140)).
- [[fsl_rigid_register]] — calls `isnifti` on the reference, input, and output
  volumes and, when the exit status is `1`, skips the
  [[wiki/tools/mri_convert|mri_convert]] step that would otherwise convert the
  volume to NIfTI for FSL ([`scripts/fsl_rigid_register:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L93), [`:113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L113), [`:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L155)). Note this caller tests `if($status == 1)` explicitly, so a gzipped `.nii.gz` (exit `2`) is *not* matched and would be re-converted.
- [[fscalc.fsl]] — checks both inputs and the output to drive its NIfTI
  handling ([`scripts/fscalc.fsl:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L140), [`:168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L168)).

It is a **purely lexical** test: a `.nii` file is reported as NIfTI even if it
does not exist or its contents are something else, and a genuine NIfTI volume
named without the extension is not recognised.

## Inputs

### Required Inputs

- **Exactly one argument:** a filename (or path) to classify
  ([`scripts/isnifti:28-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L28-L32)).
  The argument is a **string**; the file does not have to exist.

### Input Assumptions

> [!assumption] Extension is the sole signal
> `isnifti` assumes FreeSurfer's NIfTI naming: `.nii` for uncompressed and
> `.nii.gz` for gzip-compressed NIfTI. It performs no header/magic-number
> inspection and no existence check. Anything ending in `.nii` or `.nii.gz` is
> reported as NIfTI; a correctly-formatted NIfTI volume under a different name is
> not.

## Outputs

### Files Created

None. `isnifti` writes nothing to disk and prints nothing on a successful
classification — the result is the **exit status**. (On a usage error it prints
the one-line usage string `isnifti filename`.)

### Output Specifications — the exit-code contract

| Exit status | Meaning | Triggered when |
|-------------|---------|----------------|
| `0` | **Not** NIfTI | Neither `.nii` nor `.nii.gz` matched ([`scripts/isnifti:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L46)). |
| `1` | Uncompressed NIfTI | The basename ends in `.nii` ([`scripts/isnifti:38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L38)). |
| `2` | Gzipped NIfTI | The basename ends in `.nii.gz` ([`scripts/isnifti:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L44)). |
| `255` | Usage error | The number of arguments is not exactly 1 ([`scripts/isnifti:28-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L28-L31)). |

The `.nii` test runs first; because a name ending in `.nii.gz` does **not** end in
`.nii`, the two tests are unambiguous and the `.nii.gz` case is reached only for
truly gzipped names ([`scripts/isnifti:35-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L35-L44)).

> [!gotcha] "True" is exit 1 or 2, not exit 0
> As with [[isanalyze]], this inverts the usual Unix convention: a *positive*
> result is signalled by a non-zero exit (`1` for `.nii`, `2` for `.nii.gz`), and
> the *negative* result by exit `0`. Read the exit code as a small enumerated
> "format tag", not as success/failure. The header comment documents this
> ([`scripts/isnifti:5-12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L5-L12)).

## Mathematical Foundations

None — `isnifti` performs only string manipulation. For each candidate suffix it
computes `base = basename($fname <suffix>)` (which strips a trailing `<suffix>` if
present), re-forms `newfname = $base<suffix>`, and compares it to the original
basename; equality holds **iff** the original name already ended in that suffix
([`scripts/isnifti:35-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L35-L44)).

## Configuration Options

### Complete Flag Reference

`isnifti` has **no flags**. It takes exactly one positional argument (the
filename) and no options.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(none)* | — | — | One positional filename argument, nothing else. There is no `-help`/`-version` handling: zero or more than one argument prints the usage line and exits `255` ([`scripts/isnifti:28-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L28-L31)). |

### Configuration Interactions

None — there are no flags to interact.

## Typical Use Cases

### Use Case 1: Skip conversion when the input is already NIfTI

```tcsh
# fsl_rigid_register idiom: only convert to NIfTI if it isn't already.
isnifti $invol               # exit status == 1 if .nii
if($status == 1) then
  set involimg = $invol      # use as-is
else
  set involimg = $tmpdir/invol.nii
  mri_convert $invol $involimg
endif
```

This is the [[fsl_rigid_register]] pattern
([`scripts/fsl_rigid_register:113-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L113-L130)). Because it tests
`== 1` exactly, a `.nii.gz` input (exit `2`) is treated as "not the right kind of
NIfTI" and re-converted.

### Use Case 2: Toggle reshaping for an output path

```tcsh
isnifti $outpath >& /dev/null
if($status) then
  set reshape = 1     # any non-zero (1 or 2) => NIfTI
endif
```

The [[mris_preproc]] pattern
([`scripts/mris_preproc:140-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L140-L146)) uses the bare
`if($status)` form, so both `.nii` and `.nii.gz` (and, accidentally, a usage
error) count as "NIfTI".

### Use Case 3: Quick interactive check

```bash
isnifti vol.nii    ; echo $?   # prints 1
isnifti vol.nii.gz ; echo $?   # prints 2
isnifti vol.mgz    ; echo $?   # prints 0
```

## Pipeline Context

`isnifti` is a **low-level shell utility**, not a processing stage. It is not
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. In the v8.2.0
tree it is used by [[mris_preproc]] (with [[isanalyze]]), [[fsl_rigid_register]],
and [[fscalc.fsl]] to decide whether a [[wiki/tools/mri_convert|mri_convert]]
conversion or output reshaping is needed.

**Predecessor:** a script handling an input/output path → **isnifti** →
**Successor:** format-dependent logic (skip/perform a
[[wiki/tools/mri_convert|mri_convert]], toggle reshaping).

## Gotchas and Caveats

> [!gotcha] Three different non-zero codes mean different things
> A caller that uses bare `if($status)` lumps `.nii` (1), `.nii.gz` (2), and even
> a usage error (255) together as "true". A caller that needs to act only on
> uncompressed NIfTI must test `== 1` (and on gzipped, `== 2`) explicitly. The
> two in-tree idioms differ on exactly this point: [[mris_preproc]] uses
> `if($status)`, [[fsl_rigid_register]] uses `if($status == 1)`.

> [!gotcha] `.nii.gz` is NOT matched by an `== 1` test
> Scripts that only accept `.nii` (exit `1`) silently exclude `.nii.gz` (exit
> `2`) and will re-convert a gzipped NIfTI. If you intend "any NIfTI", test for
> non-zero or for `1 || 2`.

> [!gotcha] No existence or content check
> The file is never opened; the test is purely on the name. `isnifti
> /nope.nii` returns `1`, and a real NIfTI under a non-standard name returns `0`.

## Error Compensation and Guard Rails

The sole guard rail is the argument-count check: anything other than exactly one
argument prints the usage line and exits `255`
([`scripts/isnifti:28-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti#L28-L31)). There is no compensation for
nonexistent files or mismatched contents — the test is intentionally lexical.

## Related Tools

- [[isanalyze]] — the sister predicate for ANALYZE (`.img`); the two are usually called together, as in [[mris_preproc]].
- [[is-surface]] — predicate that decides whether a file is a volume-encoded surface, but by reading header geometry via [[mri_info]] rather than by extension.
- [[IsLTA]] — predicate for transform files that actually parses the file (via [[lta_convert]]) instead of checking the name.
- [[wiki/tools/mri_convert|mri_convert]] — the converter whose NIfTI output these predicates detect, and which they gate on/off.
- [[fsl_rigid_register]], [[fscalc.fsl]], [[mris_preproc]] — in-tree callers.

## Confidence and Gaps

**High confidence.** The script is a dozen lines with no external dependencies;
the full exit-code contract (including the distinct `.nii.gz` code) and all three
callers were read directly from
[`scripts/isnifti`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti) and the caller scripts. No
unresolved questions.

## References

- FreeSurfer source: [`scripts/isnifti`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isnifti) (v8.2.0).
- Callers: [`scripts/mris_preproc:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L140), [`scripts/fsl_rigid_register:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_rigid_register#L93), [`scripts/fscalc.fsl:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fscalc.fsl#L140).
- NIfTI-1 format: Neuroimaging Informatics Technology Initiative.
