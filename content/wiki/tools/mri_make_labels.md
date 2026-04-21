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
  - "[[mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "No flag documentation available (no help text in header)"
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

The tool thresholds the input volume at the specified value to produce a binary mask, then applies connected-component analysis (`MRIsegment()`) with an upper bound of $10^{10}$ (effectively unlimited). Components with fewer voxels than `size_thresh` (default 10) are removed. Each surviving component is converted to a FreeSurfer label via `MRIsegmentToLabel()`, which records voxel coordinates and values.

Optionally, if `-abs` is specified, the absolute value of the volume is taken before segmentation, enabling extraction of both positive and negative clusters.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-abs` | flag | off | Use absolute value of input before thresholding |
| `-size <n>` | int | 10 | Minimum segment size in voxels; smaller segments are discarded |

> [!gap] Additional flags
> The `get_option()` function is not shown in the header. These two static variables (`use_abs`, `size_thresh`) are the only non-positional parameters visible in the source preamble.

## Configuration Interactions

- `-abs` is useful for finding clusters in signed residual or z-score maps where both positive and negative extremes are of interest.
- `-size` should be tuned to the expected cluster size; too small a threshold will produce many spurious single-voxel labels.

## Typical Use Cases

```bash
# Extract connected components from a residual volume above threshold 2.0
mri_make_labels residual.mgz 2.0 /tmp/cluster_labels/seg

# With absolute value (finds both positive and negative clusters)
mri_make_labels -abs zmap.mgz 2.5 /tmp/clusters/z
```

The output files will be named `/tmp/clusters/z.000.label`, `/tmp/clusters/z.001.label`, etc.

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
- [[mri_convert]] — for format conversion

## Confidence and Gaps

**Confident:** Basic functionality (threshold + connected components + label output), input/output structure, `use_abs` and `size_thresh` parameters.

**Less confident:** Whether additional flags exist, coordinate system handling in `MRIsegmentToLabel`.

> [!gap] Complete flag enumeration
> Only the static variable declarations are visible in the source header. A full `--help` invocation or reading `get_option()` completely is needed for confidence.
