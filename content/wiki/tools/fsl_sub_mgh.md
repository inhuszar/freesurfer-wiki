---
title: "fsl_sub_mgh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/fsl_sub_mgh"
families: []                     # FSL-bridge cluster dispatcher (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[bedpostx_mgh]]"
  - "[[trac-all]]"
  - "[[fslregister]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The PBS and SLURM batching arithmetic (nbatch/ninbatch) and the held-job release logic are Martinos-specific; behaviour on a generic SLURM/PBS site was not exercised."
tags:
  - cluster
  - scheduler
  - fsl
  - tracula
  - bedpostx
---

# fsl_sub_mgh

## Summary

`fsl_sub_mgh` is the MGH/Martinos replacement for FSL's `fsl_sub` cluster
dispatcher. It takes a command (or a task file of many commands) and submits it
to a compute cluster, abstracting over four back ends — **SGE**, **PBS**,
**SLURM**, and **NONE** (run locally) — which it auto-detects from the
environment. It echoes the resulting **job ID(s)** to stdout so that callers can
chain dependent jobs (run job B only after job A completes). The MGH version was
forked from FSL's `fsl_sub` by Anastasia Yendiki to add PBS and SLURM support
for the Martinos Center cluster, and is the dispatcher used by
FreeSurfer's diffusion tools [[bedpostx_mgh]] and [[trac-all]].

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh)
- **Origin:** modified from FSL's `fsl_sub` (Dave Flitney & Stephen Smith, FMRIB) by Anastasia Yendiki ([`scripts/fsl_sub_mgh:1-5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L1-L5)); retains FSL's University of Oxford non-commercial licence header.
- **Binary/script location:** `$FREESURFER_HOME/bin/fsl_sub_mgh`
- **External dependency:** a **cluster scheduler** — `qsub` (SGE), `pbsubmit`/`qstat`/`qrls` (PBS), or `srun`/`sbatch` (SLURM). With no scheduler it falls back to running the command with `/bin/sh`.

## Purpose and Context

FSL programs that want to parallelise (most prominently `bedpostx`, which fits a
diffusion model independently per slice) call a single dispatch script,
`fsl_sub`, to submit their work to whatever cluster the site runs. FSL ships an
SGE-oriented `fsl_sub` that each site is expected to edit. `fsl_sub_mgh` is
FreeSurfer's pre-edited variant: it keeps FSL's SGE path and adds **PBS** and
**SLURM** branches tuned for the Martinos cluster (job batching to cap
concurrency, dependency chaining, automatic release of held jobs). It is a
**cluster-job dispatcher**, not an imaging tool — it neither reads nor writes
neuroimaging data.

It is invoked **internally** by FreeSurfer's diffusion pipeline:
[[bedpostx_mgh]] uses it to submit the pre-proc, per-slice fit, and post-proc
stages with dependencies between them, and [[trac-all]] uses it to queue
TRACULA's pre-processing, path-reconstruction, and group-table stages
([`scripts/trac-all:1278-1291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1278-L1291)). The header notes it is "only intended to work
with bedpostx_mgh" ([`scripts/fsl_sub_mgh:190-193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L190-L193)).

## Inputs

### Required Inputs

- **A command to run**, given as the trailing arguments (e.g.
  `fsl_sub_mgh gzip *.img`), **or**
- **A task file** via `-t <file>`, one shell command per line, all submitted to
  run in parallel (an array job).

Exactly one of these supplies the work; supplying both a `-t` file *and* trailing
command text is rejected as "Spurious input"
([`scripts/fsl_sub_mgh:361-365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L361-L365)).

### Input Assumptions

> [!assumption] The back end is auto-detected from the environment
> The submission method is chosen at startup from environment markers, **in this
> order** ([`scripts/fsl_sub_mgh:95-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L95-L126)): if `$SGE_ROOT` is set (or an SGE
> `settings.sh` is found) → **SGE**; else if `/pbs` exists and `$PBS_JOBID` is
> unset → **PBS**; else if `/usr/bin/srun` exists and `$SLURM_JOB_ID` is unset →
> **SLURM**; else → **NONE** (run locally). A user can force local execution by
> unsetting `$SGE_ROOT`. The `-q`/`-T` queue names (`short.q`, `long.q`, …) are
> the SGE convention and may not map onto a given PBS/SLURM site.

- For a **task file**, the number of tasks is `wc -l` of the file; commands are
  selected by line number at run time (`sed -n "${TASK_ID}p"`).
- PBS and SLURM honour Martinos-specific environment variables for queue, max
  concurrent jobs, wait interval, and architecture (see the flag table notes).

## Outputs

### Files Created

`fsl_sub_mgh` writes **no imaging files**. Its observable output is:

| Output | Where | Contents |
|--------|-------|----------|
| **Job ID(s)** | **stdout** | the scheduler job ID for a single job, or a colon-separated list of IDs for a batched task file (PBS) — designed to be captured and passed to a later `-j` dependency. |
| scheduler log files | `-l <logdir>` (created if given) | stdout/stderr of the submitted job(s); naming follows each back end's convention (e.g. `slurm-%j.out`, `<jobname>.o<pid>` for NONE). |

### Output Specifications

The stdout job-ID format differs by back end: SGE prints the 3rd field of
`qsub`'s reply (and strips a trailing `.suffix` for array jobs); PBS prints the
numeric part of the `pbsubmit` reply, or for a task file a **`:`-separated list**
of the last job ID of each batch so it can be handed to the next stage's `-j`;
SLURM prints the last field of `srun`/`sbatch`; NONE prints the script's own PID
(`$$`) ([`scripts/fsl_sub_mgh:387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L387), [`428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L428), [`463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L463), [`496`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L496), [`554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L554)).

## Mathematical Foundations

None — `fsl_sub_mgh` performs no numerical or image computation. The only
arithmetic is **job batching**: for PBS/SLURM task files it computes how many
batches are needed to keep concurrent jobs under a configured maximum, e.g.
`nbatch = ceil(tasks / MAXJOBS)` and `ninbatch = ceil(tasks / nbatch)`
([`scripts/fsl_sub_mgh:308-316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L308-L316)), used to stride through the task file.

## Configuration Options

### Complete Flag Reference

Options are parsed with `getopt T:q:a:p:M:j:t:N:Fvm:l:s:`
([`scripts/fsl_sub_mgh:204`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L204), case block [`273-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L273-L340)). All are **single-dash**.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-T` | int (minutes) | — | Estimated job length; maps to a queue via `map_qname` (≤20→`veryshort.q`, ≤120→`short.q`, ≤1440→`long.q`, else `verylong.q`). On PBS this just resets the queue to `$MYPBSQUEUE`. |
| `-q` | string | `long.q` (SGE) / `$MYPBSQUEUE` (PBS) / `$MY_SLURM_PARTITION` (SLURM) | Queue/partition name. |
| `-a` | string | — | Required hardware architecture (e.g. `darwin`, `lx24-amd64`); sets `-l arch=` (SGE), `nodes=1:` (PBS), or `--constraint=` (SLURM). |
| `-p` | int `[0:-1024]` | `0` | Job priority (lower = lower priority); SGE/PBS only. |
| `-M` | string | `$(whoami)` | Email address for notifications. |
| `-j` | string (job ID) | — | Hold this job until job `<jid>` completes (dependency): `-hold_jid` (SGE), `-W depend=afterok:` (PBS), `--dependency=afterok:` (SLURM). The key feature for pipeline chaining. |
| `-t` | string (file) | — | Task file: one command per line, all submitted in parallel as an array job. |
| `-N` | string | basename of taskfile or command | Job name as shown in the queue. |
| `-l` | string (dir) | — | Directory for stdout/stderr log files; the directory is created. |
| `-m` | string | `as` (SGE) / `abe` (PBS) / `ALL` (SLURM) | Mail options (passed to `qsub -m`, etc.). |
| `-s` | string | — | PBS shell option (`pbsubmit -s`). |
| `-F` | bool | off | "Script mode": use queuing options embedded in the submitted script rather than the standard `fsl_sub_mgh` ones. |
| `-v` | bool | off (or `$FSLSUBVERBOSE`) | Verbose: echo the constructed scheduler command and the work to stderr. |

> [!gotcha] The `-q` queue names are SGE-flavoured
> The usage text advertises `verylong.q`, `long.q`, `short.q`. These map cleanly
> onto SGE; on PBS/SLURM the value is passed through as the partition/queue name,
> so it must match a real queue at your site. `-T` auto-selects one of these
> SGE-style names, which is meaningful only on SGE.

### Configuration Interactions

> [!gotcha] A task file (`-t`) and a trailing command cannot be combined
> If `-t` is given **and** there are leftover command arguments, the script
> prints "Spurious input after parsing command line!" and exits
> ([`scripts/fsl_sub_mgh:361-365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L361-L365)). Submit *either* one inline command *or* a
> task file of many.

- **`-T` vs `-q`.** `-T` sets the queue from the time estimate; an explicit `-q`
  overrides it if it comes later on the command line (last write wins). On PBS,
  `-T` simply re-pins the queue to `$MYPBSQUEUE`.
- **Back end gates almost everything.** The chosen `METHOD` decides which
  scheduler-specific variables (`sge_*`, `pbs_*`, `slurm_*`) are actually used;
  flags that set the others are harmless no-ops. E.g. `-p` (priority) is honoured
  by SGE/PBS but not SLURM.
- **`-N` defaulting.** If `-N` is omitted, the job name is the basename of the
  task file (if `-t`) or of the command ([`scripts/fsl_sub_mgh:347-353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L347-L353)).
- **PBS task-file batching** is governed by environment variables, not flags:
  `MYPBSMAXJOBS` (max concurrent, default 40), `MYPBSWAIT` (sleep between
  submissions, default 20 s), `MYPBSQUEUE`, `MYPBSARCH`. SLURM equivalents:
  `MY_SLURM_MAX_JOBS` (default 200), `MY_SLURM_WAIT`, `MY_SLURM_PARTITION`,
  `MY_SLURM_ARCH` ([`scripts/fsl_sub_mgh:101-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L101-L122)).

## Typical Use Cases

### Use Case 1: Submit a single command and capture its job ID

```bash
# Submit; stdout is the scheduler job ID
jobid=$(fsl_sub_mgh -N gzipjob gzip *.img *.hdr)
```

### Use Case 2: Chain a dependent job

```bash
# Run 'post' only after 'pre' (job id $preid) succeeds
preid=$(fsl_sub_mgh -N pre  -l logs pre_step.sh subj)
postid=$(fsl_sub_mgh -j $preid -N post -l logs post_step.sh subj)
```

This dependency pattern is exactly how [[bedpostx_mgh]] chains pre-proc →
per-slice fit → post-proc.

### Use Case 3: Parallel array job from a task file

```bash
# Each line of commands.txt is run in parallel as one array task
fsl_sub_mgh -N bedpostx -l logs -t commands.txt
```

### Use Case 4: TRACULA stage submission (as in trac-all)

```bash
# trac-all submits its per-subject command list and holds the queue name
preid=$(fsl_sub_mgh -l $pbslogdir/log -m a -N trcpre -t $submitfile)
```

## Pipeline Context

`fsl_sub_mgh` is **not** part of [[wiki/pipelines/recon-all|recon-all]]. It is a
dispatch utility used by FreeSurfer's **diffusion** tooling:

**Predecessors (callers):** [[trac-all]] (TRACULA: submits the preproc, path,
and group stages, [`scripts/trac-all:1278-1291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1278-L1291)) and [[bedpostx_mgh]]
(diffusion model fitting: chains preproc → bedpostx array → postproc,
[`scripts/bedpostx_mgh:317-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L317-L352)) → **This tool** → the **cluster scheduler**
(`qsub`/`pbsubmit`/`srun`) runs the actual FreeSurfer/FSL commands. The job IDs
it prints are the glue that lets those pipelines express
"run-after-completion" dependencies.

## Gotchas and Caveats

> [!gotcha] Defaults to running locally when no cluster is detected
> If none of SGE/PBS/SLURM is detected, `METHOD=NONE` and the command is run
> **immediately and synchronously** with `/bin/sh`, with output redirected to
> `${LogDir}${JobName}.o$$` ([`scripts/fsl_sub_mgh:528-555`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L528-L555)). The "job ID"
> printed is the script's PID. This is convenient for single-machine use but
> means a `-j` dependency on a NONE-mode "job" is meaningless (it has already
> finished).

> [!gotcha] Intended for the Martinos cluster
> The PBS/SLURM branches encode Martinos-specific assumptions (the `/pbs`
> directory test, `pbsubmit` rather than `qsub`, the held-job release via
> `qrls`). The header explicitly scopes the tool to `bedpostx_mgh`. On other
> sites the SGE path (or `NONE`) is the most portable.

> [!gotcha] PBS releases held jobs at the end
> After PBS submission the script queries `qstat` for the user's held (`H`) jobs
> and runs `qrls` on them ([`scripts/fsl_sub_mgh:469-473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L469-L473)) — a workaround for jobs
> that were held because the job they depended on had already finished (e.g. a
> single-slice job submitted after preprocessing ended). This is a side effect on
> *all* of the user's held jobs, not just this submission.

## Error Compensation and Guard Rails

- **Back-end auto-detection** with a safe `NONE` fallback so the same callers
  work on a laptop and on a cluster.
- **Argument sanity checks:** a missing task file is rejected ("invalid
  input!"), and mixing `-t` with inline command text is rejected
  ([`scripts/fsl_sub_mgh:355-365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh#L355-L365)).
- **Concurrency capping** (PBS/SLURM) batches large task files so the cluster is
  not flooded.
- **Held-job release** (PBS) recovers from dependency races.

## Related Tools

- [[bedpostx_mgh]] — the primary caller; uses `fsl_sub_mgh` to submit and chain its diffusion-model-fitting stages.
- [[trac-all]] — the TRACULA pipeline; submits its processing stages through `fsl_sub_mgh`.
- [[fslregister]] — another FSL-bridge utility in the same family (FLIRT wrapper), but unrelated to job dispatch.
- FSL `fsl_sub` *(no wiki page)* — the upstream FMRIB script this is forked from; `fsl_sub_mgh` adds PBS/SLURM support and Martinos batching.

## Confidence and Gaps

**High confidence:** the four back ends and their detection order, the complete
`getopt` flag set, the `-t` task-file vs inline-command rule, the `-j`
dependency mechanism per back end, the job-ID stdout formats, and the
environment variables that tune PBS/SLURM batching — all read directly from
[`scripts/fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh).

> [!gap] Generic PBS/SLURM behaviour
> The PBS (`pbsubmit`) and SLURM batching/held-job-release logic is written for
> the Martinos cluster; on a standard PBS or SLURM installation the exact
> commands and the `/pbs` detection may not apply. Not tested on a non-Martinos
> scheduler.

## References

- FreeSurfer source: [`scripts/fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh) (v8.2.0).
- Upstream: FSL `fsl_sub` (FMRIB Software Library). https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SGE%28Queues%29
- Callers: [`scripts/trac-all:1278-1291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1278-L1291), [`scripts/bedpostx_mgh:317-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L317-L352).
