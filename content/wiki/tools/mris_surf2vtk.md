---
title: "mris_surf2vtk"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_surf2vtk.cxx"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - conversion
  - VTK
  - surface
  - format
---

# mris_surf2vtk

## Summary

`mris_surf2vtk` converts a FreeSurfer binary surface file to VTK PolyData format (`.vtk`) for visualization and processing in ITK/VTK-based tools such as ParaView, 3D Slicer, or custom ITK pipelines. It is a simple format-conversion utility located in the `resurf/` subdirectory.

## Source Information

- **Language:** C++ (uses ITK)
- **Source file:** `resurf/mris_surf2vtk.cxx`
- **Key libraries:** ITK (`itkMesh`, `itkVTKPolyDataWriter`, `itkTriangleCell`), `mrisurf`
- **Framework:** ITK (Insight Segmentation and Registration Toolkit)

## Purpose and Context

FreeSurfer surfaces use a proprietary binary format that is not directly readable by many general-purpose 3D visualization or mesh processing tools. VTK PolyData format (`.vtk`) is widely supported. `mris_surf2vtk` performs a straightforward vertex/face transcription from FreeSurfer's `MRI_SURFACE` structure to an ITK `Mesh<double, 3>`, then writes it using ITK's `VTKPolyDataWriter`. No coordinate transformation is applied; the output uses the same vertex coordinates as the input surface.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Input surface (`-i`) | FreeSurfer binary surface file. | FreeSurfer binary surface |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| VTK surface (`-o`) | Surface mesh in VTK PolyData format. | `.vtk` |

## Mathematical Foundations

No mathematical operations are performed. The conversion is a direct transcription:
- Vertex positions: `(surf->vertices[i].x, surf->vertices[i].y, surf->vertices[i].z)` → ITK `PointType`
- Faces: `(surf->faces[i].v[0], surf->faces[i].v[1], surf->faces[i].v[2])` → ITK `TriangleCell`

Coordinates are in surface RAS space (the native FreeSurfer surface coordinate system) unless the input surface has been transformed.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i` | surface file | required | Input FreeSurfer surface file |
| `-o` | output file | required | Output VTK file |
| `--help`<br>`-h` | — | — | Print usage and exit |

**Usage:** `mris_surf2vtk -i <surface> -o <output.vtk>`

## Configuration Interactions

Both `-i` and `-o` are required. No other options exist.

## Typical Use Cases

**Convert FreeSurfer white matter surface to VTK for ParaView:**
```bash
mris_surf2vtk -i lh.white -o lh.white.vtk
```

**Convert inflated surface for visualization:**
```bash
mris_surf2vtk -i lh.inflated -o lh.inflated.vtk
```

## Pipeline Context

`mris_surf2vtk` is not part of `recon-all`. It is used in post-processing for:
- Visualization in ParaView, 3D Slicer, or other VTK-based tools.
- Input to ITK-based mesh processing pipelines.
- Export to third-party neuroimaging platforms that accept VTK PolyData.

## Gotchas and Caveats

> [!gotcha] No coordinate transformation
> The output VTK file uses the native surface RAS coordinates from FreeSurfer. If the downstream tool expects scanner RAS or MNI coordinates, a separate transform must be applied.

> [!gotcha] No scalar data transfer
> The tool transfers only geometry (vertex positions and faces). Per-vertex scalar data (curvature, thickness, etc.) is not transferred to the VTK file. Use the overlay separately or use other tools (e.g., `mris_convert`) for format conversion with scalars.

> [!gotcha] Source in resurf/ directory
> The source is located in the `resurf/` directory rather than a dedicated `mris_surf2vtk/` directory, reflecting its origin as part of a surface reconstruction research project.

## Related Tools

- [[surface-format]] — FreeSurfer binary surface format description

## Confidence and Gaps

**High confidence.** The source is short (91 lines), complete, and self-explanatory. The entire logic is visible: read FreeSurfer surface → create ITK mesh → write VTK.
