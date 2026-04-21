---
title: "mri_estimate_tissue_parms"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_estimate_tissue_parms/mri_estimate_tissue_parms.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/; full option list not read"
  - "Optimization convergence criteria not documented"
tags:
  - qmri
  - tissue-parameters
  - T1-mapping
  - FLASH
---

# mri_estimate_tissue_parms

## Summary

`mri_estimate_tissue_parms` estimates quantitative tissue parameters — specifically proton density (PD) and longitudinal relaxation time (T1) — from a set of multi-flip-angle FLASH (Fast Low Angle SHot) MRI volumes. It uses a nonlinear least-squares fit of the FLASH signal model to the observed intensities across multiple flip angles and/or repetition times.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_estimate_tissue_parms/mri_estimate_tissue_parms.cpp`
- **Note:** Source is in `attic/`; may be legacy code
- **Key dependencies:** `mri.h`, `matrix.h`, `mrimorph.h`

## Purpose and Context

Multi-parameter mapping (MPM) requires fitting the FLASH signal equation to multi-echo, multi-flip-angle acquisitions to obtain quantitative T1 and PD maps. This tool performs that fitting voxel-by-voxel. It supports optional volume alignment (registration) across the multi-flip-angle volumes and can output residual maps. The tool is useful for quantitative MRI research that requires tissue parameter maps rather than contrast-weighted images.

## Inputs

Positional arguments:
1. One or more FLASH input volumes (multiple flip angle acquisitions)
2. Output PD volume path
3. Output T1 volume path

Additional parameters (set via flags): TR, TE, FA for each volume.

## Outputs

- Output T1 map volume
- Output PD (proton density) map volume
- Optional: residual map (if `-R <name>` is specified)

## Mathematical Foundations

The FLASH signal equation at steady state is:

$$S = PD \cdot \frac{\sin(\alpha)(1 - e^{-TR/T1})}{1 - \cos(\alpha) e^{-TR/T1}}$$

where $\alpha$ is the flip angle, $TR$ is the repetition time, and $T1$ is the longitudinal relaxation time.

For each voxel, the tool minimizes:

$$\text{SSE}(PD, T1) = \sum_{i=1}^{N} \left( S_i - \text{FLASHforwardModel}(\alpha_i, TR_i, PD, T1) \right)^2$$

using an iterative refinement starting from initial parameter estimates found by `findInitialParameters()`.

Key internal functions:
- `FLASHforwardModel(flip_angle, TR, PD, T1)` — FLASH steady-state signal
- `dM_dT1(...)`, `dM_dPD(...)` — partial derivatives for gradient descent
- `estimateVoxelParameters()` — per-voxel nonlinear optimization
- `computeVoxelSSE()` — sum of squared errors

Constants: `MIN_T1 = 5`, `MIN_PD = 5` (avoid singularity), `MAX_ITER = 5000`.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-tr <value>` | float | 0 | Repetition time (ms) |
| `-te <value>` | float | 0 | Echo time (ms) |
| `-fa <value>` | float | 0 | Flip angle (degrees) |
| `-R <name>` | string | none | Output residual volume name |
| `-conform` | flag | off | Conform input volumes |
| `-sinc` | flag | on | Use sinc interpolation |
| `-window <n>` | int | 3 | Sinc interpolation half-window size |
| `-steps <n>` | int | 4 | Number of optimization steps |
| `-thresh <value>` | float | 25 | Intensity threshold for valid voxels |
| `-write_iters` | flag | off | Write intermediate iteration results |

> [!gap] Full flag list
> The above is inferred from global variable declarations. The complete `get_option()` body was not read.

## Configuration Interactions

- `-tr`, `-te`, `-fa` can be specified globally to override header values. For multi-flip-angle datasets, these should match the acquisition parameters.
- `-conform` enables volume conforming to standard FreeSurfer space before fitting.
- `-sinc` and `-window` control interpolation during the optional alignment step.

## Typical Use Cases

```bash
# Estimate T1 and PD from 3 flip-angle volumes
mri_estimate_tissue_parms \
  flip5.mgz flip10.mgz flip20.mgz \
  PD.mgz T1.mgz

# Specify TR and FA explicitly
mri_estimate_tissue_parms -tr 18 -fa 5 flip5.mgz -fa 10 flip10.mgz \
  PD.mgz T1.mgz
```

## Pipeline Context

Not called by `[[recon-all]]`. Used in quantitative MRI research pipelines for multi-parameter mapping.

## Gotchas and Caveats

> [!gotcha] Source in attic/
> The source is in `attic/`, suggesting legacy status. The installed binary is confirmed present in FreeSurfer 8.2.0.

> [!gotcha] Singularity at T1=0 and PD=0
> The code enforces `MIN_T1 = 5` and `MIN_PD = 5` to avoid division by zero in the FLASH signal equation.

## Related Tools

- `[[mri_convert]]` — pre-processing and format conversion of input volumes

## Confidence and Gaps

**Medium confidence:** main function, FLASH model, and key optimization functions are confirmed from source. Complete option list was not read.
