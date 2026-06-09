---
title: "bedpostx_mgh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/bedpostx_mgh"
families: []                     # FSL-derived diffusion wrapper, no mri_*/mris_* family
recon_all_stage: null
related:
  - "[[trac-all]]"
  - "[[dt_recon]]"
  - "[[dmri_paths]]"
  - "[[bbregister]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The behaviour of the SGE/CUDA branch (exec of $0_gpu, i.e. bedpostx_mgh_gpu) is described from the script only; the companion GPU script and fsl_sub_mgh were not read line-by-line."
  - "Exact contents of the .bedpostX output directory are produced by the FSL bedpostx_postproc.sh stage, not by this wrapper; the file list is inferred from standard FSL bedpostx behaviour."
tags:
  - diffusion
  - dti
  - tractography
  - fsl
  - cluster
  - ball-and-stick
---

# bedpostx_mgh

## Summary

`bedpostx_mgh` is the MGH Martinos Center wrapper around FSL's `bedpostx`, the
program that fits a Bayesian "ball-and-stick" diffusion model to a diffusion-MRI
dataset so that probabilistic tractography (FSL `probtrackx`) can later be run.
It is a lightly modified copy of the stock FSL `bedpostx` script (modified by
Anastasia Yendiki) whose sole purpose is to **parallelise the per-slice model
fitting across a compute cluster**: instead of fitting all slices serially it
submits one job per slice through the FreeSurfer/MGH job-submission shim
[`fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh), so the result is identical to `bedpostx` but produced an order of
magnitude faster. It runs the actual numerics by calling the unmodified FSL
helper scripts `bedpostx_preproc.sh`, `bedpostx_single_slice.sh`, and
`bedpostx_postproc.sh` from `$FSLDIR/bin`. It is the diffusion-model step invoked
by FreeSurfer's [[trac-all]].

## Source Information

- **Language:** bash shell script (`#!/usr/bin/env bash`)
- **Source file:** [`scripts/bedpostx_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh)
- **Binary/script location:** `$FREESURFER_HOME/bin/bedpostx_mgh`
- **Provenance:** modified from FSL 6.0's `bedpostx` by Anastasia Yendiki; retains the original Oxford/FMRIB licence header ([`scripts/bedpostx_mgh:1-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L1-L68)).
- **External dependency:** **FSL ≥ 6.0** (the version is read from `$FSLDIR/etc/fslversion` and the script aborts on anything older, [`scripts/bedpostx_mgh:127-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L127-L135)).
- **Helper scripts invoked:** [`fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh) (job submission, found next to this script via `BPDIR=`dirname $0``, [`scripts/bedpostx_mgh:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L77)); `$FSLDIR/bin/bedpostx_preproc.sh`, `$FSLDIR/bin/bedpostx_single_slice.sh`, `$FSLDIR/bin/bedpostx_postproc.sh`; the FSL utilities `imtest`, `fslval`, and `zeropad`.

## Purpose and Context

Probabilistic tractography needs, at every voxel, a description of the local
fibre orientation(s) together with their uncertainty. FSL's `bedpostx`
("Bayesian Estimation of Diffusion Parameters Obtained using Sampling
techniques, modelling crossing X fibres") provides this by running a Markov
Chain Monte Carlo (MCMC) estimation of a partial-volume ball-and-stick model at
every brain voxel. That estimation is expensive, but it is **embarrassingly
parallel across slices**, because each axial slice is fitted independently.

`bedpostx_mgh` exploits exactly that. It is functionally identical to the
upstream `bedpostx` — same model, same defaults — but it:

1. Splits the volume into slices and writes one `bedpostx_single_slice.sh`
   command per slice into a `commands.txt` file.
2. Submits a preprocessing job, then an array of per-slice jobs, then a
   post-processing/merge job, chaining them with job-dependency IDs through
   [`fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh) so the cluster runs them in the correct order.
3. Detects the queueing environment (SGE/Grid Engine via `$SGE_ROOT`, or PBS via
   the presence of `/pbs`) and adapts; when run **outside** a queue it falls
   back to a local monitor loop.

It is normally invoked for you by [[trac-all]] (the FreeSurfer TRACULA
diffusion-tractography pipeline) and not run by hand, although it can be. It is
**not** part of [[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Run it from the login prompt, never as a job
> The help text is explicit: `bedpostx_mgh` is a *submitter*, not a worker. Do
> not submit it as a cluster job itself — run it interactively and it will submit
> the per-slice jobs for you ([`scripts/bedpostx_mgh:118-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L118-L123)). It deliberately guards
> against the PBS case by setting `dopbsjobs=1` only when `/pbs` exists **and**
> `$PBS_JOBID` is unset ([`scripts/bedpostx_mgh:71-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L71-L75)).

## Inputs

### Required Inputs

The single positional argument is one (or more) **subject directory** holding a
preprocessed diffusion dataset in the FSL/`bedpostx` layout. The script verifies
the following files inside each directory ([`scripts/bedpostx_mgh:258-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L258-L298)):

| File (in `<subjdir>/`) | Required? | Meaning |
|------------------------|-----------|---------|
| `data` | yes | the 4-D diffusion-weighted volume (any FSL-readable image; tested with `imtest`) |
| `nodif_brain_mask` | yes | brain mask in diffusion space (the b=0 brain mask) |
| `bvals` | yes | b-values, one row (`bvals.txt` is auto-renamed to `bvals` if present) |
| `bvecs` | yes | gradient directions, 3 rows (`bvecs.txt` is auto-renamed to `bvecs` if present) |
| `grad_dev` | only with `-g` | gradient-nonlinearity field used for distortion correction |

Multiple subject directories may be given on one command line; they are queued
**serially** ([`scripts/bedpostx_mgh:251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L251), [`scripts/bedpostx_mgh:373-374`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L373-L374)) —
any argument that is an existing directory is added to the input list, anything
else is parsed as an option ([`scripts/bedpostx_mgh:214-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L214-L232)).

### Input Assumptions

> [!assumption] FSL bedpostx directory layout, eddy-corrected data
> The input directory is assumed to already be in the exact form `bedpostx`
> expects: a motion/eddy-corrected `data` volume, its `nodif_brain_mask`, and
> matching `bvals`/`bvecs`. `bedpostx_mgh` does **no** preprocessing of its own
> beyond renaming `bvals.txt`/`bvecs.txt`; all distortion/motion correction must
> have happened upstream (in TRACULA this is the `-prep` stage of [[trac-all]]).
> The slice axis is the third image dimension (`dim3`), which the script reads
> with `fslval` to count slices ([`scripts/bedpostx_mgh:323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L323)).

## Outputs

### Files Created

All output is written to a sibling directory named `<subjdir>.bedpostX/`
(note the capital **X**), created at [`scripts/bedpostx_mgh:308-312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L308-L312):

| Path | Created by | Contents |
|------|-----------|----------|
| `<subjdir>.bedpostX/` | this script (structure) + FSL postproc | the completed ball-and-stick model |
| `<subjdir>.bedpostX/diff_slices/` | per-slice jobs | intermediate per-slice fit results (`data_slice_NNNN/`) |
| `<subjdir>.bedpostX/logs/` | all stages | stdout/stderr (`*.o*`, `*.e*`) and the merge-job ID file `postproc_ID` |
| `<subjdir>.bedpostX/logs/monitor/` | per-slice jobs | one marker file per finished slice (drives the monitor) |
| `<subjdir>.bedpostX/xfms/` | FSL preproc | `eye.mat` (written last; its presence marks the job complete) |
| `<subjdir>.bedpostX/commands.txt` | this script | the list of per-slice `bedpostx_single_slice.sh` commands ([`scripts/bedpostx_mgh:344-345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L344-L345)) |
| `<subjdir>.bedpostX/monitor` | this script | generated progress-monitor shell script ([`scripts/bedpostx_mgh:137-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L137-L184)) |
| `<subjdir>.bedpostX/cancel` | this script (cluster mode only) | generated `qdel` script to kill all queued jobs ([`scripts/bedpostx_mgh:360-364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L360-L364)) |

The scientifically meaningful results inside `.bedpostX/` (the merged
`mean_f<i>samples`, `dyads<i>`, `mean_th<i>samples`, `mean_ph<i>samples`, etc.)
are produced by the FSL `bedpostx_postproc.sh` merge stage, not by this wrapper.

### Output Specifications

The model outputs follow standard FSL `bedpostx` conventions: for each of the
`-n` fibre compartments, `dyads<i>` (the mean principal diffusion direction as a
3-vector volume), `mean_f<i>samples` (mean partial-volume fraction), and
`mean_th<i>samples`/`mean_ph<i>samples` (mean polar angles of the stick). These
are the inputs to FSL `probtrackx`. Geometry and data type match the input
`data` volume.

## Mathematical Foundations

> [!internal] The model fitting lives in FSL `xfibres`, not in this script
> `bedpostx_mgh` performs **no** numerical computation itself — it only formats
> filenames (`zeropad`) and counts slices (`fslval`). The actual estimation is
> done by FSL's `xfibres` (invoked by `bedpostx_single_slice.sh`).

> [!math] Ball-and-stick partial-volume model
> At each voxel the diffusion-weighted signal for gradient direction
> $\mathbf{g}_k$ with b-value $b_k$ is modelled as an isotropic "ball" plus one
> or more anisotropic "sticks":
> $$ S_k = S_0\left[(1-\textstyle\sum_{j=1}^{N} f_j)\,e^{-b_k d} + \sum_{j=1}^{N} f_j\, e^{-b_k d (\mathbf{g}_k\cdot \mathbf{v}_j)^2}\right] $$
> where $d$ is the diffusivity, $f_j\in[0,1]$ is the partial-volume fraction of
> stick $j$, $\mathbf{v}_j$ its unit orientation, and $N$ the number of fibres
> (set by `-n`). The parameters are estimated by MCMC; the number of fibres,
> burn-in, jumps, sample spacing, and ARD weight are exactly the `-n`, `-b`,
> `-j`, `-s`, `-w` options below. Automatic Relevance Determination (ARD) shrinks
> unsupported secondary fibres toward zero. The three `-model` choices select
> stick (1), stick + Gamma-distributed diffusivities (2, default), or zeppelin
> (3) compartments.

The wrapper hard-codes one non-default `xfibres` option, `--cnonlinear`, as
`defopts` ([`scripts/bedpostx_mgh:234-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L234-L235)), so every run uses the constrained
non-linear estimation regardless of the other options.

## Configuration Options

### Complete Flag Reference

Two syntaxes are accepted and **must not be mixed** (see Configuration
Interactions). The "old syntax" short flags are parsed explicitly; anything else
is forwarded verbatim to `xfibres` ("new syntax"). Parser:
[`scripts/bedpostx_mgh:214-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L214-L235).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<subject directory>` | path (positional, repeatable) | *(required)* | A diffusion dataset directory in `bedpostx` layout; any existing directory among the arguments is treated as input. Multiple are processed serially. |
| `-n` | integer | `3` | Number of fibre compartments (sticks) to fit per voxel → `xfibres --nf`. |
| `-w` | float | `1` | ARD weight; higher means *fewer* secondary fibres (stronger shrinkage) → `xfibres --fudge`. |
| `-b` | integer | `1000` | MCMC burn-in period (samples discarded before recording) → `xfibres --bi`. |
| `-j` | integer | `1250` | Number of MCMC jumps (recorded iterations) → `xfibres --nj`. |
| `-s` | integer | `25` | Sample-every interval (thinning of the MCMC chain) → `xfibres --se`. |
| `-model` | integer (1/2/3) | `2` | Deconvolution model: 1 = sticks; 2 = sticks with a range of diffusivities (default); 3 = zeppelins → `xfibres --model`. |
| `-g` | boolean | off | Consider gradient nonlinearities; requires a `grad_dev` volume and passes a per-slice `--gradnonlin=grad_dev_slice_NNNN` to each slice job ([`scripts/bedpostx_mgh:339-343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L339-L343)). |
| `-c` | boolean | off | Do **not** use CUDA/GPU hardware even if a CUDA queue is found (sets `nocuda=1`; suppresses the `exec $0_gpu` branch). The help line for this option is commented out but the flag is live ([`scripts/bedpostx_mgh:227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L227)). |
| *(any other token)* | passthrough | — | Appended to `other` and forwarded directly to `xfibres`, e.g. `--noard`, `--cnonlinear`. See `xfibres --help` for the full list. |

The assembled command always begins
`--nf=$nfibres --fudge=$fudge --bi=$burnin --nj=$njumps --se=$sampleevery --model=$model --cnonlinear`
followed by any passthrough options ([`scripts/bedpostx_mgh:233-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L233-L235)).

### Configuration Interactions

> [!gotcha] Old syntax and new (xfibres) syntax must not be combined
> The usage text warns: "Use EITHER old OR new syntax"
> ([`scripts/bedpostx_mgh:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L104)). The short flags (`-n -w -b -j -s -model -g -c`)
> set the documented defaults; any other argument is passed straight to
> `xfibres`. Mixing them is technically possible but the two option sets overlap
> (e.g. `-n` vs `--nf`) and the result is order-dependent and confusing. The help
> also notes that when you use new syntax, the *bedpostx* defaults (above) still
> apply, **not** the `xfibres` defaults.

> [!gotcha] `-g` requires `grad_dev` or the run aborts
> Setting `-g` makes `grad_dev` a hard requirement; the script exits if
> `imtest grad_dev` fails ([`scripts/bedpostx_mgh:288-293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L288-L293)). It also expects the
> preprocessing stage to have produced per-slice `grad_dev_slice_NNNN` files.

> [!gotcha] An existing `.bedpostX` directory blocks re-running
> If `<subjdir>.bedpostX/xfms/eye.mat` already exists the script refuses to run,
> printing "has already been processed" and telling you to delete or rename the
> output directory first ([`scripts/bedpostx_mgh:300-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L300-L304)). Per-slice resumption is
> still possible: a slice whose `dyads1` exists and whose monitor marker is
> present is skipped ([`scripts/bedpostx_mgh:335-336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L335-L336)).

- `-c` interacts with the SGE/CUDA auto-dispatch: when `$SGE_ROOT` and a CUDA
  queue (`$FSLGECUDAQ`) are present and a `bedpostx_mgh_gpu` executable exists,
  the script `exec`s the GPU variant — unless `-c` was given
  ([`scripts/bedpostx_mgh:236-248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L236-L248)).
- Queue detection (`$SGE_ROOT`, `/pbs`) selects between cluster submission
  (writes a `cancel` script, emails on completion) and a local foreground
  `monitor` loop ([`scripts/bedpostx_mgh:327-329`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L327-L329), [`scripts/bedpostx_mgh:356-371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L356-L371)).

## Typical Use Cases

### 1. Standard ball-and-stick fit on a cluster

```bash
# Fit the default 3-fibre model to a prepared diffusion directory.
bedpostx_mgh /path/to/subj/dmri
# → /path/to/subj/dmri.bedpostX/ with the merged model
```

### 2. The exact invocation used by TRACULA

```bash
# What trac-all runs internally (model 1 = sticks, n from $nstick, default 2).
bedpostx_mgh -n 2 -model 1 /path/to/subj/dmri
```

### 3. Forwarding native xfibres options (new syntax)

```bash
# Turn off ARD and force the constrained non-linear model explicitly.
bedpostx_mgh /path/to/subj/dmri --noard --cnonlinear
```

### 4. Multiple subjects, queued serially

```bash
bedpostx_mgh /data/sub01/dmri /data/sub02/dmri /data/sub03/dmri
```

## Pipeline Context

`bedpostx_mgh` is the **ball-and-stick model-fitting** step of the FreeSurfer
TRACULA diffusion pipeline. It is called by [[trac-all]] in the `-bedp` stage,
after diffusion preprocessing and before path reconstruction. TRACULA always
invokes it as `bedpostx_mgh -n $nstick -model 1 <dmri-dir>` (with `nstick`
defaulting to 2), at [`scripts/trac-all:617`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L617), [`scripts/trac-all:1094`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1094),
and [`scripts/trac-all:1281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1281). (On a cluster TRACULA may instead build the
per-slice command list itself; the local fallback uses this wrapper directly.)

**Predecessor:** [[trac-all]] `-prep` (eddy/motion correction, masking) →
**bedpostx_mgh** (fit ball-and-stick) → **Successor:** [[trac-all]] `-path`
(probabilistic tractography of the white-matter pathways, FSL `probtrackx`). It
is **not** called by [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] `bvals.txt`/`bvecs.txt` are silently renamed in place
> If `bvals`/`bvecs` are missing but `bvals.txt`/`bvecs.txt` exist, the script
> **moves** (`mv`) them to the un-suffixed names inside your input directory
> ([`scripts/bedpostx_mgh:265-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L265-L281)). This modifies the input directory as a
> side effect.

> [!gotcha] Don't launch on many datasets at once
> Each run spawns one job per slice (tens to hundreds of jobs). The help warns
> not to run it on more than one dataset simultaneously
> ([`scripts/bedpostx_mgh:120-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L120-L123)); the wrapper itself queues multiple input
> directories serially rather than in parallel.

> [!gotcha] PBS hold emails are expected
> On PBS you may receive emails about jobs being held; the help says to ignore
> them — the dependency chaining releases them automatically
> ([`scripts/bedpostx_mgh:120-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L120-L123)).

> [!gotcha] Subject-dir trailing-slash handling looks suspect
> After `make_absolute`, the path is passed through
> `sed 's/\/$/$/g'` which replaces a trailing `/` with a literal `$`, not with
> nothing ([`scripts/bedpostx_mgh:254`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L254)). In practice `make_absolute`
> (via `cd; pwd`) already strips the trailing slash, so this is normally a no-op,
> but passing an oddly-formed path could be mangled.

## Error Compensation and Guard Rails

- **FSL version gate.** Refuses to run on FSL < 6.0 ([`scripts/bedpostx_mgh:127-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L127-L135)).
- **Input validation.** Each of `data`, `bvals`, `bvecs`, `nodif_brain_mask`
  (and `grad_dev` with `-g`) is checked before any job is submitted; a missing
  file aborts the run ([`scripts/bedpostx_mgh:258-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L258-L298)).
- **Idempotence guard.** An already-complete `.bedpostX` (presence of
  `xfms/eye.mat`) blocks accidental re-processing; partially-done slices are
  detected and skipped on resume ([`scripts/bedpostx_mgh:300-348`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L300-L348)).
- **Error surfacing.** The generated `monitor` script watches the `logs/*.e*`
  error files and kills itself if any is non-empty ([`scripts/bedpostx_mgh:148-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L148-L156)).
- **bvals/bvecs auto-rename** (see gotcha) is a convenience that compensates for
  the common `.txt` suffix.

## Related Tools

- [[trac-all]] — the TRACULA pipeline that calls `bedpostx_mgh` to fit the diffusion model before tractography.
- [[dt_recon]] — FreeSurfer's tensor-model (DTI) reconstruction; a simpler, single-tensor alternative to the ball-and-stick model.
- [[dmri_paths]] — TRACULA path-reconstruction tool that consumes the `.bedpostX` output.
- [[bbregister]] — used elsewhere in the diffusion stream to register diffusion data to the anatomical; not called by this script.
- `fsl_sub_mgh` *(no wiki page yet)* — the MGH job-submission shim this wrapper uses to queue the per-slice jobs.
- `xfibres` *(FSL, no wiki page)* — the FSL program that performs the actual MCMC model fitting; all passthrough options go to it.

## Confidence and Gaps

**High confidence:** full option set and defaults, the EITHER/OR syntax rule, the
required input files, the `-g`/`grad_dev` dependency, the `.bedpostX`
idempotence guard, the bvals/bvecs auto-rename, the hard-coded `--cnonlinear`,
and the trac-all invocation — all read directly from
[`scripts/bedpostx_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh) and
[`scripts/trac-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all).

> [!gap] GPU branch behaviour
> The `exec $0_gpu` CUDA path (i.e. a `bedpostx_mgh_gpu` sibling) and the precise
> behaviour of [`fsl_sub_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsl_sub_mgh) were not traced line-by-line; their effect is
> described from this script's call sites only.

> [!gap] Final model file list
> The exact set of merged outputs in `.bedpostX/` is produced by FSL's
> `bedpostx_postproc.sh`, which is part of FSL, not FreeSurfer; the file names
> above follow standard FSL `bedpostx` behaviour and were not re-derived from the
> FSL source here.

## References

- FreeSurfer source: [`scripts/bedpostx_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh) (v8.2.0).
- Built-in usage: `bedpostx_mgh` with no arguments ([`scripts/bedpostx_mgh:81-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bedpostx_mgh#L81-L125)).
- Behrens TEJ, Berg HJ, Jbabdi S, Rushworth MFS, Woolrich MW. *Probabilistic diffusion tractography with multiple fibre orientations: What can we gain?* NeuroImage 34(1):144-155, 2007. (the bedpostx ball-and-stick model)
- FSL `bedpostx` / `xfibres` documentation (upstream; this is a fork of FSL 6.0's `bedpostx`).
