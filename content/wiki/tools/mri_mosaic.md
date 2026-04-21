---
title: "mri_mosaic"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_mosaic/mri_mosaic.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "MRImakeMosaic() tiling algorithm not fully traced"
  - "Exact output geometry (how slices are arranged) not confirmed"
tags:
  - visualization
  - mosaic
  - display
  - attic
---

# mri_mosaic

## Summary

`mri_mosaic` takes a set of MRI volumes (or slices) as input and creates a single large mosaic volume that contains all of them arranged in a tiled grid. The output is suitable for rapid visual quality inspection. This tool resides in `attic/` and is not part of the active FreeSurfer 8.2.0 build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_mosaic/mri_mosaic.cpp`
- **Status note:** In `attic/` — legacy code. Not compiled in FreeSurfer 8.2.0.

## Purpose and Context

Quality control of large neuroimaging datasets often requires rapidly inspecting many volumes. `mri_mosaic` tiles multiple volumes side by side into a single output volume, allowing simultaneous display of all inputs in a single image viewer window (e.g., `freeview` or a standard image viewer if exported to PNG/TIFF).

This approach was common before modern QC dashboards and was particularly useful for slice-by-slice quality inspection of multi-echo or multi-session data.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volumes | [[mgz]] / any MRI | Two or more volumes to tile into a mosaic |
| Output filename | string | Last positional argument |

**Usage:** `mri_mosaic [options] <in1> <in2> [...] <out>`

Accepts up to 10,000 input images (`MAX_INPUT_IMAGES = 10000`).

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Mosaic volume | [[mgz]] | Single volume containing all inputs tiled in a grid |

## Mathematical Foundations

The tiling is implemented in `MRImakeMosaic()`. The function arranges the $N$ input volumes in a 2D grid (square or near-square layout), placing each volume side by side. The output volume dimensions are computed as a multiple of the individual input dimensions.

If `-rectify` is specified, each input volume is rectified (absolute value taken) before tiling, converting signed intensity maps to absolute-value maps suitable for display.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-rectify` | flag | off | Take absolute value of each input before tiling |

## Configuration Interactions

- `-rectify` applies `|I(\mathbf{x})|$ to each input before placing it in the mosaic. Useful for displaying signed residual or z-score maps where both positive and negative extremes are visually important.

## Typical Use Cases

```bash
# Create a mosaic of 9 subject T1 volumes
mri_mosaic \
  s01/T1.mgz s02/T1.mgz s03/T1.mgz \
  s04/T1.mgz s05/T1.mgz s06/T1.mgz \
  s07/T1.mgz s08/T1.mgz s09/T1.mgz \
  group_mosaic.mgz

# Mosaic of residual maps (rectified for display)
mri_mosaic -rectify \
  r01.mgz r02.mgz r03.mgz r04.mgz \
  residuals_mosaic.mgz
```

## Pipeline Context

Not part of standard `recon-all`. Used in QC workflows and manual inspection of large datasets.

## Gotchas and Caveats

> [!gotcha] Attic status
> This tool is in `attic/` and is not compiled by default. Manual compilation required.

> [!gotcha] Input geometry requirements
> It is not confirmed whether `MRImakeMosaic()` requires all inputs to have the same geometry. If inputs differ in size or resolution, the behaviour is not defined from the source header alone.

> [!gap] Output geometry
> The exact layout algorithm in `MRImakeMosaic()` (square grid vs. single row, column order) is not traced from the source header. The output coordinate frame and slice ordering may be non-intuitive.

## Related Tools

- [[mri_convert]] — for extracting individual slices or changing display formats
- `freeview` — the recommended tool for interactive QC

## Confidence and Gaps

**Confident:** Basic purpose (volume tiling), `-rectify` flag, input limit of 10,000.

**Less confident:** Output layout algorithm, whether inputs must match in geometry.
