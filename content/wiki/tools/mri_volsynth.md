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
last_agent_update: 2026-04-21
gaps:
  - "The --pdf F, Fr, geodesic modes were not fully documented."
  - "The --hsynth flag writes output directly and exits; its interaction with other flags is not fully traced."
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

| Flag | Default | Description |
|------|---------|-------------|
| `--temp templatevol` | — | Template volume (copies header geometry; overrides `--dim` and `--res`) |
| `--dim Nc Nr Ns [Nf]` | — | Specify dimensions directly |
| `--res Xc Xr Xs [Xt]` | `1 1 1 2000` | Voxel size in mm (and TR in ms) |
| `--c_ras Cx Cy Cz` | `0 0 0` | Set centre RAS coordinate |
| `--cdircos dx dy dz` | `1 0 0` | Column direction cosines |
| `--rdircos dx dy dz` | `0 1 0` | Row direction cosines |
| `--sdircos dx dy dz` | `0 0 1` | Slice direction cosines |

## Outputs

| Flag | Default | Description |
|------|---------|-------------|
| `--vol outfile` / `--o outfile` | — | Output synthesised volume |
| `--sum2 sumfile` | — | Write sum-of-squares over frames |

## Mathematical Foundations

**Supported PDFs (`--pdf name`):**

| Name | Distribution |
|------|------------|
| `gaussian` (default) | $\mathcal{N}(\mu, \sigma^2)$, configurable via `--gmean` and `--gstd` |
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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--vol` / `--o` | `outfile` | — | Output volume filename |
| `--temp` / `--template` | `templatevol` | — | Template for geometry |
| `--dim` | `Nc Nr Ns [Nf]` | — | Volume dimensions |
| `--nframes` | `Nf` | from template | Number of frames |
| `--res` | `Xc Xr Xs [Xt]` | `1 1 1 2000` | Voxel resolution in mm (Xt is TR in ms) |
| `--pdf` | `name` | `gaussian` | Probability distribution (see table above) |
| `--gmean` | `mean` | `0` | Mean for Gaussian |
| `--gstd` | `std` | `1` | Std dev for Gaussian |
| `--val-a` | `val` | `1` | Primary value (const PDF, delta value) |
| `--val-b` | `val` | `0` | Off-value for delta PDF |
| `--dof-num` | `dof` | `2` | Numerator DOF for F |
| `--dof-den` / `--dof` | `dof` | `20` | Denominator DOF for t, chi2, F |
| `--fwhm` | `fwhm` | `0` (off) | FWHM for spatial Gaussian smoothing (mm) |
| `--fft` | — | off | Use FFT for Gaussian smoothing |
| `--rescale` | — | off | Rescale after smoothing (statistical PDFs only) |
| `--norescale` | — | off | Explicitly disable rescale (overrides `--rescale`) |
| `--nogmnnorm` | — | off | Disable normalisation of Gaussian smoothing kernel |
| `--delta-crsf` | `c r s f` | centre of volume | Location of delta voxel |
| `--delta-val` | `val` | `1` | Value of the impulse voxel for delta PDF |
| `--delta-val-off` | `offval` | `0` | Background value for delta PDF |
| `--sphere-center` | `c r s` | centre of volume | Centre of sphere mask |
| `--vox-radius` / `--radius` | `vox` | — | Sphere radius in voxels |
| `--mm-radius` | `mm` | — | Sphere radius in mm |
| `--seed` | `seed` | from clock | Random seed |
| `--seedfile` | `file` | — | Write seed value to this file |
| `--spike` | `tp` | — | Add spike at time point tp (for testing spike detection) |
| `--curv` | `subject hemi` | — | Output as surface curvature format (uses lh.thickness as template) |
| `--sum2` | `file` | — | Output sum-of-squares |
| `--no-output` | — | off | Do not write output volume (for testing only) |
| `--hsc` | `min max` | off | Apply heteroscedastic noise scaling (multiply each frame by random in [min, max]) |
| `--hsynth` | `eres mask DoTNorm out` | — | Synthesise heteroscedastic noise volume from residual image and mask; writes directly to `out` and exits |
| `--abs` | — | off | Compute absolute value |
| `--p0` | `x y z` | — | Set p0 origin instead of CRAS |
| `--c_ras` | `x y z` | `0 0 0` | Set centre RAS |
| `--cdircos` | `dx dy dz` | `1 0 0` | Column direction cosines |
| `--rdircos` | `dx dy dz` | `0 1 0` | Row direction cosines |
| `--sdircos` | `dx dy dz` | `0 0 1` | Slice direction cosines |
| `--precision` | `prec` | from template | Output data type (uchar, short, int, float) |
| `--TR` | `ms` | `2000` | TR in milliseconds |
| `--offset` | — | off | Use template as intensity offset |
| `--offset-mid` | — | off | Use middle frame of template as intensity offset |
| `--bb` | `c r s dc dr ds` | — | Bounding box (inside=ValA, outside=ValB) |
| `--grid` | `dcol drow dslice` | `8 8 2` | Grid pattern spacing |
| `--cube` | `edgemm` | — | Cube pattern with given edge length in mm |
| `--checker` | — | — | Checkerboard pattern |
| `--cp` | `control.dat` | — | Set control point voxels to 1 |
| `--ctab` | `colortable` | — | Embed colour table in output |
| `--dim-surf` | `surffile` | — | Set dimensions to nvertices x 1 x 1 |
| `--vox-size` | `dc dr ds` | — | Change template voxel resolution and dimensions |
| `--debug` | — | off | Debug output |
| `--version` | — | — | Print version |

## Configuration Interactions

- `--temp` overrides `--dim` and `--res`; the output geometry is taken from the template volume.
- `--nframes` overrides the frame count from `--temp`.
- `--fwhm` and `--fft` interact: `--fft` applies Gaussian smoothing in Fourier space instead of real space (faster for large volumes).
- `--rescale` is meaningful only for statistical PDFs (z, t, chi2, F, Fr) and should be used with `--fwhm` to maintain correct marginal distributions after smoothing.
- `--seed` and `--seedfile` are alternative seed sources; `--seedfile` takes precedence.
- `--curv subject hemi` mode takes subject and hemisphere as positional arguments (not as separate --subject/--hemi flags) and outputs in surface overlay format rather than volume format.

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
- Checking interpolation behaviour in [[mri_vol2vol]] (using --pdf delta)
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
