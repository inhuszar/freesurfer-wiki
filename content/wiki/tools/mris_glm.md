---
title: "mris_glm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_glm/mris_glm.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_fwhm]]"
  - "[[mris_preproc]]"
  - "[[surface-format]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in the attic/ directory — may be deprecated; unclear if it is installed in 8.2.0 binary"
  - "Relationship to mri_glmfit (preferred alternative) is undocumented"
  - "FSGD format interaction with design matrix construction not fully traced"
tags:
  - surface
  - glm
  - statistics
  - deprecated
---

# mris_glm

## Summary

`mris_glm` performs vertex-wise General Linear Model (GLM) inference on cortical surface data. It accepts a design matrix (or FreeSurfer Group Descriptor file), a set of surface overlays sampled to a common space, and a contrast vector, and computes vertex-wise beta maps, contrast effect size, residuals, and significance statistics. It is an older tool; the preferred current approach for surface-based GLMs in FreeSurfer is `mri_glmfit`.

> [!gotcha] Attic tool — potentially deprecated
> `mris_glm` resides in the `attic/` directory of the FreeSurfer 8.2.0 source tree. This indicates it may no longer be actively maintained or installed. Users performing vertex-wise GLMs should use `mri_glmfit` instead, which provides substantially more functionality and is actively supported.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_glm/mris_glm.cpp`
- **Original author:** Douglas N. Greve
- **Status:** Attic (potentially deprecated)

## Purpose and Context

`mris_glm` performs the standard vertex-wise mass-univariate GLM:

$$\mathbf{Y} = \mathbf{X} \boldsymbol{\beta} + \boldsymbol{\epsilon}$$

where $\mathbf{Y}$ is the (subjects × vertices) data matrix, $\mathbf{X}$ is the design matrix, $\boldsymbol{\beta}$ are the regression coefficients, and $\boldsymbol{\epsilon}$ are the residuals. After estimation, a contrast $\mathbf{c}^T \boldsymbol{\beta}$ is tested for significance.

It exists alongside surface-based tools like `mri_glmfit` which supersede it for most purposes.

## Inputs

| Input | Description |
|-------|-------------|
| Design matrix | ASCII matrix file (`--desmtx`) or FSGD file (`--fsgd`) |
| Surface overlays | List of subject overlay files or `--yid` base file |
| Contrast vector | ASCII matrix file (`--conmtx C`) |
| Sphere registration | `sphere.reg` (used to resample to common space) |

## Outputs

| Output | Description |
|--------|-------------|
| Beta map | Regression coefficients per vertex (`--beta betafile`) |
| CES map | Contrast effect size (`--ces cesfile`) |
| Residuals | Model residuals (`--eres eresfile`) |
| Residual variance | Per-vertex residual variance (`--eresvar`) |
| Fitted values | Predicted values (`--yhat`) |
| Output data | All data in a combined file (`--y yfile`) |

## Mathematical Foundations

The OLS estimator:
$$\hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{Y}$$

Contrast effect size:
$$\text{CES} = \mathbf{c}^T \hat{\boldsymbol{\beta}}$$

F-statistic:
$$F = \frac{\text{CES}^2}{\text{Var}(\text{CES})}$$

where $\text{Var}(\text{CES}) = \hat{\sigma}^2 \mathbf{c}^T (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{c}$.

## Configuration Options

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--desmtx desmtxfname` | path | ASCII design matrix file |
| `--fsgd fsgdfile` | path | FreeSurfer Group Descriptor file |
| `--x xmatfile` | path | Pre-built design matrix in MATLAB4 format |
| `--xmatfmt fmt` | string | Format of x matrix (default: matlab4) |
| `--xmatonly` | — | Only build and save design matrix, exit |
| `--h hemi` | lh or rh | Hemisphere |
| `--nsmooth N` | integer | Number of surface smoothing iterations to apply |
| `--frame N` | integer | Use frame N of multi-frame input |
| `--surfmeasure name` | string | Surface measure name (e.g., thickness) |
| `--surfreg surfregid` | string | Registration surface name (default: sphere.reg) |
| `--input file` | path | Input overlay file (repeatable for multiple subjects) |
| `--inputfmt fmt` | string | Input format |
| `--subjects file` | path | File listing subject names |
| `--beta betafile` | path | Output beta map |
| `--ces cesfile` | path | Output contrast effect size map |
| `--eres eresfile` | path | Output residual map |
| `--eresvar eresvarfile` | path | Output residual variance map |
| `--y yfile` | path | Output data |
| `--yhat yhatfile` | path | Output predicted values |
| `--conmtx conmtxfname` | path | Contrast matrix |
| `--gd2mtx method` | string | Group descriptor to matrix method (default: none) |

## Configuration Interactions

- `--fsgd` and `--desmtx` are alternative ways to specify the design matrix. `--fsgd` triggers automatic design matrix construction using the FSGD group descriptor format.
- `--xmatonly` will build and save the design matrix but skip the GLM computation — useful for inspecting the design matrix before running the full analysis.
- `--nsmooth` applies surface smoothing to each input overlay before GLM, equivalent to running `mris_fwhm` on each input first.
- `--frame` selects a single frame when the input overlays have multiple frames.

## Typical Use Cases

> [!gap] Usage examples
> Concrete usage examples for `mris_glm` are not well documented, and the tool may no longer function in FS 8.2.0. Users should use `mri_glmfit` for new analyses.

**Preferred modern alternative:**
```bash
mri_glmfit --y lh.thickness.mgh --fsgd subjects.fsgd dods \
    --C contrast.mtx --surf fsaverage lh \
    --cortex --glmdir glmdir/
```

## Pipeline Context

`mris_glm` is not part of `recon-all`. It is a post-processing analysis tool for group-level inference on surface data.

Typical workflow (historical):
1. [[recon-all]] produces per-subject surface metrics
2. `mris_preproc` resamples metrics to fsaverage
3. `mris_glm` (or preferably `mri_glmfit`) performs vertex-wise inference

## Gotchas and Caveats

> [!gotcha] Deprecated — use mri_glmfit
> This tool is in the `attic/` directory and may not be compiled or installed in FreeSurfer 8.2.0. The `mri_glmfit` command provides a more feature-complete and actively maintained replacement.

> [!gotcha] Subject list size limit
> The code allocates fixed arrays: `inputlist[1000]` and `subjectlist[1000]`, limiting analyses to 1000 subjects/inputs. Not typically a concern in practice.

## Related Tools

- [[mris_fwhm]] — smoothness estimation and smoothing for surface data
- [[mris_preproc]] — group-level surface data preparation

## Confidence and Gaps

**Low confidence overall** — tool is in the attic directory and may not be installed.

> [!gap] Attic status
> It is unknown whether `mris_glm` is compiled and installed in FreeSurfer 8.2.0. The `attic/` directory in the source tree typically contains deprecated or experimental tools. Verification requires checking the installed binary.
