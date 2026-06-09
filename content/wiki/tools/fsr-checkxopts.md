---
title: "fsr-checkxopts"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsr-checkxopts"
families: ["fsr-*"]
recon_all_stage: null
related:
  - "[[fsr-getxopts]]"
  - "[[fsr-mergexopts]]"
  - "[[fsr-coreg]]"
  - "[[fsr-longpreproc]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - expert-options
  - xopts
  - fsr
  - validation
  - configuration
---

# fsr-checkxopts

## Summary

`fsr-checkxopts` is a one-shot validator for FreeSurfer **expert-options
("xopts")** files. It reads a single xopts file and verifies that **no command
key appears on more than one line**. If every command (the first token of each
non-comment line) is unique it exits 0; if any command is duplicated it prints an
error and exits 1. It exists because the lookup performed by [[fsr-getxopts]]
silently mis-behaves when a key is repeated, so callers run this check *before*
trusting a file.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsr-checkxopts`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsr-checkxopts`
- **Calls no other FreeSurfer tools** — pure `grep`/`awk`/`sort`/`uniq`.

## Purpose and Context

An expert-options file lists, one per line, a command key followed by extra
arguments for that command (see [[fsr-getxopts]] for the format). The lookup
relies on each key occurring **at most once**; a second occurrence of the same
key produces concatenated, usually-wrong option strings. `fsr-checkxopts` is the
guard that enforces this invariant. It is run automatically by the scripts that
accept a `--expert` file:

- [[fsr-coreg]] runs it the moment a `--expert` file is supplied
  ([`scripts/fsr-coreg:386-387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-coreg#L386-L387)).
- [[fsr-longpreproc]] runs it on its `--expert` file
  ([`scripts/fsr-longpreproc:427-428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-longpreproc#L427-L428)).
- [[fsr-mergexopts]] runs it on **every** input file and again on the merged
  output ([`scripts/fsr-mergexopts:240-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L240-L243), [`scripts/fsr-mergexopts:116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L116)).
- `rca-long-tp-init` runs it on its expert file as well.

## Inputs

### Required Inputs

- **`xoptsfile`** (positional arg 1) — the expert-options file to validate. It
  must exist; a missing file is reported and the script exits 1
  ([`scripts/fsr-checkxopts:29-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L29-L32)).

### Input Assumptions

> [!assumption] Lines with `#` are comments and are ignored
> Validation counts only lines that survive `grep -v \#`, i.e. lines that do not
> contain a `#` anywhere ([`scripts/fsr-checkxopts:35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L35), [`scripts/fsr-checkxopts:38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L38)). The
> first whitespace-delimited token of each remaining line is treated as the
> command key. This matches the filtering used by [[fsr-getxopts]], so the check
> is consistent with how the file is actually consumed.

## Outputs

### Files Created

None. The result is conveyed entirely through the **exit status** (0 = OK,
1 = duplicate found or file missing) plus an error message on standard output
when it fails. Nothing is written to disk.

### Output Specifications

- **Exit 0, no output:** the file is valid (or was empty / had fewer than one
  argument — see gotcha).
- **Exit 1 + message:** either the file does not exist, or a command key is
  duplicated:
  `ERROR: multiple occurrences of a command in expert options file <file>`
  ([`scripts/fsr-checkxopts:41-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L41-L44)).

## Mathematical Foundations

None. The test is a set-cardinality comparison: it counts the number of
non-comment first-tokens (`n1`) and the number of **unique** first-tokens (`n2`)
and fails iff `n1 != n2` ([`scripts/fsr-checkxopts:35-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L35-L44)).

## Configuration Options

### Complete Flag Reference

`fsr-checkxopts` takes a **single positional argument** and has no `--`-style
flags. With **zero** arguments it exits 0 immediately
([`scripts/fsr-checkxopts:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L26)).

| Positional | Type | Default | Description |
|------------|------|---------|-------------|
| `xoptsfile` (arg 1) | string | *(required for any check)* | Expert-options file to validate. Must exist. Only the first token of each non-comment line is examined. |

> [!contradiction] `--help` is not handled and reports a confusing error
> Passing `--help` makes the script treat `--help` as a filename: it cannot find
> a file by that name and prints `ERROR: cannot find --help`
> ([`scripts/fsr-checkxopts:29-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts#L29-L32)). There is no usage/`BEGINHELP` block in this
> script. Code is authoritative — the only documentation is the header comment.

### Configuration Interactions

There are none — the tool takes exactly one input and has no flags whose
behaviour could interact.

## Typical Use Cases

### 1. Validate an expert file by hand

```bash
fsr-checkxopts my-expert-options.txt
echo $status   # 0 = OK, 1 = duplicate command or missing file
```

### 2. As embedded in fsr-coreg (the usual path)

```bash
# inside fsr-coreg's --expert handler:
fsr-checkxopts $XOptsFile
if($status) goto error_exit
```

A user almost never calls `fsr-checkxopts` directly; it runs automatically
whenever an xopts file is handed to [[fsr-coreg]], [[fsr-longpreproc]], or
[[fsr-mergexopts]].

## Pipeline Context

This is a **validation helper**, not a pipeline stage, so it has no
`recon_all_stage`. It sits immediately **upstream of** [[fsr-getxopts]] in the
expert-options workflow: a file is checked once, then queried many times.

**Predecessor:** an expert-options file (hand-written, or produced by
[[fsr-mergexopts]]) → **fsr-checkxopts** → **Successor:** the file is consumed by
[[fsr-getxopts]] inside [[fsr-coreg]] / [[fsr-longpreproc]] /
[[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] It only catches duplicate keys — not malformed options
> The sole check is uniqueness of the first token. It does **not** verify that a
> key names a real command, that the arguments are valid for that command, or
> that the file is otherwise well-formed. A typo'd command name passes silently
> (and is then simply never matched by [[fsr-getxopts]]).

> [!gotcha] An empty or all-comment file passes
> If `grep -v \#` yields nothing, `n1 == n2 == 0` and the check succeeds. A file
> that is effectively empty is considered valid.

> [!gotcha] `#` anywhere disables a line for both checking and lookup
> Consistent with [[fsr-getxopts]], a line containing `#` at any position is
> ignored. A duplicated key is therefore *not* flagged if one of the two
> occurrences happens to contain a `#`.

## Error Compensation and Guard Rails

`fsr-checkxopts` **is** the guard rail for the xopts subsystem; it does not
itself compensate for errors, it merely refuses to let a malformed (duplicate-key)
file proceed. The scripts that call it treat a non-zero exit as fatal
(`if($status) goto error_exit` / `exit 1`).

## Related Tools

- [[fsr-getxopts]] — the consumer this check protects; mis-behaves on duplicate keys, which is exactly what `fsr-checkxopts` detects.
- [[fsr-mergexopts]] — runs `fsr-checkxopts` on every input and on its merged output.
- [[fsr-coreg]] — validates its `--expert` file with this tool before doing anything.
- [[fsr-longpreproc]] — same `--expert` validation.
- [[wiki/pipelines/recon-all|recon-all]] — downstream consumer of validated expert-options files.

## Confidence and Gaps

**High confidence:** the script is 47 lines and was read in full. The
duplicate-key logic, the comment filtering, the missing-file and zero-argument
behaviours, and the `--help`-as-filename quirk were all verified directly from
the source.

## References

- FreeSurfer source: [`scripts/fsr-checkxopts`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-checkxopts) (v8.2.0).
- Original author: Doug Greve (per the source header).
