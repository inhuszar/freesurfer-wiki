---
title: "mris_twoclass"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_twoclass/mris_twoclass.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_twoclass]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: low
last_agent_update: 2026-04-22
gaps:
  - "Source is in the attic/ directory, indicating it may be deprecated or unmaintained."
tags:
  - surface
  - group-comparison
  - statistics
  - attic
---

# mris_twoclass

## Summary

`mris_twoclass` performs a two-class statistical comparison of surface morphometric measures (e.g., cortical thickness, curvature) between two groups of subjects, analogous to [[mri_twoclass]] for volumetric data. It is located in the `attic/` directory of the FreeSurfer source, indicating it may be deprecated, unmaintained, or superseded by other tools. The tool likely produces per-vertex statistical maps (t-statistics or similar) comparing two subject groups on a surface.

## Source Information

- **Language:** C++
- **Source file(s):** `attic/mris_twoclass/mris_twoclass.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_twoclass` (if present)
- **Note:** Source is in `attic/` — may not be compiled or distributed in FreeSurfer 8.2.0.

## Purpose and Context

Surface-based group analysis comparing two classes (e.g., patients vs. controls) on per-vertex morphometric measures. The surface-based analogue of [[mri_twoclass]].

> [!gotcha] Attic status
> The source file is in `attic/mris_twoclass/`, the FreeSurfer repository location for deprecated and experimental code that is not part of the active build. This tool may not be compiled or installed in FreeSurfer 8.2.0. Users seeking surface-based group comparison should consider `mri_glmfit` with surface data or [[mris_anatomical_stats]].

## Inputs

Positional arguments (from `print_usage()`):

```
mris_twoclass -o <output_subject> [options]
    <hemi> <surf> <curv> <out_prefix>
    <c1_subject1> <c1_subject2> ... :
    <c2_subject1> <c2_subject2> ...
```

- **`hemi`**: hemisphere (`lh` or `rh`)
- **`surf`**: spherical surface file (for geodesic computation)
- **`curv`**: curvature/morphometric file to compare
- **`out_prefix`**: output file prefix
- **`c1_subjects`**: subjects in class 1 (e.g., patients), separated from class 2 by `:`
- **`c2_subjects`**: subjects in class 2 (e.g., controls)

## Outputs

- Per-vertex statistical maps (t-statistics, F-statistics, mean differences, or percent differences)
- Optionally label files for significantly different regions

## Mathematical Foundations

Computes per-vertex group-comparison statistics (t-test, F-test, mean difference, or percent difference) between two subject groups on surface morphometric measures. Supports adaptive smoothing to find the optimal kernel at each vertex.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-b` | — | off | Apply Bonferroni correction to SNR values |
| `-c` | `<class>` | 1 | True class index for test subject output (1 or 2) |
| `-conditions` | `<c0> <c1>` | — | Write summary statistics to `sigavg<c0>` and `sigavg<c1>` files |
| `-conf` | `<float>` | 0.0 | Confidence interval threshold (0–1 or 0–100; e.g., 0.95 for 95%) |
| `-fabs` | — | off | Rectify (absolute-value) input vectors before comparison (alias: `-rectify`) |
| `-fixed` | `<navgs>` | — | Use fixed smoothing kernel with the given number of averaging iterations (disables adaptive search) |
| `-l` | `<label_fname>` | — | Restrict analysis to a surface label file |
| `-labels` | `<list_fname> <out_fname>` | — | Read label names from file and write per-label report to output file |
| `-m` | `<float>` | 25.0 | Minimum label surface area in mm²; smaller clusters are discarded |
| `-max` | `<n>` | 5000 | Maximum number of smoothing iterations to search |
| `-mean` | — | STAT_T | Compute mean difference between groups instead of t-statistic |
| `-n` | — | off | Use distribution-free (rank-based) SNR estimate |
| `-normalize` | — | off | Normalise input vectors before comparison |
| `-num` | `<n>` | MIN_LABELS | Minimum number of vertices required in a label |
| `-o` | `<subject>` | — | Output subject name for writing results |
| `-optimal` | — | on | Find the optimal smoothing kernel at each cortical location (default behaviour) |
| `-p` | `<prefix>` | "" | Label filename prefix |
| `-pct` | — | off | Compute percent difference between groups instead of t-statistic |
| `-read` | `<dir>` | — | Read pre-computed optimal thickness vectors from directory (alias: `-rt`) |
| `-rectify` | — | off | Rectify (absolute-value) input vectors before comparison (alias: `-fabs`) |
| `-rt` | `<dir>` | — | Read pre-computed optimal thickness vectors from directory (alias: `-read`) |
| `-s` | `<n>` | −1 | Sort vertices by SNR and use only top `n` for classification |
| `-sigma` | `<float>` | 0.0 | Confidence interval width in standard errors |
| `-t` | `<float>` | 2.0 | F-statistic SNR threshold for marking significant vertices |
| `-test` | `<subject>` | — | Write `test.dat` classification data for the named test subject |
| `-w` | — | off | Enable writing of per-subject per-vertex data |
| `-wfile` | — | off | Read input from `.w` files instead of curvature files |
| `-write` | `<dir>` | — | Write optimal thickness vectors to directory (alias: `-wt`) |
| `-wt` | `<dir>` | — | Write optimal thickness vectors to directory (alias: `-write`) |

## Pipeline Context

Not part of `recon-all`. Standalone group-analysis utility.

## Gotchas and Caveats

> [!gotcha] May not be installed
> As an attic tool, `mris_twoclass` may not be present in the installed FreeSurfer 8.2.0 `bin/` directory.

## Related Tools

- [[mri_twoclass]] — volumetric analogue
- [[mris_anatomical_stats]] — surface morphometric statistics per subject
- `mri_glmfit` — general linear model on surface or volume data (preferred modern alternative)

## Confidence and Gaps

Confidence is **medium**. Source was read from `attic/mris_twoclass/mris_twoclass.cpp`; all flags documented from `get_option()`. Attic status means the tool may not be compiled or installed in FreeSurfer 8.2.0.

> [!gap] Verify installation
> Check whether `mris_twoclass` is present in `$FREESURFER_HOME/bin/`. If not, this page should be tagged as historical/legacy only.
