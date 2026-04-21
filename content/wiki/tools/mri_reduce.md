---
title: "mri_reduce"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_reduce/mri_reduce.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - resampling
  - downsampling
  - resolution
---

# mri_reduce

## Summary

`mri_reduce` reduces the spatial resolution of a 3-D MRI volume by a factor of 2 along each dimension, using local averaging. Each reduction halves the linear dimensions (resulting in 1/8 the number of voxels). The reduction can be applied multiple times by specifying a repeat count.

## Source Information

- **Language:** C++
- **Source file:** `mri_reduce/mri_reduce.cpp`
- **Key function:** `MRIreduce(mri_src, mri_dst)`

## Purpose and Context

`mri_reduce` is a downsampling utility that reduces volume resolution by averaging local 2x2x2 voxel neighborhoods. It was used historically in multi-resolution registration and normalization pipelines where a low-resolution version of a volume was needed for coarse alignment or rapid computation. The `MRIreduce` function implements a simple local averaging (anti-aliasing) kernel.

## Inputs

- **Input volume:** Any FreeSurfer-readable 3-D MRI volume

## Outputs

- **Reduced volume:** Same format as input, with each dimension halved. If any dimension is odd (e.g., 129), the reduced size is `MAX(1, floor(dim/2))` voxels.

## Mathematical Foundations

Each output voxel is an average of the corresponding 2x2x2 input voxels:

$$
O(i,j,k) = \frac{1}{8} \sum_{di=0}^{1} \sum_{dj=0}^{1} \sum_{dk=0}^{1} I(2i+di,\, 2j+dj,\, 2k+dk)
$$

The voxel size in the output header is doubled accordingly, and the RAS center of the volume is preserved.

For multiple reductions (`-r N`), the operation is applied $N$ times sequentially, resulting in a volume with dimensions reduced by $2^N$ along each axis.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-r` | `<int>` | Number of reductions to apply (default: 1) |

## Configuration Interactions

- The only option is the repeat count. Each repeat halves all three dimensions.
- For a 256x256x256 volume: `-r 1` → 128x128x128; `-r 2` → 64x64x64; `-r 3` → 32x32x32.

## Typical Use Cases

```bash
# Reduce a 256x256x256 volume to 128x128x128
mri_reduce input.mgz reduced.mgz

# Reduce by factor 4 (apply twice)
mri_reduce -r 2 input.mgz reduced_4x.mgz
```

## Pipeline Context

`mri_reduce` is not a standard step in [[recon-all]]. It is useful in custom multi-resolution pipelines or when generating low-resolution versions of volumes for rapid visualization or coarse registration.

## Gotchas and Caveats

> [!gotcha] Output type is always float
> The output volume is allocated as `MRI_FLOAT` (`mri_dst = MRIallocSequence(..., MRI_FLOAT, ...)`), regardless of the input data type. This means the output is always float-valued, even if the input is integer-valued.

> [!gotcha] Odd dimension handling
> For volumes with odd dimensions (e.g., 129 voxels), the reduced size is `MAX(1, floor(129/2)) = 64`, which means one voxel at the boundary is effectively ignored. This can cause a small shift in the physical extent of the volume.

## Related Tools

- [[mri_convert]] — General format conversion and resampling with more interpolation options

## Confidence and Gaps

**High confidence:** Source language, file location, algorithm, output type (float), dimension handling — all directly read from source code.
