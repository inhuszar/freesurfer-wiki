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
last_agent_update: 2026-04-22
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

`mris_multimodal` is a surface mesh utility that operates on FreeSurfer surfaces using ITK/VTK infrastructure. It can fill holes in surface meshes, compute per-vertex distances between two surfaces (`--thickness` mode), compute surface curvature (`--curvature` mode), and write output in VTK or FreeSurfer binary format. The tool uses `GetPot` for argument parsing and ITK/VTK for mesh operations.

## Source Information

- **Language:** C++ (ITK/VTK-based)
- **Source files:** `resurf/mris_multimodal.cxx`, `resurf/Code/mris_multimodal_refinement.h`
- **Dependencies:** ITK mesh framework, VTK polydata, `GetPot` argument parsing, FreeSurfer `mrisurf`

## Purpose and Context

`mris_multimodal` provides ITK/VTK-based mesh processing operations on FreeSurfer surfaces: hole-filling, surface-to-surface distance computation, and curvature estimation. It is located in `resurf/`, FreeSurfer's surface reconstruction research subdirectory. The tool name reflects earlier intentions to support multimodal refinement, but the actual argument-parsing code in `mris_multimodal.cxx` implements general mesh analysis operations.

> [!gap] The `mris_multimodal_refinement.h` header is listed as a source file in the wiki frontmatter but the GetPot parsing in `mris_multimodal.cxx` does not expose T1/T2/FLAIR flags. The multimodal refinement engine parameters may be compile-time constants or accessible only through the header's interface, not command-line flags. Needs further investigation.

## Inputs

- `-i surface` — input surface (FreeSurfer binary format)
- `-t surface` — target surface for distance computation (required by `--thickness` mode)
- `-a file` — annotation output filename
- `-v file` — overlay output filename
- `-c file` — CSV output filename

## Outputs

- `-o surface` — output surface (FreeSurfer binary or VTK format, depending on `-vtk` flag)
- Per-vertex curvature file (via `-v`, written by `MRISwriteCurvature`, when `--thickness` or `--curvature` is used)
- CSV file (via `-c`, one row per vertex, when `--thickness` or `--curvature` is used)

## Mathematical Foundations

**Thickness mode** (`--thickness`): For each vertex $i$ in the input surface, the nearest vertex $j$ in the target surface is found using a KD-tree. The per-vertex distance is:

$$
d_i = \sqrt{\|v_i - t_j\|^2}
$$

where $v_i$ is the input surface vertex and $t_j$ is the nearest target vertex. This squared Euclidean distance is stored in the surface curvature field and written to the overlay and CSV outputs.

**Curvature mode** (`--curvature`): For VTK ≤5, Gaussian curvature is estimated via `vtkCurvatures`. For VTK >5, PCA-based curvature is computed via `vtkPCACurvatureEstimation`. The per-vertex value stored is:

$$
\kappa_i = \frac{\lambda_1}{\lambda_0 + \lambda_1 + \lambda_2}
$$

where $\lambda_0, \lambda_1, \lambda_2$ are PCA eigenvalues from the local neighbourhood.

## Configuration Options

Flags are parsed by the `GetPot` library (case-sensitive, exact spelling required).

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-i` | `<surface>` | required | Input surface file (FreeSurfer binary format). |
| `-t` | `<surface>` | required | Target surface file to compare or align with. |
| `-o` | `<surface>` | required | Output surface file. |
| `-a` | `<file>` | `""` | Annotation output filename. |
| `-v` | `<file>` | `""` | Overlay output filename (written by `MRISwriteCurvature`). |
| `-c` | `<file>` | `""` | CSV output filename for per-vertex data. |
| `-vtk` | — | off | Write output in VTK polydata format instead of FreeSurfer binary. |
| `--fillHoles` | — | off | Fill holes in the input surface mesh using VTK Delaunay/fill pipeline before processing. |
| `--smooth` | — | off | Apply VTK smoothing filter (stub; filter body is commented out in source). |
| `--thickness` | — | off | Compute per-vertex distance between input and target surfaces and write curvature and CSV outputs. |
| `--curvature` | — | off | Compute surface curvature (Gaussian for VTK ≤5, PCA-based for VTK >5) and write overlay and CSV outputs. |

## Configuration Interactions

- `--thickness` and `--curvature` are independent flags; both can be active simultaneously and will write to the same `-v` overlay and `-c` CSV paths (the second will overwrite the first).
- `-vtk` changes the output format: if set, the output is written via ITK's `VTKPolyDataWriter`; otherwise, `MRISwrite()` is used for FreeSurfer binary format.
- `--fillHoles` is applied to the input surface before any thickness or curvature computation.

## Typical Use Cases

```bash
# Compute per-vertex distance between two surfaces (thickness proxy)
mris_multimodal \
  -i lh.pial -t lh.white \
  -v lh.pial_white_dist -c pial_white_dist.csv \
  -o lh.pial.out \
  --thickness

# Compute surface curvature
mris_multimodal \
  -i lh.pial \
  -v lh.pial.curv -c pial_curvature.csv \
  -o lh.pial.out \
  --curvature

# Fill holes and write VTK output
mris_multimodal \
  -i lh.pial -t lh.white \
  -o lh.pial.vtk \
  --fillHoles -vtk
```

## Pipeline Context

Not part of standard `recon-all`. Used in research workflows for surface mesh analysis. For T2/FLAIR-assisted pial surface placement in current FreeSurfer (7+), see [[mris_place_surface]] with `--mmvol`.

## Gotchas and Caveats

> [!gotcha] ITK/VTK dependency
> This tool is compiled with ITK and VTK. If FreeSurfer was built without these optional dependencies, the binary may not be available.

> [!gotcha] `--smooth` is a stub
> The `--smooth` code block is present in source but the smoothing filter body is commented out; it has no effect.

> [!gotcha] Simultaneous `--thickness` and `--curvature`
> Both modes write to the same `-v` overlay and `-c` CSV paths. If both flags are given, the curvature pass overwrites the thickness pass output. Use separate output paths if both are needed.

## Related Tools

- [[mris_multimodal_surface_placement]] — surface placement specifically for multimodal data
- [[mris_place_surface]] — modern surface placement with `--mmvol` T2/FLAIR support
- [[mris_ms_refine]] — multi-spectral (FLASH) surface refinement

## Confidence and Gaps

**Confident (from code in `mris_multimodal.cxx`):** All GetPot flags confirmed directly from source; ITK/VTK operations; `--smooth` stub status.

**Uncertain:** Whether flags from `mris_multimodal_refinement.h` (T1/T2/FLAIR, step size, gradient sigma, etc.) are accessible via a separate binary or entry point not captured in `mris_multimodal.cxx`.

> [!gap] The previous wiki version documented T1/T2/FLAIR and refinement flags that do not appear in the GetPot parsing code of `mris_multimodal.cxx`. These may belong to a different entry point or a different binary that also uses `mris_multimodal_refinement.h`. Investigation of the full `resurf/` build system is needed to clarify.
