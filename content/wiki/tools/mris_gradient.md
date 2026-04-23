---
title: "mris_gradient"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_thickness/mris_gradient.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[curv-format]]"
  - "[[mris_calc]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact output format (curv vs. MGH) not confirmed"
  - "Whether gradient magnitude or full vector is stored in output is unclear from source"
tags:
  - surface
  - gradient
  - overlay
---

# mris_gradient

## Summary

`mris_gradient` computes the spatial gradient of a surface-based scalar field (overlay) on a triangulated cortical mesh. The gradient at each vertex is estimated using a least-squares fit to the local neighborhood, modeling the field as a first-order Taylor expansion around each vertex. The result is collapsed to a scalar field using the Frobenius norm of the gradient vector, yielding a per-vertex gradient magnitude map. This is useful for detecting rapid transitions in cortical properties such as thickness, curvature, or functional activation.

## Source Information

- **Language:** C++
- **Source file:** `mris_thickness/mris_gradient.cpp` (co-located with thickness tools)
- **Original author:** Bruce Fischl

## Purpose and Context

The gradient of a surface scalar field quantifies the rate of change of that field across the cortical surface. High gradient magnitude indicates a sharp transition between cortical regions or features (e.g., the boundary between a thin sulcal wall and a thick gyral crown). The tool is used for:
- Detecting parcellation boundaries based on myelin maps or cortical thickness
- Computing spatial derivatives of functional activation maps
- Measuring smoothness or abruptness of cortical features

## Inputs

| Input | Description |
|-------|-------------|
| `argv[1]` surface | FreeSurfer binary surface file (positional arg 1) |
| `argv[2]` overlay | MRI volume (Nx1x1xF) or surface overlay readable by `MRIread` (positional arg 2) |
| `argv[3]` output | Output filename (positional arg 3) |

The surface and overlay must have compatible vertex counts. The overlay is read using `MRIread`, so any format supported by `mri_convert` is accepted.

## Outputs

| Output | Description |
|--------|-------------|
| Gradient magnitude | Per-vertex Frobenius norm of the local gradient vector; written to `argv[3]` |

## Mathematical Foundations

The gradient at each vertex $v$ is estimated via least-squares using a Taylor expansion over the vertex neighborhood $\mathcal{N}(v)$:

For each neighbor $u \in \mathcal{N}(v)$:
$$
f(u) \approx f(v) + \Delta x_{vu} \cdot \partial_x f + \Delta y_{vu} \cdot \partial_y f
$$

where $(\Delta x_{vu}, \Delta y_{vu})$ are the components of the displacement vector from $v$ to $u$ projected onto the local tangent plane.

The least-squares solution gives the local gradient vector $\nabla f(v) = (\partial_x f, \partial_y f)$ in the tangent plane.

The Frobenius norm (scalar collapse) is then:
$$
|\nabla f(v)| = \sqrt{(\partial_x f)^2 + (\partial_y f)^2}
$$

The default norm type is `FROBENIUS_NORM` (value 0), defined as a compile-time constant.

Neighborhood size is controlled by `-n` (default: 3), which sets the number of hops for neighbor lookup via `MRISresetNeighborhoodSize`.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-n <N>` | integer | 3 | Neighborhood size (hops) for gradient estimation (`case 'N':`) |
| `-mask_label <file>` | path | — | Use this label as a mask; vertices outside are set to 0 (`!stricmp(option, "mask_label")`) |
| `-dilate <N>` / `-label_dilate` / `-dilate_label` | integer | 0 | Dilate label N times before masking |
| `-erode <N>` / `-label_erode` / `-erode_label` | integer | 0 | Erode label N times before masking |

Positional arguments:
1. Surface file
2. Input overlay (MRI-readable)
3. Output file

## Configuration Interactions

- `-dilate` (alias: `-label_dilate`, `-dilate_label`) and `-erode` (alias: `-label_erode`, `-erode_label`) are applied after the label is loaded, in that order (dilate first, then erode).
- When a `-mask_label` is used, vertices outside the label have their gradient magnitude set to 0.
- Larger `-n` (neighborhood size) produces a smoother gradient estimate but may blur true boundaries.

## Typical Use Cases

**Compute gradient of cortical thickness map:**
```bash
mris_gradient lh.white lh.thickness lh.thickness_gradient.mgz
```

**Compute gradient within a label region:**
```bash
mris_gradient -mask_label lh.V1.label lh.white lh.thickness lh.V1_thickness_gradient.mgz
```

## Pipeline Context

`mris_gradient` is not part of `recon-all`. It is a post-processing analysis tool typically run after cortical property maps have been computed.

## Gotchas and Caveats

> [!gotcha] Frobenius norm only
> The output is always the Frobenius norm (magnitude) of the gradient vector, not the full gradient vector. The `FROBENIUS_NORM` constant is hardcoded to 0 and there is no command-line option to select a different norm or to output the full gradient.

> [!gotcha] Source file location
> Despite being a surface gradient tool, the source file is in `mris_thickness/` alongside the cortical thickness tools. This co-location is a historical artifact and does not affect functionality.

## Related Tools

- [[mris_calc]] — arithmetic operations on surface overlays
- [[surface-format]] — surface file format
- [[curv-format]] — curvature/overlay file format

## Confidence and Gaps

**Confident (from source):**
- Frobenius norm output type (hardcoded)
- Neighborhood-based Taylor expansion approach
- Label masking options and their order of application

> [!gap] Output format
> The output format is written using `MRIwrite` but the exact format depends on the extension of the output filename. This has not been verified against example outputs.
