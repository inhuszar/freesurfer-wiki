---
title: "mri_divide_segmentation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_divide_segmentation/mri_divide_segmentation.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label_volume]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "Division axis / direction logic not fully traced"
tags:
  - segmentation
  - attic
---

# mri_divide_segmentation

## Summary

`mri_divide_segmentation` splits a labelled segmentation region into a specified number of sub-parts along the principal axis of the region. It uses PCA-based decomposition to identify the dominant axis of the region, then divides the voxels into approximately equal parts along that axis.

> [!gotcha] Attic tool
> Source is in `attic/`. May not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_divide_segmentation/mri_divide_segmentation.cpp`

## Purpose and Context

Some anatomical structures span a significant extent and may benefit from subdivision for analysis purposes (e.g., anterior vs. posterior hippocampus). `mri_divide_segmentation` provides a geometry-driven subdivision using the principal axis of a target structure.

## Inputs

| Argument | Description |
|----------|-------------|
| `<seg>` | Input segmentation volume |
| `<label>` | Integer label to divide |
| `<nparts>` | Number of parts to divide into |
| `<index1> [<index2> ...]` | Output label indices for each part |
| `<output>` | Output segmentation volume |

Exactly 5 positional arguments are required.

## Outputs

- A segmentation volume with the specified label divided into `nparts` sub-labels, using the provided index values.

## Mathematical Foundations

The tool computes the principal axis of the labelled region using covariance matrix decomposition (PCA):

1. Compute centroid $(\bar{x}, \bar{y}, \bar{z})$ of the region.
2. Build the $3 \times N$ observation matrix of voxel coordinates centred at the centroid.
3. Compute the covariance matrix $\mathbf{C} = \mathbf{X}\mathbf{X}^T$ and extract its eigenvectors.
4. The leading eigenvector defines the principal axis.
5. Project voxels onto this axis: $z_f = e_z \cdot \mathbf{x}$ and partition by quantiles into `nparts` equal groups.

The code uses `zf_low` and `zf_high` variables to determine partition boundaries along the principal axis.

## Configuration Options

| Argument | Description |
|----------|-------------|
| (positional 1) | Input segmentation volume |
| (positional 2) | Integer label to divide |
| (positional 3) | Number of parts |
| (positional 4+) | Output label values for each part |
| (last positional) | Output volume |

No optional flags identified.

## Typical Use Cases

```bash
# Divide hippocampus (label 17) into anterior (17) and posterior (170) parts
mri_divide_segmentation aseg.mgz 17 2 17 170 aseg_divided.mgz
```

## Pipeline Context

Not part of `recon-all`. Research tool for structural parcellation studies.

## Gotchas and Caveats

- Tool is in `attic/`; availability in current installations is uncertain.
- The principal axis division is purely geometric and does not respect known anatomical landmarks.
- Very thin or irregular structures may produce unstable principal axis estimates.

## Related Tools

- [[mri_label_volume]] — compute volumes of labelled regions
- [[wiki/tools/mri_convert|mri_convert]] — format conversion

## Confidence and Gaps

**Low confidence:** tool is in attic; division axis logic partially inferred from variable names.
