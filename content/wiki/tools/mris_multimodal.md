---
title: "mris_multimodal"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_multimodal.cxx"
  - "resurf/Code/mris_multimodal_refinement.h"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_multimodal_surface_placement]]"
  - "[[mris_place_surface]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Relationship to mris_multimodal_surface_placement is unclear"
tags:
  - surface
  - multimodal
  - T2
  - FLAIR
  - refinement
---

# mris_multimodal

## Summary

`mris_multimodal` refines cortical surface placement using multiple MRI modalities (T1, T2, FLAIR) simultaneously. It implements a gradient-based deformation approach that searches along surface normals for the optimal tissue boundary, using a MRIS_MultimodalRefinement engine (from `mris_multimodal_refinement.h`). The tool reads a surface, an optional sphere parameterisation, and one or more MRI volumes, then moves each vertex to the location of the strongest intensity gradient consistent with the expected tissue boundary.

## Source Information

- **Language:** C++ (ITK/VTK-based)
- **Source files:** `resurf/mris_multimodal.cxx`, `resurf/Code/mris_multimodal_refinement.h`
- **Dependencies:** ITK mesh framework, VTK polydata, `GetPot` argument parsing, FreeSurfer `mrisurf`

## Purpose and Context

Standard surface placement in FreeSurfer uses only a T1-weighted volume. For subjects with poor T1 contrast at the pial boundary (e.g., due to pathology, low field strength, or unusual anatomy), incorporating T2 or FLAIR can significantly improve pial surface accuracy. `mris_multimodal` provides a research-grade implementation of this idea, predating the integration of T2/FLAIR support into [[mris_place_surface]].

The tool is located in `resurf/`, FreeSurfer's surface reconstruction research subdirectory.

## Inputs

- `-i surface` — input surface (FreeSurfer binary format)
- `-b spheresurf` — spherical parameterisation of the surface
- `-w whitesurface` — white surface (used as reference for pial placement)
- `-t1 image` — T1-weighted volume
- `-t2 image` — T2-weighted volume (optional)
- `-flair image` — FLAIR volume (optional)
- `-a aseg.aparc` — aseg/aparc segmentation volume (used to constrain placement)

## Outputs

- `-o surface` — output refined surface (FreeSurfer binary format)
- `-n normals.vtk` — surface normals (VTK format, optional)
- `-v values.vtk` — intensity profile values (VTK format, optional)
- `-p overlay` — probability/CSF overlay

## Mathematical Foundations

The tool moves each surface vertex along the outward normal direction to find the maximum gradient magnitude:

$$
v_i^{t+1} = v_i^t + s \cdot \hat{n}_i
$$

where $s$ is the step size (default 0.4 mm, set by `-s`) and the optimisation searches over `numberOfSteps` (default 20, set by `-k`) positions. The decision between maximum gradient (`-max`) and minimum gradient (`-min`) is controlled by a flag.

A Gaussian smoothing kernel of sigma `gradientSigma` (default 0.20, set by `-g`) is applied to the intensity profile before gradient estimation to reduce noise sensitivity.

## Configuration Options

Flags are parsed by the `GetPot` library (case-sensitive, exact spelling required).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i` | `surface` | required | Input surface file (FreeSurfer binary format). |
| `-b` | `spheresurf` | required | Spherical parameterisation of the input surface (used by `MRIStoParameterization`). |
| `-w` | `whitesurface` | required | White surface reference used to copy white coordinates to each vertex. |
| `-o` | `surface` | required | Output refined surface file. |
| `-n` | `normals.vtk` | `""` | Output VTK polydata file containing surface normals as line segments. |
| `-v` | `values.vtk` | `""` | Output VTK polydata file containing intensity value profiles along normals. |
| `-p` | `overlay` | `""` | Output CSF/probability overlay file (written by `MRISwriteCurvature`). |
| `-d` | `int` | `-1` | Vertex number to enable per-vertex debug output. |
| `-s` | `float` | `0.4` | Step size in mm along the surface normal for each search step. |
| `-k` | `int` | `20` | Number of search steps along the normal direction. |
| `-g` | `float` | `0.20` | Gaussian smoothing sigma applied to intensity profiles before gradient estimation. |
| `-a` | `aseg.aparc` | `""` | Segmentation volume (aseg or aparc+aseg) passed to `SetSegmentation()`. |
| `-t1` | `image` | — | T1-weighted MRI volume; always required as the first image (used for vessel and WM segmentation). |
| `-t2` | `image` | — | T2-weighted MRI volume (optional; adds second modality). |
| `-flair` | `image` | — | FLAIR MRI volume (optional; sets modality index to 2). |
| `-min` | (flag) | off | Search for the minimum gradient along the normal instead of the maximum (default: maximum). |

## Configuration Interactions

- At least one of `-t1`, `-t2`, or `-flair` must be specified. Multiple modalities are combined internally by the `MRIS_MultimodalRefinement` engine.
- `-min` and `-max` (default) are mutually exclusive — the code sets `maxGradient = !cl.search("-min")`.
- `-b` (sphere) is required for the MRIStoParameterization call; omitting it will cause a crash.

## Typical Use Cases

```bash
# Refine pial surface using T1 and T2
mris_multimodal \
  -i lh.pial -b lh.sphere -w lh.white \
  -t1 ../mri/T1.mgz -t2 ../mri/T2.mgz \
  -a ../mri/aseg.mgz \
  -o lh.pial.multimodal

# FLAIR-only refinement with larger step size
mris_multimodal \
  -i lh.pial -b lh.sphere -w lh.white \
  -flair ../mri/FLAIR.mgz \
  -s 0.6 -k 30 \
  -o lh.pial.flair
```

## Pipeline Context

Not part of standard `recon-all`. Used in research workflows for improved pial surface placement when T2 or FLAIR data are available. The related tool [[mris_multimodal_surface_placement]] is a more specialised variant. For current (FS 7+) standard T2/FLAIR-assisted placement, see [[mris_place_surface]] with `--mmvol`.

## Gotchas and Caveats

> [!gotcha] ITK/VTK dependency
> This tool is compiled with ITK and VTK. If FreeSurfer was built without these optional dependencies, the binary may not be available.

> [!gotcha] Step size and cortical thickness
> The total search range is `step_size * numberOfSteps`. With defaults (0.4 mm × 20 = 8 mm), this far exceeds cortical thickness. In practice, the optimal boundary is found before the end of the search, but tuning these parameters for the specific data is recommended.

> [!gotcha] No rip-vertex support
> Unlike [[mris_place_surface]], this tool does not rip (freeze) specific vertex classes (midline, basal ganglia, WMSA). All vertices are moved.

## Related Tools

- [[mris_multimodal_surface_placement]] — surface placement specifically for multimodal data
- [[mris_place_surface]] — modern surface placement with `--mmvol` T2/FLAIR support
- [[mris_ms_refine]] — multi-spectral (FLASH) surface refinement

## Confidence and Gaps

**Confident (from code):** Gradient-based normal-direction search; T1/T2/FLAIR inputs via `MRIS_MultimodalRefinement`; step size and number of steps; `-min`/`-max` choice.

**Uncertain:** How multiple modalities are combined internally (requires reading `mris_multimodal_refinement.h` in detail); whether this produces output identical to `--mm-refine` in `mris_place_surface`.

> [!gap] The `mris_multimodal_refinement.h` implementation details were not read. The exact combination of T1/T2/FLAIR signals needs investigation.
