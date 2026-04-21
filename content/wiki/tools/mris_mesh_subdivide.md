---
title: "mris_mesh_subdivide"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_mesh_subdivide/mris_mesh_subdivide.cxx"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_resample]]"
  - "[[mris_inflate]]"
  - "[[mris_smooth]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Partial subsurface-label subdivision is marked TODO in source; unclear if it is functional in 8.2.0."
tags:
  - surface
  - mesh
  - subdivision
  - vtk
---

# mris_mesh_subdivide

## Summary

`mris_mesh_subdivide` increases the resolution of a triangulated cortical surface mesh by applying a mesh subdivision algorithm. It uses the VTK library to perform subdivision and supports three schemes: modified butterfly (interpolating), Loop (approximating), and linear (interpolating). Each iteration of subdivision replaces each triangle with four smaller triangles, quadrupling face count and approximately quadrupling vertex count.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_mesh_subdivide/mris_mesh_subdivide.cxx`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_mesh_subdivide`
- **Original Author:** Jonathan Polimeni
- **External dependency:** VTK (Visualization Toolkit)

## Purpose and Context

Standard FreeSurfer surfaces are derived from icosahedra subdivided to a fixed resolution (typically ~160,000 vertices per hemisphere). `mris_mesh_subdivide` allows users to produce higher-resolution surfaces by further subdividing an existing mesh. This is useful for high-resolution cortical analysis (e.g., sub-millimetre laminar imaging), where the standard surface tessellation is too coarse.

The tool converts the FreeSurfer surface (`MRI_SURFACE`) to VTK `vtkPolyData`, applies the VTK subdivision filter, and converts back to an `MRI_SURFACE` written in the standard FreeSurfer binary surface format.

## Inputs

### Required Inputs

- **Input surface** — any FreeSurfer binary surface file (e.g., `lh.white`, `lh.pial`, `lh.inflated`). Must be a closed triangulated manifold mesh.
- **Output surface path** — destination file for the subdivided surface.

### Input Assumptions

> [!assumption] Triangulated mesh required
> VTK subdivision filters require a triangulated (all faces are triangles) manifold mesh. FreeSurfer surfaces are always triangulated, so this is normally satisfied.

> [!assumption] VTK library present
> The binary links against VTK. If VTK is not available at runtime, the tool will fail to execute.

## Outputs

### Files Created

- **Subdivided surface** — written to the specified output path in FreeSurfer binary surface format (see [[surface-format]]). The header geometry (volume geometry info) is cloned from the input surface.

### Output Specifications

Each subdivision iteration quadruples the number of faces and approximately quadruples the number of vertices. After one iteration with the butterfly scheme, a surface with $N$ vertices and $F$ faces becomes a surface with approximately $4F$ faces and correspondingly more vertices.

The tool reports total area and average vertex area for both the original and subdivided surfaces.

## Mathematical Foundations

Three subdivision methods are supported, delegated entirely to VTK:

**Modified Butterfly (default):** An interpolating subdivision scheme that preserves original vertex positions exactly. New edge midpoint positions are computed using a weighted average of nearby vertices. This scheme produces smooth surfaces and is the recommended default.

**Loop subdivision:** An approximating scheme based on box splines over triangular meshes. Original vertex positions are moved toward a weighted average of their neighbors:
$$
v_i' = (1 - n\beta) v_i + \beta \sum_{j \in \mathcal{N}(i)} v_j
$$
where $\beta$ depends on vertex valence $n$. This scheme does not interpolate original vertices and thus may move existing surface vertices.

**Linear subdivision:** Purely interpolating midpoint insertion — new vertices are placed at the arithmetic midpoint of each edge. No smoothing; produces flat triangle subdivision. Original vertex positions are preserved exactly.

> [!gotcha] Loop subdivision moves original vertices
> As noted in the source code comments (attributed to the author), visualization tools like freeview may appear to show moved original vertices even in interpolating subdivision modes, but the coordinate values are confirmed to be identical. For Loop subdivision, however, original vertex positions genuinely change.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--surf <filename>` | string | required | Input surface file path. If the filename is `inflated`, the tool exits with a warning (inflated surface subdivision discouraged). |
| `--out <filename>` | string | required | Output surface file path. If the path does not contain `/`, the output is written to the same directory as the input. |
| `--method <name>` | string | `butterfly` | Subdivision method. Options: `butterfly` (modified butterfly, interpolating), `loop` (Loop approximating, moves original vertices), `linear` (midpoint interpolating). |
| `--iter <N>` | integer | 1 | Number of subdivision iterations. Each iteration approximately quadruples the face count. |
| `--debug` | flag | off | Enable debug output. |
| `--version` | flag | — | Print version string and exit. |
| `--help` | flag | — | Print usage and exit. |

### Configuration Interactions

- `--method loop` is the only scheme that modifies original vertex positions. Do not use it when exact preservation of pre-existing surface vertex positions is required.
- `--iter 2` with butterfly produces approximately 16× the original face count; memory usage scales accordingly.
- If `--out` does not contain a `/`, the output is placed in the same directory as `--surf` (convenient for working within a subject's `surf/` directory).

> [!gotcha] Subsurface subdivision not implemented
> The source code contains a `TODO` comment indicating that label-constrained subsurface subdivision (applying subdivision only within a specified label region) is planned but not implemented. Attempting to use any related flags (if they exist) will have no effect.

## Typical Use Cases

### Use Case 1: Subdivide white surface to higher resolution (default method)

```bash
mris_mesh_subdivide --surf lh.white --out lh.white.subdivided
```

Uses the default modified butterfly method with 1 iteration.

### Use Case 2: Two iterations of butterfly subdivision

```bash
mris_mesh_subdivide --surf lh.white --out lh.white.hires --iter 2 --method butterfly
```

Produces a surface with approximately 16× more faces than the original.

## Pipeline Context

`mris_mesh_subdivide` is not part of the standard `recon-all` pipeline. It is used as a standalone post-processing utility for high-resolution surface analysis workflows.

## Gotchas and Caveats

> [!gotcha] VTK dependency
> This tool requires VTK, which is typically compiled into the FreeSurfer distribution. Custom builds without VTK support will not compile this tool.

> [!gotcha] No curvature or area file updates
> The source notes (section 4, "in progress") that updating associated `.curv` and `.area` files after subdivision is not yet implemented. After subdivision, any curvature or metric files from the original surface will have incorrect vertex counts and must be recomputed.

## Related Tools

- [[mris_resample]] — resamples a surface to a different icosahedral tessellation rather than globally subdividing
- [[mris_inflate]] — inflates a surface to a sphere; may be applied after subdivision
- [[mris_smooth]] — smooths surface geometry; useful after subdivision to reduce artifacts

## Confidence and Gaps

**High confidence.** The complete `parse_commandline()` function and `print_usage()` were fully read. All flags (`--surf`, `--out`, `--method`, `--iter`, `--debug`, `--version`, `--help`) are verified from source. The critical finding is that input/output are named flags (`--surf`/`--out`), not positional arguments as previously assumed.
