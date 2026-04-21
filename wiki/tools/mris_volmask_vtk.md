---
title: "mris_volmask_vtk"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_volmask/mris_volmask.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_volmask]]"
  - "[[mris_volmask_novtk]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Specific VTK functions used for distance field acceleration not verified."
tags:
  - surface
  - mask
  - ribbon
  - volume
  - vtk
---

# mris_volmask_vtk

## Summary

`mris_volmask_vtk` is the VTK-enabled build variant of [[mris_volmask]]. It uses VTK (Visualization Toolkit) library routines for surface-to-volume distance field computation, potentially providing faster performance on large meshes. Functionally identical to [[mris_volmask]] and [[mris_volmask_novtk]]; only the implementation of the distance field calculation may differ.

## Source Information

- **Language:** C++
- **Source file:** `mris_volmask/mris_volmask.cpp` (same source, VTK-enabled CMake target)
- **VTK dependency:** Required

> [!gap] VTK usage details
> The specific VTK functions used (e.g., vtkOBBTree, vtkImplicitPolyDataDistance) were not identified from the source. The performance benefit of the VTK variant over novtk is not documented.

## Purpose and Context

See [[mris_volmask]] for full documentation.

## Configuration Options

Identical to [[mris_volmask]].

## Typical Use Cases

Use exactly as [[mris_volmask]]:
```bash
mris_volmask_vtk --subject bert
```

## Related Tools

- [[mris_volmask]] — canonical documentation
- [[mris_volmask_novtk]] — VTK-free variant
