---
title: "mris_thickness_comparison"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_thickness_comparison/mris_thickness_comparison.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_thickness]]"
  - "[[mris_thickness_diff]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - cortical-thickness
  - morphometry
  - statistics
  - surface
---

# mris_thickness_comparison

## Summary

`mris_thickness_comparison` computes summary statistics comparing a cortical thickness map to the white matter folding pattern (w-values) for a single subject within a specified label region. It reports mean and variance of both white matter folding (w-values) and cortical thickness, and optionally logs results to a file. It is used for morphometric characterization and comparison within brain regions.

## Source Information

- **Language:** C++
- **Source file:** `mris_thickness_comparison/mris_thickness_comparison.cpp`
- **Key function:** `compute_thickness_stats()` — computes mean/variance of thickness and w-values within a label

## Purpose and Context

This tool provides a per-subject summary of the relationship between cortical folding (encoded in w-values, the individual deviation from the group-average curvature) and cortical thickness within a specified region. It is used to characterize regional morphometry and can be looped over subjects for group comparisons.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Subject name (positional arg 1) | FreeSurfer subject ID. | — |
| Hemisphere (positional arg 2) | `lh` or `rh` | — |
| Thickness name (positional arg 3) | Name of the thickness file (e.g., `thickness`). | Curvature binary |
| W-file name (positional arg 4) | Name of the w-values file (white matter folding deviation). | W-file format |
| Label name (optional, positional arg 5) | Label restricting analysis to a cortical region. | `.label` |
| `SUBJECTS_DIR` | Standard FreeSurfer subjects directory. | — |

**Usage:** `mris_thickness_comparison [options] <subject> <hemi> <thickness> <wfile> [label]`

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Stdout | Mean and variance of thickness and w-values within the label. | Text |
| Log file (optional, `-log`) | Appends results to a log file for multi-subject accumulation. | Text |

## Mathematical Foundations

Within the specified label (or all cortical vertices if no label), the tool computes:

$$\bar{t} = \frac{1}{N} \sum_{v \in \text{label}} t_v, \quad \sigma_t^2 = \frac{1}{N-1} \sum_{v \in \text{label}} (t_v - \bar{t})^2$$

$$\bar{w} = \frac{1}{N} \sum_{v \in \text{label}} w_v, \quad \sigma_w^2 = \frac{1}{N-1} \sum_{v \in \text{label}} (w_v - \bar{w})^2$$

where $t_v$ is the thickness and $w_v$ is the w-value at vertex $v$.

The `compute_thickness_stats()` function returns `mean_w`, `var_w`, `mean_thick`, `var_thick`, and `n` (number of label points).

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-sdir path` | directory | Overrides `SUBJECTS_DIR` |
| `-avgs N` | integer | Smoothing iterations applied before statistics |
| `-log fname` | filename | Append results to log file |

**Positional arguments:** `<subject> <hemi> <thickness_name> <wfile_name> [label_name]`

## Configuration Interactions

- Without a `label_name` argument, statistics are computed over the entire surface.
- `-avgs` applies smoothing to the input data before computing statistics; this can reduce noise but blurs regional boundaries.
- `-log` enables multi-subject accumulation: run the tool for each subject with the same log file, then analyze the log.

## Typical Use Cases

**Compare thickness and w-values in the fusiform face area:**
```bash
mris_thickness_comparison \
  sub01 lh thickness w-g.pct.mgh \
  $SUBJECTS_DIR/sub01/label/lh.fusiform.label
```

**Log results for multiple subjects:**
```bash
for subj in sub01 sub02 sub03; do
  mris_thickness_comparison \
    -log group_stats.txt \
    $subj lh thickness w-g.pct.mgh
done
```

## Pipeline Context

`mris_thickness_comparison` is not part of `recon-all`. It is used in post-processing morphometric analysis, typically to characterize the relationship between cortical folding and thickness in regions of interest. It requires the output of [[mris_thickness]] (`lh.thickness`) as input.

## Gotchas and Caveats

> [!gotcha] W-file vs. thickness file naming
> The tool reads the w-file using the `orig` surface (`lh.orig`) as the underlying mesh. If the w-file was computed on a different surface, the correspondence may be incorrect.

> [!gotcha] Log file format
> The log file accumulates results by appending; it has no header. Users must track which line corresponds to which subject.

## Related Tools

- [[mris_thickness]] — computes the thickness map used as input
- [[mris_thickness_diff]] — computes vertex-wise thickness differences
- [[surface-format]] — surface and curvature format reference

## Confidence and Gaps

**High confidence.** The source is straightforward: load surfaces, compute statistics in the label, report. The function signatures and positional arguments are clear.
