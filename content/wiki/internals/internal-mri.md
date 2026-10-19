---
title: "internal-mri"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/mri.h"
  - "utils/mri.cpp"
  - "utils/mri2.cpp"
related:
  - "[[coordinate-systems]]"
  - "[[mgz]]"
  - "[[internal-matrix]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "Sinc and cubic-B-spline interpolation kernels (MRIsincSampleVolume, MRIcubicSampleVolume, the bspline path) are named but not traced in detail."
  - "Higher-level operations in utils/mri2.cpp are deliberately summarised, not documented."
  - "Behaviour of the shear components (s_r,s_a,s_s) is partially audited: they are read/written and optionally folded into vox2ras, but most of the code base ignores them."
tags:
  - internal
  - volume
  - data-structure
  - geometry
  - sampling
---

# internal-mri

## Summary

The `MRI` type is FreeSurfer's universal in-memory representation of a
volumetric image: a 4-D array (column × row × slice × frame) of a single
numeric type, plus the header metadata that ties voxel indices to physical
(RAS) space. Essentially every `mri_*` tool, the surface placement code, the
atlas/registration machinery, and FreeView load their data into an `MRI` and
operate on it through the functions declared in
[`include/mri.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h)
and implemented (for the core operations) in
[`utils/mri.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp).

This page documents the data structure (the `MRI` class and its `VOL_GEOM`
base, the `MRI_FRAME` per-frame block), how voxels are stored and addressed,
how the scanner and tkreg vox2ras matrices are derived from the geometry
fields, the intensity-sampling/interpolation family, and the memory model and
invariants a caller must respect (allocation, copy semantics, the conformed
reference space, validity flags). It is the entry point for anyone reasoning
about how a volume is represented or manipulated. On-disk serialisation of an
`MRI` is the `.mgz`/`.mgh` format — see [[mgz]]; the read/write functions
(`MRIread`/`MRIwrite`) live mostly in `utils/mriio.cpp` and are out of scope
here.

## Source Layout

| File | Lines | Contains |
|------|-------|----------|
| [`include/mri.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h) | ~2177 | `VOL_GEOM`, `MRI`, `MRI_FRAME`, `MRI_REGION` definitions; type/sample/interp constants; voxel-access macros; the entire public API (≈900 function prototypes). |
| [`utils/mri.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp) | ~18000 | Constructors/destructor, allocation, voxel get/set, vox2ras geometry, sampling/interpolation, copy/clone, arithmetic, filtering, resampling, extraction — the load-bearing core. |
| [`utils/mri2.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri2.cpp) | ~9000 | "more routines for loading, saving, and operating on MRI structures" — higher-level operations (e.g. `MRIvol2vol*`, masking, vote/segmentation helpers, NIfTI helpers). Summarised here, not fully documented. |

> [!note] Naming
> The historical `MRIalloc*` / `MRIfree` C functions still exist but are thin
> wrappers around the C++ `new MRI(...)` / `delete` path
> ([`utils/mri.cpp:515-538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L515-L538)).
> `MRI` is a C++ class (subclass of `VOL_GEOM`) as of FS 8, not a plain C
> struct, but is still used through the C-style function API everywhere.

## Core Data Structures

### `MRI` (the volume) and its `VOL_GEOM` base

As of FS 8, geometry fields live in a base class `VOL_GEOM` from which `MRI`
inherits; image-buffer and metadata fields live in `MRI` itself. A developer
reasoning about geometry must look at **both**. The class declaration
([`include/mri.h:685-830`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L685-L830)):

```cpp
class MRI : public VOL_GEOM
{
public:
  ...
  // ---- image geometry ----
  int nframes;      // number of frames
  Shape shape;      // volume shape
  int imnr0;        // starting image number
  int imnr1;        // ending image number
  float xstart;     // starting x (in xsize units)
  ...
  float thick = 1;
  int scale = 1;
  float ps = 1;
  float fov;

  // ---- indices to handle boundary conditions ----
  int *xi = nullptr;
  int *yi = nullptr;
  int *zi = nullptr;
  ...
  // ---- transforms ----
  char transform_fname[STRLEN];
  General_transform transform;
  Transform *linear_transform = nullptr;
  Transform *inverse_linear_transform = nullptr;
  int free_transform = 0;
  MATRIX *AutoAlign = nullptr;       // for Andre

  // ---- volume metadata ----
  double outside_val = 0;
  ...
  MRI_FRAME *frames = nullptr;
  COLOR_TABLE *ct = nullptr;
  MRI_REGION roi;

  // ---- scan parameters ----
  float tr = 0;                 // time to recovery, nifti1 hdr.pixdim[4]
  float te = 0;                 // time to echo
  float ti = 0;                 // time to inversion
  double flip_angle = 0;        // flip angle in radians
  float FieldStrength = 0;      // field strength
  ...
  MATRIX *origRas2Vox = nullptr ;  // to get to original voxel grid from ras
  ...
  // ---- image buffer ----
  int type;                     // image data type
  ...
  size_t bytes_per_vox = 0;     // bytes per voxel
  size_t bytes_total = 0;       // total bytes in buffer
  size_t vox_per_row = 0;       // number of voxels per volume row
  size_t vox_per_slice = 0;     // number of voxels per volume slice
  size_t vox_per_vol = 0;       // number of voxels per volume frame
  size_t vox_total = 0;         // total number of voxels in the volume
  int ischunked;                // indicates whether the buffer is chunked (contiguous)
  bool owndata = true;          // indicates ownership of the chunked buffer data
  BUFTYPE ***slices = nullptr;  // fallback non-contiguous storage for 3D-indexed image data
  void *chunk = nullptr;        // default contiguous storage for image data
};
```

And the geometry base
([`include/mri.h:185-208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L185-L208)):

```cpp
struct VOL_GEOM
{
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

  AffineMatrix *i_to_r__ = nullptr;  // cached i->r transform
  MATRIX *r_to_i__ = nullptr;        // cached r->i transform
  MATRIX *register_mat = nullptr;
  ...
};
```

The load-bearing fields:

| Field(s) | Meaning / units | Notes |
|----------|-----------------|-------|
| `width`, `height`, `depth` | number of **columns (C), rows (R), slices (S)** | inherited from `VOL_GEOM`. Index order is C-R-S; see "voxel access" below. |
| `nframes` | 4th dimension (time / multi-volume) | lives in `MRI`, **not** `VOL_GEOM`, so it is *not* part of `VOL_GEOM` geometry comparison. |
| `type` | data type of every voxel | one of `MRI_UCHAR`(0), `MRI_INT`(1), `MRI_LONG`(2), `MRI_FLOAT`(3), `MRI_SHORT`(4), `MRI_BITMAP`(5), `MRI_TENSOR`(6), `MRI_FLOAT_COMPLEX`(7), `MRI_DOUBLE_COMPLEX`(8), `MRI_RGB`(9), `MRI_USHRT`(10) ([`include/mri.h:53-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L53-L63)). A volume has a **single** type for all voxels and frames. |
| `xsize`, `ysize`, `zsize` | voxel size **in mm** along C, R, S | default `1`. These are the *spacings*, not extents. |
| `x_r,x_a,x_s` / `y_*` / `z_*` | **direction cosines** | three unit vectors: `x_*`= column direction, `y_*`= row direction, `z_*`= slice direction, each expressed in scanner RAS. Defaults encode **LIA** coronal (column→−R, row→−S, slice→+A). |
| `c_r,c_a,c_s` | scanner-RAS coordinate (mm) of the **volume centre** | the single translation anchor; `xstart`/`xend` etc. are derived display extents, not the geometric anchor. |
| `s_r,s_a,s_s` | shear components | usually 0; only folded into vox2ras when explicitly requested (`useshear`). Most code ignores them — see Gotchas. |
| `ras_good_flag` | 1 ⇒ direction cosines / centre are trustworthy; 0 ⇒ geometry is a fallback/guess | governs whether RAS-based ops should be believed; reset to 0 by ops that invalidate geometry (e.g. `MRItranslate`, `MRIrotateX`). |
| `valid` (`VOL_GEOM`) | whether the `VOL_GEOM` carries valid info | distinct field from `ras_good_flag`, though the header comments note they "mean the same thing"; both exist for historical reasons. |
| `i_to_r__`, `r_to_i__` | **cached** vox→ras (`AffineMatrix`) and ras→vox (`MATRIX`) transforms | derived from the geometry fields; must be rebuilt with `MRIreInitCache()` whenever direction cosines/sizes/centre change. |
| `register_mat` | a registration matrix carried with the volume | moved into `VOL_GEOM` from `MRI` (see header note at [`include/mri.h:204-208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L204-L208)). |
| `ct` (`COLOR_TABLE *`) | embedded colour/label table | non-NULL marks the volume as a **segmentation** (FreeView relies on this). Deep-copied by `MRIcopyHeader`/`MRIclone`. See [[color-lut]]. |
| `frames` (`MRI_FRAME *`) | per-frame metadata array, length `nframes` | echo time, label, per-frame `m_ras2vox`, DTI gradient fields, etc. (see below). |
| `outside_val` | value returned when sampling outside the FOV | default 0; consulted by the samplers and by `MRIgetVoxVal` for negative indices. |
| `slices`, `chunk`, `ischunked`, `owndata` | the actual voxel storage | see "Memory model". |
| `bytes_per_vox`, `vox_per_row/slice/vol`, `vox_total`, `bytes_total` | precomputed strides/sizes | used by the chunked fast paths of get/set; kept in sync by the constructor and `MRIcopyHeader`. |

> [!gotcha] `width` is columns, not the X axis
> `width`=columns(C), `height`=rows(R), `depth`=slices(S). These are **array
> dimensions**, deliberately decoupled from anatomical X/Y/Z — the mapping to
> RAS is carried entirely by the direction cosines. A "coronal" conformed
> volume has its slice axis pointing anterior, not superior. Never assume
> column = left-right.

### `MRI_FRAME` (per-frame block)

Each frame carries its own metadata block
([`include/mri.h:99-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L99-L158)).
For most volumes only a handful of fields matter:

- `type` (frame content code), `label` (index into a CLUT), `name`,
  `thresh`, `dof` (e.g. number of subjects for a stat map), `units`.
- Pulse parameters per frame: `TE`, `TR`, `flip`, `TI`, `TD`.
- A large block of **DTI** fields: `read_dir`/`pe_dir`/`slice_dir`, `bvalue`,
  gradient ramps/amplitudes, mixing time `TM`, `diffusion_type`.
- `m_ras2vox` (a `MATRIX *`) — allocated to identity per frame but, per the
  header comment, "initialized to identity matrix, but not used".

> [!note] Per-frame metadata serialisation
> `TAG_MRI_FRAME` in `.mgz`/`.mgh` writes the **whole** `MRI_FRAME` struct;
> the FreeSurfer NIfTI header extension writes only `label`, `name`, `thresh`
> ([`include/mri.h:94-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L94-L98)).

### `MRI_REGION`

A simple `(x,y,z,dx,dy,dz)` voxel-space box
([`include/mri.h:161-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L161-L170)),
used by bounding-box and extraction routines (`MRIextractRegion`,
`MRIboundingBox`, …).

## Capabilities

The public API in `include/mri.h` is large (~900 prototypes). Grouped by
purpose, with the canonical entry points:

- **Allocation / lifetime** — `MRIalloc`, `MRIallocSequence` (with frames),
  `MRIallocHeader` (no buffer), `MRIfree`; `MRIclone` / `MRIcloneBySpace`
  (header only) and `MRIcopy` (header + data).
- **Voxel access** — type-specific macros (`MRIvox`, `MRIFvox`, `MRISvox`, …
  and their `*seq_vox` frame variants) and the type-agnostic
  `MRIgetVoxVal` / `MRIsetVoxVal`.
- **Geometry / coordinate transforms** — `MRIxfmCRS2XYZ` (scanner vox2ras),
  `MRIxfmCRS2XYZtkreg` (tkreg vox2ras), `extract_i_to_r`/`extract_r_to_i`
  (= `MRIgetVoxelToRasXform`/`MRIgetRasToVoxelXform`),
  `MRIsetVox2RASFromMatrix`, `MRIreInitCache`, and the RAS/surface-RAS/voxel
  conversion helpers (`MRIvoxelToSurfaceRAS`, `MRIsurfaceRASToVoxel[Cached]`,
  `MRIscannerRASToVoxel`, …). FSL/SPM variants exist
  (`MRIxfmCRS2XYZfsl`, `base=1`).
- **Sampling / interpolation** — `MRIsampleVolume` (trilinear),
  `MRIsampleVolumeType` (dispatch by `SAMPLE_*`), `MRIsampleVolumeFrame[Type]`,
  `MRIsampleSeqVolume` (all frames at once), `MRIsincSampleVolume`,
  `MRIcubicSampleVolume`, gradient samplers; `MRIinterpCode`/`MRIinterpString`
  for the string↔code convention.
- **Arithmetic / statistics** — `MRIadd`/`MRIsubtract`/`MRImultiply`/
  `MRIdivide`, `MRIscalarMul`, `MRImean`/`MRIstd` family, `MRIvalRange`,
  histograms.
- **Filtering / morphology / resampling** — Sobel/Laplacian/diffusion,
  `MRIupsampleN`/`MRIdownsampleN`/`MRIresize`, `MRIreorder`, region extraction.
- **Transforms applied to data** — `MRIlinearTransform[Interp]`,
  `MRIapplyRASlinearTransform*`, `MRItranslate`/`MRIrotate*`/`MRIscale`.

Higher-level resampling between volumes (e.g. `MRIvol2vol`) and many
segmentation/masking helpers live in
[`utils/mri2.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri2.cpp)
and are not enumerated here.

### Voxel access: macros vs. `MRIgetVoxVal`/`MRIsetVoxVal`

Two access styles coexist:

1. **Type-specific macros** — fastest, no type dispatch, no bounds check.
   They index the `slices` pointer array directly
   ([`include/mri.h:1477-1498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L1477-L1498)):

   ```c
   #define MRISvox(mri,x,y,z)  (((short *)mri->slices[z][y])[x])
   #define MRIFvox(mri,x,y,z)  (((float *)(mri->slices[z][y]))[x])
   #define MRIvox(mri,x,y,z)   (((BUFTYPE *)mri->slices[z][y])[x])   // unsigned char
   #define MRIIvox(mri,x,y,z)  (((int *)mri->slices[z][y])[x])
   ...
   #define MRIFseq_vox(mri,x,y,z,n)  (((float*)(mri->slices[z+((n)*mri->depth)][y]))[x])
   ```

   The caller **must** pick the macro matching `mri->type` (`MRIvox` for
   `MRI_UCHAR`, `MRIFvox` for `MRI_FLOAT`, `MRISvox` for `MRI_SHORT`, etc.) —
   using the wrong one reinterprets the bytes. The frame-indexed `*seq_vox`
   variants reach frame `n` by offsetting the slice index by `n*depth`
   (frames are stacked along the slice pointer array — see Memory model).

2. **Type-agnostic accessors** — `MRIgetVoxVal(mri,c,r,s,f)` returns a `float`
   regardless of `type`, and `MRIsetVoxVal(...,voxval)` writes a `float`
   (rounding/clipping to the stored type)
   ([`utils/mri.cpp:1626-1693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1626-L1693),
   [`utils/mri.cpp:1737-1825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1737-L1825)).
   These switch on `mri->type` internally and are the right choice for
   type-generic code; the header comment calls them "general but slow."
   `MRIsetVoxVal` **clips** out-of-range values to the type's min/max before
   storing (e.g. a value > 255 written to an `MRI_UCHAR` is clamped to 255).

> [!gotcha] `MRIgetVoxVal` only guards the *lower* index bound
> It returns `mri->outside_val` if any of `c,r,s` is **negative**, but does
> **not** check the upper bound — `c >= width` (etc.) reads out of bounds.
> Callers must range-check the high side themselves. The samplers
> (`MRIsampleVolume*`) do clamp both ends via `MRIindexNotInVolume`.

The **CRS index convention** is `(column, row, slice, frame)` = `(c,r,s,f)`,
0-based, matching `(width,height,depth,nframes)`. In the macros these are
spelled `(x,y,z)` but mean column/row/slice, **not** anatomical X/Y/Z.

## Algorithms and Mathematical Foundations

### Scanner vox2ras from the geometry fields

The native (scanner) vox→ras matrix is built by `MRIxfmCRS2XYZ`
([`utils/mri.cpp:589-662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L589-L662)).
The construction is:

$$T \;=\; \begin{bmatrix} M_{dc}\,D & P_{0} \\ 0\;0\;0 & 1 \end{bmatrix},
\qquad
M_{dc} = \big[\, V_{col}\ V_{row}\ V_{slice} \,\big],
\quad D = \mathrm{diag}(x_{size}, y_{size}, z_{size})$$

where $V_{col}=[x_r\,x_a\,x_s]^\top$, $V_{row}=[y_r\,y_a\,y_s]^\top$,
$V_{slice}=[z_r\,z_a\,z_s]^\top$ are the direction cosines, and the
translation $P_0$ is chosen so the volume **centre** maps to
$(c_r,c_a,c_s)$:

$$P_{0} \;=\; \begin{bmatrix}c_r\\c_a\\c_s\end{bmatrix}
        - M_{dc} D \begin{bmatrix}\tfrac{width}{2}+\text{base}\\
                                  \tfrac{height}{2}+\text{base}\\
                                  \tfrac{depth}{2}+\text{base}\end{bmatrix}.$$

`base` is 0 for the standard 0-based grid and 1 for SPM's 1-based convention.
Optionally, if `useshear` is set and the shear components exceed `1e-5`, a
unit-upper-triangular shear matrix is right-multiplied into $M_{dc}D$
([`utils/mri.cpp:626-638`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L626-L638)).
The arithmetic is done in `double` (`#define MRIxfmCRS2XYZPrecision double`,
[`utils/mri.cpp:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L102)).
`extract_i_to_r` is simply `MRIxfmCRS2XYZ(mri,0)`
([`utils/mri.cpp:719-724`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L719-L724)),
and `MRIgetVoxelToRasXform`/`MRIgetRasToVoxelXform` are `#define`d to
`extract_i_to_r`/`extract_r_to_i`
([`include/mri.h:1950-1951`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L1950-L1951)).
The inverse `r_to_i` is the matrix inverse of `i_to_r`
([`utils/mri.cpp:729-736`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L729-L736)).

> [!internal] The coordinate-system math is documented once, in the concept page
> The full derivation, the meaning of scanner-RAS vs. tkreg/surface-RAS, and
> the worked Vox2RAS example live in [[coordinate-systems]]. This page only
> states which functions in `internal-mri` realise it. The matrix algebra
> itself (allocation, inversion, `MATRIX_RELT`) is [[internal-matrix]].

### Tkreg (surface) vox2ras

`MRIxfmCRS2XYZtkreg` builds the tkregister vox→ras matrix used for
surface/"surfaceRAS" coordinates
([`utils/mri.cpp:835-867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L835-L867)).
It does **not** use the volume's real direction cosines: it constructs a
temporary header with **fixed** tkreg cosines (column→−R, row→−S, slice→+A —
i.e. LIA) and a **centre forced to RAS origin** (`c_r=c_a=c_s=0`), keeps the
real voxel sizes, and calls `MRIxfmCRS2XYZ` on that. Consequently the scanner
and tkreg vox2ras differ by a pure translation for an axis-aligned volume and
coincide only for a conformed volume whose centre is already at the origin.

> [!gotcha] tkreg/"surface" RAS ≠ scanner RAS for non-conformed volumes
> The in-code comment is explicit: what the surface code calls "surface RAS"
> is really tkregister RAS; "they are the same with conformed volumes, but
> surface RAS is wrong otherwise"
> ([`utils/mri.cpp:3509-3512`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3509-L3512)).
> Surfaces are stored in tkreg-RAS by default; use
> `MRIvoxelToSurfaceRAS` / `MRIsurfaceRASToVoxel`, not the scanner-RAS path,
> when round-tripping surface coordinates.

### Intensity sampling and interpolation

`MRIsampleVolume` performs **trilinear** interpolation at fractional
`(x,y,z)` (column/row/slice)
([`utils/mri.cpp:9688-9777`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L9688-L9777)).
Key behaviours:

- If `(x,y,z)` are all integers, it short-circuits to nearest-neighbour
  (`MRIsampleVolumeType(...,SAMPLE_NEAREST)`).
- Out-of-bounds (`MRIindexNotInVolume == 1`) returns `mri->outside_val`;
  otherwise indices are clamped into `[0, dim-1]`.
- The eight corner values are weighted by the complementary fractional
  distances $x_{pd}=1-x_{md}$, etc. — the standard
  $\sum w_i V_i$ with $w$ products of per-axis weights. The corner reads use
  the type-specific macros, so a `switch` on `mri->type` selects the cast.

`MRIsampleVolumeType` is the dispatcher
([`utils/mri.cpp:9371-9426`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L9371-L9426)):

| `SAMPLE_*` constant | value | routine |
|---------------------|-------|---------|
| `SAMPLE_NEAREST` | 0 | inline nearest (`nint` of CRS, clamped) |
| `SAMPLE_TRILINEAR` | 1 | `MRIsampleVolume` |
| `SAMPLE_SINC` | 2 | `MRIsincSampleVolume(...,hw=5,...)` |
| `SAMPLE_CUBIC` | 3 | `MRIcubicSampleVolume` |
| `SAMPLE_CUBIC_BSPLINE` | 5 | (B-spline path; separate machinery) |
| `SAMPLE_VOTE` | 6 | majority vote, for downsampling aseg |

Constants are defined at
[`include/mri.h:45-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L45-L51).

> [!gotcha] "cubic" string maps to a *different* code than `SAMPLE_CUBIC`
> `MRIinterpCode("cubic")` returns `SAMPLE_CUBIC_BSPLINE` (5), **not**
> `SAMPLE_CUBIC` (3)
> ([`utils/mri.cpp:1884-1893`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1884-L1893)).
> Tools that take a `-cubic` flag therefore select the B-spline path, while
> code that passes the literal `SAMPLE_CUBIC` to `MRIsampleVolumeType` gets
> the classic cubic in `MRIcubicSampleVolume`. The interp **string↔code** API
> recognises only nearest / trilinear (also "tli") / sinc / cubic; matching is
> by the first 3 characters (`strncasecmp(...,3)`).

`MRIsampleSeqVolume` samples every frame in `[firstframe,lastframe]` at one
location (used heavily by time-series and multi-frame resampling). Gradient
samplers (`MRIsampleVolumeGradient*`, `MRIgradTrilinInterp`) return the
spatial derivative of the trilinear field (which has a discontinuous gradient,
as the in-code comment warns).

## Invariants, Conventions, and Memory Model

### Memory model: `slices` always; `chunk` usually

The constructor `MRI::MRI(Shape, dtype, alloc)`
([`utils/mri.cpp:181-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L181-L243))
sets sizes, allocates `frames`, builds the cached `i_to_r__`/`r_to_i__`, and
(if `alloc`) tries to allocate one **contiguous** buffer:

```c
chunk = calloc(bytes_total, 1);
ischunked = bool(chunk);
initSlices();
initIndices();
```

- `initSlices()`
  ([`utils/mri.cpp:264-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L264-L314))
  **always** builds the `slices[nslices][height]` pointer array
  (`nslices = depth*nframes`). When `ischunked`, every `slices[s][r]` points
  *into* the single `chunk` buffer; when not, each slice gets its own
  `calloc`'d buffer. Thus the macros (`MRIvox` etc.) work identically whether
  or not the volume is chunked — they always go through `slices`.
- The buffer is laid out **column-fastest**: within a row, columns are
  contiguous; rows tile a slice; slices tile a frame; frames are stacked. The
  chunked fast path in `MRIgetVoxVal` indexes
  `chunk[c + r·vox_per_row + s·vox_per_slice + f·vox_per_vol]`
  ([`utils/mri.cpp:1650`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1650)),
  and the `*seq_vox` macros reach frame `n` via slice index `s + n·depth`.
- `owndata` (default `true`) governs whether the destructor `free()`s `chunk`
  ([`utils/mri.cpp:382-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L382-L389)).
  Set it false when an `MRI` wraps a borrowed/external buffer so the
  destructor does not free memory it does not own.
- `MRI_FLOAT_COMPLEX` stores real/imag as adjacent `float` pairs (2×32 bits
  per voxel); `MRIgetVoxVal`/`MRIsetVoxVal` take a `mode`
  (`MRI_COMPLEX_REAL`/`MRI_COMPLEX_IMAG`) to pick one.
- `MRI_RGB` is stored as `int` (`MRIsizeof` maps it to `sizeof(int)` because
  "freeview expects MRI_RGB to be an integer",
  [`utils/mri.cpp:1470-1484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1470-L1484)).

`initIndices()`
([`utils/mri.cpp:321-363`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L321-L363))
allocates the `xi`/`yi`/`zi` arrays, offset by `MAX_INDEX` (=500,
[`utils/mri.cpp:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L100)),
so that `mri->xi[i]` for `i ∈ [−500, width+500)` clamps to a valid column
index (`0` below, `width-1` above). This gives filters a cheap, branch-free
"replicate edge" boundary condition: `MRIvox(mri, mri->xi[x-1], ...)`.

### What a copy preserves vs. discards

- `MRIcopyHeader(src,dst)`
  ([`utils/mri.cpp:6198-6303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L6198-L6303))
  copies essentially all header fields: dimensions-derived strides,
  voxel sizes, **all direction cosines and centre**, `ras_good_flag`,
  pulse params, `transform`, the recomputed stride/byte counts, the command
  provenance (`cmdlines`), and — when present — **deep-copies** `ct`,
  `AutoAlign`, `origRas2Vox`, `i_to_r__`, `r_to_i__`, and `register_mat`.
- `MRIcopy(src,dst)`
  ([`utils/mri.cpp:5783+`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L5783))
  calls `MRIcopyHeader` and then copies the **voxel data** (with type
  conversion if `src`/`dst` types differ, row-by-row `memmove` when equal).
- `MRIclone(src,dst)`
  ([`utils/mri.cpp:5724-5736`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L5724-L5736))
  allocates a same-shape/type volume, deep-copies the colour table, and
  copies the header — **but not the voxel data** (a zeroed buffer with the
  same geometry). `MRIcloneBySpace` additionally copies pulse parameters.

> [!contradiction] `register_mat` *is* copied in 8.2.0 (older folklore says it is not)
> A common belief (and the premise of some older notes) is that "`MRIcopy`
> does not copy `register_mat`." In FS 8.2.0 this is **false**:
> `MRIcopyHeader` copies it when present —
> `if (mri_src->register_mat != NULL) MatrixCopy(mri_src->register_mat, mri_dst->register_mat); else mri_dst->register_mat = NULL;`
> ([`utils/mri.cpp:6268-6271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L6268-L6271)),
> and since `MRIcopy` and `MRIclone` both delegate to `MRIcopyHeader`, both
> propagate `register_mat`. Code is authoritative; treat the "not copied"
> claim as obsolete for this version.

### Cached transforms must be reinitialised after geometry edits

`i_to_r__`/`r_to_i__` are caches of the vox2ras/ras2vox derived from the
direction cosines, sizes, and centre. If you mutate any of those fields
directly, the caches are stale until you call `MRIreInitCache(mri)`
([`utils/mri.cpp:3836-3853`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3836-L3853)),
which frees and rebuilds both from `extract_i_to_r`/`extract_r_to_i`. The
`VOL_GEOM` constructor and `MRI::MRI(VOL_GEOM,...)` already call it
([`utils/mri.cpp:161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L161));
`MRIsetVox2RASFromMatrix` updates the fields then expects a reinit.

### `ras_good_flag` semantics

`ras_good_flag == 1` asserts the direction cosines and centre are real
(from the scanner / a trusted header); `0` means they are a fallback default
and RAS-based reasoning should not be trusted. Operations that move data in a
way that breaks the stored geometry deliberately set `ras_good_flag = 0`
(e.g. `MRItranslate`
[`utils/mri.cpp:6346`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L6346),
`MRIrotateX`
[`utils/mri.cpp:6384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L6384)).
Conversely the constructor sets it to 1 once a buffer is allocated.

### The conformed reference space

FreeSurfer's "conformed" space is the canonical reference grid most of
`recon-all` operates in: **256 × 256 × 256**, **1 mm isotropic**, **LIA**
orientation (the default direction cosines above). `mri_convert -c` (and
`recon-all`) resample inputs into it; surface coordinates are tkreg-RAS of
this grid. `mriOKforSurface`/`setMRIforSurface` (implemented in
`utils/mriio.cpp`, declared at
[`include/mri.h:1994-1999`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L1994-L1999))
check/enforce conformance and zero the centre for a conformed volume. See
[[wiki/tools/mri_convert|mri_convert]] and [[coordinate-systems]] for the
end-to-end treatment.

> [!gotcha] Editing `slices` and `chunk` are the same memory when chunked
> When `ischunked`, writing through a `slices`-based macro and writing through
> the `chunk` pointer hit the same bytes — `slices[s][r]` points into `chunk`.
> `MRIsetVoxVal` even executes **both** its chunked-path write and its
> `slices`-path write for a chunked volume
> ([`utils/mri.cpp:1776-1823`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L1776-L1823));
> this is redundant but harmless because they alias.

## Consumers

The `MRI` type is the most widely depended-upon structure in FreeSurfer.

- **Every `mri_*` tool** — conversion ([[wiki/tools/mri_convert|mri_convert]]),
  resampling (`mri_vol2vol`), segmentation, intensity normalisation, etc.,
  load data into `MRI` and call this API.
- **Surface placement / `MRIS`** — reads intensities via the samplers and
  converts surface (tkreg) RAS ↔ voxel through the geometry functions here;
  see [[surface-representations]] and `[[internal-mrisurf-metricproperties]]`.
- **Atlas / registration** — the GCA atlas and the GCAM nonlinear warp store
  source/target geometry as `VOL_GEOM` and resample with the `MRI` samplers;
  see `[[internal-gcamorph]]` and [[registration-overview]].
- **I/O** — `MRIread`/`MRIwrite` (utils/mriio.cpp) serialise/deserialise the
  whole struct to [[mgz]] / [[nifti]] and friends.
- **FreeView** — loads volumes as `MRI`, relies on `ct` to mark
  segmentations, and on `MRI_RGB` being int-sized.

**Blast radius:** changing the geometry fields, the storage layout
(`slices`/`chunk`/`ischunked`), the index convention, or the vox2ras
derivation would ripple through essentially the entire suite. The cached
matrices and `MRIcopyHeader` field list are the usual places a subtle bug
(stale cache, dropped field) hides.

## Related Internals

- [[internal-matrix]] — the `MATRIX`/`VECTOR` algebra (`MatrixMultiply`,
  `MatrixInverse`, `MATRIX_RELT`) that every vox2ras computation here uses.
- `[[internal-gcamorph]]` — the nonlinear warp; carries `MRI`/`VOL_GEOM`
  geometry and resamples through this module.
- `[[internal-mrisurf-metricproperties]]` — surface side; consumes the
  sampling and tkreg-RAS geometry exposed here.

## Gotchas and Sharp Edges

- **`width`/`height`/`depth` are C/R/S, not X/Y/Z** (see above). The mapping
  to anatomy is entirely in the direction cosines.
- **Pick the right voxel macro for the type**, or use `MRIgetVoxVal`. Wrong
  macro = byte reinterpretation, silent garbage.
- **`MRIgetVoxVal` does not upper-bound-check** the indices (only `< 0`).
- **`MRIxfmCRS2XYZtkreg` ignores the real direction cosines** — it always
  uses fixed LIA tkreg cosines and a zero centre. Surface RAS ≠ scanner RAS
  off the conformed grid.
- **`"cubic"` interp string → `SAMPLE_CUBIC_BSPLINE`, not `SAMPLE_CUBIC`.**
- **Mutating geometry fields invalidates `i_to_r__`/`r_to_i__`** — call
  `MRIreInitCache`.
- **`*Cached` coordinate helpers use function-local `static` matrices.**
  `MRIsurfaceRASToVoxelCached` caches the transform on first call and never
  refreshes it; the in-code comment warns it "Won't work if mri is changing"
  ([`utils/mri.cpp:3764-3781`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3764-L3781)).
  These statics also make the function **not thread-safe** and a deliberate,
  documented "leak" (never freed) — do not call across volumes or threads.
- **Shear components are second-class.** `s_r,s_a,s_s` exist and can be
  written/serialised, but `MRIxfmCRS2XYZ` only honours them when explicitly
  asked (`useshear`), and `MRIsetVox2RASFromMatrix` warns and **cannot**
  represent a sheared vox2ras (it factors out 9-DOF only,
  [`utils/mri.cpp:738-790`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L738-L790)).
- **`valid` vs. `ras_good_flag`.** Two separate flags that the header itself
  admits "mean the same thing"; both are checked in different places.

## Confidence and Gaps

> [!gap] Not traced in detail
> - The sinc (`MRIsincSampleVolume`) and cubic / cubic-B-spline kernels are
>   identified and dispatched but their exact kernels are not transcribed here.
> - `utils/mri2.cpp` higher-level operations are summarised by intent only.
> - The full set of code paths that read/write the shear components, and any
>   tool that genuinely relies on non-zero shear, were not exhaustively
>   surveyed.
> - `MRIxfmCRS2XYZPrecision` is `double` in 8.2.0; the historical `float`
>   precision path and its numerical effects were not audited (noted also in
>   [[coordinate-systems]]).

## References

- Header: [`include/mri.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h)
  (Bruce Fischl et al.) — the `MRI`/`VOL_GEOM`/`MRI_FRAME` definitions and the
  public API.
- Core implementation:
  [`utils/mri.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp).
- Geometry derivation and coordinate conventions: [[coordinate-systems]].
- On-disk format: [[mgz]].
- Matrix algebra: [[internal-matrix]].
