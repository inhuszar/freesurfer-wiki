---
title: "mris_image2vtk"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_image2vtk.cxx"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not documented — help text not extractable without running the binary"
  - "Whether it converts a surface or an MRI volume to VTK is ambiguous from source"
  - "Located in resurf/ directory — context of this subproject unknown"
tags:
  - surface
  - vtk
  - conversion
  - format
---

# mris_image2vtk

## Summary

`mris_image2vtk` is a format conversion tool that converts a FreeSurfer MRI volume (image) to a VTK polydata mesh format using isosurface extraction (Marching Cubes). The source file is in the `resurf/` subdirectory and uses both ITK (Insight Toolkit) and VTK (Visualization Toolkit) libraries for the conversion pipeline. The tool creates a triangulated surface mesh from a binary or thresholded MRI volume and writes it in VTK format for use in external visualization or mesh processing pipelines.

## Source Information

- **Language:** C++
- **Source file:** `resurf/mris_image2vtk.cxx`
- **Dependencies:** VTK (vtkMarchingCubes, vtkPolyDataWriter, etc.), ITK
- **Note:** Located in the `resurf/` subproject of the FreeSurfer source tree

## Purpose and Context

VTK format is widely used in neuroimaging analysis pipelines, 3D visualization software (ParaView, 3D Slicer), and mesh processing tools. `mris_image2vtk` bridges FreeSurfer's native MRI volume format (MGZ/MGH) to the VTK ecosystem by running Marching Cubes on the input image.

The tool applies several processing steps:
1. Reads a FreeSurfer MRI volume
2. Converts MRI data to a VTK image data structure
3. Runs Marching Cubes (`vtkMarchingCubes`) or a contour filter
4. Post-processes: triangulation, normal estimation, hole filling, decimation, smoothing
5. Writes output in VTK polydata format (`vtkPolyDataWriter`)

## Inputs

| Input | Description |
|-------|-------------|
| MRI volume | FreeSurfer MRI volume (MGZ/MGH or other MRI-readable format) |

## Outputs

| Output | Description |
|--------|-------------|
| VTK file | Triangulated surface mesh in VTK polydata format (`.vtk`) |

## Mathematical Foundations

Isosurface extraction via Marching Cubes: for a given isovalue $c$, a surface is extracted as $\{(x,y,z) : f(x,y,z) = c\}$ where $f$ is the volumetric image intensity. The Marching Cubes algorithm tessellates this implicit surface with triangles by classifying each voxel corner as inside/outside.

Post-processing includes:
- Windowed Sinc smoothing (`vtkWindowedSincPolyDataFilter`)
- Normal estimation (`vtkPolyDataNormals`)
- Triangulation (`vtkTriangleFilter`)
- Hole filling (`vtkFillHolesFilter`)
- Decimation (`vtkDecimatePro` or `vtkQuadricDecimation`)

## Configuration Options

> [!gap] Command-line interface undocumented
> The complete command-line interface for `mris_image2vtk` was not extractable without running the binary (which requires VTK/ITK libraries). The flags are defined in `parse_commandline` but not documented here.

## Typical Use Cases

> [!gap] Typical usage unknown
> The exact invocation syntax is not confirmed. A typical use case would be:
> ```bash
> mris_image2vtk input.mgz output.vtk
> ```
> but this has not been verified.

## Pipeline Context

Not part of `recon-all`. Used for exporting FreeSurfer data to VTK-based analysis pipelines.

## Gotchas and Caveats

> [!gotcha] VTK and ITK dependencies required
> This tool requires both VTK and ITK to be available at compile and runtime. It may not be compiled in all FreeSurfer distributions. Verify with `which mris_image2vtk` before use.

## Related Tools

- [[mri_convert]] — general format conversion (does not produce VTK)
- [[surface-format]] — FreeSurfer surface format

## Confidence and Gaps

**Low confidence overall** — the source file was read but the full command-line interface was not traced.

> [!gap] Full CLI
> The complete list of command-line flags has not been extracted. Source reading is needed for `parse_commandline` in `resurf/mris_image2vtk.cxx`.
