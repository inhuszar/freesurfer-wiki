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
last_agent_update: 2026-04-21
gaps:
  - "Source is in 'attic' directory — may be deprecated"
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

Confirmed from `parse_commandline()` and global variable initializations in `attic/dmri_tensoreig/dmri_tensoreig.cpp`.

| Variable | Flag | Description | Default |
|----------|------|-------------|---------|
| `InFile` | `--i` | Input DWI volume (or tensor volume when `--tensor 1`) | required |
| `OutDir` | `--o` | Output directory | required |
| `bValue` | `--b` | B-value (scalar, e.g. 1000) | `0.0` |
| `nAcq` | `--nacq` | Number of T2 weightings (acquisitions) to average | `1` |
| `nDir` | `--ndir` | Number of diffusion gradient directions | `6` |
| `GradFile` | `--g` | Gradient directions file | none |
| `MaskFile` | `--m` | Brain mask volume | none |
| `OutFmt` | `--ofmt` | Output file extension / format string | `nii` |
| `IsTensorInput` | `--tensor` | Pass `1` to treat input as a pre-computed tensor volume (skips fitting) | `0` |

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

$$
S_i = S_0 \exp\!\left(-b \hat{g}_i^T \mathbf{D} \hat{g}_i\right)
$$

Taking the log and forming a linear system:

$$
\ln(S_i / S_0) = -b \hat{g}_i^T \mathbf{D} \hat{g}_i = -b \mathbf{b}_i^T \mathbf{d}
$$

where $\mathbf{d}$ is the 6-element vectorized tensor and $\mathbf{b}_i$ is the b-matrix row. The source constructs the $B$ matrix and computes the pseudoinverse:

$$
\hat{\mathbf{d}} = (\mathbf{B}^T \mathbf{B})^{-1} \mathbf{B}^T \ln(\mathbf{S}/S_0)
$$

**Eigensystem:** The symmetric $3 \times 3$ tensor $\mathbf{D}$ is diagonalized to find eigenvalues $\lambda_1, \lambda_2, \lambda_3$ and eigenvectors.

**FA:**
$$
\text{FA} = \sqrt{\frac{3}{2}} \cdot \frac{\sqrt{(\lambda_1 - \bar{\lambda})^2 + (\lambda_2 - \bar{\lambda})^2 + (\lambda_3 - \bar{\lambda})^2}}{\sqrt{\lambda_1^2 + \lambda_2^2 + \lambda_3^2}}
$$

**Averaging:** The `nAcq` parameter controls averaging of multiple acquisitions. The code calls `MRIavg4` and `MRIavg5` for averaging along the 4th or 5th dimension of the input volume.

## Configuration Options

All flags confirmed from `parse_commandline()` in `attic/dmri_tensoreig/dmri_tensoreig.cpp`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `file` | required | Input DWI volume (4D). When `--tensor 1` is set, this should be a pre-computed tensor volume instead. |
| `--o` | `dir` | required | Output directory where all result volumes are written. |
| `--b` | `num` | `0.0` | B-value (diffusion weighting factor, e.g. `1000`). Used to construct the B-matrix. |
| `--ndir` | `num` | `6` | Number of diffusion gradient directions in the input volume. |
| `--nacq` | `num` | `1` | Number of T2-weighted acquisitions (repetitions) to average before tensor fitting. Triggers `MRIavg4` or `MRIavg5` depending on data layout. |
| `--g` | `file` | none | Path to gradient directions file. Each row contains three floats (gx, gy, gz). The first row is the b=0 direction; subsequent rows are diffusion directions. |
| `--m` | `file` | none | Brain mask volume. If not supplied, a mask is computed automatically and written to `mask.<ofmt>`. |
| `--ofmt` | `fmt` | `nii` | Output file extension / format string appended to output filenames (e.g. `nii`, `nii.gz`, `mgh`). |
| `--tensor` | `0`\|`1` | `0` | When set to `1`, skip tensor fitting and treat the input (`--i`) as a pre-computed tensor volume. Eigendecomposition still runs. |
| `--sdcm`<br>`--infodump` | `file` | — | Pass a Siemens DICOM file or an ASCII info-dump file. Calls `DTIparamsFromSiemensAscii()` to extract `bValue`, `nDir`, and `DiffMode`, and auto-selects a gradient file for known diffusion modes. Both flags are aliases. |

## Typical Use Cases

```bash
# Fit tensors from a DWI volume
dmri_tensoreig \
  --i dwi.nii.gz \
  --g gradients.txt \
  --b 1000 \
  --ndir 6 \
  --o dti_output/

# Load b-value and gradient count from a Siemens DICOM info dump
dmri_tensoreig \
  --i dwi.nii.gz \
  --sdcm siemens_info.txt \
  --o dti_output/

# Skip tensor fitting; decompose a pre-computed tensor volume
dmri_tensoreig \
  --i dtensor.nii \
  --tensor 1 \
  --o dti_output/
```

## Pipeline Context

`dmri_tensoreig` is a standalone tensor-fitting tool. The preferred approach in current FreeSurfer is to use `dt_recon` (which calls `mri_glmfit`). `dmri_tensoreig` may be used when a simpler, self-contained approach is needed.

```
DWI acquisition --> dmri_tensoreig --> FA/eigenvalue maps --> dmri_paths / visualization
```

## Gotchas and Caveats

> [!gotcha] Deprecated/attic tool
> The `attic/` location of the source suggests this tool is not actively maintained. For tensor fitting, `dt_recon` or FSL's `dtifit` are the recommended alternatives.

> [!gotcha] SNR estimation is automatic, not user-configurable
> The source calls `avgsnr()` internally during tensor fitting (lines 330–333) to print the SNR of the low-b image and the average SNR across all DW images. This is not exposed as a CLI flag and cannot be suppressed or redirected.

## Related Tools

- [[dt_recon]] — recommended diffusion tensor reconstruction pipeline
- [[mri_glmfit]] — general linear model fitting used by dt_recon for tensor fitting
- [[dmri_paths]] — probabilistic tractography using tensor-derived orientation information

## Confidence and Gaps

> [!gap] Deprecation status
> Whether `dmri_tensoreig` is officially deprecated in favor of `dt_recon` is not confirmed.
