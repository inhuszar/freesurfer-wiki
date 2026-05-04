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
  - "[[fsgd-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
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

`mri_glmfit` is FreeSurfer's primary tool for voxel- or vertex-wise general linear model (GLM) analysis. It accepts a 4D input volume or surface overlay (where each frame corresponds to one subject or time point), a design matrix (optionally specified via an [[fsgd-format|FSGD]] file), and one or more contrast matrices. It estimates regression coefficients at every voxel/vertex independently and computes F-statistics and p-values for each contrast. It supports ordinary least squares (OLS), weighted least squares (WLS), fixed effects analysis, per-voxel regressors, spatial smoothing, Monte Carlo simulation for multiple-comparisons correction (via [[mri_glmfit-sim]]), PCA of residuals, and kinetic modeling for PET data.

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
| `--fsgd FSGDF <gd2mtx>` | [[fsgd-format\|FSGD]] text file | Group descriptor file; gd2mtx: `doss` or `dods` |
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

$$
\mathbf{y} = W \mathbf{X} B + \mathbf{n}
$$

where:
- $\mathbf{X}$ is the $N_s \times N_b$ design matrix ($N_s$ subjects, $N_b$ regressors)
- $B$ is the $N_b \times N_v$ coefficient matrix
- $W$ is a diagonal weighting matrix (identity for OLS)
- $\mathbf{n}$ is noise

**Parameter estimation (WLS):**

$$
\hat{B} = (X^T W^T W X)^{-1} X^T W^T \mathbf{y}
$$

**Signal estimate and residual:**

$$
\hat{\mathbf{y}} = \hat{B} X, \quad \mathbf{e} = \mathbf{y} - \hat{\mathbf{y}}
$$

**Residual variance (random effects OLS):**

$$
\hat{\sigma}^2 = \frac{\mathbf{e}^T \mathbf{e}}{N_s - N_b}
$$

**Contrast:**

$$
G = C \hat{B}
$$

**F-ratio (J-row contrast):**

$$
F = \frac{G^T \left[ C (X^T W^T W X)^{-1} C^T \right]^{-1} G}{J \hat{\sigma}^2}
$$

For $J=1$ (t-test), $t = \text{sign}(G) \sqrt{F}$, and the output `sig.mgh` contains $-\log_{10}(p)$ from the two-tailed F distribution.

**Design matrix scaling:** By default, columns of $X$ are rescaled before inversion (to improve numerical stability with poorly-scaled designs) and then rescaled back; use `--no-rescale-x` to disable.

> [!math] [[fsgd-format|FSGD]] design matrix construction
> With `--fsgd file doss` (Different Offset, Same Slope): first $N_\text{class}$ columns encode class offsets; remaining columns encode shared covariate slopes. With `dods` (Different Offset, Different Slope): $N_\text{class}$ offset columns plus $N_\text{class} \times N_\text{var}$ slope columns (one per variable per class).

## Configuration Options

### Input Data

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--y` | `inputfile` | required | 4D input data (frames = subjects) |
| `--table` | `stats-table` | — | Text table input (asegstats2table/aparcstats2table format); disables FWHM estimation and pruning |
| `--o`<br>`--glmdir` | `dir` | required | Output directory for all GLM results |

### Design Matrix

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fsgd` | `FSGDF [gd2mtx]` | — | [[fsgd-format\|FSGD]] file; gd2mtx: `doss` or `dods` (def: `dods`) |
| `--X` | `matrix` | — | Explicit design matrix (text or MATLAB .mat v4) |
| `--C` | `contrast.mtx` | — | Contrast matrix (repeatable) |
| `--osgm` | — | `off` | One-sample group mean: X = ones, C = [1]; disables PCC |
| `--no-contrasts-ok` | — | `off` | Do not fail if no contrasts specified |
| `--fsgd-rescale` | — | `off` | Rescale [[fsgd-format\|FSGD]] continuous variables |
| `--allowsubjrep` | — | `off` | Allow repeated subject names in [[fsgd-format\|FSGD]] (must appear before `--fsgd`) |

### Per-Voxel Regressors and Weights

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--pvr` | `pvr1 ...` | — | Per-voxel regressors (repeatable); disables PCC. The help text shows `--pvr pvr1 <--prv pvr2 ...>`, indicating `--prv` as a stylistic alternative name, but only `--pvr` is handled in the parser. |
| `--selfreg` | `col row slice` | — | Self-regressor from specified voxel index |
| `--wls` | `yffxvar` | — | Weighted LS (sets `--w`, `--w-inv`, `--w-sqrt`); disables PCC |
| `--yffxvar` | `yffxvar` | — | Lower-level variance for fixed effects |
| `--ffxdof` | `DOF` | — | DOF for fixed effects |
| `--ffxdofdat` | `ffxdof.dat` | — | Text file with fixed-effects DOF |
| `--w` | `weightfile` | — | Per-voxel per-input weights |
| `--w-inv` | — | `off` | Invert weights before use |
| `--w-sqrt` | — | `off` | Take square root of weights |

### Smoothing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fwhm`<br>`--smooth` | `fwhm` | — | Smooth input by FWHM (mm); `--smooth` is a parsed alias for `--fwhm` |
| `--var-fwhm`<br>`--var-smooth` | `fwhm` | — | Smooth variance by FWHM (mm); `--var-smooth` is a parsed alias for `--var-fwhm` |
| `--no-mask-smooth` | — | `off` | Do not mask before smoothing |
| `--no-est-fwhm`<br>`--no-fwhm-est` | — | `off` | Disable residual FWHM estimation (FWHM estimation is on by default) |
| `--acf` | `nhops` | — | Compute spatial autocorrelation function averaged out to nhops |

### Masking

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mask` | `maskfile` | — | Binary mask; clears any `--label` or cortex label |
| `--label` | `labelfile` | — | Label as mask (surface only); clears any `--mask` or cortex label |
| `--no-mask`<br>`--no-cortex` | — | `off` | Disable default cortex label mask |
| `--cortex` | — | `off` | Explicitly use `?h.cortex.label` as mask (applied automatically for surface analyses) |
| `--mask-inv` | — | `off` | Invert the mask |
| `--prune` | — | `on` | Remove voxels with any zero frame across inputs |
| `--no-prune` | — | `off` | Disable pruning |
| `--prune_thr` | `threshold` | `FLT_MIN` | Threshold for pruning (voxels below threshold in any frame are pruned); implies `--prune` |

### Input Preprocessing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--logy` | — | `off` | Take natural log of y before analysis |
| `--no-logy` | — | `off` | Explicitly disable log transform (for clarity when default is off) |
| `--rm-spatial-mean` | — | `off` | Subtract masked spatial mean per frame |
| `--asl` | — | `off` | Treat input as ASL (alternating label/control); label frame value = 1, control = 0 |
| `--asl-rev` | — | `off` | ASL with reversed label/control order (label = 0, control = 1) |
| `--exclude-frame` | `frameno` | — | Exclude a single frame (0-indexed) from analysis |
| `--exclude-frame-file` | `file` | — | Text file listing frame indices to exclude (one per line) |
| `--rand-split` | `NSplits SplitNo` | — | Randomly split input into NSplits groups; use group SplitNo (0-indexed) |
| `--permute-input` | — | `off` | Randomly permute input frames before fitting (for testing) |

### Output Control

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--yhat-save`<br>`--save-yhat` | — | `off` | Save signal estimate yhat |
| `--eres-save`<br>`--save-eres` | — | `off` | Save residual error eres |
| `--eres-scm` | — | `off` | Save residual error spatial correlation matrix (large file) |
| `--y-out` | `y.out.mgh` | — | Save preprocessed input after all pre-processing |
| `--dontsave` | — | `off` | Do not save any output files (used internally by `--sim`) |
| `--dontsavewn` | — | `off` | Do not save the normalized weights file (wn.mgh) |
| `--save-cond` | — | `off` | Save design matrix condition number at each voxel |
| `--save-fwhm-map` | — | `off` | Save voxel-wise map of FWHM estimates |
| `--maxvox` | `basename` | — | Save max voxel coordinates for each contrast to `<basename>-<contrast>.dat` |
| `--beta` | `file` | — | Explicit path for beta output file |
| `--rvar` | `file` | — | Explicit path for rvar output file |
| `--yhat` | `file` | — | Explicit path for yhat output file |
| `--eres` | `file` | — | Explicit path for eres output file |
| `--nii` | — | `off` | Force NIfTI (.nii) output format |
| `--nii.gz` | — | `off` | Force gzipped NIfTI (.nii.gz) output format |
| `--mgh` | — | `off` | Force MGH output format |
| `--mgz` | — | `off` | Force MGZ output format |

### Surface Analysis

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--surf`<br>`--surface` | `subject hemi [surfname]` | — | Specify surface for surface-based analysis (default surfname: `white`) |

### Statistical Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--pcc` | — | `on` | Compute partial correlation coefficient (t-contrasts only) |
| `--no-pcc` | — | `off` | Disable partial correlation coefficient computation |
| `--fdr` | — | `off` | Perform FDR correction on output sig maps |
| `--fisher` | — | `off` | Apply Fisher z-transform to correlation outputs |
| `--skew` | — | `off` | Compute skew and skew p-value |
| `--kurtosis` | — | `off` | Compute kurtosis and kurtosis p-value |
| `--sig-double` | — | `on` | Compute sig = -log10(p) using double precision p-value |
| `--no-sig-double` | — | `off` | Compute sig from float precision p-value instead of double |
| `--no-sig-link` | — | `off` | Disable symbolic link creation for sig maps |
| `--no-rescale-x` | — | `off` | Disable design matrix column rescaling (rescaling is on by default) |
| `--rescale-x` | — | `on` | Enable design matrix column rescaling (explicit form; rescaling is on by default) |
| `--allow-zero-dof` | — | `off` | Allow zero-DOF analysis |
| `--illcond` | — | `off` | Allow ill-conditioned design matrices (condition > 10000) |
| `--no-illcond` | — | `off` | Explicitly reject ill-conditioned matrices (default behavior) |
| `--distance` | — | `off` | Compute distance map from mask boundary |
| `--scale-by-etiv` | — | `off` | Normalise values in a stats table (`--table`) input by eTIV; only meaningful with `--table` |
| `--qa` | — | `off` | Quality assurance mode: enables `--tar1` (temporal AR1) and sets an internal QA flag |

### PCA / Temporal Analysis

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--pca` | — | `off` | PCA/SVD of residuals |
| `--tar1` | — | `off` | Compute temporal AR1 of residual |
| `--no-tar1` | — | `off` | Disable temporal AR1 computation |

### Simulation (Multiple Comparisons)

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sim` | `nulltype nsim thresh csdbase` | — | Run Monte Carlo simulation; nulltype: `perm`, `mc-full`, `mc-z`; sets `--dontsave` |
| `--sim-sign` | `abs/pos/neg` | `abs` | Sign constraint for simulation (applies to t-tests only) |
| `--sim-done` | `SimDoneFile` | — | Create file when simulation finishes |
| `--perm-force` | — | `off` | Force permutation even when design matrix is not orthogonal |
| `--perm-1` | — | `off` | One-sample permutation (sign flip) test |
| `--perm-nonstatcor` | — | `off` | Apply non-stationarity correction during permutation |
| `--perm-pvr-override` | — | `off` | Override PVR exclusion during permutation |
| `--no-perm-pvr-override` | — | `off` | Enforce PVR exclusion during permutation (default behavior) |
| `--diag-cluster` | — | `off` | Save sig volume and exit from first simulation loop (diagnostic) |
| `--allowdiag` | — | `off` | Allow diagonal design matrices in cluster analysis |
| `--uniform` | `min max` | — | Use uniform distribution for noise synthesis (with `--synth`) instead of Gaussian |
| `--frame-mask` | `file` | — | Binary mask over frames (time points) |

### Noise Synthesis

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--seed` | `seed` | random | Random seed for noise synthesis |
| `--synth` | — | `off` | Replace input with Gaussian noise |

### PET Kinetic Modeling

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mrtm1` | `RefTac TimeSec` | — | MRTM1 PET kinetic modeling (multilinear reference tissue model 1) |
| `--mrtm2` | `RefTac TimeSec k2prime` | — | MRTM2 PET kinetic modeling; k2prime may be a value or a file path |
| `--logan` | `AIF TimeSec tstar` | — | Invasive Logan graphical analysis; AIF may be a text file or TSV with time column |
| `--logan-ma1` | `AIF TimeSec tstar` | — | Logan invasive using Ichise 2002 MA1 method |
| `--patlak` | `AIF TimeSec tstar` | — | Patlak invasive graphical analysis |
| `--bp-clip-neg` | — | `off` | Set negative binding potential (BP) voxels to 0 |
| `--bp-clip-max` | `maxval` | `off` | Clip BP voxels above maxval to maxval |

### DTI Analysis

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--dti` | `bvals bvecs` | — | DTI analysis using b-values and b-vectors files |
| `--dti` | `siemensdicom` | — | DTI analysis extracting b-vals/vecs from Siemens DICOM header |
| `--dti-X` | `X.txt` | — | DTI analysis with provided design matrix |

### Diagnostics and Testing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--voxdump` | `col row slice` | — | Dump single-voxel GLM and exit |
| `--profile` | `niters` | — | Benchmark GLM speed over niters iterations and exit |
| `--resynthtest` | `niters` | — | Test GLM correctness by resynthesis over niters iterations and exit |
| `--debug` | — | `off` | Enable debug output |
| `--checkopts` | — | `off` | Check options and exit without running |
| `--no-fix-vertex-area` | — | `off` | Disable vertex area fix (backward compatibility only) |
| `--reshape` | — | `off` | Force reshape of input to 1D (width × 1 × 1 × frames); used internally when surface and volume dims do not match |
| `--diag` | `Gdiag_no` | — | Set the internal diagnostic level (integer); controls verbose internal output |
| `--diag-show` | — | `off` | Enable the `DIAG_SHOW` diagnostic channel |
| `--diag-verbose` | — | `off` | Enable the `DIAG_VERBOSE` diagnostic channel |
| `--wg` | `wgfile` | — | Per-group weight file (alternative to `--w`; cannot be combined with `--w`) |
| `--xonly` | `X.txt` | — | Write out the design matrix and exit without fitting (requires `--fsgd`) |
| `--subsample` | `start delta` | — | Subsample input frames starting at `start` with step `delta` |
| `--rand-exclude` | `n` | — | Randomly exclude `n` frames from the input before fitting |
| `--sim-thresh-loop` | — | `off` | Run simulation over a range of thresholds (loop mode for CSD generation) |
| `--sim-thresh-loop-pos` | — | `off` | As `--sim-thresh-loop` but restricted to positive sign |
| `--simcontrastdir` | `dir` | — | Save per-simulation z-maps for each contrast into `dir` |
| `--really-use-average7` | — | `off` | Suppress the error that fires when subject is `average7`; use `fsaverage` instead |

## Configuration Interactions

- `--fsgd` and `--X` are mutually exclusive; specifying both is an error.
- --osgm cannot be combined with `--X` or `--C` (it constructs both automatically).
- `--wls` is shorthand for `--w <yffxvar> --w-inv --w-sqrt`; specifying both would double-apply the transformation.
- `--yffxvar` (fixed effects) is conceptually distinct from `--wls` (weighted random effects); do not combine them.
- `--fwhm` requires `--surf` for surface data; without `--surf`, volume smoothing is applied regardless of data type.
- `--var-fwhm` similarly requires `--surf` for surface data.
- `--mask` and `--label` can both be specified; the label is converted to a binary mask and intersected with any `--mask`.
- `--no-cortex` / `--no-mask` disables the automatic use of `?h.cortex.label` as a mask (which is applied by default for surface analyses).
- `--prune` (default) removes any voxel that has a zero value in any input frame; `--no-prune` keeps them. Zeros often result from failed preprocessing of individual subjects.
- `--prune_thr` uses underscore (not hyphen) and sets a custom threshold below which a frame value is treated as zero for pruning purposes.
- `--sim` runs Monte Carlo simulations internally; the resulting CSD (cluster size distribution) file is then used by [[mri_glmfit-sim]] for thresholding. Running `--sim` from within `mri_glmfit` is the legacy approach; the recommended modern approach is to run simulation via [[mri_glmfit-sim]] as a separate step.
- `--logy` applies the natural logarithm to the input before fitting; this is useful when the dependent variable follows a log-normal distribution (e.g., volume measurements).
- `--mrtm1` and `--mrtm2` activate PET kinetic modeling modes and override the standard GLM; they require the reference tissue TAC and timing files.
- `--asl` and `--asl-rev` set up arterial spin labeling subtraction; `--asl-rev` reverses which frame is labeled (label=0, control=1).
- `--o` is an alias for `--glmdir`.
- `--dontsave` suppresses all file output; it is set automatically when `--sim` is used.

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
- **Downstream:** [[mri_glmfit-sim]] (for cluster-based or FDR correction), `mri_surfcluster`, `mri_volcluster`, visualization in [[wiki/tools/freeview|freeview]]

The output directory structure is designed to be consumed by [[mri_glmfit-sim]] which reads `mri_glmfit.log` to reconstruct the original command and adds simulation-based thresholding.

## Gotchas and Caveats

> [!gotcha] Default mask on surfaces
> By default, `mri_glmfit` uses `?h.cortex.label` as a mask when analyzing surface data. Vertices outside the cortex label (e.g., medial wall) are excluded. Use `--no-cortex` to disable. This behavior is not always obvious to users.

> [!gotcha] --prune is on by default
> If any subject has a zero value at a given voxel/vertex, that location is excluded from analysis. This can silently reduce your analysis mask if some subjects have incomplete data. Use `--no-prune` with caution — zeros may be legitimate missing data.

> [!gotcha] --prune_thr uses underscore
> Unlike most flags, `--prune_thr` uses an underscore separator, not a hyphen. The threshold defaults to `FLT_MIN` (effectively zero); values below the threshold in any frame trigger pruning of that voxel.

> [!gotcha] sig.mgh is -log10(p), not p
> The significance map `sig.mgh` contains $-\log_{10}(p)$, where the sign is carried from the t-statistic (positive = activations, negative = deactivations for one-tailed tests). A value of 2.0 corresponds to $p = 0.01$.

> [!gotcha] Design matrix rescaling
> Column rescaling is applied by default to improve numerical stability of matrix inversion. This is transparent to the user (betas are rescaled back), but turning it off with `--no-rescale-x` may cause issues with badly-scaled designs.

> [!gotcha] doss vs. dods with [[fsgd-format|FSGD]]
> The choice of `doss` vs. `dods` when using --fsgd determines whether classes share covariate slopes. This fundamentally changes the design matrix structure and the interpretation of contrast vectors. The ordering of regressors is critical for correct contrast specification.

> [!gotcha] --sim inside mri_glmfit is legacy
> The `--sim` flag runs Monte Carlo simulation within `mri_glmfit` itself. The preferred modern workflow is to run `mri_glmfit` without `--sim`, then run [[mri_glmfit-sim]] separately, which provides more flexibility.

> [!gotcha] PCC is on by default
> Partial correlation coefficient computation (`--pcc`) is enabled by default (`DoPCC=1` in source). Several flags implicitly disable it: `--osgm`, `--pvr`, `--wls`, `--sim`, `--dti`, `--mrtm1`, `--mrtm2`, `--logan`, `--logan-ma1`, `--patlak`. Use `--no-pcc` to disable explicitly.

## Related Tools

- [[mri_glmfit-sim]] — simulation for cluster/FDR correction of mri_glmfit output
- [[mris_preproc]] — preprocesses surface data for group analysis
- [[mri_concat]] — concatenates volumes/surfaces into 4D stack
- [[mri_vol2surf]] — projects volume data to surface
- [[mri_binarize]] — creates masks for restricting analysis
- [[mri_label2vol]] — converts labels to volumes

## Confidence and Gaps

**Confident (from source):** Mathematical model (OLS/WLS/fixed effects), all major flags, output file structure, design matrix construction from [[fsgd-format|FSGD]], contrast estimation and F-statistic computation, default pruning and cortex mask behavior.

**Uncertain:** Exact behavior of `--sim` when combined with `--C` vs. standalone simulation; MRTM kinetic modeling details; PCA output format.

> [!gap] MRTM kinetic modeling
> The `--mrtm1` and `--mrtm2` flags activate PET reference tissue kinetic modeling. The exact model equations, output files, and required input format for `RefTac` and `TimeSec` need detailed verification from source and/or developer documentation.
