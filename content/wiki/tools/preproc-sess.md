---
title: "preproc-sess"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "fsfast/bin/preproc-sess"
families:
  - "fsfast"
recon_all_stage: null
related:
  - "[[mkanalysis-sess]]"
  - "[[selxavg3-sess]]"
  - "[[stc.fsl]]"
  - "[[bbregister]]"
  - "[[epidewarp.fsl]]"
  - "[[mris_preproc]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[register.dat]]"
  - "[[nifti]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "preproc-sess only orchestrates sub-scripts (mktemplate-sess, register-sess, mkbrainmask-sess, mc-sess, stc-sess, rawfunc2surf-sess, rawfunc2tal-sess, spatialsmooth-sess, surfsmooth-sess, inorm-sess); the internal behaviour and full flag sets of those sub-scripts are not documented on this page."
  - "Default output stem chains are derived in check_params; the exact on-disk filenames (e.g. fmcpr.sm5) depend on which stages run and were read from code but not exercised."
tags:
  - fsfast
  - fmri
  - preprocessing
  - motion-correction
  - registration
  - smoothing
---

# preproc-sess

## Summary

`preproc-sess` is the FSFAST **preprocessing driver** for functional sessions.
For each session it runs an ordered sequence of preprocessing stages — template
creation, functional-to-anatomical registration, brain-mask creation, motion
correction, optional slice-timing correction, optional resampling to a surface
or standard volume space (MNI305 / CVS / FreeSurfer-MNI152), spatial smoothing,
and (legacy) intensity normalisation — by dispatching to a family of `*-sess`
sub-scripts. It is normally invoked with `-a <analysis>`, in which case it reads
all of its settings from the analysis configuration written by
[[mkanalysis-sess]]; it can also be driven directly with explicit flags.

## Source Information

- **Language:** tcsh script (`#! /bin/tcsh -f`)
- **Source file(s):** [`fsfast/bin/preproc-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess)
- **Binary/script location:** `$FREESURFER_HOME/bin/preproc-sess`
- **Dispatches to:** `mktemplate-sess`, `register-sess` (→ [[bbregister]]),
  `mkbrainmask-sess`, `mc-sess`, `stc-sess` (→ [[stc.fsl]]),
  `rawfunc2surf-sess`, `rawfunc2tal-sess`, `spatialsmooth-sess`, `surfsmooth-sess`,
  and `inorm-sess`.

## Purpose and Context

FSFAST separates *configuration* (what to do — [[mkanalysis-sess]]) from
*preprocessing* (`preproc-sess`) from *model fitting* ([[selxavg3-sess]]).
`preproc-sess` is the middle stage: it takes raw 4D functional runs in each
session's functional subdirectory (FSD) and produces motion-corrected,
registered, masked, optionally resampled and smoothed time series ready for
first-level GLM analysis.

Crucially, when called with `-a <analysis>`, `preproc-sess` extracts the target
space, smoothing FWHM, slice-timing-correction order, registration DOF, per-run
vs per-session mode, B0 distortion correction, and subcortical-masking choice
directly from `analysis.info` via `getana`
([`fsfast/bin/preproc-sess:683-725`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L683-L725)).
This guarantees that preprocessing matches what the analysis expects. Indeed,
[[selxavg3-sess]] calls `preproc-sess -s … -d … -a <analysis> -nolog` for each
session by default before fitting.

## Inputs

### Required Inputs

- **Sessions** — one or more FSFAST session directories, supplied through the
  standard session arguments `-s`/`-sf`/`-d`/`-df`/`-g` (resolved by
  `getsesspath`) ([`preproc-sess:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L110)).
- **Functional subdirectory** — `-fsd <name>` (e.g. `bold`), required unless an
  analysis is given (which supplies it) ([`preproc-sess:808-812`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L808-L812)).
- **Motion-cor/registration mode** — `-per-run` or `-per-session` is required
  whenever motion correction or registration runs
  ([`preproc-sess:814-819`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L814-L819)).
- **Raw functional runs** — 4D time series under `sess/fsd/RRR/` with the input
  stem (default `f`).

The simplest and intended invocation supplies `-a <analysis>` plus the session
arguments; the analysis provides fsd, FWHM, space, STC, DOF, and mode.

### Input Assumptions

> [!assumption] Standard FSFAST session layout
> Each session is expected to contain a functional subdirectory holding numbered
> run directories with 4D functional data. The anatomical subject used for
> registration/surface resampling must already be processed
> ([[wiki/pipelines/recon-all|recon-all]]).

> [!assumption] B0 distortion correction expects a precomputed map
> With `-b0dc`, the stages look for a field map at `sess/fsd/b0dcmap.nii.gz`
> (see [[epidewarp.fsl]]); the option only selects the corrected registration
> file and passes `-b0dc` to sub-stages.

## Outputs

`preproc-sess` itself writes no images; each stage's outputs are produced by the
sub-script it calls, named by stem-chaining (see Output Specifications). The
driver writes per-session logs under `log/` (e.g. `log/preproc-<sessid>-<fsd>.log`)
unless `-nolog` is given ([`preproc-sess:173-179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L173-L179)).

### Stages and Sub-scripts

In execution order per session ([`preproc-sess:168-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L168-L358)):

| Stage | Sub-script | Default on? | Notes |
|-------|-----------|-------------|-------|
| Template creation | `mktemplate-sess` | yes (`DoTemplate=1`) | Builds the per-run/session reference volume ([`:190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L190)). |
| Registration | `register-sess` (BBR via [[bbregister]]) | yes (`DoReg=1`) | DOF, contrast, init method, B0DC passed through ([`:201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L201)). |
| Brain mask | `mkbrainmask-sess` | yes (`DoMask=1`) | Runs after registration ([`:222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L222)). |
| Motion correction | `mc-sess` | yes (`DoMC=1`) | Input/output stems `mcin`/`mcout` ([`:239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L239)). |
| Slice-timing correction | `stc-sess` (→ [[stc.fsl]]) | no (`DoSTC=0`) | Enabled by `-stc`/`-sdf` ([`:253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L253)). |
| Resample to surface | `rawfunc2surf-sess` | no (`ToSurf=0`) | Enabled by `-surface` ([`:267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L267)). |
| Resample to std volume | `rawfunc2tal-sess` | no | Enabled by `-mni305`/`-cvs`/`-fsmni152` ([`:293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L293)). |
| Volume smoothing | `spatialsmooth-sess` | yes (`DoVolSmooth=1`) | Default 3D smoothing ([`:317`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L317)). |
| Surface smoothing | `surfsmooth-sess` | no (`DoSurfSmooth=0`) | Enabled by `-surf-fwhm` ([`:330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L330)). |
| Intensity normalisation | `inorm-sess` | no (`DoInorm=0`) | Legacy; "should probably remove this" per source ([`:345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L345)). |

### Output Specifications

Stems are chained automatically in `check_params`
([`preproc-sess:805-905`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L805-L905)).
Starting from input stem `f` (default):

- **MC output:** `fmcpr` for per-run, `fmc` for per-session
  ([`:823-828`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L823-L828)).
- **STC output:** `<mcout>.<SliceOrder>` (e.g. `fmcpr.siemens`) or `<mcout>.sdf`
  when a slice-delay file is used ([`:835-840`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L835-L840)).
- **Smoothing output:** `<smin>.sm<FWHM>` (volume or surface) appended to the
  smoothing input stem ([`:862-866`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L862-L866)).

The registration file name is `register.dof<DOF>.lta` (or
`register.dof<DOF>.b0dc.lta` with B0DC) ([`:895-898`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L895-L898)).
See [[register.dat]] for the registration-file concept.

## Mathematical Foundations

`preproc-sess` is an orchestrator and contains no numerical algorithms itself; it
sets up stems and forwards options. The underlying computations live in the
sub-scripts and their binaries:

> [!internal] Algorithms live downstream
> - Motion correction and template building: `mc-sess` / `mktemplate-sess`.
> - Boundary-based functional→anatomical registration: `register-sess` →
>   [[bbregister]].
> - Slice-timing correction: `stc-sess` → [[stc.fsl]] (FSL `slicetimer`).
> - Surface/volume resampling: `rawfunc2surf-sess` / `rawfunc2tal-sess`.
> - Spatial smoothing: `spatialsmooth-sess` (3D) / `surfsmooth-sess` (2D on the
>   surface).

## Configuration Options

### Complete Flag Reference

All flags are parsed in the `parse_args` block beginning at
[`fsfast/bin/preproc-sess:371`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L371).

#### Mode and analysis

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-a`<br>`-analysis` | string | — | Read fsd, FWHM, space, STC, DOF, per-run/session, B0DC, subcort-mask, etc. from the analysis's `analysis.info` ([`:683`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L683)). |
| `-per-run`<br>`-perrun` | boolean | off | Motion-correct/register to the middle TP of each run; disables in-driver smoothing flags ([`:538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L538)). |
| `-per-session`<br>`-persession` | boolean | off | Motion-correct/register to the first TP of the first run (v4 compatibility) ([`:547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L547)). |
| `-fsd` | string | — | Functional subdirectory (e.g. `bold`) ([`:522`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L522)). |
| `-rlf`<br>`-runlistfile` | string | all runs | Run-list file selecting runs ([`:527`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L527)). |
| `-update` | boolean | on | Only run a stage if its output is older than its input (default) ([`:752`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L752)). |
| `-force`<br>`-noupdate`<br>`-no-update` | boolean | — | Force reprocessing of all stages ([`:756`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L756)). |
| `-nolog` | boolean | off | Do not write log files ([`:762`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L762)). |
| `-debug`<br>`-echo`<br>`-verbose` | boolean | off | Shell tracing ([`:766-777`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L766-L777)). |
| `-version` | boolean | — | Print version and exit. |
| `-help` | boolean | — | Print full help and exit. |

#### Target space

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-surface`<br>`-surf` | subject hemi | — | Resample raw data to the surface; hemi `lh`, `rh`, or `lhrh` for both. `subject self` maps to native anatomy ([`:588`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L588)). |
| `-mni305`<br>`-mni305-2mm` | boolean | — | Resample raw data to MNI305 at 2 mm ([`:602`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L602)). |
| `-mni305-1mm` | boolean | — | Resample raw data to MNI305 at 1 mm ([`:638`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L638)). |
| `-cvs` | boolean | — | Resample to `cvs_avg35_inMNI152` at 2 mm (not with `-mni305`/`-fsmni152`) ([`:611`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L611)). |
| `-fsmni152` | boolean | — | Resample to FreeSurfer MNI152 at 2 mm (not with `-mni305`/`-cvs`) ([`:620`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L620)). |
| `-usual` | boolean | — | Preset: surface (fsaverage lhrh) **and** MNI305 2mm, per-run, FWHM 5 ([`:627`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L627)). |
| `-subcort-mask`<br>`-subcort` | boolean | on | Apply subcortical masking when resampling to standard volume ([`:645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L645)). |
| `-no-subcort-mask`<br>`-no-subcort` | boolean | — | Disable subcortical masking ([`:649`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L649)). |

#### Smoothing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-fwhm`<br>`-vol-fwhm` | float (mm) | — | 3D (volume) smoothing FWHM; `0` turns smoothing off. Selects volume smoothing and disables surface smoothing ([`:450`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L450)). |
| `-surf-fwhm` | float (mm) | — | 2D (surface) smoothing FWHM; resamples to the surface, smooths, maps back (slow). Not with `-vol-fwhm` ([`:473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L473)). |
| `-nosmooth`<br>`-no-smooth` | boolean | — | Disable all smoothing ([`:581`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L581)). |
| `-smooth-mask` | boolean | off | Use the brain mask during volume smoothing ([`:465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L465)). |
| `-no-smooth-mask` | boolean | — | Do not use the mask during volume smoothing ([`:469`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L469)). |
| `-projfrac` | frac expkey | 0.5 | Projection fraction (white↔pial) for surface smoothing; expkey makes the output stem unique ([`:507`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L507)). |
| `-projfrac-avg` | boolean | off | Average over the ribbon instead of a fixed fraction (slow; not with `-projfrac`) ([`:513`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L513)). |
| `-no-cortex-label` | boolean | off | Do not mask surfaces with the cortex label ([`:745`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L745)). |
| `-cortex-label` | boolean | on | Use the cortex label for surface masking ([`:748`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L748)). |
| `-volsurffwhm` | float | — | (Testing) volume-of-surface FWHM ([`:483`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L483)). |

#### Slice-timing correction

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-stc`<br>`-sliceorder`<br>`-so` | enum | off | Enable STC with a named slice order (`siemens`/`up`/`down`/`odd`/`even`) ([`:558`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L558)). |
| `-sdf` | string (path) | — | Explicit slice-delay file (fractions of TR); enables STC; must exist ([`:566`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L566)). |
| `-ngroups` | integer | 1 | Number of SMS slice groups for STC ([`:576`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L576)). |
| `-nostc`<br>`-no-stc` | boolean | (off) | Explicitly disable STC ([`:553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L553)). |

#### Registration

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-reg` | boolean | on | Enable registration ([`:385`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L385)). |
| `-noreg`<br>`-no-reg` | boolean | — | Disable registration ([`:389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L389)). |
| `-reg-dof` | integer | 6 | Registration degrees of freedom ([`:394`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L394)). |
| `-regfile` | string | (derived) | Registration file for use with `-surf-fwhm` ([`:488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L488)). |
| `-bold`<br>`-t2` | boolean | bold | Treat the functional as T2*/BOLD contrast for registration ([`:499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L499)). |
| `-t1` | boolean | — | Treat the functional as T1 contrast for registration ([`:503`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L503)). |
| `-init-coreg` | boolean | on | Initialise BBR with `mri_coreg` ([`:654`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L654)). |
| `-init-fsl` | boolean | — | Initialise BBR with FSL ([`:660`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L660)). |
| `-init-spm` | boolean | — | Initialise BBR with SPM (needs MATLAB) ([`:666`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L666)). |
| `-init-header` | boolean | — | Initialise BBR from header geometry ([`:672`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L672)). |
| `-bbr-int` | ifsd istem | — | Use an intermediate volume `sess/ifsd/RRR/istem` for BBR ([`:493`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L493)). |
| `-bbr-xopts` | file | — | Pass an expert-options file to [[bbregister]]; must exist ([`:399`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L399)). |
| `-b0dc` | boolean | off | Apply B0 distortion correction (looks for `fsd/b0dcmap.nii.gz`); selects the b0dc registration file ([`:679`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L679)). |

#### Stage toggles and explicit stems

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-nomc`<br>`-no-mc` | boolean | — | Skip motion correction ([`:533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L533)). |
| `-nomask`<br>`-no-mask` | boolean | — | Skip brain-mask creation ([`:740`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L740)). |
| `-no-template` | boolean | — | Skip template creation ([`:736`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L736)). |
| `-inorm` / `-noinorm`<br>`-no-inorm` | boolean | off | Enable/disable (legacy) intensity normalisation ([`:727-734`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L727-L734)). |
| `-nskip` | integer | 0 | Time points to skip when inorming ([`:517`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L517)). |
| `-i`<br>`-in` | string | `f` | Overall input stem ([`:379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L379)). |
| `-mcin`<br>`-mc-in` | string | instem | Explicit MC input stem ([`:408`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L408)). |
| `-mcout`<br>`-mc-out` | string | (derived) | Explicit MC output stem ([`:414`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L414)). |
| `-stcin` | string | mcout | Explicit STC input stem ([`:420`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L420)). |
| `-stcout` | string | (derived) | Explicit STC output stem ([`:425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L425)). |
| `-smin` | string | stcout | Explicit smoothing input stem ([`:430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L430)). |
| `-smout` | string | (derived) | Explicit smoothing output stem ([`:435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L435)). |
| `-mask` | string | `brain` | Mask stem ([`:440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L440)). |
| `-maskdir` | string | `masks` | Mask directory ([`:445`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L445)). |

### Configuration Interactions

Most interactions are resolved by side effects in the parser and by
`check_params` ([`preproc-sess:805`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L805)):

- **`-per-run` disables in-driver smoothing flags** (sets `DoSmooth`,
  `DoVolSmooth`, `DoSurfSmooth` to 0) so that per-run smoothing must be requested
  with `-fwhm` *after* `-per-run` — the header comment documents exactly this
  ordering ([`preproc-sess:21-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L21-L24),
  [`:538-545`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L538-L545)).
- **`-vol-fwhm` and `-surf-fwhm` are mutually exclusive** — each turns the other
  off ([`:450-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L450-L481)).
- **Resampling to surface/standard volume forces in-driver smoothing off** —
  when `-surface`/`-mni305`/`-cvs`/`-fsmni152` is set, smoothing is delegated to
  the resampling sub-script and `DoVolSmooth`/`DoSurfSmooth`/`DoSmooth` are zeroed
  ([`:845-854`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L845-L854)). A FWHM is still **required** in this case.
- **`-mni305`, `-cvs`, `-fsmni152` are mutually exclusive** (each clears the
  others) ([`:602-625`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L602-L625)).
- **`-stc` vs `-sdf`** cannot both be set ([`:900-903`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L900-L903)).
- **`-projfrac` vs `-projfrac-avg`** cannot both be set ([`:884-887`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L884-L887)).
- **`-per-run`/`-per-session` required for MC or registration**
  ([`:814-819`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L814-L819)).
- A **warning** (not an error) is issued if `-b0dc` and `-projfrac` are combined,
  because the resulting stem may conflict at [[mkanalysis-sess]] time
  ([`:889-893`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L889-L893)).

> [!gotcha] `-fwhm`/`-vol-fwhm` ordering after `-per-run`
> Because `-per-run` zeroes the smoothing flags, the documented recipe is to put
> `-fwhm` **after** `-per-run` to get per-run smoothing
> (`preproc-sess -s subj -per-run -fwhm 5 -fsd bold`), as noted in the script
> header ([`preproc-sess:21-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L21-L24)).

> [!gotcha] Passing `-a` overrides individual settings
> When `-a <analysis>` is given, fsd/FWHM/space/STC/DOF/mode/B0DC/subcort are all
> read from `analysis.info`; this can silently override flags you also typed on
> the command line ([`preproc-sess:683-725`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L683-L725)).

## Typical Use Cases

### Use Case 1: Drive preprocessing from an analysis (recommended)

```bash
# Read all preprocessing parameters from the analysis configuration.
preproc-sess -sf sessidlist -df sessdirlist -a my.lh
```

### Use Case 2: Surface + MNI305, smoothed (explicit flags)

```bash
# Template, MC, registration, mask, resample to fsaverage lh/rh and MNI305 2mm,
# smooth at 5mm.
preproc-sess -sf sessidlist -df sessdirlist \
  -surface fsaverage lhrh -mni305 -fwhm 5 -per-run -fsd bold
```

### Use Case 3: Native-space per-run with slice-timing correction

```bash
preproc-sess -s subj01 -d /data/study -fsd bold -per-run \
  -stc siemens -fwhm 5
```

## Pipeline Context

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (anatomical) and DICOM
unpacking; [[mkanalysis-sess]] (writes `analysis.info`) →
**`preproc-sess`** (preprocess each session) → **Successor:** [[selxavg3-sess]]
(first-level GLM). Group-level analysis then uses [[mris_preproc]] +
[[wiki/tools/mri_glmfit|mri_glmfit]].

Note that [[selxavg3-sess]] calls `preproc-sess -s … -d … -a <analysis> -nolog`
automatically for each session unless `-no-preproc` is given
([`fsfast/bin/selxavg3-sess:175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L175)),
so an explicit `preproc-sess` run is often a way to inspect or re-run only the
preprocessing.

## Gotchas and Caveats

> [!gotcha] `-update` is the default
> Stages are skipped when their output is newer than their inputs. Use `-force`
> (a.k.a. `-no-update`) to re-run everything ([`preproc-sess:752-760`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L752-L760)).

> [!gotcha] Mask is created after registration
> The brain-mask stage was moved to run after registration ("Must be after reg
> now"), so a failed registration prevents masking
> ([`preproc-sess:222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L222)).

> [!gotcha] Intensity normalisation is legacy/off
> `inorm-sess` is disabled by default and flagged in source as something that
> should probably be removed; it was needed only for the old `selxavg`
> ([`preproc-sess:345-346`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L345-L346)).

## Error Compensation and Guard Rails

- Aborts immediately if any stage's sub-script returns non-zero (each call is
  status-checked).
- Requires an FSD and a per-run/per-session mode for MC/registration; errors
  otherwise ([`:808-819`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L808-L819)).
- Errors if "nothing to do" — i.e. all of MC, STC, smoothing, mask, and template
  are disabled ([`:879-882`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess#L879-L882)).
- Default stems are auto-derived so that consecutive stages chain correctly
  without manual `-mcin`/`-mcout`/etc.

## Related Tools

- [[mkanalysis-sess]] — writes the `analysis.info` that `preproc-sess -a` reads.
- [[selxavg3-sess]] — first-level GLM fit; invokes `preproc-sess` by default.
- [[stc.fsl]] — slice-timing-correction engine used by the STC stage.
- [[bbregister]] — boundary-based registration used by the registration stage.
- [[epidewarp.fsl]] — B0 distortion correction referenced by `-b0dc`.
- [[register.dat]] — the registration-file concept; output `register.dof6.lta`.
- [[mris_preproc]] / [[wiki/tools/mri_glmfit|mri_glmfit]] — downstream group analysis.

## Confidence and Gaps

The driver's flag set, stage order, stem-chaining, and stage-enable logic are
read directly from the script and are high confidence.

> [!gap] Sub-script internals
> `preproc-sess` only assembles command lines for `mktemplate-sess`,
> `register-sess`, `mkbrainmask-sess`, `mc-sess`, `stc-sess`,
> `rawfunc2surf-sess`, `rawfunc2tal-sess`, `spatialsmooth-sess`,
> `surfsmooth-sess`, and `inorm-sess`. Those sub-scripts' own options and exact
> outputs are not documented on this page.

## References

- FSFAST stream documentation on the FreeSurfer wiki.
- Script self-documentation: [`fsfast/bin/preproc-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/preproc-sess) `BEGINHELP` section.
