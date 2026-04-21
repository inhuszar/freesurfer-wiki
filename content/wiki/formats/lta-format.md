---
title: "FreeSurfer Linear Transform Array (.lta)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".lta"
produced_by:
  - "[[mri_em_register]]"
  - "[[talairach_avi]]"
  - "[[mri_coreg]]"
  - "[[bbregister]]"
  - "[[lta_convert]]"
consumed_by:
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mri_convert]]"
  - "[[mri_concatenate_lta]]"
  - "[[freeview]]"
related:
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
  - "[[mri_concatenate_lta]]"
  - "[[lta_convert]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - format
  - transform
  - registration
---

# FreeSurfer Linear Transform Array (.lta)

## Overview

The `.lta` file is FreeSurfer's primary format for storing linear spatial
transforms. It is a plain-text (ASCII) file that bundles one or more 4×4
homogeneous transformation matrices together with the source and destination
volume geometry records needed to interpret the matrix semantics. The format
is extensible: the `nxforms` field allows for arrays of transforms (used
historically for transform mixture models), though in practice virtually all
modern `.lta` files contain exactly one transform.

The key design decision embedded in the format is the **type code**: a single
integer stored at the top of the file that declares the coordinate space
convention of the matrix. Without the type code, a 4×4 matrix is ambiguous —
it could map voxel indices to voxel indices, scanner RAS to scanner RAS,
or tkregister-space RAS to tkregister-space RAS. The type code makes the
interpretation unambiguous, and the library function `LTAchangeType()` can
convert between representations when the source/destination volume geometry
records are valid.

The LTA container also transparently subsumes the older `register.dat` format
(type code 14) — FreeSurfer's I/O layer reads `.dat`/`.reg` files and wraps
them into an LTA struct in memory, and `LTAwriteEx()` writes them back to
`.dat`/`.reg` on disk when the file extension is `.dat` or `.reg`.

Source files:
- `include/transform.h` — struct definitions, type code constants
- `utils/transform.cpp` — `LTAprint()`, `ltaReadFileEx()`, `LTAwriteEx()`, `LTAchangeType()`
- `utils/registerio.cpp` — `regio_read_register()`, `regio_print_register()` (register.dat I/O)
- `include/mri.h` — `VOL_GEOM` struct definition

## Type Codes

Every LTA file carries a type code that identifies the coordinate space of
the stored matrix. The constants are defined in `include/transform.h`.

| Code | Macro | Internal name | Meaning |
|------|-------|---------------|---------|
| 0 | `LINEAR_VOX_TO_VOX` | `linear_vox_to_vox` | Maps source voxel (CRS) indices to destination voxel (CRS) indices |
| 1 | `LINEAR_RAS_TO_RAS` | `linear_ras_to_ras` | Maps source scanner RAS to destination scanner RAS |
| 2 | `LINEAR_PHYSVOX_TO_PHYSVOX` | `linear_physvox_to_physvox` | Maps source "physical voxel" (vox scaled by voxel size, mm) to dest physical voxel |
| 10 | `TRANSFORM_ARRAY_TYPE` | `transform_array` | Generic; used internally and as the file-type sentinel for `.lta` files |
| 11 | `MORPH_3D_TYPE` | `morph_3d` | Non-linear warp ([[m3z-format|`.m3z`]]/`.m3d` files) — not stored in `.lta` |
| 12 | `MNI_TRANSFORM_TYPE` | `mni_transform` | MINC `.xfm` format; read/written as RAS-to-RAS |
| 13 | `MATLAB_ASCII_TYPE` | `matlab_ascii` | MATLAB ASCII matrix |
| 14 | `REGISTER_DAT` | `register.dat` | tkregister-style; maps ref-tkRAS to mov-tkRAS (convention is inverted — see gotchas) |
| 15 | `FSLREG_TYPE` | `FSL` | FSL `.fslmat` format; physical voxel to physical voxel with FSL sign conventions |
| 21 | `LINEAR_CORONAL_RAS_TO_CORONAL_RAS` | `linear_cor_to_cor` | Legacy COR-format RAS; rarely encountered in modern data |

> [!gotcha] `LINEAR_CORONAL_RAS_TO_CORONAL_RAS` is largely vestigial
> This type (21) appears in the code for historical reasons tied to the old
> COR volume format. In practice, `ltaReadRegisterDat()` now assigns type 14
> (`REGISTER_DAT`) rather than 21 when reading `.dat` files, because type 21
> produced incorrect results in `lta_convert`. Do not expect to encounter type
> 21 in modern workflows; if you do, treat it as equivalent to `REGISTER_DAT`.
> From `utils/transform.cpp:2789–2793`.

The `TransformFileNameType()` function (from `utils/transform.cpp:1576`)
maps file extensions to type codes for dispatch during reading:

| Extension | Detected type |
|-----------|---------------|
| `.lta` | `TRANSFORM_ARRAY_TYPE` (10) → reads as LTA |
| `.xfm` | `MNI_TRANSFORM_TYPE` (12) |
| `.fslmat` | `FSLREG_TYPE` (15) |
| `.dat` | `REGISTER_DAT` (14) |
| `.reg` | `REGISTER_DAT` (14) |
| anything else | `REGISTER_DAT` (14) |
| `.m3d`, `.m3z`, `.mgz`, `.nii`, `.nii.gz` | `MORPH_3D_TYPE` (11) |

## LTA File Structure

### Complete annotated layout

A modern LTA file written by `LTAwriteEx()` → `LTAprint()` (from
`utils/transform.cpp:3280–3321` and `3238–3277`) has the following structure:

```
# transform file <path>
# created by <USER> on <datetime>
                                           ← blank line
type      = <N> # <NAME>
nxforms   = <M>
                                           ← for each of the M transforms:
mean      = <x0> <y0> <z0>
sigma     = <s>
1 4 4
<r11> <r12> <r13> <r14>
<r21> <r22> <r23> <r24>
<r31> <r32> <r33> <r34>
<r41> <r42> <r43> <r44>
                                           ← after all M transforms:
src volume info
valid = <0|1>  # volume info [in]valid
filename = <path>
volume = <W> <H> <D>
voxelsize = <sx> <sy> <sz>
xras   = <xr> <xa> <xs>
yras   = <yr> <ya> <ys>
zras   = <zr> <za> <zs>
cras   = <cr> <ca> <cs>
dst volume info
valid = <0|1>  # volume info [in]valid
filename = <path>
volume = <W> <H> <D>
voxelsize = <sx> <sy> <sz>
xras   = <xr> <xa> <xs>
yras   = <yr> <ya> <ys>
zras   = <zr> <za> <zs>
cras   = <cr> <ca> <cs>
[subject <name>]                           ← optional; tkregister2 metadata
[fscale <f>]                               ← optional; tkregister2 metadata
```

### Line-by-line description

**Comment header** (lines 1–2): Free-form comments beginning with `#`. The
writer inserts the file path, the Unix user name (from `$USER` or `$LOGNAME`),
and a timestamp. These lines are skipped by the reader.

**`type = <N> # <NAME>`**: Integer type code followed by an optional inline
comment naming the type. The reader parses only the integer; the comment is
for human readability. Written as:
```c
fprintf(fp, "type      = %d ", lta->type);
if (lta->type == LINEAR_VOX_TO_VOX) fprintf(fp, "# LINEAR_VOX_TO_VOX");
else if (lta->type == LINEAR_RAS_TO_RAS) fprintf(fp, "# LINEAR_RAS_TO_RAS");
else if (lta->type == REGISTER_DAT) fprintf(fp, "# REGISTER_DAT");
fprintf(fp, "\n");
```
(from `utils/transform.cpp:3243–3248`)

**`nxforms = <M>`**: Number of transform records in the file. Almost always 1.

**Per-transform block** (repeated M times):
- `mean = <x0> <y0> <z0>`: Centroid of the transform kernel (legacy field
  from the mixture-of-experts model, format `%6.4f`). Written as zero for
  simple global transforms.
- `sigma = <s>`: Spread of the transform kernel (legacy, format `%6.4f`).
  Written as `1.0000` for global transforms.
- `1 4 4`: Matrix size tag — one matrix of 4 rows × 4 columns. This is the
  `MatrixAsciiWriteInto()` header format.
- 4 rows of 4 doubles: the 4×4 homogeneous transform matrix, row-major, one
  row per line, format `%18.15le` (18 significant digits, scientific notation).

**Volume geometry blocks** (once per transform, after all transform blocks):
The label line `src volume info` or `dst volume info` introduces each block.
See the [Volume Geometry Block](#volume-geometry-block) section below.

**tkregister2 metadata** (optional, at the end of the file):
- `subject <name>`: Subject identifier, used by `tkregister2` and `bbregister`.
  Read into `lta->subject`. Defaults to empty string.
- `fscale <f>`: Intensity scale factor, used by `tkregister2`. Defaults to
  `0.15` in the struct; written only if `lta->fscale > 0`.

### Concrete example

```
# transform file /path/to/register.lta
# created by jsmith on Tue Apr 15 10:23:45 2026

type      = 1 # LINEAR_RAS_TO_RAS
nxforms   = 1
mean      = 0.0000 0.0000 0.0000
sigma     = 1.0000
1 4 4
 9.998320675849915e-01 -1.834040600061416e-02  2.457833275944948e-03 -5.231200218200684e-01 
 1.835937947407365e-02  9.997917413711548e-01 -8.694984018802643e-03  1.009812355041504e+00 
-2.296943963319063e-03  8.737126715481281e-03  9.999586343765259e-01  2.943147182464600e-01 
 0.000000000000000e+00  0.000000000000000e+00  0.000000000000000e+00  1.000000000000000e+00 
src volume info
valid = 1  # volume info valid
filename = /path/to/moving.mgz
volume = 256 256 256
voxelsize = 1.000000000000000e+00 1.000000000000000e+00 1.000000000000000e+00
xras   = -1.000000000000000e+00 0.000000000000000e+00 0.000000000000000e+00
yras   =  0.000000000000000e+00 0.000000000000000e+00 -1.000000000000000e+00
zras   =  0.000000000000000e+00 1.000000000000000e+00  0.000000000000000e+00
cras   = -1.543091773986816e+00 1.880897521972656e+01 2.022708892822266e+01
dst volume info
valid = 1  # volume info valid
filename = /path/to/target.mgz
volume = 256 256 256
voxelsize = 1.000000000000000e+00 1.000000000000000e+00 1.000000000000000e+00
xras   = -1.000000000000000e+00 0.000000000000000e+00 0.000000000000000e+00
yras   =  0.000000000000000e+00 0.000000000000000e+00 -1.000000000000000e+00
zras   =  0.000000000000000e+00 1.000000000000000e+00  0.000000000000000e+00
cras   =  0.000000000000000e+00 1.600000000000000e+01 1.500000000000000e+01
subject bert
fscale 0.150000
```

## Matrix Storage

The 4×4 matrix is stored in **row-major order**, one row per line, values
separated by spaces. Each element is formatted as `%18.15le` — a double
in scientific notation with 15 decimal places. The row size tag `1 4 4` (one
matrix, 4 rows, 4 columns) is written before the matrix by `LTAprint()`.

When reading, the matrix is parsed by `MatrixAsciiReadFrom()` which expects
this size tag followed by the 16 values. The values are stored in
1-indexed row/column order in the internal `MATRIX->rptr[row][col]` array.

The bottom row of the matrix (row 4) is always `[0 0 0 1]` for affine
transforms. All currently supported LTA types are affine.

## Volume Geometry Block

Each transform in the LTA file carries two volume geometry records: `src`
(source/moving volume) and `dst` (destination/reference volume). These are
written by `writeVolGeom()` and read by `readVolGeom()` from
`utils/transform.cpp:452–532`. They are essential for type conversion via
`LTAchangeType()`.

### Fields

| Field label | Format | Meaning |
|-------------|--------|---------|
| `valid` | integer (0 or 1) | Whether the geometry is populated. `0` means the transform was read from a source that did not embed geometry (e.g., a bare `.dat` file). |
| `filename` | string | Path to the volume this geometry was taken from. |
| `volume` | `W H D` integers | Width (columns), height (rows), depth (slices) in voxels. |
| `voxelsize` | `sx sy sz` float64 | Voxel dimensions in mm (x, y, z). Format `%.15e`. |
| `xras` | `xr xa xs` float64 | Direction cosines of the x-axis (column direction) in scanner RAS. |
| `yras` | `yr ya ys` float64 | Direction cosines of the y-axis (row direction) in scanner RAS. |
| `zras` | `zr za zs` float64 | Direction cosines of the z-axis (slice direction) in scanner RAS. |
| `cras` | `cr ca cs` float64 | Scanner RAS coordinates of the **volume centre** (the voxel at `(W/2, H/2, D/2)`). |

The vox2ras (scanner RAS) matrix is reconstructed from these fields as:
$$
M_{\text{vox2ras}} = \begin{bmatrix}
s_x \cdot x_r & s_y \cdot y_r & s_z \cdot z_r & c_r \\
s_x \cdot x_a & s_y \cdot y_a & s_z \cdot z_a & c_a \\
s_x \cdot x_s & s_y \cdot y_s & s_z \cdot z_s & c_s \\
0 & 0 & 0 & 1
\end{bmatrix}
$$
where $x_{r,a,s}$, $y_{r,a,s}$, $z_{r,a,s}$ are the direction cosines and
$s_x, s_y, s_z$ are the voxel sizes in mm. The column $[c_r, c_a, c_s, 1]^T$
is the RAS position of the volume centre. This is the standard FreeSurfer
vox2ras convention used across MGZ/MGH headers and [[surface-format|surface files]].

The tkRAS vox2ras (tkregister space) is derived from the same fields but uses
the **origin at the volume centre** rather than the scanner isocenter:
$$
M_{\text{vox2tkras}} = \begin{bmatrix}
s_x \cdot x_r & s_y \cdot y_r & s_z \cdot z_r & 0 \\
s_x \cdot x_a & s_y \cdot y_a & s_z \cdot z_a & 0 \\
s_x \cdot x_s & s_y \cdot y_s & s_z \cdot z_s & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
\cdot \begin{bmatrix} I & -\mathbf{c}_{\text{vox}} \\ 0 & 1 \end{bmatrix}
$$
where $\mathbf{c}_{\text{vox}} = (W/2, H/2, D/2)^T$ is the centre voxel.
This is what `MRIxfmCRS2XYZtkreg()` computes. See [[coordinate-systems]] for
a full treatment of the scanner RAS vs. tkRAS distinction.

> [!gotcha] `valid = 0` geometry blocks are not usable for type conversion
> If either `src.valid` or `dst.valid` is 0, `LTAchangeType()` will call
> `ErrorExit()` and abort. This happens when an LTA was created from a
> `.dat` or `.xfm` file without explicit volume paths. Always ensure both
> geometries are valid before calling `LTAchangeType()`.
> From `utils/transform.cpp:3713–3717`.

## The `register.dat` Format (REGISTER_DAT, type 14)

FreeSurfer has a separate older text format for functional-to-structural
registration, historically written by `tkregister` and `tkregister2`. The
format is read by `regio_read_register()` and written by
`regio_print_register()` / `regio_write_register()` in `utils/registerio.cpp`.

### File layout

```
<subject_name>
<inplaneres>
<betplaneres>
<intensity>
<r11> <r12> <r13> <r14>
<r21> <r22> <r23> <r24>
<r31> <r32> <r33> <r34>
0 0 0 1
<float2int_method>
```

| Field | Type | Meaning |
|-------|------|---------|
| `subject_name` | string | FreeSurfer subject ID |
| `inplaneres` | float | In-plane voxel size of the **moving** (functional) volume in mm; this is `src.xsize` |
| `betplaneres` | float | Between-plane (slice) voxel size of moving volume in mm; this is `src.zsize` |
| `intensity` | float | Intensity scale factor (`fscale`); informational, used by `tkregister2` |
| Matrix rows 1–3 | `%18.15e` floats | First three rows of the 4×4 registration matrix |
| Row 4 | literal `0 0 0 1` | The implicit bottom row, always written as integers |
| `float2int_method` | string | Float-to-integer rounding method. Options: `tkregister`, `floor`, `round`. If absent, defaults to `tkregister` (code `FLT2INT_TKREG`). |

The `float2int_method` line was added after the original `tkregister` program.
Files created by `tkregister` lack this line; `regio_read_register()` treats
a missing line as `FLT2INT_TKREG` (from `utils/registerio.cpp:143–156`).

### Matrix semantics

> [!gotcha] The REGISTER_DAT matrix goes from ref (target) to mov (source), not mov to ref
> This is a historical inversion error that is now frozen in the codebase.
> The `REGISTER_DAT` matrix **R** satisfies:
> $$\mathbf{x}_{\text{mov,tkRAS}} = R \cdot \mathbf{x}_{\text{ref,tkRAS}}$$
> i.e., it maps a point in the reference (structural) tkRAS space to the
> corresponding point in the moving (functional) tkRAS space.
> The comment in `utils/transform.cpp:2756–2760` reads:
> "This is an unfortunate definition because the registration matrix actually
> goes from ref to mov. But this was an error introduced a long time ago and
> the rest of the code base has built up around it."
> Tools that use the `REGISTER_DAT` matrix must invert it to go from mov→ref.

### Conversion to LTA

`ltaReadRegisterDat()` wraps the `register.dat` matrix into an LTA struct
with `lta->type = REGISTER_DAT`. The `src` geometry is populated from the
in-plane and between-plane resolution fields (with `valid = 0` unless explicit
mov/ref MRI paths are provided). The `dst` geometry remains `valid = 0` in
the default case.

`TransformRegDat2LTA()` (from `utils/transform.cpp:4417`) provides a higher-level
conversion: given target and moving volume geometries and the tkRAS registration
matrix R, it computes a `LINEAR_VOX_TO_VOX` LTA:

$$M_{\text{vox2vox}} = T_{\text{mov}}^{-1} \cdot R \cdot T_{\text{ref}}$$

where $T$ denotes the tkRAS vox2ras matrix (`MRIxfmCRS2XYZtkreg()`).

The inverse function `TransformLTA2RegDat()` (from `utils/transform.cpp:4460`)
reconstructs R from a `LINEAR_VOX_TO_VOX` or `LINEAR_RAS_TO_RAS` LTA:

$$R = T_{\text{mov}} \cdot M_{\text{vox2vox}}^{-1} \cdot T_{\text{ref}}^{-1}$$

## Coordinate System Semantics

The LTA type code defines what coordinate spaces the 4×4 matrix maps between.
This is directly tied to the FreeSurfer coordinate system hierarchy described
in [[coordinate-systems]].

### `LINEAR_VOX_TO_VOX` (type 0)

Maps source voxel coordinates (column, row, slice, 1) to destination voxel
coordinates. Voxel indices are zero-based integers; the homogeneous matrix
allows for sub-voxel accuracy in floating-point.

$$\begin{pmatrix} c_{\text{dst}} \\ r_{\text{dst}} \\ s_{\text{dst}} \\ 1 \end{pmatrix} = M_{\text{vox2vox}} \cdot \begin{pmatrix} c_{\text{src}} \\ r_{\text{src}} \\ s_{\text{src}} \\ 1 \end{pmatrix}$$

This is the natural output of registration algorithms that operate on voxel
grids. It is geometry-dependent: the same anatomical registration expressed as
vox2vox will produce different numbers if the voxel size or orientation of
either volume changes.

### `LINEAR_RAS_TO_RAS` (type 1)

Maps source scanner RAS coordinates (mm) to destination scanner RAS
coordinates (mm). Scanner RAS is tied to the physical scanner coordinate
system, defined by the direction cosines and volume centre in the volume header.

$$\mathbf{x}_{\text{dst,RAS}} = M_{\text{RAS2RAS}} \cdot \mathbf{x}_{\text{src,RAS}}$$

This is the preferred representation for storage because it is
geometry-independent: if either volume is later re-sampled into a different
grid, the RAS-to-RAS matrix remains valid and a new vox2vox matrix can be
derived on demand.

To convert from `LINEAR_VOX_TO_VOX` to `LINEAR_RAS_TO_RAS`:
$$M_{\text{RAS2RAS}} = V_{\text{dst}} \cdot M_{\text{vox2vox}} \cdot V_{\text{src}}^{-1}$$
where $V$ is the scanner vox2ras matrix. The function `LTAgetR2R()` implements
this (called by `LTAchangeType()` from `utils/transform.cpp:3807–3813`).

### `REGISTER_DAT` (type 14)

Maps reference (structural) tkRAS coordinates to moving (functional) tkRAS
coordinates. tkRAS is the coordinate system used by FreeSurfer surface files,
with origin at the volume centre and axes aligned with the scanner axes.

See the [register.dat section](#the-registerdat-format-register_dat-type-14)
for the matrix convention (note the direction inversion).

### `FSLREG_TYPE` (type 15)

Stores an FSL-convention affine matrix that maps source "physical voxel"
coordinates (voxel index × voxel size) to destination physical voxel
coordinates, with FSL's sign flip convention (x-axis flipped for radiological
images). This is distinct from `LINEAR_PHYSVOX_TO_PHYSVOX` (type 2), which
does not apply the FSL sign convention.

Reading: `ltaFSLread()` (`utils/transform.cpp:3332`). Writing: `ltaFSLwrite()`
(`utils/transform.cpp:1626`). The writer calls `LTAchangeType(ltatmp, FSLREG_TYPE)`
before writing, which internally composes the FSL convention matrix via
`MRItkreg2FSL()`.

### `LINEAR_PHYSVOX_TO_PHYSVOX` (type 2)

Maps source physical voxels (voxel index × voxel size in mm) to destination
physical voxels. Intermediate type used during conversion between `LINEAR_VOX_TO_VOX`
and `FSLREG_TYPE`. Rarely seen in files on disk.

## `LTAchangeType()`: Type Conversion

The function `LTAchangeType(LTA *lta, int ltatype)` (from `utils/transform.cpp:3695`)
converts the stored matrix between types by composing with the appropriate
vox2ras matrices from the embedded geometry records. The conversion graph is:

```
LINEAR_VOX_TO_VOX  ←→  LINEAR_RAS_TO_RAS  →  LINEAR_PHYSVOX_TO_PHYSVOX
                                           →  REGISTER_DAT
                                           →  FSLREG_TYPE
LINEAR_PHYSVOX_TO_PHYSVOX  →  LINEAR_VOX_TO_VOX
REGISTER_DAT  →  (first converts to LINEAR_RAS_TO_RAS, then to target)
FSLREG_TYPE   →  (first converts to LINEAR_RAS_TO_RAS, then to target)
```

> [!gotcha] `LTAchangeType()` requires both `src.valid` and `dst.valid` to be 1
> If either geometry record is invalid (e.g., the LTA was created from a bare
> `.dat` file without accompanying MRI paths), `LTAchangeType()` calls
> `ErrorExit()`. Always populate geometries (e.g., via `LTAmodifySrcDstGeom()`)
> before requesting a type change.

## The `identity.nofile` Sentinel

When the filename `identity.nofile` is passed to `LTAreadEx()`, the reader
returns an identity matrix LTA of type `LINEAR_RAS_TO_RAS` without trying to
open a file (`utils/transform.cpp:3183–3188`). This sentinel is useful for
testing and pipeline scripting when no transform is needed.

## Tools That Produce and Consume LTA Files

| Tool | Mode | Type code typically written | Notes |
|------|------|-----------------------------|-------|
| [[mri_em_register]] | write | `LINEAR_VOX_TO_VOX` | Atlas registration; produces `talairach.lta` |
| [[talairach_avi]] | write | `LINEAR_RAS_TO_RAS` | MNI Talairach registration |
| [[mri_coreg]] | write | `LINEAR_RAS_TO_RAS` | EPI-to-T1 registration |
| [[bbregister]] | write | `REGISTER_DAT` (as `.dat`) or `LINEAR_RAS_TO_RAS` (as `.lta`) | Boundary-based registration |
| [[lta_convert]] | read/write | any | Converts between LTA types and related formats |
| [[mri_vol2surf]] | read | any (converts internally) | Projects volume onto surface |
| [[mri_surf2vol]] | read | any | Projects surface scalars into volume |
| [[mri_convert]] | read | any | Applies transform during conversion |
| [[mri_concatenate_lta]] | read/write | `LINEAR_RAS_TO_RAS` | Concatenates two LTAs |
| [[freeview]] | read | any | Loads transforms for display |
| `mri_robust_register` | write | `LINEAR_RAS_TO_RAS` | Robust registration |
| `mri_fslmat_to_lta` | write | `LINEAR_RAS_TO_RAS` | Converts FSL `.mat` → LTA |

## Conversion

Use [[lta_convert]] to convert between LTA type codes and related formats:

```bash
# Convert VOX_TO_VOX to RAS_TO_RAS
lta_convert --inlta input.lta --outlta output.lta --outreg 1

# Convert register.dat to LTA
lta_convert --inreg register.dat --mov moving.mgz --targ target.mgz \
            --outlta register.lta

# Convert FSL matrix to LTA
mri_fslmat_to_lta fsl.mat moving.mgz target.mgz output.lta
```

Use `mri_fslmat_to_lta` to convert FSL `.mat` → `.lta`, and `lta_convert`
with `--outfsl` to go the other direction.

## Gotchas and Caveats

> [!gotcha] The type code is semantically mandatory
> Loading an LTA and applying it without checking the type code can produce
> silently incorrect results. The 4×4 numbers have no meaning without knowing
> whether they map voxels, RAS mm, or tkRAS mm. `LTAchangeType()` is the
> correct way to normalise to a canonical form before use.

> [!gotcha] `REGISTER_DAT` matrix direction is inverted relative to naming
> The matrix stored under type 14 maps **reference→moving** (not moving→reference),
> despite being called a "registration" of moving onto reference. Any tool that
> reads a `REGISTER_DAT` LTA and wants to map moving voxels into reference space
> must invert the matrix. This is a long-standing historical inversion documented
> explicitly in `utils/transform.cpp:2756–2760` and `3769–3776`.

> [!gotcha] tkRAS is not scanner RAS
> `REGISTER_DAT` matrices operate in **tkRAS** (surface RAS), not scanner RAS.
> The two differ by the `cras` offset (the scanner RAS position of the volume
> centre). Applying a `REGISTER_DAT` matrix in scanner RAS space will produce
> a systematic translation error equal to the `cras` vector.

> [!gotcha] Writing to `.dat`/`.reg` silently discards volume geometry
> `LTAwriteEx()` detects extensions `.dat` and `.reg` and routes to
> `regio_write_register()`, which writes only the 5-field header + 4×4 matrix.
> The `src`/`dst` volume geometry blocks are lost. If the type is not
> `REGISTER_DAT` at write time, the LTA is first converted; if the type is
> `REGISTER_DAT` but the extension is `.lta`, it is written in full LTA format
> (geometry preserved). From `utils/transform.cpp:3290–3306`.

> [!gotcha] FSL `.fslmat` files have no geometry blocks
> `ltaFSLread()` reads only the 4×4 matrix and sets `lta->type = FSLREG_TYPE`.
> Both `src.valid` and `dst.valid` are 0. Type conversion requires that the
> caller populate the geometries before calling `LTAchangeType()`.

> [!gotcha] Multi-transform LTAs (`nxforms > 1`) are legacy
> The `nxforms` field was designed for a mixture-of-experts model. Modern
> FreeSurfer only writes `nxforms = 1`. Code that handles `nxforms > 1`
> exists in `ltaReadFileEx()` and `LTAprint()`, but the volume geometry blocks
> are written only after all transform blocks, paired 1:1 with transforms.
> Tools that concatenate transforms (`mri_concatenate_lta`) always produce
> `nxforms = 1`.

> [!gotcha] Optional `label` field in older LTA files
> The legacy reader `ltaReadFile()` (not the `Ex` variant) reads an optional
> `label = <N>` field after each transform matrix. This field exists in some
> older LTA files to restrict a transform to a specific segmentation label.
> The modern `ltaReadFileEx()` does not read this field; it is effectively
> unused in current FreeSurfer workflows.
> From `utils/transform.cpp:794–800`.

## Related Tools and Pages

- [[lta_convert]] — converts between LTA types and related formats
- [[mri_concatenate_lta]] — composes two LTAs into one
- [[coordinate-systems]] — full treatment of scanner RAS, tkRAS, and voxel spaces
- [[registration-overview]] — conceptual overview of registration in FreeSurfer
- [[mri_fslmat_to_lta]] — FSL mat → LTA conversion
- [[bbregister]] — functional-to-structural registration; primary consumer of register.dat

## Confidence and Gaps

High confidence on the LTA text format — derived directly from `LTAprint()`
and `ltaReadFileEx()` in `utils/transform.cpp` and cross-checked against
real `.lta` files found on disk.

High confidence on the `register.dat` format — derived from
`regio_read_register()` and `regio_print_register()` in `utils/registerio.cpp`.

High confidence on `LTAchangeType()` conversion algebra — documented inline
in the function with diagram comments.

> [!gap] MATLAB_ASCII_TYPE (type 13) format
> The constant `MATLAB_ASCII_TYPE = 13` is defined in `include/transform.h`
> and named in `LTAtransformTypeName()`, but no reader or writer for this
> format was found in `utils/transform.cpp` or `utils/registerio.cpp`. It
> may be handled by an external MATLAB script or may be dead code. The on-disk
> format for type 13 is unknown.

> [!gap] `ras_good_flag` not written to the LTA file
> `VOL_GEOM` has a `ras_good_flag` field that indicates whether the direction
> cosines are trustworthy, but `writeVolGeom()` does not write this field and
> `readVolGeom()` does not read it. The flag is therefore lost when geometry
> is round-tripped through an LTA file.
