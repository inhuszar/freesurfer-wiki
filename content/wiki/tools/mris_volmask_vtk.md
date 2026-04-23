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

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--sd` | dir | `$SUBJECTS_DIR` | Subjects directory |
| `--aseg_name` | name | `aseg` | Base name of the aseg/template MRI (`mri/<name>.mgz`) |
| `--out_root` | root | `ribbon` | Output file base name (produces `mri/<root>.mgz`) |
| `--lh-only` | — | off | Process left hemisphere only |
| `--rh-only` | — | off | Process right hemisphere only |
| `--parallel` | — | off | Compute surface distances in parallel (OpenMP) |
| `--save_distance` | — | off | Save signed distance maps for each surface |
| `--save_ribbon` | — | off | Save per-hemisphere ribbon volumes (`?h.ribbon.mgz`) |
| `--edit_aseg` | — | off | Insert ribbon into aseg and save as `aseg.ribbon.mgz` |
| `--cap_distance` | N | `3` | Maximum distance for signed distance field computation |
| `--verbose` | — | off | Enable debug/diagnostic output |

> [!note] Additional flags
> `--surf_white` (default `white`), `--surf_pial` (default `pial`), and the five `--label_*` flags (`--label_left_white` = 20, `--label_left_ribbon` = 10, `--label_right_white` = 120, `--label_right_ribbon` = 110, `--label_background` = 0) are also accepted. Their names are built at runtime via string concatenation in the source, so they do not appear as string literals in the binary. See [[mris_volmask]] for full documentation.

See [[mris_volmask]] for full documentation of each option.

## Typical Use Cases

Use exactly as [[mris_volmask]]:
```bash
mris_volmask_vtk --subject bert
```

## Related Tools

- [[mris_volmask]] — canonical documentation
- [[mris_volmask_novtk]] — VTK-free variant
