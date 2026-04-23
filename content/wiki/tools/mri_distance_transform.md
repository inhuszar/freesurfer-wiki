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
last_agent_update: 2026-04-22
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
- `-wsurf fname`: restrict computation to voxels inside/adjacent to a surface
- `-label fname`: area volume for CSF-path analysis (requires `-wsurf` and `-wthresh`)
- `-aseg fname`: aseg for WM/cortex masking
- `-wthresh <vol> <thresh>`: white matter intensity volume and threshold
- `-csf fname`: write CSF voxel count to file
- `-normalize`: normalize distances by sqrt(surface area)
- `-b val`: binarize input to label before computing distance
- `-dilate N`: dilate label by N voxels before computing distance
- `-posterior dist` / `-anterior dist`: restrict computation to posterior/anterior portion of label

## Outputs

A float-type [[mgz]] volume where each voxel contains the distance (in mm) to the nearest voxel with the specified label, capped at `max_distance`. Mode determines sign and direction.

## Mathematical Foundations

**Fast marching** (Sethian, 1996): the core algorithm `MRIextractDistanceMap()` uses a priority queue to propagate distance values from the label boundary outward (or inward), solving the Eikonal equation:

$$
|\nabla d(\mathbf{x})| = 1
$$

with boundary condition $d(\mathbf{x}) = 0$ for $\mathbf{x}$ on the label boundary.

**Distance modes:**
| Mode | Description |
|------|-------------|
| 1 | Outside only: distance from non-label voxels to nearest label voxel |
| 2 | Inside only: distance from label voxels to the label boundary |
| 3 | Both (signed): negative inside, positive outside |
| 4 | Both (unsigned): absolute distance from boundary for all voxels |

**Normalization** (when `-normalize` is active and a surface is provided):
$$
d_\text{norm}(\mathbf{x}) = \frac{d(\mathbf{x})}{\sqrt{A_\text{surface}}}
$$

where $A_\text{surface}$ is the total surface area (`mris->total_area`).

**Surface-restricted computation**: if `-surf` is provided, an interior/exterior map is created by `MRISfillInterior()` and used to restrict which voxels are included in the distance computation.

## Configuration Options

Flags are parsed with single-dash stripping: the parser strips one leading `-` from `argv[N]` before comparison, so `-wsurf` and `--wsurf` are both accepted, but the canonical user-facing form is single-dash.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-wm` | `<aseg>` | — | Load `<aseg>` and create a white matter mask by copying WM-class labels; also sets `mri_aseg` for cortex/WM filtering. |
| `-anterior` | `<dist>` | — | Restrict computation to the anterior-most `<dist>` mm of the label. |
| `-aseg` | `<aseg>` | — | Load segmentation volume `<aseg>`; non-WM/cortex interior voxels are excluded from the distance computation. |
| `-label` | `<vol>` | — | Load area volume `<vol>`; used to compute CSF volume bordering regions closer than the label. Requires `-wsurf` and `-wthresh`. |
| `-posterior` | `<dist>` | — | Restrict computation to the posterior-most `<dist>` mm of the label. |
| `-wsurf` | `<surf>` | — | Surface file; interior of `<surf>` is used to restrict the distance computation to the cortical ribbon/WM. |
| `-csf` | `<file>` | — | Write CSF voxel count to text file `<file>`. |
| `-normalize` | — | off | Normalize distances by `sqrt(surface_area)` (requires `-wsurf`). |
| `-wthresh` | `<vol> <thresh>` | — | Load intensity volume `<vol>` and threshold at `<thresh>` to identify CSF voxels inside the white surface. |
| `-dilate` | `<N>` | `0` | Dilate the label by `<N>` voxels before computing the distance transform. |
| `-b` | `<val>` | `0` | Binarize input volume at threshold `<val>` before computing the distance transform. |
| `-p` | — | off | Scale output distances to percentage of maximum distance. |

## Configuration Interactions

- `-normalize` requires `-wsurf` to compute the surface area normalization factor (`sqrt(mris->total_area)`).
- `-aseg` with `-wsurf`: voxels inside the surface that are not WM or cortex class labels are zeroed out, restricting the distance computation to the cortical ribbon and WM.
- `-wthresh <vol> <thresh>` marks CSF voxels (intensity below threshold) inside the white surface; use with `-csf <file>` to record the count and with `-label` to compute CSF path correction.
- `-b <val>` binarization applies before `-dilate`, which applies before the distance transform computation.
- `-label` requires both `-wsurf` and `-wthresh` to be set; the code enforces this and exits with an error if either is missing.

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
