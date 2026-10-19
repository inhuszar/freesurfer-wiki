---
title: "exportGcam"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "fem_elastic/exportGcam.cpp"
  - "fem_elastic/exportGcam.help.xml"
  - "fem_elastic/morph.cpp"
  - "fem_elastic/morph.h"
  - "fem_elastic/ZlibStringCompressor.cpp"
families:
  - "fem_elastic"
recon_all_stage: null
related:
  - "[[surf2vol]]"
  - "[[createMorph]]"
  - "[[applyMorph]]"
  - "[[mri_cvs_register]]"
  - "[[mri_concatenate_gcam]]"
  - "[[mri_vol2vol]]"
  - "[[m3z-format]]"
  - "[[internal-gcamorph]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-10-19
gaps:
  - "Extent of the surf2vol mesh (which fixed-space voxels end up outside the mesh) is determined by surf2vol, not by exportGcam"
  - "Byte-level layout of the FEM mesh payload inside a .tm3d transform record (CMesh3d::load) was not enumerated"
  - "Contents of a .mgz/.nii output written through the Warpfield path were not inspected in detail"
  - "Whether node positions are intended to be offset by the bounding-box origin, and whether --fixed is intended to match the morph's recorded fixed geometry, is not settled by the code"
tags:
  - gcam
  - m3z
  - morph
  - cvs
  - fem
  - registration
  - transforms
---

# exportGcam

## Summary

`exportGcam` converts a FreeSurfer *volume morph* (a `.tm3d` file, the chain of FEM-mesh and affine transforms written by [[surf2vol]] with `-out_mesh`) into a standard dense GCAM warp (`.m3z`, see [[m3z-format]]) that the rest of FreeSurfer can read. It evaluates the morph once at every voxel centre of the fixed ("template") volume, expresses the result as a voxel position in the moving volume, and stores one GCAM node per fixed-space voxel (optionally restricted to a padded bounding box of the fixed volume). Voxels that fall outside the morph's mesh, or whose image lies outside the moving volume, are stored as "invalid" all-zero nodes. The tool is the bridge between the elastic (FEM) step of [[mri_cvs_register]] and every GCAM consumer downstream ([[mri_concatenate_gcam]], [[mri_vol2vol]]).

## Source Information

- **Language:** C++
- **Source file(s):** [`fem_elastic/exportGcam.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp) (driver, 226 lines); the conversion itself is `VolumeMorph::exportGcam()` in [`fem_elastic/morph.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp); help text in [`fem_elastic/exportGcam.help.xml`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.help.xml)
- **Original author:** Gheorghe Postelnicu, 2006 ([`fem_elastic/exportGcam.cpp:1-15`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L1-L15))
- **Build:** target `exportGcam`, linked against `utils` and `tetgen`, installed to `bin/` ([`fem_elastic/CMakeLists.txt:36-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/CMakeLists.txt#L36-L40))
- **Binary/script location:** `$FREESURFER_HOME/bin/exportGcam`
- **Argument parsing:** `ArgumentParser` from `argparse.h` ([`fem_elastic/exportGcam.cpp:186-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L186-L226)); unknown options and malformed integers are rejected with exit status 2 (observed).

## Purpose and Context

The CVS (Combined Volumetric and Surface) pipeline registers a subject to a template in three steps. In the elastic step, [[surf2vol]] solves a finite-element (FEM) deformation on a tetrahedral mesh built from the surfaces and writes the result as a `.tm3d` volume-morph file. That format is private to the `fem_elastic` programs ([[surf2vol]], [[createMorph]], [[applyMorph]], `exportGcam`): no general FreeSurfer tool reads it. `exportGcam` therefore re-exports the same deformation as a GCAM so that later stages (nonlinear volumetric refinement with [[mri_nl_align]], composition with [[mri_concatenate_gcam]], resampling with [[mri_vol2vol]] `--m3z`) can use it.

The only in-tree caller is `mri_cvs_register`, which calls it twice (once for the both-hemisphere branch, once for the single-hemisphere/masked branch; the two branches are mutually exclusive):

```tcsh
exportGcam --fixed $tmri/$voltype.mgz --moving $mmri/$voltype.mgz --morph $outdir/${elasticmorph} --out_gcam $outdir/${elasticmorph:r}.m3z
```

([`mri_cvs_register/mri_cvs_register:411`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L411) and [`mri_cvs_register/mri_cvs_register:438`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L438); in the second branch `--moving` is `$regmoving`, which is the hemisphere-masked `maskedmoving.*.nii.gz` when `--maskmovinghemi` is used.) Here `$voltype` is `norm` ([`mri_cvs_register/mri_cvs_register:149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L149)), `$tmri` is the template's `mri/` directory, `$mmri` the moving subject's, and `${elasticmorph}` is `<out_root>_to<templateid>.tm3d` ([`mri_cvs_register/mri_cvs_register:343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L343)). `exportGcam` is not run in the in-tree call if the `.tm3d` already exists and `--cleanelreg` was not given, because the whole elastic block is guarded by [`mri_cvs_register/mri_cvs_register:388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L388).

## Inputs

### Required Inputs

| Input | Option | Role |
|-------|--------|------|
| Fixed volume | `--fixed` | Read with `MRIread` ([`fem_elastic/exportGcam.cpp:89-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L89-L95)). Supplies the **template grid**: the output GCAM has one node per voxel of this volume (or of its bounding box), the atlas-side geometry of the m3z is this volume's geometry, and node intensities and labels are derived from its voxel values. It is also stored as the morph's `m_template` ([`fem_elastic/exportGcam.cpp:117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L117)). Typically `norm.mgz` of the template subject. |
| Moving volume | `--moving` | Read with `MRIread` ([`fem_elastic/exportGcam.cpp:97-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L97-L103)). Supplies the **image-side geometry** of the m3z and the voxel bounds against which node positions are validated. Its voxel intensities are only sampled for the discarded verification image. Typically `norm.mgz` of the moving subject. |
| Morph | `--morph` | A `.tm3d` volume-morph file ([`fem_elastic/exportGcam.cpp:105-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L105-L118)); see the format table below. |

Any format `MRIread` understands is accepted for the two volumes (mgz, nii.gz, ... see [[mgz]], [[nifti]]).

### The `.tm3d` volume-morph format (as consumed here)

`VolumeMorph::load()` dispatches on the text after the **last `.` in the full path**: `nm3d` selects the legacy reader `load_old`, anything else (including `tm3d`) selects `load_new`; a path with no `.` at all throws "Couldn't find extension in filename." ([`fem_elastic/morph.cpp:1255-1276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1255-L1276)). The legacy `nm3d` reader expects a transform count followed by size-prefixed zlib blocks ([`fem_elastic/morph.cpp:1331-1365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1331-L1365)); the `.tm3d` reader (`load_new`) is a sequence of tagged records ([`fem_elastic/morph.cpp:1369-1418`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1369-L1418)):

| Record | Tag | Payload |
|--------|-----|---------|
| Fixed geometry | 1 (`tagVgFixed`) | 76 bytes: `int32 valid`, `int32 width,height,depth`, `float32 xsize,ysize,zsize`, `float32 x_r,x_a,x_s, y_r,y_a,y_s, z_r,z_a,z_s`, `float32 c_r,c_a,c_s` ([`fem_elastic/morph.cpp:1454-1484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1454-L1484)). This is the geometry of the volume the morph was **computed on** (the `-fixed_mri` of [[surf2vol]]). |
| Moving geometry | 2 (`tagVgMoving`) | Same layout; the geometry of the `-moving_mri` of [[surf2vol]]. |
| Transform | 3 (`tagTransform`) | zlib-compressed transform record; one tag per transform, **in application order**. |

Each tag is a native-endian `int32` tag, an `int64` byte length, then the payload ([`fem_elastic/tag_fio.h:31-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/tag_fio.h#L31-L41), [`fem_elastic/tag_fio.h:46-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/tag_fio.h#L46-L60)). Unknown tags are skipped. A transform record, after inflation, is: `uint32 n`, an `n`-byte string `type|name`, a `bool` "has initial transform" (followed by a recursively nested transform record if true), then the type-specific payload ([`fem_elastic/morph.cpp:1681-1719`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1681-L1719), [`fem_elastic/morph.h:99-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L99-L104)). Recognised types are exactly four:

| `type` | Class | Payload | Meaning |
|--------|-------|---------|---------|
| `affine` | `AffineTransform3d` | 12 `float32` ([`fem_elastic/morph.cpp:52-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L52-L61)) | $y_j = p_j x + p_{j+3} y + p_{j+6} z + p_{j+9}$, i.e. a column-major 3x3 followed by a translation ([`fem_elastic/morph.cpp:38-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L38-L50)) |
| `fem` | `FemTransform3d` | a `CMesh3d` stream (materials, bounding box, nodes, tetrahedra) | piecewise-linear map defined by displaced tetrahedra ([`fem_elastic/morph.cpp:552-568`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L552-L568)) |
| `id` | `IdentityTransform3d` | none | identity ([`fem_elastic/morph.h:141-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L141-L159)) |
| `field` | `DeltaTransform3d` | `int32 W,H,D`, `3*W*H*D float32` displacements (frame-major), `bool hasMask`, optional `uint8` mask | voxel-grid displacement field with optional validity mask ([`fem_elastic/morph.cpp:444-492`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L444-L492)) |

Any other type string throws "loadTransform - unknown transform type". The `.tm3d` written by [[surf2vol]] `-out_mesh` contains exactly two transforms: the FEM mesh transform followed by an affine transform (`inv_t`) ([`fem_elastic/fsurf2vol.cpp:670-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L670-L693)).

> [!assumption] All transforms act in voxel index space
> `VolumeMorph` applies every transform in **voxel (index) coordinates of the morph's recorded geometries**, not in scanner RAS ([`fem_elastic/morph.h:323-327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L323-L327)). The first transform receives voxel coordinates of the morph's fixed geometry; the last one yields voxel coordinates of the morph's moving geometry. RAS is only used to bridge between the morph's recorded geometries and the geometries of the files given on the command line.

### Input Assumptions

- The morph and the two volumes are assumed to correspond: `--fixed`/`--moving` should be the volumes the morph was computed on ([[surf2vol]] `-fixed_mri`/`-moving_mri`). In `mri_cvs_register` they are the very same files.
- `--moving` may have a different voxel grid from the geometry recorded in the morph: the mapping to the moving file is done through RAS (see Mathematical Foundations), and the bounds test uses the moving file's dimensions.
- `--fixed` is expected to be on the same voxel grid as the geometry recorded in the morph (see the gotcha "Fixed volume versus recorded fixed geometry" below).
- If the morph contains no transform at all the tool does not detect it; behaviour in that case was not tested.

## Outputs

### Files Created

| File | Written by | Content |
|------|-----------|---------|
| `--out_gcam` (the only file) | `GCAMwrite` ([`fem_elastic/exportGcam.cpp:148-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L148-L150)) | The GCAM described below. The container is chosen from the **file extension** ([`utils/gcamorph.cpp:352-363`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L352-L363)): `.m3z` is a gzip-compressed [[m3z-format]] stream, `.m3d` the same stream uncompressed (gzip only when the name contains the substring `.m3z`, [`utils/gcamorph.cpp:382-385`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L382-L385)), and `.mgz`/`.nii`/`.nii.gz` are written through the `Warpfield` converter (absolute-CRS data format, the default argument at [`include/gcamorph.h:314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/gcamorph.h#L314)). |

No other file is written: the `MRIwrite` calls for the verification images are commented out ([`fem_elastic/exportGcam.cpp:139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L139), [`fem_elastic/exportGcam.cpp:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L171)). Progress is printed to stdout (`#VMPC# ... VmPeak` memory markers, voxel counts, the bounding box, "gcam export invalid voxels = N").

### Output Specifications

The GCAM allocated by `VolumeMorph::exportGcam()` ([`fem_elastic/morph.cpp:1549-1553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1549-L1553)) has:

| Property | Value |
|----------|-------|
| Lattice size | `box.dx x box.dy x box.dz`: the full fixed volume, or the padded bounding box when `--bbox_threshold` is given |
| `spacing` | 1 (one node per fixed-space voxel) |
| `type` | `GCAM_VOX` (node positions are voxel coordinates) |
| `ninputs` | 1 ([`fem_elastic/morph.cpp:1566`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1566)) |
| `image` geometry (`TAG_GCAMORPH_GEOM`, first block) | geometry of the `--moving` **file** ([`fem_elastic/morph.cpp:1564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1564), [`utils/gcamorph.cpp:1383-1393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L1383-L1393)) |
| `atlas` geometry (second block) | geometry of the `--fixed` file, cropped to the box; the crop keeps the same voxel-to-RAS rotation and updates `c_ras` ([`fem_elastic/morph.cpp:1561-1565`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1561-L1565), [`utils/mri.cpp:4077-4081`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L4077-L4081)) |
| `origx/y/z` and `x/y/z` | identical (no separate "original" position): moving-file voxel position for valid nodes, 0 for invalid nodes |
| `xn,yn,zn` | written as 0 (nodes are calloc'ed; never set) ([`utils/gcamorph.cpp:1364-1375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L1364-L1375)) |
| `exp_k`, `m_affine` | 0 and absent: no `TAG_MGH_XFORM` block is written |
| `label` (`TAG_GCAMORPH_LABELS`) | 128 for a valid node whose fixed voxel value is non-zero (absolute value above 1e-10), otherwise 0 ([`fem_elastic/morph.cpp:1602-1610`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1602-L1610)) |

An m3z reader sees a node as follows: atlas voxel $(i,j,k)$ of the lattice maps to image (moving) voxel $(x,y,z)$ = the stored position ([[m3z-format]], [[internal-gcamorph]]).

> [!gotcha] Intensity statistics are in memory only
> For every valid node the code allocates a one-input `GC1D`, sets `means[0]` to the fixed voxel value and (when the sum of those values is non-zero) sets `covars[0] = (0.05 * mean(non-zero fixed values))^2` ([`fem_elastic/morph.cpp:1597-1628`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1597-L1628)). The m3z container stores only positions, geometry, type and labels ([`utils/gcamorph.cpp:374-454`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L374-L454)), so these values never reach the file. If every fixed voxel in the box is zero the function prints "NO VALID LABEL" and returns early without covariances ([`fem_elastic/morph.cpp:1613-1617`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1613-L1617)).

## Mathematical Foundations

Notation: $\mathbf{p}=(i_f,j_f,k_f)$ is a voxel index of the `--fixed` file; $V_F$ its voxel-to-RAS matrix; $V^{\text{rec}}_F$, $V^{\text{rec}}_M$ the voxel-to-RAS matrices of the fixed and moving geometries **recorded in the morph**; $V^{\text{file}}_M$ the voxel-to-RAS matrix of the `--moving` file; $T_1,\dots,T_n$ the transforms of the morph in file order.

**1. Fixed side: template voxel to morph voxel.**
$$\mathbf{u} = (V^{\text{rec}}_F)^{-1}\,V_F\,\mathbf{p}$$
This is `mat_template` ([`fem_elastic/morph.cpp:729-742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L729-L742)).

**2. Morph chain.**
$$\mathbf{m} = T_n\circ\cdots\circ T_1(\mathbf{u})$$
`VolumeMorph::image()` applies the transforms in list order and stops at the first one that returns an invalid point ([`fem_elastic/morph.cpp:1111-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1111-L1127)). The FEM transform locates the tetrahedron containing the point through an octree and evaluates the element's linear interpolant of the displacement ([`fem_elastic/mesh.h:1241-1255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L1241-L1255), [`fem_elastic/fem_3d.cpp:478-489`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fem_3d.cpp#L478-L489)); a point in no tetrahedron gets status `cOutOfBounds`, a point in an element with a flagged orientation problem gets `cInvalid`; either way the point is not valid.

**3. Moving side: morph voxel to moving-file voxel.**
$$\mathbf{q} = (V^{\text{file}}_M)^{-1}\,V^{\text{rec}}_M\,\mathbf{m}$$
This is `mat_subject` ([`fem_elastic/morph.cpp:744-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L744-L758)). Because both ends go through RAS, `--moving` may be resampled relative to the volume the morph was solved on.

**4. Validity and cached displacement.** A voxel is valid iff $\mathbf{m}$ is valid **and** $0\le q_c\le N_c-1$ for each axis $c$ (with $N_c$ the dimensions of the `--moving` file) ([`fem_elastic/morph.cpp:817-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L817-L848)). For valid voxels the displacement $\mathbf{q}-\mathbf{u}$ is stored in a 4-frame float cache volume (frames 0-2 displacement, frame 3 = 1 for valid, 0 otherwise; the cache is zero-initialised, [`fem_elastic/morph.cpp:763-785`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L763-L785), [`fem_elastic/morph.cpp:863-870`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L863-L870)).

**5. Node values.** For lattice index $(i,j,k)$ with box origin $\mathbf{b}$ (so the fixed-volume index is $\mathbf{p}=\mathbf{b}+(i,j,k)$):
$$\text{node}(i,j,k) = \big[\mathbf{q}(\mathbf{p})-\mathbf{u}(\mathbf{p})\big] + (i,j,k)\quad\text{if valid;}\qquad (0,0,0)\ \text{otherwise}$$
([`fem_elastic/morph.cpp:1575-1595`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1575-L1595)). The added term is the lattice index, **not** the fixed-volume index $\mathbf{p}$. When $\mathbf{b}=\mathbf{0}$ and the fixed file's grid equals the morph's recorded fixed grid ($\mathbf{u}=\mathbf{p}$) the node equals $\mathbf{q}$, the moving-file voxel position.

> [!gotcha] Node = cached displacement + lattice index
> Two observed consequences of the formula in step 5, from synthetic tests with an identity morph (a 32^3 fixed volume with a non-zero block; see Confidence and Gaps for the test construction): with `--bbox_threshold 0` and a padded bounding-box origin of (7, 9, 5) the stored node (0,0,0) held position (0,0,0) and node (5,5,5) held (5,5,5), although an identity morph maps fixed voxel (7,9,5) to moving voxel (7,9,5) (without a box the lattice index equals the voxel index); and with a `--fixed` volume whose `c_ras` was shifted by 3 mm relative to the morph's recorded fixed geometry, interior nodes held their own lattice index, while the validity mask was shifted by 3 voxels (3072 invalid voxels). The code does not comment on either case.

> [!gap] Is the lattice-index offset intended?
> The code does not say whether the stored position is meant to be relative to the cropped lattice or to the full fixed grid, nor whether `--fixed` is required to share the recorded fixed grid. The in-tree caller never uses `--bbox_threshold` and always passes the same fixed volume that was given to [[surf2vol]], so neither case arises in `mri_cvs_register`.

**6. Padding.** With a bounding box, `MRIboundingBox(m_template, thresh, &box)` finds the extent of voxels strictly greater than `thresh` ([`utils/mri.cpp:3014-3015`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3014-L3015), [`utils/mri.cpp:3121-3124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3121-L3124)). A padding of 1 voxel on every side (the default argument, never overridden by the tool, [`fem_elastic/morph.h:377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L377)) is then added, unless any of the following holds, in which case the padding is set to 0 for **all** axes: `box.x - 1 < 0`, `box.y - 1 < 0`, `box.z - 1 < 0`, `box.x + box.dx + 1 >= width`, `box.y + box.dy + 1 >= height`, `box.z + box.dz + 1 >= depth` ([`fem_elastic/morph.cpp:1515-1534`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1515-L1534)). Note the upper-side test is stated on `box.x + box.dx` (one past the last box voxel), so a box ending two voxels before the edge already triggers it.

**7. Intensity normalisation (no effect on the saved file).** After `GCAMwrite`, the driver calls `GCAMnormalizeIntensities(gcam, mriFixed)` ([`fem_elastic/exportGcam.cpp:152-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L152-L154)). That function samples the fixed volume at each node's stored position, histograms the ratio `sample / gc->means[0]`, trims it to mean +/- 2 SD, and multiplies every `means[0]` by the histogram-peak ratio ([`utils/gcamorph.cpp:13535-13640`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L13535-L13640)). It prints "trimming scaling estimates...", "renormalizing gcam intensities by ..." and "...using histo estimate ...", but because it runs after the write and acts on fields that are not serialised, the output file is unaffected ([`fem_elastic/exportGcam.cpp:148-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L148-L154)).

> [!internal] GCAM structure
> The node fields, `GCAM_VALID`/`GCAM_POSITION_INVALID` flags and `GCAMalloc` defaults are described in [[internal-gcamorph]]. `GCAMalloc` initialises every node to its own lattice index; `exportGcam` overwrites all of them ([`utils/gcamorph.cpp:1319-1381`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L1319-L1381)).

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fixed` | file | (required) | Fixed (template) volume. Defines the output lattice, the atlas geometry and the node labels ([`fem_elastic/exportGcam.cpp:191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L191)). |
| `--moving` | file | (required) | Moving volume. Defines the image geometry and the bounds against which node positions are validated ([`fem_elastic/exportGcam.cpp:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L192)). |
| `--morph` | file | (required) | `.tm3d` volume-morph file ([`fem_elastic/exportGcam.cpp:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L193)). |
| `--out_gcam` | file | (required) | Output warp; container chosen from the extension (`.m3z`, `.m3d`, `.mgz`, `.nii`, `.nii.gz`) ([`fem_elastic/exportGcam.cpp:194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L194)). |
| `--zlib_buffer` | int | 5 | Multiplier used for the initial inflate-buffer size, per transform: `compressed_size * N` ([`fem_elastic/exportGcam.cpp:215-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L215-L218), [`fem_elastic/ZlibStringCompressor.cpp:107-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp#L107-L112)). It is only a starting size: on `Z_BUF_ERROR` the buffer is doubled and inflation retried ([`fem_elastic/ZlibStringCompressor.cpp:120-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp#L120-L126)), so a small value is safe (1 was tested) but `0` makes the load fail with "zlib reports data corrupter error" (exit 1, observed). Only relevant for very large meshes. |
| `--bbox_threshold` | int | absent (no box) | Restrict the lattice to the bounding box of fixed voxels with value `> N`, plus 1 voxel of padding. Presence of the flag, not its value, switches the box on ([`fem_elastic/exportGcam.cpp:220-225`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L220-L225)). |
| `--interp` | `linear` \| `nearest` | `linear` | Interpolation for the verification resampling only ([`fem_elastic/exportGcam.cpp:120-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L120-L127)). Any other string silently selects linear. Has no effect on the written warp (outputs for `nearest`, `bogus` and the default were byte-identical in the decompressed stream). |
| `--test` | flag | off | Run two verification morphs: once through the morph (`apply_transforms`), once through the exported GCAM (`GCAMmorphToAtlas`); see interactions ([`fem_elastic/exportGcam.cpp:129-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L129-L141), [`fem_elastic/exportGcam.cpp:156-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L156-L172)). |
| `--help` | flag | | Print the XML-generated help. |

### Configuration Interactions

- **`--bbox_threshold` + `--test` aborts.** The verification step calls `GCAMmorphToAtlas(mriMoving, gcam, mriFixed, ...)` with the *full-size* fixed volume as the output buffer ([`fem_elastic/exportGcam.cpp:160-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L160-L164)). That function requires the output size to equal the GCAM's atlas size and otherwise calls `ErrorExit("invalid input MRI size for GCAMmorphToAtlas()")` ([`utils/gcamorph.cpp:4330-4334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L4330-L4334)). With a bounding box the lattice is smaller than the volume, so the program exits non-zero (observed 252) *after* the m3z has already been written. The condition `(!params.useBoundingBox || 1)` in the driver is always true ([`fem_elastic/exportGcam.cpp:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L156)).
- **`--interp` is independent of every other flag** as far as the exported warp is concerned: the displacement cache stores positions, not intensities.
- **`--test` changes cost, not content.** Without it, `exportGcam()` builds the displacement cache itself ("no mriCache - this will take some time"); with it, the cache is built by the earlier `apply_transforms` call and reused ("mriCache exists"). Valid/invalid counts and the written file are identical.
- **`--out_gcam` extension controls the container** and therefore what downstream tools can do with the file ([[mri_vol2vol]] `--m3z`, [[mri_concatenate_gcam]], [[mri_warp_convert]] read `.m3z`).
- **`--zlib_buffer` and `--morph`** interact only through the size of the transform blocks (large FEM meshes); see the flag table.
- **`--fixed` + `--morph`**: the validity mask accounts for any geometry difference between `--fixed` and the morph's recorded fixed geometry (through RAS), the node positions do not; see the gotcha under Mathematical Foundations.

## Typical Use Cases

### Use Case 1: As called by mri_cvs_register

```bash
# Convert the elastic CVS morph into a GCAM next to it
exportGcam --fixed $TEMPLATE_DIR/cvs_avg35/mri/norm.mgz \
           --moving $SUBJECTS_DIR/subj/mri/norm.mgz \
           --morph  $SUBJECTS_DIR/subj/cvs/el_reg_tocvs_avg35.tm3d \
           --out_gcam $SUBJECTS_DIR/subj/cvs/el_reg_tocvs_avg35.m3z
```

The resulting m3z is then applied with `mri_vol2vol --targ <template norm> --m3z <that file> --noDefM3zPath --mov <moving> ...` ([`mri_cvs_register/mri_cvs_register:483-484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L483-L484)) and combined with the nonlinear volumetric result with `mri_concatenate_gcam` ([`mri_cvs_register/mri_cvs_register:619-621`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L619-L621)). (File names in the example follow the `${out_root}_to$templateid` pattern; the exact `out_root` depends on `mri_cvs_register` options.)

### Use Case 2: Uncompressed GCAM

```bash
exportGcam --fixed fixed.mgz --moving moving.mgz --morph x.tm3d --out_gcam x.m3d
```

`.m3d` is the same stream without gzip.

### Use Case 3: Warp-field volume instead of an m3z

```bash
exportGcam --fixed fixed.mgz --moving moving.mgz --morph x.tm3d --out_gcam x_warp.mgz
```

Selects the `Warpfield` writer (absolute-CRS data); the program's own help does not mention this.

## Pipeline Context

**Predecessor:** [[surf2vol]] `-out_mesh X` (writes `X.tm3d`, [`fem_elastic/fsurf2vol.cpp:670-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L670-L693)) → **exportGcam** → **Successors:** [[mri_vol2vol]] `--m3z`, [[mri_concatenate_gcam]]; [[mri_jacobian]] has a `-tm3d` option for m3z files that came out of this CVS path.

In `mri_cvs_register` step 2 the sequence is: `surf2vol ... -out_mesh $outdir/${elasticmorph:r}` creates the `.tm3d` ([`mri_cvs_register/mri_cvs_register:395-403`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L395-L403), [`mri_cvs_register/mri_cvs_register:425-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L425-L430)), `exportGcam` creates `${elasticmorph:r}.m3z`, and the `.tm3d` is deleted at the end unless `--keepelreg` is given ([`mri_cvs_register/mri_cvs_register:843-846`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L843-L846)). [[surf2vol]] itself can also produce a GCAM directly through its `-gcam` option, which calls the same `VolumeMorph::exportGcam()` with `useTemplateBoundingBox = FALSE, thresh = 0` ([`fem_elastic/fsurf2vol.cpp:659-662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L659-L662), option parsed at [`fem_elastic/fsurf2vol.cpp:1392-1396`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L1392-L1396)); the standalone tool exists to do this from a saved `.tm3d` and to offer the bounding-box option.

See [[registration-overview]] for the wider CVS context.

## Gotchas and Caveats

> [!gotcha] Uncovered voxels become "all-zero" nodes
> Any fixed voxel that (a) is not inside any tetrahedron of the FEM mesh, (b) lies in a flagged-orientation element, (c) is rejected by a later transform, or (d) maps outside `[0, N-1]` of the moving volume gets `invalid = GCAM_POSITION_INVALID`, position and original position (0,0,0), label 0 and no `GC1D` ([`fem_elastic/morph.cpp:1581-1590`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1581-L1590)). The invalid flag itself is **not saved**; on reading an m3z, a node is re-marked invalid exactly when all six positions are zero ([`utils/gcamorph.cpp:1217-1226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L1217-L1226)). Consequences: (1) cases (a)-(d) are indistinguishable in the file (in particular, a voxel that falls off the moving volume is treated exactly like one outside the mesh); (2) a legitimate valid node whose position is exactly (0,0,0) would also be read back as invalid; (3) in a test with a morph shifting the volume by (+2,+3,+4) voxels, 8408 of 32768 nodes (those mapped beyond the last voxel) were all-zero.

> [!gotcha] Coverage is reported only on stdout, and the first counters are partial
> The morph application prints "Invalid voxels = A" and "Valid = B". `A` counts only points returned with status `cInvalid` (for example flagged-orientation elements); points outside every tetrahedron (`cOutOfBounds`) and points that map outside the moving volume are counted in neither `A` nor `B` ([`fem_elastic/morph.cpp:820-825`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L820-L825), [`fem_elastic/morph.cpp:846-850`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L846-L850)). In the shifted-volume test of the previous gotcha, "Invalid voxels = 0" was printed although 8408 voxels ended up invalid. The reliable figure is the later line "gcam export invalid voxels = N" ([`fem_elastic/morph.cpp:1630`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1630)), which counts every node written as invalid.

> [!gotcha] Intensity renormalisation has no effect on the file
> The "renormalizing gcam intensities" messages printed at the end suggest the output was rescaled. It was not: the call happens after `GCAMwrite`, and the changed fields are not part of the m3z format ([`fem_elastic/exportGcam.cpp:148-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L148-L154)). The comment next to the call in the source ("LZ: WHAT DOES THAT DO???") reflects the same uncertainty.

> [!gotcha] `--test` writes nothing
> The help says "Write out test files to verify the equivalence of tm3d and gcam morphs". The test mode only runs the two resamplings and prints sizes; the `MRIwrite` calls that would produce `tmpout1.mgz`/`tmpout2.mgz` are commented out ([`fem_elastic/exportGcam.cpp:139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L139), [`fem_elastic/exportGcam.cpp:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L171)). Equivalence is therefore not checked automatically.

> [!contradiction] Help text vs. code: `--test`
> `exportGcam.help.xml` ([`fem_elastic/exportGcam.help.xml:25-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.help.xml#L25-L26)) says `--test` writes test files; the code writes none (see above). Code is authoritative.

> [!contradiction] Help text vs. code: message "skipping tmpout2.mgz - using bounding box"
> This message is printed whenever `--test` is absent, whether or not `--bbox_threshold` was given ([`fem_elastic/exportGcam.cpp:173-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L173-L176)). With no flags at all the run still says "using bounding box: no" at the start and "skipping tmpout2.mgz - using bounding box" at the end.

> [!contradiction] Help text vs. code: `--interp`
> The help lists `[linear, nearest]` and "Default is linear". The code additionally accepts any other string and treats it as linear (no error) ([`fem_elastic/exportGcam.cpp:120-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L120-L127)); `cubic`, mentioned in a comment in [`fem_elastic/morph.h:344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L344), is not reachable. More importantly the option cannot influence the output file.

> [!gotcha] Undocumented default and omitted behaviour in the help
> The help does not state the default of `--zlib_buffer` (5), that the **extension of `--out_gcam`** selects the file type, or that `--fixed` defines the lattice. See the flag table.

> [!gotcha] Unsupported `--out_gcam` extension is a silent no-op
> `GCAMwrite` returns `ERROR_BADPARM` for an extension it does not recognise (e.g. `.txt`) and `exportGcam` ignores the return value, so the program exits 0 and no file is created ([`utils/gcamorph.cpp:356-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L356-L362), [`fem_elastic/exportGcam.cpp:148-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L148-L150)). The same applies to an output path in a non-existent directory. Always check that the output exists.

> [!gotcha] Empty bounding box aborts
> If no voxel of `--fixed` is `> --bbox_threshold` (e.g. `--bbox_threshold 1000` on an 8-bit volume), `MRIboundingBox` leaves an inverted box and the code computes negative lattice dimensions (observed: `box.dx = -28`); `GCAMalloc` then fails with "Cannot allocate memory" and the program exits non-zero without writing a file ([`utils/mri.cpp:3014-3027`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L3014-L3027), [`fem_elastic/morph.cpp:1549-1551`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1549-L1551)). A negative threshold selects the whole volume.

> [!gotcha] Padding silently disappears near the volume edge
> The 1-voxel padding is cancelled on all axes if any one side of the box would touch the volume boundary ([`fem_elastic/morph.cpp:1519-1525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1519-L1525)). In a test with a box starting at fixed index 0 in x, the y and z extents also lost their padding.

> [!gotcha] Exceptions outside the loading step are not caught
> Only `VolumeMorph::load` is wrapped in `try/catch (const char*)` ([`fem_elastic/exportGcam.cpp:107-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L107-L116)). A missing file, wrong extension or corrupt zlib stream is reported and gives exit status 1; but `throw "..."` statements in `apply_transforms`/`exportGcam` (null template, null matrices) are not caught by the driver (by inspection; not triggered in tests), so they would terminate the process.

> [!gotcha] `.tm3d` is detected by exclusion
> Only the extension `nm3d` selects the legacy reader; `tm3d` is not checked for. A file with any other (or even misleading) extension is parsed as a tagged `.tm3d` ([`fem_elastic/morph.cpp:1271-1274`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1271-L1274)). Because the extension is taken after the last `.` of the whole path, a path such as `dir.v2/morph` (no extension in the file name) is not rejected by the "no extension" test.

> [!gotcha] The verification morph is expensive and discarded
> Regardless of `--test`, the displacement cache is built by running `apply_transforms()` over the entire fixed grid, which also samples the moving volume at each valid voxel and fills an output image that is then freed ([`fem_elastic/morph.cpp:1500-1509`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1500-L1509), [`fem_elastic/morph.cpp:851-861`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L851-L861)). Run time is dominated by building the octree over the mesh elements (`FemTransform3d::doOwnInit`, [`fem_elastic/morph.cpp:579-583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L579-L583), invoked from `initOctree2`, [`fem_elastic/exportGcam.cpp:57-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L57-L68)) and by the per-voxel element lookups.

## Error Compensation and Guard Rails

- **Geometry differences on the moving side are compensated.** The moving volume is addressed through RAS, so a `--moving` file whose voxel grid differs from the one used when the morph was computed still yields positions in *its* voxel space ([`fem_elastic/morph.cpp:744-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L744-L758)).
- **Geometry differences on the fixed side are only partly compensated.** The template voxel is brought into the morph's grid through RAS for the validity test and the morph evaluation ([`fem_elastic/morph.cpp:729-742`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L729-L742)), but the node value is then formed with the lattice index (see Mathematical Foundations, step 5).
- **Out-of-range voxels** are quietly turned into invalid nodes rather than clamped or reported as errors ([`fem_elastic/morph.cpp:846-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L846-L848)).
- **Padding** is dropped rather than clamped when it would exceed the volume ([`fem_elastic/morph.cpp:1519-1525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1519-L1525)).
- **Interpolation names** are not validated ([`fem_elastic/exportGcam.cpp:120-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/exportGcam.cpp#L120-L127)).
- **Cropped atlas geometry** keeps the full volume's orientation and shifts `c_ras` so that voxel-to-RAS stays consistent with the original grid ([`fem_elastic/morph.cpp:1561-1565`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1561-L1565), [`utils/mri.cpp:4077-4081`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri.cpp#L4077-L4081)); in a test with a 32^3 LIA-oriented volume and a crop starting at voxel x = 3 with width 18, the output's atlas `c_r` changed from 0 to 4.0 mm.


## Known Bugs

Defects found in the 2026-10-19 source audit of `fem_elastic/` (v8.2.0), most severe first:

- [[00201]] — severity 3: surf2vol — -compress delta grid and FEM box hard-coded to 256³: fixed volumes >256 voxels get zeros/invalid GCAM beyond index 255 (default 256³ templates unaffected)
- [[00202]] — severity 3: surf2vol — -dbg_output: VolumeMorph::save() cuts the shared transform chain, so final -out/-out_mesh/-gcam hold only the last FEM step
- [[00212]] — severity 3: exportGcam — with --bbox_threshold, GCAM node positions are shifted by minus the box origin (cache + lattice index instead of full-grid index); no-box and CVS paths unaffected
- [[00215]] — severity 3: createMorph — gcam input: GCAMrasToVox() applied to voxel-type GCAMs since 2023 (0a3a8c2d16) gives garbage delta field; hits trac-preproc legacy CVS branch
- [[00205]] — severity 2: surf2vol — failed writes, caught exceptions and PETSc option-parse errors all exit 0 (mri_cvs_register cannot detect them); parse() result ignored, compress uninitialised
- [[00208]] — severity 2: surf2vol — new[]/delete mismatch in SmallMatrix::inplace_transpose (per active MFC per FEM step) and ZlibStringCompressor::setBufferSize; UB, benign on glibc, Valgrind-confirmed; dangling m_buffer
- [[00209]] — severity 2: surf2vol / exportGcam / createMorph — leaks: comm_solution overwrites its new[] with VecGetArray, setup_load_sym frees nothing, ZlibStringCompressor has no destructor (peak-memory inflation)
- [[00216]] — severity 2: createMorph — poor input validation: gcam without --template segfaults, unknown keywords/unreadable template skipped with exit 0, nested morph drops geometry, missing mesh aborts
- [[00217]] — severity 2: surf2vol/exportGcam/applyMorph — DeltaTransform3d samples validity mask trilinearly (comment says nearest); 1-voxel boundary rim accepted with damped displacement
- [[00218]] — severity 2: createMorph — volume input with nframes != 3 writes a .tm3d field record the 3-frame reader cannot parse (read past end / dropped frames); no frame check
- [[00221]] — severity 2: exportGcam — GCAMwrite result ignored (bad extension or unwritable path exits 0, no file); --test + --bbox_threshold aborts (exit 252) after writing; empty bbox gives negative dims
- [[00224]] — severity 2: surf2vol — TMesh::dir_img never reads signalTopology; inverted elements always invalidate points (mask 0 in convert_to_delta), contradicting the header contract; intent open

## Related Tools

- [[surf2vol]] — produces the `.tm3d` this tool consumes (`-out_mesh`), and can export a GCAM itself (`-gcam`).
- [[createMorph]], [[applyMorph]] — the other `fem_elastic` programs working on volume morphs; `applyMorph` applies a `.tm3d` directly to a volume, whereas `exportGcam` converts it so general FreeSurfer tools can use it.
- [[mri_cvs_register]] — the only in-tree caller.
- [[mri_concatenate_gcam]] — composes the exported GCAM with the nonlinear volumetric morph ([[mri_nl_align]]).
- [[mri_vol2vol]] — applies the exported m3z (`--m3z`).
- [[mri_warp_convert]] — converts an m3z to other warp formats.
- [[m3z-format]], [[internal-gcamorph]] — the output format and data structure.

## Confidence and Gaps

**Well established from code and experiment:** argument parsing, the full coordinate pipeline (steps 1-6), the on-disk meaning of uncovered voxels, the label/position/geometry content of the m3z, the no-op normalisation, the `--test` and `--interp` behaviours, the padding rules, the exit behaviours listed above. Experiments used hand-built synthetic `.tm3d` files (an `id` transform and `affine` transforms; 32^3 volumes) and the installed 8.2.0 binary; no real FEM mesh was available, so the `fem` transform path was read from source only.

> [!gap] Extent of the mesh
> Which fixed-space voxels are inside the FEM mesh (and thus valid) depends on how [[surf2vol]] builds the mesh from the surfaces; `exportGcam` simply reports voxels outside as invalid. See the [[surf2vol]] page.

> [!gap] FEM payload layout
> The byte layout of the `fem` transform's `CMesh3d` stream (materials, bounding box, nodes, tetrahedra) is read by `TMesh::load` ([`fem_elastic/mesh.h:364-420`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L364-L420)) and was not enumerated here.

> [!gap] Warp-field output
> The `.mgz`/`.nii` output goes through `Warpfield::convert` with the default absolute-CRS data format; its content for an `exportGcam`-generated GCAM (e.g. how invalid nodes are encoded) was not inspected.

> [!gap] Intended semantics of node positions
> See the gap under Mathematical Foundations (lattice-index offset; `--fixed` vs the recorded fixed geometry).

> [!gap] No transforms / `field` transform
> Behaviour with a morph that has zero transforms, and with `field` (`DeltaTransform3d`) transforms, was not exercised.

## References

- Source: `fem_elastic/exportGcam.cpp`, `fem_elastic/morph.cpp`, `fem_elastic/morph.h` in the FreeSurfer 8.2.0 tree (git d932c45b79).
- Installed help: `$FREESURFER_HOME/bin/exportGcam --help` (8.2.0), identical to `exportGcam.help.xml`.
- Caller: `mri_cvs_register/mri_cvs_register` ([[mri_cvs_register]]).
- Background: Postelnicu G., Zollei L., Fischl B., "Combined volumetric and surface registration", IEEE Trans. Med. Imaging 28(4):508-522, 2009 (CVS method).
