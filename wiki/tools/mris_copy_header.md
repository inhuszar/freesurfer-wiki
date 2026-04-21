---
title: "mris_copy_header"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_copy_header/mris_copy_header.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - header
  - utility
  - geometry
---

# mris_copy_header

## Summary

`mris_copy_header` copies the geometry header from one FreeSurfer surface file to another, writing the result as a new surface file. The vertex coordinates and topology of the source surface are preserved; only the geometric metadata (volume geometry, coordinate transform matrices, subject name, colour table, and coordinate system flags) are replaced with values from the template surface.

## Source Information

- **Language:** C++
- **Primary source:** `mris_copy_header/mris_copy_header.cpp`
- **Original author:** Bruce Fischl (inferred from source style)
- **Source size:** ~53 lines; very compact utility

## Purpose and Context

FreeSurfer surface files embed a volume geometry (vg) structure that records the vox2ras matrix, dimensions, and voxel size of the reference volume associated with the surface. They also carry coordinate transform matrices (`lta`, `SRASToTalSRAS_`, `TalSRASToSRAS_`, `m_sras2vox`, `mri_sras2vox`) and the `useRealRAS` flag.

When a surface is generated in one processing context (e.g., from a different session or by a third-party tool) but needs to be used alongside surfaces from a specific FreeSurfer subject directory, the header geometry may be mismatched. `mris_copy_header` corrects this by transplanting all geometry-related fields from a correctly-headed template surface.

This tool is useful in:
- Longitudinal studies where surfaces need to be brought into a common header space.
- Importing external surfaces into a FreeSurfer subject directory.
- Repairing surfaces whose headers have been corrupted or stripped.

## Inputs

| Argument | Description |
|----------|-------------|
| `<input surface>` (positional 1) | The surface whose vertex coordinates and topology will be kept. |
| `<template surface>` (positional 2) | The surface whose header geometry will be copied. |
| `<output surface>` (positional 3) | Path for the output surface file. |

The tool requires exactly three positional arguments. If fewer are provided, it exits with an error message listing the usage.

## Outputs

| Output | Description |
|--------|-------------|
| `<output surface>` | A FreeSurfer surface file with the vertex data from `<input surface>` and the header geometry from `<template surface>`. |

## Mathematical Foundations

No geometric transformation of coordinates is performed. The operation is a pure data copy:

- `mri_sras2vox`: surface-RAS to voxel transform matrix (MRI pointer)
- `lta`: linear transform array (LTA pointer)
- `SRASToTalSRAS_`: surface-RAS to Talairach-RAS matrix
- `TalSRASToSRAS_`: Talairach-RAS to surface-RAS matrix
- `m_sras2vox`: surface-RAS to voxel matrix (MATRIX pointer)
- `vg`: volume geometry struct (origin, dimensions, voxel size, vox2ras)
- `subject_name`: string
- `useRealRAS`: boolean flag (0 = surface-RAS/tkRAS, 1 = scanner RAS)
- `ct`: colour table pointer

None of these fields affect vertex positions. The vertex `(x, y, z)` coordinates in the surface file are unchanged, but their interpretation changes because the reference volume geometry has been updated.

> [!gotcha] Coordinate interpretation changes silently
> After copying the header, the surface vertex coordinates still point to the same spatial locations, but the mapping from those coordinates to voxel indices in any associated volume is now defined by the template's geometry. If the input and template surfaces were associated with different volumes (different resolutions or fields of view), the surface will no longer correctly overlay on the original input volume.

## Configuration Options

There are no optional flags. The tool takes exactly three positional arguments:

```
mris_copy_header <input surface> <template surface> <output surface>
```

Providing fewer than three arguments causes the program to exit with a usage error.

## Configuration Interactions

No flags to interact.

## Typical Use Cases

### Copy header from a correct surface to a repaired one

```bash
mris_copy_header \
  lh.white.repaired \
  $SUBJECTS_DIR/subject01/surf/lh.white \
  $SUBJECTS_DIR/subject01/surf/lh.white.repaired.corrected
```

### Bring a third-party surface into FreeSurfer subject space

```bash
mris_copy_header \
  lh.external_surface \
  $SUBJECTS_DIR/subject01/surf/lh.white \
  $SUBJECTS_DIR/subject01/surf/lh.external_surface.fsheader
```

## Pipeline Context

`mris_copy_header` is not called by `recon-all` directly. It is a utility tool used in post-processing and manual repair workflows. It may be used when importing surfaces produced by external tools (e.g., CAT12, ANTs cortical thickness) into a FreeSurfer subject directory for further processing.

## Gotchas and Caveats

> [!gotcha] No coordinate transformation is applied
> This tool does NOT reproject coordinates. If the input surface lives in a different physical space than the template, the vertex positions will be numerically preserved but will no longer align correctly with the template's associated volume. Use `mri_convert` or surface registration tools if coordinate alignment is needed.

> [!gotcha] `ct` (colour table) is shared by pointer
> The source code copies the colour table pointer (`mris_in->ct = mris_template->ct`) without deep-copying. If the template surface is freed during the same process, the output surface's colour table pointer may become dangling. This is not an issue when the tool is run as a standalone binary (the process exits immediately), but matters if `MRISwrite` fails and the code attempts to free the template.

> [!gotcha] No format conversion
> Both input and output must be FreeSurfer binary surface format. The tool uses `MRISread` and `MRISwrite` without format negotiation.

## Related Tools

- [[surface-format]] — FreeSurfer surface file format specification
- [[mri_convert]] — volume format conversion (analogous header manipulation for volumes)

## Confidence and Gaps

Confidence is **high**. The source file is only ~53 lines and was read in full. The behaviour is entirely determined by the explicit list of fields copied from template to input surface, which is directly visible in the source.
