---
title: "Surface Topology Correction"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mris_euler_number]]"
  - "[[mris_fix_topology]]"
  - "[[mris_topo_fixer]]"
  - "[[mris_sphere]]"
  - "[[mris_inflate]]"
  - "[[mris_defects_pointset]]"
  - "[[recon-all]]"
  - "[[freeview-surfaces]]"
related_concepts:
  - "[[surface-representations]]"
related_formats:
  - "[[surface-format]]"
  - "[[curv-format]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - topology
  - surface
  - defects
  - euler-number
---

# Surface Topology Correction

## Overview

FreeSurfer reconstructs cortical surfaces by tessellating the boundary between
white matter and grey matter. The resulting triangulated mesh must be
topologically equivalent to a sphere — that is, homeomorphic to $S^2$ — before
downstream processing steps such as spherical mapping and atlas registration can
be applied. In practice, the raw tessellation produced from MRI data almost
always contains topological defects: handles (toroidal shortcuts that create
tunnels through the surface) and holes (missing or degenerate triangulations
that leave the surface open). These arise from imaging noise, partial-volume
effects at gyral crowns, and from thin white-matter bridges that
connect geometrically adjacent but topologically distinct gyri.

The topology correction step detects these defects and repairs them. Two tools
implement topology correction in FreeSurfer:

- **`mris_fix_topology`** — the primary method used by `recon-all`. It detects
  defects in spherical space and retessellates each defect region using a
  maximal spanning tree algorithm, optionally extended by a genetic search.
- **`mris_topo_fixer`** — a patch-based alternative that cuts out defective
  regions and fills them with optimal triangulations. It is used as a fallback
  when `mris_fix_topology` fails (i.e., when the corrected surface still has
  non-zero topological defect index).

Both methods require a quick spherical mapping (`qsphere.nofix`), produced by
`mris_sphere -q`, to locate defects in spherical space.

---

## The Euler Characteristic

### Definition

For a closed, connected triangulated surface, the **Euler characteristic** is:

$$\chi = V - E + F$$

where $V$ is the number of vertices, $E$ is the number of edges, and $F$ is
the number of triangular faces. The Euler characteristic is a topological
invariant: it depends only on the topology of the surface, not on its geometry
or the particular triangulation.

For a surface homeomorphic to a sphere (genus 0, no handles, no holes):

$$\chi = 2$$

For a closed surface of genus $g$ (i.e., with $g$ handles):

$$\chi = 2 - 2g$$

Additional relations hold for valid triangulated manifolds:

$$F = 2V - 4 \quad \text{(for a sphere; i.e., Euler's formula for polyhedra)}$$
$$2E = 3F \quad \text{(each edge is shared by exactly 2 faces; each face has 3 edges)}$$

`mris_euler_number` reports both conditions alongside $\chi$, flagging
violations with `!`.

### Relationship to Defects

Each topological handle reduces $\chi$ by 2. If the surface has $n$ independent
topological defects (each equivalent to one handle or hole that eliminates one
handle of $\chi$), then:

$$\chi = 2 - 2n \implies n = \frac{2 - \chi}{2} = 1 - \frac{\chi}{2}$$

The tool `mris_euler_number` prints this directly as the "holes" count:

```
euler # = v-e+f = 2g-2: <V> - <E> + <F> = <χ> --> <n> holes
```

where the code computes `1 - eno/2` (source: `mris_euler_number.cpp`, line 91).

> [!gotcha] The "holes" count is not the defect index
> `mris_euler_number` reports `1 - χ/2` as "holes", which equals the number of
> topological handles. This is distinct from the **total defect index**, which
> also accounts for violations of the Euler manifold identity $2E = 3F$ and is
> computed as `|2 - χ| + |2E - 3F|` (source: `MRIStopologicalDefectIndex()` in
> `utils/mrisurf_topology.cpp`, lines 562–595). The defect index is zero if and
> only if the surface is a valid genus-0 closed triangulated manifold. `recon-all`
> checks the defect index (not the holes count) to determine whether topology
> correction succeeded.

### Implementation

`MRIScomputeEulerNumber()` in `utils/mrisurf_topology.cpp` (line 528) counts
non-ripped vertices, edges (counted once per pair using `vno < vnb`), and faces,
then returns `V - E + F`. The function is called both by `mris_euler_number` and
internally by `mris_fix_topology` and `mris_topo_fixer` to report progress.

`MRIStopologicalDefectIndex()` (line 562) additionally computes the manifold
consistency check and returns `|2 - χ| + |2E - 3F|`. A value of 0 certifies
both that $\chi = 2$ and that every edge is shared by exactly two faces.

### Typical Values in Practice

A raw tessellation of a cortical hemisphere before topology correction typically
has a negative Euler characteristic, indicating multiple handles. The exact
value varies with scan quality and brain anatomy; surfaces with 10–50 handles
are common. After successful correction, $\chi = 2$ and the defect index is 0.

---

## Types of Defects

### Handles (Toroidal Shortcuts)

A handle is a topological tunnel that passes through the interior of the surface,
connecting two otherwise separate regions. In MRI cortical reconstruction, handles
arise from thin white-matter bridges that link adjacent gyri: the tessellator
traces the WM/GM boundary and creates a tube of triangles connecting the two
gyral walls. Topologically, this is equivalent to attaching a cylinder between
two discs — adding a handle to the sphere and reducing $\chi$ by 2.

Handles are the most common defect type in cortical surfaces. In spherical space
(qsphere), a handle appears as a region where the spherical map folds back on
itself: faces in this region overlap each other when projected onto the sphere,
making their vertices "ambiguous" — they could map to multiple locations.

### Holes

A hole is a region where the triangulated surface is open — faces are missing,
or vertices are incorrectly shared, so the surface has a boundary (a 1D loop of
edges with only one adjacent face). Holes reduce $\chi$ and violate the edge
manifold condition $2E = 3F$. In practice, holes in cortical tessellations are
less common than handles and typically arise from very noisy data or failures in
the initial WM segmentation.

---

## mris_fix_topology: Sphere-Based Correction (Primary Method)

### Inputs

- `?h.qsphere.nofix` — the quick spherical mapping of the defective surface,
  produced by `mris_sphere -q`. This provides the canonical (spherical)
  coordinates used for defect detection.
- `?h.inflated.nofix` — the inflated surface (produced by `mris_inflate` from
  `smoothwm.nofix`), stored as TMP_VERTICES during processing.
- `?h.orig.nofix` — the original tessellation with defects, stored as
  ORIGINAL_VERTICES.
- `mri/brain.mgz` — the skull-stripped brain volume, used for MRI-based
  retessellation scoring.
- `mri/wm.mgz` — the white matter segmentation, used for MRI-based retessellation
  scoring.

All inputs are read relative to `$SUBJECTS_DIR/<subject>/`. The filenames are
configurable via command-line flags but the defaults match what `recon-all`
produces.

### Algorithm

The core algorithm is implemented in `MRIScorrectTopology()` in
`utils/mrisurf_defect.cpp` (line 7825). The steps are:

1. **Spherical centering.** The canonical (spherical) vertex positions from
   `qsphere.nofix` are centred using `MRIScenterSphere()`.

2. **Defect detection in spherical space.** `MRISmarkAmbiguousVertices()` (line
   9005 in `mrisurf_defect.cpp`) builds a face hash table and, for every
   triangular face, finds all other faces whose edges overlap it in spherical
   space (i.e., projected onto the unit sphere, the edges of two different
   faces cross). Any vertex belonging to a face involved in at least one such
   overlap is marked "ambiguous". The spherical projection makes the defects
   visible as non-injective regions.

3. **Defect segmentation.** `MRISsegmentDefects()` (line 9134) groups connected
   ambiguous vertices into individual defect regions using connected-component
   labelling in the ambiguous mark set. Each connected component is one defect.

4. **Boundary and convex hull identification.** For each defect, the bordering
   non-ambiguous vertices (the "convex hull" in spherical space) are identified.
   These boundary vertices define where the retessellation must join back to the
   intact surface.

5. **Intensity statistics computation.** Before retessellation, histograms of
   principal curvatures ($k_1$, $k_2$), the normal dot product with its
   neighbours, and grey/white intensity values are computed over the non-defective
   vertices. These distributions are used as prior terms in the retessellation
   cost function.

6. **Defect files written.** Three curvature-format overlay files are written to
   `surf/`:
   - `defect_labels` — integer label (1-indexed) per defect vertex
   - `defect_borders` — border vertices for each defect
   - `defect_chull` — convex hull vertices

7. **Retessellation of each defect.** For each defect region, the inside vertices
   are removed from the working surface. A new triangulation is found that covers
   the hole left by the removed vertices while maintaining spherical validity (no
   edge intersections in spherical space). The retessellation objective function
   balances:
   - `l_mri` (default 1.0): MRI intensity likelihood on the surface
   - `l_unmri` (default 1.0; 10.0 in genetic search mode): volumetric MRI
     intensity likelihood
   - `l_curv` (default 1.0): surface normal orientation likelihood
   - `l_qcurv` (default 1.0): quadratic curvature likelihood
   The search for an optimal retessellation uses one of three modes (set via
   `parms.search_mode`):
   - **Greedy search** (default): a deterministic spanning tree approach that
     greedily accepts the lowest-cost retessellation at each step.
   - **Random search**: random retessellations for a fixed number of iterations.
   - **Genetic search** (`-ga` or `-optimize` flag): an evolutionary algorithm
     that maintains a population of candidate retessellations and evolves them
     across generations. This is what `recon-all` uses by default (flag:
     `set FixWithGA = 1`, recon-all line 143).

8. **Post-correction cleanup.** After all defects are retessellated:
   - `MRISremoveIntersections()` is called (unless `-int` flag is given) to
     remove geometric self-intersections from the corrected surface.
   - Long edges are subdivided iteratively until all edges are shorter than
     $1.5 \times 8 / 2^k$ mm (source: `mris_fix_topology.cpp`, line 289–290).
   - The final surface is written to `?h.orig` (or the name specified by `-out`).

### Key Configuration Parameters

| Flag | Default | Description |
|------|---------|-------------|
| `-sphere <name>` | `qsphere.nofix` | Name of the spherical surface to use for defect detection |
| `-inflated <name>` | `inflated.nofix` | Name of the inflated surface (TMP_VERTICES) |
| `-orig <name>` | `orig.nofix` | Name of the defective surface (ORIGINAL_VERTICES) |
| `-out <name>` | `orig` | Name of the output corrected surface |
| `-brain <name>` | `brain` | Name of the brain volume (in `mri/`) |
| `-wm <name>` | `wm` | Name of the WM segmentation (in `mri/`) |
| `-ga` | off | Use genetic algorithm (same as `-optimize`) |
| `-optimize` | off | Genetic search with recommended parameters |
| `-s <n>` | 5 | Number of smoothing iterations on the corrected surface |
| `-sphere_smooth <n>` | 5 | Smoothing iterations on the spherical map before use |
| `-mri <w>` | 1.0 | Weight for surface MRI log-likelihood |
| `-unmri <w>` | 1.0 | Weight for volumetric MRI log-likelihood (auto-enables `vol 2`) |
| `-curv <w>` | 1.0 | Weight for normal dot log-likelihood |
| `-qcurv <w>` | 1.0 | Weight for quadratic curvature log-likelihood |
| `-patches <n>` | 10 | Genetic: candidate patches per generation |
| `-generations <n>` | 10 | Genetic: stop after n generations without improvement |
| `-niters <n>` | -1 | Stop genetic search after n total iterations (unlimited if -1) |
| `-correct_defect <n>` | -1 | Correct only defect number n (all defects if -1) |
| `-int` | off | Disable the `MRISremoveIntersections` post-processing step |
| `-noadd` | off | Skip long-edge subdivision after retessellation |
| `-threads <n>` | varies | Set OMP thread count (recon-all forces `-threads 1`) |
| `-seed <n>` | time-based | RNG seed for reproducibility |
| `-defect <name>` | `defect` | Basename for defect overlay output files |
| `-suffix <s>` | (none) | Append suffix to all output filenames |
| `-wi` | off | Also write corrected inflated surface |
| `-sdir <path>` | `$SUBJECTS_DIR` | Override subjects directory |
| `-mgz` / `-nomgz` | MGZ on | Whether MRI volumes are in MGZ format |
| `-diag` | off | Save diagnostic information |
| `-diagonly` | off | Save diagnostics and exit without correcting |
| `-verbose` | off | Verbose logging (multiple levels: `-verbose`, `-verbose_low`, `-warnings`, `-errors`) |

### Output Files

- `surf/?h.orig` — topologically corrected surface (the primary output)
- `surf/?h.defect_labels` — per-vertex curvature-format overlay: integer defect
  number for each defect vertex (0 = not a defect)
- `surf/?h.defect_borders` — per-vertex overlay: border vertices of each defect
- `surf/?h.defect_chull` — per-vertex overlay: convex hull vertices of each defect

---

## mris_topo_fixer: Patch-Based Correction (Fallback Method)

`mris_topo_fixer` (source: `mris_topo_fixer/mris_topo_fixer.cpp`, original
author: Florent Segonne) implements an alternative topology correction strategy.
Rather than the spanning-tree retessellation of `mris_fix_topology`, it replaces
each defective patch with an optimised triangulation computed in 3D space, guided
by local intensity statistics. The paper reference is the same as for
`mris_fix_topology`: Segonne et al. (2005) IPMI.

### Key Differences from mris_fix_topology

| Aspect | `mris_fix_topology` | `mris_topo_fixer` |
|--------|--------------------|--------------------|
| Primary defect representation | Spherical (qsphere.nofix) | Spherical (qsphere), with 3D patch optimisation |
| Retessellation | Maximal spanning tree + optional genetic search | Patch disk triangulations with attempt-based search |
| Default search mode | Greedy (deterministic) | Attempt-based (stochastic) |
| Handles multi-component surfaces | No — assumes single connected component | Yes — extracts largest component automatically |
| Input surface name | `orig.nofix` | `orig.nofix` (configurable via `-orig_name`) |
| Output surface name | `orig` | `orig_corrected` (configurable via `-out_name`) |
| Self-intersection check | Via `MRISremoveIntersections` | Explicit self-intersection check before and after |
| Patch geometry | Pre-tessellated disk templates (4 sizes) | Patch disks with 4 levels |

### Algorithm

1. **Validity checks.** The tool first checks that the input surface is a valid
   manifold (`MRISisSurfaceValid`) and that it has exactly one connected component
   (`MRISextractMainComponent`). If the surface has multiple components, the
   largest is extracted; `mris_fix_topology` would fail in this case.

2. **Defect identification in spherical space.** `MRISidentifyDefects()` (in
   `utils/mrisurf_defect.cpp`, line 3438) marks ambiguous vertices using
   `MRISmarkAmbiguousVertices()` and segments connected components into a
   `DEFECT_LIST` structure, following the same logic as in `MRIScorrectTopology`.

3. **Defect labelling written.** The defect overlay is written to
   `surf/?h.defects` as a curvature-format file (one integer per vertex,
   identifying which defect the vertex belongs to).

4. **Per-defect patch correction.** For each defect, `MRIScorrectDefect()` is
   called. This function cuts the defective region out of the surface and
   attempts to fill it with one of the pre-computed patch disk templates. The
   filling optimises a cost function that includes:
   - `l_curv` (default 4.0): surface orientation (normal dot) likelihood
   - `l_unmri` (default 1.0): volumetric MRI intensity likelihood
   - `l_mri` (default 0.0): surface MRI likelihood (disabled by default)
   - `l_qcurv` (default 0.0): quadratic curvature (disabled by default)

5. **Post-correction.** After all defects are processed, `MRISremoveIntersections`
   is called if `parms.no_self_intersections` is set (default: true).

### Key Configuration Parameters

| Flag | Default | Description |
|------|---------|-------------|
| `-orig_name <name>` | `orig` | Input surface name |
| `-out_name <name>` | `orig_corrected` | Output surface name |
| `-fast` | off | Fast mode (less thorough search) |
| `-minimal` | off | Cut minimal loop only (minimal topology change) |
| `-mri <w>` | 0.0 | Surface MRI log-likelihood weight |
| `-unmri <w>` | 1.0 | Volumetric MRI log-likelihood weight |
| `-curv <w>` | 4.0 | Surface normal orientation weight |
| `-qcurv <w>` | 0.0 | Quadratic curvature weight |
| `-pct <f>` | 0.15 | Fraction of random attempts relative to patch size |
| `-nmin <n>` | 10 | Minimum number of attempts per defect |
| `-loop_pct <f>` | 0.4 | Fraction of the minimal loop to cut |
| `-smooth <n>` | 0 | Smooth the patch after correction |
| `-match <0/1>` | 1 | Match patch to surface using local intensity estimates |
| `-no_intersection` | on | Avoid self-intersecting patches |
| `-int` | off | Disable post-correction intersection removal |
| `-inverted_contrast` | off | Use inverted MRI contrast (for non-standard data) |
| `-detect_contrast` | on | Auto-detect contrast inversion |
| `-usual_contrast` | off | Force standard (non-inverted) contrast |
| `-asc` | off | Write output surface in ASCII format |
| `-seed <n>` | time-based | RNG seed for reproducibility |
| `-sdir <path>` | `$SUBJECTS_DIR` | Override subjects directory |
| `-mgz` | on | Volumes in MGZ format |
| `-verbose` / `-verbose_low` / `-warnings` / `-errors` | minimal | Verbosity level |

### When to Use mris_topo_fixer

In `recon-all`, `mris_topo_fixer` is invoked automatically if `mris_fix_topology`
leaves any surface with a non-zero defect index. It can also be selected as the
primary fixer via the `-use-new-fixer` recon-all flag. `mris_topo_fixer` has an
advantage when the surface has multiple connected components (it extracts the
largest automatically) or when `mris_fix_topology` consistently fails on a
particular subject.

> [!gotcha] mris_topo_fixer output name differs
> The default output name for `mris_topo_fixer` is `orig_corrected`, not `orig`.
> When `recon-all` calls it as a fallback, it specifies `-out_name orig`
> explicitly (recon-all, line 3809) to match the expected filename.

---

## The QSphere Step

### Purpose

Before topology correction can operate, a spherical mapping of the defective
surface is required. This is produced by `mris_sphere -q`, which runs a **quick**
(low-iteration) spherical inflation rather than the full, high-quality spherical
mapping used for atlas registration.

The quick sphere (`-q` flag, implemented in `mris_sphere.cpp` via
`MRISquickSphere()`) uses:
- Only 3 inflation passes (`max_passes = 3`)
- Reduced smoothing (`parms.n_averages = 32`, vs. 1024 for the full sphere)
- Loose convergence tolerance (`parms.tol = 1e-1`)
- Non-linear area distortion penalty (`parms.l_nlarea = 1.0`)
- No negative-face removal (`remove_negative = 0`)

This produces a spherical mapping that is fast and only approximately correct,
but sufficient to make topological defects visible as overlapping regions in
spherical space. The resulting surface is saved as `?h.qsphere.nofix`.

### Relationship to mris_fix_topology

`mris_fix_topology` reads `qsphere.nofix` and immediately projects all vertices
onto the unit sphere (`MRISprojectOntoSphere(mris, mris, 100.0f)`), then applies
a small number of spherical smoothing steps (`sphere_smooth = 5` by default).
The key invariant is that vertex numbering is shared between `orig.nofix` and
`qsphere.nofix`: vertex $i$ in `qsphere.nofix` corresponds to the same cortical
location as vertex $i$ in `orig.nofix`. This correspondence allows `mris_fix_topology`
to detect defects in spherical space while correcting them in the original 3D
space.

---

## The recon-all Workflow

Topology correction sits within the `autorecon2` stage of `recon-all`, between
the initial surface inflation and the final spherical registration. The sequence
of operations, with relevant recon-all stage names and line numbers in the
`scripts/recon-all` script, is:

```
[autorecon2]

mris_smooth -nw orig.nofix → smoothwm.nofix      (lines 3622–3638, -smooth1 stage)
mris_inflate -no-save-sulc smoothwm.nofix → inflated.nofix  (lines 3658–3670, -inflate1 stage)

mris_sphere -q -p 6 -a 128                        (lines 3690–3703, -qsphere stage)
    inflated.nofix → qsphere.nofix

mris_fix_topology -threads 1 -ga -mgz \           (lines 3732–3737, -fix stage)
    -sphere qsphere.nofix \
    -inflated inflated.nofix \
    -orig orig.nofix \
    -out orig
    <subjid> <hemi> → orig

[if mris_fix_topology failed (defect index != 0):]
mris_topo_fixer -orig_name orig.nofix \           (lines 3809–3812)
    -out_name orig -mgz -warnings
    <subjid> <hemi> → orig

[always:]
mris_remove_intersection orig → orig              (lines 3847–3849)

[subsequent stages in autorecon2:]
mri_make_surfaces → white, smoothwm, inflated ...
mris_sphere → sphere
mris_register → sphere.reg
...
```

The `defect2seg` command (line 3783) converts the defect labels into an MGZ
segmentation volume for quality control.

The `recon-all` variable `UseOldTopoFix = 1` (line 157) controls whether
`mris_fix_topology` is attempted first. The `UseNewTopoFix` variable is set
to 1 only when the old fixer fails.

> [!gotcha] recon-all forces single-threaded mris_fix_topology
> The comment in `recon-all` (line 3728–3730) notes that `mris_fix_topology`
> became non-deterministic with multiple threads on a subset of subjects.
> Therefore, `recon-all` always passes `-threads 1` to `mris_fix_topology`.
> This is a significant runtime consideration: topology correction on a complex
> hemisphere can take 30–90 minutes when single-threaded.

---

## Quality Assessment

### Checking the Euler Number

After topology correction, verify the corrected surface:

```bash
mris_euler_number $SUBJECTS_DIR/<subject>/surf/lh.orig
```

Expected output for a successfully corrected surface:
```
euler # = v-e+f = 2g-2: <V> - <E> + <F> = 2 --> 0 holes
      F =2V-4:          <F> = <2V>-4 (<diff>)
      2E=3F:            <2E> = <3F> (<diff>)

total defect index = 0
```

If `total defect index = 0`, topology correction succeeded and the surface is a
valid genus-0 closed triangulated manifold. If it is non-zero, the surface still
has defects.

The number of remaining topological handles (if non-zero) is `1 - χ/2`.

### The defect_* Overlay Files

After running `mris_fix_topology`, the following surface overlay files are
available in `surf/`:

- `?h.defect_labels` — every vertex that belonged to a defect is assigned a
  positive integer equal to its defect number. Non-defect vertices have value 0.
  This can be loaded in [[freeview-surfaces]] as a curvature overlay on `?h.orig.nofix` to
  visualise where defects were found.
- `?h.defect_borders` — the boundary ring of each defect region.
- `?h.defect_chull` — the convex hull of each defect in spherical space.

`mris_defects_pointset` (source: `mris_defects_pointset/mris_defects_pointset.cpp`)
converts the `defect_labels` overlay into a JSON pointset file, computing the
centroid of each defect in scanner RAS coordinates. This allows the defects to
be displayed as 3D control points in [[freeview-pointsets|freeview]].

### Visualisation in [[freeview-surfaces|freeview]]

```bash
freeview -f $SUBJECTS_DIR/<subject>/surf/lh.orig.nofix \
             :overlay=surf/lh.defect_labels \
         -f $SUBJECTS_DIR/<subject>/surf/lh.orig
```

Geometric self-intersections in `lh.orig` (distinct from topological defects)
can be identified visually by looking for regions where the surface folds back
on itself.

---

## Gotchas and Caveats

> [!gotcha] χ is not the defect count
> `mris_euler_number` prints "N holes" where N = `1 - χ/2`. This is the number
> of topological handles. However, `recon-all` uses the **total defect index**
> (= `|2 - χ| + |2E - 3F|`) to decide if topology correction succeeded. The
> defect index is zero if and only if $\chi = 2$ and the manifold condition
> $2E = 3F$ holds. A surface with $\chi = 2$ but with edge-sharing violations
> will have a non-zero defect index and be treated as failed.

> [!gotcha] Topological validity ≠ geometric validity
> A surface with $\chi = 2$ and defect index 0 is topologically correct but may
> still contain geometric self-intersections — regions where the surface passes
> through itself in 3D space. Self-intersections do not change $\chi$ because
> the triangulation adjacency is unchanged; they are a geometric artefact.
> FreeSurfer addresses these separately via `mris_remove_intersection` (called at
> the end of the `-fix` stage). Self-intersections can cause failures in
> subsequent steps like `mris_make_surfaces`.

> [!gotcha] nofix surfaces are intentionally defective
> The suffix `.nofix` on surfaces such as `orig.nofix`, `smoothwm.nofix`,
> `inflated.nofix`, and `qsphere.nofix` indicates that these surfaces intentionally
> retain the original topological defects. They are intermediate files produced
> before topology correction and are required as input to the topology correction
> step. Do not use `.nofix` surfaces for downstream analysis or as substitutes
> for the corrected surfaces.

> [!gotcha] mris_fix_topology can fail silently from the user's perspective
> If `mris_fix_topology` cannot fully resolve a defect, it writes an `orig`
> surface with the residual defects intact (and a non-zero defect index).
> `recon-all` detects this by running `mris_euler_number` on the output and
> checking the defect index. It then automatically re-runs `mris_topo_fixer`
> on the failed hemisphere only. If both fixers fail, `recon-all` will continue
> past the fix stage with a topologically invalid surface, which may cause
> downstream failures in spherical mapping.

> [!gotcha] The -ga flag changes algorithm and parameter defaults
> Passing `-ga` (or `-optimize`) to `mris_fix_topology` switches from greedy
> search to the genetic algorithm and also changes several other parameters:
> `vertex_eliminate=1`, `initial_selection=1`, `smooth=2`, `match=1`,
> `volume_resolution=2`, `l_unmri=10.0`, `nsmooth=0`, `add=0`. These cannot
> be individually overridden once `-ga` is set, since the flag sets all of them
> together. Use the individual flags if you need fine-grained control.

> [!gotcha] Genetic search is non-deterministic without -seed
> By default, `mris_fix_topology` seeds its random number generator from the
> current time. This means two runs on the same data may produce different
> corrected surfaces. `recon-all` passes `-seed <RngSeed>` when
> `$NoRandomness = 1` (the default) to ensure reproducibility.

---

## Related Pages

- [[mris_euler_number]] — compute $\chi$, diagnose defects
- [[mris_fix_topology]] — primary topology correction tool
- [[mris_topo_fixer]] — patch-based alternative corrector
- [[mris_sphere]] — produces `qsphere.nofix` via the `-q` flag
- [[mris_inflate]] — produces `inflated.nofix` used by mris_fix_topology
- [[mris_defects_pointset]] — converts defect labels to a 3D pointset
- [[surface-representations]] — context for what cortical surfaces are and why topology matters
- [[recon-all]] — the orchestrating pipeline

---

## Confidence and Gaps

**High confidence (from source code):**
- The formula $\chi = V - E + F$ and the implementation in `MRIScomputeEulerNumber()`
- The defect index formula and its zero-condition meaning
- The defect detection algorithm: ambiguous vertex marking via face overlap in
  spherical space, then connected-component segmentation
- The exact input/output filenames used by `recon-all`
- The `-ga` flag behaviour and parameter overrides
- The automatic fallback from `mris_fix_topology` to `mris_topo_fixer`
- The output defect overlay files written by `MRIScorrectTopology()`
- The forced single-thread execution in `recon-all`

**Medium confidence (inferred from code structure):**
- The genetic algorithm details (population size, crossover, mutation) — the
  `MRISfixTopology` function calls into deeper routines not fully traced here
- The exact scoring function used in `MRIScorrectDefect()` for `mris_topo_fixer`

> [!gap] Genetic algorithm internals not fully traced
> The `GENETIC_SEARCH` mode in `MRIScorrectTopology()` calls retessellation
> subroutines that were not fully read for this page. The exact genetic operators
> (selection pressure, crossover mechanism, mutation rate) are described in
> Segonne et al. (2005) but have not been cross-verified against the source code.

> [!gap] Typical Euler numbers before correction
> The range of $\chi$ values observed before topology correction in typical
> healthy adult cortical tessellations was not verified from the source code.
> Empirical values from the literature (commonly reported as 0–50 handles per
> hemisphere) may differ across FreeSurfer versions and tessellation parameters.

---

## References

- Segonne, F., Grimson, E., & Fischl, B. (2003). Topology correction of
  subcortical segmentation. *Proceedings of MICCAI 2003*. (Cited in
  `mris_fix_topology.cpp` header.)
- Segonne, F., Grimson, E., & Fischl, B. (2005). Genetic algorithm for the
  topology correction of cortical surfaces. *Information Processing in Medical
  Imaging (IPMI)*, pp. 393–405. (Cited in both `mris_fix_topology.cpp` and
  `mris_topo_fixer.cpp` headers.)
- Source files read (FreeSurfer v8.2.0, read 2026-04-15):
  - `mris_euler_number/mris_euler_number.cpp`
  - `mris_fix_topology/mris_fix_topology.cpp`
  - `mris_topo_fixer/mris_topo_fixer.cpp`
  - `mris_defects_pointset/mris_defects_pointset.cpp`
  - `mris_sphere/mris_sphere.cpp`
  - `utils/mrisurf_topology.cpp` (functions `MRIScomputeEulerNumber`, `MRIStopologicalDefectIndex`)
  - `utils/mrisurf_defect.cpp` (functions `MRISmarkAmbiguousVertices`, `MRISsegmentDefects`, `MRISidentifyDefects`, `MRIScorrectTopology`)
  - `scripts/recon-all` (lines 143–158, 3620–3860)
