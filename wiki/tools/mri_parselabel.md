---
title: "mri_parselabel"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_parselabel/mri_parselabel.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label_vals]]"
  - "[[mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "Full command-line interface not extracted"
  - "Exact output format not confirmed"
tags:
  - label
  - parsing
  - coordinates
  - attic
---

# mri_parselabel

## Summary

`mri_parselabel` parses a FreeSurfer label file and performs coordinate operations: it reads 3D vertex/voxel coordinate triplets from a label file, optionally applies coordinate transforms (voxel scaling, Talairach transform), and writes the processed coordinates. It includes duplicate-coordinate detection and supports filling gaps between points.

> [!gotcha] Attic tool
> Source is in `attic/`. May not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_parselabel/mri_parselabel.cpp`
- **Copyright:** 2011 MGH

## Purpose and Context

Label files contain vertex or voxel coordinates and associated statistics. `mri_parselabel` provides C++ parsing of these files with additional functionality beyond the standard `LabelRead()` C API, including coordinate transform application and duplicate removal. The `Vertex` class in this tool implements a spatial tolerance-based equality comparison using voxel dimensions.

## Inputs

| Argument | Description |
|----------|-------------|
| `<label_file>` | Input FreeSurfer label file (`.label`) |
| `<mri_volume>` | MRI volume for coordinate system reference |

Optional: transform file (`xfname`).

## Outputs

- Modified label file or printed coordinates.

## Mathematical Foundations

The `Vertex` equality operator uses a spatial tolerance:

$$\text{equal}(A, B) \iff |A_x - B_x| < v_x/2 \text{ and } |A_y - B_y| < v_y/2 \text{ and } |A_z - B_z| < v_z/2$$

where $v_x, v_y, v_z$ are the voxel dimensions.

Coordinate transforms are applied via Talairach transform (`talairachex.h`).

The `scale` parameter (default 1.0) scales all coordinates uniformly.

When `fillup` is enabled, the tool interpolates additional points between existing label points to fill spatial gaps.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-useRealRAS` | flag | off | Use real (scanner) RAS instead of tkRAS |
| `-fillup` | flag | off | Fill gaps between label points |
| `-scale <s>` | float | 1.0 | Scale coordinates by factor |
| `-xfm <file>` | string | — | Transform file to apply |
| `-invert` | flag | off | Invert transform |
| `-stats` | flag | off | Print statistics |

> [!gap] Complete positional arguments and options
> The full argument parsing was not read.

## Typical Use Cases

```bash
# Parse and transform a label file
mri_parselabel input.label reference.mgz -xfm talairach.xfm
```

## Pipeline Context

Not part of `recon-all`. Research/utility tool for label file manipulation.

## Gotchas and Caveats

- Tool is in `attic/`; availability uncertain.
- The GCC < 3 workaround in the source (`#if (__GNUC__ < 3)`) suggests the code is very old.
- `useRealRAS` controls the coordinate reference frame interpretation — incorrect setting produces spatially wrong outputs.

## Related Tools

- [[mri_label_vals]] — extract values at label locations
- [[mri_convert]] — coordinate system information

## Confidence and Gaps

**Low confidence:** tool is in attic; functionality partially inferred from C++ class definitions.
