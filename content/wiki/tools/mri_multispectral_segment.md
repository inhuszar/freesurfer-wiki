---
title: "mri_multispectral_segment"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_multispectral_segment/mri_multispectral_segment.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_ca_label]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "T2/PD tissue segmentation criteria not fully traced"
tags:
  - segmentation
  - multi-spectral
  - t1-pd
  - attic
---

# mri_multispectral_segment

## Summary

`mri_multispectral_segment` segments tissue classes (grey matter, white matter, CSF) using both T1 and proton density (PD) volumes. It uses field-strength-specific T1 and PD thresholds to classify voxels, employing a deformable surface approach for boundary refinement.

> [!gotcha] Attic tool
> Source is in `attic/`. May not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_multispectral_segment/mri_multispectral_segment.cpp`
- **Original author:** Florent Segonne

## Purpose and Context

T1-only segmentation is limited by tissue contrast. Adding PD (proton density) information provides an additional discriminating dimension: WM has high PD and short T1, GM has intermediate T1 and high PD, and CSF has very long T1 and high PD. `mri_multispectral_segment` exploits this two-channel information for improved tissue classification.

## Inputs

| Argument | Description |
|----------|-------------|
| `<T1_vol>` | T1-weighted volume |
| `<PD_vol>` | Proton density volume |
| `<output>` | Output segmentation volume |

## Outputs

- Tissue segmentation volume with GM, WM, and CSF labels.
- Optionally: intermediate surface files (if `OUTPUT_SURFACES` is enabled at compile time).

## Mathematical Foundations

Classification uses field-strength-specific thresholds:

**At 3T (default):**
- GM: T1 < `GM_MAX_T1_3T` = 3000 ms
- WM: T1 > `WM_MIN_T1_3T` = 800 ms

**At 1.5T:**
- GM: T1 < `GM_MAX_T1_1p5T` = 1200 ms
- WM: T1 > `WM_MIN_T1_1p5T` = 500 ms

The PD threshold (`PDthresh`, default 0) provides an additional constraint.

A centre of gravity (COG) computation and spherical coordinate system are used for the deformable surface boundary refinement.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | T1 volume |
| (positional 2) | volume | required | PD volume |
| (positional 3) | path | required | Output segmentation |
| `-field_strength <fs>` | float | 3.0 | Field strength in Tesla |
| `-pdthresh <t>` | long | 0 | PD threshold |

> [!gap] Complete option list
> Options not fully read from source.

## Typical Use Cases

```bash
# Segment T1+PD data at 3T
mri_multispectral_segment T1.mgz PD.mgz tissue_seg.mgz

# At 1.5T
mri_multispectral_segment T1.mgz PD.mgz tissue_seg.mgz -field_strength 1.5
```

## Pipeline Context

Not part of standard `recon-all`. Relevant to multi-contrast MRI protocols.

## Gotchas and Caveats

- Tool is in `attic/`; may not be available.
- Field-strength-specific thresholds are hardcoded; they may not generalise to all acquisition protocols.
- The deformable surface approach requires valid COG computation, which can fail for very abnormal brains.

## Related Tools

- [[mri_segment]] — standard (T1-only) WM segmentation
- [[mri_ca_label]] — atlas-based segmentation

## Confidence and Gaps

**Low confidence:** tool is in attic; tissue classification criteria inferred from global constants.
