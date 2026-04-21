---
title: "mris_density"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_density/mris_density.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mri_info]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Whether this tool is still actively used or fully superseded by other density measures is unclear; it lives in attic/."
tags:
  - surface
  - density
  - morphometry
---

# mris_density

## Summary

`mris_density` computes a density map of interior voxels for each vertex on a surface. For every vertex, it counts how many voxels within a user-specified radius are interior to the surface mesh, then writes the resulting per-vertex measurement as a FreeSurfer curvature file. The tool lives in the `attic/` directory of the source tree, indicating it is a legacy or experimental utility.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_density/mris_density.cpp`
- **Author:** Bruce Fischl
- **Key library call:** `MRISmakeDensityMap()` (from `mrisurf`)

## Purpose and Context

The tool provides a surface-registered measure of local volumetric density near each surface vertex. This can be used to investigate cortical or subcortical tissue density in a neighbourhood around the surface. The result is stored in FreeSurfer's curvature file format, making it compatible with surface visualisation and analysis tools.

> [!gotcha] Attic status
> The source resides in `attic/mris_density/`, meaning it is not built as part of the standard FreeSurfer distribution pipeline. It may or may not be installed in `/usr/local/freesurfer/8.2.0/bin/`. Use with caution and verify installation before scripting.

## Inputs

- **Input surface file:** Any FreeSurfer-compatible surface (e.g., `lh.white`, `lh.pial`). Read via `MRISread()`.
- **Optional translation surface** (`-t`): A second surface used to translate a vertex index from one surface to another via canonical coordinates.

## Outputs

- **Curvature file** (positional `<output map>`): Per-vertex density values written with `MRISwriteCurvature()`. Values represent the count of interior voxels within the specified radius at each vertex.
- **Optional density volume** (`--debug`): An MRI volume (`MRI*`) written via `MRIwrite()` showing the density map for a single debug vertex.

## Mathematical Foundations

For each vertex $v_i$ with position $(x_i, y_i, z_i)$, the tool constructs a spherical neighbourhood of radius $r$ at resolution $\delta$ and counts the number of voxels $N_i$ that lie interior to the surface:

$$
D(v_i) = N_i(\{x \in \mathbb{R}^3 : \|x - v_i\| \le r,\ x\ \text{interior to surface}\})
$$

The intermediate density volume is computed at the resolution specified by `-R` (default $1/8$ mm), allowing sub-voxel precision relative to the input volume grid.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--radius` | `<float>` | 20.0 | Radius (mm) of the spherical neighbourhood used to count interior voxels |
| `-R` | `<float>` | 0.125 | Resolution of the intermediate density volume used for interior counting |
| `-V` | `<int>` | none | Debug vertex number; combined with `--debug` |
| `--debug` | `<vtxno> <density_fname>` | none | Debug mode: write density volume for the specified vertex to `density_fname` |
| `-T` | `<surface>` | none | Translate vertex index from a second surface via canonical coordinates |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `-V` and `--debug` must be used together; `--debug` takes the vertex number and output filename as two separate arguments.
- `-T` (translation surface) is only meaningful when `-V` (or `Gdiag_no`) has been set; it translates a vertex number on the alternate surface to the closest vertex on the input surface using canonical coordinates.
- `--radius` and `-R` are independent: `--radius` controls the anatomical neighbourhood size; `-R` controls the computational grid resolution.

## Typical Use Cases

```bash
# Compute density map with default radius (20mm)
mris_density lh.white lh.density

# Use a smaller radius for more local density
mris_density --radius 10 lh.white lh.density.r10

# Debug: inspect density volume for vertex 12345
mris_density -V 12345 --debug 12345 /tmp/dens.mgz lh.white /tmp/out.curv
```

## Pipeline Context

`mris_density` is not called by `recon-all`. It is a standalone utility for post-hoc morphometric analysis. Results can be loaded in `freeview` or processed with `mris_calc`.

## Gotchas and Caveats

> [!gotcha] Attic tool
> This program is in the `attic/` subdirectory of the FreeSurfer source tree and is not part of the default build. Its availability in the installed binary directory should be verified before use.

> [!gap] Output units
> The documentation does not clarify whether the output density value is a raw voxel count or a normalised measure. From the code it is a count within the radius sphere at the given resolution, not normalised by surface area.

## Related Tools

- [[mri_info]] — inspect volume geometry
- [[mris_calc]] — arithmetic on surface overlays
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**Confident (from source):** Input/output file handling, the two main parameters (`--radius`, `-R`), debug mode, translation mechanism.

**Uncertain:** Whether the installed binary matches this attic source; whether output values are normalised.

> [!gap] Attic provenance
> This tool resides in `attic/` in v8.2.0. It is unclear whether the installed binary at `/usr/local/freesurfer/8.2.0/bin/mris_density` corresponds to this source or an earlier version.
