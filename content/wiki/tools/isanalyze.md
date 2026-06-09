---
title: "isanalyze"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/isanalyze"
families: []                     # standalone file-type predicate (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[isnifti]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mris_preproc]]"
  - "[[IsLTA]]"
  - "[[is-surface]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - file-type
  - predicate
  - formats
  - analyze
---

# isanalyze

## Summary

`isanalyze` is a one-line shell predicate that tests whether a filename refers to
an [ANALYZE](https://rportal.mayo.edu/bir/ANALYZE75.pdf) image by inspecting its
**extension only**. It does not open the file or read any header bytes: it simply
asks whether the basename ends in `.img`. The answer is returned through the
**exit status**, not stdout — exit `1` if the name ends in `.img` (treated as
ANALYZE), exit `0` otherwise, and exit `255` on a usage error. It is a tiny
helper used by FreeSurfer shell scripts that need to branch on output format.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/isanalyze`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze)
- **Binary/script location:** `$FREESURFER_HOME/bin/isanalyze`
- **External tools called:** none (only the shell built-ins and `basename`). It is fully self-contained.

## Purpose and Context

FreeSurfer can write volumes in several container formats (MGH/MGZ, NIfTI,
ANALYZE). A number of wrapper scripts need to know which format an output path
implies *before* the file exists, so they can adjust their behaviour (for
example, ANALYZE stores 4D data differently and may require reshaping). Because
ANALYZE is identified in FreeSurfer purely by the `.img`/`.hdr` pair, the test
reduces to a string check on the extension. `isanalyze` packages that check as a
reusable predicate so each caller does not re-implement the `basename` logic.

It is a **purely lexical** test. A `.img` file is reported as ANALYZE even if it
does not exist and even if its contents are something else; conversely a genuine
ANALYZE volume named without the `.img` extension would not be recognised.

The canonical consumer is [[mris_preproc]], which calls `isanalyze` on its output
path and turns on reshaping if the path is ANALYZE
([`scripts/mris_preproc:133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L133)):

```tcsh
isanalyze $outpath >& /dev/null
if($status) then
  if(! $reshape) then
    set reshape = 1
    echo "INFO: output detected as analyze, turning on reshaping"
  endif
endif
```

Note the caller discards stdout/stderr and branches solely on `$status`. Because
exit `1` (is ANALYZE) and exit `255` (usage error) are both non-zero, a caller
that uses the bare `if($status)` idiom treats a missing-argument error the same
as a positive match — see [Gotchas](#gotchas-and-caveats).

## Inputs

### Required Inputs

- **Exactly one argument:** a filename (or path) to classify
  ([`scripts/isanalyze:27-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L27-L31)).
  The argument is a **string**; the file does not have to exist.

### Input Assumptions

> [!assumption] Extension is the sole signal
> `isanalyze` assumes the conventional FreeSurfer naming, where an ANALYZE volume
> is the `.img` member of an `.img`/`.hdr` pair. It performs no header inspection
> and no existence check. Anything ending in `.img` is reported as ANALYZE; a
> correctly-formatted ANALYZE volume under a different name is not.

## Outputs

### Files Created

None. `isanalyze` writes nothing to disk and prints nothing on a successful
classification — the result is communicated entirely through the **exit status**.
(On a usage error it prints the one-line usage string `isanalyze filename` to
stdout.)

### Output Specifications — the exit-code contract

| Exit status | Meaning | Triggered when |
|-------------|---------|----------------|
| `0` | **Not** ANALYZE | The basename does not end in `.img` ([`scripts/isanalyze:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L39)). |
| `1` | **Is** ANALYZE | The basename ends in `.img` ([`scripts/isanalyze:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L37)). |
| `255` | Usage error | The number of arguments is not exactly 1 ([`scripts/isanalyze:27-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L27-L30)). |

> [!gotcha] "True" is exit 1, not exit 0
> This inverts the usual Unix convention where success is `0`. Here a *positive*
> result (the file **is** ANALYZE) is signalled by exit **1**, and a *negative*
> result by exit **0**. Read the test as "exit status = is-analyze flag", not as
> "exit status = success/failure". The header comment in the source states this
> explicitly ([`scripts/isanalyze:6-9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L6-L9)).

## Mathematical Foundations

None — `isanalyze` performs no computation beyond string manipulation. The whole
test is the equivalence of two strings: the basename, and the basename with any
`.img` suffix stripped and re-appended. It works by computing
`base = basename($fname .img)` (which removes a trailing `.img` if present),
re-forming `newfname = $base.img`, and comparing `newfname` to the original
basename ([`scripts/isanalyze:34-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L34-L37)). They are equal **iff** the
original name already ended in `.img`.

## Configuration Options

### Complete Flag Reference

`isanalyze` has **no flags**. It takes exactly one positional argument (the
filename) and no options.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(none)* | — | — | The script accepts one positional filename argument and nothing else. There is no `-help`/`-version` handling: running it with zero or more than one argument prints the usage line and exits `255` ([`scripts/isanalyze:27-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L27-L30)). |

### Configuration Interactions

None — there are no flags to interact.

## Typical Use Cases

### Use Case 1: Branch on output format in a script

```tcsh
# Turn on a format-specific code path if the output is ANALYZE.
isanalyze $outpath >& /dev/null
if($status) then
  # exit status non-zero => name ends in .img (treat as ANALYZE)
  set reshape = 1
endif
```

This is exactly the [[mris_preproc]] idiom
([`scripts/mris_preproc:132-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L132-L139)).

### Use Case 2: Quick interactive check

```bash
isanalyze brain.img ; echo $?   # prints 1  (is ANALYZE)
isanalyze brain.nii ; echo $?   # prints 0  (not ANALYZE)
isanalyze            ; echo $?   # prints "isanalyze filename" then 255
```

## Pipeline Context

`isanalyze` is a **low-level shell utility**, not a processing stage. It is not
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Its caller in the
v8.2.0 tree is [[mris_preproc]], which pairs it with [[isnifti]] to decide
whether to enable output reshaping. It typically runs *before* a
[[wiki/tools/mri_convert|mri_convert]] call so the caller can adapt to the chosen
container format.

**Predecessor:** a script choosing an output path → **isanalyze** → **Successor:**
format-dependent logic in the calling script (e.g. reshaping, or a
[[wiki/tools/mri_convert|mri_convert]] invocation).

## Gotchas and Caveats

> [!gotcha] Usage error (255) is non-zero and looks like a positive match
> Callers that branch on the bare `if($status)` idiom — true for any non-zero
> exit — will treat the exit-`255` usage error (wrong number of arguments) the
> same as exit-`1` ("is ANALYZE"). Only the value `0` unambiguously means "not
> ANALYZE". Pass exactly one argument to avoid the ambiguity.

> [!gotcha] No existence or content check
> The file is never opened. `isanalyze /does/not/exist.img` still returns `1`,
> and a real ANALYZE volume stored without the `.img` extension returns `0`. This
> is by design: the helper classifies the *name*, not the *data*.

> [!gotcha] Only `.img` is recognised, not `.hdr`
> ANALYZE volumes come as an `.img`/`.hdr` pair, but `isanalyze` keys solely on
> `.img`. Passing the `.hdr` member returns `0` (not ANALYZE).

## Error Compensation and Guard Rails

The only guard rail is the argument-count check: anything other than exactly one
argument prints the usage line and exits `255`
([`scripts/isanalyze:27-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze#L27-L30)). There is no compensation for
nonexistent files or mismatched contents — the test is intentionally lexical.

## Related Tools

- [[isnifti]] — the sister predicate for NIfTI (`.nii`/`.nii.gz`); the two are almost always used together, as in [[mris_preproc]].
- [[is-surface]] — analogous predicate that decides whether a file is a volume-encoded surface, but by reading header geometry via [[mri_info]] rather than by extension.
- [[IsLTA]] — analogous predicate for transform files, which actually parses the file (via [[lta_convert]]) instead of checking the name.
- [[wiki/tools/mri_convert|mri_convert]] — the converter whose output format these predicates classify.
- [[mris_preproc]] — the in-tree caller that uses `isanalyze`/`isnifti` to toggle reshaping.

## Confidence and Gaps

**High confidence.** The script is nine lines of logic with no external
dependencies; the complete exit-code contract and the single caller were read
directly from [`scripts/isanalyze`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze) and
[`scripts/mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc). There are no unresolved questions.

## References

- FreeSurfer source: [`scripts/isanalyze`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isanalyze) (v8.2.0).
- Caller: [`scripts/mris_preproc:132-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L132-L139).
- ANALYZE 7.5 format: Mayo Clinic Biomedical Imaging Resource specification.
