---
title: "mri_aseg_edit_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_aseg_edit_train/mri_aseg_edit_train.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_aseg_edit_reclassify]]"
  - "[[mri_ca_label]]"
  - "[[mri_ca_train]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Attic status — availability in installed binary uncertain"
  - "Precise CA_* input feature combinations not fully enumerated"
tags:
  - segmentation
  - SVM
  - machine-learning
  - training
  - aseg
---

# mri_aseg_edit_train

## Summary

`mri_aseg_edit_train` trains a Support Vector Machine (SVM) or Gaussian classifier to learn the difference between an automatically generated segmentation (`aseg.auto.mgz`) and a manually corrected one (`aseg.mgz`) for a specified anatomical label. The resulting model is then used by [[mri_aseg_edit_reclassify]] to automatically propagate manual corrections to new subjects.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_aseg_edit_train/mri_aseg_edit_train.cpp`
- **Original author:** Bruce Fischl

> [!gotcha] Attic status
> This tool is in the `attic/` directory and may not be compiled or distributed in standard installations.

## Purpose and Context

Manual corrections of atlas-based segmentations are valuable but expensive. This tool implements a supervised learning approach: given a set of subjects where a trained human has corrected a specific label (e.g., Left_fimbria), the tool extracts multi-scale texture features from the difference between the auto and manual segmentations and trains a classifier to distinguish correct from incorrect boundary voxels. The trained model can then be applied to new subjects via [[mri_aseg_edit_reclassify]].

The classifier can be a Support Vector Machine (using the FreeSurfer `svm.h` library) or a Gaussian class array (`CA_GAUSSIAN`, the default).

## Inputs

Positional arguments:
1. `<subjects_dir_file>` — file listing subject names to use for training, OR the first subject name (varies by mode)
2. `<output_model>` — path to write the trained classifier

Required option:
- `-w <wfile>` — output model/weights file

The tool reads per-subject:
- `<SUBJECTS_DIR>/<subject>/<aseg_edit_name>` — manually edited aseg (default: `aseg.mgz`)
- `<SUBJECTS_DIR>/<subject>/<aseg_orig_name>` — auto-generated aseg (default: `aseg.auto.mgz`)
- `<SUBJECTS_DIR>/<subject>/<norm_name>` — normalized T1 volume (default: `norm.mgz`)

## Outputs

- A trained SVM or Gaussian classifier model file (format depends on `-ca` type and [[mri_aseg_edit_reclassify]] expects)

## Mathematical Foundations

The voxel-level feature set is constructed from voxels that differ between the auto and manually edited aseg:

**Training sample generation:**
$$
\mathcal{V}_{+} = \{v : \text{aseg\_edit}(v) = \text{target}\} \setminus \{v : \text{aseg\_auto}(v) = \text{target}\}
$$
$$
\mathcal{V}_{-} = \{v : \text{aseg\_auto}(v) = \text{target}\} \setminus \{v : \text{aseg\_edit}(v) = \text{target}\}
$$

Features at each scale $\sigma \in \{0, 0.5, 1.0, 2.0\}$ (hardcoded `sigmas[]` array, 4 scales):
- Smoothed intensity, gradient (Sobel), Laplacian, second directional derivative
- Distance transform to the label boundary

The default classifier is `CA_GAUSSIAN`; classifier type is set internally (not exposed as a CLI flag in this version).

For SVM training (when used), minimizes the hinge loss:
$$
\min_{\mathbf{w},b} \frac{1}{2}\|\mathbf{w}\|^2 + C \sum_i \max(0, 1 - y_i(\mathbf{w}^T \mathbf{x}_i + b))
$$

SVM tolerance and regularization parameter $C$ are configurable.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-w` | `file` | required | Output classifier weights/model file |
| `-sdir` | `dir` | `$SUBJECTS_DIR` | Override subjects directory |
| `-l` | `label_int` | Left_fimbria | Target label integer to learn corrections for |
| `-c` | `value` | DEFAULT_SVM_C | SVM regularization parameter C |
| `-a` | `N` | 0 | Number of smoothing averages applied to feature values |
| `-p` | `prefix` | `""` | Label prefix string |
| `-m` | `value` | 0.0 | SVM training momentum |
| `-aseg_edit` | `file` | `aseg.mgz` | Filename of manually edited aseg (relative to `mri/`) |
| `-aseg_orig` | `file` | `aseg.auto.mgz` | Filename of auto-generated aseg (relative to `mri/`) |
| `-c1` | `name` | `Left_Hippocampus` | Class 1 label name string |
| `-c2` | `name` | `Left_fimbria` | Class 2 label name string |
| `-width` | `N` | 8 | Classifier array dimension (N × N × N) |
| `-max` | `N` | 1000000 | Maximum SVM iterations |
| `-rbf` | `sigma` | 0 | Use RBF kernel with given sigma (0 = linear kernel) |
| `-poly` | `d` | 0 | Use polynomial kernel of degree d |
| `-tol` | `value` | DEFAULT_SVM_TOL | SVM convergence tolerance |
| `-test` | `subject` | — | Reserved test subject (held out from training) |
| `-debug_voxel` | `x y z` | — | Enable debug output at voxel (x, y, z) |

## Typical Use Cases

**Train a Gaussian classifier for Left_fimbria corrections:**
```bash
mri_aseg_edit_train -w fimbria_classifier.ca \
  subject1 subject2 subject3 fimbria_model.out
```

**Train with target label 17 (Left-Hippocampus):**
```bash
mri_aseg_edit_train -w hippo_model.out -l 17 \
  subject1 subject2 hippo_model.out
```

## Pipeline Context

Not a standard [[recon-all]] stage. Part of an experimental learning-based segmentation correction pipeline.

## Gotchas and Caveats

> [!gotcha] PCA-based feature alignment
> The code computes eigenvectors of the label geometry using `compute_ras_basis_vectors()`. This suggests feature space is aligned with the principal axes of the label, which may make the classifier sensitive to label orientation and less generalizable across subjects.

> [!gotcha] Attic status
> Source is in `attic/` — likely not in standard binary distribution.

## Related Tools

- [[mri_aseg_edit_reclassify]] — applies the trained model
- [[mri_ca_train]] — trains the main GCA atlas classifier
- [[mri_ca_label]] — performs atlas-based segmentation

## Confidence and Gaps

Source code partially read (complex training loop). Confidence is medium.

> [!gap] Training data format
> The exact format expected for the subject list argument is unclear from the source — it may accept a list file or individual subject names.
