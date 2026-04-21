---
title: "mris_volmask_novtk"
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
  - "[[mris_volmask_vtk]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - mask
  - ribbon
  - volume
---

# mris_volmask_novtk

## Summary

`mris_volmask_novtk` is a build variant of [[mris_volmask]] that does not depend on the VTK library. It is functionally identical to `mris_volmask` and is typically the default binary installed in FreeSurfer distributions where VTK is not available. Creates the cortical ribbon mask from FreeSurfer surfaces.

## Source Information

- **Language:** C++
- **Source file:** `mris_volmask/mris_volmask.cpp` (same source, different CMake target)
- **VTK dependency:** None

## Purpose and Context

See [[mris_volmask]] for full documentation. This variant exists because some distance field computations in the OBB tree optionally use VTK for acceleration. The novtk variant uses a pure C++ implementation. In practice, the user-facing behaviour is identical.

## Configuration Options

Identical to [[mris_volmask]]. See that page for the full flag reference.

> [!note] Audit noise: `--sd`
> An automated audit may flag `--sd` as missing. The flag exists in the shared source `mris_volmask.cpp` and is documented in [[mris_volmask]]. This thin wrapper page intentionally has no flag table.

## Typical Use Cases

Use exactly as [[mris_volmask]]:
```bash
mris_volmask_novtk --subject bert
```

## Pipeline Context

See [[mris_volmask]].

## Related Tools

- [[mris_volmask]] — same tool, may use VTK
- [[mris_volmask_vtk]] — VTK-dependent build
