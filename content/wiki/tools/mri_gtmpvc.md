---
title: "mri_gtmpvc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_gtmpvc/mri_gtmpvc.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_gtmseg]]"
  - "[[mri_vol2surf]]"
  - "[[mri_label2vol]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full flag list requires help output verification"
  - "MRTM steady-state kinetic model details"
  - "RBV (Region-based Voxelwise) correction mathematical details"
tags:
  - pet
  - partial-volume-correction
  - gtm
  - quantification
---

# mri_gtmpvc

## Summary

`mri_gtmpvc` performs partial volume correction (PVC) on PET data using the Geometric Transfer Matrix (GTM) method, along with Muller-Gartner (MG) and Region-based Voxelwise (RBV) methods. It takes a PET image registered to an MRI-derived segmentation (produced by [[mri_gtmseg]]), models the point spread function (PSF) of the PET scanner, and estimates the true activity concentration in each brain region by solving a linear system that accounts for cross-contamination between adjacent regions due to the finite resolution of PET.

## Source Information

- **Source language:** C++
- **Source file:** `mri_gtmpvc/mri_gtmpvc.cpp`
- **Original author:** Douglas N. Greve
- **Dependencies:** `gtm.h` (GTM library)

## Purpose and Context

PET images suffer from partial volume effects (PVE) because the scanner's point spread function (PSF, characterized by the FWHM) is typically larger than many brain regions of interest. Voxels near region boundaries contain signal from multiple regions ("spill-in" and "spill-out"), causing true activity to be underestimated in small regions and overestimated in adjacent areas.

`mri_gtmpvc` addresses this by:
1. Using an anatomical segmentation from FreeSurfer (`mri_gtmseg`) to define ROIs.
2. Modeling how each ROI's activity is spatially blurred by the PSF into every other ROI (forming the Geometric Transfer Matrix).
3. Solving for the true regional activities by inverting the GTM system.
4. Optionally applying voxelwise RBV or Muller-Gartner correction for higher spatial resolution.

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| PET source volume | `--i` or `--src` | PET image (registered to MRI space) |
| GTM segmentation | `--seg` | Segmentation from `mri_gtmseg` |
| Registration | `--reg` | Registration from PET to MRI (LTA or `.dat`) |
| Mask volume | `--mask` | Binary brain mask |

Defaults: rescaling to pons (label 174), FoV reduction enabled, voxel fraction correction enabled.

## Outputs

| Output | Description |
|--------|-------------|
| `gtm.stats.dat` | GTM-corrected regional activity values |
| `gtm.mat` | GTM matrix and corrected betas (MATLAB format) |
| `rbv.nii.gz` | RBV-corrected PET volume (if `--rbv`) |
| `mgpvc.nii.gz` | Muller-Gartner corrected volume (if `--mg`) |
| `yhat.nii.gz` | PET signal estimate based on GTM fit |
| `eres.nii.gz` | Residuals (PET - yhat) |
| `seg.nii.gz` | Output segmentation in PET space |
| `xtx.mat` | $X^T X$ matrix for the GTM system |

All outputs are written to the directory specified by `--o`.

## Mathematical Foundations

**GTM model:**

Let $\beta_j$ be the true (corrected) mean activity in region $j$, and $y_i$ be the measured PET value at voxel $i$. The GTM models the measured data as:

$$\mathbf{y} = X \boldsymbol{\beta} + \boldsymbol{\varepsilon}$$

where $X$ is the GTM matrix: $X_{ij}$ is the fraction of region $j$'s activity that contributes to voxel $i$ after convolution with the PSF:

$$X_{ij} = \frac{1}{V_j} \int_{\text{voxel } i} (s_j \ast \text{PSF})(\mathbf{r}) \, d\mathbf{r}$$

where $s_j$ is the binary indicator function of region $j$ and $\text{PSF}$ is the scanner point spread function (modeled as a 3D isotropic or anisotropic Gaussian with given FWHM).

**GTM solution:**

$$\hat{\boldsymbol{\beta}} = (X^T X)^{-1} X^T \mathbf{y}$$

**RBV correction:**

Region-based Voxelwise (RBV) correction applies the GTM regional estimates as scaling factors back to the voxel level, producing a higher-resolution corrected image:

$$y_i^\text{RBV} = y_i \cdot \frac{\sum_j X_{ij} \hat{\beta}_j}{\sum_j X_{ij} \hat{y}_j}$$

**PSF optimization:**

An optional PSF optimization mode fits the FWHM parameters to the data by minimizing the residual between the measured PET and the GTM prediction. The optimization uses Powell's method.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--i` / `--src` | `<vol>` | PET source volume |
| `--seg` | `<vol>` | GTM segmentation (from `mri_gtmseg`) |
| `--o` | `<dir>` | Output directory |
| `--reg` | `<file>` | Registration file (LTA or register.dat) |
| `--mask` | `<vol>` | Brain mask |
| `--psf` | `<fwhm>` | PSF FWHM (mm, isotropic) |
| `--rbv` | — | Compute RBV partial volume corrected volume |
| `--mg` | — | Compute Muller-Gartner corrected volume |
| `--auto-mask` | — | Automatically create brain mask |
| `--rescale` | `<refids>` | Rescale to reference region(s) |
| `--no-rescale` | — | Disable rescaling |
| `--reduce-fov` | — | Reduce FOV to ROI bounding box (default on) |
| `--no-reduce-fov` | — | Disable FOV reduction |
| `--voxfrac-cor` | — | Apply voxel fraction correction (default on) |
| `--no-voxfrac-cor` | — | Disable voxel fraction correction |
| `--merge-hypos` | — | Merge hypointensities into white matter |
| `--save-yhat` | — | Save signal estimate |
| `--save-input` | — | Save input PET in output directory |
| `--save-eres` | — | Save residuals |
| `--save-rbvseg` | — | Save RBV segmentation |
| `--synth` | — | Synthesize PET from segmentation (test) |
| `--synth-only` | — | Synthesize and exit without fitting |
| `--synth-psf-fwhm` | `col row slice` | FWHM for synthesis PSF |
| `--opt` | — | Optimize PSF parameters |
| `--gtm-mat` | — | Save GTM matrix |
| `--save-x` | — | Save X matrix |
| `--reg-identity` | — | Use identity registration |
| `--lat-tt` | — | Lateralize tissue types |
| `--frame` | `<n>` | Use only frame n of multi-frame input |
| `--tt-reduce` | — | Reduce number of tissue types |
| `--zero-ref-region` | — | Zero out reference region after solving |
| `--nthreads` | `<N>` | OpenMP threads |
| `--debug` | — | Debug output |

## Configuration Interactions

- `--rbv` and `--mg` can both be specified; they produce different corrected volume types.
- `--psf` must be specified (or `--opt` used) for meaningful results; without a PSF model, the GTM cannot account for spill-in/spill-out.
- `--rescale` normalizes all regional estimates to a reference region (default: pons, label 174). Use `--no-rescale` to disable.
- `--auto-mask` is useful when no explicit mask is available; it derives a mask from the segmentation.
- `--reduce-fov` (on by default) crops the computation to the brain bounding box for speed.
- `--reg-identity` assumes PET and MRI are already in the same space (no registration needed).

## Typical Use Cases

**Standard GTM PVC on a PET image:**
```bash
mri_gtmpvc \
  --i pet.nii.gz \
  --seg gtmseg.mgz \
  --reg pet2mri.lta \
  --psf 6 \
  --rbv \
  --o gtm.pvc/
```

**With PSF optimization (scanner FWHM unknown):**
```bash
mri_gtmpvc \
  --i pet.nii.gz \
  --seg gtmseg.mgz \
  --reg pet2mri.lta \
  --opt \
  --rbv \
  --o gtm.pvc.opt/
```

## Pipeline Context

`mri_gtmpvc` is not called by `recon-all`. It is part of the PET/MRI co-analysis pipeline:

1. Run `recon-all` to produce the FreeSurfer subject directory
2. Run [[mri_gtmseg]] to create the GTM segmentation
3. Register PET to MRI (e.g., with `bbregister` or `mri_coreg`)
4. Run `mri_gtmpvc` for partial volume correction

## Gotchas and Caveats

> [!gotcha] PSF must reflect actual scanner resolution
> The FWHM specified via `--psf` should match the actual spatial resolution of the PET scanner. An incorrect FWHM will produce biased corrections — too small a FWHM underestimates PVE; too large overcorrects.

> [!gotcha] GTM assumes uniform activity within each ROI
> The GTM method assumes each anatomical region has a single uniform activity value. This is the classic GTM assumption and may not hold for heterogeneous regions (e.g., cortex). RBV relaxes this at the voxel level.

> [!gotcha] Registration accuracy is critical
> Errors in the PET-to-MRI registration directly translate to incorrect GTM correction. Verify registration quality before running PVC.

> [!gotcha] Default rescaling to pons
> By default, `mri_gtmpvc` rescales regional estimates so that the pons (CMA label 174) has activity = 1.0. This normalizes for global tracer uptake differences. Use `--no-rescale` if this is not appropriate for your tracer.

## Related Tools

- [[mri_gtmseg]] — creates the anatomical segmentation required by mri_gtmpvc
- [[mri_vol2surf]] — projects volumetric PET data to surface for visualization
- [[mri_label2vol]] — label-to-volume conversion for ROI masks

## Confidence and Gaps

**Confident (from source):** GTM model and OLS solution, RBV and Muller-Gartner modes, PSF optimization via Powell, default pons rescaling, FoV reduction, voxel fraction correction.

**Uncertain:** Full flag list requires help output verification; MRTM steady-state kinetic model details; exact output file contents for all save flags.

> [!gap] MRTM steady-state mode
> The source references `gtm->DoSteadyState` but its CLI activation and mathematical formulation are not fully traced.
