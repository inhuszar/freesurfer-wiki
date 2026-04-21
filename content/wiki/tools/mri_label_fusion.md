---
title: "mri_label_fusion"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "infant/mri_label_fusion"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label2label]]"
  - "[[mri_ca_label]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Relationship to standard multi-atlas label fusion literature (STAPLE vs. majority vote)"
  - "Whether this is the same binary as in non-infant FreeSurfer"
tags:
  - label-fusion
  - multi-atlas
  - segmentation
  - infant
  - python
---

# mri_label_fusion

## Summary

`mri_label_fusion` performs multi-atlas label fusion to create a segmentation from multiple registered atlas label maps. It is a Python script located in the `infant/` subdirectory, suggesting it was developed primarily for [[infant-recon-all|infant]] brain segmentation pipelines. It uses probabilistic methods including distance-based weighting, intensity Gaussian likelihood, and optionally graph cuts (via `maxflow`) to combine multiple atlas segmentations into a final consensus label map.

## Source Information

- **Source language:** Python
- **Source file:** `infant/mri_label_fusion`
- **Dependencies:** `surfa`, `nibabel`, `scipy`, `fsbindings` (specifically `fsbindings.labelfusion.maxflow` and `performFrontPropagation3D`)
- **Location note:** In `infant/` subdirectory — may be specific to the infant pipeline

## Purpose and Context

Multi-atlas label fusion is a powerful segmentation approach that:
1. Registers multiple labeled reference atlases to the target subject
2. Propagates labels from all atlases to the target space
3. Combines the propagated labels using a voting or probabilistic scheme

This produces more robust segmentations than using a single atlas, especially for structures with high inter-subject variability. The infant version incorporates intensity-based likelihood models (Gaussian per label) and front-propagation-based distance weighting.

## Inputs

> [!gap] Full input specification not traced
> The Python script arguments require further reading to fully characterize.

Inferred from source code patterns:

| Input | Description |
|-------|-------------|
| Target image | Subject to segment |
| Atlas images | Multiple registered atlas intensity images |
| Atlas labels | Corresponding label maps from each atlas |
| Gaussian parameters | Per-label mean (`mus`) and variance (`sigmas`) for intensity likelihood |

## Outputs

| Output | Description |
|--------|-------------|
| Segmentation label map | Consensus segmentation volume |

## Mathematical Foundations

The label fusion combines:

**Distance-based prior:**
$$
p(\text{label}_l | \text{pos}) \propto d_l(\mathbf{x})
$$

where $d_l(\mathbf{x})$ is the propagated distance map from atlas label $l$, computed via `performFrontPropagation3D()` (a fast marching front propagation).

**Intensity likelihood (Gaussian model):**
$$
p(y | \text{label}_l) = \mathcal{N}(y \cdot e^{B(\mathbf{x})} ; \mu_l, \sigma_l^2) \cdot e^{B(\mathbf{x})}
$$

where $B(\mathbf{x})$ is a polynomial bias field estimated during the fusion.

**Label posterior (combining all atlases):**
$$
p(\text{label} | y, \text{pos}) = \sum_k w_k \cdot p(\text{label}_l | \text{pos}) \cdot p(y | \text{label}_l)
$$

where $w_k$ are atlas-specific weights from the distance maps.

**Optional graph cut refinement:**
Spatial regularization is applied via `maxflow` (graph cut optimization) to enforce spatial coherence of the final labeling.

**Bias field model:**
The bias field is parameterized as a polynomial expansion `psi` over spatial coordinates (computed in `prepBiasFieldBase()`), optimized jointly with the label posteriors via `singleChannelCostGrad()`.

## Configuration Options

### Complete Flag Reference

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i` / `--image` | `<file>` | required | Input image filename (the target subject to segment). |
| `-s` / `--segs` | `<file> [file …]` | required | One or more aligned segmentation files to fuse (multi-atlas label maps). Accepts multiple space-separated paths. |
| `-o` / `--out` | `<file>` | required | Output segmentation filename. The output directory must already exist. |
| `-r` / `--rho` | `<float>` | required | Rho parameter controlling the sharpness of the distance-based prior. Scales the distance transform values before the softmax; higher values make the prior more peaked around label boundaries. |
| `--smooth` | (none) | off | Apply Markov random field (MRF) label smoothing after the main optimization, using graph cuts (`maxflow`) to enforce spatial coherence. |
| `-b` / `--beta` | `<float>` | `0.3` | MRF smoothness weight. Controls the strength of the pairwise spatial regularization term in the Q-step. Only meaningful when `--smooth` is active or beta > 0 in the Q update loop. |
| `--bias` | `<file>` | — | If given, save the estimated bias field volume to this filename. |
| `--bf-order` | `<int>` | `4` | Polynomial order of the bias field model. Higher order allows more spatially complex bias fields but increases computation time. |
| `--max-lab` | `<int>` | `3` | Maximum number of top-weighted labels retained per voxel per atlas when constructing the distance prior. Reduces memory and computation by discarding low-probability labels. |
| `-e` / `--exclude` | `<int> <int> <int> <int>` | — | Exclude a set of 4 label IDs from the fusion. Can be repeated. Used to suppress unreliable or pathological label pairs across atlases. |
| `--unary-weight` | `<int>` | `5` | Weight applied to the unary (likelihood) term in the graph-cut cost when `--smooth` is used. Higher values bias the MRF toward the intensity-based posterior and away from smoothness. |
| `--seed` | `<int>` | `1234` | Seed for NumPy's random number generator, used in the downsampling step for bias field estimation. Fixing the seed makes runs reproducible. |
| `-v` / `--verbose` | (none) | off | Print verbose progress output during optimization. |

## Typical Use Cases

This tool is primarily invoked by the FreeSurfer infant pipeline scripts, not directly by end users.

## Pipeline Context

`mri_label_fusion` is part of the infant brain segmentation pipeline:
- **Upstream:** Atlas registration (each atlas registered to target)
- **Downstream:** Post-processing of the fused segmentation

## Gotchas and Caveats

> [!gotcha] Python dependencies required
> Requires `surfa`, `nibabel`, `scipy`, and `fsbindings` to be available in the `fspython` environment.

> [!gotcha] Infant-specific pipeline
> Located in `infant/`, this script is designed for the infant FreeSurfer pipeline. Its suitability for adult brain segmentation is not confirmed.

## Related Tools

- [[mri_label2label]] — maps labels between subjects (single-atlas mapping)
- [[mri_ca_label]] — atlas-based segmentation (GCA model)

## Confidence and Gaps

**Confident (from source):** Distance-based prior, Gaussian intensity likelihood, bias field correction, graph cut refinement, polynomial bias field model.

**Uncertain:** Full command-line interface; all configurable parameters; whether tool is installed in standard (non-infant) FreeSurfer 8.2.0.
