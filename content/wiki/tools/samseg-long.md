---
title: "samseg-long"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "samseg/samseg-long"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[wiki/tools/samseg|samseg]]"
  - "[[longitudinal-processing]]"
  - "[[fsr-longpreproc]]"
  - "[[fsr-import]]"
  - "[[fsr-coreg]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "The Python worker run_samseg_long (in the samseg package) implements the actual joint longitudinal model; only the options this wrapper passes to it are documented from source."
  - "fsr-longpreproc/fsr-import/fsr-coreg behaviour is summarised from how this script invokes them; see their own pages for details."
tags:
  - segmentation
  - longitudinal
  - samseg
  - whole-brain
---

# samseg-long

## Summary

`samseg-long` is the longitudinal driver for **SAMSEG** ([[wiki/tools/samseg|samseg]]).
It performs the unbiased longitudinal whole-brain segmentation: build (or reuse)
a within-subject template ("base") from all timepoints, then jointly segment
every timepoint against that base so the results are consistent over time. The
tcsh script has two responsibilities — (1) optional **preprocessing** of raw
per-timepoint inputs (import, within-timepoint coregistration, and longitudinal
template construction), and (2) assembling and running the `run_samseg_long`
command — plus it prints a ready-made FreeView command to inspect the result.

## Source Information

- **Language:** tcsh
- **Source file(s):** [`samseg/samseg-long`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long)
- **Binary/script location:** `$FREESURFER_HOME/bin/samseg-long`
- **Worker:** `run_samseg_long` (Python, in the `samseg` package), invoked from
  [`samseg/samseg-long:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L93).

## Purpose and Context

Cross-sectional [[wiki/tools/samseg|samseg]] segments one scan at a time, which
introduces inconsistency when you have repeat scans of the same subject. The
longitudinal pipeline removes that bias: it registers all timepoints to a common
within-subject template, then uses a subject-specific atlas so that
timepoint-to-timepoint differences reflect true change rather than
segmentation noise — the same philosophy as FreeSurfer's surface-based
[[longitudinal-processing]] stream.

`samseg-long` supports two ways of supplying data
([`samseg/samseg-long:543-600`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L543-L600)):

1. **Pre-built longitudinal preprocessing** with `--b` (the output of
   [[fsr-longpreproc]]); the script just runs `run_samseg_long`.
2. **Raw inputs** with `--i`/`--m`/`--refmode`; the script first runs
   [[fsr-import]], [[fsr-coreg]] and [[fsr-longpreproc]] to create the base, then
   runs `run_samseg_long`.

## Inputs

### Required Inputs (two modes)

**Mode A — from a longitudinal-preproc directory:**

| Input | Flag | Notes |
|------|------|------|
| Preproc dir | `--b longpreprocdir` | a directory produced by [[fsr-longpreproc]] ([`:236-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L236-L239)) |
| Output dir | `--o outputdir` | required ([`:231-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L231-L234)) |

**Mode B — from raw inputs (the script preprocesses for you):**

| Input | Flag | Notes |
|------|------|------|
| Per-timepoint inputs | `--i V1M1 V1M2 …` | one `--i` per timepoint; each lists that timepoint's images, one per mode (a complete matrix) ([`:462-478`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L462-L478)) |
| Mode names | `--m M1 M2 …` | names for each input mode/contrast ([`:480-495`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L480-L495)) |
| Reference mode | `--refmode name` | which mode (from `--m`) is the within-timepoint registration target ([`:497-500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L497-L500)) |
| Output dir | `--o outputdir` | required ([`:231-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L231-L234)) |

> [!gotcha] `--b` is mutually exclusive with `--i`/`--m`
> Supplying both a preproc directory and raw inputs is a hard error: "cannot
> specify both --b AND --i or --m"
> ([`samseg/samseg-long:543-547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L543-L547)).

### Input Assumptions

> [!assumption] Complete input matrix in Mode B
> The number of images per `--i` must equal the number of modes; a mismatch is
> rejected ("time point N has X modes, expecting Y")
> ([`samseg/samseg-long:471-476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L471-L476)).
> Every timepoint must provide every mode.

> [!assumption] refmode must be one of the modes
> The reference mode named by `--refmode` must appear in `--m`; it is forced to
> the front of the unique mode list used to build commands
> ([`samseg/samseg-long:610-615`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L610-L615)).

## Outputs

`run_samseg_long` writes a `base/` directory plus one `tpNNN/` directory per
timepoint under `--o`. This wrapper adds bookkeeping files and (for the
no-resample case) per-timepoint registrations
([`samseg/samseg-long:144-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L144-L158)).

### Files Created

| File (under `outputdir/`) | Created by | Contents |
|---|---|---|
| `base/seg.mgz` | worker | base-template segmentation |
| `base/mode01_bias_corrected.mgz`, … | worker | bias-corrected base image(s), one per mode |
| `tpNNN/seg.mgz` | worker | per-timepoint segmentation |
| `tpNNN/mode01_bias_corrected.mgz`, … | worker | per-timepoint bias-corrected image(s) |
| `tpNNN/samseg.csv` | worker | per-timepoint volume table (used as the completion marker) ([`:135-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L135-L137)) |
| `tpNNN/reg.to.base.lta` | this wrapper (no-resample only) | timepoint→base registration ([`:148-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L148-L158)) |
| `base/basedir.txt`, `base/unodenames.txt`, `base/resampletype.txt` | this wrapper | provenance: source preproc dir, mode names, resample flag ([`:144-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L144-L146)) |
| `log/samseg-long.*.log`, `log/view-command` | this wrapper | run log and the saved FreeView command ([`:73-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L73-L74), [`:189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L189)) |

The script also prints (and saves) a FreeView command that loads the base and
all timepoints together for QA
([`samseg/samseg-long:160-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L160-L189)).

### Output Specifications

`seg.mgz` uses the SAMSEG label scheme (compatible with the standard FreeSurfer
[[color-lut]]; see [[wiki/tools/samseg|samseg]] for the data-type caveat).
Volumes are reported per timepoint in `samseg.csv`.

## Mathematical Foundations

The joint longitudinal generative model is implemented in `run_samseg_long`;
this script only selects its behaviour. The key modelling choice it exposes is
**resampling vs. native resolution** ([`samseg/samseg-long:94-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L94-L125)):

- **`--resample` (default):** timepoints are resampled into the base space, and
  the worker is fed `base/<mode>/tpNNN.base.mgz` per mode.
- **`--no-resample`:** the worker is fed each timepoint in its native
  (reference-mode) space together with a timepoint→base **RAS2RAS** LTA via
  `--tp-to-base-transform`; a source comment stresses the LTA must be RAS2RAS
  ([`samseg/samseg-long:114-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L114-L125)),
  and the worker is told `--force-different-resolutions`
  ([`samseg/samseg-long:94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L94)).

> [!internal] Joint segmentation
> `run_samseg_long` builds a subject-specific atlas from the base and segments
> each timepoint jointly. The environment toggle
> `SAMSEG_DONT_USE_BLOCK_COORDINATE_DESCENT` (set by
> `--no-block-coordinate-descent`) and
> `SAMSEG_USE_LOGDOMAIN_COSTANDGRADIENT_CALCULATOR` change the optimiser used in
> that code ([`samseg/samseg-long:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L7), [`:377-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L377-L391)).
> See [[wiki/tools/samseg|samseg]] for the cross-sectional model.

## Configuration Options

### Complete Flag Reference

Parsed in `parse_args`
([`samseg/samseg-long:223-532`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L223-L532)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | dir | (required) | output directory ([`:231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L231)) |
| `--b` | dir | — | input longitudinal-preproc dir (output of [[fsr-longpreproc]]); mutually exclusive with `--i`/`--m` ([`:236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L236)) |
| `--bm` | mode list | (all) | run SAMSEG on only this subset of the preproc modes ([`:241-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L241-L252)) |
| `--threads` | int | 1 | number of threads (`OMP_NUM_THREADS`) ([`:273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L273)) |
| `--resample`<br>`--no-resample` | flag | resample on | resample timepoints into base space, or keep native res + pass per-tp LTAs ([`:254-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L254-L260)) |
| `--init-reg`<br>`--initlta` | LTA | — | initial base-to-template registration ([`:262-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L262-L271)) |
| `--save-posteriors` | flag | off | save posterior probability maps ([`:278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L278)) |
| `--save-probabilities` | flag | off | save probability maps ([`:282`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L282)) |
| `--save-p` | flag | off | save both posteriors and probabilities ([`:286-289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L286-L289)) |
| `--save-mesh`<br>`--no-save-mesh` | flag | off | save the deformed atlas mesh ([`:291-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L291-L296)) |
| `--options` | json file | — | extra options file passed to `run_samseg_long --options` ([`:298-305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L298-L305)) |
| `--keep-history` | flag | off (deleted) | keep `base/history.p` (it is large) ([`:307-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L307-L309), [`:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L142)) |
| `--force-update` | flag | off | rerun even if outputs are up to date ([`:311-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L311-L313)) |
| `--atlas` | dir | (default) | alternative SAMSEG atlas (`SAMSEG_DATA_DIR`) ([`:315-322`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L315-L322)) |
| `--cpvcw` / `--no-cpvcw` | flag | off | use the cc+pons+verm+charm+wmcrowns atlas ([`:366-375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L366-L375)) |
| `--charm` / `--no-charm` | flag | off | use the CHARM atlas ([`:354-364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L354-L364)) |
| `--lesion` | flag | off | enable lesion segmentation (selects the lesion atlas) ([`:430-433`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L430-L433)) |
| `--lesion-mask-structure` | string | — | lesion mask structure; implies `--lesion` ([`:435-440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L435-L440)) |
| `--lesion-mask-pattern` | int list | — | lesion mask pattern, one value per mode; implies `--lesion` ([`:442-459`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L442-L459)) |
| `--no-block-coordinate-descent`<br>`--no-bcd` | flag | (BCD on) | disable block-coordinate-descent optimisation ([`:377-380`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L377-L380)) |
| `--block-coordinate-descent`<br>`--bcd` | flag | on | enable block-coordinate-descent ([`:381-384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L381-L384)) |
| `--logdomain-costandgradient-calculator` | flag | off | use the log-domain cost/gradient calculator ([`:386-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L386-L388)) |
| `--view` | dir | — | stand-alone: open FreeView on an existing output dir and exit ([`:393-428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L393-L428)) |
| `--i` | image list | — | (Mode B) one timepoint's images, one per mode; repeat per timepoint ([`:462-478`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L462-L478)) |
| `--m` | name list | — | (Mode B) mode names ([`:480-495`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L480-L495)) |
| `--refmode` | string | — | (Mode B) reference mode for within-timepoint registration ([`:497-500`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L497-L500)) |
| `--rigid` | flag | rigid | (Mode B) build the base with a rigid transform ([`:502-504`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L502-L504)) |
| `--affine` | flag | off | (Mode B) build the base with an affine transform instead ([`:505-507`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L505-L507)) |
| `--conform` | flag | off | (Mode B) conform inputs during import ([`:508-510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L508-L510)) |
| `--nearest`<br>`--trilinear`/`--linear`<br>`--cubic` | flag | `cubic` | (Mode B) interpolation method for preprocessing ([`:512-521`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L512-L521)) |
| `--log`<br>`--nolog`/`--no-log` | file/flag | auto | set/disable the log file ([`:324-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L324-L332)) |
| `--tmp`<br>`--tmpdir` | dir | — | temp dir (disables cleanup) ([`:334-339`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L334-L339)) |
| `--nocleanup`<br>`--cleanup` | flag | cleanup on | keep/remove temp files ([`:341-347`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L341-L347)) |
| `--debug` | flag | off | tcsh verbose/echo ([`:349-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L349-L352)) |
| `-help` | flag | — | usage + BEGINHELP ([`:45-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L45-L49)) |
| `-version` | flag | — | print version and exit ([`:50-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L50-L54)) |

### Configuration Interactions

> [!gotcha] `--b` excludes raw-input preprocessing
> If you pass `--b`, you must **not** also pass `--i`/`--m`
> ([`samseg/samseg-long:543-547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L543-L547)).
> With raw inputs the script builds the preproc dir itself at
> `outputdir/longpreproc` via [[fsr-import]] → [[fsr-coreg]] →
> [[fsr-longpreproc]] ([`:557-597`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L557-L597)).

- **Atlas selection flags are last-wins:** `--atlas`, `--charm`, `--cpvcw`,
  `--lesion` all set `SAMSEG_DATA_DIR`; the last one on the command line takes
  effect (each `--lesion*` variant also forces the lesion atlas).
- **`--lesion-mask-pattern`** must have exactly one entry per mode; mismatches
  are rejected both at parse time and in `check_params`
  ([`samseg/samseg-long:451-455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L451-L455), [`:643-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L643-L648)).
- **`--bm`** restricts which modes SAMSEG actually uses; each named base mode
  must exist among the timepoint modes and be unique
  ([`samseg/samseg-long:618-641`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L618-L641)).
- **`--no-resample`** changes what the worker is fed (native images + per-tp
  RAS2RAS LTAs) and triggers `--force-different-resolutions`
  ([`samseg/samseg-long:94-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L94-L125)).

## Typical Use Cases

### Use Case 1: From a longitudinal-preproc directory

```bash
samseg-long --b longpreproc.out --o samseg.long.out --threads 8
```

Runs `run_samseg_long` on an existing [[fsr-longpreproc]] output.

### Use Case 2: From raw inputs (two timepoints, T1 + FLAIR)

```bash
samseg-long --o samseg.long.out \
  --i tp1_t1.nii.gz tp1_flair.nii.gz \
  --i tp2_t1.nii.gz tp2_flair.nii.gz \
  --m t1w flair --refmode t1w \
  --threads 8
```

The script imports, coregisters within each timepoint, builds the base, then
segments all timepoints.

### Use Case 3: Lesion segmentation

```bash
samseg-long --b longpreproc.out --o samseg.long.lesion --lesion --threads 8
```

### Use Case 4: Inspect an existing run

```bash
samseg-long --view samseg.long.out
```

## Pipeline Context

A standalone longitudinal segmentation pipeline, not part of recon-all
(`recon_all_stage: null`). In Mode B it wraps the FreeSurfer "fsr-*" import and
preprocessing stack ([[fsr-import]], [[fsr-coreg]], [[fsr-longpreproc]]) before
running the SAMSEG worker. It is the longitudinal counterpart to cross-sectional
[[wiki/tools/samseg|samseg]] and parallels the surface
[[longitudinal-processing]] stream.

**Predecessor:** [[fsr-longpreproc]] (or raw images) → **This tool** →
**Successor:** volume tabulation / change analysis

## Gotchas and Caveats

> [!gotcha] history.p is deleted unless you ask to keep it
> After a successful run the wrapper removes `base/history.p` because it is
> large; pass `--keep-history` to retain it
> ([`samseg/samseg-long:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L142), [`:307-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L307-L309)).

> [!gotcha] no-resample LTAs must be RAS2RAS
> In `--no-resample` mode the per-timepoint LTAs handed to the worker must be
> RAS2RAS; a source comment flags this explicitly as a hard requirement (since
> Feb 2023) ([`samseg/samseg-long:118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L118)).

> [!gotcha] `--view` is stand-alone
> `--view OUTDIR` builds and runs a FreeView command for an existing output and
> exits; it does not run any segmentation
> ([`samseg/samseg-long:393-428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L393-L428)).

## Error Compensation and Guard Rails

- Requires `--o`; aborts otherwise
  ([`samseg/samseg-long:538-541`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L538-L541)).
- Rejects `--b` together with `--i`/`--m`
  ([`samseg/samseg-long:543-547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L543-L547)).
- Validates the input matrix shape, the refmode membership, the `--bm` subset,
  and the lesion-mask-pattern length
  ([`samseg/samseg-long:471-476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L471-L476), [`:610-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L610-L648)).
- Uses a `samseg.csv` completion marker so a re-run skips work that is already
  current unless `--force-update`
  ([`samseg/samseg-long:135-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/samseg/samseg-long#L135-L143)).

## Related Tools

- [[wiki/tools/samseg|samseg]] — the cross-sectional whole-brain segmentation
  this extends to longitudinal data
- [[longitudinal-processing]] — FreeSurfer's longitudinal design (base +
  timepoints), which this mirrors for SAMSEG
- [[fsr-longpreproc]] — builds the within-subject template directory consumed
  by `--b`
- [[fsr-import]] / [[fsr-coreg]] — import and within-timepoint coregistration
  invoked in Mode B
- [[color-lut]] — the label scheme of the output `seg.mgz`

## Confidence and Gaps

The wrapper's two input modes, the full flag set, the resample-vs-native
behaviour, the output layout, and the QA FreeView generation are read directly
from the source with high confidence.

> [!gap] Worker internals
> The actual joint longitudinal segmentation is in `run_samseg_long` (Python,
> `samseg` package) and the GEMS optimisers controlled by the
> `SAMSEG_*` environment toggles; those internals were not opened for this page.
> See [[wiki/tools/samseg|samseg]] for the underlying model.

## References

- Cerri, S., Puonti, O., Meier, D.S., et al. (2021). *A contrast-adaptive
  method for simultaneous whole-brain and lesion segmentation in multiple
  sclerosis.* NeuroImage 225, 117471. (SAMSEG / lesion model.)
- Puonti, O., Iglesias, J.E., Van Leemput, K. (2016). *Fast and sequence-
  adaptive whole-brain segmentation using parametric Bayesian modeling.*
  NeuroImage 143, 235–249. (SAMSEG.)
- See [[wiki/tools/samseg|samseg]] for the full SAMSEG reference set.
