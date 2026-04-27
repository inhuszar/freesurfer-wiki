---
title: "Surface Morphometry — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 17
last_agent_update: 2026-04-27
tags:
  - faq
  - surface-morphometry
  - thickness
  - surface-area
  - sulcal-depth
  - vertex-area
  - euler-number
  - lgi
  - xhemi
  - mris_anatomical_stats
---

# Surface Morphometry — Frequently Asked Questions

This FAQ collects recurring questions about FreeSurfer's surface-based
morphometry — the per-vertex and per-region measures produced by
[[recon-all]] (cortical thickness, surface area, cortical volume,
sulcal depth, vertex area, mean and Gaussian curvature, folding and
intrinsic curvature indices, local gyrification index) and the
auxiliary tools that operate on the cortical surface meshes
([[mris_anatomical_stats]], [[mris_euler_number]],
[[mris_skeletonize]], [[mris_flatten]], [[mris_compute_lgi]],
[[mris_expand]], [[mris_info]]). It also covers vertex correspondence
across the multiple surface representations
([[hemi.white]], [[hemi.pial]], [[hemi.inflated]], [[hemi.sphere.reg]]),
and the [[fsaverage]] / `fsaverage_sym` / xhemi machinery used for
group statistics and laterality analyses.

> For tool reference, see the linked tool pages. For surface
> representations and the mesh-topology invariants that underpin all
> these measures, see [[surface-representations]].

---

## Surface measure definitions

### How is FreeSurfer sulcal depth (`?h.sulc`) computed?

**Short answer:** It is the accumulated signed normal displacement of
each vertex during inflation from the white surface to the inflated
surface — outward (gyral) motion adds positive values, inward (sulcal)
motion adds negative values.

**Detail:** During [[mris_inflate]], every vertex is moved iteratively
until the surface is smooth. At each step, the dot product of the
vertex's displacement vector with the local surface normal is
accumulated into `v->curv`; after inflation completes, that field is
zero-mean-centred and written as the [[hemi.sulc]] file. Positive
values mark gyral crowns (vertices that moved outward to flatten the
cortex), negative values mark sulcal fundi (vertices that moved
inward). It is **not** a Euclidean distance from the pial sheet to a
sulcal fundus; it is a path integral of normal motion during a
smoothing operation, so its units are unitless (per-iteration
displacement summed). The same field is one of the folding features
[[mris_register]] uses for spherical alignment.

```c
// utils/mrisurf_metricProperties.cpp, mrisTrackTotalDistanceNew()
nc = v->odx * v->nx + v->ody * v->ny + v->odz * v->nz;
v->curv += nc;
```

**Provenance:** Mailing list, 2024-02-06 (Bruce Fischl). See
`raw/mailing-list/2024-02-sulcal-depth-signed-normal-displacement-inflation.md`.
Code-verified: `utils/mrisurf_metricProperties.cpp` (`mrisTrackTotalDistanceNew`),
`mris_inflate/mris_inflate.cpp`.

**Related:** [[hemi.sulc]], [[mris_inflate]], [[hemi.inflated]],
[[hemi.curv]], [[mris_register]], [[surface-representations]]

---

### How is the per-vertex area in `?h.area` defined?

**Short answer:** Each vertex's area is one-third of the sum of the
areas of its adjacent triangular faces — not the average face area.

**Detail:** The formula `v->area = (sum of areas of adjacent faces) / 3`
is set in `utils/mrisurf_metricProperties_faster.cpp`, with the divisor
`vertex_area_fix_value = 3.0`. Each triangle distributes one-third of
its area to each of its three vertices, so summing all vertex areas
exactly reconstructs the total surface area. For a typical cortical
vertex with ~6 adjacent faces of approximately equal area `A`, the
vertex area is `~6A/3 = 2A` — twice the mean face area, not equal to
it.

> [!gotcha] Bruce Fischl described this on the mailing list as "the
> average area of the triangles it is attached to," but the code
> implements the 1/3-sum, not the mean. The two coincide only when
> the vertex has exactly three adjacent faces, which is rarely true
> on FreeSurfer cortical meshes. Use the 1/3-sum formula when
> interpreting per-vertex area programmatically.

Vertex area is meaningful as a local cortical-expansion measure, but
individual vertex values are noisy. Fischl recommends analyzing area
at the parcellation level (the SurfArea column of [[hemi.aparc.stats]])
or after mapping to [[fsaverage]] for group inference, not at single
vertices.

**Provenance:** Mailing list, 2024-11-12 to 2024-11-20 (Alex / Bruce
Fischl). See
`raw/mailing-list/2024-11-vertex-area-is-one-third-sum-of-adjacent-faces.md`.
Code-verified: `utils/mrisurf_metricProperties_faster.cpp`.

**Related:** [[hemi.area]], [[hemi.area.pial]], [[hemi.area.mid]],
[[mris_anatomical_stats]], [[surface-representations]]

---

### Should I use white-surface or pial-surface area for morphometric analysis?

**Short answer:** White surface area is the FreeSurfer default and is
preferred because its placement is independent of the pial surface and
therefore independent of [[hemi.thickness]] and [[hemi.volume]].

**Detail:** [[mris_anatomical_stats]] reports the white surface area
(SurfArea column in [[hemi.aparc.stats]]) by default, computed as the
sum of vertex areas over each parcel from the [[hemi.white]] mesh. The
white boundary is determined from WM/GM intensity contrast on the T1,
independently of the pial surface — so white area does not co-vary by
construction with thickness or with cortical volume (volume ≈ area ×
thickness, written to [[hemi.volume]]). Pial area ([[hemi.area.pial]])
correlates with thickness because gyral crowns expand pially as
thickness increases, and pial placement is more vulnerable to
boundary errors (dura, motion). Greve summarised: "We usually use the
white surface because its placement is independent of the placement
of the pial surface (and so independent of thickness and volume), but
it is really an empirical question." For studies whose hypothesis
explicitly concerns the outer cortical sheet (e.g. gyral expansion
with growth), pial area may be the appropriate dependent variable.

**Provenance:** Mailing list, 2023-12-12 to 2024-01-01 (Yang Hu /
Douglas Greve). See
`raw/mailing-list/2023-12-white-surface-area-preferred-over-pial-independent-of-thickness.md`.

**Related:** [[hemi.white]], [[hemi.pial]], [[hemi.area]],
[[hemi.area.pial]], [[hemi.thickness]], [[hemi.volume]],
[[mris_anatomical_stats]]

---

### How are the Folding Index (FI) and Intrinsic Curvature Index (ICI) in `mris_anatomical_stats` computed?

**Short answer:** ICI = sum(area × K) / 4π over vertices with positive
Gaussian curvature K; FI = sum(area × |k1| × (|k1| − |k2|)) / 4π over
all vertices, where k1, k2 are the principal curvatures with
|k1| ≥ |k2|.

**Detail:** Both are computed by `MRIScomputeCurvatureIndices()` in
`utils/mrisurf_metricProperties.cpp`. ICI integrates only positive
Gaussian curvature (convex / elliptic regions; saddle / hyperbolic
regions with K < 0 are excluded), normalised by 4π so that a perfect
sphere has ICI = 1 (Gauss–Bonnet). FI weights each vertex by the
larger principal-curvature magnitude times the difference between
the two principal curvatures, capturing anisotropic bending — it is
zero on a minimal surface (k1 = −k2) and large where one principal
direction dominates (gyral crowns). Both use the [[hemi.area]]
1/3-sum vertex area as the integration weight.

```cpp
// utils/mrisurf_metricProperties.cpp, MRIScomputeCurvatureIndices()
if (vertex->K > 0) ici += area * (double)vertex->K;
Kmax = fabs(k1); Kmin = fabs(k2);
fi += area * Kmax * (Kmax - Kmin);
*pfi  = fi  / (4.0 * M_PI);
*pici = ici / (4.0 * M_PI);
```

The whole-hemisphere values appear in the [[mris_anatomical_stats]]
header lines `folding index` and `intrinsic curvature index`; the
per-parcel `FoldInd` column in [[hemi.aparc.stats]] uses the same FI
formula summed over vertices in each parcel.

> [!gotcha] A separate function `MRIScomputeFolding()` computes
> `sum(area × (k1 − k2)²)` and is **not** the FI reported by
> `mris_anatomical_stats`. Do not conflate the two when reading the
> source.

**Provenance:** Mailing list, 2024-07-29 to 2024-08-05 (littlepotato /
Yujing Huang). See
`raw/mailing-list/2024-07-mris-anatomical-stats-fi-ici-formulas.md`.
Code-verified: `utils/mrisurf_metricProperties.cpp`
(`MRIScomputeCurvatureIndices`).

**Related:** [[mris_anatomical_stats]], [[hemi.area]],
[[hemi.aparc.stats]], [[hemi.curv]], [[surface-representations]]

---

## Vertex correspondence and inflation

### Do the inflated, white, pial, and sphere surfaces share the same vertex indexing?

**Short answer:** Yes — all surfaces for a given hemisphere of a given
subject share identical vertex and face indexing; vertex `i` is the
same anatomical vertex in every file.

**Detail:** Bruce Fischl and Doug Greve have both confirmed on the
mailing list that for a given hemisphere/subject, the meshes
[[hemi.white]], [[hemi.pial]], [[hemi.inflated]], [[hemi.sphere]],
[[hemi.sphere.reg]], and any flat patches share identical vertex and
face counts and ordering. This is what allows per-vertex overlays
(thickness, curvature, activation) to be computed on one surface and
displayed on another without resampling. Confirm with:

```bash
mris_info $SUBJECTS_DIR/SUBJECT/surf/lh.white | grep -i vert
mris_info $SUBJECTS_DIR/SUBJECT/surf/lh.inflated | grep -i vert
```

> [!gotcha] Vertex correspondence does **not** imply geometric
> correspondence. Inflation distorts geodesic distances (it is
> impossible to inflate a curved surface without metric distortion;
> [[mris_inflate]] minimises the distortion in its cost function but
> does not eliminate it). Use [[hemi.white]] or [[hemi.pial]] for
> distance, area, or registration measurements; use [[hemi.inflated]]
> for visualisation only.

**Provenance:** Mailing list, 2023-08-03 (Bruce Fischl) and
2023-09-28 to 2023-10-15 (Anne-Cecile Lesage / Douglas Greve). See
`raw/mailing-list/2023-08-mris-flatten-vertex-index-invariance-across-surfaces.md`,
`raw/mailing-list/2023-10-inflated-surface-vertex-correspondence-geodesic-distortion.md`.

**Related:** [[surface-representations]], [[hemi.white]], [[hemi.pial]],
[[hemi.inflated]], [[hemi.sphere.reg]], [[mris_inflate]]

---

### Is there an inverse function for `mris_flatten` to map flat-patch coordinates back to 3D?

**Short answer:** No dedicated inverse exists; none is needed —
because the flat patch shares vertex indices with [[hemi.white]] and
[[hemi.pial]], the "inverse" is a vertex-index lookup into any 3D
surface file.

**Detail:** [[mris_flatten]] preserves vertex correspondence between
the flat patch (e.g. `lh.patch.flat`) and every other surface for
that hemisphere. To recover the 3D location of a vertex you have
identified on the flat patch, simply index into the white or pial
mesh at the same vertex number:

```python
import nibabel as nib
flat,  _ = nib.freesurfer.read_geometry('lh.patch.flat')
white, _ = nib.freesurfer.read_geometry('lh.white')
v = 12345
flat_2d  = flat[v]    # (x, y, 0)
white_3d = white[v]   # (x, y, z) in 3D
```

Patch files (`.patch.flat`) only store the subset of vertices that
belong to the cut patch, but the indices stored in the file are the
global hemisphere indices and can be used directly as offsets into
the full surface arrays.

**Provenance:** Mailing list, 2023-08-03 (Bruce Fischl). See
`raw/mailing-list/2023-08-mris-flatten-vertex-index-invariance-across-surfaces.md`.

**Related:** [[mris_flatten]], [[mris_convert]], [[hemi.white]],
[[hemi.pial]], [[surface-representations]]

---

## Stats and group analysis

### Why does region surface area differ between `.aparc.stats` and values computed after resampling to fsaverage?

**Short answer:** [[mri_surf2surf]] resampling to [[fsaverage]] uses
barycentric interpolation which is not area-preserving; the values in
the native-space `?h.aparc.stats` file (computed directly by
[[mris_anatomical_stats]] on the subject's own mesh) are
authoritative.

**Detail:** Two pipelines exist for getting region surface areas:

| Pipeline | How area is computed | Authoritative? |
|----------|---------------------|----------------|
| [[hemi.aparc.stats]] from [[mris_anatomical_stats]] (native) | Sum of vertex areas inside each parcellation label, on the subject's own [[hemi.white]] mesh | YES |
| Resample [[hemi.area]] to [[fsaverage]] with [[mri_surf2surf]], then sum | Interpolated values, summed on the fsaverage mesh | NO |

The interpolation step smears values across vertices in a way that
does not preserve total area within a parcel. For group analyses,
extract per-subject native-space areas with [[aparcstats2table]] and
analyse those values:

```bash
aparcstats2table --subjects sub-001 sub-002 sub-003 \
                 --hemi lh --measure area \
                 --tablefile lh_area_table.txt
```

**Provenance:** Mailing list, 2023-08-28 (Douglas Greve). See
`raw/mailing-list/2023-08-surface-area-aparc-stats-vs-fsaverage-resampling-discrepancy.md`.

**Related:** [[mris_anatomical_stats]], [[hemi.aparc.stats]],
[[mri_surf2surf]], [[aparcstats2table]], [[fsaverage]],
[[hemi.area]]

---

### How do I sum left + right hemisphere ROI volumes (or areas) into a bilateral measure?

**Short answer:** There is no built-in FreeSurfer command for this —
you have to combine the per-hemisphere stats tables yourself, in
Python/R/MATLAB.

**Detail:** Greve confirmed on the mailing list: "You'll have to do
it by hand or maybe in matlab; you can use `fast_ldtable.m` to load in
the tables in matlab." The standard workflow is to extract
per-subject per-hemisphere tables with [[aparcstats2table]] and
[[asegstats2table]], then sum matched columns externally. Pandas
makes this convenient:

```python
import pandas as pd
lh = pd.read_csv('lh_area.txt', sep='\t').set_index('lh.aparc.area')
rh = pd.read_csv('rh_area.txt', sep='\t').set_index('rh.aparc.area')
bilateral = lh.values + rh.values
```

In MATLAB the equivalent uses `fast_ldtable.m` from
`$FREESURFER_HOME/matlab/`. There is no flag to [[mris_anatomical_stats]]
or [[asegstats2table]] that produces bilateral sums automatically.

**Provenance:** Mailing list, 2023-08-08 to 2023-08-09 (user
"1500787798" / Douglas Greve). See
`raw/mailing-list/2023-08-bilateral-roi-volume-fast-ldtable-matlab.md`.

**Related:** [[aparcstats2table]], [[asegstats2table]],
[[mri_segstats]], [[mris_anatomical_stats]]

---

### Why does `mri_vol2label` give vertex indices of `-1` on cerebellar (or other subcortical) regions?

**Short answer:** [[mri_vol2label]] sets vertex indices to `-1` when
the labelled structure has no associated cortical surface; the XYZ
coordinates remain valid and usable.

**Detail:** A FreeSurfer label file has rows of the form
`vertex_index R A S value`. Vertex indices are meaningful only when
the label is attached to a cortical surface mesh ([[hemi.white]],
[[hemi.pial]], etc.). FreeSurfer's standard [[recon-all]] generates
surfaces only for the cerebral cortex; the cerebellum, brainstem,
thalamus, and other subcortical structures have no surface
representation, so [[mri_vol2label]] writes `-1` as a sentinel
"no corresponding vertex" value. The XYZ columns still hold valid
RAS-space centroid coordinates, so the file is usable with
volume-based viewers and tools, but **not** with surface-only tools
like `mris_label2annot` or [[mri_label2label]] in surface mode. For
cerebellar ROI statistics use volumetric analysis ([[mri_segstats]]
on the cerebellar segmentation in [[aseg.mgz]] or a dedicated
cerebellar atlas such as SUIT).

**Provenance:** Mailing list, 2024-04-15 (Douglas Greve). See
`raw/mailing-list/2024-04-vol2label-cerebellum-vertices-minus1-no-surface.md`.

**Related:** [[mri_vol2label]], [[mri_segstats]], [[aseg.mgz]],
[[mri_label2label]], [[surface-representations]]

---

## Topology and quality

### How do I get the Euler number of a subject's surface, and how does it relate to the number of holes?

**Short answer:** Run `mris_euler_number <subject>/surf/?h.orig.nofix`;
the output line `euler # = v-e+f = 2g-2: ... --> N holes` directly
reports the Euler characteristic and the hole count. The relation is
`holes = 1 − eno/2`, equivalently `eno = 2 − 2·holes`.

**Detail:** [[mris_euler_number]] runs on a surface file (typically
`?h.orig.nofix`, before defect correction, to get the true topology
metric for QC). Sample output:

```
euler # = v-e+f = 2g-2: 154526 - 463668 + 309112 = -30 --> 16 holes
      F =2V-4:          309112 != 309052-4 (-64)
      2E=3F:            927336 = 927336 (0)
total defect index = 32
```

A topologically perfect sphere has `eno = 2` and `0` holes. The
`total defect index` at the end is
`abs(2 − eno) + abs(2·nedges − 3·nfaces)` — Euler-deviation plus a
manifold-consistency check on the triangulation
(`mris_euler_number/mris_euler_number.cpp`). After [[topology-correction]]
the post-fix surfaces report `0` holes; QC pipelines use the
combined (lh + rh) hole count from `?h.orig.nofix` as the defect
metric, often with a threshold around 200 combined holes.

**Provenance:** Mailing list, 2024-02-01 (Bruce Fischl). See
`raw/mailing-list/2024-02-mris-euler-number-output-holes-defect-index.md`.
Code-verified: `mris_euler_number/mris_euler_number.cpp`,
`utils/mrisurf_topology.cpp`.

**Related:** [[mris_euler_number]], [[topology-correction]],
[[hemi.orig.nofix]], [[mris_fix_topology]]

---

## Specific tools

### How do I label sulcal fundi on the cortical surface?

**Short answer:** Use [[mris_skeletonize]] — it is the dedicated
FreeSurfer tool for marking the skeletal lines of sulcal folds on a
surface; do not threshold curvature manually.

**Detail:** [[mris_skeletonize]] produces a surface annotation or
label that traces the deepest skeletal lines of sulci, computed from
the surface curvature/depth fields rather than a naive curvature
threshold. This is the recommended approach when, for example, you
want to extract DTI metrics within white matter at sulcal fundi:

1. Run [[mris_skeletonize]] to produce a fundi mask on the surface.
2. Use [[mri_surf2vol]] to project the surface mask into volumetric
   space (NIfTI).
3. Mask the DTI volume with the projected mask and extract statistics
   with [[mri_segstats]].

> [!gotcha] FreeSurfer's [[hemi.curv]] uses the convention that
> **positive** mean curvature marks sulci (concave) and negative
> marks gyri (convex), opposite to some other tools. Sulcal fundi
> correspond to the most-positive curvature values — but
> [[mris_skeletonize]] uses connectivity, not just thresholding, so
> it is the appropriate tool.

**Provenance:** Mailing list, 2023-08-09 to 2023-08-10 (Bluye Demessie /
Douglas Greve). See
`raw/mailing-list/2023-08-mris-skeletonize-sulcal-fundi-labeling.md`.

**Related:** [[mris_skeletonize]], [[mri_surf2vol]],
[[mri_segstats]], [[hemi.curv]]

---

### `recon-all -localGI` is failing — can I run the LGI step directly?

**Short answer:** Yes — `cd $SUBJECTS_DIR/SUBJECT/surf` and run
`mris_compute_lgi --i ?h.pial`; this produces the same `?h.pial_lgi`
files that `recon-all -localGI` would, bypassing the recon-all
dependency-check chain.

**Detail:** [[recon-all]] `-localGI` is a wrapper around
[[mris_compute_lgi]]. A known FS 8.0.0-beta failure on second-run
processing exits with `seg2cc: update not needed. Run with
--force-update to force an update`. Greve's recommended workaround
is to call [[mris_compute_lgi]] directly:

```bash
cd $SUBJECTS_DIR/SUBJECT/surf
mris_compute_lgi --i lh.pial
mris_compute_lgi --i rh.pial
```

Outputs `lh.pial_lgi` and `rh.pial_lgi` are written into the same
`surf/` directory and are equivalent to the recon-all output. Use
this when only the LGI overlay is missing, or when the seg2cc
dependency check blocks reprocessing.

**Provenance:** Mailing list, 2025-01-28 (Douglas Greve). See
`raw/mailing-list/2025-01-mris-compute-lgi-direct-alternative-to-recon-all-localgi.md`.

**Related:** [[mris_compute_lgi]], [[recon-all]], [[hemi.pial]]

---

### `recon-all -localGI` errors out with `freesurfer_read_surf` MATLAB errors — what's the fix?

**Short answer:** Replace `$FREESURFER_HOME/matlab/freesurfer_read_surf.m`
with the updated version (Greve attaches it on the mailing list);
the bug is incompatibility with MATLAB R2017a+ where `ver()` returns
a struct rather than a character vector.

**Detail:** Older `freesurfer_read_surf.m` ships with line 70:

```matlab
fprintf('FREESURFER_READ_SURF [v %s]\n', ver(11:15));
```

In MATLAB R2017a and later `ver()` returns a struct array, so
`ver(11:15)` returns a struct sub-array (not a substring), and
`fprintf` errors with `Function is not defined for 'struct' inputs`.
The minimal fix is:

```matlab
v = ver('MATLAB');
fprintf('FREESURFER_READ_SURF [v %s]\n', v(1).Version);
```

or simply remove the line. Greve distributes a patched version on
request; FS 7.2+ may include the fix in shipped builds, but older
7.x installations need to be patched manually. There is no
MATLAB-free alternative for the LGI computation, since
`mris_compute_lgi` shells out to MATLAB (or to MCR via
`fs_install_mcr`).

**Provenance:** Mailing list, 2023-11-22 to 2023-11-26 (Daiki
Sasabayashi / Douglas Greve). See
`raw/mailing-list/2023-11-lgi-localgi-freesurfer-read-surf-matlab-fix.md`.

**Related:** [[mris_compute_lgi]], [[recon-all]]

---

### How do I create an intermediate cortical surface (e.g. mid-thickness, equidistant layers)?

**Short answer:** Use [[mris_expand]] — `mris_expand -thickness lh.white
0.5 lh.mid` creates the half-thickness layer. Do **not** round-trip
through MATLAB `read_surf`/`write_surf`, which loses volume geometry.

**Detail:** [[mris_expand]] is purpose-built for moving a surface a
fixed Euclidean distance (no flag, mm) or a fixed fraction of cortical
thickness (`-thickness`, 0 = white, 1 = pial). It preserves the
volume-geometry header (vox2ras, voxel size) needed by downstream
FreeSurfer tools. Common usage:

```bash
mris_expand -thickness lh.white 0.5 lh.mid          # mid-thickness layer
mris_expand -thickness lh.white 0.25 lh.layer_25    # 25% from white
mris_expand -thickness lh.white 0.75 lh.layer_75    # 75% from white
```

> [!gotcha] Surfaces written by MATLAB's `read_surf` + `write_surf`
> (and some Python writers in `nibabel` / `surfa`) drop the volume
> geometry block. The resulting file loads with a "Did not find any
> volume info" warning in [[freeview]], and `mris_convert --angle`
> errors with "volume size must be greater than 0 in every
> dimension." When you need fully-geometry-preserving intermediate
> layers, use [[mris_expand]]; if you must use MATLAB/Python, copy
> the geometry header back from the source surface before writing.

**Provenance:** Mailing list, 2024-10-21 (Bruce Fischl). See
`raw/mailing-list/2024-10-mris-expand-preserves-volume-geometry-read-surf-does-not.md`.

**Related:** [[mris_expand]], [[hemi.area.mid]], [[hemi.white]],
[[hemi.pial]], [[mris_convert]]

---

### How do I query a single vertex's coordinates, area, and neighbours from the command line?

**Short answer:** Use `mris_info --vx <vertex_number> <surface_file>` —
it prints xyz coordinates, the normal, vertex area, the neighbour
count, and per-neighbour distance/area/face information.

**Detail:** [[mris_info]] with the `--vx` flag is Greve's recommended
command-line query for vertex topology:

```bash
mris_info --vx 1000 $SUBJECTS_DIR/SUBJECT/surf/lh.white
```

Output for vertex 1000 includes xyz (e.g. `-21.18 -74.96 37.78`),
normal, vertex area (e.g. `0.661`), and for each of its ~6 neighbours:
neighbour index, neighbour vertex number, distance, area value, face
number, face area. This is sufficient for scripting graph-based
surface filters without writing custom binding code; for batch use,
loop in shell or use the Python `nibabel` / `surfa` APIs for raw mesh
access.

**Provenance:** Mailing list, 2024-12-17 (Douglas Greve). See
`raw/mailing-list/2024-12-mris-info-vertex-neighborhood-query.md`.

**Related:** [[mris_info]], [[mris_convert]], [[surface-representations]]

---

## xhemi and laterality

### How do I compute a regional laterality index (LI) for cortical thickness?

**Short answer:** Register both hemispheres to `fsaverage_sym` (the
left as-is, the right via `--xhemi`), resample thickness to the
symmetric template with [[mris_apply_reg]], then compute LI per
vertex with `fscalc pctdiff0 ... div 200` and parcellate with
[[mri_segstats] --annot`.

**Detail:** `fsaverage_sym` is a left-right-symmetric surface
template; the `xhemi` machinery represents the right hemisphere as
a mirrored left hemisphere so both can register to the same template
and be compared vertex-by-vertex. Greve's confirmed pipeline:

```bash
# 1. Register both hemispheres to fsaverage_sym
surfreg --s $subject --t fsaverage_sym --lh --no-annot
surfreg --s $subject --t fsaverage_sym --lh --no-annot --xhemi
#   --xhemi creates $subject/xhemi/surf/lh.fsaverage_sym.sphere.reg

# 2. Resample thickness onto fsaverage_sym
mri_convert $subject/surf/lh.thickness $subject/surf/lh.thickness.mgh
mri_convert $subject/surf/rh.thickness $subject/surf/rh.thickness.mgh

mris_apply_reg \
  --src $subject/surf/lh.thickness.mgh \
  --trg $subject/surf/lh.thickness.lh.fsaverage_sym.mgh \
  --streg $subject/surf/lh.fsaverage_sym.sphere.reg \
          $SUBJECTS_DIR/fsaverage_sym/surf/lh.sphere.reg

mris_apply_reg \
  --src $subject/surf/rh.thickness.mgh \
  --trg $subject/surf/rh.thickness.lh.fsaverage_sym.mgh \
  --streg $subject/xhemi/surf/lh.fsaverage_sym.sphere.reg \
          $SUBJECTS_DIR/fsaverage_sym/surf/lh.sphere.reg

# 3. LI = 100*(lh-rh)/(lh+rh) on [-1, 1]
fscalc $subject/surf/lh.thickness.lh.fsaverage_sym.mgh pctdiff0 \
       $subject/surf/rh.thickness.lh.fsaverage_sym.mgh div 200 \
  -o $subject/surf/li.thickness.lh.fsaverage_sym.mgh

# 4. Parcellate
mri_segstats --annot fsaverage lh aparc \
  --i $subject/surf/li.thickness.lh.fsaverage_sym.mgh \
  --sum $subject/stats/li.thickness.aparc.stats
```

`fscalc pctdiff0` computes `100·(a − b) / (a + b + ε)`; the `div 200`
rescales to [-1, +1]. After resampling both hemispheres to
`fsaverage_sym`, LH and RH thickness values share vertex-by-vertex
correspondence on the symmetric template.

**Provenance:** Mailing list, 2023-11-27 to 2023-11-28 (Joost Janssen /
Douglas Greve). See
`raw/mailing-list/2023-11-xhemi-laterality-index-surfreg-fsaverage-sym.md`.

**Related:** [[mris_apply_reg]], [[mri_segstats]], [[fsaverage]],
[[hemi.thickness]], [[mris_register]], [[hemi.sphere.reg]]

---

### When mapping data from `fsaverage_sym` back to a subject's right hemisphere, which sphere registration files do I use?

**Short answer:** Both files in `--streg` are left-hemisphere files —
the source is `xhemi/surf/lh.fsaverage_sym.sphere.reg` (the rh
registered as a mirrored lh) and the target is
`fsaverage_sym/surf/lh.sphere.reg`. Using `rh.sphere.reg` from
`fsaverage_sym` is wrong.

**Detail:** The `xhemi` folder stores the right hemisphere as a
mirrored left hemisphere, so its `lh.fsaverage_sym.sphere.reg` IS the
right hemisphere's registration to the symmetric template. The
`fsaverage_sym` template itself only carries a left-hemisphere
sphere because, by symmetry, both hemispheres use the same target.
Greve's corrected example, now in the official xhemi documentation:

```bash
# RH: data from fsaverage_sym back to native subject rh
mris_apply_reg --src data_on_fsavgsym_hemi-R.gii \
               --trg data_native_rh.mgh \
               --streg $SUBJECTS_DIR/$subject/xhemi/surf/lh.fsaverage_sym.sphere.reg \
                       $SUBJECTS_DIR/fsaverage_sym/surf/lh.sphere.reg

# LH: data from fsaverage_sym back to native subject lh
mris_apply_reg --src data_on_fsavgsym_hemi-L.gii \
               --trg data_native_lh.mgh \
               --streg $SUBJECTS_DIR/$subject/surf/lh.fsaverage_sym.sphere.reg \
                       $SUBJECTS_DIR/fsaverage_sym/surf/lh.sphere.reg
```

`--streg` argument order is source-reg first, target-reg second.

> [!gotcha] The intuitive but incorrect choice — using
> `fsaverage_sym/surf/rh.sphere.reg` for the right hemisphere — gives
> wrong results because there is no separate rh template; the
> symmetric template uses the lh sphere for both sides.

**Provenance:** Mailing list, 2025-06-02 to 2025-06-03 (Felix Zahnert /
Douglas Greve). See
`raw/mailing-list/2025-06-fsaverage-sym-xhemi-rh-registration.md`.
Code-verified: `mris_apply_reg.help.xml` (lines 69–80, FS 8.2.0).

**Related:** [[mris_apply_reg]], [[mri_surf2surf]], [[fsaverage]],
[[hemi.sphere.reg]]

---

## Parcellation notes

### Why does FreeSurfer divide the corpus callosum into five segments — what is the anatomical rationale?

**Short answer:** There is none — Bruce Fischl confirmed the
five-segment division has no specific anatomical rationale; it is an
arbitrary equal-division along the anterior–posterior axis, and the
number is configurable.

**Detail:** The [[aseg.mgz]] segmentation labels CC into five sections
(labels 251–255: CC_Posterior, CC_Mid_Posterior, CC_Central,
CC_Mid_Anterior, CC_Anterior). Fischl's reply to the question
"what is the background or rationale behind the five segments" was
simply: "No particular rationale. It is configurable if you want
more/less." `mri_cc` (the segmentation tool) can produce a different
number of equal-sized A-P slices; the `-f` flag adds the fornix as a
separate label rather than merging it into the CC. Non-default counts
(e.g. 10) just make more equal slices — there is no biological
mapping to anatomical names. For studies that need anatomically
meaningful CC parcellations, use external schemes such as Witelson's
seven-subdivision atlas registered to subject space.

**Provenance:** Mailing list, 2023-12-14 (Bruce Fischl, Douglas Greve).
See
`raw/mailing-list/2023-12-corpus-callosum-five-segments-no-anatomical-rationale-configurable.md`.

**Related:** [[aseg.mgz]], [[parcellation-schemes]], [[color-lut]]
