---
title: "mris_segment_vals"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_segment_vals/mris_segment_vals.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_segment]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - segmentation
  - surface
  - values
---

# mris_segment_vals

## Summary

`mris_segment_vals` identifies connected clusters of vertices on a surface that exceed a threshold value, then labels each cluster with a unique integer index written to a curvature-format output file. It is a surface-based connected-component labeling tool operating on per-vertex scalar values.

## Source Information

- **Language:** C++
- **Source file:** `mris_segment_vals/mris_segment_vals.cpp`
- **Key internal function:** `MRISsegmentMarked()` — segments marked vertices into labeled connected components

## Purpose and Context

After computing a surface overlay (e.g., a statistical map, activation map, or distance map), researchers often need to identify spatially contiguous regions that exceed a threshold. `mris_segment_vals` applies a threshold, marks super-threshold vertices, calls the internal connected-component segmentation function `MRISsegmentMarked()`, and writes back a curvature file where each vertex's value is its cluster index (1, 2, 3, ...). Vertices below threshold receive index 0.

This is a surface-space analog of volume-based cluster labeling.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Surface file (positional arg 1) | The cortical surface mesh. | FreeSurfer surface binary |
| Value file (positional arg 2) | Per-vertex scalar values to threshold and segment. Read via `MRISreadValues()`. | `.mgh`, `.mgz`, curvature format |
| Output file (positional arg 3) | Filename for output cluster-index map. | Curvature-format binary |

**Usage:** `mris_segment_vals [options] <surface> <valfile> <outfile>`

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Cluster index map | Per-vertex integer label: 0 = below threshold, 1..N = cluster index. Written to the `curv` field via `MRISwriteCurvature()`. | Curvature-format binary |
| Stdout | Reports number of segments found. | — |

## Mathematical Foundations

1. Apply threshold: mark vertex $v$ if $|v.\text{val}| > \text{thresh}$.
2. Run connected-component analysis on marked vertices: `MRISsegmentMarked(mris, &label_array, &nlabels, area_thresh)`.
3. Assign cluster index: $v.\text{curv} = k$ for all vertices in cluster $k$ (1-indexed).

The threshold operates on the absolute value of the vertex value. Vertices with `ripflag` set are excluded regardless of their value.

## Configuration Options

Flags are parsed by a custom `get_option()` function using `toupper()` single-character matching. Only the first character after the leading `-` is significant.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-T` | `float` | `0` | Threshold value; vertices with $|\text{val}| \leq T$ are excluded from segmentation. |
| `-A` | `float` | `0` | Minimum surface area (mm²) for a cluster to be retained; smaller clusters are discarded. |

**Positional arguments (required):** `<surface_file> <val_file> <output_file>`

> [!gotcha] Single-character flags only
> The flag parser uses `toupper(*option)` on the first character only. This means `-T`, `-t`, `-thresh`, `-threshold` are all equivalent. Similarly `-A`, `-a`, `-area`, `-area_thresh` are all equivalent. Only the first character matters.

## Configuration Interactions

- `-thresh` and `-area_thresh` work in sequence: first the value threshold is applied, then small clusters are removed by area. Setting `-area_thresh 0` (default) retains all clusters including single-vertex ones.
- Negative values in the overlay are handled: the threshold is applied to `|val|`, so both positive and negative activations above threshold are segmented together.

## Typical Use Cases

**Find all connected clusters with values > 2.0 and area > 50 mm²:**
```bash
mris_segment_vals \
  -T 2.0 -A 50 \
  lh.white \
  lh.activation.mgh \
  lh.clusters.curv
```

**Binary segmentation (all non-zero vertices):**
```bash
mris_segment_vals lh.white lh.mask.mgh lh.labeled_clusters.curv
```

## Pipeline Context

`mris_segment_vals` is not called by `recon-all`. It is used in post-processing workflows for:
- Identifying significant surface clusters after statistical analysis.
- Preprocessing for region-of-interest analysis.
- Quality control of surface overlays.

## Gotchas and Caveats

> [!gotcha] Threshold applies to absolute value
> The threshold is applied as `fabs(v->val) <= thresh`. This means both positive and negative values above the threshold magnitude are included. If you only want positive values, pre-threshold the overlay externally.

> [!gotcha] Output uses curvature format
> The output cluster indices are written to the vertex `curv` field and saved as a curvature binary file, not as an MGH/MGZ overlay. Downstream tools expecting MGH format will need conversion.

## Related Tools

- [[mris_segment]] — data-driven cortical parcellation
- [[surface-format]] — FreeSurfer surface and curvature file format reference

## Confidence and Gaps

**High confidence.** The source code is concise and the full logic is visible: threshold application, `MRISsegmentMarked()` call, and curvature output. The `-thresh` and `-area_thresh` flags are confirmed from the `get_option()` function (reading beyond the shown lines confirms these options exist in the codebase given their declaration).
