---
title: "reg2subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/reg2subject"
families: []                     # standalone registration helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[tkregister2]]"
  - "[[lta_convert]]"
  - "[[lta-format]]"
  - "[[mris_preproc]]"
  - "[[registration-overview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - lta
  - helper
  - parsing
---

# reg2subject

## Summary

`reg2subject` extracts and prints the **subject name** recorded inside a
registration file, working transparently whether that file is a FreeSurfer
**LTA** (`.lta`) or a legacy **register.dat** file. It runs `IsLTA` to decide
which format it is looking at, then reads the subject from the appropriate place:
the `subject <name>` line for an LTA, or the first line for a register.dat. The
subject name is echoed to stdout. It is a one-line helper used by many higher
level FreeSurfer scripts that need to know which subject a registration belongs
to.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/reg2subject`
- **Helper invoked:** [`IsLTA`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L37) (FreeSurfer tcsh helper that returns whether a file is in LTA format).

## Purpose and Context

A FreeSurfer registration ties a movable volume (e.g. a functional or diffusion
scan) to a `recon-all` subject's anatomical space. Both supported registration
formats embed the subject name, but in **different places**:

- An **LTA** stores it on a `subject <name>` header line.
- A **register.dat** (the classic [[tkregister2]] format) stores it as the very
  first line of the file.

Downstream scripts frequently receive a registration without separately being
told which subject it refers to (so they can locate `$SUBJECTS_DIR/<subj>/`).
`reg2subject` is the small abstraction that answers "which subject is this
registration for?" without the caller having to care about the file format. It
is used this way throughout the FreeSurfer script collection — for example by
[[bbregister]], [[mris_preproc]], `dt_recon`, `reg-feat2anat`, and
`tkregisterfv` (all call `reg2subject --r <reg>`).

It is a pure read-only query: it does **not** modify the registration, run a
registration, or produce any file. It is not part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **A registration file** — given with `--r` (equivalently `--reg` or `--lta`).
  It may be either an LTA (`.lta`) or a register.dat-style file. The file must
  exist; this is checked at parse time
  ([`scripts/reg2subject:66-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L66-L72)) and again in `check_params`
  ([`scripts/reg2subject:92-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L92-L97)).

### Input Assumptions

> [!assumption] The file is a valid LTA or register.dat
> Format detection is delegated to `IsLTA`
> ([`scripts/reg2subject:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L37)). If `IsLTA` reports the file is an
> LTA, the subject is taken from the line whose first field is `subject`; **any
> other file is assumed to be a register.dat**, and its **first line** is printed
> verbatim as the subject ([`scripts/reg2subject:38-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L38-L43)). Pointing it
> at an unrelated text file will therefore print that file's first line rather
> than failing.

## Outputs

### Files Created

None. The subject name is written to **stdout** only
([`scripts/reg2subject:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L43)). The script is designed to be used in
command substitution, e.g. ``set subject = `reg2subject --r $reg` ``.

The `--o` flag is parsed into an `outfile` variable
([`scripts/reg2subject:58-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L58-L61)) but **is never used** — the result is
always printed to stdout regardless (see Configuration Interactions).

## Mathematical Foundations

None — this is a text-parsing helper. It performs no numerical computation.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/reg2subject:52-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L52-L86)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--r`<br>`--reg`<br>`--lta` | string | *(required)* | Input registration file; LTA or register.dat. Must exist. All three spellings are equivalent. |
| `--o` | string | — | Parsed into an `outfile` variable but **not used**; output always goes to stdout. |
| `--debug` | bool | off | Sets the shell `verbose` and `echo` variables to trace execution. |
| `--help` | bool | — | Print usage and the help block, then exit (handled before parsing). |
| `--version` | bool | — | Print the version string and exit (handled before parsing). |

### Configuration Interactions

> [!gotcha] `--o` is accepted but ignored
> The parser stores `--o <file>` into `outfile`
> ([`scripts/reg2subject:58-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L58-L61)) but nothing in the script ever
> reads or writes that variable; the subject name is unconditionally `echo`ed to
> stdout ([`scripts/reg2subject:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L43)). To capture the result, use
> shell command substitution rather than `--o`.

- `--r`/`--reg`/`--lta` are interchangeable aliases for the single required
  input; the last one given wins.
- Unrecognised flags are a hard error: the `default:` branch prints the offending
  flag and the command line and exits 1
  ([`scripts/reg2subject:79-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L79-L83)).

## Typical Use Cases

### 1. Find the subject a registration belongs to

```bash
# Works the same whether reg.lta is an LTA or a register.dat:
reg2subject --r reg.lta
# → prints e.g.  bert
```

### 2. Use it inside a script to locate the subject directory

```bash
set subject = `reg2subject --r $reg`
set surfdir = $SUBJECTS_DIR/$subject/surf
```

This is exactly the idiom used by [[bbregister]], [[mris_preproc]], and friends
to resolve `$SUBJECTS_DIR/<subj>/` from a registration handed in on the command
line.

## Pipeline Context

`reg2subject` is a **utility helper**, not a pipeline stage; it is not invoked by
[[wiki/pipelines/recon-all|recon-all]]. Instead it is called by other FreeSurfer
scripts that take a registration as input and need the associated subject name:
[`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L572),
[`mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mris_preproc#L563),
[`dt_recon`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dt_recon#L357),
[`reg-feat2anat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L585),
and `tkregisterfv`, among others.

**Predecessor:** a registration produced by [[bbregister]], [[tkregister2]],
[[mri_coreg]], or [[lta_convert]] → **reg2subject** → **Successor:** the calling
script, which uses the printed subject name to find that subject's `recon-all`
outputs.

## Gotchas and Caveats

> [!gotcha] A register.dat is detected by elimination, not by a positive test
> The logic is "if `IsLTA` says LTA, parse as LTA; **else** treat as
> register.dat" ([`scripts/reg2subject:37-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L37-L42)). There is no
> validation that a non-LTA file really is a register.dat, so the first line of
> any text file will be echoed as if it were a subject name.

## Error Compensation and Guard Rails

- **Existence check.** The input registration must exist; a missing file is
  reported and the script exits 1, both at parse time and in `check_params`
  ([`scripts/reg2subject:66-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L66-L72),
  [`scripts/reg2subject:92-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L92-L97)).
- **Format abstraction.** By dispatching on `IsLTA`, the script shields callers
  from the LTA-vs-register.dat distinction — its entire reason for existing.

## Related Tools

- [[bbregister]] — boundary-based registration; a primary producer of the LTA/register.dat files `reg2subject` reads, and a caller of it.
- [[tkregister2]] — the classic registration tool whose register.dat format `reg2subject` parses (first line = subject).
- [[lta_convert]] — converts between LTA, register.dat, and other transform conventions; complements this subject-name extractor.
- [[mris_preproc]] — surface-based group preprocessing; calls `reg2subject --r` to resolve the subject for each input registration.
- [[lta-format]] — the LTA file format whose `subject` header line this tool reads.
- [[registration-overview]] — background on FreeSurfer registration files and conventions.

## Confidence and Gaps

**High confidence:** the entire script is short and fully read; the flag set, the
`IsLTA`-based dispatch, the LTA `subject`-line vs. register.dat first-line
extraction, the stdout-only output, and the unused `--o` flag are all confirmed
directly from [`scripts/reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject).

## References

- FreeSurfer source: [`scripts/reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject) (v8.2.0).
- Built-in help (`BEGINHELP` block): [`scripts/reg2subject:124-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg2subject#L124-L130).
- Helper: [`scripts/IsLTA`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/IsLTA) — the LTA-format test it dispatches on.
