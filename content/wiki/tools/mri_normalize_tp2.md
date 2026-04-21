---
title: "mri_normalize_tp2"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_normalize_tp2/mri_normalize_tp2.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[recon-all]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full option list not verified (binary execution denied)"
  - "Exact recon-all longitudinal stream stage that calls this tool"
tags:
  - normalization
  - longitudinal
  - bias-field
---

# mri_normalize_tp2

## Summary

`mri_normalize_tp2` performs intensity normalization of a second (or subsequent) timepoint MRI volume using control points derived from the first timepoint (`tp1`). Rather than recomputing control points from scratch, it transfers the control point volume (`ctrl.mgz`) from `tp1` to `tp2` space using an LTA transform, then applies the same bias field estimation procedure. This ensures consistent normalization across timepoints in longitudinal FreeSurfer processing.

## Source Information

- **Language:** C++
- **Source file:** `mri_normalize_tp2/mri_normalize_tp2.cpp`
- **Original author:** Xiao Han
- **Key includes:** `mri.h`, `mrinorm.h`, `transform.h`

## Purpose and Context

In the FreeSurfer longitudinal processing stream, consistent intensity normalization across timepoints is critical to avoid introducing artificial longitudinal change. `mri_normalize_tp2` solves this by reusing the white-matter control points identified for `tp1`. These points are transformed into the `tp2` coordinate frame via a registration transform (LTA), and the bias field is then estimated and corrected using those control points.

This is analogous to [[mri_normalize]] but adapted for longitudinal consistency: the control points are not re-estimated from the data, they are transferred.

> [!assumption] Input data assumption
> Expects the `tp1` control point volume and the `tp1` T1 volume, plus an LTA transform mapping `tp2` to `tp1` space (or vice versa with `-invert`). Both timepoints must have been preprocessed with the standard FreeSurfer pipeline.

## Inputs

| Input | Description |
|-------|-------------|
| Input volume (positional arg 1) | T1-weighted volume for `tp2` to be normalized |
| Output volume (positional arg 2) | Normalized output volume path |
| `--ctrl1 <fname>` | Control point volume from `tp1` |
| `--T1_1 <fname>` | T1 volume from `tp1` (for intensity scaling reference) |
| `--xform <fname>` | LTA transform from `tp2` to `tp1` space |
| `--mask1 <fname>` | Brain mask for `tp1` (optional) |
| `--mask2 <fname>` | Brain mask for `tp2` (optional) |

## Outputs

| Output | Description |
|--------|-------------|
| Normalized volume | Bias-field-corrected T1 for `tp2`, written to positional arg 2 |

## Mathematical Foundations

The normalization procedure follows the same bias field estimation as [[mri_normalize]]:

1. Control points from `tp1` are mapped to `tp2` space using the provided LTA transform.
2. A bias field $B(v)$ is estimated by fitting a smooth surface through the intensities at the control point locations, targeting a uniform white matter intensity.
3. The corrected volume is:

$$
I_\text{corrected}(v) = \frac{I(v)}{B(v)}
$$

The bias field is estimated using local averaging with a Gaussian kernel of sigma `bias_sigma = 8.0` voxels (default).

The code also computes intensity scale statistics: mean ($\mu_1$, $\mu_2$), standard deviation ($\sigma_1$, $\sigma_2$), and counts ($n_1$, $n_2$) from masked regions of both timepoints to compute a global linear slope and offset for inter-timepoint intensity calibration.

> [!math] Inter-timepoint intensity scaling
> A linear model maps `tp1` intensities to `tp2` intensities:
> $$
> I_{tp2} = \text{slope} \cdot I_{tp1} + \text{offset}
> $$
> The slope and offset are computed from the masked white-matter statistics.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--ctrl1` | `<fname>` | — | Control point volume from tp1 (required) |
| `--T1_1` | `<fname>` | — | T1 volume from tp1 (required) |
| `--xform` | `<fname>` | — | LTA registration transform from tp2 to tp1 (required) |
| `--invert` | (none) | off | Invert the LTA transform direction |
| `--lta_src` | `<fname>` | — | Source volume geometry for LTA (optional override) |
| `--lta_dst` | `<fname>` | — | Destination volume geometry for LTA (optional override) |
| `--mask1` | `<fname>` | — | Brain mask for tp1 |
| `--mask2` | `<fname>` | — | Brain mask for tp2 |
| `--bias_sigma` | `<float>` | `8.0` | Sigma of bias field smoothing kernel |
| `--noise_threshold` | `<float>` | `1.0` | Voxels below this intensity are excluded from statistics |

## Configuration Interactions

- `--invert` is only meaningful when the LTA is provided in the `tp1 -> tp2` direction rather than the expected `tp2 -> tp1` direction.
- `--lta_src` and `--lta_dst` override the volume geometry metadata stored inside the LTA file, useful when the LTA was computed from resampled versions of the volumes.
- `--mask1` and `--mask2` restrict the intensity statistics to brain tissue, preventing CSF and background from biasing the slope/offset computation.

## Typical Use Cases

```bash
# Normalize tp2 using tp1 control points and a registration transform
mri_normalize_tp2 \
  --ctrl1 /subjects/tp1/mri/ctrl.mgz \
  --T1_1  /subjects/tp1/mri/T1.mgz \
  --xform /subjects/tp2/mri/transforms/tp2_to_tp1.lta \
  /subjects/tp2/mri/T1.mgz \
  /subjects/tp2/mri/norm.mgz
```

## Pipeline Context

`mri_normalize_tp2` is called during the FreeSurfer longitudinal processing stream (`recon-all -long`) as a replacement for the standard `mri_normalize` step. It is one of the tools that ensures timepoint-consistent preprocessing in the `<subject>.long.<base>` directory structure.

The standard cross-sectional normalization is done by [[mri_normalize]]; this tool is its longitudinal counterpart.

## Gotchas and Caveats

> [!gotcha] Both tp1 control points and T1 are required
> The tool will error if either `--ctrl1` or --T1_1 is not provided. Unlike the cross-sectional `mri_normalize`, there is no fallback to automatic control point detection.

> [!gotcha] Transform direction matters
> The LTA is expected to map `tp2` voxels to `tp1` space so that control points from `tp1` can be mapped back. Providing the wrong-direction transform (without `-invert`) will silently produce an incorrect normalization.

## Related Tools

- [[mri_normalize]] — Standard cross-sectional intensity normalization
- [[recon-all]] — Master pipeline; calls this tool in longitudinal mode

## Confidence and Gaps

**High confidence:** Purpose, algorithm, required inputs (directly stated in source comments and code), default `bias_sigma`, noise threshold.

**Medium confidence:** Exact flag names (inferred from `get_option()` variable names; binary not run).

> [!gap] Exact longitudinal stream stage
> The precise position of this tool in the `recon-all -long` call sequence needs verification from the `recon-all` shell script.
