---
title: "mri_rf_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_rf_train/mri_rf_train.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_rf_label]]"
  - "[[mri_rf_long_train]]"
  - "[[mri_ca_label]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "RFA file format not documented"
tags:
  - random-forest
  - training
  - classification
  - wmsa
  - atlas
---

# mri_rf_train

## Summary

`mri_rf_train` trains a Random Forest Array (RFA) atlas classifier from a set of labeled training subjects. Each training subject contributes intensity volumes (typically T1) and a corresponding manual segmentation. The trained RFA encodes a spatially distributed ensemble of random forests, one per atlas-space region, used by [[mri_rf_label]] to classify voxels in new subjects.

## Source Information

- **Language:** C++
- **Source file:** `mri_rf_train/mri_rf_train.cpp`
- **Original author:** Bruce Fischl
- **Key includes:** `rforest.h`, `rfa.h`, `gca.h`, `talairachex.h`
- **Key data type:** `RFA_PARMS` (random forest array parameters)

## Purpose and Context

`mri_rf_train` is the training complement to [[mri_rf_label]]. It takes a set of subjects with manually labeled segmentations and trains a spatially indexed ensemble of random forest classifiers. The classifier is organized as a Random Forest Array (RFA): each node in the RFA corresponds to a region of the Talairach/atlas space and contains a classifier trained only on training examples from that region. This spatial organization allows the classifier to learn region-specific intensity patterns.

The primary application is WMSA (white matter signal abnormality) detection, but the framework is general enough for other voxel classification tasks.

> [!assumption] Input data assumption
> All training subjects must have Talairach transforms computed, and manual segmentations must be available. The default segmentation filename is `seg_edited.mgz`.

## Inputs

- **Training subject directories:** Each subject contributes volumes named by `-T1` (default: `orig`) and segmentations named by `-seg_dir` (default: `seg_edited.mgz`).
- **GCA atlas:** A [[gca-format|Gaussian Classifier Atlas]] for atlas-space coordinate mapping.
- **Output RFA file:** Path for the trained classifier.

## Outputs

- **RFA file:** Binary file encoding the trained random forest ensemble, loadable by [[mri_rf_label]] and [[mri_rf_long_label]].

## Mathematical Foundations

The Random Forest Array training procedure:

1. For each training subject, all labeled voxels are extracted.
2. Each voxel is mapped to atlas space using the Talairach transform.
3. For each atlas-space node, a random forest is trained on the set of labeled voxels that map to that node's region.
4. Feature vectors include local intensity statistics, neighborhood intensity distributions, and optionally Talairach coordinates.

**Random forest:**
Each tree $T_k$ in the forest is trained by:
- Randomly sampling $\sqrt{F}$ features at each split (where $F$ is total features)
- Maximizing information gain at each node
- Growing until leaf purity or maximum depth is reached

The ensemble prediction is the majority vote across trees:
$$
\hat{y}(v) = \text{mode}\{T_k(v)\}_{k=1}^{K}
$$

## Configuration Options

All flags are case-insensitive (`stricmp`). Single-letter flags are handled via `toupper()`, so `-T` and `-t` are equivalent.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-seg_dir` / `-seg` / `-segmentation` / `-parc_dir` | `<name>` | `seg_edited.mgz` | Segmentation volume name read from each subject's `mri/` directory. |
| `-T1` | `<name>` | `orig` | T1 intensity volume name within each subject's `mri/` directory. |
| `-input` | `<name>` | (T1 only) | Add additional input volume name (repeatable; first use replaces the T1 slot). |
| `-wmsa` | `<fname>` | — | Volume containing WMSA manual labels to include in training. |
| `-mask` | `<fname>` | — | Brain mask volume; voxels outside the mask are excluded from training. |
| `-xform` | `<name>` | `null` (use `talairach.xfm`) | Atlas transform filename (path relative to subject's `mri/transforms/`). |
| `-noxform` | (none) | — | Disable application of the atlas transform. |
| `-conform` | `<int>` | `1` | `1` = assume volumes are already conformed; `0` = NOT conformed (note: this flag takes an integer, it does not itself perform conforming). |
| `-make_uchar` | `<int>` | `1` | `1` = cast input volumes to unsigned char before training; `0` = do not. |
| `-binarize` | `<in> <out>` | — | Remap segmentation label `in` to `out` (binary classification mode). |
| `-insert` | `<fname> <label>` | — | Insert non-zero voxels from `fname` as label value `label` in the segmentation. |
| `-ctab` | `<fname>` | — | Read ASCII color table from `fname` and embed it in the output file. |
| `-gradient` | (none) | off | Add image gradient components (3 extra inputs: ∇x, ∇y, ∇z) to the feature vector. |
| `-spacing` | `<float>` | RFA default | Node spacing (mm) between classifiers in canonical atlas space. |
| `-training_fraction` | `<float>` | RFA default | Fraction of training examples to use (subsampling for faster training). |
| `-ntrees` | `<int>` | RFA default | Number of trees in each random forest classifier. |
| `-max_depth` | `<int>` | RFA default | Maximum depth of each decision tree in the forest. |
| `-W` | `<int>` | RFA default | Window half-size for feature extraction neighbourhood. |
| `-wmsa_whalf` | `<int>` | `0` | Only train on voxels within this many voxels of a WMSA boundary (0 = all voxels). |
| `-nbrs` | (none) | off | Train only on voxels adjacent to both a WMSA and a non-WMSA voxel. |
| `-max_ratio` | `<float>` | `5.0` | Maximum WM:WMSA ratio for class-balanced sampling during training. |
| `-T` | `<float>` | `0.8` | WM atlas prior threshold: only voxels with WM prior ≥ this value are included as WM training examples. |
| `-F` | (none) | off | Force use of all inputs even if acquisition parameters do not match. |
| `-smooth` | `<float>` | `-1` (off) | Smoothing parameter applied to conditional statistics (must be in `(0, 1]`). |
| `-S` | `<float>` | `0` (off) | Scale all input volumes by this factor after reading. |
| `-A` | `<int>` | `0` | Apply this many mean-filter passes to classifiers after training. |
| `-L` | `<fname>` | — | Log out-of-bag accuracy to this file. |
| `-1` | `<gca_fname>` | — | Train a single global classifier (not an RFA array) using the GCA atlas at `gca_fname`. |
| `-check` | (none) | off | Sanity-check training labels for obvious editing errors. |
| `-check_and_fix` | (none) | off | Sanity-check labels and write corrected segmentation to `seg_fixed.mgz`. |
| `-sdir` | `<dir>` | `$SUBJECTS_DIR` | Override the subjects directory. |
| `-debug_node` | `<x> <y> <z>` | — | Enable verbose debugging for atlas node at voxel `(x, y, z)`. |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable verbose debugging for input voxel at `(x, y, z)`. |
| `-debug_label` | `<label>` | — | Enable verbose debugging for a specific segmentation label. |

## Configuration Interactions

- `-nbrs` focuses training on boundary voxels (adjacent to WMSA), which can improve classifier sensitivity at lesion borders but may reduce specificity in WM interior.
- `-max_ratio` controls class imbalance: with the default 5.0, at most 5 WM voxels are sampled per WMSA voxel during training, preventing the classifier from being overwhelmed by normal WM examples.
- `-1 <gca>` bypasses the spatially organized RFA and trains a single global classifier. Useful for small training sets but loses spatial specificity.
- `-conform 0` explicitly disables the conformation assumption; `-conform 1` (default) assumes volumes are pre-conformed. The flag does not itself resample volumes.

## Typical Use Cases

```bash
# Train a WMSA random forest classifier on 10 subjects
mri_rf_train \
  -wmsa wmsa_manual.mgz \
  subject1 subject2 subject3 subject4 subject5 \
  subject6 subject7 subject8 subject9 subject10 \
  wmsa_atlas.gca \
  wmsa_classifier.rfa
```

## Pipeline Context

`mri_rf_train` is not part of [[recon-all]]. It is used offline to train site-specific WMSA classifiers. The trained classifier is then applied with [[mri_rf_label]] on new subjects.

## Gotchas and Caveats

> [!gotcha] Class imbalance
> WMSA voxels are typically a very small fraction of all white matter voxels. Without the `-max_wm_wmsa_ratio` control, training data would be overwhelmingly normal WM, producing a classifier with high specificity but low sensitivity for WMSA.

> [!gotcha] Training and test preprocessing must match
> The same preprocessing steps (conforming, smoothing) applied during training must also be applied to test volumes when running [[mri_rf_label]].

## Related Tools

- [[mri_rf_label]] — Applies the trained RFA to new subjects
- [[mri_rf_long_train]] — Longitudinal version of this training tool

## Confidence and Gaps

**High confidence:** Source language, file location, key training structures, `max_wm_wmsa_ratio` default (5.0), `wm_thresh` default (0.8), `max_steps` default (10), `force_inputs` default (1).

**High confidence:** Flag list verified from `get_option()` in source.

> [!gap] RFA file format
> The binary format of the `.rfa` output file is not documented. It is read/written by functions in `rfa.h`/`rfa.c`.

> [!note] Audit noise: `-1` false positive
> An automated audit may flag `-1` as C3 invalid. This IS a valid flag (`case '1':` at source line 807). The audit tool's flag-name validator requires the first character after the dash to be a letter or underscore, not a digit, so `-1` is rejected. The flag is confirmed present in source and in the wiki.
