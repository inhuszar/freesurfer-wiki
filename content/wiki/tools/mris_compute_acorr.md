---
title: "mris_compute_acorr"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_compute_acorr/mris_compute_acorr.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_average_curvature]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - curvature
  - autocorrelation
  - statistics
  - group-analysis
---

# mris_compute_acorr

## Summary

`mris_compute_acorr` computes the spatial autocorrelation function of a curvature (scalar) field on the cortical surface across two groups of subjects. It outputs signal and noise autocorrelation functions as a function of geodesic distance, useful for characterising the spatial scale of group differences and for designing optimal surface smoothing kernels.

## Source Information

- **Language:** C++
- **Source file:** `mris_compute_acorr/mris_compute_acorr.cpp`

## Purpose and Context

In surface-based group analyses, the spatial extent of true signal versus noise determines the optimal smoothing kernel. `mris_compute_acorr` estimates the autocorrelation of a curvature-like scalar (e.g., sulcal depth, thickness) as a function of geodesic distance on the surface, separately for noise (within-group) and signal (between-group differences). This is used in designing statistically optimal smoothing for group comparisons.

The tool performs a two-class comparison (class 1 vs. class 2), computes mean and variance vectors per class, then computes:
- An autocorrelation of residuals (noise autocorrelation).
- An autocorrelation of the class mean difference (signal autocorrelation).

## Inputs

Positional arguments:

| Positional | Description |
|-----------|-------------|
| `<hemi>` | Hemisphere: `lh` or `rh` |
| `<surf_name>` | Surface name (e.g., `sphere.reg`) |
| `<curv_name>` | Curvature file name to analyse |
| `<subject1...>` | Class 1 subject names (terminated by `:`) |
| `:<subject...>` | Class 2 subject names |

- Requires `SUBJECTS_DIR`.
- Requires `-o <output_subject>` to specify the output surface.

## Outputs

| Output | Description |
|--------|-------------|
| `noise_acorr.dat` | Noise (within-group) autocorrelation vs. distance |
| `signal_acorr.dat` | Signal (between-group) autocorrelation vs. distance |
| `scalespace.dat` | Scale-space data (created at startup) |

## Mathematical Foundations

For each bin of geodesic distances $d_i$, the spatial autocorrelation is:

$$
\text{acorr}(d_i) = \frac{\sum_{(u,v): \|u-v\|=d_i} f(u) \cdot f(v)}{\text{count}(d_i)}
$$

where $f(v)$ is the scalar field value at vertex $v$ (e.g., residual or class mean difference).

The geodesic distance bins have fixed bin size `BIN_SIZE = 1` mm up to `MAX_DIST = 20` mm. Holes in the autocorrelation (distances with no vertex pairs) are filled by `fill_acorr_holes()`.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-O <subject>` or `-o <subject>` | string | — | **Required.** Output subject name; the template surface is loaded from `$SUBJECTS_DIR/<subject>/surf/<hemi>.<surf_name>`. |
| `-A <navgs>` or `-a <navgs>` | integer | 0 | Number of smoothing averages applied to curvature values before autocorrelation computation. |
| `-L <label>` or `-l <label>` | string | — | Restrict analysis to the vertices in the specified label file. |
| `-T <thresh>` or `-t <thresh>` | float | 0.0 | Probability threshold for vertex inclusion. |
| `-N <fname>` or `-n <fname>` | string | `noise_acorr.dat` | Output filename for the noise (within-group) autocorrelation. |
| `-S <fname>` or `-s <fname>` | string | `signal_acorr.dat` | Output filename for the signal (between-group) autocorrelation. |
| `--avgs <n>` | integer | 100 | Maximum number of scale-space smoothing averages for the scale-space output (`scalespace.dat`). |

> [!gotcha] --max-avgs does not exist — use --avgs
> The flag for the maximum scale-space averages is `--avgs`, not --max-avgs. Using --max-avgs will cause the tool to exit with an unrecognised option error.

## Configuration Interactions

- The two-class comparison is structured by ordering subjects with `:` as the separator.
- `-l <label>` restricts the autocorrelation computation to a specific cortical label (e.g., a region of interest).

## Typical Use Cases

```bash
# Compute group autocorrelation of sulcal depth for two groups
mris_compute_acorr -o fsaverage \
    lh sphere.reg sulc \
    bert ernie alice : frank george helen
```

## Pipeline Context

Not part of `recon-all`. Used in group analysis methodology research — specifically for designing optimal surface smoothing kernels.

## Gotchas and Caveats

> [!gotcha] Two-class format required
> The subject list must contain a `:` separator between classes. If `:` is absent, the tool will fail with a "must specify ':' between class lists" error.

> [!gotcha] scalespace.dat created automatically
> The tool creates a `scalespace.dat` file in the current directory at startup (`fopen("scalespace.dat", "w")`). This file will be created regardless of whether the computation completes successfully.

## Related Tools

- [[mris_compute_optimal_kernel]] — uses autocorrelation to compute the optimal smoothing kernel
- [[mris_average_curvature]] — average curvature across subjects

## Confidence and Gaps

Confidence is **high**. The complete `get_option()` function (lines ~400–570 of `mris_compute_acorr.cpp`) was read from source. All flags are confirmed. The signal autocorrelation via `#if 0` blocks (disabled code for alternative signal acorr computation) and the actual computation from class mean differences were also confirmed.
