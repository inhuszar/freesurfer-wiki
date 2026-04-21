---
title: "mri_ms_LDA"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_ms_LDA/mri_ms_LDA.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ms_EM]]"
  - "[[mri_ms_fitparms]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Complete flag list requires get_option() body"
  - "LDA weight computation for whole-volume mode not fully traced"
tags:
  - LDA
  - multi-spectral
  - classification
  - flash
  - attic
---

# mri_ms_LDA

## Summary

`mri_ms_LDA` performs Linear Discriminant Analysis (LDA) on multi-spectral MRI data to compute a linear projection that maximally separates two tissue classes (typically white matter and grey matter). The output is a scalar "synthesized" image where tissue contrast is maximized along the Fisher LDA direction. This tool resides in `attic/` and is not part of the active build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_ms_LDA/mri_ms_LDA.cpp`
- **Author:** Xiao Han
- **Status note:** In `attic/` — legacy code, not compiled in FreeSurfer 8.2.0.

## Purpose and Context

In multi-echo FLASH imaging, the optimal linear combination of echo images for tissue discrimination is not known a priori. LDA finds the weight vector $\mathbf{w}$ that maximizes the ratio of between-class to within-class scatter, producing a synthesized image $y = \mathbf{w}^T \mathbf{x}$ that has maximal contrast between the specified tissue classes.

This synthesized LDA image can serve as an improved T1-like contrast for subsequent atlas-based segmentation (e.g., as input to `mri_em_register` or `mri_ca_label`) or for white matter segmentation.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| FLASH volumes | [[mgz]] | Multiple co-registered MRI volumes |
| Segmentation label | [[mgz]] | Existing segmentation to define tissue class labels |
| Mask | [[mgz]] | Optional ROI mask |
| Weight file | text | Optional pre-computed LDA weights |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Synthesized LDA image | [[mgz]] | Linear combination of input volumes with maximal class separation |
| LDA weights | text | Weight vector $\mathbf{w}$ (optionally saved/loaded) |

## Mathematical Foundations

For two classes (class 1 = WM, class 2 = GM, identified by `classID1` and `classID2` in the segmentation):

Let $S_W$ be the within-class scatter matrix and $S_B$ the between-class scatter matrix in the $V$-dimensional space of input volumes.

The Fisher LDA direction is the eigenvector corresponding to the largest eigenvalue of $S_W^{-1} S_B$:

$$\mathbf{w} = S_W^{-1} (\boldsymbol{\mu}_1 - \boldsymbol{\mu}_2)$$

where $\boldsymbol{\mu}_1$ and $\boldsymbol{\mu}_2$ are the multi-spectral class means.

The synthesized image is:

$$y(\mathbf{x}) = \mathbf{w}^T \mathbf{I}(\mathbf{x})$$

where $\mathbf{I}(\mathbf{x})$ is the vector of intensities at voxel $\mathbf{x}$ across all input volumes.

**Configuration `CHOICE=0`:** Uses the diagonal of $S_W$ (ignores off-diagonal covariance terms). The source comment notes this is necessary to suppress noise in the output.

**Window mode (`-window`):** LDA is computed only in a local neighbourhood of a specified debug voxel, for visualization purposes.

**Whole-volume mode (`-whole_volume`):** Uses the full volume scatter matrix instead of a local one.

**Mahalanobis distance mode (`-compute_m_distance`):** Computes distance in the original multi-spectral space rather than the LDA projection space.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mask <fname>` | string | null | ROI mask |
| `-label <fname>` | string | required | Segmentation volume defining tissue classes |
| `-weight <fname>` | string | null | File to save/load LDA weight vector |
| `-synth <fname>` | string | null | Synthesized image output filename |
| `-window` | flag | off | Compute LDA in local neighbourhood only |
| `-window_size <n>` | int | 30 | Neighbourhood radius for window mode |
| `-whole_volume` | flag | off | Use whole-volume scatter matrix |
| `-compute_m_distance` | flag | off | Compute Mahalanobis distance instead of LDA projection |
| `-USE_ONE` | flag | off | Use WM scatter matrix only (SW from WM) |
| `-just_test` | flag | off | Set SW = Identity (for testing) |
| `-shift <f>` | float | -1 | Shift value for synthesized image |
| `-debug` | flag | off | Enable debug output |
| `-noise_threshold <f>` | float | 0.1 | Background noise threshold |

## Configuration Interactions

- `-label` is required to define the tissue classes for LDA estimation.
- `-weight` can be used to save LDA weights from a training set and re-apply them to new data.
- `-window` and `-whole_volume` are mutually exclusive; `-window` uses local scatter, `-whole_volume` uses global scatter.
- `-USE_ONE` forces SW to be computed from WM voxels only, which may improve robustness if GM boundary voxels contaminate the within-class scatter.

## Typical Use Cases

```bash
# Compute LDA weights and synthesize image (two FLASH volumes)
mri_ms_LDA \
  -label aseg.mgz \
  -synth synthesized_WM.mgz \
  -weight lda_weights.txt \
  flash_E1.mgz flash_E2.mgz

# Apply pre-computed weights to new data
mri_ms_LDA \
  -label aseg.mgz \
  -weight lda_weights.txt \
  -synth synthesized_WM_new.mgz \
  flash_E1_new.mgz flash_E2_new.mgz
```

## Pipeline Context

Not part of standard `recon-all`. Used in multi-echo FLASH pipelines:

1. [[mri_ms_fitparms]] — fit T1/PD
2. `mri_ms_LDA` — compute synthesized high-contrast image
3. [[mri_segment]] or [[mri_ca_label]] — segmentation using the synthesized image

## Gotchas and Caveats

> [!gotcha] Attic status
> In `attic/` — not compiled in FreeSurfer 8.2.0.

> [!gotcha] CHOICE=0 ignores off-diagonal covariance
> The `CHOICE=0` compile-time constant causes the LDA to use only the diagonal of $S_W$, ignoring correlations between echo images. This reduces noise in the output but discards multi-spectral correlation structure.

> [!gotcha] Weight portability
> LDA weights computed for one scanner and acquisition protocol may not generalize to different scanners. Weights should be recomputed for each site/protocol.

## Related Tools

- [[mri_ms_EM]] — EM-based alternative for multi-spectral segmentation
- [[mri_ms_fitparms]] — quantitative T1/PD estimation from FLASH

## Confidence and Gaps

**Confident:** Core LDA algorithm, Fisher discriminant direction, synthesized image computation, CHOICE=0 behaviour, attic status.

**Less confident:** Complete flag list, Mahalanobis distance computation details.
