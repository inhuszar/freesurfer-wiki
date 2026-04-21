---
title: "mri_vol2vol"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_vol2vol/mri_vol2vol.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mri_warp_convert]]"
  - "[[mri_binarize]]"
  - "[[mri_info]]"
  - "[[mgz]]"
  - "[[talairach_avi]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The --gcam compound transform mode documentation needs verification."
  - "The --spm-warp interaction with movlta=0 edge case needs testing."
  - "Behaviour of --keep-precision combined with --cubic interpolation is unverified."
tags:
  - resampling
  - registration
  - transforms
  - functional-mri
  - coordinates
---

# mri_vol2vol

## Summary

`mri_vol2vol` resamples a volume into another field-of-view (FOV) by applying a registration or warp transform. It supports all major FreeSurfer-compatible registration formats (tkregister `.dat`, LTA `.lta`, FSL `.fsl`, MNI `.xfm`), linear and non-linear transforms (`.m3z` morphs, SPM warp fields), and multiple interpolation methods. It is one of the most widely used FreeSurfer post-processing tools, essential for mapping functional data into anatomical or standard spaces.

## Source Information

- **Language:** C++
- **Source file:** `mri_vol2vol/mri_vol2vol.cpp`
- **Original author:** Doug Greve (MGH)

## Purpose and Context

After acquiring functional or other MRI data, it is frequently necessary to resample data from one coordinate space to another — for example, mapping a functional volume into a subject's anatomical space, or from anatomical space into Talairach (MNI305) or MNI152 space. `mri_vol2vol` is the primary tool for this in FreeSurfer, designed to work alongside `tkregister2`.

Key use cases:
1. Apply an fMRI-to-anatomy registration to bring functional data into anatomical space
2. Resample a volume into Talairach/MNI space using the subject's talairach.xfm
3. Apply non-linear warps (m3z morphs or SPM warp fields)
4. Downsample or crop a volume while updating the vox2ras matrix

## Inputs

| Flag | Description |
|------|-------------|
| `--mov movvol` | Moving (input) volume or output geometry template when `--inv` is set |
| `--targ targvol` | Target geometry template, or input if `--inv` is set |
| `--reg register.dat` | tkRAS-to-tkRAS registration matrix (tkregister2 format) |
| `--lta register.lta` | Linear Transform Array |
| `--lta-inv register.lta` | LTA, applied inverted |
| `--fsl register.fsl` | FSL FLIRT fslRAS-to-fslRAS matrix |
| `--xfm register.xfm` | Scanner RAS-to-Scanner RAS MNI-style matrix |
| `--m3z morph` | Non-linear warp in `.m3z` format |

## Outputs

| Flag | Description |
|------|-------------|
| `--o outvol` | Resampled output volume (default float precision) |
| `--disp dispvol` | Displacement volume |
| `--reg-final regfinal.dat` | Final registration after optional rotation/translation adjustments |

## Mathematical Foundations

For linear transforms, the resampling maps each output voxel $(c_{\text{targ}}, r_{\text{targ}}, s_{\text{targ}})$ to source voxel coordinates via the transformation chain:

$$
\begin{pmatrix} x_{\text{mov}} \\ y_{\text{mov}} \\ z_{\text{mov}} \end{pmatrix} = M_{\text{mov}}^{-1} \cdot R^{-1} \cdot M_{\text{targ}} \begin{pmatrix} c_{\text{targ}} \\ r_{\text{targ}} \\ s_{\text{targ}} \\ 1 \end{pmatrix}
$$

where $M_{\text{mov}}$ and $M_{\text{targ}}$ are the respective vox2ras matrices and $R$ is the registration matrix.

For the `--tal` (Talairach/MNI305) mode, the transformation is computed as:

$$
T = R \cdot X_{\text{tal}}^{-1} \cdot R_{\text{tal}}^{-1}
$$

where $X_{\text{tal}}$ is the `talairach.xfm` matrix, $R$ is the registration matrix, and $R_{\text{tal}}$ maps from the full MNI305 COR FOV to the sub-FOV.

**Interpolation methods:**
- `trilin` (default): trilinear interpolation — smoothest, recommended for continuous data
- `nearest`: nearest-neighbour — preserves integer labels; use for segmentation volumes
- `cubic`: cubic B-spline — higher order, better frequency response but slower

**Fill modes (for upsampling targets):**
- `--fill-average`: mean of all source voxels contributing to a target voxel
- `--fill-conserve`: sum (conserves total signal)

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--mov` | `movvol` | Input volume |
| `--targ` | `targvol` | Target geometry template |
| `--o` | `outvol` | Output volume |
| `--reg` | `register.dat` | tkRAS-to-tkRAS registration (tkregister2) |
| `--lta` | `register.lta` | LTA transform |
| `--lta-inv` | `register.lta` | LTA transform, inverted |
| `--fsl` | `register.fsl` | FSL FLIRT matrix |
| `--xfm` | `register.xfm` | MNI-style ScannerRAS matrix |
| `--regheader` | — | Identity ScannerRAS transform |
| `--mni152reg` | — | Target MNI152 (requires FSL) |
| `--s` | `subject` | Use identity matrix and set templates from subject |
| `--inv` | — | Invert the transform direction |
| `--tal` | — | Map to MNI305 sub-FOV (with `--reg`) |
| `--talres` | `resolution` | Set Talairach output resolution: 1 or 2 (default 2) |
| `--talxfm` | `xfmfile` | Use alternative xfm file (default: `talairach.xfm`) |
| `--m3z` | `morph` | Non-linear morph in m3z format |
| `--noDefM3zPath` | — | Use morph name as-is, not from default transforms directory |
| `--inv-morph` | — | Invert the m3z morph |
| `--fstarg` | `[vol]` | Use vol from subject's directory as target (default: `orig.mgz`) |
| `--trilin` | — | Trilinear interpolation (default) |
| `--nearest` | — | Nearest-neighbour interpolation |
| `--cubic` | — | Cubic B-spline interpolation |
| `--interp` | `method` | Interpolation: `trilin`, `nearest`, or `cubic` |
| `--fill-average` | — | Average source voxels into each target voxel |
| `--fill-conserve` | — | Sum source voxels (conserves signal) |
| `--fill-upsample` | `USF` | Upsampling factor for fill modes (default 2) |
| `--mul` | `mulval` | Multiply output by scalar |
| `--vsm` | `vsmvol [pedir]` | Apply voxel shift map for EPI distortion correction |
| `--precision` | `precisionid` | Output precision: `uchar`, `short`, `int`, `long`, `float` |
| `--keep-precision` | — | Use input precision for output |
| `--no-resample` | — | Change vox2ras without resampling |
| `--rot` | `Ax Ay Az` | Apply rotation (degrees) to registration matrix |
| `--trans` | `Tx Ty Tz` | Apply translation (mm) to registration matrix |
| `--shear` | `Sxy Sxz Syz` | Apply shear to registration matrix |
| `--synth` | — | Replace input with white Gaussian noise (for testing) |
| `--downsample` | `N1 N2 N3` | Downsample input by given factors |
| `--crop` | `scale` | Crop and change voxel size by scale factor |
| `--slice-crop` | `sS sE` | Crop output slices to range [sS, sE] |
| `--slice-reverse` | — | Reverse slice order and update vox2ras |
| `--seed` | `seed` | Seed for `--synth` |
| `--save-reg` | — | Save output volume registration matrix |
| `--kernel` | — | Save trilinear interpolation kernel instead of image |
| `--debug` | — | Enable debug output |
| `--version` | — | Print version |
| `--help` | — | Print full help |

## Configuration Interactions

- `--reg` / `--lta` / `--fsl` / `--xfm` / `--regheader` / `--mni152reg` / `--s` are mutually exclusive registration sources — only one should be specified.
- `--tal` requires `--reg`. It implicitly sets the target volume to `mni305.cor.subfovV.mgz` and must not have `--targ` specified.
- `--mni152reg` requires FSL to be installed and sets the target implicitly; do not supply `--targ`.
- `--inv` swaps the roles of `--mov` and `--targ`: the output geometry comes from `--mov`, and `--targ` is resampled.
- `--lta-inv` and `--inv` with `--lta` may produce different results when `--fstal` is also specified.
- `--fill-average` / `--fill-conserve` enable fill modes and implicitly use `--fill-upsample 2` by default.
- `--downsample N1 N2 N3` internally sets `--fill-average`, `--fill-upsample 2`, and `--regheader`; do not specify `--targ` or a separate registration.
- `--no-resample` only modifies the vox2ras matrix in the header; pixels are not interpolated.
- `--rot`, `--trans`, `--shear` add perturbations to the registration matrix — intended for sensitivity analysis, not routine use.
- `--synth` replaces the input data; useful for testing interpolation kernels independently of data.

## Typical Use Cases

```bash
# 1. Resample functional data into anatomical space
mri_vol2vol \
    --mov fmri.nii.gz \
    --targ $SUBJECTS_DIR/bert/mri/orig.mgz \
    --reg register.dat \
    --o fmri_in_anat.mgz

# 2. Resample anatomical data into Talairach (MNI305) space at 2mm
mri_vol2vol \
    --mov $SUBJECTS_DIR/bert/mri/orig.mgz \
    --reg $SUBJECTS_DIR/bert/mri/transforms/register.dat \
    --tal --talres 2 \
    --o bert_in_tal_2mm.mgz

# 3. Resample using FSL FLIRT registration matrix
mri_vol2vol \
    --mov subject_T1.nii.gz \
    --targ template.nii.gz \
    --fsl flirt_output.mat \
    --o subject_in_template.nii.gz

# 4. Apply non-linear m3z morph
mri_vol2vol \
    --mov $SUBJECTS_DIR/bert/mri/orig.mgz \
    --m3z $SUBJECTS_DIR/bert/mri/transforms/talairach.m3z \
    --o bert_warped.mgz

# 5. Resample a segmentation (use nearest-neighbour)
mri_vol2vol \
    --mov $SUBJECTS_DIR/bert/mri/aseg.mgz \
    --targ template.mgz \
    --reg register.dat \
    --nearest \
    --o aseg_in_template.mgz

# 6. Downsample input by 2x in all dimensions
mri_vol2vol \
    --mov highres.mgz \
    --downsample 2 2 2 \
    --o lowres.mgz
```

## Pipeline Context

`mri_vol2vol` is not called directly by `recon-all` during standard cortical reconstruction. It is widely used in post-processing workflows:

- **fMRI preprocessing:** apply EPI-to-anatomy registration from `bbregister`
- **Group studies:** bring individual maps into Talairach or MNI152 space
- **Atlas operations:** warp template labels into subject space using `--inv`
- Works in conjunction with [[talairach_avi]] (which generates the xfm file) and `bbregister` (which generates the `.dat` file)

## Gotchas and Caveats

> [!gotcha] --tal uses MNI305, not true Talairach
> Despite the flag name, `--tal` resamples into MNI305 space (often called "Talairach" in FreeSurfer documentation), not the original Talairach 1988 atlas space. The "talairach.xfm" file maps to MNI305 with minor corrections. See [[coordinate-systems]] for details.

> [!gotcha] FSL standard volumes cannot be used as mov/targ
> Files from `$FSLDIR/etc/standard` lack proper geometry information. FreeSurfer and FSL interpret these differently, causing incorrect results. Use subject-specific volumes as mov/targ when using `--fsl`.

> [!gotcha] Default output precision is float
> Regardless of input precision, output defaults to float. Use `--keep-precision` to avoid converting integer segmentation volumes to float.

> [!gotcha] --no-resample only changes the header
> Specifying `--no-resample` modifies only the vox2ras matrix in the output header — no pixel resampling occurs. The data values are identical to the input, but the geometry metadata is changed.

> [!gotcha] Register.dat format assumption
> The `--reg` file must have the same geometry as the `--mov` volume passed to `tkregister2`. Geometry mismatch between the `.dat` file and `--mov` will produce silently wrong results.

## Related Tools

- [[mri_convert]] — format conversion (no spatial transform)
- [[mri_warp_convert]] — converts between warp formats before applying with mri_vol2vol
- [[talairach_avi]] — generates the `talairach.xfm` consumed by `--tal`
- [[mri_em_register]] — generates LTA transforms used by `--lta`
- [[coordinate-systems]] — explains tkRAS, ScannerRAS, MNI305 spaces

## Confidence and Gaps

**High confidence:** complete flag list (from BEGINUSAGE block in source), transform chain mathematics (from help text and code), interpolation modes, gotchas (from help text).

> [!gap] --gcam mode
> The `--gcam mov srclta gcam dstlta vsm interp out` compound transform mode is documented in the usage block but its interaction with other flags was not traced in detail.

> [!gap] --spm-warp edge case
> When `movlta=0` in `--spm-warp` mode, the input is assumed to share a RAS space with the VBM input — the exact handling of this edge case was not fully verified.
