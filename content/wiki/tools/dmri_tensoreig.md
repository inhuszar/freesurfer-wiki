---
title: "dmri_tensoreig"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/dmri_tensoreig/dmri_tensoreig.cpp"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dt_recon]]"
  - "[[dmri_paths]]"
  - "[[mri_glmfit]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source is in 'attic' directory — may be deprecated"
  - "Full argument list requires reading parse_commandline()"
tags:
  - diffusion
  - tensor
  - eigensystem
  - fa
  - dti
---

# dmri_tensoreig

## Summary

`dmri_tensoreig` computes the eigensystem (eigenvalues and eigenvectors) of diffusion tensors and derives fractional anisotropy (FA) maps. It accepts a 4D diffusion-weighted image with a gradient table and b-value, constructs the diffusion tensor at each voxel, computes the three eigenvalues and eigenvectors via SVD/diagonalization, and outputs scalar maps (FA, trace) and eigenvector volumes. The tool predates `dt_recon` and is located in the `attic/` directory of the source tree.

## Source Information

- **Language:** C++
- **Source file:** `attic/dmri_tensoreig/dmri_tensoreig.cpp`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_tensoreig`
- **Original author:** Dennis Jen (MGH)
- **Status:** In `attic/` directory — potentially deprecated in favor of `dt_recon`/`mri_glmfit`

> [!gotcha] Attic location
> This tool resides in the `attic/` subdirectory of the FreeSurfer source tree, indicating it may be deprecated or superseded. However, the binary is still installed in 8.2.0.

## Purpose and Context

`dmri_tensoreig` provides a self-contained diffusion tensor fitting and eigensystem decomposition pipeline. It reads DWI data and gradient information, fits the tensor model, and outputs:
- Three eigenvalue maps ($\lambda_1 \geq \lambda_2 \geq \lambda_3$)
- Three eigenvector volumes
- Trace map ($\lambda_1 + \lambda_2 + \lambda_3$)
- FA map

This predates the more comprehensive `dt_recon` pipeline which uses `mri_glmfit` for tensor fitting. `dmri_tensoreig` may be useful as a standalone, lower-dependency tool.

## Inputs

From global variables:

| Variable | Flag | Description | Default |
|----------|------|-------------|---------|
| `InFile` | `-i` or similar | Input DWI volume | required |
| `OutDir` | `-o` | Output directory | required |
| `bValue` | `-b` | B-value (scalar) | 0.0 |
| `nAcq` | `-a` | Number of acquisitions to average | 1 |
| `nDir` | `-d` | Number of gradient directions | 6 |
| `GradFile` | `-g` | Gradient file | — |
| `MaskFile` | `-m` | Brain mask | — |
| `OutFmt` | `-f` | Output format | `nii` |
| `IsTensorInput` | `-t` | Input is already a tensor volume | 0 |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `*_eigval.nii` | Eigenvalue maps (4D: 3 eigenvalues) | NIfTI |
| `*_eigvec1.nii` | First eigenvector (principal direction) | NIfTI |
| `*_eigvec2.nii` | Second eigenvector | NIfTI |
| `*_eigvec3.nii` | Third eigenvector | NIfTI |
| `*_trace.nii` | Trace = $\lambda_1 + \lambda_2 + \lambda_3$ | NIfTI |
| `*_fa.nii` | Fractional anisotropy | NIfTI |

## Mathematical Foundations

**Diffusion tensor model:** The signal in direction $\hat{g}_i$ with b-value $b$ is:

$$S_i = S_0 \exp\!\left(-b \hat{g}_i^T \mathbf{D} \hat{g}_i\right)$$

Taking the log and forming a linear system:

$$\ln(S_i / S_0) = -b \hat{g}_i^T \mathbf{D} \hat{g}_i = -b \mathbf{b}_i^T \mathbf{d}$$

where $\mathbf{d}$ is the 6-element vectorized tensor and $\mathbf{b}_i$ is the b-matrix row. The source constructs the $B$ matrix and computes the pseudoinverse:

$$\hat{\mathbf{d}} = (\mathbf{B}^T \mathbf{B})^{-1} \mathbf{B}^T \ln(\mathbf{S}/S_0)$$

**Eigensystem:** The symmetric $3 \times 3$ tensor $\mathbf{D}$ is diagonalized to find eigenvalues $\lambda_1, \lambda_2, \lambda_3$ and eigenvectors.

**FA:**
$$\text{FA} = \sqrt{\frac{3}{2}} \cdot \frac{\sqrt{(\lambda_1 - \bar{\lambda})^2 + (\lambda_2 - \bar{\lambda})^2 + (\lambda_3 - \bar{\lambda})^2}}{\sqrt{\lambda_1^2 + \lambda_2^2 + \lambda_3^2}}$$

**Averaging:** The `nAcq` parameter controls averaging of multiple acquisitions. The code calls `MRIavg4` and `MRIavg5` for averaging along the 4th or 5th dimension of the input volume.

## Configuration Options

> [!gap] Full flag list
> Complete flags require reading `parse_commandline()`. From global variables, likely flags include:

| Flag | Description |
|------|-------------|
| `-i <file>` | Input DWI volume |
| `-o <dir>` | Output directory |
| `-b <val>` | B-value |
| `-g <file>` | Gradient directions file |
| `-m <file>` | Brain mask |
| `-n <n>` | Number of gradient directions |
| `-a <n>` | Number of acquisitions to average |
| `-f <fmt>` | Output format (default: `nii`) |
| `-t` | Input is tensor (skip fitting) |

## Typical Use Cases

> [!gap] Exact command syntax
> Without the full argument parser, exact command lines cannot be verified.

```bash
# Fit tensors from a DWI volume
dmri_tensoreig \
  -i dwi.nii.gz \
  -g gradients.txt \
  -b 1000 \
  -o dti_output/
```

## Pipeline Context

`dmri_tensoreig` is a standalone tensor-fitting tool. The preferred approach in current FreeSurfer is to use `dt_recon` (which calls `mri_glmfit`). `dmri_tensoreig` may be used when a simpler, self-contained approach is needed.

```
DWI acquisition --> dmri_tensoreig --> FA/eigenvalue maps --> dmri_paths / visualization
```

## Gotchas and Caveats

> [!gotcha] Deprecated/attic tool
> The `attic/` location of the source suggests this tool is not actively maintained. For tensor fitting, `dt_recon` or FSL's `dtifit` are the recommended alternatives.

> [!gotcha] SNR estimation
> The source includes an `avgsnr()` function, suggesting SNR computation capabilities, but whether this is exposed as a flag is unknown.

## Related Tools

- [[dt_recon]] — recommended diffusion tensor reconstruction pipeline
- [[mri_glmfit]] — general linear model fitting used by dt_recon for tensor fitting
- [[dmri_paths]] — probabilistic tractography using tensor-derived orientation information

## Confidence and Gaps

> [!gap] Argument parser not read
> Full flag names require reading `parse_commandline()`.

> [!gap] Deprecation status
> Whether `dmri_tensoreig` is officially deprecated in favor of `dt_recon` is not confirmed.
