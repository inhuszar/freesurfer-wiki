---
title: "listsubj"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/listsubj"
families: []                     # standalone utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[subject-directory]]"
  - "[[recon-all-clinical]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - subjects-dir
  - utility
  - longitudinal
  - status
---

# listsubj

## Summary

`listsubj` lists the subject IDs found in a `SUBJECTS_DIR` (passed as a positional
argument), with optional filters by **processing stream** (cross-sectional, base,
or longitudinal), by **recon-all state** (done, errored, or currently running),
and an option to print **full paths** or just a **count**. It is a small,
dependency-free bash helper built around a single `find` command and is handy for
scripting batch jobs and for auditing a study directory.

## Source Information

- **Language:** bash
- **Source file:** [`scripts/listsubj`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj)
- **Binary/script location:** `$FREESURFER_HOME/bin/listsubj`
- **External commands:** `find`, `sed`, `test`, `cd`/`pwd` — no FreeSurfer binaries are called. The core is a single `find … -exec test -e … -print` ([`scripts/listsubj:78-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L78-L88)).

## Purpose and Context

A FreeSurfer study directory accumulates many subject subdirectories — some
finished, some failed, some still running, plus longitudinal **base** and
**timepoint.long.base** subjects mixed in with ordinary cross-sectional ones, and
the special `fsaverage`. Enumerating exactly the subjects you want (for a `for`
loop, a QA pass, or a progress report) is fiddly to do by hand. `listsubj`
encapsulates the common queries:

- "list every processed subject" (has `mri/orig`),
- "list only cross-sectional / base / longitudinal subjects",
- "list only the ones that finished / errored / are running",
- "give me absolute paths" or "just count them".

It is a stand-alone utility, not part of [[wiki/pipelines/recon-all|recon-all]];
it is typically used **around** recon-all to drive or monitor batches.

## Inputs

### Required Inputs

- **SUBJECTS_DIR** — a single positional argument naming the directory to scan
  ([`scripts/listsubj:69-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L69-L75)). Trailing slashes are stripped
  ([`scripts/listsubj:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L70)). It must exist and be a directory. Note this is an
  **argument**, not the `$SUBJECTS_DIR` environment variable — you must name the
  directory explicitly (`listsubj $SUBJECTS_DIR` to use the env var).

### Input Assumptions

> [!assumption] Standard recon-all layout
> Stream and state detection rely on the conventional FreeSurfer subject layout:
> a processed subject has `mri/orig`; a cross-sectional subject has
> `mri/orig/001.mgz`; a longitudinal **base** has a `base-tps` file; a
> longitudinal **timepoint** directory name contains `.long.`; and state is read
> from `scripts/recon-all.done`, `scripts/recon-all.error`, and
> `scripts/IsRunning.lh`/`IsRunning.rh` ([`scripts/listsubj:79-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L79-L104)). Directories
> that do not match the requested stream marker are not listed. `fsaverage` is
> always excluded ([`scripts/listsubj:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L78)).

## Outputs

### Files Created

None. Output is written to **stdout**: either one subject ID per line, or (with
`-n`) a single integer count ([`scripts/listsubj:107-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L107-L111)).

### Output Specifications

By default each line is a bare subject **basename**
([`scripts/listsubj:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L103) uses `${s##*/}`). With `-f`/`--full-path`, each line is
prefixed with the absolute, symlink-resolved path of the SUBJECTS_DIR
([`scripts/listsubj:91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L91) uses `cd "$sd" && pwd -P`). With `-n`/`--count`, the only
output is the number of matching subjects.

## Mathematical Foundations

None — this is a directory-enumeration utility. The "computation" is a `find`
over the immediate children of SUBJECTS_DIR plus per-subject existence tests.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/listsubj:32-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L32-L68)). The three **stream** flags share one variable, as do
the three **state** flags, so within each group the last one given wins (see
[Configuration Interactions](#configuration-interactions)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c`<br>`--cross` | bool (stream) | all processed | List only **cross-sectional** subjects — those with `mri/orig/001.mgz` ([`scripts/listsubj:34-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L34-L36), [`scripts/listsubj:81-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L81-L82)). |
| `-b`<br>`--base` | bool (stream) | all processed | List only longitudinal **base** subjects — those with a `base-tps` file ([`scripts/listsubj:37-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L37-L39), [`scripts/listsubj:83-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L83-L84)). |
| `-l`<br>`--long` | bool (stream) | all processed | List only **longitudinal timepoint** subjects — those whose directory name contains `.long.` ([`scripts/listsubj:40-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L40-L42), [`scripts/listsubj:85-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L85-L86)). |
| `-d`<br>`--done` | bool (state) | no state filter | Keep only subjects with `scripts/recon-all.done` ([`scripts/listsubj:43-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L43-L45), [`scripts/listsubj:95-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L95-L96)). |
| `-e`<br>`--error` | bool (state) | no state filter | Keep only subjects with `scripts/recon-all.error` ([`scripts/listsubj:46-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L46-L48), [`scripts/listsubj:97-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L97-L98)). |
| `-r`<br>`--running` | bool (state) | no state filter | Keep only subjects with `scripts/IsRunning.lh` or `IsRunning.rh` ([`scripts/listsubj:49-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L49-L51), [`scripts/listsubj:99-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L99-L101)). |
| `-f`<br>`--full-path` | bool | basename only | Prepend the absolute SUBJECTS_DIR path to each ID ([`scripts/listsubj:52-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L52-L54), [`scripts/listsubj:91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L91)). |
| `-n`<br>`--count` | bool | print IDs | Print the number of matching subjects instead of the list ([`scripts/listsubj:55-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L55-L57), [`scripts/listsubj:107-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L107-L109)). |
| `-h`<br>`--help` | bool | — | Print the usage block and exit 0 ([`scripts/listsubj:58-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L58-L60), [`scripts/listsubj:3-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L3-L22)). |

Any other `-…` token is rejected as an unknown flag ([`scripts/listsubj:61-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L61-L63)).

### Configuration Interactions

> [!gotcha] Stream flags are mutually exclusive in effect (last wins)
> `-c`, `-b`, and `-l` all assign to the single `stream` variable
> ([`scripts/listsubj:34-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L34-L42)). Passing more than one does **not** combine them —
> only the last-specified stream takes effect. There is no "cross **and** base"
> query; run `listsubj` once per stream.

> [!gotcha] State flags are mutually exclusive in effect (last wins)
> Likewise `-d`, `-e`, and `-r` share the single `state` variable
> ([`scripts/listsubj:43-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L43-L51)). You can filter by done **or** error **or**
> running, but not a union of them in one call.

- Stream and state filters **do** compose across groups: e.g. `-c -e` lists
  cross-sectional subjects that errored. The stream selects the `find` predicate;
  the state is applied as a second per-subject test in the loop.
- `-l` (longitudinal) selects by **name pattern** (`*.long.*`) rather than by a
  file marker, so it does not also require `mri/orig`. The default (no stream)
  and the `-c`/`-b` streams require their respective marker files to exist.
- `-f` and `-n` are independent of the filters; with `-n`, `-f` has no visible
  effect because only the count is printed.

## Typical Use Cases

### 1. List every processed subject

```bash
# All subjects with mri/orig, fsaverage excluded.
listsubj $SUBJECTS_DIR
```

### 2. Loop over finished cross-sectional subjects

```bash
for s in $(listsubj -c -d $SUBJECTS_DIR); do
  echo "QA: $s"
  # ... run a check on each ...
done
```

### 3. Audit failures and progress

```bash
listsubj -e $SUBJECTS_DIR              # which subjects errored
listsubj -r -n $SUBJECTS_DIR           # how many are currently running
listsubj -l -f /data/study            # longitudinal timepoints, full paths
```

## Pipeline Context

`listsubj` is a stand-alone **batch/management** utility. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`; rather it operates on the
[[subject-directory]] those pipelines produce.

**Predecessor:** one or more [[wiki/pipelines/recon-all|recon-all]] runs populate
the SUBJECTS_DIR (cross-sectional, then optionally `-base` and `-long` for
longitudinal) → **listsubj** enumerates/filters them → **Successor:** a shell loop
that drives QA, statistics extraction, or further recon-all stages over the
returned IDs.

## Gotchas and Caveats

> [!gotcha] The directory is a positional argument, not `$SUBJECTS_DIR`
> `listsubj` does **not** read the `SUBJECTS_DIR` environment variable on its own;
> it requires exactly one directory argument ([`scripts/listsubj:71-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L71-L75)). To
> operate on the env var, pass it: `listsubj $SUBJECTS_DIR`.

> [!gotcha] Default listing requires `mri/orig`
> With no stream flag, only directories that contain `mri/orig` are listed
> ([`scripts/listsubj:79-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L79-L80)). A freshly created subject directory with no
> `mri/orig` yet will not appear; a `-l` longitudinal directory will appear under
> `-l` even without `mri/orig` because that filter matches by name.

> [!gotcha] `-r` only checks `IsRunning.lh`/`IsRunning.rh`
> The "running" test looks for the hemisphere `IsRunning` files specifically
> ([`scripts/listsubj:99-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L99-L101)); a run that left a different lock file (or was
> killed without cleanup) may not be detected accurately.

## Error Compensation and Guard Rails

- **No arguments → help.** Running with zero arguments prints the usage and exits
  0 ([`scripts/listsubj:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L30)).
- **Argument validation.** Exactly one positional argument is required and it must
  be an existing directory, else a specific error is printed and the script exits
  1 ([`scripts/listsubj:71-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L71-L75)).
- **Trailing-slash tolerance.** A trailing `/` on the directory argument is
  stripped so paths join cleanly ([`scripts/listsubj:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L70)).
- **Unknown flags rejected.** Any unrecognised `-…` token aborts with "unknown
  flag" ([`scripts/listsubj:61-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L61-L63)).

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — produces the subjects (and the `.done`/`.error`/`IsRunning` markers) that `listsubj` reports on.
- [[subject-directory]] — the on-disk layout whose markers `listsubj` inspects.
- [[recon-all-clinical]] *(if present)* — another producer of subject directories that `listsubj` can enumerate.

## Confidence and Gaps

**High confidence:** the complete flag set, the stream/state marker files, the
last-wins behaviour within each group, the cross-group composition, and the
default `mri/orig` requirement are all read directly from
[`scripts/listsubj`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj), and the `--help` output matches the embedded usage block.

## References

- FreeSurfer source: [`scripts/listsubj`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj) (v8.2.0).
- Built-in help: `listsubj -h` (the usage heredoc, [`scripts/listsubj:3-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/listsubj#L3-L22)).
