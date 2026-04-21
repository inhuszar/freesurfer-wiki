---
title: "mri_volsynth"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_volsynth/mri_volsynth.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_volcluster]]"
  - "[[mri_z2p]]"
  - "[[mri_concat]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The --pdf checker, cp, F, Fr, geodesic modes were not fully documented."
  - "The --hsc (heteroscedastic noise) parameters HSCMin/HSCMax were not traced from the full parse section."
tags:
  - synthesis
  - testing
  - statistics
  - simulation
---

# mri_volsynth

## Summary

`mri_volsynth` synthesises test volumes with user-specified statistical distributions. It can generate Gaussian, uniform, constant, delta (impulse), sphere mask, t-statistic, chi-squared, F-statistic, and z-statistic volumes, with optional Gaussian spatial smoothing. The tool is used for testing interpolation kernels, validating statistical inference, generating null distributions for cluster analysis, and creating phantom volumes.

## Source Information

- **Language:** C++
- **Source file:** `mri_volsynth/mri_volsynth.cpp`
- **Original author:** Douglas N. Greve (MGH)

## Purpose and Context

Many FreeSurfer statistical tools require testing and calibration with synthetic data of known properties. `mri_volsynth` provides:

1. **Null distribution testing:** Generate many realisations of a known PDF to build empirical cluster-size distributions
2. **Interpolation testing:** Generate a delta (impulse) to visualise interpolation kernel spread
3. **Pipeline testing:** Generate constant or patterned volumes to verify that tools do not alter geometry
4. **Power analysis:** Simulate data under a known model to validate detection sensitivity

## Inputs

| Flag | Description |
|------|-------------|
| `--temp templatevol` | Template volume (copies header geometry; overrides `--dim` and `--res`) |
| `--dim Nc Nr Ns [Nf]` | Specify dimensions directly |
| `--res Xc Xr Xs [Xt]` | Voxel size in mm (and TR in ms) |
| `--cras Cx Cy Cz` | Set centre RAS coordinate |
| `--cdircos dx dy dz` | Column direction cosines |
| `--rdircos dx dy dz` | Row direction cosines |
| `--sdircos dx dy dz` | Slice direction cosines |

## Outputs

| Flag | Description |
|------|-------------|
| `--vol outfile` | Output synthesised volume |
| `--sum2 sumfile` | Write sum-of-squares over frames |

## Mathematical Foundations

**Supported PDFs (`--pdf name`):**

| Name | Distribution |
|------|-------------|
| `gaussian` (default) | $\mathcal{N}(\mu, \sigma^2)$, configurable via `--gausmean` and `--gausstd` |
| `uniform` | $\mathcal{U}[0,1]$ |
| `const` | Constant value $A$ (from `--val-a`) |
| `delta` | Zero everywhere except a single voxel set to $A$ |
| `sphere` | Sphere mask of given radius |
| `z` | Standard normal $\mathcal{N}(0,1)$ (z-statistic field) |
| `t` | t-distribution with `--dof` degrees of freedom |
| `tr` | t as ratio $z / \sqrt{\chi^2_\nu / \nu}$ |
| `chi2` | Chi-squared with `--dof` degrees of freedom |
| `F` | F-distribution (numerator + denominator dof) |
| `Fr` | F as ratio of two chi-squared |

**Smoothing:** After synthesis, optional Gaussian smoothing is applied with `--fwhm fwhm`, where $\sigma = \text{FWHM} / \sqrt{8 \ln 2}$. Smoothing can also be done in Fourier space with `--fft`.

**Rescaling after smoothing:** When `--rescale` is used with statistical PDFs (z, t, chi2, F), the smoothed field is rescaled to restore the correct marginal distribution.

**Heteroscedastic noise (`--hsc`):** Each frame is multiplied by a random scalar drawn from $\mathcal{U}[\text{HSCMin}, \text{HSCMax}]$ to simulate heteroscedastic variance.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--vol` | `outfile` | Output volume filename |
| `--temp` | `templatevol` | Template for geometry |
| `--dim` | `Nc Nr Ns [Nf]` | Volume dimensions |
| `--nframes` | `Nf` | Number of frames |
| `--res` | `Xc Xr Xs [Xt]` | Voxel resolution in mm |
| `--pdf` | `name` | Probability distribution (see table above) |
| `--gausmean` | `mean` | Mean for Gaussian (default 0) |
| `--gausstd` | `std` | Std dev for Gaussian (default 1) |
| `--val-a` | `val` | Primary value (const PDF, delta value) |
| `--val-b` | `val` | Off-value for delta PDF |
| `--numdof` | `dof` | Numerator DOF for t, chi2, F |
| `--dendof` | `dof` | Denominator DOF for F |
| `--fwhm` | `fwhm` | FWHM for spatial Gaussian smoothing (mm) |
| `--fft` | — | Use FFT for Gaussian smoothing |
| `--rescale` | — | Rescale after smoothing (statistical PDFs only) |
| `--gmnnorm` | `val` | Normalisation for Gaussian smoothing kernel (default 1) |
| `--delta-crsf` | `c r s f` | Location of delta voxel |
| `--sphere-center` | `c r s` | Centre of sphere mask |
| `--sphere-radius` | `vox` | Sphere radius in voxels |
| `--mm-radius` | `mm` | Sphere radius in mm |
| `--seed` | `seed` | Random seed (default: from clock) |
| `--seedfile` | `file` | Read seed from file |
| `--spike` | `tp` | Add spike at time point tp (for testing spike detection) |
| `--curv` | — | Output as surface curvature format |
| `--subject` | `subj` | Subject (with `--curv`) |
| `--hemi` | `hemi` | Hemisphere (with `--curv`) |
| `--sum2` | `file` | Output sum-of-squares |
| `--no-output` | — | Do not write output volume (for testing only) |
| `--hsc` | — | Apply heteroscedastic noise scaling |
| `--p0` | `x y z` | Set p0 origin instead of CRAS |
| `--cras` | `x y z` | Set centre RAS |
| `--cdircos` | `dx dy dz` | Column direction cosines |
| `--rdircos` | `dx dy dz` | Row direction cosines |
| `--sdircos` | `dx dy dz` | Slice direction cosines |
| `--precision` | `prec` | Output data type |
| `--TR` | `ms` | TR in milliseconds |
| `--add-offset` | `frame` | Add an offset frame |
| `--debug` | — | Debug output |
| `--version` | — | Print version |

## Configuration Interactions

- `--temp` overrides `--dim` and `--res`; the output geometry is taken from the template volume.
- `--nframes` overrides the frame count from `--temp`.
- `--fwhm` and `--fft` interact: `--fft` applies Gaussian smoothing in Fourier space instead of real space (faster for large volumes).
- `--rescale` is meaningful only for statistical PDFs (z, t, chi2, F, Fr) and should be used with `--fwhm` to maintain correct marginal distributions after smoothing.
- `--seed` and `--seedfile` are alternative seed sources; `--seedfile` takes precedence.
- `--curv` mode requires `--subject` and `--hemi` and outputs in surface overlay format rather than volume format.

## Typical Use Cases

```bash
# Generate a 64x64x64 Gaussian noise volume for testing
mri_volsynth \
    --vol noise.mgz \
    --dim 64 64 64 1 \
    --pdf gaussian \
    --seed 42

# Generate a z-statistic field with the same geometry as an existing volume
mri_volsynth \
    --vol zfield.mgz \
    --temp $SUBJECTS_DIR/bert/mri/orig.mgz \
    --pdf z \
    --seed 123

# Generate a smoothed z-field for cluster threshold calibration
mri_volsynth \
    --vol zsmooth.mgz \
    --temp brain.mgz \
    --pdf z \
    --fwhm 8 \
    --rescale \
    --seed 1

# Generate a single impulse (delta) to visualise interpolation
mri_volsynth \
    --vol delta.mgz \
    --temp brain.mgz \
    --pdf delta \
    --delta-crsf 64 64 64 0

# Generate a constant volume (e.g., for mask testing)
mri_volsynth \
    --vol const5.mgz \
    --dim 256 256 256 1 \
    --pdf const \
    --val-a 5
```

## Pipeline Context

Not called by `recon-all`. Used in:

- Testing and validating statistical inference tools ([[mri_volcluster]], `mri_glmfit`)
- Generating null-distribution simulations for empirical cluster thresholds
- Checking interpolation behaviour in [[mri_vol2vol]] (using `--pdf delta`)
- FreeSurfer regression tests (`test.sh` files)

## Gotchas and Caveats

> [!gotcha] Default seed is time-based
> Without `--seed`, the random seed is set from the time of day, making outputs non-reproducible. Always specify `--seed` when reproducibility is needed.

> [!gotcha] Smoothing changes distribution
> Gaussian smoothing of a spatially independent field does not preserve the marginal distribution. Use `--rescale` with statistical PDFs to restore the correct variance after smoothing.

> [!gotcha] --temp overrides resolution
> When a template is provided, voxel size, direction cosines, and number of frames are taken from the template. Explicitly supplied `--res` or `--dim` flags are ignored if `--temp` is also given (except `--nframes`).

## Related Tools

- [[mri_volcluster]] — applies cluster analysis to synthetic or real statistical volumes
- [[mri_z2p]] — converts z-scores to p-values
- [[mri_concat]] — concatenate synthesised volumes into 4D series

## Confidence and Gaps

**High confidence:** supported PDFs (from synthesis dispatch in main), geometry handling, smoothing, flag list.

> [!gap] F, Fr, checker, cp, geodesic PDFs
> Several PDF modes (F, Fr, checker, cp, geodesic) were partially seen but their exact parameters were not fully traced. They exist in the source and are functional but undocumented here.
