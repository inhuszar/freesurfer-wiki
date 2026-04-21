---
title: "mris_multiscale_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_multiscale_stats/mris_multiscale_stats.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Expected inputs (group data structure) not fully determined"
tags:
  - surface
  - statistics
  - multiscale
  - group-analysis
---

# mris_multiscale_stats

## Summary

`mris_multiscale_stats` performs multi-scale vertex-wise statistical analysis on surface curvature data. It computes group-level t-statistics (and SNR metrics) between two subject groups by testing curvature values at multiple smoothing scales simultaneously, then selects the scale at which each vertex shows the best signal-to-noise ratio. This implements a "multiscale" analysis strategy that avoids the need to pre-specify a single smoothing kernel.

## Source Information

- **Language:** C++
- **Source file:** `mris_multiscale_stats/mris_multiscale_stats.cpp`
- **Key function types:** `cvector_*` — a family of per-vertex array computation utilities (compute_t_test, compute_snr, compute_variance, bonferroni_correct, etc.)

## Purpose and Context

Classical surface-based morphometry applies a fixed spatial smoothing before statistical testing. `mris_multiscale_stats` addresses the multiple-comparisons problem and the scale-selection problem together by:

1. Iteratively smoothing the curvature data across scales
2. Computing the t-statistic at each scale
3. For each vertex, retaining the scale that gives the highest SNR
4. Applying Bonferroni correction across scales

This approach is analogous to scale-space theory in image processing.

## Inputs

- Two groups of subjects with pre-computed curvature (or other scalar overlay) files
- A surface file (defines topology and vertex count)
- An optional label file (ROI restriction)

## Outputs

- Per-vertex statistical maps (t-values, SNR, best-scale averages)
- Label files indicating significant vertices
- Written to files derived from the subject/output naming convention

## Mathematical Foundations

At each smoothing scale $k$ (number of averaging iterations), the group means and variances are:

$$
\bar{x}_{k,j}(v) = \text{spatially smoothed curvature at scale } k \text{ for subject } j
$$

The t-statistic between group 1 (size $n_1$) and group 2 (size $n_2$) at vertex $v$ and scale $k$:

$$
t_k(v) = \frac{\bar{\mu}_1^k(v) - \bar{\mu}_2^k(v)}{\sqrt{\sigma_{total}^k(v) \left(\frac{1}{n_1} + \frac{1}{n_2}\right)}}
$$

The SNR at scale $k$:

$$
\text{SNR}_k(v) = \frac{(\bar{\mu}_1^k(v) - \bar{\mu}_2^k(v))^2}{\sigma_{total}^k(v)}
$$

The best scale for each vertex is:

$$
k^*(v) = \arg\max_k \text{SNR}_k(v)
$$

Bonferroni correction is applied over the number of scales tested.

The code uses the "distance-free SNR" method: `cvector_compute_dist_free_snr` which does not assume a pooled variance model.

## Configuration Options

**Usage:** `mris_multiscale_stats -o <output_subject> [options] <hemi> <surf> <curv> <c1_s1> <c1_s2> ... : <c2_s1> <c2_s2> ...`

Where `surf` must be a spherical surface suitable for computing geodesics. The two subject groups are separated by a colon (`:`) on the command line. `SUBJECTS_DIR` must be set.

Flags are parsed by a custom `get_option()` function using case-insensitive matching (via `stricmp`).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-o` | `subject` | required | Output subject name (must be specified; fatal error otherwise). |
| `--max` | `int` | `500` | Maximum number of smoothing averages (scales) to test. |
| `--roi` | (flag) | off | Automatically generate regions of interest from significant vertices. |
| `-C` | `cond1 cond2` | — | Write output statistics as condition numbers `cond1` and `cond2` (two integer arguments). |
| `-L` | `label` | — | Restrict analysis to vertices within the named label file. |
| `-V` | `int` | — | Set diagnostic vertex number (`Gdiag_no`) for per-vertex debug output. |
| `-M` | `float` | `0` | Minimum label area in mm²; labels smaller than this are discarded. |
| `-P` | `string` | — | Label name prefix for output files. |
| `-T` | `float` | `1.0` | t-statistic (or SNR) threshold for significance testing. |
| `-W` | (flag) | off | Enable write flag (write intermediate results to disk). |
| `-O` | `subject` | — | Override output subject name (equivalent to `-o` but as a switch-case). |
| `-N` | (flag) | off | Use distribution-free estimate of SNR instead of t-test. |
| `-B` | (flag) | off | Apply Bonferroni correction to SNR values across scales. |

## Configuration Interactions

- `-o` / `-O` are functionally equivalent paths to setting `output_subject`; `-o` is required (enforced via `ErrorExit`).
- `--max` sets the upper limit of scales; the analysis iterates from 0 averages up to `max_avgs` averages.
- `-T` is the SNR/t threshold applied after optional Bonferroni correction.
- `-B` (Bonferroni) and `-N` (distribution-free SNR) are independent; both can be combined.
- `--roi` generates label files from significant vertices and writes them to the output subject's `label/` directory.

## Typical Use Cases

```bash
# Compare curvature between two groups across smoothing scales
mris_multiscale_stats -roi lh.cortex.label \
  lh.white \
  group1_subject1 group1_subject2 ... \
  group2_subject1 group2_subject2 ...
```

## Pipeline Context

Not part of standard `recon-all`. This is a group-level analysis tool, run after individual subjects have been processed and their curvature data have been projected to a common space (e.g., `fsaverage`). Typically used after [[mris_smooth]] and `mris_register`.

## Gotchas and Caveats

> [!gotcha] MIN_LABELS = 5
> The code enforces a minimum of 5 vertices in any label used for analysis. Labels smaller than this will be silently ignored.

> [!gotcha] Bonferroni correction is conservative
> Bonferroni correction across scales is very conservative. The number of scales tested determines the severity of the correction; fewer scales (larger step sizes) give less conservative results.

## Related Tools

- [[mris_smooth]] — surface smoothing, which this tool iteratively applies internally
- [[mris_register]] — required to bring subject surfaces to atlas space before group analysis

## Confidence and Gaps

**Confident (from code):** Multiscale SNR-based scale selection; cvector t-test and variance functions; Bonferroni correction; MIN_LABELS = 5 constraint; tthresh default 1.0.

**Confident (from code):** Complete flag set confirmed from `get_option()`. Multiscale SNR-based scale selection; cvector t-test and variance functions; Bonferroni correction; MIN_LABELS = 5 constraint; tthresh default 1.0; max_avgs default 500.

**Uncertain:** Exact input file format for the two-group specification (determined by positional args and `:` separator).
