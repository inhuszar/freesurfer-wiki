---
title: "mri_ms_EM"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_ms_EM/mri_ms_EM.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ms_EM_with_atlas]]"
  - "[[mri_ms_fitparms]]"
  - "[[mri_ms_LDA]]"
  - "[[mri_segment]]"
  - "[[mri_normalize]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Complete flag list requires get_option() body"
  - "Exact Gaussian mixture EM convergence criteria not traced"
  - "INU/bias field correction implementation details"
tags:
  - segmentation
  - EM
  - multi-spectral
  - bias-correction
  - attic
---

# mri_ms_EM

## Summary

`mri_ms_EM` performs multi-spectral tissue segmentation using a Gaussian Mixture Model (GMM) Expectation-Maximization (EM) algorithm with simultaneous bias field (intensity non-uniformity, INU) correction. It takes multiple co-registered MRI volumes as input (e.g., multi-echo FLASH images), jointly models the intensity distributions of tissue classes across all channels, and produces a segmentation. This tool resides in `attic/` and is not part of the active build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_ms_EM/mri_ms_EM.cpp`
- **Author:** Xiao Han
- **Reference:** Based on Ichihashi et al., "Gaussian Mixture PDF approximation and fuzzy c-means clustering with Entropy Regularization"

## Purpose and Context

Multi-echo FLASH (Fast Low Angle SHot) MRI at multiple flip angles allows simultaneous estimation of T1 and PD (proton density) values, enabling better tissue discrimination than single-contrast imaging. `mri_ms_EM` was developed to exploit this multi-spectral information by jointly modelling all input channels in an EM framework.

Key features:
- Simultaneous INU bias field estimation and correction
- Markov Random Field (MRF) regularization for spatial coherence
- Covariance matrix regularization (following Archambeau et al., ESANN 2004) for robustness
- Configurable number of tissue classes (default 3: WM, GM, CSF)

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| FLASH volumes | [[mgz]] | Multiple co-registered MRI volumes (e.g., multi-echo, multi-flip-angle) |
| Number of classes | int | Positional argument |
| Output stem | string | Base for output files |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Segmentation | [[mgz]] | Per-voxel tissue class assignment |
| Bias-corrected volumes | [[mgz]] | INU-corrected version of each input |
| Class probability maps | [[mgz]] | Soft membership values |

## Mathematical Foundations

For $K$ tissue classes and $V$ input channels (FLASH volumes), let $\mathbf{y}_i$ be the multi-channel intensity vector at voxel $i$.

The GMM model assumes:

$$
p(\mathbf{y}_i) = \sum_{k=1}^K \pi_k \mathcal{N}(\mathbf{y}_i \mid \boldsymbol{\mu}_k, \boldsymbol{\Sigma}_k)
$$

where $\pi_k$ are class priors, $\boldsymbol{\mu}_k$ are class mean vectors (in the multi-spectral space), and $\boldsymbol{\Sigma}_k$ are class covariance matrices.

**E-step:** Compute posterior membership $q_{ik} = P(k \mid \mathbf{y}_i)$ for each voxel $i$ and class $k$.

**M-step:** Update $\boldsymbol{\mu}_k$, $\boldsymbol{\Sigma}_k$, and $\pi_k$.

**INU bias field:** A smooth bias field $b_i$ is estimated simultaneously by a Poisson solver (`PoissonSolver.h`), with smoothness regularized by a weight $\lambda$ (`lap_weight`, default 1.0).

**MRF regularization:** An ICM (Iterated Conditional Modes) step enforces spatial coherence by encouraging neighbouring voxels to share the same label.

**Covariance regularization:** The covariance matrices are regularized by adding a small multiple of the identity ($\kappa \cdot I$) to prevent degeneracy.

Background voxels (intensity < `noise_threshold`, default 1.0) are excluded from the EM estimation.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-num_classes <n>` | int | 3 | Number of tissue classes |
| `-no_INU` | flag | off | Disable bias field correction |
| `-kappa <f>` | float | 1e-8 | Covariance regularization constant |
| `-tolerance <f>` | float | 0.01 | Convergence criterion |
| `-lap_weight <f>` | float | 1.0 | Smoothness weight for bias field |
| `-noise_threshold <f>` | float | 1.0 | Minimum intensity for non-background |
| `-normflag` | flag | off | Normalize input volume before processing |
| `-fix_class_size` | flag | on | Fix class sizes (prevents degenerate solutions) |

> [!gap] Complete flag list
> The static variable declarations suggest the above flags. Full `get_option()` parsing is needed for confirmation.

## Configuration Interactions

- `-no_INU` disables the bias field correction, making the algorithm a pure GMM-EM without spatial adaptation.
- `-kappa` must be chosen carefully: values too large (e.g., 0.01) over-regularize covariances; too small causes numerical instability.
- `-fix_class_size` prevents the EM from converging to a solution where one class captures all voxels.

> [!gotcha] kappa sensitivity
> The source comment notes: "this number seems need to be reduced if using 16 echoes, but needs to be this large for just using average; so critical, not good." This indicates the algorithm is sensitive to the number of input channels and the appropriate `kappa` value must be tuned empirically.

## Typical Use Cases

```bash
# Segment T1-weighted data into 3 classes with bias correction
mri_ms_EM flash_E1.mgz flash_E2.mgz 3 segmentation_output

# Without bias correction
mri_ms_EM -no_INU flash_E1.mgz flash_E2.mgz 3 segmentation_output
```

## Pipeline Context

Not part of standard `recon-all`. Was used in multi-echo FLASH processing pipelines at MGH for tissue characterization studies. The modern equivalent is `mri_ms_fitparms` (for quantitative T1/PD estimation) followed by atlas-based segmentation.

## Gotchas and Caveats

> [!gotcha] Attic status
> In `attic/` — not compiled in FreeSurfer 8.2.0. Manual compilation required.

> [!gotcha] INU solver dependency
> The bias field correction uses `PoissonSolver.h`, a shared utility. If compiled separately, this dependency must be resolved.

## Related Tools

- [[mri_ms_EM_with_atlas]] — extends this tool with GCA atlas priors
- [[mri_ms_fitparms]] — fits quantitative T1/PD parameters from FLASH data
- [[mri_ms_LDA]] — LDA-based multi-spectral tissue classification
- [[mri_segment]] — the standard single-channel WM segmentation tool

## Confidence and Gaps

**Confident:** Core EM algorithm, INU correction via Poisson solver, covariance regularization, MRF spatial regularization, attic status.

**Less confident:** Complete flag list, exact MRF implementation, convergence behaviour with many channels.
