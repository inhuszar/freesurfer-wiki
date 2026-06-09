---
title: "reconbatchjobs"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/reconbatchjobs"
families: []                     # recon-all helper, no mri_*/mris_* family
recon_all_stage: null            # used across all surface stages under -parallel, not one stage
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[post-recon-all]]"
  - "[[check_recons.sh]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - recon-all
  - parallel
  - batch
  - internal-helper
---

# reconbatchjobs

## Summary

`reconbatchjobs` is a small bash helper used internally by
[[wiki/pipelines/recon-all|recon-all]] to run several independent commands
**in parallel** and then merge their results cleanly. Given a main log file and
one or more *command files* (each a plain-text file containing exactly one shell
command), it launches every command as a background job, captures each job's
stdout/stderr into its own per-command log, waits for all of them to finish,
appends those per-command logs to the main log file in order, and exits non-zero
if **any** job failed. Its entire reason for existing is to solve two problems
that arise when you fork recon-all binaries by hand: (1) reliably collecting each
background job's exit status, and (2) preventing the parallel jobs' output from
being interleaved into an unreadable mess in `recon-all.log`.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/reconbatchjobs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs)
- **Binary/script location:** `$FREESURFER_HOME/bin/reconbatchjobs`
- **Original author:** Nick Schmansky

## Purpose and Context

When [[wiki/pipelines/recon-all|recon-all]] is run with `-parallel`, the two
hemispheres (and, in the multi-strip skull-strip stage, several skull-strip
trials) can be processed simultaneously. recon-all does **not** simply background
the commands itself; instead it writes each command it wants to run into a small
file and hands the list of those files to `reconbatchjobs`. The pattern, repeated
at ~32 call sites in the recon-all script (e.g. `-smooth1`, `-inflate1`,
`-qsphere`, `-fix`, `-white`, `-pial`, `-sphere`, `-surfreg`, `-jacobian`,
`-avgcurv`, `-cortparc`, `-parcstats`, …), is:

```tcsh
set CMDFS = ()                           # reset the list
foreach hemi ($hemilist)
  ...
  if($DoParallel) then
    set CMDF = mris_smooth_${hemi}.cmd   # one command file per hemi
    echo "$cmd" > $CMDF
    set CMDFS = ( $CMDFS $CMDF )
  else
    if($RunIt) $fs_time $cmd |& tee -a $LF   # serial path runs it inline
  endif
end
if($RunIt && $DoParallel) then
  reconbatchjobs $LF $CMDFS |& tee -a $LF
  if($status) goto error_exit;
endif
```

So `reconbatchjobs` is the **worker-bee** that recon-all delegates the actual
fork/wait/merge/return-code bookkeeping to. It is essentially never invoked by an
end-user directly; the recon-all script's own comment points readers to the
"multi-strip" section of the skull-strip stage for example usage
([`scripts/recon-all:3520-3527`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3520-L3527)).

> [!gotcha] Commands must be independent — there is no dependency chain
> `reconbatchjobs` launches *all* commands at once and waits for them together.
> It assumes the commands are mutually independent. Anything that must run in
> sequence has to be ordered by the caller (recon-all), which is why recon-all
> only batches the two hemispheres of a single stage together, never steps from
> different stages ([`scripts/reconbatchjobs:29-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L29-L31)).

## Inputs

### Required Inputs

- **`logfile`** (first positional argument) — the main log file to which every
  command's output is appended once it finishes. In recon-all this is `$LF`
  (`recon-all.log`). Read at [`scripts/reconbatchjobs:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L53).
- **One or more command files** (remaining positional arguments) — each is a
  plain-text file whose *entire contents* are read with `` `cat $cmd` `` and
  executed as one command ([`scripts/reconbatchjobs:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L62)). recon-all
  writes these as e.g. `mris_smooth_lh.cmd`, `mris_smooth_rh.cmd`.

At least two arguments are required; otherwise the script prints a usage message
and exits 1 ([`scripts/reconbatchjobs:47-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L47-L51)).

### Input Assumptions

> [!assumption] Each command file holds exactly one independent command
> The whole file is slurped with `cat` into a single `$JOB` variable and run via
> `exec $JOB`. There is no word-splitting protection or quoting: the command is
> re-parsed by the shell, so arguments containing spaces or shell metacharacters
> would break. recon-all only ever writes single, well-formed binary invocations
> into these files, so in practice this is safe. The commands are assumed to be
> independent (no ordering between them).

## Outputs

### Files Created

`reconbatchjobs` creates only **transient** files and otherwise modifies the
caller's log:

| File / pattern | Where | Lifetime | Contents |
|----------------|-------|----------|----------|
| `<cmdfile>.log` | beside each command file | created, then deleted after merge | per-job stdout+stderr, prefixed by the command string ([`scripts/reconbatchjobs:63-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L63-L69), removed at [`:84-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L84-L85)) |
| (the command file itself) | as passed in | **deleted** after the job is launched | — (`rm -f $cmd`, [`scripts/reconbatchjobs:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L70)) |
| `logfile` (appended) | path given as arg 1 | persistent | each per-job log, concatenated in launch order ([`scripts/reconbatchjobs:82-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L82-L86)) |

> [!gotcha] The input command files are consumed (deleted)
> Right after launching each job, `reconbatchjobs` does `rm -f $cmd`
> ([`scripts/reconbatchjobs:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L70)). The command files are one-shot
> scratch files; do not expect them to survive the call.

### Output Specifications

There is no image or data output — the tool only manages process scheduling and
log text. Its meaningful output is its **exit status** (see below) and the
ordered, non-interleaved log appended to `logfile`.

## Mathematical Foundations

None — this is a process-management / I/O-buffering wrapper. It performs no
numerical computation. The only "algorithm" is the launch → `wait` → concatenate
→ status-check sequence described under [Pipeline Context](#pipeline-context).

## Configuration Options

### Complete Flag Reference

`reconbatchjobs` has **no option flags**. Its entire interface is positional:

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `logfile` | string (path) | *(required)* | Main log file; each finished job's per-command log is appended here in launch order ([`scripts/reconbatchjobs:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L53)). |
| `cmdfile1 [cmdfile2 …]` | string(s) (paths) | *(at least one required)* | One or more files, each containing a single command to execute in parallel ([`scripts/reconbatchjobs:61-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L61-L71)). Each file is deleted after its job starts. |

The argument list is consumed with `shift` (drop the log file) followed by
`for cmd in $*` over the remaining command files
([`scripts/reconbatchjobs:60-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L60-L61)).

### Configuration Interactions

There are no flags to interact. The only "interaction" is between the *number* of
command files you pass and the degree of parallelism: every command file becomes
one concurrently running background process. recon-all controls this by only ever
passing as many command files as there are hemispheres (or skull-strip trials)
for the current stage, so the parallelism is at most two-way for ordinary surface
stages.

> [!gotcha] Parallelism is bounded by the caller, not by reconbatchjobs
> `reconbatchjobs` itself imposes **no** limit on how many jobs it forks — it
> launches one per command file with no throttling or thread accounting. If you
> were to hand it many command files it would start them all at once. recon-all
> avoids oversubscription by batching only same-stage hemispheres; per-binary
> threading is governed separately by `OMP_NUM_THREADS`.

## Typical Use Cases

### Use Case 1: How recon-all calls it (the only intended use)

```bash
# recon-all, under -parallel, writes one .cmd file per hemisphere and then:
reconbatchjobs /path/sub/scripts/recon-all.log \
  mris_smooth_lh.cmd mris_smooth_rh.cmd
# -> both mris_smooth jobs run at once; lh then rh logs are appended to recon-all.log;
#    exit status is non-zero if either mris_smooth failed.
```

You normally never type this yourself; it is emitted by recon-all when you pass
`-parallel` (and optionally `-openmp N` for per-binary threads).

### Use Case 2: Ad-hoc parallel run of two independent commands

```bash
# Not its designed purpose, but illustrates the mechanism:
echo "mris_inflate ../surf/lh.smoothwm.nofix ../surf/lh.inflated.nofix" > lh.cmd
echo "mris_inflate ../surf/rh.smoothwm.nofix ../surf/rh.inflated.nofix" > rh.cmd
reconbatchjobs run.log lh.cmd rh.cmd
echo "combined exit status: $?"   # 1 if either failed, else 0
```

## Pipeline Context

`reconbatchjobs` is an **internal recon-all helper**, not a standalone analysis
tool and not part of any single named recon-all stage — it is invoked at the end
of many surface stages whenever `-parallel` is active. Its place in the data flow
is "fork the two per-hemisphere commands the current stage just prepared, then
rejoin".

Operationally, for each command file it:

1. reads the command (`` JOB=`cat $cmd` ``), writes a blank-line-padded header
   plus the command into `<cmdfile>.log`, then runs it with
   `exec $JOB >> $LOG 2>&1 &`, recording the PID
   ([`scripts/reconbatchjobs:61-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L61-L71));
2. `wait`s on each recorded PID in turn and stores each one's `$?`
   ([`scripts/reconbatchjobs:74-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L74-L79));
3. `cat`s each per-job log onto the main log file and removes the per-job log
   ([`scripts/reconbatchjobs:82-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L82-L86));
4. exits 1 if **any** stored status was non-zero, else 0
   ([`scripts/reconbatchjobs:90-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L90-L98)).

recon-all checks that status with `if($status) goto error_exit;` immediately
after each `reconbatchjobs` call, so a failure in either hemisphere aborts the
run.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (builds the per-hemisphere
`.cmd` files) → **reconbatchjobs** (forks/waits/merges) →
**Successor:** [[wiki/pipelines/recon-all|recon-all]] (resumes the next stage, or
`error_exit`).

> [!gotcha] `-parallel`, not `-openmp`, triggers reconbatchjobs
> Two different forms of concurrency coexist in recon-all. `-openmp N` sets
> `OMP_NUM_THREADS` so each *individual* binary uses N threads; `-parallel` is
> what makes recon-all run the two hemispheres *as separate processes* through
> `reconbatchjobs`. You can use either or both.

## Gotchas and Caveats

> [!gotcha] `exec` in a backgrounded subshell, not literal process replacement
> The line `exec $JOB >> $LOG 2>&1 &` runs in a background subshell, so `exec`
> replaces *that subshell* with the job rather than replacing `reconbatchjobs`
> itself. The parent keeps running and collects `$!` (the job PID). This is why
> the subsequent `wait $pid` loop works.

> [!gotcha] Logs are merged in launch order, not completion order
> Per-job logs are appended in the order the command files were given on the
> command line ([`scripts/reconbatchjobs:82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L82)), regardless of which
> job finished first. This is deliberate: it keeps `recon-all.log` deterministic
> and readable (e.g. lh block then rh block) even though the jobs ran
> concurrently.

> [!gotcha] First job's log is initialised with a redirect that clobbers
> The header line uses `echo "" >& $LOG` (truncate-and-write) for the first line
> ([`scripts/reconbatchjobs:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L64)) then `>>` for the rest. Each job's
> `<cmdfile>.log` is therefore freshly created per call; a pre-existing file of
> that name would be overwritten.

## Error Compensation and Guard Rails

- **Aggregated failure reporting.** Rather than aborting on the first failing
  job, it waits for every job, then scans all stored statuses and exits 1 if any
  job failed ([`scripts/reconbatchjobs:90-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L90-L98)). This guarantees both
  hemispheres complete (or fail) before recon-all decides whether to continue.
- **Argument-count guard.** Fewer than two arguments → usage message + `exit 1`
  ([`scripts/reconbatchjobs:47-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs#L47-L51)).
- **Log de-interleaving.** Buffering each job to its own file and concatenating
  afterwards is the guard rail against the interleaved-log problem the tool was
  written to solve.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the sole intended caller; supplies the
  command files and checks the return status. `-parallel` is what activates this
  path.
- [[post-recon-all]] — a different recon-all add-on (post-processing termination
  script); unrelated mechanism but part of the same batch/QA tooling family.
- [[check_recons.sh]] — batch QA companion that inspects the `recon-all.done` /
  `recon-all.error` / `IsRunning.lh+rh` markers produced by runs that
  `reconbatchjobs` helped execute.

## Confidence and Gaps

**High confidence:** the entire control flow (no flags; positional log file +
command files; fork/wait/merge/status logic; deletion of command files and
per-job logs; non-zero exit on any failure) was read directly from the
26-statement script [`scripts/reconbatchjobs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs),
and the calling convention was confirmed against the recon-all `-parallel`
machinery ([`scripts/recon-all:3520-3527`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3520-L3527) and the 32 `reconbatchjobs $LF $CMDFS` call sites).

## References

- FreeSurfer source: [`scripts/reconbatchjobs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reconbatchjobs) (v8.2.0).
- Calling convention and rationale: recon-all `-parallel` implementation,
  [`scripts/recon-all:3510-3527`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3510-L3527).
