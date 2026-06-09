---
title: "FreeSurfer Curvature / Overlay Format (.curv)"
type: format
fs_version: "8.2.0"
related:
  - "[[surface-format]]"
  - "[[mris_calc]]"
  - "[[mri_vol2surf]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[coordinate-systems]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Old-format files (no magic number) may still be encountered in legacy datasets; exact detection heuristic not traced beyond mri_identify()"
tags:
  - format
  - surface
  - overlay
  - curvature
---

# FreeSurfer Curvature / Overlay Format (.curv)

## Summary

The `.curv` file stores a per-vertex scalar overlay on a FreeSurfer surface.
Despite the name "curvature", it is used for any per-vertex scalar quantity:
mean curvature, sulcal depth, cortical thickness, statistical maps, and any
derived measure written by `mris_calc`. It is also the format read and written
by `mri_vol2surf` (as output) and `mris_preproc` (as input).

Two format versions exist: a **new** format (the one written by modern
FreeSurfer) and a legacy **old** format (fixed-point 16-bit integer). Both use
big-endian byte order.

## New Format (Current)

### Header

| Offset | Size | Type | Field | Value / Notes |
|--------|------|------|-------|---------------|
| 0 | 3 | uint24 (big-endian) | magic | `0xFFFFFF` = `NEW_VERSION_MAGIC_NUMBER` = 16777215 |
| 3 | 4 | int32 (big-endian) | nvertices | Number of vertex values |
| 7 | 4 | int32 (big-endian) | nfaces | Number of faces (informational; usually matches the paired surface) |
| 11 | 4 | int32 (big-endian) | vals_per_vertex | Number of values per vertex; typically 1 |

### Data Block

Immediately after the header:
```
[4 × nvertices × vals_per_vertex  bytes]
Per-vertex float32 values, big-endian.
One value per vertex (or vals_per_vertex floats if > 1).
```

Total file size: `15 + 4 × nvertices` bytes (for the common `vals_per_vertex = 1` case).

### Writing (from source)

The new format is written by `MRISwriteCurvature()` via `fwrite3(-1, fp)` for
the magic number (writes the low 24 bits of `-1` = `0xFFFFFF`), followed by
`fwriteInt(nvertices)`, `fwriteInt(nfaces)`, `fwriteInt(1)`, then a loop of
`fwriteFloat(v->curv)` for each vertex.

The per-vertex float corresponds to the `.curv` field of the `VERTEX` struct in
the C surface representation, which holds a single-precision float.

## Old Format (Legacy)

### Layout

```
[3 bytes]  nvertices (24-bit big-endian integer — NOT a magic number)
[3 bytes]  nfaces    (24-bit big-endian integer)
[2 × nvertices bytes]  curvature as int16 (big-endian), scaled: value = i / 100.0
```

There is **no magic number** in the old format; the first 3 bytes are the vertex
count. Detection is performed by `mri_identify()` from context (file extension +
first-byte pattern). The practical distinction:
- New format: first 3 bytes = `0xFF 0xFF 0xFF`
- Old format: first 3 bytes = vertex count, which must be < 16777215 (= 0xFFFFFF)

The 16-bit fixed-point encoding stores curvature × 100 as a signed integer.
Representable range: −327.68 to +327.67. Modern FreeSurfer always writes the
new format.

## Common `.curv` Files in a Subject Directory

Each hemisphere (`lh`, `rh`) has its own set, stored in `$SUBJECTS_DIR/<subj>/surf/`:

| Filename | Contents | Producing tool |
|----------|----------|----------------|
| `?h.curv` | Mean curvature of the white surface | [[mris_smooth]] |
| `?h.sulc` | Sulcal depth (signed distance moved during inflation) | [[mris_inflate]] |
| `?h.thickness` | Cortical thickness at each vertex (mm) | `mris_thickness` |
| `?h.area` | Surface area per vertex (mm²) | [[mris_smooth]] |
| `?h.area.mid` | Mid-surface area | various |
| `?h.area.pial` | Pial surface area | various |
| `?h.jacobian_white` | Jacobian of registration deformation | [[mris_register]] |
| `?h.avg_curv` | Atlas average curvature (target for registration) | [[mris_register]] |
| `?h.volume` | Grey matter volume per vertex (mm³) | [[mris_anatomical_stats]] |
| `?h.w-g.pct.mgh` | White-grey intensity contrast | various |

The `mri_vol2surf` output is also typically stored in this format (written as
`.mgh`/`.mgz` with `vals_per_vertex = 1` but semantically identical).

## Coordinate System

The `.curv` format stores **scalar values only** — no spatial coordinates. The
spatial geometry is implicit from the paired surface file (e.g., `?h.white`).
Per-vertex values are indexed by the same vertex numbering as the corresponding
surface; vertex $i$ in the `.curv` file corresponds to vertex $i$ in the surface.

See [[surface-format]] for the surface file binary layout and [[coordinate-systems]]
for the Surface RAS coordinate system used by vertex positions.

## Tools That Read / Write .curv

| Tool | Read | Write | Notes |
|------|------|-------|-------|
| [[mris_smooth]] | — | `curv`, `area` | Writes curvature + area after Laplacian smoothing |
| [[mris_inflate]] | — | `sulc` | Signed distance moved during inflation |
| [[mris_calc]] | ✓ | ✓ | Arithmetic on curvature files; primary arithmetic tool |
| [[mri_vol2surf]] | — | ✓ | Output overlay (often saved as `.mgh`) |
| [[mris_preproc]] | ✓ | — | Reads `--meas` surface measure files |
| `mris_thickness` | — | ✓ | Writes cortical thickness |
| [[mris_register]] | ✓ | ✓ | Reads curvature for feature vector; writes jacobian |
| [[mris2rgb]] | ✓ | — | Reads a curvature/overlay file to colour a rendered surface image |

## Reading from Python

```python
import nibabel as nib

# nibabel reads new-format .curv files
curv = nib.freesurfer.io.read_morph_data('lh.thickness')  
# Returns a numpy array of shape (nvertices,)

# For old-format files, nibabel falls back automatically
sulc = nib.freesurfer.io.read_morph_data('lh.sulc')
```

## Gotchas and Caveats

> [!gotcha] Magic number collision with QUAD_FILE_MAGIC_NUMBER
> The new `.curv` format magic (`0xFFFFFF`) is numerically identical to the
> quad surface file magic number `QUAD_FILE_MAGIC_NUMBER`. FreeSurfer
> distinguishes them by file extension and context (via `mri_identify()`), not
> by the magic number alone. Do not rely on the magic number in isolation to
> identify the file type.

> [!gotcha] Old format is still encountered in legacy data
> Datasets processed with FreeSurfer versions prior to ~3.x may have old-format
> `.curv` files. `mri_identify()` handles detection, but the fixed-point 16-bit
> encoding limits precision to 0.01 units and range to ±327.68.

> [!gotcha] vals_per_vertex > 1 is unusual
> The header field `vals_per_vertex` allows multi-value overlays. In practice
> FreeSurfer always writes `vals_per_vertex = 1`. Code that assumes
> `vals_per_vertex = 1` is common and will silently misread multi-value files.

## Confidence and Gaps

High confidence on the new format — derived from `MRISwriteCurvature()` and the
`CURV_fileWrite()` function in `utils/mrisurf_io.cpp`.

> [!gap] Old format detection heuristic
> The exact logic in `mri_identify()` for distinguishing old from new `.curv`
> format (beyond the first-byte pattern) has not been traced. Old-format files
> should be treated as potentially ambiguous.
