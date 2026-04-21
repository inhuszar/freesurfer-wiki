---
title: "GCA Morph Warp Field (.m3z)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".m3z"
  - ".m3d"
produced_by:
  - "[[mri_nl_align]]"
  - "[[mri_ca_register]]"
  - "[[mri_nl_align_binary]]"
consumed_by:
  - "[[mri_vol2vol]]"
  - "[[mri_concatenate_gcam]]"
  - "[[mri_evaluate_morph]]"
  - "[[mri_warp_convert]]"
related:
  - "[[internal-gcamorph]]"
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - format
  - registration
  - nonlinear
  - warp
---

# GCA Morph Warp Field (.m3z)

## Overview

The `.m3z` format encodes FreeSurfer's non-linear volumetric deformation field — the persisted form of the `GCA_MORPH` (`GCAM`) structure defined in `include/gcamorph.h`. It stores a dense 3-D lattice of node records, where each node records both its original source position and its displaced (registered) source position. The lattice is defined over the atlas (target) coordinate frame; moving it deforms the source image into registration with the target.

`.m3z` is a **gzip-compressed binary** stream. The extension `.m3d` designates the identical format without gzip compression. Both variants are read and written by the same code path in `utils/gcamorph.cpp` (`__m3zWrite` / `__m3zRead`), with compression enabled by the file extension.

`.m3z` is the primary non-linear registration output format in FreeSurfer. The most commonly encountered instance is `subjects/<subject>/mri/transforms/talairach.m3z`, written by [[mri_ca_register]] during the `recon-all` `autorecon2` stage. For the underlying algorithm, energy functional, and `GCA_MORPH` data structures, see [[internal-gcamorph]].

---

## Relationship to Other Warp Formats

| Format | Type | Coordinate space | FreeSurfer tool | Notes |
|--------|------|-----------------|-----------------|-------|
| `.m3z` / `.m3d` | Dense non-linear GCAM lattice | Voxel (default) or RAS | `GCAMread` / `GCAMwrite` | This format |
| `.lta` | Linear transform (affine/rigid) | Various | `LTAread` / `LTAwrite` | See [[lta-format]]; cannot represent non-linear warps |
| ITK displacement field (`.nii.gz`, `ITK_MORPH` type) | Dense voxel-wise displacement | LPS world coordinates | `mri_warp_convert` | Convention: displacement = src_LPS − dst_LPS; used by ANTs, SimpleITK |
| FSL warp (`fnirt` output) | Dense voxel-wise displacement | FSL RAS (mm) | `mri_warp_convert` | Convention: delta in FSL scanner RAS; writing FSL output from FS is not implemented |
| SPM warp (`.nii`) | Absolute source-space coordinates | RAS or CRS | `mri_warp_convert --inspm` | Stores absolute positions, not displacements |
| MGZ / NIfTI warp volume | Dense voxel-wise displacement | Voxel or RAS | `GCAMread` / `GCAMwrite` (via `Warpfield` class) | Alternative wire format; triggered by `.mgz`/`.nii`/`.nii.gz` extension; distinct from `.m3z` |

[[mri_warp_convert]] can convert `.m3z` to and from ITK, FSL (read only), SPM (read only), raw voxel-displacement, and raw RAS-displacement formats. Linear transforms cannot be mixed with `.m3z` directly; use [[mri_concatenate_gcam]] to compose LTAs around a GCAM warp.

---

## Binary Layout

The format is implemented in `__m3zWrite()` / `__m3zRead()` (`utils/gcamorph.cpp`, lines 374–454 and 1160–1317). All integer and float fields are written with the `znzwrite*` family, which uses the **native host byte order** (little-endian on all modern hardware where FreeSurfer runs). The `znz` library wraps `zlib` for transparent gzip compression.

> [!internal] Authoritative source
> The byte-level layout here is derived directly from reading `__m3zWrite()` in `utils/gcamorph.cpp`. Any discrepancy between this page and the source should be resolved in favour of the source. See [[internal-gcamorph]] for a parallel description of the same format.

### Fixed Header (24 bytes)

| Offset (bytes) | Size | C type | Field | Value |
|----------------|------|--------|-------|-------|
| 0 | 4 | `float` | Version | Must equal `GCAM_VERSION = 1.0f` |
| 4 | 4 | `int32` | `width` | Lattice width (x dimension) |
| 8 | 4 | `int32` | `height` | Lattice height (y dimension) |
| 12 | 4 | `int32` | `depth` | Lattice depth (z dimension) |
| 16 | 4 | `int32` | `spacing` | Inter-node spacing in target voxels |
| 20 | 4 | `float` | `exp_k` | Jacobian exponential coefficient (default 20.0) |

### Node Data Block

Immediately following the header, a flat scan over all $W \times H \times D$ nodes in **`[x][y][z]` order** (x is the outermost loop; z is the innermost). This matches the `nodes[x][y][z]` indexing convention of the `GCA_MORPH` struct.

Each node record is **36 bytes**:

| Offset within record | Size | C type | Field | Meaning |
|----------------------|------|--------|-------|---------|
| 0 | 4 | `float` | `origx` | Original source-image x position (voxels) |
| 4 | 4 | `float` | `origy` | Original source-image y position (voxels) |
| 8 | 4 | `float` | `origz` | Original source-image z position (voxels) |
| 12 | 4 | `float` | `x` | Displaced source-image x position (voxels) |
| 16 | 4 | `float` | `y` | Displaced source-image y position (voxels) |
| 20 | 4 | `float` | `z` | Displaced source-image z position (voxels) |
| 24 | 4 | `int32` | `xn` | Lattice index x (redundant with loop counter) |
| 28 | 4 | `int32` | `yn` | Lattice index y |
| 32 | 4 | `int32` | `zn` | Lattice index z |

Total uncompressed node block size: $W \times H \times D \times 36$ bytes.

> [!gotcha] Fields NOT saved in the node block
> Many `GCA_MORPH_NODE` fields documented in [[internal-gcamorph]] are runtime-only and are **not** written to disk: `dx/dy/dz` (gradient), `odx/ody/odz` (momentum), `jx/jy/jz` (Jacobian gradient), `area/area1/area2`, `orig_area*`, `log_p`, `prior`, `invalid`, `status`, `xs/ys/zs`. Labels are stored in a separate tagged section (see below). The commented-out lines in `__m3zWrite` (e.g., `znzwriteFloat(gcamn->dx, file)`) confirm that gradient fields were considered but never persisted.

### Tagged Sections

After the node data block, the file contains a sequence of tagged blocks read by `znzTAGreadStart`. Tags are written in the following fixed order:

| Tag constant | Integer value | Content |
|--------------|---------------|---------|
| `TAG_GCAMORPH_GEOM` | — | Source (`image`) and atlas (`atlas`) `VOL_GEOM` geometry blocks (each a full volume geometry record including vox2ras matrix, dimensions, and voxel sizes) |
| `TAG_GCAMORPH_TYPE` | — | One `int32`: `GCAM_VOX` (2) or `GCAM_RAS` (1) — the coordinate system of the node positions |
| `TAG_GCAMORPH_LABELS` | — | $W \times H \times D$ `int32` values, one per node in the same `[x][y][z]` scan order, giving each node's anatomical label. Non-zero only when `gcam->status == GCAM_LABELED` |
| `TAG_MGH_XFORM` | — | *Optional.* Written only if `gcam->m_affine != NULL`. Contains the 4×4 affine initialisation matrix encoded via `znzWriteMatrix`. On read, `gcam->det` is set to its determinant. |

The tag reading loop in `__m3zRead` runs until `znzTAGreadStart` returns 0 (EOF or unknown tag), so additional future tags can be appended without breaking readers.

> [!gotcha] `FS_SKIP_TAGS` environment variable
> If `FS_SKIP_TAGS` is set in the environment, the entire tagged-section loop is skipped during `__m3zRead`. This bypasses reading of geometry, type, labels, and the affine matrix. The resulting `GCAM` will have `image.valid = 0` and `atlas.valid = 0`, potentially causing downstream errors in tools that rely on geometry metadata.

---

## Node Spacing

The `spacing` field (stored as `int32` in the header) records how many target-image voxels separate adjacent lattice nodes. It determines the spatial resolution of the warp field.

- `spacing = 1`: one node per target voxel; the lattice dimensions equal the target image dimensions. This is the default set by `GCAMalloc` and used by `mri_nl_align`.
- `spacing = 2` (or greater): a coarser lattice where each node covers a $k \times k \times k$ block of target voxels. `mri_ca_register` inherits its spacing from the atlas (`gcam->spacing = gca->prior_spacing`). The standard FreeSurfer [[gca-format|GCA atlas]] (`RB_all_*.gca`) is trained with `prior_spacing = 2.0` (the default in `mri_ca_train`), so `talairach.m3z` typically has `spacing = 2` and lattice dimensions of approximately 128³ for a 256³ conformed brain.

> [!gotcha] `spacing` is stored as `int32`, not `float`
> Sub-voxel node spacing is not representable. The source comment in `include/gcamorph.h` explicitly notes this as a "poor choice to make this an int". In practice spacing is always 1 or a small integer; non-integer spacing from atlas training (e.g., `prior_spacing = 2.0f`) is truncated on assignment. The limitation is benign for all current FreeSurfer atlases.

---

## The Warp Representation

Each node sits at a fixed position in the **target (atlas) voxel grid**. Its node index $(xn, yn, zn)$ maps to a target voxel coordinate of $(xn \times \text{spacing},\; yn \times \text{spacing},\; zn \times \text{spacing})$.

The node stores two source-space positions:

- `(origx, origy, origz)` — the original position in the source image before non-linear optimisation began. This is typically set from an initial linear (LTA) transform that brings the source approximately into alignment.
- `(x, y, z)` — the current (displaced) position in the source image after non-linear optimisation.

The displacement vector at each node is:

$$\mathbf{u}_i = \begin{pmatrix} x_i - \text{origx}_i \\ y_i - \text{origy}_i \\ z_i - \text{origz}_i \end{pmatrix}$$

The warp is a **forward warp**: it maps a point in target (atlas) space to the corresponding point in source (subject) space. To resample a source image into atlas space, the tool follows each node's $(x, y, z)$ pointer back into the source and interpolates. `GCAMmorphToAtlas` performs this operation; `GCAMmorphFromAtlas` applies the inverse warp.

> [!gotcha] Node validity on read
> During `__m3zRead`, a node is marked `GCAM_POSITION_INVALID` if all six position fields (`origx`, `origy`, `origz`, `x`, `y`, `z`) read as identically zero (checked with `FZERO()`). Nodes on the border of the lattice (first or last index on any axis) are marked `GCAM_AREA_INVALID`. Both statuses cause the node to be skipped in all energy and gradient computations. These `invalid` flags are reconstructed from the on-disk data each time the file is read; they are not stored directly.

---

## File Size

For a 256³ conformed brain volume:

| Configuration | Uncompressed node block | Typical `.m3z` on disk |
|--------------|------------------------|------------------------|
| `spacing = 1` (256³ lattice, from `mri_nl_align`) | $256^3 \times 36 \approx 603$ MB | 300–600 MB |
| `spacing = 2` (128³ lattice, from `mri_ca_register`) | $128^3 \times 36 \approx 75$ MB | 20–60 MB |

The gzip compression ratio depends on deformation magnitude: a near-identity warp compresses very well; a large-deformation warp with high spatial frequency compresses less. The tagged sections (geometry, labels) add a few kilobytes and are negligible.

> [!gotcha] Inverse warp lookup volumes are not saved
> `GCAMinvert` computes the inverse lookup volumes `mri_xind`, `mri_yind`, `mri_zind` (one float32 volume per axis, each $W \times H \times D$) at runtime. These are NOT stored in the `.m3z` file. When an operation requires the inverse warp, the tool calls `GCAMinvert` on load, temporarily doubling the RAM footprint. For `talairach.m3z` with `spacing = 2`, the inverse lookup volumes add approximately 3 × 8 MB = 24 MB; for `mri_nl_align` output at `spacing = 1`, they add approximately 3 × 200 MB = 600 MB.
>
> The `GCAMreadAndInvert` / `GCAMwriteInverseNonTal` functions offer an optimisation: they cache the inverse lookup as three separate `.mgz` files (`talairach.m3z.inv.x.mgz`, `.inv.y.mgz`, `.inv.z.mgz`) alongside the warp, avoiding repeated inversion on subsequent loads.

---

## Coordinate System

By default, node positions are stored in **source voxel coordinates** (`GCAM_VOX`, type value 2). The `TAG_GCAMORPH_TYPE` tagged section records which system is in use. The alternative `GCAM_RAS` (type value 1) stores positions in source RAS coordinates.

Tools that apply the warp (e.g., `mri_vol2vol`) check the `type` field on load and call `GCAMrasToVox` or `GCAMvoxToRas` as needed to normalise to voxel coordinates before interpolation. Mixing up the coordinate type is a silent source of incorrect warps.

The `TAG_GCAMORPH_GEOM` section stores two `VOL_GEOM` blocks (source and atlas), each containing the vox2ras matrix, image dimensions, and voxel sizes. These are required for any tool that needs to convert between voxel and world coordinates. See [[coordinate-systems]] for the relationship between scanner RAS, tkRAS, and voxel spaces.

---

## Tools That Work with .m3z Files

| Tool | Operation | Notes |
|------|-----------|-------|
| [[mri_nl_align]] | Creates `.m3z` | Intensity-based non-linear registration; `spacing = 1` |
| [[mri_ca_register]] | Creates `.m3z` | Atlas non-linear registration; `spacing` from atlas (typically 2); output is `transforms/talairach.m3z` |
| [[mri_nl_align_binary]] | Creates `.m3z` | Binary-mask-based variant of `mri_nl_align` |
| [[mri_vol2vol]] | Applies `.m3z` | Reslices a volume through a GCAM warp via `--morph` / `--inv-morph` |
| [[mri_concatenate_gcam]] | Composes transforms | Concatenates LTA + GCAM + LTA chains; also supports `--invert` |
| [[mri_warp_convert]] | Converts `.m3z` | Converts between `.m3z` and ITK, FSL, SPM, VOX, RAS formats |
| [[mri_evaluate_morph]] | Evaluates `.m3z` | Assesses registration quality |
| `mri_vol2vol` | Applies `.m3z` | Alternative to `mri_apply_morph`; calls `GCAMread` directly |
| `mri_jacobian` | Derives Jacobian map | Computes voxel-wise Jacobian determinant of the warp |

---

## Working with .m3z Files Programmatically

Neither the FreeSurfer Python API nor nibabel support reading `.m3z` directly. The recommended interoperability path is conversion via [[mri_warp_convert]]:

**Convert `.m3z` to ITK displacement field (for ANTs, SimpleITK, etc.):**

```bash
mri_warp_convert --infswarp input.m3z --outlps output.nii.gz
```

The `--outlps` / `--outitk` flags produce an ITK-convention displacement field: each voxel stores a 3-component vector in LPS world coordinates representing `src_LPS − dst_LPS`. The output volume geometry matches the atlas (`gcam->atlas`). Note that ANTs uses LPS convention internally.

**Convert ITK displacement field back to `.m3z`:**

```bash
mri_warp_convert --initk input.nii.gz --outfswarp output.m3z --insrcgeom source_image.mgz
```

The `--insrcgeom` (or `-g`) flag is required when reading ITK, FSL, VOX, or RAS formats, because those formats do not embed source geometry. It specifies the moving (source) image whose geometry is needed to construct the `GCA_MORPH::image` `VOL_GEOM`.

**Aliases:** `--infswarp` = `--inm3z`; `--outfswarp` = `--outm3z`. FSL write is not implemented (`writeFSL` exits with an error); FSL read is supported via `--infsl`.

**Compose an LTA with a GCAM warp:**

```bash
mri_warp_convert --initk warp.nii.gz --outfswarp out.m3z \
    --insrcgeom moving.mgz --lta1 pre.lta --lta2 post.lta
```

The `--lta1`/`--lta2` flags bake pre- and post-warp linear transforms into the GCAM (via `GCAMconcat3`) before writing.

**Invert a warp (for `mri_concatenate_gcam`):**

```bash
mri_concatenate_gcam --invert input.m3z output_inverse.m3z
```

---

## Gotchas

> [!gotcha] `.m3z` is not an LTA
> A `.m3z` warp is a dense non-linear deformation field, not a linear transform. It cannot be passed to any tool that expects an `.lta` file. Composition of LTAs and GCAMs must use [[mri_concatenate_gcam]] (`GCAMconcat3`) or the `--lta1`/`--lta2` flags of [[mri_warp_convert]].

> [!gotcha] Gzip header is standard — binary content is not
> `.m3z` files pass the gzip magic byte check and can be decompressed by any gzip utility. The decompressed byte stream is a raw FreeSurfer binary format; it cannot be interpreted without the FreeSurfer reader. In particular, it is not a valid NIfTI or MGZ file.

> [!gotcha] Forward vs. inverse warp direction
> The warp stored in `.m3z` maps **target (atlas) → source (subject)** — it is a forward warp in FreeSurfer's convention. To apply it to resample a source image into atlas space, tools call `GCAMmorphToAtlas` (which pulls source values via the forward map). Applying the warp in the other direction (atlas → source, i.e., pushing source voxels into atlas space) requires inverting the warp at runtime via `GCAMinvert`. This is a numerically expensive scattered-data interpolation; the result is cached in `mri_xind/yind/zind` (not persisted in the `.m3z` file). Do not confuse forward and inverse directions when composing warps.

> [!gotcha] Coordinate type must match downstream tools
> The `type` field (voxel vs. RAS) is written into the file but not validated against the geometry. If a warp is written with `type = GCAM_RAS` but the downstream tool expects `GCAM_VOX`, node positions will be misinterpreted. The default from `GCAMalloc` is `GCAM_VOX`; only tools that explicitly call `GCAMvoxToRas` before writing will produce a `GCAM_RAS` file.

> [!gotcha] Not all pipeline tools accept `.m3z`
> Tools that apply transforms via the linear-transform API (`LTAtransform`) do not automatically fall back to GCAM morphs. Only tools that explicitly call `GCAMread` / `GCAMmorphToAtlas` / `GCAMmorphFromAtlas` support `.m3z` input. Passing a `.m3z` to a linear-only tool typically produces a file-type error or silently incorrect results.

> [!gotcha] Node lattice dimensions vs. image dimensions
> For `spacing > 1`, the lattice dimensions are **not** the same as the source or target image dimensions. The lattice is smaller by a factor of `spacing`. Code that assumes `gcam->width == mri->width` will fail silently or raise a dimension mismatch warning. `mri_nl_align` explicitly checks for this mismatch at startup (lines 545–551 of `mri_nl_align.cpp`) and prints a warning.

---

## Confidence and Gaps

The binary layout documented here is verified directly against `__m3zWrite` and `__m3zRead` in `utils/gcamorph.cpp` (FreeSurfer v8.2.0). Confidence is **high** for the header, node block, and tagged section structure.

> [!gap] Tag integer values
> The exact integer values of `TAG_GCAMORPH_GEOM`, `TAG_GCAMORPH_TYPE`, `TAG_GCAMORPH_LABELS`, and `TAG_MGH_XFORM` were not transcribed from `include/tags.h`. These are needed for a third-party implementation of the reader. A future revision should add the numeric values.

> [!gap] `VOL_GEOM` wire format
> The binary encoding of each `VOL_GEOM` block written by `VOL_GEOM::write(znzFile)` (called for both `image` and `atlas` geometry within the `TAG_GCAMORPH_GEOM` section) is not documented here. It includes the vox2ras matrix, image dimensions, voxel sizes, and file name. A format page for `VOL_GEOM` would clarify this.

> [!gap] `mri_apply_morph` inverse flag
> The task specification referenced `mri_apply_morph -inverse`, but the source file for `mri_apply_morph` was not located in the v8.2.0 tree during preparation of this page. Inverse-warp application may be handled by `mri_vol2vol` with the `--inv-morph` flag instead. Needs verification.

---

## Related Pages

- [[internal-gcamorph]] — full documentation of the `GCA_MORPH` data structures and registration algorithm
- [[lta-format]] — linear transform format; contrast with `.m3z`
- [[coordinate-systems]] — voxel, scanner RAS, tkRAS, and Talairach coordinate systems
- [[mri_nl_align]] — primary user-facing tool that produces `.m3z` warps
- [[mri_ca_register]] — atlas registration tool; writes `talairach.m3z`
- [[mri_warp_convert]] — converts `.m3z` to/from ITK, FSL, and other formats
- [[mri_concatenate_gcam]] — composes and inverts GCAM warps
- [[mgz]] — the MGZ/MGH volume format referenced by `VOL_GEOM` geometry blocks
