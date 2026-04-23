---
title: "MRISP spherical parameterization (.tif)"
type: format
fs_version: "8.2.0"
file_extensions: [".tif", ".tiff", ".mgz"]
produced_by:
  - "[[mris_make_template]]"
  - "[[mris_register]]"
  - "[[mrisp_write]]"
consumed_by:
  - "[[mris_register]]"
  - "[[mris_ca_train]]"
  - "[[mrisp_paint]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Multi-page TIFF endianness: libtiff handles this transparently but the on-disk byte order has not been verified against an actual file."
  - "The exact layout of per-surface frame indexing in mris_make_template's multiframe (vector) mode (atlas_size × IMAGES_PER_SURFACE) needs cross-checking with mris_make_template line ~139."
tags:
  - registration
  - atlas
  - sphere
  - parameterization
---

# MRISP — Surface Parameterization Image (`.tif`)

## Overview

A FreeSurfer **MRISP** file (typically `?h.<name>.tif`) stores a population
average of one or more scalar fields defined on the cortical sphere as a
multi-frame raster image. It is the on-disk representation of the
`MRI_SP` (`MRI_SURFACE_PARAMETERIZATION`) C struct declared in
`include/mrisurf.h`. Despite the `.tif` extension and full TIFF
compatibility, MRISP files are not arbitrary photographs — they are
projected representations of a scalar function on the unit sphere, sampled
on a uniform `(φ, θ)` Plate-Carrée grid, with multiple **frames** encoding
mean, variance, and degrees-of-freedom of each field across a training
population.

The default registration target used by [[mris_register]]
(`?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif` in
`$FREESURFER_HOME/average`) is an MRISP file in this format.

## File Extension(s)

The format is selected by the file extension at write time, not by content:

| Extension | Backend | Used in practice |
|-----------|---------|------------------|
| `.tif`, `.tiff` | libtiff (`TiffReadImage`/`TiffWriteImage` in `utils/imageio.cpp`) | The standard registration atlases shipped with FreeSurfer |
| `.mgz`, `.mgh`, `.nii` | `MRIread`/`MRIwrite` (each MRISP frame becomes an MRI z-slice) | Convenient for hand inspection in `freeview`; preserved by `MRISPread`/`MRISPwrite` |
| (anything else) | HIPS image format (`fread_header`/`fwrite_header` in `imageio.cpp`) | Legacy; rarely encountered |

The routing is implemented in `ImageUnpackFileName()`
(`utils/imageio.cpp:612`). On read, `MRISPread` first calls
`mri_identify(fname)`; if the file is MGH/MGZ or NIfTI, it is read as an
`MRI` and unpacked frame-by-frame into a freshly allocated `MRI_SP`
(`utils/mrisp.cpp:2126`). Otherwise control passes to the libtiff path.

> [!gotcha] The `.tif` is a real TIFF, not an opaque FreeSurfer container
> An MRISP `.tif` is a fully compliant multi-page DEFLATE-compressed
> grayscale TIFF. It can be opened in any TIFF reader (ImageJ, GIMP,
> Python's `tifffile`, etc.). What makes it a *FreeSurfer* file is the
> implicit interpretation of pixels as `(φ, θ)` samples and frames as
> `(mean, variance, dof)` triplets — see [Frame semantics](#frame-semantics)
> below.

## In-Memory Structure

```c
typedef struct {
  MRI_SURFACE *mris;    /* (optional) source surface — never written to disk */
  IMAGE       *Ip;      /* the image data: cols × rows × num_frame */
  float       sigma;    /* blurring scale (in-memory only) */
  float       radius;   /* (in-memory only) */
  float       scale;    /* spatial-resolution scale; 1.0 → 256×512 grid */
} MRI_SURFACE_PARAMETERIZATION, MRI_SP;
```

Only `Ip` is persisted to disk. The `scale`, `sigma`, `radius`, and
back-pointer to `mris` are in-memory bookkeeping fields and are
reconstructed on read (`scale = mri->width / DEFAULT_UDIM`).

## On-Disk Structure

When written through `MRISPwrite()` to a `.tif` file, the MRISP becomes a
**multi-page TIFF** with one TIFF directory (= "page" = "frame") per
`Ip->num_frame`. Each page has identical width, height, and sample format.

### Per-page TIFF tag set

Set in `TiffWriteImage()` (`utils/imageio.cpp:1397`):

| TIFF tag | Constant | Value written |
|----------|----------|---------------|
| `IMAGEWIDTH` (256) | — | `Ip->cols` (= `U_DIM`, default 256) |
| `IMAGELENGTH` (257) | — | `Ip->rows` (= `V_DIM`, default 512) |
| `BITSPERSAMPLE` (258) | — | 32 (for `PFFLOAT`) |
| `COMPRESSION` (259) | `COMPRESSION_DEFLATE` | zlib deflate |
| `PHOTOMETRIC` (262) | `PHOTOMETRIC_MINISBLACK` | single-channel grayscale, low = black |
| `ORIENTATION` (274) | `ORIENTATION_BOTLEFT` | row 0 at bottom, col 0 at LHS |
| `SAMPLESPERPIXEL` (277) | — | 1 |
| `XRESOLUTION` (282) | — | `2.54·10 / I->xsize` (only if `xsize ≠ 0`) |
| `YRESOLUTION` (283) | — | `2.54·10 / I->ysize` (only if `ysize ≠ 0`) |
| `RESOLUTIONUNIT` (296) | `RESUNIT_INCH` | inches |
| `PLANARCONFIG` (284) | `PLANARCONFIG_CONTIG` | interleaved (irrelevant for SAMPLESPERPIXEL=1) |
| `SAMPLEFORMAT` (339) | (see gotcha) | `SAMPLEFORMAT_INT` (bug — should be `IEEEFP`) |

Pixels are written one scan line at a time via `TIFFWriteScanline()`. After
each page, `TIFFWriteDirectory()` advances to the next directory.

> [!gotcha] SAMPLEFORMAT tag is mis-set for float frames
> `TiffWriteImage()` sets `TIFFTAG_SAMPLEFORMAT` twice (lines 1446 and
> 1452 of `utils/imageio.cpp`). The second `TIFFSetField` unconditionally
> writes `SAMPLEFORMAT_INT`, overriding the correct `SAMPLEFORMAT_IEEEFP`
> set on line 1446 for float pixels. As a result, MRISP `.tif` files are
> tagged on disk as **32-bit signed integer**, not IEEE float. FreeSurfer's
> own `TiffReadImage()` ignores `SAMPLEFORMAT` and reuses
> `BITSPERSAMPLE` to deduce `PFFLOAT` (lines 893–910), so the round-trip
> works internally. External readers that respect `SAMPLEFORMAT` (ImageJ,
> Python `tifffile`, `gdalinfo`) will reinterpret the float bit patterns
> as huge signed integers and the displayed values will be nonsensical.
> Workaround: tell the reader to ignore the tag and force float
> interpretation, e.g. `tifffile.imread(..., is_ome=False)` followed by
> `arr.view(np.float32)`.

### Pixel data type

For all standard MRISP files, `Ip->pixel_format = PFFLOAT` (32-bit IEEE
single precision), set by `MRISPalloc()` at line 1966 of
`utils/mrisp.cpp`. Each pixel is therefore exactly 4 bytes; the on-disk
storage size of one page is approximately
`cols · rows · 4` bytes before deflate compression.

### Default grid dimensions

`MRISPalloc(scale, nfuncs)` (`utils/mrisp.cpp:1954`) computes:

| Quantity | Formula | Default (`scale=1`) |
|----------|---------|---------------------|
| `u_dim` (cols) | `nint(scale · DEFAULT_UDIM)`, `DEFAULT_UDIM=256` | 256 |
| `v_dim` (rows) | `2 · u_dim` | 512 |
| `num_frame` | `nfuncs` (caller-supplied) | varies |

The `2:1` aspect ratio of the (u, v) grid reflects the φ ∈ [0, π],
θ ∈ [0, 2π] range of spherical coordinates — see below.

## Coordinate System

The MRISP image is the discretised representation of a scalar function
`f : S² → ℝ` on the unit sphere. Each pixel `(u, v)` corresponds to a
unique point `(φ, θ)` in spherical coordinates, where φ is the polar angle
from the +z axis and θ is the azimuthal angle in the xy plane.

### (x, y, z) ↔ (φ, θ) ↔ (u, v)

For a vertex at Cartesian position `(x, y, z)` on a sphere of radius `r`:

$$
\theta = \mathrm{atan2}(y, x), \quad \theta \in [0, 2\pi)
$$

$$
\phi = \mathrm{atan2}\!\left(\sqrt{r^{2} - z^{2}},\; z\right), \quad \phi \in [0, \pi]
$$

$$
u = \mathrm{nint}\!\left(\frac{U_{\text{dim}} \cdot \phi}{\pi}\right), \quad
v = \mathrm{nint}\!\left(\frac{V_{\text{dim}} \cdot \theta}{2\pi}\right)
$$

This is implemented in `MRIStoParameterization()`
(`utils/mrisp.cpp:122–146`). Note that:

- **u indexes φ (latitude).** `u = 0` is the north pole (`+z`),
  `u = U_DIM−1` is the south pole (`−z`).
- **v indexes θ (longitude).** `v = 0` is the +x axis,
  `v` increases towards +y (counter-clockwise viewed from +z).
- The grid is **uniform in (φ, θ)**, not in solid angle. This is a
  Plate-Carrée projection: pixels near the poles (`u ≈ 0` or `u ≈ U_DIM`)
  cover much smaller solid angles than equatorial pixels (`u ≈ U_DIM/2`).
  Statistical operations on the parameterization should therefore weight
  by `sin φ` if a uniform-on-sphere interpretation is required.

### Spherical topology of the (u, v) plane

The discrete grid is endowed with the topology of a sphere via the
following wrap-around rules (see `utils/mrisp.cpp:141–146` and
`MRISPtranslate()` at line 2007):

- **v** (longitude) wraps cyclically:
  `v += V_DIM` if `v < 0`; `v -= V_DIM` if `v ≥ V_DIM`.
- **u** (latitude) reflects at the poles:
  `u = -u` if `u < 0`; `u = U_DIM − (u − U_DIM + 1)` if `u ≥ U_DIM`.
  When a reflection happens at a pole, the antipodal v offset is added
  (`v += V_DIM/2`) — this is the antipodal pairing required for a
  consistent sphere-to-plane projection.

> [!gotcha] Polar pixels are over-sampled
> Because the grid spacing is uniform in `(φ, θ)`, the pixels on the rows
> nearest the poles correspond to a much smaller solid angle than equatorial
> pixels. A Gaussian smoothing of the parameterization image is therefore
> *not* a Gaussian smoothing on the sphere. FreeSurfer's `MRISPblur` and
> `MRISPconvolveGaussian` do correct for this; a user who reads the raw
> `.tif` and convolves it with a 2D kernel will obtain a result that is
> spatially distorted near the poles.

## Frame Semantics

The `num_frame` channels in the file are organised in **triplets** of
`(mean, variance, dof)`, one triplet per registered scalar field
("surface" in FreeSurfer's nomenclature). The slot offsets are defined in
`mris_make_template/mris_make_template.cpp`:

```c
#define IMAGES_PER_SURFACE  3                          /* mean, variance, dof */
#define SURFACES            (sizeof(curvature_names) / sizeof(curvature_names[0]))
#define PARAM_IMAGES        (IMAGES_PER_SURFACE * SURFACES)
```

For a given surface index `s ∈ [0, nsurfaces)`:

| Frame index | Content |
|-------------|---------|
| `3s + 0` | Population mean of feature `s` at each `(u, v)` pixel |
| `3s + 1` | Population variance of feature `s` |
| `3s + 2` | Effective degrees of freedom (number of training subjects whose vertex projected to this pixel) |

The default for `mris_register` and `mris_make_template` is
`SURFACES = 2` with feature names
`{"inflated.H", "sulc"}` (mean curvature of the inflated surface, then
sulcal depth) and surface vertex sources
`{"inflated", "smoothwm", "smoothwm"}` — six frames in total.

> [!gap] Frame ordering in vector / multiframe mode
> When `mris_make_template` is called with `-vector` (multiframe mode),
> the layout is `MRISPalloc(scale, atlas_size · IMAGES_PER_SURFACE)` and
> each user-defined field is placed in its own triplet at frame
> `parms.fields[n].frame · IMAGES_PER_SURFACE`. The exact mapping from
> field code (`OVERLAY_FRAME`, `DISTANCE_TRANSFORM_FRAME`, etc.) to
> in-file frame index needs cross-checking against
> `mris_make_template.cpp:391`.

### Online accumulation

Each new training subject is added to the running mean and variance
images by `MRISPcombine()` (`utils/mrisp.cpp:2050`):

$$
\mu_{\text{new}}(u, v) \;=\; \frac{\mu(u, v) \cdot d(u, v) + x(u, v)}{d(u, v) + 1}
$$

$$
\sigma^{2}_{\text{new}}(u, v) \;=\; \frac{\sigma^{2}(u, v) \cdot d(u, v) + (x(u, v) - \mu_{\text{new}}(u, v))^{2}}{d(u, v) + 1}
$$

$$
d_{\text{new}}(u, v) \;=\; d(u, v) + 1
$$

where `x` is the new subject's parameterization (frame `3s+0` only;
`MRISPcombine` writes back into the template). Variance is the
*biased* (1/n) estimate, not the unbiased (1/(n−1)) version.

## Construction Pipeline

A subject's spherical surface is converted to a parameterization by
`MRIStoParameterization()` (`utils/mrisp.cpp:93`), which performs three
passes:

1. **Vertex binning.** For each vertex, compute `(u, v)` from `(x, y, z)`
   and accumulate a count (`distances[u][v]++`) of how many vertices land
   in that pixel.
2. **Curvature accumulation.** For each vertex, add
   `vertex->curv / distances[u][v]` to the corresponding pixel.
   Pixels that received contributions from multiple vertices end up
   storing the unweighted mean.
3. **Soap-bubble fill.** Pixels with no vertex contribution
   (`filled[u][v] == UNFILLED_ELT`) are iteratively replaced by the mean
   of their 8-connected filled neighbours, respecting the spherical
   topology wrap. The loop continues until no unfilled pixels remain or
   the maximum pass count is reached.

For a single subject (the case in `mris_register` `-1` mode and in the
first call of `mris_make_template`), the variance frame is set to a
constant 1.0 by `MRISPsetFrameVal(mrisp_template, sno*3+1, 1.0)` in
`mris_register/mris_register.cpp:385` and the dof frame remains 0.
Subsequent subjects update both via `MRISPcombine`.

## Tools That Read/Write This Format

| Tool | R/W | Notes |
|------|-----|-------|
| [[mris_register]] | R | Reads the registration target via `MRISPread()` (`mris_register.cpp:447`). |
| [[mris_make_template]] | RW | The canonical producer; iterates over training subjects to build the population mean/variance/dof |
| [[mrisp_paint]] | R | Samples a `.tif` parameterization onto a target subject's sphere as a curvature overlay |
| [[mrisp_write]] | W | Computes a parameterization for a single subject and writes it as `.tif` (or `.mgh`) |
| [[mris_ca_train]] | R | Reads a registration template when training a [[gcsa-format|GCSA]] atlas |
| `freeview` | R | Will open the file as a multi-frame TIFF; pixels are interpreted as raw integers due to the SAMPLEFORMAT bug above |

## Conversion

- **MRISP `.tif` ↔ MRISP `.mgz`:** Round-trippable through
  `MRISPread`/`MRISPwrite`. The MGZ form preserves the same
  `(cols, rows, num_frame, float)` layout as a 3-D MRI volume of depth
  `num_frame`. Use `mri_convert` only on the MGZ form — applying it to
  a `.tif` would re-encode through libtiff and would not be meaningful.
- **MRISP frame → curvature overlay on a sphere:**
  `MRISfromParameterization(mrisp, mris, fno)` projects frame `fno` of
  the parameterization back onto the vertices of a target spherical
  surface using the inverse `(u, v) ← (φ, θ) ← (x, y, z)` map. This is
  what [[mrisp_paint]] exposes.
- **Manual inspection in Python:**
  ```python
  import tifffile, numpy as np
  raw = tifffile.imread("lh.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif")
  # raw.shape = (num_frame, rows, cols), dtype = int32 (due to SAMPLEFORMAT bug)
  flt = raw.view(np.float32)   # reinterpret bit pattern as IEEE float
  mean_field0 = flt[0]          # frame 0 of surface 0
  var_field0  = flt[1]
  dof_field0  = flt[2]
  ```

## Gotchas

> [!gotcha] Multi-frame MGZ vs. multi-frame TIFF give different on-disk shapes
> `MRISPwrite(..., "x.mgz")` allocates `MRIalloc(cols, rows, num_frame, MRI_FLOAT)`
> — so the MGZ form has the parameterization's frame index along the **z
> (slice) axis**, not the t (frame) axis. Reading the MGZ back into an
> `MRI` and asking for `mri->nframes` will report 1; the parameterization
> frames are at `mri->depth`. `MRISPread` accounts for this on the read
> side (`utils/mrisp.cpp:2144`: `ImageAlloc(mri->height, mri->width, PFFLOAT, mri->depth)`).
> External tools that round-trip a parameterization through `mri_convert`
> may unintentionally reorder these axes.

> [!gotcha] Variance frame is biased, not unbiased
> `MRISPcombine` divides by `dof + 1`, not `dof`, when updating the
> variance. The result is the maximum-likelihood (1/n) estimate, not
> Bessel-corrected. Statistical tests that assume the variance frame is
> an unbiased sample variance need to multiply by `dof / (dof - 1)`
> first.

> [!gotcha] Single-subject parameterizations have variance ≡ 1
> When `mris_register -1` (single-subject target) is used, the target
> parameterization is built by `MRIStoParameterization` and the variance
> frame is filled with the constant 1.0 (`mris_register.cpp:385`).
> The correlation cost in the registration energy then reduces to plain
> sum-of-squares against the target mean image. This is intentional but
> easy to overlook when interpreting the registration log.

> [!gotcha] `scale` is reconstructed from `cols / DEFAULT_UDIM` on read
> `MRI_SP::scale` is not stored in the TIFF tags. On read, `MRISPread`
> sets `mrisp->scale = (float)mri->width / DEFAULT_UDIM` (line 2145 for
> the MGZ branch; the TIFF branch leaves `scale` at zero unless
> recomputed by the caller). Tools that depend on `mrisp->scale` for
> spatial interpretation should reset it themselves.

> [!gotcha] Polar pixels are repeatedly assigned by many vertices
> Because the (u, v) grid concentrates mass near the poles, every
> vertex within a small Euclidean neighbourhood of `±z` lands on the
> same handful of pixels. This makes `distances[u][v]` (the per-pixel
> contribution count) heavily skewed at the poles, and the resulting
> per-pixel mean is computed over a non-representative sample. The
> `(scale, sigma)` smoothing partially compensates for this. For
> per-vertex statistics (e.g., training a downstream model on the raw
> pixel values), users should mask out the polar bands.

## References

- Fischl, B., Sereno, M.I., Tootell, R.B.H., & Dale, A.M. (1999).
  *High-resolution intersubject averaging and a coordinate system for
  the cortical surface.* Human Brain Mapping, 8(4): 272–284.
  (Defines the spherical parameterization framework.)
- Source: `utils/mrisp.cpp` (parameterization core, 2300+ lines),
  `utils/imageio.cpp` (TIFF / HIPS / MGH backends),
  `include/mrisurf.h` lines 211–239 (MRI_SP / MRISP macros),
  `mris_make_template/mris_make_template.cpp` (canonical producer).
- Related wiki pages: [[mris_register]], [[mris_ca_label]],
  [[surface-representations]], [[coordinate-systems]],
  [[gcsa-format]] for the companion classifier-atlas format.
