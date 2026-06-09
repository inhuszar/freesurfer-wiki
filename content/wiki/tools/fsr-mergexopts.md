---
title: "fsr-mergexopts"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsr-mergexopts"
families: ["fsr-*"]
recon_all_stage: null
related:
  - "[[fsr-getxopts]]"
  - "[[fsr-checkxopts]]"
  - "[[fsr-coreg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The non-recon-all merge loop greps the literal string 'recon-all' rather than the current command key, so options for non-recon-all commands are not collected correctly — appears to be a copy-paste bug; behaviour described from code."
tags:
  - expert-options
  - xopts
  - fsr
  - configuration
---

# fsr-mergexopts

## Summary

`fsr-mergexopts` combines several FreeSurfer **expert-options ("xopts")** files
into a single merged file. It collects the union of command keys across all input
files and, for each command, concatenates that command's options from every input
file in the order the files were given on the command line — writing one merged
line per command. `recon-all` options are emitted first, followed by all other
commands. The merged file is validated with [[fsr-checkxopts]] before it is
finalised. It exists so that expert-option fragments from different sources can be
flattened into the single file that the rest of the pipeline expects.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsr-mergexopts`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsr-mergexopts`
- **FreeSurfer tools called:** [[fsr-checkxopts]] (validates each input and the
  merged output, [`scripts/fsr-mergexopts:240-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L240-L243), [`scripts/fsr-mergexopts:116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L116)),
  and `UpdateNeeded` (timestamp-based skip, [`scripts/fsr-mergexopts:245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L245)).

## Purpose and Context

The expert-options system ([[fsr-getxopts]]) assumes a **single** file in which
each command key appears at most once. When option fragments come from multiple
places — a site-wide default file, a project file, and a user file — they need to
be merged into one coherent file with no duplicate keys. `fsr-mergexopts` does
that flattening. Conceptually it is the "write" counterpart to the "read"
performed by [[fsr-getxopts]]: it takes several files and produces the single
canonical file that `fsr-getxopts` will later query.

It is a **user-invoked** convenience utility; it is not part of any recon-all
stage. The merged output is intended to be passed later as a `--expert` file to
[[fsr-coreg]], [[fsr-longpreproc]], or [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **One or more input xopts files** — each given with its own `--x` flag,
  repeatable ([`scripts/fsr-mergexopts:164-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L164-L172)). Each must exist.
- **One output file** — given with `--o` ([`scripts/fsr-mergexopts:174-177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L174-L177)).

### Input Assumptions

> [!assumption] Each input is itself a valid xopts file
> Every input file is passed through [[fsr-checkxopts]] before merging
> ([`scripts/fsr-mergexopts:240-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L240-L243)); a duplicate command key in any input
> aborts the merge. Lines containing `#` are treated as comments throughout (the
> key list is built with `grep -v \#`, [`scripts/fsr-mergexopts:84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L84)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<mergedxopts>` (the `--o` path) | user-specified | One line per command key: the command name followed by its options gathered from every input file, in command-line order. `recon-all`'s line is written first. |
| `log/fsr-mergexopts.*.log` | `dirname(<mergedxopts>)/log/` | Run log (created but, by default, set to `/dev/null` — see gotcha). |

### Output Specifications

- The output is overwritten at the start (`rm -f $outxopts`,
  [`scripts/fsr-mergexopts:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L81)) and rebuilt line by line.
- After building, [[fsr-checkxopts]] is run on the output; if it fails, the
  output is printed, **deleted**, and the script exits 1
  ([`scripts/fsr-mergexopts:116-121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L116-L121)).

## Mathematical Foundations

None — this is text aggregation (`grep`/`awk`/`sort`/`uniq` to find the unique
command keys, then per-key concatenation of option tokens).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the parser
([`scripts/fsr-mergexopts:156-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L156-L223)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--x` | string (repeatable) | *(required)* | An input expert-options file to merge. Specify once per input file. Each must exist. |
| `--o` | string | *(required)* | Path of the merged output file to create. |
| `--force` | bool | off | Rebuild the output even if it is newer than all inputs. |
| `--no-force` | bool | on | Honour the `UpdateNeeded` timestamp check (skip if output is up to date). |
| `--log` | string | `/dev/null` (see gotcha) | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temporary directory (also disables cleanup); a tmp dir is computed but **not used** by the merge logic. |
| `--nocleanup` | bool | off | Do not remove the temporary directory. |
| `--cleanup` | bool | on | Remove the temporary directory (the cleanup line is commented out, so this is a no-op). |
| `--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print usage and the (empty) `BEGINHELP` block. |
| `--version` | bool | — | Print the version string (literally `$Id$`, [`scripts/fsr-mergexopts:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L7)). |

### Configuration Interactions

> [!gotcha] `--log` is overridden to `/dev/null` regardless of what you pass
> The argument parser stores your `--log` path, but immediately after parsing the
> script unconditionally executes `set LF = /dev/null`
> ([`scripts/fsr-mergexopts:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L57)) **before** the `if($#LF == 0)` default
> would apply. The effect is that logging is effectively off; the named log file
> is not written. Code is authoritative.

> [!gotcha] Update skip can leave a stale merged file
> If the output already exists and is newer than every input, the script prints
> "does not need to be updated" and exits 0 **without rebuilding**
> ([`scripts/fsr-mergexopts:245-250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L245-L250)). If you edited an input in a way that
> did not change its mtime, add `--force`.

## Typical Use Cases

### 1. Merge a site default and a user file

```bash
fsr-mergexopts \
  --x /opt/freesurfer/etc/site-defaults.xopts \
  --x ~/my-project.xopts \
  --o ~/merged-expert-options.txt
# then:
recon-all -s subj -all -expert ~/merged-expert-options.txt
```

### 2. Force a rebuild

```bash
fsr-mergexopts --x a.xopts --x b.xopts --o merged.txt --force
```

## Pipeline Context

`fsr-mergexopts` is a **standalone utility**, not a recon-all stage
(`recon_all_stage: null`). It sits at the very front of the expert-options
workflow, producing the file the rest of the chain consumes.

**Predecessor:** several hand-written/site/project xopts fragments →
**fsr-mergexopts** (which calls [[fsr-checkxopts]]) → **Successor:** the single
merged file is later read by [[fsr-getxopts]] inside [[fsr-coreg]] /
[[fsr-longpreproc]] / [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!contradiction] The non-recon-all loop greps the wrong string (likely a bug)
> The first loop correctly gathers `recon-all` options by grepping for
> `recon-all` ([`scripts/fsr-mergexopts:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L93)). The **second** loop, which is meant
> to gather options for every *non*-`recon-all` command, still greps the literal
> string `recon-all` instead of the current command `$cmd`
> ([`scripts/fsr-mergexopts:107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L107)) — apparently a copy-paste from the first
> loop. As written, options for non-`recon-all` commands are not collected from
> the input lines as intended. This is reported here as observed code behaviour;
> it should be verified against real input before relying on multi-command merges.
> A corresponding bug page may exist under `wiki/bugs/`.

> [!gotcha] Comments and `#` follow the same rules as elsewhere
> Command keys are discovered with `grep -v \#`; a line containing `#` anywhere is
> ignored for merging just as it is for [[fsr-getxopts]]/[[fsr-checkxopts]].

> [!gotcha] `BEGINHELP` is empty
> `--help` prints the short usage and then nothing further; there is no extended
> help text after `BEGINHELP` ([`scripts/fsr-mergexopts:279-280`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L279-L280)).

## Error Compensation and Guard Rails

- **Pre-validation:** each input is checked with [[fsr-checkxopts]] before
  merging; a bad input aborts the run ([`scripts/fsr-mergexopts:240-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L240-L243)).
- **Post-validation:** the merged output is checked again; if it somehow contains
  duplicate keys it is printed, **deleted**, and the script fails
  ([`scripts/fsr-mergexopts:116-121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L116-L121)).
- **Skip-if-up-to-date:** `UpdateNeeded` avoids needless rebuilds
  ([`scripts/fsr-mergexopts:245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L245)).

## Known Bugs

- [[00187]] — the non-`recon-all` merge loop greps the literal `recon-all` instead of `$cmd`, so expert options for any non-`recon-all` command are merged from the wrong line (or silently dropped).

## Related Tools

- [[fsr-getxopts]] — reads the merged file this tool produces (the read/write counterpart).
- [[fsr-checkxopts]] — invoked on each input and on the output to enforce key uniqueness.
- [[fsr-coreg]] / [[fsr-longpreproc]] / [[wiki/pipelines/recon-all|recon-all]] — downstream consumers of the merged expert-options file.

## Confidence and Gaps

**High confidence** on the flag set, the validation flow, the `--log`-override
and update-skip behaviours, all read directly from the 280-line source.

> [!gap] Correctness of the non-recon-all merge
> Because the second merge loop greps the literal `recon-all` rather than the
> current command key ([`scripts/fsr-mergexopts:107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts#L107)), the merged output for
> non-`recon-all` commands may be empty or incorrect. This was not exercised on
> real input; treat multi-command merges with caution and verify the output by
> hand. Frontmatter `confidence` is set to medium for this reason.

## References

- FreeSurfer source: [`scripts/fsr-mergexopts`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsr-mergexopts) (v8.2.0).
