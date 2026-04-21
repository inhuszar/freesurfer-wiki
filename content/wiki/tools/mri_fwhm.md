---
title: "mri_fwhm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fwhm/mri_fwhm.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - smoothness
  - fwhm
  - statistics
  - smoothing
---

# mri_fwhm

## Summary

`mri_fwhm` estimates the global Gaussian smoothness (Full-Width-Half-Maximum, FWHM) of a multi-frame volumetric data set. It can also apply Gaussian smoothing to a volume, either to a specified FWHM or by a given amount. Commonly used in fMRI and VBM analyses to characterise the spatial autocorrelation of statistical maps for Random Field Theory-based multiple comparisons correction.

## Source Information

- **Language:** C++
- **Source file:** `mri_fwhm/mri_fwhm.cpp`

## Purpose and Context

In neuroimaging statistics, the smoothness of residual or test-statistic images affects the effective number of independent comparisons. `mri_fwhm` estimates this smoothness as the FWHM of the equivalent Gaussian point-spread function using the spatial autocorrelation (AR1) approach. The estimate can be passed to cluster-forming tools or used to smooth data to a target resolution.

The tool is particularly useful with `mri_glmfit` output — the residual images from a GLM fit can be passed to `mri_fwhm` to estimate the smoothness of the error process for cluster-based inference.

## Inputs

| Flag | Description |
|------|-------------|
| `--i <vol>` | Input multi-frame volume (required, unless `--synth`) |
| `--mask <vol>` | Binary brain mask (strongly recommended) |
| `--auto-mask <rthresh>` | Auto-compute mask as fraction of global mean |

## Outputs

- FWHM printed to stdout/log.
- Optional: smoothed or detrended output volume (`--o`).
- Optional: AR1 maps (`--ar1`, `--ar1red`).
- Optional: out-mask volume (`--out-mask`).

## Mathematical Foundations

Smoothness is estimated from the spatial autocorrelation function (AR1) of the data:

$$\text{FWHM} = \text{voxelsize} \cdot \sqrt{\frac{-8\ln(2)}{\ln(\text{AR1})}}$$

where AR1 is the lag-1 autocorrelation in each spatial direction, averaged across directions.

For a Gaussian kernel with standard deviation $\sigma$:

$$\text{FWHM} = \sigma \sqrt{8\ln 2} \approx 2.355 \sigma$$

Equivalently:

$$\sigma = \frac{\text{FWHM}}{\sqrt{\ln 256}}$$

(FreeSurfer's convention uses $\sqrt{\ln 256}$ rather than $\sqrt{8\ln 2}$ for the conversion, but these are equivalent since $\ln 256 = 8\ln 2$.)

Before estimation, data is **detrended** to remove mean (or higher-order polynomial) signal, which is necessary to avoid biasing the smoothness estimate. The detrending order is controlled by `--detrend`.

The "smooth TO" option (`--to-fwhm`) adaptively smooths the data until the estimated FWHM matches the target, using an iterative approach.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i <vol>` | volume | required | Input multi-frame volume |
| `--o <vol>` | volume | — | Save (smoothed) output volume |
| `--smooth-only` | flag | off | Smooth without estimating FWHM |
| `--save-detended` | flag | off | Save detrended+smoothed+masked output |
| `--save-unmasked` | flag | off | Save smoothed output without masking |
| `--mask <vol>` | volume | — | Brain mask |
| `--mask-thresh <t>` | float | 0.5 | Mask binarisation threshold |
| `--auto-mask <rthresh>` | float | — | Auto mask at fraction of global mean |
| `--mask-inv` | flag | off | Invert mask |
| `--nerode <n>` | int | 0 | Erode mask n times |
| `--out-mask <vol>` | volume | — | Save final mask |
| `--ar1 <vol>` | volume | — | Save 6-frame AR1 map |
| `--ar1red <vol>` | volume | — | Save 3-frame averaged AR1 map |
| `--X <mat>` | matrix | — | Custom detrending matrix (matlab4 format) |
| `--detrend <order>` | int | 0 | Polynomial detrending order |
| `--fwhm <fwhm>` | float | — | Smooth BY this FWHM (mm) before estimating |
| `--to-fwhm <fwhm>` | float | — | Smooth TO this target FWHM (mm) |
| `--to-fwhm-tol <t>` | float | — | Tolerance for `--to-fwhm` convergence |
| `--to-fwhm-maxiter <n>` | int | — | Max iterations for `--to-fwhm` |
| `--synth` | flag | off | Synthesise white Gaussian noise input |
| `--synth-frames <n>` | int | — | Number of frames for synthesised data |
| `--nthreads <n>` | int | — | Number of OpenMP threads |
| `--debug` | flag | off | Verbose output |

## Configuration Interactions

- `--detrend` and `--X` are mutually exclusive detrending specifications.
- `--fwhm` and `--to-fwhm` both apply smoothing; `--fwhm` smooths by a fixed amount, `--to-fwhm` iterates to reach a target.
- `--smooth-only` skips FWHM estimation entirely; useful for volumes with fewer than 10 frames (estimation requires sufficient frames).
- `--save-detended` implies the data has been smoothed, masked, and detrended before saving; `--save-unmasked` saves smoothed-but-not-masked data.
- A mask is strongly recommended; without one, boundary effects and non-brain voxels will inflate the apparent smoothness.

## Typical Use Cases

```bash
# Estimate smoothness of GLM residuals with brain mask
mri_fwhm --i res4d.nii.gz --mask brainmask.mgz

# Smooth to 6mm FWHM and save
mri_fwhm --i data.mgz --to-fwhm 6.0 --mask brainmask.mgz --o data_6mm.mgz

# Smooth by fixed 5mm FWHM (do not estimate)
mri_fwhm --i data.mgz --fwhm 5.0 --mask brainmask.mgz --o data_smoothed.mgz --smooth-only

# Synthesise noise to verify expected FWHM
mri_fwhm --synth --synth-frames 100 --i template.mgz --mask brainmask.mgz
```

## Pipeline Context

Not a `recon-all` stage. Used in:
- VBM (voxel-based morphometry) analyses to characterise smoothness.
- fMRI group analyses to estimate residual smoothness for cluster-based inference (feeds into `mri_glmfit` cluster correction).
- Smoothing pipelines requiring a specific target FWHM.

## Gotchas and Caveats

- Requires at least 10 frames for reliable FWHM estimation; the tool will warn or fail with fewer frames unless `--smooth-only` is used.
- The default detrending order is 0 (remove mean only); for fMRI data, a higher order may be needed to remove slow drift.
- The AR1-based estimator assumes isotropy (same FWHM in all directions); results may differ from anisotropic smoothness estimators (e.g., SPM's).
- The `--to-fwhm` option can be slow for large volumes; it runs multiple smoothing iterations.

## Related Tools

- [[mri_glmfit]] — produces residuals that can be passed to `mri_fwhm`
- [[mri_convert]] — format conversion

## Confidence and Gaps

**High confidence:** extensive inline documentation in the source file provides detailed description of each flag.
