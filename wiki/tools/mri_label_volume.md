---
title: "mri_label_volume"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_label_volume/mri_label_volume.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[mri_label_histo]]"
  - "[[mri_label_vals]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - label
  - volume
  - morphometry
---

# mri_label_volume

## Summary

`mri_label_volume` computes the volume (in mm³) of one or more labelled regions in a segmentation volume. It supports computing volumes for individual labels, all labels simultaneously (`-all`), and can compute volumes as a percentage of total brain volume. Partial volume correction is also supported.

## Source Information

- **Language:** C++
- **Source file:** `mri_label_volume/mri_label_volume.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Computing the volume of brain structures is a fundamental morphometric measurement. `mri_label_volume` provides a simple interface to compute volumes from segmentation volumes such as `aseg.mgz`, either for individual labels or for all labels at once.

## Inputs

| Argument | Description |
|----------|-------------|
| `<seg>` | Segmentation volume (e.g., `aseg.mgz`) |
| `<label>` | Integer label value (or use `-all`) |

## Outputs

- Volume in mm³ printed to stdout (or log file).
- Optionally: a spreadsheet-compatible output (`-ss`).
- Optionally: volume as percentage of total brain or ICV.

## Mathematical Foundations

Volume is computed as:

$$V = N_\ell \cdot v_x \cdot v_y \cdot v_z$$

where $N_\ell$ is the number of voxels with label $\ell$, and $v_x, v_y, v_z$ are the voxel dimensions in mm.

For partial volume estimation (`-pv <vals_vol>`), the volume is computed as:

$$V_\text{PV} = \sum_{i : L_i = \ell} p_i \cdot v_x v_y v_z$$

where $p_i \in [0, 1]$ is the partial volume fraction from the supplementary volume.

When `-brain <vol>` is provided, the percentage is:

$$\%V = 100 \cdot \frac{V_\ell}{V_\text{brain}}$$

When `-icv <vol>` is provided or `-atlas_icv <mm3>` is specified, ICV-normalised volumes are computed.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | Segmentation volume |
| (positional 2) | int | required (unless `-all`) | Label value |
| `-all` | flag | off | Compute volumes for all labels |
| `-log <file>` | path | — | Write output to log file |
| `-ss` | flag | off | Spreadsheet output format |
| `-pv <vol>` | volume | — | Partial volume fractions volume |
| `-in <label>` | int | — | Inner label (for hollow structure volumes) |
| `-out <label>` | int | — | Outer label (for hollow structure volumes) |
| `-brain <vol>` | volume | — | Brain volume for percentage calculation |
| `-icv <vol>` | volume | — | ICV volume for ICV-normalised output |
| `-atlas_icv <mm3>` | float | -1 | Atlas ICV in mm³ for normalisation |
| `-q` | flag | off | Quiet mode |
| `-subject <name>` | string | — | Subject name (for labelling output) |

## Configuration Interactions

- `-all` and providing a specific label are mutually exclusive. With `-all`, the output lists all labels and their volumes.
- `-brain` and `-icv` enable proportional reporting; they are independent of each other.
- `-in` and `-out` are used for hollow structures: the volume of the outer label minus the inner label gives the shell volume.

## Typical Use Cases

```bash
# Volume of hippocampus (label 17)
mri_label_volume aseg.mgz 17

# All label volumes
mri_label_volume aseg.mgz -all -log aseg_volumes.log

# As percentage of brain volume
mri_label_volume aseg.mgz 17 -brain brain.mgz

# Spreadsheet output for all labels
mri_label_volume aseg.mgz -all -ss -log volumes_ss.log
```

## Pipeline Context

Not a direct `recon-all` stage, but closely related. The same computations are performed in `mris_anatomical_stats` as part of the morphometric statistics output. `mri_label_volume` provides a standalone interface for segmentation volumes.

## Gotchas and Caveats

- The tool reports in mm³; voxel size is read from the volume header, so the input must have correct spatial metadata.
- When using `-pv`, the partial volume fractions volume must be in the same voxel space as the segmentation.
- The `-in`/`-out` option for hollow structures counts only the difference region, not the full outer volume.

## Related Tools

- [[mris_anatomical_stats]] — comprehensive morphometric statistics including volumes
- [[mri_label_histo]] — intensity histogram within labels
- [[mri_label_vals]] — intensity values at label locations
- [[mri_binarize]] — thresholding and binarisation

## Confidence and Gaps

**High confidence:** algorithm is straightforward; code and variable names are unambiguous.
