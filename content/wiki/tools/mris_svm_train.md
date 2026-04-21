---
title: "mris_svm_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_svm_train/mris_svm_train.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_svm_classify]]"
  - "[[mris_ca_label]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "In attic/ - may not be in standard binary distribution."
  - "The exact training data format and input file structure need more detail."
tags:
  - SVM
  - training
  - surface
  - machine-learning
  - classification
---

# mris_svm_train

## Summary

`mris_svm_train` trains a Support Vector Machine (SVM) classifier on surface morphometry data from a set of training subjects. It reads per-vertex surface features from two classes of subjects, optimizes the SVM model, and writes the trained model to a file for application by [[mris_svm_classify]]. The tool is in the `attic/` directory.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_svm_train/mris_svm_train.cpp`
- **Location note:** In `attic/` directory; may not be compiled in standard installations.
- **Key library:** `svm.h` — FreeSurfer's internal SVM implementation
- **Key library:** `mrisurf`, `mrishash`, `cvector`

## Purpose and Context

Training a surface-based SVM requires labeled examples from two classes (e.g., subjects with a specific cortical region present vs. absent, or patients vs. controls). `mris_svm_train` collects per-vertex surface features (curvature, vertex areas, etc.) from class 1 and class 2 subjects, optionally applies smoothing, and optimizes an SVM using the Sequential Minimal Optimization (SMO) algorithm. The resulting model can then classify new subjects via [[mris_svm_classify]].

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Class 1 subjects (from `c1_name` dir) | Training subjects for class +1 (default dir: `class1`). | Subject names |
| Class 2 subjects (from `c2_name` dir) | Training subjects for class −1 (default dir: `class2`). | Subject names |
| Surface data | Per-vertex feature data for each subject. | Surface overlay |
| `SUBJECTS_DIR` | Standard FreeSurfer subjects directory. | — |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| SVM model file (`-w fname`) | Trained SVM model with support vectors and kernel parameters. | FreeSurfer SVM binary |
| Weights file (optional) | Per-vertex weights derived from the SVM. | Surface overlay |

## Mathematical Foundations

The SVM optimization minimizes:

$$
\min_{\mathbf{w}, b, \xi} \frac{1}{2}\|\mathbf{w}\|^2 + C \sum_i \xi_i
$$

subject to $y_i(\mathbf{w}^T \phi(\mathbf{x}_i) + b) \geq 1 - \xi_i$, $\xi_i \geq 0$.

Where $C$ is the regularization parameter (`svm_C`, default: `DEFAULT_SVM_C`), $\phi(\mathbf{x})$ is the feature map induced by the kernel, and $\xi_i$ are slack variables.

**Kernel options:**
- Linear: $K(\mathbf{x}_i, \mathbf{x}_j) = \mathbf{x}_i^T \mathbf{x}_j$
- Polynomial: $K(\mathbf{x}_i, \mathbf{x}_j) = (\mathbf{x}_i^T \mathbf{x}_j)^d$ with degree `poly_d`
- RBF: $K(\mathbf{x}_i, \mathbf{x}_j) = \exp(-\|\mathbf{x}_i - \mathbf{x}_j\|^2 / (2\sigma^2))$ with `rbf_sigma`

Optimization uses momentum-based gradient descent with `momentum`, convergence tolerance `tol` (`DEFAULT_SVM_TOL`), and maximum `max_iter = 1,000,000` iterations.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-sdir path` | directory | Overrides subjects directory root |
| `-w fname` | filename | Output SVM model filename |
| `-c1 name` | directory name | Class 1 subjects directory (default: `class1`) |
| `-c2 name` | directory name | Class 2 subjects directory (default: `class2`) |
| `-C value` | float | SVM regularization parameter (default: `DEFAULT_SVM_C`) |
| `-tol value` | float | Convergence tolerance (default: `DEFAULT_SVM_TOL`) |
| `-momentum M` | float | Optimization momentum (default: 0) |
| `-rbf sigma` | float | RBF kernel sigma (0 = no RBF, use linear) |
| `-poly d` | float | Polynomial kernel degree (0 = no polynomial) |
| `-max_iter N` | integer | Maximum optimization iterations (default: 1,000,000) |
| `-navgs N` | integer | Smoothing averages applied to input features |
| `-label name` | label name | Restrict training to vertices within label |
| `-prefix str` | string | Output file prefix |
| `-osub subject` | string | Output subject name |
| `-tsub subject` | string | Test subject for evaluation |

## Configuration Interactions

- `-rbf sigma` and `-poly d` select the kernel; specifying both is allowed (composes kernels) but unusual.
- `-navgs` smoothing must match the smoothing used at classification time ([[mris_svm_classify]]).
- `-label` restricts both feature extraction and SVM training to label vertices only.
- `-tol` and `-max_iter` control convergence; tighter tolerance requires more iterations.

## Typical Use Cases

**Train an SVM on curvature features from two subject groups:**
```bash
mris_svm_train \
  -c1 patients -c2 controls \
  -w lh.patient_svm.dat \
  -navgs 5
```

## Pipeline Context

`mris_svm_train` is not part of `recon-all`. It is used in research classification workflows:
1. Curate training subjects into class1 and class2 directories.
2. Run `mris_svm_train` to produce a model file.
3. Run [[mris_svm_classify]] with the model on new subjects.

> [!gotcha] Attic location
> The `attic/` location indicates this tool may not be compiled in standard FreeSurfer 8.2.0 builds.

## Gotchas and Caveats

> [!gotcha] Feature consistency required
> All training subjects must have the same surface resolution and registered sphere, and features must be computed with identical parameters. Inconsistent preprocessing corrupts the training data.

> [!gotcha] Large iteration limit
> `max_iter = 1,000,000` is the default. For large feature spaces, training can be slow. The momentum parameter can speed up convergence.

## Related Tools

- [[mris_svm_classify]] — applies the model trained by this tool
- [[mris_ca_label]] — atlas-based parcellation (higher-accuracy alternative for standard parcellations)
- [[surface-format]] — surface format reference

## Confidence and Gaps

**Medium confidence.** The SVM framework, kernel options, and key parameters are clear from the source. The exact training data input format needs confirmation.
