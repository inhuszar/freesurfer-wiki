---
title: "dmri_coloredFA"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/dmri_coloredFA.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_ac.sh]]"
  - "[[dmri_pathstats]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Output format not confirmed from source (VTK polydata vs TRK)"
  - "Color mapping function (FA value to RGB) not fully traced"
tags:
  - diffusion
  - visualization
  - fa
  - streamlines
  - coloring
---

# dmri_coloredFA

## Summary

`dmri_coloredFA` assigns colors to streamlines in `.trk` files based on the fractional anisotropy (FA) values sampled along each streamline from a provided FA image. For each point in each streamline, the FA value at that location is looked up in the FA volume and mapped to an RGB color. The output is a modified version of the input streamline file with per-point color data attached.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/dmri_coloredFA.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_coloredFA`
- **Authors:** Andrew Zhang, Viviana Siless (MGH), 2019
- **Key libraries:** ITK, VTK (`vtkUnsignedCharArray`, `vtkPointData`), FreeSurfer AnatomiCuts utilities

## Purpose and Context

This tool is a visualization utility within the AnatomiCuts pipeline. It decorates tractography streamlines with FA-derived color values to enable color-coded tractography displays. FA-colored fiber displays are a standard way to visualize diffusion anisotropy along tracts in neuroimaging. The resulting colored streamlines can be displayed in TrackVis or similar tools.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Streamline file(s) | `-s` or `-S` | Input tractography file(s) | `.trk` |
| FA image | `-i` | Fractional anisotropy map | NIfTI (3D float) |
| Output directory | `-d` | Directory for output file(s) | path |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Colored streamline files | Input streamlines with per-point RGB color data based on FA values | `.trk` or VTK polydata |

> [!gap] Output format
> The source reads input as `.trk` via `TrkVTKPolyDataFilter` and constructs VTK `vtkUnsignedCharArray` for colors attached to `vtkPolyData`. The exact output format (re-written `.trk` with color scalars or a VTK `.vtk` file) is not confirmed from the top-level source alone.

## Mathematical Foundations

FA is a scalar derived from the diffusion tensor eigenvalues $\lambda_1 \geq \lambda_2 \geq \lambda_3$:

$$\text{FA} = \sqrt{\frac{3}{2}} \cdot \frac{\sqrt{(\lambda_1 - \bar{\lambda})^2 + (\lambda_2 - \bar{\lambda})^2 + (\lambda_3 - \bar{\lambda})^2}}{\sqrt{\lambda_1^2 + \lambda_2^2 + \lambda_3^2}}$$

where $\bar{\lambda} = (\lambda_1 + \lambda_2 + \lambda_3)/3$. FA ranges from 0 (isotropic diffusion) to 1 (fully anisotropic).

The color assignment maps each FA value to an RGB triple. The tool uses VTK's `vtkUnsignedCharArray` attached to point data of the polydata object, storing colors as `(R, G, B)` unsigned char triplets.

> [!gap] Color mapping function
> The specific FA-to-color mapping function (e.g., linear blue-to-red, a custom colormap, or direction-encoded coloring) is not fully traced from the top-level source. The VTK `InsertNextTupleValue` / `InsertNextTypedTuple` calls store the colors, but the color computation itself is in subsequent lines not fully read.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s <file>` or `-S <file>` | file(s) | required | Input streamline file(s); multiple files can be provided consecutively |
| `-i <file>` | file | required | FA image file |
| `-d <dir>` | dir | required | Output directory |

## Configuration Interactions

- Multiple streamline files can be provided after `-s` or `-S` by listing them consecutively; the parser loops until a non-existent file is encountered.
- The tool processes all input streamlines and writes output files to the specified directory.

## Typical Use Cases

```bash
# Color a single cluster's streamlines by FA
dmri_coloredFA \
  -s /data/subject01/dmri.ac/45/cluster_001.trk \
  -i /data/subject01/dmri/DTI/dti_FA.nii.gz \
  -d /data/subject01/dmri.ac/45/colored/

# Color multiple cluster files
dmri_coloredFA \
  -s cluster_001.trk cluster_002.trk cluster_003.trk \
  -i dti_FA.nii.gz \
  -d colored_output/
```

## Pipeline Context

`dmri_coloredFA` is a visualization utility within the AnatomiCuts pipeline. It is not called by `recon-all` or the main `dmri_ac.sh` pipeline functions. It can be run after `dmri_AnatomiCuts` to decorate clusters for visualization.

## Gotchas and Caveats

> [!gotcha] No help documentation
> Running with `-h` or `--help` prints only a one-line usage string: `<binary> -s streamlines -i imageFile -d outputDirectory`. There is no detailed documentation.

> [!gotcha] VTK version compatibility
> The source contains a preprocessor guard for VTK API changes:
> ```cpp
> #ifdef vtkGenericDataArray_h
> #define InsertNextTupleValue InsertNextTypedTuple
> #endif
> ```
> This affects builds with newer VTK versions. The installed binary should handle this transparently, but it indicates the code was originally written for an older VTK API.

## Related Tools

- [[dmri_AnatomiCuts]] — produces the cluster `.trk` files that this tool colorizes
- [[dmri_pathstats]] — extracts FA statistics from streamlines

## Confidence and Gaps

> [!gap] Color encoding details
> The exact colormap used for FA coloring was not traced to its implementation. It may be a linear grayscale, a blue-red gradient, or directional encoding — this requires reading more of the source.

> [!gap] Output file format confirmation
> Whether the tool writes `.trk` files with color scalars or VTK `.vtk` polydata files is not confirmed.
