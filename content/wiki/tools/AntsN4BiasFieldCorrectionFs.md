---
title: "AntsN4BiasFieldCorrectionFs"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp"
families: []
recon_all_stage: "autorecon1"
related:
  - "[[AntsDenoiseImageFs]]"
  - "[[mri_nu_correct.mni]]"
  - "[[mri_normalize]]"
  - "[[mri_ca_normalize]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The B-spline control-point lattice / fitting-level mechanics are inside ITK's itkN4BiasFieldCorrectionImageFilter; only the FreeSurfer-set parameters (iterations per level, shrink factor, convergence threshold = 0) are documented here."
tags:
  - bias-correction
  - intensity-normalization
  - ants
  - itk
  - preprocessing
---

# AntsN4BiasFieldCorrectionFs

## Summary

`AntsN4BiasFieldCorrectionFs` performs **N4 retrospective bias-field (intensity
non-uniformity) correction** on an MRI volume. It is a FreeSurfer wrapper around
ITK's `itkN4BiasFieldCorrectionImageFilter` (the N4 algorithm of Tustison et
al., 2010, an improved N3) that ships with the
[ANTs](https://github.com/ANTsX/ANTs) toolbox. It estimates a smooth
multiplicative bias field on a shrunken copy of the image, reconstructs it at
full resolution via a B-spline lattice, divides the input by the field, and
writes the corrected volume. Beyond plain correction it can replace zero voxels
with small random values (useful for defaced data), rescale the output so a
segmentation label has a target mean intensity, and choose the output data type.
It is invoked by [[mri_nu_correct.mni]] (and thus by `recon-all`) when the
`--ants-n4` engine is selected.

## Source Information

- **Language:** C++ (ITK-based)
- **Source file:** [`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp)
- **Core algorithm:** ITK `itkN4BiasFieldCorrectionImageFilter` (vendored ANTs path)
- **Binary/script location:** `$FREESURFER_HOME/bin/AntsN4BiasFieldCorrectionFs`
- **Argument parser:** FreeSurfer `ArgumentParser` (`argparse.h`); help text from [`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.help.xml`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.help.xml)
- **Key FreeSurfer helper:** `MRIrescaleBySeg` ([`utils/mri2.cpp:250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri2.cpp#L250)) for the `--rescale` option

## Purpose and Context

MRI intensities drift smoothly across the field of view because of coil
sensitivity and B1 inhomogeneity. This *bias field* makes the same tissue appear
brighter in one region than another and degrades intensity-based segmentation
and surface placement. N4 is the standard correction: it models the log-bias as
a smooth B-spline field and iteratively sharpens the intensity histogram by
deconvolving the assumed field.

FreeSurfer historically used MNI `nu_correct` (N3) for this step. This tool gives
`recon-all` an ITK/ANTs N4 alternative that runs natively on FreeSurfer volumes.
It is reached through [[mri_nu_correct.mni]] when that script is called with
`--ants-n4`, which is how `recon-all` activates N4 instead of MNI N3. It can also
be run directly as a standalone bias corrector.

> [!gotcha] Selected via mri_nu_correct.mni, not by a recon-all flag of the same name
> `recon-all` does not call `AntsN4BiasFieldCorrectionFs` directly. It calls
> [[mri_nu_correct.mni]], which switches to this tool when `DoAntsN4` is set
> (`--ants-n4`) and otherwise uses MNI `nu_correct`
> ([`scripts/mri_nu_correct.mni:125-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L125-L131)). N3 and N4 are mutually
> exclusive in that script.

## Inputs

### Required Inputs

- **`-i`/`--input` — input volume.** Any format `MRIread` accepts
  ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L111)): [[mgz]]/`mgh`,
  `nii`/`nii.gz`, Analyze. **Must be 3D (single frame)** — see assumption below.
- **`-o`/`--output` — output volume.** Destination path; format from extension.

### Optional Inputs

- **`-m`/`--mask` — mask volume.** Restricts the bias-field estimation to voxels
  inside the (binarised) mask. Any nonzero mask voxel is treated as inside
  ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:167-179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L167-L179)).
- **`-c`/`--rescale … seg …` — segmentation volume.** A label volume whose
  matching IDs define the voxels used to set the output target mean.

### Input Assumptions

> [!assumption] Single-frame 3D volume
> The tool aborts if the input has more than one frame
> ("input cannot be 4D", [`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L153)). Correct
> one volume at a time.

- When **no mask** is given, a unit-valued mask covering the whole image is
  synthesised, i.e. the bias field is estimated over every voxel
  ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:181-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L181-L187)).
- The geometry (vox→RAS) of the input is preserved; only intensities change.
- N4 assumes a **slowly varying, smooth, multiplicative** bias. Sharp intensity
  discontinuities are not part of the model and will not be removed.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<output>` (e.g. `nu0.mgz`) | path given to `-o` | the bias-corrected volume; default data type **float** (override with `--dtype`) |

When called from [[mri_nu_correct.mni]] the output is the intermediate
`$tmpdir/nu0.mgz` that the script then post-processes
([`scripts/mri_nu_correct.mni:120-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L120-L126)).

On completion the program prints `AntsN4BiasFieldCorrectionFs done`
([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:299`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L299)).

### Output Specifications

The corrected image has the same dimensions and geometry as the input. The data
type defaults to `MRI_FLOAT` and can be set to `float`, `uchar`, or `int` with
`--dtype` ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:89-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L89-L102)). The
output is the input divided by the estimated (exponentiated log-) bias field,
optionally remasked and/or rescaled.

## Mathematical Foundations

N4 models the observed log-intensity as the sum of the true log-intensity and a
smooth log-bias field $b$:

$$\log v_{\text{obs}}(x) = \log v_{\text{true}}(x) + b(x)$$

The correction iterates between (1) sharpening the intensity histogram by
deconvolving the current field estimate and (2) fitting a smooth **B-spline**
field to the residual log-ratio. The corrected image is

$$v_{\text{corr}}(x) = \frac{v_{\text{obs}}(x)}{\exp\!\big(\hat{b}(x)\big)}$$

This wrapper performs the standard ITK N4 pipeline
([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:190-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L190-L269)):

1. **Shrink** the image and mask by the shrink factor (default 4) to speed up
   field estimation.
2. Run `itkN4BiasFieldCorrectionImageFilter` with the given per-level iteration
   counts; the number of `--iters` entries sets the number of B-spline fitting
   levels, and the **convergence threshold is fixed at 0.0** so all requested
   iterations run ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:199-201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L199-L201)).
3. **Reconstruct** the log-bias field at full resolution from the control-point
   lattice with `itkBSplineControlPointImageFilter`.
4. **Exponentiate** the log-field and **divide** the original (full-resolution)
   image by it, then crop back to the input extent.

> [!math] Rescale-by-segmentation
> `--rescale targetval seg id1 id2 …` multiplies the whole volume by a single
> scale so that the mean intensity of the voxels labelled `id1, id2, …` in `seg`
> equals `targetval`. The scale is $s = \text{targetval} / \bar{v}_{\text{seg}}$,
> applied per frame ([`utils/mri2.cpp:250-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri2.cpp#L250-L303)). If a mask is also
> supplied, voxels outside the mask are excluded from the mean and zeroed.

> [!internal] Core N4 math is in ITK
> The histogram sharpening, B-spline fitting levels, and control-point lattice
> are all inside ITK's `itkN4BiasFieldCorrectionImageFilter`; this wrapper only
> orchestrates the shrink → correct → reconstruct → divide sequence and sets the
> iteration schedule, shrink factor, and zero convergence threshold.

## Configuration Options

### Complete Flag Reference

All options enumerated from the argument parser
([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:38-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L38-L47)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i`<br>`--input` | string | *(required)* | Input volume to correct. |
| `-o`<br>`--output` | string | *(required)* | Output (corrected) volume path; format from extension. |
| `-m`<br>`--mask` | string | none | Mask volume; bias field is estimated only inside the binarised mask. Also used as the mask for `--rescale`. |
| `-s`<br>`--shrink` | int | `4` | Down-sampling factor applied before field estimation, to save time. The field is reconstructed at full resolution afterwards. |
| `-t`<br>`--iters` | int+ (one or more) | `50 50 50 50` | Max iterations per fitting level. The **count** of values sets the number of B-spline fitting levels (here 4 levels × 50 iterations). |
| `-d`<br>`--dtype` | string | `float` | Output data type: `float`, `uchar`, or `int` (case-insensitive). |
| `-r`<br>`--replace-zeros` | 3 floats: `offset scale remask` | off | Replace every zero voxel with `offset + scale·rand()` before correction. If `remask`≠0, those voxels are re-zeroed in the output. Helps with defaced inputs. |
| `-c`<br>`--rescale` | `targetval seg id1 [id2 …]` | off | After correction, scale the volume so the mean over the listed segmentation IDs equals `targetval`. Needs ≥3 arguments. |
| `--rescale-only` | boolean | off | Do the `--rescale` step **only** (no bias correction) and exit. Requires `--rescale` to also be set. |
| `-e`<br>`--threads-nondetermistic` | int | `1` | Number of OpenMP/ITK threads. **>1 makes ITK non-deterministic** (note the spelling of the flag). |
| `-h`<br>`--help` | boolean | — | Print the embedded help text and exit (registered by `ArgumentParser::addHelp`, [`utils/argparse.cpp:182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/argparse.cpp#L182)). |

### Configuration Interactions

> [!gotcha] `--rescale-only` requires `--rescale`
> Specifying `--rescale-only` without any `--rescale` arguments is a hard error
> ("--rescale-only specified but --rescale options not set",
> [`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:56-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L56-L59)). With both
> set, the tool rescales the input and exits **before** doing any N4 correction
> ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:112-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L112-L122)).

> [!gotcha] `--rescale` needs at least three values
> `--rescale targetval seg id …` must have `targetval`, a segmentation path, and
> at least one ID; fewer than three arguments aborts
> ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:66-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L66-L69)).

> [!gotcha] `--iters` doubles as the level count
> The number of integers you pass to `--iters` is the number of B-spline fitting
> levels, not just the iteration budget. `--iters 100` means **one** level of 100
> iterations; `--iters 50 50 50 50` means four levels. Passing too few levels
> changes the smoothness of the estimated field, not merely the runtime.

> [!gotcha] Threads change the result
> The default is a single deterministic thread. `--threads-nondetermistic N` with
> N>1 speeds up the run but warns that ITK routines may be non-deterministic
> ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:81-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L81-L86)) — two runs with the
> same input may differ slightly. Keep it at 1 for reproducible pipelines.

Order of operations when several options combine (full N4 path):
`--replace-zeros` (before correction) → N4 correction → `--replace-zeros`
remasking (if `remask`≠0) → `--rescale` (after correction). The `--rescale-only`
path skips everything except the rescale.

> [!gotcha] `--replace-zeros` forces the input to float
> If `--replace-zeros` is given and the input is not already float, the volume is
> converted to `MRI_FLOAT` before the random fill
> ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:130-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L130-L135)). The random
> fill is seeded deterministically (`srand48(53)`) and run single-threaded so it
> is reproducible.

## Typical Use Cases

### Use Case 1: Plain N4 correction

```bash
# Default 4-level / 50-iteration schedule, shrink factor 4, float output
AntsN4BiasFieldCorrectionFs -i T1.mgz -o T1.n4.mgz
```

### Use Case 2: Masked correction with uchar output (recon-all style)

```bash
# As mri_nu_correct.mni issues it when --ants-n4 [--ants-no-char off]
AntsN4BiasFieldCorrectionFs -i orig.mgz -o nu0.mgz \
  -m brainmask.mgz --dtype uchar
```

### Use Case 3: Defaced input — fill zeros, then re-mask

```bash
# Replace 0 voxels with small random values so N4 behaves, then re-zero them
AntsN4BiasFieldCorrectionFs -i defaced.mgz -o corrected.mgz \
  --replace-zeros 0 1 1
```

### Use Case 4: Correct and normalise WM to a target intensity

```bash
# After correction, scale so aseg WM labels (2,41) average 110
AntsN4BiasFieldCorrectionFs -i nu.mgz -o norm.mgz \
  --rescale 110 aseg.mgz 2 41
```

### Use Case 5: Rescale only (no bias correction)

```bash
AntsN4BiasFieldCorrectionFs -i in.mgz -o rescaled.mgz \
  --rescale 110 aseg.mgz 2 41 --rescale-only
```

## Pipeline Context

This tool sits in **autorecon1**, inside FreeSurfer's intensity-non-uniformity
correction step. `recon-all` runs [[mri_nu_correct.mni]]; that script calls
`AntsN4BiasFieldCorrectionFs` when invoked with `--ants-n4`, passing `-x`
(`--mask`) when a mask volume is available, `--dtype uchar` unless
`--ants-no-char` was given, `--replace-zeros 0 1 1` when zero-replacement is
requested, and `--threads-nondetermistic` when a thread count is set
([`scripts/mri_nu_correct.mni:125-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L125-L131)). N3 (`--ants-n3`,
`N3BiasFieldCorrection`) and N4 are mutually exclusive in that script.

**Predecessor:** [[wiki/tools/mri_convert|mri_convert]] / conform producing the
volume to correct → **AntsN4BiasFieldCorrectionFs** (via
[[mri_nu_correct.mni]]) → **Successor:** [[mri_normalize]] /
[[mri_ca_normalize]] (intensity normalisation), then segmentation.

## Gotchas and Caveats

> [!gotcha] Output defaults to float, which can surprise downstream tools
> Unless `--dtype` is set, the corrected volume is float
> ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L89), [`:272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L272)). The
> `mri_nu_correct.mni` path requests `uchar` by default so the result matches the
> 0–255 convention the rest of `recon-all` expects.

> [!gotcha] Shrink factor trades speed for field fidelity
> A larger `--shrink` makes the run much faster but estimates the bias field on a
> coarser grid. The default of 4 is the usual N4 compromise.

> [!gotcha] Mask binarisation is "any nonzero is inside"
> Both the `--mask` and the synthesised whole-image mask treat any value >0 as
> in-mask ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:173-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L173-L175)). A
> probabilistic or labelled mask is therefore used as a simple binary mask.

## Error Compensation and Guard Rails

- **Zero-replacement for defaced data** (`--replace-zeros`): defacing leaves
  large zero regions that confuse the histogram-based N4 sharpening. Replacing
  zeros with small random values, optionally re-masking afterwards, lets N4
  behave. Deterministic seed and single-threaded fill keep it reproducible
  ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:126-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L126-L151)).
- **4D guard:** multi-frame input is rejected rather than silently mis-handled.
- **dtype validation:** an unrecognised `--dtype` is a fatal error
  ([`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp#L100)).
- **Deterministic by default:** single thread and fixed convergence threshold of
  0 mean default runs are reproducible; opting into more threads forfeits that.

## Related Tools

- [[mri_nu_correct.mni]] — the FreeSurfer wrapper script that selects between MNI
  N3 and this N4 engine; the normal way `recon-all` reaches this tool.
- [[AntsDenoiseImageFs]] — the sibling ANTs wrapper for non-local-means
  denoising; the ANTs preprocessing pair.
- [[mri_normalize]] / [[mri_ca_normalize]] — downstream intensity normalisation
  that assumes the bias field has been removed.
- [[wiki/tools/mri_convert|mri_convert]] — shares the `MRIread`/`MRIwrite` layer;
  use it to change data type or inspect the result.
- `N3BiasFieldCorrection` *(no wiki page yet)* — the ANTs N3 alternative offered
  alongside N4 by `mri_nu_correct.mni`.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the mutual-exclusion and
minimum-argument rules, the order of zero-replacement / correction / rescale, the
default-float vs `uchar` behaviour, the single-thread default, the fixed zero
convergence threshold, and the exact `mri_nu_correct.mni` invocation — all read
directly from the source and confirmed against `--help`.

> [!gap] B-spline level mechanics
> The internal behaviour of the B-spline fitting levels and control-point lattice
> resolution lives inside ITK's `itkN4BiasFieldCorrectionImageFilter`. This page
> documents the parameters FreeSurfer sets (per-level iterations, number of
> levels = number of `--iters` entries, shrink factor, convergence threshold 0)
> but not ITK's internal lattice spacing per level.

## References

- N. J. Tustison, B. B. Avants, P. A. Cook, Y. Zheng, A. Egan, P. A. Yushkevich,
  J. C. Gee. *N4ITK: Improved N3 Bias Correction.* IEEE Transactions on Medical
  Imaging, 29(6):1310–1320, 2010.
- ANTs project: <https://github.com/ANTsX/ANTs>
- FreeSurfer source: [`AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/AntsN4BiasFieldCorrectionFs/AntsN4BiasFieldCorrectionFs.cpp) (v8.2.0).
