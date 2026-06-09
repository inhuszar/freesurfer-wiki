---
title: "fsfget"
type: tool
fs_version: "8.2.0"
source_language: "Tcl"          # tclsh
source_files:
  - "scripts/fsfget"
families: []                     # standalone FSL/FEAT helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[feat2surf]]"
  - "[[reg-feat2anat]]"
  - "[[aparc2feat]]"
  - "[[aseg2feat]]"
  - "[[feat2segstats]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "fsfget evaluates the .fsf as a Tcl script via `source`; the full set of fmri() fields it can return is therefore whatever FSL/FEAT writes into that file for the FEAT version in use — only the commonly used fields are enumerated here."
  - "The large commented-out block at the end of the script (a former multi-field dump writing to $fp) is dead code and does not run; behaviour is fully described by the active top portion."
tags:
  - fsl
  - feat
  - fmri
  - fsfast
  - utility
  - parsing
---

# fsfget

## Summary

`fsfget` is a tiny Tcl utility that **extracts a single named parameter from an
FSL/FEAT `design.fsf` analysis-design file** and prints its value to stdout.
FEAT design files are themselves Tcl scripts that populate an `fmri()` array (and
a `feat_files()` array); `fsfget` simply `source`s the file and echoes the
requested element. It is the small "getter" that FreeSurfer's FSFAST↔FSL FEAT
bridge scripts use to read FEAT design metadata — number of explanatory
variables (EVs), contrast names, TR, smoothing, etc. — without parsing the file
by hand.

## Source Information

- **Language:** Tcl (`#!/usr/bin/env tclsh`)
- **Source file:** [`scripts/fsfget`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/fsfget`
- **External tools invoked:** none — it is self-contained Tcl. The only "engine"
  is the Tcl `source` command applied to the design file
  ([`scripts/fsfget:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L53)).

## Purpose and Context

FSL's FEAT (fMRI Expert Analysis Tool) stores an entire first- or higher-level
analysis design in a single `design.fsf` text file. That file is valid Tcl: it
is a long list of `set fmri(<field>) <value>` statements (plus
`set feat_files(<n>) <path>` for the input runs). Any program that wants to know,
say, how many contrasts the design has, or the name of the third contrast, can
just evaluate the file in a Tcl interpreter and read the array.

`fsfget` packages exactly that one-liner into a reusable command. FreeSurfer
ships it because its **FSFAST FEAT-bridge** tools — which let you run an FSL FEAT
analysis and then pull the results onto the FreeSurfer cortical surface — need to
read FEAT design fields from shell/tcsh scripts. In v8.2.0 it is called by
`fsfast/bin/fsfeat` and `fsfast/bin/fsfeatffx` to obtain the EV count
(`evs_orig`) and the real-contrast names (`conname_real.N`) that label the
output statistics.

> [!gotcha] It is an FSL/FEAT reader, not an FSFAST reader
> Despite living next to the FSFAST tooling, `fsfget` parses **FSL FEAT**
> `design.fsf` files (the `fmri()`/`feat_files()` Tcl arrays), not FreeSurfer
> FSFAST analysis configs. The "fsf" here is FSL's *feat setup file*. It is used
> by FSFAST bridge scripts to consume FEAT output, but the file it reads is FSL's.

## Inputs

### Required Inputs

Exactly **two positional arguments** ([`scripts/fsfget:40-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L40-L46)):

1. **`design.fsf`** — path to an FSL/FEAT design file. It must exist (checked at
   [`scripts/fsfget:49-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L49-L52)) and must be valid Tcl, because it is executed with
   `source`.
2. **`paramname`** — the name of the parameter to print. This is normally the
   key into the `fmri()` array (e.g. `tr`, `smooth`, `evs_orig`, `ncon_real`,
   `conname_real.1`), but two names are handled specially (see below).

### Input Assumptions

> [!assumption] The .fsf file is trusted, executable Tcl
> `fsfget` runs `source $fsf`, so the **entire** design file is executed as Tcl in
> the current interpreter. This is fine for genuine FEAT designs (which contain
> only `set` statements) but means the file is trusted code — do not point
> `fsfget` at an untrusted `.fsf`. It also means any field FEAT did **not** write
> is simply undefined, and querying it raises a Tcl error and a non-zero exit.

## Outputs

### Files Created

**None.** `fsfget` writes a single value (or, for `feat_files`, one path per line)
to **stdout** and creates no files.

| What is printed | When |
|-----------------|------|
| The value of `fmri(<paramname>)` | for any ordinary parameter ([`scripts/fsfget:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L74)) |
| Every input run path, one per line | when `paramname` is `feat_files` ([`scripts/fsfget:56-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L56-L65)) |
| The first input run path | when `paramname` is `feat_file1` ([`scripts/fsfget:66-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L66-L70)) |

### Output Specifications

Plain text on stdout; the value's type is whatever FEAT stored (an integer, a
float, a quoted string such as a contrast name, or a path). The script exits `0`
on success and `1` on a usage error or a missing file; an undefined `fmri()`
field produces a Tcl runtime error with a non-zero exit.

## Mathematical Foundations

None — `fsfget` performs no computation. It evaluates a Tcl design file and
echoes one array element.

## Configuration Options

### Complete Flag Reference

`fsfget` has **no option flags**; it takes two fixed positional arguments
([`scripts/fsfget:40-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L40-L46)).

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `design.fsf` | path (positional, **required**) | — | FSL/FEAT design file to read. Must exist and be valid Tcl (it is `source`d). |
| `paramname` | string (positional, **required**) | — | Parameter to print. Either a key into `fmri()` (e.g. `tr`, `evs_orig`, `conname_real.1`) or one of the two special names below. Wrong argument count prints `Usage: fsfget design.fsf paramname` and exits 1. |

**Special `paramname` values** (handled before the generic `fmri()` lookup):

| `paramname` | Returns |
|-------------|---------|
| `feat_files` | all input run volumes, one per line (iterates `feat_files(1..N)`). |
| `feat_file1` | the first input run volume only (`feat_files(1)`). |

**Commonly queried `fmri()` fields** (documented in the script header
[`scripts/fsfget:8-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L8-L23); the exact set depends on the FEAT version that wrote the
file):

| Field | Meaning |
|-------|---------|
| `version` | FEAT design version. |
| `tr` | repetition time (s). |
| `smooth` | spatial smoothing FWHM (mm). |
| `st` | slice-timing flag (0/1). |
| `temphp_yn`, `paradigm_hp` | high-pass-filter flag and its cutoff. |
| `evs_orig`, `evs_real` | number of original / real EVs (regressors). |
| `ncon_orig`, `ncon_real` | number of original / real contrasts. |
| `nftests_orig`, `nftests_real` | number of F-tests. |
| `evtitle<N>` | title of EV *N*. |
| `custom<N>` | EV *N*'s schedule (timing) file. |
| `conname_real.<N>`, `conname_orig.<N>` | name of real / orig contrast *N* (e.g. `"nov-v-fix"`). |

### Configuration Interactions

> [!gotcha] `feat_files`/`feat_file1` bypass the `fmri()` lookup
> These two names are matched *before* the generic case and read the
> `feat_files()` array instead of `fmri()` ([`scripts/fsfget:56-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L56-L70)). Every
> other `paramname` — including any other `feat*`-looking name — falls through to
> `puts "$fmri($param)"` and will error if it is not an `fmri()` key.

> [!gotcha] Dotted contrast indices are literal keys
> Contrast names use a dotted index: query `conname_real.1`, **not**
> `conname_real1` or `conname_real(1)`. The whole token is passed straight into
> `$fmri(<token>)`, so it must match the `set fmri(conname_real.1) …` key exactly
> as FEAT wrote it.

## Typical Use Cases

### 1. Read a scalar design parameter

```bash
# How many regressors (original EVs) does this design have?
fsfget /path/to/feat/design.fsf evs_orig

# Repetition time and smoothing FWHM
fsfget design.fsf tr
fsfget design.fsf smooth
```

### 2. Get a contrast name by index

```bash
# Name of the 3rd real contrast (as fsfeat/fsfeatffx do to label z-stats)
fsfget design.fsf conname_real.3
```

### 3. List the input runs

```bash
# All input run volumes, one per line
fsfget design.fsf feat_files
# Just the first input run
fsfget design.fsf feat_file1
```

### 4. Drive a loop from a shell script

```bash
# Iterate over every real contrast, pulling its name (tcsh, as in fsfeat)
set ncon = `fsfget design.fsf ncon_real`
@ n = 1
while ( $n <= $ncon )
  set name = `fsfget design.fsf conname_real.$n`
  echo "contrast $n: $name"
  @ n++
end
```

## Pipeline Context

`fsfget` is a **leaf utility** for the FreeSurfer↔FSL FEAT bridge. It is **not**
part of [[wiki/pipelines/recon-all|recon-all]] or trac-all. Its callers in
v8.2.0 are the FSFAST FEAT wrappers `fsfast/bin/fsfeat` (reads `evs_orig` and the
`conname_real.N` labels) and `fsfast/bin/fsfeatffx` (reads `conname_real.N` for
the fixed-effects combine).

**Predecessor:** an FSL FEAT analysis that produced a `design.fsf` →
**fsfget** (reads design fields) → **Successors:** the FEAT-bridge tools that map
FEAT results to the FreeSurfer surface — [[feat2surf]], [[reg-feat2anat]],
[[aparc2feat]], [[aseg2feat]], and [[feat2segstats]] — which use the metadata
(contrast names, EV/contrast counts) to label and organise their outputs.

## Gotchas and Caveats

> [!gotcha] Sourcing the design file executes it
> Because parsing is done by `source`, a malformed or malicious `.fsf` runs
> arbitrary Tcl. For normal FEAT files this is harmless, but it is the reason
> `fsfget` needs no parser and also why a syntactically broken design file fails
> with a confusing Tcl error rather than a clean message.

> [!gotcha] Undefined field → Tcl error, not empty output
> Querying a parameter the design did not set (e.g. a field absent in that FEAT
> version) does not print an empty string; it raises `can't read "fmri(...)"` and
> exits non-zero. Check the exit status in scripts.

> [!gotcha] Large trailing block is dead code
> Everything after the `exit 0` at [`scripts/fsfget:76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L76) — a commented and
> unreachable multi-field dump that writes to a file handle `$fp` — never
> executes. The script's real behaviour is entirely the ~40 active lines above
> it. The block documents many additional `fmri()` fields by name, which is
> useful as a reference for valid `paramname` values.

## Error Compensation and Guard Rails

- **Argument-count check.** Anything other than exactly two arguments prints the
  usage line and exits 1 ([`scripts/fsfget:40-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L40-L43)).
- **File-existence check.** A missing `design.fsf` is reported as
  "ERROR: file <fsf> does not exist" with exit 1 *before* sourcing
  ([`scripts/fsfget:49-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget#L49-L52)).
- **No silent defaults.** There is no fallback value for an unknown parameter; an
  undefined field surfaces as a Tcl error rather than being masked, so callers see
  a non-zero exit.

## Related Tools

- [[feat2surf]] — samples FEAT first-level results onto the FreeSurfer surface; a primary consumer of FEAT designs read via fsfget.
- [[reg-feat2anat]] — registers a FEAT analysis to the subject's FreeSurfer anatomical.
- [[aparc2feat]], [[aseg2feat]] — bring FreeSurfer cortical/subcortical parcellations into FEAT space.
- [[feat2segstats]] — extracts ROI statistics from FEAT outputs using FreeSurfer segmentations.
- `fsfeat` / `fsfeatffx` *(FSFAST bin, no wiki page yet)* — the FEAT-bridge driver scripts that call `fsfget` to read EV counts and contrast names.

## Confidence and Gaps

**High confidence:** the two-argument interface, the `source`-based evaluation,
the `feat_files`/`feat_file1` special cases, the generic `fmri()` lookup, the
error/usage handling, and the fact that the trailing block is dead code — all
read directly from [`scripts/fsfget`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget), and the real-world usage confirmed
from `fsfast/bin/fsfeat` and `fsfast/bin/fsfeatffx`.

> [!gap] Full field vocabulary is FEAT-version-dependent
> The complete set of queryable `fmri()` keys is whatever the installed FSL/FEAT
> version writes into `design.fsf`; only the fields named in the script header and
> the (dead) trailing block are enumerated here.

## References

- FreeSurfer source: [`scripts/fsfget`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfget) (v8.2.0).
- Callers: `fsfast/bin/fsfeat`, `fsfast/bin/fsfeatffx` (FSFAST FEAT bridge).
- FSL FEAT documentation describes the `design.fsf` / `fmri()` design-file format that `fsfget` reads.
