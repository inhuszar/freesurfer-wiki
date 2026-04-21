---
title: "mri_mask"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mask/mri_mask.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_morphology]]"
  - "[[mri_convert]]"
  - "[[mri_watershed]]"
  - "[[mri_synthstrip]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - masking
  - skull-stripping
  - preprocessing
---

# mri_mask

## Summary

`mri_mask` applies a binary mask volume to an input MRI volume, setting all voxels outside the mask to a specified fill value (default 0). It supports optional LTA transform alignment of the mask to the input volume, mask thresholding, mask dilation/erosion, inversion, and bounding-box operations. It is commonly used to apply skull-stripped brain masks to anatomical or functional volumes.

## Source Information

- **Language:** C++
- **Source file:** `mri_mask/mri_mask.cpp`
- **Author:** Bruce Fischl

## Purpose and Context

Skull stripping tools such as [[mri_watershed]] and [[mri_synthstrip]] produce binary brain masks. `mri_mask` applies such a mask to zero out (or fill with a custom value) all non-brain voxels. It is also useful for applying any ROI mask to focus downstream analyses on a specific brain region. The LTA transform support allows masking when the mask and input volumes have different geometries.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volume | [[mgz]] / any MRI | Volume to be masked |
| Mask volume | [[mgz]] / any MRI | Binary (or thresholdable) mask |
| Output filename | string | Positional argument 3 |

**Usage:** `mri_mask [options] <in_vol> <mask_vol> <out_vol>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Masked volume | [[mgz]] | Input volume with out-of-mask voxels set to fill value |

## Mathematical Foundations

For each voxel $\mathbf{x}$:

$$
V_{out}(\mathbf{x}) = \begin{cases} V_{in}(\mathbf{x}) & \text{if } M(\mathbf{x}) > \theta \\ v_{fill} & \text{otherwise} \end{cases}
$$

where $M$ is the mask, $\theta$ is the threshold (default $-10^{10}$, i.e., any positive value passes), and $v_{fill}$ is the fill value (default 0).

When `-xform` is specified, the mask is first resampled into the input volume space by applying the LTA transform and interpolating (default: nearest neighbour).

Mask inversion (`-invert-mask`) flips the binary mask before application.

Background noise injection (`-bgnoise`) adds zero-mean Gaussian noise to masked (background) voxels instead of setting them to a constant:

$$
V_{out}(\mathbf{x}) = \begin{cases} V_{in}(\mathbf{x}) & M(\mathbf{x}) > \theta \\ \mathcal{N}(0, \sigma_{bg}^2) & \text{otherwise} \end{cases}
$$

## Configuration Options

All flags are case-insensitive (parsed with `stricmp`). The full `get_option()` has been read.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--help` / `--usage` | — | — | Print help and exit |
| `-version` | — | — | Print version string and exit |
| `-xform <fname>` | string | null | LTA transform file to warp mask into input volume space before masking |
| `-invert` | flag | off | **Invert the binarized mask** (swap inside/outside); sets `InvertMask=1`; applies before thresholding; when set, threshold defaults to 0.5 if not explicitly provided |
| `-no-invert` | flag | — | Explicitly disable mask inversion (`InvertMask=0`) |
| `-lta_src <fname>` / `-src <fname>` | string | null | Source volume geometry for the transform given by `-xform` (required when the LTA was produced by FSL and lacks embedded geometry) |
| `-lta_dst <fname>` / `-dst <fname>` | string | null | Destination volume geometry for the transform given by `-xform` |
| `-T <f>` / `-threshold <f>` | float | -1e10 | Threshold the mask: voxels with mask value ≤ threshold are treated as outside; sets `ThresholdSet=1` |
| `-oval <f>` | float | 0.0 | Value written to masked-out (outside) voxels in the output; sets `out_val` |
| `-transfer <f>` | float | disabled | Copy voxels in the mask whose value equals `f` directly into the output volume (also sets `out_val` to `f` for that pass) |
| `-keep_mask_deletion_edits` | flag | off | Transfer mask voxels with value=1 (manual deletion edits in `brainmask.mgz`) to the output volume unchanged |
| `-abs` | flag | off | Take the absolute value of the mask before thresholding (`DoAbs=1`) |
| `-no-allow-diff-geom` | flag | — | Set environment variable `FS_MRIMASK_ALLOW_DIFF_GEOM=0` to disallow masking when mask and input have different geometry |
| `-dilate <n>` | int | 0 | Dilate the mask by `n` binary dilation iterations before applying |
| `-erode <n>` | int | 0 | Erode the mask by `n` binary erosion iterations before applying |
| `-BB <pad>` / `-crop <pad>` / `-boundingbox <pad>` | int | disabled | Crop both input and mask to the bounding box of the mask padded by `pad` voxels uniformly on all six faces; sets `DoBB=1` |
| `-crop-crs <padC> <padR> <padS>` | int×3 | disabled | Crop to bounding box with separate padding for each axis pair (column, row, slice); sets `DoBB=1` |
| `-BBM <padCR> <padRS> <padCS>` / `-boundingboxm <…>` | int×3 | disabled | Bounding box crop with independent per-axis padding (one value per axis, applied symmetrically); sets `DoBB=1` |
| `-BBMM <p0> <p1> <p2> <p3> <p4> <p5>` / `-boundingboxmm <…>` | int×6 | disabled | Bounding box crop with fully independent per-face padding (low/high for each of C, R, S); sets `DoBB=1` |
| `-BBEQ <pad>` | int | disabled | Bounding box crop that equalises box dimensions by padding all axes to the same size, plus `pad` voxels; sets `DoBBEq=1` |
| `-crop-to-fov <x> <y> <z>` | int×3 | disabled | Crop output FOV to the given voxel dimensions (sets `DoCropToFoV=1`) |
| `-crop-to-fov-mm <x> <y> <z>` | int×3 | disabled | Crop output FOV to the given millimetre dimensions (sets `DoCropToFoVmm=1`) |
| `-no_cerebellum` | flag | off | Zero out cerebellum label voxels in the output (`no_cerebellum=1`) |
| `-lh` | flag | off | Restrict output to left hemisphere voxels only (`DoLH=1`) |
| `-rh` | flag | off | Restrict output to right hemisphere voxels only (`DoRH=1`) |
| `-samseg` | flag | off | Apply samseg-style non-brain masking (`samseg=1`) |
| `-bgnoise <scale> <sign>` | float + int | disabled | Inject zero-mean noise into background (masked-out) voxels; `scale` controls amplitude, `sign` shifts the distribution mean |
| `-DEBUG_VOXEL <x> <y> <z>` | int×3 | disabled | Enable per-voxel diagnostic output for voxel (x, y, z) |

> [!gotcha] `-invert` is ambiguous: two conflicting `-invert` handlers exist in the source
> The `get_option()` function contains two separate `else if (!stricmp(option, "invert"))` branches. The first (line 459) sets `InvertMask=1` (mask inversion). The second (line 589) sets `invert=1` (transform inversion). Because `stricmp` returns on the first match, the second handler is **dead code** — `-invert` always sets `InvertMask`, never the transform inversion flag. There is no working flag to invert the `-xform` transform direction.

> [!gotcha] `-oval` not `-out_val`
> The flag name is `-oval` (not `-out_val` as sometimes documented). Passing `-out_val` will be treated as an unknown option.

> [!gotcha] `-bgnoise` requires two arguments
> `-bgnoise` takes both a scale (float) and a sign (int), not just a single scale value. The sign shifts the mean of the noise distribution.

## Configuration Interactions

- `-xform` requires the LTA to have valid src/dst geometry; if the LTA was produced by FSL, use `-lta_src` / `-lta_dst` to supply it.
- `-invert` inverts the mask (swap inside/outside); there is no working flag to invert the transform direction (the second `-invert` handler for transform inversion is dead code — see gotcha above).
- `-invert` applies before dilation/erosion; the threshold defaults to 0.5 when `-invert` is set and no explicit `-T` is given.
- `-dilate` and `-erode` are applied to the mask before the masking operation.
- `-abs` and `-T` interact: absolute value is taken before threshold comparison when both are set.
- `-no_cerebellum`, `-lh`, `-rh` apply region-specific zeroing on top of the mask.
- `-bgnoise` and `-oval` are operationally exclusive: `-bgnoise` writes noise to background voxels; `-oval` writes a constant. If both are set, `-bgnoise` applies because it runs after the main masking step.
- All bounding-box flags (`-BB`, `-crop-crs`, `-BBM`, `-BBMM`, `-BBEQ`) set `DoBB=1` and are mutually exclusive; only one should be specified.

## Typical Use Cases

```bash
# Standard skull-strip application
mri_mask $SUBJECTS_DIR/bert/mri/T1.mgz \
         $SUBJECTS_DIR/bert/mri/brainmask.mgz \
         $SUBJECTS_DIR/bert/mri/T1_brain.mgz

# Apply mask with transform alignment (mask in MNI space, input in native space)
mri_mask -xform native_to_mni.lta \
         native_T1.mgz mni_mask.mgz masked_T1.mgz

# Mask with threshold and custom fill value (note: flag is -oval, not -out_val)
mri_mask -T 0.5 -oval -1 \
         T1.mgz probmask.mgz masked.mgz

# Invert mask (keep background, zero out brain; flag is -invert)
mri_mask -invert T1.mgz brainmask.mgz outside_brain.mgz
```

## Pipeline Context

`mri_mask` is used throughout `recon-all`, including:
- After [[mri_watershed]] or [[mri_synthstrip]] to apply the brain mask to T1.
- In surface reconstruction to constrain white matter segmentation.
- In functional preprocessing to apply brain masks to EPI volumes.

## Gotchas and Caveats

> [!gotcha] Default threshold is -1e10 (accepts any non-NaN value)
> Without `-T`, any non-zero mask value (including very small values from interpolation artefacts) will be treated as "inside". Use `-T 0.5` to enforce strict binary masking. Exception: when `-samseg` is active, the threshold is overridden to 0.5 internally.

> [!gotcha] No working flag to invert the transform direction
> The `-invert` flag always sets `InvertMask=1` (mask inversion), not transform inversion, because the second `-invert` handler in the source is dead code (unreachable). There is no flag to apply the LTA in reverse.

> [!gotcha] Flag name is `-oval`, not `-out_val`
> The output fill value flag is `-oval`. Documentation and scripts that use `-out_val` will receive an "unknown option" error.

> [!gotcha] LTA geometry requirements
> If the LTA file was produced by an FSL tool (FSLREG_TYPE), it may not contain valid source/destination geometry. In that case `-lta_src` and `-lta_dst` are required, otherwise the tool exits with an error.

> [!gotcha] `-keep_mask_deletion_edits`
> Specific to workflows where a mask value of 1 encodes a manual deletion edit in `brainmask.mgz`. Setting it preserves these edits rather than treating those voxels as inside the brain mask.

## Related Tools

- [[mri_binarize]] — for creating binary masks from segmentations or threshold operations
- [[mri_morphology]] — for dilating/eroding masks independently
- [[mri_watershed]] — skull stripping tool that produces masks consumed here
- [[mri_synthstrip]] — deep learning skull stripping
- [[mri_convert]] — format conversion

## Confidence and Gaps

**High confidence:** All flags confirmed from complete reading of `get_option()` in source. Dead-code `-invert` handler, `-oval` naming, two-argument `-bgnoise`, and all bounding-box variants verified from source.
