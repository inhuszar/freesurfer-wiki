---
title: "internal-mri-io"
type: internal
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "utils/mriio.cpp"
  - "utils/mri_identify.cpp"
  - "utils/DICOMRead.cpp"
  - "utils/fstagsio.cpp"
  - "packages/nifti/znzlib.c"
related:
  - "[[mgz]]"
  - "[[nifti]]"
  - "[[internal-mri]]"
  - "[[coordinate-systems]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
  - "[[internal-matrix]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "Per-format readers other than MGH/MGZ, NIfTI, and DICOM (MINC, AFNI BRIK, GE/Siemens proprietary, bshort/bfloat, NRRD) are named and routed but not traced internally."
  - "The full FStagsIO byte layout for each TAG is in utils/fstagsio.cpp and on the mgz format page; only the dispatch and the load-bearing TAGs are documented here."
tags:
  - internal
  - io
  - formats
  - volume
---

# internal-mri-io

## Summary

Volume I/O is the layer that turns the dozens of on-disk volume formats
FreeSurfer understands into a single in-memory [[internal-mri|MRI]] structure,
and writes that structure back out. It is the most-traversed code in the
suite: every `mri_*` tool, `recon-all`, and FreeView reaches a volume on disk
through it. The public entry points are `MRIread`, `MRIreadType`, and
`MRIwrite` in `utils/mriio.cpp`; format **detection** lives in
`utils/mri_identify.cpp`. The design is a single dispatch hub: detect the
format (by filename extension first, then by magic-number/content probing),
map it to an integer **type code** (`MRI_*_FILE`), and route to a
per-format reader or writer. A developer should come here to learn the
dispatch architecture, the MGH/MGZ reader-writer (FreeSurfer's native format),
the NIfTI reader-writer (the dominant interchange format, with the
sform-over-qform rule), how geometry is populated into the MRI struct, and
the TAG mechanism that carries FreeSurfer-specific metadata across reads and
writes.

The byte layouts of the formats themselves are documented on the format pages
([[mgz]], [[nifti]]); this page documents the **reader/writer behaviour** —
the dispatch, the geometry rules, the invariants — not the header layouts.

## Source Layout

| File | Lines | Contains |
|------|-------|----------|
| `utils/mriio.cpp` | ~12,900 | the dispatch hub (`MRIread`/`MRIreadType`/`MRIwrite`/`MRIwriteType`), the MGH/MGZ reader-writer (`mghRead`/`mghWrite`), the NIfTI readers-writers (`nifti1Read`/`niiRead`/`nifti1Write`/`niiWrite`), the geometry↔header converters, and the TAG footer reader-writer (`MRITAGread`/`MRITAGwrite`) |
| `utils/mri_identify.cpp` | ~1,200 | format detection: `mri_identify`, `string_to_type`, `type_to_string`, and the `is_*` magic-number probes |
| `utils/DICOMRead.cpp` | ~6,400 | DICOM readers (`DICOMRead`, `DICOMRead2`, `DICOMRead3`); the default path wraps `dcm2niix` |
| `utils/fstagsio.cpp` | — | `FStagsIO` class: the on-disk byte layout of each TAG, used by both MGZ and the NIfTI FreeSurfer header extension |
| `packages/nifti/znzlib.c` | — | `znzFile` abstraction: one I/O interface over raw `fopen` and zlib `gzopen` (gzip), used by both MGZ and `.nii[.gz]` |
| `include/mri.h` | — | the `MRI_*_FILE` type-code constants ([`include/mri.h:1516-1553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L1516-L1553)) and the MGH version/intent macros |
| `include/tags.h` | — | the `TAG_*` identifier constants |

## Core Data Structures

### The format type code (`MRI_*_FILE`)

Every supported format is identified internally by a small integer constant,
defined together in [`include/mri.h:1516-1553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L1516-L1553).
These are the lingua franca between detection (`mri_identify` returns one)
and dispatch (`mri_read`/`MRIwriteType` switch on one). The sentinel values
are `MRI_VOLUME_TYPE_UNKNOWN` (`-1`) and `MRI_GZIPPED` (`-2`, an intermediate
result from `string_to_type` meaning "the extension was `.gz`; look deeper").

The supported volume formats, their type code, the reader and writer they
dispatch to, and the recognised extension(s):

| Format | Type code | Reader | Writer | Extension(s) / detection |
|--------|-----------|--------|--------|--------------------------|
| **MGH/MGZ** (native) | `MRI_MGH_FILE` | `mghRead` | `mghWrite` | `.mgh`, `.mgz`, `.mgh.gz` |
| **NIfTI-1 single-file** | `NII_FILE` | `niiRead` | `niiWrite` | `.nii`, `.nii.gz` |
| **NIfTI-1 `.hdr`/`.img` pair** | `NIFTI1_FILE` | `nifti1Read` | `nifti1Write` | `.img`/`.hdr` with NIfTI magic at byte 344 |
| **ANALYZE 7.5** | `MRI_ANALYZE_FILE` / `MRI_ANALYZE4D_FILE` | `analyzeRead` | `analyzeWrite` / `analyzeWrite4D` | `.img`/`.hdr` (no NIfTI magic) |
| **MINC** | `MRI_MINC_FILE` | `mincRead` | `mincWrite` | `.mnc`, `.minc`, magic `CDF` |
| **AFNI BRIK** | `BRIK_FILE` | `afniRead` | `afniWrite` | `.brik`/`.afni` |
| **NRRD** | `NRRD_FILE` | `mriNrrdRead` | `mriNrrdWrite` | `.nrrd`, magic `NRRD` |
| **bshort / bfloat** | `BSHORT_FILE` / `BFLOAT_FILE` | `bvolumeRead` | `bvolumeWrite` | `.bshort` / `.bfloat` |
| **bhdr** (bvolume header) | `BHDR` | `bvolumeRead` | `bvolumeWrite` | `.bhdr` |
| **GE Genesis / Signa / LX** | `GENESIS_FILE` / `SIGNA_FILE` / `GE_LX_FILE` | `genesisRead` / `signaRead` / `gelxRead` | — (write unsupported) | `GE_MAGIC` (`"IMGF"`) probes |
| **Siemens IMA** | `SIEMENS_FILE` | `siemensRead` | — | `.ima`, content probe |
| **DICOM** | `DICOM_FILE` | `DICOMRead3`→`niiReadFromMriFsStruct` (default) | — | DICOM magic; see [DICOM](#dicom) |
| **Siemens DICOM** | `SIEMENS_DICOM_FILE` | `DICOMRead3` (default) / `sdcmLoadVolume` | — | Siemens DICOM probe |
| **Bruker** | `BRUKER_FILE` | `brukerRead` | — | directory-structure probe |
| **GE XIMG** | `XIMG_FILE` | `ximgRead` | — | `.ximg` |
| **Varian/SDT** | `SDT_FILE` | `sdtRead` | — | `.sdt`/`.spr` |
| **GDF** | `GDF_FILE` | `gdfRead` | `gdfWrite` | `.gdf` |
| **COR** (legacy slice dir) | `MRI_CORONAL_SLICE_DIRECTORY` | `corRead` | `corWrite` | a directory named `COR-*` |
| **2-D image** (jpg/tif/…) | `IMAGE_FILE` | `ImageRead`→`ImageToMRI` | `MRItoImage`→`ImageWrite` | `.jpg`, `.tif`, `.mat`, `.rgb`, … |
| **NumPy** | `NPY_FILE` | `fscnpy::npy2mri` | — | `.npy` |
| **GCA atlas** (as MRI) | `MRI_GCA_FILE` | `readGCA` | — | `.gca` |
| **surface curv as MRI** | `MRI_CURV_FILE` | `MRISreadCurvAsMRI` | (via `.mgz`) | first 4 bytes = curv magic |
| **GIFTI func as MRI** | `GIFTI_FILE` | `MRISreadGiftiAsMRI` | `mriWriteGifti` | `.gii` |
| **m3z/m3d morph** | `MGH_MORPH` | `GCAMread`→`GCAMwriteWarpToMRI` | `GCAMwrite` | `.m3z`, `.m3d` |
| **ITK warp** | `ITK_MORPH` | (read via niiRead) | `itkMorphWrite` | ANTs-style warp NIfTI |

The extension→type mapping is the `string_to_type` table at
[`utils/mri_identify.cpp:146-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L146-L198);
the inverse (used by tools that print a type name) is `type_to_string` at
[`utils/mri_identify.cpp:47-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L47-L144).

> [!gotcha] `.img`/`.hdr` is overloaded between ANALYZE and NIfTI
> Both ANALYZE 7.5 and NIfTI-1 use a `.img`/`.hdr` pair, so the extension is
> ambiguous. Detection resolves this by content: when the extension says
> ANALYZE, `mri_identify` calls `is_nifti1()` **first** and returns
> `NIFTI1_FILE` if the NIfTI magic is present at byte 344, only falling back
> to ANALYZE otherwise ([`utils/mri_identify.cpp:288-293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L288-L293)).

## Capabilities

### Format detection — `mri_identify`

`mri_identify` ([`utils/mri_identify.cpp:201-386`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L201-L386))
is the detector. Its strategy is **extension-first, content-second**:

1. **Directory check.** If the path is a directory, fall straight through to
   the content probes (this is how the legacy `COR-*` slice directory and
   Bruker scans are recognised).
2. **Extension lookup.** Take the substring after the last `.` and pass it
   to `string_to_type` ([line 219](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L219)).
   - A `.gz` extension yields the intermediate `MRI_GZIPPED`; the code then
     special-cases the two-part extensions `.mgh.gz`→`MRI_MGH_FILE` and
     `.nii.gz`→`NII_FILE` ([lines 221-234](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L221-L234)).
     Any other gzipped file is rejected as unknown — **FreeSurfer only
     gzip-wraps MGH and NIfTI.**
3. **Extension trust vs. verify.** A few types are trusted on extension alone
   and returned immediately: `IMAGE_FILE`, `NPY_FILE`, and crucially
   `MRI_MGH_FILE` ([line 239](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L239)).
   For most others, the matched type is **verified** by calling the
   corresponding `is_*` probe (e.g. `is_nii`, `is_nifti1`, `is_mnc`,
   `is_genesis`) before being accepted ([lines 241-331](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L241-L331)).
4. **Content fallback sweep.** If the extension was absent, unknown, or
   failed verification, the function runs every `is_*` probe in a fixed
   priority order ([lines 338-385](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mri_identify.cpp#L338-L385)),
   reading magic numbers from the file: Bruker, COR, bshort/bfloat,
   Siemens-DICOM, DICOM, Genesis, NRRD, curv, Signa, GE-LX, SDT, MINC,
   NIfTI-1, NII, ANALYZE, Siemens, BRIK, OTL, GDF, XIMG. Order matters —
   `is_nifti1` is tested **before** `is_analyze` because the two share a
   header footprint.

The same magic constants used by the probes are declared in
[`include/mri_identify.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri_identify.h)
(`GE_MAGIC`, `NIFTI1_MAGIC`, `NII_MAGIC`, `NRRD_MAGIC`).

### Reading — `MRIread` / `MRIreadType`

Public read entry points all funnel into the static `mri_read(fname, type,
read_volume, start_frame, end_frame, …)` helper:

- **`MRIread`** ([`utils/mriio.cpp:1002-1028`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L1002-L1028))
  is the everyday call. It expands shell wildcards, passes
  `MRI_VOLUME_TYPE_UNKNOWN` so the type is auto-detected, reads all frames,
  and finishes by scrubbing NaNs (`MRIremoveNaNs`).
- **`MRIreadType`** ([`utils/mriio.cpp:990-1000`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L990-L1000))
  is the same but with a **caller-supplied** type code, bypassing detection.
- **`MRIreadHeader`** / **`MRIreadInfo`** read with `read_volume = FALSE`:
  header and geometry only, no voxel data — this is what `mri_info` uses.

Inside `mri_read`, the type is resolved (an explicit `@type` suffix on the
filename overrides; otherwise `mri_identify` is called,
[lines 541-554](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L541-L554)),
a `#start:end` frame spec is parsed, and then a long `if/else if` ladder on
the type code calls the matching reader
([lines 607-809](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L607-L809)).
Regardless of format, after the reader returns the hub **caches the
voxel↔RAS transforms** on the struct: it rebuilds `mri->i_to_r__` and
`mri->r_to_i__` via `extract_i_to_r`/`extract_r_to_i`
([lines 814-825](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L814-L825)),
so every reader can populate geometry fields and trust the affine to be
derived centrally.

### Writing — `MRIwrite` / `MRIwriteType`

- **`MRIwrite`** ([`utils/mriio.cpp:1309-1360`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L1309-L1360))
  determines the output format **from the output filename's extension** by
  calling `mri_identify(fname)` ([line 1315](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L1315)),
  then delegates to `MRIwriteType`. This is why conversion is implicit:
  `MRIwrite(mri, "out.nii.gz")` writes NIfTI and `MRIwrite(mri, "out.mgz")`
  writes MGZ from the same in-memory struct.
- **`MRIwriteType`** ([`utils/mriio.cpp:1109-1295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L1109-L1295))
  is the write dispatch ladder. It guards against writing onto an existing
  directory, then switches on the type code to the matching writer. Many
  proprietary scanner formats (`GENESIS`, `GE_LX`, `SIEMENS`, `DICOM`,
  `XIMG`, `RAW`, …) are **read-only**: their write branch returns
  `ERROR_BADPARM` with a "not supported" message
  ([lines 1217-1260](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L1217-L1260)).
- **DWI sidecars.** After a successful write, if the struct carries b-values
  (`mri->bvals != NULL`), `MRIwriteType` writes `<stem>.bvals` and a
  `.bvecs` file (named for the b-vector space — scanner/voxel/unknown)
  alongside the volume ([lines 1271-1291](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L1271-L1291)).

## Algorithms and Mathematical Foundations

### The MGH/MGZ path

`mghRead` / `mghWrite` ([`utils/mriio.cpp:10874`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10874)
and [`:11247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11247))
implement FreeSurfer's native format. The byte layout is on the [[mgz]]
page; the reader/writer behaviour is:

- **Single file, gzip by extension.** `.mgz` and `.mgh.gz` set
  `gzipped = 1`; `.mgh` is uncompressed. The file is opened through
  `znzopen(fname, "rb", gzipped)` — the same `znzFile` interface handles both
  ([read: lines 10889-10904](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10889-L10904);
  write: [11264-11278](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11264-L11278)).
  Any other extension is rejected.
- **Fixed header.** The header is read field-by-field big-endian:
  `version`, `width`, `height`, `depth`, `nframes`, `type`, `dof`, then a
  `short` **`good_ras_flag`** ([lines 10926-10938](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10926-L10938)).
  The header occupies `UNUSED_SPACE_SIZE = 256` bytes; the geometry block is
  `USED_SPACE_SIZE = 3*sizeof(float) + 4*3*sizeof(float)` bytes
  ([defs at lines 10868-10869](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10868-L10869)).
- **Version / intent field.** The 32-bit `version` is overloaded:
  `MGH_VERSION` is `1` ([`include/mri.h:672`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L672)),
  and the upper bits carry an **intent** code — on read
  `mri->intent = (version >> 8) & 0xffff` ([line 10972](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10972));
  on write `version = ((intent & 0xffff) << 8) | MGH_VERSION` when an intent
  is supplied ([line 11303](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11303)).
  The intent values (`MGZ_INTENT_SHAPE`, `MGZ_INTENT_WARPMAP`, …) are at
  [`include/mri.h:677-682`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mri.h#L677-L682)
  and let a single MGZ carry a curv overlay, a warp field, etc.
- **Geometry on read** (see [Geometry](#geometry-on-read-and-write)): only
  read when `good_ras_flag > 0`.
- **Scan-parameter footer.** Immediately after the voxel data, five floats —
  `tr`, `flip_angle`, `te`, `ti`, `fov` — are written/read
  ([read: 11211-11223](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11211-L11223);
  write: [11498-11502](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11498-L11502)).
- **TAG footer.** After the scan parameters, `mghRead` calls `MRITAGread` and
  `mghWrite` calls `MRITAGwrite` ([lines 11226](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11226)
  and [11512](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11512)) —
  see [The TAG mechanism](#the-tag-mechanism).

### The NIfTI path

Two reader/writer pairs exist: `nifti1Read`/`nifti1Write` for the legacy
two-file `.hdr`/`.img` pair, and `niiRead`/`niiWrite` for the single-file
`.nii`/`.nii.gz`. They share the header logic; the field-by-field NIfTI
header spec is on the [[nifti]] page. The load-bearing behaviour:

**sform is preferred over qform.** When reading, the vox2ras transform is
selected in this priority ([`utils/mriio.cpp:7870-7906`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7870-L7906)):

```
if (hdr.sform_code != 0)        use sform  (niftiSformToMri)   // preferred
else if (hdr.qform_code != 0)   use qform  (niftiQformToMri)
else                            warn; assume LIA-ish default; ras_good_flag = 0
```

The comment at the site states the rationale: *"Using the sform first makes
it more compatible with FSL."* When either is used, `mri->ras_good_flag` is
set to 1; when neither is valid, the reader emits
`WARNING: neither NIfTI-1 qform or sform are valid` and installs a default
orientation with `ras_good_flag = 0`
([lines 7889-7905](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7889-L7905)).

- `niftiSformToMri` ([`:10107-10144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10107-L10144))
  loads the affine straight from the `srow_x/y/z` rows into a 4×4 and calls
  `MRIsetVox2RASFromMatrix` — the sform **is** the vox2ras.
- `niftiQformToMri` ([`:10146-10223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10146-L10223))
  reconstructs the rotation from the quaternion (`quatern_b/c/d`, with the
  `pixdim[0] < 0` left-handedness flip) and derives `c_ras` from
  `qoffset_*`.

**Units rescale.** NIfTI records spatial/temporal units in `xyzt_units`;
FreeSurfer works in **mm and ms**. After the transform is set, the voxel
sizes and `c_ras` are multiplied by `space_units_factor` (metre→1000,
mm→1, micron→0.001) and `tr` by `time_units_factor`
([`:7908-7915`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7908-L7915);
factors derived at [7743-7769](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7743-L7769)).

**Data scaling.** If `scl_slope` is set (and not the identity 1/0), voxels are
rescaled on read as `value = scl_slope * raw + scl_inter` and promoted to
`MRI_FLOAT` ([gate at 7788](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7788),
applied e.g. at [7968](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7968)).

**Writing** sets **both** sform and qform: `mriToNiftiQform` then
`mriToNiftiSform` ([`:8297-8302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L8297-L8302)
for `nifti1Write`; equivalent in `niiWrite`). `mriToNiftiSform`
([`:10229-10242`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10229-L10242))
simply copies `MRIxfmCRS2XYZ(mri,0)` — the MRI vox2ras — into `srow_*` and
sets `sform_code = NIFTI_XFORM_SCANNER_ANAT`. The output declares
`xyzt_units = NIFTI_UNITS_MM | NIFTI_UNITS_SEC` ([line 8290](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L8290)).

> [!internal] vox2ras construction lives elsewhere
> The actual `MRIxfmCRS2XYZ` / `extract_i_to_r` affine construction and the
> direction-cosine ↔ matrix decomposition (`MRIsetVox2RASFromMatrix`,
> `MRIp0ToCRAS`) are MRI-struct geometry methods in `utils/mri.cpp`; see
> [[coordinate-systems]] and [[internal-matrix]]. This page documents only how
> the I/O layer feeds them.

### The TAG mechanism

FreeSurfer-specific metadata that has no home in a generic volume header is
appended as a **TAG footer**, written by `MRITAGwrite`
([`utils/mriio.cpp:12421-12534`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L12421-L12534))
and read by `MRITAGread`
([`:12203-…`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L12203)).
Each TAG is an identifier (`TAG_*`, [`include/tags.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/tags.h))
followed, for variable-length tags, by an 8-byte length and the payload; the
byte-level encoding is centralised in the `FStagsIO` class
(`utils/fstagsio.cpp`). The load-bearing TAGs:

| TAG | Carries | Read handling |
|-----|---------|---------------|
| `TAG_MGH_XFORM` (31) | path to the Talairach transform (`talairach.xfm`) | On read the path is **resolved relative to the volume**: it first tries `<dir>/transforms/talairach.xfm`, then the stored path, and if the file exists actually loads it via `input_transform_file`, populating `mri->transform` / `linear_transform` ([lines 12277-12311](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L12277-L12311)) |
| `TAG_OLD_COLORTABLE` (1) | embedded color lookup table | `mri->ct = fstagsio.read_old_colortable()` ([12272-12275](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L12272-L12275)) — lets a segmentation volume carry its own LUT |
| `TAG_CMDLINE` (3) | one entry per generating command line | accumulated into `mri->cmdlines[]` — the provenance trail `mri_info --cmdline` prints |
| `TAG_AUTO_ALIGN` (33) | a 4×4 auto-alignment matrix | `mri->AutoAlign` |
| `TAG_ORIG_RAS2VOX` (44) | original ras2vox (from `mri_convert -so`) | `mri->origRas2Vox` |
| `TAG_PEDIR` (41) | phase-encode direction string | `mri->pedir` |
| `TAG_FIELDSTRENGTH` (43) | scanner field strength (native endian) | `mri->FieldStrength` |
| `TAG_MRI_FRAME` (42) | per-frame metadata (labels, thresholds, DTI) | written when `nframes > 1` or frame 0 is labelled |
| `TAG_GCAMORPH_*` (10–15) | warp-field geometry/affine/labels | only for `MGZ_INTENT_WARPMAP` volumes |

> [!gotcha] The Talairach TAG stores a path, not the transform
> `TAG_MGH_XFORM` embeds the *filename* of the Talairach transform, not its
> matrix. On read the path is re-resolved against the volume's own
> `transforms/` directory and the `.xfm` is loaded from disk — so a volume
> moved away from its subject tree may print the tag but fail to load the
> transform.

## Invariants, Conventions, and Memory Model

- **Byte order.** MGH/MGZ is **big-endian on disk**. The `znzread*Int/Short/
  Float` helpers and the `orderIntBytes`/`orderShortBytes` macros
  ([`include/machine.h:47-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/machine.h#L47-L60))
  byte-swap only when `BYTE_ORDER == LITTLE_ENDIAN`, so on a little-endian
  host (the norm) MGH bytes are swapped on every read and write; on a
  big-endian host they pass through. NIfTI records its own endianness; the
  reader sets a `swapped_flag` and swaps voxel buffers accordingly
  (e.g. [`:7942-7945`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7942-L7945)).
- **`.mgz` vs `.mgh`.** Identical byte layout; the **only** difference is the
  gzip wrapper, selected purely from the extension at open time in both
  `mghRead` and `mghWrite`. There is no compressed/uncompressed flag inside
  the file.
- **gzip is one mechanism.** `znzopen(path, mode, use_compression)`
  ([`packages/nifti/znzlib.c:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/znzlib.c#L51))
  routes to zlib's `gzopen` when `use_compression != 0`, else raw `fopen`.
  The same call backs `.mgz`/`.mgh.gz` and `.nii.gz`. A gzipped stream cannot
  `seek`, so `mghRead` reads forward in a loop instead of seeking when
  `gzipped` ([lines 10976-10985](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L10976-L10985)).
- **`ras_good_flag` is the geometry validity bit.** A reader sets
  `mri->ras_good_flag = 1` only when it found real orientation information
  (MGH `good_ras_flag > 0`; NIfTI sform or qform present). Downstream code
  treats geometry as untrustworthy when it is 0.
- **Detection has no side effects on a missing transform.** `mri_identify`
  reads at most a few header bytes; it never opens the voxel data.
- **Ownership.** Readers allocate and return a heap `MRI*` (`MRIalloc*`); the
  caller owns it and frees with `MRIfree`. `read_volume = FALSE` returns a
  header-only struct (`MRIallocHeader`) with no voxel buffer.

## Consumers

Effectively the entire suite. Direct callers of `MRIread`/`MRIwrite` include:

- [[wiki/tools/mri_convert|mri_convert]] — the canonical format-conversion
  tool; its `--in_type`/`--out_type` map to `MRIreadType`/the write type code.
- [[mri_info]] — uses the header-only path (`MRIreadHeader`) and prints the
  fields and TAGs this layer populated.
- [[mri_vol2vol]], [[mri_concat]], [[mri_mask]], and every other `mri_*`
  volume tool.
- `recon-all` indirectly, through those tools.

The "blast radius" of a change here is the whole suite: a regression in
geometry population or TAG handling silently corrupts orientation or drops
provenance for every tool that touches a volume.

## Related Internals

- [[internal-matrix]] — the `MATRIX` type used for every vox2ras/sform affine
  this layer builds and decomposes.
- [[coordinate-systems]] — the meaning of direction cosines, `c_ras`, and the
  vox2ras the readers populate.

## Gotchas and Sharp Edges

> [!gotcha] Output format is decided by the filename, silently
> `MRIwrite` infers the format from the output **extension** via
> `mri_identify`. `mri_convert in.mgz out.nii.gz` converts to NIfTI with no
> flag; a typo in the extension silently changes the format (or fails as
> "unknown file type").

> [!contradiction] Modern `.nii` writing DOES embed FreeSurfer TAGs
> The [[nifti]] format page states that MGZ→NIfTI *"discards FreeSurfer-specific
> header tags"* and lists no FreeSurfer header extension. That is true for the
> **legacy `.img`/`.hdr` writer** (`nifti1Write` writes no extension), but the
> **single-file `niiWrite`** in 8.2.0 *does* write a NIfTI header extension
> with `ecode = NIFTI_ECODE_FREESURFER` (14,
> [`packages/nifti/nifti1_io.h:343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/nifti1_io.h#L343))
> carrying the MGZ TAGs — it calls `__getMRITAGlength`, sets `extender[0]=1`,
> and writes `MRITAGwrite(mri, fp, niftiheaderext=true)`
> ([`utils/mriio.cpp:9682-9758`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L9682-L9758)).
> `niiRead` reads this extension back and merges its `TAG_RAS_XFORM` —
> **but only if it agrees with the sform/qform within a threshold**; on
> disagreement the sform/qform wins and the tag is ignored with a warning
> ([`:8604-8666`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L8604-L8666)).
> Net effect: a FreeSurfer→FreeSurfer round-trip through `.nii.gz` preserves
> far more than a round-trip through the `.img`/`.hdr` pair, and more than the
> format page implies. Non-FreeSurfer NIfTI readers ignore the extension, so
> from their perspective the tags are still "invisible" — which is why the
> format page's user-facing framing remains reasonable. Code is authoritative.

> [!gotcha] `flip_angle` is a `double` written as `float`
> In both the MGH footer and the NIfTI extension, `mri->flip_angle` (a
> `double`) is read/written through `float` helpers, losing precision. The
> source flags this itself ([line 11499](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11499)).

> [!gotcha] Default orientation is silent at normal verbosity
> When MGH geometry is absent (`good_ras_flag <= 0`), `mghRead` falls back to
> the CORONAL direction cosines via `setDirectionCosine(mri, MRI_CORONAL)`,
> but the explanatory warning is gated behind `DIAG_VERBOSE_ON`
> ([lines 11199-11209](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L11199-L11209)),
> so by default a geometry-less volume is conformed to coronal without an
> on-screen notice (though `ras_good_flag` stays 0).

## DICOM

DICOM input is delegated to `utils/DICOMRead.cpp`. The dispatch in `mri_read`
chooses between three implementations based on global flags
([`utils/mriio.cpp:708-765`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L708-L765)):

- **`DICOMRead3` (default).** `UseDCM2NIIX` defaults to `1` (set 2023-04-06,
  [`include/DICOMRead.h:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/DICOMRead.h#L67)),
  so the modern path wraps **dcm2niix** (`dcm2niix_fswrapper`,
  [`utils/DICOMRead.cpp:6059`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L6059)).
  It converts the DICOM series to an in-memory NIfTI-like `MRIFSSTRUCT`, then
  builds the `MRI` with `niiReadFromMriFsStruct` — so DICOM geometry follows
  the same sform/qform logic as the NIfTI path.
- **`sdcmLoadVolume`** — the legacy Siemens DICOM reader (used when
  `UseDCM2NIIX` is off and the file is Siemens DICOM).
- **`DICOMRead` / `DICOMRead2`** — older generic readers.

DICOM is **read-only**; `MRIwriteType`'s DICOM branch returns "not supported".
A fuller treatment belongs on a dedicated DICOM page; the relevant fact here
is that the default path produces a volume indistinguishable from a NIfTI read.

## Confidence and Gaps

Confidence is **high** for the dispatch architecture, the MGH/MGZ and NIfTI
reader/writer behaviour, the geometry rules, and the TAG mechanism — all read
directly from the 8.2.0 source.

> [!gap] Per-format internals beyond MGH/MGZ, NIfTI, DICOM
> The MINC, AFNI BRIK, GE/Siemens proprietary, bshort/bfloat, and NRRD readers
> are routed and named here but their internal parsing was not traced. A
> developer adding or debugging one of those should read its reader function
> directly (all in `utils/mriio.cpp` except the GE/Siemens probes).

> [!gap] Full TAG byte layouts
> The exact on-disk encoding of each TAG (lengths, padding, endianness per
> field) is implemented in `utils/fstagsio.cpp` (`FStagsIO`) and tabulated on
> the [[mgz]] page; only the dispatch and semantics are covered here.

## References

- [[mgz]] — MGH/MGZ byte layout, version/intent encoding, TAG footer table.
- [[nifti]] — NIfTI-1/-2 header field spec, qform/sform methods, datatype and
  intent codes.
- [[coordinate-systems]] — direction cosines, `c_ras`, vox2ras conventions.
- FreeSurfer source: `utils/mriio.cpp`, `utils/mri_identify.cpp`,
  `utils/DICOMRead.cpp`, `utils/fstagsio.cpp`, `packages/nifti/znzlib.c`
  (all at tag `v8.2.0`).
