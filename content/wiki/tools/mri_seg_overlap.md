---
title: "mri_seg_overlap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_seg_overlap/mri_seg_overlap.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_seg_diff]]"
  - "[[mri_segstats]]"
  - "[[mri_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - segmentation
  - overlap
  - dice
  - jaccard
  - quality-control
---

# mri_seg_overlap

## Summary

`mri_seg_overlap` computes per-label overlap metrics (Dice coefficient and/or Jaccard index) between two segmentation volumes. It produces a summary table with per-label scores and mean/weighted-mean statistics. Output can be written as plain text or JSON. This is the primary tool for evaluating the quality of automated segmentations against a reference.

## Source Information

- **Language:** C++
- **Source file:** `mri_seg_overlap/mri_seg_overlap.cpp`

## Purpose and Context

Overlap metrics are the standard way to quantify agreement between automated segmentations and manual reference labels. `mri_seg_overlap` is used to:
1. Benchmark `recon-all` segmentation quality against manual labels.
2. Compare segmentation outputs across software versions.
3. Generate QA reports for group studies.

## Inputs

- **seg1** (positional): First segmentation volume (reference).
- **seg2** (positional): Second segmentation volume (to evaluate).
- Both volumes must have matching dimensions and number of frames.

## Outputs

- **stdout**: Table of per-label overlap scores.
- **`--out` file**: Write results to a file (format determined by extension; `.json` for JSON, otherwise text).

## Mathematical Foundations

For two segmentations $S_1$ and $S_2$ and a label $\ell$:

$$
V_1(\ell) = |\{x : S_1(x) = \ell\}|,\quad V_2(\ell) = |\{x : S_2(x) = \ell\}|
$$
$$
I(\ell) = |\{x : S_1(x) = \ell\ \text{and}\ S_2(x) = \ell\}|
$$
$$
U(\ell) = V_1(\ell) + V_2(\ell) - I(\ell)
$$

**Dice coefficient:**
$$
\text{DSC}(\ell) = \frac{2 \cdot I(\ell)}{V_1(\ell) + V_2(\ell)}
$$

**Jaccard index:**
$$
J(\ell) = \frac{I(\ell)}{U(\ell)}
$$

Summary statistics include unweighted mean and volume-weighted mean (`wmean`). A separate weighted mean excluding WM and cortex labels (`wmean_sc`) is also reported.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-o`<br>`--out` | `<file>` | stdout | Output file (text or JSON) |
| `-m`<br>`--measures` | `dice\|jaccard [...]` | `dice` | Overlap measure(s) to compute |
| `-l`<br>`--labels` | `<int> [...]` | all labels | Specific label IDs to report |
| `-f`<br>`--labelfile` | `<file>` | — | Label file in lookup-table format |
| `-n`<br>`--names` | `<str> [...]` | from LUT | Custom label names (requires `--labels`) |
| `-x`<br>`--no-names` | — | off | Suppress label names in output |
| `-s`<br>`--seg` | — | off | Use standard anatomical structures preset |
| `-q`<br>`--quiet` | — | off | Suppress informational output |

## Configuration Interactions

- `--labelfile` and `--labels` are mutually exclusive.
- `--names` requires `--labels`; cannot be used without explicit label IDs.
- `--seg` and any custom label specification (`--labels` or `--labelfile`) are mutually exclusive.
- `--measures` can accept multiple values: e.g., `--measures dice jaccard` reports both.
- When no label specification is given (and --seg is not set), all labels found in either segmentation are reported.

**Standard `--seg` label set:**
Left/right pairs: Cerebral WM, Cerebral Cortex, Hippocampus, Caudate, Putamen, Pallidum, Amygdala, Thalamus, Lateral Ventricle, 3rd/4th Ventricle, Inf Lat Vent, Accumbens Area.

## Typical Use Cases

```bash
# Default: Dice scores for all labels
mri_seg_overlap aseg_auto.mgz aseg_manual.mgz

# Jaccard and Dice for standard anatomical structures
mri_seg_overlap -s -m dice jaccard aseg_auto.mgz aseg_manual.mgz

# Output to JSON
mri_seg_overlap -o overlap.json aseg_auto.mgz aseg_manual.mgz

# Specific labels only
mri_seg_overlap --labels 17 53 18 54 --names left-hipp right-hipp left-amyg right-amyg \
    aseg1.mgz aseg2.mgz
```

## Pipeline Context

Not called by `recon-all`. Used in validation studies, benchmarking, and QA. Pairs with [[mri_seg_diff]] (to visualise differences) and [[mri_segstats]] (to report volumes).

## Gotchas and Caveats

> [!gotcha] Both segs must have identical dimensions
> If `seg1` and `seg2` have different voxel grids, the tool exits with a dimension mismatch error. Use `mri_convert --reslice-like` to resample one to match the other.

> [!gotcha] wmean_sc excludes WM and cortex
> The volume-weighted mean excluding WM/cortex (`wmean_sc`) is a separate summary statistic intended for subcortical structures. This may differ substantially from the overall `wmean`.

## Related Tools

- [[mri_seg_diff]] — difference volume between two segmentations
- [[mri_segstats]] — compute volume and intensity statistics per label
- [[mri_ca_label]] — atlas-based automated segmentation

## Confidence and Gaps

**Confident (from source):** All flags, Dice and Jaccard formulas, `--seg` preset label list, JSON output.

**Uncertain:** None significant.
