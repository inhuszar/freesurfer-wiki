---
title: "mris_multimodal_surface_placement"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_multimodal_surface_placement.cxx"
  - "resurf/Code/mris_multimodal_refinement.h"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_multimodal]]"
  - "[[mris_place_surface]]"
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Distinction between this tool and mris_multimodal is unclear from source alone — appears functionally identical in terms of CLI"
tags:
  - surface
  - multimodal
  - T2
  - FLAIR
  - placement
---

# mris_multimodal_surface_placement

## Summary

`mris_multimodal_surface_placement` places cortical surfaces using one or more MRI modalities (T1, T2, FLAIR) as inputs, using the `MRIS_MultimodalRefinement` engine. Unlike [[mris_multimodal]], this tool reads tractography/streamline data (TrackVis `.trk` / VTK polyline format) as well as intensity volumes, suggesting it also uses white-matter connectivity information to guide placement. It is a research tool in the `resurf/` subdirectory.

## Source Information

- **Language:** C++ (ITK/VTK-based, TrackVis streamline support)
- **Source file:** `resurf/mris_multimodal_surface_placement.cxx`
- **Dependencies:** ITK, VTK, `TrkVTKPolyDataFilter`, `PolylineMeshToVTKPolyDataFilter`, `GetPot`

## Purpose and Context

`mris_multimodal_surface_placement` extends the multimodal surface refinement approach by additionally incorporating diffusion tractography streamlines. Streamline endpoints near the cortical surface can constrain vertex placement in regions where intensity contrast alone is insufficient (e.g., near sulcal fundi or in the presence of white-matter pathology).

## Inputs

- `-i surface` — input surface (FreeSurfer binary format)
- `-b spheresurf` — spherical parameterisation
- `-w whitesurface` — white surface reference
- `-t1 image` — T1-weighted volume
- `-t2 image` — T2-weighted volume (optional)
- `-flair image` — FLAIR volume (optional)
- `-a aseg.aparc` — segmentation file
- (implicit) TrackVis `.trk` or VTK polyline files (streamlines)

## Outputs

- `-o surface` — output refined surface
- `-n normals.vtk` — surface normals (VTK, optional)
- `-v values.vtk` — intensity values (VTK, optional)

## Mathematical Foundations

Same gradient-based normal search as [[mris_multimodal]]:

$$v_i^{t+1} = v_i^t + s \cdot \hat{n}_i$$

The streamline component constrains placement by providing additional boundary evidence at the WM/GM interface from tractography endpoint density maps.

## Configuration Options

Flags are parsed by the `GetPot` library. The complete flag set parsed from source is identical to [[mris_multimodal]]:

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i` | `surface` | required | Input surface file (FreeSurfer binary format). |
| `-b` | `spheresurf` | required | Spherical parameterisation (used by `MRIStoParameterization`). |
| `-w` | `whitesurface` | required | White surface reference. |
| `-o` | `surface` | required | Output refined surface file. |
| `-n` | `normals.vtk` | `""` | Output VTK polydata file of surface normals as line segments. |
| `-v` | `values.vtk` | `""` | Output VTK polydata file of intensity value profiles along normals. |
| `-p` | `overlay` | `""` | Output CSF/probability overlay (written by `MRISwriteCurvature`). |
| `-d` | `int` | `-1` | Vertex number for per-vertex debug output. |
| `-s` | `float` | `0.4` | Step size in mm along the surface normal. |
| `-k` | `int` | `20` | Number of search steps along the normal. |
| `-g` | `float` | `0.20` | Gaussian smoothing sigma for intensity profiles. |
| `-a` | `aseg.aparc` | `""` | Segmentation volume passed to `SetSegmentation()`. |
| `-t1` | `image` | — | T1-weighted MRI volume (required as the base image). |
| `-t2` | `image` | — | T2-weighted MRI volume (optional). |
| `-flair` | `image` | — | FLAIR MRI volume (optional; sets modality index to 2). |
| `-min` | (flag) | off | Search for minimum gradient instead of maximum. |

## Configuration Interactions

- At least one of `-t1`, `-t2`, `-flair` must be provided; `-t1` and at least a second image are required (the code accesses `images[1]` unconditionally in `SegmentVessel` and `SegmentWM`).

> [!gotcha] TrackVis headers included but not exposed via CLI
> Despite including `TrkVTKPolyDataFilter.txx` and `PolylineMeshToVTKPolyDataFilter.h`, the source code contains no command-line flags for loading streamlines. The streamline I/O code is present as a dependency but the CLI is functionally identical to [[mris_multimodal]]. The distinction between the two tools may be vestigial or the streamline integration was never completed.

## Typical Use Cases

```bash
# Place pial surface using T2 and tractography (speculative command)
mris_multimodal_surface_placement \
  -i lh.pial -b lh.sphere -w lh.white \
  -t2 ../mri/T2.mgz \
  -a ../mri/aseg.mgz \
  -o lh.pial.mm_placement
```

## Pipeline Context

Not part of standard `recon-all`. Research tool for situations where both multimodal MRI and diffusion tractography are available and standard surface placement is insufficient. For standard T2/FLAIR support, use [[mris_place_surface]] with `--mmvol`.

## Gotchas and Caveats

> [!gotcha] TrackVis dependency
> The tool requires ITK's polyline mesh support and TrkVTK filters. If streamlines are required, TrackVis-compatible `.trk` format is needed.

> [!gotcha] Research tool
> Located in `resurf/`, not in the main FreeSurfer source tree. API and behaviour may change between versions.

## Related Tools

- [[mris_multimodal]] — similar but without tractography input
- [[mris_place_surface]] — production surface placement with `--mmvol` T2/FLAIR
- [[mris_ms_refine]] — FLASH-based multi-spectral refinement

## Confidence and Gaps

**Confident (from code):** ITK/VTK basis; T1/T2/FLAIR inputs; MRIS_MultimodalRefinement engine; step size / sigma parameters; VTK polyline (streamline) dependency.

**Uncertain:** How streamlines are provided on the command line; exact combination strategy for intensity + tractography.

> [!gap] Streamline input mechanism not confirmed from source inspection.
