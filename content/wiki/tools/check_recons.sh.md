---
title: "check_recons.sh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/check_recons.sh"
families: []                     # standalone batch-QA utility
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[check_subject]]"
  - "[[reconbatchjobs]]"
  - "[[post-recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - recon-all
  - qa
  - batch
  - monitoring
---

# check_recons.sh

## Summary

`check_recons.sh` is a bash utility that scans a `$SUBJECTS_DIR` (or a directory
given as its single argument) and reports, at a glance, the status of every
recon-all run inside it. It classifies each subject directory into one of four
buckets — **completed successfully**, **completed with errors**, **still
running**, or **inactive** (apparently stalled) — by inspecting the marker files
recon-all leaves in each subject's `scripts/` directory (`recon-all.done`,
`recon-all.error`, `IsRunning.lh+rh`) and, for running jobs, whether any file has
been modified recently. It prints each bucket with a count and an alphabetically
sorted list of subjects. It is a read-only monitoring tool: it changes nothing.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/check_recons.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh)
- **Binary/script location:** `$FREESURFER_HOME/bin/check_recons.sh`

## Purpose and Context

When many subjects are processed through [[wiki/pipelines/recon-all|recon-all]]
(e.g. a study batch, possibly via a cluster or via `-parallel`/`reconbatchjobs`),
you need a quick way to see which finished, which failed, and which are still in
flight without manually `ls`-ing each subject's `scripts/` directory.
`check_recons.sh` automates exactly that by reading the small **state-marker
files** recon-all maintains:

- `scripts/recon-all.done` — written when recon-all completes
  ([`scripts/recon-all:500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L500)).
- `scripts/recon-all.error` — written when recon-all exits with an error
  ([`scripts/recon-all:498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L498)).
- `scripts/IsRunning.lh+rh` — the lock file present while a both-hemisphere run is
  in progress ([`scripts/recon-all:806`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L806), [`:836`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L836)).

It is a standalone operator/QA tool — not part of recon-all and not called by it.

## Inputs

### Required Inputs

- **A subjects directory** — either `$SUBJECTS_DIR` (when no argument is given) or
  a single directory path passed as `$1`
  ([`scripts/check_recons.sh:15-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L15-L28)). The directory's immediate
  subdirectories are treated as subject directories.

There are no other inputs; the tool reads marker files and file modification
times only.

### Input Assumptions

> [!assumption] Standard recon-all marker files in `scripts/`
> Each subject is judged purely by the presence of
> `scripts/recon-all.done`, `scripts/recon-all.error`, and
> `scripts/IsRunning.lh+rh`. Subjects that have never been started (none of these
> files) fall into **no** bucket and are silently omitted from all four lists.
> Hemisphere-specific lock files (`IsRunning.lh`, `IsRunning.rh` from a
> single-hemi run) are **not** checked — only the combined `IsRunning.lh+rh`
> ([`scripts/check_recons.sh:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L39)).

## Outputs

### Files Created

None. The tool only prints to stdout; it does not create, modify, or delete any
file.

### Output Specifications

Four labelled, count-prefixed, alphabetically sorted sections printed to stdout
([`scripts/check_recons.sh:49-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L49-L71)), preceded by an echo of the resolved
`SUBJECTS_DIR`:

| Section | Meaning | Classification rule |
|---------|---------|---------------------|
| **Subjects completed SUCCESSFULLY** | done, no error | `recon-all.done` present **and** `recon-all.error` absent ([`:35-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L35-L36)) |
| **Subjects completed with ERRORS** | done, but errored | `recon-all.done` present **and** `recon-all.error` present ([`:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L37-L38)) |
| **Subjects STILL RUNNING** | lock file + recent file activity | `IsRunning.lh+rh` present **and** some file modified within the last `INACTIVE_LIMIT` (60) minutes ([`:39-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L39-L43)) |
| **Subjects INACTIVE for > 60 minutes** | lock file but stale | `IsRunning.lh+rh` present but **no** file modified in the last 60 minutes — may have died without cleaning up ([`:44-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L44-L45)) |

Each section prints its count in parentheses, then the sorted subject names, then
a blank line if the list is non-empty.

## Mathematical Foundations

None — pure file-state inspection and string sorting. The only numeric quantity is
the activity threshold `INACTIVE_LIMIT=60` minutes, applied via
`find … -mmin -${INACTIVE_LIMIT}` ([`scripts/check_recons.sh:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L31), [`:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L40)).

## Configuration Options

### Complete Flag Reference

`check_recons.sh` has essentially no options — one optional positional argument
and a help switch:

| Argument / flag | Type | Default | Description |
|-----------------|------|---------|-------------|
| *(none)* | — | `$SUBJECTS_DIR` | With zero arguments it uses `$SUBJECTS_DIR`; errors if that is unset ([`scripts/check_recons.sh:15-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L15-L16)). |
| `<subject_directory>` | string (dir) | — | A directory to scan instead of `$SUBJECTS_DIR` ([`:17-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L17-L23)). Must be an existing directory ([`:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L28)). |
| `-*help` | bool | — | Any single argument matching the glob `-*help` (e.g. `--help`, `-help`) prints the usage text and exits 1 ([`:18-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L18-L20)). |

The `INACTIVE_LIMIT` activity threshold (60 minutes) is **hard-coded**, not a
flag ([`scripts/check_recons.sh:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L31)).

### Configuration Interactions

There is essentially nothing to combine. The single notable rule is the argument
count: zero or one argument only — two or more prints usage and exits
([`scripts/check_recons.sh:24-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L24-L27)).

> [!gotcha] `--help` matches by glob and so does any `…help` argument
> The help test is `[[ "${1}" == \-*help ]]` — a glob, not an exact string. Any
> first argument that starts with `-` and ends in `help` triggers the usage text;
> a directory literally named like that could not be scanned. In practice this is
> harmless but worth knowing.

## Typical Use Cases

### Use Case 1: Check the current study directory

```bash
export SUBJECTS_DIR=/data/study/freesurfer
check_recons.sh
# Prints SUBJECTS_DIR then the four buckets (completed / errored / running / inactive).
```

### Use Case 2: Check a specific directory without changing the environment

```bash
check_recons.sh /data/other_study/subjects
```

### Use Case 3: Watch a running batch

```bash
watch -n 300 check_recons.sh /data/study/freesurfer
# Re-runs every 5 minutes; subjects move from RUNNING to COMPLETED/ERRORS as they finish.
```

## Pipeline Context

`check_recons.sh` is an **operator/monitoring** tool that sits *beside*
[[wiki/pipelines/recon-all|recon-all]], not inside it. It is not invoked by
recon-all and recon-all does not depend on it; rather it consumes the state
markers recon-all writes. A natural companion is [[check_subject]], which goes one
level deeper and verifies the *internal* surface integrity of a single subject's
reconstruction, whereas `check_recons.sh` only asks "did the whole run finish,
fail, or stall?" across many subjects.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (writes `recon-all.done` /
`recon-all.error` / `IsRunning.lh+rh`) → **check_recons.sh** (reports status) →
**Successor (per subject):** [[check_subject]] for a deeper per-subject check, or
[[post-recon-all]] on the completed subjects.

## Gotchas and Caveats

> [!gotcha] A killed job can be mislabeled "STILL RUNNING" for up to an hour
> "Running" vs. "inactive" is decided solely by whether any file under the subject
> changed in the last 60 minutes ([`scripts/check_recons.sh:39-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L39-L45)). A job
> that was killed seconds ago (and so left its `IsRunning.lh+rh` lock in place)
> still shows as RUNNING until 60 minutes of inactivity have elapsed, after which
> it moves to INACTIVE. INACTIVE therefore means "lock present but quiet — likely
> crashed without cleanup", not a confirmed failure.

> [!gotcha] Single-hemisphere runs are invisible to the running/inactive buckets
> Only `IsRunning.lh+rh` is checked. A run started for a single hemisphere creates
> `IsRunning.lh` or `IsRunning.rh` instead ([`scripts/recon-all:804-810`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L804-L810)),
> which this tool does not look for; such a subject will not appear under RUNNING
> or INACTIVE (though it will appear under COMPLETED/ERRORS once done).

> [!gotcha] "Completed with ERRORS" requires BOTH a done and an error file
> The errored bucket needs `recon-all.done` **and** `recon-all.error` to both be
> present ([`scripts/check_recons.sh:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L37-L38)). A subject that errored without
> ever producing `recon-all.done` matches none of the four conditions and is
> omitted entirely — check for a lone `recon-all.error` manually if a subject is
> missing from all lists.

> [!gotcha] `maxdepth 1` includes the directory itself
> The scan is `find ${SUBJECTS_DIR}/ -maxdepth 1 -type d`
> ([`scripts/check_recons.sh:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L33)), which also returns `$SUBJECTS_DIR`
> itself; it harmlessly fails the marker tests and is ignored. Only immediate
> child directories are considered subjects (no recursion).

## Error Compensation and Guard Rails

- **Environment guard.** With no argument and no `$SUBJECTS_DIR`, it prints
  "Need to set SUBJECTS_DIR" and exits 1 ([`scripts/check_recons.sh:16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L16)).
- **Directory guard.** A non-existent target directory → error + exit 1
  ([`scripts/check_recons.sh:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L28)).
- **Argument-count guard.** Two or more arguments → usage + exit 1
  ([`scripts/check_recons.sh:24-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh#L24-L27)).
- Otherwise the tool is non-destructive: it never writes to the subjects tree, so
  there is nothing to compensate for.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — produces the marker files this tool
  reads; the subject of the monitoring.
- [[check_subject]] — deeper per-subject integrity check (surface files, vertex
  counts, timestamps); complementary to this batch-level status view.
- [[reconbatchjobs]] — the recon-all parallel-execution helper; a batch launched
  through it is exactly what `check_recons.sh` is designed to monitor.
- [[post-recon-all]] — the post-processing driver you would run on the subjects
  this tool reports as completed.

## Confidence and Gaps

**High confidence:** the four classification rules, the 60-minute activity
threshold, the marker files used, the argument handling, and the non-destructive,
print-only behaviour were all read directly from the 71-line
[`scripts/check_recons.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh),
and the marker-file semantics were confirmed against recon-all
([`scripts/recon-all:498-500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L498-L500), [`:804-836`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L804-L836)).

## References

- FreeSurfer source: [`scripts/check_recons.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/check_recons.sh) (v8.2.0).
- recon-all state markers: `recon-all.done`/`recon-all.error`
  ([`scripts/recon-all:498-500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L498-L500)) and `IsRunning.*`
  ([`scripts/recon-all:802-842`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L802-L842)).
