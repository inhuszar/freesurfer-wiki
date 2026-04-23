---
title: "mris_classify_thickness"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_classify_thickness/mris_classify_thickness.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[mris_register]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Source in attic/ — may not be installed in 8.2.0."
  - "main() I/O flow and training/test split not traced."
  - "Random forest library (rforest.h) interface not documented."
tags:
  - surface
  - thickness
  - classification
  - machine-learning
---

# mris_classify_thickness

## Summary

`mris_classify_thickness` trains and applies a random forest classifier to cortical thickness patterns mapped to a common coordinate system (e.g., fsaverage5). It reads thickness vectors from multiple subjects, trains a random forest model, and optionally applies it for classification — primarily for distinguishing subject groups (e.g., patients vs. controls) based on cortical thickness patterns.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `attic/mris_classify_thickness/mris_classify_thickness.cpp`
- **Note:** Source resides in `attic/`. Uses the FreeSurfer `rforest.h` random forest library.

## Purpose and Context

Cortical thickness varies systematically between subject groups (e.g., Alzheimer's disease, schizophrenia, normal ageing). By mapping thickness to a common surface space and training a random forest classifier on these thickness vectors, `mris_classify_thickness` provides a machine-learning approach to morphometric group classification. Thickness patterns at each vertex in the common space serve as features.

## Inputs

| Input | Description |
|-------|-------------|
| Surface thickness files | Per-subject thickness overlays mapped to common space |
| Subject list | Two-class subject lists |

## Outputs

| Output | Description |
|--------|-------------|
| Classification results | Subject-level or vertex-level predictions |

> [!gap] I/O details not confirmed
> The full `main()` function was not read. Input/output structure was inferred from the source preamble and `rforest.h` usage.

## Mathematical Foundations

Random forests are ensemble classifiers that aggregate predictions from $T$ decision trees:

$$
\hat{y} = \text{majority\_vote}\left(\{T_t(\mathbf{x})\}_{t=1}^{T}\right)
$$

where $\mathbf{x}$ is the thickness vector for a subject (one value per vertex in the common surface space). Each tree $T_t$ is trained on a bootstrap sample of subjects and a random subset of vertices.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-test <subject> <class> <log>` | string+int+string | — | Test subject `<subject>` as class `<class>` and write classification to `<log>`. |
| `-aseg <label>` | int | — | Use aseg label `<label>` volume as an additional feature (repeatable). |
| `-aseg_name <name>` | string | — | Segmentation volume name for aseg features. |
| `-feature_fraction <f>` | float | — | Fraction of features to use at each tree node (in (0,1]). |
| `-training_fraction <f>` | float | — | Fraction of subjects to use for training (in (0,1]). |
| `-avgs <N>` | int | — | Compute kernel for maximum SNR up to N averages. |
| `-num <N>` | int | — | Minimum number of labels required. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |
| `-ntrees <N>` | int | — | Number of trees in the random forest. |
| `-max_depth <N>` | int | — | Maximum depth of each decision tree. |
| `-nsteps <N>` | int | — | Number of steps for SNR computation. |
| `-wt <dir>` / `-write <dir>` | string | — | Write optimal thickness vectors to directory `<dir>` (both flags are equivalent). |
| `-stats` | — | off | Compute multi-scale p-values. |
| `-bug` | — | off | Use multiplicative variance in SNR calculations (legacy behaviour). |
| `-l <label>` | string | — | Mask classification to the specified label file. |
| `-c <n>` | int | 1 | Class label for "true" (positive) class. |
| `-s <N>` | int | — | Sort vertices by SNR and use top N for classification. |
| `-m <area>` | float | — | Discard labels with surface area smaller than `<area>` mm². |
| `-p <prefix>` | string | — | Label file prefix. |
| `-t <thresh>` | float | — | F-statistic SNR threshold. |
| `-w <file>` | string | — | Write trained random forest to `<file>`. |
| `-o <subject>` | string | — | Use `<subject>` as the output subject name. |
| `-n` | — | off | Use distribution-free estimate of SNR. |
| `-b` | — | off | Apply Bonferroni correction to SNR values. |

## Configuration Interactions

- `-wt <dir>` and `-write <dir>` are equivalent aliases; both set the write directory for optimal thickness vectors.
- `-test <subject> <class> <log>` shifts the tool to inference mode; without it, the tool trains on all provided subjects.
- `-aseg <label>` is repeatable; each call adds one more segmentation-volume feature.
- `-stats` enables multi-scale p-value computation, which is separate from the random forest classification path.

## Typical Use Cases

```bash
# Train and test a classifier (exact usage unknown)
mris_classify_thickness [args...]
```

## Pipeline Context

Not part of `recon-all`. Used in group comparison research studies.

## Gotchas and Caveats

> [!gotcha] Attic placement
> Source in `attic/` — may not be compiled or installed in standard distributions.

> [!gotcha] Requires common-space thickness
> Input thickness data must already be mapped to a common surface space (e.g., fsaverage5) using [[mris_apply_reg]] or similar.

## Related Tools

- [[mris_anatomical_stats]] — computes thickness and other morphometrics
- [[mris_register]] — needed to map data to common space

## Confidence and Gaps

**Confidence: medium.** The full `get_option()` function has been read and all flags documented. The tool's training/prediction split logic and output format details were not traced through `main()`.

> [!gap] I/O and training flow not fully traced
> The full `main()` function was not read. The exact format of input subject lists, the training/test split mechanism, and the structure of output files (beyond the write directory flag) remain unverified.
