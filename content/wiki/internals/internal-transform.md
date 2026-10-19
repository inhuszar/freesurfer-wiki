---
title: "internal-transform"
type: internal
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "include/transform.h"
  - "utils/transform.cpp"
related:
  - "[[lta-format]]"
  - "[[register.dat]]"
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
  - "[[internal-gcamorph]]"
  - "[[internal-matrix]]"
  - "[[lta_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "Exact byte/text layout written by LTAwriteEx / read by LTAreadEx is in lta-format; not re-derived here."
  - "FSLREG_TYPE conversion helpers (MRItkreg2FSL / MRIfsl2TkReg) are summarised, not traced line-by-line."
tags:
  - internal
  - transforms
  - registration
  - coordinates
---

# internal-transform

## Summary

This module is the **linear transform machinery** that underpins every
registration and coordinate operation in FreeSurfer. Its central artefact is
the **LTA** (Linear Transform Array): an array of 4×4 affine matrices, each
paired with the **source and destination volume geometries** they map between,
plus a **type code** that declares *which coordinate frame* the matrices map
*between*. A bare 4×4 matrix is meaningless in FreeSurfer without that
geometry and type — the same registration is a different matrix as
voxel→voxel, scanner-RAS→scanner-RAS, or a tkreg `register.dat`, and the
module's job is to convert losslessly among those representations.

The header defines four structs that build on one another:
[`VOL_GEOM`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L185)
(one volume's grid + RAS embedding),
[`LINEAR_TRANSFORM`/`LT`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L31-L45)
(one matrix + its src/dst geometry),
[`LTA`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L47-L60)
(the array + a `type`), and the
[`TRANSFORM`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L62-L70)
wrapper that unifies a linear LTA with the **non-linear** GCA morph
([[internal-gcamorph]]) behind one polymorphic handle. The load-bearing
algorithm is
[`LTAchangeType`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3695),
which re-expresses a matrix between frames by composing it with the src/dst
**vox2ras** matrices. Anyone working on registration I/O, resampling, surface
↔ volume coordinate mapping, or `lta_convert`/`tkregister2` interoperability
lives in this file. For the coordinate frames themselves see
[[coordinate-systems]]; for the on-disk `.lta` text format see [[lta-format]].

## Source Layout

| File | Lines | Contains |
|------|-------|----------|
| [`include/transform.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h) | 293 | `LINEAR_TRANSFORM`/`LT`, `LTA` (class), `TRANSFORM` structs; the type-code `#define`s; full public API (LTA I/O, type conversion, geometry, point/volume transforms, register.dat ↔ LTA, `RegLandmarks`). |
| [`utils/transform.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp) | ~5.8k | All implementations: `LTAread`/`LTAwrite` family, `LTAchangeType` + its frame-pair helpers, `ltaReadRegisterDat`, MNI `.xfm` reading (`ltaMNIread`/`mincFindVolume`), `VGgetVoxelToRasXform`, `TransformRead`/`Apply`/`Sample`, `TransformRegDat2LTA`/`TransformLTA2RegDat`. |
| [`include/mri.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L185) | — | Defines `VOL_GEOM` itself (the module uses it but does not declare it); `MRI` is a subclass of `VOL_GEOM`. |

`VOL_GEOM` originated as a copy of the geometry fields of `MRI`; today
[`MRI` *is-a* `VOL_GEOM`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L685),
so any `MRI*` is also a valid `VOL_GEOM*`.

## Core Data Structures

### `VOL_GEOM` — the volume the matrix is "about"

A transform is a function between two coordinate spaces, and a *voxel* space
is only defined relative to a specific grid and its embedding in physical
space. `VOL_GEOM` captures exactly that grid for one volume
([`include/mri.h:185-202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L185-L202)):

```c
struct VOL_GEOM
{
  // NOTE: VOL_GEOM is subclassed by MRI, so take that into account when changing
  int           valid;   /* whether this is a valid info or not (1 valid, 0 not valid) */
  int           width ;
  int           height ;
  int           depth ;
  float         xsize = 1; // Added =1 because that is what MRI does
  float         ysize = 1;
  float         zsize = 1;

  int ras_good_flag = 0;  // indicates whether the RAS coordinates are accurate
  float x_r = -1, x_a = 0, x_s =  0;
  float y_r =  0, y_a = 0, y_s = -1;
  float z_r =  0, z_a = 1, z_s =  0;
  float c_r =  0, c_a = 0, c_s =  0;
  float s_r =  0, s_a = 0, s_s =  0;  // the shear components
  char  fname[STRLEN] = {'\0'};  // volume filename
```

Field meaning:

| Field(s) | Meaning |
|----------|---------|
| `width`, `height`, `depth` | grid dimensions in columns (C), rows (R), slices (S). 0-based CRS indices run `0 … dim−1`. |
| `xsize`, `ysize`, `zsize` | voxel sizes (mm) along C, R, S. |
| `x_{r,a,s}`, `y_{r,a,s}`, `z_{r,a,s}` | the three **direction cosine** columns: the unit RAS vector traversed by stepping +1 in C, R, S respectively (the `Mdc` columns). The defaults above are the **LIA / "coronal"** orientation of a conformed volume. |
| `c_{r,a,s}` | scanner-RAS coordinate of the **volume centre** (`c_ras`), i.e. the RAS point at CRS = (W/2, H/2, D/2). This sets the translation. |
| `s_{r,a,s}` | optional shear components (rarely non-zero). |
| `valid` | **gate flag.** `1` ⇒ the geometry is real and the RAS embedding can be trusted; `0` ⇒ unknown/placeholder. `initVolGeom` sets `valid = 0`, `width = height = depth = 256` (comment at [`include/mri.h:183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L183)). |
| `ras_good_flag` | mirrors the MRI flag that the RAS columns are accurate; in practice tracks `valid`. |
| `i_to_r__`, `r_to_i__`, `register_mat` | cached vox↔ras matrices (lazily filled; see [[internal-matrix]]). |

> [!gotcha] A transform without valid geometry cannot be re-expressed
> The 4×4 matrix alone does not say what its rows and columns *mean*.
> `LTAchangeType` therefore refuses to run unless **both** `src.valid` and
> `dst.valid` are non-zero, calling `ErrorExit` otherwise
> ([`utils/transform.cpp:3715-3716`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3715-L3716)).
> An LTA read from a `register.dat` *without* its `--src`/`--dst` volumes has
> `valid = 0` geometries ([`ltaReadRegisterDat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2770))
> and cannot be converted until the geometries are supplied (e.g. via
> `LTAmodifySrcDstGeom`).

The vox→ras (`vox2ras`, "i_to_r") matrix is built from these fields by
[`VGgetVoxelToRasXform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4340)
— see [Algorithms](#algorithms-and-mathematical-foundations).

### `LINEAR_TRANSFORM` / `LT` — one matrix + its endpoints

```c
typedef struct
{
  float      x0 ;            /* center of transform */
  float      y0 ;
  float      z0 ;
  float      sigma ;         /* spread of transform */
  MATRIX     *m_L ;          /* transform matrix */
  MATRIX     *m_dL ;         /* gradient of fuctional wrt transform matrix */
  MATRIX     *m_last_dL ;    /* last time step for momentum */
  int        type;           /* record transform type       */
  VOL_GEOM   src;            /* src for the transform       */
  VOL_GEOM   dst;            /* dst for the transform       */
  int        label ;         // if this xform only applies to a specific label
}
LINEAR_TRANSFORM, LT ;
```
([`include/transform.h:31-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L31-L45))

`m_L` is the 4×4 affine ([[internal-matrix]] `MATRIX`, 1-based, homogeneous).
`src`/`dst` are the **embedded** geometries this matrix maps *from*/*to*. The
matrix maps src-space coordinates → dst-space coordinates, in whatever frame
the parent LTA's `type` declares (e.g. for `LINEAR_VOX_TO_VOX`,
`X_dst = m_L · X_src` with both as homogeneous voxel CRS). `x0/y0/z0`, `sigma`,
`m_dL`, `m_last_dL` are used by the older block/momentum registration solvers
and by GCA-morph code; for a plain registration LTA they are typically unused.
`label` lets a transform apply to a single segmentation label.

### `LTA` — the array + the type

```c
class LINEAR_TRANSFORM_ARRAY
{
 public:
  int               num_xforms ;      /* number linear transforms */
  LINEAR_TRANSFORM  *xforms ;         /* transforms */
  LINEAR_TRANSFORM  *inv_xforms ;     /* inverse transforms */
  int               type ;
  float             fscale ;        // for tkregister2
  char              subject[STRLEN];// for tkregister2
  MATRIX *get_matrix(int InputCoords, int OutputCoords, MATRIX *M);
};
typedef LINEAR_TRANSFORM_ARRAY LTA;
```
([`include/transform.h:47-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L47-L60))

- `xforms` is the array of `num_xforms` transforms; `inv_xforms` caches their
  inverses (filled by `LTAfillInverse`, refreshed at the end of every
  `LTAchangeType`).
- **`type` is the LTA-level frame code** (one of the `#define`s below) and
  governs how every `xforms[i].m_L` is interpreted. The per-`LT` `type` field
  exists but the LTA's `type` is the authority used by `LTAchangeType`.
- `fscale`, `subject` carry the intensity scale and subject id that a
  `register.dat`/tkregister2 file supplies.
- The convenience method
  [`LTA::get_matrix(InputCoords, OutputCoords, M)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L75)
  returns the matrix mapping any of `FS_COORDS_TKREG_RAS` (1),
  `FS_COORDS_SCANNER_RAS` (2), `FS_COORDS_VOXEL` (3) of *src* to any of *dst*,
  without mutating the LTA (it works on a copy). It is the cleanest entry
  point when you just want "the matrix from frame A to frame B".

> [!gotcha] Most LTAs hold exactly one transform
> `num_xforms == 1` is the overwhelmingly common case. Several routines
> (e.g. the `REGISTER_DAT` and `COR_RAS` branches of `LTAchangeType`, and
> `LTA::get_matrix`) assume or operate on `xforms[0]` only. Multi-transform
> LTAs arise mainly from `LTAconcat` and label-specific atlas transforms.

### `TRANSFORM` — the linear/non-linear polymorphic wrapper

```c
typedef struct
{
  int        type ;
  MRI        *mri_xn ;
  MRI        *mri_yn ;
  MRI        *mri_zn ;
  void       *xform ;
}
TRANSFORM ;
```
([`include/transform.h:62-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L62-L70))

`TRANSFORM` is the abstraction the rest of FreeSurfer programs against when a
transform may be **linear or non-linear**. `xform` is an opaque pointer:

- if `type == MORPH_3D_TYPE`, `xform` is a `GCA_MORPH*` (the dense non-linear
  warp — see [[internal-gcamorph]]);
- otherwise `xform` is an `LTA*` and `type` mirrors the LTA's frame code.

[`TransformRead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2150-L2173)
chooses by file type: `.m3z`/`.m3d`/`.mgz`/`.nii[.gz]` → `GCAMread`; `.lta`,
`.xfm`, `.fslmat`, `.dat`/`.reg` and everything else → `LTAreadEx`. Every
`Transform*` operation (`TransformApply`, `TransformSample`, `TransformInvert`,
…) branches on `type == MORPH_3D_TYPE` to dispatch to GCAM, else to the LTA
path. The `mri_xn/yn/zn` fields cache a sampled displacement field for the
morph case.

## The Type-Code System

Every linear `type` names the **pair of coordinate frames** the matrix maps
*from* (src) → *to* (dst). The codes are plain `#define`s
([`include/transform.h:137-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L137-L149)):

```c
#define LINEAR_VOX_TO_VOX       0
#define LINEAR_VOXEL_TO_VOXEL   LINEAR_VOX_TO_VOX
#define LINEAR_RAS_TO_RAS       1
#define LINEAR_PHYSVOX_TO_PHYSVOX 2
#define TRANSFORM_ARRAY_TYPE    10
#define MORPH_3D_TYPE           11
#define MNI_TRANSFORM_TYPE      12
#define MATLAB_ASCII_TYPE       13
#define LINEAR_CORONAL_RAS_TO_CORONAL_RAS       21
#define LINEAR_COR_TO_COR       LINEAR_CORONAL_RAS_TO_CORONAL_RAS
#define REGISTER_DAT            14
#define FSLREG_TYPE             15
```

| Code | Value | Matrix maps (src → dst) | Notes |
|------|------:|-------------------------|-------|
| `LINEAR_VOX_TO_VOX` (`LINEAR_VOXEL_TO_VOXEL`) | 0 | src **voxel CRS** → dst **voxel CRS**, 0-based, homogeneous | The "native grid" form; what resampling ultimately needs. |
| `LINEAR_RAS_TO_RAS` | 1 | src **scanner RAS** → dst **scanner RAS** (mm) | The canonical *geometry-independent* form (apart from the embedded vox2ras). The hub all other conversions route through. |
| `LINEAR_PHYSVOX_TO_PHYSVOX` | 2 | src voxel scaled to **1 mm units** → dst 1 mm-unit voxel | "Physical voxel": CRS multiplied by voxel size. Used to talk to tools that assume isotropic 1 mm voxels. |
| `LINEAR_CORONAL_RAS_TO_CORONAL_RAS` (`LINEAR_COR_TO_COR`) | 21 | src **tkreg/"surface" RAS of a conformed (coronal) volume** → dst same | tkreg RAS; converting to `LINEAR_RAS_TO_RAS` composes the dst sras→ras matrix ([`utils/transform.cpp:4005-4006`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4005-L4006)). |
| `REGISTER_DAT` | 14 | tkreg-RAS form of a **`register.dat`** (tkregister2) | Special direction/labelling — see [REGISTER_DAT](#the-register_dat-special-case). |
| `FSLREG_TYPE` | 15 | FSL FLIRT `.fslmat` convention | FSL's mm-scaled-voxel frame; converts through `REGISTER_DAT`. |
| `MNI_TRANSFORM_TYPE` | 12 | MNI `.xfm` (RAS-to-RAS) | Read by `ltaMNIread`; ends up as RAS-to-RAS. |
| `TRANSFORM_ARRAY_TYPE` | 10 | (file-type tag) an `.lta` containing one of the linear types | Used by `TransformFileNameType` to say "this is an LTA file"; the concrete frame is the LTA's own `type`. |
| `MORPH_3D_TYPE` | 11 | (file-type tag) a non-linear GCA morph | Dispatches the `TRANSFORM` wrapper to GCAM, not LTA. See [[internal-gcamorph]]. |
| `MATLAB_ASCII_TYPE` | 13 | MATLAB ASCII matrix | Legacy I/O tag. |

`LTAtransformTypeName(int)` returns a printable name for a code. The two
"…_TYPE" tags 10/11 are **file-format** discriminators returned by
`TransformFileNameType` from the filename extension
([`utils/transform.cpp:1578-1620`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1578-L1620));
the others are genuine coordinate-frame codes stored in `LTA::type`.

## Algorithms and Mathematical Foundations

### The vox2ras matrix from a `VOL_GEOM`

Every conversion is built from one primitive: a volume's voxel→scanner-RAS
matrix. [`VGgetVoxelToRasXform(vg, m, base)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4340)
assembles it directly from the geometry fields. The 3×3 block is the direction
cosines scaled by voxel size, `M_dc · D`:

$$
M_{dc}\,D=
\begin{bmatrix}
x_r\,\Delta_x & y_r\,\Delta_y & z_r\,\Delta_z\\
x_a\,\Delta_x & y_a\,\Delta_y & z_a\,\Delta_z\\
x_s\,\Delta_x & y_s\,\Delta_y & z_s\,\Delta_z
\end{bmatrix},
\qquad \Delta=(x\text{size},y\text{size},z\text{size})
$$

and the translation column is set so that the volume centre maps to `c_ras`
([`utils/transform.cpp:4378-4393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4378-L4393)):

$$
P_{xyz0}=c_{ras}-M_{dc}\,D\cdot P_{crs,\text{center}},
\qquad
P_{crs,\text{center}}=\left(\tfrac{W}{2}+b,\ \tfrac{H}{2}+b,\ \tfrac{D}{2}+b\right)
$$

where `b` = `base` (0 for FreeSurfer's 0-based CRS, 1 for SPM-style 1-based).
The full vox2ras is `[ M_dc·D | P_xyz0 ; 0 0 0 1 ]`.
[`VGgetRasToVoxelXform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4402)
is its matrix inverse. The header's `vg->get_Vox2RAS()`/`get_RAS2Vox()`
([`include/mri.h:213-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L213-L214))
are the same computation routed through `MRIxfmCRS2XYZ`.

> [!internal] tkreg vs scanner RAS
> The **scanner** vox2ras (above) uses the real `c_ras`. The **tkreg**
> ("surface") vox2ras `MRIxfmCRS2XYZtkreg` instead centres the volume at the
> origin (drops `c_ras`, uses a fixed LIA orientation), which is why surface
> coordinates and `register.dat` live in tkreg-RAS, offset from scanner-RAS by
> exactly `c_ras`. Conversions between the two are
> `get_RAS2TkregRAS()`/`get_TkregRAS2RAS()`
> ([`include/mri.h:217-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L217-L218)).
> See [[coordinate-systems]].

### `LTAchangeType` — the conversion algebra

[`LTAchangeType(lta, ltatype)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3695)
re-expresses every `m_L` **in place** so the same physical mapping is written
in the requested frame, then refreshes the inverse cache. It is a dispatch on
`(current type → requested type)`. `LINEAR_RAS_TO_RAS` acts as the hub: pairs
that have no direct rule are done in two hops via RAS-to-RAS (e.g.
VOX→REGISTER_DAT is VOX→RAS then RAS→REGISTER_DAT,
[`utils/transform.cpp:3850-3853`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3850-L3853)).

The two direct rules between the voxel and RAS frames are the algebraic core,
implemented by the helpers
[`LTAgetV2V`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3645)
and
[`LTAgetR2R`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3669).
Let `R_src` and `R_dst` be the src/dst **scanner vox2ras** matrices
(`vg_i_to_r`, i.e. `VGgetVoxelToRasXform` with `base = 0`). For a matrix
`M_ras` that maps src-RAS → dst-RAS, the equivalent voxel→voxel matrix is

$$
M_{vox\to vox}=R_{dst}^{-1}\;M_{ras}\;R_{src}
$$

— exactly `LTAgetV2V`: `tmp = M·sI2R`, then `mod = dR2I·tmp`, with
`sI2R = vg_i_to_r(src)`, `dR2I = vg_r_to_i(dst)`
([`utils/transform.cpp:3653-3661`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3653-L3661)).
The reverse, `LTAgetR2R`, composes

$$
M_{ras\to ras}=R_{dst}\;M_{vox}\;R_{src}^{-1}
$$

with `sR2I = vg_r_to_i(src)`, `dI2R = vg_i_to_r(dst)`
([`utils/transform.cpp:3677-3685`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3677-L3685)).
Both **require valid src and dst geometries** — that is the entire reason for
the `valid` precondition: without `R_src`/`R_dst` the composition is undefined.

**physvox** scaling. Converting to/from `LINEAR_PHYSVOX_TO_PHYSVOX` first
obtains the vox-to-vox form, then pre/post-multiplies by diagonal voxel-size
matrices so the endpoints are expressed in 1 mm units, e.g.
`m_L = dSize · (M_vox · sISize)` where `sISize = diag(1/Δsrc)` and
`dSize = diag(Δdst)`
([`utils/transform.cpp:3742-3757`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3742-L3757)).

Worked chains a developer can verify in the source:

- **RAS→VOX**: `LTAgetV2V` once ([line 3726](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3726)).
- **VOX→RAS**: `LTAgetR2R` once ([line 3811](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3811)).
- **RAS→REGISTER_DAT**: `mreg = MRItkRegMtx(&dst, &src, m_L)` ([line 3779](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3779)).
- **REGISTER_DAT→RAS**: `MRItkReg2Native(refmri, movmri, m_L)` over reconstituted header MRIs ([lines 3957-3961](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3957-L3961)).
- **RAS→FSLREG / FSLREG→RAS**: through `REGISTER_DAT` via `MRItkreg2FSL` / `MRIfsl2TkReg` ([lines 3785-3795](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3785-L3795), [4043-4050](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4043-L4050)).

The public entry point for the command line is [[lta_convert]], which is a
thin driver over `LTAread*`/`LTAchangeType`/`LTAwrite`.

### The `REGISTER_DAT` special case

`register.dat` is the tkregister2 registration file. Its matrix lives in
**tkreg/surface RAS**, *not* scanner RAS, and — crucially — its **direction is
reversed** relative to the src/dst labelling FreeSurfer attaches to it. The
source documents this candidly:

> *"The definitions of mov=src and ref=dst are consistent with tkregister2,
> LTAchangeType() and ltaReadRegisterDat(). This is an unfortunate definition
> because the TKR registration matrix actually goes from ref to mov. All
> applications should recognize this and invert the matrix as needed. This was
> an error introduced a long, long time ago and the rest of the code base has
> built up around it."*
> — [`utils/transform.cpp:3769-3776`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3769-L3776) (repeated at [2756-2760](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2756-L2760) and [3950-3954](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3950-L3954)).

Concretely, for a `REGISTER_DAT` LTA: `src` is labelled the **moving** volume,
`dst` the **reference**, yet the stored matrix `R` actually maps **ref → mov**
(tkreg-RAS of ref to tkreg-RAS of mov). This is why
[`LTA::get_matrix`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L143-L144)
must **invert** when asked for tkRAS→tkRAS from a `REGISTER_DAT` LTA. Do not
re-derive this convention — treat it as fixed and invert when your direction
needs the other way. See [[register.dat]] for the file layout and
[[coordinate-systems]] for tkreg-RAS.

The round-trips between this convention and LTAs are
[`TransformRegDat2LTA(targ, mov, R)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4417)
(builds a `LINEAR_VOX_TO_VOX` LTA `targ-vox → mov-vox` as
`vox2vox = T_mov^{-1}·R·T_targ` with `T` the **tkreg** vox2ras,
[lines 4431-4438](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4431-L4438)) and its inverse
[`TransformLTA2RegDat(lta)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4460)
(`R = T_mov · vox2vox^{-1} · T_targ^{-1}`,
[line 4506-4508](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4506-L4508)).

## Capabilities

**Allocation / lifecycle.**
[`LTAalloc(nxforms, mri)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L90),
[`LTAfree`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L82),
[`LTAcopy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L83) /
[`LTcopy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L84),
[`LTAcreate(src, dst, T, type)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L257);
`TransformAlloc`/`TransformCopy`/`TransformFree` for the wrapper.

**I/O (LTA).**
[`LTAread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L700)
(always delegates to
[`LTAreadEx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3229), which carries src/dst geometry),
[`LTAreadExType`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3174),
[`LTAwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L687) →
[`LTAwriteEx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L134),
`LTAprint`/`LTAdump`. The on-disk `.lta` text layout is documented in
[[lta-format]].

**I/O (foreign formats).**
[`ltaReadRegisterDat(fname, mov, ref)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2737)
parses a tkregister2 `register.dat` via `regio_read_register`, sets
`type = REGISTER_DAT`, and pulls `fscale`/`subject` from the file; if `mov`/`ref`
volume paths are given it reads their headers into `src`/`dst`, otherwise leaves
those geometries **invalid**.
[`ltaMNIread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L1722)/`ltaMNIreadEx`
parse MNI `.xfm`, with
[`mincFindVolume`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2800)
recovering the src/dst volume paths from the file header comments.
`ltaFSLread` handles `.fslmat`.

**Type conversion / inversion / composition.**
[`LTAchangeType`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3695)
(frame change),
[`LTAinvert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L118)/`LTAfillInverse`,
[`LTAconcat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3396)/`LTAconcat2`/`LTAreduce`,
[`LTAcompose`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L198),
`LTAinvertIfNeeded`/`LTAinversionNeeded` (decide direction from geometry).

**Geometry helpers.**
`initVolGeom`, `copyVolGeom`/`getVolGeom`, `readVolGeom`/`writeVolGeom`,
`vg_isEqual`/`vg_isNotEqualThresh` (geometry comparison with
`vg_isEqual_Threshold`), `LTAmodifySrcDstGeom`/`LTAsetVolGeom` (attach src/dst
geometries), `VGgetVoxelToRasXform`/`VGgetRasToVoxelXform`,
`MRIallocFromVolGeom`.

**Applying a transform.**
[`LTAtransform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L92)/`LTAtransformInterp`
(resample an `MRI` through the LTA), `LTAworldToWorld*`/`LTAtransformPoint`
(map individual RAS points), and the wrapper-level
`TransformApply`/`TransformApplyInverse`/`TransformSample*` that also serve the
GCAM case.

## Invariants, Conventions, and Memory Model

- **0-based CRS.** Voxel coordinates are columns/rows/slices indexed from 0;
  `VGgetVoxelToRasXform(..., base=0)` is the FreeSurfer default. Pass `base=1`
  only for SPM-style 1-based matrices
  ([`utils/transform.cpp:4328-4330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4328-L4330)).
- **`MATRIX` is 1-based and homogeneous.** `m_L` is a 4×4 `MATRIX` whose
  element access is 1-based (`MATRIX_RELT(m,r,c)`, `r,c ∈ 1..4`). See
  [[internal-matrix]].
- **A matrix is meaningless without its frame + geometry.** Always read
  `lta->type` before interpreting `m_L`, and never convert without valid
  `src`/`dst`. The `type` is the contract; the geometry is the data the
  contract needs.
- **`valid == 0` is a hard stop for conversion.** Reading a `register.dat` or
  bare matrix yields invalid geometries; supply them (e.g. `LTAmodifySrcDstGeom`,
  or pass `--src/--dst` to `lta_convert`) before `LTAchangeType`.
- **scanner-RAS vs tkreg-RAS.** `LINEAR_RAS_TO_RAS` is scanner RAS;
  `REGISTER_DAT`/`LINEAR_CORONAL_RAS_TO_CORONAL_RAS` are tkreg/surface RAS.
  They differ by `c_ras` (and orientation). Mixing them silently produces a
  registration that is wrong by the centre offset.
- **Mutation semantics.** `LTAchangeType` mutates the LTA **in place** (it
  rewrites every `m_L` and the `type`), then re-fills `inv_xforms`. If you must
  keep the original, copy first (`LTAcopy`) — which is exactly what
  `LTA::get_matrix` does internally.
- **Memory ownership.** `LTAalloc` allocates `xforms`/`inv_xforms` and each
  `m_L`; `LTAfree` releases them. `VOL_GEOM`'s copy ctor / `operator=`
  deep-copy the cached `i_to_r__`/`r_to_i__` matrices
  ([`include/mri.h:252-256`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L252-L256)).
- **`TRANSFORM.xform` is a tagged union.** Dereference it as `LTA*` only when
  `type != MORPH_3D_TYPE`; as `GCA_MORPH*` only when it is. `TransformFree`
  branches on this to call the right deallocator.

> [!gotcha] `LTAtoVoxelCoords` is deprecated in the header
> The declaration is annotated `// don't use this`
> ([`include/transform.h:111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h#L111)).
> Prefer `LTAchangeType(lta, LINEAR_VOX_TO_VOX)`.

## Consumers

- [[lta_convert]] — the user-facing converter; essentially a CLI over this
  module's read/`LTAchangeType`/write functions.
- [[registration-overview]] and the registration tools (`mri_robust_register`,
  `mri_coreg`, `bbregister`, `tkregister2`, `mri_em_register`) produce and
  consume LTAs / `register.dat`.
- `mri_convert`, `mri_vol2vol`, `mris_apply_reg`, `mri_label2vol` resample or
  map coordinates through an LTA (`LTAtransform`, `LTAworldToWorld`).
- The surface library maps surface (tkreg-RAS) vertices to/from volume space
  using these vox2ras / sras2ras matrices.
- [[internal-gcamorph]] — the non-linear sibling reached through the shared
  `TRANSFORM` wrapper; a `.m3z` warp and an `.lta` are interchangeable at the
  `TransformApply`/`TransformSample` interface.
- The GCA atlas / Talairach machinery (`LTAreadTal`, `DevolveXFM`,
  `FixMNITal`, `TransformCRS2MNI305`) uses LTAs to move between subject and
  atlas space.

## Related Internals

- [[internal-matrix]] — the `MATRIX`/`VECTOR` type that `m_L` and every vox2ras
  matrix is built on (1-based, homogeneous 4×4); supplies `MatrixMultiply`,
  `MatrixInverse`, `MatrixIdentity` used throughout the conversion algebra.
- [[internal-gcamorph]] — the non-linear `GCA_MORPH`; the other half of the
  `TRANSFORM` wrapper.

## Gotchas and Sharp Edges

- **`register.dat` direction is inverted vs its src/dst labels** — see
  [the REGISTER_DAT section](#the-register_dat-special-case). The historical
  `mov=src`/`ref=dst` labelling does not match the matrix's actual ref→mov
  direction; invert as needed.
- **Invalid geometry → `ErrorExit`, not a soft failure.** `LTAchangeType`
  aborts the process if either geometry is invalid; callers that read a
  geometry-less `register.dat` must attach geometries first.
- **`type` codes mix two roles.** Values 10 (`TRANSFORM_ARRAY_TYPE`) and 11
  (`MORPH_3D_TYPE`) are *file-type* tags from the filename, while 0/1/2/14/15/21
  are *coordinate-frame* tags. `TransformFileNameType` returns the former;
  `LTA::type` stores the latter. Don't conflate them.
- **`LTAread`'s dead switch.** `LTAread`'s body `return (LTAreadEx(fname))`s
  immediately; the `switch` below it is unreachable
  ([`utils/transform.cpp:706`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L706)).
  All reads go through `LTAreadEx` (which preserves src/dst geometry), so an LTA
  always arrives with its endpoints when the file recorded them.
- **physvox / FSL are not the same as their "obvious" cousins.** The source
  notes that `register.dat` is *not* `COR_RAS_TO_COR_RAS` and a FSL matrix is
  *not* `PHYSVOX_TO_PHYSVOX`, despite the geometric resemblance — the maintainer
  switched the codes after they "did not work"
  ([`utils/transform.cpp:2789-2793`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L2789-L2793),
  [3364-3368](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3364-L3368)).

## Confidence and Gaps

> [!gap] Not traced here
> - The exact text/byte layout that `LTAwriteEx` emits and `LTAreadEx` parses
>   (header keys, geometry block) is the province of [[lta-format]]; this page
>   describes the in-memory model, not the serialization.
> - `MRItkRegMtx`, `MRItkReg2Native`, `MRItkreg2FSL`, `MRIfsl2TkReg` are cited
>   as the conversion primitives but their internals (the precise tkreg/FSL
>   matrix algebra) live in `mri.cpp`/`mri2.cpp` and were not opened here.
> - The block/momentum solver fields (`m_dL`, `m_last_dL`, `x0/sigma`) are
>   described by role; their use by the legacy registration optimisers was not
>   traced.

## References

- Canonical headers:
  [`include/transform.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/transform.h),
  [`include/mri.h` (VOL_GEOM)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L185).
- Conversion core:
  [`LTAchangeType`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3695),
  [`LTAgetV2V`/`LTAgetR2R`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L3645-L3689),
  [`VGgetVoxelToRasXform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/transform.cpp#L4340).
- Related wiki: [[coordinate-systems]], [[lta-format]], [[register.dat]],
  [[registration-overview]], [[lta_convert]], [[internal-matrix]],
  [[internal-gcamorph]].
