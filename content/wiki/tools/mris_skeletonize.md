---
title: "mris_skeletonize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_skeletonize/mris_skeletonize.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "DTK output format details not verified."
tags:
  - skeleton
  - curvature
  - gyri
  - sulci
  - surface
---

# mris_skeletonize

## Summary

`mris_skeletonize` skeletonizes a surface scalar map (such as curvature) to produce label files representing the one-dimensional skeletal ridges of gyral crowns or sulcal fundi. It identifies edges, branch points, and terminal points of the skeleton and can output results as FreeSurfer labels or DTK tractography format. The tool is attributed to Doug Greve.

## Source Information

- **Language:** C++
- **Source file:** `mris_skeletonize/mris_skeletonize.cpp`
- **Key class:** `SurfSkeleton` — encapsulates the skeletonization algorithm
- **Key libraries:** `mrisurf`, `mrisurf_topology`, `surfcluster`, `pointset`, `dtk.fs`, `annotation`, `colortab`

## Purpose and Context

Gyral crowns and sulcal fundi are one-dimensional geometric features of the cortex. Extracting these skeletal structures enables morphometric analysis of gyral/sulcal patterns, provides landmarks for registration, and supports cortical folding studies. `mris_skeletonize` takes a surface overlay (typically mean curvature) and extracts its ridges as a skeleton: a set of connected vertices forming the medial axes of high-curvature bands. The skeleton can then be exported as labels or as streamlines for tractography visualization.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Surface mesh | The cortical surface to skeletonize. | FreeSurfer binary surface |
| Sphere surface | Spherical representation for spatial ordering of neighbors. | FreeSurfer binary surface |
| Scalar overlay | Per-vertex values to skeletonize (e.g., mean curvature). | `.mgh`, `.mgz`, or curvature format |
| Mask (optional) | Binary mask restricting skeletonization to a region. | `.mgh`, `.mgz` |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Skeleton label(s) | Label files representing skeletal vertices, branch points, and terminals. | `.label` |
| DTK streamlines (optional) | TrackVis-compatible streamline representation of the skeleton. | `.trk` |

## Mathematical Foundations

The `SurfSkeleton` class implements a surface-based skeletonization algorithm:

1. **Edge detection:** A vertex is classified as an "edge" vertex if it lies on the boundary of the thresholded mask — i.e., it is in the mask but has at least one neighbor outside the mask.
2. **Spatially ordered neighborhood:** The method `build_vtxnbrlist()` orders each vertex's neighbors in spatially contiguous order around the vertex (rather than arbitrary connectivity order). This is required for correct local topology analysis.
3. **Threshold:** Vertices with value below `m_threshold` (default: 0.3) are excluded from the skeleton.
4. **FWHM smoothing:** Optional Gaussian smoothing (controlled by `m_fwhm`) applied before thresholding.
5. **Cluster pruning:** If `nkeep > 0`, only the top `nkeep` connected components are retained.
6. **Branch/terminal classification:** After building the skeleton, vertices are classified as branch points (degree ≥ 3), terminal points (degree 1), or intermediate skeleton vertices.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--surf` | surface file | — | Input surface mesh |
| `--sphere` | sphere file | — | Spherical surface for neighbor ordering (required with `--curv-nonmaxsup`) |
| `--s` | subject hemi surfname | — | Subject name plus hemisphere and surface name; resolves surface paths via `$SUBJECTS_DIR` |
| `--mask` | mask file | — | Binary mask restricting analysis |
| `--surfvals` | overlay file | — | Load scalar values from a surface overlay file |
| `--out-surfvals` | path | — | Write computed surface values to file |
| `--threshold`<br>`--thresh` | float | `0.3` | Skeleton threshold |
| `--fwhm` | float | `0` | Gaussian smoothing FWHM before thresholding; 0 means no smoothing |
| `--cluster` | integer | `0` | Keep only N largest clusters; 0 keeps all |
| `--nbrsize` | integer | `2` | Neighborhood size for topology analysis |
| `--gyrus`<br>`--crown` | — | on | Use negative curvature scale (gyral crowns); this is the default mode |
| `--sulcus`<br>`--fundus` | — | off | Use positive curvature scale (sulcal fundi) |
| `--k1` | — | off | Use principal curvature k1 as the scalar input |
| `--curv-nonmaxsup` | — | off | Use non-maximum-suppressed curvature as the scalar input |
| `--outdir` | path | — | Output directory; creates if needed |
| `--ps` | path | — | Output pointset file |
| `--l` | path | — | Output label file |
| `--tract` | path | — | Output DTK tractography file (.trk) |

## Configuration Interactions

- `--fwhm` and `--threshold` interact: smoothing is applied before thresholding, so higher smoothing broadens the ridges and may merge nearby skeletal structures.
- `--cluster` is applied after thresholding and skeleton construction; it prunes small fragments. Setting `--cluster 1` retains only the dominant gyral/sulcal skeleton.
- `--nbrsize` controls the neighborhood size for local topology analysis; larger values make branch detection more robust but slower.
- `--gyrus`/`--crown` and `--sulcus`/`--fundus` are mutually exclusive; they set the sign of the curvature scale factor used when `--k1` or `--curv-nonmaxsup` is active.

## Typical Use Cases

**Extract sulcal fundus skeleton from mean curvature:**
```bash
mris_skeletonize \
  --surf lh.white \
  --sphere lh.sphere \
  --surfvals lh.meancurv.mgh \
  --threshold 0.3 \
  --fwhm 5 \
  --cluster 10 \
  --l lh.sulcal_skeleton.label
```

## Pipeline Context

`mris_skeletonize` is not part of `recon-all`. It is used in morphometric analysis workflows:
- Sulcal fundus extraction for shape analysis.
- Gyral crown identification for cortical parcellation validation.
- Input to tractography-based cortical analysis pipelines.

## Gotchas and Caveats

> [!gotcha] Requires spatially registered sphere
> The sphere surface must be the registered sphere for the same subject (e.g., `lh.sphere.reg`) so that the spatial ordering of neighbors is meaningful in atlas space.

> [!gotcha] Threshold sensitivity
> The skeleton is highly sensitive to the threshold value. Too low: skeleton becomes a large connected mesh rather than a one-dimensional structure. Too high: skeleton fragments. Empirical tuning per dataset is typically required.

> [!gap] DTK output format
> The DTK streamline output format (`dtk.fs.h` is included) and `--tract` flag write TrackVis-compatible `.trk` files. The exact internal format details are not yet verified.

## Related Tools

- [[mris_smooth]] — curvature smoothing that can preprocess inputs for skeletonization
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**Medium confidence.** The `SurfSkeleton` class algorithm and the complete `parse_commandline()` function have been read. Flag list is confirmed from source.
