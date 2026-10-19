---
title: "mkanalysis-sess"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "fsfast/bin/mkanalysis-sess"
families:
  - "fsfast"
recon_all_stage: null
related:
  - "[[preproc-sess]]"
  - "[[selxavg3-sess]]"
  - "[[stc.fsl]]"
  - "[[slicedelay]]"
  - "[[optseq2]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mris_preproc]]"
  - "[[fsgd-format]]"
  - "[[nifti]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "Several flags set internal variables (FSV3whiten, PolyFitOrder under -abblocked/-retinotopy, UseGUI) that are written or consumed elsewhere; their full downstream effect in fast_selxavg3 is not traced from this page."
  - "The -fsv3 / -fsv3-st2fir 'FreeSurfer Version 3' compatibility behaviour is only partially exposed in this script."
tags:
  - fsfast
  - fmri
  - first-level
  - glm
  - analysis-configuration
  - hrf
---

# mkanalysis-sess

## Summary

`mkanalysis-sess` configures a first-level FSFAST functional analysis. It does
**not** process any data; instead it writes a single configuration file
(`<analysis>/analysis.info`) that records every within-session processing and
design choice — the target space (surface / MNI305 / CVS / MNI152 / native),
spatial-smoothing FWHM, slice-timing-correction order, the experimental design
type (event-related/blocked, retinotopy, AB-blocked, or notask), the hemodynamic
response model, polynomial/temporal-filter nuisance modelling, whitening
(autocorrelation) parameters, and external regressors. The resulting "analysis"
folder is the placeholder that [[preproc-sess]] and [[selxavg3-sess]] read to
preprocess and fit the GLM identically across all sessions.

## Source Information

- **Language:** csh script (`#! /bin/csh -f`)
- **Source file(s):** [`fsfast/bin/mkanalysis-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess)
- **Binary/script location:** `$FREESURFER_HOME/bin/mkanalysis-sess`
- **Companion (legacy):** an older `mkanalysis-sess.old` exists alongside it in the source tree.

## Purpose and Context

An "analysis" in FSFAST is an abstraction that bundles all within-session
processing options so they apply uniformly to every session in a study. Because
the configuration does not depend on the data in any one session, it is created
**once**, from the study directory, and reused for all sessions. The script's
own help is explicit: *"This program only configures the analysis; it does not
analyze the data (see selxavg3-sess)."*
([`fsfast/bin/mkanalysis-sess:944-946`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L944-L946)).

The configuration it writes is consumed in two places:
- [[preproc-sess]] reads it (via `getana`) to decide the target space, FWHM,
  STC order, registration DOF, B0 distortion correction, and per-run/per-session
  mode.
- [[selxavg3-sess]] reads it to build the design matrix and fit the GLM.

Contrasts are added separately with `mkcontrast-sess` (referenced but not
documented here), which writes contrast matrices into the same analysis folder.

## Inputs

### Required Inputs

`mkanalysis-sess` takes no image data as input. Its required *parameters* are:

- **Analysis name** (`-analysis`/`-a`) — names the configuration folder created
  in the study directory.
- **TR** (`-TR`) in seconds, or `-auto-TR` to read it from the data at analysis
  time.
- **A design type** — exactly one of `-event-related`, `-retinotopy`,
  `-abblocked`, or `-notask`.
- **A target space** — exactly one of `-native`, `-surface`, `-mni305`, `-cvs`,
  or `-fsmni152`.
- **A spatial-smoothing FWHM** (`-fwhm`, in mm; use `0` for none) **unless**
  `-funcstem` is given.
- **A functional subdirectory** (`-fsd`, e.g. `bold`).
- **A motion-correction/registration mode** — `-per-run` or `-per-session`.

For event-related/blocked designs, a paradigm file name (`-paradigm`), the number
of conditions (`-nconditions`), and an HRF model (`-fir`/`-gamma`/`-spmhrf`) are
additionally required ([`mkanalysis-sess:776-796`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L776-L796)).

### Input Assumptions

> [!assumption] Run from the study directory; paradigm files live in run dirs
> The analysis folder is created in the current directory, which is expected to
> be the FSFAST **study directory**. Paradigm files (and time-point-exclude
> files) are referenced by name only and must exist with that same name inside
> each functional run directory across all sessions; their contents may differ
> per run/session.

> [!assumption] Smoothing space matches the target space
> The FWHM is interpreted in whatever target space is chosen: surface smoothing
> for `-surface`, volume smoothing for the MNI305/CVS/MNI152/native options.

## Outputs

### Files Created

- **`<analysis>/analysis.info`** — the single text configuration file written by
  this tool (the FLAC/"analysis info"). It is assembled line-by-line from the
  parsed parameters in the body of the script
  ([`mkanalysis-sess:122-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L122-L221))
  and includes a provenance header recording the FreeSurfer build stamp, the tool
  version, the full command line, and a timestamp
  ([`mkanalysis-sess:126-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L126-L129)).
- **`<analysis>/<slicedelayfile>`** — if `-sdf` is given, the slice-delay file is
  copied into the analysis folder ([`mkanalysis-sess:150-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L150-L153)).

### Output Specifications

`analysis.info` is a flat keyword/value text file. Representative keys and the
parameters they encode:

- **Raw-data routing:** `analysis`, `mcstem`, `funcstem`, `fsd`, `TR`, `RegDOF`,
  `PerSession`, `RawSpace`, `mask`, `RawFWHM`, `RawSTC`, `nSliceGroups`,
  `SliceDelayFile`, `ExpKey`, `UseB0DC`, `ApplySubCortMask`, `inorm`.
- **Noise / drift / whitening:** `acfbins`, `fixacf`, `acffwhm`, `acfsvd`,
  `designtype`, `nskip`, `polyfit`, `HPFCutoffHz`, `HeteroGCor`, and (if LPF set)
  a `TFILTER lpf` line.
- **Design-specific blocks:** for event-related designs, `nconditions`,
  `parname`, `RefEventDur`, `timewindow`, `prestim`, `TER`, the HRF line
  (`gamma …` or `spmhrf …`), `stimulusdelay`, and one `Condition NN ConditionNN`
  line per condition ([`mkanalysis-sess:173-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L173-L188));
  for retinotopy and AB-blocked, `period` (and `parname` for retinotopy)
  ([`mkanalysis-sess:190-197`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L190-L197)).
- **External regressors:** `taskreg <name> <N>` and `nuisreg <name> <N>` lines.

## Mathematical Foundations

`mkanalysis-sess` performs the design-derivation arithmetic up front (the GLM
fit itself is done later by `fast_selxavg3`).

> [!math] HRF / timing derivation (event-related, non-FIR)
> The check-params block derives the timing grid
> ([`mkanalysis-sess:798-816`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L798-L816)).
> For non-FIR models the temporal estimation resolution (TER) is chosen so that
> the TR is an integer multiple of it, targeting ~50 ms:
> $$\mathrm{TER} = \frac{TR}{\mathrm{round}\!\left(TR/\mathrm{TER}_{\text{ideal}}\right)},\qquad \mathrm{TER}_{\text{ideal}} = 0.050\ \text{s}.$$
> For FIR models, `TER = TR` by default. The time window is snapped to an integer
> number of TER steps, $N_h = \lfloor \mathrm{TimeWindow}/\mathrm{TER}\rfloor$,
> $\mathrm{TimeWindow} = \mathrm{TER}\cdot N_h$, and similarly for the prestimulus
> window.

> [!math] Default stimulus delay
> For non-FIR models the default stimulus delay is $-TR/2$
> ([`mkanalysis-sess:799`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L799));
> for FIR it is 0. This compensates for the half-TR shift introduced by
> slice-timing reference centring (see [[stc.fsl]]).

> [!math] Gamma HRF shape
> The `-gammafit` model assumes (help text,
> [`mkanalysis-sess:1139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L1139)):
> $$f(t) = \left(\frac{t-\delta}{\tau}\right)^{\alpha} \exp\!\left(-\frac{t-\delta}{\tau}\right),$$
> with hemodynamic delay $\delta$, dispersion $\tau$, and exponent $\alpha$
> (default 2). `-fslhrf N` is a preset gamma with $\delta=0$, $\tau=1.6$,
> $\alpha=3.1$ and $N$ derivatives ([`mkanalysis-sess:416-426`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L416-L426)).

> [!internal] The whitening/ACF math is executed by fast_selxavg3
> `mkanalysis-sess` only records the autocorrelation parameters (`acfbins`,
> `acffwhm`, `fixacf`, `acfsvd`); the spatially-segmented AR/whitening model is
> estimated downstream by `fast_selxavg3` (called by [[selxavg3-sess]]).

## Configuration Options

### Complete Flag Reference

All flags are parsed in the `parse_args` block beginning at
[`fsfast/bin/mkanalysis-sess:230`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L230).

#### Core / identity

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-analysis`<br>`-a` | string | — (required) | Name of the analysis configuration folder ([`:239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L239)). Specifying it twice is an error. |
| `-fsd` | string | — (required) | Functional subdirectory holding the runs, e.g. `bold` ([`:256`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L256)). |
| `-TR`<br>`-tr` | float (s) | — (required) | Repetition time in seconds ([`:340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L340)). |
| `-auto-TR`<br>`-override-tr` | boolean | off | Read the TR from the data at run time (sets TR=1 and `OverrideTR`) so sessions may differ ([`:346`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L346)). |
| `-funcstem` | string | (derived) | Override the input functional stem; setting it forces FWHM=0 and disables `-fwhm` ([`:261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L261)). |
| `-runlistfile`<br>`-rlf` | string | all runs | Name of a per-session run-list file selecting which runs to include ([`:266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L266)). |
| `-force`<br>`-overwrite` | boolean | off | Overwrite an existing analysis folder ([`:665`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L665)). |
| `-version` | boolean | — | Print version and exit. |
| `-help` | boolean | — | Print full help and exit. |
| `-debug` | boolean | off | Shell verbose/echo tracing ([`:694`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L694)). |

#### Target space / preprocessing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-surface`<br>`-surf` | subject hemi | — | Resample raw 4D data onto the surface of `subject` (e.g. `fsaverage` or `self`), hemi `lh` or `rh` ([`:493`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L493)). |
| `-mni305` | [resMM] | resMM=2 | Volume analysis in MNI305 at 1 or 2 mm ([`:511`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L511)). |
| `-cvs` | [resMM] | resMM=2 | Volume analysis in CVS (`cvs_avg35_inMNI152`) space ([`:521`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L521)). |
| `-fsmni152` | [resMM] | resMM=2 | Volume analysis in FreeSurfer MNI152 space (synthmorph warp) ([`:531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L531)). |
| `-native` | boolean | — | Keep data in native functional space; implies per-session motion-cor/registration to the first time point of the first run ([`:570`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L570)). |
| `-fwhm` | float (mm) | — | Spatial-smoothing FWHM in the target space; `0` = none ([`:442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L442)). Leading zeros are stripped. |
| `-stc`<br>`-slice-time-cor` | enum | `none` | Slice-timing-correction order: `siemens`, `up`, `down`, `odd`, `even`, or `none` ([`:463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L463)). See [[stc.fsl]]. |
| `-sdf` | string (path) | — | Explicit slice-delay file (fractions of TR) instead of `-stc`; must exist ([`:474`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L474)). |
| `-ngroups` | integer | 1 | Number of SMS slice groups for STC ([`:453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L453)). |
| `-reg-dof` | integer | 6 | Degrees of freedom for functional→anatomical registration ([`:458`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L458)). |
| `-per-run` | boolean | — | Per-run motion-cor/registration (template = middle TP of each run); sets `mcstem=fmcpr` ([`:550`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L550)). |
| `-per-session` | boolean | — | Per-session motion-cor/registration (template = first TP of first run); sets `mcstem=fmc` ([`:560`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L560)). |
| `-b0dc` | boolean | off | Apply B0 distortion correction; sets `ExpKey=b0dc`. Expects `sess/fsd/b0dcmap.nii.gz` (units of voxels) ([`:582`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L582)). |
| `-expkey` | string | — | Code string appended to file names to keep them unique (e.g. for non-default projfrac); mutually exclusive with an already-set ExpKey ([`:591`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L591)). |
| `-subcort-mask`<br>`-subcort` | boolean | on | Apply subcortical masking (default on) ([`:541`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L541)). |
| `-no-subcort-mask`<br>`-no-subcort` | boolean | — | Disable subcortical masking ([`:545`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L545)). |
| `-volsurffwhm` | float | — | (Testing) smooth in the volume by this FWHM ([`:448`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L448)). |

#### Design type

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-event-related`<br>`-er` | boolean | — | Event-related or blocked design ([`:605`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L605)). |
| `-retinotopy`<br>`-rtopy`<br>`-ret` | periodSec | — | Retinotopy design with stimulation period (s); turns off whitening (acfbins=0) and HPF ([`:622`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L622)). |
| `-abblocked` | periodSec | — | Periodic two-condition (AB-blocked) design with given period (s); turns off whitening and HPF. selxavg3-sess builds a Fourier analysis and a `fund` F-contrast ([`:611`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L611)). |
| `-notask` | boolean | — | External/nuisance regressors only; can be used for seed-based functional connectivity ([`:600`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L600)). |
| `-paradigm`<br>`-p`<br>`-par` | string | — | Name of the paradigm file in each run directory (required for ER and retinotopy) ([`:249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L249)). |

#### Event-related / blocked HRF & timing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-nconditions`<br>`-nc` | integer | — | Number of conditions excluding fixation; checked against the paradigm at run time ([`:272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L272)). |
| `-fir` | PreStim TimeWindow | — | Finite-Impulse-Response model; sets HRF model to `fir`. Estimate from `PreStim` s before onset over a total `TimeWindow` s ([`:379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L379)). |
| `-gammafit`<br>`-gamma` | gfDelta gfTau | — | Assume a gamma-function HRF with delay and dispersion (s) ([`:391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L391)). |
| `-gammaexp` | float | 2 | Gamma exponent α ([`:406`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L406)). |
| `-ngammaderiv` | integer | 0 | Number of derivatives added to the gamma HRF ([`:411`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L411)). |
| `-fslhrf` | nderiv | — | Preset FSL-style gamma HRF (δ=0, τ=1.6, α=3.1) with `nderiv` derivatives ([`:416`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L416)). |
| `-spmhrf` | nderiv | — | Assume the SPM canonical HRF (difference of two gammas) with `nderiv` derivatives ([`:428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L428)). |
| `-TER`<br>`-ter` | float (s) | TR (FIR) / ~0.05 (non-FIR) | Temporal estimation resolution ([`:334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L334)). |
| `-timewindow`<br>`-tw` | float (s) | 40 | Ideal total estimation time window (s) ([`:285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L285)). |
| `-delay`<br>`-timeoffset` | float (s) | −TR/2 (non-FIR), 0 (FIR) | Value added to every paradigm onset time ([`:291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L291)). |
| `-refeventdur`<br>`-red` | float (s) | — | Reference-event duration used to scale the HRF amplitude (required for non-FIR designs) ([`:436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L436)). |
| `-taskreg` | name N | — | Add N external **task** regressors from a file; `-1` = all; tested with t/F, contrast named after the file ([`:368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L368)). |

#### Retinotopy / AB-blocked

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-period` | float (s) | — | Stimulation period (also set positionally by `-retinotopy`/`-abblocked`) ([`:488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L488)). |

#### Noise, drift, whitening, temporal filtering

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-polyfit`<br>`-pf` | integer | 2 | Order of the polynomial drift regressors ([`:635`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L635)). |
| `-hpf` | float (Hz) | 0 | High-pass-filter cutoff (Hz), implemented as a discrete cosine transform ([`:647`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L647)). |
| `-no-hpf` | boolean | — | Force HPF cutoff to 0 ([`:652`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L652)). |
| `-lpf` | float (Hz) | — | (Experimental) low-pass-filter cutoff (Hz) ([`:641`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L641)). |
| `-tpexclude`<br>`-tpef`<br>`-tpex` | string | — | Name of a time-point-exclude file (times in seconds) in each run dir ([`:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L278)). |
| `-nskip` | integer | 0 | Skip the first N time points of each run (e.g. pre-equilibrium TRs) ([`:483`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L483)). |
| `-nuisreg` | name N | — | Add N external **nuisance** regressors from a file (not tested); `-1` = all ([`:353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L353)). |
| `-mcextreg` | boolean | off | Use the (orthogonalised) motion parameters as 3 nuisance regressors ([`:364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L364)). |
| `-acfbins` | integer | 30 (script default) | Number of spatial bins for separate autocorrelation/whitening estimation ([`:297`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L297)). |
| `-acffwhm` | float (mm) | 20 | Smooth the ACF spatially before binning ([`:303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L303)). |
| `-no-fix-acf`<br>`-no-acf-fix` | boolean | off (fixacf=1) | Do **not** correct the ACF for residual-based estimation bias ([`:309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L309)). |
| `-acf-svd`<br>`-acfsvd` | integer | 0 | Components to remove before computing AR1/ACF ([`:314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L314)). |
| `-no-whiten`<br>`-nowhiten` | boolean | — | Turn off temporal whitening (sets acfbins=0) ([`:320`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L320)). |
| `-ghc`<br>`-hetero-gcor` | boolean | off | Heterogeneous global correction (`HeteroGCor=1`) ([`:656`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L656)). |
| `-no-ghc`<br>`-no-hetero-gcor` | boolean | — | Disable heterogeneous global correction ([`:660`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L660)). |
| `-fsv3-whiten` | boolean | off | Whiten as in FreeSurfer Version 3 ([`:690`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L690)). |
| `-fsv3` | boolean | off | Set FSv3 flags and rescale target to 1000 ([`:685`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L685)). |

#### Masking and intensity normalisation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mask` | string | `brain` | Mask stem (under `masks/`) used for ACF/whitening ([`:325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L325)). |
| `-no-mask` | boolean | — | Use no mask (sets maskstem to `nomask`) ([`:330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L330)). |
| `-inorm` | boolean | on | Intensity-normalise the data (default on) ([`:675`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L675)). |
| `-no-inorm`<br>`-noinorm` | boolean | — | Do not intensity-normalise ([`:670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L670)). |
| `-rescale-target` | float | 100 | Intensity-normalisation target value (also enables inorm) ([`:679`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L679)). |

> [!gotcha] `-acfbins` default in code differs from the help text
> The variable initialises to `30`
> ([`mkanalysis-sess:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L68)),
> but the usage/help text states the default is 10
> ([`mkanalysis-sess:906`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L906),
> [`:1239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L1239)).
> The written `analysis.info` reflects the variable, i.e. **30** unless
> overridden. Treat the help as out of date; code is authoritative.

### Configuration Interactions

The `check_params` block ([`mkanalysis-sess:716`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L716))
enforces and resolves most interactions:

- **Exactly one design type.** `-event-related`, `-abblocked`, `-retinotopy`,
  and `-notask` are mutually exclusive; specifying more than one aborts
  ([`:753-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L753-L758)).
- **Exactly one of `-per-run` / `-per-session`** is required; `-native` implies
  `-per-session` and cannot be combined with `-per-run`
  ([`:550-580`, `:717-722`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L717-L722)).
- **`-fwhm` vs `-funcstem`** are mutually exclusive: giving a funcstem forces
  FWHM=0, and giving both is an error ([`:763-774`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L763-L774)).
- **`-stc` vs `-sdf`** cannot both be set ([`:829-832`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L829-L832)).
- **`-b0dc` and `-expkey` both set ExpKey** and therefore conflict — `-b0dc`
  refuses to run if an ExpKey is already set, and vice versa
  ([`:582-598`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L582-L598)).
- **AB-blocked forbids a paradigm file**, while event-related and retinotopy
  **require** one ([`:819-827`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L819-L827)).
- Event-related designs require `-nconditions`, an HRF model, and (for non-FIR) a
  `-refeventdur` ([`:776-796`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L776-L796)).
- `-abblocked` and `-retinotopy` both **force `acfbins=0` (no whitening)** and
  `HPFCutoffHz=0` as a side effect of selecting the design.

> [!gotcha] `-mcextreg` regressor stem depends on space/mode
> When motion parameters are added as nuisance regressors, the stem written to
> `analysis.info` is `mcextreg` for native/per-session analyses but `mcprextreg`
> otherwise ([`mkanalysis-sess:207-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L207-L214)).
> This must match the stem produced during [[preproc-sess]] per-run vs
> per-session motion correction.

## Typical Use Cases

### Use Case 1: Surface-based event-related analysis (fsaverage, gamma HRF)

```bash
# Configure a smoothed (5mm) surface analysis on fsaverage lh,
# event-related with a canonical gamma HRF.
mkanalysis-sess -analysis my.lh -surface fsaverage lh -fwhm 5 \
  -event-related -paradigm my.par -nconditions 3 \
  -gammafit 2.25 1.25 -refeventdur 1 \
  -TR 2 -fsd bold -per-run
```

### Use Case 2: Volume (MNI305 2mm) FIR analysis

```bash
mkanalysis-sess -analysis my.mni305 -mni305 2 -fwhm 5 \
  -event-related -paradigm my.par -nconditions 4 \
  -fir 4 24 -TR 2 -fsd bold -per-run
```

### Use Case 3: Resting-state / seed-based connectivity (notask, native)

```bash
# No task model; motion parameters as nuisance regressors, native space.
mkanalysis-sess -analysis rest.native -native -funcstem fmcpr \
  -notask -mcextreg -TR 2 -fsd rest -per-session
```

## Pipeline Context

`mkanalysis-sess` is the first FSFAST step that touches a study and produces the
configuration every later step depends on.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (anatomical recon for
surface/registration targets) and DICOM unpacking → **`mkanalysis-sess`**
(writes `analysis.info`) → `mkcontrast-sess` (adds contrasts) →
**Successor:** [[preproc-sess]] (preprocess each session) → [[selxavg3-sess]]
(first-level GLM fit). Group analysis then proceeds with [[mris_preproc]] and
[[wiki/tools/mri_glmfit|mri_glmfit]] using an [[fsgd-format]] group descriptor.

> [!internal] Stimulus schedules
> Paradigm files for event-related designs can be generated/optimised with
> [[optseq2]]; their per-condition onset/duration format is read by
> `fast_selxavg3` at fit time.

## Gotchas and Caveats

> [!gotcha] Configuration must agree with preproc-sess
> Because [[preproc-sess]] reads the same `analysis.info` (via `getana`) to pick
> the space, FWHM, STC order, per-run/per-session mode, B0DC, and registration
> DOF, mismatched manual preprocessing will not match what the analysis expects.
> The intended workflow is to let `preproc-sess -a <analysis>` derive its
> settings from this file.

> [!gotcha] `-auto-TR` defers the TR
> With `-auto-TR` the stored TR is 1 and `OverrideTR 1` is written; the real TR
> is read from each session's data when [[selxavg3-sess]] runs, allowing
> different sessions to have different TRs ([`mkanalysis-sess:346-351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L346-L351)).

## Error Compensation and Guard Rails

- Refuses to overwrite an existing analysis folder unless `-force` is given
  ([`mkanalysis-sess:733-742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L733-L742)).
- Validates the `-stc` value against the allowed enumeration and aborts on an
  unknown order ([`:467-471`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L467-L471)).
- For non-FIR event-related designs, automatically derives `TER`, snaps the time
  window/prestim to integer TER steps, and sets the default stimulus delay to
  −TR/2 ([`:798-816`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess#L798-L816)).

## Related Tools

- [[preproc-sess]] — consumes `analysis.info` to preprocess each session.
- [[selxavg3-sess]] — consumes `analysis.info` to fit the first-level GLM.
- [[stc.fsl]] — performs the slice-timing correction configured by `-stc`/`-sdf`.
- [[slicedelay]] — computes the per-slice delay file used by STC.
- [[optseq2]] — designs/optimises event-related stimulus schedules (paradigm files).
- [[mris_preproc]] / [[wiki/tools/mri_glmfit|mri_glmfit]] — downstream group-level surface/volume analysis.
- [[fsgd-format]] — group descriptor used at the group stage.

## Confidence and Gaps

The flag set, the keyword/value layout of `analysis.info`, the mutual-exclusion
rules, and the timing-derivation arithmetic are read directly from the script and
are high confidence.

> [!gap] FSv3 compatibility paths
> `-fsv3`, `-fsv3-whiten`, and the commented `-fsv3-st2fir` set variables
> (`FSV3whiten`) whose downstream effect lives in `fast_selxavg3`; their exact
> behaviour is not traced here.

> [!gap] HeteroGCor semantics
> `-hetero-gcor` writes `HeteroGCor` to the config, but what the heterogeneous
> global-correction model actually does is implemented downstream and is not
> documented here.

## References

- FSFAST stream (FreeSurfer Functional Analysis Stream) documentation on the
  FreeSurfer wiki.
- Script self-documentation: [`fsfast/bin/mkanalysis-sess`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/mkanalysis-sess) `BEGINHELP` section.
