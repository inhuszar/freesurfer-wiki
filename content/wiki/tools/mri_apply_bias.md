---
title: "mri_apply_bias"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_bias/mri_apply_bias.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[mri_compute_bias]]"
  - "[[mri_nu_correct.mni]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - bias-field
  - normalization
  - intensity-correction
---

# mri_apply_bias

## Summary

`mri_apply_bias` applies a pre-computed bias (gain) field to an input MRI volume by performing voxel-wise multiplication. It multiplies each voxel in the input volume by the corresponding value in the bias field volume, optionally after applying a spatial transform to the bias field. The output is a bias-corrected (or bias-modulated) volume.

## Source Information

- **Language:** C++
- **Source file:** `mri_bias/mri_apply_bias.cpp`

The source is in the `mri_bias/` directory, which also contains `mri_compute_bias.cpp`.

## Purpose and Context

Intensity non-uniformity (bias field, INU) is a systematic low-frequency intensity variation introduced by RF coil imperfections in MRI. The FreeSurfer pipeline estimates and removes the bias field early in the reconstruction stream (via [[mri_nu_correct.mni]] or [[mri_normalize]]). `mri_apply_bias` provides a standalone utility for applying an externally computed bias field map to any input volume.

The companion tool `mri_apply_inu_correction` (in the `attic/` directory) solves the related problem of transferring a gain field estimated from a reference pair (before/after NU correction) to a new input volume.

## Inputs

- `<input vol>` — the volume to be corrected (any MRI format)
- `<bias vol>` — a bias field volume (same geometry as input, or transformable to it)
- `<output volume>` — path for the corrected output

The positional argument order is: `mri_apply_bias [options] <input> <bias> <output>`.

## Outputs

- A single output volume with the same dimensions as the input. Each voxel value is `input_value * bias_value` (with clamping to [0, 255] for UCHAR output).

## Mathematical Foundations

For corresponding voxels $x$ in the input and $y$ in the bias field (after optional transform $T$):

$$
V_{\text{out}}(x) = V_{\text{in}}(x) \cdot B(T(x))
$$

The bias field is sampled at the transformed position using trilinear interpolation (`MRIsampleVolume`). The vox2vox transform $M$ maps input voxel coordinates to bias field voxel coordinates:

$$
M = M_{\text{bias}}^{-1} \cdot M_{\text{in}}
$$

computed by `MRIgetVoxelToVoxelXform`.

For UCHAR output, values are clamped:
$$
V_{\text{out}}(x) \leftarrow \min(255, \max(0, V_{\text{out}}(x)))
$$

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-T <xform>` | string | none | Apply spatial transform to the bias field before application |
| `debug_voxel <x> <y> <z>` | int×3 | — | Enable per-voxel debugging at the specified CRS coordinate |
| `-u` / `-?` | flag | — | Print usage and exit |

Note: flags use a single dash followed by the option character (not the POSIX `--` convention).

## Configuration Interactions

- If `-T` is specified, the bias field is first warped to the input volume space using the inverse transform before voxel-wise multiplication.
- Without `-T`, the bias field and input volume must have the same geometry (same voxel-to-RAS mapping), or the `MRIgetVoxelToVoxelXform` will produce a non-identity matrix derived from the RAS headers.

## Typical Use Cases

**Apply a pre-computed bias field:**
```bash
mri_apply_bias orig.mgz bias_field.mgz corrected.mgz
```

**Apply bias field with spatial transform:**
```bash
mri_apply_bias -T transforms/talairach.lta orig.mgz bias_field.mgz corrected.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Typically used in:
- Longitudinal studies where the bias field is estimated once and applied to follow-up scans.
- Multi-modal studies where a bias field estimated from T1 must be applied to T2 or PD data.

For standard single-session bias correction, use [[mri_nu_correct.mni]] or [[mri_normalize]].

## Gotchas and Caveats

> [!gotcha] Multiplication, not division
> The `apply_bias` function **multiplies** the input by the bias field. This is correct when the bias field encodes a gain factor (i.e., `bias > 1` means the voxel was artificially bright and will be further amplified). If your bias field encodes the correction factor (bias = 1/gain), you should invert the bias field first. Check how [[mri_compute_bias]] computed the field to ensure consistent convention.

> [!gotcha] UCHAR clamping
> For UCHAR output volumes, values outside [0, 255] are silently clamped. This can create saturated regions if the bias field amplifies already-bright voxels.

> [!gotcha] Geometry mismatch
> If bias field and input have different geometries and no `-T` is provided, the `MRIgetVoxelToVoxelXform` will apply the RAS-header-derived mapping, which may be inaccurate or unintuitive.

## Related Tools

- [[mri_compute_bias]] — estimates a bias field from an input volume
- [[mri_nu_correct.mni]] — the primary FreeSurfer N3 bias correction step
- [[mri_normalize]] — intensity normalization (includes bias field estimation)
- `mri_apply_inu_correction` — transfer INU correction from a reference scan pair

## Confidence and Gaps

Source code fully read. Confidence is high.
