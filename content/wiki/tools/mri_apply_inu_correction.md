---
title: "mri_apply_inu_correction"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_apply_inu_correction/mri_apply_inu_correction.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_apply_bias]]"
  - "[[mri_nu_correct.mni]]"
  - "[[mri_normalize]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Source is in the attic/ directory; production availability is uncertain"
tags:
  - bias-field
  - INU-correction
  - intensity-correction
---

# mri_apply_inu_correction

## Summary

`mri_apply_inu_correction` estimates a per-voxel intensity non-uniformity (INU) gain field from a reference pair of volumes (the same volume before and after N3/NU correction) and applies this gain field to a new input volume. It is a transfer-correction tool: it learns the gain from a template scan and applies it to a different input scan that is assumed to have the same coil/scanner INU characteristics.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_apply_inu_correction/mri_apply_inu_correction.cpp`

> [!gotcha] Attic status
> This tool resides in the `attic/` subdirectory of the FreeSurfer source tree, indicating it may be deprecated or not built by default. Verify availability in your installation before relying on it.

## Purpose and Context

In longitudinal studies or when multiple subjects are scanned with the same scanner and coil, it may be more reproducible to apply a fixed INU correction estimated from a well-characterized reference scan rather than independently estimating the bias field for each volume. `mri_apply_inu_correction` enables this workflow:

1. Select a reference subject with a good INU correction (before = raw, after = N3-corrected).
2. Estimate the voxel-wise gain = `after / before`.
3. Apply `gain × input` to any other scan from the same scanner session.

The gain field is computed directly from the template pair with no smoothing, which differs from the smoother bias fields produced by [[mri_compute_bias]].

## Inputs

Required positional arguments:
1. `<input vol>` — the volume to be corrected
2. `<corrected vol>` — output path

Required option flags (both must be specified):
- `-before <template_before>` — template volume before N3 correction
- `-after <template_after>` — template volume after N3 correction

All three input volumes (`input`, `before`, `after`) must have identical dimensions.

## Outputs

- A single output volume with the same dimensions as the input, with the estimated gain field applied voxel-wise.

## Mathematical Foundations

At each voxel $(x, y, z)$:

$$
\text{gain}(x,y,z) = \frac{V_{\text{after}}(x,y,z)}{V_{\text{before}}(x,y,z) + \epsilon}
$$

where $\epsilon = 10^{-15}$ avoids division by zero.

The corrected output is:

$$
V_{\text{out}}(x,y,z) = \text{gain}(x,y,z) \cdot V_{\text{in}}(x,y,z)
$$

This is a voxel-wise operation; no spatial interpolation or smoothing is applied to the gain field.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-before <file>` | string | required | Template volume before N3/NU correction |
| `-after <file>` | string | required | Template volume after N3/NU correction |
| `-debug_voxel <x> <y> <z>` | int int int | — | Enable per-voxel debug output at the specified CRS coordinate; sets global debug voxel `Gx`/`Gy`/`Gz` and internal `debug_flag` |
| `-u`<br>`-?` | — | — | Print usage and exit |

## Configuration Interactions

Both `-before` and `-after` are mandatory; the tool will exit with usage if either is absent. The input volume and the two template volumes must have the same dimensions; a mismatch causes an immediate error exit.

## Typical Use Cases

**Transfer INU correction from a reference scan to a new input:**
```bash
mri_apply_inu_correction \
  -before reference_raw.mgz \
  -after reference_nucorrected.mgz \
  input_raw.mgz output_corrected.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Intended for longitudinal or multi-session studies. For single-session INU correction, use [[mri_nu_correct.mni]].

## Gotchas and Caveats

> [!gotcha] No spatial smoothing of gain field
> The gain field is computed independently at each voxel with no smoothing. If the template pair has noise or mis-registration, the gain field will be noisy and may introduce artifacts into the corrected volume. The smoother approach in [[mri_compute_bias]] uses Gaussian smoothing with a tunable sigma.

> [!gotcha] Epsilon prevents but does not handle near-zero before values
> Division by `(before + 1e-15)` prevents NaN but still produces very large gain values wherever `before ≈ 0`, which may then amplify small input values enormously. Consider masking background voxels before applying correction.

> [!gotcha] Attic status — may not be installed
> The source is in `attic/`, suggesting it may not be compiled in standard builds. Check `ls $FREESURFER_HOME/bin/mri_apply_inu_correction` before use.

## Related Tools

- [[mri_apply_bias]] — applies a pre-computed bias field stored as a volume
- [[mri_nu_correct.mni]] — primary FreeSurfer bias correction using N3
- [[mri_normalize]] — intensity normalization with integrated bias correction
- [[mri_compute_bias]] — estimates a smooth bias field from a label or surface

## Confidence and Gaps

Source code fully read. Confidence is high for documented behaviour. Production availability is uncertain due to attic status.
