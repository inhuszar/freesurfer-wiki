---
title: "mri_distance_transform"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_distance_transform/mri_distance_transform.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_dist_surf_label]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - distance-transform
  - morphology
  - label
  - geodesic
---

# mri_distance_transform

## Summary

`mri_distance_transform` computes the Euclidean distance transform from a binary label in a volume. For each voxel, it computes the distance to the nearest voxel with the specified label value, with four modes controlling whether distances outside the label, inside the label, or both (signed or unsigned) are computed. Uses a fast marching algorithm for efficient exact distance computation.

## Source Information

- **Language:** C++
- **Source file:** `mri_distance_transform/mri_distance_transform.cpp`
- **Original author:** Florent Segonne
- **Core algorithm:** `MRIextractDistanceMap()` in `fastmarching.h`

## Purpose and Context

Distance transforms are foundational for:
- Computing cortical depth/thickness
- Finding closest-approach distances between structures
- Creating distance-weighted masks
- Geodesic segmentation and morphological operations

This tool wraps the fast marching distance map computation with support for restricting the computation to a cortical ribbon (via surface input) and normalization options.

## Inputs

Positional arguments (at least 5 required):
1. **`input volume`**: volume containing the label
2. **`label`**: integer label value to compute distance from
3. **`max_distance`**: maximum distance to compute (mm); voxels beyond this get `max_distance`
4. **`mode`**: computation mode (1–4)
5. **`output volume`**: output distance volume (float)

Optional:
- `-surf fname`: restrict computation to voxels inside/adjacent to a surface
- `-area fname`: area volume for normalization
- `-aseg fname`: aseg for WM/cortex masking
- `-wt thresh -wn`: white matter intensity threshold
- `-csf fname`: CSF fraction file
- `-normalize`: normalize distances by surface area
- `-binarize val`: binarize input to label before computing distance
- `-dil N`: dilate label by N before computing distance
- `-posterior dist` / `-anterior dist`: restrict computation to posterior/anterior half

## Outputs

A float-type [[mgz]] volume where each voxel contains the distance (in mm) to the nearest voxel with the specified label, capped at `max_distance`. Mode determines sign and direction.

## Mathematical Foundations

**Fast marching** (Sethian, 1996): the core algorithm `MRIextractDistanceMap()` uses a priority queue to propagate distance values from the label boundary outward (or inward), solving the Eikonal equation:

$$|\nabla d(\mathbf{x})| = 1$$

with boundary condition $d(\mathbf{x}) = 0$ for $\mathbf{x}$ on the label boundary.

**Distance modes:**
| Mode | Description |
|------|-------------|
| 1 | Outside only: distance from non-label voxels to nearest label voxel |
| 2 | Inside only: distance from label voxels to the label boundary |
| 3 | Both (signed): negative inside, positive outside |
| 4 | Both (unsigned): absolute distance from boundary for all voxels |

**Normalization** (when `-normalize` is active and a surface is provided):
$$d_\text{norm}(\mathbf{x}) = \frac{d(\mathbf{x})}{\sqrt{A_\text{surface}}}$$

where $A_\text{surface}$ is the total surface area (`mris->total_area`).

**Surface-restricted computation**: if `-surf` is provided, an interior/exterior map is created by `MRISfillInterior()` and used to restrict which voxels are included in the distance computation.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-surf fname` | file | none | Restrict to surface-defined region |
| `-area fname` | file | none | Area map for normalization |
| `-aseg fname` | file | none | Aseg for WM/cortex label filtering |
| `-normalize` | — | off | Normalize distances by sqrt(surface area) |
| `-binarize val` | float | 0 | Binarize input at threshold val |
| `-dil N` | int | 0 | Dilate label by N voxels before computing |
| `-wt thresh` | float | — | White matter intensity threshold |
| `-wn fname` | file | — | White matter normalization volume |
| `-csf fname` | file | none | CSF volume for path masking |
| `-percent` | — | off | Output as percentage of max distance |
| `-anterior dist` | float | none | Restrict to anterior half of label |
| `-posterior dist` | float | none | Restrict to posterior half of label |
| `-ndil N` | int | 0 | Number of dilations (same as `-dil`) |

## Configuration Interactions

- `-normalize` requires `-surf` to compute the surface area normalization factor.
- `-aseg` with `-surf`: labels that are not WM or cortex are zeroed out in the interior map, restricting the computation to the cortical ribbon and WM.
- `-wt thresh` and `-wn` are used together to exclude CSF voxels from the distance paths.
- `-binarize val` applies before dilation, which applies before distance computation.

## Typical Use Cases

Compute distance from white matter surface (label=2) outward, max 10mm:
```bash
mri_distance_transform wm_mask.mgz 2 10 1 dist_outside.mgz
```

Compute bidirectional signed distance transform:
```bash
mri_distance_transform binary_structure.mgz 1 20 3 signed_dist.mgz
```

Surface-restricted distance from cortical label:
```bash
mri_distance_transform aseg.mgz 3 5 2 \
  -surf lh.white \
  dist_inside_cortex.mgz
```

## Pipeline Context

Not called directly by [[recon-all]], but internally used in cortical depth computation pipelines and specialized surface analyses. Closely related to `mris_thickness` and laminar analysis workflows.

## Gotchas and Caveats

> [!gotcha] Max distance cap
> Voxels beyond `max_distance` mm receive exactly `max_distance` in the output, not infinity or NaN. This can be misleading in downstream analyses if the cap is set too small.

> [!gotcha] Input must contain the label
> If no voxels in the input have the specified `label` value, the output will be uniformly `max_distance`. No warning is printed.

> [!gotcha] Mode 3 (signed distance) sign convention
> In mode 3, values inside the label are negative and outside are positive. This convention may differ from other tools (e.g., FSL's `distancetransform`).

## Related Tools

- [[mri_dist_surf_label]] — compute distance from a surface to specific label points
- [[mri_binarize]] — create binary masks before applying distance transform

## Confidence and Gaps

Confidence is **high**. Source is fully readable and the main() function documents usage inline.
