---
title: "mris_shrinkwrap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_shrinkwrap/mris_shrinkwrap.cpp"
  - "mris_shrinkwrap/mris_AA_shrinkwrap.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_inflate]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact command-line syntax and required positional arguments not fully captured."
  - "Relationship between mris_shrinkwrap.cpp and mris_AA_shrinkwrap.cpp is unclear."
tags:
  - surface
  - BEM
  - skull-stripping
  - shrinkwrap
---

# mris_shrinkwrap

## Summary

`mris_shrinkwrap` fits BEM (Boundary Element Method) surfaces (inner skull, outer skull, skin) onto a labeled segmentation volume by iteratively deforming an icosahedral mesh toward boundaries in a distance-transformed version of the target structure. It is primarily used to generate BEM surfaces for MEG/EEG forward model computation. The tool is attributed to Bruce Fischl.

## Source Information

- **Language:** C++
- **Source files:**
  - `mris_shrinkwrap/mris_shrinkwrap.cpp` — main BEM surface generation tool
  - `mris_shrinkwrap/mris_AA_shrinkwrap.cpp` — variant for atlas-aligned shrinkwrapping
- **Key libraries:** `mrisurf`, `mrisurf_project`, `icosahedron`, `mrisegment`, `mrinorm`, `cma`
- **Key constants:** `INNER_SKULL_OUTER_SKULL_SEPARATION = 4`, `BORDER_VAL = 128`, `TARGET_VAL = 120`

## Purpose and Context

BEM-based MEG/EEG source modeling requires geometric surfaces representing the inner skull, outer skull, and scalp boundaries. `mris_shrinkwrap` generates these surfaces from a segmented volume (e.g., FreeSurfer `aseg.mgz`) by:
1. Creating binary volumes for each target structure (brain, skull, skin) from labeled data.
2. Computing a distance map around each structure's boundary.
3. Iteratively deforming an icosahedral mesh (initialized near the structure) toward the target boundary, using surface tension and repulsion forces to avoid self-intersections.

This produces smooth, topologically correct surfaces suitable for BEM computations.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Labeled volume (`vol_name`) | Segmentation volume (e.g., `aseg.mgz`) containing structure labels. | `.mgz`/`.mgh` |
| Output directory (`output_dir`) | Directory to write the resulting surfaces. | Directory path |
| FreeSurfer models directory | Loaded from environment or specified. | — |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Inner skull surface | BEM inner skull boundary surface. | FreeSurfer binary surface |
| Outer skull surface | BEM outer skull boundary surface. | FreeSurfer binary surface |
| Skin surface | BEM scalp boundary surface. | FreeSurfer binary surface |

> [!gap] Output file naming
> Exact output file names and their relation to the `-suffix` / `-osuffix` flags need confirmation from deeper source reading.

## Mathematical Foundations

The deformation is governed by an energy functional combining:

1. **Surface tension** (smoothing): $E_{\text{smooth}} = \lambda_s \sum_{(i,j)} \|v_i - v_j\|^2$
2. **Image-based attraction**: $E_{\text{img}} = -\sum_i I_{\text{dist}}(v_i)$ where $I_{\text{dist}}$ is the distance-transform volume; vertices are attracted toward the zero-crossing of the boundary distance map.
3. **Surface repulsion**: $E_{\text{repulse}} = \lambda_r \sum_i f(d_i)$ where $d_i$ is the distance to the nearest neighbor on the same mesh; prevents self-intersections.

The distance map is constructed with `BORDER_VAL = 128` inside the structure and step decrements of `OUTSIDE_BORDER_STEP = 16` outside, so the target value `TARGET_VAL = 120` lies just outside the boundary.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-suffix suf` | string | Input file suffix |
| `-osuffix suf` | string | Output file suffix |
| `-target_label L` | integer | Target segmentation label to fit surface to |
| `-smooth N` | integer | Number of surface smoothing iterations (default: 5) |
| `-nbrs N` | integer | Neighborhood size for normal computation (default: 2) |
| `-ic N` | integer | Icosahedron resolution (default: 5) |
| `-pad N` | integer | Padding added around volume (default: 40 voxels) |
| `-inner` | — | Generate inner skull surface only |
| `-embed` | — | Use embedded surface mode |
| `-tsmooth L` | float | Temporal smoothing weight `l_tsmooth` (default: 0.0) |
| `-surf_repulse L` | float | Surface repulsion weight (default: 5.0) |
| `-threshold T` | float | Binary threshold applied to masked volume (default: 0.0) |

## Configuration Interactions

- `-inner` restricts output to only the inner skull surface. Without it, all three surfaces (inner skull, outer skull, skin) are generated.
- `-ic` controls the resolution of the icosahedral template; higher values produce denser meshes but are slower.
- `-pad` adds voxels around the volume to ensure the initial icosahedral surface starts outside the target structure.
- `-smooth` and `-surf_repulse` together control surface quality; higher repulsion avoids self-intersections at the cost of slower convergence.

## Typical Use Cases

**Generate all three BEM surfaces from an aseg volume:**
```bash
mris_shrinkwrap aseg.mgz ./bem_surfaces $FREESURFER_HOME/models
```

**Generate inner skull only:**
```bash
mris_shrinkwrap -inner aseg.mgz ./bem_surfaces $FREESURFER_HOME/models
```

## Pipeline Context

`mris_shrinkwrap` is not called by `recon-all`. It is used in MEG/EEG workflows, typically called by the `mne_setup_forward_model` script or equivalent tools that prepare BEM surfaces for source modeling. It depends on a completed FreeSurfer segmentation (`aseg.mgz`).

## Gotchas and Caveats

> [!gotcha] Requires good segmentation quality
> The tool's accuracy depends entirely on the quality of the input segmentation. Poor skull/skin labels in the atlas segmentation will lead to inaccurate BEM surfaces. Manual editing of `aseg.mgz` may be necessary.

> [!gotcha] Inner-outer skull separation
> The code hardcodes a separation of 4 mm between the inner and outer skull surfaces (`INNER_SKULL_OUTER_SKULL_SEPARATION = 4`). This cannot be changed at runtime.

> [!gap] mris_AA_shrinkwrap relationship
> The `mris_AA_shrinkwrap.cpp` file in the same directory implements an atlas-aligned variant of the shrinkwrap algorithm. Its relationship to the main `mris_shrinkwrap` binary is unclear.

## Related Tools

- [[mris_inflate]] — surface inflation (different deformation paradigm)
- [[surface-format]] — FreeSurfer binary surface format

## Confidence and Gaps

**Medium confidence.** The overall algorithm (distance map + icosahedral deformation) is clear from the source. Exact command-line argument structure and output naming require reading the full `main()` function.
