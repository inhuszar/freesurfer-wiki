---
title: "mri_convert"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_convert/mri_convert.cpp"
  - "mri_convert/mri_make_uchar.cpp"
  - "mri_convert/mri_convert.help.xml"
  - "utils/mri_conform.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[mri_info]]"
  - "[[recon-all]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
  - "[[mri_concat]]"
  - "[[mri_nu_correct.mni]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Full list of interactions between --apply_transform, --reslice_like, --conform and --like is complex; code paths 1801–2930 not yet fully traced"
  - "Behaviour of --no_scale on non-COR outputs is only documented for the binary case; source check still needed"
  - "Internal dcm2niix vendored tree behaviour for --dcm2niix-* options is not traced beyond the wrapper layer"
tags:
  - conversion
  - formats
  - resampling
  - conform
---

# mri_convert

## Summary

`mri_convert` is FreeSurfer's Swiss-army knife for moving volumetric
data between formats and for applying basic, header-respecting
transforms to it: format conversion (DICOM, NIfTI, MGH/MGZ, ANALYZE,
AFNI BRIK, Bshort/Bfloat, GE/Siemens raw, etc.), resampling to a new
voxel size or to match a template volume, re-orientation,
header-driven coordinate manipulations (re-centering, direction
cosines), application of linear (`.xfm` / [[lta-format|`.lta`]]) and non-linear
([[m3z-format|`.m3z`]]) transforms, frame selection on 4-D volumes, cropping,
smoothing, scaling, type casting, and the canonical "conform" operation
that produces the 256³ 1 mm isotropic LIA volume that `recon-all`
treats as its reference input space. It is the first tool called in
virtually every FreeSurfer pipeline.

## Source Information

- **Language:** C++ (argument parsing is C-style; volume I/O uses the
  shared C `mri.h` API).
- **Source file(s):**
  - `mri_convert/mri_convert.cpp` — 4010 lines, contains `main()` and
    all CLI flag parsing.
  - `mri_convert/mri_make_uchar.cpp` — 289 lines, builds the small
    helper `mri_make_uchar` used by `mri_nu_correct.mni` to centre
    white-matter intensity at ~110 (not a separate user binary, but
    installed alongside).
  - `mri_convert/mri_convert.help.xml` — XML from which the `-u` help
    text is rendered (the help text in the binary is not hand-written).
  - `utils/mri_conform.cpp` — the `MRIconformedTemplate()` and
    `MRIconform()` helpers called when `--conform` is in effect.
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_convert`

## Purpose and Context

FreeSurfer enforces an internal representation that is a 1 mm³
isotropic 256³ volume in "conformed COR" orientation (LIA:
`x_r=-1, y_s=-1, z_a=1` in the nomenclature of the `MRI` struct). Every
cortical-reconstruction stage assumes this geometry. `mri_convert` is
the tool that brings arbitrary input data into that representation
and, at the end of a pipeline, takes it back out to whatever format
another tool expects. It is invoked at three canonical points in
[[recon-all]]:

1. **Input ingestion** (`autorecon1`, Stage 1). Each `-i <vol>` raw
   volume is converted to MGZ:
   ```bash
   mri_convert <raw> $SUBJECTS_DIR/<subj>/mri/orig/0NN.mgz
   ```
2. **Conforming the averaged input** (`autorecon1`, Stage 1):
   ```bash
   mri_convert rawavg.mgz orig.mgz --conform
   ```
   (optionally with `--conform_min` / `--conform-dc` / `--cw256`).
3. **T2 / FLAIR ingestion** for pial-surface refinement:
   ```bash
   mri_convert --no_scale 1 <T2_raw> .../mri/orig/T2raw.mgz
   mri_convert --no_scale 1 <FLAIR_raw> .../mri/orig/FLAIRraw.mgz
   ```
   (`--no_scale 1` disables COR-format rescaling, which would
   otherwise clip 16-bit dynamic range into 8-bit.)

Outside `recon-all`, `mri_convert` is the tool users reach for when
they want to export a FreeSurfer-created volume to NIfTI for
third-party software (`mri_convert aseg.mgz aseg.nii.gz`), to apply
a FreeSurfer transform without rebuilding the pipeline
(`mri_convert -at talairach.m3z norm.mgz norm_in_atlas.mgz`), or to
perform a one-off voxel-size or orientation edit.

## Inputs

### Required Inputs

Two positional arguments:

| Position | Argument | Description |
|---------:|----------|-------------|
| 1 | `<in volume>` | Input volume in any supported format. The format is inferred from the file extension, or can be forced with `--in_type / -it`. |
| 2 | `<out volume>` | Output volume path. Format inferred from extension, or forced with `--out_type / -ot`. |

Supported input/output formats (from the `-u` help text; `I` = input
only, `O` = output only, `IO` = both):

| Keyword | Description | Direction |
|---------|-------------|-----------|
| `cor`   | MGH-NMR COR format (deprecated but still an internal "native") | IO |
| `mgh`   | MGH-NMR format (uncompressed binary) | IO |
| `mgz`   | MGH-NMR gzipped (default for `recon-all`) | IO |
| `minc`  | MNI NetCDF (output may not work) | IO |
| `analyze` / `spm` | SPM/Analyze 3-D (paired `.img` + `.hdr`) | IO |
| `analyze4d` | 4-D SPM/Analyze | IO |
| `nifti1` | NIfTI-1 with separate `.img` + `.hdr` | IO |
| `nii`   | NIfTI-1 single-file; `.nii.gz` auto-compresses | IO |
| `afni` / `brik` | AFNI BRIK/HEAD | IO |
| `bshort` / `bfloat` | MGH block-format | IO |
| `sdt`   | Varian | IO |
| `otl` / `outline` | MGH outline | IO |
| `gdf`   | GDF volume (output needs `-gis`) | IO |
| `ge` / `gelx` / `lx` / `ximg` | GE Genesis and GE LX | I |
| `siemens` / `siemens_dicom` | Siemens IMA / Siemens DICOM | I |
| `dicom` | Generic DICOM (serves DICOM directories too) | I |

### Input Assumptions

- **Coordinate system** is taken from the header. For DICOM and NIfTI
  the direction cosines are trusted; for ANALYZE (legacy SPM) they are
  assumed `RAS` if absent, unless `--force_ras_good` is passed.
- **Intensity scale** is taken from the header. For DICOM the rescale
  intercept/slope (`0028,1052` / `0028,1053`) are applied by default;
  pass `--no-rescale-dicom` to suppress.
- **4-D volumes** are passed through intact unless `--frame N`,
  `--mid-frame`, `--nskip n`, `--ndrop n`, or `--fsubsample start
  delta end` selects a sub-range.
- **DWI sidecar files** (`.bvec`, `.bval`) are auto-loaded unless
  `--no-dwi` is passed or the environment variable `FS_LOAD_DWI=0` is
  set.

> [!assumption] Trust the input header
> `mri_convert` will not try to "fix" wrong header metadata. If the
> orientation information in the input is incorrect, the output will
> be incorrect too (and in particular any L/R flip in the input will
> be preserved silently). The tool's help text explicitly warns: *"If
> it is correct, this will make it wrong!"* when describing the
> orientation-override flags (`-iid/-ijd/-ikd`, `-io/-oo`).

## Outputs

### Files Created

A single output volume is written to `<out volume>` in the format
implied by the extension (or forced by `-ot`). Additional side
effects:

| Flag | Extra output |
|------|--------------|
| `-om <file>` / `--out_matrix` | Write the output vox2ras matrix as a text file. |
| `--split` | Split a multi-frame output into `base0000.nii`, `base0001.nii`, … |
| `-gis <stem>` | GDF output uses `<stem>` as image stem. |
| `--out_stats_table` | Write a stats table (`--like <template>` required). |
| `--dcm2niix-createBIDS` | With `--dcm2niix`, emit a BIDS JSON sidecar. |
| `--dcm2niix-outdir <dir>` | Output directory for BIDS sidecars. |
| `-ii` / `-oi` | Print input / output header info to stdout. |
| `-is` / `-os` | Print input / output voxel statistics to stdout. |

### Output Specifications

- **Data type**: defaults to the same type as input, unless
  `--out_data_type <uchar|short|int|float>` is specified or the
  output format forces a type (COR always produces `uchar`; NIfTI
  picks an appropriate type based on intensity range).
- **Orientation**: preserved from input by default. `--conform`
  rewrites it to coronal LIA (`x=-R`, `y=-S`, `z=+A`). `--conform-dc`
  preserves the source direction cosines but applies the 256³ voxel
  grid.
- **Coordinate system**: the output volume's vox2ras matrix is
  recomputed whenever the geometry changes. Link to
  [[coordinate-systems]] for the full derivation.

## Mathematical Foundations

### The "conform" operation (`--conform`)

This is the most important single operation in the tool, because
every other `recon-all` stage depends on its output being in the
resulting coordinate system.

Let the input volume be $\mathbf{v}$ with voxel sizes
$(\Delta_x, \Delta_y, \Delta_z)$, matrix size $(N_x, N_y, N_z)$ and
vox2ras matrix $\mathbf{S}_\text{mri}$. The conform template
$\mathbf{T}$ is constructed with:

$$
\begin{aligned}
N_x^\text{t} &= N_y^\text{t} = N_z^\text{t} = 256, \\
\Delta_x^\text{t} &= \Delta_y^\text{t} = \Delta_z^\text{t} = 1\,\text{mm}, \\
\text{origin}_\text{vox} &= (-128,-128,-128), \\
\text{direction cosines} &= \begin{pmatrix}-1 & 0 & 0\\ 0 & 0 & -1\\ 0 & 1 & 0\end{pmatrix}
\;\text{(coronal LIA)}.
\end{aligned}
$$

The RAS centres of the source and template are set equal
(`templ->c_r = mri->c_r` etc., `utils/mri_conform.cpp:59–61`) so that
the template bounding box is aligned with the anatomical centre of
the input. The resulting output vox2ras is therefore
$\mathbf{S}_\text{templ}$, which is *independent* of the input
orientation.

The voxel values are resampled from $\mathbf{v}$ to
$\mathbf{T}$ via (`utils/mri_conform.cpp:129`)

$$
\mathbf{v}_\text{out}(i,j,k) = \mathcal{I}\!\left(\mathbf{v},\,
\mathbf{S}_\text{mri}^{-1}\,\mathbf{S}_\text{templ}\,(i,j,k)^\top\right),
$$

where $\mathcal{I}(\cdot)$ is the interpolation kernel
(`SAMPLE_TRILINEAR` unless overridden). The `-rt` / `--resample_type`
flag selects the kernel: `interpolate` (trilinear, default),
`weighted`, `nearest`, `cubic`.

> [!math] Conform with preserved direction cosines (`--conform-dc`)
> When `--conform-dc` is set, the script computes the matrix
> $\mathbf{K}$ that maps source voxel indices to template voxel
> indices such that the conformed grid is *aligned* with the original
> direction cosines and its origin is padded symmetrically:
> $$
> \text{step} = \frac{\Delta_c}{\Delta^\text{t}},\quad
> \text{pad} = \text{round}\!\left(\frac{\text{FoV}^\text{t} - \text{FoV}_c}{2\Delta^\text{t}}\right)
> $$
> for each anatomical axis $c \in \{\text{L/R}, \text{I/S}, \text{A/P}\}$.
> The signed entries of $\mathbf{K}$ depend on the letter of the
> orientation string: e.g. an `L`-facing column sets
> $K_{1,c+1}=+\text{step}$, $K_{1,4}=\text{pad}$, while an `R`-facing
> column sets $K_{1,c+1}=-\text{step}$, $K_{1,4}=\text{conform\_width}-\text{pad}$.
> The output vox2ras is then
> $\mathbf{S}_\text{templ} = \mathbf{S}_\text{mri}\, \mathbf{K}^{-1}$.
> See `utils/mri_conform.cpp:140–256`.

### `--conform_min` and `--conform_size`

- `--conform_min` (`-cm`) sets $\Delta^\text{t} = \min(\Delta_x,
  \Delta_y, \Delta_z)$ and picks $N^\text{t}$ as the smallest multiple
  of that voxel size covering the input FoV (`MRIfindMinSize()` at
  `utils/mri_conform.cpp`).
- `--conform_size <mm>` (`-cs`) sets $\Delta^\text{t}$ to a
  user-specified mm value and chooses $N^\text{t}$ via
  `MRIfindRightSize()` so that the full FoV is covered.
- `--cw256` forces $N^\text{t}=256$
  regardless of input FoV; useful when the input FoV exceeds 256 mm
  but the user wants the canonical 256³ grid (the extremes will be
  clipped). (`conform_width_256_flag` is an internal variable name in
  the source, not a CLI flag.)

### Transform application (`--apply_transform`, `-at`, `-ait`)

Given a transform file $\mathbf{M}$ (LTA, XFM, REG, or M3Z), the tool
resamples $\mathbf{v}$ into the template space by

$$
\mathbf{v}_\text{out}(i,j,k) = \mathcal{I}\!\left(
\mathbf{v},\,\mathbf{S}_\text{mri}^{-1}\,\mathbf{M}^{-1}\,\mathbf{S}_\text{out}\,(i,j,k)^\top\right).
$$

With `--apply_inverse_transform` / `-ait`, the stored matrix is
inverted before use. The output template defaults to the input
geometry, unless `-rl / --reslice_like <ref>` selects a different
reference, or `--like <ref>` applies the reference as a header
template (without re-interpolation, i.e. the geometry of the output
matches `<ref>` but the voxel grid is the one produced by the
transform).

> [!internal] Transform stack
> The actual linear-transform loading (`.lta`, `.xfm`, `.reg`,
> `.dat`) is delegated to `mri_convert.cpp` calls into
> `transform.h` / `lta.h`. The non-linear `.m3z` loading uses
> `gcamorph.h`.

## Configuration Options

The exhaustive list of ~120 flags is in `mri_convert -u`. The table
below groups them by function; less commonly used variants (e.g.
DICOM-specific knobs, GE-specific cropping) are grouped as a single
row and left to the help text for details.

### File-type and basic I/O

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--in_type <type>` / `-it` | string | auto from extension | Force the input type. |
| `--out_type <type>` / `-ot` | string | auto from extension | Force the output type. |
| `-i <vol>` / `--input_volume` | path | — | Alternate way to pass the input positional arg. |
| `-o <vol>` / `--output_volume` | path | — | Alternate way to pass the output positional arg. |
| `-ro` / `--read_only` | bool | false | Read input, do not write output (for testing). |
| `-nw` / `--no_write` | bool | false | Same as `--read_only`. |
| `-po` / `--parse_only` | bool | false | Parse CLI, do not read input. |
| `-ii` / `--in_info` | bool | false | Print input header and exit. |
| `-oi` / `--out_info` | bool | false | Print output header after conversion. |
| `-is` / `--in_stats` | bool | false | Print voxel stats of the input. |
| `-os` / `--out_stats` | bool | false | Print voxel stats of the output. |
| `-im` / `--in_matrix` | bool | false | Print the input vox2ras matrix. |
| `-om` / `--out_matrix` | bool | false | Print the output vox2ras matrix. |

### Type casting and intensity handling

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-odt <type>` / `--out_data_type` | `uchar`/`short`/`int`/`float`/`rgb` | input type | Force the output voxel type (`MRI_UCHAR`/`MRI_SHORT`/`MRI_INT`/`MRI_FLOAT`/`MRI_RGB`). |
| `-nc` / `--nochange` | bool | false | Do not change type of input to match template. |
| `-ns <0|1>` / `--no_scale <0|1>` | int | 0 | When `1`, disable the automatic rescale-to-uchar that COR (and a few other 8-bit) outputs apply. Required when converting to COR if you want to preserve dynamic range. |
| `-sc <f>` / `--scale <f>` | float | 1.0 | Multiply input intensities by `f`. |
| `-osc <f>` / `--out-scale <f>` | float | 1.0 | Multiply output intensities by `f`. |
| `--rescale <f>` | float | — | Rescale so that the global mean is `f`. |
| `--rescale-voxel c r s` | ints | — | Divide by the intensity at voxel `(c,r,s)` (combinable with `--rescale`). |
| `-ut <t>` / `--upper_thresh <t>` | float | — | Clip all voxels with intensity above `t` to `t` (`MRIupperthresholdAllFrames`, mri_convert.cpp:2148). |
| `--invert_contrast <t>` | float | -1 (off) | Invert intensities above threshold `t` via `MRIinvertContrast` (mri_convert.cpp:3441). |

### Geometry and resampling

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c` / `--conform` | bool | false | Resample to 256³ 1 mm coronal LIA. See Mathematical Foundations. |
| `-cm` / `--conform_min` | bool | false | Conform using the min of the input voxel sizes instead of 1 mm. Implies `--conform`. |
| `-cs <mm>` / `--conform_size <mm>` | float | 1.0 | Conform to the given isotropic voxel size. Implies `--conform`. |
| `--conform-dc` | bool | false | Conform while preserving source direction cosines (padded grid). Implies `--conform`. |
| `--cw256` | bool | false | Force the conform width to 256 even if the FoV does not fit. Implies `--conform`. |
| `-vs <sx> <sy> <sz>` / `--voxsize` | floats | input sizes | Upsample/downsample to the specified output voxel size. |
| `-ds <dsx> <dsy> <dsz>` / `--downsample` | 3 floats | 1 1 1 | Downsample by factor in each dimension (header-aware). Mutually exclusive with `--downsampleold`. |
| `-dsold <dsx> <dsy> <dsz>` / `--downsampleold` | 3 floats | 1 1 1 | Legacy downsampler that does not preserve the RAS centre. Mutually exclusive with `--downsample`. |
| `-ds2` / `--downsample2` | bool | false | Downsample by exactly factor 2 (averages 2x2x2 blocks). |
| `--upsample <N>` | int | — | Reduce voxel size by integer factor `N` in all three dimensions (`MRIupsampleN`). |
| `--reduce <n>` | int | 0 | Apply `MRIreduce` `n` times — successive 2:1 downsampling with a low-pass prefilter. |
| `-rt <type>` / `--resample_type` | `interpolate`/`nearest`/`vote`/`weighted`/`cubic` | `interpolate` (trilinear) | Interpolation kernel. `interpolate` = `SAMPLE_TRILINEAR`, `nearest` = `SAMPLE_NEAREST`, `vote` = `SAMPLE_VOTE` (majority vote in a neighbourhood — for label volumes), `weighted` = `SAMPLE_WEIGHTED`, `cubic` = `SAMPLE_CUBIC_BSPLINE`. Use `nearest` or `vote` for label volumes. |
| `-rl <vol>` / `--reslice_like <vol>` | path | — | Resample so the output matches the geometry of `<vol>`. |
| `-il <vol>` / `--in_like <vol>` | path | — | Use `<vol>` as the "true" input geometry (overrides input header). |
| `--like <vol>` | path | — | Output is embedded in the geometry of `<vol>` without re-interpolation (header copy). |

### Orientation and axis manipulation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-io <ostr>` / `--in_orientation` | 3-letter ostring | input header | Override the input orientation. **Only if the input header is wrong.** |
| `-oo <ostr>` / `--out_orientation` | 3-letter ostring | same as input | Force the output orientation. |
| `-iid <R A S>` / `--in_i_direction` | 3 floats | — | Override input i-axis direction cosine. |
| `-ijd` / `--in_j_direction` | 3 floats | — | Override input j-axis direction cosine. |
| `-ikd` / `--in_k_direction` | 3 floats | — | Override input k-axis direction cosine. |
| `-oid` / `--out_i_direction` | 3 floats | — | Override output i-axis direction cosine. |
| `-ojd` / `--out_j_direction` | 3 floats | — | Override output j-axis direction cosine. |
| `-okd` / `--out_k_direction` | 3 floats | — | Override output k-axis direction cosine. |
| `--sphinx` | bool | false | Re-orient for sphinx (HFS → sphinx) position; common for monkey scans. |
| `-r`/`--reorder <d1> <d2> <d3>` | ints | — | Reorder axes (e.g. `2 1 3` swaps rows and cols). |
| `-r4` / `--reorder4 <d1> <d2> <d3> <d4>` | ints | — | As above but also permutes the frame dimension (header will likely be wrong; see the help note). |
| `--shift <dim> <n> <wrap01>` | mixed | — | Shift along an axis by `n` voxels, optional wrap. |
| `--slice-reverse` | bool | false | Reverse slice order and update vox2ras. |
| `--flip-cols` | bool | false | Reverse the column index ordering only (no header update — destructive). |
| `--left-right-reverse` | bool | false | Reverse L/R in physical (RAS) space by negating the relevant column of vox2ras. |
| `--left-right-reverse-pix` | bool | false | Reverse L/R by flipping the voxel array directly (no header update — destructive; see `[!gotcha]`). |
| `--left-right-mirror <hemi>` | `lh`/`rh` | — | Replace one hemisphere of the volume with the mirror of the other (`lh` keeps the left side and overwrites the right with its mirror, `rh` vice versa). |
| `--left-right-keep <hemi>` | `lh`/`rh` | — | Zero out everything outside the named hemisphere. |
| `--left-right-swap-label` | bool | false | Swap L/R labels in aseg/aparc/aparc+aseg/wmparc using the built-in lookup. |
| `--left-right-swap-label-table <lhtable> <rhtable>` | 2 paths | — | Swap labels using user-supplied left/right LUT pair (text matrices). Implies `--left-right-swap-label`. |

### Origin, center and spacing

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-ic <R A S>` / `--in_center` | 3 floats | — | Override input RAS centre. |
| `-dic <dR dA dS>` / `--delta_in_center` | 3 floats | 0 | Add to input centre. |
| `-oc <R A S>` / `--out_center` | 3 floats | same as input | Override output RAS centre. |
| `-iis` / `--in_i_size` | float | input size | Override input i-axis voxel size (mm). |
| `-ijs` / `--in_j_size` | float | input size | Override input j-axis voxel size (mm). |
| `-iks` / `--in_k_size` | float | input size | Override input k-axis voxel size (mm). |
| `-ois` / `--out_i_size` | float | input size | Override output i-axis voxel size (mm). |
| `-ojs` / `--out_j_size` | float | input size | Override output j-axis voxel size (mm). |
| `-oks` / `--out_k_size` | float | input size | Override output k-axis voxel size (mm). |
| `-ini` / `-iic` / `--in_i_count` | int | input count | Override input matrix dimension along i-axis. |
| `-inj` / `-ijc` / `--in_j_count` | int | input count | Override input matrix dimension along j-axis. |
| `-ink` / `-ikc` / `--in_k_count` | int | input count | Override input matrix dimension along k-axis (used with `--roi` / OTL reads). |
| `-oni` / `-oic` / `--out_i_count` | int | input count | Override output matrix dimension along i-axis. |
| `-onj` / `-ojc` / `--out_j_count` | int | input count | Override output matrix dimension along j-axis. |
| `-onk` / `-okc` / `--out_k_count` | int | input count | Override output matrix dimension along k-axis. |
| `-zgez` / `--zero_ge_z_offset` | bool | false (auto for GE) | Set `c_s = 0`, appropriate for GE isocenter scans. |
| `-nozgez` / `--no_zero_ge_z_offset` | bool | false | Disable the above. |

### Frame selection (4-D data)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-f <n>` / `--frame <n> [...]` | ints | all frames | Keep only listed (0-based) frame numbers. |
| `-nth <n>` / `--nth_frame <n>` | int | -1 (all frames) | Use only frame `n` (0-based). Equivalent to `--frame n` for a single frame. |
| `--mid-frame` | bool | false | Keep only the middle frame. |
| `--nskip <n>` | int | 0 | Skip the first `n` frames. |
| `--ndrop <n>` | int | 0 | Drop the last `n` frames. |
| `--fsubsample <start> <delta> <end>` | ints | — | Regular subsampling on the time axis. |
| `--split` | bool | false | Write each frame as a separate file. |

### Transforms

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--apply_transform <file>` / `-T` / `-at` | path | — | Apply an `.xfm` / `.lta` / `.reg` / `.m3z` transform. |
| `--apply_inverse_transform <file>` / `-ait` | path | — | Apply the inverse of the transform. |
| `--devolvexfm <subjid>` | subject | — | When applying a pre-devolved transform that was computed in the subject's RAS, de-volve by the subject's Talairach transform. |
| `--autoalign <mtx>` | path | — | Read a 4x4 text matrix and store it on the output volume's `AutoAlign` slot (used downstream by registration tools). |
| `--new-transform-fname <name>` | string | — | Set the value of the MGH header's transform-filename field on the output. |
| `--delete-cmds` | bool | false | Remove the embedded command history from the output header. |
| `-so` / `--store_orig_ras2vox` | bool | false | Save the original input ras2vox matrix as a side-band attribute of the output (used to restore geometry after a reconforming step). |

### DICOM-specific

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--no-rescale-dicom` | bool | false | Do not apply DICOM rescale intercept/slope (`0028,1052`/`0028,1053`). Sets `FS_RESCALE_DICOM=0` in the environment. (Note: the complementary `--rescale-dicom` option is **commented out** in the source at `mri_convert.cpp:520–527` and does nothing; rescaling is applied by default automatically.) |
| `--no-analyze-rescale` | bool | false | Disable rescaling of ANALYZE files. Sets `FS_ANALYZE_NO_RESCALE=1`. |
| `--bvec-scanner` | bool | false | Force loaded DWI bvecs into scanner space (`FS_DESIRED_BVEC_SPACE=1`). |
| `--bvec-voxel` | bool | false | Force loaded DWI bvecs into voxel space (`FS_DESIRED_BVEC_SPACE=2`). |
| `--sdcmlist <file>` | path | — | Provide a pre-computed list of Siemens DICOM files belonging to the same run (skips directory scan). |
| `--status` / `--statusfile <file>` | path | — | Write a percent-complete progress file during Siemens DICOM read. |
| `--nslices-override <n>` | int | 0 | Override the per-mosaic slice count (sets `NSLICES_OVERRIDE`). |
| `--ncols-override <n>` | int | 0 | Override the DICOM column count (`NCOLS_OVERRIDE`). |
| `--nrows-override <n>` | int | 0 | Override the DICOM row count (`NROWS_OVERRIDE`). |
| `--mosaic-fix-noascii` | bool | false | Fix mosaic centre without reading the Siemens CSA ASCII header (`FS_MOSAIC_FIX_NOASCII=1`). |
| `--mra` | bool | false | For Siemens MRA: read slice thickness from DICOM tag `(0018,0050)` instead of `(0018,0088)`. |
| `--auto-slice-res` | bool | false | Auto-pick which slice-thickness DICOM tag to use depending on `(0018,0023)`. |
| `--first-dicom <file>` | path | — | After reading, write the path of the first DICOM in the series into `<file>`. |
| `-dicomread2` / `-dicomread0` | bool | — | Select between two C DICOM reader implementations (`UseDICOMRead2`). |
| `-siemensBVecsCross` / `-no-siemensBVecsCross` | bool | — | Toggle the Siemens DICOM bvec voxel-space code path (`FS_dcmGetDWIParamsSiemens_VoxelSpace`). |
| `-siemens-ascii-dump` / `-siemens-ascii-alt-dump` | bool | false | Dump Siemens CSA ASCII header to stdout (debug). |
| `--dcm2niix` / `-dicomread3` | bool | false | Read DICOM via the internal `dcm2niix` code path. |
| `--no-dcm2niix` | bool | true | Disable the dcm2niix code path (default). |
| `--dcm2niix-createBIDS` / `--createBIDS` | bool | false | Emit BIDS JSON sidecars (requires `--dcm2niix` and `--dcm2niix-outdir`). |
| `--dcm2niix-outdir <dir>` | path | — | BIDS sidecar output directory (requires `--dcm2niix`). |
| `--dcm2niix-no-ForceStackSameSeries` | bool | false | Disable forced stacking of slices from the same series (requires `--dcm2niix`). |
| `--dcm2niix-info-dump <file>` | path | — | Dump raw DICOM info used by dcm2niix (requires `--dcm2niix`). |
| `--dcm2niix-dicom-flist <file>` | path | — | Provide a pre-built DICOM file list to dcm2niix. |
| `--dcm2niix-singlefile` | bool | false | Tell dcm2niix to read only the single file passed as input. |
| `--dcm2niix-opts <str>` | string | — | Extra raw option string forwarded to dcm2niix. |

### Segmentation-specific

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-fp` / `--fill_parcellation` | bool | false | Fill a parcellation volume with label values. |
| `-sp` / `--smooth_parcellation` | bool | false | Smooth a parcellation with a label-aware filter. |
| `-zo` / `--zero_outlines` | bool | false | Zero the outlines of a parcellation. |
| `-cf` / `--color_file <file>` | path | — | [[color-lut|Color lookup table]] for labels. |
| `--ctab <file>` | path | — | Embed a colortable into the output volume. `--ctab remove` deletes an embedded table. |
| `--no-ctab` / `--remove-ctab` | bool | false | Delete an embedded colortable. |
| `--erode-seg N` | int | — | Erode segmentation by `N` 6-connected iterations. |
| `--dil-seg N` | int | — | Dilate segmentation by `N` iterations. |
| `--dil-seg-mask <file>` | path | — | Dilate segmentation into the specified mask. |
| `-roi` / `--roi` | bool | false | Read a GE ROI file (`MRIreadGeRoi`). Input must be in GE format; `--in_k_count` or `--in_like` is required to supply the slice depth. |

### Smoothing and cropping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fwhm <mm>` | float | — | Smooth with a Gaussian of the given FWHM. Mutually exclusive with `--antialias`. |
| `--antialias` | bool | false | Auto-pick an FWHM per dimension from the input/output voxel ratios. |
| `--slice-bias <alpha>` | float | — | Apply a half-cosine bias field along slice. |
| `--crop <x> <y> <z>` | ints | — | Crop to a 256-voxel cube around `(x,y,z)`. |
| `--cropsize <dx> <dy> <dz>` | ints | — | Crop to the given size. |
| `--cutends <n>` | int | 0 | Remove `n` slices from the ends. |
| `--slice-crop <s_start> <s_end>` | ints | — | Keep slices in the given range. |

### Stats tables

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--in_stats_table` | bool | false | Input is a `asegstats2table` / `aparcstats2table` CSV. |
| `--out_stats_table` | bool | false | Output a stats table (needs `--like <template>`). |

### Miscellaneous

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-tr <ms>`, `-te <ms>`, `-TI <ms>`, `-flip_angle <rad>` | floats | — | Override the pulse-sequence metadata in the output header. |
| `-oval <v>` / `--outside_val <v>` | int | 0 | Value assigned to voxels that fall outside the image after a transform/resample. |
| `--no-dwi` | bool | false | Do not try to load `.bvec`/`.bval` (sets `FS_LOAD_DWI=0`). |
| `--force_ras_good` | bool | false | Assume the input is RAS when orientation info is missing. Mutually exclusive with `-iid`/`-ijd`/`-ikd`. |
| `-sn <name>` / `--subject_name` | string | — | Embed the subject name in the MGH header. |
| `-nt` / `--no_translate` | bool | true (translate on) | Disable translation of label values via the `--color_file` LUT. |
| `--ascii` | bool | false | Write a plain-text dump of the volume (one value per line, columns-fastest). Forces output type. |
| `--ascii+crsf` | bool | false | Same but each line contains `col row slice frame value`. |
| `--ascii-fcol` | bool | false | Same but with the frame column varying fastest. |
| `-tt <type>` / `--template_type <type>` | string | — | Force the template-volume file type when used with `--reslice_like`/`--like`. |
| `-ti <vol>` / `--template_info <vol>` | path | — | Dump header info for `<vol>` and exit. |
| `-gis <stem>` / `--gdf_image_stem <stem>` | string | — | GDF image stem (required for GDF output). |
| `-cg` / `--crop_gdf` | bool | false | Enable GDF cropping (`mriio_set_gdf_crop_flag`). |
| `--bfile-little-endian` | bool | false | Treat bshort/bfloat input as little-endian (`BFILE_LITTLE_ENDIAN=1`). |
| `--in_nspmzeropad <n>` | int | -1 (auto, 3 for SPM) | Number of zero-pad digits in input SPM/Analyze filenames. |
| `--nspmzeropad <n>` / `--out_nspmzeropad <n>` | int | — | Number of zero-pad digits in output SPM/Analyze filenames. |
| `--no-strip-pound` | bool | false | Do not strip a trailing `#frame` selector from filenames (`MRIIO_Strip_Pound=0`). |
| `--nthreads <n>` / `--threads <n>` | int | 1 | Set OpenMP thread count (no effect if not built with OpenMP). |
| `--debug` | bool | false | Verbose debug output. |
| `--diag <n>` | int | — | Set the global `Gdiag_no` voxel for diagnostic prints. |
| `--diag-debug` | bool | false | OR `DIAG_INFO` into the `Gdiag` mask. |
| `-version2` | bool | — | Print "version 2" exit code (97); used by build scripts. |
| `-u` / `-h` / `--help` / `--usage` | bool | — | Print help text and exit. |

## Configuration Interactions

`mri_convert` has enough flags that a few combinations are worth
spelling out explicitly.

> [!gotcha] `-cm` requires `-c`
> `--conform_min` on its own is a no-op. The parser at
> `mri_convert.cpp:1665` explicitly errors out when `conform_min` is
> set without `conform_flag`:
> *"In order to use -cm (--conform_min), you must set -c (--conform)
> at the same time."*
> The wrapper flags in `recon-all` always pair them correctly, but
> scripts calling `mri_convert` directly commonly miss this.

> [!gotcha] `--conform` and `--conform-dc` are mutually informative
> `--conform` rewrites the direction cosines to coronal LIA. Adding
> `--conform-dc` preserves the source direction cosines but still
> enforces the 256³ × 1 mm grid. You cannot combine them to get both
> behaviours; the `-dc` variant wins.

> [!gotcha] `--apply_transform` to COR/`-c` cascades
> When `-c`/`--conform` *and* `--apply_transform` are both specified,
> the conform step runs *first* (building the 256³ template) and the
> transform is then applied in the conformed geometry. This is what
> you usually want (e.g. `mri_convert -c -at talairach.m3z orig.mgz
> orig_in_atlas.mgz`), but it means any per-voxel stats from `-is` /
> `-os` will reflect the final conformed + warped volume, not the
> intermediate.

> [!gotcha] COR output forces `--conform`
> At `mri_convert.cpp:1818–1821`, if the output type is `cor`, the
> parser unconditionally sets `conform_flag = TRUE`. There is no way
> to write a non-conformed COR volume with this tool.

> [!gotcha] `--antialias` requires `--voxsize`
> The parser at `mri_convert.cpp:1644` errors out unless
> `--voxsize` is supplied alongside `--antialias`. The auto-FWHM
> calculation needs the target voxel size to compute the
> per-dimension Gaussian widths.

> [!gotcha] `--antialias` and `--fwhm` are mutually exclusive
> Setting both raises an error at `mri_convert.cpp:1650`. Use
> `--antialias` to let the tool compute FWHM from the in/out voxel
> ratios, or `--fwhm <mm>` to set it explicitly.

> [!gotcha] `--downsample` and `--downsampleold` are mutually exclusive
> Enforced at `mri_convert.cpp:1672`. --downsampleold does not
> update the RAS centre and is only kept for backward compatibility.

> [!gotcha] --force_ras_good cannot be combined with direction overrides
> Enforced at `mri_convert.cpp:1658`: if any of `-iid`/`-ijd`/`-ikd`
> is set, `--force_ras_good` is rejected.

> [!gotcha] `--out_stats_table` requires `--like`
> Enforced at `mri_convert.cpp:1741`: passing --out_stats_table
> without `--like <template>` is a fatal error, because the column
> and row headers must come from the template stats table.

> [!gotcha] `--dcm2niix-*` flags require `--dcm2niix`
> Enforced at `mri_convert.cpp:1632`: passing
> `--dcm2niix-outdir`, `--dcm2niix-createBIDS`,
> `--dcm2niix-no-ForceStackSameSeries` or `--dcm2niix-info-dump`
> without enabling the dcm2niix code path is a fatal error.
> In addition, `--dcm2niix-createBIDS` requires
> `--dcm2niix-outdir <dir>` (line 1638).

> [!gotcha] `--no_scale 1` is mandatory for 16-bit → COR
> The COR format is 8-bit. Without `--no_scale 1`, `mri_convert`
> rescales the input dynamic range into `uint8`, which destroys
> information. `recon-all`'s T2/FLAIR ingestion commands
> (`scripts/recon-all:1286–1310`) always pass `--no_scale 1` for this
> reason.

> [!gotcha] Orientation flags can silently break L/R
> Every orientation-override flag (`-iid`, `-io`, `-oo`, `--sphinx`,
> `--left-right-reverse-pix`, `--reorder`) is a direct edit of the
> header and will produce an incorrect volume if the input was
> actually correct. The help text's warning *"KNOW WHAT YOU ARE
> DOING!!"* is literal. Use [[mri_info]] or [[freeview]] to inspect
> before and after.

> [!gotcha] `-odt uchar` + non-normalised input clips hard
> Forcing `uchar` output without `--rescale` or `--scale` will
> truncate anything above 255. Pair with `--rescale` or `--scale` to
> keep dynamic range.

> [!gotcha] Non-linear `.m3z` is not inverted by `-ait`
> The `--apply_inverse_transform` flag inverts the *linear* part of
> any transform. For a non-linear `.m3z` warp, the linear component
> is inverted but the deformation field itself is not; use
> `mri_vol2vol --inv-morph` or `GCAMinvert()` via a dedicated tool
> for a true inverse warp.

## Typical Use Cases

### Use case 1: DICOM series → MGZ (`recon-all` input)

```bash
mri_convert /path/to/dicom/001.dcm $SUBJECTS_DIR/sub-01/mri/orig/001.mgz
```

`mri_convert` autodetects DICOM from the extension. If the first file
is a Siemens mosaic, the entire series is collected
automatically. The rescale intercept/slope from tags
`(0028,1052)` / `(0028,1053)` is applied.

### Use case 2: Conform a raw T1 for `recon-all`

```bash
mri_convert rawavg.mgz orig.mgz --conform
```

This is the exact command that `recon-all` runs in Stage 1
(`scripts/recon-all:1534`). The output is 256³ 1 mm³ coronal LIA in
MGZ format.

### Use case 3: Conform to the input voxel size (hi-res)

```bash
mri_convert rawavg.mgz orig.mgz --conform_min
```

`recon-all -cm` turns this on. Appropriate for submillimetre T1 data
where downsampling to 1 mm would waste resolution.

### Use case 4: Export an aseg to NIfTI

```bash
mri_convert aseg.mgz aseg.nii.gz -rt nearest
```

`-rt nearest` is essential — any interpolation on a label volume
produces bogus intermediate labels. The output is a single-file
compressed NIfTI-1.

### Use case 5: Apply a Talairach transform to a volume

```bash
cd $SUBJECTS_DIR/sub-01/mri
mri_convert orig.mgz orig_in_mni305.mgz \
    --apply_transform transforms/talairach.xfm \
    --devolvexfm sub-01 \
    -oc 0 0 0
```

The `--devolvexfm` flag is needed because `talairach.xfm` is stored
with the subject's native RAS as the source, and `-oc 0 0 0` moves
the output centre to the atlas origin. Verify with:

```bash
tkmedit -f $SUBJECTS_DIR/sub-01/mri/orig.mgz \
        -aux orig_in_mni305.mgz
```

### Use case 6: Extract a single frame from a 4-D BOLD series

```bash
mri_convert fmri.nii.gz frame0.nii.gz --frame 0
```

or `--mid-frame` for the middle volume.

### Use case 7: Upsample a low-resolution volume to 0.5 mm³

```bash
mri_convert lowres.mgz hires.mgz -vs 0.5 0.5 0.5 -rt cubic
```

Use cubic interpolation for continuous intensities; use `nearest`
for labels.

### Use case 8: Force NIfTI1 output to 8-bit

```bash
mri_convert in.mgz out.nii --out_data_type uchar --rescale 128
```

The `--rescale 128` moves the global mean to 128 before the 8-bit
cast, minimising clipping.

### Use case 9: Left-right swap a label volume

```bash
mri_convert aseg.mgz aseg_lrswap.mgz --left-right-swap-label
```

Works on `aseg`, `aparc`, `aparc+aseg`, `wmparc`. For arbitrary
label volumes with custom LUTs, use
`--left-right-swap-label-table <lhtable> <rhtable>` instead.

## Pipeline Context

`mri_convert` is called in many places in [[recon-all]]:

- **Stage 1 (Motion Correction)**: input volume conversion
  (`recon-all:1242`), optional T2/FLAIR conversion
  (`recon-all:1287,1299`), custom brain mask conversion
  (`recon-all:1324`), and the `--conform` step producing `orig.mgz`
  (`recon-all:1534`).
- Outside of `recon-all`, it is the universal entry point for any
  conversion into or out of FreeSurfer's MGZ representation.

**Predecessor:** raw input (DICOM, NIfTI, …) → **mri_convert** →
**Successor:** `mri_robust_template` (for motion correction) or
directly [[mri_nu_correct.mni]] (for the Talairach pre-pass in
autorecon1 Stage 2/3).

## Error Compensation and Guard Rails

- **Missing orientation information**: with `--force_ras_good`, the
  tool falls back to a canonical RAS orientation instead of erroring.
  Otherwise the tool will error on an ambiguous header.
- **Wrong voxel size in source header**: `-iis/-ijs/-iks` can override
  the input voxel sizes before resampling.
- **Non-isotropic input to `--conform`**: the source is silently
  resampled to 1 mm (or to `min(Δ)` with `-cm`), which can noticeably
  smooth sharp features. This is a side effect of the canonical
  FreeSurfer pipeline; if you care about preserving the input
  resolution use `-cm` or `-cs <Δ>`.
- **COR format output**: always conformed, always `uint8`.
- **DICOM rescale**: applied by default; disable with
  `--no-rescale-dicom` only if you have a reason to mistrust the
  header.
- **COR rescaling to uint8**: use `--no_scale 1` to preserve dynamic
  range when writing COR (or any format where the rescale is
  inappropriate).

## Related Tools

- [[mri_info]] — inspect the header of a volume (used alongside
  `mri_convert -ii`).
- `mri_vol2vol` — resample a volume using a registration matrix
  without re-interpreting the header; better choice than `mri_convert
  --apply_transform` when the goal is registration-based resampling
  rather than format conversion.
- `mri_robust_template` — used by `recon-all` Stage 1 to motion-
  correct multiple runs before conforming with `mri_convert`.
- `mri_add_xform_to_header` — stamps a transform path into the
  output header (used by `recon-all` to pre-populate `talairach.xfm`
  before Talairach actually runs).
- `mris_convert` — the surface-equivalent tool for surface (`.pial`,
  `.white`, `.sphere`) files.
- [[mri_concat]] — join multiple volumes along the frame dimension
  (the 4-D complement to `mri_convert`).
- [[mri_nu_correct.mni]] — the immediate downstream consumer of
  conformed `orig.mgz` in `recon-all` autorecon1.
- [[mgz]] — FreeSurfer's native MGH/MGZ volume format.
- [[coordinate-systems]] — definitions of the RAS conventions used
  here.

## Confidence and Gaps

- **High confidence**: format conversion, conform behaviour (the
  `utils/mri_conform.cpp` implementation was read in full), and the
  main flag parser (`mri_convert.cpp:495–580`).
- **Medium confidence**: the exact interaction between `--reslice_like`,
  `--like`, `--conform` and `--apply_transform` across the 1801–2930
  range of `mri_convert.cpp`; corner cases (e.g. `--conform` with
  `--out_data_type float`) may behave differently from expected.
- **Low confidence**: the behaviour of the `--dcm2niix*` flags, since
  the internal dcm2niix integration is a separate vendored tree.

> [!gap] `--apply_transform` + `.m3z` + `--devolvexfm`
> The interaction between applying a non-linear `.m3z` transform and
> de-volving by a subject-specific Talairach transform is not
> explicitly documented in the source and has known corner cases on
> the mailing list. Needs a dedicated worked example.

> [!gap] `--ctab remove` behaviour on non-aseg volumes
> The help text says that `--ctab remove` deletes any embedded
> colortable. It is not clear from the code whether this also
> affects the data-type of the output. Needs verification.

## References

- Source: `$FREESURFER_SOURCE/mri_convert/mri_convert.cpp`,
  `utils/mri_conform.cpp` (FreeSurfer 8.2.0)
- Help text: `mri_convert -u` (606 lines, captured 2026-04-14)
- FreeSurfer wiki: <https://surfer.nmr.mgh.harvard.edu/fswiki/mri_convert>
  (accessed 2026-04-14)
- FreeSurfer wiki on coordinate conventions:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/CoordinateSystems>
- Original author: Christian Haselgrove (conform code comments,
  `utils/mri_conform.cpp:6`)
