---
title: "long_submit_postproc"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_submit_postproc"
families: ["long_*"]
recon_all_stage: null
related:
  - "[[long_submit_jobs]]"
  - "[[long_stats_slopes]]"
  - "[[long_stats_tps]]"
  - "[[longitudinal-processing]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The cluster submission command (mycluster) is empty by default and must be hand-edited for non-NMR sites; pbsubmit semantics on the legacy launchpad/seychelles hosts could not be verified at v8.2.0."
  - "The internal comment/help block (and the logger name 'long_submit_jobs') is copied from long_submit_jobs and mentions waiting for 'base or long' files, which this post-processing submitter does not actually do."
tags:
  - longitudinal
  - cluster
  - job-submission
  - postprocessing
  - pbs
---

# long_submit_postproc

## Summary

`long_submit_postproc` submits **per-subject post-processing jobs** for a
longitudinal study to a compute cluster. Given a longitudinal qdec table and the
name of any longitudinal script that accepts a `--qdec` flag (typically
[[long_stats_slopes]] or [[long_stats_tps]]), it splits the qdec table into one
sub-table per subject template (`fsid-base`), writes a per-subject command file
that calls the target script on that sub-table with your chosen flags, and submits
each as a separate cluster job — throttling the number of concurrent jobs. It is
the post-processing counterpart of [[long_submit_jobs]] (which submits the
recon-all cross/base/long stages); this one fans a stats/analysis step out across
subjects in parallel.

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`; uses `optparse`)
- **Source file:** [`scripts/long_submit_postproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc)
- **Binary/script location:** `$FREESURFER_HOME/bin/long_submit_postproc`
- **Key library import:** `LongQdecTable`, `BadFileError` from `fsbindings.legacy` ([`scripts/long_submit_postproc:36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L36)); the `LongQdecTable.split('fsid-base')` method ([`scripts/long_submit_postproc:316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L316)) produces the per-subject sub-tables.
- **External programs invoked:** `pbsubmit` (via the templated command strings, [`scripts/long_submit_postproc:60-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L60-L61)), `qstat` (job counting, [`scripts/long_submit_postproc:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L121)), and whatever script is named by `--prog`.

> [!gotcha] The source filename comment is `long_submit_stuff`
> The header comment names the script `long_submit_stuff`
> ([`scripts/long_submit_postproc:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L4)) and the logger is named
> `long_submit_jobs` ([`scripts/long_submit_postproc:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L42)); the installed
> command is `long_submit_postproc`. These are cosmetic copy-paste leftovers from
> [[long_submit_jobs]] and do not affect behaviour.

## Purpose and Context

After the longitudinal recon-all stream finishes, the per-subject statistics step
(slopes, time-point extraction, or any custom `--qdec` analysis) can be slow when
run serially over a large study. `long_submit_postproc` parallelises it:

1. It reads the whole-study longitudinal qdec table.
2. It splits it into one sub-table per `fsid-base`, so each subject's time points
   land in their own qdec file.
3. For each sub-table it builds the command `<prog> <flags> --qdec <subtable>` and
   submits it as a cluster job.

Because it appends `--qdec <subtable>` itself, the target program needs to accept
a `--qdec` flag — which is exactly the interface of [[long_stats_slopes]] and
[[long_stats_tps]]. It is a **generic per-subject dispatcher**, run by hand after
the longitudinal runs complete; it is **not** part of, and does not call,
[[wiki/pipelines/recon-all|recon-all]]. See [[longitudinal-processing]] for the
surrounding pipeline.

## Inputs

### Required Inputs

- **Longitudinal qdec table** (`--qdec`) — whitespace-delimited; first two
  columns `fsid` and `fsid-base`. Parsed by `LongQdecTable`
  ([`scripts/long_submit_postproc:304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L304)) and split on `fsid-base`. A
  cross-sectional table (2nd column not `fsid-base`) is rejected
  ([`scripts/long_submit_postproc:311-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L311-L314)).
- **Target program** (`--prog`) — the longitudinal script to run per subject; it
  must accept a `--qdec` flag (e.g. `long_stats_slopes`, `long_stats_tps`).
- **`$FREESURFER_HOME`** must be set ([`scripts/long_submit_postproc:226-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L226-L229)).

### Input Assumptions

> [!assumption] `--prog` consumes `--qdec` and works on a single-subject table
> The dispatcher only knows how to append `--qdec <subtable>` and pass through
> `--flags`; the target program must understand `--qdec` and produce its outputs
> from a one-subject qdec table. The longitudinal recon-all results that the
> target reads are assumed to already exist. `--flags` is interpolated verbatim
> into the command string ([`scripts/long_submit_postproc:325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L325)), so it must
> be quoted as a single argument.

> [!gotcha] You must edit the script for your own cluster
> Like [[long_submit_jobs]], the submission command is hostname-selected:
> `launchpad`/`seychelles` have built-in `pbsubmit` templates
> ([`scripts/long_submit_postproc:60-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L60-L61)), and any other host falls back to
> the **empty** `mycluster` template ([`scripts/long_submit_postproc:54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L54)),
> which aborts with "job submission failed, maybe unknown host"
> ([`scripts/long_submit_postproc:84-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L84-L87)). Edit `mycluster`/`queueflag`, or
> use `--simulate`, off-site.

## Outputs

### Files Created

All written into `--dir` (default the current directory, `./`):

| File | Contents |
|------|----------|
| `long.qdec.<base>.dat` | The per-subject sub-table for template `<base>`, written for every subject ([`scripts/long_submit_postproc:321-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L321-L323)). |
| `long.command.<base>.cmdf` | The executable command file `<prog> <flags> --qdec long.qdec.<base>.dat` submitted to the cluster (created only when not simulating, [`scripts/long_submit_postproc:327-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L327-L331)). |

The actual analysis outputs (slope tables, time-point tables, …) are produced by
the `--prog` jobs, in whatever location that program writes to.

### Output Specifications

`long.qdec.<base>.dat` is a longitudinal qdec sub-table (same format as the input,
restricted to one `fsid-base`). `long.command.<base>.cmdf` is a one-line shell
command file made executable for the user (`stat.S_IRWXU`,
[`scripts/long_submit_postproc:331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L331)). Submission progress and a running count
are printed to stdout.

## Mathematical Foundations

None — this is a job-submission orchestrator. The only quantitative behaviour is
the concurrency throttle `wait_jobs(max)`, which blocks while the user's job count
(`qstat | grep $USER | wc -l`) is **at or above** `max`, polling every 30 s
([`scripts/long_submit_postproc:103-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L103-L144)). (All statistics computation lives
in the dispatched `--prog`, e.g. [[long_stats_slopes]].)

> [!gotcha] `wait_jobs` threshold differs by one from long_submit_jobs
> Here the loop breaks when `int(num) <= maxjobs`
> ([`scripts/long_submit_postproc:135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L135)), whereas [[long_submit_jobs]] breaks
> on `< maxjobs`. So with the same `--max`, this submitter allows one more
> concurrent job before waiting. Minor, but worth knowing if you tune `--max`
> tightly.

## Configuration Options

### Complete Flag Reference

Enumerated from the `optparse` setup ([`scripts/long_submit_postproc:190-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L190-L240)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string | *(required)* | Longitudinal qdec table; first two columns `fsid fsid-base`. Split into one sub-table per subject. |
| `--prog` | string | *(required)* | Longitudinal script to run per subject; must accept `--qdec` (e.g. `long_stats_slopes`, `long_stats_tps`). |
| `--flags` | string | *(none)* | Parameters (everything **except** `--qdec`) to pass to `--prog`. Quote as one argument, e.g. `--flags "--stats aseg.stats --meas volume --sd $SUBJECTS_DIR --do-rate"`. |
| `--dir` | string | `./` | Directory to store the per-subject sub-tables and command files. Created if absent. |
| `--simulate` | bool | off | Do not submit; just print the assembled commands. |
| `--pause` | float | `13` | Seconds to pause between submissions. |
| `--max` | int | `100` | Maximum simultaneous jobs for this user before `wait_jobs` blocks. |
| `--queue` | string | off | Scheduler queue, appended after `queueflag` (default `-q`). |

### Configuration Interactions

> [!gotcha] `--flags` must not include `--qdec`
> The dispatcher appends `--qdec <subtable>` itself
> ([`scripts/long_submit_postproc:325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L325)). Putting a `--qdec` inside `--flags`
> would pass two `--qdec` options to the target program. Pass every *other*
> argument the target needs via `--flags`, quoted as a single string.

> [!gotcha] `--simulate` writes neither sub-tables-as-jobs nor command files… but it does write sub-tables
> The per-subject sub-table `long.qdec.<base>.dat` is written **unconditionally**
> (before the simulate check, [`scripts/long_submit_postproc:321-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L321-L323)). Only the
> `.cmdf` creation and submission are gated by `--simulate`
> ([`scripts/long_submit_postproc:326-339`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L326-L339)). So `--simulate` still populates `--dir`
> with the split qdec tables, which is handy for inspecting the split.

> [!gotcha] `--prog` is not validated
> The script does not check that `--prog` exists or accepts `--qdec`; an unknown
> or incompatible program simply fails inside the cluster job. Test with
> `--simulate` first to see the exact commands.

## Typical Use Cases

### Use Case 1: Parallelise slope computation across subjects

```bash
# One long_stats_slopes job per subject, computing rate + spc for aseg volume.
long_submit_postproc \
  --qdec long.qdec.table.dat \
  --prog long_stats_slopes \
  --flags "--stats aseg.stats --meas volume --sd $SUBJECTS_DIR --do-rate --do-spc --time age" \
  --dir /studies/postproc \
  --max 80
```

### Use Case 2: Parallelise a single-time-point extraction

```bash
long_submit_postproc \
  --qdec long.qdec.table.dat \
  --prog long_stats_tps \
  --flags "--stats lh.aparc.stats --meas thickness --sd $SUBJECTS_DIR --tp 1 --out lh.aparc.thickness.tp1.dat" \
  --dir /studies/postproc
```

### Use Case 3: Dry run to inspect the per-subject commands

```bash
long_submit_postproc \
  --qdec long.qdec.table.dat \
  --prog long_stats_slopes \
  --flags "--stats aseg.stats --meas volume --sd $SUBJECTS_DIR --do-rate" \
  --dir /studies/postproc --simulate
```

## Pipeline Context

`long_submit_postproc` is a **post-processing batch dispatcher**. It is not part
of, and does not call, [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** completed longitudinal recon-all results (typically submitted by
[[long_submit_jobs]]) → **`long_submit_postproc`** (fans out per subject) →
**Successor:** the per-subject outputs of the dispatched program
([[long_stats_slopes]] slope/percent-change tables, [[long_stats_tps]] time-point
tables), then group analysis.

See [[longitudinal-processing]] for the conceptual overview and
[[long_submit_jobs]] for submitting the recon-all stages that come before this.

## Gotchas and Caveats

> [!gotcha] Hostname-driven submission template (empty off-site)
> The command is chosen from `$HOSTNAME` (`launchpad`/`seychelles`, else the empty
> `mycluster`, [`scripts/long_submit_postproc:72-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L72-L77)). On an unconfigured host
> submission aborts; this is a site-specific template you adapt.

> [!gotcha] Concurrency throttle depends on `qstat`
> If `qstat` cannot run, `wait_jobs` returns immediately and submits without
> throttling ([`scripts/long_submit_postproc:120-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L120-L124)) — `--max` is silently
> ignored on non-PBS systems.

> [!gotcha] Stale help text about "waiting for base or long"
> The summary block (copied from [[long_submit_jobs]]) says it "will wait with
> submission of base or long until necessary files are available"
> ([`scripts/long_submit_postproc:156-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L156-L164)). This post-processing submitter
> does **no** such dependency waiting — it just splits the table and submits one
> job per subject. Code is authoritative.

## Error Compensation and Guard Rails

- **`$FREESURFER_HOME` required** before doing anything ([`scripts/long_submit_postproc:226-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L226-L229)).
- **`--dir` auto-created** if it does not exist ([`scripts/long_submit_postproc:237-238`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L237-L238)).
- **Cross-sectional qdec rejected** ([`scripts/long_submit_postproc:311-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L311-L314)).
- **Submission failure is fatal.** A non-zero `pbsubmit` return, or an empty
  `mycluster` template, exits the script ([`scripts/long_submit_postproc:84-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc#L84-L99)).

## Related Tools

- [[long_submit_jobs]] — sibling submitter for the **recon-all cross/base/long
  stages**; shares the same `pbsubmit`/`qstat`/`mycluster` machinery and the same
  need to be edited for your site.
- [[long_stats_slopes]] — the most common `--prog` target (within-subject slopes
  and percent change).
- [[long_stats_tps]] — alternative `--prog` target (single-time-point extraction).
- [[wiki/pipelines/recon-all|recon-all]] — produces the longitudinal results the
  dispatched programs read.
- [[longitudinal-processing]] — the concept page for the whole stream.

## Confidence and Gaps

**High confidence:** the complete flag set and defaults, the per-subject
`fsid-base` split, the command assembly (`--qdec` appended automatically), the
unconditional sub-table writing vs. simulate-gated submission, and the
`qstat`-based throttle — all read directly from
[`scripts/long_submit_postproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc).

> [!gap] Site portability
> The submission command is empty for non-NMR hosts and the throttle relies on
> Torque/PBS `qstat`; on other schedulers the script must be hand-edited and
> `--max` is ineffective. This could not be exercised here.

## References

- FreeSurfer source: [`scripts/long_submit_postproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_submit_postproc) (v8.2.0).
- Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181-1196, 2010. <http://dx.doi.org/10.1016/j.neuroimage.2010.07.020>
- Reuter M, Fischl B. *Avoiding Asymmetry-Induced Bias in Longitudinal Image Processing.* NeuroImage 57(1):19-21, 2011. <http://dx.doi.org/10.1016/j.neuroimage.2011.02.076>
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. <http://dx.doi.org/10.1016/j.neuroimage.2012.02.084>
