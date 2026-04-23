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
last_agent_update: 2026-04-22
gaps:
  - "Exact Gaussian mixture EM convergence criteria not traced"
  - "INU/bias field correction Poisson solver implementation details"
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

**INU bias field:** A smooth bias field $b_i$ is estimated simultaneously by a Poisson solver (`PoissonSolver.h`), with smoothness regularized by an internal Laplacian weight (default 1.0).

**MRF regularization:** An ICM (Iterated Conditional Modes) step enforces spatial coherence by encouraging neighbouring voxels to share the same label.

**Covariance regularization:** The covariance matrices are regularized by adding a small multiple of the identity ($\kappa \cdot I$) to prevent degeneracy.

Background voxels (intensity below the `-t` threshold, default 1.0) are excluded from the EM estimation.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-no_INU` | — | off | Disable INU bias field correction |
| `-kappa <f>` | float | 1e-8 | Covariance regularization constant (sensitivity warning: see gotcha) |
| `-norm` | — | off | Normalize input volumes to N(0,1) before clustering |
| `-conform` | — | on | Interpolate volume to isotropic 1 mm³ |
| `-noconform` | — | off | Inhibit isotropic volume interpolation |
| `-mask <fname>` | file | — | Brain mask volume for region of interest |
| `-rescale` | — | off | Rescale membership functions to improve contrast |
| `-hard_seg` | — | off | Output a hard segmentation to `<out>.hseg` |
| `-synthonly` | — | off | Do not output membership functions |
| `-lda <c1> <c2>` | 2 ints | — | Use LDA method to synthesize volume from classes c1 and c2 |
| `-fuzzy_lda` | — | off | Use fuzzy LDA weighting scheme |
| `-whole_volume` | — | off | Synthesize background region too (when using LDA) |
| `-clear_dura` | — | off | Remove voxels belonging to the second class |
| `-regularize <f>` | float | — | Regularize covariance matrix with lambda value |
| `-label <fname>` | file | — | Use segmentation volume as label map |
| `-mask_subcortical` | — | off | Mask subcortical GM region |
| `-beta <f>` | float | — | MRF weight for spatial regularization |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Debug output at voxel (x, y, z) |
| `-interp <method>` | string | trilinear | Interpolation method (trilinear, nearest, cubic, sinc) |
| `-st <method>` | string | trilinear | Alias for `-interp` (sample type) |
| `-sample <method>` | string | trilinear | Alias for `-interp` |
| `-sample_type <method>` | string | trilinear | Alias for `-interp` |
| `-trilinear` | — | — | Use trilinear interpolation |
| `-nearest` | — | — | Use nearest-neighbour interpolation |
| `-cubic` | — | — | Use cubic interpolation |
| `-sinc [<hw>]` | int (opt.) | — | Use sinc interpolation with optional half-window size |
| `-sinchalfwindow <n>` | int | 6 | Sinc interpolation half-window size |
| `-hw <n>` | int | 6 | Alias for `-sinchalfwindow` |
| `-m <n>` | int | 3 | Number of tissue classes (alias for positional class count) |
| `-t <f>` | float | 1.0 | Background noise threshold (applied to first input volume) |
| `-e <f>` | float | 0.01 | EM convergence tolerance |
| `-r <n>` | int | — | Maximum number of EM iterations |
| `-window` | — | — | Recognized but not implemented (no-op) |

## Configuration Interactions

- `-no_INU` disables the bias field correction, making the algorithm a pure GMM-EM without spatial adaptation.
- `-kappa` must be chosen carefully: values too large (e.g., 0.01) over-regularize covariances; too small causes numerical instability.
- `-lda` requires specifying two class indices; `-fuzzy_lda` and `-whole_volume` are only meaningful when LDA synthesis is active.
- `-interp`, `-st`, `-sample`, and `-sample_type` are aliases for the same parameter; the last one specified wins.

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

**Confident:** Core EM algorithm, INU correction via Poisson solver, covariance regularization, MRF spatial regularization, attic status, complete flag list (from `get_option()`).

**Less confident:** Exact MRF implementation, convergence behaviour with many channels, Poisson solver coupling details.
