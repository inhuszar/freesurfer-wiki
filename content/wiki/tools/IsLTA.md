---
title: "IsLTA"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/IsLTA"
families: []                     # standalone transform-type predicate
recon_all_stage: null
related:
  - "[[lta_convert]]"
  - "[[lta-format]]"
  - "[[bbregister]]"
  - "[[reg2subject]]"
  - "[[rbbr]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - file-type
  - predicate
  - registration
  - lta
  - transforms
---

# IsLTA

## Summary

`IsLTA` is a shell predicate that tests whether a registration/transform file is
in [LTA (Linear Transform Array)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA) format. Unlike the
extension-based [[isanalyze]]/[[isnifti]], it does **not** trust the filename: it
actually tries to parse the file by running [[lta_convert]] on it and watching
whether the conversion succeeds. It prints `1` if the file is an LTA and `0` if it
is not (e.g. a `register.dat` / FSL `.mat` / other format). The verdict is on
**stdout** (and optionally an output file), and — unlike the `is*` extension
predicates — the **process exit status is always `0`** on a successful run. It is
used by the registration scripts ([[bbregister]], [[reg2subject]], [[rbbr]]) to
decide how to treat a user-supplied initial-registration file.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/IsLTA`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA)
- **Binary/script location:** `$FREESURFER_HOME/bin/IsLTA`
- **External tools called:** [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L36) (the parse attempt) and `fs_temp_file` (to make a scratch output path). It also sources `$FREESURFER_HOME/sources.csh` ([`scripts/IsLTA:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L27)).

## Purpose and Context

FreeSurfer accepts initial registrations in more than one format — chiefly the
modern [[lta-format|LTA]] and the legacy `register.dat`. Scripts that take an
"init reg" argument must branch on which one they got, because the two are read
and combined differently. The filename is not a reliable signal (an `.lta` file
might actually be a register.dat, or vice versa), so `IsLTA` answers the question
**by content**: it attempts to load the file as an LTA with [[lta_convert]] and
reports success or failure.

The canonical pattern is in [[reg2subject]]
([`scripts/reg2subject:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L37-L38)):

```tcsh
set IsLTA = `IsLTA --r $regfile`
if($IsLTA) then
  ...  # treat $regfile as an LTA
endif
```

[[bbregister]] uses the `--o` output-file form and then reads the file back
([`scripts/bbregister:300-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L300-L303)), and [[rbbr]] uses the
stdout-capture form ([`scripts/rbbr:125-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L125-L127)). In all three the
value `1`/`0` printed by `IsLTA` is what drives the branch — the process exit
status is ignored.

> [!gotcha] Content-based, not extension-based
> `IsLTA` is the odd one out among the FreeSurfer file-type predicates: it parses
> the file rather than inspecting its name. A file called `init.lta` that is
> really a register.dat will be reported `0`; a correctly-formatted LTA with no
> extension will be reported `1`. This is more robust than [[isanalyze]] /
> [[isnifti]] but also slower (it spawns [[lta_convert]]) and depends on what
> [[lta_convert]] is able to read.

## Inputs

### Required Inputs

- **`--r` / `--reg` / `--lta` `<file>`** — the candidate registration/transform
  file to test ([`scripts/IsLTA:69-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L69-L78)). The file **must exist**; if
  it does not, `IsLTA` prints an error and exits `1`
  ([`scripts/IsLTA:74-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L74-L77)). This is the only required argument
  ([`scripts/IsLTA:100-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L100-L103)).

### Input Assumptions

> [!assumption] "LTA" means "loadable by lta_convert as an LTA"
> The definition of "is an LTA" is operational: the file is an LTA **iff**
> `lta_convert --inlta <file> --outlta <tmp>` exits with status `0`
> ([`scripts/IsLTA:36-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L36-L43)). Whatever [[lta_convert]] accepts as an
> input LTA is, by definition, an LTA here. Other formats (register.dat, FSL
> `.mat`, MNI `.xfm`, ITK) make `--inlta` fail and are reported as not-LTA.

## Outputs

### Files Created

- **stdout:** a single line, `1` (is an LTA) or `0` (is not)
  ([`scripts/IsLTA:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L44)).
- **`--o <outfile>`** *(optional):* the same `1`/`0` value is additionally written
  to this file ([`scripts/IsLTA:45-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L45-L47)).
- A temporary `.lta` file is created by `fs_temp_file` and **removed** before exit
  ([`scripts/IsLTA:35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L35), [`:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L48)); it is not a user-visible
  output.

### Output Specifications — the output / exit-code contract

The **answer is on stdout** (and/or `--o`), *not* in the exit code:

| stdout value | Meaning |
|--------------|---------|
| `1` | The file parses as an LTA (`lta_convert` succeeded). |
| `0` | The file does not parse as an LTA. |

Exit-status behaviour:

| Exit status | Meaning |
|-------------|---------|
| `0` | Normal completion — a `1` or `0` was printed (regardless of which) ([`scripts/IsLTA:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L49)). |
| `1` | Argument/usage error: no args ([`scripts/IsLTA:15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L15)), `-help` ([`:123-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L123-L126)), missing/unknown flag, or the reg file does not exist ([`:74-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L74-L77), [`:100-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L100-L103)). |
| `0` | `-version` prints the version string and exits `0` ([`:21-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L21-L25)). |

> [!gotcha] Read the stdout value, not the exit status
> A successful `IsLTA` run **always exits `0`**, whether the file is an LTA or
> not. The yes/no answer is the `1`/`0` it *prints*. This is the opposite
> convention from [[isanalyze]]/[[isnifti]], which encode the answer in the exit
> code. The in-tree callers all capture stdout (``set x = `IsLTA --r f` `` or
> ``--o file`` + ``cat``) and never branch on `$status`.

## Mathematical Foundations

None in this script. `IsLTA` performs no arithmetic; it delegates the entire
decision to [[lta_convert]], which contains the LTA reader. The transform algebra
(LTA structure, coordinate systems, `vox2vox`/`ras2ras` types) lives there and in
the underlying transform library.

> [!internal] The actual parsing lives in lta_convert / the transform library
> "Is this an LTA?" is answered by whether `lta_convert --inlta` succeeds. The LTA
> file structure and its type semantics are documented in [[lta-format]]; the
> reader implementation is in [[lta_convert]] and the shared transform-I/O code.

## Configuration Options

### Complete Flag Reference

Flags are parsed in the `parse_args` loop
([`scripts/IsLTA:56-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L56-L92)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--r`<br>`--reg`<br>`--lta` | string | *(required)* | The candidate transform file to test. Must exist, else error + exit `1` ([`scripts/IsLTA:69-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L69-L78)). The three spellings are exact synonyms. |
| `--o` | string | *(none)* | Also write the `1`/`0` result to this output file, in addition to stdout ([`scripts/IsLTA:64-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L64-L67), [`:45-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L45-L47)). |
| `--debug` | bool | off | Turn on shell tracing (`set echo`, `verbose`) ([`scripts/IsLTA:80-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L80-L83)). |
| `-help` | bool | — | Print usage + the help text and exit `1` ([`scripts/IsLTA:16-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L16-L20), [`:123-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L123-L126)). |
| `-version` | bool | — | Print the version string (`IsLTA 8.2.0`) and exit `0` ([`scripts/IsLTA:21-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L21-L25)). |

Any unrecognised flag prints `ERROR: Flag <flag> unrecognized.` and exits `1`
([`scripts/IsLTA:85-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L85-L89)).

### Configuration Interactions

- `--o` is purely additive: it duplicates the stdout value to a file and does not
  change the stdout output or the exit status. Callers like [[bbregister]] use it
  to redirect the answer into a temp file they then `cat`
  ([`scripts/bbregister:300-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L300-L302)); callers like [[reg2subject]]
  skip `--o` and capture stdout directly.
- `--r`/`--reg`/`--lta` are aliases for the **same** variable; passing more than
  one simply keeps the last.

> [!gotcha] `-version` short-circuits before the file test
> Because the `-version` check happens at the top
> ([`scripts/IsLTA:21-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L21-L25)), `IsLTA --r foo.lta -version` prints the
> version and exits `0` **without** testing `foo.lta`. Likewise `-help` exits
> early. Use these flags alone.

## Typical Use Cases

### Use Case 1: Branch on init-reg type (stdout capture)

```tcsh
# reg2subject idiom
set IsLTA = `IsLTA --r $regfile`
if($IsLTA) then
  # combine $regfile as an LTA
else
  # treat as register.dat
endif
```

([`scripts/reg2subject:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L37-L38))

### Use Case 2: Write the answer to a file and read it back

```tcsh
# bbregister idiom
IsLTA --r $InitReg --o $tmpdir/islta.$$ | tee -a $LF
set InitRegIsLTA = `cat $tmpdir/islta.$$`
if($InitRegIsLTA) then
  ...
endif
```

([`scripts/bbregister:300-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L300-L303))

### Use Case 3: Quick interactive check

```bash
IsLTA --r myreg.lta        # prints 1 if it is really an LTA
IsLTA --r register.dat     # prints 0
```

## Pipeline Context

`IsLTA` is a **registration-helper utility**, not a recon-all stage. It is not
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. In the v8.2.0
tree it is invoked by the boundary-based and robust registration scripts —
[[bbregister]], [[rbbr]], and [[reg2subject]] — each time the user supplies an
initial registration that could be either an LTA or a `register.dat`, so the
script can dispatch to the correct handling.

**Predecessor:** a user-supplied init-reg file of unknown format → **IsLTA** →
**Successor:** LTA-handling vs. register.dat-handling branch inside the calling
registration script (which then runs the actual [[bbregister]]/[[rbbr]]
registration).

## Gotchas and Caveats

> [!gotcha] The answer is printed, the exit code is (almost) always 0
> See [Output Specifications](#output-specifications--the-output--exit-code-contract).
> Branch on the printed `1`/`0`, not on `$status`. The only ways `IsLTA` exits
> non-zero are usage/argument errors and a missing input file — never as a way of
> saying "not an LTA".

> [!gotcha] Decision is only as good as lta_convert
> Because "is-LTA" is defined as "`lta_convert --inlta` succeeds", any file that
> [[lta_convert]] happens to accept on its `--inlta` path is reported as an LTA,
> and any genuine LTA that `lta_convert` cannot read (e.g. corrupt) is reported as
> not-LTA. The verdict tracks `lta_convert`'s reader, not a formal LTA grammar.

> [!gotcha] All `lta_convert` output is silenced
> The parse attempt is run as `$cmd >& /dev/null`
> ([`scripts/IsLTA:36-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L36-L37)), so any diagnostic from a malformed
> file is hidden. If you are debugging *why* a file is reported `0`, run
> `lta_convert --inlta <file> --outlta /tmp/x.lta` yourself to see the error.

## Error Compensation and Guard Rails

- **Missing input file** is caught up front and reported (`ERROR: cannot find
  <file>`), exiting `1` ([`scripts/IsLTA:74-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L74-L77)).
- **No `--r`** given → `ERROR: must spec intput reg/lta file`, exit `1`
  ([`scripts/IsLTA:100-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L100-L103)) (the typo "intput" is in the source).
- The scratch LTA from the parse attempt is always cleaned up with `rm -f`
  ([`scripts/IsLTA:48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L48)).
- There is no compensation for an ambiguous or partially-valid file; the binary
  yes/no is whatever [[lta_convert]] returns.

## Related Tools

- [[lta_convert]] — performs the actual parse; `IsLTA` is a thin success/failure wrapper around its `--inlta` reader.
- [[lta-format]] — the LTA file-format specification this predicate detects.
- [[bbregister]], [[rbbr]], [[reg2subject]] — in-tree callers that use `IsLTA` to branch on init-registration format.
- [[isanalyze]], [[isnifti]] — sibling file-type predicates, but extension-based and exit-code-valued (the opposite contract).

## Confidence and Gaps

**High confidence.** The script is short and self-explanatory; the complete flag
set, the stdout-vs-exit-code contract, and all three callers were read directly
from [`scripts/IsLTA`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA) and the caller scripts. The
operational definition of "LTA" (lta_convert success) is explicit in the source.
No unresolved questions.

## References

- FreeSurfer source: [`scripts/IsLTA`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA) (v8.2.0).
- Callers: [`scripts/reg2subject:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L37), [`scripts/bbregister:300`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L300), [`scripts/rbbr:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L125).
- Built-in help: `IsLTA -help` (the `BEGINHELP` block, [`scripts/IsLTA:129-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA#L129-L135)).
