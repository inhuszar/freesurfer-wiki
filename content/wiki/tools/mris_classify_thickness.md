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
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source in attic/ — may not be installed in 8.2.0."
  - "Full flag set not read."
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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--true-class <n>` | int | 1 | Class label for "true" class |

> [!gap] Full flag set not documented
> Source was read only to line 80. Additional flags almost certainly exist.

## Configuration Interactions

> [!gap] Interactions unknown
> Not enough source was read to document configuration interactions.

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

**Confidence: low.** Only the preamble and function prototypes were read. The tool's exact I/O, training/prediction split, and output format are all unknown.

> [!gap] Nearly all details unverified
> Read the full `main()` and `get_option()` functions to document this tool properly.
