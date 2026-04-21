---
title: "mris_jacobian"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_jacobian/mris_jacobian.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Output file format (curv vs. MGH) not confirmed"
tags:
  - surface
  - jacobian
  - morphometry
  - registration
---

# mris_jacobian

## Summary

`mris_jacobian` computes the Jacobian of a surface mapping — the ratio of face areas between a mapped (deformed) surface and an original surface. For each face, it computes the ratio of current area to original area, and this ratio is assigned to each vertex as an area-weighted average. The result is a per-vertex overlay representing local areal expansion or contraction of the surface mapping. This is the fundamental morphometric measure of surface registration quality and areal distortion.

## Source Information

- **Language:** C++
- **Source file:** `mris_jacobian/mris_jacobian.cpp`
- **Original author:** Bruce Fischl
- **Test data:** `mris_jacobian/testdata.tar.gz`

## Purpose and Context

The Jacobian of a surface mapping quantifies how much each local area element has been stretched or compressed by the mapping. For a surface registration (e.g., `mris_register` mapping to fsaverage):

$$
J(v) = \frac{A_{\text{mapped}}(v)}{A_{\text{original}}(v)}
$$

Values > 1 indicate local areal expansion; values < 1 indicate contraction.

Key uses:
- Voxel-based morphometry (VBM) on the surface: detect group differences in areal expansion
- Registration quality assessment
- Cortical folding analysis via area ratio maps
- Input to surface-based morphometry statistics

The tool is typically applied to sphere-to-sphere registration maps (from `mris_register`), where the "original" is a template sphere and the "mapped" is the individual's sphere. The Jacobian then reflects how the individual's cortical area is distributed relative to the atlas.

## Inputs

| Positional | Description |
|------------|-------------|
| `argv[1]` orig_surf | Original surface (provides area metric properties via `MRISstoreMetricProperties`) |
| `argv[2]` mapped_surf | Mapped surface name — loaded as new vertex positions on the same mesh |
| `argv[3]` out_fname | Output file for Jacobian values |

The tool reads the original surface, stores its metric properties, then reads the mapped surface as a new set of vertex positions for the same topology.

## Outputs

| Output | Description |
|--------|-------------|
| Jacobian overlay | Per-vertex area ratio; written to `out_fname` using `MRISwriteCurvature` |

## Mathematical Foundations

For each face $k$ with vertices $i, j, l$:

Original face area: $A_k^{\text{orig}}$ (computed via cross-product of edge vectors)

Mapped face area: $A_k^{\text{mapped}}$ (recomputed after loading mapped vertex positions)

Face area ratio: $r_k = A_k^{\text{mapped}} / A_k^{\text{orig}}$

Vertex Jacobian (area-weighted average over incident faces):

$$
J(v) = \frac{\sum_{k \ni v} A_k^{\text{mapped}} \cdot r_k}{\sum_{k \ni v} A_k^{\text{mapped}}}
$$

The `compute_area_ratios` function implements this computation in `mris_jacobian.cpp`. After calling `MRISreadVertexPositions` to load mapped positions, `MRIScomputeMetricProperties` is called to recompute areas.

**Optional transformations:**
- Log Jacobian: $J_{\log}(v) = \log(J(v))$ (activated with `-log`)
- Inverse Jacobian: $J_{\text{inv}}(v) = 1/J(v)$ (activated with `-invert`)
- No-scale mode: raw area ratio without normalization (activated with `-noscale`)

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-log` | — | off | Compute log of area ratios (log Jacobian) |
| `-invert` | — | off | Compute inverse of area ratios (1/J) |
| `-noscale` | — | off | Do not normalize area ratios |

Positional arguments:
1. Original surface
2. Mapped surface name (vertex positions only)
3. Output filename

## Configuration Interactions

- `-log` and `-invert` can be combined: the inverse is computed first, then the log.
- `-noscale` disables whatever area normalization is applied by default in `compute_area_ratios`; without this flag, ratios are typically normalized.
- The tool writes via `MRISwriteCurvature`, so the output file format depends on the extension of `out_fname`.

## Typical Use Cases

**Compute Jacobian of a spherical registration:**
```bash
mris_jacobian lh.sphere lh.sphere.reg lh.jacobian.mgz
```

**Compute log Jacobian:**
```bash
mris_jacobian -log lh.sphere lh.sphere.reg lh.log_jacobian.mgz
```

**Compute inverse Jacobian (contraction rather than expansion):**
```bash
mris_jacobian -invert lh.sphere lh.sphere.reg lh.inv_jacobian.mgz
```

## Pipeline Context

Not part of standard `recon-all` (though some advanced scripts may compute it). Used in group-level morphometric analyses:

1. [[recon-all]] produces `lh.sphere.reg`
2. `mris_jacobian lh.sphere lh.sphere.reg lh.jacobian.mgz`
3. Jacobian is resampled to fsaverage space and used in group GLMs

Related pipeline tools: [[mris_register]], [[mris_sphere]].

## Gotchas and Caveats

> [!gotcha] Second argument is a surface NAME, not a path
> `argv[2]` is the name of the surface to read, not a full path. The tool uses `MRISreadVertexPositions(mris, mapped_surf)` which reads the surface from the same directory as the original surface. To use a surface from a different path, you must pre-copy it.

> [!gotcha] Output uses MRISwriteCurvature
> The output is written using `MRISwriteCurvature`, which uses the binary curvature format by default. To get MGH/MGZ format, use a `.mgz` extension.

## Related Tools

- [[mris_register]] — produces the sphere.reg used as input
- [[mris_sphere]] — produces the sphere used as original surface
- [[surface-format]] — surface format reference
- [[curv-format]] — curvature/overlay file format

## Confidence and Gaps

**Confident (from source):**
- All three processing modes (standard, log, inverse)
- Positional argument order
- Output format (via MRISwriteCurvature)
- Area ratio computation logic
