---
title: "fsr-getxopts"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsr-getxopts"
families: ["fsr-*"]
recon_all_stage: null
related:
  - "[[fsr-checkxopts]]"
  - "[[fsr-mergexopts]]"
  - "[[fsr-coreg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/samseg|samseg]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - expert-options
  - xopts
  - fsr
  - recon-all
  - configuration
---

# fsr-getxopts

## Summary

`fsr-getxopts` is the tiny but pervasive lookup utility that powers FreeSurfer's
**expert-options ("xopts")** mechanism. Given a *key* (the name of a command,
e.g. `mri_em_register` or `fsr-coreg-mri_coreg`) and one or more expert-options
files, it scans each file for a line whose **first whitespace-delimited token**
equals the key and echoes back **the remaining tokens on that line** — i.e. the
extra command-line arguments the caller should append when it runs that command.
[[wiki/pipelines/recon-all|recon-all]], [[fsr-coreg]], `mideface`, and many
other scripts call it once per sub-command so a user can inject custom flags into
deeply nested tool invocations without editing any FreeSurfer code.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsr-getxopts`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsr-getxopts`
- **Calls no other FreeSurfer tools** — pure `grep`/`awk` text extraction.

## Purpose and Context

An "expert options file" lets a user override the default arguments of the
individual programs that a FreeSurfer pipeline runs internally. Each line is of
the form:

```
<command-key> <arg1> <arg2> ...
```

For example, an xopts file containing:

```
mri_em_register -p .5
```

makes [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all) append `-p .5` to its internal
`mri_em_register` call. `fsr-getxopts` is the single function every pipeline uses
to perform that lookup. The pattern in the calling script is always:

```tcsh
set xopts = `fsr-getxopts <key> <xoptsfile1> <xoptsfile2> ...`
set cmd = ($cmd $xopts)
```

It is **not** part of any single recon-all stage; it is a cross-cutting helper
invoked dozens of times throughout the stream (see [Pipeline
Context](#pipeline-context)). Its companion [[fsr-checkxopts]] validates a file
before use, and [[fsr-mergexopts]] combines several xopts files into one.

> [!gotcha] The "key" is usually the program name, but not always
> recon-all uses arbitrary stage labels as keys, not just executable names —
> e.g. `talairach`, `talairach_avi`, `rca-base-init`, `synthstrip`, `samseg`,
> `samseg2recon`. [[fsr-coreg]] uses **compound** keys of the form
> `fsr-coreg-mri_coreg`, `fsr-coreg-mri_robust_template`, etc., so that the same
> tool can be tuned differently depending on which script calls it. The key is
> just the literal first token on the xopts line; it must match exactly.

## Inputs

### Required Inputs

- **`key`** (positional arg 1) — the command/stage label to look up.
- **One or more xopts files** (positional args 2…N) — plain-text expert-options
  files. Each must exist; a missing file is a hard error
  ([`scripts/fsr-getxopts:55-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L55-L58)).

### Input Assumptions

> [!assumption] One line per command, `#` marks a comment anywhere on the line
> The lookup uses `grep -v \#` to **discard every line that contains a `#`
> character, regardless of position** ([`scripts/fsr-getxopts:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L68)), then
> matches `$1 == key` with awk. A file **should not** contain the same key
> twice; if it does, the options are concatenated in an order that the header
> comment warns "will not properly generate the options (but not crash)"
> ([`scripts/fsr-getxopts:13-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L13-L16)). Use [[fsr-checkxopts]] to detect
> duplicate keys before running.

## Outputs

### Files Created

None. `fsr-getxopts` writes **only to standard output** — the space-separated
list of options for the matched key (or an empty string if no file contains the
key). This is captured by the caller via backticks. Nothing is written to disk.

### Output Specifications

- If **fewer than two arguments** are supplied, it exits 0 **silently** with no
  output ([`scripts/fsr-getxopts:42-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L42-L46)). The header comment explains why:
  printing anything would corrupt the command line of the calling recon-all
  stage.
- If multiple files are given and several of them contain the key, the matched
  option strings are **accumulated across all files, in command-line order**
  ([`scripts/fsr-getxopts:76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L76)).

## Mathematical Foundations

None — this is pure text extraction (`grep -v \#` followed by an awk
first-field match). There is no numerical computation.

## Configuration Options

### Complete Flag Reference

`fsr-getxopts` takes **positional arguments only**; it has no `--`-style flags
(not even `--help`, which simply falls through the arity guard and produces no
output). The argument vector is interpreted positionally
([`scripts/fsr-getxopts:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L48-L49)).

| Positional | Type | Default | Description |
|------------|------|---------|-------------|
| `key` (arg 1) | string | *(required)* | The command/stage label to match against the first token of each non-comment line. |
| `xoptsfile…` (args 2…N) | string(s) | *(required)* | One or more expert-options files to search, scanned left to right. Options from every file that contains the key are concatenated. |

> [!contradiction] Header USAGE shows two args, but multi-file is the norm
> The top-of-file `USAGE` comment reads `fsr-getxopts key xoptsfile`
> ([`scripts/fsr-getxopts:6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L6)), implying a single file. The code accepts and
> iterates over **any number** of files ([`scripts/fsr-getxopts:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L53)), and
> recon-all/fsr-coreg routinely pass three (`$V8XoptsFile $GlobXOptsFile
> $XOptsFile`). Code is authoritative: multiple files are supported.

### Configuration Interactions

Because the **order of files on the command line determines the order of the
emitted options**, the caller controls precedence by ordering. recon-all and
[[fsr-coreg]] always pass them as:

```
fsr-getxopts <key> $V8XoptsFile $GlobXOptsFile $XOptsFile
```

so the built-in v8 defaults come first, the per-`$SUBJECTS_DIR` global file
second, and the user's `--expert` file last. Whether "last wins" depends on the
downstream tool's own argument parser (most FreeSurfer tools let a later flag
override an earlier one), **not** on `fsr-getxopts` itself, which simply
concatenates.

## Typical Use Cases

### 1. The canonical example from the header

```bash
# expert.opts contains:  mri_em_register -p .5
fsr-getxopts mri_em_register expert.opts
# prints:  -p .5
```

### 2. As used inside fsr-coreg (compound key, three files)

```bash
set xopts = `fsr-getxopts fsr-coreg-mri_coreg $V8XoptsFile $GlobXOptsFile $XOptsFile`
set cmd   = (mri_coreg --mov $movvol --ref $refvol --reg $ltaauto --threads $threads $xopts)
```

### 3. As used inside recon-all (stage label as key)

```bash
set xopts = `fsr-getxopts mri_normalize $V8XoptsFile $GlobXOptsFile $XOptsFile`
```

## Pipeline Context

`fsr-getxopts` is a **library helper**, not a pipeline stage, so it has no
`recon_all_stage`. It is, however, the backbone of expert-option handling across
the FreeSurfer 8 script suite. Representative callers:

- [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all) — dozens of calls, one per internal tool/stage
  (`recon-all`, `talairach`, `mri_normalize`, `mri_ca_label`, `samseg`,
  `samseg2recon`, `synthstrip`, `synthseg`, `rca-base-init`, …), each passing
  `$V8XoptsFile $GlobXOptsFile $XOptsFile` ([`scripts/recon-all:440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L440)).
- [[fsr-coreg]] — keys `fsr-coreg-mri_robust_template`, `fsr-coreg-mri_coreg`,
  `fsr-coreg-mri_concatenate_lta`, `fsr-coreg-mri_vol2vol`
  ([`scripts/fsr-coreg:141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L141)).
- [[fsr-longpreproc]] — key `longreg-robustreg` ([`scripts/fsr-longpreproc:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L128)).
- `mideface`, `rca-surfreg`, `label-cortex`, `rca-long-tp-init`,
  `recon-all.v6.hires` — all use the same pattern.

**Predecessor:** an expert-options file (written by the user, or produced by
[[fsr-mergexopts]], and validated by [[fsr-checkxopts]]) → **fsr-getxopts** →
**Successor:** the option string is spliced into the next tool's command line.

## Gotchas and Caveats

> [!gotcha] Any line containing `#` is dropped entirely
> The comment filter is `grep -v \#`, which removes the **whole line** if it
> contains `#` anywhere ([`scripts/fsr-getxopts:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L68)). You therefore cannot
> put a trailing comment on an active option line, and you cannot pass any value
> that contains `#` (e.g. a hex colour or a filename with `#`).

> [!gotcha] Silent no-output on too-few args is intentional
> With `<2` args the script exits 0 and prints **nothing** — by design, so a
> recon-all stage that calls it without a configured xopts file is not corrupted
> by stray text ([`scripts/fsr-getxopts:42-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L42-L46)). Do not rely on it to
> report "key not found".

> [!gotcha] Multi-file behaviour changed on 2024-10-16
> The header notes that before 2024-10-16 it returned options from **only the
> first** matching file and used a looser `grep` match; it now uses an exact
> `$1 == key` awk match and **accumulates** matches from all files
> ([`scripts/fsr-getxopts:60-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L60-L77)). Behaviour across FreeSurfer versions may
> therefore differ.

## Error Compensation and Guard Rails

- **Missing file → hard error** (exit 1) ([`scripts/fsr-getxopts:55-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L55-L58)).
- **Key absent from a file → skip that file** and continue
  ([`scripts/fsr-getxopts:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts#L71)).
- **Duplicate keys in one file** are not caught here (no crash, possibly wrong
  output); that check belongs to [[fsr-checkxopts]].

## Related Tools

- [[fsr-checkxopts]] — validates that an xopts file has no duplicate command keys before it is used.
- [[fsr-mergexopts]] — concatenates several xopts files into a single merged file (and runs `fsr-checkxopts` on the result).
- [[fsr-coreg]] — a representative caller; uses compound keys to tune its internal `mri_coreg`/`mri_robust_template` calls.
- [[wiki/pipelines/recon-all|recon-all]] — the heaviest user; threads `$V8XoptsFile $GlobXOptsFile $XOptsFile` through every internal tool.
- [[wiki/tools/samseg|samseg]] — invoked as an xopts *key* within recon-all (and itself sits atop [[fsr-import]]/[[fsr-coreg]]).

## Confidence and Gaps

**High confidence:** the entire script is 80 lines and was read in full. The
lookup semantics, the silent-on-`<2`-args behaviour, the `#`-line filter, the
multi-file accumulation, and the calling convention were all verified against
the source and against the call sites in recon-all/fsr-coreg/fsr-longpreproc.

## References

- FreeSurfer source: [`scripts/fsr-getxopts`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-getxopts) (v8.2.0).
- Built-in v8 defaults file: `$FREESURFER_HOME/etc/global-expert-options.v8.txt`
  (the `$V8XoptsFile` passed by recon-all, [`scripts/recon-all:439`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L439)).
- Original author: Doug Greve (per the source header).
