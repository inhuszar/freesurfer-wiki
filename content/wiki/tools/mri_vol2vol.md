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
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mri_warp_convert]]"
  - "[[mri_binarize]]"
  - "[[mri_info]]"
  - "[[mgz]]"
  - "[[talairach_avi]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The --gcam compound transform mode documentation needs verification."
  - "The --spm-warp interaction with movlta=0 edge case needs testing."
  - "Behaviour of --keep-precision combined with --cubic interpolation is unverified."
  - "--filter flag sets an internal setfilter=1 variable but its downstream effect was not traced."
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

### Input / Output

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mov` | `movvol` | — | Input volume (or output geometry template with `--inv`) |
| `--targ` | `targvol` | — | Output geometry template (or input with `--inv`) |
| `--o` | `outvol` | — | Output volume |
| `--out` | `outvol` | — | Alias for `--o` |
| `--disp` | `dispvol` | — | Write displacement volume instead of (or in addition to) resampled output |
| `--reg-final` | `regfinal.dat` | — | Write final registration matrix after `--rot`/`--trans` perturbations (before `--inv`) |

### Registration Sources (mutually exclusive)

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--reg` | `register.dat` | — | tkRAS-to-tkRAS registration matrix (tkregister2 `.dat` format); subject name read from file |
| `--lta` | `register.lta` | — | Linear Transform Array (`.lta`); geometry read from file |
| `--lta-inv` | `register.lta` | — | LTA applied inverted; may differ from `--lta --inv` when `--tal` is also set |
| `--fsl` | `register.fsl` | — | FSL FLIRT fslRAS-to-fslRAS matrix |
| `--fslreg` | `register.fsl` | — | Alias for `--fsl` |
| `--xfm` | `register.xfm` | — | MNI-style ScannerRAS-to-ScannerRAS matrix; implicitly sets `--regheader` |
| `--regheader` | — | off | Identity ScannerRAS-to-ScannerRAS transform (same as `--xfm` with identity matrix) |
| `--mni152reg` | — | off | Target MNI152 space; requires FSL; implicitly sets target to `$FSLDIR/data/standard/MNI152_T1_2mm.nii.gz`; do not supply `--targ` |
| `--s` | `subject` | — | Set registration to identity and derive geometry templates from subject's directory |
| `--subject` | `subject` | — | Alias for `--s` |

### Transform Inversion / Direction

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--inv` | — | off | Invert transform direction: `--targ` becomes input, `--mov` becomes output geometry template |

### Talairach (MNI305) Mode

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--tal` | — | off | Map to MNI305 sub-FOV; requires `--reg`; do not supply `--targ` (implicitly set to `mni305.cor.subfovV.mgz`) |
| `--talres` | `resolution` | `2` | Output voxel size: `1` or `2` (mm); used with `--tal` |
| `--talxfm` | `xfmfile` | `talairach.xfm` | Alternative xfm file (looked up in `mri/transforms/` of the subject from `--reg`) |

### Non-linear Morphs

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--m3z` | `morph` | `talairach.m3z` | Non-linear morph in `.m3z` format |
| `--noDefM3zPath` | — | off | Use morph path as-is; do not prepend subject's `mri/transforms/` directory |
| `--inv-morph` | — | off | Compute and apply the inverse of the m3z morph; also sets `--inv` |
| `--morph` | — | off | Apply subject's spherical morph; implicitly sets `--fstarg` |

### Target Volume Selection

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fstarg` | `[vol]` | `orig.mgz` | Use `vol` from the subject in `--reg` as target; defaults to `orig.mgz` if no argument given |
| `--sd` | `subjects_dir` | `$SUBJECTS_DIR` | Override SUBJECTS_DIR for locating subject directories |

### Interpolation

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--trilin` | — | (default) | Trilinear interpolation |
| `--nearest` | — | — | Nearest-neighbour interpolation; use for segmentation/label volumes |
| `--cubic` | — | — | Cubic B-spline interpolation |
| `--interp` | `method` | `trilinear` | Interpolation method: `trilin`, `nearest`, or `cubic` |

### Fill / Upsampling Modes

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fill-average` | — | off | Compute mean of all source voxels within each target voxel; uses `--fill-upsample` |
| `--fill-conserve` | — | off | Compute sum of all source voxels within each target voxel (conserves total signal) |
| `--fill-upsample` | `USF` | `2` | Source upsampling factor for `--fill-average` and `--fill-conserve` |
| `--downsample` | `N1 N2 N3` | — | Downsample input by given integer factors (3 values); implicitly sets `--fill-average`, `--fill-upsample 2`, and `--regheader`; do not supply `--targ` or a registration flag |

### Geometry Operations

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--crop` | `scale` | — | Crop input to non-zero bounding box and reduce voxel size by `scale` (e.g. `2` halves voxel size) |
| `--slice-crop` | `sS sE` | — | Crop output slices to range `[sS, sE]`; updates geometry |
| `--slice-reverse` | — | off | Reverse slice order and update vox2ras matrix |
| `--slice-bias` | `alpha` | — | Apply a half-cosine bias field with exponent `alpha` along the slice direction |
| `--no-resample` | — | off | Change vox2ras matrix in output header only; no pixel resampling is performed |
| `--no-resample-scale` | `scale` | — | Change vox2ras using `scale=voxsize`; no pixel resampling performed; sets `FS_SetVoxToRasXform_Change_VoxSize` environment variable |

### EPI Distortion Correction (VSM)

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--vsm` | `vsmvol [pedir]` | — | Apply voxel shift map for EPI unwarping; `pedir`: ±1=±x, ±2=±y, ±3=±z; default pedir=+2 (y) |
| `--vsm-pedir` | `pedir` | `+2` | Phase-encode direction for VSM: ±1=±x, ±2=±y, ±3=±z |
| `--vsm-reg` | `vsmlta` | — | LTA mapping from VSM space to the (distorted) movable space |

### Registration Perturbations

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--rot` | `Ax Ay Az` | `0 0 0` | Apply rotation (degrees) about x, y, z axes to registration matrix |
| `--trans` | `Tx Ty Tz` | `0 0 0` | Apply translation (mm) to registration matrix |
| `--shear` | `Sxy Sxz Syz` | `0 0 0` | Apply shear to registration matrix (Sxz is in-plane) |

### Output Precision

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--precision` | `precisionid` | `float` | Output voxel type: `uchar`, `short`, `int`, `long`, or `float` |
| `--keep-precision` | — | off | Use the same voxel type as the input volume |

### Output Metadata

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mul` | `mulval` | — | Multiply all output voxels by scalar `mulval` |
| `--copy-ctab` | — | off | Copy colour table from input header to output; sets `FS_COPY_HEADER_CTAB=1` |
| `--ctab` | `ctabfile` | — | Embed a colour table from `ctabfile` into the output header (overrides any existing embedded ctab) |
| `--nomr` | — | off | Preserve input MR parameters (TR, TI, TE, flip angle) in output rather than copying from template; this is the **default** behaviour since FS 8.x |
| `--mr` | — | — | Copy MR parameters (TR, TI, TE, flip angle) from the target template volume into output instead of preserving input values |

### Registration Cost

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--cost` | `costfile` | — | Compute and save registration cost metrics to `costfile` (for debugging) |
| `--cost-only` | — | off | Compute registration cost and exit without writing the resampled output |

### Registration Output

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--save-reg` | — | off | Write output volume registration matrix to disk |
| `--no-save-reg` | — | off | Explicitly suppress writing the output registration matrix (overrides `--save-reg`) |

### Synthesis / Testing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--synth` | — | off | Replace input with white Gaussian noise before resampling |
| `--seed` | `seed` | time-of-day | Integer seed for `--synth`; also enables `--synth` |
| `--kernel` | — | off | Save trilinear interpolation kernel at each voxel instead of the interpolated image |
| `--delta` | — | off | Compute displacement field (delta) instead of resampling |

### Compound / Standalone Transforms

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--gcam` | `mov srclta gcam dstlta vsm interp out` | — | Compound transform: apply GCAM warp with optional pre/post LTAs and VSM; use `0` for identity on `srclta`, `gcam`, or `vsm`; `interp` 0=nearest, 1=trilin, 5=cubicbspline; exits immediately after writing `out` |
| `--gcam0` | `mov srclta gcam dstlta vsm interp out` | — | Same as `--gcam` but uses the non-conforming `MRIvol2volGCAM0` code path |
| `--spm-warp` | `mov movlta warp interp output` | — | Apply SPM VBM warp field; `movlta` maps mov to VBM input space (use `0` to skip); `warp` is typically `y_rinput.nii`; exits immediately after writing `output` |
| `--map-point` | `a b c incoords lta outcoords outfile` | — | Standalone: map a single point through an LTA; coords: 1=tkRAS, 2=scannerRAS, 3=vox; `outfile` can be `nofile`; exits immediately |
| `--map-point-inv-lta` | `a b c incoords lta outcoords outfile` | — | Same as `--map-point` but inverts the LTA before applying |

### SOAP Smoothing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--soap` | `ctrlpts niters` | — | Apply SOAP bubble smoothing: `ctrlpts` is a volume of fixed control points; `niters` is number of iterations |

### Miscellaneous

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--filter` | — | off | Enable internal filter mode (`setfilter=1`); downstream effect not exposed in standard usage |
| `--new` | — | off | Use the updated (non-legacy) resampling code path |
| `--vg-thresh` | `thresh` | `1e-4` | Threshold for volume geometry equality comparison |
| `--gdiagno` | `level` | `-1` | Set FreeSurfer global diagnostic level |
| `--debug` | — | off | Enable debug output |
| `--version` | — | — | Print version string and exit |
| `--help` | — | — | Print full help text and exit |

> [!contradiction] --talres default in BEGINUSAGE vs. source
> The `BEGINUSAGE` block at the top of `mri_vol2vol.cpp` says `--talres` default is `1`, but the variable initialisation at line 532 is `int fstalres = 2`. The help text and examples both confirm that 2 mm is the actual default. The source variable is authoritative: **default is 2**.

## Configuration Interactions

- `--reg` / `--lta` / `--fsl` / `--fslreg` / `--xfm` / `--regheader` / `--mni152reg` / `--s` are mutually exclusive registration sources — only one should be specified.
- `--tal` requires `--reg`. It implicitly sets the target volume to `mni305.cor.subfovV.mgz` and must not have `--targ` specified.
- `--mni152reg` requires FSL to be installed and sets the target implicitly; do not supply `--targ`.
- `--inv` swaps the roles of `--mov` and `--targ`: the output geometry comes from `--mov`, and `--targ` is resampled.
- `--lta-inv` and `--inv` with `--lta` may produce different results when `--tal` is also specified.
- `--fill-average` / `--fill-conserve` enable fill modes and implicitly use `--fill-upsample 2` by default.
- `--downsample N1 N2 N3` internally sets `--fill-average`, `--fill-upsample 2`, and `--regheader`; do not specify `--targ` or a separate registration.
- `--no-resample` only modifies the vox2ras matrix in the header; pixels are not interpolated.
- `--rot`, `--trans`, `--shear` add perturbations to the registration matrix — intended for sensitivity analysis, not routine use.
- `--synth` replaces the input data; useful for testing interpolation kernels independently of data.
- `--nomr` is the default behaviour (since FS 8.x DoSaveInputMR=1); use `--mr` to override and copy MR params from the target template.
- `--gcam`, `--gcam0`, `--spm-warp`, `--map-point`, and `--map-point-inv-lta` are standalone commands: they process their arguments completely and call `exit(0)`, bypassing all other flags.
- `--vsm-pedir` can be used with `--gcam` to set the phase-encode direction for the embedded VSM step.

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

# 7. Map a single point through an LTA (tkRAS to scannerRAS)
mri_vol2vol --map-point 10.0 -5.0 3.0 1 transform.lta 2 nofile
```

## Pipeline Context

`mri_vol2vol` is not called directly by `recon-all` during standard cortical reconstruction. It is widely used in post-processing workflows:

- **fMRI preprocessing:** apply EPI-to-anatomy registration from `bbregister`
- **Group studies:** bring individual maps into Talairach or MNI152 space
- **Atlas operations:** warp template labels into subject space using --inv
- Works in conjunction with [[talairach_avi]] (which generates the xfm file) and `bbregister` (which generates the `.dat` file)

## Gotchas and Caveats

> [!gotcha] --tal uses MNI305, not true Talairach
> Despite the flag name, `--tal` resamples into MNI305 space (often called "Talairach" in FreeSurfer documentation), not the original Talairach 1988 atlas space. The "talairach.xfm" file maps to MNI305 with minor corrections. See [[coordinate-systems]] for details.

> [!gotcha] FSL standard volumes cannot be used as mov/targ
> Files from `$FSLDIR/etc/standard` lack proper geometry information. FreeSurfer and FSL interpret these differently, causing incorrect results. Use subject-specific volumes as mov/targ when using --fsl.

> [!gotcha] Default output precision is float
> Regardless of input precision, output defaults to float. Use `--keep-precision` to avoid converting integer segmentation volumes to float.

> [!gotcha] --no-resample only changes the header
> Specifying `--no-resample` modifies only the vox2ras matrix in the output header — no pixel resampling occurs. The data values are identical to the input, but the geometry metadata is changed.

> [!gotcha] Register.dat format assumption
> The `--reg` file must have the same geometry as the `--mov` volume passed to `tkregister2`. Geometry mismatch between the `.dat` file and `--mov` will produce silently wrong results.

> [!gotcha] --nomr is the default since FS 8.x
> `DoSaveInputMR` defaults to 1 (preserve input MR parameters). `--nomr` sets this explicitly to 1 — it is a no-op on current FS 8.x. `--mr` is the flag to override: it copies TR/TI/TE/flip_angle from the target template into the output.

> [!gotcha] Standalone subcommands bypass all other processing
> `--gcam`, `--gcam0`, `--spm-warp`, `--map-point`, and `--map-point-inv-lta` call `exit(0)` immediately after completing their operation. Any other flags on the same command line are silently ignored.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — format conversion (no spatial transform)
- [[mri_warp_convert]] — converts between warp formats before applying with mri_vol2vol
- [[talairach_avi]] — generates the `talairach.xfm` consumed by `--tal`
- [[mri_em_register]] — generates LTA transforms used by `--lta`
- [[coordinate-systems]] — explains tkRAS, ScannerRAS, MNI305 spaces

## Confidence and Gaps

**High confidence:** complete flag list (from `parse_commandline()` in source), transform chain mathematics (from help text and code), interpolation modes, gotchas (from help text and source).

> [!note] Help-text token discrepancies — not real flags
> The help text inside `mri_vol2vol.cpp` contains several strings that are not parsed option names:
> - `--fstal` and `--fstalres` appear in the help text but only as references to `tkregister2` invocations or in section headings. The flags actually parsed by `mri_vol2vol` are `--tal` ([line 1203](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_vol2vol/mri_vol2vol.cpp#L1203)) and `--talres` ([line 1426](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_vol2vol/mri_vol2vol.cpp#L1426)). Only `--tal` and `--talres` work.
> - `--surf` appears in a `printf` line ([line 1166](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_vol2vol/mri_vol2vol.cpp#L1166)) suggesting the user run `tkregister2 --surf white` for registration verification — it is a `tkregister2` flag, not a `mri_vol2vol` flag.
> - `--fill-` and `--fill-xxx` are not option strings. `--fill-xxx` is a placeholder in the help text ("source upsampling factor for --fill-xxx") referring to the `--fill-average` / `--fill-conserve` family; `--fill-` is a partial string from a `--downsample` description. Neither is accepted by the parser.
> The flag table above uses the authoritative parsed names only.

> [!gap] --gcam mode
> The `--gcam mov srclta gcam dstlta vsm interp out` compound transform mode is documented in the usage block but its interaction with other flags was not traced in detail.

> [!gap] --spm-warp edge case
> When `movlta=0` in `--spm-warp` mode, the input is assumed to share a RAS space with the VBM input — the exact handling of this edge case was not fully verified.

> [!gap] --filter
> The `--filter` flag sets `setfilter=1` but its downstream effect was not traced through the resampling code path.
