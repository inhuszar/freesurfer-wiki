---
title: "run_mris_preproc"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/run_mris_preproc"
families: []                       # batch wrapper around mris_preproc (Qdec cache)
recon_all_stage: null
related:
  - "[[mris_preproc]]"
  - "[[qdec]]"
  - "[[fsaverage]]"
  - "[[surface-representations]]"
  - "[[hemi.thickness]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Cluster dispatch assumes the MGH host 'seychelles' and pbsubmit; on any other host it only writes a command list. Whether pbsubmit/the host still exist in current installs is environment-dependent."
tags:
  - surface
  - batch
  - qdec
  - preprocessing
  - cluster
---

# run_mris_preproc

## Summary

`run_mris_preproc` is a **batch wrapper** around [[mris_preproc]] that generates
the full grid of pre-smoothed surface maps needed by the **Qdec** group-analysis
GUI. Given a Qdec subject table, it expands a fixed combinatorial set of
[[mris_preproc]] commands — every subject × both hemispheres × five surface
measures × six smoothing levels — that resample and smooth each subject's data
onto a target average surface (default `fsaverage`). On the MGH cluster host
`seychelles` it submits each command as a separate batch job; on any other host
it simply writes all the commands to a file (`mris_preproc.tmp/cmds`) for the user
to run.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/run_mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc)
- **Binary/script location:** `$FREESURFER_HOME/bin/run_mris_preproc`
- **Tools invoked:** [`mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L103) (once per generated command) and `pbsubmit` (cluster job submission, [`scripts/run_mris_preproc#L115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L115)).

## Purpose and Context

Qdec performs interactive surface-based group statistics. Before it can run, each
subject's surface measures must be resampled onto a common template surface and
pre-smoothed at the smoothing levels Qdec offers. Producing that whole cache by
hand is tedious; `run_mris_preproc` automates it by looping over the standard set
of measures and FWHMs and calling [[mris_preproc]] for each combination. Because
the cache is large (many subjects × 2 × 5 × 6 invocations), it is designed to be
run on a compute cluster.

It is run **by hand** to build a Qdec cache. It is not part of
[[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Cluster-specific by design
> Jobs are only submitted (via `pbsubmit`) when `$HOST` is literally `seychelles`,
> the MGH cluster ([`scripts/run_mris_preproc:83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L83), [`:114-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L114-L115)).
> On every other machine the script instead **writes** the commands to
> `mris_preproc.tmp/cmds` and tells you to run them yourself — it does not execute
> them.

## Inputs

### Required Inputs

- **`<qdec.table.dat>`** (positional, required) — the Qdec subject table. The
  script takes every non-header row's first field as a subject id
  (`grep -v fsid | awk '{print $1}'`,
  [`scripts/run_mris_preproc:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L49)).

### Optional Input

- **`[target average]`** (positional, optional) — the target average subject to
  resample onto; defaults to **`fsaverage`**
  ([`scripts/run_mris_preproc:40-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L40-L45)).

### Input Assumptions

> [!assumption] All listed subjects (and the target) exist in $SUBJECTS_DIR
> `$SUBJECTS_DIR` must exist, and every subject from the table plus the target
> average must be present as a directory under it; otherwise the script aborts
> ([`scripts/run_mris_preproc:51-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L51-L65)). The subjects are assumed to be fully
> recon-all-processed so that the surface measures (`thickness`, `curv`, `sulc`,
> `area`, `jacobian_white`) are available.

## Outputs

### Files Created

Working directory `mris_preproc.tmp/` is created under the current directory
([`scripts/run_mris_preproc:70-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L70-L76)):

| File | Contents |
|------|----------|
| `mris_preproc.tmp/<hemi>.<measure>.fwhm<F>.<target>.cmd` | One generated `mris_preproc` command per combination (made executable). |
| `mris_preproc.tmp/cmds` | Concatenation of all `.cmd` files (non-cluster hosts only) — the list you run yourself. |
| (per `mris_preproc` run) `<measure>.fwhm<F>.<target>.mgh` | The Qdec cache surface map (written by `mris_preproc --cache-out`). |
| (per `mris_preproc` run) `mris_preproc.<hemi>.<measure>.fwhm<F>.<target>.mgh` | The stacked output volume (`--out`). |
| (per `mris_preproc` run) `mris_preproc.<hemi>.<measure>.fwhm<F>.<target>.log` | Per-command log (`--log`). |

The actual cache `.mgh` files are produced by [[mris_preproc]] when the commands
run (immediately on the cluster, or later when you execute `cmds`).

### Output Specifications

The grid covers, for each subject:

- **hemispheres:** `rh`, `lh`
- **measures:** `thickness`, `curv`, `sulc`, `area`, `jacobian_white`
- **FWHM (mm):** `0`, `5`, `10`, `15`, `20`, `25`

so 60 `mris_preproc` invocations per subject
([`scripts/run_mris_preproc:93-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L93-L128)). Each output is a surface overlay on the
target average; see [[surface-representations]] and [[mris_preproc]] for the data
layout.

## Mathematical Foundations

None of its own — all resampling and Gaussian surface smoothing (the `--fwhm`
levels) are performed by [[mris_preproc]].

> [!internal] Smoothing and resampling are in mris_preproc
> `run_mris_preproc` only enumerates parameter combinations and builds command
> lines; the surface registration, sampling, and FWHM smoothing live in
> [[mris_preproc]].

## Configuration Options

### Complete Flag Reference

`run_mris_preproc` takes **positional arguments only** — there are no option
flags besides `--help`.

| Position / Flag | Type | Default | Description |
|-----------------|------|---------|-------------|
| `<qdec.table.dat>` (arg 1) | string | *(required)* | Qdec subject table; subject ids read from column 1 of non-header rows. |
| `[target average]` (arg 2) | string | `fsaverage` | Target average subject to resample onto. |
| `--help` | bool | — | Print usage and exit. |

The set of measures and FWHMs is **hard-coded** (not user-selectable). The
per-command `mris_preproc` flags it generates are fixed:
`--s <subj> --hemi <hemi> --meas <measure> --fwhm <F> --target <target>
--cache-out … --out … --log …`
([`scripts/run_mris_preproc:103-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L103-L111)).

### Configuration Interactions

Minimal. The only branch is on the **host**: `seychelles` → submit via `pbsubmit`;
anything else → append to `mris_preproc.tmp/cmds` for manual execution
([`scripts/run_mris_preproc:114-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L114-L119)). There are no mutually exclusive
flags.

## Typical Use Cases

### 1. Build a Qdec cache onto fsaverage

```bash
run_mris_preproc qdec.table.dat
# On 'seychelles': submits all jobs.
# Elsewhere: writes mris_preproc.tmp/cmds for you to run.
```

### 2. Build the cache onto a custom average

```bash
run_mris_preproc qdec.table.dat my_study_average
```

### 3. Run the generated commands off-cluster

```bash
run_mris_preproc qdec.table.dat        # writes mris_preproc.tmp/cmds
sh mris_preproc.tmp/cmds               # execute them yourself (can take hours)
```

## Pipeline Context

`run_mris_preproc` is a **batch front end** to [[mris_preproc]] for the Qdec
workflow; it is not part of [[wiki/pipelines/recon-all|recon-all]]. It sits
between completed recon-all subjects and the [[qdec]] GUI.

**Predecessor:** recon-all-processed subjects + a Qdec table →
**run_mris_preproc** → (many [[mris_preproc]] runs) → **Successor:** [[qdec]]
group surface analysis using the pre-smoothed cache.

## Gotchas and Caveats

> [!gotcha] Off-cluster, nothing is computed — only a command list is written
> On a non-`seychelles` host the script does not run any `mris_preproc`; it only
> produces `mris_preproc.tmp/cmds`. You must execute that file yourself, which
> "can take several hours to complete on a single CPU machine"
> ([`scripts/run_mris_preproc:136-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L136-L141)).

> [!gotcha] Measures and FWHMs are not configurable
> The five measures and six FWHM levels are hard-coded; to cache a different set
> you must edit the script or call [[mris_preproc]] directly.

> [!gotcha] `-ef` shell: any error aborts the whole script
> The shebang is `#!/bin/tcsh -ef` ([`scripts/run_mris_preproc:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L1)), so a
> non-zero return from any command (including a single failed `mris_preproc` on
> the cluster path) terminates the run.

## Error Compensation and Guard Rails

- **Input file existence** check for the Qdec table
  ([`scripts/run_mris_preproc:35-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L35-L38)).
- **`$SUBJECTS_DIR` existence** check
  ([`scripts/run_mris_preproc:51-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L51-L54)).
- **Per-subject existence** check: every table subject and the target must be a
  directory in `$SUBJECTS_DIR`, else abort
  ([`scripts/run_mris_preproc:60-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L60-L65)).
- **No-argument / `--help`** guard prints usage and exits
  ([`scripts/run_mris_preproc:10-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L10-L31)).

## Related Tools

- [[mris_preproc]] — the tool this script batches; performs the actual per-subject surface resampling and FWHM smoothing.
- [[qdec]] — the group-analysis GUI that consumes the pre-smoothed cache.
- [[fsaverage]] — the default target average surface.
- [[surface-representations]] — background on the surface measures (`thickness`, `curv`, `sulc`, `area`, `jacobian_white`) being cached.

## Confidence and Gaps

**High confidence:** the positional arguments and `fsaverage` default, the
hard-coded measure × FWHM × hemisphere grid, the exact generated `mris_preproc`
command line, and the cluster-vs-local dispatch — all read directly from
[`scripts/run_mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc).

> [!gap] Cluster path assumes a specific MGH host/scheduler
> Submission is hard-wired to host `seychelles` and `pbsubmit`. On modern
> installs that host/scheduler may not exist; the off-cluster command-list
> behaviour is then the only usable path. Not exercised at runtime here.

## References

- FreeSurfer source: [`scripts/run_mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc) (v8.2.0).
- Built-in help: `run_mris_preproc --help` (the usage block, [`scripts/run_mris_preproc:10-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run_mris_preproc#L10-L24)).
