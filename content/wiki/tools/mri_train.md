---
title: "mri_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_train/mri_train.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_twoclass]]"
  - "[[mri_segment]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Relationship between trained classifier and mri_classify not investigated."
tags:
  - machine-learning
  - classifier
  - training
  - random-forest
  - white-matter
---

# mri_train

## Summary

`mri_train` trains a voxel-based classifier (by default a Random Forest, with Radial Basis Function as an alternative) for labeling voxels in MRI volumes. It is used to train custom classifiers for white matter lesion segmentation (WMSA) or other voxel classification tasks. The trained model is saved for later use with a corresponding classification tool.

## Source Information

- **Language:** C++
- **Source file:** `mri_train/mri_train.cpp`
- **Original author:** Bruce Fischl (MGH)
- **Key libraries:** `rforest.h`, `classify.h`, `mriclass.h`, `cma.h`
- **Default classifier:** `CLASSIFIER_RFOREST` (Random Forest)

## Purpose and Context

FreeSurfer contains machine-learning-based tools for tissue classification that were used before deep-learning became dominant. `mri_train` generates classifiers trained on labeled MRI data. The default application is white matter signal abnormality (WMSA) detection.

Default features used:
- `FEATURE_INTENSITY` — raw MRI intensity at voxel
- `FEATURE_MEAN3` — mean intensity in 3×3×3 neighbourhood
- `FEATURE_DIRECTION` — gradient direction
- `FEATURE_CPOLV_MEDIAN5` — CPOLV (cortical proximity and local variance) median over 5 voxels

## Inputs

Input volumes are specified by name (default: `norm.mgz`) and a segmentation target (default: `wmsa/wmsa.mgz`). Additional longitudinal timepoints and input volume names can be added.

> [!gap] Complete input specification
> The full argument parsing was not read. Inputs are likely: subject directory, norm volumes, ground truth segmentation, and output classifier file.

## Outputs

A trained classifier file (format depends on classifier type):
- Random Forest: `.rf` binary file
- RBF: binary file via `classify.h` serialization

## Mathematical Foundations

### Random Forest

The default classifier is a Random Forest: an ensemble of decision trees trained with random feature subsets:

1. For each tree, a random subset of training voxels (bootstrap) is sampled.
2. At each split node, a random subset of features is evaluated.
3. The optimal split threshold is chosen to maximise class separation (Gini impurity or entropy).
4. Prediction is by majority vote across all trees.

Feature extraction window size: `wsize = 1` (default), meaning a 3×3×3 neighbourhood.

### Longitudinal features

When `--long` is used, voxel values from multiple timepoints are concatenated as additional features.

## Configuration Options

The flag list is fully verified from `get_option()` in the source. All flags use single-dash prefix and case-insensitive matching.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-long` | `<name> <time>` | (none) | Add a longitudinal timepoint: `name` is the subject directory prefix for the timepoint, `time` is the acquisition time (float). Repeatable; up to `MAX_LONG = 1000` timepoints. |
| `-vol` | `<volname>` | `norm.mgz` | Add an input volume name (repeatable; up to `MAX_VOLS = 10`). Replaces or extends the default `norm.mgz` input. |
| `-seg` | `<segname>` | `wmsa/wmsa.mgz` | Segmentation volume name used as training ground truth. |
| `-sdir` | `<dir>` | `$SUBJECTS_DIR` | Override the subjects directory (must be set here or in environment). |
| `-classify` | `<fname>` | — | Write out-of-bag classifications to `fname`. |
| `-ntrees` | `<int>` | `500` | Number of trees in the random forest. |
| `-training_fraction` | `<float>` | `0.001` | Fraction of training examples to use per tree (bootstrap). |
| `-feature_fraction` | `<float>` | `1.0` | Fraction of features to consider at each split node. |
| `-max_depth` | `<int>` | `10` | Maximum depth of each decision tree. |
| `-cpolv` | (none) | off | Enable training of CPOLV (cortical proximity and local variance) feature. |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable verbose diagnostics for voxel at `(x, y, z)`. |
| `-W` | `<int>` | `1` | Feature extraction window half-size (neighbourhood radius in voxels); default 1 gives a 3×3×3 window. |
| `-F` | `<hex>` | `0x...` (default feature set) | Feature bitmask in hexadecimal. Overrides default combination of `FEATURE_INTENSITY`, `FEATURE_MEAN3`, `FEATURE_DIRECTION`, `FEATURE_CPOLV_MEDIAN5`. |
| `-N` | `<int>` | `0` | Number of RBF clusters per class (only used when classifier is not random forest). |
| `-P` | `<fname>` | `none` | Priors file for RBF classifier. |
| `-X` | `<int>` | `0` | Feature extraction control flag (integer). |
| `-V` | (none) | off | Toggle verbose output (flips `verbose` flag). |

## Typical Use Cases

**1. Train a WMSA classifier:**
```bash
mri_train subject1 subject2 subject3 wmsa_classifier.rf
```

**2. With longitudinal data:**
```bash
mri_train --long tp2 2.0 subject1 classifier.rf
```

## Pipeline Context

Not part of standard `recon-all`. Part of specialized white matter analysis workflows.

## Gotchas and Caveats

> [!gotcha] Legacy tool
> This tool predates modern deep-learning segmentation. For new projects, consider `mri_synthseg` instead.

## Related Tools

- [[mri_twoclass]] — morphometric analysis tool
- [[mri_segment]] — WM segmentation

## Confidence and Gaps

Flag list fully verified from `get_option()`. RF hyperparameter defaults confirmed from `main()`. Confidence is **high** for configuration options. The relationship between this tool's output and any downstream classifier application tool remains unverified.
