---
title: "mris_svm_classify"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_svm_classify/mris_svm_classify.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_svm_train]]"
  - "[[mris_ca_label]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "In attic/ - may not be in standard binary distribution."
  - "The exact output format (per-vertex classification, scalar map, or label) is not captured."
tags:
  - SVM
  - classification
  - surface
  - machine-learning
---

# mris_svm_classify

## Summary

`mris_svm_classify` applies a pre-trained Support Vector Machine (SVM) model to surface morphometry data (curvature, annotation values, etc.) to classify cortical surface vertices. It loads a trained SVM model from a file and produces a classification output for a new subject. The tool is in the `attic/` directory, indicating legacy or experimental status.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_svm_classify/mris_svm_classify.cpp`
- **Location note:** In `attic/` directory; may not be compiled in standard installations.
- **Key library:** `svm.h` — FreeSurfer's internal SVM implementation
- **Key library:** `mrisurf`, `label`

## Purpose and Context

Surface-based SVM classification allows automated labeling of cortical regions based on learned morphometric patterns. After training an SVM model with [[mris_svm_train]], `mris_svm_classify` applies it to a new subject's surface data to produce per-vertex (or per-region) classifications. This approach was used in early FreeSurfer studies for automated cortical parcellation and region detection.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Subject name (positional arg 1) | FreeSurfer subject to classify. | — |
| Hemisphere (positional arg 2) | `lh` or `rh` | — |
| Surface name (positional arg 3) | Surface type (e.g., `white`) | — |
| Input data name (positional arg 4) | Per-vertex input features to classify (e.g., curvature, annotation-mapped values). | Surface overlay |
| Output subject name (positional arg 5) | Subject name for output file location. | — |
| SVM model file (positional arg 6) | Trained SVM model from [[mris_svm_train]]. | SVM model binary |
| `SUBJECTS_DIR` | Standard FreeSurfer subjects directory. | — |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Classification result | Per-vertex or per-region SVM classification scores/labels. | Surface overlay or label |

> [!gap] Output file location and format
> The exact output file path and format are not captured. The code reads `output_subject_name` but the output writing logic was not read in full.

## Mathematical Foundations

An SVM classifier learns a decision boundary in a high-dimensional feature space:

$$
f(\mathbf{x}) = \text{sign}\!\left(\sum_i \alpha_i y_i K(\mathbf{x}_i, \mathbf{x}) + b\right)
$$

where $K(\cdot, \cdot)$ is the kernel function (linear, polynomial degree `poly_d`, or RBF with `rbf_sigma`), $\alpha_i$ are the support vector weights, $y_i \in \{-1, +1\}$ are training labels, and $b$ is the bias.

The `classification` variable in the code stores the raw SVM output $f(\mathbf{x})$ which can be thresholded at 0 for binary decisions.

The input feature space (`MRI_SP`) is a multi-frame surface parameter overlay, potentially averaged over `navgs` iterations.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-sdir <path>` | directory | `$SUBJECTS_DIR` | Overrides `SUBJECTS_DIR` environment variable |
| `-a <N>` | integer | 0 | Number of smoothing averages applied to input curvature before classification |
| `-c <true_class> <logfile>` | float, path | — | Known true class label for accuracy reporting; log results to file |
| `-l <label_name>` | string | — | Restrict classification to vertices within this label region |
| `-aname <name>` | string | `aparc` | Annotation file name used for region mapping |
| `-annot <name>` | string | — | Include this annotation region in feature extraction (repeatable) |

**Usage (inferred):** `mris_svm_classify [options] <subject> <hemi> <surf> <input> <output_subject> <svm_model>`

## Configuration Interactions

- `-a` smoothing is applied to the input features before classification, identical to the smoothing applied during [[mris_svm_train]] (must match).
- `-l` restricts classification to vertices within the label; other vertices are masked out via `MRISmaskNotLabel()`.
- `-annot` enables annotation-based feature extraction; vertices not matching the specified annotations are ripped.
- `-c` takes two arguments: the true class value and a log filename. If `true_class > 1.0`, it is mapped to `-1.0` (binary class convention).

## Typical Use Cases

**Classify cortical surface using a trained SVM model:**
```bash
mris_svm_classify \
  MySubject lh white \
  lh.curv.mgh \
  MySubject_classified \
  lh.svm_model.dat
```

## Pipeline Context

`mris_svm_classify` is not part of `recon-all`. It is used in research classification workflows with [[mris_svm_train]].

> [!gotcha] Attic location
> The `attic/` location indicates this tool may not be compiled in standard FreeSurfer 8.2.0 builds. Verify binary availability before use.

## Gotchas and Caveats

> [!gotcha] Features must match training
> The input features, smoothing level (`-navgs`), and annotation settings must exactly match those used during [[mris_svm_train]]. Mismatches will produce meaningless classifications.

> [!gotcha] Binary classification only
> The SVM produces binary (+1/-1) classifications. Multi-class problems require multiple one-vs-rest or one-vs-one SVMs.

## Related Tools

- [[mris_svm_train]] — trains the SVM model applied by this tool
- [[mris_ca_label]] — atlas-based parcellation (alternative approach)
- [[surface-format]] — surface format reference

## Confidence and Gaps

**Medium confidence.** The input/output structure and SVM framework are clear from the source. Output file writing logic was not fully read.
