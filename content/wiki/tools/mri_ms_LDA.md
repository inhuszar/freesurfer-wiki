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

$$
\mathbf{w} = S_W^{-1} (\boldsymbol{\mu}_1 - \boldsymbol{\mu}_2)
$$

where $\boldsymbol{\mu}_1$ and $\boldsymbol{\mu}_2$ are the multi-spectral class means.

The synthesized image is:

$$
y(\mathbf{x}) = \mathbf{w}^T \mathbf{I}(\mathbf{x})
$$

where $\mathbf{I}(\mathbf{x})$ is the vector of intensities at voxel $\mathbf{x}$ across all input volumes.

**Configuration `CHOICE=0`:** Uses the diagonal of $S_W$ (ignores off-diagonal covariance terms). The source comment notes this is necessary to suppress noise in the output.

**Window mode (`-window <n>`):** LDA is computed only in a local neighbourhood of size `n` around a specified debug voxel, for visualisation purposes.

**Whole-volume mode (`-whole_volume`):** Synthesizes background region in addition to the foreground mask.

**Mahalanobis distance mode (`-distance`):** Computes the Mahalanobis distance between class centres in the original multi-spectral space rather than the LDA projection space.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-lda` | `<class1> <class2>` | required | Two segmentation label IDs to optimise CNR between |
| `-mask` | `<fname>` | — | ROI mask volume (UCHAR type) |
| `-label` | `<fname>` | required | Segmentation volume defining tissue class labels |
| `-weight` | `<fname>` | — | File to save/load LDA weight vector |
| `-synth` | `<fname>` | — | Output synthesized LDA volume filename |
| `-conform` | — | off | Conform input volumes to isotropic 1 mm³ |
| `-noconform` | — | off | Inhibit isotropic conforming (override previous `-conform`) |
| `-out_type` | `<n>` | 3 (MRI_FLOAT) | Output volume type code |
| `-t` | `<f>` | 0.1 | Background noise threshold applied to first input volume |
| `-w` | — | off | Indicate that LDA weights are pre-computed (read from `-weight` file) |
| `-window` | `<n>` | off | Compute LDA in local neighbourhood of size `n` around debug voxel |
| `-debug_voxel` | `<x> <y> <z>` | — | Debug voxel coordinates for windowed LDA mode |
| `-whole_volume` | — | off | Synthesize background region as well as masked foreground |
| `-test` | — | off | Set SW to identity matrix (ignore off-diagonal covariance) |
| `-distance` | — | off | Compute Mahalanobis distance between class centres |
| `-regularize` | `<lambda>` | off | Regularise covariance matrix: $(1-\lambda) S_W^{-1} + \lambda I$ |
| `-shift` | `<f>` | -1 | Shift synthesized output values by `f` before truncating at zero |
| `-use_one` | — | off | Use within-class scatter of class 1 only as $S_W$ |

## Configuration Interactions

- `-lda <class1> <class2>` and `-label <fname>` are both required when computing weights from scratch.
- `-w` signals that pre-computed weights should be read; in this mode `-weight <fname>` and `-synth <fname>` must also be provided.
- `-window <n>` requires `-debug_voxel <x> <y> <z>` to specify the centre of the local region.
- `-window` and `-whole_volume` are incompatible in intent; `-window` uses local scatter, `-whole_volume` uses all foreground voxels.
- `-use_one` forces $S_W$ to be estimated from class 1 voxels only, which can reduce noise when the second class contains mixed-tissue boundary voxels.

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
