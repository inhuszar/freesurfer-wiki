---
title: "mri_correct_segmentations"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_correct_segmentations/mri_correct_segmentations.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_ca_label]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact boundary correction logic in correct_gmwm_boundaries and correct_putamen_pallidum_boundaries not fully characterized"
  - "Target segmentation type (infant vs. adult) not specified in source header"
tags:
  - segmentation
  - correction
  - infant
  - post-processing
---

# mri_correct_segmentations

## Summary

`mri_correct_segmentations` applies a multi-pass post-hoc correction pipeline to an automated segmentation volume. It corrects GM/WM boundary errors, fixes putamen/pallidum boundary issues, enforces topological consistency (largest connected components, hole filling), and fills residual unlabeled voxels. The source comment mentions "infant segmentation" as the primary target, suggesting it was developed for the infant FreeSurfer pipeline.

## Source Information

- **Language:** C++
- **Source file:** `mri_correct_segmentations/mri_correct_segmentations.cpp`
- **Dependencies:** `fastmarching.h` (used for distance-based filling)

## Purpose and Context

Automated segmentation algorithms (especially for infant brains) can produce topological errors, mislabeled voxels at GM/WM boundaries, and isolated islands. This tool applies a deterministic rule-based correction pipeline to clean up such outputs without rerunning the full segmentation. The correction passes are:

1. `correct_gmwm_boundaries()` — fix GM/WM label assignment at boundaries
2. `correct_putamen_pallidum_boundaries()` — fix putamen/pallidum boundary errors (optional, skipped with `-n`)
3. `correct_gmwm_boundaries_2()` — second pass of boundary correction
4. `correct_largestCC_and_fill_holes()` — keep only the largest connected component per structure, fill holes
5. `fill_leftover_voxels()` — assign residual unlabeled voxels within the original brain mask
6. Repeat passes 1–3 on the corrected volume

## Inputs

Positional arguments:
1. **`fname`**: input segmentation volume (any `MRIread`-compatible format)
2. **`outputfname`**: output corrected segmentation path

## Outputs

A corrected segmentation [[mgz]] volume.

## Mathematical Foundations

The correction functions operate at the voxel neighborhood level using morphological operations and connectivity analysis:

- `correct_gmwm_boundaries()`: likely uses local neighborhood voting or distance maps to resolve ambiguous GM/WM labels at tissue interfaces.
- `correct_largestCC_and_fill_holes()`: uses connected-component analysis (3D 6- or 26-connectivity) to retain the largest component per label and fill enclosed holes.
- `fill_leftover_voxels()`: assigns unlabeled voxels within the brain mask using fast marching or nearest-neighbor propagation from labeled neighbors.

> [!gap] Correction logic not fully characterized
> The internals of `correct_gmwm_boundaries()`, `correct_putamen_pallidum_boundaries()`, and `fill_leftover_voxels()` are defined later in the source file but were not read. The exact correction criteria (neighborhood size, thresholds) are unknown.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-n` | — | off | Skip putamen/pallidum boundary correction (`noGMWM=1`) |

No other options are documented in the source's `get_option()` function.

## Configuration Interactions

- `-n` disables only the `correct_putamen_pallidum_boundaries()` step; all other corrections still run.

## Typical Use Cases

Correct an infant segmentation:
```bash
mri_correct_segmentations auto_seg.mgz corrected_seg.mgz
```

Skip putamen/pallidum correction:
```bash
mri_correct_segmentations -n auto_seg.mgz corrected_seg.mgz
```

## Pipeline Context

Not part of the standard [[recon-all]] adult pipeline. Likely called from the infant FreeSurfer pipeline scripts. It operates downstream of the automated segmentation step.

## Gotchas and Caveats

> [!gotcha] Infant-specific corrections
> The correction rules were designed for infant brain segmentations. Applying this tool to adult segmentations may produce unexpected results, particularly if the GM/WM boundary logic is tuned for neonatal tissue contrast.

> [!gotcha] Multi-pass pipeline — intermediate volumes discarded
> The tool creates multiple intermediate `outmri` copies internally but only writes the final result. Memory usage scales with the number of copies (5 full-size volumes are in memory simultaneously).

## Related Tools

- [[mri_segment]] — white matter segmentation (upstream step)
- [[mri_ca_label]] — subcortical parcellation (upstream step)

## Confidence and Gaps

Confidence is **medium**. The high-level pipeline structure is clear from `main()`. The detailed logic of each correction function was not read.
