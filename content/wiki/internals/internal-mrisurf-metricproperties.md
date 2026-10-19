---
title: "internal-mrisurf-metricproperties"
type: internal
fs_version: "8.2.0"
source_files:
  - "utils/mrisurf_metricProperties.cpp"
related:
  - "[[surface-representations]]"
  - "[[surface-format]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
status: draft
confidence: medium
last_agent_update: 2026-06-11
gaps:
  - "This module is very large (>13,000 lines); this page summarises its responsibilities and the functions implicated in known bugs rather than enumerating every routine."
tags:
  - internal
  - surface
  - geometry
---

# internal-mrisurf-metricproperties

## Summary

`utils/mrisurf_metricProperties.cpp` is the part of the `mrisurf` surface
library that computes the **metric (geometric) properties** of a triangular
surface mesh (`MRIS`): per-vertex and per-face areas, surface normals,
principal curvatures and the derived curvature measures, edge lengths, the
distances between neighbouring vertices, and the running totals (total surface
area, etc.) cached on the `MRIS` structure. These quantities are recomputed
whenever a surface is deformed, so this file is on the hot path of every
surface stage — inflation, spherical mapping, white/pial placement, and
morphometry.

## Responsibilities

- **Areas** — vertex area (one-third of incident triangle areas), face area,
  and the original-vs-current area ratios used by inflation/registration
  energy terms.
- **Normals** — vertex and face normal vectors, used for intensity-gradient
  searches during surface placement and for orientation tests.
- **Curvature** — second-fundamental-form estimation yielding principal
  curvatures `k1`, `k2`, mean curvature `H`, Gaussian curvature `K`, and the
  `?h.curv` / `?h.curv.pial` overlays.
- **Metric bookkeeping** — neighbour distances, edge lengths, and the cached
  scalar totals on `MRIS` that downstream energy functionals read.

## Consumers

These properties are consumed by [[mris_inflate]], [[mris_sphere]],
[[mris_register]], the white/pial placement code (`mris_place_surface`), and
the morphometry tools. See [[surface-representations]] for how the derived
surfaces and overlays fit together.

> [!gotcha] A frequently-implicated module
> Because metric recomputation runs in tight loops over every vertex and is
> shared across many tools, subtle defects here have broad reach and have been
> the subject of multiple bug reports (e.g. [[00002]], [[00012]], [[00024]],
> [[00056]], [[00064]]). When auditing a surface-geometry anomaly, this file is
> the usual first stop.

## Related

- [[surface-representations]] — what the surfaces and overlays mean.
- [[surface-format]] — on-disk surface and curvature storage.
- [[internal-gcamorph]] — the volumetric warp counterpart in `mrisurf`'s sister
  libraries.
