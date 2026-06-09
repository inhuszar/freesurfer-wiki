---
title: "xcorr"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/xcorr"
families: []                       # standalone voxelwise-statistics utility
recon_all_stage: null
related:
  - "[[mri_concat]]"
  - "[[fscalc]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - correlation
  - timeseries
  - voxelwise
---

# xcorr

## Summary

`xcorr` computes the **voxel-by-voxel Pearson correlation coefficient** between
two 4-D volumes that share the same geometry. Each voxel carries a time course
(the frame dimension) in each input volume; `xcorr` normalises each voxel's time
course in each volume, multiplies the two normalised time courses element-wise,
and sums the product over frames. The result is a single-frame volume whose value
at each voxel is the Pearson correlation $r$ between that voxel's two time
courses. It is a thin orchestration of [[mri_concat]] (for normalisation and
summation) and [[fscalc]] (for the element-wise product).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/xcorr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr)
- **Binary/script location:** `$FREESURFER_HOME/bin/xcorr`
- **FreeSurfer tools invoked:** [`mri_concat --fnorm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L71) (per-voxel time-course normalisation), [`fscalc … mul`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L83) (element-wise product), [`mri_concat --sum`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L88) (sum over frames), and `fs_temp_dir`.

## Purpose and Context

A common neuroimaging question is "how correlated are these two time series at
each voxel?" — for example comparing a measured BOLD time course against a model
or reference, or two acquisitions of the same subject. `xcorr` answers it for
whole volumes at once, producing a correlation map. It exists as a small,
script-level convenience that strings together the FreeSurfer volume utilities
needed to compute Pearson's $r$ per voxel without writing the normalisation and
reduction steps by hand.

It is run **standalone**; it is not part of [[wiki/pipelines/recon-all|recon-all]]
or any TRACULA stream.

## Inputs

### Required Inputs

- **`--i1 <vol>`** — first input volume (4-D; one time course per voxel). Must
  exist (checked at parse time).
- **`--i2 <vol>`** — second input volume; same geometry and frame count as
  `--i1`. Must exist.

Both inputs are any volume format readable by [[mri_concat]] (e.g. [[mgz]],
NIfTI, MGH).

### Input Assumptions

> [!assumption] Same geometry and frame count; correlation is over frames
> The two inputs must be voxelwise comparable: identical dimensions and an equal
> number of frames, because the per-voxel time courses are multiplied
> element-wise ([`fscalc … mul`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L83)) and summed over frames. The
> "time course" is simply the frame (4th) dimension; a single-frame input would
> yield a degenerate (all-ones or undefined) correlation. No resampling or
> registration is performed — alignment is the caller's responsibility.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<outvol>` (`--o`) | volume (e.g. [[mgz]], inferred from extension) | Single-frame voxelwise Pearson correlation map ($r \in [-1, 1]$). |
| `<tmpdir>/xcorr.log` or `--log` target | text | Run log (command list, environment, timing). Defaults to no log (`/dev/null`) unless `--log` is given. |

Intermediate files (`fnorm1.mgh`, `fnorm2.mgh`, `prod.mgh`) are written in a
scratch directory and removed unless `--nocleanup`/`--tmp` is set.

### Output Specifications

A single-frame volume with the same spatial geometry as the inputs; each voxel's
value is the Pearson correlation coefficient between its two normalised time
courses. See [[coordinate-systems]] for the volume geometry conventions; the
output inherits the inputs' geometry unchanged.

## Mathematical Foundations

> [!math] Per-voxel Pearson correlation via normalise–multiply–sum
> For a voxel with time courses $a_f$ and $b_f$ ($f=1..N$ frames),
> [[mri_concat]]`--fnorm` produces the standardised time course
> $$\hat{a}_f = \frac{a_f - \bar a}{\sqrt{\sum_g (a_g-\bar a)^2}},$$
> (mean-removed and divided by its L2 norm), and likewise $\hat b_f$. The script
> then forms the element-wise product $\hat a_f\,\hat b_f$ with
> [[fscalc]]`mul` and sums it over frames with [[mri_concat]]`--sum`:
> $$r=\sum_{f=1}^{N}\hat a_f\,\hat b_f.$$
> Because each normalised vector is mean-centred and unit-L2-norm, this sum **is**
> the Pearson correlation coefficient between the two time courses at that voxel,
> as the script's help states explicitly
> ([`scripts/xcorr:242-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L242-L245)).

> [!internal] All numerics are in the helper tools
> `xcorr` itself does no arithmetic; the normalisation (`--fnorm`), product
> (`mul`), and reduction (`--sum`) are implemented in [[mri_concat]] and
> [[fscalc]].

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/xcorr:122-190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L122-L190)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i1` | string | *(required)* | First input volume (4-D); existence checked. |
| `--i2` | string | *(required)* | Second input volume (4-D, same geometry/frames); existence checked. |
| `--o` | string | *(required)* | Output correlation volume. |
| `--log` | string | none | Write a log file to this path (default: no log). |
| `--nolog`<br>`--no-log` | bool | (default) | Disable logging (`/dev/null`). |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir --scratch`) | Use this scratch directory and do not clean it up. |
| `--nocleanup` | bool | off (cleanup on) | Keep the scratch directory. |
| `--cleanup` | bool | **on** | Delete the scratch directory (the default). |
| `--debug` | bool | off | `set echo`/verbose tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

Minimal: there are no mutually exclusive or behaviour-altering combinations among
the substantive flags. `--tmp`/`--tmpdir` implies `--nocleanup` (the scratch
directory you name is preserved). `--log` and `--nolog` are opposites; logging is
off by default.

## Typical Use Cases

### 1. Correlate two functional runs voxelwise

```bash
xcorr --i1 run1.mgz --i2 run2.mgz --o corr.mgz
```

Writes `corr.mgz`, a per-voxel Pearson $r$ between the two runs' time courses.

### 2. Keep intermediates for inspection

```bash
xcorr --i1 a.nii.gz --i2 b.nii.gz --o r.nii.gz \
  --tmp /tmp/xcorr.work --log /tmp/xcorr.work/xcorr.log
```

## Pipeline Context

`xcorr` is a stand-alone **voxelwise-statistics** utility; it is not invoked by
[[wiki/pipelines/recon-all|recon-all]]. It sits downstream of whatever produced
the two comparable 4-D volumes (e.g. preprocessed functional runs) and upstream
of thresholding/visualisation of the resulting correlation map.

**Predecessor:** two geometry-matched 4-D volumes → **xcorr** → **Successor:**
inspection/thresholding of the correlation map (e.g. [[fscalc]], freeview).

Internally it chains [[mri_concat]] (`--fnorm`, `--sum`) and [[fscalc]] (`mul`).

## Gotchas and Caveats

> [!gotcha] No alignment is performed
> `xcorr` assumes the two inputs are already in voxelwise correspondence. It does
> no registration or resampling; mismatched geometries will either error in
> `fscalc`/`mri_concat` or, if dimensions happen to match but spaces differ,
> produce a meaningless map.

> [!gotcha] Correlation is over frames, not space
> The reduction is `mri_concat --sum`, which sums over the frame dimension after
> the element-wise product — i.e. $r$ is computed along each voxel's time course.
> Inputs with one frame give a degenerate result.

> [!gotcha] Logging is off by default
> Unless you pass `--log`, the log file is `/dev/null`
> ([`scripts/xcorr:13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L13)); there is no persistent record of the run by default.

## Error Compensation and Guard Rails

- **Input existence checks** at parse time for `--i1` and `--i2`
  ([`scripts/xcorr:138-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L138-L140), [`:147-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L147-L149)).
- **Required-argument checks** for output and both inputs in `check_params`
  ([`scripts/xcorr:196-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L196-L209)).
- **Step-wise abort:** any non-zero return from `mri_concat`/`fscalc` jumps to
  `error_exit` and reports the failing command
  ([`scripts/xcorr:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L74), [`:114-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L114-L118)).
- The output directory is created (`mkdir -p`) if absent
  ([`scripts/xcorr:43-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L43-L44)).

## Related Tools

- [[mri_concat]] — performs the per-voxel time-course normalisation (`--fnorm`) and the sum over frames (`--sum`); the workhorse of `xcorr`.
- [[fscalc]] — performs the element-wise multiplication (`mul`) of the two normalised volumes.
- [[mgz]] — typical input/output volume format.
- [[coordinate-systems]] — the geometry conventions the inputs must share.

## Confidence and Gaps

**High confidence:** the complete flag set, the normalise→multiply→sum pipeline,
and the identification of the output as a per-voxel Pearson correlation — all read
directly from [`scripts/xcorr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr) and confirmed by the script's own
`BEGINHELP` text. No open questions.

## References

- FreeSurfer source: [`scripts/xcorr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr) (v8.2.0).
- Built-in help: `xcorr --help` (the `BEGINHELP` block, [`scripts/xcorr:240-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xcorr#L240-L245)).
