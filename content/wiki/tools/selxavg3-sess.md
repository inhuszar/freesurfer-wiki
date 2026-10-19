---
title: "selxavg3-sess"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "fsfast/bin/selxavg3-sess"
  - "fsfast/bin/selxavg3-sess.v5.3"
families:
  - "fsfast"
recon_all_stage: null
related:
  - "[[mkanalysis-sess]]"
  - "[[preproc-sess]]"
  - "[[stc.fsl]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mris_preproc]]"
  - "[[optseq2]]"
  - "[[fsgd-format]]"
  - "[[nifti]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "The numerical GLM/whitening/contrast computation lives in the MATLAB/Octave function fast_selxavg3(b) (and its compiled binary fast_selxavg3b.glnxa64), not in this csh wrapper; the algorithm details are not traced from this page."
  - "The exact set and meaning of every output file under <session>/<fsd>/<analysis>/ is determined by fast_selxavg3 and is only partially enumerated here."
tags:
  - fsfast
  - fmri
  - first-level
  - glm
  - contrasts
  - whitening
---

# selxavg3-sess

## Summary

`selxavg3-sess` performs the **first-level fMRI analysis** in FSFAST. Given an
analysis configuration created by [[mkanalysis-sess]] (and contrasts created by
`mkcontrast-sess`), it (optionally) runs preprocessing, then for each session
constructs the per-run design matrix, fits the GLM, saves the regression
coefficients, and computes contrasts and their significances. Runs within a
session are combined so the output is effectively the across-run average. The
heavy numerical work is done in the MATLAB/Octave routine `fast_selxavg3(b)`
(or its compiled binary); the csh script is a session-loop driver that builds
the configuration, manages dependency checking, and launches the engine.

## Source Information

- **Language:** csh script (`#! /bin/csh -f`)
- **Source file(s):**
  - [`fsfast/bin/selxavg3-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess) — the current dispatcher (documented here as authoritative).
  - [`fsfast/bin/selxavg3-sess.v5.3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess.v5.3) — an older variant retained in the tree (see the version note below).
- **Binary/script location:** `$FREESURFER_HOME/bin/selxavg3-sess`
- **Computational engine:** the MATLAB/Octave function `fast_selxavg3` /
  `fast_selxavg3b`, or the compiled `fast_selxavg3b.glnxa64` (MCR).

> [!contradiction] Two scripts share the name `selxavg3-sess`
> The current `selxavg3-sess` writes a config file and calls
> `fast_selxavg3b('<config>')` (and can run the compiled `fast_selxavg3b.glnxa64`
> when `FS_SXA3_USE_BIN=1`), whereas `selxavg3-sess.v5.3` emits MATLAB variable
> assignments and calls `fast_selxavg3;` directly. The current script adds
> `-bin`/`-no-bin`/`-mcr`, `-svyhat`, `-dontrun`, and `-done`, and gives a single
> session its own per-session log file. This page documents the current
> dispatcher; differences are noted where relevant. Code is authoritative.

## Purpose and Context

FSFAST splits the workflow into configuration ([[mkanalysis-sess]]),
preprocessing ([[preproc-sess]]), and model fitting (`selxavg3-sess`).
`selxavg3-sess` is the model-fitting stage. It reads the analysis parameters
(via `getana`) such as the FSD, paradigm/funcstem, run-list file, design type,
and contrast list, then for each session:

1. (default) runs [[preproc-sess]] for that session to ensure preprocessing is
   current ([`fsfast/bin/selxavg3-sess:171-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L171-L181));
2. decides whether the GLM fit and/or contrasts need to be (re)computed by
   comparing output time stamps against the inputs
   ([`:249-300`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L249-L300));
3. writes a per-analysis config file and invokes `fast_selxavg3b` to do the fit
   and contrasts ([`:317-369`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L317-L369)).

Because it averages across runs within a session, the script notes that "some
would call this a second-level analysis"
([`:782`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L782)). It requires MATLAB or Octave (or
the compiled binary).

## Inputs

### Required Inputs

- **An analysis** (`-analysis`/`-a`) — the name of a configuration folder created
  by [[mkanalysis-sess]]; the script verifies that `<analysis>/analysis.info`
  exists ([`:659-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L659-L668)). Alternatively a FLAC file via `-flac`.
- **Sessions** — one or more FSFAST session directories via the standard session
  arguments `-s`/`-sf`/`-d`/`-df`/`-g` (resolved by `getsesspath`)
  ([`:84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L84)).
- **Contrasts** — by default the analysis must already contain contrasts (created
  by `mkcontrast-sess`); otherwise the run aborts unless `-no-con-ok` is given or
  the design type is `abblocked`/`retinotopy` ([`:116-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L116-L120)).
- **Preprocessed (or raw) functional data** plus, for event/blocked designs, the
  paradigm files in each run directory.

### Input Assumptions

> [!assumption] Run from the study directory; preprocessing already configured
> `selxavg3-sess` is run from the FSFAST study directory and reuses the analysis
> created with [[mkanalysis-sess]]. By default it (re)runs [[preproc-sess]] per
> session to ensure preprocessing has been done properly
> ([`:171-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L171-L181)); disable with `-no-preproc`.

> [!gotcha] A specified funcstem suppresses preprocessing
> If the analysis was created with an explicit funcstem
> (`funcstem-specified`), `DoPreProc` is forced to 0 so `selxavg3-sess` will not
> run preprocessing ([`:166-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L166-L168)).

## Outputs

### Files Created

Per session, results are written to `<session>/<fsd>/<analysis>/` (or under
`-outparent` if given) ([`:240-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L240-L247)). The csh driver creates:

- **`sxa3.config.txt`** — the configuration file consumed by `fast_selxavg3b`,
  listing the session, analysis, contrast list, save flags, synthesis flags, and
  the okfile path ([`:318-343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L318-L343)).
- **`fs.build-stamp.txt`** and a copy of **`analysis.info`** in the analysis
  output directory, for provenance ([`:367-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L367-L368)).
- **Log file** under `log/` named
  `selxavg3-sess-<fsd>-<analysis>-<datestr>.<sess>.log` (single session) or
  `…-<datestr>.<pid>.log` (multiple) ([`:138-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L138-L144)).
- Optionally a **done file** (`-done`), a copy of the log written on completion
  ([`:427`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L427)).

The actual statistical outputs — regression coefficients (`beta`), the residual
error variance, contrast effect sizes (`ces`), and significances (`sig`/`fsig`),
plus model-fit summaries — are produced by `fast_selxavg3` inside that analysis
directory. Their precise filenames and formats are determined by the engine, not
the wrapper.

### Output Specifications

> [!internal] Statistical outputs are written by fast_selxavg3
> The driver only writes the config, the provenance files, and the log. The GLM
> outputs (e.g. `beta`, `ces`, `sig`/`fsig` per contrast, `rho`, `fsnr`, and for
> AB-blocked designs `real`/`imag`/`angle` volumes and a `fund` contrast — see
> [[mkanalysis-sess]]) are created by `fast_selxavg3(b)`.

## Mathematical Foundations

`selxavg3-sess` (the csh layer) performs no statistics. The first-level model —
design-matrix construction from the paradigm and HRF model, polynomial/temporal
drift modelling, spatially-segmented temporal **whitening** (using the ACF
parameters recorded by [[mkanalysis-sess]]), GLM estimation, and contrast/
significance computation — is implemented in `fast_selxavg3`.

> [!internal] GLM and whitening engine
> The design matrix, whitening, and contrast math live in the MATLAB/Octave
> routine `fast_selxavg3` (`fast_ldanaflac`, `MRIread`, etc.), or the compiled
> `fast_selxavg3b.glnxa64`. This page does not trace that code.

> [!math] Optional synthetic data
> The wrapper can request synthetic data generation in the engine via
> `-synth`/`-synth-signal-amp`/`-synth-noise-amp`/`-synth-noise-ar1`, passing a
> noise amplitude, an AR(1) coefficient (default 0.3), a signal amplitude, and a
> seed to `fast_selxavg3` ([`:329-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L329-L332)). This is used to validate the
> estimator under a known model rather than to analyse real data.

## Configuration Options

### Complete Flag Reference

All flags are parsed in the `parse_args` block beginning at
[`fsfast/bin/selxavg3-sess:437`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L437).

#### Analysis / sessions

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-analysis`<br>`-a`<br>`-an` | string | — (required) | Name of the analysis configuration (from [[mkanalysis-sess]]). Specifying it twice is an error ([`:445`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L445)). |
| `-flac` | string (path) | — | Use a FLAC file instead of an analysis name; must exist ([`:457`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L457)). |
| `-s` / `-sf` / `-d` / `-df` / `-g` | session args | — | Standard FSFAST session selectors (consumed by `getsesspath`; ignored by the parser body) ([`:623-630`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L623-L630)). |
| `-outparent`<br>`-op` | string (path) | — | Write outputs under this directory instead of in the session ([`:462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L462)). |

#### What to compute

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-contrasts-only`<br>`-co` | boolean | — | Only compute contrasts; assume the GLM estimation already exists ([`:496`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L496)). |
| `-c` | string | all | Compute only the named contrast(s); may be repeated (`-c c1 -c c2`) ([`:502`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L502)). |
| `-no-con-ok` | boolean | off | Run even if the analysis has no contrasts ([`:535`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L535)). |
| `-run-wise`<br>`-per-run`<br>`-perrun` | boolean | off | Analyse each run separately (not combined) ([`:508`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L508)). |
| `-jkrun` | boolean | off | Jackknife over runs (mutually exclusive with `-run-wise`) ([`:518`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L518)). |
| `-fwhm` | boolean | off | Compute the FWHM of the residual ([`:543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L543)). |
| `-no-fwhm` | boolean | (default) | Do not compute residual FWHM ([`:539`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L539)). |
| `-force`<br>`-overwrite` | boolean | off | Delete and re-analyse even if up to date ([`:547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L547)). |
| `-dontrun` | boolean | off | Report which sessions need updating, but do not run (also disables preproc) ([`:586`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L586)). |

#### Preprocessing / saving

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-no-preproc` | boolean | off (preproc on) | Do not run [[preproc-sess]] before fitting ([`:514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L514)). |
| `-svyhat` | boolean | off | Save the model-predicted time series (Yhat) ([`:522`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L522)). *(Current script only; not in v5.3.)* |
| `-svres` | boolean | off | Save the (whitened) residuals; rarely needed ([`:526`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L526)). |
| `-svres-unwhitened`<br>`-svres-uw` | boolean | off | Save the unwhitened residuals ([`:530`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L530)). |
| `-no-reduce-to-mask` | boolean | off (reduce on) | Process all voxels rather than only in-mask voxels; identical results on the surface, near-identical in the volume (kept for backward compatibility) ([`:560`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L560)). |

#### Engine selection / execution

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-bin` | boolean | `FS_SXA3_USE_BIN` env (default 0) | Run the compiled `fast_selxavg3b.glnxa64` binary instead of MATLAB/Octave ([`:481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L481)). *(Current script only.)* |
| `-no-bin` | boolean | — | Use the MATLAB/Octave path (not the compiled binary) ([`:486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L486)). *(Current script only.)* |
| `-mcr` | path | `$FREESURFER_HOME/MCRv97` | MATLAB Compiler Runtime root; implies `-bin` ([`:490`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L490)). *(Current script only.)* |
| `-octave` | boolean | `FS_USE_OCTAVE` env | Use Octave (requires `FS_OCTAVE_LIB`/`FS_OCTAVE_BIN`) ([`:556`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L556)). |
| `-matlab`<br>`-no-octave` | boolean | (default) | Use MATLAB ([`:573-579`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L573-L579)). |
| `-max-threads` | boolean | off (single thread) | Allow MATLAB to use all CPUs (clears `-singleCompThread`) ([`:582`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L582)). |
| `-monly` | path | — | "MATLAB only": write the MATLAB commands to the given file and do not execute; also disables preproc and the binary path ([`:473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L473)). |

#### Synthetic data (validation)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-synth` | boolean | off | Analyse synthesised data instead of real data ([`:596`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L596)). |
| `-synth-signal-amp` | float | 0 | Synthetic signal amplitude (also enables `-synth`) ([`:600`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L600)). |
| `-synth-noise-amp` | float | 1 | Synthetic noise amplitude (also enables `-synth`) ([`:606`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L606)). |
| `-synth-noise-ar1` | float | 0.3 | Synthetic noise AR(1) coefficient (also enables `-synth`) ([`:612`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L612)). |

#### Logging / misc

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-log` | path | (derived) | Explicit log-file path ([`:468`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L468)). |
| `-nolog` | boolean | off | Do not create a log file ([`:552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L552)). |
| `-done` | path | — | On completion, copy the log to this done-file path ([`:618`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L618)). *(Current script only.)* |
| `-debug` | boolean | off | Shell verbose/echo tracing ([`:591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L591)). |
| `-version` | boolean | — | Print version and exit ([`:78-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L78-L82)). |
| `-help` | boolean | — | Print full help and exit. |

### Configuration Interactions

Enforced in `check_params` ([`:649`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L649)) and via parser side effects:

- **An analysis (or FLAC) and at least one session are required**; the analysis
  folder and its `analysis.info` must exist ([`:651-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L651-L668)).
- **`-run-wise` and `-jkrun` are mutually exclusive** ([`:675-678`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L675-L678)).
- **Contrasts are required unless** `-no-con-ok` is given **or** the design type
  is `abblocked`/`retinotopy` (which set `RequireContrasts=0`)
  ([`:113-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L113-L120)).
- **`-monly` forces the MATLAB-script-only path**: it sets `monly=1`, disables
  preprocessing, and forces `FS_SXA3_USE_BIN=0` ([`:473-479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L473-L479)).
- **`-bin` vs `-no-bin` vs `-mcr`**: `-bin` and `-mcr` select the compiled
  binary; `-no-bin` selects MATLAB/Octave. `-mcr` additionally sets the runtime
  root ([`:481-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L481-L494)).
- **`-svres`/`-svres-unwhitened` imply MATLAB residual saving** (`MatlabSaveRes`)
  ([`:164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L164)).
- **Update logic:** by default only sessions whose `beta`/`ces` are out of date
  relative to inputs are processed; `-force`/`-overwrite` or `-run-wise` force a
  re-fit ([`:249-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L249-L301)).

> [!gotcha] Default re-runs preprocessing
> Unless `-no-preproc` (or a specified funcstem) is set, `selxavg3-sess` calls
> [[preproc-sess]] for each session first ([`:171-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L171-L181)). Running `selxavg3-sess`
> can therefore trigger (or re-trigger) preprocessing.

> [!gotcha] Existing results may be deleted before a fresh GLM fit
> When a full GLM fit is to be (re)done (not `-monly`, not per-run), the script
> removes prior `sig`/`cnr`/`ces` files in the analysis directory before
> re-running ([`:313-315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L313-L315)).

## Typical Use Cases

### Use Case 1: Standard first-level analysis

```bash
# Preprocess (default) and fit the GLM + contrasts for all sessions.
selxavg3-sess -analysis my.lh -sf sessidlist -df sessdirlist
```

### Use Case 2: Recompute only contrasts after editing them

```bash
# GLM estimation already done; just (re)compute contrasts.
selxavg3-sess -analysis my.lh -sf sessidlist -df sessdirlist -contrasts-only
```

### Use Case 3: Skip preprocessing and force a re-fit

```bash
selxavg3-sess -analysis my.lh -s subj01 -d /data/study -no-preproc -overwrite
```

### Use Case 4: See what needs updating without running

```bash
selxavg3-sess -analysis my.lh -sf sessidlist -df sessdirlist -dontrun
```

## Pipeline Context

`selxavg3-sess` is the first-level model-fitting stage of FSFAST.

**Predecessor:** [[mkanalysis-sess]] (writes `analysis.info`) → `mkcontrast-sess`
(adds contrasts) → [[preproc-sess]] (preprocess; also auto-invoked here) →
**`selxavg3-sess`** (first-level GLM + contrasts) → **Successor:** group analysis
with [[mris_preproc]] (assemble subjects on the surface/volume) and
[[wiki/tools/mri_glmfit|mri_glmfit]] (group GLM), driven by an [[fsgd-format]] group descriptor.

> [!internal] Paradigm design
> Event-related paradigm schedules can be created/optimised with [[optseq2]];
> `fast_selxavg3` reads them when building the design matrix.

## Gotchas and Caveats

> [!gotcha] Across-run averaging
> Within a session, runs are combined so the output is the across-run average;
> the script itself notes "some would call this a second-level analysis"
> ([`:779-782`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L779-L782)). True group analysis is a separate step
> ([[mris_preproc]] + [[wiki/tools/mri_glmfit|mri_glmfit]]).

> [!gotcha] Single-thread by default
> MATLAB is launched with `-singleCompThread`; use `-max-threads` to allow all
> CPUs ([`:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L60), [`:582-584`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L582-L584)).

> [!gotcha] Requires MATLAB, Octave, or the compiled binary
> The fit cannot run without one of these back ends. The default uses MATLAB; set
> `FS_SXA3_USE_BIN=1` / `-bin` for the MCR-compiled binary, or `-octave` for
> Octave (with `FS_OCTAVE_LIB`/`FS_OCTAVE_BIN` set) ([`:680-703`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L680-L703)).

## Error Compensation and Guard Rails

- Verifies the analysis folder and `analysis.info` exist before running
  ([`:659-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L659-L668)).
- Dependency/time-stamp checking skips sessions that are already up to date
  unless forced, and reports "no data sets needed processing"
  ([`:419-421`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L419-L421)).
- Requires an "okfile" produced by `fast_selxavg3` to confirm success; its
  absence is treated as a failure ([`:362-365`, `:398-401`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L398-L401)).
- For Octave runs, checks that the required environment variables and binaries
  exist ([`:680-703`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess#L680-L703)).

## Related Tools

- [[mkanalysis-sess]] — creates the analysis configuration this tool fits.
- [[preproc-sess]] — preprocessing; auto-invoked unless `-no-preproc`.
- [[stc.fsl]] — slice-timing correction applied during preprocessing.
- [[mris_preproc]] / [[wiki/tools/mri_glmfit|mri_glmfit]] — downstream group-level analysis.
- [[optseq2]] — event-related paradigm design.
- [[fsgd-format]] — group descriptor used at the group stage.

## Confidence and Gaps

The wrapper's flags, control flow, dependency logic, config-file contents, and
back-end selection are read directly from the script and are high confidence.

> [!gap] Engine algorithm and full output inventory
> The GLM/whitening/contrast computation and the complete set of output files are
> produced by `fast_selxavg3(b)` (MATLAB/Octave/MCR), which is not traced here.

> [!gap] selxavg3-sess.v5.3 differences
> The retained `.v5.3` script lacks `-bin`/`-no-bin`/`-mcr`, `-svyhat`,
> `-dontrun`, and `-done`, and uses inline MATLAB assignments rather than a
> config file. A precise feature diff beyond what is noted above is not provided.

## References

- FSFAST stream documentation on the FreeSurfer wiki.
- Script self-documentation: [`fsfast/bin/selxavg3-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/selxavg3-sess) `BEGINHELP` section.
