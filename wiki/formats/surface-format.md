---
title: "FreeSurfer Binary Surface Format"
type: format
fs_version: "8.2.0"
related:
  - "[[mri_tessellate]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[curv-format]]"
  - "[[coordinate-systems]]"
  - "[[surface-representations]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "TAG_SURF_DATASPACE and TAG_SURF_MATRIXDATA contents not traced beyond tag type identification"
  - "Old quad format (QUAD_FILE_MAGIC_NUMBER = 0xFFFFFF) not documented; essentially obsolete"
tags:
  - format
  - surface
  - binary
---

# FreeSurfer Binary Surface Format

## Summary

FreeSurfer surfaces (`.white`, `.pial`, `.inflated`, `.sphere`, etc.) are
stored in a binary format called the **triangle file** format. The format
stores the vertex positions and face connectivity of a triangular mesh, plus
optional tag-based metadata. All multi-byte fields are big-endian. Vertex
coordinates are in **Surface RAS** by default (the `useRealRAS = 0` mode); the
tag `TAG_OLD_USEREALRAS` can switch them to Scanner RAS.

## Magic Numbers

Three 24-bit magic numbers are recognised (read by `fread3()`, which reads a
big-endian 24-bit integer):

| Magic (hex) | Decimal | Constant | Meaning |
|-------------|---------|----------|---------|
| `0xFFFFFE` | 16777214 | `TRIANGLE_FILE_MAGIC_NUMBER` | **Current** triangle file format |
| `0xFFFFFF` | 16777215 | `QUAD_FILE_MAGIC_NUMBER` | Legacy quad file (essentially obsolete) |
| `0xFFFFFD` | 16777213 | `NEW_QUAD_FILE_MAGIC_NUMBER` | Legacy new quad file |

Modern FreeSurfer always writes the triangle file format (magic `0xFFFFFE`).

## Binary Layout

### Header (variable length)

```
[3 bytes]   Magic number = 0xFFFFFE (big-endian 24-bit)
[variable]  Created-by comment: newline-terminated ASCII string (up to 200 chars)
[1 byte]    Additional newline (fscanf "\n")
[4 bytes]   nvertices (int32, big-endian)
[4 bytes]   nfaces    (int32, big-endian)
```

The comment line is written as a human-readable string such as:
```
created by mri_tessellate on 2024-04-14 10:30:00
```

> [!gotcha] Environment variable suppresses comment read
> The environment variable `TRIANGULARSURFACE_NOEXTRA_READ` suppresses reading
> the comment line. This undocumented escape hatch exists for unusual parsing
> scenarios. Under normal conditions it is never set.

### Vertex Block (`nvertices × 12 bytes`)

Immediately after the header:
```
For each vertex (0 to nvertices-1):
  [4 bytes]  x (float32, big-endian)  — position in Surface RAS or Scanner RAS
  [4 bytes]  y (float32, big-endian)
  [4 bytes]  z (float32, big-endian)
```

### Face Block (`nfaces × 12 bytes`)

Immediately after the vertex block:
```
For each face (0 to nfaces-1):
  [4 bytes]  v[0] (int32, big-endian)  — vertex index 0
  [4 bytes]  v[1] (int32, big-endian)  — vertex index 1
  [4 bytes]  v[2] (int32, big-endian)  — vertex index 2
```

Face vertex indices are 0-based references into the vertex array. Faces are
consistently oriented (outward-pointing normals by convention).

### TAG Section (optional, variable length)

After the face block, zero or more TAG records may be present. Each is read
by `TAGreadStart()` until it returns 0 (no more tags).

| Tag ID | Constant | Contents |
|--------|----------|----------|
| 2 | `TAG_OLD_USEREALRAS` | int32: if non-zero, vertex coordinates are in **Scanner RAS** |
| 3 | `TAG_CMDLINE` | ASCII string: the command that generated this surface |
| 20 | `TAG_OLD_SURF_GEOM` | Volume geometry (vox2ras matrix + dims + voxel sizes) of the reference volume |
| 22 | `TAG_SURF_DATASPACE` | ASCII string: coordinate space name |
| 23 | `TAG_SURF_MATRIXDATA` | 4×4 MATRIX: transform to the data space |
| 32 | `TAG_GROUP_AVG_SURFACE_AREA` | float32: average surface area of the group (atlas surfaces only) |

## Coordinate System

By default, vertex positions are in **Surface RAS** (tkregister RAS),
corresponding to `mris->useRealRAS = 0` at read time. The `TAG_OLD_USEREALRAS`
tag explicitly encodes the coordinate convention:

| `useRealRAS` value | Coordinate system |
|--------------------|-------------------|
| 0 (default) | **Surface RAS** (tkregister RAS) |
| 1 | **Scanner RAS** |

Surface RAS is defined relative to the volume centre:
$$P_0 = -\tfrac{1}{2}(N_c d_x, N_r d_y, N_s d_z)$$
so the origin falls at the geometric centre of the bounding box. See
[[coordinate-systems]] for the full derivation and the relationship to Scanner RAS.

> [!gotcha] nibabel reads Surface RAS by default
> `nibabel.freesurfer.io.read_geometry()` returns vertex coordinates in Surface
> RAS. If you need Scanner RAS, you must apply the `tkr-to-scanner` transform,
> which can be extracted via `mri_info --tkr2scanner <volume>`. See
> [[coordinate-systems]] for the matrix.

> [!gotcha] `useRealRAS` is a file-format tag, not a transform
> Setting `useRealRAS = 1` changes the coordinate system of the stored values
> but does not apply any transformation. Two surfaces with different `useRealRAS`
> settings have incompatible vertex coordinate spaces and cannot be compared
> directly.

## Volume Geometry Tag (`TAG_OLD_SURF_GEOM`)

The reference volume geometry is embedded as `TAG_OLD_SURF_GEOM`. This is the
geometry of the volume used to construct the surface (typically `T1.mgz` for
anatomical surfaces). It encodes:

- `vox2ras` 4×4 matrix (16 floats)
- Voxel dimensions (width, height, depth)
- Voxel sizes (xsize, ysize, zsize)
- RAS centre (c_r, c_a, c_s)

This tag is important for tools that need to re-derive the vox2ras transform
from the surface file alone.

## Common Surface Files

Each hemisphere's surfaces are stored in `$SUBJECTS_DIR/<subj>/surf/`:

| Filename | Description | Producing tool |
|----------|-------------|----------------|
| `?h.orig` | Original tessellation (before smoothing) | [[mri_tessellate]] |
| `?h.orig.nofix` | Pre-[[topology-correction|topology]]-fix tessellation | [[mri_tessellate]] |
| `?h.white` | White matter surface (after topology fix and smoothing) | `mris_make_surfaces` |
| `?h.pial` | Pial surface | `mris_make_surfaces` |
| `?h.smoothwm` | Smoothed white surface (Laplacian) | [[mris_smooth]] |
| `?h.smoothwm.nofix` | Smoothed pre-fix surface | [[mris_smooth]] |
| `?h.inflated` | Inflated surface | [[mris_inflate]] |
| `?h.inflated.nofix` | Pre-fix inflated | [[mris_inflate]] |
| `?h.sphere` | Spherical mapping | [[mris_sphere]] |
| `?h.qsphere.nofix` | Quick sphere (topology correction input) | [[mris_sphere]] |
| `?h.sphere.reg` | Sphere after registration to atlas | [[mris_register]] |

See [[surface-representations]] for a conceptual overview of these surfaces.

## Tools That Read / Write Surface Files

| Tool | Read | Write | Notes |
|------|------|-------|-------|
| [[mri_tessellate]] | — | ✓ | Creates the initial triangular mesh |
| [[mris_smooth]] | ✓ | ✓ | Laplacian smoothing |
| [[mris_inflate]] | ✓ | ✓ | Inflation energy minimisation |
| [[mris_sphere]] | ✓ | ✓ | Spherical mapping |
| [[mris_register]] | ✓ | ✓ | Atlas registration |
| [[mri_vol2surf]] | ✓ | — | Reads surface for projection |
| [[mri_surf2vol]] | ✓ | — | Reads surface for back-projection |
| [[mris_calc]] | ✓ | — | Reads for vertex masking via `--label` |

## Reading from Python

```python
import nibabel as nib

coords, faces = nib.freesurfer.io.read_geometry(
    'lh.white',
    read_metadata=True
)
# coords: (nvertices, 3) float32 array in Surface RAS
# faces:  (nfaces, 3) int32 array (0-based vertex indices)
```

## Gotchas and Caveats

> [!gotcha] Magic number `0xFFFFFF` collision with curvature files
> `QUAD_FILE_MAGIC_NUMBER = 0xFFFFFF` is the same as `NEW_VERSION_MAGIC_NUMBER`
> used in [[curv-format]] files. FreeSurfer distinguishes them by file extension
> and `mri_identify()` logic, not by the magic number alone.

> [!gotcha] Comment line is not checksummed
> The created-by comment line is free text and may be absent or malformed in
> surfaces from third-party tools (e.g., HCP, ANTs). A missing newline after
> the comment causes `fread3()` to silently read garbage as the vertex count.
> The `TRIANGULARSURFACE_NOEXTRA_READ` env var works around this.

## Confidence and Gaps

High confidence on the triangle file format — derived from `mrisReadTriangleFile()`
in `utils/mrisurf_io.cpp` (lines 5494–5625).

> [!gap] TAG_SURF_DATASPACE and TAG_SURF_MATRIXDATA
> These tags are written for transformed surfaces (e.g., after registration to
> atlas space) and allow embedding a named coordinate space + transform. The
> exact contents and usage convention have not been traced beyond tag-type
> identification.

> [!gap] Old quad file format
> The legacy `QUAD_FILE_MAGIC_NUMBER` (0xFFFFFF) format is essentially obsolete
> in FS 8.x. It is not documented here.
