---
title: "mris_curvature2image"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_curvature2image.cxx"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_curvature]]"
  - "[[mris_extract_values]]"
  - "[[surface-format]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - curvature
  - volume
  - projection
  - resurf
---

# mris_curvature2image

## Summary

`mris_curvature2image` maps a curvature (or other scalar overlay) defined on a FreeSurfer surface mesh onto a volumetric image grid, assigning each voxel the curvature value of the nearest surface vertex. It uses a KD-tree for efficient nearest-neighbour lookup. The tool is part of the `resurf` (surface reconstruction utilities) subpackage. An inverse mode (`-inv`) is also available.

## Source Information

- **Language:** C++ (ITK/VTK based)
- **Primary source:** `resurf/mris_curvature2image.cxx`
- **Framework:** Uses ITK image infrastructure, VTK KD-tree point locator (`vtkKdTreePointLocator`), and FreeSurfer's `MRISread`/`MRISreadCurvature` I/O.

## Purpose and Context

Standard FreeSurfer tools keep morphometric data (curvature, thickness, etc.) in surface overlay format (`.curv`, `.mgz` per-vertex files). Some downstream applications (e.g., volumetric statistical analysis, SPM/FSL workflows, or multi-modal comparisons) require the data in volumetric image space. `mris_curvature2image` bridges this gap by projecting surface curvature onto a reference volume grid.

The tool operates in the `resurf` framework, which is designed for high-resolution surface reconstruction, and uses surface RAS (`MRIvoxelToSurfaceRAS`) for coordinate matching between surface vertices and volume voxels.

## Inputs

| Flag | Description |
|------|-------------|
| `-s <surface>` | Input FreeSurfer surface file (e.g., `lh.white`). |
| `-m <mask>` | Reference volume that defines the output image grid (geometry, dimensions). |
| `-c <overlay>` | Surface curvature/overlay file to project (e.g., `lh.curv`, `lh.thickness`). |
| `-l <label>` | Integer label value; only voxels in the mask with this label value are projected (default: 1). |
| `-r <radius>` | Search radius for nearest-neighbour lookup (default: 1.1 mm). |

## Outputs

| Flag | Description |
|------|-------------|
| `-o <outputOverlayImage>` | Output volume with curvature values projected onto the voxel grid. |
| `-d <outputDistanceImage>` | Output volume containing the distance from each voxel to the nearest surface vertex. |

## Mathematical Foundations

For each voxel at index $(i,j,k)$ in the reference volume:
1. Convert voxel index to surface RAS coordinates using `MRIvoxelToSurfaceRAS`.
2. Query the VTK KD-tree to find the index $v^*$ of the nearest surface vertex.
3. Assign the overlay value $c(v^*)$ to the output voxel.

$$\text{output}(i,j,k) = c\!\left(\arg\min_{v} \|p_{ijk} - p_v\|_2\right)$$

where $p_{ijk}$ is the surface-RAS coordinate of voxel $(i,j,k)$ and $p_v$ are the surface vertex positions.

The distance image stores $\|p_{ijk} - p_{v^*}\|_2$ for each voxel, providing a measure of how far each voxel is from the nearest surface point.

## Configuration Options

| Flag | Type | Description |
|------|------|-------------|
| `-s <surface>` | Required | Input surface file. |
| `-m <mask>` | Required | Reference mask/volume defining output geometry. |
| `-o <output>` | Required | Output overlay image (volume). |
| `-d <distanceImage>` | Optional | Output distance image (volume). |
| `-c <overlay>` | Optional | Surface curvature/overlay file to project. |
| `-l <label>` | Optional | Label value in mask to restrict projection (default: 1). |
| `-r <radius>` | Optional | KD-tree search radius in mm (default: 1.1). |
| `-inv` | Optional | Enable inverse mode (behaviour details below). |

## Configuration Interactions

- `-c` must be provided to produce a meaningful overlay output in forward mode. Without it, the output volume will contain zero values.
- `-inv` completely changes the operation: instead of projecting surface values to voxels, it reads each voxel in the mask (with label `-l`), converts the voxel **index** (not RAS coordinates) to a surface vertex index via `MRISsurfaceRASToVoxel`, and gathers all vertices within radius `-r` of that index. The mean of those vertex overlay values is written back to the **input overlay file** (not to `-o`). The `-d` distance image output has no effect in `-inv` mode.
- `-l` restricts which voxels are processed. Only voxels where the mask equals `<label>` are assigned values; other voxels remain at zero.
- In forward mode, the `-d` distance image stores the Euclidean distance (in mm, surface RAS) from each voxel centroid to its nearest surface vertex. Voxels beyond radius `-r` from any vertex receive a distance of zero (not infinity).

## Typical Use Cases

### Project cortical thickness to volume space

```bash
mris_curvature2image \
  -s lh.white \
  -m ribbon.mgz \
  -c lh.thickness \
  -o lh.thickness.volume.mgz \
  -l 2
```

### Project mean curvature with distance map

```bash
mris_curvature2image \
  -s lh.white \
  -m brain.mgz \
  -c lh.curv \
  -o lh.curv.volume.mgz \
  -d lh.curv.distance.mgz
```

## Pipeline Context

`mris_curvature2image` is not part of the standard `recon-all` pipeline. It is a utility tool for post-processing and inter-modality analysis. It belongs to the `resurf` package which provides utilities for high-resolution surface reconstruction workflows.

## Gotchas and Caveats

> [!gotcha] Surface RAS coordinate system
> The tool uses `MRIvoxelToSurfaceRAS` (tkRAS/surface RAS) for coordinate matching, not scanner RAS. The input mask and the surface must be registered to the same FreeSurfer subject coordinate system. Using a mask from a different subject or from a scanner-space volume without proper header geometry will produce incorrect projections.

> [!gotcha] KD-tree nearest-neighbour assigns nearest vertex, not interpolated value
> The output is a nearest-neighbour projection. There is no interpolation between vertices. For surfaces with coarse triangulations or at high-resolution voxel grids, this can produce stepped artefacts. The `-r` parameter controls the search radius; voxels farther than this from any vertex may receive zero values.

> [!gotcha] ITK/VTK dependency
> This tool is built with ITK and VTK frameworks. It may not be available in all FreeSurfer build configurations.

## Related Tools

- [[mris_curvature]] — computes the curvature overlay projected by this tool
- [[mris_extract_values]] — extracts per-vertex overlay values from surfaces (companion tool in resurf)
- [[surface-format]] — FreeSurfer surface and curvature overlay formats
- [[mgz]] — MGZ volume format

## Confidence and Gaps

Confidence is **high**. The complete source (`resurf/mris_curvature2image.cxx`, ~149 lines) was read. The forward mapping, inverse mapping, distance image semantics, and all flags were confirmed from source.

> [!gotcha] `-inv` writes to the overlay file, not to `-o`
> In inverse mode, the result is written back to the input overlay file specified by `-c`, overwriting it. The output path `-o` is ignored in `-inv` mode.
