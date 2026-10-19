---
title: "stc.fsl"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "fsfast/bin/stc.fsl"
families:
  - "fsfast"
recon_all_stage: null
related:
  - "[[preproc-sess]]"
  - "[[mkanalysis-sess]]"
  - "[[selxavg3-sess]]"
  - "[[slicedelay]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
  - "[[epidewarp.fsl]]"
  - "[[nifti]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "The exact slice-delay convention emitted by slicedelay (and whether delay=0 lands on a slice boundary or mid-acquisition) is described in the help text but not verified against the slicedelay source from this page."
tags:
  - fsfast
  - fmri
  - slice-timing-correction
  - preprocessing
---

# stc.fsl

## Summary

`stc.fsl` is a thin csh front-end that performs **slice-timing correction (STC)**
on a 4D functional volume by wrapping FSL's `slicetimer` program. Given an input
functional time series and a description of the slice-acquisition order (e.g.
sequential ascending, interleaved, or Siemens default), it computes the per-slice
temporal offset (as a fraction of the TR), converts the data to NIfTI, runs FSL
`slicetimer` with a custom slice-delay file, and converts the result back to the
requested output format. It is the engine invoked indirectly by the FSFAST
preprocessing stream when slice-timing correction is requested.

## Source Information

- **Language:** csh script (`#! /bin/csh -f`)
- **Source file(s):** [`fsfast/bin/stc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl)
- **Binary/script location:** `$FREESURFER_HOME/bin/stc.fsl`
- **External dependencies:** FSL `slicetimer` (invoked as `slicetimer.fsl`), plus FreeSurfer's [[wiki/tools/mri_convert|mri_convert]], [[mri_info]], and [[slicedelay]].

## Purpose and Context

In echo-planar fMRI acquisition, the slices of a single volume are not all
collected at the same instant; each slice is sampled at a different time within
the TR. Slice-timing correction temporally interpolates each voxel's time series
so that all slices are aligned to a common reference time. `stc.fsl` exists to
provide FSFAST a uniform interface to FSL's `slicetimer` while handling the
analytic computation of slice delays (via [[slicedelay]]) and the format
round-trip through NIfTI.

It is normally not called by the user directly. Within FSFAST, slice-timing
correction is configured in the analysis (via [[mkanalysis-sess]] `-stc`/`-sdf`)
and executed by [[preproc-sess]], which dispatches to `stc-sess`, which in turn
calls `stc.fsl` per run. `stc.fsl` can also be run standalone on any volume that
[[wiki/tools/mri_convert|mri_convert]] can read.

## Inputs

### Required Inputs

- **Input functional (`--i`)** — a 4D functional time series in any format
  readable by [[wiki/tools/mri_convert|mri_convert]] (e.g. [[nifti]], `.mgz`, analyze).
- **A slice-order specification** — exactly one of:
  - one of the slice-order flags `--up`, `--down`, `--odd`, `--even`,
    `--siemens` (the delays are then computed analytically by [[slicedelay]]),
    **or**
  - an explicit **slice-delay file** via `--sdf` (a text file giving the delay
    of each slice as a fraction of TR).

### Input Assumptions

> [!assumption] Slice numbering and ordering
> Slice order starts at **1**, and the "slice order" is the list of slices in
> the order in which they were *acquired*. The script reads the number of slices
> directly from the input header via [`fsfast/bin/stc.fsl:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L81)
> (`mri_info --nslices`), so the on-disk slice (z) axis must correspond to the
> physical slice-encoding direction for the correction to be meaningful.

> [!gotcha] Reference time is the relative centre of the TR, not the start
> Per the help text, delay=0 is set at the "relative center" of the TR, located
> at `(nslices/2 - 0.5)/nslices` of the way through the TR. Consequently, the
> documentation instructs users to **subtract half a TR from the stimulus onset
> times** in their paradigm so that event timing remains consistent with the
> corrected data.

## Outputs

### Files Created

- **Output functional (`--o`)** — the slice-time-corrected 4D volume, written
  in whatever format the output filename implies (any output format supported by
  [[wiki/tools/mri_convert|mri_convert]] *except* analyze3d/spm, per the help text).
- **Log file** — `<outfunc>.log` in the output directory; a pre-existing log is
  moved to `<outfunc>.log.bak` ([`fsfast/bin/stc.fsl:68-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L68-L69)).
- **Temporary working directory** — `<outdir>/tmp.$$` by default (overridable
  with `--tmp`), containing intermediate NIfTI files (`in.nii`, `out.nii`), the
  number-of-slices file, and the generated slice-delay file (`sdf.txt`). This
  directory is deleted at the end unless `--tmp` was used ([`fsfast/bin/stc.fsl:133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L133)).

### Output Specifications

The output has the same matrix dimensions and number of frames as the input;
only the time series values change, via temporal interpolation performed by FSL
`slicetimer`. The optional `--odt` and `--scale` flags are passed through to the
final [[wiki/tools/mri_convert|mri_convert]] call to set the output voxel data type and an intensity
scale factor respectively ([`fsfast/bin/stc.fsl:124-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L124-L126)).

## Mathematical Foundations

`stc.fsl` itself performs no interpolation; it delegates the temporal resampling
to FSL `slicetimer` and the delay computation to [[slicedelay]]. Conceptually,
for each slice $s$ acquired at fractional-TR offset $d_s$, every voxel time
series in that slice is shifted to the common reference time by sinc/Fourier
interpolation (the standard `slicetimer` algorithm). The slice-delay file passed
via `--tcustom` encodes $d_s$ for every slice, with the convention that the
relative centre of the TR has delay $0$:

$$d_{\text{center}} = 0 \quad\text{at fraction}\quad \frac{n_{\text{slices}}/2 - 0.5}{n_{\text{slices}}}\ \text{of the TR.}$$

The supported analytic orders (computed by [[slicedelay]]) are:

- `up` — sequential ascending: 1, 2, 3, …
- `down` — sequential descending: N, N−1, …, 1
- `odd` — interleaved starting on the first slice: 1, 3, 5, …, 2, 4, 6, …
- `even` — interleaved starting on the second slice: 2, 4, 6, …, 1, 3, 5, …
- `siemens` — `odd` when the slice count is odd, `even` when it is even.

> [!internal] Delay computation lives in [[slicedelay]]
> The mapping from a named slice order to a per-slice fractional-TR delay file is
> produced by the separate `slicedelay` program ([`fsfast/bin/stc.fsl:90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L90)),
> not by `stc.fsl`. The `--ngroups` option is forwarded to it for simultaneous
> multi-slice (SMS) acquisitions.

## Configuration Options

### Complete Flag Reference

All flags are parsed in the `parse_args` block beginning at
[`fsfast/bin/stc.fsl:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L142).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string (path) | — (required) | Input functional time series; any format readable by [[wiki/tools/mri_convert|mri_convert]] ([`stc.fsl:150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L150)). |
| `--o` | string (path) | — (required) | Output (corrected) functional. Output directory and a `<outfunc>.log` are created here ([`stc.fsl:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L155)). |
| `--up` | boolean | — | Sequential ascending slice order (1, 2, 3, …) ([`stc.fsl:201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L201)). |
| `--down` | boolean | — | Sequential descending slice order (N, N−1, …, 1) ([`stc.fsl:204`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L204)). |
| `--odd` | boolean | — | Interleaved starting on the first slice (1, 3, 5, …, 2, 4, …) ([`stc.fsl:195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L195)). |
| `--even` | boolean | — | Interleaved starting on the second slice (2, 4, 6, …, 1, 3, …) ([`stc.fsl:198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L198)). |
| `--siemens` | boolean | — | Siemens default: `--odd` for an odd slice count, `--even` for an even count ([`stc.fsl:207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L207)). |
| `--sdf` | string (path) | — | Explicit slice-delay file (delays as fractions of TR; must exist). Used instead of an analytic slice order; allows arbitrary orders ([`stc.fsl:165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L165)). |
| `--ngroups` | integer | `1` | Number of SMS (simultaneous multi-slice) slice groups; forwarded to [[slicedelay]] ([`stc.fsl:160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L160)). |
| `--odt` | string | — | Output voxel data type; passed to the final [[wiki/tools/mri_convert|mri_convert]] as `-odt` ([`stc.fsl:180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L180)). |
| `--scale` | float | — | Intensity scale factor; passed to the final [[wiki/tools/mri_convert|mri_convert]] as `--scale` ([`stc.fsl:185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L185)). |
| `--tmp` | string (path) | `<outdir>/tmp.$$` | Use this directory as the temporary working directory; setting it also disables cleanup of intermediates ([`stc.fsl:174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L174)). |
| `--debug` | boolean | off | Turn on shell verbose/echo tracing ([`stc.fsl:190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L190)). |
| `--version` | boolean | — | Print version string and exit (matched in the usage path). |
| `--help` | boolean | — | Print help and exit ([`stc.fsl:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L40)). |

> [!gotcha] `--nocleanup` is referenced in an error message but not parsed
> The guard at [`fsfast/bin/stc.fsl:59-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L59-L63)
> tells the user to "run with `--nocleanup`" if `tmpdir` equals `outdir`, but
> the argument parser has no `--nocleanup` case — cleanup is instead disabled as
> a side effect of passing `--tmp`.

### Configuration Interactions

The script enforces exactly one source of slice timing in `check_params`
([`fsfast/bin/stc.fsl:224`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L224)):

- You must supply **either** an analytic slice order (`--up`/`--down`/`--odd`/`--even`/`--siemens`)
  **or** `--sdf`, **but not both**; specifying neither or both is a fatal error
  ([`stc.fsl:237-244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L237-L244)).
- The slice-order flags are mutually overwriting (each just sets the `SliceSeq`
  variable), so only the last one given takes effect; there is no error if two
  analytic orders are passed.
- `--ngroups` only affects the analytic path; when `--sdf` is supplied the delay
  file is used verbatim and `slicedelay` is not run, so `--ngroups` is ignored.

> [!gotcha] tmpdir must differ from outdir when cleanup is on
> Because cleanup does `rm -rf $tmpdir`, the script refuses to run if the
> temporary directory resolves to the same path as the output directory (to
> avoid deleting the outputs). This only triggers when cleanup is enabled
> ([`stc.fsl:59-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L59-L63)).

## Typical Use Cases

### Use Case 1: Siemens interleaved acquisition

```bash
# Correct a Siemens-acquired run; slice order chosen automatically from
# whether the slice count is odd or even.
stc.fsl --i f.nii.gz --o fstc.nii.gz --siemens
```

### Use Case 2: Arbitrary slice order via an explicit delay file

```bash
# Use a precomputed per-slice delay file (fractions of TR) for a non-standard
# (e.g. multiband) acquisition.
stc.fsl --i f.nii.gz --o fstc.nii.gz --sdf myslicedelays.txt
```

### Use Case 3: SMS / multiband with grouped slices

```bash
# Interleaved order with 3 simultaneously-excited slice groups.
stc.fsl --i f.nii.gz --o fstc.nii.gz --odd --ngroups 3
```

## Pipeline Context

Within FSFAST, slice-timing correction is configured at analysis-setup time and
executed during preprocessing:

**Predecessor:** [[mkanalysis-sess]] (records the `RawSTC`/`SliceDelayFile` and
`nSliceGroups` in `analysis.info`) → [[preproc-sess]] (turns on the STC stage and
dispatches to `stc-sess`) → **`stc.fsl`** (per-run correction) → **Successor:**
spatial smoothing / resampling within [[preproc-sess]], then first-level GLM
fitting by [[selxavg3-sess]].

> [!gap] Indirect invocation path
> `preproc-sess` calls `stc-sess` (not documented on this page), which is the
> per-session/per-run wrapper that ultimately calls `stc.fsl`. The exact
> argument translation performed by `stc-sess` is not traced here.

## Gotchas and Caveats

> [!gotcha] Output format restriction
> The help text states the output may be any format supported by [[wiki/tools/mri_convert|mri_convert]]
> **except** analyze3d/spm. The script does not appear to enforce this; choosing
> such a format may fail or produce unexpected results in the final conversion
> step ([`stc.fsl:124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L124)).

> [!gotcha] Forces NIfTI internally
> The script sets `FSLOUTPUTTYPE NIFTI` and round-trips the data through
> single-file NIfTI (`in.nii` → `slicetimer` → `out.nii`) regardless of the
> input/output formats ([`stc.fsl:110-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L110-L116)).

> [!gotcha] Paradigm timing must be shifted by half a TR
> See the reference-time note above: because delay=0 is the relative centre of
> the TR, the help text directs users to subtract half a TR from paradigm onset
> times when STC is applied.

## Error Compensation and Guard Rails

- Fatal error if the input functional, the output functional, or a supplied
  `--sdf` file is missing ([`stc.fsl:225-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L225-L240)).
- Refuses to run when `tmpdir == outdir` and cleanup is enabled, to avoid
  deleting outputs ([`stc.fsl:59-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl#L59-L63)).
- Every external command (`mri_info`, `slicedelay`, `mri_convert`, `slicetimer`)
  is status-checked and aborts the script on non-zero exit.

## Related Tools

- [[slicedelay]] — computes the per-slice fractional-TR delay file from a named
  slice order; `stc.fsl` calls it when `--sdf` is not given.
- [[preproc-sess]] — the FSFAST preprocessing driver that turns STC on/off and
  dispatches to this tool.
- [[mkanalysis-sess]] — records the chosen slice order / delay file in the
  analysis configuration.
- [[selxavg3-sess]] — first-level GLM analysis run after preprocessing.
- [[wiki/tools/mri_convert|mri_convert]] — performs the format round-trip into and out of NIfTI.
- [[mri_info]] — reports the number of slices used to build the delay file.
- [[epidewarp.fsl]] — a sibling FSL-based EPI correction front-end (B0 distortion).

## Confidence and Gaps

The flag set, control flow, and external-command sequence are read directly from
the script and are high confidence. The semantics of the analytic slice orders
and the delay convention are taken from the script's own `BEGINHELP` text.

> [!gap] slicedelay output convention not independently verified
> The precise format and centring of the slice-delay file are described in the
> `stc.fsl` help but were not cross-checked against the [[slicedelay]] source on
> this page.

## References

- FSL `slicetimer` (FMRIB Software Library) — the underlying slice-timing
  correction engine.
- Script self-documentation: [`fsfast/bin/stc.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fsfast/bin/stc.fsl) `BEGINHELP` section.
