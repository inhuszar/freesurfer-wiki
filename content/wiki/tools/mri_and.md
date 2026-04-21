---
title: "mri_and"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_and/mri_and.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - masking
  - logical-operations
  - volumes
---

# mri_and

## Summary

`mri_and` performs a logical voxel-wise AND across a series of two or more MRI volumes that must share the same geometry and RAS coordinate space. At each voxel, the output is non-zero only if the corresponding voxel is non-zero in every input volume. An optional threshold can be applied to each input before the AND operation. The companion tool `mri_or` performs the analogous logical OR.

## Source Information

- **Language:** C++
- **Source file:** `mri_and/mri_and.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

`mri_and` is a simple but essential mask-intersection utility. It is used whenever one needs to restrict analysis to voxels that satisfy a condition simultaneously across multiple binary (or thresholded) volumes — for example, to compute the intersection of a brain mask and a tissue-probability mask, or to find voxels that are above threshold in every subject in a group study.

The sister tool `mri_or` (in the same source directory `mri_and/mri_or.cpp`) produces the union. Both tools require all input volumes to share identical geometry.

## Inputs

- Two or more volume files in any format readable by [[mri_convert]] (e.g., [[mgz]], NIfTI, analyze).
- All input volumes **must** have the same dimensions and RAS geometry. No resampling is performed.

## Outputs

- A single output volume with the same geometry as the inputs. Voxels are set to the value carried by the first input at positions where all inputs are non-zero; otherwise they are set to zero.

> [!gotcha] Output data type
> The output inherits the data type of the first input volume (via `MRIcopy`). If the inputs are integer labels, the output values at "true" voxels will equal those of the first input, not `1`. Consider piping the output through [[mri_binarize]] if a clean binary mask is needed.

## Mathematical Foundations

For $N$ input volumes $V_1, V_2, \ldots, V_N$, optionally pre-thresholded at threshold $t$:

$$
V_{\text{out}}(x) = V_1(x) \cdot \prod_{i=1}^{N} \mathbf{1}\!\left[V_i(x) > t\right]
$$

where $\mathbf{1}[\cdot]$ is the indicator function. When no threshold is specified ($t = -1$, the default), the indicator test is simply $V_i(x) \neq 0$ (implemented via `MRIand(..., 0)` which tests the voxel value).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-t <thresh>` | float | -1 (disabled) | Apply threshold to each input volume before AND; only voxels with value > thresh participate |
| `--help` | flag | — | Print help text and exit |
| `-u` / `-?` | flag | — | Print usage and exit |
| `--version` | flag | — | Print version string and exit |

## Configuration Interactions

- `-t` is applied independently to every input volume before any AND operation. There is no way to set per-volume thresholds.
- No conforming or resampling flags exist; geometry mismatch results in undefined behavior (the code does not check geometry compatibility explicitly beyond requiring all volumes to be loaded by `MRIread`).

## Typical Use Cases

**Intersect two binary masks:**
```bash
mri_and brainmask.mgz wm.mgz intersection.mgz
```

**Threshold-then-intersect three probability maps:**
```bash
mri_and -t 0.5 gm_prob.mgz wm_prob.mgz csf_prob.mgz all_high.mgz
```

**Intersect many masks listed sequentially:**
```bash
mri_and mask1.mgz mask2.mgz mask3.mgz mask4.mgz output.mgz
```

## Pipeline Context

`mri_and` is not called directly by [[recon-all]] but is used in post-processing scripts for:
- Restricting statistical overlays to a region of interest.
- Computing overlap between automated and manual segmentations before passing to [[mri_compute_change_map]] or overlap utilities.

## Gotchas and Caveats

> [!gotcha] Geometry must match exactly
> The code calls `MRIread` on each volume and passes them to `MRIand`. There is no geometric compatibility check. If volumes differ in dimension or RAS orientation, results will be incorrect or the tool may crash.

> [!gotcha] Output value is from first input, not always 1
> The first volume is copied into `mri_and`, then subsequent volumes are ANDed in. The output value at surviving voxels is the value from the first input (integer or float). This is often non-1 for label volumes.

> [!gotcha] No support for multi-frame volumes
> The `MRIand` function operates on a single frame. Multi-frame volumes are not explicitly supported and only the first frame may be processed.

## Related Tools

- [[mri_binarize]] — threshold a single volume to produce a binary mask
- [[mri_convert]] — format conversion
- `mri_or` — voxel-wise OR across multiple volumes (same source directory)

## Confidence and Gaps

The source code for this tool is short (~180 lines) and fully read. Confidence is high for all documented behaviour.

> [!gap] Behaviour with multi-frame volumes
> It is unclear whether `MRIand` processes all frames or only the first when multi-frame input volumes are supplied.
