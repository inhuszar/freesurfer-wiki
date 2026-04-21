---
title: "Surface Representations"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mri_tessellate]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_preproc]]"
  - "[[freeview-surfaces]]"
related_concepts:
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Topology fix algorithm (mris_fix_topology / mris_euler_number) not documented"
  - "mris_make_surfaces (white and pial deformation) not yet ingested"
tags:
  - surface
  - anatomy
  - cortex
  - representation
---

# Surface Representations

## Overview

FreeSurfer represents the cortical surface as a series of triangular meshes,
each derived from the same set of vertices but with different vertex positions.
The progression from tessellation to registration constitutes the core of the
`autorecon2`/`autorecon3` processing stream. Each representation serves a
distinct purpose — some are anatomically faithful to the cortical geometry,
others are topological abstractions optimised for cross-subject registration.

All surfaces share the same vertex count and face connectivity once the
topology has been fixed. The fundamental correspondence is preserved: vertex
$i$ in `lh.white` is the same cortical location as vertex $i$ in `lh.pial`,
`lh.inflated`, and `lh.sphere`.

## The Surface Hierarchy

| Surface File | Description | Producing Tool | Coordinate Space |
|--------------|-------------|----------------|------------------|
| `?h.orig.nofix` | Raw tessellation; may have topological defects | [[mri_tessellate]] | Surface RAS |
| `?h.smoothwm.nofix` | Laplacian-smoothed raw tessellation | [[mris_smooth]] | Surface RAS |
| `?h.inflated.nofix` | Inflated pre-fix surface (for QSphere) | [[mris_inflate]] | Surface RAS |
| `?h.qsphere.nofix` | Quick sphere ([[topology-correction|topology correction]] input) | [[mris_sphere]] -q | Sphere |
| `?h.orig` | Post-topology-fix tessellation | `mris_fix_topology` | Surface RAS |
| `?h.white` | White matter / grey matter boundary | `mris_make_surfaces` | Surface RAS |
| `?h.pial` | Pial surface (grey matter / CSF boundary) | `mris_make_surfaces` | Surface RAS |
| `?h.smoothwm` | Smoothed white surface (for parcellation features) | [[mris_smooth]] | Surface RAS |
| `?h.inflated` | Inflated surface (for visualisation) | [[mris_inflate]] | Surface RAS |
| `?h.sphere` | Spherical mapping | [[mris_sphere]] | Unit sphere |
| `?h.sphere.reg` | Atlas-registered sphere | [[mris_register]] | Unit sphere |

## Anatomically Faithful Surfaces

### White Matter Surface (`?h.white`)

The white/grey matter boundary — the innermost cortical surface. Vertex
positions approximate the boundary between myelinated white matter and the
cortical grey matter ribbon. This surface is:

- The **reference surface** for all overlay projections (`mri_vol2surf`
  default: `--surf white`)
- The surface whose vertex coordinates are in **Surface RAS** (tkregister RAS);
  see [[coordinate-systems]]
- Used in cortical thickness computation (distance from white to pial)

The white surface is deformed from the initial tessellation by `mris_make_surfaces`
using T1 intensity gradients. The WM target intensity is 110 (after [[mri_normalize]]).

### Pial Surface (`?h.pial`)

The grey matter / CSF boundary — the outermost cortical surface. Vertex
positions approximate the outer edge of the cortex. Key properties:

- Same vertex count and topology as `?h.white`
- Together with `?h.white`, defines the cortical ribbon (the region between them)
- Used for pial surface area computation and cortical volume estimates
- The ribbon volume `ribbon.mgz` encodes voxels between white and pial (label 3
  for lh, 42 for rh) — used by [[mri_surf2vol]] Method 1

**Cortical thickness** at vertex $v$ is the Euclidean distance between
corresponding white and pial vertices:
$$\tau_v = \|\mathbf{x}_v^\text{pial} - \mathbf{x}_v^\text{white}\|$$

This is stored in `?h.thickness` as a [[curv-format]] file.

### Mid-Cortical Surface

Not stored explicitly as a file. The midpoint between white and pial at each
vertex: $\mathbf{x}_v^\text{mid} = \frac{1}{2}(\mathbf{x}_v^\text{white} + \mathbf{x}_v^\text{pial})$.
Used in some area computations (`area.mid`).

### TH3 Volume Computation (grey matter volume)

[[mris_anatomical_stats]] computes grey matter volume using the TH3 (prism
integration) method. For each face $(v_1, v_2, v_3)$:
$$V_\text{prism} = \frac{1}{3}(A^\text{white} \cdot \tau_1 + A^\text{pial} \cdot \tau_2 + A^\text{mid} \cdot \tau_3)$$
where $A$ is the face area and $\tau$ is the local thickness. This gives a
more accurate estimate than simple area × thickness.

## Topologically Simplified Surfaces

### Smoothed White Matter Surface (`?h.smoothwm`)

The Laplacian-smoothed version of `?h.white`. Created by [[mris_smooth]] with
10 passes of nearest-neighbour averaging (the "Smooth2" stage in `autorecon2`).
Purpose:

- Provides a smoother normal field for subsequent operations
- Used as input to the feature-extraction pipeline for [[mris_register]]
- Vertex positions are close to `?h.white` but slightly displaced inward

### Inflated Surface (`?h.inflated`)

An approximation to a sphere obtained by minimising a spring energy functional
(see [[mris_inflate]]). The inflation removes sulcal curvature while preserving
local area and shape. Key properties:

- **Not anatomically faithful**: vertex positions do not correspond to real
  cortical locations
- Used **exclusively for visualisation**: displays sulci and gyri unfolded
  without the folding pattern obscuring interior regions
- The signed sulcal depth map `?h.sulc` records how much each vertex moved
  during inflation, serving as a proxy for sulcal depth:
  $$s_v = \text{sign}(\kappa_v) \cdot \|\mathbf{x}_v^\text{inflated} - \mathbf{x}_v^\text{white}\|$$
  where negative $s_v$ indicates sulcal walls (vertices that moved outward)
  and positive $s_v$ indicates gyral crowns (vertices that moved less)

> [!gotcha] Never sample on the inflated surface
> `mri_vol2surf --surf inflated` raises an error and is explicitly blocked in
> the source. Inflated vertex positions do not correspond to real anatomical
> locations, so sampling a volume at inflated coordinates produces meaningless
> values. Always project on `white` or `pial`, then display on `inflated`.

### Spherical Surface (`?h.sphere`)

The final output of [[mris_sphere]]: a mapping of the cortical surface onto the
unit sphere that minimises metric distortion. Key properties:

- Each vertex has unit-sphere coordinates $(x, y, z)$ with $x^2 + y^2 + z^2 = 1$
- The topology is that of a sphere — sulcal folds are completely removed
- Area distortion relative to the white surface is recorded in `?h.jacobian_white`
- This surface is the input to [[mris_register]] for cross-subject alignment

The metric distortion energy functional:
$$E_\text{dist} = l_\text{dist} \sum_{(i,j)} (e_{ij} - e_{ij}^0)^2 + l_\text{area} \sum_f (A_f - A_f^0)^2$$
where $e_{ij}$ are edge lengths and $A_f$ face areas, and superscript $0$
denotes the reference (inflated) values. See [[mris_sphere]] for full details.

### Atlas-Registered Sphere (`?h.sphere.reg`)

The sphere after registration to the group-average atlas (Buckner40 atlas by
default). [[mris_register]] aligns the subject's folding pattern (as encoded in
`?h.sulc` and `?h.curv` on the inflated surface) to the atlas folding pattern
by optimising:
$$E_\text{reg} = l_\text{corr} \cdot E_\text{correlation} + l_\text{dist} \cdot E_\text{distortion} + l_\text{area} \cdot E_\text{area}$$

Key properties:
- Used by `mri_surf2surf` and [[mris_preproc]] to resample between subjects
- Every subject's `sphere.reg` is aligned to the same atlas, enabling
  vertex-to-vertex correspondence across subjects
- Cortical parcellation ([[mris_ca_label]]) looks up each vertex in the atlas
  via `sphere.reg`

## Coordinate Systems

All anatomical surfaces (`orig`, `white`, `pial`, `smoothwm`, `inflated`) use
**Surface RAS** coordinates (tkregister RAS). The spherical surfaces (`sphere`,
`sphere.reg`) use unit-sphere coordinates with values in $[-1, 1]$.

See [[coordinate-systems]] for the formal definition of Surface RAS and its
relationship to Scanner RAS.

## Vertex Correspondence Across Surfaces

A fundamental property of the FreeSurfer surface pipeline: once the topology is
fixed, **vertex $i$ corresponds to the same cortical location across all
surfaces**. This means:

- `white.vtx[i]` and `pial.vtx[i]` are on the same cortical column
- Overlay files (`.thickness`, `.curv`, `.sulc`) index the same vertices as
  the surfaces
- Cross-subject resampling via `sphere.reg` preserves this correspondence
- Per-parcel statistics from [[mris_anatomical_stats]] refer to the same
  parcels regardless of which surface representation is used

> [!gotcha] Topology fix changes vertex count
> `mris_fix_topology` (which runs between `orig.nofix` and `orig`) may add or
> remove vertices to repair handles (topological defects). The `*.nofix`
> surfaces have a **different vertex count** than the post-fix surfaces. Code
> that mixes nofix and post-fix surfaces will fail silently or crash.

## The Cortical Ribbon

The volume between the white and pial surfaces is called the **cortical
ribbon**. It is encoded in `ribbon.mgz`:

| Value | Meaning |
|-------|---------|
| 0 | Background / outside cortex |
| 2 | Left hemisphere white matter |
| 3 | Left hemisphere cortex (ribbon) |
| 41 | Right hemisphere white matter |
| 42 | Right hemisphere cortex (ribbon) |

The ribbon is used by [[mri_surf2vol]] (Method 1) to fill the cortical volume
with surface-derived values without holes.

## Tools That Use Surface Representations

| Tool | Surfaces Used | Purpose |
|------|--------------|---------|
| [[mri_tessellate]] | Creates `orig.nofix` | Initial mesh from WM segmentation |
| [[mris_smooth]] | Reads/writes `smoothwm` | Laplacian smoothing |
| [[mris_inflate]] | Reads `smoothwm`, writes `inflated` | Surface inflation |
| [[mris_sphere]] | Reads `inflated`, writes `sphere` | Spherical mapping |
| [[mris_register]] | Reads `sphere`, writes `sphere.reg` | Atlas registration |
| [[mri_vol2surf]] | Reads `white` (default) | Volume-to-surface projection |
| [[mri_surf2vol]] | Reads `white` or paired white+pial | Surface-to-volume back-projection |
| [[mris_preproc]] | Reads overlay files; uses `sphere.reg` | Group-level resampling |
| [[mris_anatomical_stats]] | Reads `white`, `pial`, annotation | Per-parcel morphometry |
| [[mris_ca_label]] | Reads `sphere.reg` | Atlas-based parcellation |

## Common Misunderstandings

> [!gotcha] Inflated surface is not for analysis
> The inflated surface is produced purely for visualisation. Coordinates on the
> inflated surface have no anatomical meaning. All analysis (projection,
> statistics) must use the anatomical surfaces (`white`, `pial`).

> [!gotcha] Sphere coordinates are not anatomical
> `sphere.reg` coordinates are angular positions on a unit sphere, not cortical
> locations in mm. The sphere is a topological abstraction enabling cross-subject
> correspondence, not an anatomical surface.

> [!gotcha] The same overlay values apply to all surfaces
> A curvature file `lh.thickness` contains one value per vertex. Those values
> are the same regardless of which surface is used for visualisation — thickness
> is a property of the cortical column, not of a particular surface
> representation.

## Confidence and Gaps

High confidence on the surface hierarchy and coordinate systems — derived from
[[mri_tessellate]], [[mris_smooth]], [[mris_inflate]], [[mris_sphere]], and
[[mris_register]] source analysis.

> [!gap] Topology fix algorithm
> `mris_fix_topology` and `mris_euler_number` (which detect and repair
> topological defects — handles in the genus-0 sphere) have not been ingested.
> The handle-fixing algorithm is described in Fischl et al. (2001) but the
> code has not been read.

> [!gap] `mris_make_surfaces` — white and pial surface deformation
> The deformable surface algorithm that produces `?h.white` and `?h.pial` from
> the initial tessellation has not been documented. This is among the most
> complex parts of the FreeSurfer pipeline.

## References

- Fischl B, Sereno MI, Dale AM (1999). Cortical surface-based analysis II:
  Inflation, flattening, and a surface-based coordinate system. *NeuroImage*
  9(2):195–207.
- Fischl B, Liu A, Dale AM (2001). Automated manifold surgery: constructing
  geometrically accurate and topologically correct models of the human cerebral
  cortex. *IEEE Trans Med Imaging* 20(1):70–80.
- Ségonne F, Pacheco J, Fischl B (2007). Geometrically accurate topology
  correction of cortical surfaces using nonseparating loops. *IEEE Trans Med
  Imaging* 26(4):518–529.
