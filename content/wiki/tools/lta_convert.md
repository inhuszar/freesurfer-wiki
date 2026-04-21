---
title: "lta_convert"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "lta_convert/lta_convert.cpp"
families:
  - "lta_*"
recon_all_stage: null
related:
  - "[[lta-format]]"
  - "[[coordinate-systems]]"
  - "[[mri_fslmat_to_lta]]"
  - "[[mri_coreg]]"
  - "[[tkregister2]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact VOX2VOX convention (target-to-source vs. source-to-target) should be confirmed with a test case"
  - "2D NiftyReg input support is only partially implemented; full scope unclear"
tags:
  - registration
  - transforms
  - conversion
  - lta
---

# lta_convert

## Summary

`lta_convert` converts linear spatial transform files between the formats used by FreeSurfer, FSL/FLIRT, ANTs/ITK, NiftyReg, and MNI/XFM tools. The internal representation is always the FreeSurfer Linear Transform Array (LTA) in scanner RAS-to-RAS form; all reads convert to this canonical form and all writes convert out of it. Geometry information (source and target volume headers) is embedded in the LTA format but is absent from several other formats; when converting from those formats the user must explicitly supply the source and/or target volume paths with `--src` / `--trg`.

## Source Information

- **Language:** C++
- **Source file:** `lta_convert/lta_convert.cpp` (original author: Martin Reuter)
- **Binary location:** `$FREESURFER_HOME/bin/lta_convert`

## Purpose and Context

`lta_convert` exists because FreeSurfer, FSL, ANTs, NiftyReg, and SPM each store affine transforms in incompatible binary or text formats with different sign conventions and different notions of what coordinate system the matrix acts in. The tool acts as a universal translator among these formats.

Typical scenarios:

- Converting an FSL FLIRT `.mat` file into a FreeSurfer `.lta` so it can be used with `mri_vol2surf` or `bbregister`.
- Converting an ANTs/ITK `.txt` affine into an `.lta` after first converting the binary `.mat` with the ANTs `ConvertTransformFile` utility.
- Inverting a transform without reslicing: `--inlta in.lta --outlta out.lta --invert`.
- Conforming the geometry recorded in an `.lta` to the standard 1 mm isotropic 256³ space for use with atlas-based tools.
- Creating an LTA from scratch using only volume header geometry (`--regheader`).

Not called by `recon-all` directly, but widely used in post-processing and multi-tool pipelines.

## Inputs

### Required Inputs

Exactly one input flag is required:

| Input Flag | Format | Notes |
|------------|--------|-------|
| `--inlta` | FreeSurfer LTA (`.lta`) | Native format; contains geometry |
| `--infsl` | FSL/FLIRT matrix (`.mat`) | 4×4 ASCII; requires `--src` and `--trg` |
| `--inmni` | MNI/XFM (`.xfm`) | MINC-style; requires `--src` and `--trg` |
| `--inreg` | TK REG / `register.dat` | Deprecated; requires `--src` and `--trg` |
| `--inniftyreg` / `--inras` | NiftyReg (inverse RAS2RAS) | Requires `--src` and `--trg` |
| `--inniftyreg2d` | NiftyReg 2D | Requires `--src` and `--trg` |
| `--initk` / `--inlps` | ITK/ANTs text format (inverse LPS2LPS) | Requires `--src` and `--trg` |
| `--invox` | VOX2VOX in source image space (inverse) | Requires `--src` and `--trg` |

At least one output flag is also required (see Configuration Options below).

### Input Assumptions

> [!assumption] Geometry information
> The LTA format embeds source and target volume geometry; all other formats do not. When reading non-LTA formats, the tool reads only the matrix. The `--src` and `--trg` arguments supply volume header geometry by reading the file header with `MRIreadHeader()`. If geometry is incorrect (e.g., wrong volume supplied), the converted matrix will be silently wrong.

> [!assumption] ITK/ANTs format requires pre-conversion
> ANTs produces binary `.mat` files. These must be converted to ITK text format with `ConvertTransformFile` (shipped with ANTs) before `lta_convert` can read them. The ITK format stores an inverse LPS-to-LPS matrix; `lta_convert` inverts and converts to RAS-to-RAS internally.

> [!assumption] NiftyReg stores the inverse transform
> NiftyReg writes the matrix that maps from target space to source space (i.e., the inverse). `lta_convert` inverts this on read to obtain the canonical source-to-target RAS2RAS form stored in the LTA.

## Outputs

### Files Created

At least one output flag must be specified. Multiple output flags may be combined in a single invocation, so the tool can simultaneously write several formats.

| Output Flag | Format | Notes |
|-------------|--------|-------|
| `--outlta` | FreeSurfer LTA | Default type: `LINEAR_RAS_TO_RAS`; override with `--ltavox2vox` or `--ltatkreg` |
| `--outfsl` | FSL/FLIRT `.mat` | 4×4 ASCII |
| `--outmni` | MNI/XFM `.xfm` | |
| `--outreg` | `register.dat` | TK REG format |
| `--outniftyreg` / `--outras` | NiftyReg text | Inverse RAS2RAS |
| `--outitk` / `--outlps` | ITK text | Inverse LPS2LPS |
| `--outvox` | VOX2VOX in source space | Inverse VOX2VOX |

### Output Specifications

The LTA output encodes the source-to-target transform as a 4×4 real-valued matrix in scanner RAS space (`LINEAR_RAS_TO_RAS` type) unless overridden. Volume geometry is embedded in the file. The LTA format is described in [[lta-format]].

## Mathematical Foundations

All internal processing operates in scanner RAS-to-RAS space. The conversion from each external format to `LINEAR_RAS_TO_RAS` follows the conventions documented in the code:

**FSL/FLIRT** uses voxel coordinates scaled by voxel size, with a sign flip in the x-axis when the determinant of the source vox2ras matrix is positive (i.e., when the volume is stored in neurological convention). The conversion is implemented via `LTAreadExType(..., FSLREG_TYPE)` followed by `LTAchangeType(..., LINEAR_RAS_TO_RAS)`.

**ITK/ANTs** uses LPS (Left-Posterior-Superior) coordinates and stores the inverse transform. The sign conversion from LPS to RAS is:

$$\mathbf{M}_{\text{RAS}} = \mathrm{diag}(-1,-1,1,1) \cdot \mathbf{M}_{\text{LPS}}^{-1} \cdot \mathrm{diag}(-1,-1,1,1)$$

Additionally, a fixed-parameters vector (centre of rotation) must be absorbed into the translation column before applying this flip.

**NiftyReg** stores $\mathbf{M}_{\text{trg}\to\text{src}}$ (inverse RAS2RAS). `lta_convert` reads the matrix and inverts it: $\mathbf{M}_{\text{src}\to\text{trg}} = \mathbf{M}_{\text{trg}\to\text{src}}^{-1}$.

**TK REG / register.dat** stores a matrix in tkRAS (Surface RAS) space. Conversion to scanner RAS uses `LTAchangeType(..., LINEAR_RAS_TO_RAS)`, which internally calls `MRItkReg2Native()` to apply the tkRAS-to-scanner offset for both source and target volumes.

**Geometry modification flags** (`--srcconform`, `--trgconform`, etc.) modify the `VOL_GEOM` fields inside the LTA without changing the RAS-to-RAS matrix itself. This allows re-labelling of the geometry (e.g., to conform a volume for atlas use) while preserving the physical transform.

> [!internal] The `LTAchangeType()` function in `utils/transform.cpp` handles all coordinate-system conversions between LTA types. The per-format read functions (`readFSL`, `readREG`, `readITK`, `readNIFTYREG`, `readVOX`) each convert to `LINEAR_RAS_TO_RAS` before returning.

## Configuration Options

### Complete Flag Reference

#### Input Flags (exactly one required)

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--inlta` | `<in.lta>` | — | Read LTA file; geometry already embedded |
| `--infsl` | `<in.fslmat>` | — | Read FSL/FLIRT 4×4 matrix |
| `--inmni` | `<in.xfm>` | — | Read MNI/MINC XFM file |
| `--inreg` | `<inreg.dat>` | — | Read TK REG `register.dat` (deprecated) |
| `--inniftyreg` / `--inras` | `<file>` | — | Read NiftyReg inverse RAS2RAS (3D) |
| `--inniftyreg2d` | `<file>` | — | Read NiftyReg inverse RAS2RAS (2D) |
| `--initk` / `--inlps` | `<file>` | — | Read ITK/ANTs text file (inverse LPS2LPS) |
| `--invox` | `<file>` | — | Read VOX2VOX in source voxel space (inverse) |

#### Output Flags (at least one required)

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--outlta` | `<out.lta>` | — | Write FreeSurfer LTA |
| `--outfsl` | `<out.mat>` | — | Write FSL/FLIRT 4×4 matrix |
| `--outmni` | `<out.xfm>` | — | Write MNI/XFM file |
| `--outreg` | `<reg.dat>` | — | Write TK REG `register.dat` |
| `--outniftyreg` / `--outras` | `<file>` | — | Write NiftyReg inverse RAS2RAS |
| `--outitk` / `--outlps` | `<file>` | — | Write ITK text file (inverse LPS2LPS) |
| `--outvox` | `<file>` | — | Write VOX2VOX in source space (inverse) |

#### Geometry and Subject Flags

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--src` | `<volume>` | — | Supply source volume geometry (reads header only) |
| `--trg` | `<volume>` | — | Supply target volume geometry (reads header only) |
| `--subject` | `<name>` | (from LTA) | Override subject name field in output LTA |
| `--regheader` | none | off | Create LTA from src/trg header geometry; equivalent to `--inlta identity.nofile` |

#### LTA Output Type Modifiers

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--ltavox2vox` | none | off | Write LTA as `VOX2VOX` type instead of `RAS2RAS` |
| `--ltatkreg` | none | off | Write LTA as `REGISTER_DAT` type |

#### Transform Modification

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--invert` | none | off | Invert the transform after reading, before any geometry modification or writing |

#### Source Geometry Modification

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--srcconform` | none | off | Conform source geometry to 1 mm isotropic 256³ (COR standard); applied before inversion |
| `--srcconform-dc` | none | off | Conform source geometry preserving direction cosines |
| `--srcconform-min` | none | off | Conform source geometry to minimum voxel size |
| `--srcconform-size` | `<mm>` | — | Conform source geometry to specified isotropic voxel size |
| `--srcupsample` | `<N>` | — | Upsample source geometry by integer factor N |
| `--srcdownsample` | `<N>` | — | Downsample source geometry by integer factor N |

#### Target Geometry Modification

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `--trgconform` | none | off | Conform target geometry to 1 mm isotropic 256³; applied before inversion |
| `--trgconform-dc` | none | off | Conform target geometry preserving direction cosines |
| `--trgconform-min` | none | off | Conform target geometry to minimum voxel size |
| `--trgconform-size` | `<mm>` | — | Conform target geometry to specified isotropic voxel size |
| `--trgupsample` | `<N>` | — | Upsample target geometry by integer factor N |
| `--trgdownsample` | `<N>` | — | Downsample target geometry by integer factor N |

### Configuration Interactions

> [!gotcha] Geometry flags change the LTA header, not the matrix
> The `--srcconform`, `--trgconform`, and related flags modify the `VOL_GEOM` blocks inside the LTA (source and target image geometry fields), but do **not** change the 4×4 RAS-to-RAS matrix. This is intentional: the physical transform is unchanged; only the metadata describing which volumes it connects is updated. Misusing these flags (e.g., conforming when the original transform was computed to a non-conformed volume) will produce an LTA with internally inconsistent geometry.

> [!gotcha] `--invert` applies before geometry modification
> `--invert` and `--srcconform` / `--trgconform` interact through ordering: inversion is applied first, then geometry flags modify the result. After inversion, source and target are swapped in the LTA; a subsequent `--trgconform` therefore modifies what was originally the source geometry.

> [!gotcha] Non-LTA inputs always require `--src` and `--trg`
> FSL, MNI, NiftyReg, ITK, and VOX2VOX formats carry no volume geometry. If `--src` or `--trg` is omitted when reading these formats, the geometry fields in the output LTA will be invalid (zero or garbage), which will cause downstream tools that rely on LTA geometry (e.g., `mri_vol2surf`, `tkregister2`) to behave incorrectly.

> [!gotcha] Multiple output formats in one call
> It is valid to specify multiple output flags (e.g., `--outlta` and `--outfsl`) in a single invocation. All outputs are derived from the same internal RAS2RAS matrix after all modifications (inversion, geometry changes) are applied.

> [!gotcha] FSL output depends on `FSLOUTPUTTYPE` environment variable
> The `--outfsl` flag writes an FSL-compatible matrix, but the sign of the x-axis flip in the FSL convention depends on the output type (NIfTI vs. Analyze). The help text notes that `FSLOUTPUTTYPE` environment variable may affect this. In practice, always verify the FSL output with `flirt -schedule` or visual inspection.

## Typical Use Cases

### Convert FSL to LTA

```bash
lta_convert --infsl fsl.mat \
            --outlta my.lta \
            --src src.nii \
            --trg trg.nii
```

Produces a FreeSurfer `.lta` file from a FLIRT output matrix. Source and target volumes must be the same ones used when FLIRT was run.

### Convert ANTs/ITK to LTA

```bash
# Step 1: convert binary ANTs mat to ITK text format
$ANTSPATH/ConvertTransformFile 3 3D_antsAffine.mat 3D_antsAffine.txt

# Step 2: convert ITK text to LTA
lta_convert --initk 3D_antsAffine.txt \
            --outlta 3D_antsAffine.lta \
            --src src.nii \
            --trg trg.nii
```

### Invert a transform

```bash
lta_convert --inlta forward.lta --outlta inverse.lta --invert
```

### Create LTA from header geometry only

```bash
lta_convert --regheader --src src.nii --trg trg.nii --outlta header.lta
# equivalent to:
lta_convert --inlta identity.nofile --src src.nii --trg trg.nii --outlta header.lta
```

Useful when SPM stores its transform in the image header (vox2ras is modified directly), and you need an explicit transform file.

### Conform target geometry in an existing LTA

```bash
lta_convert --inlta in.lta --outlta conformed.lta --trgconform
```

Updates the target geometry to COR standard without changing the matrix. Useful for preparing an LTA for use with GCA-based tools that expect a conformed target.

### Write multiple output formats simultaneously

```bash
lta_convert --inlta in.lta \
            --outlta out.lta \
            --outfsl out.mat \
            --outreg register.dat
```

## Pipeline Context

`lta_convert` is not called by `recon-all`. It is used in post-processing pipelines, cross-software interoperability workflows (FreeSurfer ↔ FSL ↔ ANTs), and when manually manipulating registration files before feeding them to `mri_vol2surf`, `tkregister2`, or `bbregister`.

## Gotchas and Caveats

> [!gotcha] `identity.nofile` is a magic token
> Passing `--inlta identity.nofile` (the literal string, not a file path) creates an identity transform. Combined with `--src` and `--trg`, this is equivalent to `--regheader`. This token is recognized by the LTA reader in `utils/transform.cpp`.

> [!gotcha] NiftyReg 2D support is experimental
> The `--inniftyreg2d` code path reads a 2D transform matrix. Fixed-parameter handling for 2D ITK is explicitly noted in the source as "not implemented" if fixed parameters are non-zero. Do not rely on these code paths for production use without validation.

> [!gotcha] VOX2VOX semantics are inverse
> The `--invox` / `--outvox` flags use the convention that the matrix maps from **target** voxel indices to **source** voxel indices (i.e., the inverse of what you might expect from the flag name). This is consistent with how resampling tools typically apply transforms (pull/sampling convention). See [[coordinate-systems]] for the distinction between push and pull conventions.

> [!gotcha] TK REG format requires correct src/trg geometry for correct conversion
> The `register.dat` format encodes a matrix in tkRAS space (Surface RAS). Converting it to RAS2RAS requires the c_ras offsets of both volumes. If `--src` or `--trg` supply the wrong volumes, the resulting RAS2RAS matrix will be silently wrong by the c_ras offset difference.

## Related Tools

- [[lta-format]] — detailed specification of the LTA file format
- [[coordinate-systems]] — explanation of RAS, tkRAS, voxel, and LPS coordinate systems and the transforms between them
- [[mri_fslmat_to_lta]] — an older, simpler FSL-to-LTA converter (subset of `lta_convert` functionality)
- [[mri_coreg]] — computes a registration and outputs an LTA
- [[tkregister2]] — interactive registration tool; accepts and outputs several of the same formats
- [[bbregister]] — boundary-based registration; outputs LTA and `register.dat`

## Confidence and Gaps

Medium confidence overall. Flag semantics and conversion logic are derived from direct reading of `lta_convert.cpp`. The mathematical conventions for ITK, NiftyReg, and VOX2VOX formats are code-verified.

> [!gap] VOX2VOX directionality
> The `--invox` / `--outvox` convention (target-to-source vs. source-to-target in voxel space) should be confirmed with a concrete test case comparing input and output matrices.

> [!gap] 2D NiftyReg input
> The `--inniftyreg2d` code path and the ITK 2D fixed-parameters path are incompletely implemented in the source. Their behaviour for non-zero fixed parameters in 2D is explicitly marked as "not implemented" and will cause an error exit.
