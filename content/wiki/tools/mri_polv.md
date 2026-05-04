---
title: "mri_polv"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_polv/mri_polv.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_nlfilter]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Complete options list not verified from binary"
tags:
  - filtering
  - preprocessing
  - local-orientation
---

# mri_polv

## Summary

`mri_polv` computes the plane of least variance (POLV) normal for each voxel in a 3-D MRI volume. For each voxel, a local neighborhood window is examined and the orientation of the plane that has minimum intensity variance is determined. The output is a 3-D volume encoding the normal vector to this plane at each voxel position. This is used internally by the FreeSurfer nonlinear filter ([[mri_nlfilter]]) to guide edge-preserving filtering.

## Source Information

- **Language:** C++
- **Source file:** `mri_polv/mri_polv.cpp`
- **Key function:** `MRIcentralPlaneOfLeastVarianceNormal(mri_src, NULL, window_size)`
- **Key includes:** `mri.h`, `mrinorm.h`

## Purpose and Context

The plane of least variance (POLV) is a local orientation descriptor for MRI volumes. At each voxel, the algorithm searches over candidate plane orientations within the neighborhood window and selects the one whose intensity values have the smallest variance — this typically corresponds to the direction parallel to a tissue boundary.

The POLV normal is then perpendicular to this plane, i.e., it points across the tissue boundary (in the direction of highest local gradient). The POLV normal output is used by [[mri_nlfilter]] to direct its offset-based nonlinear filtering along tissue boundaries.

As a standalone tool, `mri_polv` is useful for visualizing local tissue orientation or implementing custom edge-preserving filters.

## Inputs

- **Input volume:** A 3-D MRI volume in any FreeSurfer-readable format ([[mgz]], NIfTI, etc.)

## Outputs

- **POLV normal volume:** A 3-D volume of the same dimensions as the input, where each voxel value encodes the plane-of-least-variance normal. The encoding (scalar vs. multi-frame) depends on the `MRIcentralPlaneOfLeastVarianceNormal` implementation.

## Mathematical Foundations

For each voxel $v$ with neighborhood $\mathcal{N}(v)$ of size $W^3$ (default $W = 5$):

1. For each candidate plane orientation $\hat{n}$ from a discrete set of normals:
   - Project all neighborhood voxels onto the plane with normal $\hat{n}$
   - Compute the variance of intensities within that plane

2. Select the normal $\hat{n}^*$ that minimizes the within-plane variance:

$$
\hat{n}^* = \arg\min_{\hat{n}} \text{Var}\{I(v') : v' \in \mathcal{N}(v) \cap \text{plane}(\hat{n})\}
$$

3. The selected $\hat{n}^*$ is stored as the POLV normal for voxel $v$.

> [!math] Interpretation
> The plane of least variance at a tissue boundary will be the plane parallel to the boundary surface (where intensities are uniform within the tissue), and its normal $\hat{n}^*$ will point perpendicular to the boundary — i.e., in the direction of the local intensity gradient.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-w` | `<int>` | 5 | Window size for POLV computation |
| `-v` | (none) | on | Verbose mode (progress messages) |

> [!gap] Complete flag list
> Only two options are visible in the source (`-w` for window size and verbosity). The binary was not run to confirm.

## Configuration Interactions

- The window size `-w` directly controls the spatial scale of the POLV orientation estimate. Larger windows are more robust to noise but less sensitive to fine tissue boundaries.

## Typical Use Cases

```bash
# Compute POLV normal volume with default window (5)
mri_polv input.mgz polv_normals.mgz

# Use a larger window for smoother orientation estimates
mri_polv -w 7 input.mgz polv_normals.mgz
```

## Pipeline Context

`mri_polv` is not directly called by [[wiki/pipelines/recon-all|recon-all]]. Its primary use is as a building block for [[mri_nlfilter]], which calls `MRIcentralPlaneOfLeastVarianceNormal` internally. Running `mri_polv` as a standalone tool allows the POLV output to be inspected or used in custom preprocessing pipelines.

## Gotchas and Caveats

> [!gotcha] Computationally expensive
> The POLV computation involves searching over multiple plane orientations for every voxel, making it computationally intensive for large volumes. Processing time scales as $O(N \cdot W^3 \cdot K)$ where $N$ is the number of voxels, $W$ is the window size, and $K$ is the number of candidate orientations.

> [!gotcha] Output interpretation
> The POLV normal output volume encoding depends on the implementation of `MRIcentralPlaneOfLeastVarianceNormal`. Without consulting the library source, it is unclear whether the output is a scalar (angle), a multi-frame vector, or an orientation code.

## Related Tools

- [[mri_nlfilter]] — Uses POLV internally for nonlinear filtering
- [[mri_segment]] — White-matter segmentation that benefits from POLV preprocessing

## Confidence and Gaps

**High confidence:** Source language, file location, algorithm description (POLV computation), default window size.

**Medium confidence:** Output volume encoding (depends on shared library function signature not fully read).

> [!gap] POLV output encoding
> The exact format of the output volume (scalar, vector, multi-frame) needs to be verified by reading `MRIcentralPlaneOfLeastVarianceNormal` in `mrinorm.c`.
