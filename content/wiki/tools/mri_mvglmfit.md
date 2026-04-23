---
title: "mri_mvglmfit"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_glmfit/mri_mvglmfit.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit]]"
  - "[[mri_dualperm]]"
  - "[[mri_fwhm]]"
  - "[[fsgd-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Multivariate test statistic type not confirmed"
  - "MVGLMPERM class UseResid and signlist fields not exposed as CLI flags"
tags:
  - statistics
  - glm
  - multivariate
  - permutation
---

# mri_mvglmfit

## Summary

`mri_mvglmfit` fits a multivariate General Linear Model (MVGLM) to a set of MRI data volumes and performs permutation-based inference. Unlike [[mri_glmfit]] which fits one response at a time, `mri_mvglmfit` jointly models multiple response variables (e.g., multiple imaging contrasts or hemispheres), enabling multivariate test statistics. Written by Douglas N. Greve.

## Source Information

- **Language:** C++
- **Source file:** `mri_glmfit/mri_mvglmfit.cpp`
- **Original author:** Douglas N. Greve

## Purpose and Context

Multivariate GLM generalises univariate regression to handle multiple dependent variables simultaneously. In neuroimaging, this is useful when you have multiple imaging measures (e.g., FA and MD from DTI, thickness and surface area from morphometry) and want to test a hypothesis about the group of measures jointly. `mri_mvglmfit` provides this capability with permutation-based correction for multiple comparisons.

The `MVGLMPERM` class implements the permutation test with sign-flipping and/or shuffling.

## Inputs

Multiple input MRI volumes (each representing one dependent variable / imaging contrast), plus:
- A design matrix ([[fsgd-format|FSGDF]] or contrast file)
- Optional mask volume

## Outputs

Written to an output directory:
- GLM parameter estimates (betas)
- Test statistics
- Permutation p-value maps

## Mathematical Foundations

The multivariate GLM models:

$$
\mathbf{Y} = \mathbf{X}\mathbf{B} + \mathbf{E}
$$

where $\mathbf{Y}$ is $n \times q$ (observations × response variables), $\mathbf{X}$ is $n \times p$ (design matrix), $\mathbf{B}$ is $p \times q$ (coefficients), and $\mathbf{E}$ is $n \times q$ (residuals).

The parameter estimates are:

$$
\hat{\mathbf{B}} = (\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{Y}
$$

The `fMRIarrayToMatrix()` function converts a list of MRI frames into the $\mathbf{Y}$ matrix.

Permutation types supported (via `MVGLMPERM`):
- Sign-flip (`permsign = 1`)
- Shuffle (`permshuffle = 1`)

> [!gap] Multivariate test statistic
> The specific multivariate test statistic (e.g., Hotelling's $T^2$, Wilks' $\Lambda$, or Roy's largest root) used for the omnibus test was not identified from the class definition alone.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o <dir>` or `--glmdir <dir>` | path | required | Output directory |
| `--i <vol> [...]` or `--y <vol> [...]` | volumes | required | Dependent variable volumes (one per time point; each file is a subject stack). Sets `arraymajor=1`. |
| `--i2 <vol> [...]` or `--y2 <vol> [...]` | volumes | — | Dependent variable volumes (one per subject; each file is a time-point stack). Sets `arraymajor=2`. |
| `--fsgd <file>` | path | — | [[fsgd-format\|FreeSurfer Group Descriptor file]] (defines design matrix and contrast). Required unless `--osgm` or `--tsgd` is used. |
| `--osgm` | flag | off | One-sample group mean design (intercept only, one contrast). |
| `--tsgd` | flag | off | Two-sample group design (two groups, two contrasts: difference and mean). |
| `--mask <vol>` | volume | — | Brain mask volume. |
| `--surf <file>` | path | — | Surface file (when input data live on a surface). Enables surface-based clustering. |
| `--nperm <n>` | int | 0 | Number of permutations. When `> 0`, runs a permutation test after the initial GLM fit. |
| `--cpermno <n>` | int | 0 | Index of the contrast from the [[fsgd-format\|FSGD]] file to test in permutation (0-based). |
| `--cpval-thresh <p>` | float | 1.0 | Remove clusters whose permutation p-value exceeds this threshold (e.g., `0.05`). |
| `--th <thresh>` | float | 1.3 | Cluster-forming threshold (`-log10(p)`). |
| `--face` | flag | off | Define voxel neighbourhood by adjacent faces only (6-connectivity). |
| `--edge` | flag | off | Define voxel neighbourhood by adjacent edges and faces (18-connectivity). |
| `--corner` | flag | off (default=on) | Define voxel neighbourhood by adjacent corners, edges, and faces (26-connectivity). Default. |
| `--ymatfile <file>` | path | — | Write the data matrix $\mathbf{Y}$ to a text file. |
| `--threads <n>` | int | 1 | Number of OpenMP threads. |
| `--max-threads` | flag | — | Use the maximum available OpenMP threads. |
| `--max-threads-1`<br>`--max-threads-minus-1` | flag | — | Use one fewer than the maximum available OpenMP threads (i.e. `omp_get_max_threads() - 1`, minimum 1). Useful for leaving one CPU free for other processes. Both spellings are accepted. |
| `--seed <n>` | int | random | Random seed for permutation. |

> [!note] No `--shuffle` or `--sign` flags
> The permutation step shuffles design-matrix rows internally via `MatrixRandPermRows()`. There are no separate --shuffle or --sign command-line flags. The sign of the test statistic is set from the GLM results automatically.

> [!note] No `--UseResid` flag
> A `UseResid` field exists inside the `MVGLMPERM` class but is not exposed as a command-line flag in the current source.

> [!note] No standalone `--x` / `--X` flag for matrix files
> The design matrix is provided via `--fsgd`, `--osgm`, or `--tsgd`. There is no `--X matfile` flag in `mri_mvglmfit` (unlike `mri_glmfit`).

## Typical Use Cases

```bash
# Multivariate GLM on FA and MD maps (fsgd provides design matrix and contrast)
mri_mvglmfit \
  --i FA.nii.gz --i MD.nii.gz \
  --fsgd design.fsgd \
  --mask brainmask.mgz \
  --o mvglm_results \
  --nperm 5000 \
  --th 1.3
```

## Pipeline Context

Not part of `recon-all`. Research tool for multivariate group-level neuroimaging analyses.

## Gotchas and Caveats

- All dependent variable volumes must have identical geometry and be registered to the same space.
- The multivariate permutation test requires more observations than response variables for the test to be well-defined.
- OpenMP parallelism is supported. Use `--threads N` or `--max-threads` to speed up permutation testing.

## Related Tools

- [[mri_glmfit]] — univariate GLM fitting
- [[mri_dualperm]] — dual permutation test for two modes
- [[mri_fwhm]] — smoothness estimation for cluster-based inference
- [[fsgd-format]] — group descriptor file format specification

## Confidence and Gaps

**Medium confidence:** class structure and design inferred from declarations. Full interface and test statistic not confirmed.
