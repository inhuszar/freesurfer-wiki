---
title: "mri_compute_bias"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_bias/mri_compute_bias.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[mri_nu_correct.mni]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - bias-field
  - intensity-normalisation
---

# mri_compute_bias

## Summary

`mri_compute_bias` estimates the MRI bias field (intensity inhomogeneity) by comparing an input volume against a reference (typically white matter control points or a label). The estimated bias field can be used for intensity normalisation. Unlike `mri_nu_correct.mni` which uses an external N3/N4 algorithm, this tool uses FreeSurfer's internal approach based on white-matter control points.

## Source Information

- **Language:** C++
- **Source file:** `mri_bias/mri_compute_bias.cpp`
- **Original author:** (no explicit attribution in the visible header; uses Bruce Fischl's infrastructure)

## Purpose and Context

MRI intensity is not perfectly uniform across the field of view due to B1 field inhomogeneity (bias field). `mri_compute_bias` estimates this field from known tissue intensities (white matter control points) by smoothing the ratio between observed and expected intensities over the volume. The output bias field can then be divided out or supplied to `mri_normalize` for correction.

This tool is distinct from `mri_nu_correct.mni` which wraps the N3 algorithm; `mri_compute_bias` uses a FreeSurfer-native approach.

## Inputs

| Input | Description |
|-------|-------------|
| Input volume(s) | T1-weighted MRI volume(s) |
| Reference or control points | White matter label, control point file, or aseg-derived control points |

The tool operates in two modes:
1. **Label mode** (`-l <label>`): uses voxels in the given label as white matter reference.
2. **Subject mode** (no `-l`): processes a FreeSurfer subject directory, using multiple time points if available.

## Outputs

- Bias field volume (output path specified as last positional argument).
- Optionally: a control volume or smoothed bias volume.

## Mathematical Foundations

The bias field $B(\mathbf{x})$ is estimated as:

$$
B(\mathbf{x}) = \frac{I_\text{observed}(\mathbf{x})}{I_\text{expected}}
$$

at white matter control points, where $I_\text{expected}$ is the mean white matter intensity in the label. This ratio is then Gaussian-smoothed (kernel sigma `sigma`, default 4.0 mm) to produce a smooth bias estimate across the entire volume:

$$
\hat{B}(\mathbf{x}) = G_\sigma * B(\mathbf{x})
$$

The corrected image is obtained by dividing the original by $\hat{B}(\mathbf{x})$.

## Configuration Options

All flags use a single dash. Option matching is case-insensitive.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-label <file>` | label file | — | Label file containing white matter control voxels for label-guided bias estimation; activates label mode (single-volume input). |
| `-s <sigma>` | float | 4.0 | Gaussian smoothing sigma (mm) applied to the bias field after estimation; produces a smooth low-frequency bias estimate. |
| `-c <file>` | path | — | Control point output file; in label mode, writes the label voxels (transformed to conform-space) as FreeSurfer control points to this file, merging with any existing control points. |
| `-n` | boolean | false | Normalise the average bias ratio to 1.0 before combining across subjects in subject-directory mode (makes per-subject bias estimates scale-invariant). |
| `-t <xform>` | string | — | Transform name (without path) to apply to each subject's input volumes in subject-directory mode; loaded from `<sdir>/<subject>/mri/transforms/<xform>`. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `-debug_voxel <x> <y> <z>` | 3 × int | — | Enable per-voxel diagnostic output at voxel `(x, y, z)`. |
| (positional, last) | path | required | Output bias field volume. |

> [!gotcha] `-pad` does not exist as a flag
> The padding value (20 voxels by default) is hardcoded in the source. It cannot be changed via a command-line flag.

## Configuration Interactions

- **Label mode** (activated by `-label`): uses a single input MRI volume (first positional argument after options). Computes the mean intensity in the label, sets per-voxel bias ratios at label voxels, fills the volume using a Voronoi diagram, and smooths with sigma. The `-c` flag additionally writes those label voxels as control points.
- **Subject-directory mode** (no `-label`): expects one or more subject names as positional arguments followed by the output path. Reads `orig.mgz`, `T1.mgz`, and `brainmask.mgz` from each subject's `mri/` directory. Accumulates bias ratios across subjects in a padded (by 20 voxels) common volume.
- `-n` (normalise) is only meaningful in subject-directory mode: it divides each subject's bias map by the mean before accumulating, so that global brightness differences between subjects do not dominate the combined estimate.
- `-t <xform>` is only meaningful in subject-directory mode: it applies the named transform to warp each subject's volumes into the common bias volume space before accumulation.
- `-s` applies in both modes; the default of 4 mm is much narrower than N3/N4 (which uses ~50–100 mm FWHM), so the estimated field has higher spatial frequency.

## Typical Use Cases

```bash
# Estimate bias field using white matter label (label mode)
mri_compute_bias -label wm.label T1.mgz bias.mgz

# With wider Gaussian smoothing (8mm sigma instead of default 4mm)
mri_compute_bias -label wm.label -s 8.0 T1.mgz bias.mgz

# Also write label voxels as control points
mri_compute_bias -label wm.label -c control.dat T1.mgz bias.mgz

# Subject-directory mode across multiple subjects
mri_compute_bias sub01 sub02 sub03 bias_avg.mgz
```

## Pipeline Context

Not a standard `recon-all` stage. It may be invoked as part of multi-echo or FLASH-based processing pipelines, or in research workflows requiring explicit bias field characterisation. Standard `recon-all` uses `mri_nu_correct.mni` and `mri_normalize` for bias correction.

## Gotchas and Caveats

- The tool uses a Gaussian kernel for smoothing, which assumes the bias field is spatially smooth. Very localised inhomogeneities may not be well-corrected.
- In label mode, the mean intensity of the label is used as the expected white matter intensity; outliers in the label can degrade the estimate.
- The `sigma` default of 4.0 mm is much smaller than what N3/N4 typically uses (e.g., 50–100 mm FWHM equivalent); results may differ substantially from `mri_nu_correct.mni`.

## Related Tools

- [[mri_normalize]] — intensity normalisation using control points
- [[mri_nu_correct.mni]] — bias correction using the N3 algorithm

## Confidence and Gaps

**High confidence (from source):** All flags confirmed from complete `get_option()` read. Both operating modes (label mode and subject-directory mode), smoothing kernel, Voronoi fill step, control-point merge logic, padding hardcoded at 20 voxels.
