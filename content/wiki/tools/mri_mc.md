---
title: "mri_mc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mc/mri_mc.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_tessellate]]"
  - "[[mri_pretess]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Topology consistency guarantee details require MC.h deep reading"
tags:
  - surface
  - tessellation
  - marching-cubes
---

# mri_mc

## Summary

`mri_mc` generates a topologically consistent triangulated surface mesh from a labeled volume using the Marching Cubes algorithm. Unlike standard marching cubes, it uses a connectivity-aware variant that ensures the resulting surface is consistent with a specific voxel connectivity choice (6-, 18-, or 26-connectivity). By default, only the largest connected component of the resulting surface is retained.

## Source Information

- **Language:** C++
- **Source file:** `mri_mc/mri_mc.cpp`
- **Author:** Florent Segonne

## Purpose and Context

Surface reconstruction in FreeSurfer requires extracting a triangulated mesh from a binary or labeled volume. `mri_mc` implements a topology-consistent variant of marching cubes that avoids the topological inconsistencies (handles, tunnels) that standard marching cubes introduces. This is important because downstream surface processing tools (inflation, registration, parcellation) all assume a genus-0 (sphere-like) surface topology.

The standard FreeSurfer pipeline uses [[mri_tessellate]] for the actual surface extraction step in `recon-all`, but `mri_mc` provides an alternative marching cubes approach with different topology guarantees.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volume | [[mgz]] / MRI_UCHAR | Labeled or binary volume |
| Label value | int (positional arg 2) | Integer label to extract as a surface |
| Output surface | string | Output surface filename |

**Usage:** `mri_mc [options] <input_vol> <label_value> <output_surface>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Surface mesh | FreeSurfer surface | Triangulated mesh of the specified label boundary |

## Mathematical Foundations

The standard Marching Cubes algorithm by Lorensen & Cline (1987) extracts an isosurface from a scalar field by classifying each cube of 8 neighbouring voxels using a lookup table of 256 possible configurations and replacing each configuration with a set of triangles.

`mri_mc` extends this with a connectivity-aware case disambiguation. For the ambiguous Marching Cubes cases (configurations where the correct topology is not unique), the connectivity parameter determines which cases are resolved in a way consistent with the chosen voxel connectivity (typically 6+26 or 26+6 complementary connectivity). This guarantees that:

1. The background and foreground are consistently connected.
2. The resulting surface is topologically equivalent to the boundary of the chosen connected component.

Formally, for connectivity $c$, the surface $S$ satisfies:

$$
\partial(\text{connected component}_c(\text{label})) = S
$$

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-d <n>` | int | 0 | Downsample the volume by factor n before tessellation |

> [!gap] Connectivity parameter
> The source defines a `connectivity` field in `tesselation_parms`, suggesting a connectivity choice flag exists. However, the command-line flag to set it is not confirmed from the header.

## Configuration Interactions

- `-d` reduces the resolution before tessellation, producing a coarser surface. This can accelerate processing for QC purposes but should not be used for analysis.

## Typical Use Cases

```bash
# Extract surface for label 2 (left WM) from aseg
mri_mc aseg.mgz 2 lh.white_mc.surf

# Extract with downsampling for quick QC
mri_mc -d 2 aseg.mgz 2 lh.white_coarse.surf
```

## Pipeline Context

Not invoked in the standard `recon-all` pipeline (which uses [[mri_tessellate]]). `mri_mc` is an alternative tessellation approach. It can be used as a replacement for [[mri_tessellate]] in custom surface extraction pipelines where topological consistency is critical.

The output surface can be used as input to [[mris_smooth]], [[mris_inflate]], etc.

## Gotchas and Caveats

> [!gotcha] Only the main connected component is kept by default
> The tool retains only the largest connected component of the extracted surface mesh. Smaller disconnected fragments (from noise in the volume) are discarded. This is usually desirable but can cause issues if the target structure has multiple disconnected components.

> [!gotcha] Label value must be exact
> The `label_value` argument must exactly match an integer label value in the volume. Floating-point volumes will be treated as if they have continuous intensity values, and the extracted surface may not correspond to an anatomical structure.

> [!gotcha] MAXFACES and MAXVERTICES hardcoded limits
> The source defines `MAXFACES = 3,000,000` and `MAXVERTICES = 1,500,000`. Surfaces exceeding these limits will cause the tool to exit. For very large or complex structures, this can be an issue.

> [!assumption] Expects MRI_UCHAR input
> The `MC.h` marching cubes implementation works with `unsigned char` voxels. Float volumes are likely converted internally, but precision may be lost.

## Related Tools

- [[mri_tessellate]] — the standard surface extraction tool used in `recon-all`
- [[mri_pretess]] — pre-processing step before tessellation to fill topological holes
- [[mri_segment]] — produces the labeled volumes consumed here

## Confidence and Gaps

**Confident:** Core algorithm (topology-consistent marching cubes), input/output structure, connected component retention, MAXFACES/MAXVERTICES limits.

**Less confident:** Connectivity parameter flag, exact topology guarantee strength.

> [!gap] Connectivity parameter flag
> The `connectivity` field in `tesselation_parms` and its command-line interface are not fully confirmed.
