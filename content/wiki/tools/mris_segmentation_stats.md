---
title: "mris_segmentation_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_segmentation_stats/mris_segmentation_stats.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_segment]]"
  - "[[mris_ca_label]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The output file format and exact columns of the ROC curve file are not documented."
tags:
  - statistics
  - segmentation
  - surface
  - ROC
---

# mris_segmentation_stats

## Summary

`mris_segmentation_stats` evaluates surface segmentation accuracy by computing ROC (Receiver Operating Characteristic) curves comparing a predicted segmentation overlay to a ground-truth label. It operates across multiple subjects and reports true positive, true negative, false positive, and false negative rates as a function of threshold. The tool is attributed to Bruce Fischl.

## Source Information

- **Language:** C++
- **Source file:** `mris_segmentation_stats/mris_segmentation_stats.cpp`
- **Key libraries:** `mrisurf`, `label`, `mri`
- **Key internal function:** `compute_segmentation_stats()`, `write_roc_curve()`

## Purpose and Context

When developing or validating surface segmentation algorithms (e.g., [[mris_segment]]), it is necessary to evaluate how well the predicted segmentation matches expert-labeled ground truth. `mris_segmentation_stats` automates this evaluation across a cohort of subjects: for each subject, it compares the thresholded segmentation overlay to a binary ground-truth label and accumulates the classification outcomes. It then writes out an ROC curve summarizing sensitivity vs. specificity at different thresholds.

This is a research/validation tool, not part of the standard `recon-all` pipeline.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Segmentation name (positional arg 1) | Name of the overlay file encoding the predicted segmentation (e.g., a probability or activation map). | Surface overlay (`.mgh`, `.mgz`) |
| True label name (positional arg 2) | Name of the ground-truth label (without hemisphere prefix; tool auto-detects hemisphere). Searched as `<sdir>/<subject>/label/{lh,rh}.<name>.label`. | `.label` |
| Subject list (positional args 3..N-1) | List of subject IDs to include in the analysis. | — |
| Output file (last positional arg) | Filename for the output ROC curve data. | Text file |
| `SUBJECTS_DIR` | FreeSurfer subjects directory. | Directory |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| ROC curve file | Per-threshold sensitivity/specificity data across all subjects. | Plain text |

> [!gap] Output format
> The exact columns and format of the output ROC file are not documented in the source header. Empirical testing or deeper source reading is needed.

## Mathematical Foundations

For each subject, at each threshold $t$ applied to the overlay, the tool classifies each vertex as:

$$
\text{TP}(t) = |\{v : \text{overlay}(v) > t \cap \text{label}(v) = 1\}|
$$
$$
\text{FP}(t) = |\{v : \text{overlay}(v) > t \cap \text{label}(v) = 0\}|
$$
$$
\text{FN}(t) = |\{v : \text{overlay}(v) \leq t \cap \text{label}(v) = 1\}|
$$
$$
\text{TN}(t) = |\{v : \text{overlay}(v) \leq t \cap \text{label}(v) = 0\}|
$$

ROC coordinates: sensitivity $= \text{TP}/(\text{TP}+\text{FN})$, specificity $= \text{TN}/(\text{TN}+\text{FP})$.

Morphological operations (dilation/erosion via `-dilate`/`-erode`) can be applied to the label boundary before computing statistics, allowing for evaluation with spatial tolerance.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-sdir path` | directory | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` |
| `-min_area A` | float (mm²) | 10 | Minimum segment area threshold (mm²) |
| `-dilate N` | integer | 0 | Number of dilation iterations applied to label boundary |
| `-erode N` | integer | 0 | Number of erosion iterations applied to label boundary |

**Positional arguments:** `<segmentation_name> <true_label_name> <subject1> ... <subjectN> <output_file>`

## Configuration Interactions

- `-dilate` and `-erode` are morphological operations applied to the ground-truth label; they provide spatial tolerance in the evaluation. Using both consecutively (erode then dilate, or vice versa) implements opening or closing.
- `-min_area` sets a minimum connected-component area for the segmentation; segments smaller than this are discarded before computing statistics.

## Typical Use Cases

**Evaluate segmentation accuracy across subjects:**
```bash
mris_segmentation_stats \
  my_seg_overlay \
  MT \
  subject1 subject2 subject3 subject4 \
  roc_output.txt
```

## Pipeline Context

Not part of `recon-all`. Used in segmentation algorithm development and validation workflows, typically after running [[mris_segment]] on a set of subjects and comparing results against expert labels.

## Gotchas and Caveats

> [!gotcha] Hemisphere auto-detection
> The tool auto-detects the hemisphere by checking whether the ground-truth label exists under `lh` or `rh`. If the label exists for both hemispheres in the same subject directory, the detection logic uses `lh` by default.

> [!gap] Max subjects limit
> The source defines `#define MAX_SUBJECTS 100`. Processing more than 100 subjects requires recompilation.

## Related Tools

- [[mris_segment]] — the segmentation tool whose output is evaluated by this tool
- [[mris_ca_label]] — standard atlas-based parcellation
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**Medium confidence.** The overall purpose and compute_segmentation_stats/write_roc_curve structure are clear from the source. Exact output file format requires additional inspection.

> [!gap] Output format
> The column layout of the ROC curve output file is not documented in the source header.
