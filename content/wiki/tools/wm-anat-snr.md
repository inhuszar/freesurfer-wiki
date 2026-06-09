---
title: "wm-anat-snr"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/wm-anat-snr"
families: []                     # standalone QA metric script
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[color-lut]]"
  - "[[stats-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - qa
  - snr
  - white-matter
  - quality-control
---

# wm-anat-snr

## Summary

`wm-anat-snr` computes a **white-matter anatomical signal-to-noise ratio (SNR)**
for a finished FreeSurfer subject, as an image-quality / QA metric. It builds a
white-matter mask from the `aparc+aseg.mgz` automatic segmentation (cerebral and
cerebellar WM, brain-stem, the corpus-callosum sub-labels, and WM
hypointensities), erodes that mask by 3 voxels (configurable) to stay clear of
tissue boundaries, then measures the spatial **mean** and **standard deviation**
of the bias-corrected intensity volume `norm.mgz` inside the eroded mask. The SNR
is their ratio, mean/std. A single-line result (subject, SNR, mean, std, voxel
count, erode count) is written to `stats/wmsnr.e<N>.dat`. Typical healthy values
are 15–20; subjects below ~15 warrant scrutiny. The metric is explicitly labelled
**experimental** and may change.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/wm-anat-snr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr)
- **Binary/script location:** `$FREESURFER_HOME/bin/wm-anat-snr`
- **Helpers invoked:**
  [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L87) (build + erode the WM mask),
  [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L94) (compute SNR/mean/std in the mask), and the FreeSurfer shell utility `UpdateNeeded`.

## Purpose and Context

The reliability of FreeSurfer's surface reconstruction depends heavily on the
contrast and noise characteristics of the input T1. A simple, automatable proxy
for "how clean is the white matter in this scan" is the SNR computed over a
homogeneous tissue: if the WM intensity has a tight distribution (high mean / low
spatial spread), the image is likely good; a low ratio flags motion, poor
intensity-inhomogeneity correction, high background noise, scanner artefact, a
failed FreeSurfer run, or genuine biological heterogeneity (e.g. many
hypointensities). `wm-anat-snr` packages that computation into one command and is
intended to be run across a cohort so outliers can be ranked and reviewed.

It is a **standalone QA** tool — it is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]]; you run it on subjects that have already
finished `recon-all` (so that `aparc+aseg.mgz` and `norm.mgz` exist).

> [!gotcha] Experimental metric
> The help text states plainly that this metric is experimental and may change in
> future versions ([`scripts/wm-anat-snr:230-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L230-L232)). Treat the absolute
> numbers as a screening aid, not a calibrated quality score, and note that a low
> value does not necessarily mean bad data nor a high value good data.

## Inputs

### Required Inputs

- **A FreeSurfer subject** — `--s <subject>`, an existing `$SUBJECTS_DIR`
  directory. The script reads two of its outputs:
  - `mri/aparc+aseg.mgz` — the automatic segmentation, from which the WM mask is
    derived ([`scripts/wm-anat-snr:35-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L35-L39)).
  - `mri/norm.mgz` — the intensity-normalised (bias-corrected) volume whose
    statistics are measured ([`scripts/wm-anat-snr:40-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L40-L44)).

Both must exist or the script errors out before doing any work.

### Input Assumptions

> [!assumption] A completed recon-all subject; SNR measured on norm.mgz
> The metric assumes a finished `recon-all`: `aparc+aseg.mgz` defines *where* WM
> is, and `norm.mgz` (1 mm conformed, intensity-normalised) supplies the
> intensities. Measuring on `norm.mgz` rather than the raw T1 means the WM is
> already bias-corrected, so the spread reflects residual noise/heterogeneity
> rather than the slow intensity bias field. The mask labels are fixed (see
> below); the metric is only as good as the segmentation that produced them.

## Outputs

### Files Created

Paths are relative to `$SUBJECTS_DIR/<subject>/` unless an explicit `--o` path is
given.

| File | Where | Contents |
|------|-------|----------|
| `wmsnr.e<N>.dat` | `stats/` (default) or the `--o` path | The one-line result (6 columns, see below). `<N>` is the erode count, so changing `--nerode` changes the filename. |
| `wmsnr.log` | `scripts/` (default) or `<datfile>.log` (with `--o`) | Run log. |
| `wmeroded.mgh` | the temp dir (deleted unless `--no-cleanup`) | the eroded WM mask. |
| `wmeroded.sum` | the temp dir | the `mri_segstats` summary the result is parsed from. |

### Output Specifications

The result file is a single whitespace-separated line written with
`printf "%-15s %5.2f %6.2f %5.2f %6d %2d"`
([`scripts/wm-anat-snr:107-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L107-L108)). Its six columns are
([`scripts/wm-anat-snr:243-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L243-L251)):

1. **subject name**
2. **SNR** (= mean / std)
3. **mean** WM intensity (`norm.mgz`, within the eroded mask)
4. **standard deviation** of WM intensity (over space)
5. **number of voxels** in the mask after erosion
6. **number of erodes** (`--nerode`)

The intermediate summary is a [[stats-format]] `mri_segstats` table; the values
in columns 2–5 are pulled from fixed fields of its single data row (nvox=field 3,
mean=field 6, std=field 7, snr=field 11; [`scripts/wm-anat-snr:100-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L100-L105)).

## Mathematical Foundations

> [!math] WM anatomical SNR
> Over the set $M$ of mask voxels (eroded WM), with $I_v$ the `norm.mgz`
> intensity at voxel $v$:
> $$\mu = \frac{1}{|M|}\sum_{v\in M} I_v, \qquad
>   \sigma = \sqrt{\frac{1}{|M|-1}\sum_{v\in M}(I_v-\mu)^2}, \qquad
>   \mathrm{SNR} = \frac{\mu}{\sigma}.$$
> This is a **spatial** SNR (variability across voxels at one time point), not a
> temporal SNR. The mean, standard deviation, and ratio are all computed by
> [[mri_segstats]] `--snr` over the masked `norm.mgz`
> ([`scripts/wm-anat-snr:94-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L94-L98)); the script only transcribes the result.

> [!math] The white-matter mask
> The mask is the union of these `aparc+aseg` labels, eroded by `nWMErode`
> (default 3) voxels ([`scripts/wm-anat-snr:87-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L87-L88)):
> `2, 41` (cerebral WM L/R), `7, 46` (cerebellum WM L/R), `251–255` (corpus
> callosum subdivisions), and `77, 78, 79` (WM hypointensities). Erosion pulls
> the mask away from grey/CSF boundaries so the statistics reflect deep WM.

> [!internal] Mask and stats math live in the called tools
> The morphological erosion and label matching are in [[mri_binarize]]; the
> mean/std/SNR reduction is in [[mri_segstats]]. `wm-anat-snr` contributes only
> the label list, the erode count, and the output formatting.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser
([`scripts/wm-anat-snr:119-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L119-L174)). Defaults are the initial variable
settings ([`scripts/wm-anat-snr:6-14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L6-L14)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--o` | string | `stats/wmsnr.e<N>.dat` | Output data-file path. Specifying it also redirects the log to `<datfile>.log` and the temp dir next to the output. |
| `--nerode` | int | `3` | Number of erosions of the WM mask. **Changes the default output filename** (`wmsnr.e<N>.dat`). |
| `--force` | bool | off | Re-run even if the output is newer than `aparc+aseg.mgz`/`norm.mgz` (otherwise an up-to-date output is skipped). |
| `--tmp`<br>`--tmpdir` | string | `<subject>/tmp` (or `<outdir>/tmp.wm-anat-snr.$$` with `--o`) | Temporary directory; specifying it implies `--nocleanup`. |
| `--cleanup` | bool | **on** | Delete the temp dir at the end. |
| `--no-cleanup`<br>`--nocleanup` | bool | — | Keep the temp dir. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` / `--help` | bool | — | Print version / help and exit. |

### Configuration Interactions

> [!gotcha] `--nerode` changes the output filename, so different erode counts coexist
> The default output is `wmsnr.e$nWMErode.dat`
> ([`scripts/wm-anat-snr:45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L45)). Running with `--nerode 2` and `--nerode 3`
> produces *two different files* (`wmsnr.e2.dat`, `wmsnr.e3.dat`) rather than
> overwriting, and the up-to-date check is per-file. Aggregation scripts that
> `cat */stats/wmsnr.e3.dat` will silently miss subjects processed with a
> different erode count.

> [!gotcha] `--o` reroutes the log and temp dir too
> Supplying `--o <datfile>` sets `datfilespeced`, which makes the log
> `<datfile>.log` ([`scripts/wm-anat-snr:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L65)) and the temp dir
> `<outdir>/tmp.wm-anat-snr.$$` instead of `<subject>/tmp`
> ([`scripts/wm-anat-snr:82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L82)). Without `--o`, the log is
> `scripts/wmsnr.log`.

Other interactions:

- `--tmp`/`--tmpdir` implies `--nocleanup`, so the eroded mask and the
  `mri_segstats` summary are retained for inspection.
- `--force` only affects the timestamp skip; it does not change the computation.

## Typical Use Cases

### 1. Standard QA on one subject

```bash
wm-anat-snr --s subject
# → stats/wmsnr.e3.dat : "subject  17.42  108.30  6.22  41234   3"
```

### 2. Rank a whole cohort by SNR

```bash
foreach s ( `ls $SUBJECTS_DIR` )
  wm-anat-snr --s $s
end
cd $SUBJECTS_DIR
cat */stats/wmsnr.e3.dat | sort -k 2 -n   # lowest SNR first
```

### 3. Tighter mask (more erosion)

```bash
# Erode by 5 → stats/wmsnr.e5.dat (a separate file from e3).
wm-anat-snr --s subject --nerode 5
```

### 4. Force a re-run after re-processing

```bash
wm-anat-snr --s subject --force
```

## Pipeline Context

`wm-anat-snr` is a **standalone QA** script run *after*
[[wiki/pipelines/recon-all|recon-all]]. It is **not** a recon-all stage and is
not called by `recon-all` or `trac-all`.

**Predecessor:** a completed [[wiki/pipelines/recon-all|recon-all]] (producing
`aparc+aseg.mgz` and `norm.mgz`) → **wm-anat-snr** → **Successor:** manual review
/ cohort ranking of `stats/wmsnr.e<N>.dat`.

Internally it is two calls: [[mri_binarize]] (mask) → [[mri_segstats]] (SNR).

## Gotchas and Caveats

> [!gotcha] SNR is mean/std over space, on the normalised volume
> The denominator is the **spatial** standard deviation of `norm.mgz` within deep
> WM, not a noise estimate from repeated measurements. Because `norm.mgz` is
> already bias-corrected, a low value mostly reflects residual noise or true WM
> intensity heterogeneity (e.g. many hypointensities), not the bias field.

> [!gotcha] Hypointensities are included in the WM mask
> Labels 77/78/79 (WM hypointensities) are part of the mask
> ([`scripts/wm-anat-snr:88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L88)). A subject with extensive hypointensities
> will have a wider intensity spread and hence a lower SNR for a biological — not
> a quality — reason. The help text calls this out explicitly.

> [!gotcha] Up-to-date outputs are skipped by default
> If `wmsnr.e<N>.dat` already exists and is newer than `aparc+aseg.mgz` and
> `norm.mgz`, the script prints "Output file is up-to-date" and exits without
> recomputing ([`scripts/wm-anat-snr:55-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L55-L63)). Use `--force` to override.

> [!gotcha] Erosion can empty the mask on small/abnormal brains
> A large `--nerode` on a small or atrophied brain could erode the WM mask to
> very few (or zero) voxels, making the SNR unstable. Column 5 (voxel count) lets
> you check the mask survived erosion.

## Error Compensation and Guard Rails

- **Input existence checks.** `aparc+aseg.mgz` and `norm.mgz` must exist; the
  subject directory and output directory writability are checked, and the script
  exits with a clear error otherwise
  ([`scripts/wm-anat-snr:35-53,182-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L35-L53)).
- **Skip-if-up-to-date.** `UpdateNeeded` guards re-computation unless `--force`
  is given ([`scripts/wm-anat-snr:55-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L55-L63)).
- **Fail-fast.** A non-zero status from `mkdir`, `mri_binarize`, or
  `mri_segstats` aborts the run.
- **Cleanup by default.** The temp dir (and the eroded mask within it) is removed
  unless `--no-cleanup`/`--tmp` is set ([`scripts/wm-anat-snr:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L110)).

## Related Tools

- [[mri_binarize]] — builds and erodes the WM mask from the segmentation label list.
- [[mri_segstats]] — computes the mean/std/SNR within the mask (`--snr`).
- [[color-lut]] — the label numbering (2/41/7/46/251–255/77–79) used to define WM.
- [[wiki/pipelines/recon-all|recon-all]] — produces the `aparc+aseg.mgz` and `norm.mgz` inputs.

## Confidence and Gaps

**High confidence:** the complete flag set, the exact WM label list and default
3-voxel erosion, the SNR = mean/std definition on `norm.mgz`, the six output
columns and their `mri_segstats` source fields, the `--nerode`→filename coupling,
the `--o`→log/temp rerouting, and the `UpdateNeeded` skip — all read directly from
[`scripts/wm-anat-snr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr).

## References

- FreeSurfer source: [`scripts/wm-anat-snr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr) (v8.2.0).
- Built-in help: `wm-anat-snr --help` (the `BEGINHELP` block, [`scripts/wm-anat-snr:228-273`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/wm-anat-snr#L228-L273)).
- Component tools: [[mri_binarize]], [[mri_segstats]].
