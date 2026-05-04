---
title: "mri_make_labels"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_make_labels/mri_make_labels.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_binarize]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps: []
tags:
  - labels
  - segmentation
  - attic
---

# mri_make_labels

## Summary

`mri_make_labels` segments a volume by thresholding, identifies connected components, removes small segments below a size threshold, and writes each remaining segment as a separate `.label` file. It converts a continuous or discrete MRI volume into a set of FreeSurfer label files, one per connected component. This tool resides in `attic/` and is not part of the active build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_make_labels/mri_make_labels.cpp`
- **Status note:** In the `attic/` subdirectory — legacy code, not compiled in FreeSurfer 8.2.0.

## Purpose and Context

This utility was designed to extract spatially distinct regions from a statistical or residual map (or any scalar volume) by connected-component analysis. It is useful for identifying clusters of activation or anatomical regions defined by intensity thresholding. Each connected component above the threshold and exceeding a minimum voxel count becomes an individual label file.

The tool is conceptually a batch version of the cluster extraction step normally handled interactively in `tksurfer` or by dedicated cluster tools like `mri_volcluster`. It operates on volumes (not surfaces).

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Volume | [[mgz]] / any MRI | Input scalar volume to segment |
| Threshold | float (positional arg 2) | Minimum value for inclusion in a segment |
| Output stem | string (positional arg 3) | Base filename for output label files |

**Positional argument order:** `mri_make_labels [options] <volume> <threshold> <output_stem>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Label files | `<stem>.NNN.label` | One label file per connected component (zero-padded 3-digit index) |

## Mathematical Foundations

The tool thresholds the input volume at the specified value to produce a binary mask, then applies connected-component analysis (`MRIsegment()`) with an upper bound of $10^{10}$ (effectively unlimited). Components with fewer voxels than `size_thresh` (hardcoded default: 10) are removed. Each surviving component is converted to a FreeSurfer label via `MRIsegmentToLabel()`, which records voxel coordinates and values.

## Configuration Options

> [!note] No command-line flags
> The source `main()` function has no option parser. `use_abs` and `size_thresh` are static global variables initialized at compile time (defaults: `use_abs = 0`, `size_thresh = 10`). They are **not settable from the command line**. The tool takes only the three positional arguments described in the Inputs section.

## Typical Use Cases

```bash
# Extract connected components from a residual volume above threshold 2.0
mri_make_labels residual.mgz 2.0 /tmp/cluster_labels/seg
```

The output files will be named `/tmp/cluster_labels/seg.000.label`, `/tmp/cluster_labels/seg.001.label`, etc.

## Pipeline Context

Not invoked in standard `recon-all`. This was a pre-processing utility for group analysis. Modern equivalents for surface-based cluster extraction are found in `mri_glmfit` + `mri_surfcluster` / `mri_volcluster`.

## Gotchas and Caveats

> [!gotcha] Attic status
> This tool is in `attic/` and is not compiled by default. Manual compilation required.

> [!gotcha] Label coordinate system
> The label files produced encode voxel coordinates converted to surface RAS. If the input volume does not have a valid tkRAS coordinate frame (e.g., it is a template space volume without proper header info), the resulting labels may not register correctly with the subject's surfaces.

> [!gotcha] No overlap handling
> Each voxel is assigned to only one connected component. In regions where multiple structures are adjacent and not separated at the chosen threshold, they will merge into a single label.

## Related Tools

- [[mri_segment]] — produces segmentation volumes
- [[mri_binarize]] — for thresholding and binarization before label extraction
- [[wiki/tools/mri_convert|mri_convert]] — for format conversion

## Confidence and Gaps

**Confident (from source):** Basic functionality (threshold + connected components + label output), input/output structure, positional argument order. Confirmed from `main()`: no option parser exists.
