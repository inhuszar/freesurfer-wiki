---
title: "mri_twoclass"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_twoclass/mri_twoclass.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_twoclass]]"
  - "[[mri_glmfit]]"
  - "[[mri_segstats]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "get_option() and full main() logic not read — flag list and statistical method details not confirmed."
tags:
  - mri
  - statistics
  - group-comparison
  - morphometry
---

# mri_twoclass

## Summary

`mri_twoclass` performs a voxel-level two-class morphometric comparison between two groups of subjects. Given two sets of morphometric volumes (one per subject per group), it computes a per-voxel statistical test (t-statistic, F-statistic, or group mean) comparing the two groups, optionally with Gaussian smoothing and WM/volume masking. This is an early group-level volumetric analysis tool from the FreeSurfer ecosystem.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_twoclass/mri_twoclass.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_twoclass`
- **Note:** Author Douglas Greve (based on code style and module usage); uses `STAT_T`, `STAT_F`, `STAT_MEAN` modes.

## Purpose and Context

Voxel-based morphometry (VBM) comparisons between two groups (e.g., patients vs. controls) require computing a statistical test at each voxel. `mri_twoclass` was an early tool for this purpose. It reads per-subject morphometric volumes, aligns/averages them into group representations, and writes voxel-level statistics. The modern equivalent for such analyses is `mri_glmfit`.

## Inputs

### Required Inputs

(Inferred from variable declarations)

- **Group 1 volumes** — per-subject morphometric volumes for group 1. Specified via `--read1` or a file list.
- **Group 2 volumes** — per-subject morphometric volumes for group 2. Specified via `--read2` or a file list.
- **Output volume** — destination for the statistical map.

Environment: `SUBJECTS_DIR` may be required depending on how subjects are specified.

### Input Assumptions

> [!assumption] Volumes must be registered to common space
> All input volumes must be in a common coordinate space (e.g., Talairach/MNI). The tool performs no registration.

> [!assumption] Same geometry across subjects
> All input volumes must have the same dimensions and voxel size.

## Outputs

### Files Created

- **Statistical map** — per-voxel t-statistic, F-statistic, or group mean, written in binary float (bfloat) format via `write_bfloats()`.

## Mathematical Foundations

**Two-sample t-test (STAT_T):** For each voxel $k$:
$$
t_k = \frac{\bar{x}_{1k} - \bar{x}_{2k}}{s_k \sqrt{\frac{1}{n_1} + \frac{1}{n_2}}}
$$
where $\bar{x}_{gk}$ is the group mean at voxel $k$, $s_k$ is the pooled standard deviation, and $n_g$ is the group size.

**F-statistic (STAT_F):** Ratio of between-group to within-group variance.

**Mean (STAT_MEAN):** Simple per-group mean output.

Optional pre-processing: Gaussian smoothing (`sigma > 0`) applied to each input volume before the statistical test.

## Configuration Options

### Complete Flag Reference

> [!gap] get_option() not read
> The following are inferred from variable declarations.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--read1 <vol>` | string | — | Group 1 volume (or file list). |
| `--read2 <vol>` | string | — | Group 2 volume (or file list). |
| `--stat <type>` | string | `t` | Statistical type: `t`, `f`, or `mean`. |
| `--res <mm>` | float | 2.0 | Output resolution in mm. |
| `--sigma <mm>` | float | 0.0 | Gaussian smoothing sigma (mm). Applied to inputs before statistics. |
| `--mask <vol>` | string | — | Mask volume; only voxels inside mask are processed. |
| `--fthresh <f>` | float | -1 | F-statistic threshold for output. |
| `--no-normalize` | boolean | false | Disable normalization of inputs. |
| `--wm` | boolean | false | Use WM-only mask. |
| `--vol` | boolean | false | Use volume-based mask. |
| `--Gxyz <x> <y> <z>` | 3 integers | — | Debug single voxel at (x,y,z) in volume coordinates. |
| `--Gnxyz <x> <y> <z>` | 3 integers | — | Debug single voxel at (nx,ny,nz) in normalized coordinates. |
| `--version` | boolean | — | Print version string and exit. |

### Configuration Interactions

- `--stat t` is the default and most common use case.
- `--sigma` enables spatial smoothing before the test; this increases sensitivity at the cost of spatial resolution.
- `--wm` and `--vol` enable white matter and volume masks respectively; these are mutually non-exclusive modifiers.

## Typical Use Cases

### Use Case 1: Two-group t-test on Talairach-aligned volumes

```bash
mri_twoclass \
  --read1 /path/to/group1_subjects.txt \
  --read2 /path/to/group2_subjects.txt \
  --sigma 4 \
  --stat t \
  /path/to/tmap.bfloat
```

## Pipeline Context

`mri_twoclass` is not called by `recon-all`. It is a standalone group analysis tool. Modern analyses use `mri_glmfit` instead.

> [!gotcha] Modern alternative: mri_glmfit
> `mri_glmfit` supports arbitrary group designs, random effects, and cluster-based multiple comparison correction. It is the recommended tool for voxel-based morphometry in FreeSurfer.

## Gotchas and Caveats

> [!gotcha] Output is bfloat format
> The output is written in the legacy bfloat binary format via `write_bfloats()`. This is an older FreeSurfer format; convert with [[mri_convert]] if needed.

> [!gotcha] No multiple comparisons correction
> This tool computes raw statistics without cluster-based or FWE correction. Post-hoc correction must be applied separately.

## Related Tools

- [[mris_twoclass]] — surface-based analogue (in attic)
- `mri_glmfit` — modern general linear model for volume and surface data
- [[mri_segstats]] — computes morphometric statistics per segmentation label

## Confidence and Gaps

Confidence is **medium**. The statistical approach and key variable declarations are clear from the source header. Full flag enumeration was not performed.

> [!gap] Verify full flag list
> Read `get_option()` or run `mri_twoclass --help`.
