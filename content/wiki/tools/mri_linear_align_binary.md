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
last_agent_update: 2026-04-22
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

`mri_linear_align_binary` is a variant of [[mri_linear_align]] that operates on binarised label volumes (rather than raw intensity images) for linear registration. It aligns a binary or label-derived mask from a source volume to a target, using the same global search + Powell optimisation framework. It includes special handling for high-resolution hippocampal registration (`-h <label>`).

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

or an overlap-based measure (Dice or similar). The `-b <thresh>` flag defines the binarisation threshold; without it the volumes are treated as pre-binarised.

Default search bounds: `MAX_ANGLE` = 25° (`-max_angle`), `MAX_SCALE` = 0.25 (`-max_scale`), both more conservative than the intensity-based variant.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-h <label>` | int | — | Assume source is high-resolution hippocampus labeling; align to target label `<label>`. |
| `-l <label>` | int | — | Use label `<label>` from source and destination as the registration target. |
| `-b <thresh>` | float | — | Binarise volumes at threshold `<thresh>` before aligning. |
| `-c <N>` | int | — | Apply N morphological close operations on the binary image. |
| `-n <N>` | int | — | Number of registration passes. |
| `-w <N>` | int | — | Write intermediate volumes every N iterations (enables `DIAG_WRITE`). |
| `-r` | — | off | Constrain transform to be rigid (no scaling). |
| `-f <N>` | int | — | Apply N mode filters before writing final volume. |
| `-s` | — | off | Interpret target as a surface. |
| `-debug_voxel <x> <y> <z>` | int×3 | — | Debug specific voxel at coordinates (x, y, z). |
| `-angio` | — | off | Use distance transform SSE for aligning angiograms. |
| `-nopowell` | — | off | Skip Powell optimisation step. |
| `-view <x> <y> <z>` | int×3 | — | Visualise registration at voxel (x, y, z). |
| `-wm` | — | off | Align white matter labels using distance transform SSE. |
| `-target <label>` | int | — | Align specific target label using distance transform SSE. |
| `-filled <label>` | int | — | Align filled label using distance transform SSE. |
| `-distance` | — | off | Use distance transform for SSE cost computation. |
| `-trans <val>` | float | — | Set maximum translation search range (`MAX_TRANS`). |
| `-max_angle <deg>` | float | 25.0 | Set maximum rotation angle for search (degrees). |
| `-max_scale <val>` | float | 0.25 | Set maximum scale range for search (±fraction). |
| `-skip <N>` | int | — | Skip every N voxels in both source and target during registration. |
| `-source_skip <N>` | int | — | Skip every N voxels in source during registration. |
| `-target_skip <N>` | int | — | Skip every N voxels in target during registration. |

## Typical Use Cases

```bash
# Align pre-binarised hippocampus mask from source to target
mri_linear_align_binary target_hipp_mask.mgz source_hipp_mask.mgz aligned.lta

# Binarise at threshold 100 before aligning
mri_linear_align_binary target.mgz source.mgz out.lta -b 100

# High-resolution hippocampus alignment to CA1 label (17)
mri_linear_align_binary target_hipp.mgz source_hipp.mgz out.lta -h 17
```

## Pipeline Context

Not a standard `recon-all` stage. Used in high-resolution segmentation pipelines for hippocampus and similar structures.

## Gotchas and Caveats

- The default `MAX_SCALE` is 0.25 (±25%) which is more conservative than [[mri_linear_align]]'s 0.5 (±50%). Override with `-max_scale`.
- The `-b <thresh>` binarisation threshold must be appropriate for the input volume; incorrect thresholding produces poor registration.
- The uppercase StrUpper normalisation is applied to options before matching, so flags are case-insensitive at the command line.

## Related Tools

- [[mri_linear_align]] — intensity-based variant
- [[mri_nl_align]] — non-linear alignment

## Confidence and Gaps

**Medium confidence:** global variables visible in header but full option list not confirmed.
