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
confidence: high
last_agent_update: 2026-04-22
gaps: []
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

- **Group 1 and 2 volumes** — per-subject morphometric volumes for each group. Passed as colon-separated subject lists on the command line, or precomputed via `-read <vl1> <vl2>`.
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

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-b` | — | off | Apply Bonferroni correction to SNR values. |
| `-debug_node <x> <y> <z>` | 3 integers | — | Debug atlas node at normalized coordinates (x,y,z). |
| `-debug_voxel <x> <y> <z>` | 3 integers | — | Debug voxel at volume coordinates (x,y,z). |
| `-l <label>` | string | — | Mask processing to vertices in the named label. |
| `-m <mask>` | string | — | Mask input volumes with the specified volume file. |
| `-mean` | — | off | Compute group mean difference instead of t/F statistic (`STAT_MEAN`). |
| `-n <0|1>` | integer | 1 | Normalize voxel label counts to percentages (1=on, 0=off). |
| `-p <prefix>` | string | `""` | Label prefix string. |
| `-r <mm>` | float | 2.0 | Output atlas resolution in mm. |
| `-read <file1> <file2>` | string string | — | Read precomputed voxel label files for group 1 and group 2. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Subjects directory. |
| `-sigma <mm>` | float | 0.0 | Gaussian smoothing sigma (mm) applied to each input volume before statistics. |
| `-t <fthresh>` | float | -1 | F-statistic SNR threshold for output. |
| `-test <subject>` | string | — | Write `test.dat` diagnostics for the named subject. |
| `-vol` | — | off | Generate maps of volumetric (non-labelled) differences. |
| `-wm` | — | off | Generate map of white matter differences. |
| `-write_labels <vl1> <vl2>` | string string | — | Write voxel label volumes for group 1 and group 2 to the specified files. |
| `-x <xform>` | string | `talairach.lta` | Transform file name for atlas registration. |

### Configuration Interactions

- `-mean` switches from the default t-test (`STAT_T`) to computing a group mean difference.
- `-sigma` enables spatial smoothing before the test; this increases sensitivity at the cost of spatial resolution.
- `-wm` and `-vol` select white matter or volumetric (non-labelled) analysis modes respectively; they are mutually non-exclusive.
- `-n 0` disables normalization of voxel label counts; by default counts are normalized to percentages.

## Typical Use Cases

### Use Case 1: Two-group t-test on Talairach-aligned volumes

```bash
mri_twoclass \
  -sigma 4 \
  aseg.mgz output_subject tmap.bfloat \
  c1_subject1 c1_subject2 : \
  c2_subject1 c2_subject2
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

Confidence is **high**. The complete `get_option()` function was read from source. All flags confirmed from the `stricmp` chain and single-character `switch` statement. Parser uses `option = argv[1] + 1` (single-dash strip). Variable defaults confirmed from static declarations in the source.
