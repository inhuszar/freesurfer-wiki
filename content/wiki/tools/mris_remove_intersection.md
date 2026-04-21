---
title: "mris_remove_intersection"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_fix_topology/mris_remove_intersection.cpp"
  - "mris_fix_topology/mris_remove_intersection.help.xml"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_remesh]]"
  - "[[surface-format]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The notches and remove-hah options have suggested but unoptimised parameters"
tags:
  - surface
  - topology
  - self-intersection
  - quality-control
---

# mris_remove_intersection

## Summary

`mris_remove_intersection` removes self-intersecting triangles from a cortical surface mesh and writes a topologically corrected surface. Self-intersections — where triangles from different parts of the surface cross each other — are a surface quality error that can cause downstream failures in curvature computation, registration, and parcellation. The tool additionally supports mapping intersection locations, finding surface notches, and removing high-angle hinges as standalone operations.

## Source Information

- **Language:** C++
- **Source files:** `mris_fix_topology/mris_remove_intersection.cpp`, `mris_fix_topology/mris_remove_intersection.help.xml`
- **Location:** `mris_fix_topology/` — shares source directory with topology fixing tools
- **Original author:** Bruce Fischl

## Purpose and Context

Cortical surface meshing algorithms (tessellation, inflation, registration, remeshing) can occasionally produce faces that intersect faces from non-adjacent regions of the mesh. Such intersections violate the manifold surface assumption required by subsequent processing steps. `mris_remove_intersection` detects and repairs these errors.

Common sources of intersections:
- Aggressive inflation or registration
- Remeshing operations (`mris_remesh` calls this internally)
- Manual vertex editing that crosses nearby surface patches
- Topology correction procedures that produce locally overlapping faces

## Inputs

- Positional arg 1: input surface file (FreeSurfer binary format)
- Positional arg 2: output corrected surface file

## Outputs

- Output surface with self-intersections removed (FreeSurfer binary format)

Standalone operations (do not produce a corrected surface):
- `-map` flag: binary map of intersection locations (MGZ volume)
- `-notches` flag: text file mapping surface notches
- `-remove-hah` flag: surface with high-angle hinges removed

## Mathematical Foundations

Self-intersection detection tests each pair of non-adjacent triangles for geometric intersection in 3D space. The correction relocates vertices in the intersecting region to eliminate the crossing while minimising distortion.

For the notch detection (`-notches`):
- Each vertex is projected a distance `projdistmm` along the normal
- K1 (principal curvature) threshold `k1thresh` identifies sharp boundaries
- Clusters of notch vertices are grouped and filtered by size and standard deviation

For hinge removal (`-remove-hah`):
- Triangles meeting at angles exceeding `anglethresh` (suggested 100°) are identified
- The region is dilated `ndil` times and smoothed `nsmooth` times

## Configuration Options

| Flag | Description |
|---|---|
| (positional 1) | Input surface file |
| (positional 2) | Output corrected surface file |
| `-fill-holes` | Fill holes in the intersection map (includes in fix) |
| `-map surface mapfile.mgz (projdistmm)` | Standalone: create binary intersection map |
| `-notches insurf projdist(1) k1thresh(.05) label(cortex) nmin(3) nmax(-1) stdthresh(.2) pointset ocn pial` | Standalone: map surface notches |
| `-remove-hah insurf anglethresh(100deg) ndil(3) nsmooth(75) outsurf outmask` | Standalone: remove high-angle hinges |

All optional flags except `-fill-holes` are standalone operations — they perform a different function and do not produce the standard intersection-corrected output.

## Configuration Interactions

- `-fill-holes` expands the region marked as intersecting to include adjacent holes, then corrects the enlarged region.
- `-map`, `-notches`, and `-remove-hah` are standalone operations. When specified, the tool does not produce the normal corrected surface output.
- For `-notches`, the `pial` argument is optional; when specified, it provides additional context for notch mapping.

> [!gotcha] Standalone flags bypass normal operation
> Using `-map`, `-notches`, or `-remove-hah` with a surface and output argument will not produce an intersection-corrected surface. These are diagnostic/analysis modes.

## Typical Use Cases

```bash
# Remove self-intersections from a surface
mris_remove_intersection lh.white lh.white.fixed

# Remove intersections including hole-filling
mris_remove_intersection -fill-holes lh.white lh.white.fixed

# Create a binary map of intersections
mris_remove_intersection -map lh.white intersections.mgz 1.0

# Map surface notches
mris_remove_intersection -notches lh.white 1.0 0.05 lh.cortex.label 3 -1 0.2 notch_points.json notch.mgz lh.pial

# Remove high-angle hinges (parameters not optimised)
mris_remove_intersection -remove-hah lh.white 100 3 75 lh.white.nohinge hinge_mask.mgz
```

## Pipeline Context

Called internally by [[mris_remesh]] after remeshing operations. Also applicable as a post-processing step after:
- `mris_fix_topology` — topology correction that may introduce intersections
- Manual surface editing
- Custom remeshing pipelines

## Gotchas and Caveats

> [!gotcha] Suggested hinge removal parameters not optimised
> From the help XML: "-remove-hah: Suggested params have not been optimized." The default values (100°, 3 dilations, 75 smoothing steps) are starting points only.

> [!gotcha] FillHoles default is off
> By default, holes adjacent to intersection regions are not filled. This can leave small isolated intersection remnants. Use `-fill-holes` for more aggressive correction.

> [!gotcha] Intersection correction is heuristic
> The correction method relocates intersecting vertices rather than globally re-tessellating. In severe cases, some intersections may remain or new ones may be introduced.

## Related Tools

- [[mris_remesh]] — calls `MRISremoveIntersections` internally after remeshing
- `mris_fix_topology` — topology correction that operates on a different class of errors

## Confidence and Gaps

**Confident (from code and help XML):** Positional argument structure; `-fill-holes`, `-map`, `-notches`, `-remove-hah` as standalone flags; default parameter values; hinge removal parameters not optimised (per help XML).

**Uncertain:** The actual correction algorithm (vertex relocation method) for standard intersection removal.
