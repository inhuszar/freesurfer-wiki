---
title: "mri_synthesize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_synthesize/mri_synthesize.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthsr]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact FLASH forward model equations used in the synthesis need more detailed documentation."
  - "The weighting coefficients (w30=0.9527, w5=-0.3039) are hard-coded; their derivation is not explained in the source."
tags:
  - synthesis
  - contrast
  - flash
  - mri-physics
---

# mri_synthesize

## Summary

`mri_synthesize` synthesizes an MRI volume of arbitrary contrast from quantitative tissue parameter maps (T1, PD, T2*). It uses the FLASH (Fast Low Angle Shot) signal equation to generate synthetic MRI images for arbitrary TR, flip angle (alpha), and TE. This allows generation of synthetic data for contrast validation, atlas construction, and research purposes.

## Source Information

- **Language:** C++
- **Source file:** `mri_synthesize/mri_synthesize.cpp`
- **Key libraries:** `flash.h` (FLASH forward model), `mrinorm`, `transform`
- **Key functions:** `MRIsynthesize()`, `MRIsynthesizeWithFAF()`, `MRIsynthesizeWeightedVolume()`

## Purpose and Context

FreeSurfer's multi-echo FLASH protocol acquires volumes at multiple flip angles and TEs, from which quantitative T1 and PD maps are estimated. `mri_synthesize` uses these maps to synthesize any desired FLASH contrast. This is used to:

- Generate T1-weighted images with specified TR/alpha from quantitative T1/PD maps
- Apply bias field correction and PD normalization
- Create combined "optimal" contrasts for segmentation
- Validate contrast synthesis against real acquisitions

## Inputs

| Input | Description |
|---|---|
| Positional arg 1 | TR (repetition time in ms) |
| Positional arg 2 | Flip angle alpha (degrees) |
| Positional arg 3 | TE (echo time in ms) |
| Positional arg 4 | T1 map volume (input) |
| Positional arg 5 | PD (proton density) map volume |
| Positional arg 6 | Output volume |

Optional:
- T2* map (via `-T2star`)
- Joint PDF for T1 remapping
- Bias field coefficients

## Outputs

| Output | Description |
|---|---|
| Positional arg 6 | Synthesized MRI volume (same geometry as T1 input) |

## Mathematical Foundations

The FLASH signal equation:

> [!math] FLASH forward model
> The MRI signal for a spoiled gradient echo (FLASH) sequence is:
> $$
> S = M_0 \cdot \sin\alpha \cdot \frac{1 - e^{-TR/T_1}}{1 - \cos\alpha \cdot e^{-TR/T_1}} \cdot e^{-TE/T_2^*}
> $$
> where $M_0 \propto PD$ (proton density), $\alpha$ is the flip angle, $TR$ is the repetition time, $TE$ is the echo time, $T_1$ and $T_2^*$ are the tissue relaxation times.

When `--weighting` is used, a two-contrast combination is computed:
$$
S_{\text{comb}} = w_{30} \cdot S(\alpha=30°) + w_5 \cdot S(\alpha=5°)
$$
with hardcoded weights $w_{30} = 2 \times 0.9527$, $w_5 = 2 \times (-0.3039)$, targeting optimal WM/GM contrast separation.

## Configuration Options

| Flag | Argument | Description |
|---|---|---|
| `-T2star` | file | T2* map volume |
| `-norm` | (flag) | Normalize PD map |
| `-discard` | thresh | Discard PD values below threshold |
| `-jpdf` | file | Joint PDF file for T1 nonlinear remapping |
| `-invert` | (flag) | Invert T1 remapping |
| `-PDsat` | value | PD saturation value |
| `-weighting` | (flag) | Use optimal two-contrast weighting |
| `-nbias` | N | Number of bias field components |
| `-nfaf` | N | Number of flip-angle-to-field components |
| `-extract` | (flag) | Extract mode |

## Typical Use Cases

**1. Synthesize T1w-like contrast (TR=20ms, alpha=25°, TE=2ms):**
```bash
mri_synthesize 20 25 2 T1.mgz PD.mgz synthetic_T1w.mgz
```

**2. With T2* decay:**
```bash
mri_synthesize 20 25 2 T1.mgz PD.mgz synthetic_T1w.mgz -T2star T2star.mgz
```

## Pipeline Context

Used in specialized multi-echo FLASH acquisition pipelines for atlas construction and quantitative MRI research. Not part of standard `recon-all`.

## Gotchas and Caveats

> [!gotcha] Requires quantitative maps, not standard clinical MRI
> The inputs must be quantitative T1 (in ms) and PD maps, not raw MRI volumes. These are typically produced from multi-flip-angle FLASH acquisitions using `mri_ms_fitparms` or similar tools.

> [!gotcha] Not the same as mri_synthsr
> `mri_synthesize` is a physics-based synthesis from quantitative parameters. `mri_synthsr` is a deep-learning synthesis from any input contrast. They are completely different tools with similar names.

## Related Tools

- [[mri_synthsr]] — deep-learning synthesis (contrast-agnostic)
- [[mri_convert]] — format conversion

## Confidence and Gaps

Source code read. FLASH equation implemented in `mri_synthesize.cpp`. Confidence is **high** for physics model; **medium** for the weighting coefficients derivation.
