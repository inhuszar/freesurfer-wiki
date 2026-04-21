---
title: "mris_distance_to_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_distance_to_label/mris_distance_to_label.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_distance_transform]]"
  - "[[mris_distance_map]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full list of supported label types and mode values is not clear from the truncated source read."
  - "The FRAME_FIELD_NAMES array suggests multi-frame output but the exact output format is unverified."
tags:
  - surface
  - distance
  - subcortical
  - atlas
---

# mris_distance_to_label

## Summary

`mris_distance_to_label` computes distance maps from the cortical surface to subcortical anatomical structures (amygdala, hippocampus, pallidum, putamen, caudate, lateral ventricle, inferior lateral ventricle). It uses a fast-marching algorithm on a volumetric distance field derived from a segmentation volume and projects the distances onto the surface. The output is a per-vertex curvature file.

## Source Information

- **Language:** C++
- **Source file:** `mris_distance_to_label/mris_distance_to_label.cpp`
- **Author:** Bruce Fischl
- **Key dependency:** `fastmarching.h` (fast marching method for volumetric distance fields)

## Purpose and Context

This tool provides a surface-registered measure of proximity to deep brain structures. It is used in atlasing, registration, and connectivity analyses where the cortical surface needs to encode spatial relationships with subcortical anatomy.

## Inputs

- **Surface file** (positional arg 1): A FreeSurfer surface (e.g., `lh.white`).
- **Segmentation volume** (`--aseg`): An aseg-style label volume (e.g., `aseg.mgz`) from which distances to specific structures are computed.
- **Optional**: Multiple structure labels can be specified via `labels[]`.

## Outputs

- **Curvature file** (positional arg 2): Per-vertex distance values written with `MRISwriteCurvature()`.

The named frame fields produced include:
- `sulc`, `curv`, graymid intensity, T1/T2/PD mid-surface values
- `amygdala_dist`, `hippocampus_dist`, `pallidum_dist`, `putamen_dist`, `caudate_dist`, `lat_ventricle_dist`, `inf_lat_ventricle_dist`

## Mathematical Foundations

For each target structure label $L$, a 3D volumetric distance field $D_L(x)$ is computed via the fast-marching algorithm from the segmentation volume:

$$
D_L(x) = \min_{y \in L} \|x - y\|_2
$$

The signed distance is clipped to $[-d_{\max}, +d_{\max}]$ where $d_{\max}$ is controlled by `fdistance` (default 20 mm). Values are then sampled at each surface vertex location via nearest-neighbour interpolation in the volume.

Distance values are optionally processed as:
- **Mode 1:** $\max(0, D_L)$ — exterior distance only (positive)
- **Mode 2:** $\min(D_L, 0)$ — interior distance only (negative)

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--aseg` | `<seg_vol>` | — | Segmentation volume (aseg.mgz) |
| `--navgs` | `<int>` | 0 | Number of surface averaging iterations |
| `--fdistance` | `<float>` | 20.0 | Maximum distance (mm) for clipping |
| `--mode` | `<int>` | 1 | Distance mode: 1=exterior only, 2=interior only |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `--mode` controls the sign convention of the projected distance values; mode 1 gives cortex-to-structure distance from outside the structure, mode 2 from inside.
- `--navgs` smooths the resulting surface values; larger values reduce vertex-to-vertex noise but smooth spatial gradients.

## Typical Use Cases

```bash
# Compute distance to subcortical structures from white surface
mris_distance_to_label --aseg aseg.mgz lh.white lh.subcort_dist

# With smoothing
mris_distance_to_label --aseg aseg.mgz --navgs 5 lh.white lh.subcort_dist_smooth
```

## Pipeline Context

Not called by `recon-all`. Used in research studies of cortical-subcortical spatial relationships. Pairs well with [[mri_ca_label]] and [[mris_ca_label]] for anatomy-based surface analyses.

## Gotchas and Caveats

> [!gotcha] Output is a curvature file
> The distance values are stored in FreeSurfer's curvature file format. The name is misleading — this does not produce a standard `.label` file.

> [!gap] Supported labels
> The source defines a fixed set of subcortical structures via `FRAME_FIELD_NAMES`. It is unclear whether arbitrary label IDs from `aseg.mgz` can be specified.

## Related Tools

- [[mris_distance_transform]] — geodesic distance transform from a surface label
- [[mris_distance_map]] — all-vertex distance map from a single reference vertex
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**Confident (from source):** Target structures (amygdala, hippocampus, pallidum, putamen, caudate, lateral ventricles), fast-marching approach, mode parameter, distance clipping.

**Uncertain:** Full command-line interface beyond the truncated read; whether `labels[]` array is user-configurable at runtime.
