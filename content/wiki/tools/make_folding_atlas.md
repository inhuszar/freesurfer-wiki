---
title: "make_folding_atlas"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_folding_atlas"
families: []
recon_all_stage: null
related:
  - "[[make_average_subject]]"
  - "[[surfreg]]"
  - "[[xhemireg]]"
  - "[[mris_register]]"
  - "[[mris_make_template]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Behaviour of the cluster job-submission paths (sbatch/pbsubmit) is documented from the script; not exercised here. The exact convergence criterion is iteration-count based (no residual threshold), confirmed from code."
tags:
  - atlas
  - template
  - surface-registration
  - iterative
  - cluster
---

# make_folding_atlas

## Summary

`make_folding_atlas` (formerly `make_iter_atlas`) iteratively builds a cortical
**folding registration atlas** — the `?h.reg.template.tif` (MRISP) file used as a
spherical registration target. Starting from an initial registration, it
repeatedly (1) builds an average-subject template with [[make_average_subject]],
then (2) re-registers every subject to that template with [[surfreg]]; the next
iteration's template is built from the improved registrations. With each iteration
the atlas sharpens. The script manages all the bookkeeping and **submits the
registration jobs to a cluster** (SLURM `sbatch` or `pbsubmit`), polling until they
finish. It is the machinery behind `fsaverage`- and `fsaverage_sym`-style atlases.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/make_folding_atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_folding_atlas`
- **Tools invoked:** [`make_average_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L209), [`surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L271), [`xhemireg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L105); job submission via `sbatch`/`squeue` or `pbsubmit`.

## Purpose and Context

A surface registration atlas (`.tif`) encodes the mean and variance of folding
patterns (curvature/sulc) over a population; [[mris_register]]/[[surfreg]]
register individuals to it. Building a good atlas is a chicken-and-egg problem: a
sharp atlas needs accurate registrations, but accurate registrations need a sharp
atlas. `make_folding_atlas` resolves this by **iteration** — bootstrapping from a
crude initial registration (e.g. `sphere.reg`, or a single seed subject) and
converging over several rounds. It is the tool used to create the distributed
`fsaverage` folding atlas and the symmetric `fsaverage_sym` atlas.

> [!gotcha] Do not submit this script itself
> The script submits its own compute jobs to the cluster and then waits, so it
> must run on a submit host, **not** be submitted as a job
> ([`scripts/make_folding_atlas:671-674`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L671-L674)).
> A typical 12–17 iteration run takes many hours to a day.

## Inputs

### Required Inputs

- **Subjects** — `--s subj` (repeatable), `--f listfile`, or `--fsgd file.fsgd`
  ([`scripts/make_folding_atlas:396-421`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L396-L421)).
- **`--b <base>`** — output base name; each iteration's average subject is named
  `<base>.iNN`.
- **`--nmax <N>`** — maximum number of iterations.

### Input Assumptions

> [!assumption] Recon-complete subjects, cluster scheduler available
> Each subject must already be reconstructed (have `?h.sphere.reg`, curvature,
> and — if `--aparc`/`--annot` is on, the default — `?h.aparc.annot`). The script
> requires either SLURM (`squeue`/`sbatch`) or `pbsubmit` on `PATH`; for `sbatch`
> it also requires a SLURM account (`FS_SBATCH_ACCOUNT` or `--account`)
> ([`scripts/make_folding_atlas:68-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L68-L87)).
> For `--xhemi`, each subject must have (or will get) an `xhemi/` registration.

## Outputs

### Files Created

Per iteration, an average-subject directory `SUBJECTS_DIR/<base>.iNN/` (built by
[[make_average_subject]], normally `--template-only --no-vol --no-annot`) whose key
artefact is:

| File | Where | Contents |
|------|-------|----------|
| `?h.reg.template.tif` | `SUBJECTS_DIR/<base>.iNN/` | the folding registration atlas for iteration NN (MRISP TIF) |
| `?h.<base>.iNN.sphere.reg` | each subject's `surf/` (and `xhemi/surf/`) | that subject's registration to iteration NN's atlas |
| `<base>.make_folding_atlas.log`, `log/<base>/…` | `SUBJECTS_DIR/<base>.iNN/`, cwd `log/` | run and per-job logs |

The **final** iteration's `<base>.i<nmax>` directory (with `--no-vol-on-last`
turned off by default, so it also gets average volumes) is the finished atlas
subject.

### Output Specifications

The `.tif` is an MRISP spherical parameterization template; see [[mrisp-tif]]. The
per-subject `*.sphere.reg` are standard registered spheres (see
[[surface-format]]).

## Mathematical Foundations

The atlas/registration alternation is a form of **groupwise registration by
template refinement**. Conceptually, at iteration $t$:
$$A^{(t)} = \mathcal{T}\big(\{R_i^{(t-1)}\}\big), \qquad
R_i^{(t)} = \operatorname*{arg\,min}_{R}\; E_\text{folding}\big(s_i \circ R,\,A^{(t)}\big),$$
where $A^{(t)}$ is the template built from the previous registrations $R_i^{(t-1)}$
([[make_average_subject]] → [[mris_make_template]]), and each $R_i^{(t)}$ is the
folding-energy-minimising registration of subject $i$'s sphere $s_i$ to $A^{(t)}$
([[surfreg]] → [[mris_register]]). There is **no residual threshold** — the loop
runs exactly `--nmax` iterations; convergence is by user choice of `nmax`
([`scripts/make_folding_atlas:184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L184),
[`:254`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L254)).

> [!internal] The folding-energy and template math live in the binaries
> The spherical morph energy is in [[mris_register]] (driven by [[surfreg]]); the
> template construction (mean/variance of curvature/sulc on the sphere) is in
> [[mris_make_template]], reached through [[make_average_subject]].

## Configuration Options

### Complete Flag Reference

Enumerated from the parser
([`scripts/make_folding_atlas:372-574`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L372-L574)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--b` | string | *(required)* | Output base name; iteration NN's subject is `<base>.iNN`. |
| `--nmax`<br>`--imax` | int | *(required)* | Maximum number of iterations. |
| `--s`<br>`--subject` | string (repeatable) | — | Add a subject to the list. |
| `--f` | file | — | Append subjects listed in a text file. |
| `--fsgd` | file | — | Append subjects from an FSGD file. |
| `--sd` | string | `$SUBJECTS_DIR` | Set `SUBJECTS_DIR`. |
| `--init-surf-reg` | string | `sphere.reg` | Registration used to build the *first* template. |
| `--init-subject` | string | — | Build the first atlas from this single subject instead of all; also forces the init surf reg to `sphere`. |
| `--lh` / `--rh` / `--lhrh` | bool | both | Restrict to one hemisphere (or explicitly both). |
| `--xhemi` | bool | off | Symmetric atlas: sets hemilist to `lh`, runs [[xhemireg]] + xhemi surfreg, doubles data via mirrored hemispheres. |
| `--ico` | int | `7` | Icosahedron order passed to [[make_average_subject]]. |
| `--vol` | bool | off | Run [[make_average_volume]] on **every** iteration (default: only the last). |
| `--no-vol` | bool | (on, vol off) | Never build volumes during iterations. |
| `--vol-on-last` / `--no-vol-on-last` | bool | on | Build volumes on the last iteration (default on) or not. |
| `--init` / `--no-init` | bool | off | Initialise [[surfreg]] from the previous iteration's reg instead of `?h.sphere` (may speed up but can bias). |
| `--annot`<br>`--annot-template` | bool | on | Use the aparc annotation in registration/template. |
| `--no-annot`<br>`--no-annot-template` | bool | (off) | Do not use the annotation ("good for monkeys"). |
| `--no-template-only` | bool | off | Make full average-surface files even when only one hemi or `--no-vol` (otherwise only the TIF would be made). |
| `--threads`<br>`--nthreads` | int | 1 | Sets `OMP_NUM_THREADS` for the submitted jobs. |
| `--account` | string | — | SLURM account (or set `FS_SBATCH_ACCOUNT`). |
| `--short-sleep` | bool | off | Use much shorter sleeps between polls (for testing/small jobs). |
| `--runit` / `--dont-run`<br>`--no-run` | bool | run on | Actually submit jobs (default) vs. dry-run that only prints commands. |
| `--q` / `--no-q` / `--xq` | string/bool | — | Queue selection (legacy pbsubmit-style; `--no-q` clears). |
| `--log` / `--nolog`<br>`--no-log` | file/bool | auto | Explicit log file, or `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | — | Temp directory (also sets `cleanup=0`); note cleanup is currently commented out. |
| `--nocleanup` / `--cleanup` | bool | — | Toggle temp cleanup (currently a no-op; cleanup is disabled in the body). |
| `--debug` | bool | off | Trace execution. |
| `--help` / `--version` | bool | — | Print help / version and exit. |

### Configuration Interactions

> [!gotcha] `--xhemi` forces a single hemisphere — re-add `--lhrh`
> `--xhemi` sets `hemilist = lh` *and* turns on cross-hemi processing
> ([`scripts/make_folding_atlas:450-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L450-L453)).
> The help notes that to build a symmetric atlas over both hemispheres you must add
> `--lhrh` **after** `--xhemi`.

> [!gotcha] Volume policy: `--vol` vs `--vol-on-last` vs `--no-vol`
> By default volumes are built only on the final iteration. `--vol` builds them
> every iteration (slower); `--no-vol` plus `--no-vol-on-last` builds none. The
> intermediate iterations otherwise run [[make_average_subject]] with
> `--no-vol --template-only --no-annot` for speed
> ([`scripts/make_folding_atlas:215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L215)).

> [!gotcha] `--init` is unrelated to `--init-surf-reg`/`--init-subject`
> `--init` controls whether [[surfreg]] starts each iteration's morph from the
> *previous* iteration's registration (potential bias). `--init-surf-reg` and
> `--init-subject` only affect how the **first** template is seeded. The help
> spells out that these are independent
> ([`scripts/make_folding_atlas:635-637`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L635-L637)).

> [!gotcha] Resumable — re-run with a larger `--nmax`
> The loop skips iterations whose `?h.reg.template.tif` already exists
> ([`scripts/make_folding_atlas:202-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L202-L251)),
> so to add iterations just re-issue the same command with a bigger `--nmax`; it
> resumes rather than restarting.

- For `sbatch`, an account is mandatory; `make_average_subject` is submitted with
  extra memory (`--mem=14G`/`vmem=14gb`) because it is memory-hungry
  ([`scripts/make_folding_atlas:76-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L76-L87),
  [`:223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L223)).

## Typical Use Cases

### 1. Build an `fsaverage`-style folding atlas (from the help)

```bash
setenv SUBJECTS_DIR /path/to/atlas_build
cd $SUBJECTS_DIR/scripts
make_folding_atlas --f subjlist.txt --b avgsubj.acfb40 --nmax 13 \
  --no-annot --no-vol --threads 2 \
  --init-surf-reg sphere.average.curvature.filled.buckner40.reg
```

### 2. Build a symmetric atlas (`fsaverage_sym`-style)

```bash
make_folding_atlas --f subjects.txt --b fsasym --nmax 17 --xhemi
```

### 3. Dry run to inspect the submitted commands

```bash
make_folding_atlas --f subjects.txt --b test --nmax 2 --dont-run --short-sleep
```

## Pipeline Context

`make_folding_atlas` sits **above** [[make_average_subject]] and [[surfreg]],
orchestrating many of their runs across the cluster. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]; it consumes recon-complete subjects and
produces a registration atlas that recon-all/[[mris_register]] can later register
*to*.

**Predecessor:** N× [[wiki/pipelines/recon-all|recon-all]] →
**make_folding_atlas** (loops [[make_average_subject]] ⇄ [[surfreg]]) →
**Successor:** the resulting `?h.reg.template.tif` becomes a surface
registration target (an atlas like `fsaverage`/`fsaverage_sym`).

## Gotchas and Caveats

> [!gotcha] Polling is time-based, not event-driven
> The script sleeps for fixed intervals (e.g. 60 min after launching surfreg, 10
> min after launching make_average_subject) and then polls for output files
> ([`scripts/make_folding_atlas:306-337`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L306-L337)).
> `--short-sleep` shortens these for small/test runs; there is no overall timeout,
> so a stuck cluster job leaves the script waiting indefinitely.

> [!gotcha] `--account` typo sets the wrong variable
> The `--account` handler sets `FS_BATCH_ACCOUNT`
> ([`scripts/make_folding_atlas:536`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L536)),
> but the sbatch command reads `FS_SBATCH_ACCOUNT`
> ([`scripts/make_folding_atlas:71-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L71-L77)).
> To be safe, export `FS_SBATCH_ACCOUNT` directly rather than relying on
> `--account` on SLURM systems.

> [!gotcha] `--tmp`/`--nocleanup`/`--cleanup` are effectively inert
> The temp-dir cleanup block is commented out
> ([`scripts/make_folding_atlas:349-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L349-L350)),
> so these flags currently have no real effect.

## Error Compensation and Guard Rails

- Subject existence and required env (`--b`, `--nmax`, subjects, scheduler) are
  checked before iterating
  ([`scripts/make_folding_atlas:582-602`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L582-L602)).
- The iteration and per-subject loops **skip work that is already done** (existing
  TIF or existing `*.sphere.reg`), making the whole process resumable and idempotent.
- For `--xhemi`, missing `xhemi` registrations are generated by [[xhemireg]] before
  registration, and the script waits for them.

## Known Bugs

- [[00189]] — `--account` sets `FS_BATCH_ACCOUNT`, but the `sbatch` submission reads `FS_SBATCH_ACCOUNT` (hard-coded to `fsm`), so the requested Slurm account is never applied to cluster jobs.

## Related Tools

- [[make_average_subject]] — builds each iteration's template (the inner engine).
- [[surfreg]] — registers each subject to the current iteration's atlas.
- [[xhemireg]] — creates the mirrored-hemisphere data for symmetric (`--xhemi`) atlases.
- [[mris_register]] — the underlying spherical morph minimiser invoked by surfreg.
- [[mris_make_template]] — constructs the `?h.reg.template.tif` from the registrations.
- [[fsaverage]] — an atlas produced by this kind of iterative build.

## Confidence and Gaps

**High confidence:** the iteration structure, the complete flag set, the
volume/hemi/init interactions, the resumability, and the `FS_SBATCH_ACCOUNT` vs.
`FS_BATCH_ACCOUNT` discrepancy — all read directly from
[`scripts/make_folding_atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas).

> [!gap] Cluster paths not exercised
> The `sbatch`/`pbsubmit` submission and polling logic is documented from the
> script but was not run here. Convergence is iteration-count based (no residual
> threshold), confirmed from the code.

## References

- FreeSurfer source: [`scripts/make_folding_atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas) (v8.2.0).
- Built-in help: `make_folding_atlas --help`.
- Related concept: [[fsaverage]]; format: [[mrisp-tif]].
