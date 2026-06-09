---
title: "trac-all"
type: pipeline
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/trac-all"
families: []                     # standalone pipeline orchestrator (TRACULA)
recon_all_stage: null
related:
  - "[[trac-preproc]]"
  - "[[trac-paths]]"
  - "[[dmri_motion]]"
  - "[[dmri_train]]"
  - "[[dmri_paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_mergepaths]]"
  - "[[dmri_group]]"
  - "[[dmri_bset]]"
  - "[[tractstats2table]]"
  - "[[dt_recon]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact behaviour of the CVS/SyN/FNIRT inter-subject warp branches was read from the script but not executed end-to-end; some longitudinal CVS/FNIRT code paths are marked 'Hack: using one time point for now' in the source."
  - "The -onlyversions flag sets DoVersionsOnly but the parse loop for -onlyversions in trac-all also requires the analysis-step guard; interaction with -prep/-path not fully traced for the versions-only early-exit."
tags:
  - tracula
  - diffusion
  - dmri
  - tractography
  - pipeline
  - orchestrator
---

# trac-all

## Summary

`trac-all` is the top-level driver of **TRACULA** (TRActs Constrained by
UnderLying Anatomy), FreeSurfer's automated global-probabilistic tractography
pipeline. It reconstructs a set of named white-matter pathways for one or more
subjects by combining each subject's own diffusion MRI with anatomical priors
learned from a labelled training atlas. `trac-all` itself runs almost no image
computation: it reads a single tcsh configuration file (`dmrirc`), validates the
inputs, writes a fully-resolved per-subject configuration
(`scripts/dmrirc.local`), and then dispatches the heavy lifting to its two stage
scripts [[trac-preproc]] and [[trac-paths]], to FSL's `bedpostx`, and to the
TRACULA binaries ([[dmri_train]], [[dmri_paths]], [[dmri_pathstats]],
[[dmri_mergepaths]], [[dmri_group]]). The user selects which of the four major
stages to run with one of `-prep`, `-bedp`, `-path`, or `-stat`; the four stages
must be run in that order.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/trac-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all)
- **Script location:** `$FREESURFER_HOME/bin/trac-all`
- **Original author:** Anastasia Yendiki (MGH)
- **Stage scripts it drives:** [`trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc) (steps 1.1–1.6), [`trac-paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths) (step 3).
- **TRACULA binaries invoked** (under `$trcdir`, default `$FREESURFER_HOME/bin`): [`dmri_motion`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L417), [`dmri_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L418), [`dmri_paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L419), [`dmri_pathstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L420), [`dmri_mergepaths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L421), and [`dmri_group`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1250) (the only TRACULA binary `trac-all` calls directly, in the `-stat` stage).
- **External tools:** FSL `bedpostx_mgh`/`bedpostx_single_slice.sh`/`bedpostx_preproc.sh`/`bedpostx_postproc.sh` (ball-and-stick fit), `pbsubmit`/`fsl_sub_mgh` (cluster submission), and the FreeSurfer shell utilities `fs_temp_dir`/`fs_temp_file`.

## Purpose and Context

Conventional deterministic tractography requires a user to hand-place seed and
target regions for every tract in every subject. TRACULA instead encodes, for
each pathway of interest, a prior on its spatial location and on the anatomical
labels it passes through, learned once from a set of manually-labelled training
subjects. For a new subject, TRACULA fits a ball-and-stick diffusion model and
then runs a constrained Markov-chain Monte Carlo (MCMC) search that maximises the
posterior probability of the pathway given both the subject's diffusion data and
the anatomical prior. This makes the reconstruction fully automated and robust to
the kind of mild mis-registration that defeats atlas-based seed placement.

`trac-all` orchestrates that whole process. It depends on a completed
[[wiki/pipelines/recon-all|recon-all]] for each subject — the cortical/subcortical
segmentation (`aparc+aseg`), the white-matter surfaces, and (recommended) the
thalamic-nuclei segmentation are read to build the anatomical neighbourhood priors
and to project pathway endpoints onto the cortical surface. It sits alongside, but
is independent of, the volumetric diffusion utility [[dt_recon]]: `dt_recon` does a
single-tensor fit of one DWI scan, whereas TRACULA does ball-and-stick modelling
plus probabilistic tractography across a cohort.

The pipeline is designed for batch use: a single `dmrirc` lists every subject in a
study, and `trac-all` loops over them. On a Sun Grid Engine / PBS cluster it
submits one job per subject; on a single machine it runs them serially.

> [!gotcha] Do not submit `trac-all` itself as a cluster job
> On the MGH Martinos cluster `trac-all` detects PBS and *submits the jobs for
> you* ([`scripts/trac-all#L28-L34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L28-L34)). Wrapping `trac-all` in `pbsubmit`/`qsub` would
> nest job submission. Run it directly on the command line.

## The four stages

`trac-all` performs exactly one of four mutually-exclusive top-level stages per
invocation, selected by a directive flag. The directive sets a family of
`do*` booleans ([`scripts/trac-all#L1360-L1392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1360-L1392)):

| Directive | Stage | What runs | Driven by |
|-----------|-------|-----------|-----------|
| `-prep` | **1. Pre-processing** | Image corrections, QA/motion, intra-subject reg, tensor fit, inter-subject reg, pathway priors (substeps 1.1–1.6) | [[trac-preproc]] (per subject) |
| `-bedp` | **2. Ball-and-stick fit** | FSL `bedpostx` (`bedpostx_mgh` locally, or per-slice jobs on a cluster) | `bedpostx_*` |
| `-path` | **3. Pathway reconstruction** | Constrained-MCMC tractography, path stats, endpoint→surface projection, merged label volume | [[trac-paths]] → [[dmri_paths]], [[dmri_pathstats]], [[dmri_mergepaths]] |
| `-stat` | **4. Group assembly** | Combine whole-path / along-path measures across subjects into a common template space | [[dmri_group]] (called directly by `trac-all`) |

The pre-processing stage is further decomposable. `-prep` is shorthand that turns
on **all** six substeps; you may instead run or skip individual substeps with the
`-corr`/`-nocorr`, `-qa`/`-noqa`, `-intra`/`-nointra`, `-tensor`/`-notensor`,
`-inter`/`-nointer`, `-prior`/`-noprior` pairs (each "do" flag implies
`-prep`; see [Configuration Options](#configuration-options)). All six substeps
are executed inside the single [[trac-preproc]] call.

```
recon-all (per subject)            ← prerequisite, not part of trac-all
        │
        ▼
trac-all -prep  ──▶ trac-preproc ──▶ mri_convert / orientLAS / eddy / topup
   (steps 1.1-1.6)                    bbregister·fslregister / dtifit
                                      mri_robust_register / mri_cvs_register / SyN / FNIRT
                                      dmri_motion (QA) , dmri_train (priors)
        │
        ▼
trac-all -bedp  ──▶ bedpostx_mgh  (ball-and-stick model → dmri.bedpostX/)
        │
        ▼
trac-all -path  ──▶ trac-paths   ──▶ dmri_paths (MCMC tractography)
                                      dmri_pathstats (per-path measures)
                                      mri_vol2surf → mri_cor2label → mris_anatomical_stats
                                      dmri_mergepaths (4D merged label volume)
        │
        ▼
trac-all -stat  ──▶ dmri_group   (cohort tables in template space)
        │
        ▼
tractstats2table  (optional: subjects × measures table for stats software)
```

## The dmrirc configuration mechanism

The defining design choice of `trac-all` is that **the configuration file is a
tcsh script that is `source`d**, not a parsed key/value file
([`scripts/trac-all#L168-L175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L168-L175)). A `dmrirc` file is simply a sequence of
`set …`/`setenv …` statements that overwrite the script's default variables.

1. `trac-all` sets every option to a default
   ([`scripts/trac-all#L97-L160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L97-L160)).
2. It parses the command line (which can set `-c <dmrirc>`, `-s`, `-i`, and the
   stage directives).
3. It `source`s the `dmrirc`, so **anything in the dmrirc overrides the
   corresponding command-line/default value** (the file is sourced *after*
   argument parsing). A syntax error in the file aborts the run.
4. It fills in registration and pathway defaults that depend on the chosen
   options (e.g. adult vs. `-infant` stream).
5. For each subject it writes a fully-resolved, self-contained copy of all
   parameters to `<dtroot>/<subj>/scripts/dmrirc.local`
   ([`scripts/trac-all#L447-L567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L447-L567)) and passes **that** file (not the user's
   `dmrirc`) to [[trac-preproc]]/[[trac-paths]] via `-c`. The stage scripts
   `source` `dmrirc.local` to recover every setting.

> [!gotcha] dmrirc settings beat command-line flags
> Because the run-command file is sourced after the command line is parsed, a
> value set in `dmrirc` silently overrides the same value given on the command
> line. The built-in help states this explicitly: "the options set in that file
> override any corresponding command line options". Conversely, the *only*
> options that can be given purely on the command line (no dmrirc) are the
> subject (`-s`) and the input DWI DICOM (`-i`).

Four example configurations ship in `$FREESURFER_HOME/bin/` and cover the four
study designs the loop logic supports
([`scripts/trac-all#L2070-L2073`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L2070-L2073)):

| Example | Study design |
|---------|--------------|
| `dmrirc.example` | Single session, one DWI scan per session (cross-sectional) |
| `dmrirc.multiscan.example` | Single session, multiple DWI scans per session |
| `dmrirc.long.example` | Multiple sessions (longitudinal), one DWI per session |
| `dmrirc.long.multiscan.example` | Longitudinal, multiple DWI scans per session |

A minimal cross-sectional `dmrirc` only needs `SUBJECTS_DIR`, `subjlist`,
`dcmroot`/`dcmlist`, and (if not in the DICOM header) `bveclist`/`bvallist`;
every other variable has a default. Removing a line from the dmrirc reverts that
option to its default.

## Inputs

### Required Inputs

- **A completed [[wiki/pipelines/recon-all|recon-all]] for each subject** under
  `$SUBJECTS_DIR/<subj>/`. The intra- and inter-subject registration substeps
  read `mri/brain.mgz`, the chosen segmentation `mri/<segname>.mgz` (default
  `aparc+aseg`), and the white surfaces; existence is checked at
  [`scripts/trac-all#L292-L304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L292-L304).
- **Diffusion-weighted images**, one or more runs per subject, given via
  `dcmroot`/`dcmlist` (DICOM, or any format `mri_convert` reads). Provided on the
  command line as `-i <dicom>` only in the no-dmrirc mode.
- **Gradient (`bvec`) and b-value (`bval`) tables** — required unless they can be
  read from the DICOM header. Set with `bveclist`/`bvallist` in the dmrirc.
- **A training atlas**: a `trainfile` (list of training-subject directories) and a
  `pathlist` of pathway names with endpoint-label IDs and control-point counts.
  Defaults point at the bundled HCP atlas
  `$FREESURFER_HOME/trctrain/hcp/{trainlist.txt,pathlist.txt}`
  ([`scripts/trac-all#L1700-L1716`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1700-L1716)).

### Input Assumptions

> [!assumption] recon-all first, DWI is diffusion, b-values are shelled
> Each subject must already have a FreeSurfer reconstruction. The input is
> assumed to be diffusion MRI; if a DWI run arrives without gradient/b-value
> tables, [[trac-preproc]] assumes it is a **b=0-only** scan and synthesises
> all-zero tables (and errors if *no* run has a real table). The `eddy`-based
> correction is invoked with `--data_is_shelled` ("Assuming that it is!",
> [`scripts/trac-preproc#L714`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L714)), so single- or multi-shell HARDI is
> expected rather than a dense Cartesian DSI grid.

- For **B0 field-map** distortion correction (`dob0 = 1`) you must also supply
  magnitude/phase maps (`b0mlist`/`b0plist`) and the field-map TE difference
  (`dTE`) and echo spacing.
- For **reverse-polarity (topup)** B0 correction (`dob0 = 2`) or model-based
  **eddy** correction (`doeddy = 2`) you must supply the phase-encode direction
  (`pedir`), echo spacing, and EPI factor. `trac-all` enforces these
  prerequisites in `check_params` ([`scripts/trac-all#L1886-L1934`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1886-L1934)).
- The thalamic-nuclei segmentation
  (`mri/ThalamicNuclei.*.FSvoxelSpace.mgz`) is strongly recommended and used by
  default (`usethalnuc = 1`); [[trac-preproc]] errors if it is requested but
  missing.

## Outputs

`trac-all` writes a TRACULA subject tree under `<dtroot>/<subj>/` (where
`dtroot` defaults to `SUBJECTS_DIR`). The major artefacts, by stage:

### Files Created

| Stage | Path (under `<dtroot>/<subj>/`) | Contents |
|-------|---------------------------------|----------|
| (all) | `scripts/dmrirc.local` | fully-resolved per-subject configuration written by `trac-all` and sourced by the stage scripts |
| (all) | `scripts/trac-all.log`, `scripts/trac-all.cmd` | combined log / command record (overridable via `-log`/`-cmd`) |
| (all) | `scripts/IsRunning.trac` | lock file present while a stage runs (see `-no-isrunning`) |
| -prep | `dmri/dwi.nii.gz`, `dmri/dwi.bvecs`, `dmri/dwi.bvals` | corrected, combined DWI volume and tables |
| -prep | `dmri/lowb.nii.gz`, `dlabel/diff/lowb_brain_mask.nii.gz` | mean b=0 image and its brain mask |
| -prep | `dmri/dwi_motion.txt`, `dmri/dwi_motion_byvol.txt` | head-motion / QA measures from [[dmri_motion]] |
| -prep | `dmri/xfms/*.lta` (e.g. `diff2anatorig.<reg>.lta`, `diff2<xspace>.<reg>.lta`) | intra-/inter-subject transforms |
| -prep | `dmri/dtifit_*.nii.gz` (FA, MD, …) | single-tensor fit (FSL `dtifit`) |
| -prep | `dlabel/<xspace>/<path>_<avgmode>_*` | pathway priors, end ROIs, initial control points from [[dmri_train]] |
| -bedp | `dmri.bedpostX/` | FSL ball-and-stick model parameters |
| -path | `dpath/<path>_<avgmode>/path.pd.nii.gz`, `path.map.nii.gz`, `pathstats.overall.txt`, `pathstats.byvoxel.txt` | reconstructed pathway posterior, MAP path, and per-path measures |
| -path | `dpath/.../endpt{1,2}.surf.{mgz,label,stats}` | pathway endpoints projected onto the cortical surface |
| -path | `dpath/merged_<avgmode>.mgz` | all pathways merged into one labelled 4D volume ([[dmri_mergepaths]]) |
| -stat | `<dtroot>/stats/<path>.<avgmode>.{inputs.txt,…}` | cohort tables produced by [[dmri_group]] (`stats.long/` for longitudinal) |

`<avgmode>` encodes the atlas size and template space, e.g. `avg<ntrain>_<xspace>_<reg>`
where `<xspace>` ∈ {`mni`, `rob`, `cvs`, `syn`, `fnt`} and `<reg>` ∈ {`flt`, `bbr`}.

### Output Specifications

Path posteriors and masks are NIfTI (`FSLOUTPUTTYPE=NIFTI_GZ` is forced,
[`scripts/trac-all#L39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L39)). The merged label volume is MGZ with a colour
table copied from `FreeSurferColorLUT.txt`. Transforms are FreeSurfer LTA / `.m3z`
morphs. Stats files are plain text consumed downstream by [[tractstats2table]].

## Mathematical Foundations

`trac-all` is an **orchestrator** and contains essentially no mathematics itself
beyond list bookkeeping (selecting subject subsets with `sed -n`, computing the
`dproj` projection sample count). The numerical core of TRACULA lives in the
binaries it drives.

> [!internal] The TRACULA mathematics lives in the dmri_* binaries
> Ball-and-stick fitting is FSL `bedpostx`. The constrained-MCMC global
> tractography (the anatomically-informed posterior maximisation) is in
> [[dmri_paths]]; the spatial/anatomical priors and spline initialisation are in
> [[dmri_train]] and [[dmri_spline]]; whole-path and along-path anisotropy /
> diffusivity statistics are in [[dmri_pathstats]]; cohort averaging in template
> space is in [[dmri_group]]. See those pages for the equations.

The one place `trac-all` chooses a numerical convention is the bedpostx model
order: it passes `-n $nstick -model 1` (single-shell ball-and-stick with
`nstick` anisotropic compartments, default 2) at
[`scripts/trac-all#L617`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L617).

## Configuration Options

These are the **command-line flags** parsed by `trac-all`
([`scripts/trac-all#L1316-L1559`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1316-L1559)). The much larger set of *analysis* parameters
(b-values, registration method, MCMC counts, etc.) is set in the **dmrirc** file,
not via flags; see [The dmrirc configuration mechanism](#the-dmrirc-configuration-mechanism)
and `dmrirc.example`.

### Stage directives (choose exactly one top-level stage)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-prep` | bool | off | Run pre-processing: enables all of `docorr`, `doqa`, `dointra`, `dotensor`, `dointer`, `dopriors` (substeps 1.1–1.6). |
| `-bedp` | bool | off | Run the FSL bedpostx ball-and-stick fit (step 2). |
| `-path` | bool | off | Run pathway reconstruction (step 3) via [[trac-paths]]. |
| `-stat` | bool | off | Assemble cohort pathway measures (step 4) via [[dmri_group]]. |

### Pre-processing substep toggles (each "do" form implies `-prep`)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-corr`<br>`-nocorr` | bool | on within `-prep` | Image corrections (eddy-current and/or B0). `-corr` alone runs only this substep. |
| `-qa`<br>`-noqa` | bool | on within `-prep` | Image quality assessment / head-motion estimation ([[dmri_motion]]). |
| `-intra`<br>`-nointra` | bool | on within `-prep` | Intra-subject (DWI→T1) registration. |
| `-tensor`<br>`-notensor` | bool | on within `-prep` | Single-tensor fit (FSL `dtifit`). |
| `-inter`<br>`-nointer` | bool | on within `-prep` | Inter-subject (individual→template) registration. |
| `-prior`<br>`-noprior` | bool | on within `-prep` | Combine training data with the subject to build pathway priors ([[dmri_train]]). |

### Mandatory inputs (no-dmrirc mode)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-subject`<br>`-subjid`<br>`-sid`<br>`-s` | string | — | Subject ID (a trailing `/` is stripped). Overridden if `subjlist` is set in dmrirc. |
| `-i` | string (path) | — | Input DWI DICOM (or other format). Splits into `dcmroot`/`dcmfile`. Must exist and be readable. |
| `-c` | string (path) | — | dmrirc configuration file to source. Must exist and be readable. |

### Run control and environment

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-infant` | bool | off | Use the infant-brain processing stream (changes default registration methods, training atlas `trctrain/inf/`, `gmgrow`, `pmin`). |
| `-jobs <file>` | string | — | Write parallel-ready command lines to `<file>` instead of running them (for manual cluster submission). |
| `-log <file>` | string | `scripts/trac-all.log` | Custom log file. A bare basename is placed in each subject's `scripts/`. |
| `-noappendlog` | bool | append | Move an existing log to `.old` instead of appending. |
| `-cmd <file>` | string | `scripts/trac-all.cmd` | Custom command file. |
| `-no-isrunning` | bool | check on | Do not create/check the `IsRunning.trac` lock file. |
| `-sd <dir>` | string | `$SUBJECTS_DIR` | Set `SUBJECTS_DIR`. |
| `-csurfdir <dir>` | string | `$FREESURFER_HOME` | Override `FREESURFER_HOME` (canonicalised). |
| `-umask <mask>` | string | `002` | Unix file-permission mask. |
| `-grp <gid>` | string | — | Assert that the current primary group equals `<gid>` (errors otherwise). |
| `-allowcoredump` | bool | off | `limit coredumpsize unlimited`. |
| `-cleancsdf` | bool | off | Delete the cached `scripts/csurfdir` so a changed `FREESURFER_HOME` is not flagged. |
| `-time`<br>`-notime` | bool | off | Wrap main commands in `fs_time`. |
| `-debug` | bool | off | `set echo`-style verbose output, passed through to the stage scripts. |
| `-dontrun` | bool | run | Echo every command but do not execute it (passed down as `-dontrun`). |
| `-onlyversions` | bool | off | Print the version of each binary to the log and exit without processing. |
| `-version` | bool | — | Print the script version and exit. |
| `-help` | bool | — | Print the full help (the `BEGINHELP` block) and exit. |

### Configuration Interactions

> [!gotcha] The four stages are sequential, not combinable
> A single `trac-all` run does exactly one of `-prep`/`-bedp`/`-path`/`-stat`.
> Each directive *resets* the other three booleans to 0
> ([`scripts/trac-all#L1360-L1392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1360-L1392)), so if you pass several, **the last one on
> the command line wins**. The four stages must be run in order (prep → bedp →
> path → stat) across separate invocations; `-path` reads the bedpostx output
> that `-bedp` produces.

> [!gotcha] Substep "do" flags silently switch you into `-prep`
> Every `-corr`/`-qa`/`-intra`/`-tensor`/`-inter`/`-prior` flag sets
> `dopreproc = 1` and clears `dobedpost`/`dopaths`/`dostats`. So
> `trac-all -bedp -tensor` does **not** run bedpost — the trailing `-tensor`
> turns the run into a pre-processing run with only the tensor substep enabled.
> Order matters, and mixing a stage directive with a substep flag is rarely what
> you want.

> [!gotcha] A no-op pre-processing run is rejected
> `trac-all -prep -nocorr -noqa -nointra -notensor -nointer -noprior` (or any
> `-prep` where all six substeps are off) errors with "no analysis step … has
> been selected" ([`scripts/trac-all#L1953-L1958`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1953-L1958)).

> [!gotcha] `bmax` and `bshell` are mutually exclusive
> Selecting a DWI subset by maximum b-value (`bmax`) and by explicit shell list
> (`bshell`) at the same time is a hard error
> ([`scripts/trac-all#L1860-L1863`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1860-L1863)). Both are handled downstream by [[dmri_bset]].

Other dmrirc-level interactions enforced by `check_params`
([`scripts/trac-all#L1755-L1960`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1755-L1960)):

- The lengths of `pathlist`, `gmids` (endpoint label IDs), and `ncpts` (control
  points) must match; each control-point count must be ≥ 2.
- In an image-correction run, `dcmlist` must have one entry per subject ID, and
  any `bveclist`/`bvallist` must match in length.
- `dob0`/`doeddy` levels gate which of `b0mlist`/`b0plist`/`echospacing`/`pedir`/`epifactor`
  are required (field-map vs. topup vs. eddy).
- `interreg` selects the inter-subject space and its default target:
  1/2 → MNI affine, 3 → robust affine, 4 → CVS nonlinear, 5 → SyN FA nonlinear
  (the adult default), 6 → FNIRT FA nonlinear
  ([`scripts/trac-all#L1629-L1686`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1629-L1686)). CVS/SyN/FNIRT are unavailable for `-infant`.
- The deprecated booleans `doregflt`/`doregbbr`/`doregcvs`/`doregmni`/`mnitemp`/`cvstemp`
  are still honoured for backward compatibility and mapped onto `intrareg`/`interreg`
  ([`scripts/trac-all#L1567-L1585`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1567-L1585)).

## Typical Use Cases

### 1. Full cross-sectional run from a dmrirc

```bash
# Edit a copy of the bundled example first.
cp $FREESURFER_HOME/bin/dmrirc.example my_dmrirc
# ... set SUBJECTS_DIR, subjlist, dcmroot/dcmlist, bveclist/bvallist ...

trac-all -prep -c my_dmrirc     # steps 1.1-1.6 (per subject)
trac-all -bedp -c my_dmrirc     # ball-and-stick fit (run on a cluster if possible)
trac-all -path -c my_dmrirc     # tractography + per-subject stats
trac-all -stat -c my_dmrirc     # cohort tables
```

### 2. Quick single-subject run with all defaults (no dmrirc)

```bash
# Subject already recon-all'd; gradient/b-value tables read from the DICOM.
trac-all -prep -s subj01 -i /data/subj01/dwi/0001.dcm
trac-all -bedp -s subj01 -i /data/subj01/dwi/0001.dcm
trac-all -path -s subj01 -i /data/subj01/dwi/0001.dcm
```

### 3. Re-run just one pre-processing substep

```bash
# Recompute only the inter-subject registration (e.g. after changing interreg).
trac-all -inter -c my_dmrirc
```

### 4. Generate cluster job files instead of running locally

```bash
# Write command lines to submit by hand; nothing is executed.
trac-all -prep -c my_dmrirc -jobs /tmp/trac_prep_jobs.txt
```

### 5. Aggregate path measures for group statistics

```bash
trac-all -stat -c my_dmrirc
# then turn the per-subject stats into a subjects x measures table:
tractstats2table --load-pathstats-from-file pathfiles.txt \
  --overall --only-measures FA_Avg --tablefile lh.cst.FA.table
```

## Pipeline Context

`trac-all` is the **entry point** of TRACULA and is run directly by the user; it
is never called by [[wiki/pipelines/recon-all|recon-all]] (the relationship is the
reverse — recon-all is a prerequisite).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (anatomical
reconstruction; thalamic-nuclei segmentation recommended) →
**This pipeline:** `trac-all` (orchestration) → **drives:** [[trac-preproc]],
`bedpostx`, [[trac-paths]], [[dmri_group]] →
**Successor:** [[tractstats2table]] (assemble group tables for external stats
software).

For longitudinal studies, `trac-all` interleaves with the FreeSurfer longitudinal
stream: time points are processed with `-prep`/`-bedp`, the base template gets the
priors, and `-path` reconstructs through the base (the `*.long.*` dmrirc examples,
loop logic at [`scripts/trac-all#L640-L1118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L640-L1118)).

## Gotchas and Caveats

> [!gotcha] Output goes under SUBJECTS_DIR unless `dtroot` is set
> If `dtroot` is not set in the dmrirc, TRACULA output is written *inside*
> `$SUBJECTS_DIR` ([`scripts/trac-all#L1837-L1839`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L1837-L1839)), mingling diffusion results with
> the anatomical recons. Set `dtroot` to keep them separate.

> [!gotcha] `IsRunning.trac` lock blocks re-runs after a crash
> Like recon-all, each stage drops a `scripts/IsRunning.trac` lock and refuses to
> start if one already exists ([`scripts/trac-preproc#L148-L168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L148-L168)). After an
> abnormal exit you must `rm` it (or pass `-no-isrunning`) before re-running.

> [!gotcha] Build-stamp / FREESURFER_HOME mismatch is only a warning by default
> If the subject was processed with a different FreeSurfer build, `trac-all`
> prints an INFO message and continues — unless you `setenv REQUIRE_FS_MATCH 1`,
> which makes the mismatch a hard error ([`scripts/trac-all#L319-L342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L319-L342)). A
> changed `FREESURFER_HOME` likewise only warns (cached in `scripts/csurfdir`);
> clear it with `-cleancsdf`.

> [!gotcha] `bedpostx` is slow and wants a cluster
> Run locally, `-bedp` warns "this might take a while … recommended to run this
> step on a cluster" ([`scripts/trac-all#L613-L616`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L613-L616)). On PBS it fans the fit out
> into per-slice jobs.

## Error Compensation and Guard Rails

- **Missing gradient/b-value tables → assume b=0.** A DWI run with no `bvecs`/`bvals`
  is treated as a b=0-only acquisition with synthesised all-zero tables
  ([`scripts/trac-preproc#L291-L328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L291-L328)); the run aborts only if *no* run has real
  tables.
- **Gradient table orientation auto-detected.** [[trac-preproc]] detects whether
  b-vectors are stored as 3 rows or 3 columns and transposes to 3-column form
  ([`scripts/trac-preproc#L347-L396`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L347-L396)); a row/column count mismatch with the
  b-values is a hard error.
- **DWIs reoriented to LAS** before FSL tools run, to avoid axis flips
  (`orientLAS`).
- **NIfTI header restoration.** After FSL eddy/topup, which can strip the
  vox→RAS transform, the header is restored with `mri_convert --in_like`
  ([`scripts/trac-preproc#L1019-L1032`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1019-L1032)).
- **Odd image dimensions** disable topup subsampling automatically
  ([`scripts/trac-preproc#L501-L524`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L501-L524)).
- **Per-subject input validation** in `check_params` catches mismatched list
  lengths, missing distortion-correction inputs, and `<2` control points before
  any work starts.
- **Degenerate pathway re-initialisation.** In step 3, [[trac-paths]] detects a
  pathway whose posterior collapsed to a single curve and re-runs the priors +
  MCMC with a fresh initialisation, up to 5 times
  ([`scripts/trac-paths#L394-L526`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L394-L526)).

## Related Tools

- [[trac-preproc]] — the stage script that performs all six pre-processing substeps for one subject.
- [[trac-paths]] — the stage script that performs the tractography and per-subject path statistics.
- [[dmri_motion]] — head-motion / QA measures (step 1.2).
- [[dmri_train]] — builds the anatomical pathway priors from the training atlas (step 1.6).
- [[dmri_paths]] — the constrained-MCMC tractography engine (step 3).
- [[dmri_pathstats]] — whole-path and along-path anisotropy/diffusivity measures.
- [[dmri_mergepaths]] — merges reconstructed pathways into one labelled volume.
- [[dmri_group]] — assembles cohort tables in template space (step 4, called directly by `trac-all`).
- [[dmri_bset]] — extracts a b-value subset when `bmax`/`bshell` is set.
- [[tractstats2table]] — turns the per-subject `pathstats.*.txt` files into a subjects × measures table for statistics software.
- [[dt_recon]] — single-scan tensor reconstruction; a simpler, non-tractography diffusion path.
- [[wiki/pipelines/recon-all|recon-all]] — the anatomical prerequisite for every TRACULA subject.
- `bedpostx_mgh` *(no wiki page yet)* — FSL ball-and-stick model fit driven by the `-bedp` stage.

## Confidence and Gaps

**High confidence:** the four-stage structure and directive semantics, the
substep-toggle behaviour and the "last directive wins" rule, the dmrirc
source-and-override mechanism, the per-subject `dmrirc.local` generation, the
`bmax`/`bshell` exclusion, the cross-sectional vs. longitudinal loop, and the
full command-line flag set — all read directly from
[`scripts/trac-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all).

> [!gap] Nonlinear inter-subject warp branches not executed
> The CVS, SyN, and FNIRT inter-subject registration code paths (and especially
> their longitudinal variants, several of which carry an explicit "Hack: Using one
> time point for now" comment, e.g. [`scripts/trac-preproc#L2063-L2065`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L2063-L2065))
> were read statically but not run end-to-end. Treat the exact transform chains as
> code-derived rather than empirically verified.

## References

- FreeSurfer source: [`scripts/trac-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all), [`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc), [`scripts/trac-paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths) (v8.2.0).
- Example configurations: `$FREESURFER_HOME/bin/dmrirc{,.multiscan,.long,.long.multiscan}.example`.
- Yendiki A. et al. "Automated probabilistic reconstruction of white-matter pathways in health and disease using an atlas of the underlying anatomy." *Front. Neuroinform.* 5:23 (2011) — the TRACULA method.
- Built-in help: `trac-all -help` (the `BEGINHELP` block, [`scripts/trac-all#L2036-L2153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all#L2036-L2153)).
