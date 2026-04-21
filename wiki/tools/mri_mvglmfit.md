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
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not extracted"
  - "Multivariate test statistic type not confirmed"
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
- A design matrix (FSGDF or contrast file)
- Optional mask volume

## Outputs

Written to an output directory:
- GLM parameter estimates (betas)
- Test statistics
- Permutation p-value maps

## Mathematical Foundations

The multivariate GLM models:

$$\mathbf{Y} = \mathbf{X}\mathbf{B} + \mathbf{E}$$

where $\mathbf{Y}$ is $n \times q$ (observations × response variables), $\mathbf{X}$ is $n \times p$ (design matrix), $\mathbf{B}$ is $p \times q$ (coefficients), and $\mathbf{E}$ is $n \times q$ (residuals).

The parameter estimates are:

$$\hat{\mathbf{B}} = (\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{Y}$$

The `fMRIarrayToMatrix()` function converts a list of MRI frames into the $\mathbf{Y}$ matrix.

Permutation types supported (via `MVGLMPERM`):
- Sign-flip (`permsign = 1`)
- Shuffle (`permshuffle = 1`)

> [!gap] Multivariate test statistic
> The specific multivariate test statistic (e.g., Hotelling's $T^2$, Wilks' $\Lambda$, or Roy's largest root) used for the omnibus test was not identified from the class definition alone.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (multiple `--y <vol>`) | volumes | required | Dependent variable volumes |
| `--X <mat>` | matrix | required | Design matrix |
| `--mask <vol>` | volume | — | Brain mask |
| `--outdir <dir>` | path | required | Output directory |
| `--nperm <n>` | int | — | Number of permutations |
| `--sign` | flag | off | Sign-flip permutation |
| `--shuffle` | flag | off | Shuffle permutation |
| `--thresh <t> [<sign>]` | float | — | Threshold and sign for cluster |
| `--UseResid` | flag | off | Use residuals for permutation |

> [!gap] Complete option list
> The full `parse_commandline()` was not read.

## Typical Use Cases

```bash
# Multivariate GLM on FA and MD maps
mri_mvglmfit \
  --y FA.nii.gz --y MD.nii.gz \
  --X design_matrix.mat \
  --mask brainmask.mgz \
  --outdir mvglm_results \
  --nperm 5000 --sign
```

## Pipeline Context

Not part of `recon-all`. Research tool for multivariate group-level neuroimaging analyses.

## Gotchas and Caveats

- All dependent variable volumes must have identical geometry and be registered to the same space.
- The multivariate permutation test requires more observations than response variables for the test to be well-defined.
- OpenMP parallelism is supported (`#ifdef _OPENMP`); use `--threads` to speed up permutation testing.

## Related Tools

- [[mri_glmfit]] — univariate GLM fitting
- [[mri_dualperm]] — dual permutation test for two modes
- [[mri_fwhm]] — smoothness estimation for cluster-based inference

## Confidence and Gaps

**Medium confidence:** class structure and design inferred from declarations. Full interface and test statistic not confirmed.
