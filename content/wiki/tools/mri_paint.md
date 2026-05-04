---
title: "mri_paint"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_paint/mri_paint.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - overlay
  - paint
  - registration
---

# mri_paint

## Summary

`mri_paint` samples a volumetric MRI image onto the vertices of a surface file, producing a surface overlay (curvature-format file). It reads an LTA transform (or identity), applies the inverse transform to map volume intensities to surface vertex positions, and writes the result as a surface overlay. The output is equivalent to "painting" volume values onto the surface.

## Source Information

- **Language:** C++
- **Source file:** `mri_paint/mri_paint.cpp`
- **Key functions:** `MRISpaintVolume()`, `MRIScopyValuesToCurvature()`, `MRISwriteCurvature()`

## Purpose and Context

`mri_paint` is a lower-level alternative to [[mri_vol2surf]] for sampling a volume onto a surface. It uses the `MRISpaintVolume` function, which walks over the surface vertices and samples the volume at each vertex position after applying the inverse of the provided LTA. The output is written in FreeSurfer curvature format (a per-vertex scalar overlay). 

A typical use case is projecting an intensity volume (e.g., a statistical map or a functional overlay) onto a white or pial surface using a registration transform. An optional thickness file can be read and used to weight or sample the projection along the surface normal.

## Inputs

| Input | Type | Description |
|-------|------|-------------|
| `<input_volume>` | MRI volume | Source volume whose values will be projected |
| `<input_surface>` | Surface file | Target surface file (e.g., `lh.white`) |
| `<transform>` | LTA file or `"identity"` / `"I"` | Registration from volume to surface space; `identity` or `I` uses no transform |
| `<output>` | Curvature-format file | Per-vertex overlay output |

## Outputs

- **Curvature overlay file:** Per-vertex scalar values in FreeSurfer binary curvature format, suitable for visualization in `freeview` or `tksurfer`

## Mathematical Foundations

For each vertex $v_i$ on the surface with RAS coordinates $\mathbf{p}_i$:

1. The inverse of the LTA matrix $M^{-1}$ maps the vertex position from surface space to volume space:

$$
\mathbf{q}_i = M^{-1} \mathbf{p}_i
$$

2. The volume is sampled at $\mathbf{q}_i$ using trilinear interpolation (via `MRISpaintVolume`).

3. The sampled value is assigned to the vertex: $\text{overlay}(v_i) = I(\mathbf{q}_i)$

The LTA matrix inversion is performed explicitly in `main()`:
```cpp
m = MatrixInverse(lta->xforms[0].m_L, NULL);
lta->xforms[0].m_L = m;
```

This means the user should supply the transform **from surface to volume space** (not the inverse), because the code inverts it before use.

> [!gotcha] Transform direction convention
> The code inverts the LTA before calling `MRISpaintVolume`. This means the LTA supplied by the user should map **from the volume space to the surface space** (the typical registration direction), and the tool internally inverts it to sample the volume.

## Configuration Options

Flag list fully verified from `get_option()` in source.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-imageoffset` | `<int>` | `0` | Integer offset applied to image frame/index selection when reading the volume. |
| `-T` | `<fname>` | — | Thickness file; read and assigned to `mris->curv` before painting (legacy feature; painting overwrites curv with volume samples). |
| `-S` or `-C` | (none) | off | Use spherical coordinates (`SPHERICAL_COORDS`) instead of the default Talairach coordinates for the painting operation. Both `-S` and `-C` enable the same mode. |
| `-V` | `<int>` | — | Set `Gdiag_no` for verbose diagnostics at a specific label number. |
| `--help`<br>`--version` | (none) | — | Print help or version string and exit. |

## Configuration Interactions

- `-T <fname>` (thickness) loads a curvature file and assigns it to the surface, but the subsequent painting step overwrites the curvature values with sampled volume data. This flag appears to be a legacy parameter that has no net effect on the final output.
- `-S` and `-C` are synonymous; both switch the coordinate system to `SPHERICAL_COORDS`. Without this flag, the default is `TALAIRACH_COORDS`.
- If the `<transform>` positional argument is `"identity"` or `"I"`, a zero-initialized LTA with a 4×4 identity matrix is created and no spatial transform is applied.

## Typical Use Cases

```bash
# Paint a statistical map onto lh.white using a registration
mri_paint stat_map.mgz lh.white register.lta lh.stat_map

# Paint with identity transform (volume and surface in same space)
mri_paint overlay.mgz lh.white identity lh.overlay
```

## Pipeline Context

`mri_paint` is not a standard step in the main [[wiki/pipelines/recon-all|recon-all]] stream. It is used in surface-based analysis pipelines where a volumetric overlay needs to be projected to a subject's surface for visualization or analysis. The modern replacement for most workflows is [[mri_vol2surf]], which provides more options and better documentation.

## Gotchas and Caveats

> [!gotcha] Transform inversion is automatic
> Unlike many FreeSurfer tools, `mri_paint` inverts the provided LTA before use. Supplying an already-inverted transform will produce incorrect results.

> [!gotcha] Legacy tool
> `mri_paint` is an older tool; for most surface projection tasks [[mri_vol2surf]] is preferred as it supports more interpolation methods, hemisphere selection, and projection depth options.

## Related Tools

- [[mri_vol2surf]] — Modern volume-to-surface projection (preferred)
- [[coordinate-systems]] — Coordinate system documentation
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**High confidence:** Source language, input/output format, transform inversion behaviour (directly read from code), all flag semantics verified from `get_option()`.

> [!gotcha] Thickness flag is a no-op
> `-T <fname>` loads a thickness file into `mris->curv`, but the painting step immediately overwrites `mris->curv` with volume samples. The flag has no effect on the output. It is a legacy artifact.
