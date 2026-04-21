---
title: "mri_linear_align_binary"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hires_register/mri_linear_align_binary.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_linear_align]]"
  - "[[mri_nl_align]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not extracted"
  - "Binary label handling not fully traced"
tags:
  - registration
  - linear
  - binary
  - high-resolution
---

# mri_linear_align_binary

## Summary

`mri_linear_align_binary` is a variant of [[mri_linear_align]] that operates on binarised label volumes (rather than raw intensity images) for linear registration. It aligns a binary or label-derived mask from a source volume to a target, using the same global search + Powell optimisation framework. It includes special handling for high-resolution hippocampal registration (`-hires_hippo`).

## Source Information

- **Language:** C++
- **Source file:** `mri_hires_register/mri_linear_align_binary.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Binary-based registration is appropriate when aligning structure-specific masks rather than raw intensity images. This avoids intensity bias and focuses the registration on structural shape. `mri_linear_align_binary` is part of the high-resolution registration toolkit and is used when aligning structures like the hippocampus in high-resolution protocols.

## Inputs

| Argument | Description |
|----------|-------------|
| `<target>` | Target binary/label volume |
| `<source>` | Source binary/label volume to align |
| `<output>` | Output registered volume or transform |

## Outputs

- Registered source volume and/or transform file (LTA).

## Mathematical Foundations

Similar to [[mri_linear_align]], but the cost function operates on binary voxel lists:

$$
\mathcal{L}(A) = \sum_{i \in \text{binary voxels}} \left(B_T(\mathbf{x}_i) \oplus B_S(A^{-1}\mathbf{x}_i)\right)
$$

or an overlap-based measure (Dice or similar). The `binary_label` variable (default 128) defines the threshold for binarisation.

Default search bounds: `MAX_ANGLE` = 25°, `MAX_SCALE` = 0.25 (smaller scale range than intensity-based version).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | Target binary/label volume |
| (positional 2) | volume | required | Source binary/label volume |
| (positional 3) | path | required | Output |
| `-hires_hippo` | flag | off | Use high-resolution hippocampus-specific mode |
| `-binarize <t>` | float | 0 | Binarise at threshold `t` before aligning |
| `-ncloses <n>` | int | 0 | Number of morphological close operations |
| `-conform` | flag | off | Conform output geometry |
| `-binary_label <l>` | int | 128 | Label value treated as "binary" foreground |

> [!gap] Complete option list
> The `get_option()` function was not fully read.

## Typical Use Cases

```bash
# Align binary hippocampus mask from source to target
mri_linear_align_binary target_hipp_mask.mgz source_hipp_mask.mgz aligned.mgz

# High-resolution hippocampus alignment
mri_linear_align_binary target_hipp.mgz source_hipp.mgz out.mgz -hires_hippo
```

## Pipeline Context

Not a standard `recon-all` stage. Used in high-resolution segmentation pipelines for hippocampus and similar structures.

## Gotchas and Caveats

- The `MAX_SCALE` is 0.25 (±25%) which is more conservative than [[mri_linear_align]]'s 0.5 (±50%).
- The `-binarize` threshold must be appropriate for the input volume; incorrect thresholding produces poor registration.

## Related Tools

- [[mri_linear_align]] — intensity-based variant
- [[mri_nl_align]] — non-linear alignment

## Confidence and Gaps

**Medium confidence:** global variables visible in header but full option list not confirmed.
