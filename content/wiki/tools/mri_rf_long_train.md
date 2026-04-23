---
title: "mri_rf_long_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_rf_long_train/mri_rf_long_train.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_rf_train]]"
  - "[[mri_rf_long_label]]"
  - "[[mri_rf_label]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Maximum number of timepoints supported (MAX_TIMEPOINTS=20 from source)"
tags:
  - random-forest
  - longitudinal
  - training
  - wmsa
---

# mri_rf_long_train

## Summary

`mri_rf_long_train` trains a longitudinal Random Forest Array (RFA) classifier using data from multiple subjects, each with multiple timepoints. The resulting RFA encodes both cross-sectional and temporal intensity features for classification tasks such as white matter signal abnormality (WMSA) detection that leverages within-subject longitudinal change. The trained classifier is used by [[mri_rf_long_label]].

## Source Information

- **Language:** C++
- **Source file:** `mri_rf_long_train/mri_rf_long_train.cpp`
- **Original author:** Bruce Fischl
- **Key includes:** `rfa.h`, `gca.h`, `gcamorph.h`, `rforest.h`, `talairachex.h`
- **Constant:** `MAX_TIMEPOINTS = 20` (maximum timepoints per subject)

## Purpose and Context

Standard RFA training ([[mri_rf_train]]) uses independent cross-sectional data. `mri_rf_long_train` extends this by accepting multi-timepoint data per subject and building a classifier that can leverage longitudinal features — intensity changes between timepoints — in addition to standard cross-sectional intensity features. This is particularly useful for detecting subtle changes in white matter signal that may not be distinguishable from normal variation in a single scan but are clearly progressive across time.

The tool follows the same general structure as [[mri_rf_train]] but with additions for:
- Accepting multiple timepoint volumes per subject
- Computing inter-timepoint difference features
- Training the RFA with the expanded feature set

## Inputs

- Multiple subjects, each with multiple T1-weighted volumes (one per timepoint)
- Manual segmentation labels for training (e.g., `seg_edited.mgz`)
- GCA atlas file
- Talairach transforms for each subject
- Optional: T2/FLAIR volumes, WMSA manual labels

## Outputs

- **Trained longitudinal RFA file:** Binary file encoding the trained random forest ensemble with longitudinal features

## Mathematical Foundations

The training procedure:
1. For each subject, load all timepoint volumes and the corresponding manual segmentation.
2. For each labeled voxel, compute a feature vector combining:
   - Standard cross-sectional features (local intensity statistics at each timepoint)
   - Temporal features: intensity differences and ratios between timepoints
3. Train a random forest at each atlas-space node using the combined feature vectors and labels.

The RFA structure organizes the ensemble by atlas-space location, allowing spatially varying classification.

> [!math] Feature vector
> For $T$ timepoints, the feature vector at voxel $v$ includes:
> $$
> \mathbf{f}(v) = [\text{local features}(I_1(v)), \ldots, \text{local features}(I_T(v)), \Delta I_{12}(v), \ldots, \Delta I_{T-1,T}(v)]
> $$
> where $\Delta I_{ij}(v) = I_j(v) - I_i(v)$ are inter-timepoint intensity differences.

## Configuration Options

All flags are case-insensitive (`stricmp`). Single-letter flags are handled via `toupper()`. The flag list is verified from `get_option()` in the source; the option parser is nearly identical to [[mri_rf_train]] with one difference noted below.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-seg_dir` / `-seg` / `-segmentation` / `-parc_dir` | `<name>` | `seg_edited.mgz` | Segmentation volume name read from each subject's `mri/` directory. |
| `-T1` | `<name>` | `orig` | T1 intensity volume name within each subject's `mri/` directory. |
| `-input` | `<name>` | (T1 only) | Add additional input volume name (repeatable; first use replaces the T1 slot). |
| `-wmsa` | `<fname>` | — | Volume containing WMSA manual labels to include in training. |
| `-mask` | `<fname>` | — | Brain mask volume; voxels outside the mask are excluded from training. |
| `-xform` | `<name>` | `null` (use `talairach.xfm`) | Atlas transform filename (relative to subject's `mri/transforms/`). |
| `-noxform` | (none) | — | Disable application of the atlas transform. |
| `-conform` | `<int>` | `1` | `1` = assume volumes are already conformed; `0` = NOT conformed (takes an integer argument; does not itself resample). |
| `-make_uchar` | `<int>` | `1` | `1` = cast input volumes to unsigned char before training; `0` = do not. |
| `-binarize` | `<in> <out>` | — | Remap segmentation label `in` to `out` (binary classification mode). |
| `-insert` | `<fname> <label>` | — | Insert non-zero voxels from `fname` as label value `label` in the segmentation. |
| `-ctab` | `<fname>` | — | Read ASCII color table from `fname` and embed it in the output file. |
| `-gradient` | (none) | off | Add image gradient components (3 extra inputs) to the feature vector. |
| `-training_fraction` | `<float>` | RFA default | Fraction of training examples to use (subsample for faster training). |
| `-ntrees` | `<int>` | RFA default | Number of trees in each random forest classifier. |
| `-max_depth` | `<int>` | RFA default | Maximum depth of each decision tree. |
| `-W` | `<int>` | RFA default | Window half-size for feature extraction neighbourhood. |
| `-wmsa_whalf` | `<int>` | `0` | Only train on voxels within this many voxels of a WMSA boundary. |
| `-nbrs` | (none) | off | Train only on voxels adjacent to both a WMSA and a non-WMSA voxel. |
| `-max_ratio` | `<float>` | `5.0` | Maximum WM:WMSA ratio for class-balanced sampling during training. |
| `-T` | `<float>` | `0.8` | WM atlas prior threshold for selecting WM training examples. |
| `-F` | (none) | off | Force use of all inputs even if acquisition parameters do not match. |
| `-smooth` | `<float>` | `-1` (off) | Smoothing parameter for conditional statistics (must be in `(0, 1]`). |
| `-S` | `<float>` | `0` (off) | Scale all input volumes by this factor after reading. |
| `-A` | `<int>` | `0` | Number of mean-filter passes to apply to classifiers after training. |
| `-L` | `<fname>` | — | Log out-of-bag accuracy to this file. |
| `-G` | `<gca_fname>` | — | Train a single global classifier (not an RFA) using the GCA atlas at `gca_fname`. Note: in [[mri_rf_train]] this flag is `-1`; here it is `-G`. |
| `-check` | (none) | off | Sanity-check training labels for obvious editing errors. |
| `-check_and_fix` | (none) | off | Sanity-check labels and write corrected segmentation to `seg_fixed.mgz`. |
| `-sdir` | `<dir>` | `$SUBJECTS_DIR` | Override the subjects directory. |
| `-debug_node` | `<x> <y> <z>` | — | Verbose debugging for atlas node at voxel `(x, y, z)`. |
| `-debug_voxel` | `<x> <y> <z>` | — | Verbose debugging for input voxel at `(x, y, z)`. |
| `-debug_label` | `<label>` | — | Verbose debugging for a specific segmentation label. |

## Configuration Interactions

- `-wmsa` provides WMSA-specific labels to augment standard anatomical training.
- `-binarize` remaps input/output label values; typically used to collapse multi-class labels to binary (WMSA vs. normal) for the classifier.
- `-G <gca>` bypasses the spatially distributed RFA and trains a single global random forest; this reduces spatial specificity but may be useful for small training sets. (Contrast with [[mri_rf_train]] where this function is `-1 <gca>`.)
- `-conform 0` explicitly disables the conformation assumption; the flag takes an integer argument and does not itself resample volumes.

## Typical Use Cases

```bash
# Train a longitudinal WMSA classifier
mri_rf_long_train \
  subject1/tp1/mri/T1.mgz subject1/tp2/mri/T1.mgz \
  subject2/tp1/mri/T1.mgz subject2/tp2/mri/T1.mgz \
  wmsa_atlas.gca \
  long_wmsa_classifier.rfa
```

## Pipeline Context

`mri_rf_long_train` is not part of the standard [[recon-all]] pipeline. It is a research tool for training longitudinal WMSA classifiers on site-specific data.

## Gotchas and Caveats

> [!gotcha] MAX_TIMEPOINTS limit
> The code defines `MAX_TIMEPOINTS = 20`; training with more than 20 timepoints per subject will fail.

> [!gotcha] Requires manual segmentations
> Training requires manually labeled segmentations (`seg_edited.mgz`) for all training subjects. The quality of the trained classifier is highly dependent on the quality and consistency of these manual labels.

## Related Tools

- [[mri_rf_train]] — Cross-sectional RF training
- [[mri_rf_long_label]] — Applies the trained longitudinal RFA
- [[mri_rf_label]] — Applies a cross-sectional RFA

## Confidence and Gaps

**High confidence:** Source language, file location, MAX_TIMEPOINTS constant, general training procedure structure (matches mri_rf_train pattern). Flag list verified from `get_option()` in source.
