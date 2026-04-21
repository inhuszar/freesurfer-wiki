---
title: "mri_surf2vol"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_surf2vol/mri_surf2vol.cpp"
  - "utils/resample.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mri_label2vol]]"
  - "[[surface-representations]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
  - "[[curv-format]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "MRIsurf2VolOpt (Method 1) ribbon mask filling across multiple overlapping surfaces not fully traced"
  - "nhits count bug in fillribbon mode documented from code comment but root cause not traced"
tags:
  - projection
  - surface
  - volume
  - resampling
---

# mri_surf2vol

## Summary

`mri_surf2vol` is the inverse of [[mri_vol2surf]]: it projects per-vertex
surface overlay values back into a volumetric space. Two methods are available.
**Method 1** (preferred, `--so`) fills voxels by looking up the closest surface
vertex for every voxel within the cortical ribbon — guaranteed to produce no
holes in the ribbon. **Method 2** (classic, `--surfval`) projects each vertex
position into voxel space and stamps its value there, optionally projecting
along the surface normal or filling the full cortical thickness ribbon by
iterating over projection fractions.

## Source Information

- **Language:** C++
- **Primary source:** `mri_surf2vol/mri_surf2vol.cpp` (1190 lines, author: Douglas N. Greve)
- **Core library:** `utils/resample.cpp` (`MRIsurf2VolOpt`, `MRImapSurf2VolClosest`, `MRIsurf2Vol`)
- **Binary location:** `$FREESURFER_HOME/bin/mri_surf2vol`

## Purpose and Context

`mri_surf2vol` is used to:

- Back-project cortical parcellation colours (from surface annotation) into
  volume space for visualisation or further volumetric analysis
- Fill the cortical ribbon with surface-derived values for registration or
  voxel-based morphometry
- Generate volumetric representations of surface measures (thickness, curvature)

Not called by [[recon-all]] directly.

## Inputs

### Method 1 (`--so`)

- `--so <surface> <overlay>` — one or more surface + overlay pairs
  (e.g., `--so lh.white lh.thickness.mgh --so rh.white rh.thickness.mgh`)
- `--lta <file>` — LTA registration to set output geometry; if omitted, output
  is in conformed space
- `--ribbon <file>` — explicit ribbon volume (default: reads
  `$SUBJECTS_DIR/<subject>/mri/ribbon.mgz`)

### Method 2 (`--surfval`)

- `--surfval` / `--sval` — per-vertex overlay file
- `--hemi lh|rh` — hemisphere
- `--reg <file>` — register.dat registration file
- `--template <vol>` — output volume template (sets geometry)

### Input Assumptions

> [!assumption] Surface RAS coordinate convention
> Surface vertex coordinates are in **Surface RAS** (tkregister RAS). The
> code always uses `MRIxfmCRS2XYZtkreg()` to build the coordinate transform,
> making the mapping consistent with FreeSurfer surfaces. See [[coordinate-systems]].

## Outputs

- `--o <vol>` — output volume in [[mgz]] or NIfTI format
- `--vtxvol <vol>` — vertex-number volume (for debugging; maps each voxel to
  the vertex it was assigned from)

## Mathematical Foundations

### Method 1: Ribbon-Based Filling (`MRIsurf2VolOpt`)

For every voxel in the output volume:

1. Check `ribbon.mgz`: only voxels with ribbon value 3 (lh cortex) or 42 (rh
   cortex) are processed.
2. Convert voxel CRS to Surface RAS:
   $$\mathbf{x}_\text{surf} = \mathbf{T}_\text{tkr} \cdot (c, r, s, 1)^T$$
   where $\mathbf{T}_\text{tkr} = \mathbf{M}_{\text{inv}(R)} \cdot \mathbf{M}_\text{tkr}$
3. Find the nearest vertex on each provided surface using a spatial hash table
   (`MHTfindClosestVertexNoXYZ`).
4. Assign the overlay value of the nearest vertex to this voxel.

When multiple surfaces are provided, the surface with the **closest** vertex
wins. This guarantees complete ribbon coverage with no holes.

### Method 2: Vertex Projection (`MRImapSurf2VolClosest` + `MRIsurf2Vol`)

**Step 1 — build vertex-to-voxel map** (`MRImapSurf2VolClosest`):

For each vertex $v$ with position $\mathbf{x}_v$ (Surface RAS):

1. Optionally project along normal: $\mathbf{x}_v' = \mathbf{x}_v + f \cdot \tau_v \cdot \hat{n}_v$
2. Map to voxel: $(c, r, s)^T = \mathbf{Q}_{a \to v} \cdot (\mathbf{x}_v', 1)^T$
   where $\mathbf{Q}_{a \to v} = \mathbf{T}_\text{vol}^{-1} \cdot \mathbf{R}_\text{tkr}$
3. Round to nearest integer CRS; if multiple vertices land on the same voxel,
   keep the one with smallest squared distance.

**Step 2 — copy values** (`MRIsurf2Vol`): For each voxel with an assigned
vertex, set `output[c,r,s] = surfval[vertex]`. Unmapped voxels remain 0.

**Ribbon filling** (`--fillribbon`): Repeats the process for
$f \in [\text{ProjFracStart}, \text{ProjFracStop}]$ step `ProjFracDelta`
(default: 0→1 by 0.05). A voxel takes the value of the **first** vertex that
maps to it (iterating from the outside normal inward). This produces fewer
holes than a single projection but is slower and the `nhits` count is unreliable.

## Configuration Options

The parser accepts the union of the flags listed below. Mode selection is
implicit: if any `--so` flag has been supplied (`narray > 0`) the program
takes the Method 1 code path and immediately exits after writing the output;
otherwise it falls through to Method 2, which has its own required-argument
checks (hemisphere, registration, template volume).

### Method 1 flags (`--so` / ribbon-fill)

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--so` | `surface overlay` | path path | — (repeatable) | Read a surface and a matching per-vertex overlay; appends them to the internal `surfarray` / `overlayarray`. May be specified multiple times (e.g. lh and rh). Presence of any `--so` switches the program into Method 1. |
| `--lta` | `ltafile` | path | none | LTA registration (anatomy → output volume); supplies output geometry and overrides `subject`. |
| `--subject` | `name` | string | none | Subject name; used to locate `$SUBJECTS_DIR/<subject>/mri/ribbon.mgz` when `--ribbon` is not given. |
| `--ribbon` | `ribbonfile` | path | `$SUBJECTS_DIR/<subject>/mri/ribbon.mgz` | Explicit ribbon volume; output geometry follows the ribbon when no LTA is supplied. |
| `--merge` | `vol` | path | none | After ribbon fill, every output voxel that is still 0 takes the value of the corresponding voxel in `vol` (frame-wise). |
| `--o` / `--outvol` | `outfile [fmt]` | path [str] | — (required) | Output volume. Optional second argument forces the format (e.g. `mgz`, `nii`). |
| `--add` | `val` | float | 0 | After ribbon fill, add this constant to every non-zero output voxel (also active in Method 2). |

### Method 2 flags (`--surfval` / vertex projection)

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--surfval` / `--sval` | `surfvalpath [fmt]` | path [str] | — (required unless `--mkmask`) | Per-vertex overlay file (curv, mgh, mgz, paint…). Optional second token forces the input format. |
| `--mkmask` | — | flag | off | Build a binary mask (vertex assignment indicator) instead of copying overlay values. Mutually exclusive with `--surfval`. |
| `--hemi` | `lh\|rh` | string | — (required) | Hemisphere; rejected if not exactly `lh` or `rh`. |
| `--surf` | `surfname` | string | `white` | Name of the surface under `$SUBJECTS_DIR/<subj>/surf/<hemi>.<surfname>`. |
| `--projfrac` | `frac` | float | 0 | Single-shot projection: move each vertex along the surface normal by `frac × thickness` before voxel mapping. |
| `--fillribbon` | — | flag | off | Iterate `projfrac` from `ProjFracStart` to `ProjFracStop` in steps of `ProjFracDelta` to fill the cortical ribbon. |
| `--fill-projfrac` | `start stop delta` | 3 × float | `0 1 0.05` | Set the iteration range for ribbon filling and implicitly enable `--fillribbon`. |
| `--reg` / `--volreg` | `regfile` | path | — (required unless `--identity`/`--fstal`) | Tkregister-style `register.dat` mapping anatomy (Surface RAS) to the output volume. |
| `--identity` / `--volregidentity` | `subjid` | string | off | Use a 4×4 identity matrix as the registration; `subjid` becomes the source subject. Mutually exclusive with `--reg`. |
| `--subject` | `name` | string | none | Override the source subject name read from the registration file (used to locate `mri/orig.mgz` and surfaces). |
| `--srcsubject` | `name` | string | none | Same as `--subject` but only sets the variable read out of the registration; legacy alias retained for older scripts. |
| `--template` | `tempvol [fmt]` | path [str] | — (required unless `--merge`/`--fstal`) | Output volume header template (geometry + precision). Optional second token forces the format. |
| `--fstal` | `res` | int (1 or 2) | none | Shortcut: sets registration to `$FREESURFER_HOME/average/mni305.cor.subfov<res>.reg` and template to the matching `mni305.cor.subfov<res>.mgz`. |
| `--merge` | `mergevol` | path | none | After projection, voxels with value 0 are replaced by `mergevol`. Also re-assigned to `tempvolpath`, so the merge volume becomes the geometry template. |
| `--o` / `--outvol` | `outfile [fmt]` | path [str] | — (required if no `--vtxvol`) | Output volume; optional explicit format. |
| `--vtxvol` | `vtxfile [fmt]` | path [str] | none | Save a single-frame volume whose voxel values are the (1-indexed) vertex numbers actually written into each voxel; useful for debugging projection coverage. |
| `--add` | `val` | float | 0 | Add this constant to every non-zero output voxel after projection. |

### Masking (both methods)

| Flag | Arguments | Default | Effect |
|------|-----------|---------|--------|
| `--mask-to-cortex` | — | off | Restrict output to vertices in `$SUBJECTS_DIR/<subj>/label/<hemi>.cortex.label`. |
| `--mask-to-label` | `labelfile` | none | Restrict output to vertices listed in the supplied label file. |
| `--mask` | `surfacemask` | none | Restrict output using a pre-loaded surface mask volume (`MRIread`). |

### Output geometry overrides (Method 2, vestigial)

These flags are parsed and stored in globals, then echoed by the run-time
parameter dump, but are **not** wired into the actual output volume
construction in v8.2.0 — geometry is always taken from the template (or merge)
volume. Treat them as no-ops unless future versions reactivate them.

| Flag | Arguments | Effect |
|------|-----------|--------|
| `--dim` | 3 × int | Sets `dim[0..2]` (unused). |
| `--res` | 3 × float | Sets voxel size `res[0..2]` (unused). |
| `--xyz0` | 3 × float | Sets RAS origin (unused). |
| `--cdircos` | 3 × float | Column direction cosines (unused). |
| `--rdircos` | 3 × float | Row direction cosines (unused). |
| `--sdircos` | 3 × float | Slice direction cosines (unused). |
| `--precision` | string | Output precision tag (unused). |

### Standalone subcommands (exit immediately)

| Flag | Arguments | Effect |
|------|-----------|--------|
| `--sphpvf` | `radius nvox voxsize fsubsamp icoorder outvol outsurf` | Generate a synthetic spherical partial-volume-fraction phantom by rasterising an icosahedron-derived sphere into a volume; writes `outvol` and `outsurf` and exits. Bypasses everything else. |
| `--flat2mri` | `surf patch overlay res avg output` | Resample a flat-patch surface overlay to a 2-D MRI image at resolution `res`; if `avg ≠ 0`, average overlapping vertices. Writes `output` and exits. |

### Diagnostics and environment

| Flag | Arguments | Default | Effect |
|------|-----------|---------|--------|
| `--sd` | `subjectsdir` | `$SUBJECTS_DIR` | Override the FreeSurfer subjects directory (also `setenv SUBJECTS_DIR`). |
| `--copy-ctab` | — | off | `setenv FS_COPY_HEADER_CTAB 1` so the output volume header carries the surface annotation colour table. |
| `--debug` | — | off | Echo each parsed token on the way through the option loop. |
| `--gdiagno` | `n` | -1 | Set the global `Gdiag_no` diagnostic level. |
| `--help` | — | — | Print the long help text and exit. |
| `--version` | — | — | Print the build version and exit. |

### Configuration Interactions

> [!gotcha] Mode selection by `--so`
> Method 1 is selected purely by the presence of at least one `--so` pair.
> When `narray > 0`, `check_options()` returns after only verifying that an
> output and a ribbon source exist; all Method 2 flags (`--hemi`, `--reg`,
> `--projfrac`, `--surfval`, `--template`, `--mkmask`, masking flags, …) are
> parsed but never used.

> [!gotcha] `--merge` implies `--template` in Method 2
> When `--merge` is specified, the merge volume is used as the geometry
> template. An explicit `--template` is ignored. This means specifying `--merge`
> without `--template` is safe, but `--template` after `--merge` has no effect.

> [!gotcha] `--identity` and `--reg` are mutually exclusive
> Specifying both causes a fatal error in `check_options()`. Conversely, in
> Method 2 you must supply exactly one of `--reg`, `--identity`, or `--fstal`
> (which sets the registration internally), otherwise the program aborts with
> "A volume registration file must be supplied".

> [!gotcha] `--fstal` overrides `--reg` and `--template`
> `--fstal <res>` sets both `volregfile` and `tempvolpath` to the bundled MNI305
> sub-FOV files. Any prior `--reg`/`--template` is overwritten; any subsequent
> `--reg`/`--template` overwrites the `--fstal` choice (last-wins, parser order).

> [!gotcha] `--fill-projfrac` implies `--fillribbon`
> Specifying `--fill-projfrac` sets `fillribbon = 1`. You do not need to specify
> `--fillribbon` separately.

> [!gotcha] `--mkmask` and `--surfval` are mutually exclusive
> `check_options()` aborts with "cannot make mask and spec surface value file"
> if both are given. `--mkmask` only makes sense in Method 2.

> [!gotcha] `--sphpvf` and `--flat2mri` short-circuit the program
> Both subcommands call `exit()` from inside the option parser. Any later
> arguments on the command line are ignored, and Method 1/Method 2 logic is
> never reached.

> [!gotcha] `nhits` is unreliable in fillribbon mode
> The code comment at line 373 explicitly flags that the `nhits` count is
> invalid when `fillribbon = 1` because the same voxel may be mapped by multiple
> projfrac iterations. The `--vtxvol` output is reliable and can be used for
> debugging.

> [!gotcha] Ribbon values 3 and 42 are hard-coded
> Method 1 processes only voxels where `ribbon.mgz` has value 3 (lh cortex) or
> 42 (rh cortex). Other ribbon values (WM, subcortical, CSF) are skipped. This
> is not configurable.

> [!gotcha] Method 1 and Method 2 flags do not interact
> When `--so` is provided (`narray > 0`), the Method 2 code path is bypassed
> entirely. Method 2 flags (`--hemi`, `--reg`, `--projfrac`, etc.) are silently
> ignored.

> [!gotcha] Masking flags are mutually exclusive
> `--mask-to-cortex`, `--mask-to-label`, and `--mask` cannot be combined (each
> pair is enforced in `check_options()`).

## Typical Use Cases

### Fill ribbon with thickness values (Method 1)

```bash
mri_surf2vol \
  --so $SUBJECTS_DIR/bert/surf/lh.white $SUBJECTS_DIR/bert/surf/lh.thickness \
  --so $SUBJECTS_DIR/bert/surf/rh.white $SUBJECTS_DIR/bert/surf/rh.thickness \
  --subject bert \
  --o bert_thickness_vol.mgz
```

### Back-project surface activation to volume (Method 2, fill ribbon)

```bash
mri_surf2vol \
  --surfval lh.stat.mgh \
  --hemi lh \
  --reg register.dat \
  --fillribbon \
  --template orig.mgz \
  --o lh_stat_vol.mgz
```

### Single-point projection (no ribbon fill)

```bash
mri_surf2vol \
  --surfval lh.label.mgh \
  --hemi lh \
  --reg register.dat \
  --projfrac 0.5 \
  --template orig.mgz \
  --o lh_label_vol.mgz
```

## Pipeline Context

Not called by [[recon-all]]. Used in analysis pipelines requiring volume-space
representations of surface-derived data.

**Inverse of:** [[mri_vol2surf]]

## Gotchas and Caveats

> [!gotcha] Method 1 is preferred for complete coverage
> Method 2 with a single projfrac will leave holes wherever no vertex maps to a
> voxel. `--fillribbon` reduces (but does not eliminate) holes. Method 1
> (`--so`) is hole-free by construction and should be used when possible.

> [!gotcha] Surface RAS convention — same as mri_vol2surf
> Vertex positions are in Surface RAS. The registration file maps from Surface
> RAS (anatomy space) to the output volume space. This is the same convention
> as [[mri_vol2surf]], making the two tools inverses of each other when the same
> registration is used.

## Related Tools

- [[mri_vol2surf]] — forward direction: volume → surface
- [[mri_label2vol]] — similar purpose but specifically for label files and
  annotations; also handles segmentation volumes
- [[surface-representations]] — describes the white surface and cortical ribbon
- [[coordinate-systems]] — Surface RAS, tkregister convention

## Confidence and Gaps

High confidence on both methods and all flag interactions — derived from
`check_options()`, main(), and the referenced library functions.

> [!gap] Method 1 multi-surface tie-breaking
> When multiple surfaces are provided to Method 1 and two surfaces have equally
> close vertices to a voxel, the tie-breaking behaviour (which vertex wins) is
> not explicitly documented in the code comment. The closest-vertex search uses
> `MHTfindClosestVertexNoXYZ` with a distance variable, implying first-found
> wins for equal distances.
