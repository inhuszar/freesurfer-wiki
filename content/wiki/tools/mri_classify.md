---
title: "mri_classify"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_classify/mri_classify.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mri_ca_train]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Attic status — likely not in standard distribution"
  - "mriclass file format not documented"
tags:
  - classification
  - random-forest
  - machine-learning
  - attic
---

# mri_classify

## Summary

`mri_classify` trains or applies an MRI voxel classifier using intensity features. It supports a Random Forest classifier (`-ca rforest`, default) or an older RBF-based approach. Given a training file listing labeled MRI volumes, it trains a classifier and writes the model (`MRIC` file). It is the precursor to the GCA atlas system and is found in the `attic/` directory.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_classify/mri_classify.cpp`
- **Original author:** Bruce Fischl

> [!gotcha] Attic status
> This tool is in `attic/` and is almost certainly superseded by the GCA-based tools ([[mri_ca_train]], [[mri_ca_label]]). It may not be compiled in standard installations.

## Purpose and Context

`mri_classify` is a legacy tool from FreeSurfer's pre-GCA era. It trains statistical classifiers (initially RBF/clustering, later Random Forest) on multi-feature intensity data to classify MRI voxels into tissue classes (WM, GM, CSF, etc.). The trained model (MRIC format) could be applied to new volumes to produce segmentations.

The Random Forest option (`-ca rforest`) is more recent and may still be functional, but the current pipeline uses the GCA framework exclusively.

## Inputs

- `<training_file>` — a file listing labeled training volumes and their segmentations
- `<mric_file>` — output classifier model file path

## Outputs

- An MRIC classifier model file usable for tissue classification.

## Mathematical Foundations

**Features** (default combination): voxel intensity, local mean (3×3×3 neighborhood), gradient direction, and 5-tap CPOLV median filter. The feature mask is `FEATURE_INTENSITY | FEATURE_MEAN3 | FEATURE_DIRECTION | FEATURE_CPOLV_MEDIAN5`.

**Random Forest classifier:** Ensemble of decision trees trained on the feature vectors, each tree trained on a bootstrap sample.

**RBF/clustering classifier:** Each class is modeled with $k$ Gaussian RBF cluster centers (default 6 per WM/GM class, 3 for others), optimized to minimize classification error.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-N <N>` | int | 6 | Number of RBF clusters per class |
| `-F <hex>` | hex-int | default feature mask | Feature set (hex flags) |
| `-P <file>` | string | `none` | Priors file |
| `-X <N>` | int | — | Extract mode (debug) |
| `-cpolv` | flag | off | Train with CPOLV features only |
| `-V` | flag | off | Verbose output |

## Pipeline Context

Not a [[recon-all]] stage. Superseded by [[mri_ca_train]] + [[mri_ca_label]].

## Related Tools

- [[mri_ca_train]] — modern GCA atlas training (replacement)
- [[mri_ca_label]] — modern GCA-based segmentation (replacement)
- [[mri_segment]] — WM segmentation in recon-all

## Confidence and Gaps

Source code read. Confidence is medium; attic status limits verification.

> [!gap] MRIC file format
> The classifier model file format (MRIC) is defined in `mriclass.h`/`classify.h`. Not documented in available external sources.
