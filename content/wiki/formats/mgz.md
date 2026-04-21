---
title: "MGH/MGZ"
type: format
fs_version: "8.2.0"
related:
  - "[[mri_convert]]"
  - "[[mri_info]]"
  - "[[coordinate-systems]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Full TAG section reverse-engineered from tags.h and mriio.cpp; TAG_SCAN_PARAMETERS (id=45) contents not fully traced"
  - "NIfTI extension wrapper path not documented"
tags:
  - format
  - volume
  - binary
---

# MGH / MGZ Format

## Summary

The MGH/MGZ format is FreeSurfer's native volumetric data format. An `.mgh`
file is an uncompressed binary blob; an `.mgz` (or `.mgh.gz`) file is the same
data gzip-compressed. All multi-byte fields are stored in **big-endian** byte
order. The format encodes volume dimensions, voxel type, voxel sizes, a 3×3
direction-cosine matrix, the RAS coordinates of the geometric centre, MR
sequence parameters, and an extensible tag-based footer for provenance and
ancillary data.

## Binary Layout

### Fixed Header (284 bytes total)

| Offset | Size | Type | Field | Notes |
|--------|------|------|-------|-------|
| 0 | 4 | int32 | `version` | Low 8 bits = `MGH_VERSION` (= 1); bits 8–23 = content intent code |
| 4 | 4 | int32 | `width` | Number of columns |
| 8 | 4 | int32 | `height` | Number of rows |
| 12 | 4 | int32 | `depth` | Number of slices |
| 16 | 4 | int32 | `nframes` | Number of time/statistical frames |
| 20 | 4 | int32 | `type` | Voxel data type code (see table below) |
| 24 | 4 | int32 | `dof` | Degrees of freedom |
| 28 | 2 | int16 | `ras_good_flag` | > 0 if RAS geometry block is present |
| 30 | 60 | — | RAS geometry block | Only if `ras_good_flag > 0` (see below) |
| 90 | 194 | — | Padding | Zeroed bytes filling to offset 284 |

**If `ras_good_flag ≤ 0`:** bytes 30–283 are padding (254 bytes). Header total
is still 284 bytes.

### RAS Geometry Block (offsets 30–89, only when `ras_good_flag > 0`)

| Offset | Size | Type | Field | Notes |
|--------|------|------|-------|-------|
| 30 | 4 | float32 | `xsize` | Voxel size along x axis (mm) |
| 34 | 4 | float32 | `ysize` | Voxel size along y axis (mm) |
| 38 | 4 | float32 | `zsize` | Voxel size along z axis (mm) |
| 42 | 4 | float32 | `x_r` | Column direction cosine, R component |
| 46 | 4 | float32 | `x_a` | Column direction cosine, A component |
| 50 | 4 | float32 | `x_s` | Column direction cosine, S component |
| 54 | 4 | float32 | `y_r` | Row direction cosine, R component |
| 58 | 4 | float32 | `y_a` | Row direction cosine, A component |
| 62 | 4 | float32 | `y_s` | Row direction cosine, S component |
| 66 | 4 | float32 | `z_r` | Slice direction cosine, R component |
| 70 | 4 | float32 | `z_a` | Slice direction cosine, A component |
| 74 | 4 | float32 | `z_s` | Slice direction cosine, S component |
| 78 | 4 | float32 | `c_r` | RAS coordinate of the "centre" voxel, R |
| 82 | 4 | float32 | `c_a` | RAS coordinate of the "centre" voxel, A |
| 86 | 4 | float32 | `c_s` | RAS coordinate of the "centre" voxel, S |

The "centre" voxel is defined at index $(\lfloor N_c/2 \rfloor, \lfloor N_r/2 \rfloor, \lfloor N_s/2 \rfloor)$
(zero-indexed), where $N_c, N_r, N_s$ are the column, row, and slice counts.
This is the `c_r/c_a/c_s` triplet accessible via `mri_info --cras`.

### Voxel Data Block (immediately after 284-byte header)

Storage order (innermost dimension first): **column → row → slice → frame**.
Each voxel occupies `bytes_per_voxel` bytes determined by the type code.
Total data size: `nframes × depth × height × width × bytes_per_voxel`.

### Scan Parameters Block (immediately after voxel data, always written)

| Size | Type | Field | Notes |
|------|------|-------|-------|
| 4 | float32 | `TR` | Repetition time (ms) |
| 4 | float32 | `flip_angle` | Flip angle in **radians** (stored as float despite being `double` in the C struct) |
| 4 | float32 | `TE` | Echo time (ms) |
| 4 | float32 | `TI` | Inversion time (ms) |
| 4 | float32 | `FOV` | Field of view (mm) |

> [!gotcha] flip_angle precision loss
> `mri->flip_angle` is stored as `double` in the `MRI` struct but is **written
> as `float32`** to disk. This truncates precision. The source code itself flags
> this with a comment: `"??? mri->flip_angle is a double, it is read/written as
> float ???"` (utils/mriio.cpp).

### TAG Footer (after scan parameters, optional but usually present)

Tags are variable-length key-value pairs appended sequentially. Each tag is a
`(tag-id, length, data)` triplet read by `TAGread()`. Tags continue until EOF
or until a recognised end-sentinel is reached.

Known tags:

| Tag ID | Constant | Contents |
|--------|----------|----------|
| 1 | `TAG_OLD_COLORTABLE` | Colour table data |
| 2 | `TAG_OLD_USEREALRAS` | int32: use Scanner RAS flag |
| 3 | `TAG_CMDLINE` | ASCII string: generating command line |
| 4 | `TAG_USEREALRAS` | Use Scanner RAS (newer form) |
| 7 | `TAG_DOF` | int: degrees of freedom |
| 20 | `TAG_OLD_SURF_GEOM` | Volume geometry block for surfaces |
| 22 | `TAG_SURF_DATASPACE` | String: coordinate space name |
| 23 | `TAG_SURF_MATRIXDATA` | Transform matrix |
| 30 | `TAG_OLD_MGH_XFORM` | ASCII path to Talairach/[[lta-format|LTA transform]] file |
| 31 | `TAG_MGH_XFORM` | ASCII path to LTA transform file |
| 32 | `TAG_GROUP_AVG_SURFACE_AREA` | float32: group average surface area |
| 33 | `TAG_AUTO_ALIGN` | 4×4 MATRIX: auto-alignment transform |
| 40 | `TAG_SCALAR_DOUBLE` | double scalar value |
| 41 | `TAG_PEDIR` | ASCII string: phase encode direction |
| 42 | `TAG_MRI_FRAME` | Per-frame metadata |
| 43 | `TAG_FIELDSTRENGTH` | float32: B0 field strength (Tesla) |
| 44 | `TAG_ORIG_RAS2VOX` | 4×4 MATRIX: original ras2vox |
| 45 | `TAG_SCAN_PARAMETERS` | Full scan parameter block |

## Voxel Data Type Codes

| Code | Constant | C type | Bytes/voxel | Description |
|------|----------|--------|-------------|-------------|
| 0 | `MRI_UCHAR` | `uint8_t` | 1 | Unsigned 8-bit integer |
| 1 | `MRI_INT` | `int32_t` | 4 | Signed 32-bit integer |
| 2 | `MRI_LONG` | `int64_t` | 8 | Signed 64-bit integer |
| 3 | `MRI_FLOAT` | `float` | 4 | IEEE 754 float32 |
| 4 | `MRI_SHORT` | `int16_t` | 2 | Signed 16-bit integer |
| 6 | `MRI_TENSOR` | `float` | 4 | Float32; forces `nframes = 9` |
| 7 | `MRI_FLOAT_COMPLEX` | `float[2]` | 8 | Two float32 (real, imag) |
| 10 | `MRI_USHRT` | `uint16_t` | 2 | Unsigned 16-bit integer |

## Version / Intent Encoding

The `version` field encodes two values:
$$
\text{version} = (\text{intent} \mathbin{\&} \texttt{0xffff}) \ll 8 \;\big|\; \text{MGH\_VERSION}
$$

- Bits 0–7: format version (always `1 = MGH_VERSION`)
- Bits 8–23: content intent code (`mri->intent`)

Examples:
- `version = 1`: plain volume (no intent)
- `version = 0x0200 | 1`: surface overlay with shape intent (`MGZ_INTENT_SHAPE`)
- `version = 0x0600 | 1`: warp map (`MGZ_INTENT_WARPMAP`)

The intent code is extracted on read as `(version >> 8) & 0xffff`.

## Coordinate System Encoding

The direction cosines and $c_\text{ras}$ values encode the **Scanner RAS**
coordinate system. The vox-to-RAS matrix is:

$$
\mathbf{M}_{\text{vox2ras}} = \begin{pmatrix}
x_r \cdot d_x & y_r \cdot d_y & z_r \cdot d_z & P_{0,r} \\
x_a \cdot d_x & y_a \cdot d_y & z_a \cdot d_z & P_{0,a} \\
x_s \cdot d_x & y_s \cdot d_y & z_s \cdot d_z & P_{0,s} \\
0 & 0 & 0 & 1
\end{pmatrix}
$$

where $P_0 = c_\text{ras} - \mathbf{M}_{3\times3} \cdot [\lfloor N_c/2 \rfloor, \lfloor N_r/2 \rfloor, \lfloor N_s/2 \rfloor]^T$.

The **Surface RAS** (tkregister RAS) transform differs: it sets $c_\text{ras}$
to $-\frac{1}{2}(N_c d_x, N_r d_y, N_s d_z)$ — placing the origin at the
geometric centre of the volume bounding box rather than at the scanner-encoded
centre. See [[coordinate-systems]] for the full derivation.

> [!gotcha] Fields not stored in the file
> `xstart`, `xend`, `ystart`, `yend`, `zstart`, `zend` are **not stored** in
> the MGZ file. They are recomputed on read as $\pm (N/2) \times d$ from the
> voxel sizes and dimensions. `mri_info` displays them but they are ephemeral.

## File Variants

| Extension | Compression | Notes |
|-----------|-------------|-------|
| `.mgh` | None | Opened with `fopen()` |
| `.mgz` | gzip | Opened with `znzopen()` (zlib) |
| `.mgh.gz` | gzip | Same as `.mgz` |

The file extension is **mandatory**: `mghRead()` returns an error if the
extension is not one of the three above. The format is auto-detected by
`mri_identify()` from the extension.

## Tools That Produce / Consume MGZ

Virtually all FreeSurfer volumetric tools read and write MGZ. Key tools:

| Tool | Role |
|------|------|
| [[mri_convert]] | Converts between MGZ and NIfTI, DICOM, MINC, Analyze, … |
| [[mri_info]] | Displays all header fields |
| [[mri_binarize]] | Reads/writes MGZ volumes |
| [[mri_concat]] | Concatenates multiple MGZ volumes |
| [[mri_label2vol]] | Writes label volumes as MGZ |
| [[mri_vol2surf]] | Reads source volumes in MGZ; writes overlay as 1×1×1×Nv MGZ |
| [[recon-all]] | All intermediate results stored as MGZ |

## Differences from NIfTI

| Property | MGZ | NIfTI-1 |
|----------|-----|---------|
| Byte order | Big-endian always | Little-endian typical |
| Compression | `.mgz` = gzip-wrapped | `.nii.gz` = gzip-wrapped |
| Coordinate system | Scanner RAS + optional tkRAS transform | qform/sform encode scanner coords |
| Tags / provenance | Extensible TAG footer | Header extensions |
| Surface overlays | Stored as 1×1×1×Nvertices MGZ | Not natively supported |

Use [[mri_convert]] to convert between MGZ and NIfTI formats.

## Reading MGZ from Python

```python
import nibabel as nib

img = nib.load("brain.mgz")
data = img.get_fdata()
affine = img.affine  # 4×4 vox2ras matrix (Scanner RAS)

# To get the tkregister/Surface RAS affine:
import subprocess, numpy as np
result = subprocess.run(
    ["mri_info", "--vox2ras-tkr", "brain.mgz"],
    capture_output=True, text=True
)
# Parse the 4×4 from result.stdout
```

> [!gotcha] nibabel reads Scanner RAS
> `nibabel` returns the Scanner RAS affine (`vox2ras`), not the Surface RAS
> affine (`vox2ras-tkr`). For FreeSurfer surface analyses the Surface RAS
> transform must be obtained separately via `mri_info --vox2ras-tkr`.

## Confidence and Gaps

High confidence on binary layout — derived from `mghRead()` and `mghWrite()` in
`utils/mriio.cpp` and struct definitions in `include/mri.h`.

> [!gap] TAG_SCAN_PARAMETERS (id=45) contents
> This tag is mentioned in `tags.h` as a NIfTI-extension-only tag but its
> exact binary layout (which fields, what order) has not been traced.

> [!gap] NIfTI extension path
> When MGZ data is embedded inside a NIfTI extension (the `TAG_NIIHDREXTENSION`
> path), the byte layout may differ. This path has not been documented here.
