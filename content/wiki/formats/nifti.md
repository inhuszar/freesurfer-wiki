---
title: "NIfTI-1 / NIfTI-2 (.nii, .nii.gz)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".nii"
  - ".nii.gz"
  - ".hdr/.img"
produced_by:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_vol2vol]]"
  - "[[mri_concat]]"
consumed_by:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
  - "[[bbregister]]"
  - "[[recon-all-clinical.sh]]"
related:
  - "[[mgz]]"
  - "[[coordinate-systems]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[lta-format]]"
  - "[[register.dat]]"
status: review
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "FreeSurfer's NIfTI-2 read/write coverage across every tool is not exhaustively traced; the sform/qform selection logic cited here is from the NIfTI-1 read path in utils/mriio.cpp and applies identically to the resolved transform."
tags:
  - format
  - interoperability
  - volume
  - nifti
---

# NIfTI-1 / NIfTI-2 (`.nii`, `.nii.gz`)

## Overview

NIfTI — the **N**euroimaging **I**nformatics **T**echnology **I**nitiative
format — is the de-facto standard file for storing 3-D and 4-D brain images.
If you have ever downloaded an anatomical scan, an fMRI time series, or a
statistical map, it almost certainly arrived as a `.nii` or `.nii.gz` file.
It is the format that FSL, SPM, AFNI, ANTs, `dcm2niix`, and the
[BIDS](https://bids.neuroimaging.io/) data standard all read and write, and it
is the format you will almost always use when moving data **into or out of**
FreeSurfer.

### The mental model

Strip away the detail and a NIfTI file is just **two things, in order**:

1. a fixed-size **header** — a few hundred bytes of metadata describing the
   image: how many voxels lie along each axis, how big each voxel is, what
   numeric type the values are, and — most importantly — *where the image
   sits in physical space*; followed by
2. the **image array** — one flat block of numbers, the voxel values
   themselves, written in a fixed order (first axis fastest).

Everything below is an elaboration of those two parts. If you only remember
three header facts, remember these, because they are all you need to correctly
interpret the pixels: the **dimensions** (`dim`), the **datatype**, and the
**orientation** (`qform`/`sform`). The rest is optional metadata.

### Why NIfTI exists — the ANALYZE story

NIfTI did not appear from nothing. It was designed in 2003 by the **Data
Format Working Group**, convened by the NIH, as a careful, *backward-compatible*
extension of the older **ANALYZE 7.5** format from the Mayo Clinic. ANALYZE was
the lingua franca of 1990s neuroimaging, but it had a notorious, dangerous
flaw: it **did not reliably record whether the first voxel axis ran to the
subject's left or to their right**. Two labs could store the "same" volume with
opposite handedness, and nothing in the file said which was correct. The result
was a long history of silent **left-right flips** — analyses, lesion locations,
and surgical plans mirrored without anyone noticing.

NIfTI's central contribution is the fix for exactly that problem: it adds
**two explicit, well-defined spatial transforms** — the *qform* and the
*sform* — that pin down the mapping from voxel indices `(i,j,k)` to real-world,
anatomically-oriented coordinates `(x,y,z)`, so orientation is never in doubt
(see [Orientation](#orientation-the-three-methods-qform-and-sform) below). On
top of that it adds richer datatypes, "intent" codes that record what the
numbers *mean* (a t-statistic? a label? a displacement vector?), an affine
data-scaling (`scl_slope`/`scl_inter`), and the option to keep the header and
image in one file.

### Grace under fire — why the header looks the way it does

Rather than invent a clean-slate format, the working group **reused ANALYZE's
348-byte header layout** and co-opted its unused fields. This was deliberate:
a NIfTI-aware program recognises the file by a short **magic** string
(`"ni1"`/`"n+1"`) and reads all the new metadata; an old ANALYZE-only program
sees a structurally valid ANALYZE header and can still load the voxels, just
without the orientation and intent information. The NIfTI-1 header comments
call this design goal *"grace under fire,"* and it explains two oddities you
will meet below: the magic string sits at the very **end** of the NIfTI-1
header (so it would not clobber a field ANALYZE cared about), and a handful of
fields are formally marked *unused*.

### NIfTI in FreeSurfer

FreeSurfer does **not** use NIfTI as its internal working format — it works in
[[mgz|MGH/MGZ]] — but it reads and writes NIfTI throughout, so for a FreeSurfer
user NIfTI is the format at the boundaries: you hand FreeSurfer a `.nii.gz`
T1, and you export results to `.nii.gz` for FSL/SPM/BIDS.
[[wiki/tools/mri_convert|mri_convert]] is the workhorse converter between NIfTI
and MGZ, preserving the voxel array and the *resolved* voxel→world transform
(the orientation rule FreeSurfer applies is the single most important
interoperability detail — see the [sform-vs-qform gotcha](#orientation-the-three-methods-qform-and-sform)).

### Storage variants

| On disk | `magic` | Meaning |
|---------|---------|---------|
| `name.nii` (or `name.nii.gz`) | `n+1` / `n+2` | **Single file** — header and image data in one file; image starts at byte `vox_offset`. |
| `name.hdr` + `name.img` | `ni1` / `ni2` | **Dual file** — ANALYZE-style pair; header in `.hdr`, voxels in `.img` from byte 0 (`vox_offset` describes the offset *within* `.img`). |
| `*.gz` | — | Either form gzip-compressed; `.nii.gz` is the common default. |

## NIfTI-1 vs. NIfTI-2 — the differences in detail

NIfTI-2 was introduced (2011) to remove NIfTI-1's hard size limits. The
information content and field *names* are identical; what changed is the
**field widths, the field order, and the header size**. The motivation: in
NIfTI-1 the `dim[]` array is `short` (signed 16-bit), capping any dimension at
**32 767** voxels — too small for high-resolution connectomes, large surfaces,
and big statistical matrices.

| Aspect | NIfTI-1 | NIfTI-2 |
|--------|---------|---------|
| `sizeof_hdr` (header size) | **348** bytes | **540** bytes |
| `magic` field | `char[4]` at **offset 344** (end of header) | `char[8]` at **offset 4** (start of header) |
| `magic` value (single / dual file) | `"n+1\0"` / `"ni1\0"` | `"n+2\0\r\n\x1a\n"` / `"ni2\0\r\n\x1a\n"` |
| `dim[8]`, `slice_start`, `slice_end` | `short` (16-bit) | `int64_t` (64-bit) |
| `pixdim[8]`, `intent_p*`, `scl_*`, `cal_*`, `slice_duration`, `toffset`, `quatern_*`, `qoffset_*`, `srow_*` | `float` (32-bit) | `double` (64-bit) |
| `vox_offset` | `float` (32-bit) | `int64_t` (64-bit) |
| `qform_code`, `sform_code`, `intent_code`, `slice_code`, `xyzt_units` | `short` (16-bit) | `int` (32-bit) |
| ANALYZE legacy fields (`data_type`, `db_name`, `extents`, `session_error`, `regular`, `glmax`, `glmin`) | present (unused) | **removed** |
| `dim_info` | `char` at offset 39 (near front) | `char` at offset 524 (near end) |
| Max size per dimension | 32 767 | 9.2 × 10¹⁸ |

> [!gotcha] How to tell NIfTI-1 from NIfTI-2 (and detect byte-swap) in one read
> Read the first 4 bytes as `int sizeof_hdr`: **348** → NIfTI-1, **540** →
> NIfTI-2. If the value is neither but byte-swaps to one of them (e.g.
> `0x3C010000`), the file is the opposite endianness and **every** field must
> be byte-swapped on read. (NIfTI-1's classic swap test is instead
> `dim[0] < 1 || dim[0] > 7`, since `sizeof_hdr` could be confused with an
> ANALYZE header — see `NIFTI_NEEDS_SWAP` in
> [`packages/nifti/nifti1.h:1480`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/nifti1.h#L1480).)
> The 4 trailing magic bytes in NIfTI-2 (`\r\n\x1a\n`, the same trick PNG uses)
> catch corruption from FTP/text-mode transfers that mangle line endings.

The two formats are otherwise semantically identical: the datatype codes,
intent codes, units codes, the three orientation methods, and the quaternion
representation below all apply unchanged to NIfTI-2 (with the wider field
types).

## NIfTI-1 header — full field layout (348 bytes)

Offsets assume the standard C type sizes `sizeof(int)=sizeof(float)=4`,
`sizeof(short)=2`. Fields marked *UNUSED* are ANALYZE 7.5 carry-overs with no
NIfTI meaning. The canonical struct is
[`packages/nifti/nifti1.h:144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/nifti1.h#L144).

| Off | Type | Field | Meaning |
|-----|------|-------|---------|
| 0 | `int` | `sizeof_hdr` | **MUST be 348**. Also the endianness/format probe. |
| 4 | `char[10]` | `data_type` | *UNUSED* (ANALYZE). |
| 14 | `char[18]` | `db_name` | *UNUSED* (ANALYZE). |
| 32 | `int` | `extents` | *UNUSED* (ANALYZE; some readers want 16384). |
| 36 | `short` | `session_error` | *UNUSED*. |
| 38 | `char` | `regular` | *UNUSED* (ANALYZE; often `'r'`). |
| 39 | `char` | `dim_info` | Encodes freq/phase/slice acquisition dims (2 bits each). |
| 40 | `short[8]` | `dim` | `dim[0]`=#dims; `dim[1..7]`=lengths. Dims 1–3 = x,y,z; 4 = t; 5–7 = other. |
| 56 | `float` | `intent_p1` | 1st parameter of `intent_code` distribution. |
| 60 | `float` | `intent_p2` | 2nd parameter. |
| 64 | `float` | `intent_p3` | 3rd parameter. |
| 68 | `short` | `intent_code` | `NIFTI_INTENT_*` — what the voxel values mean (see below). |
| 70 | `short` | `datatype` | `DT_*` / `NIFTI_TYPE_*` — voxel datatype (see below). |
| 72 | `short` | `bitpix` | Bits per voxel; MUST agree with `datatype`. |
| 74 | `short` | `slice_start` | First slice index of the timing pattern. |
| 76 | `float[8]` | `pixdim` | Voxel sizes; `pixdim[1..3]` spatial, `pixdim[4]` = TR. `pixdim[0]` = `qfac` (±1). |
| 108 | `float` | `vox_offset` | Byte offset of image data in a `.nii` file (≥ 352; default 352). |
| 112 | `float` | `scl_slope` | Data scaling slope (see Data scaling). |
| 116 | `float` | `scl_inter` | Data scaling intercept. |
| 120 | `short` | `slice_end` | Last slice index of the timing pattern. |
| 122 | `char` | `slice_code` | Slice acquisition order (`NIFTI_SLICE_*`). |
| 123 | `char` | `xyzt_units` | Units of `pixdim` — space in bits 0–2, time in bits 3–5. |
| 124 | `float` | `cal_max` | Display intensity mapped to white. |
| 128 | `float` | `cal_min` | Display intensity mapped to black. |
| 132 | `float` | `slice_duration` | Time to acquire one slice. |
| 136 | `float` | `toffset` | Time-axis origin: t(m) = `toffset` + m·`pixdim[4]`. |
| 140 | `int` | `glmax` | *UNUSED*. |
| 144 | `int` | `glmin` | *UNUSED*. |
| 148 | `char[80]` | `descrip` | Free-text description. |
| 228 | `char[24]` | `aux_file` | Auxiliary filename (e.g. a colour LUT for label data). |
| 252 | `short` | `qform_code` | `NIFTI_XFORM_*` for the quaternion transform (Method 2). |
| 254 | `short` | `sform_code` | `NIFTI_XFORM_*` for the affine transform (Method 3). |
| 256 | `float` | `quatern_b` | Quaternion *b* (Method 2 rotation). |
| 260 | `float` | `quatern_c` | Quaternion *c*. |
| 264 | `float` | `quatern_d` | Quaternion *d*. |
| 268 | `float` | `qoffset_x` | Translation x (Method 2). |
| 272 | `float` | `qoffset_y` | Translation y. |
| 276 | `float` | `qoffset_z` | Translation z. |
| 280 | `float[4]` | `srow_x` | Row 1 of the Method 3 affine. |
| 296 | `float[4]` | `srow_y` | Row 2. |
| 312 | `float[4]` | `srow_z` | Row 3. |
| 328 | `char[16]` | `intent_name` | Free-text name for the `intent_code`. |
| 344 | `char[4]` | `magic` | **MUST be `"n+1\0"` (single file) or `"ni1\0"` (dual file)**. |

Immediately after byte 348 sit the 4-byte **extender** and then optional
header extensions (see Extensions, below); in a `.nii` file the image data
begins at `vox_offset`.

## NIfTI-2 header — full field layout (540 bytes)

Same semantics; widened types; magic moved to the front. Canonical layout per
the [NIfTI-2 standard](https://www.nitrc.org/docman/view.php/26/1302/nifti2_doc.html).

| Off | Type | Field | | Off | Type | Field |
|-----|------|-------|-|-----|------|-------|
| 0 | `int` | `sizeof_hdr` (=540) | | 240 | `char[80]` | `descrip` |
| 4 | `char[8]` | `magic` | | 320 | `char[24]` | `aux_file` |
| 12 | `int16` | `datatype` | | 344 | `int` | `qform_code` |
| 14 | `int16` | `bitpix` | | 348 | `int` | `sform_code` |
| 16 | `int64[8]` | `dim` | | 352 | `double` | `quatern_b` |
| 80 | `double` | `intent_p1` | | 360 | `double` | `quatern_c` |
| 88 | `double` | `intent_p2` | | 368 | `double` | `quatern_d` |
| 96 | `double` | `intent_p3` | | 376 | `double` | `qoffset_x` |
| 104 | `double[8]` | `pixdim` | | 384 | `double` | `qoffset_y` |
| 168 | `int64` | `vox_offset` | | 392 | `double` | `qoffset_z` |
| 176 | `double` | `scl_slope` | | 400 | `double[4]` | `srow_x` |
| 184 | `double` | `scl_inter` | | 432 | `double[4]` | `srow_y` |
| 192 | `double` | `cal_max` | | 464 | `double[4]` | `srow_z` |
| 200 | `double` | `cal_min` | | 496 | `int` | `slice_code` |
| 208 | `double` | `slice_duration` | | 500 | `int` | `xyzt_units` |
| 216 | `double` | `toffset` | | 504 | `int` | `intent_code` |
| 224 | `int64` | `slice_start` | | 508 | `char[16]` | `intent_name` |
| 232 | `int64` | `slice_end` | | 524 | `char` | `dim_info` |
| | | | | 525 | `char[15]` | `unused_str` |

The minimum `vox_offset` in a single-file NIfTI-2 is **544** (header 540 +
4-byte extender).

## Datatype codes (`datatype` / `bitpix`)

Codes < 256 are ANALYZE-compatible; ≥ 256 are NIfTI additions. From
[`packages/nifti/nifti1.h:484`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/nifti1.h#L484).

| Code | Name | bitpix | Code | Name | bitpix |
|------|------|--------|------|------|--------|
| 2 | `UINT8` | 8 | 512 | `UINT16` | 16 |
| 4 | `INT16` | 16 | 768 | `UINT32` | 32 |
| 8 | `INT32` | 32 | 1024 | `INT64` | 64 |
| 16 | `FLOAT32` | 32 | 1280 | `UINT64` | 64 |
| 32 | `COMPLEX64` | 64 | 1536 | `FLOAT128` | 128 |
| 64 | `FLOAT64` (double) | 64 | 1792 | `COMPLEX128` | 128 |
| 128 | `RGB24` | 24 | 2048 | `COMPLEX256` | 256 |
| 256 | `INT8` | 8 | 2304 | `RGBA32` | 32 |

> [!gotcha] Most readers support only a subset of datatypes
> The standard requires programs to **fail gracefully** on a datatype they do
> not handle, not crash. FreeSurfer's MGZ supports a narrower set (`UCHAR`,
> `SHORT`, `INT`, `FLOAT`, plus a few), so converting an exotic NIfTI
> (`COMPLEX*`, `FLOAT128`, `RGBA32`) to MGZ may be rejected or cast.

## Data scaling (`scl_slope`, `scl_inter`)

If `scl_slope ≠ 0`, the *true* value is `y = scl_slope · x + scl_inter`, where
`x` is the stored voxel value. This lets integer storage carry floating
"true" values. The scaling is ignored for `RGB24`, and applies to both parts
of a complex type.

> [!gotcha] FreeSurfer and `scl_slope`/`scl_inter`
> Down-stream tools that read the raw array without honouring `scl_slope`/
> `scl_inter` will get unscaled integers. When in doubt, check
> [[mri_info]] output, and prefer converting through
> [[wiki/tools/mri_convert|mri_convert]], which applies the scaling.

## Orientation: the three methods, qform and sform

NIfTI defines voxel index `(i,j,k)` (i fastest) → continuous `(x,y,z)` in a
**right-handed RAS** frame: `+x = Right`, `+y = Anterior`, `+z = Superior`
(note this is the *opposite* of ANALYZE's left-handed `+x = Left`). There are
three ways to attach coordinates, selected by the form codes:

- **Method 1 — `qform_code = 0`** (ANALYZE fallback): pure scaling
  `x = pixdim[1]·i`, `y = pixdim[2]·j`, `z = pixdim[3]·k`. No real
  orientation; not recommended.
- **Method 2 — `qform_code > 0`** (the *quaternion* form, "scanner
  anatomical"): a rigid-body transform.
  $$\begin{bmatrix} x \\ y \\ z \end{bmatrix} = R \begin{bmatrix} \text{pixdim}[1]\,i \\ \text{pixdim}[2]\,j \\ q_{\text{fac}}\,\text{pixdim}[3]\,k \end{bmatrix} + \begin{bmatrix} \text{qoffset\_x} \\ \text{qoffset\_y} \\ \text{qoffset\_z} \end{bmatrix}$$
  where `qfac = pixdim[0]` (±1, handedness fix) and `R` is built from the unit
  quaternion `[a,b,c,d]` with `a = √(1−b²−c²−d²) ≥ 0`:
  $$R = \begin{bmatrix} a^2{+}b^2{-}c^2{-}d^2 & 2(bc{-}ad) & 2(bd{+}ac) \\ 2(bc{+}ad) & a^2{+}c^2{-}b^2{-}d^2 & 2(cd{-}ab) \\ 2(bd{-}ac) & 2(cd{+}ab) & a^2{+}d^2{-}c^2{-}b^2 \end{bmatrix}$$
- **Method 3 — `sform_code > 0`** (the *affine* form, "standard space"): a
  general affine that ignores `pixdim`:
  $$x = \text{srow\_x}\cdot(i,j,k,1),\quad y = \text{srow\_y}\cdot(i,j,k,1),\quad z = \text{srow\_z}\cdot(i,j,k,1)$$

Both can be present at once: Method 2 carries the scanner's nominal geometry;
Method 3 carries a registration to a standard space. The form codes say *which*
space (`NIFTI_XFORM_*`):

| Code | Name | Space |
|------|------|-------|
| 0 | `UNKNOWN` | arbitrary (Method 1) |
| 1 | `SCANNER_ANAT` | scanner-based anatomical |
| 2 | `ALIGNED_ANAT` | aligned to another file / anatomical truth |
| 3 | `TALAIRACH` | Talairach-Tournoux; (0,0,0) = AC |
| 4 | `MNI_152` | MNI 152 |

> [!gotcha] FreeSurfer prefers the **sform** over the qform
> On read, FreeSurfer uses the **sform if `sform_code ≠ 0`**, otherwise the
> **qform if `qform_code ≠ 0`**, otherwise it falls back to a default
> orientation, sets `ras_good_flag = 0`, and warns the volume "will probably
> be incorrectly oriented"
> ([`utils/mriio.cpp:7870-7906`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7870-L7906)).
> The comment notes sform-first was chosen "to make it more compatible with
> FSL." **If a file's qform and sform disagree** (malformed, but common in the
> wild), FreeSurfer silently follows the sform; a tool that reads the qform
> first will place the volume differently. This is the usual cause of a volume
> that looks right in one package and flipped/shifted in another. Inspect what
> FreeSurfer resolved with [[mri_info]].

> [!gotcha] NIfTI ↔ DICOM is a 180° flip about z
> DICOM "Image Position (Patient)" `(px,py,pz)` maps to NIfTI as
> `qoffset_x = −px`, `qoffset_y = −py`, `qoffset_z = pz`, because DICOM's
> `+x,+y` are Left/Posterior while NIfTI's are Right/Anterior.

## Intent codes (`intent_code`)

`intent_code` labels what the voxel numbers *represent*. `0` (`NIFTI_INTENT_NONE`)
means "just image data". The codes fall into three groups, enumerated **in
full** below; the authoritative source is the `NIFTI1_INTENT_CODES` block of
[`packages/nifti/nifti1.h:656-959`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/nifti1.h#L656-L959)
(and the [NIfTI-1 fields reference](https://nifti.nimh.nih.gov/nifti-1/documentation/nifti1fields/)).

How the distribution **parameters** are supplied: if the dataset has no 5th
dimension, the (up to three) parameters are the same for every voxel and live
in the header fields `intent_p1`, `intent_p2`, `intent_p3`. If `dim[0] = 5`,
the parameters vary per voxel and are stored in the 5th dimension instead, with
`dim[5]` equal to one plus the number of parameters.

### Statistical codes (2–24)

`NIFTI_FIRST_STATCODE = 2` … `NIFTI_LAST_STATCODE = 24`. The value at each voxel
is drawn from the named distribution. (Value `1` is intentionally unused — it is
obsolete in AFNI, with which codes 2–10 are compatible.)

| Code | Name | Parameters |
|------|------|------------|
| 2 | `CORREL` | p1 = DOF (correlation coefficient R) |
| 3 | `TTEST` | p1 = DOF (Student t) |
| 4 | `FTEST` | p1 = numerator DOF, p2 = denominator DOF |
| 5 | `ZSCORE` | none (standard normal) |
| 6 | `CHISQ` | p1 = DOF |
| 7 | `BETA` | p1 = a, p2 = b |
| 8 | `BINOM` | p1 = #trials, p2 = probability per trial |
| 9 | `GAMMA` | p1 = shape, p2 = scale |
| 10 | `POISSON` | p1 = mean |
| 11 | `NORMAL` | p1 = mean, p2 = standard deviation |
| 12 | `FTEST_NONC` | p1 = num DOF, p2 = den DOF, p3 = noncentrality |
| 13 | `CHISQ_NONC` | p1 = DOF, p2 = noncentrality |
| 14 | `LOGISTIC` | p1 = location, p2 = scale |
| 15 | `LAPLACE` | p1 = location, p2 = scale |
| 16 | `UNIFORM` | p1 = lower end, p2 = upper end |
| 17 | `TTEST_NONC` | p1 = DOF, p2 = noncentrality |
| 18 | `WEIBULL` | p1 = location, p2 = scale, p3 = power |
| 19 | `CHI` | p1 = DOF (p1=1 half-normal, 2 Rayleigh, 3 Maxwell-Boltzmann) |
| 20 | `INVGAUSS` | p1 = mu, p2 = lambda |
| 21 | `EXTVAL` | p1 = location, p2 = scale (extreme value type I) |
| 22 | `PVAL` | none (value is a p-value) |
| 23 | `LOGPVAL` | none (value is ln(p)) |
| 24 | `LOG10PVAL` | none (value is log₁₀(p)) |

### Non-statistical codes (1001–1011)

| Code | Name | Meaning |
|------|------|---------|
| 1001 | `ESTIMATE` | a parameter estimate; name in `intent_name` |
| 1002 | `LABEL` | index into a label set (e.g. a segmentation) |
| 1003 | `NEURONAME` | index into the NeuroNames label set |
| 1004 | `GENMATRIX` | M×N matrix per voxel (`dim[5]=M·N`, p1=M, p2=N) |
| 1005 | `SYMMATRIX` | N×N symmetric matrix per voxel (`dim[5]=N(N+1)/2`); DTI tensors |
| 1006 | `DISPVECT` | displacement vector (a warp field) |
| 1007 | `VECTOR` | a general vector |
| 1008 | `POINTSET` | spatial coordinates (e.g. surface vertices) |
| 1009 | `TRIANGLE` | index triples into a `POINTSET` (mesh faces) |
| 1010 | `QUATERNION` | a quaternion per voxel (`dim[5]=4`) |
| 1011 | `DIMLESS` | dimensionless value; name in `intent_name` |

### Surface / GIFTI codes (2001–2008)

Used mainly for surface-based data (GIFTI), where "voxel" means a mesh node.

| Code | Name | Meaning |
|------|------|---------|
| 2001 | `TIME_SERIES` | a time series at each node |
| 2002 | `NODE_INDEX` | a node index from a complete surface dataset |
| 2003 | `RGB_VECTOR` | an RGB triplet per node (`dim[5]=3`) |
| 2004 | `RGBA_VECTOR` | an RGBA quadruplet per node (`dim[5]=4`) |
| 2005 | `SHAPE` | a shape value such as curvature |
| 2006 | `RETINOTOPY_POLAR` | retinotopy polar angle (BrainVoyager origin) |
| 2007 | `RETINOTOPY_ECCENTRICITY` | retinotopy eccentricity |
| 2008 | `RETINOTOPY_FIELD_SIGN` | retinotopy field sign |

`intent_name` (16 chars) can carry a free-text label for any of these — e.g.
`intent_code = ESTIMATE`, `intent_name = "T1"`.

## Units, slice timing, dimensionality

- **`xyzt_units`** packs spatial units in bits 0–2 (`1`=m, `2`=mm, `3`=µm) and
  temporal units in bits 3–5 (`8`=s, `16`=ms, `24`=µs; `32`=Hz, `40`=ppm,
  `48`=rad/s). Mask with `& 0x07` (space) and `& 0x38` (time).
- **`dim`/`pixdim`**: total image bytes = `dim[1]·…·dim[dim[0]]·bitpix/8`. A
  4-D FMRI run uses `dim[0]=4`; a 5th dimension holds per-voxel vectors,
  matrices, or statistic parameters.
- **`slice_code`** (with `slice_dim` from `dim_info` and a positive
  `slice_duration`) encodes acquisition order: `SEQ_INC/DEC` (sequential),
  `ALT_INC/DEC` and `ALT_INC2/DEC2` (interleaved; the `2` variants start one
  slice in, as on some Siemens scanners). Relevant for [[stc.fsl|slice-timing
  correction]] in FMRI.

## Header extensions

After the header (byte 348 for NIfTI-1, 540 for NIfTI-2) come 4 **extender**
bytes; if `extender[0] ≠ 0`, one or more extensions follow, each `int esize,
ecode` (esize a multiple of 16, including the 8-byte pair) then `esize−8`
bytes of data. Registered `ecode`s include `2` = DICOM, `4` = AFNI (XML-ish).
Readers skip extensions they do not recognise by jumping to `vox_offset`.

## Relationship to MGZ

|                     | [[mgz]]                            | NIfTI                                     |
| ------------------- | ---------------------------------- | ----------------------------------------- |
| Role in FreeSurfer  | native working format              | interchange / external                    |
| Orientation record  | direction cosines + c_ras          | qform **and** sform                       |
| Embedded transforms | can embed Talairach LTA path (TAG) | standard NIfTI: none; FreeSurfer's single-file writer re-embeds MGZ TAGs as a private extension (below) |
| Data scaling        | none (stored values are true)      | `scl_slope` / `scl_inter`                 |
| Compression         | gzip (`.mgz`)                      | gzip (`.nii.gz`)                          |
| Max dim             | 4-D (`short` dims)                 | NIfTI-1: 32767; NIfTI-2: 64-bit           |

Converting MGZ→NIfTI preserves the voxel data and the resolved vox2ras. The
FreeSurfer-specific MGZ TAGs (e.g. the embedded Talairach path) are **not** part
of the NIfTI standard, so any other package ignores them — but FreeSurfer's
**single-file** `.nii`/`.nii.gz` writer does re-embed them as a private
`NIFTI_ECODE_FREESURFER` (=14) header extension, and its reader restores them on
round-trip (the legacy `.hdr`/`.img` writer does not). See
[[internal-mri-io]] for the read/write path. NIfTI→MGZ preserves the
orientation FreeSurfer resolved per the sform/qform rule above.

## Typical use

```bash
# NIfTI ↔ MGZ — orientation preserved
mri_convert input.nii.gz output.mgz
mri_convert orig.mgz orig.nii.gz

# Inspect the resolved orientation, vox2ras, and datatype
mri_info input.nii.gz

# Feed a clinical NIfTI straight into recon-all-clinical
recon-all-clinical.sh input.nii.gz subjID 8 $SUBJECTS_DIR
```

> [!gotcha] `recon-all` conforms NIfTI input
> Passing a NIfTI T1 to `recon-all -i` does **not** skip conforming: the
> volume is resampled to the 256³, 1 mm isotropic, LIA [[mgz]] reference space
> by [[wiki/tools/mri_convert|mri_convert]]. The native NIfTI geometry is used
> only to compute that resampling. See the conform discussion on the
> [[wiki/tools/mri_convert|mri_convert]] page.

> [!gotcha] Units are honoured and rescaled on read
> FreeSurfer reads `xyzt_units` and rescales `pixdim` and the RAS offsets to
> millimetres, keeping `TR` in milliseconds
> ([`utils/mriio.cpp:7908-7915`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mriio.cpp#L7908-L7915)).

## Implementation notes (for parsing)

- **Endianness**: decide from `sizeof_hdr` (348/540) or NIfTI-1's `dim[0]`
  range test; if swapped, byte-swap **all** numeric fields. Extension binary
  data byte-order is *not* guaranteed to match the header.
- **Single vs dual file**: `magic[1] == '+'` → data in this file at
  `vox_offset`; `magic[1] == 'i'` → data in the sibling `.img` from byte 0.
- **Voxel address**: voxel `(i,j,k)` is at
  `vox_offset + (i + j·dim[1] + k·dim[1]·dim[2])·bitpix/8`.
- **`vox_offset`** should be a multiple of 16 (memory-mapping/SPM); in NIfTI-1
  it is a `float`, so only integers ≤ 2²⁴ are exactly representable.

## Related

- [[mgz]] — FreeSurfer's native volume format and the conform target.
- [[coordinate-systems]] — scanner RAS vs. tkreg RAS; what qform/sform map to.
- [[wiki/tools/mri_convert|mri_convert]] — the primary NIfTI↔MGZ converter.
- [[mri_info]] — inspect the resolved orientation, vox2ras, and datatype.
- [[lta-format]], [[register.dat]] — where inter-volume transforms live
  (NIfTI itself stores none).

## References

- NIfTI-1 header definition (bundled in FreeSurfer):
  [`packages/nifti/nifti1.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/packages/nifti/nifti1.h)
  — Robert W. Cox et al., NIfTI DFWG.
- [NIfTI-1 fields reference](https://nifti.nimh.nih.gov/nifti-1/documentation/nifti1fields/)
  and [NIfTI-2 standard](https://www.nitrc.org/docman/view.php/26/1302/nifti2_doc.html),
  NIfTI Data Format Working Group (NIMH).
- [nibabel NIfTI documentation](https://nipy.org/nibabel/nifti_images.html) —
  practical reader/writer notes and the qform/sform discussion.
