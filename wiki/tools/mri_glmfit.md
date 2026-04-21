---
title: "mri_glmfit"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_glmfit/mri_glmfit.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit-sim]]"
  - "[[mris_preproc]]"
  - "[[mri_concat]]"
  - "[[mri_vol2surf]]"
  - "[[mri_binarize]]"
  - "[[mri_label2vol]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "MRTM1/MRTM2 kinetic modeling flag interactions not fully traced"
  - "Interaction between --sim and --C when running embedded simulation needs verification"
tags:
  - glm
  - statistics
  - group-analysis
  - surface
  - volume
  - fsgd
---

# mri_glmfit

## Summary

`mri_glmfit` is FreeSurfer's primary tool for voxel- or vertex-wise general linear model (GLM) analysis. It accepts a 4D input volume or surface overlay (where each frame corresponds to one subject or time point), a design matrix (optionally specified via an FSGD file), and one or more contrast matrices. It estimates regression coefficients at every voxel/vertex independently and computes F-statistics and p-values for each contrast. It supports ordinary least squares (OLS), weighted least squares (WLS), fixed effects analysis, per-voxel regressors, spatial smoothing, Monte Carlo simulation for multiple-comparisons correction (via [[mri_glmfit-sim]]), PCA of residuals, and kinetic modeling for PET data.

## Source Information

- **Source language:** C++
- **Source file:** `mri_glmfit/mri_glmfit.cpp`
- **Original author:** Douglas N. Greve

## Purpose and Context

`mri_glmfit` is the standard tool for group-level statistical analysis of cortical thickness, surface area, volume, fMRI contrast maps, DTI metrics, and other per-subject brain measurements mapped to a common surface or volume space. It replaces the older `mris_glm` which only operated on surfaces.

Typical workflow:
1. Use [[mri_vol2surf]] or `mris_preproc` to project each subject's data to a common surface.
2. Use [[mri_concat]] to stack per-subject volumes/surfaces into a single 4D file.
3. Run `mri_glmfit` to perform group-level statistical inference.
4. Run [[mri_glmfit-sim]] for cluster-based or FDR multiple-comparisons correction.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| `--y inputfile` | MGH/MGZ/NII/NII.GZ | 4D data; frames = subjects/observations |
| `--table stats-table` | Text | `asegstats2table` or `aparcstats2table` output |
| `--fsgd FSGDF <gd2mtx>` | FSGD text file | Group descriptor file; gd2mtx: `doss` or `dods` |
| `--X design-matrix` | Text or MATLAB .mat | Explicit design matrix (Ns × Nb) |
| `--C contrast.mtx` | Text | Contrast matrix file (J × Nb); repeatable |
| `--mask maskfile` | MGH/MGZ | Binary mask volume or surface overlay |
| `--label labelfile` | FreeSurfer label | Label used as mask on surfaces |
| `--pvr pvr1 ...` | MGH/MGZ | Per-voxel regressors (same dims as y) |
| `--w weightfile` | MGH/MGZ | Per-voxel per-input weights |
| `--yffxvar yffxvar` | MGH/MGZ | Lower-level variance for fixed effects |

## Outputs

All outputs are written to the directory specified with `--glmdir`:

| File | Description |
|------|-------------|
| `beta.mgh` | Regression coefficients $\hat{B}$ (Nb × Nv) |
| `eres.mgh` | Residual error (Ns × Nv); saved with `--eres-save` |
| `rvar.mgh` | Residual variance map |
| `rstd.mgh` | Residual standard deviation (sqrt of rvar) |
| `yhat.mgh` | Signal estimate (with `--yhat-save`) |
| `mask.mgh` | Final binary mask |
| `fwhm.dat` | Estimated FWHM of residuals (mm) |
| `cond.mgh` | Design matrix condition number at each voxel (with `--save-cond`) |
| `wn.mgh` | Normalized weights (with `--w` or `--wls`) |
| `<contrast>/gamma.mgh` | Contrast estimate $G = CB$ |
| `<contrast>/F.mgh` | F-ratio map |
| `<contrast>/sig.mgh` | Significance: $-\log_{10}(p)$ |
| `<contrast>/z.mgh` | Z-score map derived from p-value |
| `<contrast>/pcc.mgh` | Partial correlation coefficient (t-test contrasts only) |

## Mathematical Foundations

The GLM forward model (at each voxel/vertex independently):

$$\mathbf{y} = W \mathbf{X} B + \mathbf{n}$$

where:
- $\mathbf{X}$ is the $N_s \times N_b$ design matrix ($N_s$ subjects, $N_b$ regressors)
- $B$ is the $N_b \times N_v$ coefficient matrix
- $W$ is a diagonal weighting matrix (identity for OLS)
- $\mathbf{n}$ is noise

**Parameter estimation (WLS):**

$$\hat{B} = (X^T W^T W X)^{-1} X^T W^T \mathbf{y}$$

**Signal estimate and residual:**

$$\hat{\mathbf{y}} = \hat{B} X, \quad \mathbf{e} = \mathbf{y} - \hat{\mathbf{y}}$$

**Residual variance (random effects OLS):**

$$\hat{\sigma}^2 = \frac{\mathbf{e}^T \mathbf{e}}{N_s - N_b}$$

**Contrast:**

$$G = C \hat{B}$$

**F-ratio (J-row contrast):**

$$F = \frac{G^T \left[ C (X^T W^T W X)^{-1} C^T \right]^{-1} G}{J \hat{\sigma}^2}$$

For $J=1$ (t-test), $t = \text{sign}(G) \sqrt{F}$, and the output `sig.mgh` contains $-\log_{10}(p)$ from the two-tailed F distribution.

**Design matrix scaling:** By default, columns of $X$ are rescaled before inversion (to improve numerical stability with poorly-scaled designs) and then rescaled back; use `--no-rescale-x` to disable.

> [!math] FSGD design matrix construction
> With `--fsgd file doss` (Different Offset, Same Slope): first $N_\text{class}$ columns encode class offsets; remaining columns encode shared covariate slopes. With `dods` (Different Offset, Different Slope): $N_\text{class}$ offset columns plus $N_\text{class} \times N_\text{var}$ slope columns (one per variable per class).

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--glmdir` | `dir` | Output directory (required unless `--sim`) |
| `--y` | `inputfile` | 4D input data (frames = subjects) |
| `--table` | `stats-table` | Text table input (asegstats2table format) |
| `--fsgd` | `FSGDF [gd2mtx]` | FSGD file; gd2mtx: `doss` or `dods` (def: `dods`) |
| `--X` | `matrix` | Explicit design matrix (text or MATLAB .mat v4) |
| `--C` | `contrast.mtx` | Contrast matrix (repeatable) |
| `--osgm` | — | One-sample group mean: X = ones, C = [1] |
| `--no-contrasts-ok` | — | Do not fail if no contrasts specified |
| `--pvr` | `pvr1 ...` | Per-voxel regressors (repeatable) |
| `--selfreg` | `col row slice` | Self-regressor from specified voxel index |
| `--wls` | `yffxvar` | Weighted LS random effects (invert, sqrt, normalize) |
| `--yffxvar` | `yffxvar` | Lower-level variance for fixed effects |
| `--ffxdof` | `DOF` | DOF for fixed effects |
| `--ffxdofdat` | `ffxdof.dat` | Text file with fixed-effects DOF |
| `--w` | `weightfile` | Per-voxel per-input weights |
| `--w-inv` | — | Invert weights before use |
| `--w-sqrt` | — | Take square root of weights |
| `--fwhm` | `fwhm` | Smooth input by FWHM (mm) |
| `--var-fwhm` | `fwhm` | Smooth variance by FWHM (mm) |
| `--no-mask-smooth` | — | Do not mask before smoothing |
| `--no-est-fwhm` | — | Disable residual FWHM estimation |
| `--mask` | `maskfile` | Binary mask |
| `--label` | `labelfile` | Label as mask (surface only) |
| `--no-mask` / `--no-cortex` | — | Disable default cortex label mask |
| `--mask-inv` | — | Invert the mask |
| `--prune` | — | Remove voxels with any zero frame (default on) |
| `--no-prune` | — | Disable pruning |
| `--logy` | — | Take natural log of y before analysis |
| `--rm-spatial-mean` | — | Subtract masked spatial mean per frame |
| `--yhat-save` | — | Save signal estimate yhat |
| `--eres-save` | — | Save residual error eres |
| `--eres-scm` | — | Save residual spatial correlation matrix |
| `--y-out` | `y.out.mgh` | Save preprocessed input |
| `--surf` | `subject hemi [surfname]` | Specify surface for surface-based analysis |
| `--skew` | — | Compute skew and skew p-value |
| `--kurtosis` | — | Compute kurtosis and kurtosis p-value |
| `--sim` | `nulltype nsim thresh csdbase` | Run simulation for multiple comparisons |
| `--sim-sign` | `abs/pos/neg` | Sign for simulation (default: `abs`) |
| `--pca` | — | PCA/SVD of residuals |
| `--tar1` | — | Compute temporal AR1 of residual |
| `--save-cond` | — | Save design matrix condition number |
| `--voxdump` | `col row slice` | Dump single-voxel GLM and exit |
| `--seed` | `seed` | Random seed for noise synthesis |
| `--synth` | — | Replace input with Gaussian noise |
| `--mrtm1` | `RefTac TimeSec` | MRTM1 PET kinetic modeling |
| `--mrtm2` | `RefTac TimeSec k2prime` | MRTM2 PET kinetic modeling |
| `--perm-force` | — | Force permutation even with non-orthogonal X |
| `--no-rescale-x` | — | Disable design matrix column rescaling |
| `--allowsubjrep` | — | Allow repeated subject names in FSGD |
| `--allow-zero-dof` | — | Allow zero-DOF analysis |
| `--illcond` | — | Allow ill-conditioned design matrices |
| `--sim-done` | `SimDoneFile` | Create file when simulation finishes |
| `--dti` | `bvals bvecs` | DTI analysis using b-values and b-vectors |
| `--dti` | `siemensdicom` | DTI analysis extracting b-vals/vecs from DICOM |
| `--dti-X` | `X.txt` | DTI analysis with provided matrix |
| `--no-fix-vertex-area` | — | Disable vertex area fix (backward compat) |
| `--debug` | — | Enable debug output |
| `--checkopts` | — | Check options and exit |

## Configuration Interactions

- `--fsgd` and `--X` are mutually exclusive; specifying both is an error.
- `--osgm` cannot be combined with `--X` or `--C` (it constructs both automatically).
- `--wls` is shorthand for `--w <yffxvar> --w-inv --w-sqrt`; specifying both would double-apply the transformation.
- `--yffxvar` (fixed effects) is conceptually distinct from `--wls` (weighted random effects); do not combine them.
- `--fwhm` requires `--surf` for surface data; without `--surf`, volume smoothing is applied regardless of data type.
- `--var-fwhm` similarly requires `--surf` for surface data.
- `--mask` and `--label` can both be specified; the label is converted to a binary mask and intersected with any `--mask`.
- `--no-cortex` / `--no-mask` disables the automatic use of `?h.cortex.label` as a mask (which is applied by default for surface analyses).
- `--prune` (default) removes any voxel that has a zero value in any input frame; `--no-prune` keeps them. Zeros often result from failed preprocessing of individual subjects.
- `--sim` runs Monte Carlo simulations internally; the resulting CSD (cluster size distribution) file is then used by [[mri_glmfit-sim]] for thresholding. Running `--sim` from within `mri_glmfit` is the legacy approach; the recommended modern approach is to run simulation via [[mri_glmfit-sim]] as a separate step.
- `--logy` applies the natural logarithm to the input before fitting; this is useful when the dependent variable follows a log-normal distribution (e.g., volume measurements).
- `--mrtm1` and `--mrtm2` activate PET kinetic modeling modes and override the standard GLM; they require the reference tissue TAC and timing files.

## Typical Use Cases

**Surface-based cortical thickness group comparison:**
```bash
# Step 1: project cortical thickness to fsaverage (done per subject with mri_vol2surf or mris_preproc)
# Step 2: stack all subjects
mri_glmfit \
  --y thickness.stack.mgh \
  --fsgd study.fsgd dods \
  --C contrast_age.mtx \
  --C contrast_group.mtx \
  --surf fsaverage lh \
  --cortex \
  --glmdir lh.thickness.glmfit
```

**One-sample group mean (test if mean differs from zero):**
```bash
mri_glmfit \
  --y data.mgh \
  --osgm \
  --glmdir osgm.glmfit
```

**Volume-based analysis with explicit design matrix:**
```bash
mri_glmfit \
  --y subjects.mgh \
  --X design.txt \
  --C contrast1.mtx \
  --mask brain.mask.mgh \
  --glmdir results/
```

**Analysis with log-transform (e.g., subcortical volumes):**
```bash
mri_glmfit \
  --y volumes.mgh \
  --fsgd study.fsgd \
  --C age_effect.mtx \
  --logy \
  --glmdir logy.glmfit
```

## Pipeline Context

`mri_glmfit` is not called by `recon-all`. It operates post-`recon-all`, in group-level analysis workflows:

- **Upstream:** [[mri_vol2surf]], `mris_preproc`, [[mri_concat]], [[mri_label2vol]], asegstats2table/aparcstats2table
- **Downstream:** [[mri_glmfit-sim]] (for cluster-based or FDR correction), `mri_surfcluster`, `mri_volcluster`, visualization in [[freeview]]

The output directory structure is designed to be consumed by [[mri_glmfit-sim]] which reads `mri_glmfit.log` to reconstruct the original command and adds simulation-based thresholding.

## Gotchas and Caveats

> [!gotcha] Default mask on surfaces
> By default, `mri_glmfit` uses `?h.cortex.label` as a mask when analyzing surface data. Vertices outside the cortex label (e.g., medial wall) are excluded. Use `--no-cortex` to disable. This behavior is not always obvious to users.

> [!gotcha] --prune is on by default
> If any subject has a zero value at a given voxel/vertex, that location is excluded from analysis. This can silently reduce your analysis mask if some subjects have incomplete data. Use `--no-prune` with caution — zeros may be legitimate missing data.

> [!gotcha] sig.mgh is -log10(p), not p
> The significance map `sig.mgh` contains $-\log_{10}(p)$, where the sign is carried from the t-statistic (positive = activations, negative = deactivations for one-tailed tests). A value of 2.0 corresponds to $p = 0.01$.

> [!gotcha] Design matrix rescaling
> Column rescaling is applied by default to improve numerical stability of matrix inversion. This is transparent to the user (betas are rescaled back), but turning it off with `--no-rescale-x` may cause issues with badly-scaled designs.

> [!gotcha] doss vs. dods with FSGD
> The choice of `doss` vs. `dods` when using `--fsgd` determines whether classes share covariate slopes. This fundamentally changes the design matrix structure and the interpretation of contrast vectors. The ordering of regressors is critical for correct contrast specification.

> [!gotcha] --sim inside mri_glmfit is legacy
> The `--sim` flag runs Monte Carlo simulation within `mri_glmfit` itself. The preferred modern workflow is to run `mri_glmfit` without `--sim`, then run [[mri_glmfit-sim]] separately, which provides more flexibility.

## Related Tools

- [[mri_glmfit-sim]] — simulation for cluster/FDR correction of mri_glmfit output
- [[mris_preproc]] — preprocesses surface data for group analysis
- [[mri_concat]] — concatenates volumes/surfaces into 4D stack
- [[mri_vol2surf]] — projects volume data to surface
- [[mri_binarize]] — creates masks for restricting analysis
- [[mri_label2vol]] — converts labels to volumes

## Confidence and Gaps

**Confident (from source):** Mathematical model (OLS/WLS/fixed effects), all major flags, output file structure, design matrix construction from FSGD, contrast estimation and F-statistic computation, default pruning and cortex mask behavior.

**Uncertain:** Exact behavior of `--sim` when combined with `--C` vs. standalone simulation; MRTM kinetic modeling details; PCA output format.

> [!gap] MRTM kinetic modeling
> The `--mrtm1` and `--mrtm2` flags activate PET reference tissue kinetic modeling. The exact model equations, output files, and required input format for `RefTac` and `TimeSec` need detailed verification from source and/or developer documentation.
