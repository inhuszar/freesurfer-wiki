---
title: "mris_w_to_curv"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_w_to_curv/mris_w_to_curv.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_surf2surf]]"
  - "[[mris_calc]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - format-conversion
  - overlay
  - attic
---

# mris_w_to_curv

## Summary

`mris_w_to_curv` converts a FreeSurfer `.w` (paint) format surface overlay file to the `.curv` format. The `.w` format is a sparse overlay format that only stores values for a subset of vertices; the `.curv` format stores a value for every vertex. This tool reads the `.w` file, maps values onto the full surface, and writes the result as a curvature file.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_w_to_curv/mris_w_to_curv.cpp`
- **Note:** Located in `attic/` directory — this tool may be legacy/deprecated in FreeSurfer 8.2.0
- **Key functions:** `MRISreadValues()` (reads .w), `MRISwriteCurvature()` (writes .curv)

## Purpose and Context

The `.w` (paint) format is a legacy FreeSurfer surface overlay format that stores a sparse set of (vertex_index, value) pairs. The `.curv` format is the standard per-vertex scalar format used by most surface analysis tools. `mris_w_to_curv` bridges the two formats.

This conversion is needed when:
- Processing older FreeSurfer data that used `.w` format
- Applying tools that only accept `.curv` input to data in `.w` format
- Visualizing `.w` data in tools that require `.curv`

> [!gotcha] Attic location
> This tool is in `attic/mris_w_to_curv/`, indicating it may be a legacy tool not actively maintained. Modern FreeSurfer workflows use `.mgh`/`.mgz` surface overlays. Consider using `mri_surf2surf` with explicit format flags as an alternative.

## Inputs

| Input | Description |
|---|---|
| Positional arg 1 | Subject name |
| Positional arg 2 | Hemisphere (`lh` or `rh`) |
| Positional arg 3 | `.w` overlay filename |
| Positional arg 4 | Output `.curv` filename |

Optional flags:
| Flag | Description |
|---|---|
| `-navgs N` | Number of averaging iterations to smooth the result |
| `-sdir dir` | Override SUBJECTS_DIR |
| `-normalize` | Normalize the output values |

The surface is loaded from `$SUBJECTS_DIR/<subject>/surf/<hemi>.white`.

## Outputs

| Output | Description |
|---|---|
| Curvature file | Written to `$SUBJECTS_DIR/<subject>/surf/<hemi>.<curv_name>` |

## Mathematical Foundations

The conversion is straightforward: the `.w` file stores values for specific vertex indices. `MRISreadValues()` loads these into the surface vertex structure. Vertices not present in the `.w` file receive a default value of 0. `MRISwriteCurvature()` then writes all vertex values to the `.curv` binary format.

## Configuration Options

| Flag | Argument | Description |
|---|---|---|
| `-navgs` | N | Smooth the result with N averaging iterations |
| `-sdir` | dir | Override SUBJECTS_DIR |
| `-normalize` | (flag) | Normalize output values |

Usage:
```
mris_w_to_curv [options] <subject> <hemi> <w_file> <curv_name>
```

## Typical Use Cases

**1. Convert LH w-file to curvature format:**
```bash
mris_w_to_curv bert lh lh.thickness.w lh.thickness.from_w
```

**2. Convert and smooth:**
```bash
mris_w_to_curv -navgs 5 bert lh activation.w activation.sm5
```

## Pipeline Context

Not part of standard `recon-all`. Utility for data format migration.

## Related Tools

- [[mri_surf2surf]] — general surface overlay format conversion
- [[mris_calc]] — arithmetic on surface overlays

## Confidence and Gaps

Source code read. Confidence is **high** for the basic functionality, though the attic location suggests this tool may not be actively tested.
