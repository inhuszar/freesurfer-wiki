---
title: "mris_distance_map"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_distance_map/mris_distance_map.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_distance_transform]]"
  - "[[mris_distance_to_label]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The output MRI volume format (number of frames, voxel interpretation) is not documented in the source."
tags:
  - surface
  - distance
  - geodesic
---

# mris_distance_map

## Summary

`mris_distance_map` computes the geodesic distance from every vertex on a surface to a single reference vertex and writes the result as an MRI volume. The default reference vertex is vertex 0, but any vertex index can be specified with `-V`. This is a simple but fundamental surface-distance utility using `MRIScomputeDistanceMap()`.

## Source Information

- **Language:** C++
- **Source file:** `mris_distance_map/mris_distance_map.cpp`
- **Author:** Bruce Fischl
- **Key library call:** `MRIScomputeDistanceMap()` (from `mrisurf`)

## Purpose and Context

Geodesic distance maps on cortical surfaces are used in surface-based analysis, connectivity studies, and as inputs to other surface processing algorithms. This tool provides the simplest form: all-to-one geodesic distance from a single seed vertex.

## Inputs

- **Input surface** (positional arg 1): Any FreeSurfer-compatible surface file (e.g., `lh.white`, `lh.sphere`).
- **Reference vertex** (`-V`): Integer vertex index to use as the distance source. Default: 0.

## Outputs

- **Distance volume** (positional arg 2): An MRI volume (any format supported by `MRIwrite()`, typically `.mgz`) containing per-vertex geodesic distances from the reference vertex.

## Mathematical Foundations

Geodesic distance along a triangulated surface mesh is computed as the shortest path between two vertices traversing the mesh edges. For a vertex $v_i$, the distance $d(v_0, v_i)$ is:

$$
d(v_0, v_i) = \min_{\text{path}} \sum_{\text{edges}} \|e_k\|_2
$$

where the minimum is taken over all edge-traversal paths from the reference vertex $v_0$ to $v_i$. The implementation uses `MRIScomputeDistanceMap()`, which internally performs a Dijkstra-like graph traversal on the surface mesh.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-V` | `<int>` | 0 | Reference vertex number (distance source) |
| `--version` | — | — | Print version and exit |
| `--help` / `-H` / `-U` | — | — | Print usage and exit |

## Configuration Interactions

Only `-V` modifies the computation. No other flags interact.

## Typical Use Cases

```bash
# Compute geodesic distances from vertex 0 on lh.white
mris_distance_map lh.white lh.distmap.mgz

# Compute from a specific vertex
mris_distance_map -V 50000 lh.white lh.distmap_v50000.mgz
```

## Pipeline Context

Not called by `recon-all`. Used in research analyses requiring surface-based spatial relationships. See also [[mris_distance_transform]] for label-based distance transforms, and [[mris_distance_to_label]] for distances to subcortical structures.

## Gotchas and Caveats

> [!gotcha] Output is a volume, not a curvature file
> Despite computing a surface property, the output is written as an MRI volume via `MRIwrite()`. To use it as a surface overlay in `freeview`, the output file may need to be reshaped or converted.

> [!gap] Distance metric
> The exact distance metric (Euclidean edge length vs. geodesic on the actual curved surface) depends on the internal `MRIScomputeDistanceMap()` implementation, which is not fully documented here.

## Related Tools

- [[mris_distance_transform]] — geodesic distance transform from a label
- [[mris_distance_to_label]] — distance maps for subcortical structures
- [[surface-format]] — surface file format details

## Confidence and Gaps

**Confident (from source):** Usage syntax, `-V` flag, output written via `MRIwrite()`.

**Uncertain:** Output volume geometry interpretation; whether the distance is edge-graph or continuous geodesic.
