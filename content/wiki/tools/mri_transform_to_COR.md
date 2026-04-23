---
title: "mri_transform_to_COR"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_transform_to_COR/mri_transform_to_COR.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_transform]]"
  - "[[coordinate-systems]]"
status: draft
confidence: low
last_agent_update: 2026-04-22
gaps:
  - "Source in attic/ — may not be compiled or distributed in FreeSurfer 8.2.0."
tags:
  - mri
  - COR
  - format
  - transform
  - attic
  - legacy
---

# mri_transform_to_COR

## Summary

`mri_transform_to_COR` converts a spatial transform to COR (coronal) format — the legacy FreeSurfer binary volume format that predated MGZ. It is located in the `attic/` directory and is almost certainly not compiled or distributed in FreeSurfer 8.2.0. This is a legacy tool for converting transforms to the old COR volume format.

## Source Information

- **Language:** C++
- **Source file(s):** `attic/mri_transform_to_COR/mri_transform_to_COR.cpp`
- **Binary/script location:** Likely not present in FreeSurfer 8.2.0 `bin/`
- **Note:** Both the `attic/` source and a test utility at `utils/test/mri_transform_to_COR.c` exist.

## Purpose and Context

COR format was the original FreeSurfer volume format: a directory of 256 coronal slices, each stored as a raw 256×256 byte file. This format is obsolete — modern FreeSurfer uses MGZ. `mri_transform_to_COR` likely converted a volume with an embedded transform into COR format, applying the transform in the process.

> [!gotcha] COR format is obsolete
> The COR format has been superseded by MGZ since FreeSurfer 3.x. Any workflow requiring this tool should be updated to use MGZ-based tools ([[mri_convert]], [[mri_transform]]).

## Inputs

Positional arguments: `mri_transform_to_COR <input> <output>`

- **`input`**: source MRI volume (any format readable by FreeSurfer)
- **`output`**: output volume path (COR directory, or geometry from `-like` volume)

## Outputs

- Resampled volume in COR format (256×256×256, 1 mm isotropic, UCHAR) unless `-like` or `-out_type` override the format

## Mathematical Foundations

Converts the input volume to float internally, then applies the voxel-to-voxel transform derived from the LTA (or identity if no transform specified), and resamples into the output geometry using the chosen interpolation method. Final type conversion from float to the target type is applied last.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-ait` | `<lta_file>` | — | Apply the inverse of the LTA transform specified by the file; alias: `-invert_transform` |
| `-at` | `<lta_file>` | — | Apply the LTA transform from the given file; alias: `-transform` |
| `-autoscale` | — | off | Automatically scale the output histogram peak to 110 (implies `-noscale`) |
| `-bspline` | `[degree]` | 3 | Use cubic B-spline interpolation; optional spline degree argument |
| `-cubic` | — | — | Use cubic interpolation |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable per-voxel debugging at the given voxel coordinates |
| `-dst` | `<vol>` | — | Specify the destination volume geometry for an FSL `.mat` transform; alias: `-lta_dst` |
| `-high` | `<float>` | 1.0 | Upper percentile threshold for histogram-guided float-to-byte conversion |
| `-hw` | `<n>` | 6 | Set sinc interpolation half-window size (also enables sinc); alias: `-sinchalfwindow` |
| `-interp` | `<method>` | trilinear | Interpolation method: `trilinear`, `nearest`, `sinc`, `cubic`, `bspline`; aliases: `-sample`, `-sample_type`, `-st` |
| `-invert_transform` | `<lta_file>` | — | Apply the inverse LTA transform (alias: `-ait`) |
| `-like` | `<vol>` | — | Shape the output like the given reference volume (alias: `-out_like`) |
| `-low` | `<float>` | 0.0 | Lower percentile threshold for histogram-guided float-to-byte conversion |
| `-lta_dst` | `<vol>` | — | Destination volume geometry for FSL mat; alias: `-dst` |
| `-lta_src` | `<vol>` | — | Source volume geometry for FSL mat; alias: `-src` |
| `-nearest` | — | — | Use nearest-neighbour interpolation |
| `-noscale` | — | off | Suppress histogram scaling during type conversion |
| `-out_like` | `<vol>` | — | Shape the output like the given reference volume (alias: `-like`) |
| `-out_type` | `<n>` | 0 (MRI\_COR) | Output volume type code (0=COR/UCHAR, 3=FLOAT, etc.) |
| `-sample` | `<method>` | trilinear | Interpolation method (alias: `-interp`, `-st`, `-sample_type`) |
| `-sample_type` | `<method>` | trilinear | Interpolation method (alias: `-interp`, `-sample`, `-st`) |
| `-scaling` | `<float>` | 1.0 | Scale all input voxel values by this factor |
| `-sinc` | `[hw]` | 6 | Use sinc interpolation; optional half-window size argument |
| `-sinchalfwindow` | `<n>` | 6 | Sinc half-window size (also enables sinc); alias: `-hw` |
| `-src` | `<vol>` | — | Source volume geometry for FSL mat (alias: `-lta_src`) |
| `-st` | `<method>` | trilinear | Interpolation method (alias: `-interp`, `-sample`, `-sample_type`) |
| `-transform` | `<lta_file>` | — | Apply an LTA transform (alias: `-at`) |
| `-trilinear` | — | on | Use trilinear interpolation (default) |

## Pipeline Context

Not part of `recon-all`.

## Gotchas and Caveats

> [!gotcha] Almost certainly not available
> Check whether this binary exists in the installed FreeSurfer 8.2.0.

> [!gotcha] COR format is obsolete
> Do not use COR format for new workflows. Use MGZ.

## Related Tools

- [[mri_convert]] — handles conversion between modern formats including legacy COR
- [[mri_transform]] — applies transforms to volumes in modern formats

## Confidence and Gaps

Confidence is **medium**. Source was read from `attic/mri_transform_to_COR/mri_transform_to_COR.cpp`; all flags documented from `get_option()`. Attic status means this tool is of historical interest only.

> [!gap] Verify installation and relevance
> Confirm whether this binary exists in `$FREESURFER_HOME/bin/`. If not, this page should be tagged as historical/legacy only.
