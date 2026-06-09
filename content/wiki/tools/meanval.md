---
title: "meanval"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/meanval"
families: []                     # standalone convenience wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mri_info]]"
  - "[[sratio]]"
  - "[[fscalc]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - roi
  - convenience
  - fmri
---

# meanval

## Summary

`meanval` computes the mean intensity of a volume inside a binary mask and writes
that single number (one value per frame) to a text file. It is a thin tcsh
convenience wrapper around [[mri_segstats]]: it treats the mask as a
one-label segmentation (label ID 1) and asks `mri_segstats` for the
spatial-frame-average (`--sfavg`) of the input volume over that label. It can
optionally also emit the per-frame average waveform for a time series.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/meanval`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval)
- **Binary/script location:** `$FREESURFER_HOME/bin/meanval`
- **Key helper invoked:** [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L59-L60) (does all the work). Also sources `$FREESURFER_HOME/sources.csh` ([`scripts/meanval:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L29)).

## Purpose and Context

A very common need in neuroimaging is "what is the average value of this map
inside this region?" — for example the mean percent-signal-change in an
activation ROI, the mean of a parameter map inside a cortical label, or a global
mean used for intensity normalisation. `mri_segstats` can do this, but its
command line is verbose because it is a general region-statistics engine.
`meanval` packages the single most common invocation: **mean of `--i` over the
non-zero voxels of `--m`**.

It hard-codes the assumption that the mask is a binary image whose region of
interest has value 1, builds the `mri_segstats` command at
[`scripts/meanval:59-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L59-L61), runs it, and exits. It is not part of
[[wiki/pipelines/recon-all|recon-all]]; it is a stand-alone analysis helper,
typically used interactively or inside FSFAST / custom analysis scripts.

## Inputs

### Required Inputs

- **Input volume** (`--i invol`) — any volume readable by FreeSurfer
  ([[mgz]], [[nifti]], Analyze, …). Existence is checked at
  [`scripts/meanval:84-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L84-L87). May be multi-frame (a time series); one mean is
  produced per frame.
- **Mask volume** (`--m mask`) — a volume in the **same voxel space** as the
  input whose region of interest has value 1. Existence is checked at
  [`scripts/meanval:93-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L93-L96).
- **Output text file** (`--o meanval.dat`) — where the mean is written.

### Input Assumptions

> [!assumption] Mask is a binary image with the ROI labelled 1
> `meanval` calls `mri_segstats --seg <mask> --id 1`, so only voxels whose mask
> value equals **1** are averaged ([`scripts/meanval:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L59)). A
> mask whose ROI is labelled with any other integer (e.g. an `aseg` label like
> 17) will yield an **empty/zero** result, because no voxel matches ID 1. The
> input and mask must share the same dimensions and geometry; `meanval` performs
> no resampling and does not register the two volumes.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `meanval.dat` (the `--o` argument) | user-specified path | One number per frame: the mean of the input over the mask==1 voxels (the `mri_segstats --sfavg` output). |
| `avgwf` (the `--avgwf` argument) | user-specified path | *(only with `--avgwf`)* The per-frame average waveform of the ROI — for a 4D input this is the ROI mean time course. |
| `meanval.log` | `<outdir>/meanval.log` | Run log (command line, build stamp, host); suppressed by `--nolog` or redirected by `--log`. |
| `tmpdir.meanval.$$/` | `<outdir>/` | Scratch directory holding the throwaway `mri_segstats --sum` table; removed unless `--nocleanup`/`--tmpdir` is given. |

`<outdir>` is the directory part of the `--o` path, created if necessary
([`scripts/meanval:37-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L37-L44)).

### Output Specifications

The primary output is an ASCII file containing the spatial-frame-average produced
by `mri_segstats --sfavg`: for an input with *N* frames, *N* whitespace-separated
mean values. With a single-frame input it is a single number. The `--avgwf` file
(if requested) is the standard `mri_segstats` average-waveform text format (one
row per frame).

## Mathematical Foundations

The computation is an unweighted arithmetic mean over the masked voxels, performed
inside [[mri_segstats]]:

> [!math] Masked mean
> For frame $t$, with mask region $\Omega = \{v : \text{mask}(v) = 1\}$,
> $$ \bar{x}_t = \frac{1}{|\Omega|} \sum_{v \in \Omega} \text{invol}(v, t). $$
> `meanval` itself does no arithmetic; it delegates to
> `mri_segstats --sfavg`/`--avgwf`.

> [!internal] The averaging lives in `mri_segstats`
> All voxel iteration, label selection, and averaging happen in
> [[mri_segstats]] (the `--sfavg` / `--avgwf` code paths). `meanval` only
> assembles the command line.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/meanval:73-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L73-L145)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input volume whose mean is computed ([`scripts/meanval:81-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L81-L88)). Must exist. |
| `--m` | string | *(required)* | Mask volume; voxels equal to 1 define the region averaged ([`scripts/meanval:90-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L90-L97)). Must exist. |
| `--o` | string | *(required)* | Output text file for the mean value(s) ([`scripts/meanval:99-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L99-L102)). Its directory is created automatically. |
| `--avgwf` | string | off | Also write the ROI average waveform to this file (passed to `mri_segstats --avgwf`) ([`scripts/meanval:104-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L104-L107)). |
| `--log` | string | `<outdir>/meanval.log` | Write the run log to this path instead ([`scripts/meanval:109-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L109-L112)). |
| `--nolog`<br>`--no-log` | bool | off | Disable logging (log file set to `/dev/null`) ([`scripts/meanval:114-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L114-L117)). |
| `--tmpdir` | string | `<outdir>/tmpdir.meanval.$$` | Use this scratch directory and **do not** delete it afterwards (sets `cleanup=0`) ([`scripts/meanval:119-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L119-L123)). |
| `--nocleanup` | bool | off | Keep the temporary directory after exit ([`scripts/meanval:125-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L125-L127)). |
| `--cleanup` | bool | on | Delete the temporary directory (the default) ([`scripts/meanval:129-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L129-L131)). |
| `--debug` | bool | off | Enable tcsh `set echo`/`verbose` tracing ([`scripts/meanval:133-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L133-L136)). |
| `--help` | bool | — | Print usage and the (empty) help block, then exit ([`scripts/meanval:18-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L18-L22)). |
| `--version` | bool | — | Print the version string and exit ([`scripts/meanval:23-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L23-L27)). |

### Configuration Interactions

There are no mutually-exclusive flags. The only interactions are around the
temporary directory and logging:

> [!gotcha] `--tmpdir` implies `--nocleanup`
> Supplying `--tmpdir` sets `cleanup=0` ([`scripts/meanval:122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L122)),
> so the scratch directory you name is left on disk even though it normally
> would be deleted. Pass `--cleanup` afterwards (it appears later in the parse
> loop) only if you genuinely want it removed.

- `--avgwf` is additive: the `--o` mean is always produced; `--avgwf` simply adds
  a second output file.
- `--nolog`, `--log`, and the default are last-writer-wins in the parse order, but
  in practice you use at most one.

## Typical Use Cases

### 1. Mean of a statistical map inside an ROI

```bash
# Average a contrast/percent-signal map over a binary ROI mask (label = 1).
meanval --i ces.nii.gz --m roi.mask.nii.gz --o roi.mean.dat
cat roi.mean.dat
```

### 2. ROI time course from a 4D series

```bash
# One mean per volume (the --o file) plus the explicit average waveform.
meanval --i fmcpr.nii.gz --m seed.mask.nii.gz \
  --o seed.mean.dat --avgwf seed.avgwf.dat
```

### 3. Global mean for intensity normalisation

```bash
# Whole-brain mean of an EPI using a brain mask.
meanval --i bold.mgz --m brainmask.bin.mgz --o globalmean.dat
```

## Pipeline Context

`meanval` is a stand-alone analysis convenience tool. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** a map/time-series plus a binary ROI (e.g. from
[[mri_binarize]], [[mri_label2vol]], or a thresholded statistic) → **meanval** →
**Successor:** the text value feeds a spreadsheet, a group analysis, or an
intensity-normalisation step. For the full region-statistics feature set (volumes,
multiple labels, standard deviations, colour tables) use [[mri_segstats]]
directly.

## Gotchas and Caveats

> [!gotcha] Only mask value 1 is averaged
> The label ID is hard-wired to 1 ([`scripts/meanval:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L59)). To average a
> specific structure inside a multi-label segmentation, first binarize it
> (`mri_binarize --i aseg.mgz --match 17 --o hippo.mask.mgz`) so the ROI is 1,
> or call [[mri_segstats]] with the appropriate `--id`.

> [!gotcha] No registration or resampling
> Input and mask are assumed to be voxel-for-voxel aligned. A mismatch in
> dimensions will make `mri_segstats` fail; a mismatch in geometry with matching
> dimensions will silently average the wrong voxels.

> [!gotcha] The throwaway `--sum` table is discarded
> `meanval` writes a full `mri_segstats --sum` table to
> `tmpdir/blah.$$` and then deletes it ([`scripts/meanval:59-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L59-L60), [`scripts/meanval:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L66)). If you also want
> the voxel count or the standard deviation, run `mri_segstats` yourself and keep
> its `--sum` output.

## Error Compensation and Guard Rails

- **Existence checks.** Both `--i` and `--m` are verified to exist before any work
  ([`scripts/meanval:84-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L84-L87), [`scripts/meanval:93-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L93-L96)); all three of `--i`, `--m`, `--o`
  are required ([`scripts/meanval:151-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L151-L164)).
- **Output directory auto-created.** The directory part of `--o` is created with
  `mkdir -p` ([`scripts/meanval:37-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L37-L38)).
- **Propagates failure.** If `mri_segstats` returns non-zero, `meanval` exits 1
  ([`scripts/meanval:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L64)) and (unless `--nocleanup`) the scratch directory is
  removed.

## Related Tools

- [[mri_segstats]] — the engine that actually computes the mean; use it directly for multi-label statistics, volumes, and standard deviations.
- [[mri_binarize]] — build the binary mask (ROI = 1) that `meanval` expects.
- [[mri_label2vol]] — convert a surface label or annotation into a volumetric mask.
- [[sratio]] — sibling Doug-Greve convenience wrapper for a voxel-wise signed ratio of two volumes.
- [[mri_info]] — inspect volume geometry to confirm input and mask are aligned.

## Confidence and Gaps

**High confidence:** the complete flag set, the hard-coded `--id 1`, the
`--sfavg`/`--avgwf` delegation, and the temp/log behaviour are all read directly
from [`scripts/meanval`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval). The short usage and `--help` agree with the
source (the `BEGINHELP` block is empty, so `--help` prints only the usage lines).

## References

- FreeSurfer source: [`scripts/meanval`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval) (v8.2.0).
- Built-in help: `meanval --help` (prints the usage at [`scripts/meanval:176-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/meanval#L176-L188); the `BEGINHELP` body is empty).
- Underlying engine documentation: [[mri_segstats]].
