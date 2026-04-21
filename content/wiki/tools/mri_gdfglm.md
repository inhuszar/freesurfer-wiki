---
title: "mri_gdfglm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_gdfglm/mri_gdfglm.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit]]"
  - "[[mri_concat]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — unclear whether it is still distributed or superseded entirely by mri_glmfit"
  - "Full flag enumeration not confirmed from help output"
tags:
  - glm
  - statistics
  - group-analysis
  - attic
---

# mri_gdfglm

## Summary

`mri_gdfglm` performs a general linear model (GLM) analysis given a FreeSurfer Group Descriptor File (GDF/FSGD) and a dependent variable table. It fits a GLM model where the design matrix is specified via class membership and covariate information encoded in the FSGD file format, and the outcome variable is provided as a tabular text file (Dependent Variable Table, DVT). This tool is located in the `attic/` subdirectory, indicating it is legacy code likely superseded by [[mri_glmfit]].

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_gdfglm/mri_gdfglm.cpp`
- **Original author:** Douglas N. Greve
- **Location note:** Resides in `attic/` — may not be compiled or distributed in standard FreeSurfer builds.

## Purpose and Context

`mri_gdfglm` was an early GLM tool for group-level analysis using FreeSurfer's FSGD (Group Descriptor File) format. Rather than operating voxel- or vertex-wise on volumetric or surface data, it reads a Dependent Variable Table (DVT) — a matrix of scalar measurements (one per subject, one per measurement type) — and performs a regression using classes and covariates from the FSGD file.

Its primary use was for ROI-based or summary-statistic analyses where data had been collapsed into a scalar table rather than retained as a volume. The modern replacement is [[mri_glmfit]], which supports both vertex/voxel-wise analysis and tabular input via `--table`.

> [!gotcha] Legacy tool
> `mri_gdfglm` lives in `attic/` and may not be present in compiled distributions of FreeSurfer 8.2.0. Use [[mri_glmfit]] with `--table` or `--fsgd` for equivalent modern functionality.

## Inputs

| Input | Description |
|-------|-------------|
| FSGD file | FreeSurfer Group Descriptor File describing subjects, classes, and covariates |
| DVT file | Dependent Variable Table — a text matrix with subjects as rows and measurements as columns |

- The FSGD file specifies subject IDs, class membership, and covariate values.
- The DVT file can be transposed; the tool handles both orientations.
- Subjects and variables can be pruned/filtered via command-line options.

## Outputs

- Regression coefficient estimates (beta weights) per dependent variable
- Class-specific `.dat` files containing observed values, predictions, and residuals per class
- Written to files named with a user-specified base path

## Mathematical Foundations

The GLM forward model is:

$$
\mathbf{y} = \mathbf{X} \boldsymbol{\beta} + \boldsymbol{\varepsilon}
$$

where $\mathbf{X}$ is the design matrix constructed from the FSGD file (classes and covariates), $\mathbf{y}$ is the dependent variable vector, and $\boldsymbol{\beta}$ are the regression coefficients estimated via ordinary least squares:

$$
\hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{y}
$$

The contrast variance magnification factor (VMF) is computed per contrast to quantify efficiency:

$$
\text{VMF}(C) = \text{tr}\left(C (\mathbf{X}^T \mathbf{X})^{-1} C^T\right)
$$

## Configuration Options

> [!gap] Complete flag list not verified from help output
> The following is reconstructed from source code parsing. Full enumeration needs confirmation.

| Flag | Argument | Description |
|------|----------|-------------|
| `--gdf` | `<file>` | Path to the FSGD group descriptor file |
| `--dvt` | `<file>` | Path to the dependent variable table file |
| `--class` | `<name>` | Include this class (repeatable) |
| `--wclass` | `<w1> ...` | Weights for each class |
| `--covar` | `<name>` | Include this covariate (repeatable) |
| `--wcovar` | `<w1> ...` | Weights for each covariate |
| `--depvar` | `<name>` | Dependent variable to analyze (repeatable) |
| `--wdepvar` | `<w1> ...` | Weights for each dependent variable |
| `--prune-covar` | `<name> <min> <max>` | Restrict subjects by covariate range |
| `--transposed` | — | DVT file is transposed (cols=subjects, rows=variables) |
| `--test-offset` | — | Test with offset term |
| `--o` | `<base>` | Output file base name |
| `--debug` | — | Enable debug output |

## Configuration Interactions

- `--class` and `--covar` together define the design matrix columns; omitting `--class` uses all classes in the FSGD.
- `--wclass` and `--wcovar` apply relative weighting to classes/covariates; number of weights must match number of classes/covariates.
- `--prune-covar` removes subjects whose covariate values fall outside the specified range before fitting.

## Typical Use Cases

**Basic group comparison with two classes:**
```bash
mri_gdfglm --gdf study.fsgd --dvt measurements.dat \
  --class control --class patient \
  --o results/glm
```

**Regression with a covariate, excluding outliers:**
```bash
mri_gdfglm --gdf study.fsgd --dvt measurements.dat \
  --class control --class patient \
  --covar age --prune-covar age 20 80 \
  --o results/glm_age
```

## Pipeline Context

`mri_gdfglm` is not called by `recon-all`. It is a standalone statistical tool for group analysis. It predates and was effectively replaced by [[mri_glmfit]], which handles both tabular and voxel/vertex-wise data within a single unified interface.

## Gotchas and Caveats

> [!gotcha] Attic location
> This tool is in `attic/` and may not be compiled or installed in FreeSurfer 8.2.0 distributions. Always check whether the binary exists before depending on it. Use [[mri_glmfit]] `--table` for equivalent functionality.

> [!gap] DVT format specification
> The exact format of the Dependent Variable Table (DVT) file is not publicly documented. It appears to be a whitespace-delimited text matrix with optional row/column name headers. Needs verification.

## Related Tools

- [[mri_glmfit]] — modern replacement, operates voxel/vertex-wise or on tabular data
- [[mri_concat]] — used to assemble multi-subject surface/volume data stacks

## Confidence and Gaps

**Confident (from source):** General purpose (FSGD + DVT → GLM), class/covariate design matrix construction, location in attic suggesting legacy status.

**Uncertain:** Whether the binary is built/distributed in v8.2.0; complete flag syntax; DVT file format specification.

> [!gap] Verify distribution status
> Confirm whether `mri_gdfglm` is compiled and installed in FreeSurfer 8.2.0, or whether it exists only as source in the attic.
