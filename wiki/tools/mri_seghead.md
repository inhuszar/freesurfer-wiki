---
title: "mri_seghead"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_seghead/mri_seghead.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact algorithm for head segmentation beyond the documented threshold/fill approach is not fully described in the source header."
tags:
  - segmentation
  - head
  - BEM
  - skull-stripping
---

# mri_seghead

## Summary

`mri_seghead` segments the head (scalp boundary) from a T1-weighted MRI volume. It uses intensity thresholding followed by connected-component analysis and morphological operations (fill along rows, columns, and slices) to produce a binary head mask. The output is used for boundary element model (BEM) surface generation in MEG/EEG source localisation and for intracranial volume estimation.

## Source Information

- **Language:** C++
- **Source file:** `mri_seghead/mri_seghead.cpp`
- **Author:** Douglas N. Greve (analysis-bugs@nmr.mgh.harvard.edu)

## Purpose and Context

Head segmentation is distinct from brain/skull-stripping. `mri_seghead` produces a mask of the entire head including scalp, which is needed for:
1. **BEM surface generation** for MEG/EEG forward modelling (e.g., `mri_watershed` provides brain, `mri_seghead` provides outer head layer).
2. **Intracranial volume (ICV)** estimation workflows.
3. **Checking signal behind the head** (`--signal`) as a data quality metric.

## Inputs

- `--invol <file>`: Input T1 MRI volume (required).
- `--thresh1 <int>` / `--thresh2 <int>`: Lower and upper intensity thresholds.
- `--nhitsmin <int>`: Minimum number of hits required for a voxel to be included.

## Outputs

- `--outvol <file>`: Binary head segmentation volume (output mask). Fill value is 255 (adjustable with `--fill`).
- `--outbox <file>`: Optional bounding box volume for the head.
- `--hvoldat <file>`: Optional text file with head volume statistics.

## Mathematical Foundations

The algorithm proceeds as follows:

1. **Thresholding**: A hit map is created where $\text{HitMap}(x) = 1$ if `thresh1` $\le$ `intensity(x)` $\le$ `thresh2`.
2. **Row/column/slice filling**: The volume is filled along each axis independently. For each row (or column, or slice), if a voxel has at least `nhitsmin` neighbours that are in the hit map, it is included.
3. **Connected component analysis**: `volcluster` functions select the largest connected component as the head.
4. **Morphological cleanup**: Optional dilation (`--dilate`) expands the mask.

The "signal behind head" diagnostic fits a box 7 slices behind the outermost head slice in the conform-order (LIA) orientation and computes mean intensity and mean Sobel gradient magnitude as noise proxies.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--invol` | `<file>` | — | Input MRI volume (required) |
| `--outvol` | `<file>` | — | Output binary head mask (required) |
| `--outbox` | `<file>` | — | Write bounding box volume |
| `--thresh1` | `<int>` | -1 (auto) | Lower intensity threshold |
| `--thresh2` | `<int>` | -1 (auto) | Upper intensity threshold |
| `--nhitsmin` | `<int>` | 2 | Minimum hit count for fill |
| `--fill` | `<uchar>` | 255 | Fill value for output mask voxels |
| `--fillslices` | — | on | Fill along slice direction |
| `--fillrows` | — | on | Fill along row direction |
| `--fillcols` | — | on | Fill along column direction |
| `--no-fillslices` | — | — | Disable slice-direction fill |
| `--no-fillrows` | — | — | Disable row-direction fill |
| `--no-fillcols` | — | — | Disable column-direction fill |
| `--dilate` | `<int>` | 0 | Number of morphological dilation iterations |
| `--signal` | — | off | Compute and report signal intensity behind head |
| `--hvoldat` | `<file>` | — | Write head volume data to text file |
| `--debug` | — | off | Enable debug output |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `--thresh1` and `--thresh2` are both required for explicit thresholding. When set to -1 (default), the tool attempts automatic threshold selection.
- `--fillslices`, `--fillrows`, and `--fillcols` are all enabled by default. Disabling all three would leave only the thresholded hit map with no morphological closing.
- `--signal` uses `--outbox` to optionally save the behind-head box volume; `--outbox` is independent otherwise.
- `--dilate` expands the final mask; useful for ensuring the head surface encloses all expected tissue.

## Typical Use Cases

```bash
# Basic head segmentation
mri_seghead --invol T1.mgz --outvol head.mgz

# With explicit thresholds
mri_seghead --invol T1.mgz --outvol head.mgz --thresh1 20 --thresh2 255

# With dilation for BEM surface generation
mri_seghead --invol T1.mgz --outvol head.mgz --dilate 2

# Check signal behind head
mri_seghead --invol T1.mgz --outvol head.mgz --signal --outbox behind_head_box.mgz
```

## Pipeline Context

Not called by `recon-all` directly but used in MEG/EEG pre-processing workflows. Typically precedes `mri_tessellate` to generate the outer head surface for BEM models.

## Gotchas and Caveats

> [!gotcha] Threshold auto-selection
> When `--thresh1`/`--thresh2` are -1 (auto), the thresholds are set internally. Manual setting is recommended for non-standard MRI acquisitions.

> [!gotcha] Output fill value
> The output mask uses value 255 by default (not 1). Code that checks `if (mask > 0.5)` will work correctly, but code expecting binary 0/1 values needs to normalise first.

> [!gotcha] Conforming orientation
> The `--signal` computation temporarily resamples the volume to LIA (conform) orientation. The result is reported on stdout.

## Related Tools

- [[mri_watershed]] — brain-specific skull stripping
- [[mri_segstats]] — computes statistics from the resulting mask

## Confidence and Gaps

**Confident (from source):** All flags, fill algorithm, signal-behind-head computation, connected component selection.

**Uncertain:** Automatic threshold selection logic when `thresh1`/`thresh2` are -1.
