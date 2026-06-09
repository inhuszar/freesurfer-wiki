---
title: "run-qdec-glm"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/run-qdec-glm"
families: []                     # standalone QDEC batch driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[qdec_glmfit]]"
  - "[[mri_concat]]"
  - "[[mris_preproc]]"
  - "[[mri_glmfit-sim]]"
  - "[[tksurfer]]"
  - "[[fsgd-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact byte layout of qdec.cfg (the #MEASURE/#HEMI/#FWHM/#CONTRAST/#QNNN tag lines) and of the per-contrast .mat files is read only through the grep/awk parsing in this script, not validated against a QDEC-GUI-written project on disk."
  - "tksurfer is a legacy OpenGL GUI; whether it is present/functional in a given v8.2.0 install was not verified, so the final visualization step may be a no-op on headless or freeview-only systems."
tags:
  - qdec
  - glm
  - statistics
  - surface
  - group-analysis
  - batch
---

# run-qdec-glm

## Summary

`run-qdec-glm` is a small tcsh batch driver that **re-runs a QDEC group-level
surface GLM non-interactively** from an existing QDEC project directory. Given a
single argument — the path to a `qdecdir` that already contains a QDEC
configuration file (`qdec.cfg`), an FSGD design file (`qdec.fsgd`), and a
`contrasts/` directory of contrast matrices — it concatenates the per-subject
smoothed surface measures into one 4-D overlay, fits the GLM by driving
[[wiki/tools/mri_glmfit|mri_glmfit]], stacks the resulting significance maps into
a single multi-frame file, and finally opens the result in
[[tksurfer]]. It is the scripted, reproducible counterpart to clicking
"Analyze" in the QDEC GUI, and a thin convenience wrapper around the canonical
command-line stream ([[mri_concat]] → [[wiki/tools/mri_glmfit|mri_glmfit]]).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/run-qdec-glm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/run-qdec-glm`
- **FreeSurfer tools invoked:** [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L111) (twice — to build the input stack and to stack the contrast sig maps), [`mri_glmfit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L128-L129) (the GLM fit), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L124) (to count subjects/frames), and [`tksurfer`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L215) (final visualization).

## Purpose and Context

QDEC ("Query, Design, Estimate, Contrast") is FreeSurfer's interactive tool for
vertex-wise group analysis of cortical surface measures (thickness, area,
sulcal depth, curvature, etc.). When a QDEC analysis is set up — either in the
GUI or by [[qdec_glmfit]] — it is described on disk by a few plain-text files in
a project directory. `run-qdec-glm` exists so that the **same analysis can be
reproduced from the command line** (e.g. in a batch job, on a cluster, or after
editing the design) without re-entering anything through the GUI.

Conceptually it is a worked example of the recommended FreeSurfer
"command-line stream" for surface group statistics:

1. Resample/smooth each subject's measure onto the common average surface
   (done **earlier**, e.g. by [[mris_preproc]] / `mris_surf2surf`; this script
   only *reads* the already-smoothed per-subject files).
2. Concatenate the subjects into one 4-D overlay with [[mri_concat]].
3. Fit a GLM at every vertex with [[wiki/tools/mri_glmfit|mri_glmfit]] using the
   [[fsgd-format|FSGD]] design and the QDEC contrasts.
4. Optionally correct for multiple comparisons with [[mri_glmfit-sim]]
   (not done here — see gotcha).
5. View the maps on the inflated surface.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]] or `trac-all`; it is
a stand-alone post-processing driver that consumes the per-subject surface
measures recon-all produced.

> [!gotcha] Reads an existing project — does not design the analysis
> `run-qdec-glm` does no "query" or "design". It assumes the `qdecdir` already
> holds a valid `qdec.cfg`, `qdec.fsgd`, and `contrasts/*.mat` (normally written
> by the QDEC GUI or [[qdec_glmfit]]). Its job is purely to *execute* and
> *display* that pre-built design. If you have not run QDEC first, there is
> nothing for it to run.

## Inputs

### Required Inputs

A single positional argument: **`qdecdir`** — the QDEC project directory. It
must contain all of the following, each checked for existence at startup
([`scripts/run-qdec-glm:30-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L30-L51)):

| File / dir | Role |
|------------|------|
| `qdec.cfg` | QDEC configuration: tag lines `#MEASURE`, `#HEMI`, `#FWHM`, one `#CONTRAST` per contrast, and `#QNNN` contrast-description lines, parsed by `grep`/`awk`. |
| `qdec.fsgd` | The [[fsgd-format|FreeSurfer Group Descriptor]] design file; `Input <subjid> …` lines list the subjects, and it is passed verbatim to `mri_glmfit --fsgd`. |
| `contrasts/` | Directory of contrast matrices; one `<contrast>.mat` per `#CONTRAST` named in `qdec.cfg`. Each `.mat` is checked to exist. |

The per-subject measure files themselves must also already exist on the average
surface (see assumption below) or the script aborts.

### Input Assumptions

> [!assumption] Pre-smoothed per-subject surface measures on a common average
> For every subject listed by an `Input` line in `qdec.fsgd`, the script expects
> the file
> `$SUBJECTS_DIR/<subj>/surf/<hemi>.<measure>.fwhm<FWHM>.<avgsubj>.mgh`
> to exist ([`scripts/run-qdec-glm:113-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L113-L117)). That is, each subject's
> measure must **already** have been sampled onto the average subject's surface
> and surface-smoothed at the FWHM recorded in `qdec.cfg`. This script performs
> **no** resampling or smoothing of its own — that is the job of the QDEC
> preprocessing step / [[mris_preproc]].

Additional environment assumptions:

- **`$SUBJECTS_DIR`** must be set and must contain an average subject. The script
  searches in order for `average`, then `fsaverage`, then `average7`
  ([`scripts/run-qdec-glm:93-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L93-L105)); the first one found becomes both the
  resampling target embedded in the input filename and the `mri_glmfit --surf`
  subject. If only `average7` is present, the legacy `--really-use-average7`
  guard flag is added to the `mri_glmfit` command line.
- The hemisphere (`lh`/`rh`), the measure name, and the FWHM are read from
  `qdec.cfg`; each must resolve to exactly one value or the script exits with an
  error.

## Outputs

### Files Created

All outputs are written **inside `qdecdir`**.

| File / dir | Created by | Contents |
|------------|-----------|----------|
| `y.mgh` | [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L110-L111) | The stacked 4-D input overlay: one frame per subject, in `qdec.fsgd` order. This is the GLM dependent variable. |
| `<glmdir>` contents (`beta.mgh`, `rstd.mgh`, `rvar.mgh`, `<contrast>/sig.mgh`, `<contrast>/gamma.mgh`, etc.) | [`mri_glmfit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L128-L133) (`--glmdir $qdecdir`) | Full GLM fit: regression coefficients, residual error, and per-contrast significance (`-log10 p`) and effect-size maps. One subdirectory per contrast. |
| `contrasts.sig.mgh` | [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L141-L142) | The per-contrast `sig.mgh` maps stacked into one multi-frame file (frame *k* = contrast *k*), for convenient overlay scrolling in tksurfer. |
| `qdec.show.tcl` | the script (a here-built `echo` sequence) | A generated tksurfer Tcl script that loads the contrast/residual/beta overlays, the FSGD, and the curvature, and pops up a "QDEC Contrasts" info dialog listing each contrast against its overlay frame index. Regenerated (`rm -f` then rebuilt) every run. |
| `/tmp/nframes.$$.dat` | [`mri_info --nframes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L124) | Scratch file holding the subject count (number of frames in `y.mgh`); read straight back in. |

Because `mri_glmfit` is given `--glmdir $qdecdir`, the GLM output tree is written
**directly into the project directory**, alongside the config files.

### Output Specifications

- `y.mgh` and `contrasts.sig.mgh` are MGH-format surface overlays
  (`nvertices × 1 × 1 × nframes`) on the chosen average subject's surface.
- The GLM outputs follow [[wiki/tools/mri_glmfit|mri_glmfit]]'s standard
  surface-mode layout; significance is stored as signed `-log10(p)`.
- The design-matrix method is fixed to **`dods`** (Different Offset, Different
  Slope — a separate intercept and slope per discrete group), passed positionally
  to `mri_glmfit` ([`scripts/run-qdec-glm:128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L128)).

## Mathematical Foundations

`run-qdec-glm` performs **no mathematics of its own**; it is an orchestration
script. All of the statistics live in [[wiki/tools/mri_glmfit|mri_glmfit]].

> [!internal] The GLM is fitted by mri_glmfit
> The mass-univariate general linear model — design-matrix construction from the
> [[fsgd-format|FSGD]] (here via the `dods` method), least-squares estimation of
> the regression coefficients $\hat\beta = (X^\top X)^{-1} X^\top y$ at every
> surface vertex, residual variance, the contrast $t$/$F$ statistics, and the
> conversion to $-\log_{10}(p)$ significance maps — are all implemented in
> [[wiki/tools/mri_glmfit|mri_glmfit]]. See that page for the equations. This
> script only assembles its inputs and arguments.

> [!math] dods vs. doss
> The design is built with the **`dods`** ("Different Offset, Different Slope")
> method: each discrete factor level gets its own intercept *and* its own slope
> for every continuous covariate. The alternative, `doss` ("Different Offset,
> Same Slope"), shares one slope across groups. `run-qdec-glm` hard-codes `dods`;
> there is no flag to choose `doss`.

## Configuration Options

### Complete Flag Reference

`run-qdec-glm` takes **exactly one positional argument and no option flags**
([`scripts/run-qdec-glm:23-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L23-L29)). Every analysis parameter is read from the
files inside the project directory rather than from the command line.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `qdecdir` | path (positional, **required**) | — | The QDEC project directory containing `qdec.cfg`, `qdec.fsgd`, and `contrasts/`. Running with any other number of arguments prints the usage line `run-qdec-glm qdecdir` and the version, then exits 1. |

The analysis is instead configured by the **contents** of `qdec.cfg`:

| `qdec.cfg` tag | Consumed as | Effect |
|----------------|-------------|--------|
| `#MEASURE <name>` | `measure` | Surface measure to analyse; part of the input filename. Must appear exactly once. |
| `#HEMI <lh\|rh>` | `hemi` | Hemisphere; selects `lh.`/`rh.` inputs and the tksurfer hemisphere. Must appear exactly once. |
| `#FWHM <mm>` | `fwhm` | Surface-smoothing FWHM; part of the input filename. Must appear exactly once. |
| `#CONTRAST <name>` | `contrasts` | One per contrast; each maps to `contrasts/<name>.mat`, added as an `mri_glmfit --C`. |
| `#QNNN <text>` | contrast labels | Human-readable description of contrast *NNN*, shown in the generated tksurfer info dialog. |

### Configuration Interactions

> [!gotcha] The average subject is auto-selected, and it changes the input filenames
> The script does not let you name the target average subject. It probes
> `$SUBJECTS_DIR` for `average`, then `fsaverage`, then `average7` and uses the
> **first** that exists ([`scripts/run-qdec-glm:93-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L93-L105)). The chosen
> name is interpolated into every expected input filename
> (`…fwhm<FWHM>.<avgsubj>.mgh`), so the per-subject measures must have been
> resampled onto **that same** average. If you have both `average` and
> `fsaverage`, `average` wins regardless of which one the data were sampled to —
> a likely source of "file does not exist" errors.

> [!gotcha] `average7` triggers a guard flag
> Selecting `average7` adds `--really-use-average7` to the `mri_glmfit` call
> ([`scripts/run-qdec-glm:99-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L99-L101)). `mri_glmfit` deliberately refuses
> `average7` without this flag because it is a low-resolution legacy surface;
> the wrapper supplies the override for you.

> [!gotcha] No multiple-comparison correction is performed
> `run-qdec-glm` runs only the GLM fit, **not** [[mri_glmfit-sim]]. The `sig.mgh`
> maps it displays are *uncorrected* vertex-wise significances. Cluster-wise
> correction (permutation / Monte-Carlo) must be run separately afterwards.

## Typical Use Cases

### 1. Re-run a QDEC analysis from the command line

```bash
# qdecdir was created/saved by the QDEC GUI or qdec_glmfit and contains
# qdec.cfg, qdec.fsgd, contrasts/.  $SUBJECTS_DIR must hold the average subject.
setenv SUBJECTS_DIR /space/study/subjects
run-qdec-glm /space/study/qdec/thickness-age-analysis
```

This concatenates the subjects' smoothed thickness maps, fits the GLM, stacks
the contrast significance maps, and opens them on the inflated average surface.

### 2. Batch a design edited by hand

```bash
# Edit the contrast matrices or FSGD inside an existing project, then re-fit
# non-interactively (e.g. on a cluster node with X forwarding, or with the
# tksurfer step ignored on a headless host).
vi /space/study/qdec/area-group/contrasts/group-diff.mat
run-qdec-glm /space/study/qdec/area-group
```

## Pipeline Context

`run-qdec-glm` is a stand-alone **group-analysis driver** that sits downstream of
per-subject recon-all and surface resampling.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] per subject, then surface
resampling/smoothing onto the average subject ([[mris_preproc]] /
`mris_surf2surf`), and a QDEC design built by the QDEC GUI or [[qdec_glmfit]] →
**run-qdec-glm** → **Successor:** [[mri_glmfit-sim]] for multiple-comparison
correction (run separately), and inspection in [[tksurfer]] (or
[[wiki/tools/freeview|freeview]]).

It is **not** invoked by recon-all or trac-all. Within the script the tool chain
is [[mri_concat]] → [[wiki/tools/mri_glmfit|mri_glmfit]] → [[mri_concat]] →
[[tksurfer]], with [[mri_info]] used to count subjects. It is the batch sibling
of [[qdec_glmfit]] (which *builds* the design and project archive) and the
GUI-free analogue of the QDEC application.

## Gotchas and Caveats

> [!gotcha] GLM output overwrites into the project directory
> `mri_glmfit` is run with `--glmdir $qdecdir`, so the fit (and every contrast
> subdirectory) is written **into the project directory itself**, mixed with the
> config files. Re-running overwrites the previous fit in place.

> [!gotcha] Hard dependency on tksurfer
> The script ends by launching [[tksurfer]] ([`scripts/run-qdec-glm:214-215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L214-L215))
> via a generated `qdec.show.tcl`. tksurfer is the legacy OpenGL surface viewer;
> on headless machines or installs where it is unavailable, the analysis still
> completes (all files are written before the launch) but the final display step
> will fail. The computed maps can be opened independently in
> [[wiki/tools/freeview|freeview]].

> [!gotcha] Typo-laden but harmless error messages
> Several existence-check error strings read "ERROR: cannot fin <path>" (missing
> the "d"), e.g. [`scripts/run-qdec-glm:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L31). These are cosmetic; the checks
> themselves are correct and the script exits on a genuinely missing file.

> [!gotcha] Exactly one argument required
> Calling `run-qdec-glm` with zero or more than one argument prints only the
> one-line usage and exits — there is no `--help`/`--version` flag handling
> beyond that.

## Error Compensation and Guard Rails

- **Pre-flight existence checks.** The project directory, `qdec.cfg`,
  `qdec.fsgd`, `contrasts/`, every `<contrast>.mat`, and every per-subject input
  file are each verified before use; any miss aborts with a specific message
  ([`scripts/run-qdec-glm:30-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L30-L79), [`:112-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L112-L119)).
- **Cardinality checks.** `#MEASURE`, `#HEMI`, and `#FWHM` must each resolve to
  exactly one token (`if($#… != 1)`), guarding against a malformed or
  multi-valued `qdec.cfg`.
- **Status propagation.** After each external command the script tests `$status`
  and exits on failure ([`scripts/run-qdec-glm:122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L122), [`:136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L136), [`:153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm#L153)),
  so a failed concat or GLM fit stops the run rather than producing a half-built
  result.
- **Average-subject fallback chain.** Missing `average`/`fsaverage`/`average7`
  all-three is reported explicitly rather than failing obscurely later.

## Related Tools

- [[qdec_glmfit]] — the C++ back end that *creates* and saves a QDEC project; `run-qdec-glm` *re-executes* one.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — the GLM engine this script drives (`dods`, `--surf`, `--C`).
- [[mri_concat]] — stacks the per-subject inputs into `y.mgh` and the contrast sig maps into `contrasts.sig.mgh`.
- [[mris_preproc]] — the canonical tool for resampling/smoothing per-subject measures onto the average surface (the step that produces this script's inputs).
- [[mri_glmfit-sim]] — multiple-comparison (cluster) correction; run after the GLM fit.
- [[tksurfer]] — legacy surface viewer launched for the final display.
- [[fsgd-format]] — the FSGD design-file format (`qdec.fsgd`).

## Confidence and Gaps

**High confidence:** the single-argument interface, the required project files,
the average-subject selection logic and its effect on input filenames, the
`dods` design method, the `mri_concat`/`mri_glmfit`/`mri_concat`/`tksurfer`
command chain, the `--really-use-average7` guard, and the absence of any
multiple-comparison step — all read directly from
[`scripts/run-qdec-glm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm).

> [!gap] qdec.cfg / .mat on-disk format
> The tag-line layout of `qdec.cfg` (`#MEASURE`, `#HEMI`, `#FWHM`, `#CONTRAST`,
> `#QNNN`) and the column format of the per-contrast `.mat` files are inferred
> from the `grep`/`awk` parsing here and from how QDEC writes them; they were not
> cross-checked against a project written by the GUI.

> [!gap] tksurfer availability
> The terminal `tksurfer` launch assumes a working legacy OpenGL viewer. On
> freeview-only or headless v8.2.0 installs this step may not run; the numerical
> outputs are unaffected.

## References

- FreeSurfer source: [`scripts/run-qdec-glm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/run-qdec-glm) (v8.2.0).
- Companion back end: [[qdec_glmfit]]; GLM engine: [[wiki/tools/mri_glmfit|mri_glmfit]].
- FreeSurfer wiki (legacy): the historical `Qdec` and `FsTutorial/QdecGroupAnalysis` pages describe the GUI workflow this script reproduces.
