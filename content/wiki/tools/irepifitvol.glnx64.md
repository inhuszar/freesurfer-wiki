---
title: "irepifitvol.glnx64"
type: tool
fs_version: "8.2.0"
source_language: "MATLAB (compiled)"
source_files: []                 # the installed .glnx64 is a stripped MCR binary; behaviour traced from matlab/irepifitvol.m
families: []                     # standalone relaxometry tool (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[irepifitvol]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The installed .glnx64 is a stripped MATLAB-compiled binary with no readable in-tree compiled source; behaviour is reconstructed from matlab/irepifitvol.m and helpers, which are the authoritative behavioural source."
  - "The bundled --help usage text omits several real flags (--preinv, --slice1preinv, --t1-range, --save-yhat, --c); the parser in irepifitvol.m accepts them. Source wins."
tags:
  - relaxometry
  - t1-mapping
  - inversion-recovery
  - epi
  - matlab
---

# irepifitvol.glnx64

## Summary

`irepifitvol.glnx64` is a MATLAB-compiled (MCR) executable that performs
**voxel-wise T1 fitting of an inversion-recovery EPI (IR-EPI) volume series**. For
each voxel it reconstructs the exact inversion/readout timing of the sequence from
command-line pulse-sequence parameters, synthesises the predicted
inversion-recovery magnitude signal as a function of a candidate T1 over a grid of
T1 values, fits the signal amplitude (M0) to the measured time series by least
squares, and selects the T1 that minimises the residual standard deviation. The
result is a quantitative **T1 map** (`t1.nii.gz`), an amplitude map (`M0.nii.gz`),
and a goodness-of-fit map (`rstd.nii.gz`). It is launched via the same-named
csh wrapper [[irepifitvol]].

> [!gap] The installed binary is stripped; behaviour is taken from the MATLAB source
> The `.glnx64` file in `$FREESURFER_HOME/bin` is a MATLAB Compiler executable
> (`ELF 64-bit ... stripped`, no symbols). There is **no readable in-tree compiled
> source**. Per "code is truth", everything on this page is reconstructed from the
> **pre-compilation MATLAB source**
> [`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m)
> and its helpers `irepistructure.m`, `irepitiming.m`, `irepisynth.m`, and
> `irepifit.m`, which are the authoritative behavioural source for the binary.

## Source Information

- **Language:** MATLAB, compiled to a standalone executable with the MATLAB Compiler (runs against the MATLAB Compiler Runtime, MCR R2014a / MATLAB 8.3).
- **Source file(s):** none in-tree for the binary itself (stripped). Authoritative behavioural source:
  - [`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m) — driver: argument parsing, volume I/O, the per-voxel two-pass fit loop, output writing.
  - [`matlab/irepistructure.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepistructure.m) — builds the parameter struct and computes the time-between-slices (TBS).
  - [`matlab/irepitiming.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepitiming.m) — constructs the event timeline (inversions, dummy readouts, permuted slice readouts) and the per-readout inversion time TI.
  - [`matlab/irepisynth.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepisynth.m) — synthesises the magnetisation recovery and the predicted readout signal for each candidate T1.
  - [`matlab/irepifit.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifit.m) — least-squares amplitude fit, residual standard deviation, optional time-point exclusion.
- **Binary/script location:** `$FREESURFER_HOME/bin/irepifitvol.glnx64` (installed as a symlink, [`scripts/CMakeLists.txt:319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L319)).
- **Launcher:** [[irepifitvol]] (sets `LD_LIBRARY_PATH` for the MCR, then exec's this binary).

## Purpose and Context

Inversion-recovery is the reference method for measuring the longitudinal
relaxation time T1. In an IR-EPI experiment a 180° inversion pulse is followed,
after a set of inversion times, by EPI readouts; the magnitude signal traces the
T1 recovery curve and passes through a null. `irepifitvol.glnx64` turns such a
4-D series into a per-voxel quantitative T1 map.

The defining feature of this implementation is that it models a **multi-slice,
slice-permuted** IR-EPI acquisition. Each "time point" is one inversion followed
by a full pass of EPI readouts over all slices; on successive inversions the slice
acquisition order is **circularly shifted** by a fixed *skip* factor
([`matlab/irepitiming.m:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepitiming.m#L77)). As a result, a given anatomical slice is
sampled at a different inversion time on every time point, which is exactly what
makes a per-voxel T1 fit possible from EPI data. The code reconstructs this entire
timeline analytically from the sequence parameters rather than reading it from the
DICOM headers, which is why those parameters must be supplied (and correct) on the
command line.

It is a **specialised quantitative-MRI / relaxometry** tool, run by hand. It is
**not** part of [[wiki/pipelines/recon-all|recon-all]] or [[trac-all]].

## Inputs

### Required Inputs

- **IR-EPI series** (`--i <file>`) — a 4-D volume (e.g. `dce.nii.gz`) read with
  `MRIread` ([`matlab/irepifitvol.m:36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L36)). The number of slices is taken from
  `volsize(3)` and the number of inversion time points from `nframes`
  ([`matlab/irepifitvol.m:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L48-L49)). Any format
  [[wiki/tools/mri_convert|mri_convert]] can write (NIfTI `nii`/`nii.gz`, MGH
  `mgh`/`mgz`).
- **Output directory** (`--o <dir>`) — created with `mkdirp`
  ([`matlab/irepifitvol.m:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L46)).

### Optional Inputs

- **Mask** (`--m <file>`) — a binary volume; voxels with value `< 0.5` in the
  current slice are skipped ([`matlab/irepifitvol.m:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L101)). Used purely to
  accelerate processing (the fit is the expensive part).

### Input Assumptions

> [!assumption] Frames are the IR time points of a slice-permuted multi-slice IR-EPI sequence
> Each of the `nframes` frames is one inversion's worth of readouts for that
> voxel's slice, acquired on a regular schedule. The mapping from frame index to
> inversion time is **computed**, not read from the header, using the supplied
> `--tbi`, `--ti1`, `--invdur`, `--roflip`, `--ndummies`, `--skip`, and `--preinv`
> values ([`matlab/irepitiming.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepitiming.m)). If these do not match the real
> acquisition, the T1 estimates will be biased even though the program runs
> without error. The default values (TBI = 2092 ms, readout flip = 65°, skip = 7,
> ndummies = 10, TI1 = 24 ms, InvDur = 12 ms) reflect one specific protocol and
> are almost certainly **not** correct for an arbitrary dataset.

## Outputs

### Files Created

All outputs are written into `--o`. `t1.nii.gz` is (re)written after **every
slice** as a checkpoint, then all maps are written once more at the end.

| File | Format | Contents | Source |
|------|--------|----------|--------|
| `t1.nii.gz` | [[nifti]] (3-D) | per-voxel T1 estimate, in **ms** | [`matlab/irepifitvol.m:123-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L123-L128) |
| `M0.nii.gz` | [[nifti]] (3-D) | per-voxel fitted signal amplitude M0 (arbitrary units, the regression scale factor) | [`matlab/irepifitvol.m:130-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L130-L131) |
| `rstd.nii.gz` | [[nifti]] (3-D) | residual standard deviation at the chosen T1 (goodness of fit) | [`matlab/irepifitvol.m:133-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L133-L134) |
| `info.mat` | MATLAB `.mat` | the parsed `cmdargs` struct and the timing struct `s0` (full provenance of the fit) | [`matlab/irepifitvol.m:79-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L79-L80) |
| `yhat.nii.gz` | [[nifti]] (4-D) | model-predicted time series at the chosen T1 (only with `--save-yhat`) | [`matlab/irepifitvol.m:136-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L136-L139) |

### Output Specifications

The output volumes inherit the geometry (voxel size, vox2ras, dimensions) of the
input `--i` series, because each map is created by copying the input MRI struct
and overwriting `.vol` ([`matlab/irepifitvol.m:82-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L82-L91)). `t1`, `M0`, and `rstd`
are single-frame; `yhat` has `nframes` frames matching the input. Voxels excluded
by the mask remain zero.

## Mathematical Foundations

The method is a **forward-model grid search**: synthesise the IR-EPI signal for
each candidate T1, fit only the amplitude linearly, and pick the T1 with the
smallest residual.

### 1. Sequence timing

Time between adjacent slice readouts (TBS) is derived from the sequence period
([`matlab/irepistructure.m:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepistructure.m#L24)):

> [!math] Time between slices
> $$\mathrm{TBS} = \frac{\mathrm{TBI} - \mathrm{TI1} - \mathrm{InvDur} + \mathrm{PreInv}}{n_\text{slices}}$$
> where TBI is the time between inversions (≈ TR), TI1 the delay from the end of
> the inversion pulse to the first readout, InvDur the inversion-pulse duration,
> and PreInv a correction for treating the last slice of a pass differently.

`irepitiming.m` then walks an explicit event timeline: for each of `ndummies`
dummy inversions and each of the `ntp` real time points it places a 180° inversion
event, advances by TI1, and lays down `nslices` readout events spaced by TBS. The
**slice order is circularly shifted** by `(timepoint-1) * skip`
([`matlab/irepitiming.m:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepitiming.m#L77)), and each readout records its inversion time
$\mathrm{TI} = t - t_\text{inv}$ ([`matlab/irepitiming.m:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepitiming.m#L85)).

### 2. Signal synthesis (forward model)

For a candidate T1, `irepisynth.m` evolves the longitudinal magnetisation $M_z$
event by event using closed-form recovery between events and an instantaneous flip
at each event ([`matlab/irepisynth.m:31-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepisynth.m#L31-L61)):

> [!math] Magnetisation recovery and readout signal
> Between two events separated by $\Delta t$, longitudinal relaxation gives
> $$M_z \leftarrow M_0 - (M_0 - M_z)\,e^{-\Delta t / T_1}.$$
> Each event then applies its flip angle $\theta$ (with $\theta = 180°$ for an
> inversion, $\theta = $ the readout flip for a readout), $M_z \leftarrow M_z\cos\theta$.
> At a readout event the recorded **magnitude** signal is
> $$y = \lvert M_z \sin\theta \rvert.$$
> The absolute value models the magnitude reconstruction, which is why the
> recovery curve never reaches zero and why near-null points are problematic (see
> `--nminex`). An optional **bi-exponential** T1 term and an optional **Rician**
> noise model are present in the code but are not exposed as command-line flags in
> this driver.

### 3. Amplitude fit and T1 selection

The synthesised readout signals form a design "matrix" $X$ (one column per
candidate T1). Because only the scale is unknown, M0 is the closed-form
least-squares scalar per column ([`matlab/irepifit.m:69-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifit.m#L69-L72)):

> [!math] Per-T1 amplitude and residual
> For candidate T1 with predicted signal $x$ and data $y$ (over the kept time
> points),
> $$M_0 = \frac{x^\top y}{x^\top x}, \qquad \hat y = M_0\,x, \qquad
> r = \operatorname{std}(y - \hat y).$$
> The chosen T1 minimises $r$ (the residual standard deviation).

The search is **two-pass / coarse-to-fine** for speed and precision
([`matlab/irepifitvol.m:103-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L103-L115)):

1. **Coarse:** evaluate over the full grid `--t1-range t1min Δ t1max` (default
   `[500 : 50 : 8000]` ms), take the argmin.
2. **Fine:** re-evaluate on a ±25 ms window around the coarse winner in 1 ms steps
   (`s2.T1(imin) + [-25:1:25]`, [`matlab/irepifitvol.m:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L109)) and take the new
   argmin. That T1, its M0, and its residual std are written to the maps.

> [!gotcha] The fine pass is fixed at ±25 ms / 1 ms regardless of the coarse step
> The refinement window is hard-coded (`[-25:1:25]`), so it only narrows a coarse
> grid whose step is ≥ ~50 ms. If you set `--t1-range` with a very coarse Δ
> (≫ 50 ms), the true minimum can fall outside the ±25 ms refinement window and be
> missed.

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser in
[`matlab/irepifitvol.m:165-253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L165-L253).
Flags take one argument unless noted. Defaults are the struct initial values
([`matlab/irepifitvol.m:5-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L5-L20)).

#### Inputs / outputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input IR-EPI 4-D volume (e.g. `dce.nii.gz`). |
| `--o` | string | *(required)* | Output directory (created if absent). |
| `--m` | string | — | Optional binary mask; voxels `< 0.5` are skipped (speed-up). |

#### Pulse-sequence parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--tbi` | float (ms) | `2092` | Time between inversions (≈ TR), used to derive TBS. |
| `--ti1` | float (ms) | `24` | Delay from the end of the inversion pulse to the first readout. |
| `--invdur` | float (ms) | `12` | Duration of the inversion ("prefill") pulse. |
| `--preinv` | float (ms) | `14` | Correction subtracted from the last slice's time-between-slices; models special handling of the last slice before the next inversion. |
| `--roflip` | float (deg) | `65` | Readout (EPI excitation) flip angle. |
| `--ndummies` | int | `10` | Number of dummy inversions/readouts before the recorded time points (drive the magnetisation to steady state; not acquired). |
| `--skip` | int | `7` | Slice-permutation skip: each successive time point circularly shifts the slice acquisition order by this many slices. |
| `--slice1preinv` | bool | off | Model slice 1 as acquired **before** the inversion pulse (changes the event ordering in the timeline). |
| `--t1-range` | 3× float (ms) | `500 50 8000` | Coarse T1 search grid: `t1min Δt1 t1max`. |

#### Analysis parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--nacqex` | int | `0` | Exclude this many of the **first** acquired slices after each inversion from the fit (i.e. the earliest-TI samples per pass). |
| `--nminex` | int | `0` | Exclude this many of the **smallest-magnitude** time points per voxel from the fit (avoids fitting to near-null points, which the magnitude operation keeps above zero). |
| `--save-yhat` | bool | off | Additionally write `yhat.nii.gz`, the model-predicted 4-D time series at the chosen T1. |
| `--c` | string | — | Config file path (parsed into `cmdargs.configfile` but **not used**: the check that would require it is disabled, [`matlab/irepifitvol.m:267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L267)). |
| `-debug` | bool | off | Sets an internal debug flag (note: single dash). |

### Configuration Interactions

> [!gotcha] `--c` (config file) is accepted but ignored
> The parser stores `--c` into `cmdargs.configfile`
> ([`matlab/irepifitvol.m:240-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L240-L243)), and `print_usage` even hides it, but
> the only code that would enforce/consume it is gated by `if(0 & ...)`
> ([`matlab/irepifitvol.m:267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L267)) and never runs. All parameters must be passed
> on the command line.

> [!gotcha] `--nacqex` and `--nminex` can both apply, and their excluded sets are unioned
> If both are given, the fit drops the **union** of "first-N acquired slices" and
> "N smallest time points" ([`matlab/irepifit.m:50-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifit.m#L50-L57)). They are not mutually
> exclusive; together they can remove a substantial fraction of the readouts, so
> use small values.

> [!gotcha] Sequence parameters interact through TBS, not independently
> `--tbi`, `--ti1`, `--invdur`, and `--preinv` all feed the single TBS formula
> ([`matlab/irepistructure.m:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepistructure.m#L24)) and, with `--ndummies`/`--skip`, the
> entire event timeline. Changing one without matching the real protocol shifts
> every readout's inversion time and biases T1 globally.

> [!gotcha] `-debug` uses a single dash, unlike every other flag
> All functional flags are double-dash (`--i`, `--o`, …) but the debug switch is
> the single-dash `-debug` ([`matlab/irepifitvol.m:245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L245)). `--debug` would be
> rejected as an unrecognised flag.

## Typical Use Cases

### 1. Basic T1 fit with a mask

```bash
# Defaults for everything except I/O and the mask
irepifitvol --i dce.nii.gz --o t1fit --m brainmask.nii.gz
# → t1fit/t1.nii.gz (T1 in ms), t1fit/M0.nii.gz, t1fit/rstd.nii.gz, t1fit/info.mat
```

### 2. Specify the real protocol timing

```bash
irepifitvol --i dce.nii.gz --o t1fit \
  --tbi 2092 --ti1 24 --invdur 12 --preinv 14 \
  --roflip 65 --ndummies 10 --skip 7
```

### 3. Robust fit excluding near-null and earliest samples

```bash
# Drop the 2 smallest-magnitude points and the first acquired slice per pass
irepifitvol --i dce.nii.gz --o t1fit --m mask.nii.gz \
  --nminex 2 --nacqex 1 --save-yhat
```

### 4. Custom (finer) T1 grid

```bash
# Search 300–6000 ms in 25 ms steps (note the fixed ±25 ms refinement window)
irepifitvol --i dce.nii.gz --o t1fit --t1-range 300 25 6000
```

## Pipeline Context

A stand-alone quantitative-MRI tool, **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or [[trac-all]].

**Predecessor:** IR-EPI DICOM → [[wiki/tools/mri_convert|mri_convert]] (assemble
the 4-D `dce.nii.gz`) → **irepifitvol.glnx64** (via the [[irepifitvol]] launcher)
→ **Successor:** the `t1.nii.gz` quantitative map, e.g. viewed in
[[wiki/tools/freeview|freeview]] or used in downstream relaxometry analysis.

**Predecessor:** [[wiki/tools/mri_convert|mri_convert]] → **This tool** →
**Successor:** [[wiki/tools/freeview|freeview]] (inspection of `t1.nii.gz`).

## Gotchas and Caveats

> [!gotcha] T1 is reported in milliseconds, not seconds
> The grid and outputs are in ms (default range 500–8000 ms); `t1.nii.gz` voxel
> values are T1 in ms.

> [!gotcha] `t1.nii.gz` is overwritten every slice
> The map is written inside the slice loop ([`matlab/irepifitvol.m:123-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L123-L124))
> and again at the end. An interrupted run leaves a partial but valid `t1.nii.gz`
> (slices not yet processed are zero); `M0.nii.gz` and `rstd.nii.gz` are only
> written at the end, so they are absent if the run is killed early.

> [!gotcha] Defaults encode one specific protocol
> The built-in defaults (TBI 2092 ms, flip 65°, skip 7, …) come from the protocol
> the tool was written for. Running with defaults on unrelated data will fit, but
> the T1 values will be wrong unless the timing happens to match.

> [!contradiction] `--help` usage omits several real flags
> The usage text printed by the binary (and by `print_usage`) lists only
> `--o --i --m --skip --ndummies --roflip --tbi --ti1 --invdur --nacqex --nminex`.
> The parser additionally accepts `--preinv`, `--slice1preinv`, `--t1-range`,
> `--save-yhat`, and `--c` ([`matlab/irepifitvol.m:165-253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L165-L253)). Source is
> authoritative — those flags work.

## Error Compensation and Guard Rails

- **Required-argument checks:** missing `--i` or `--o` raises a MATLAB `error`
  ([`matlab/irepifitvol.m:262-275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L262-L275)).
- **Unrecognised flags** print `ERROR: Flag <x> unrecognized` and abort the parse
  ([`matlab/irepifitvol.m:248-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L248-L251)).
- **Mask short-circuit:** masked-out voxels are skipped entirely
  ([`matlab/irepifitvol.m:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m#L101)), leaving them zero in all maps — this is a
  speed optimisation, not error correction.
- **No header-based timing correction:** the tool does **not** read or sanity-check
  the acquisition timing against the file header; it trusts the command-line
  parameters completely (see assumption above).

## Related Tools

- [[irepifitvol]] — the csh launcher that sets up the MCR environment and exec's this binary; run that, not the `.glnx64` directly.
- [[wiki/tools/mri_convert|mri_convert]] — assembles the IR-EPI DICOMs into the 4-D `dce.nii.gz` input and can convert the `t1.nii.gz` output.
- [[mri_info]] — verify the input frame count matches the number of inversion time points.

## Confidence and Gaps

**High confidence:** complete flag set, defaults, the two-pass coarse/fine T1
search, the TBS formula, the slice-permutation timeline, the forward signal model
($M_z$ recovery + magnitude readout), the linear M0 fit, the output files, and the
per-slice checkpointing — all read directly from the authoritative MATLAB sources.

> [!gap] Binary is stripped
> The installed `irepifitvol.glnx64` carries no symbols, so the documentation
> relies on [`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m) and helpers being faithful to the
> compiled version. They are the canonical source FreeSurfer ships for this tool,
> so this is the best available ground truth, but a behavioural diff against the
> exact compiled revision was not possible.

> [!gap] Bi-exponential and Rician-noise model not exposed
> `irepisynth.m` implements an optional bi-exponential T1 component
> (`s.biexp`) and a Rician-noise synthesis path (`s.sigma`), but this driver
> never sets them, so they are inactive from the command line.

## References

- Behavioural source: [`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m), [`matlab/irepitiming.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepitiming.m), [`matlab/irepisynth.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepisynth.m), [`matlab/irepifit.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifit.m), [`matlab/irepistructure.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepistructure.m) (v8.2.0).
- The disabled Barral et al. (MRM, 2010, "Robust methodology for in vivo T1 mapping") closed-form alternative is present but switched off in [`matlab/irepisynth.m:66-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepisynth.m#L66-L78).
- Installed as a symlink: [`scripts/CMakeLists.txt:319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L319).
