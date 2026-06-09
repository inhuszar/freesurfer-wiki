---
title: "UpdateNeeded"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/UpdateNeeded"
families: []                     # standalone make-style timestamp utility
recon_all_stage: null
related:
  - "[[dcmunpack]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[bbregister]]"
  - "[[dt_recon]]"
  - "[[mideface]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - timestamps
  - make
  - dependency
  - predicate
---

# UpdateNeeded

## Summary

`UpdateNeeded` is a small `make`-style timestamp comparator. Given a target file
and one or more source files, it decides whether the target needs to be
regenerated — i.e. whether the target is **missing** or **older than any of its
sources**. It prints `1` if an update is needed and `0` if the target is already
up to date. It is used throughout the FreeSurfer shell pipelines (including
[[wiki/pipelines/recon-all|recon-all]] and [[dcmunpack]]) to skip expensive steps
whose outputs are already current, giving scripts a lightweight incremental-build
behaviour without a `Makefile`.

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/UpdateNeeded`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded)
- **Binary/script location:** `$FREESURFER_HOME/bin/UpdateNeeded`
- **External tools called:** only the system `test` utility (the `-nt`, "newer than", file comparison) ([`scripts/UpdateNeeded:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L32)). No FreeSurfer binaries.

## Purpose and Context

FreeSurfer's processing scripts are long and re-run often. Rather than blindly
recomputing every step, they guard each step with a freshness check: "do I need
to (re)build this output, given its inputs?" `UpdateNeeded` answers exactly that
question, mirroring the rule `make` uses — a target is rebuilt if it does not
exist or if any prerequisite is newer than it.

The canonical idiom is to capture the printed value and OR it with a global
force-rebuild flag, as in [[wiki/pipelines/recon-all|recon-all]]
([`scripts/recon-all:1656`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1656)):

```tcsh
set ud = `UpdateNeeded $synthseg $origvol`
if($ud || $ForceUpdate) then
  ...  # (re)build $synthseg from $origvol
endif
```

It is one of the most widely-used helpers in `scripts/`: callers include
[[wiki/pipelines/recon-all|recon-all]], [[dcmunpack]], [[bbregister]],
[[dt_recon]], [[mideface]], `gtmseg`, `samseg2recon`, `mri_mcadura_seg`,
`vertexvol`, `seg2recon`, and dozens more — anywhere a script wants to avoid
redoing up-to-date work.

> [!gotcha] Decision is on stdout; exit code is overloaded
> `UpdateNeeded` prints `1`/`0` to stdout (that is the answer the callers read)
> and *also* uses its **exit status** to flag a missing-source error — see
> [Output Specifications](#output-specifications--the-output--exit-code-contract).
> The two channels carry different information.

## Inputs

### Required Inputs

- **Target file** (first positional argument) — the output whose freshness is in
  question ([`scripts/UpdateNeeded:13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L13)). It need **not** exist (a
  missing target means "update needed").
- **One or more source files** (remaining positional arguments) — the
  prerequisites ([`scripts/UpdateNeeded:14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L14)). At least one source is
  required; fewer than two total arguments prints usage and exits `1`
  ([`scripts/UpdateNeeded:8-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L8-L11)).

### Input Assumptions

> [!assumption] Filesystem mtimes are meaningful and comparable
> Freshness is decided purely from modification times via `test <src> -nt
> <target>`. This assumes the clock/mtimes are sane and that "newer" implies
> "the source changed since the target was built". Copying files (which may
> preserve or reset mtimes), touching files, or clock skew across NFS mounts can
> all mislead the comparison. The tool does no content hashing.

## Outputs

### Files Created

None. The result is printed to stdout as a single line, `1` or `0`. Nothing is
written to disk.

### Output Specifications — the output / exit-code contract

The **answer is on stdout**:

| stdout value | Meaning |
|--------------|---------|
| `1` | Update needed: the target is missing, or some source is newer than the target, or a source is missing ([`scripts/UpdateNeeded:17-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L17-L19), [`:27-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L27-L29), [`:33-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L33-L36)). |
| `0` | Up to date: the target exists and is at least as new as every source ([`scripts/UpdateNeeded:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L39)). |

The **exit status** distinguishes a *normal* answer from a *missing-source error*:

| Exit status | Meaning |
|-------------|---------|
| `0` | Ran normally: printed `1` or `0`. Includes the case "target missing → printed 1" ([`scripts/UpdateNeeded:17-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L17-L20)) and the normal up-to-date / out-of-date results ([`:39-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L39-L41)). |
| `1` | Usage error (fewer than 2 args) ([`:8-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L8-L11)), **or** a named **source file does not exist** — in which case it still prints `1` first, then exits `1` ([`:24-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L24-L30)). |

> [!gotcha] A missing source means BOTH "update needed" AND an error exit
> If any source is absent, `UpdateNeeded` prints `1` (update needed) and exits
> with status `1` ([`scripts/UpdateNeeded:24-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L24-L30)). The header comment
> states this explicitly: "If a source does not exist, then it echoes 1 and
> exits with 1." The common ``set ud = `UpdateNeeded ...` `` idiom captures only
> stdout, so it sees `ud = 1` and proceeds to rebuild — which will then fail when
> the real build step also cannot find the missing input. Callers that care about
> the difference must check `$status` separately.

> [!gotcha] Missing **target** is NOT an error (exit 0)
> A missing *target* is the normal "needs building" case: print `1`, exit `0`
> ([`scripts/UpdateNeeded:16-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L16-L20)). Only a missing *source* is treated as
> an error.

## Mathematical Foundations

None beyond timestamp comparison. The logic is the `make` freshness rule:

$$\text{UpdateNeeded} = \neg\,\text{exists}(T) \;\lor\; \exists\, s \in S : \big(\neg\,\text{exists}(s)\big) \;\lor\; \big(\text{mtime}(s) > \text{mtime}(T)\big)$$

where $T$ is the target and $S$ the set of sources. The per-source "newer than"
test is delegated to the system `test $Source -nt $Target`
([`scripts/UpdateNeeded:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L32)).

> [!gotcha] The `! $status` test reads "backwards" — and it is correct
> `test -nt` exits `0` (success) when the source **is** newer. The script then
> checks `if(! $status)` ([`scripts/UpdateNeeded:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L33)), i.e. "if the test
> succeeded", and only then sets `UpdateNeeded = 1` and breaks. The source even
> annotates this: "This test looks backwards (ie, testing for ! $status)". It is
> the intended behaviour — a newer source triggers a rebuild.

## Configuration Options

### Complete Flag Reference

`UpdateNeeded` has **no flags**. All arguments are positional: the first is the
target, the rest are sources.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(none)* | — | — | Usage is `UpdateNeeded TargetFile SourceFile [SourceFile2 ...]`. Fewer than two arguments prints that usage line and exits `1` ([`scripts/UpdateNeeded:8-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L8-L11)). There is no `-help`/`-version` flag. |

### Configuration Interactions

None — there are no flags. The only "interaction" is the standard caller pattern
of combining the result with a force-rebuild override: `if($ud || $ForceUpdate)`.
In that idiom the calling script's own `$ForceUpdate` flag lets the user rebuild
even when `UpdateNeeded` says `0`. `UpdateNeeded` itself has no such flag — the
override always lives in the caller.

## Typical Use Cases

### Use Case 1: Skip a step whose output is current (recon-all idiom)

```tcsh
set ud = `UpdateNeeded $synthseg $origvol`
if($ud || $ForceUpdate) then
  set cmd = (mri_synthseg --i $origvol --o $synthseg ...)
  $cmd
endif
```

([`scripts/recon-all:1612-1656`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1612-L1656))

### Use Case 2: Multiple prerequisites

```tcsh
# Rebuild seg.mgz if it is older than the volume OR the atlas.
set ud = `UpdateNeeded seg.mgz orig.mgz atlas.gca`
if($ud) then
  ...
endif
```

The target is rebuilt if it is older than *any* listed source.

### Use Case 3: Quick interactive check

```bash
UpdateNeeded out.mgz in.mgz ; echo $?   # "1" + exit 0 if out is older/absent
                                        # "0" + exit 0 if out is up to date
UpdateNeeded out.mgz missing.mgz        # prints "1", exits 1 (missing source)
```

## Pipeline Context

`UpdateNeeded` is a **cross-cutting build utility**, not a processing stage of
its own. It is not a numbered recon-all stage, but it is called *pervasively
inside* [[wiki/pipelines/recon-all|recon-all]] and the other shell pipelines to
gate nearly every expensive step on output freshness. The same role appears in
[[dcmunpack]], which uses `UpdateNeeded` to skip converting a DICOM series whose
output volume is already newer than the source DICOMs (overridable with
`-force-update`).

**Predecessor:** a script step that has known inputs and an output path →
**UpdateNeeded** → **Successor:** a conditional `if(...)` that runs (or skips) the
actual build command.

## Gotchas and Caveats

> [!gotcha] Equal timestamps count as up to date
> `test -nt` is strictly "newer than", so a source with the *same* mtime as the
> target is **not** newer, and `UpdateNeeded` reports `0` (no rebuild). If a
> source and target were written in the same low-resolution timestamp tick, a
> genuine change can be missed. ([`scripts/UpdateNeeded:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L32-L36))

> [!gotcha] It compares mtimes, not contents
> Re-saving a source with identical content still bumps its mtime and triggers a
> rebuild; conversely, restoring an old file (older mtime) over a changed one can
> hide a real change. Use a force-rebuild flag if you have changed *parameters*
> rather than input files, since the inputs' mtimes will not reflect that.

> [!gotcha] Hidden error exit on a missing source
> Repeating the key point: a missing source prints `1` *and* exits `1`. Scripts
> that only read stdout treat it as "rebuild" and march on; the failure surfaces
> later in the real build step. If you need robust behaviour, also inspect
> `$status`.

## Error Compensation and Guard Rails

- **Argument count** is checked first: fewer than two args → usage + exit `1`
  ([`scripts/UpdateNeeded:8-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L8-L11)).
- **Missing target** is handled gracefully as "needs update" (print `1`, exit
  `0`), not as an error ([`scripts/UpdateNeeded:16-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L16-L20)).
- **Missing source** is flagged via the exit status while still reporting "update
  needed" on stdout, so a naive caller still triggers a rebuild attempt rather
  than silently skipping ([`scripts/UpdateNeeded:24-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded#L24-L30)).
- No clock-skew or content compensation — by design it is a thin `make`-style
  mtime test.

## Related Tools

- [[dcmunpack]] — uses `UpdateNeeded` to skip re-converting a DICOM series whose output is already up to date (override with `-force-update`).
- [[wiki/pipelines/recon-all|recon-all]] — the heaviest user; gates most steps on `UpdateNeeded || $ForceUpdate`.
- [[bbregister]], [[dt_recon]], [[mideface]] — among the many other scripts that use it for incremental processing.
- [[isanalyze]], [[isnifti]], [[IsLTA]], [[is-surface]] — sibling shell predicates; `UpdateNeeded` is the timestamp/dependency member of the same family of tiny helpers.

## Confidence and Gaps

**High confidence.** The script is ~40 lines; the complete output/exit-code
contract, the `make` rule, the deliberately "backwards" `! $status` test, and the
missing-source behaviour were all read directly from
[`scripts/UpdateNeeded`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded) and confirmed against the
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all) call sites. No unresolved questions.

## References

- FreeSurfer source: [`scripts/UpdateNeeded`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/UpdateNeeded) (v8.2.0).
- Representative caller: [`scripts/recon-all:1656`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1656); also [`scripts/dcmunpack`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmunpack) and many others under `scripts/`.
- `test(1)` `-nt` operator (POSIX/coreutils): the "newer-than" file comparison.
