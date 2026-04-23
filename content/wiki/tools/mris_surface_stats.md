---
title: "mris_surface_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_surface_stats/mris_surface_stats.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_thickness]]"
  - "[[mris_thickness_diff]]"
  - "[[mris_anatomical_stats]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The -zscore flag and two-group comparison mode need more detail."
  - "The output file formats for each flag are not fully specified."
tags:
  - statistics
  - surface
  - group-analysis
  - thickness
---

# mris_surface_stats

## Summary

`mris_surface_stats` computes group-level statistics (mean, standard deviation, absolute mean, absolute std, and z-scores) on per-vertex scalar maps (e.g., thickness difference maps) across multiple subjects. It supports both single-group and two-group (contrast) analyses and can apply a subcortical mask. Attributed to Xiao Han.

## Source Information

- **Language:** C++
- **Source file:** `mris_surface_stats/mris_surface_stats.cpp`
- **Key libraries:** `mrisurf`, `mri`, `label`, `matrix`, `transform`
- **Key function:** `MyMRISsmoothMRI()` — optional smoothing of input maps before statistics

## Purpose and Context

After computing per-subject surface scalar maps (e.g., thickness differences, displacement maps), a common next step is group-level analysis: computing the mean and variance of the effect across subjects. `mris_surface_stats` provides this: it reads multiple surface overlay files, optionally smooths them, computes per-vertex mean and standard deviation (both signed and unsigned), and writes the results. A z-score map can be computed for group contrasts, supporting basic vertex-wise statistical inference.

The tool is designed for quick exploratory group statistics; it is not a full GLM implementation (see `mri_glmfit` for that).

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Surface file (`-surf` / `-surf_name` / `-surf_file`) | The underlying surface mesh. | FreeSurfer binary surface |
| Multiple overlay files (positional) | Per-subject scalar maps (e.g., thickness difference files from [[mris_thickness_diff]]). | `.mgh`, `.mgz`, or type-specified |
| Mask label (`-mask` / `-mask_name` / `-mask_fname`) | Optional subcortical mask. | `.label` |

**Usage (inferred from code):** The overlay files are passed as positional arguments.

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Std map (`-out` / `-out_name` / `-out_fname`) | Per-vertex standard deviation of signed values (required). | `.mgh`, `.mgz` |
| Mean map (`-mean` / `-mean_name` / `-mean_fname`) | Per-vertex mean of signed values. | `.mgh`, `.mgz` |
| Absolute mean (`-absmean` / `-absmean_name` / `-absmean_fname`) | Per-vertex mean of absolute values. | `.mgh`, `.mgz` |
| Absolute std (`-absstd` / `-absstd_name` / `-absstd_fname`) | Per-vertex std of absolute values. | `.mgh`, `.mgz` |
| Z-score (`-zscore`) | Per-vertex z-score for group contrast. | `.mgh`, `.mgz` |

## Mathematical Foundations

For $N$ subjects with per-vertex scalars $\{x_{i,v}\}_{i=1..N, v=1..V}$:

**Mean:** $\bar{x}_v = \frac{1}{N}\sum_i x_{i,v}$

**Std:** $\sigma_v = \sqrt{\frac{1}{N-1}\sum_i (x_{i,v} - \bar{x}_v)^2}$

**Absolute mean:** $\overline{|x|}_v = \frac{1}{N}\sum_i |x_{i,v}|$

**Two-group z-score:** For first group (size $N_1$) and second group (size $N_2$):
$$
z_v = \frac{\bar{x}_{1,v} - \bar{x}_{2,v}}{\sqrt{\sigma_{1,v}^2/N_1 + \sigma_{2,v}^2/N_2}}
$$

Optional spatial smoothing via `MyMRISsmoothMRI()` (heat kernel smoothing, `nSmoothSteps` iterations) is applied to each input overlay before statistics.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-surf` / `-surf_name` / `-surf_file` | `<file>` | required | Underlying surface mesh file |
| `-out` / `-out_name` / `-out_fname` | `<file>` | required | Output std-of-data map filename |
| `-mean` / `-mean_name` / `-mean_fname` | `<file>` | — | Output mean map filename |
| `-absmean` / `-absmean_name` / `-absmean_fname` | `<file>` | — | Output absolute-mean map filename |
| `-absstd` / `-absstd_name` / `-absstd_fname` | `<file>` | — | Output std-of-abs-mean map filename |
| `-zscore` | `<file>` | — | Output z-score map filename (requires `-first_group_size`) |
| `-first_group_size` | `<N>` | 0 | Number of subjects in the first group; enables two-group contrast |
| `-mask` / `-mask_name` / `-mask_fname` | `<file>` | — | Label file masking vertices to exclude from statistics |
| `-nsmooth` | `<N>` | 0 | Number of smoothing iterations applied to each input overlay |
| `-src_type` | `<type>` | paint | Input surface data format (e.g., `paint`, `curv`, `w`) |
| `-trg_type` | `<type>` | paint | Output surface data format |

## Configuration Interactions

- `-zscore` requires `-first_group_size N` to be set; the first N input files are group 1 and the remaining files are group 2.
- `-nsmooth` is applied to each input map individually before group statistics; this is different from smoothing the group mean after the fact.
- Multiple output flags can be specified simultaneously; the tool writes all requested outputs.

## Typical Use Cases

**Compute mean and std of thickness differences across subjects:**
```bash
mris_surface_stats \
  -surf_name lh.white \
  -out_name lh.std_thickdiff.mgh \
  -mean lh.mean_thickdiff.mgh \
  -absstd lh.absstd_thickdiff.mgh \
  sub01_thickdiff.mgh sub02_thickdiff.mgh sub03_thickdiff.mgh
```

**Two-group z-score (10 patients vs 10 controls):**
```bash
mris_surface_stats \
  -surf_name lh.white \
  -out_name lh.std.mgh \
  -zscore lh.zscore.mgh \
  -first_group_size 10 \
  sub01.mgh sub02.mgh ... sub20.mgh
```

## Pipeline Context

`mris_surface_stats` is not part of `recon-all`. It is a post-processing group-analysis tool, typically used after per-subject [[mris_thickness_diff]] computation or other surface scalar analyses.

## Gotchas and Caveats

> [!gotcha] Up to 200 subjects
> The source defines `#define MAX_SURFACES 200`. Processing more than 200 subjects requires recompilation.

> [!gotcha] Two-group z-score requires balanced input
> When using `-zscore`, subjects must be passed in order: group 1 first, group 2 second. The split point is determined by `-first_group_size`.

> [!gotcha] Description says "thickness" but applies to any scalar
> Despite the source file description mentioning "thickness differences", the tool works on any per-vertex scalar map. The "thickness" reference reflects typical usage.

## Related Tools

- [[mris_thickness]] — computes thickness per subject
- [[mris_thickness_diff]] — computes per-subject thickness difference (input to this tool)
- [[mris_anatomical_stats]] — region-of-interest morphometric statistics
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**Medium confidence.** The statistical computations and output flags are clear from the source. The two-group z-score mechanism and exact usage of `-first_group_size` need verification.
