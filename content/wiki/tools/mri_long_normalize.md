---
title: "mri_long_normalize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_normalize/mri_long_normalize.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[mri_normalize]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_fuse_segmentations]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "cross_time_sigma handling not fully traced when multiple TPs are given"
tags:
  - intensity-normalisation
  - longitudinal
  - bias-field
---

# mri_long_normalize

## Summary

`mri_long_normalize` performs intensity normalisation for the longitudinal FreeSurfer pipeline. It normalises a T1 volume using white matter control points derived from the segmentation (`aseg.mgz`) and optionally incorporates cross-time-point consistency via a temporal Gaussian weighting parameter. This is the longitudinal-specific version of [[mri_normalize]].

## Source Information

- **Language:** C++
- **Source file:** `mri_normalize/mri_long_normalize.cpp`
- **Original author:** Bruce Fischl
- **Reference:** Dale, Fischl, Sereno (1999) NeuroImage 9(2):179–194

## Purpose and Context

In longitudinal processing, intensity normalisation must be consistent across time points. `mri_long_normalize` ensures this by using the same set of white matter control points (derived from the base template's segmentation) across all time points, weighted by a temporal Gaussian kernel. This prevents spurious longitudinal intensity changes from appearing as brain changes.

The tool reads a time-point list file (text file with one subject directory per line) and processes each time point's normalisation jointly.

## Inputs

| Argument | Description |
|----------|-------------|
| `<tp_file>` | Text file listing time-point subject directories |
| `<in_vol>` | Input volume name (relative to each TP's `mri/` directory) |
| `<out_vol>` | Output volume name (written to each TP's `mri/` directory) |

Optional inputs (via flags):
- `aseg.mgz` (default name, override with `-a`)
- `brain.mgz` (hardcoded default, not overridable via flag)
- Control points file (via `-f`)

## Outputs

- Normalised volume written to each time point's `mri/<out_vol>` file.
- Optional: control volume and bias volume diagnostic outputs.

## Mathematical Foundations

White matter control points are identified in the segmentation as voxels that are:
1. Consistently labelled as white matter across all time points.
2. Within an acceptable intensity range (`min_target` to `max_target`).

The normalisation procedure (from `mri_normalize`) fits a smooth bias field to the control point intensity values and divides the input volume by this field.

The temporal Gaussian weighting across time points has sigma `cross_time_sigma` (in user units, default -1 meaning unused). When enabled:

$$
w_t = \exp\left(-\frac{(t - t_0)^2}{2\sigma_t^2}\right)
$$

biases the normalisation toward time points closer to the reference.

Bias field smoothing uses sigma `bias_sigma` (default 1.0 mm).

## Configuration Options

| Argument | Description |
|----------|-------------|
| (positional 1) | Time-point list file |
| (positional 2) | Input volume name |
| (positional 3) | Output volume name |

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-cross_time_sigma <s>` | float | -1 | Cross-time Gaussian sigma; -1 disables temporal regularisation |
| `-mask <file>` | path | — | External mask file to restrict normalisation |
| `-p <n>` | int | 2 | Intensity padding for control point selection |
| `-s <sigma>` | float | 1.0 | Bias field smoothing sigma (mm) |
| `-d <Gx> <Gy> <Gz>` | int triple | — | Debug: print diagnostics at voxel (Gx, Gy, Gz) |
| `-v <Gvx> <Gvy> <Gvz>` | int triple | — | Debug: alternative debug voxel coordinates |
| `-a <aseg_name>` | string | `aseg.mgz` | Segmentation filename (reads `argv[1]` not `argv[2]`) |
| `-w <ctrl_vol> <bias_vol>` | path pair | — | Write control-point volume and bias-field volume |
| `-f <ctrl_file>` | path | — | Load control points from file |

## Configuration Interactions

- `-cross_time_sigma` enables temporal regularisation across time points; `-1` (default) disables it.
- The time-point list file format is one path per line, pointing to the longitudinal subject directories.
- `-a` overrides the segmentation filename (default `aseg.mgz`); the brain mask filename (`brain.mgz`) is hardcoded and cannot be overridden via flag.
- `-w` requires two arguments (control volume path and bias volume path) and writes diagnostic outputs for debugging the normalisation.

## Typical Use Cases

```bash
# Longitudinal normalisation for 3 time points
echo "/data/subjects/tp1.long.base" > tp_list.txt
echo "/data/subjects/tp2.long.base" >> tp_list.txt
echo "/data/subjects/tp3.long.base" >> tp_list.txt

mri_long_normalize tp_list.txt norm.mgz norm_long.mgz

# With cross-time temporal regularisation
mri_long_normalize -cross_time_sigma 3.0 tp_list.txt norm.mgz norm_long.mgz
```

## Pipeline Context

Called within `recon-all -long` during autorecon1 as part of longitudinal intensity normalisation. Runs after the base template has been created and each time point has been registered to the base.

## Gotchas and Caveats

- The time-point list file must contain valid paths; missing directories cause silent failures or errors.
- Cross-time sigma should be set in the same units as the temporal spacing of the study. If time points are in years, sigma should reflect the expected smoothness in years.
- The tool reads `aseg.mgz` to identify white matter control points — if the segmentation is incorrect, the normalisation will be biased.

## Related Tools

- [[mri_normalize]] — cross-sectional version of this tool
- [[wiki/pipelines/recon-all|recon-all]] — calls this during `-long` processing
- [[mri_fuse_segmentations]] — produces the fused segmentation used as input to this tool

## Confidence and Gaps

**High confidence:** usage and algorithm confirmed from source header and inline documentation.

> [!gap] Cross-time sigma implementation
> The exact mechanism of cross-time weighting when multiple time points are provided was not fully traced through the main loop.
