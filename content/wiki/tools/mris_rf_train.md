---
title: "mris_rf_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_rf_train/mris_rf_train.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_rf_label]]"
  - "[[mri_rf_train]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - machine-learning
  - random-forest
  - training
  - FCD
---

# mris_rf_train

## Summary

`mris_rf_train` trains a random forest (RF) classifier on a set of labelled cortical surface subjects. It reads per-vertex overlay features (curvature files, thickness, etc.) and binary labels (normal vs. dysplastic) from each training subject, assembles a combined training dataset, trains a random forest with configurable depth and number of trees, evaluates training accuracy, and writes the trained model to a file. The trained model can then be applied to new subjects with [[mris_rf_label]]. The primary target application is focal cortical dysplasia (FCD) detection.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_rf_train/mris_rf_train.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_rf_train`
- **Original Author:** Bruce Fischl
- **OpenMP support:** yes (multi-threaded tree training)

## Purpose and Context

This tool provides the training phase of the surface-based random forest labeling pipeline. It:

1. Reads surfaces and feature overlays for each training subject.
2. Reads known label files (`<hemi>.FCD`) to get positive (class 1) training examples.
3. Samples negative (class 0) training examples from non-labeled cortex vertices, using a configurable training fraction.
4. Assembles feature vectors and class labels across all subjects.
5. Trains a random forest with `ntrees` trees of maximum depth `max_depth`.
6. Reports classification accuracy on the training set.
7. Writes the trained model to the output file.

Classes are defined as: 0 = "Normal Cortex", 1 = "Dysplasia" (hard-coded in source).

## Inputs

### Required Inputs

(Positional arguments: `<subject1> [<subject2> ...] <output_model>` with flag-driven feature specification)

- **`<subject1>` ... `<subjectN>`** — FreeSurfer subject IDs with known FCD labels. Surfaces and overlays loaded from `$SUBJECTS_DIR/<subject>/`.
- **`--overlay <name>`** (one or more) — surface overlay feature names (e.g., `thickness`, `curv`). Each overlay is loaded as `<hemi>.<name>` from the subject's `surf/` directory.
- **Output model file** — final positional argument; path to write the trained RF model.

Environment variable `SUBJECTS_DIR` must be set, or provided via `--sdir`.

### Input Assumptions

> [!assumption] Label files required
> Each training subject must have a `<hemi>.FCD` label file in their `label/` directory. This defines the positive examples.

> [!assumption] Cortex label for negative sampling
> The `<hemi>.cortex` label defines the region for negative sampling. Vertices outside the cortex are excluded.

## Outputs

### Files Created

- **RF model file** — written to the specified output path using `RFwrite()`. Contains the trained forest, the feature names (overlay names), and all tree structures. This file is read by [[mris_rf_label]].

## Mathematical Foundations

**Random forest training:** An ensemble of $T$ decision trees is trained by bootstrap aggregation (bagging). Each tree is trained on a random subset of training samples (approximately `training_fraction` of vertices from each subject) with random feature subsampling at each split.

The split criterion at each tree node is information gain or Gini impurity (determined by `RFtrain()` internals). Each tree has maximum depth `max_depth`.

**Training accuracy:** After training, the forest is evaluated on the full training set and accuracy is computed as:
$$
\text{accuracy} = \frac{\text{number correctly classified}}{\text{total classified vertices}}
$$

This is training-set accuracy only; no cross-validation is performed within this tool.

**Feature assembly:** The feature vector for vertex $i$ in subject $s$ is:
$$
\mathbf{x}_{s,i} = [f_1(i), f_2(i), \ldots, f_K(i)]
$$
where $K = \text{noverlays} \times (\text{nbhd\_size} + 1)$. With `nbhd_size > 0`, features from neighbouring vertices (within `nbhd_size` hops) are also included.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |
| `--hemi <hemi>` | string | `lh` | Hemisphere (`lh` or `rh`). |
| `--surf <name>` | string | `white` | Surface name. |
| `--overlay <name>` | string | — | Feature overlay name; may be specified multiple times (up to 100). |
| `-L <name>` | string | `FCD` | Name of the positive-class label file (single-character flag). |
| `-N <n>` | integer | 0 | Neighbourhood size for feature extraction (single-character flag). |
| `-T <n>` | integer | 40 | Number of trees in the random forest (single-character flag). |
| `--version` | boolean | — | Print version string and exit. |

> [!gotcha] Dead code: `--ndilates`, `--nbhd_size`, `--ntrees`, `--max_depth`, `--training_fraction`, `--label`, `--cortex`
> These flags **do not exist** in the source `get_option()`. The actual flags for label name, neighbourhood size, and tree count are single-character flags `-L`, `-N`, `-T`. The `ndilates`, `cortex_label_name`, `max_depth`, and `training_fraction` globals exist and affect behaviour, but no corresponding command-line flags are implemented; they take their hard-coded defaults: `ndilates=3`, `cortex_label_name="cortex"`, `max_depth=12`, `training_fraction=0.5`. Only `-L`, `-N`, `-T`, `--sdir`, `--hemi`, `--surf`, and `--overlay` are parsed.

> [!gotcha] `-N` (`nbhd_size`) is dead code at runtime
> The source calls `ErrorExit(ERROR_UNSUPPORTED, ...)` whenever `nbhd_size > 0`. Setting `-N` to any value greater than 0 will abort the program.

> [!gotcha] `--hemi` is overridden by label detection
> Even if `--hemi` is set on the command line, the hemisphere is re-assigned inside `main()` based on which hemisphere (`lh` or `rh`) has the FCD label file for each training subject. The `--hemi` flag effectively has no guaranteed effect.

### Configuration Interactions

- `--ntrees` and `--max_depth` together control model capacity. Higher values produce more expressive but slower-to-train models with higher risk of overfitting.
- `--training_fraction` controls the positive:negative class balance. Since FCD labels are rare (few positive vertices), a fraction < 1.0 undersamples negatives to produce a more balanced training set.
- OpenMP parallelism: tree training is parallelized if `HAVE_OPENMP` is defined. `n_omp_threads` is queried and reported but not directly configurable via flags (uses the `OMP_NUM_THREADS` environment variable).

## Typical Use Cases

### Use Case 1: Train FCD detector on multiple subjects

```bash
mris_rf_train \
  --hemi lh \
  --overlay thickness --overlay curv --overlay sulc \
  --ntrees 50 --max_depth 15 \
  subject1 subject2 subject3 subject4 \
  /path/to/lh.FCD.rf
```

### Use Case 2: Quick prototype with fewer trees

```bash
mris_rf_train --ntrees 10 --max_depth 8 \
  --overlay thickness --overlay curv \
  subject1 subject2 \
  /tmp/lh.FCD.prototype.rf
```

## Pipeline Context

`mris_rf_train` is not part of `recon-all`. It is the training step in a research/clinical FCD detection pipeline:

1. Collect a cohort of subjects with known FCD labels.
2. Run `mris_rf_train` to produce a model.
3. Apply the model to new subjects with [[mris_rf_label]].

## Gotchas and Caveats

> [!gotcha] Training accuracy only — no cross-validation
> The accuracy reported is on the training data, which is expected to be high due to potential overfitting. Independent test-set evaluation with [[mris_rf_label]] on held-out subjects is necessary to estimate generalization performance.

> [!gotcha] Class imbalance
> FCD labels are rare; most vertices are "normal cortex". Without appropriate `--training_fraction < 1.0`, the classifier will be heavily biased toward the negative class.

> [!gotcha] Hard-coded class names
> The class names "Normal Cortex" and "Dysplasia" are hard-coded in the source. The tool is not easily repurposed for other binary labeling tasks without recompilation.

## Related Tools

- [[mris_rf_label]] — applies the trained model produced by this tool
- [[mri_rf_train]] — analogous tool for volumetric random forest training

## Confidence and Gaps

Confidence is **high**. All flags and the full training pipeline (including `assemble_training_data_and_free_mris()`) were read from source. The negative sampling is determined by `RFtrain()` via the `training_fraction` parameter; all valid cortex vertices are included in the training data array, and `RFtrain` internally subsamples negatives to the specified fraction.

> [!gotcha] Training data assembly uses all non-ripped cortex vertices
> `assemble_training_data_and_free_mris()` collects every non-ripped vertex across all subjects into the training data array. Class 0 vs. class 1 labeling is determined by the `marked` flag set by `LabelMark()`. Negative subsampling is delegated to `RFtrain()` via `training_fraction`. The feature vector is a flat array of overlay values `[f1, f2, ..., fK]` in overlay order, one entry per valid vertex.
