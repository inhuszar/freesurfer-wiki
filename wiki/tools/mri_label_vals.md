---
title: "mri_label_vals"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_label_vals/mri_label_vals.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label_histo]]"
  - "[[mri_label_volume]]"
  - "[[mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full option list not confirmed"
  - "Output format for multi-voxel queries not fully verified"
tags:
  - label
  - intensity
  - sampling
---

# mri_label_vals

## Summary

`mri_label_vals` extracts intensity values from a volume at the locations defined by a label (`.label`) file. For each point in the label, it samples the volume, interpolates the intensity (with optional coordinate handling for voxel or RAS coordinates), and writes the values to an output file.

## Source Information

- **Language:** C++
- **Source file:** `mri_label_vals/mri_label_vals.cpp`

## Purpose and Context

Surface and volume labels (`.label` files) define sets of spatial locations. `mri_label_vals` provides a way to sample an arbitrary scalar volume at these locations, which is useful for extracting ROI statistics, quality-checking atlas overlap, or preparing data for downstream statistical analyses.

## Inputs

| Argument | Description |
|----------|-------------|
| `<vol>` | Input intensity volume to sample |
| `<label>` | FreeSurfer label file (`.label`) |
| `<output>` | Output file with sampled values |

## Outputs

- A text file with one line per label vertex, containing the sampled intensity value (and optionally coordinates).

## Mathematical Foundations

For each point $(\mathbf{x}_\text{RAS})$ in the label, the tool converts coordinates to voxel space:

$$\mathbf{x}_\text{vox} = M_\text{ras2vox} \cdot \mathbf{x}_\text{RAS}$$

and samples the volume using trilinear interpolation or nearest-neighbour, depending on the flags set.

If `-cras` is active, the c_ras offset is applied before coordinate conversion to account for the difference between scanner RAS and surface RAS (tkRAS):

$$\mathbf{x}_\text{scanner RAS} = \mathbf{x}_\text{tkRAS} + \mathbf{c}_{RAS}$$

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | Volume to sample |
| (positional 2) | label | required | Label file |
| (positional 3) | path | required | Output file |
| `-seg <n>` | int | -1 | Use segmentation label number instead of label file |
| `-annot <prefix>` | string | — | Annotation prefix for surface labels |
| `-cras` | flag | off | Apply c_ras offset to label coordinates |
| `-q` | flag | off | Quiet mode |
| `-scaleup` | flag | off | Scale voxel sizes up (rescale to 1mm isotropic) |
| `-sdir <dir>` | string | — | Surface directory |
| `-hemi <h>` | string | — | Hemisphere (lh or rh) |
| `-erode <n>` | int | 0 | Erode label n times before sampling |
| `-coords` | flag | off | Output coordinates alongside values |

> [!gap] Complete options
> Additional flags may exist; `get_option()` was not fully read.

## Configuration Interactions

- `-cras` is needed when the label uses tkRAS (surface RAS) coordinates and the volume uses scanner RAS. Without this flag, sampling will be offset by the c_ras of the volume.
- `-seg <n>` changes the source of voxel selection from a `.label` file to all voxels with the given integer label in a segmentation volume.
- `-erode` shrinks the label before sampling to avoid edge effects at the label boundary.

> [!gotcha] Coordinate system mismatch
> The `-cras` flag must be set correctly depending on whether the label coordinates are in tkRAS or scanner RAS space. Incorrect setting silently produces wrong values.

## Typical Use Cases

```bash
# Extract T1 intensities at cortical label locations
mri_label_vals norm.mgz lh.frontal.label frontal_vals.txt

# Using segmentation label 17 (hippocampus)
mri_label_vals norm.mgz aseg.mgz hippo_vals.txt -seg 17

# Apply c_ras offset for surface labels
mri_label_vals norm.mgz lh.roi.label roi_vals.txt -cras
```

## Pipeline Context

Not part of `recon-all`. Used in research analyses for ROI-based intensity sampling.

## Gotchas and Caveats

- The c_ras offset issue is a common source of errors when mixing surface-space labels with volumes.
- Segmentation-mode (`-seg`) and label-file mode use different positional argument conventions.

## Related Tools

- [[mri_label_histo]] — histogram of intensities within label
- [[mri_label_volume]] — volume of labelled regions
- [[mri_convert]] — format conversion

## Confidence and Gaps

**Medium confidence:** core usage inferred from source; c_ras handling confirmed from variable declarations. Full option list not verified.
