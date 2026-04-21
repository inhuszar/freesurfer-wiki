---
title: "mris_distance_transform"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_distance_transform/mris_distance_transform.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_distance_map]]"
  - "[[mris_distance_to_label]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The vol mode (distance from surface into volume) appears to be coded but may not be fully implemented."
tags:
  - surface
  - distance
  - geodesic
  - label
---

# mris_distance_transform

## Summary

`mris_distance_transform` computes the geodesic distance transform on a surface mesh from a given label (set of vertices). For each vertex not in the label, it computes the distance to the nearest label boundary vertex. The result can be signed (positive outside, negative inside), unsigned (absolute value), or restricted to outside-only. It uses the MARS boundary distance transform algorithm.

## Source Information

- **Language:** C++
- **Source file:** `mris_distance_transform/mris_distance_transform.cpp`
- **Author:** Bruce Fischl
- **Key dependency:** `MARS_DT_Boundary.h` (boundary distance transform on surfaces)

## Purpose and Context

Surface-based distance transforms are used in cortical parcellation refinement, shape analysis, and as input features for machine-learning models. The tool takes a label file (or annotation) and computes how far each surface vertex is from the label boundary.

## Inputs

- **Surface file** (positional arg 1): A FreeSurfer surface (e.g., `lh.white`).
- **Label file** (positional arg 2): A FreeSurfer `.label` file defining the source region. When `--vol` is used, a template volume is specified instead.
- **Mode string** (positional arg 3): One of `signed`, `unsigned`, or `outside`.
- **Output file** (positional arg 4): Output filename.

## Outputs

- **Per-vertex distance file**: Written via `MRISwriteCurvature()` or `MRIwrite()` depending on mode.
- When `--divide N` is specified, N separate output files are written with `_divN` suffixes, each representing a subdivision of the label.
- When `--vol` is specified, a volumetric distance-from-surface file is written.

## Mathematical Foundations

The MARS distance transform computes geodesic distances on the triangulated surface mesh. For a label $\mathcal{L}$ and vertex $v_i \notin \mathcal{L}$:

$$
d(v_i, \mathcal{L}) = \min_{v_j \in \partial\mathcal{L}} d_{\text{geo}}(v_i, v_j)
$$

where $\partial\mathcal{L}$ is the boundary of the label and $d_{\text{geo}}$ is the geodesic distance on the mesh.

The three modes control sign conventions:
- **signed:** $d$ is negative inside $\mathcal{L}$, positive outside
- **unsigned:** $|d|$ everywhere
- **outside:** $d$ only for vertices outside $\mathcal{L}$; 0 inside

Normalisation option: when `--normalize` is set, distances are divided by $\sqrt{A_{\text{total}}}$ where $A_{\text{total}}$ is the total surface area.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--anterior` | `<float>` | -1 | Crop label: keep only vertices anterior to this y-coordinate (mm) |
| `--posterior` | `<float>` | -1 | Crop label: keep only vertices posterior to this y-coordinate |
| `--divide` | `<N>` | 1 | Divide label into N parts along its long axis and compute separate distance transforms |
| `--divide-surf` | `<surfname>` | — | Surface to use for label division geometry |
| `--output-label` | — | off | Write per-division labels rather than distance files |
| `--normalize` | — | off | Normalise distances by $\sqrt{A_{\text{total}}}$ |
| `--vol` | — | off | Compute distance from surface into a volume instead of label on surface |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- The `mode` argument (signed/unsigned/outside) is required as positional arg 3; it cannot be omitted.
- `--anterior` and `--posterior` crop the label before computing the transform. Both can be specified together.
- `--divide` and `--output-label` interact: with `--output-label`, each subdivision is written as a label file rather than a distance curvature; without it, distance values are written.
- `--vol` changes the output entirely: the output is a volumetric distance-from-surface field at 0.25 mm resolution rather than a per-vertex curvature.
- `--divide` and `--vol` should not be combined (vol mode uses `MRIScomputeDistanceToSurface()` with a different code path).

## Typical Use Cases

```bash
# Signed geodesic distance from a label on the white surface
mris_distance_transform lh.white lh.MT.label signed lh.MT.dtrans

# Unsigned distance, normalised by surface area
mris_distance_transform --normalize lh.white lh.MT.label unsigned lh.MT.dtrans.norm

# Divide label into 3 parts and compute separate transforms
mris_distance_transform --divide 3 lh.white lh.MT.label signed lh.MT.dtrans

# Compute volumetric distance from surface
mris_distance_transform --vol lh.white lh.MT.label unsigned /tmp/vol_dist.mgz
```

## Pipeline Context

Not called by `recon-all`. Used in research for parcellation refinement and morphometric features. Pairs with [[mris_divide_parcellation]] for label subdivision workflows.

## Gotchas and Caveats

> [!gotcha] Positional mode argument
> The mode string (`signed`, `unsigned`, or `outside`) must be the third positional argument, not a flag. Omitting it causes a fatal error.

> [!gotcha] vol mode uses a different code path
> The `--vol` option routes to `MRIScomputeDistanceToSurface()` with hardcoded 0.25 mm resolution; command args 2-3 (label file and mode string) are ignored in this path.

## Related Tools

- [[mris_distance_map]] — distance from single reference vertex
- [[mris_distance_to_label]] — distance to subcortical structures
- [[mris_divide_parcellation]] — divide parcellations along their long axis
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from source):** Mode options, `--divide`, `--anterior`/`--posterior` cropping, `--normalize`, `--vol` code path, MARS algorithm dependency.

**Uncertain:** Whether `--vol` mode is fully functional (code comment suggests template volume code is commented out).

> [!gap] vol mode implementation
> In the source, the volume template reading code inside the `if(vol)` branch is commented out, suggesting `--vol` may be incomplete or non-functional.
