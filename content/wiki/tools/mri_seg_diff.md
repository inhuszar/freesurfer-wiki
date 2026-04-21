---
title: "mri_seg_diff"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_seg_diff/mri_seg_diff.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_diff]]"
  - "[[mri_seg_overlap]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - segmentation
  - editing
  - quality-control
---

# mri_seg_diff

## Summary

`mri_seg_diff` computes and merges differences between two segmentation volumes — primarily designed to manage manual edits to `aseg.mgz`. It can operate in two modes: (1) **difference mode**, which identifies voxels that differ between two segmentations and produces a "diff" volume encoding only the changed voxels; and (2) **merge mode**, which applies a diff volume back to a base segmentation to reconstruct the edited version.

## Source Information

- **Language:** C++
- **Source file:** `mri_seg_diff/mri_seg_diff.cpp`
- **Author:** Doug Greve (greve)

## Purpose and Context

Manual editing of `aseg.mgz` (the automated subcortical segmentation) is a common QC step in FreeSurfer workflows. After editing, the edits need to be preserved and propagated even if the automated segmentation is re-run. `mri_seg_diff` solves this by:

1. Extracting the manual edits as a compact "diff" volume.
2. Merging those edits back into a newly-generated automated segmentation.

This prevents edits from being lost when `recon-all` is re-run.

## Inputs

**Difference mode:**
- `--seg1 <file>`: The original (automated) segmentation (e.g., `aseg.auto.mgz`).
- `--seg2 <file>`: The edited segmentation (e.g., `aseg.mgz`).

**Merge mode:**
- `--seg <file>`: The base (automated) segmentation.
- `--diff-in <file>`: The previously computed diff volume.

## Outputs

**Difference mode:**
- `--diff <file>`: A diff segmentation volume. Voxels identical between `seg1` and `seg2` get value 256 (`Voxel-Unchanged` in `FreeSurferColorLUT.txt`); changed voxels take the value from `seg2`. Not written unless differences exist, unless `--diff-force` is used.

**Merge mode:**
- `--merged <file>`: The reconstructed merged segmentation. Voxels with diff value 256 take the base segmentation value; others take the diff value.

## Mathematical Foundations

The diff operation is a per-voxel comparison:

$$\text{diff}(x) = \begin{cases} 256 & \text{if } \text{seg1}(x) = \text{seg2}(x) \\ \text{seg2}(x) & \text{if } \text{seg1}(x) \neq \text{seg2}(x) \end{cases}$$

The merge operation is the inverse:

$$\text{merged}(x) = \begin{cases} \text{seg\_base}(x) & \text{if } \text{diff}(x) = 256 \\ \text{diff}(x) & \text{if } \text{diff}(x) \neq 256 \end{cases}$$

The value 256 (`Voxel-Unchanged`) is a special label defined in `FreeSurferColorLUT.txt` for this purpose.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--seg1` | `<file>` | — | Segmentation 1 (automated, reference) for diff computation |
| `--seg2` | `<file>` | — | Segmentation 2 (edited) for diff computation |
| `--diff` | `<file>` | — | Output diff volume (difference mode output) |
| `--diff-force` | — | off | Write diff volume even if no differences found |
| `--seg` | `<file>` | — | Base segmentation for merge mode |
| `--diff-in` | `<file>` | — | Input diff volume for merge mode |
| `--merged` | `<file>` | — | Output merged segmentation (merge mode output) |
| `--debug` | — | off | Enable debug output |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- The two modes are mutually exclusive. Difference mode requires `--seg1`, `--seg2`, and `--diff`. Merge mode requires `--seg`, `--diff-in`, and `--merged`.
- `--diff-force` only applies to difference mode; without it, if `seg1 == seg2` everywhere, no diff file is written.
- `SUBJECTS_DIR` must be set in the environment.

## Typical Use Cases

```bash
# Extract manual edits from aseg.mgz vs aseg.auto.mgz
mri_seg_diff --seg1 aseg.auto.mgz --seg2 aseg.mgz --diff aseg.manedits.mgz

# Merge manual edits back into a newly generated aseg.auto.mgz
mri_seg_diff --seg aseg.auto.mgz --diff-in aseg.manedits.mgz --merged aseg.mgz

# Force writing diff even when no changes
mri_seg_diff --seg1 aseg.auto.mgz --seg2 aseg.mgz --diff aseg.diff.mgz --diff-force
```

## Pipeline Context

Not called by `recon-all` automatically. Typically used manually by analysts after manual editing of `aseg.mgz`. Pairs with `tkmedit` for editing and [[mri_segstats]] for statistics on the final merged segmentation.

## Gotchas and Caveats

> [!gotcha] Label 256 is special
> The value 256 (`Voxel-Unchanged`) must appear in your `FreeSurferColorLUT.txt` for the diff volume to be viewable as a segmentation overlay. It is a defined entry in the FreeSurfer distributed LUT.

> [!gotcha] Diff volume is NOT just the changed voxels
> The diff volume is as large as the input segmentation. Unchanged voxels are filled with 256, not zero. This allows the diff to be loaded as a segmentation overlay in `tkmedit`.

> [!gotcha] SUBJECTS_DIR required
> The tool checks for `SUBJECTS_DIR` even when only file paths are given. Ensure the environment variable is set.

## Related Tools

- [[mris_diff]] — surface-domain analogous comparison tool
- [[mri_seg_overlap]] — overlap metrics between two segmentations
- [[mri_segstats]] — compute statistics from segmentation volumes

## Confidence and Gaps

**Confident (from source):** Both modes, the value-256 convention, `--diff-force`, complete flag set.

**Uncertain:** None significant.
