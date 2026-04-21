---
title: "mris_remove_variance"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_remove_variance/mris_remove_variance.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_calc]]"
  - "[[mris_fwhm]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "MRISremoveValueVarianceFromCurvature() implementation not read — the exact projection formula for removing variance needs verification from mrisurf.c."
tags:
  - surface
  - overlay
  - statistics
  - variance
---

# mris_remove_variance

## Summary

`mris_remove_variance` removes from a surface curvature/overlay file the component of variance that is linearly predictable from a second ("variance") overlay. This is a surface-domain decorrelation (regression) step: given two per-vertex scalar maps, it projects out the linear influence of the variance map from the data map and writes the residual. This is used to remove unwanted sources of variability (confounds) from surface-based morphometric measures.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_remove_variance/mris_remove_variance.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_remove_variance`

## Purpose and Context

In group-level surface analyses, a morphometric measure (e.g., cortical thickness or curvature) may covary with a confounding variable across vertices (e.g., overall brain size, age-related changes). `mris_remove_variance` removes the linear component of this covariation by computing the correlation coefficient between the two surface maps and subtracting the projection.

The tool also reports the Pearson correlation coefficient before and after decorrelation (with `-v` / verbose diagnostic mode), providing a quick check that the operation was effective.

## Inputs

### Required Inputs

(Positional arguments: `<surface file> <in_curv> <var_curv> <out_curv>`)

- **`<surface file>`** — FreeSurfer binary surface file (e.g., `lh.white`). Used for topology/geometry; hemisphere is inferred from the filename.
- **`<in_curv>`** — the curvature/overlay file to be decorrelated (data map).
- **`<var_curv>`** — the curvature/overlay file representing the confound (variance map).
- **`<out_curv>`** — output curvature file after variance removal.

### Input Assumptions

> [!assumption] Curvature format inputs
> Both `<in_curv>` and `<var_curv>` must be in FreeSurfer binary curvature format (`.curv`), readable by `MRISreadCurvatureFile()`.

> [!assumption] Hemisphere in filename
> The hemisphere is parsed from `<surface file>` by scanning for `.` and reading the two preceding characters (e.g., `lh` or `rh`).

## Outputs

### Files Created

- **`<out_curv>`** — residual curvature file after the variance component of `<var_curv>` has been linearly projected out of `<in_curv>`. Written in FreeSurfer binary curvature format.

## Mathematical Foundations

The decorrelation operates as follows:

1. Read `<var_curv>` into per-vertex values (`MRISreadCurvatureFile` + `MRIScopyCurvatureToValues`).
2. Read `<in_curv>` into per-vertex curvature values.
3. Compute the Pearson correlation coefficient $r$ between the curvature and value arrays across all vertices:
$$r = \frac{\sum_i (c_i - \bar{c})(v_i - \bar{v})}{\sqrt{\sum_i (c_i - \bar{c})^2 \sum_i (v_i - \bar{v})^2}}$$
4. Remove the variance component: for each vertex, compute the residual:
$$c_i' = c_i - r \cdot \frac{\sigma_c}{\sigma_v} \cdot v_i$$
(or equivalent linear regression residual — exact formula from `MRISremoveValueVarianceFromCurvature()` in `mrisurf.c` should be verified).
5. Optionally smooth the residuals (`MRISaverageCurvatures(mris, navgs)`).
6. Write residuals to `<out_curv>`.

> [!gap] Exact projection formula
> The precise implementation of `MRISremoveValueVarianceFromCurvature()` was not read from `mrisurf.c`. It may be an OLS regression residual $c_i' = c_i - \hat{\beta} v_i$ rather than the correlation-scaled form above. Verification required.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--navgs <n>` / `-n <n>` | integer | 0 | Number of curvature averaging iterations applied to the residual output. 0 means no smoothing. |
| `-v <diagno>` | integer | 0 | Set diagnostic vertex number; enables verbose reporting including post-decorrelation correlation coefficient. |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

### Configuration Interactions

- `--navgs` smooths the output after decorrelation. If the variance removal reduces high-frequency noise, additional smoothing may be redundant.
- When `-v` is set to a valid vertex number, the tool reports both the pre- and post-decorrelation correlation coefficient.

## Typical Use Cases

### Use Case 1: Remove overall curvature variance from thickness map

```bash
mris_remove_variance \
  $SUBJECTS_DIR/subject/surf/lh.white \
  $SUBJECTS_DIR/subject/surf/lh.thickness \
  $SUBJECTS_DIR/subject/surf/lh.curv \
  $SUBJECTS_DIR/subject/surf/lh.thickness.deconfounded
```

Removes the linear component of mean curvature variance from the thickness map.

## Pipeline Context

`mris_remove_variance` is not called by `recon-all`. It is used in post-processing and group analysis pipelines.

## Gotchas and Caveats

> [!gotcha] Correlation-based diagnostic output requires verbose mode
> The correlation coefficient before and after decorrelation is only printed when `Gdiag` includes `DIAG_SHOW` and `DIAG_VERBOSE_ON` (controlled by `-v`). Without this, there is no diagnostic output to confirm the operation succeeded.

## Related Tools

- [[mris_calc]] — general per-vertex arithmetic operations on surface overlays
- [[mris_fwhm]] — smoothing of surface data
- [[mris_anatomical_stats]] — computes morphometric statistics

## Confidence and Gaps

Confidence is **medium**. The input/output paths and the high-level algorithm are clearly understood. The exact formula in `MRISremoveValueVarianceFromCurvature()` needs verification.

> [!gap] MRISremoveValueVarianceFromCurvature() formula
> Read `utils/mrisurf.c` to confirm the exact regression formula used.
