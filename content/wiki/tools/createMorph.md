---
title: "createMorph"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "fem_elastic/fcreateMorph.cpp"
  - "fem_elastic/createMorph.help.xml"
  - "fem_elastic/morph.cpp"
  - "fem_elastic/morph.h"
  - "fem_elastic/transformUtils.cpp"
  - "fem_elastic/ZlibStringCompressor.cpp"
  - "fem_elastic/tag_fio.h"
  - "fem_elastic/mesh.h"
families:
  - "fem_elastic"
recon_all_stage: null
related:
  - "[[applyMorph]]"
  - "[[exportGcam]]"
  - "[[surf2vol]]"
  - "[[mri_cvs_register]]"
  - "[[mri_nl_align]]"
  - "[[mri_warp_convert]]"
  - "[[mri_concatenate_gcam]]"
  - "[[trac-preproc]]"
  - "[[m3z-format]]"
  - "[[internal-gcamorph]]"
  - "[[coordinate-systems]]"
  - "[[registration-overview]]"
status: draft
confidence: medium
last_agent_update: 2026-10-19
gaps:
  - "Orientation convention of the plain-text 12-number `affine` file is not fixed by createMorph; it is used as a fixed-to-moving voxel-index map exactly as written."
  - "No in-tree writer of the raw zlib mesh file consumed by the `mesh` keyword was found; surf2vol writes whole `.tm3d` morphs instead."
  - "GCAM node spacing (`gcam->spacing`) is never consulted by the `gcam` branch."
  - "Behaviour of the delta-field sampler outside the field bounds was not traced."
tags:
  - transforms
  - morph
  - fem_elastic
  - tm3d
  - gcam
  - cvs
---

# createMorph

## Summary

`createMorph` assembles an ordered chain of spatial transforms into one compressed binary morph file (`--out`, conventionally `*.tm3d`). Each `--in` pair is a *keyword* and a *file*: `affine` (12-number text matrix), `volume` (a 3-frame displacement volume), `gcam` (an `.m3z`/warp-field GCAM, resampled onto a displacement volume), `mesh` (a raw FEM tetrahedral mesh file) or `morph` (the transforms of another `.tm3d`, spliced in). The transforms are stored in command-line order, together with optional "fixed" (`--template`) and "moving" (`--subject`) volume geometries. The resulting `.tm3d` is read by [[applyMorph]] (to resample a volume or surface) and by [[exportGcam]] (to convert the chain into an `.m3z`). `createMorph` performs no registration and no resampling; it only packages transforms.

## Source Information

- **Language:** C++
- **Source file(s):** [`fem_elastic/fcreateMorph.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp) (driver, argument parsing, GCAM-to-delta conversion); [`fem_elastic/morph.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp) and [`fem_elastic/morph.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h) (`gmp::VolumeMorph` and the `gmp::Transform<3>` hierarchy, `.tm3d` I/O); [`fem_elastic/transformUtils.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp) (`read_transform`); [`fem_elastic/ZlibStringCompressor.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp); [`fem_elastic/tag_fio.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/tag_fio.h); [`fem_elastic/mesh.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h) (mesh file reader)
- **Help:** XML-embedded help in [`fem_elastic/createMorph.help.xml`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/createMorph.help.xml) (compiled to `createMorph.help.xml.h`, [`fem_elastic/fcreateMorph.cpp:25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L25))
- **Binary/script location:** `$FREESURFER_HOME/bin/createMorph`
- **Author / date:** Gheorghe Postelnicu, 2006 ([`fem_elastic/fcreateMorph.cpp:3-5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L3-L5))
- **Build condition:** the executable is only defined when CMake finds PETSc ([`fem_elastic/CMakeLists.txt:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/CMakeLists.txt#L3), [`fem_elastic/CMakeLists.txt:24-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/CMakeLists.txt#L24-L28)); it links the shared `COMMON3D_SOURCES` (`morph.cpp`, `transformUtils.cpp`, `ZlibStringCompressor.cpp`, ...) plus `utils` and `tetgen`, but not PETSc itself.

## Purpose and Context

The `fem_elastic` family (Postelnicu, Zollei, Fischl) implements the elastic (finite-element) volumetric registration used inside CVS registration ([[mri_cvs_register]]). Its three small drivers share one container class, `gmp::VolumeMorph` ([`fem_elastic/morph.h:329-444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L329-L444)):

| Tool | Role |
|------|------|
| [[surf2vol]] | Computes the FEM mesh and writes a `.tm3d` morph |
| `createMorph` | Builds a `.tm3d` from existing components |
| [[applyMorph]] | Applies a `.tm3d` to a volume or surface |
| [[exportGcam]] | Converts a `.tm3d` to an `.m3z` GCAM |

`createMorph` is the only tool that can *compose* heterogeneous transforms (an `.m3z` nonlinear warp, a FEM mesh, a linear matrix, a raw displacement volume) into the single chain that the other two tools consume.

**In-tree callers.** The only caller in the FreeSurfer 8.2.0 tree is `scripts/trac-preproc` (TRACULA pre-processing), which "recreates" the full CVS morph from its components when only the first-generation `mri_cvs_register` outputs exist:

```tcsh
createMorph --out $xfmdir/cvs/$cvswarp.tm3d --template $intertrg \
            --subject $fsdir/mri/norm.mgz \
            --in gcam $xfmdir/cvs/nlalign-afteraseg-norm.m3z \
                  morph $xfmdir/cvs/el_reg_to$cvstemp.tm3d
```

([`scripts/trac-preproc:1763-1768`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1763-L1768)); the result is then converted with `exportGcam` ([`scripts/trac-preproc:1776-1782`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1776-L1782)); see [[trac-preproc]]. `mri_cvs_register` itself no longer invokes `createMorph` (its only mention is the `see-also` line of its help text); it calls [[surf2vol]] and `exportGcam` directly and has its `applyMorph` call commented out. No Python script or other C++ tool in the tree calls `createMorph`.

## Inputs

### Required Inputs

- **`--in KEYWORD FILE [KEYWORD FILE ...]`** - one or more (keyword, filename) pairs ([`fem_elastic/fcreateMorph.cpp:248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L248)). The option takes a variable number of tokens (`'+'`), so tokens are consumed until the next token that starts with `-`. Repeating `--in` appends further pairs (verified experimentally: `--in affine a.txt --out o.tm3d --in morph b.tm3d` stored both transforms).
- **`--out FILE`** - the output morph ([`fem_elastic/fcreateMorph.cpp:249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L249)).

### Transform keywords

The keyword is compared with exact, case-sensitive string equality ([`fem_elastic/fcreateMorph.cpp:109-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L109-L218)).

| Keyword | File read | Reader | In-memory class | Stored as (`type\|name`) | Stored payload |
|---------|-----------|--------|-----------------|--------------------------|----------------|
| `affine` | Plain text, 12 whitespace-separated numbers | `read_transform` ([`fem_elastic/transformUtils.cpp:8-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L8-L32)) | `gmp::AffineTransform3d` | `affine\|` | 12 x float32 |
| `volume` | Any volume readable by `MRIread` (mgz, nii, ...); intended: 3 frames (dx, dy, dz) | `MRIread` ([`fem_elastic/fcreateMorph.cpp:127-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L127-L134)) | `gmp::DeltaTransform3d` | `field\|` | int32 w,h,d; float32 field; mask flag |
| `gcam` | GCAM readable by `GCAMread` (`.m3z`, or an mgz/nii warp field; see [[m3z-format]]) | `GCAMread` ([`utils/gcamorph.cpp:1119-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L1119-L1127)), then `CopyGcamToDeltaField` | `gmp::DeltaTransform3d` | `field\|` | same as `volume` |
| `morph` | An existing `.tm3d` (or `.nm3d`) | `VolumeMorph::load` ([`fem_elastic/morph.cpp:1255-1276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1255-L1276)) | every transform of the file, appended | as originally stored | as originally stored |
| `mesh` | Raw zlib-compressed FEM mesh (`CMesh3d`, tetrahedra) | `TMesh::load(const char*)` ([`fem_elastic/mesh.h:338-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L338-L362)) | `gmp::FemTransform3d` | `fem\|` | mesh stream (see below) |

A fifth class, `IdentityTransform3d` (`id|`), exists in the file format ([`fem_elastic/morph.cpp:1707-1708`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1707-L1708)) but there is no `createMorph` keyword for it.

**`affine` file.** Twelve numbers read with C++ `operator>>` ([`fem_elastic/transformUtils.cpp:19-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L19-L23)). They are used as

$$
\begin{aligned}
x'_j &= p_{j}\,x_0 + p_{j+3}\,x_1 + p_{j+6}\,x_2 + p_{j+9}, \qquad j=0,1,2
\end{aligned}
$$

([`fem_elastic/morph.cpp:38-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L38-L50)), i.e. the file lists the 3x3 matrix **column by column** (`p0..p2` = first column, `p3..p5` = second, `p6..p8` = third) followed by the translation `p9..p11`. This is *not* the layout of an LTA or `.xfm` file; there is no header, no geometry and no type tag.

**`volume` file.** Not interpreted geometrically: only the voxel array is stored. The value at index $(i,j,k)$ of frame $f$ is later added to coordinate $f$ of the point being mapped, so the field must be in the same *index* units and on the same index grid as the point at that stage of the chain (see Configuration Interactions).

**`gcam` file.** See "Mathematical Foundations" for how nodes are turned into displacements.

**`mesh` file.** A single zlib stream (inflated with `ZlibStringCompressor::inflate`) holding, in native binary: `uint32` material count and per material (`uint32` label length, label bytes, `double` E, `double` nu); a `bool` bounding-box flag followed by 2x3 `double` if set; `uint32` node count and per node (`int32` id, 3 `double` coordinates, 3 `double` displacement, 3 `bool` active-DOF flags); `uint32` element count and per element (`int32` id, `uint32` material-label length + label, 4 `int32` node ids) ([`fem_elastic/mesh.h:367-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/mesh.h#L367-L494)). A synthetic one-tetrahedron mesh built to this layout was accepted by `createMorph` in a scratch experiment and produced a 279-byte `fem|` payload inside the `.tm3d`.

### Optional geometry inputs

| Input | Meaning |
|-------|---------|
| `--template FILE` | A volume whose geometry becomes the morph's **fixed** (a.k.a. atlas / template) geometry. Also used to size the delta field of every `gcam` pair. |
| `--subject FILE` | A volume whose geometry becomes the morph's **moving** (a.k.a. subject) geometry. |

### Input Assumptions

> [!assumption] Key assumptions
> 1. All transforms operate in **voxel-index space**, not RAS. The first listed transform receives the voxel coordinates of a point in the *fixed* (template) grid; the last listed transform must return voxel coordinates in the *moving* (subject) grid ([`fem_elastic/morph.h:323-327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L323-L327), [`fem_elastic/morph.cpp:1110-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1110-L1127)). `createMorph` does not verify this.
> 2. The `gcam` branch assumes the GCAM's *image* and *atlas* volumes share the same RAS space; the source says so explicitly ([`fem_elastic/fcreateMorph.cpp:327-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L327-L332)).
> 3. The `--template` grid for a `gcam` pair is assumed to differ from the GCAM atlas grid by an integer voxel shift only (rotation/scale between the two grids is ignored; see below).

## Outputs

### Files Created

Exactly one file: `--out`. Nothing else is written (no log, no side files). An existing file is overwritten without warning. No extension is enforced; `.tm3d` is the convention used by every in-tree consumer. Note that `VolumeMorph::load` selects the *legacy* reader only for the extension `nm3d` and the tag-based reader for everything else, including no extension ([`fem_elastic/morph.cpp:1255-1276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1255-L1276)), so the output of `createMorph` should not be given an `.nm3d` suffix.

The file is written only at the very end of the run ([`fem_elastic/fcreateMorph.cpp:226-236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L226-L236)); if an earlier step fails (exit 1) no output is produced.

### Output Specifications: the `.tm3d` layout

Verified byte-by-byte on files produced by the installed 8.2.0 binary. All scalars are raw native-endian (little-endian on x86-64) writes; there is no magic number, version field or checksum ([`fem_elastic/morph.cpp:1200-1251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1200-L1251)).

The file is a sequence of **tagged records** ([`fem_elastic/tag_fio.h:46-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/tag_fio.h#L46-L61)): `int32 tag`, `long length` (8 bytes on LP64 Linux), then `length` payload bytes. Records are written in this order ([`fem_elastic/morph.h:424-429`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L424-L429)):

| Tag | Payload | Size |
|-----|---------|------|
| 1 (`tagVgFixed`) | Fixed volume geometry | 76 bytes |
| 2 (`tagVgMoving`) | Moving volume geometry | 76 bytes |
| 3 (`tagTransform`), repeated once per transform in chain order | zlib-compressed transform record | variable |

**Volume-geometry payload** ([`fem_elastic/morph.cpp:1420-1451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1420-L1451)): `int32 valid`; `int32 width, height, depth`; `float32 xsize, ysize, zsize`; nine direction cosines `x_r x_a x_s y_r y_a y_s z_r z_a z_s`; centre `c_r c_a c_s` (float32).

**Transform record** (before zlib, [`fem_elastic/morph.cpp:1721-1747`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1721-L1747) and [`fem_elastic/morph.h:99-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L99-L112)): `uint32 n`; `n` bytes of `"<type>|<name>"` (type is `affine`, `fem`, `id` or `field`; name is empty for everything `createMorph` writes); one `bool` "has initial transform" (always 0 after `serialize()`); then the type payload:

- `affine`: 12 x float32.
- `field`: `int32 width, height, depth`; then `3 x depth x height x width` float32 (frame-major, x fastest); then one `bool` mask flag, followed by `width*height*depth` bytes only if the flag is 1 ([`fem_elastic/morph.cpp:494-525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L494-L525)). `createMorph` never attaches a mask, so the flag is 0. The field's voxel size and orientation are **not** stored.
- `fem`: the mesh stream described above, uncompressed (the whole record is compressed instead).

**Compression.** Each transform record is compressed independently with zlib `compress2` at level 9 (`Z_BEST_COMPRESSION`) ([`fem_elastic/morph.cpp:1223-1232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1223-L1232), [`fem_elastic/ZlibStringCompressor.cpp:79-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp#L79-L105)); the geometry tags are not compressed. On load, records are inflated with a buffer of `m_bufferAllocationMultiplier` x compressed size that doubles on `Z_BUF_ERROR` ([`fem_elastic/ZlibStringCompressor.cpp:107-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/ZlibStringCompressor.cpp#L107-L134)); [[applyMorph]] and [[exportGcam]] expose this as `--zlib_buffer`. Unknown tags are silently skipped by the reader ([`fem_elastic/morph.cpp:1414-1416`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1414-L1416)).

**Size.** A `field` record stores the full float grid: a 256^3 template gives 3 x 64 MiB of raw floats per `gcam`/`volume` pair before compression. This is why `mri_cvs_register` deletes its `.tm3d` files by default.

**Geometry defaults.** If `--template` / `--subject` is omitted (or its file cannot be read), the corresponding geometry stays at the `VolumeMorph` constructor default: `valid = 0`, 256x256x256, 1 mm voxels, LIA orientation (`x_r=-1, y_s=-1, z_a=1`), centre (0,0,0) ([`fem_elastic/morph.cpp:660-668`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L660-L668), [`utils/vol_geom.cpp:69-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/vol_geom.cpp#L69-L92)). Verified: `--subject` only produced fixed = default / moving = real geometry.

Standard output is verbose (transform sizes, GCAM dimensions, matrices). The final line `#VMPC# fcreateMorph VmPeak <kB>` reports peak virtual memory ([`fem_elastic/fcreateMorph.cpp:238`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L238)).

## Mathematical Foundations

**Chain evaluation.** The container stores transforms in a `std::list` in command-line order. For a point $\mathbf{p}$ in fixed-grid voxel coordinates the morph evaluates

$$
\mathbf{p}' = T_n\bigl(\cdots T_2\bigl(T_1(\mathbf{p})\bigr)\cdots\bigr),
$$

with $T_1$ the first `--in` pair (loop over the list from `begin()`, stopping early if a transform returns an *invalid* point) ([`fem_elastic/morph.cpp:1110-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1110-L1127)). The header comment states the same rule: "the initial transform is to be applied to the left (arrow notation)" ([`fem_elastic/morph.h:47-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.h#L47-L53)).

**How consumers use the chain** (`VolumeMorph::apply_transforms`, [`fem_elastic/morph.cpp:676-887`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L676-L887)): for every voxel $\mathbf{v}$ of the *output* (template) grid,

$$
\mathbf{p} = R_{\mathrm{fixed}}^{-1}\, V_{\mathrm{out}}\,\mathbf{v},\qquad
\mathbf{p}' = T_n\circ\cdots\circ T_1(\mathbf{p}),\qquad
\mathbf{u} = R_{\mathrm{in}}^{-1}\, V_{\mathrm{moving}}\,\mathbf{p}',
$$

where $V_{\mathrm{out}}$ is the vox-to-RAS matrix of the output grid, $R_{\mathrm{fixed}}^{-1}$ the RAS-to-voxel matrix of the **stored fixed geometry**, $V_{\mathrm{moving}}$ the vox-to-RAS matrix of the **stored moving geometry**, and $R_{\mathrm{in}}^{-1}$ the RAS-to-voxel matrix of the volume being resampled ([`fem_elastic/morph.cpp:726-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L726-L758)). The input volume is then sampled at $\mathbf{u}$ (trilinear by default). Hence the chain is a **pull-back map from template voxel to subject voxel**: it tells each template voxel where to look in the subject image. That is why the stored geometries matter, and why `--template` / `--subject` should be the volumes that the transforms were computed on.

**Per-type maps.**

- `affine`: $\mathbf{x}' = A\mathbf{x}+\mathbf{t}$ with $A$ and $\mathbf{t}$ taken from the 12 numbers as above.
- `field` (delta): $\mathbf{x}' = \mathbf{x} + \mathbf{d}(\mathbf{x})$, with $\mathbf{d}$ the three frames sampled at $\mathbf{x}$ (as voxel *indices* of the field) using `MRIsampleVolumeFrameType` with `SAMPLE_TRILINEAR` ([`fem_elastic/morph.cpp:403-442`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L403-L442)). The interpolation mode is a member that is *not* stored in the file; every loaded field uses trilinear. If a mask is present, samples whose mask value is 0 make the point invalid; `createMorph` never writes a mask.
- `fem`: the mesh's forward image `dir_img(pt)` of the mesh (tetrahedral linear interpolation of node displacements) ([`fem_elastic/morph.cpp:552-560`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L552-L560)). The octree index is built when a consumer calls `performInit` ([`fem_elastic/morph.cpp:579-583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L579-L583)), not by `createMorph`.

**GCAM to delta field** (`CopyGcamToDeltaField`, [`fem_elastic/fcreateMorph.cpp:293-482`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L293-L482)). For a `gcam` pair the program:

1. Reads the GCAM and the `--template` volume. Builds a throw-away `MRI` with the GCAM *image* dimensions and geometry and calls `GCAMrasToVox(gcam, mriBuf)` ([`fem_elastic/fcreateMorph.cpp:151-157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L151-L157)); this rewrites every node's `(x,y,z)` and `(origx,origy,origz)` through the image's RAS-to-voxel matrix ([`utils/gcamorph.cpp:11184-11261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L11184-L11261)).
2. Allocates a 3-frame float field of the **template's** width x height x depth, with the template's header, zero-initialised ([`fem_elastic/fcreateMorph.cpp:167-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L167-L172)).
3. Forms $M = R_{\mathrm{field}}\,V_{\mathrm{atlas}}$ (template RAS-to-voxel times GCAM-atlas vox-to-RAS), applies it to the voxel $(0,0,0)$ and rounds to the nearest integer to get a single shift $\mathbf{s}=(s_x,s_y,s_z)$ ([`fem_elastic/fcreateMorph.cpp:315-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L315-L349)). The per-voxel use of $M$ is disabled (`#if 0`, [`fem_elastic/fcreateMorph.cpp:357-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L357-L368)).
4. For every GCAM node index $\mathbf{g}=(x,y,z)$ with $0\le x<$ `gcam->width` etc.: $\mathbf{f}=\mathbf{g}+\mathbf{s}$; if $\mathbf{f}$ lies outside the field, the node is skipped; if the node is flagged `GCAM_POSITION_INVALID`, it is skipped; otherwise
$$
\mathbf{d}[\mathbf{f}] = \mathbf{n}(\mathbf{g}) - \mathbf{f},
$$
where $\mathbf{n}(\mathbf{g})$ is the (converted) node position ([`fem_elastic/fcreateMorph.cpp:370-413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L370-L413)). Untouched voxels keep $\mathbf{d}=\mathbf{0}$ (zero displacement, i.e. identity), **not** "invalid".

Mismatch counters ("invalid voxel count") are printed ([`fem_elastic/fcreateMorph.cpp:416`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L416)).

> [!internal] See [[internal-gcamorph]] for the GCAM node structure, `GCAMread`, and the `GCAM_RAS` / `GCAM_VOX` node-coordinate types.

## Configuration Options

### Complete Flag Reference

Arguments are parsed by FreeSurfer's `ArgumentParser` ([`fem_elastic/fcreateMorph.cpp:243-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L243-L285)). No flag has an alternate spelling, so no `<br>` multiplexing is needed.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--in` | list of strings (`KEYWORD FILE` pairs; keywords `affine`, `volume`, `gcam`, `morph`, `mesh`) | required | Transforms to chain, in application order (first pair applied first). Number of tokens must be even ([`fem_elastic/fcreateMorph.cpp:274-277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L274-L277)). Example: `--in affine lin.txt gcam warp.m3z` |
| `--out` | string (path) | required | Output morph file (`.tm3d` by convention). Example: `--out chain.tm3d` |
| `--template` | string (volume path) | none | Volume giving the fixed (template) geometry stored in the morph and, for `gcam`, the size and header of the delta field. Failure to read it only prints a message ([`fem_elastic/fcreateMorph.cpp:83-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L83-L92)). Example: `--template cvs_avg35/mri/norm.mgz` |
| `--subject` | string (volume path) | none | Volume giving the moving (subject) geometry stored in the morph ([`fem_elastic/fcreateMorph.cpp:93-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L93-L102)). Example: `--subject bert/mri/norm.mgz` |
| `--dbg` | 3 integers | none (empty) | Debug voxel coordinates. Only consulted by the `gcam` branch: after the field is filled, the program prints the GCAM node that the given coordinates map back to ([`fem_elastic/fcreateMorph.cpp:417-452`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L417-L452)). No effect on the output file. Example: `--dbg 128 128 128` |
| `--help` | - | - | Standard `ArgumentParser` help generated from `createMorph.help.xml`. |

### Configuration Interactions

**Order of `--in` pairs is the order of the chain.** Pairs are pushed onto the morph's list in the order given ([`fem_elastic/fcreateMorph.cpp:104-224`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L104-L224)) and the consumers apply them first to last. In the `trac-preproc` call, the `gcam` is therefore applied to template-grid points first, and the elastic `morph` second.

> [!gotcha] Direction and spaces are the caller's responsibility
> `createMorph` never checks that the output space of transform *k* matches the input space of transform *k+1*, nor that any transform matches `--template` / `--subject`. Everything is bare voxel arithmetic. The first transform sees voxel indices of the `--template` grid; the last must produce voxel indices of the `--subject` grid. Swapping `--template` and `--subject`, or listing the pairs in the opposite order, produces a valid file that samples the wrong places.

**`gcam` requires `--template`, and uses it for more than geometry.** The help text calls `--template` "only for geometry" and says it must be given when a gcam is present ([`fem_elastic/createMorph.help.xml:15-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/createMorph.help.xml#L15-L16)). The code re-reads `params.strTemplate` inside the `gcam` branch ([`fem_elastic/fcreateMorph.cpp:149-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L149-L150)) and sizes the delta field from it ([`fem_elastic/fcreateMorph.cpp:167-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L167-L171)); the requirement is **not enforced**: running with a `gcam` pair and no `--template` prints `mri_read(): empty fname!` and ends with a segmentation fault (exit status 139 in a scratch test).

> [!contradiction] Help text vs. code: "only for geometry"
> `createMorph.help.xml` describes `--template` as "Template volume (only for geometry)". In the `gcam` branch the template additionally determines the *dimensions of the delta field* and, through step 3 above, the integer shift that places GCAM nodes into that field. A template whose grid differs from the GCAM atlas grid changes the numerical content of the output, not just its header.

**`--template`/`--subject` of nested `morph` inputs are discarded.** A `morph` pair copies only the transform list of the loaded file ([`fem_elastic/fcreateMorph.cpp:204-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L204-L209)); the nested file's fixed/moving geometries are dropped. Verified: `createMorph --in morph a.tm3d --out b.tm3d` (no `--template`) wrote default geometry even though `a.tm3d` held real geometry. Always repeat `--template` / `--subject` when splicing a `morph`. A nested file's *own* transforms are also taken as they are, with no re-basing.

**Splicing and flattening.** A loaded transform that carries an "initial" transform is flattened on save (the initial is inserted before it) by `serialize()` ([`fem_elastic/morph.cpp:1659-1677`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L1659-L1677)), so the output always has `hasInitial = 0` and an `N`-record chain equals the concatenation of its parts. Chaining `--in affine A morph M affine B` yields three records in that order (verified).

**`--template` and `--subject` are independent.** Either may be omitted. With neither, a chain of `affine`, `volume`, `mesh` or `morph` items is written with two default (invalid, 256^3 LIA) geometries; [[applyMorph]]/[[exportGcam]] still use those default matrices when resampling ([`fem_elastic/morph.cpp:726-758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L726-L758)), whereas the surface mode of `applyMorph` refuses geometries whose `valid` flag is 0 ([`fem_elastic/fapplyMorph.cpp:573-578`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fapplyMorph.cpp#L573-L578)).

**`volume` field must have exactly 3 frames.** The writer emits `nframes` frames, but the reader always expects 3 ([`fem_elastic/morph.cpp:465-477`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L465-L477), [`fem_elastic/morph.cpp:506-513`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/morph.cpp#L506-L513)). A 1-frame volume was written without error as a record of `W*H*D*4+1` payload bytes instead of `3*W*H*D*4+1`; such a file cannot be read back consistently.

**`--in` count rules.** An even token count is required (`odd number of transform tokens`, exit 1). An empty list prints "nothing to do" and exits 0, but this branch is unreachable in practice because the parser already requires at least one token to `--in`.

## Typical Use Cases

### Use Case 1: Rebuild a CVS morph from its two components

The production pattern ([`scripts/trac-preproc:1763-1768`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc#L1763-L1768)): chain the volumetric nonlinear GCAM with the elastic `.tm3d`, then export an `.m3z`.

```bash
createMorph --out final_CVSmorph.tm3d \
            --template $CVSTEMP/mri/norm.mgz \
            --subject  $SUBJ/mri/norm.mgz \
            --in gcam  nlalign-afteraseg-norm.m3z \
                 morph el_reg_toCVSTEMP.tm3d
exportGcam --morph final_CVSmorph.tm3d --fixed $CVSTEMP/mri/norm.mgz \
           --moving $SUBJ/mri/norm.mgz --out_gcam final_CVSmorph.m3z
```

### Use Case 2: Prepend a linear step to an existing morph

```bash
# lin.txt holds 12 numbers: 3x3 matrix column by column, then translation, mapping
# template voxel indices to subject voxel indices (same format as surf2vol -cache_transform)
createMorph --template tmpl.mgz --subject subj.mgz \
            --in affine lin.txt morph elastic.tm3d \
            --out lin_then_elastic.tm3d
applyMorph --template tmpl.mgz --transform lin_then_elastic.tm3d vol subj.mgz out.mgz linear
```

### Use Case 3: A raw displacement volume

```bash
# disp.mgz must have exactly 3 frames (dx,dy,dz) on the template voxel grid, in voxel units
createMorph --template tmpl.mgz --subject subj.mgz --in volume disp.mgz --out disp.tm3d
```

### Use Case 4: Inspect the chain

There is no `createMorph` option to list a `.tm3d`. The record layout above can be parsed with a short script (tags 1-2 = geometry; each tag 3 = one zlib-compressed transform whose first bytes name its type); [[applyMorph]] on a test volume is the functional check.

## Pipeline Context

Not part of `recon-all`. Used by the TRACULA pre-processing script ([[trac-preproc]]) for CVS morphs, and available for manual composition of [[surf2vol]] output with other transforms.

**Predecessor:** [[surf2vol]] / [[mri_nl_align]] / [[mri_cvs_register]] (produce the components) -> **createMorph** -> **Successor:** [[exportGcam]] (to `.m3z`) or [[applyMorph]] (to resample). To combine `.m3z`/LTA transforms without going through `.tm3d`, see [[mri_concatenate_gcam]].

## Gotchas and Caveats

> [!gotcha] Unknown keywords are skipped, not rejected
> A keyword that matches none of the five (including a capitalisation variant such as `Affine`) prints ` unhandled transform type <kw>` to stderr, is dropped from the chain, and the program still writes the output and exits 0 ([`fem_elastic/fcreateMorph.cpp:219-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L219-L223)). With only an unknown keyword, the result is a valid file containing the two geometry tags and no transforms (176 bytes). Check stderr or the exit message when scripting.

> [!gotcha] A short `affine` file is silently padded
> `read_transform` returns success when the 12th extraction is attempted, even if it fails ([`fem_elastic/transformUtils.cpp:21-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/transformUtils.cpp#L21-L30)). In a scratch test a file with only 11 numbers was accepted and the 12th element (z translation) stored as 0; fewer than 11 numbers is rejected (`failed to read transform`, exit 1). Extra numbers beyond 12 are ignored.

> [!gotcha] `--template` / `--subject` read failures are not fatal
> If the volume cannot be opened, createMorph prints `Failed to open template mri ...` (followed by a harmless `MRIfree: null pointer` message) and carries on with the default geometry ([`fem_elastic/fcreateMorph.cpp:83-102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L83-L102)). The output is written with `valid = 0` geometry for that side. A subsequent `gcam` pair would then abort instead (see above).

> [!gotcha] GCAM nodes are treated as one node per template voxel
> The `gcam` branch iterates `gcam->width/height/depth` node indices and uses them directly as voxel offsets ([`fem_elastic/fcreateMorph.cpp:353-356`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L353-L356)); `gcam->spacing` is never read. A downsampled GCAM (spacing > 1) is therefore interpreted as if it were at voxel spacing.

> [!gotcha] The GCAM invalid mask is computed but not stored
> `CopyGcamToDeltaField` allocates and fills a validity mask ([`fem_elastic/fcreateMorph.cpp:299-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L299-L311), [`fem_elastic/fcreateMorph.cpp:476-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L476-L481)) but the caller's `set_mask` is commented out ([`fem_elastic/fcreateMorph.cpp:176-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L176-L181)). Voxels outside the GCAM extent or at invalid nodes therefore carry zero displacement in the stored field instead of being marked invalid.

> [!gotcha] Raw GCAM-to-delta conversion result (experiment)
> In a scratch experiment on a 32x32x32, 8 mm template, an *identity* `.m3z` (zero RAS displacement, written by [[mri_warp_convert]]) was passed to `--in gcam`. The resulting `field` record did not contain zero displacements: the field value at voxel (10,10,10) was (5.42, 4.75, 5.00) voxels, with a maximum magnitude of 18.9 voxels. A GCAM with a known constant shift gave likewise non-constant output. The `gcam` branch calls `GCAMrasToVox` regardless of the GCAM's `type` field ([`fem_elastic/fcreateMorph.cpp:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L156)), and the type test inside that function is compiled out ([`utils/gcamorph.cpp:11191-11195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L11191-L11195)). See the gap below.

> [!gotcha] Several load errors abort rather than exit cleanly
> A missing or corrupt raw `mesh` file throws a `const char*` that is not caught in the `mesh` branch ([`fem_elastic/fcreateMorph.cpp:211-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L211-L218)); the process ends with `terminate called after throwing an instance of 'char const*'` (exit 134). Missing `volume`, `gcam`, `affine` and `morph` files exit with status 1 after a message. A `morph` path with no extension fails with the message `Exception caught while loading morph` (the underlying text, `Couldn't find extension`, is not printed because the handler ignores it, [`fem_elastic/fcreateMorph.cpp:198-203`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L198-L203)); a `morph` path ending in `.nm3d` is read with the legacy format and fails on files written by `createMorph`.

> [!gotcha] The `.tm3d` is not portable between architectures
> Raw native-endian scalars and an 8-byte `long` length field ([`fem_elastic/tag_fio.h:46-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/tag_fio.h#L46-L61), [`fem_elastic/streamIoMisc.h:13-21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/streamIoMisc.h#L13-L21)) tie the format to LP64 little-endian hosts. There is no format version.

## Error Compensation and Guard Rails

`createMorph` compensates for very little:

- It **flattens** transforms that carry an "initial" transform into a plain sequence (`serialize()`), so every written chain is a simple list.
- It **tolerates** an unreadable `--template` / `--subject` (continues with default geometry) and an unknown keyword (skips the pair); both are potentially silent in a pipeline.
- It **rejects** an odd number of `--in` tokens, a missing or unreadable `affine` / `volume` / `gcam` / `morph` file, and an unwritable `--out` (`VolumeMorph save - failed to open output stream`, exit 1; [`fem_elastic/fcreateMorph.cpp:227-236`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fcreateMorph.cpp#L227-L236)).
- `GCAMread` itself accepts both `.m3z` and mgz/NIfTI warp-field files through `mri_identify` ([`utils/gcamorph.cpp:1119-1127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gcamorph.cpp#L1119-L1127)); `createMorph` does not distinguish them.

There is no check for geometry consistency, transform singularity, or field size against the template.


## Known Bugs

Defects found in the 2026-10-19 source audit of `fem_elastic/` (v8.2.0), most severe first:

- [[00206]] — severity 3: applyMorph — CMesh3d copy ctor shallow-copies the Octree; FemTransform3d::invert double-frees the root on point_list/tract_point_list of a FEM-mesh morph (harness SIGSEGV); m_poctree left uninitialised
- [[00215]] — severity 3: createMorph — gcam input: GCAMrasToVox() applied to voxel-type GCAMs since 2023 (0a3a8c2d16) gives garbage delta field; hits trac-preproc legacy CVS branch
- [[00204]] — severity 2: surf2vol/createMorph — read_transform accepts an 11-number (or non-numeric 12th token) affine file; z translation silently 0
- [[00208]] — severity 2: surf2vol — new[]/delete mismatch in SmallMatrix::inplace_transpose (per active MFC per FEM step) and ZlibStringCompressor::setBufferSize; UB, benign on glibc, Valgrind-confirmed; dangling m_buffer
- [[00209]] — severity 2: surf2vol / exportGcam / createMorph — leaks: comm_solution overwrites its new[] with VecGetArray, setup_load_sym frees nothing, ZlibStringCompressor has no destructor (peak-memory inflation)
- [[00216]] — severity 2: createMorph — poor input validation: gcam without --template segfaults, unknown keywords/unreadable template skipped with exit 0, nested morph drops geometry, missing mesh aborts
- [[00218]] — severity 2: createMorph — volume input with nframes != 3 writes a .tm3d field record the 3-frame reader cannot parse (read past end / dropped frames); no frame check
- [[00220]] — severity 2: applyMorph — sprobe/snormals segfault (exit 139) on morphs without valid geometry (e.g. createMorph without --template/--subject): LoadInputData returns instead of throwing

## Related Tools

- [[applyMorph]] - applies a `.tm3d` to a volume or surface; defines the voxel-to-voxel convention.
- [[exportGcam]] - converts a `.tm3d` chain into an `.m3z` GCAM (the usual last step).
- [[surf2vol]] - computes the FEM mesh registration and writes a `.tm3d` (chain: mesh, then affine) via `-out_mesh` ([`fem_elastic/fsurf2vol.cpp:670-686`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L670-L686)).
- [[mri_cvs_register]] - the CVS pipeline that produces the `.tm3d`/`.m3z` components.
- [[mri_nl_align]] - produces nonlinear `.m3z` morphs of the type fed to `--in gcam`.
- [[mri_warp_convert]] - creates `.m3z` from other warp formats.
- [[mri_concatenate_gcam]] - concatenates `.m3z`/LTA without the `.tm3d` container.
- [[trac-preproc]] - the one in-tree caller.
- [[m3z-format]], [[internal-gcamorph]], [[coordinate-systems]], [[registration-overview]] - background.

## Confidence and Gaps

Argument parsing, the chain order, the `.tm3d` byte layout and the per-type record layouts are fully determined by the source and were cross-checked against files written by the installed 8.2.0 binary (affine, volume, gcam, mesh and chained morphs). Confidence is medium overall because of the open items below.

> [!gap] Convention of the `affine` text file
> `createMorph` uses the 12 numbers exactly as a fixed-voxel to moving-voxel map. The only in-tree writer of this 12-number format is [[surf2vol]] (`write_transform` for its `-cache_transform` file, which it reads back with the same `read_transform`; [`fem_elastic/fsurf2vol.cpp:346-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L346-L366)). `surf2vol` then **inverts** that matrix ([`fem_elastic/fsurf2vol.cpp:369-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L369-L370)) and appends the inverse to its chain ([`fem_elastic/fsurf2vol.cpp:684-685`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/fem_elastic/fsurf2vol.cpp#L684-L685)). A cache file written by `surf2vol` is therefore the *inverse* of the matrix that `surf2vol` itself stores in its `.tm3d`, and is not directly the matrix `createMorph` would store for the same step. Which direction a hand-written file should have is not settled by the code beyond "fixed voxel to moving voxel".

> [!gap] Raw `mesh` file producer
> No in-tree caller of `TMesh::save(const char*)` was found. `surf2vol -out_mesh` writes a complete `.tm3d` (use `morph`, not `mesh`, to chain it). How a standalone raw mesh file used by the `mesh` keyword is meant to be produced is unknown.

> [!gap] RAS versus voxel node coordinates in the `gcam` branch
> See the experiment above: for a GCAM written by [[mri_warp_convert]] the conversion step yields non-identity displacement for an identity warp. Every `.m3z` decoded during the 2026-10-19 audit was `GCAM_VOX` (the shipped `cvs_avg35` and `cvs_avg35_inMNI152` `talairach.m3z`, the `mni_icbm152_nlin_asym_09c` SAMSEG template `.m3z`, and synthetic `mri_warp_convert` output), and `mri_nl_align` writes without converting to RAS. So the unconditional `GCAMrasToVox()` call mis-maps the normal input; see [[00215]]. A real `nlalign-afteraseg-norm.m3z` from `trac-preproc`'s legacy branch was not decoded.

> [!gap] GCAM spacing and non-integer atlas/template offsets
> Behaviour for `gcam->spacing > 1`, and for a `--template` whose grid differs from the GCAM atlas grid by anything other than an integer translation, is as described in the code but was not validated against an independent reference.

> [!gap] Sampling outside the delta field
> The out-of-bounds result of `MRIsampleVolumeFrameType` for the `field` transform, which determines what happens to template points that map outside the stored grid, was not traced.

## References

- Source: `fem_elastic/fcreateMorph.cpp`, `fem_elastic/morph.cpp`, `fem_elastic/morph.h` (FreeSurfer v8.2.0, git d932c45b79).
- Help text: `createMorph --help` (8.2.0 install; consistent with `createMorph.help.xml`, with the exceptions noted above: "only for geometry", and the unenforced "needs to be specified").
- Caller: `scripts/trac-preproc` (see [[trac-preproc]]).
- Method background: Postelnicu G, Zollei L, Fischl B. "Combined volumetric and surface registration." *IEEE Trans Med Imaging* 2009;28(4):508-522 (CVS registration, see [[mri_cvs_register]]).
