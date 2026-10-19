---
title: "internal-gradunwarp"
type: internal
fs_version: "8.2.0"
source_files:
  - "include/GradUnwarp.h"
  - "utils/GradUnwarp.cpp"
related:
  - "[[mri_gradunwarp]]"
  - "[[coordinate-systems]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-06-11
gaps:
  - "Only the Siemens coefficient path is traced here; GE/Philips support and the exact spherical-harmonic normalisation are not fully verified from source."
tags:
  - internal
  - distortion-correction
  - gradient
---

# internal-gradunwarp

## Summary

The `GradUnwarp` class (`include/GradUnwarp.h`, `utils/GradUnwarp.cpp`)
implements **gradient-nonlinearity distortion correction**. Real MRI gradient
coils deviate from perfect linearity away from isocentre, geometrically
warping the image; `GradUnwarp` models that warp from the scanner's gradient
**coefficient file** (a spherical-harmonic / Legendre expansion of the coil
field) and resamples the data back onto an undistorted grid. It is the engine
behind the user-facing [[mri_gradunwarp]] tool.

## What it does

From [`include/GradUnwarp.h:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/GradUnwarp.h#L43):

- `read_siemens_coeff()` parses a Siemens gradient coefficient file; the
  companion `Siemens_B` class evaluates the spherical-harmonic field with
  Legendre normalisation (`initSiemensLegendreNormfact()`).
- `unwarp_volume()` / `unwarp_volume_gradfile()` apply the displacement field
  to an `MRI` volume, given its `vox2ras` and an interpolation code.
- `unwarp_surface()` / `unwarp_surface_gradfile()` apply the same correction to
  an `MRIS` surface.
- `invert_gcam()` can express the correction as a [[m3z-format|`.m3z`]]-style
  warp.

> [!gotcha] Interpolation code interaction
> `GradUnwarp` resamples through the shared `MRIsampleVolume*` routines, so it
> inherits their interpolation-code handling. A documented defect (see
> [[00105]]) means passing `SAMPLE_CUBIC` to one of those routines silently
> falls back to nearest-neighbour; `GradUnwarp` is one of the call sites
> affected.

## Related

- [[mri_gradunwarp]] — the user-facing command that wraps this class.
- [[coordinate-systems]] — the voxel/RAS frames the correction operates in.
- [[m3z-format]] — the warp-field format the inverse can be written to.
