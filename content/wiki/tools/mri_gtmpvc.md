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
last_agent_update: 2026-04-21
gaps:
  - "MRTM steady-state kinetic model details (--ss, --tsec, --tmin)"
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

$$
\mathbf{y} = X \boldsymbol{\beta} + \boldsymbol{\varepsilon}
$$

where $X$ is the GTM matrix: $X_{ij}$ is the fraction of region $j$'s activity that contributes to voxel $i$ after convolution with the PSF:

$$
X_{ij} = \frac{1}{V_j} \int_{\text{voxel } i} (s_j \ast \text{PSF})(\mathbf{r}) \, d\mathbf{r}
$$

where $s_j$ is the binary indicator function of region $j$ and $\text{PSF}$ is the scanner point spread function (modeled as a 3D isotropic or anisotropic Gaussian with given FWHM).

**GTM solution:**

$$
\hat{\boldsymbol{\beta}} = (X^T X)^{-1} X^T \mathbf{y}
$$

**RBV correction:**

Region-based Voxelwise (RBV) correction applies the GTM regional estimates as scaling factors back to the voxel level, producing a higher-resolution corrected image:

$$
y_i^\text{RBV} = y_i \cdot \frac{\sum_j X_{ij} \hat{\beta}_j}{\sum_j X_{ij} \hat{y}_j}
$$

**PSF optimization:**

An optional PSF optimization mode fits the FWHM parameters to the data by minimizing the residual between the measured PET and the GTM prediction. The optimization uses Powell's method with defaults: `nitersmax=5`, `ftol=1e-8`, `linmintol=0.001`.

## Configuration Options

### Core I/O

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i`<br>`--src` | `<vol>` | (required) | PET source volume |
| `--seg` | `<vol>` | (required) | GTM segmentation (from `mri_gtmseg`) |
| `--o` | `<dir>` | (required) | Output directory |
| `--reg` | `<file>` | — | Registration file (LTA format); cannot be register.dat |
| `--regheader`<br>`--reg-header` | — | off | Use header geometry for registration (no reg file needed) |
| `--reg-identity`<br>`--identity` | — | off | Assume PET is already in anatomical space |
| `--mask` | `<vol>` | — | Brain mask (in PET space) |
| `--auto-mask` | `<fwhm> <thresh>` | — | Automatically compute brain mask |
| `--frame` | `<n>` | all | Use only 0-based frame n of multi-frame input |
| `--last-frame` | — | — | Use only the last frame of multi-frame input |
| `--sd`<br>`-sdir` | `<dir>` | `$SUBJECTS_DIR` | Set SUBJECTS_DIR (also accepts `-SDIR`) |

### PSF / Scanner Resolution

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--psf` | `<fwhm>` | — | PSF FWHM in mm (isotropic; sets col, row, slice) |
| `--psf-col` | `<fwhm>` | — | PSF FWHM in column direction |
| `--psf-row` | `<fwhm>` | — | PSF FWHM in row direction |
| `--psf-slice` | `<fwhm>` | — | PSF FWHM in slice direction |
| `--mb-rad` | `<offset> <slope>` | — | Motion blur radial component (offset and slope) |
| `--mb-tan` | `<offset> <slope>` | — | Motion blur tangential component (offset and slope) |
| `--apply-fwhm` | `<fwhm>` | — | Apply additional Gaussian smoothing to input before fitting |
| `--no-pvc` | — | off | Disable all PVC (zeros FWHM and turns off voxel fraction correction) |

### Rescaling

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--rescale` | `<id1> [<id2> ...]` | pons (174) | Rescale output so reference region(s) have mean = `scale_refval` |
| `--no-rescale` | — | off | Disable global rescaling |
| `--scale-refval` | `<val>` | 1.0 | Target mean value for reference region after rescaling |
| `--zero-ref-region` | — | off | Zero out the reference region in output maps |
| `--no-zero-ref-region` | — | off | Keep reference region values in output (default) |

### PVC Methods

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--rbv` | — | off | Compute RBV partial volume corrected volume |
| `--rbv-res` | `<mm>` | 0 (native) | Resolution of RBV corrected volume |
| `--mg`<br>`--mgpvc` | `<gmthresh> [<refid1> ...]` | off | Muller-Gartner PVC; gmthresh is min GM PVF (0–1); optional ref seg IDs |
| `--mg-ref-cerebral-wm` | — | — | Set MG ref IDs to cerebral WM (2 and 41) |
| `--mg-ref-lobes-wm` | — | — | Set MG ref IDs to lobes WM labels (3201–3207, 4201–4207, 5001–5002) |
| `--mgx` | `<gmxthresh>` | off | GLM-based Muller-Gartner PVC |
| `--meltzer` | `<binthresh> <maskthresh> <ndil>` | off | Meltzer PVC method |
| `--lgtm` | `<nrad> <Xthresh>` | off | Linearized GTM PVC |

### Segmentation Handling

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--ctab` | `<file>` | (from seg .ctab) | Color table for custom segmentation |
| `--ctab-default` | — | — | Use default FreeSurfer tissue-type color table |
| `--default-seg-merge` | — | off | Apply default schema for merging segmentation ROIs |
| `--opt-seg-merge` | — | off | Apply optimized schema for merging segmentation ROIs |
| `--merge-hypos` | — | off | Merge LH/RH hypointensities (labels 78, 79) into single ROI (77) |
| `--merge-cblum-wm-gyri` | — | off | Merge cerebellum WM gyri (690, 691) back into cerebellum WM (7, 46) |
| `--replace` | `<src> <dst>` | — | Replace segmentation label src with dst (repeatable) |
| `--replace-file` | `<file>` | — | File containing list of label replacements (one src dst pair per line) |
| `--tt-reduce` | — | off | Reduce segmentation to tissue-type labels only |
| `--lat` | — | off | Lateralize tissue types |
| `--no-lat` | — | off | Disable tissue type lateralization |
| `--update-tt` | — | off | Update tissue types (VentralDC, BrainStem, Pons → SubcortGM) |
| `--no-update-tt` | — | off | Do not update tissue types (default) |

### FoV and Voxel Fraction

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--reduce-fov` | — | on | Reduce FoV to encompass mask bounding box |
| `--no-reduce-fov` | — | — | Disable FoV reduction |
| `--reduce-fov-eqodd` | — | — | Reduce FoV but force nc=nr and ns to be odd |
| `--npad` | `<n>` | (auto) | Override padding voxels for FoV reduction |
| `--no-tfe` | — | — | Alias for `--no-vfc` |
| `--no-vfc` | — | — | Alias for `--no-vox-frac-cor` |
| `--no-vox-frac` | — | — | Alias for `--no-vox-frac-cor` |
| `--no-vox-frac-cor` | — | off | Disable voxel fraction (tissue fraction effect) correction |
| `--segpvfres` | `<resmm>` | 0.5 | Resolution (mm) for tissue fraction computation; negative = upsampling factor |
| `--no-mask_rbv_to_brain` | — | off | Do not restrict RBV correction to brain voxels |

### Kinetic Modelling (KM / Steady State)

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--km-ref` | `<id1> [<id2> ...]` | — | Reference region IDs for kinetic model TAC (written to CSV/TSV) |
| `--km-hb` | `<id1> [<id2> ...]` | — | High-binding region IDs for kinetic model TAC |
| `--tsec` | `<file>` | — | Frame timing in seconds (text file); converted to minutes |
| `--tmin` | `<file>` | — | Frame timing in minutes (text file) |
| `--ss` | `<bpc> <scale> <dcf>` | off | Steady-state analysis: blood plasma concentration, unit scale, decay correction factor; also requires `--km-ref`; turns off rescaling |

### PSF Optimization

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--opt` | `<schema>` | off | Optimize PSF parameters using Powell's method; schema is an integer specifying the parameter model (1=ISO_3D, 2=ISO_2D, 3=ISO_1D, 4=ISO_3D_MB, ..., 9=ISO_2D_G2) |
| `--opt-gm` | — | — | Optimize PSF using GM residual variance as cost |
| `--opt-brain` | — | — | Optimize PSF using brain residual variance as cost |
| `--opt-l1-gm` | — | — | Optimize PSF using L1-norm cost within GM |
| `--opt-l1-brain` | — | — | Optimize PSF using L1-norm cost within brain |
| `--opt-tol` | `<nitersmax> <ftol> <linmintol>` | 5 1e-8 0.001 | Powell optimization tolerances and max iterations |
| `--opt-beta` | `<file>` | — | Initialize PSF optimization from a beta file (ideal betas) |
| `--g2` | `<crFWHM> <sFWHM> <w1> <crFWHM2>` | — | Two-Gaussian in-plane kernel: FWHM1, slice FWHM, weight of first component, FWHM2 |

### Synthesis and Simulation

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--synth` | `<betafile> <col> <row> <slice> <mbslope> <seed> <nreps>` | — | Synthesize PET from segmentation using beta file and PSF parameters |
| `--synth-only` | — | off | Synthesize and exit (implies `--synth-save`) |
| `--synth-save`<br>`--save-synth` | — | off | Save synthesized volume to `outdir/synth.nii.gz` |
| `--sim-anat-seg` | — | off | Simulate anatomical segmentation from GTM estimates (writes `aux/anat.seg.sim.nii.gz`) |

### Output Saving

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--save-input` | — | off | Save rescaled input as `input.rescaled.nii.gz` |
| `--save-eres` | — | off | Save residuals (`eres.nii.gz`) |
| `--save-yhat` | — | off | Save GTM signal estimate (`yhat.nii.gz`) |
| `--save-yhat0` | — | off | Save yhat before PSF smoothing (`yhat0.nii.gz`) |
| `--save-yhat-full-fov` | — | off | Save yhat restored to full FoV (`yhat.fullfov.nii.gz`; only meaningful if FoV was reduced) |
| `--save-yhat-with-noise` | `<seed> <nreps>` | off | Save yhat with added noise; seed < 0 uses time-of-day seed |
| `--save-rbv-seg` | — | off | Save RBV segmentation to aux directory |
| `--save-text` | — | off | Save demeaned GTM values as text files named by seg label |
| `--gtmmat` | — | off | Compute and save GTM matrix (and inverse) to aux directory |
| `--no-gtmmat` | — | off | Do not compute GTM matrix (default) |
| `--X` | — | off | Save design matrix X in MATLAB4 format (`X.mat`) |
| `--X0` | — | off | Save initial X matrix in MATLAB4 format (`X0.mat`) |
| `--y` | — | off | Save y (measured PET) in MATLAB4 format (`y.mat`) |
| `--beta` | — | off | Save beta solution in MATLAB4 format (`beta.mat`) |

### Contrasts and Diagnostics

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--C` | `<file>` | — | Contrast matrix file (ASCII text, rows=contrasts, cols=segs) |
| `--rvar-only` | — | off | Compute only residual variance and exit |
| `--no-gm-rvar` | — | off | Do not compute GM residual variance |
| `--gdiag` | `<n>` | 0 | Set Gdiag diagnostic level |
| `--vg-thresh` | `<thresh>` | 1e-3 | Threshold for volume geometry equality check (LTA src/dst mismatch tolerance) |

### Transform Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--xfm` | `<Dcol> <Dslice> <Drow> <Rcol> <Rslice> <Rrow>` | — | Apply affine perturbation to registration (translations mm, rotations degrees) |

### Threading

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--nthreads`<br>`--threads` | `<N>` | 1 | OpenMP thread count |
| `--max-threads` | — | — | Use all available OpenMP threads |
| `--max-threads-1`<br>`--max-threads-minus-1` | — | — | Use (max − 1) OpenMP threads |

### Memory / Chunking

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--chunk` | — | off | Enable MRI chunked memory mode (sets `FS_USE_MRI_CHUNK=1`) |
| `--no-chunk` | — | — | Disable MRI chunked memory mode (default) |

### General

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--debug` | — | off | Enable debug output |
| `--checkopts` | — | off | Check options and exit without running |

## Configuration Interactions

- `--rbv` and `--mg` can both be specified; they produce different corrected volume types.
- `--psf` must be specified (or `--opt` used) for meaningful results; without a PSF model, the GTM cannot account for spill-in/spill-out.
- `--rescale` normalizes all regional estimates to a reference region (default: pons, label 174). Use `--no-rescale` to disable.
- `--auto-mask` takes two arguments: FWHM and threshold; it derives a mask from the segmentation.
- `--reduce-fov` (on by default) crops the computation to the brain bounding box for speed.
- `--reg-identity` / `--identity` assumes PET and MRI are already in the same space (no registration needed).
- Voxel fraction correction is on by default; use `--no-vox-frac-cor` (or `--no-vox-frac`, `--no-tfe`, `--no-vfc`) to disable.
- `--ss` requires `--km-ref` and automatically disables rescaling.
- `--opt` takes an integer schema argument (not a bare flag). Schema 1 = isotropic 3D, 2 = isotropic 2D, 3 = anisotropic 1D, 4–8 = motion-blur variants, 9 = 2D two-Gaussian.
- `--synth-only` implies `--synth-save`.

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
  --opt 1 \
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

> [!gotcha] `--opt` requires a schema integer argument
> Unlike most boolean flags, `--opt` takes a required integer argument specifying the optimization schema (e.g., `--opt 1` for isotropic 3D). Passing `--opt` without an argument will error.

> [!gotcha] `--reg` does not accept register.dat format
> The registration file must be in LTA format. The source explicitly rejects `register.dat`-style matrices with an error message.

## Related Tools

- [[mri_gtmseg]] — creates the anatomical segmentation required by mri_gtmpvc
- [[mri_vol2surf]] — projects volumetric PET data to surface for visualization
- [[mri_label2vol]] — label-to-volume conversion for ROI masks

## Confidence and Gaps

**Confident (from source):** GTM model and OLS solution, RBV and Muller-Gartner modes, PSF optimization via Powell, default pons rescaling (label 174), FoV reduction (default on), voxel fraction correction (default on), segpvfresmm default 0.5, optimization defaults (ftol=1e-8, linmintol=0.001, nitersmax=5), full flag list verified against `parse_commandline()`.

**Uncertain:** Exact output file contents for all save flags; MRTM steady-state kinetic model mathematical details.

> [!gap] MRTM steady-state mode
> `--ss` takes three arguments (bpc, scale, dcf) and sets `gtm->DoSteadyState=1` while disabling rescaling. It requires `--km-ref`. The full kinetic model mathematics are implemented in the GTM library (`gtm.h`) and not verified from the source alone.

> [!note] Audit noise: `--tt-update`
> An automated audit may flag `--tt-update` as missing. This name appears only in `print_usage()` at source line 1774 but is not handled by the option parser — there is no matching `strcmp` or `strcasecmp` call. Passing `--tt-update` produces an "Option unknown" error.
