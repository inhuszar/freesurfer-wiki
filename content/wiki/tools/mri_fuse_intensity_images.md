---
title: "mri_fuse_intensity_images"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fuse_intensity_images/mri_fuse_intensity_images.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_fuse_segmentations]]"
  - "[[mri_normalize]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "normalize_timepoints() algorithm body skipped (it is not used — code takes the else-branch which always calls normalize_timepoints_with_parzen_window)"
tags:
  - longitudinal
  - intensity-normalization
  - fusion
  - time-series
---

# mri_fuse_intensity_images

## Summary

`mri_fuse_intensity_images` fuses intensity images from multiple longitudinal timepoints into a single normalized volume. It reads a list of longitudinal subjects (from a text file), loads a volume from each timepoint's directory, applies cross-timepoint normalization using either a Parzen-window or standard approach, and writes the fused result. The tool is part of FreeSurfer's longitudinal processing pipeline. Author: Bruce Fischl.

## Source Information

- **Source language:** C++
- **Source file:** `mri_fuse_intensity_images/mri_fuse_intensity_images.cpp`
- **Key dependencies:** `mri.h`, `gca.h`, `mrinorm.h`, `transform.h`

## Purpose and Context

In longitudinal MRI studies, within-subject intensity differences across timepoints can bias morphometric measurements. `mri_fuse_intensity_images` normalizes intensity across timepoints by computing cross-timepoint statistics and creating a fused volume that is used as a reference for longitudinal analysis. It is called in the FreeSurfer longitudinal pipeline (e.g., `recon-all -long`).

## Inputs

Positional arguments (in order):
1. Longitudinal subject list file — text file listing subject names, one per line (the subjects following the `base` subject convention: `<tp>.long.<base>`)
2. Volume name within each subject's `mri/` directory
3. Transform file name
4. Output volume path

`SUBJECTS_DIR` must be set. The tool constructs paths as:
`$SUBJECTS_DIR/<tp>.long.<base>/mri/<vol_name>`

## Outputs

- Fused, normalized output volume at the specified path.

## Mathematical Foundations

Cross-timepoint intensity normalization uses the **Parzen-window method** exclusively (the alternative threshold-based `normalize_timepoints()` is guarded by `if (0)` and never executed).

The Parzen-window normalization replaces each voxel's intensity at each timepoint with a kernel-density-weighted mean across timepoints:

$$
\tilde{y}(x, t) = \frac{\sum_{t'} G_\sigma(y(x,t) - y(x,t')) \cdot y(x,t')}{\sum_{t'} G_\sigma(y(x,t) - y(x,t'))}
$$

where $G_\sigma$ is a Gaussian kernel with width `cross_time_sigma`. Voxels near which all timepoints have consistent intensities (small denominator variation) retain their values; outlier timepoints are down-weighted. This is analogous to bilateral filtering across time rather than space.

## Configuration Options

The option parser upcases all option strings before matching, so all flags are case-insensitive.

**Usage:** `mri_fuse_intensity_images [options] <timepoint_file> <vol_name> <transform> <out_vol>`

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-mask <file>` | file | — | Binary mask volume applied to each timepoint before normalization; values below `WM_MIN_VAL` (≈ 5) are zeroed (`!strcmp(option, "MASK")` after StrUpper) |
| `-sigma <val>` | float | `4.0` | Spatial smoothing sigma for the bias field (parsed but not actively used in the Parzen-window code path) |
| `-cross_time_sigma`<br>`-cross-time-sigma` | float | `1.0` | Sigma of the Parzen (Gaussian) kernel in intensity space used for cross-timepoint normalization |
| `-diag <file>` | file | — | Open diagnostic log file for writing |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Enable per-voxel debug output at specified voxel coordinates |
| `-debug_node <x> <y> <z>` | 3 ints | — | Enable per-node debug output at GCA node coordinates |
| `-W` | (flag) | off | Enable `DIAG_WRITE` diagnostic mode. |
| `-V` | `int` | — | Set `Gdiag_no` diagnostic vertex/voxel number. |

> [!gotcha] `normalize_timepoints()` is dead code
> The source contains two normalization implementations. The `if (0)` branch in main selects `normalize_timepoints()` (the threshold-based method), which is never executed. The Parzen-window method (`normalize_timepoints_with_parzen_window`) is always used. The `--sigma` flag is parsed but the `bias_sigma` variable it sets has no effect in the active code path.

## Configuration Interactions

- `-cross_time_sigma` is the only parameter that actively affects normalization output.
- `-mask` applies a binary mask derived from the segmentation before cross-timepoint normalization.
- `-debug_voxel` and `-debug_node` both take 3 integer coordinates but set different global variables (`Gx/Gy/Gz` vs. `Ggca_x/Ggca_y/Ggca_z`).

## Typical Use Cases

```bash
# Fuse intensity images for a longitudinal subject
mri_fuse_intensity_images \
  /path/to/base_subject/ norm.mgz talairach.xfm fused_norm.mgz
```

## Pipeline Context

Called in `[[wiki/pipelines/recon-all|recon-all]]` longitudinal mode (`-long`). Part of the within-subject template construction workflow. Typically followed by `[[mri_fuse_segmentations]]`.

## Gotchas and Caveats

> [!assumption] Expects longitudinal directory structure
> The tool constructs paths using FreeSurfer's longitudinal directory convention (`<tp>.long.<base>`). Non-standard directory structures will cause file-not-found errors.

## Related Tools

- `[[mri_fuse_segmentations]]` — fuses segmentations across timepoints (companion tool)
- `[[mri_normalize]]` — single-timepoint intensity normalization

## Confidence and Gaps

**High confidence.** Full source read. Complete flag set confirmed from `get_option()`. Parzen-window normalization algorithm read and documented. Dead-code `normalize_timepoints()` path identified.
