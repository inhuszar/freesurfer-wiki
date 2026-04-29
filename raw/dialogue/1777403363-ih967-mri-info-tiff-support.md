---
type: dialogue-archive
unix_timestamp: 1777403363
username: "ih967"
date_utc: "2026-04-28T00:00:00Z"
question_slug: "mri-info-tiff-support"
question_summary: "Can mri_info read TIFF files? Which TIFF tags does it consult and how do those map to mri_info's output fields?"
answer_sources:
  - wiki: "[[mri_info]]"
  - code: "utils/mri_identify.cpp"
  - code: "utils/mriio.cpp"
  - code: "utils/imageio.cpp"
  - code: "utils/mri.cpp"
answer_status: final
update_count: 0
tags:
  - mri_info
  - tiff
  - file-formats
  - image-io
  - metadata
---

## Question

Can `mri_info` read TIFF files? If so, how does it derive the
information for each field in the output? Are there particular named
fields that it looks for in a TIFF header?

## Answer

Yes. Both `.tif` and `.tiff` are recognised in
`utils/mri_identify.cpp:186` (`string_to_type()`) and mapped to the
internal `IMAGE_FILE` type — the same generic-image bucket used for
JPEG, PGM, PPM, PBM, RGB, MAT, and SVS. When `mri_read()` encounters
that type at `utils/mriio.cpp:785`, it dispatches to `ImageRead()`
(`utils/imageio.cpp:459`), which switches on the extension a second
time and calls `TiffReadImage()` (`utils/imageio.cpp:762`). That
function returns a HIPS-style `IMAGE` struct, which `ImageToMRI()`
(`utils/mri.cpp:7157`) then converts into the `MRI` struct that
[[mri_info]] prints.

### TIFF tags actually read

In `TiffReadImage()` (and the parallel pre-pass in
`TiffReadDirectoryInfo()` for multi-page sizing), every read uses
`TIFFGetFieldDefaulted`, so missing tags fall back to libtiff's
defaults:

| TIFF tag | Use |
|---|---|
| `TIFFTAG_IMAGEWIDTH` | `width` (cols) |
| `TIFFTAG_IMAGELENGTH` | `height` (rows) |
| `TIFFTAG_SAMPLESPERPIXEL` | 1 = greyscale, 3 = RGB, 4 = RGBA (treated as RGB) |
| `TIFFTAG_BITSPERSAMPLE` | drives pixel format (8/16/32/64 bit) |
| `TIFFTAG_PHOTOMETRIC` | logged under `DIAG_VERBOSE_ON` only — not stored |
| `TIFFTAG_FILLORDER` | passed through; libtiff handles bit order |
| `TIFFTAG_COMPRESSION` | logged only |
| `TIFFTAG_RESOLUTIONUNIT` | selects inch / cm / none for converting xres/yres → mm |
| `TIFFTAG_XRESOLUTION` | x voxel size (mm). Default if absent: 0.1 (no-units) or 25.4 (inch) |
| `TIFFTAG_YRESOLUTION` | y voxel size (mm). Same defaults |
| `TIFFTAG_ORIENTATION` | controls only row-traversal direction during pixel read; **not** carried into the MRI's RAS matrix |
| `TIFFTAG_PLANARCONFIG` | per-page; `PLANARCONFIG_SEPARATE` is rejected as unsupported |
| `TIFFTAG_TILEWIDTH` / `TIFFTAG_TILELENGTH` | used by the tiled-strip pixel reader |
| `TIFFNumberOfDirectories(tif)` | number of pages → `mri->nframes` |

No other named fields are consulted: no MR-sequence tags, no GeoTIFF
tags, no parsing of `ImageDescription` or any custom/private tags.

### Mapping TIFF tags to `mri_info` output

In `ImageToMRI()` (`utils/mri.cpp:7198–7227`):

- `--ncols`, `--width` ← `TIFFTAG_IMAGEWIDTH`
- `--nrows`, `--height` ← `TIFFTAG_IMAGELENGTH`
- `--nslices`, `--depth` = **always 1** (TIFF is 2D; multi-page → frames, not slices)
- `--nframes` ← `TIFFNumberOfDirectories`
- `--type` ← derived from `BITSPERSAMPLE × SAMPLESPERPIXEL`:
  8-bit grey → `uchar`; 16-bit grey → `int` (PFSHORT is upcast to
  MRI_INT in `ImageToMRI`); 32-bit grey → `float`; 8-bit RGB(A) → RGB;
  64-bit and complex error out
- `--cres`/`--xsize` ← `100.0 / xres` (cm or none) or
  `10.0 * 2.54 / xres` (inch); see `utils/imageio.cpp:938–952`
- `--rres`/`--ysize` ← analogous from `YRESOLUTION`
- `--sres`/`--zsize` = **hard-coded 1.0**
  (`MRIsetResolution(mri, xsize, ysize, 1)`)
- `--vox2ras`, `--cdc`/`--rdc`/`--sdc`, `--orientation`, `--cras`,
  `--p0` ← all derived from a **fixed pseudo-coronal frame** that
  `ImageToMRI` writes unconditionally:
  - `x_r = -1, y_r = 0, z_r = 0`
  - `x_a = 0, y_a = 0, z_a = 1`
  - `x_s = 0, y_s = -1, z_s = 0`
  - `c_r = c_a = c_s = 0`
- `xstart/xend/ystart/yend/zstart/zend` ← computed as `±dim · size / 2`,
  not stored on disk
- `--tr`, `--te`, `--ti`, `--fa`, `--pedir`, etc. ← all 0/empty (TIFF
  carries no MR sequence info, and `ImageToMRI` never sets them)

### Caveats

- TIFF metadata controls only **dimensions, voxel size, bit depth, and
  frame count**. Anatomical orientation is fabricated; the printed
  orientation string reflects the hard-coded coronal frame, not the
  file. The RAS output of `mri_info` is meaningless for TIFFs.
- `TIFFTAG_ORIENTATION` is honoured only for pixel readout (so the
  image isn't displayed flipped); it is **not** propagated to direction
  cosines.
- Multi-page TIFFs become **frames**, not a 3D stack — so a stack of
  histology slices read this way still has `depth = 1` and
  `zsize = 1`. To assemble a 3D volume, write the data to NIfTI/MGZ
  with explicit z-spacing (e.g. via `mri_concat --combine` after a
  one-page-per-file conversion).
- 4-sample (RGBA) TIFFs are silently treated as 3-sample RGB; the
  alpha channel is dropped.
- `PHOTOMETRIC_MINISWHITE` is read but the pixels are **not** inverted
  on load — visually-black-is-high images will look inverted.
- `PLANARCONFIG_SEPARATE` (channels stored in separate planes) is
  rejected outright with `ERROR_UNSUPPORTED`.

## Sources Consulted

- [[mri_info]] — wiki page describes the flag set but doesn't enumerate
  TIFF specifically (it lists "any format recognised by FreeSurfer")
- `utils/mri_identify.cpp:186` — `.tif`/`.tiff` → `IMAGE_FILE`
- `utils/mriio.cpp:785` — `IMAGE_FILE` branch in `mri_read()` calls
  `ImageRead` then `ImageToMRI`
- `utils/imageio.cpp:459` — `ImageRead()` dispatches by extension
- `utils/imageio.cpp:762` — `TiffReadImage()` enumerates all TIFF tags
  consulted
- `utils/imageio.cpp:938-952` — resunit → mm conversion
- `utils/mri.cpp:7157-7227` — `ImageToMRI()` pixel-format mapping and
  the hard-coded coronal RAS frame

## Revision History

### Initial answer (1777403363)
Documented the full read path (`mri_identify` → `mri_read` →
`ImageRead` → `TiffReadImage` → `ImageToMRI`), enumerated the eleven
TIFFTAG fields consulted plus `TIFFNumberOfDirectories`, mapped each
to the corresponding `mri_info` output flag, and listed the practical
caveats (fabricated coronal RAS frame, depth always 1, RGBA→RGB,
PHOTOMETRIC_MINISWHITE not inverted, PLANARCONFIG_SEPARATE
unsupported).
