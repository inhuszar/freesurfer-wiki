---
title: "mri_interpolate"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_interpolate/mri_interpolate.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_normalize]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be distributed"
  - "Exact interpolation algorithm used is unclear"
  - "Full CLI not available"
tags:
  - interpolation
  - volume
  - preprocessing
  - attic
---

# mri_interpolate

## Summary

`mri_interpolate` interpolates missing or sparse values in an MRI volume using spatial averaging. It reads a volume, applies a specified number of averaging iterations (`navgs = 50` by default), and writes the result. The tool is in `attic/`, indicating legacy status. Its exact use case — whether for filling missing slices, super-resolution, or smoothing — is not documented in the source header.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_interpolate/mri_interpolate.cpp`
- **Original author:** Bruce Fischl

> [!gotcha] Attic location
> This tool is in `attic/` and may not be distributed or compiled in FreeSurfer 8.2.0.

## Purpose and Context

Based on the source code, `mri_interpolate` reads an input volume and applies spatial averaging using `navgs` iterations. A control point volume (`mri_ctrl`) is involved, suggesting the tool may:

- Interpolate between manually placed control points
- Fill in missing or zero-valued voxels using neighborhood averaging
- Smooth/interpolate sparse volumetric data

The tool appears to iterate over all voxels, reading/writing values in a loop, possibly implementing a diffusion-based filling algorithm.

## Inputs

| Input | Positional | Description |
|-------|-----------|-------------|
| Input volume | argv[1] | Volume with values to interpolate |
| Output volume | argv[2] | Path for interpolated output |

## Outputs

| Output | Description |
|--------|-------------|
| Interpolated volume | Volume with filled/interpolated values |

## Mathematical Foundations

The source allocates `mri_in`, `mri_ctrl`, and `mri_out`, suggesting a control-point-based interpolation. The `navgs = 50` parameter controls iteration count for spatial averaging. The exact interpolation method (nearest neighbor, trilinear, Gaussian diffusion, biharmonic spline) is not clear from the source header alone.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| (positional 1) | path | required | Input volume |
| (positional 2) | path | required | Output volume |
| `-a <N>` | int | 50 | Number of soap-bubble averaging iterations (`navgs`) |
| `-v <N>` | int | — | Diagnostic vertex number (`Gdiag_no`) for per-vertex debug output |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Set global debug voxel `(Gx,Gy,Gz)` for verbose per-voxel output |

## Typical Use Cases

```bash
mri_interpolate input.mgz output_interpolated.mgz
```

## Pipeline Context

Not part of `recon-all`. Legacy utility for specific interpolation use cases.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — includes basic resampling/interpolation functionality

## Confidence and Gaps

**Confident (from source):** Two positional arguments (input, output), navgs=50 default, involves control point volume.

**Uncertain:** Full purpose; exact algorithm; CLI flags; whether functional in v8.2.0.

> [!gap] Source analysis needed
> A more detailed read of the main processing loop in `mri_interpolate.cpp` is needed to determine the exact interpolation algorithm.
