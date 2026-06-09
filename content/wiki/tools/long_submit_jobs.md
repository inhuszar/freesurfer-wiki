---
title: "long_submit_jobs"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_submit_jobs"
families: ["long_*"]
recon_all_stage: null
related:
  - "[[long_submit_postproc]]"
  - "[[long_stats_slopes]]"
  - "[[long_stats_tps]]"
  - "[[longitudinal-processing]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The cluster submission command (mycluster) is empty by default and must be hand-edited in the script for any site other than the NMR launchpad/nike/seychelles hosts; the exact pbsubmit semantics on those legacy hosts could not be verified at v8.2.0."
  - "qstat-based job counting (wait_jobs) assumes a Torque/PBS environment; behaviour under Slurm or other schedulers is undefined."
tags:
  - longitudinal
  - cluster
  - job-submission
  - recon-all
  - pbs
---

# long_submit_jobs

## Summary

`long_submit_jobs` orchestrates an **entire longitudinal recon-all study on a
compute cluster**. Driven by a longitudinal qdec table, it submits the three
stages of the stream — cross-sectional, base (within-subject template), and
longitudinal time-point — as separate cluster jobs, in the correct dependency
order. It enforces that order by **polling the filesystem**: before submitting a
base it waits for each cross-sectional `norm.mgz`; before submitting a
longitudinal time point it waits for the base's `recon-all.done`. It throttles the
number of concurrent jobs, sets up the per-stage subjects directories and symlinks
that the longitudinal stream needs, caches a copy of the `recon-all` script used,
and can also just **check** whether all longitudinal runs have finished. It is the
batch analogue of running `recon-all -all`, `recon-all -base`, and
`recon-all -long` by hand for every subject.

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`; uses `optparse`)
- **Source file:** [`scripts/long_submit_jobs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs)
- **Binary/script location:** `$FREESURFER_HOME/bin/long_submit_jobs`
- **Key library import:** `LongQdecTable`, `BadFileError` from `fsbindings.legacy` ([`scripts/long_submit_jobs:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L37)).
- **External programs invoked:** `pbsubmit` (the NMR cluster submission wrapper, via the templated command strings, [`scripts/long_submit_jobs:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L60-L63)), `qstat` (job counting in `wait_jobs`, [`scripts/long_submit_jobs:125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L125)), and a cached copy of [`recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L377) which is the actual command placed in each job file.

## Purpose and Context

The FreeSurfer longitudinal stream (see [[longitudinal-processing]]) is a
three-stage dependency graph **per subject**:

1. **cross** — process each time point cross-sectionally
   (`recon-all -all -s <tpNid>`),
2. **base** — build the unbiased within-subject template from that subject's
   cross runs (`recon-all -base <template> -tp …`), which requires each cross
   `mri/norm.mgz`,
3. **long** — process each time point against the base
   (`recon-all -long <tpNid> <template>`), which requires the base's
   `recon-all.done`.

Running this by hand for a study of dozens of subjects, each with several time
points, is tedious and error-prone. `long_submit_jobs` automates it: one command
submits all three stages for every subject, waiting on the inter-stage
dependencies so that jobs can be queued before their predecessors have finished.
It is a **driver script**, not part of [[wiki/pipelines/recon-all|recon-all]] —
it *calls* `recon-all`. It is intended for the NMR/Martinos Torque-style cluster
(hosts `launchpad`, `nike`, `seychelles`) but is meant to be edited for other
sites.

> [!gotcha] You must edit the script for your own cluster
> The submission command is selected by hostname. For the NMR hosts `launchpad`,
> `nike`, and `seychelles` there are built-in `pbsubmit` templates
> ([`scripts/long_submit_jobs:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L60-L63)); for **any other host** the
> `mycluster` template is used, and it is **empty by default**
> ([`scripts/long_submit_jobs:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L55)). With an empty template the script prints
> "job submission failed, maybe unknown host" and exits
> ([`scripts/long_submit_jobs:88-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L88-L91)). Edit `mycluster` (and `queueflag`) to
> match your scheduler before running off-site, or use `--simulate`/`--simfiles`.

## Inputs

### Required Inputs

- **Longitudinal qdec table** (`--qdec`) — whitespace-delimited; first two
  columns `fsid` and `fsid-base`, grouping each subject's time points. Parsed by
  `LongQdecTable` ([`scripts/long_submit_jobs:1095`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L1095)). Comment lines start
  with `#`.
- **Cross subjects dir** (`--cdir`) — the subjects directory that already
  contains the cross-sectional input subjects (one `<tpNid>/` per time point with
  at least an input ready for `recon-all`). Required. It is inherited by base and
  long unless overridden.
- **`$FREESURFER_HOME`** must be set and `$FREESURFER_HOME/bin/recon-all` must
  exist ([`scripts/long_submit_jobs:371-380`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L371-L380)).

The base dir (`--bdir`) and long dir (`--ldir`) are optional and **inherit**: if
omitted, `--bdir` defaults to `--cdir` and `--ldir` defaults to `--bdir`
([`scripts/long_submit_jobs:394-402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L394-L402)). Directories that do not yet exist for
base/long are created.

### Input Assumptions

> [!assumption] Cross inputs are present; the stream is run in dependency order
> `--cdir` must already hold each cross-sectional subject directory; the script
> never creates the cross inputs, only the base/long output dirs. Within a single
> invocation it submits cross → base → long and inserts the dependency waits, so
> base/long jobs may be queued before their inputs exist (they wait on
> `IsRunning.lh+rh` and the required files). A cross-sectional qdec table (2nd
> column not `fsid-base`) is rejected if base/long/check is requested
> ([`scripts/long_submit_jobs:1102-1105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L1102-L1105)) — only `--cross` works with such
> a table.

> [!gotcha] Keep cross in its own directory, share base+long
> The help recommends putting the cross-sectional runs in a *different* directory
> from base+long, so the same cross runs can drive several base/long streams with
> different parameters ([`scripts/long_submit_jobs:237-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L237-L247)). The inheritance
> rule (`ldir`←`bdir`←`cdir`) makes `--cdir X --bdir Y` put base and long under
> `Y` while cross stays in `X`.

## Outputs

### Files Created

`long_submit_jobs` is a submitter; the heavy outputs are produced by the
`recon-all` jobs it queues. It directly creates:

| Path | Contents |
|------|----------|
| `<cdir>/<tpid>/scripts_submitted/<tpid>-cross.cmdf` | The cross-sectional `recon-all -s <tpid> -sd <cdir> <cflags>` command file submitted to the cluster ([`scripts/long_submit_jobs:590-596`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L590-L596)). |
| `<bdir>/scripts_submitted/<template>-base.cmdf` | The base `recon-all -sd <bdir> -base <template> -tp … <bflags>` command file ([`scripts/long_submit_jobs:751-757`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L751-L757)). |
| `<ldir>/scripts_submitted/<tpid>-long.cmdf` | The longitudinal `recon-all -sd <ldir> -long <tpid> <template> <lflags>` command file ([`scripts/long_submit_jobs:950-956`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L950-L956)). |
| `<cdir|bdir|ldir>/scripts_submitted/recon-all` | A cached copy of the `recon-all` script used for the run (see guard rails). |
| symlinks in `<bdir>` / `<ldir>` | Each cross `<tpid>` is symlinked into the base dir; the base `<template>` and each cross `<tpid>` are symlinked into the long dir, so the stream finds its inputs ([`scripts/long_submit_jobs:738-740`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L738-L740), [`850-851`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L850-L851), [`905-908`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L905-L908)). |

With `--scriptsdir <dir>` all `*.cmdf` and the cached `recon-all` go to one
directory instead of the per-stage `scripts_submitted/` ([`scripts/long_submit_jobs:407-416`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L407-L416)).

### Output Specifications

Each `*.cmdf` is a one-line executable shell command file (mode `rwxrwx---`,
`stat.S_IRWXU | stat.S_IRWXG`) containing exactly the `recon-all` invocation; it
is the file handed to `pbsubmit`. The script prints per-stage summaries (totals,
already-done, already-running, skipped-with-errors, submitted, missing-dir
counts) to stdout.

## Mathematical Foundations

None — this is a workflow/job-submission orchestrator. The only quantitative
logic is the concurrency throttle: `wait_jobs(max)` blocks while the count of the
user's jobs (`qstat | grep $USER | wc -l`) is **not below** `max`, polling every
30 s ([`scripts/long_submit_jobs:107-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L107-L148)).

> [!internal] All neuroimaging computation is in recon-all
> The cross/base/long processing — registration, template estimation, motion
> correction, surfaces, stats — is performed by the queued
> [[wiki/pipelines/recon-all|recon-all]] jobs (and, for the longitudinal motion
> correction step, by [[longmc]]). `long_submit_jobs` only sequences and submits
> them.

## Configuration Options

### Complete Flag Reference

Enumerated from the `optparse` setup ([`scripts/long_submit_jobs:286-446`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L286-L446)). Boolean flags take no argument.

#### Required / directories

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string | *(required)* | Longitudinal qdec table; first two columns `fsid fsid-base`. |
| `--cdir` | string | *(required)* | Subjects dir for the cross-sectional runs (and the source of inputs). Inherited by base and long. |
| `--bdir` | string | inherit from `--cdir` | Subjects dir for base runs. Created if absent. |
| `--ldir` | string | inherit from `--bdir` | Subjects dir for longitudinal runs. Created if absent. |
| `--scriptsdir` | string | `<cdir,bdir,ldir>/scripts_submitted` | Single directory in which to save all submitted command files and the cached `recon-all`. |

#### Stage selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--cross` | bool | all stages if none selected | Process the cross-sectionals. |
| `--base` | bool | all stages if none selected | Process the bases (templates). |
| `--long` | bool | all stages if none selected | Process the longitudinals. |
| `--check` | bool | off | Check whether all longitudinal runs are done (and, if `--long` was also run, wait for them). Does not itself imply the processing stages. |

If none of `--cross`/`--base`/`--long`/`--check` is given, all three processing
stages run ([`scripts/long_submit_jobs:389-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L389-L392)).

#### recon-all flags per stage

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--cflags` | string | `-all` | Flags appended to the cross `recon-all` command (e.g. `--cflags '-all -cw256'`). |
| `--bflags` | string | `-all` | Flags appended to the base `recon-all` command. |
| `--lflags` | string | `-all` | Flags appended to the long `recon-all` command. |
| `--affine` | bool | off | Use affine base registration: switches the base command from `-base` to `-base-affine` ([`scripts/long_submit_jobs:747-749`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L747-L749)). |

#### recon-all caching

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--update-recon-all` | bool | off | Replace the cached per-stage `recon-all` with the current `$FREESURFER_HOME/bin/recon-all`. |
| `--use-recon-all` | string | off | Use this custom `recon-all` script for processing (forces a re-cache). |

#### Submission control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--force` | bool | off | Reprocess even subjects that already finished (`recon-all.done` present). |
| `--simulate` | bool | off | Do not submit (or create command files); just print the commands. |
| `--simfiles` | bool | off | Do not submit, but **do** create the command files. Implies `--simulate` for submission ([`scripts/long_submit_jobs:443-444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L443-L444)). |
| `--skip` | int | `1` | Missing-input policy: `0` = exit on a missing requirement; `1` = skip that item instead of exiting; `2` = skip instead of waiting for a still-running prerequisite. |
| `--skiperror` | bool | off | For cross/base, skip re-submitting a run that ended with `recon-all.error`. (Note the **opposite** default for long — see Configuration Interactions.) |
| `--pause` | float | `13` | Seconds to pause between submissions. |
| `--max` | int | `100` | Maximum simultaneous jobs for this user before `wait_jobs` blocks. |
| `--queue` | string | off | Scheduler queue, appended after `queueflag` (default `-q`). |

#### Resource requests (NMR templates only)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--cmem` | int | `7` | RAM in GB requested for cross jobs. |
| `--bmem`<br>`--mem` | int | `7` | RAM in GB requested for base jobs. |
| `--lmem` | int | `7` | RAM in GB requested for long jobs. |
| `--cnodes` | int | `1` | Nodes/ppn requested for cross jobs. |
| `--bnodes` | int | `1` | Nodes/ppn requested for base jobs. |
| `--lnodes` | int | `1` | Nodes/ppn requested for long jobs. |

The memory/node values are substituted into the `launchpad`/`nike` `pbsubmit`
templates (`nodes=1:ppn=%(nodes)s,vmem=%(mem)sgb`,
[`scripts/long_submit_jobs:61-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L61-L62)); the `seychelles` template ignores them,
and `mycluster` uses whatever you put in it.

#### Advertised but not implemented

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--time` | string | — | **Non-functional.** The `HELPTEXT` DETAILS block claims the qdec time column "can be overwritten with `--time <name>`" ([`scripts/long_submit_jobs:216-217`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L216-L217)), but there is **no** corresponding `add_option('--time', …)` in `options_parse` ([`scripts/long_submit_jobs:331-367`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L331-L367)). `optparse` therefore rejects it with "no such option: --time". The help text is copied from the `long_*` stats scripts (where `--time` is real); in `long_submit_jobs` it does nothing. The time variable is whatever the downstream `--prog`/`recon-all` chain uses.

### Configuration Interactions

> [!gotcha] `--skiperror` has opposite meaning for cross/base vs. long
> For cross and base, an errored run is **re-submitted by default**, and
> `--skiperror` makes it skip ([`scripts/long_submit_jobs:572-575`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L572-L575), [`679-682`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L679-L682)). For long, an errored run is **skipped by
> default**, and you need `--skiperror` *off* (the default) to skip it — the
> condition is inverted: `if iserror and not options.skiperror: skip`
> ([`scripts/long_submit_jobs:934-937`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L934-L937)). Read the per-stage summary to see what
> was actually skipped.

> [!gotcha] `--simfiles` writes command files but submits nothing
> `--simfiles` sets `simulate=True` internally ([`scripts/long_submit_jobs:443-444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L443-L444)), so no jobs are queued, but the `*.cmdf`
> files **are** written (the guard is `if not simulate or simfiles`,
> [`scripts/long_submit_jobs:591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L591)). Use it to generate the exact command
> files for inspection or manual submission. Plain `--simulate` only prints.

> [!gotcha] The `--skip` level changes whether the script *waits* or *moves on*
> `--skip 0` makes a missing prerequisite fatal; `--skip 1` (default) skips the
> affected item but may still **wait** on a still-running prerequisite via
> `wait_file` (60 s polling); `--skip 2` additionally refuses to wait and skips
> any item whose prerequisite is merely running
> ([`scripts/long_submit_jobs:707-714`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L707-L714), [`876-883`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L876-L883)). Use `--skip 2` when you do not want a
> long-running submitter process blocked on incomplete cross runs.

> [!gotcha] Stage inheritance of subjects directories
> `--bdir` defaults to `--cdir`, and `--ldir` defaults to `--bdir`
> ([`scripts/long_submit_jobs:394-398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L394-L398)). Specifying only `--cdir` puts all
> three stages in one directory; specifying `--cdir` and `--bdir` puts base and
> long together under `--bdir`.

> [!gotcha] `--check` without `--long` reports rather than waits
> When `--check` is given and `--long` is not, the checker prints what is still
> running/stalled but does **not** block waiting for completion (`wait =
> options.long`, [`scripts/long_submit_jobs:982`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L982)). Combine `--long --check`
> to submit and then wait for all longitudinals to finish.

## Typical Use Cases

### Use Case 1: Run the whole stream for a study

```bash
# Submit cross, base, and long for every subject in the qdec table.
# Cross stays in its own dir; base+long share another.
long_submit_jobs \
  --qdec long.qdec.table.dat \
  --cdir /studies/cross \
  --bdir /studies/longbase \
  --max 80 --queue myqueue
```

### Use Case 2: Cross first, then base+long later (reusing cross)

```bash
# Day 1: just the cross runs.
long_submit_jobs --qdec long.qdec.table.dat --cdir /studies/cross --cross

# Day 2: base + long against the finished cross, in a separate dir.
long_submit_jobs --qdec long.qdec.table.dat \
  --cdir /studies/cross --bdir /studies/longbase --base --long
```

### Use Case 3: Inspect the exact commands without submitting

```bash
# Write all command files but submit nothing.
long_submit_jobs --qdec long.qdec.table.dat --cdir /studies/cross \
  --scriptsdir /studies/cmdfiles --simfiles
```

### Use Case 4: Check completion of all longitudinals

```bash
long_submit_jobs --qdec long.qdec.table.dat \
  --cdir /studies/cross --bdir /studies/longbase --check
```

## Pipeline Context

`long_submit_jobs` is a **batch driver** for the longitudinal stream. It is not
part of, and is not called by, [[wiki/pipelines/recon-all|recon-all]]; instead it
*submits* `recon-all` jobs for the three stages.

**Predecessor:** prepared cross-sectional input subjects in `--cdir` →
**`long_submit_jobs`** (submits `recon-all -all` / `-base` / `-long`) →
**Successor:** longitudinal results, then per-subject statistics with
[[long_stats_slopes]] / [[long_stats_tps]] (often dispatched via
[[long_submit_postproc]]).

The internal dependency waits mirror the stream's data flow: cross `norm.mgz`
gates the base; base `recon-all.done` gates the long. See
[[longitudinal-processing]] for the conceptual overview and [[longmc]] for the
longitudinal motion-correction step that runs *inside* each long job.

## Gotchas and Caveats

> [!gotcha] Hostname-driven submission template
> The cluster command is chosen from `$HOSTNAME` (`launchpad`/`nike`/`seychelles`
> matched on the first dotted component, else `mycluster`,
> [`scripts/long_submit_jobs:74-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L74-L81)). On an unconfigured host the empty
> `mycluster` template aborts submission. This script is essentially a
> site-specific template you are expected to adapt.

> [!gotcha] Concurrency throttle depends on `qstat`
> `wait_jobs` counts running jobs with `qstat | grep $USER | wc -l`. If `qstat`
> cannot be executed it **returns immediately without waiting** and starts
> submitting ([`scripts/long_submit_jobs:124-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L124-L128)) — so `--max` is silently
> ignored on non-PBS systems.

> [!gotcha] Symlink farm in base/long dirs
> The script symlinks cross time points and the base into the base/long subjects
> dirs so `recon-all` resolves its inputs. These links accumulate; if you move or
> delete the cross/base directories the links dangle.

> [!gotcha] `IsRunning.lh+rh` is the running sentinel
> "Still running" is detected purely by the presence of
> `scripts/IsRunning.lh+rh` ([`scripts/long_submit_jobs:500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L500)). A crashed job
> that left a stale `IsRunning.lh+rh` will be reported as running and skipped;
> remove the stale file (or use `--force`) to re-run.

## Error Compensation and Guard Rails

- **Skip-if-done.** A run whose `scripts/recon-all.done` exists is skipped unless
  `--force` ([`scripts/long_submit_jobs:568-571`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L568-L571), [`675-678`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L675-L678), [`930-933`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L930-L933)).
- **Skip-if-running.** A run with `IsRunning.lh+rh` is skipped to avoid double
  submission ([`scripts/long_submit_jobs:564-567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L564-L567)).
- **Permission checks.** Each target subject dir is checked for r/w/x; missing
  rights are recorded and, under `--skip>0`, skipped rather than fatal
  ([`scripts/long_submit_jobs:579-587`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L579-L587)).
- **Dependency waiting.** `wait_file` polls every 60 s for the required cross
  `norm.mgz` / base `recon-all.done`, and gives an extra 20 s once the file
  appears to ensure it is fully written ([`scripts/long_submit_jobs:470-493`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L470-L493)).
- **recon-all caching for reproducibility.** Each stage caches the `recon-all`
  script it used into `scripts_submitted/`, so all subjects are processed with the
  *same* recon-all even if FreeSurfer is being actively developed during a
  multi-day run ([`scripts/long_submit_jobs:450-467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L450-L467)); `--update-recon-all`
  or `--use-recon-all` refreshes it.
- **Cross-sectional qdec rejected** for base/long/check ([`scripts/long_submit_jobs:1102-1105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs#L1102-L1105)).

## Related Tools

- [[long_submit_postproc]] — the sibling submitter for **post-processing**: it
  dispatches any `--qdec` script (e.g. [[long_stats_slopes]]) per-subject, with
  the same `pbsubmit`/`qstat`/`mycluster` machinery (and the same need to edit it
  for your site).
- [[wiki/pipelines/recon-all|recon-all]] — the program this tool submits for the
  cross, base, and long stages.
- [[longmc]] — the longitudinal motion-correction step run inside each `-long`
  recon-all job.
- [[long_stats_slopes]] / [[long_stats_tps]] — downstream statistics aggregation
  over the longitudinal results.
- [[longitudinal-processing]] — the concept page for the whole stream.

## Confidence and Gaps

**High confidence:** the complete flag set and defaults, the three-stage
ordering and inter-stage dependency waits, the directory inheritance, the
symlink/command-file/recon-all-caching behaviour, the per-stage skip/force/error
logic (including the inverted `--skiperror` sense for long), and the
`--simulate`/`--simfiles` distinction — all read directly from
[`scripts/long_submit_jobs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs).

> [!gap] Site portability
> The submission command is empty for non-NMR hosts and the throttle relies on
> Torque/PBS `qstat`. On a Slurm (or other) cluster the script must be hand-edited
> (`mycluster`, `queueflag`) and `--max` will be ineffective; this could not be
> exercised here.

## References

- FreeSurfer source: [`scripts/long_submit_jobs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_jobs) (v8.2.0).
- Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181-1196, 2010. <http://dx.doi.org/10.1016/j.neuroimage.2010.07.020>
- Reuter M, Fischl B. *Avoiding Asymmetry-Induced Bias in Longitudinal Image Processing.* NeuroImage 57(1):19-21, 2011. <http://dx.doi.org/10.1016/j.neuroimage.2011.02.076>
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. <http://dx.doi.org/10.1016/j.neuroimage.2012.02.084>
