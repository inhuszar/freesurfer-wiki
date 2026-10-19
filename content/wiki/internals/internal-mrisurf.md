---
title: "internal-mrisurf"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/mrisurf.h"
  - "include/mrisurf_FACE_VERTEX_MRIS_generated.h"
  - "include/mrisurf_aaa.h"
  - "utils/mrisurf_base.cpp"
  - "utils/mrisurf_io.cpp"
  - "utils/mrisurf_metricProperties.cpp"
  - "utils/mrisurf_topology.cpp"
  - "utils/mri_topology.cpp"
  - "utils/mrisurf_deform.cpp"
  - "utils/mrisurf_compute_dxyz.cpp"
  - "utils/mrisurf_integrate.cpp"
  - "utils/mrisurf_timeStep.cpp"
  - "utils/mrisurf_mri.cpp"
  - "utils/mrisurf_defect.cpp"
  - "utils/mrisurf_vals.cpp"
related:
  - "[[surface-representations]]"
  - "[[surface-format]]"
  - "[[internal-mrisurf-metricproperties]]"
  - "[[topology-correction]]"
  - "[[coordinate-systems]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[mris_place_surface]]"
  - "[[mris_make_surfaces]]"
status: draft
confidence: medium
last_agent_update: 2026-06-11
gaps:
  - "The MRIS library is ~72,000 lines across 17 mrisurf_*.cpp files; this page maps the file split and documents the load-bearing structures and algorithms, not every routine."
  - "MRIScomputeNormals is invoked widely but its definition is generated/macro-expanded and was not line-located; the canonical recompute entry MRIScomputeMetricProperties is cited instead."
tags:
  - internal
  - surface
  - data-structures
---

# internal-mrisurf

## Summary

`mrisurf` is FreeSurfer's **triangular surface mesh library**. It defines the
`MRIS` (a.k.a. `MRI_SURFACE`) data structure that represents a cortical surface
— the white-matter, pial, inflated, spherical, and flattened surfaces all live
in this one type — and provides the read/write, geometry, topology, sampling,
and deformation machinery that every surface tool depends on. If a FreeSurfer
program reads a `?h.white`, inflates it, maps it to a sphere, registers it to an
atlas, places the pial, or samples a volume onto a surface, it does so through
`MRIS`.

The library is unusually large and is **split across seventeen
`utils/mrisurf_*.cpp` files** by responsibility. The structs themselves are not
hand-written in a header — they are emitted into a *generated* header,
`include/mrisurf_FACE_VERTEX_MRIS_generated.h`, while `include/mrisurf.h` holds
the ~2,700-line public API. The central design decision a developer must
internalise is that **one `MRIS` carries many coordinate systems at once**:
geometry (the current `x,y,z` plus cached copies for white/pial/inflated/
canonical/original) is kept separate from topology (who neighbours whom), and
"the surface" is simply whichever coordinate set was last loaded into `x,y,z`.

## Source Layout

`mrisurf.h` includes `mrisurf_aaa.h` (constants, enums, the `VERTEX`/`FACE`/
`MRIS` typedefs) which in turn pulls in the generated struct bodies. The
implementation is partitioned as follows (line counts from `wc -l`):

| File | Lines | Contains |
|------|-------|----------|
| `include/mrisurf.h` | 2,669 | the public API (read/write, geometry, deformation, sampling, parameterisation, registration) |
| `include/mrisurf_FACE_VERTEX_MRIS_generated.h` | 539 | **the actual `VERTEX_TOPOLOGY`, `vertex_type_` (VERTEX), `face_type_` (FACE), and `MRIS` struct bodies** (generated, do not edit) |
| `include/mrisurf_aaa.h` | — | `MRIS_Status` enum, `VERTICES_PER_FACE`/`MAX_NEIGHBORS` constants, base typedefs |
| `utils/mrisurf_base.cpp` | 1,842 | allocation lifecycle: `MRISalloc`/`MRISoverAlloc`/`MRISfree`, `MRISreallocVerticesAndFaces`, rip-flag import/export |
| `utils/mrisurf_io.cpp` | 6,989 | surface, curvature, and overlay **read/write** (binary triangle/quad, ASCII, GIFTI, VTK, STL dispatch) |
| `utils/mrisurf_metricProperties.cpp` | 13,771 | **areas, normals, curvature, neighbour distances** — plus `MRISclone`, the vertex-position save/restore machinery, and `MRISvertexCoord2XYZ`. Documented at [[internal-mrisurf-metricproperties]] |
| `utils/mrisurf_topology.cpp` | 3,416 | neighbour structure (`vnum`/`v2num`/`v3num`, the `v[]` ring lists), Euler number, neighbourhood-size management |
| `utils/mri_topology.cpp` | 4,189 | volumetric/connectivity topology routines used by topology correction (genetic-algorithm tessellation support) |
| `utils/mrisurf_deform.cpp` | 5,699 | surface deformation primitives: `MRISapplyGradient`, `mrisProjectSurface`, position storage |
| `utils/mrisurf_integrate.cpp` | 3,107 | the gradient-descent **integration loop** `MRISintegrate` (clear → energy terms → average → step) |
| `utils/mrisurf_compute_dxyz.cpp` | 5,087 | the per-vertex **energy-gradient terms** that fill `v->dx,dy,dz` (spring, intensity, correlation, curvature, thickness, …) |
| `utils/mrisurf_timeStep.cpp` | 2,719 | the integration **time-step** strategies: `MRISmomentumTimeStep`, adaptive/asynchronous steps |
| `utils/mrisurf_sseTerms.cpp` | 3,151 | the matching **sum-of-squared-error (energy)** evaluators read by line minimisation |
| `utils/mrisurf_mri.cpp` | 10,515 | **surface↔volume sampling**: surface-RAS↔voxel transforms, `MRIScomputeBorderValues` (intensity-target search for white/pial placement) |
| `utils/mrisurf_defect.cpp` | 15,532 | **topology-defect correction**: `MRIScorrectTopology`, defect retessellation/matching |
| `utils/mrisurf_vals.cpp` | 4,217 | per-vertex **value/overlay** handling: `val`/`val2`/`marked` copy, average, import/export |
| `utils/mrisurf_project.cpp` | 466 | sphere/ellipsoid projection helpers used by `mrisProjectSurface` |

> [!gotcha] The structs are in a generated header, not in `mrisurf.h`
> `mrisurf.h` only `typedef`s the surface types
> ([`include/mrisurf_aaa.h:101-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_aaa.h#L101-L105)).
> The field-by-field definitions are emitted into
> [`include/mrisurf_FACE_VERTEX_MRIS_generated.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_FACE_VERTEX_MRIS_generated.h)
> and mirrored as `LIST_OF_*_ELTS` X-macros (used to auto-generate accessors).
> Grep there, not in `mrisurf.h`, when you need a field.

## Core Data Structures

A surface is a list of `nvertices` vertices and `nfaces` triangles
(`VERTICES_PER_FACE == 3`,
[`include/mrisurf_aaa.h:36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_aaa.h#L36)).
Crucially, **geometry and topology are stored in two parallel arrays**, indexed
by the same vertex number: `mris->vertices[vno]` holds the *geometry* (a
`VERTEX`) and `mris->vertices_topology[vno]` holds the *connectivity* (a
`VERTEX_TOPOLOGY`). This separation (the `SEPARATE_VERTEX_TOPOLOGY` model) exists
so the hot deformation loops touch only the small topology record and the
relevant coordinate fields, improving cache behaviour.

### `MRIS` — the surface

The outer struct opens (verbatim,
[`include/mrisurf_FACE_VERTEX_MRIS_generated.h:157-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_FACE_VERTEX_MRIS_generated.h#L157-L176)):

```c
struct MRIS {
    int                           nverticesFrozen          ;  //  # of vertices on surface is frozen
    int                           nvertices                ;  //  # of vertices on surface, change by calling MRISreallocVerticesAndFaces et al
    int                           nfaces                   ;  //  # of faces on surface, change by calling MRISreallocVerticesAndFaces et al
    bool                          faceAttachmentDeferred   ;  //  defer connecting faces to vertices for performance reasons
    int                           nedges                   ;  //  # of edges on surface
    int                           ncorners                 ;  //  # of triangle corners
    int                           nstrips                  ;
    pSeveralVERTEX_TOPOLOGY       vertices_topology        ;
    pSeveralVERTEX                vertices                 ;
    ...
    pSeveralFACE                  faces                    ;
```

Load-bearing fields beyond the arrays:

- **`status`** (`MRIS_Status`) — what kind of surface the current `x,y,z`
  represents: `MRIS_SURFACE` (a folded white/pial surface), `MRIS_SPHERE` /
  `MRIS_PARAMETERIZED_SPHERE`, `MRIS_PLANE`, `MRIS_ELLIPSOID`, `MRIS_RIGID_BODY`,
  `MRIS_PATCH` (= `MRIS_CUT`), etc.
  ([`include/mrisurf_aaa.h:67-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_aaa.h#L67-L87)).
  `status` controls projection (`mrisProjectSurface`), the distance formula, and
  the time-step branch. `origxyz_status` records the surface type the `orig*`
  coordinates came from, and `areCompatible`/`checkOrigXYZCompatible` guard
  against restoring incompatible `orig` positions.
- **`total_area`, `neg_area`, `avg_vertex_area`, `avg_vertex_dist`,
  `std_vertex_dist`, `Kmin/Kmax/Ktotal`, `Hmin/Hmax`, `max_curv/min_curv`** —
  cached scalar summaries written by metric-property computation; **stale after
  any vertex moves** until recomputed.
- **`vg`** (`VOL_GEOM`) — the volume geometry the surface was created from
  (usually `orig.mgz`); valid iff `vg.valid`. This anchors the surface to a
  scanner coordinate frame.
- **`useRealRAS`** — `0` (default): vertex positions are **surface/tkreg RAS**
  (a conformed-volume RAS with `c_(r,a,s)=0`); `1`: positions are scanner/real
  RAS
  ([`include/mrisurf_FACE_VERTEX_MRIS_generated.h:250`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_FACE_VERTEX_MRIS_generated.h#L250)).
  `orig_xyzspace` preserves the on-disk space before any conversion.
- **`m_sras2vox` / `mri_sras2vox`** — cached surface-RAS→voxel matrix and the MRI
  it was built for (see *Surface↔volume sampling*).
- **`nsize`, `max_nsize`, `nsizeMaxClock`, `dist_nsize`** — neighbourhood-size
  bookkeeping (see *Neighbourhood model*).
- **`max_vertices`/`max_faces`** — the allocated capacity, which can exceed
  `nvertices`/`nfaces` (over-allocation lets topology correction and ICO
  subdivision add vertices without reallocating).

### `VERTEX_TOPOLOGY` — who neighbours whom

Verbatim
([`include/mrisurf_FACE_VERTEX_MRIS_generated.h:20-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_FACE_VERTEX_MRIS_generated.h#L20-L35)):

```c
struct VERTEX_TOPOLOGY {
    pSeveralInt   f             ;  // size() is num.    array[v->num] the fno's of the neighboring faces
    pSeveralUchar n             ;  // size() is num.    array[v->num] the face.v[*] index for this vertex
    pSeveralInt   e             ;  //  edge state for neighboring vertices
    pSeveralInt   v             ;  // size() is vtotal.    array[v->vtotal or more] of vno, head sorted by hops
    short         vnum          ;  //  number of 1-hop neighbors    should use [p]VERTEXvnum(i)
    short         v2num         ;  //  number of 1, or 2-hop neighbors
    short         v3num         ;  //  number of 1,2,or 3-hop neighbors
    short         vtotal        ;  //  total # of neighbors. copy of vnum.nsizeCur
    short         nsizeMaxClock ;  //  copy of mris->nsizeMaxClock when v#num
    uchar         nsizeMax      ;  //  the max nsize that was used to fill in vnum etc
    uchar         nsizeCur      ;  //  index of the current v#num in vtotal
    uchar         num           ;  //  number of neighboring faces
};
```

This is the heart of the mesh connectivity:

- **`v[]`** is the neighbour list, **sorted by hop count**: the first `vnum`
  entries are 1-ring (directly edge-connected) neighbours, the first `v2num`
  are the 1- and 2-ring, the first `v3num` the 1-,2-, and 3-ring.
- **`vtotal`** is the number of neighbours *currently* in use, equal to
  whichever of `vnum`/`v2num`/`v3num` matches the current neighbourhood size
  (`nsizeCur`). Loops over neighbours iterate `for (n=0; n<vt->vtotal; n++)`.
- **`f[]`** (length `num`) lists the faces incident on the vertex; **`n[]`**
  records, for each such face, which corner (0/1/2) this vertex occupies — used
  to walk face geometry without searching.

### `VERTEX` — the geometry and per-vertex scalars

`vertex_type_` is large because it holds **every coordinate system and every
per-vertex scalar** a surface stage might need. The opening of the struct,
verbatim
([`include/mrisurf_FACE_VERTEX_MRIS_generated.h:37-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_FACE_VERTEX_MRIS_generated.h#L37-L100)):

```c
struct vertex_type_ {
    pSeveralFloat dist               ;  // size() is vtotal.    distance to neighboring vertices based on  xyz
    pSeveralFloat dist_orig          ;  // size() is vtotal.    distance to neighboring vertices based on origxyz
    ...
    float         x                  ;  //  current coordinates
    float         y                  ;  //  use MRISsetXYZ() to set
    float         z                  ;
    float         origx              ;  //  original coordinates, see also MRIS::origxyz_status
    float         origy              ;  //  use MRISsetOriginalXYZ(,
    float         origz              ;  //  or MRISsetOriginalXYZfromXYZ to set
    float         nx                 ;
    float         ny                 ;
    float         nz                 ;  //  curr normal
    ...
    float         dx                 ;
    float         dy                 ;
    float         dz                 ;  //  current change in position
    float         odx                ;
    float         ody                ;
    float         odz                ;  //  last change of position (for momentum, ...)
    ...
    float         curv               ;  //  curr curvature
    float         val                ;  //  scalar data value (file: rh.val, sig2-rh.w)
    ...
    float         cx                 ;
    float         cy                 ;
    float         cz                 ;  //  coordinates in canonical coordinate system
    ...
    float         pialx              ;
    float         pialy              ;
    float         pialz              ;  //  pial surface coordinates
    float         whitex             ;
    float         whitey             ;
    float         whitez             ;  //  white surface coordinates
    ...
    float         infx               ;
    float         infy               ;
    float         infz               ;  //  inflated coordinates
    ...
```

The coordinate fields are the key to the whole library:

| Field set | Meaning | Read/written via |
|-----------|---------|------------------|
| `x,y,z` | **the current surface** — whatever was last loaded/restored | `MRISsetXYZ`; `CURRENT_VERTICES` |
| `origx,y,z` | the "original" reference (typically the white surface at start of a stage) | `MRISsaveVertexPositions(.., ORIGINAL_VERTICES)`; `ORIGINAL_VERTICES` |
| `whitex,y,z` / `pialx,y,z` | cached white / pial positions for thickness and placement | `WHITE_VERTICES` / `PIAL_VERTICES` |
| `cx,cy,cz` | **canonical / spherical** coordinates (the sphere) | `CANONICAL_VERTICES` |
| `infx,y,z` / `fx,fy,fz` | inflated / flattened positions | `INFLATED_VERTICES` / `FLATTENED_VERTICES` |
| `tx,ty,tz` / `t2x..` / `targx..` | scratch and intensity-target positions | `TMP_/TMP2_/TARGET_VERTICES` |
| `nx,ny,nz` (`pnx..`,`wnx..`,`onx..`) | current / pial / white / original **normals** | `VERTEX_NORMALS`, … |
| `dx,dy,dz` | the current gradient/displacement accumulated by energy terms | filled by `mrisurf_compute_dxyz.cpp` |
| `odx,ody,odz` | the previous step (momentum memory) | `MRISmomentumTimeStep` |

Per-vertex scalars also live here: `curv`/`K`/`H`/`k1`/`k2` (curvatures),
`val`/`val2`/`imag_val`/`stat`/`mean`/`std_error` (overlay/statistical data),
`area`/`origarea` (incident-area), `annotation`, the basis vectors `e1*,e2*` of
the local tangent plane, and flags `ripflag`/`border`/`marked`/`neg`. `ripflag`
is the single most consulted flag: a ripped vertex (or face) is skipped by
essentially every loop.

> [!math] The `dist[]` and `dist_orig[]` arrays
> Each vertex caches the distances to its `vtotal` neighbours under the current
> geometry (`dist`) and under the original geometry (`dist_orig`). These are the
> raw material for the **distance-preservation energy** of spherical
> registration. They are invalidated whenever vertices move and are managed by
> `MRISmakeDists`/`MRISfreeDists`; `MRISsetXYZ` deliberately frees them so they
> cannot be read stale.

## Capabilities

Grouped by the file that owns them:

- **Lifecycle (`mrisurf_base.cpp`).** `MRISalloc(nv,nf)` →
  `MRISoverAlloc(maxv,maxf,nv,nf)` →`MRISctr`
  ([`utils/mrisurf_base.cpp:751-765`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_base.cpp#L751-L765));
  `MRISfree`
  ([`utils/mrisurf_base.cpp:767-773`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_base.cpp#L767-L773));
  `MRISreallocVerticesAndFaces`
  ([`utils/mrisurf_base.cpp:645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_base.cpp#L645)).
  `MRISclone`
  ([`utils/mrisurf_metricProperties.cpp:13284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_metricProperties.cpp#L13284))
  is a deep copy of geometry **and** derived data.
- **I/O (`mrisurf_io.cpp`).** `MRISread`/`MRISreadOverAlloc`/`MRISfastRead`
  (binary triangle, binary quad, ASCII, GIFTI/VTK/STL, dispatched on a magic
  number); `MRISwrite`; the coordinate-set readers
  (`MRISreadWhiteCoordinates`, `MRISreadPialCoordinates`,
  `MRISreadCanonicalCoordinates`, `MRISreadOriginalProperties`,
  `MRISreadInflatedCoordinates`) which load a *named* coordinate set into its
  cache; and curvature/overlay readers (`MRISreadCurvatureFile`,
  `MRISreadValues`, `MRISreadAnnotation`). File-format byte layout: see
  [[surface-format]].
- **Topology (`mrisurf_topology.cpp`, `mri_topology.cpp`).**
  `mrisCompleteTopology`
  ([`utils/mrisurf_topology.cpp:2525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_topology.cpp#L2525))
  builds the neighbour and face-incidence structure from the raw face list;
  `MRISsetNeighborhoodSizeAndDist` / `MRISresetNeighborhoodSize` select the
  active ring; `MRIScomputeEulerNumber`
  ([`utils/mrisurf_topology.cpp:528`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_topology.cpp#L528))
  and `MRIStopologicalDefectIndex` measure topology.
- **Geometry (`mrisurf_metricProperties.cpp`).** `MRIScomputeMetricProperties`
  (areas, normals, neighbour distances, cached totals) and
  `MRIScomputeSecondFundamentalForm` (curvature). Fully documented at
  [[internal-mrisurf-metricproperties]].
- **Deformation (`mrisurf_deform.cpp`, `mrisurf_integrate.cpp`,
  `mrisurf_compute_dxyz.cpp`, `mrisurf_timeStep.cpp`, `mrisurf_sseTerms.cpp`).**
  `MRISintegrate` drives the loop; `mrisurf_compute_dxyz.cpp` fills `v->dx,dy,dz`;
  `MRISmomentumTimeStep`/`MRISapplyGradient` move vertices; `mrisProjectSurface`
  re-imposes the surface's geometric constraint (e.g. keeps a sphere spherical).
- **Sampling (`mrisurf_mri.cpp`).** `MRISsurfaceRASToVoxel[Cached]` and
  `MRISvertexToVoxel` convert surface points to volume indices;
  `MRIScomputeBorderValues` searches the intensity profile along the normal to
  find the white/pial target. Used heavily by [[mris_place_surface]] and
  [[mris_make_surfaces]].
- **Values (`mrisurf_vals.cpp`).** `MRISsetVals`, `MRISaverageVals`,
  `MRIScopyValToVal2`, `MRISexportValVector`, `MRISclearMarks` — manipulate the
  per-vertex `val`/`val2`/`marked` scalars used as overlays and intermediate
  results.

## Algorithms and Mathematical Foundations

### The deformation / integration loop

Every surface that is *evolved* — inflation, spherical mapping, registration,
white/pial placement — is moved by a **gradient-descent integration** of an
energy functional, orchestrated by `MRISintegrate`
([`utils/mrisurf_integrate.cpp:407`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_integrate.cpp#L407)).
The energy $E = \sum_k \lambda_k E_k$ is a weighted sum of terms (spring,
area/angle distortion, distance preservation, intensity matching, curvature,
correlation-to-atlas, thickness, …), each enabled by its weight `parms->l_*`.

One iteration (verbatim structure,
[`utils/mrisurf_integrate.cpp:562-633`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_integrate.cpp#L562-L633)):

1. **`MRISclearGradient`** — zero every `v->dx,dy,dz`.
2. **Accumulate energy gradients** into `dx,dy,dz`: `mrisComputeDistanceTerm`,
   `mrisComputeAngleAreaTerms`, `mrisComputeCorrelationTerm`,
   `mrisComputeSpringTerm`, `mrisComputeQuadraticCurvatureTerm`,
   `mrisComputeThickness*Term`, … (the term functions live in
   `mrisurf_compute_dxyz.cpp`). Each term computes
   $\partial E_k/\partial \mathbf{x}_i$ and adds $-\lambda_k$ times it.
3. **`MRISaverageGradients(mris, n_averages)`** — smooth the gradient field over
   the neighbourhood, which regularises the motion (more averaging early, less
   later).
4. **Take a step** according to `parms->integration_type`: line minimisation
   (`mrisLineMinimize`, the default), momentum
   (`MRISmomentumTimeStep`), or adaptive (`mrisAdaptiveTimeStep`).

Before the loop, and implicitly after each move, the surface is reprojected and
its metric properties refreshed
([`utils/mrisurf_integrate.cpp:449-451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_integrate.cpp#L449-L451)):
`mrisProjectSurface(mris)` then `MRIScomputeMetricProperties(mris)` — the latter
comment even notes it "can change XYZ slightly".

### The momentum time step

`MRISmomentumTimeStep`
([`utils/mrisurf_timeStep.cpp:888`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_timeStep.cpp#L888))
implements the canonical update with a time constant scaled by the averaging
count, $\delta t = \mathrm{dt}\sqrt{n_{\mathrm{avg}}+1}$:

$$
\mathbf{o}_i \leftarrow \delta t\,\mathbf{d}_i + \mu\,\mathbf{o}_i,\qquad
\mathbf{x}_i \leftarrow \mathbf{x}_i + \mathbf{o}_i
$$

where $\mathbf{d}_i=(dx,dy,dz)$ is the current gradient, $\mathbf{o}_i=(odx,ody,odz)$
is the accumulated momentum, and $\mu$ is `parms->momentum`. The step magnitude
is clamped to `MAX_MOMENTUM_MM`, and the actual move is committed through
**`MRISsetXYZ`**, after which `mrisProjectSurface` re-imposes the surface
constraint
([`utils/mrisurf_timeStep.cpp:945-985`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_timeStep.cpp#L945-L985)).
Note this routine first calls `MRISfreeDistsButNotOrig` because moving vertices
invalidates the cached neighbour distances.

`MRISapplyGradient`
([`utils/mrisurf_deform.cpp:948`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_deform.cpp#L948))
is the simpler primitive used by the line-minimisers: it `MRISstoreCurrentPositions`
then translates each vertex by `dt` along its `(dx,dy,dz)` (or rotates the whole
body for `MRIS_RIGID_BODY`), so a trial step can be evaluated and rolled back.

### Topology and the Euler number

The mesh is a closed 2-manifold; for a correctly reconstructed hemisphere it
must be a topological sphere with **Euler number $\chi = V - E + F = 2$**,
computed directly as `nvertices - nedges + nfaces`
([`utils/mrisurf_topology.cpp:557`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_topology.cpp#L557)),
where edges are counted once via the neighbour lists. Any deviation indicates a
**topological defect** (a handle or hole). Correcting these is the job of
`mrisurf_defect.cpp`: `MRIScorrectTopology`
([`utils/mrisurf_defect.cpp:7825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_defect.cpp#L7825))
locates each defect and retessellates it, choosing the tessellation that best
matches the underlying intensity/curvature evidence (the genetic-algorithm
method of Ségonne et al.). See [[topology-correction]].

### Surface↔volume sampling and the RAS frames

To read a volume at a vertex, the surface point (in **surface RAS**) must be
mapped to **voxel** indices. `MRISsurfaceRASToVoxelCached`
([`utils/mrisurf_mri.cpp:7377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_mri.cpp#L7377))
builds and caches the matrix once on `mris->m_sras2vox`:

$$
\text{SurfRAS}\to\text{Vox} \;=\; (\text{ScanRAS}\to\text{Vox})\cdot(\text{SurfRAS}\to\text{ScanRAS})
$$

i.e. `MatrixMultiply(m_ras2vox, m_sras2ras)`, where the surface-RAS→scanner-RAS
piece comes from `RASFromSurfaceRAS_` and re-uses `mris->vg` when valid
([`utils/mrisurf_mri.cpp:7435-7460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_mri.cpp#L7435-L7460)).
This is exactly the **surface (tkreg) RAS vs scanner RAS** distinction — see
[[coordinate-systems]]. The cache is invalidated and rebuilt if a different MRI
is passed.

## Invariants, Conventions, and Memory Model

- **Indexing is 0-based.** `vno ∈ [0, nvertices)`, `fno ∈ [0, nfaces)`;
  `face->v[0..2]` and `vt->v[0..vtotal)` are vertex numbers.
- **`x,y,z` is whatever was last loaded.** A single `MRIS` is reused across
  surfaces by saving the current geometry into a cache and restoring another:
  `MRISsaveVertexPositions(mris, which)` copies `x,y,z` → the named cache, and
  `MRISrestoreVertexPositions(mris, which)` copies it back
  ([`utils/mrisurf_metricProperties.cpp:3170-3312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_metricProperties.cpp#L3170-L3312)).
  `MRISvertexCoord2XYZ(v, which, &x,&y,&z)` reads a *named* coordinate set
  without disturbing `x,y,z`
  ([`utils/mrisurf_metricProperties.cpp:3721-3750`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_metricProperties.cpp#L3721-L3750)).
  The integer selectors (`CURRENT_VERTICES=4`, `WHITE_VERTICES=9`,
  `PIAL_VERTICES=7`, `ORIGINAL_VERTICES=0`, `CANONICAL_VERTICES=3`,
  `INFLATED_VERTICES=5`, …) are defined at
  [`include/mrisurf.h:1025-1041`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf.h#L1025-L1041).
  A lighter-weight push/pop (`MRISsaveXYZ`/`MRISpopXYZ`) exists for the common
  save-restore-`x,y,z` case
  ([`include/mrisurf.h:1047-1051`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf.h#L1047-L1051)).
- **Always set positions through `MRISsetXYZ`**
  ([`include/mrisurf.h:2236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf.h#L2236)),
  not by writing `v->x` directly. The macro invalidates cached neighbour
  distances and tracks that derived quantities are now stale. Likewise use
  `MRISsetOriginalXYZ`/`MRISsetOriginalXYZfromXYZ` for `orig*`.
- **Derived data is cached and must be recomputed after moving vertices.** Areas,
  face/vertex normals, curvatures, neighbour distances (`dist`), and the `MRIS`
  scalar totals (`total_area`, `avg_vertex_dist`, …) are **not** updated by
  `MRISsetXYZ`. Call `MRIScomputeMetricProperties(mris)`
  ([`utils/mrisurf_metricProperties.cpp:1844`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_metricProperties.cpp#L1844))
  before reading any of them. It dispatches to a "faster" implementation when
  `FS_FASTER_MP` is set in the environment, and to legacy/new code paths via
  `FREESURFER_OLD/NEW_MRIScomputeMetricProperties`.
- **Neighbourhood-size state must stay consistent.** `vtotal`/`nsizeCur` on each
  vertex, and `nsize`/`nsizeMaxClock` on the `MRIS`, define which ring is active.
  Editing edges changes `nsizeMaxClock`, invalidating cached `v#num`. After
  reading a surface, `MRISread` computes neighbours out to 3 rings then resets
  the active size to 1
  ([`utils/mrisurf_io.cpp:4274-4275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4274-L4275)).
- **Memory ownership.** `MRISalloc`/`MRISoverAlloc` own all arrays; `MRISfree`
  releases them. `MRISclone` allocates a fresh surface and copies geometry,
  topology, and derived data
  ([`utils/mrisurf_metricProperties.cpp:13284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_metricProperties.cpp#L13284)).
  Over-allocation (`max_vertices > nvertices`) reserves room for tessellation to
  grow the mesh in place.
- **Coordinate frame on load.** By default `useRealRAS==0` and positions are
  surface/tkreg RAS; if a surface was written in scanner space, `MRISread`
  converts it to tkreg via `MRISscanner2Tkr` (recording the original space in
  `orig_xyzspace`)
  ([`utils/mrisurf_io.cpp:4257-4272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_io.cpp#L4257-L4272)).

> [!gotcha] `MRISsetXYZ` is mandatory for moving vertices
> Writing `v->x = ...` directly leaves the cached neighbour distances and the
> "metric properties are valid" bookkeeping out of sync, so subsequent energy or
> distance terms silently use stale data. Move vertices only via `MRISsetXYZ`,
> then call `MRIScomputeMetricProperties` before reading any geometry.

> [!gotcha] `MRISclone` shares transform pointers
> `MRISclone` copies the `lta`, `SRASToTalSRAS_`, and `TalSRASToSRAS_`
> **pointers** and sets `free_transform = 0` on the copy, with a source comment
> warning the original may still free them (reference counting is missing)
> ([`utils/mrisurf_metricProperties.cpp:13329-13334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisurf_metricProperties.cpp#L13329-L13334)).
> Do not free the source while a clone is alive.

## Consumers

Essentially every surface tool. Notably:

- **[[mris_inflate]]** and **[[mris_sphere]]** — drive `MRISintegrate` to inflate
  the white surface and map it to a sphere, reading/writing `infx*`/`cx*`.
- **[[mris_register]]** — spherical registration via the correlation +
  distance-preservation energy terms; reads `dist`/`dist_orig` and the canonical
  coordinates.
- **[[mris_make_surfaces]]** / **[[mris_place_surface]]** — white/pial placement;
  use `MRIScomputeBorderValues` (intensity-target search) and the surface↔volume
  sampling in `mrisurf_mri.cpp`.
- **[[topology-correction]]** (`mris_fix_topology`) — `MRIScorrectTopology`.
- **[[mris_smooth]]** and the morphometry/overlay tools — neighbourhood
  averaging and per-vertex `val` handling.

Blast radius: a change to the `MRIS` struct layout, the neighbourhood model, the
save/restore selectors, or the metric-property contract ripples through all of
the above.

## Related Internals

- [[internal-mrisurf-metricproperties]] — areas, normals, curvature, distances,
  the save/restore and `MRISvertexCoord2XYZ` machinery (this page links there
  rather than duplicating the geometry math).
- [[internal-matrix]] — the `MATRIX` type underlying every RAS↔voxel transform
  (`m_sras2vox`, the Talairach matrices).
- [[internal-gcamorph]] — the volumetric-warp counterpart; surfaces and the
  `GCAM` are the two main deformable representations in FreeSurfer.

## Gotchas and Sharp Edges

- **The struct fields are generated.** Edit
  `mrisurf_FACE_VERTEX_MRIS_generated.h`? No — it is generated and an X-macro
  list (`LIST_OF_VERTEX_ELTS`, …) must stay in sync. Treat it as read-only.
- **Many `which` selectors, one `x,y,z`.** The same integer space serves both
  position selectors (`PIAL_VERTICES=7`) and normal selectors
  (`VERTEX_NORMALS=12`, `PIAL_NORMALS=13`, `WHITE_NORMALS=14`); pass the wrong
  one to `MRISvertexCoord2XYZ` and you silently read normals as positions.
- **Env-var-switched implementations.** `MRIScomputeMetricProperties`,
  `MRISsurfaceRASToVoxelCached`, `mrisCompleteTopology`, and `MRISreadOverAlloc`
  each pick between "old"/"new"/"faster" code paths from environment variables
  (`FS_FASTER_MP`, `FREESURFER_OLD/NEW_*`, `mrisCompleteTopology_new`, …). When a
  surface bug reproduces only on one machine, check these.
- **`status` is load-bearing but easy to forget.** Projection, the distance
  formula, and the time-step branch all switch on `mris->status`; restoring a
  cached coordinate set does **not** by itself change `status`, so a sphere
  loaded into `x,y,z` while `status==MRIS_SURFACE` will be deformed with the
  wrong constraints.

## Confidence and Gaps

> [!gap] Breadth over depth in the deformation and defect code
> This page maps the integration loop and the momentum step in detail but does
> not derive every energy term in `mrisurf_compute_dxyz.cpp`/`mrisurf_sseTerms.cpp`,
> nor the full defect-retessellation search in `mrisurf_defect.cpp`. A developer
> working inside those files should read them directly; the per-term math is a
> natural follow-on page.

> [!gap] `MRIScomputeNormals` definition not line-located
> `MRIScomputeNormals` is called throughout but its definition appears to be
> generated/macro-expanded; this page cites `MRIScomputeMetricProperties` (which
> recomputes normals among the other metric properties) as the canonical
> "recompute after moving" entry point.

## References

- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: Inflation,
  flattening, and a surface-based coordinate system.* NeuroImage 9(2):195-207 —
  the inflation/spherical-mapping energy framework integrated here.
- Ségonne, Pacheco & Fischl (2007), *Geometrically accurate topology-correction
  of cortical surfaces using nonseparating loops.* IEEE TMI 26(4):518-529 — the
  defect-correction method in `mrisurf_defect.cpp`.
- Canonical headers:
  [`include/mrisurf.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf.h)
  (public API) and
  [`include/mrisurf_FACE_VERTEX_MRIS_generated.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrisurf_FACE_VERTEX_MRIS_generated.h)
  (struct bodies).
- [[surface-representations]], [[surface-format]] — what the surfaces and their
  on-disk encodings mean.
