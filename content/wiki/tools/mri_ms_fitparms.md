---
title: "mri_ms_fitparms"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ms_fitparms/mri_ms_fitparms.cpp"
  - "mri_ms_fitparms/mri_ms_fitparms.help.xml"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ms_EM]]"
  - "[[mri_ms_LDA]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps: []
tags:
  - quantitative-mri
  - flash
  - T1-mapping
  - PD-mapping
  - registration
---

# mri_ms_fitparms

## Summary

`mri_ms_fitparms` fits quantitative tissue parameters — T1 relaxation time and proton density (PD) — from a set of FLASH (Fast Low Angle SHot) MRI volumes acquired at multiple flip angles. It simultaneously estimates a linear transform aligning each input volume to a common space (motion correction), and writes T1 and PD maps plus synthetic volumes simulating each input acquisition. TR, TE, and flip angle are read from the image header but can be overridden on the command line.

## Source Information

- **Language:** C++
- **Source file:** `mri_ms_fitparms/mri_ms_fitparms.cpp`
- **Author:** Bruce Fischl
- **Help file:** `mri_ms_fitparms/mri_ms_fitparms.help.xml`

## Purpose and Context

FLASH MRI acquired at two or more flip angles provides the information needed to compute quantitative T1 and PD maps. These maps are tissue-intrinsic parameters independent of scanner gain and coil sensitivity (after bias correction), making them more reproducible across sessions and sites than conventional T1-weighted contrast images.

The estimated T1 and PD maps can then be used as inputs to [[mri_ms_EM]] or [[mri_ms_LDA]] for quantitative tissue segmentation.

The tool also performs motion correction as a byproduct: the simultaneous registration step aligns each flip-angle volume to a common space.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| FLASH volumes | [[mgz]] | Two or more volumes at different flip angles |
| Per-volume TR, TE, flip angle | from header or CLI | Scan parameters for each volume |
| Per-volume transforms | `.lta` | Optional pre-computed alignment transforms |

Scan parameters are read from the header. If unavailable, they must be specified on the command line before each volume:

```
mri_ms_fitparms -tr <TR> -te <TE> -fa <FA> vol1.mgz -tr <TR> -te <TE> -fa <FA> vol2.mgz <outdir>
```

## Outputs

All outputs are written to an output directory:

| Output | Format | Description |
|--------|--------|-------------|
| `T1.mgz` | [[mgz]] | Estimated T1 relaxation map (ms) |
| `PD.mgz` | [[mgz]] | Estimated proton density map |
| `vol0.mgz`, `vol1.mgz`, ... | [[mgz]] | Synthetic volumes simulating each input |
| Per-volume transform files | `.lta` | Linear transforms aligning each run |

## Mathematical Foundations

For a spoiled gradient echo (FLASH) acquisition with flip angle $\alpha$, TR, and TE, the signal is modelled by the Ernst equation:

$$
S = S_0 \cdot PD \cdot \frac{\sin\alpha (1 - e^{-TR/T_1})}{1 - \cos\alpha \cdot e^{-TR/T_1}} \cdot e^{-TE/T_2^*}
$$

where $S_0$ is a scanner gain factor, $T_1$ is the longitudinal relaxation time, and $T_2^*$ is the effective transverse relaxation time (often neglected for short TE).

Given measurements $S_1, \ldots, S_N$ at flip angles $\alpha_1, \ldots, \alpha_N$, the tool fits $T_1$ and $PD = S_0 \cdot PD_{tissue}$ by minimizing the sum of squared residuals, optionally using Tukey robust regression (`-tukey`) to suppress outliers.

Simultaneous rigid-body registration minimizes the overall objective:

$$
E = \sum_{i=1}^N SSE(S_i, \hat{S}_i(T_1, PD, T_i))
$$

where $T_i$ is the per-volume rigid transform, using gradient descent with momentum (`base_dt=1e-6`, `momentum=0.9`).

A flip angle correction field (`-faf`) can account for spatially varying flip angles due to B1 inhomogeneity.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-tr` | `<f>` | from header | Repetition time (ms) for the following volume |
| `-te` | `<f>` | from header | Echo time (ms) for the following volume |
| `-fa` | `<f>` | from header | Flip angle (degrees) for the following volume |
| `-at` | `<fname>` | — | Apply transform file to following volume |
| `-ait` | `<fname>` | — | Apply inverse of transform file to following volume |
| `-t` | `<xfm> <vol>` | — | Apply transform to output volumes and set output volume geometry from `<vol>` |
| `-i` | — | off | Invert the transform applied via `-t` |
| `-tukey` | — | off | Use Tukey biweight robust estimator for residuals |
| `-s` | `<f>` | — | Smooth flip angle field with Gaussian sigma `<f>` |
| `-n` | `<n>` | — | Perform estimation/motion correction `<n>` times |
| `-w` | `<n>` | — | Write intermediate results every `<n>` iterations |
| `-r` | `<name>` | — | Write residuals to file `<name>` |
| `-m` | `<f>` | 0.9 | Set gradient descent momentum |
| `-scale` | `<f>` | 1.0 | Scale all volumes by `<f>` after reading |
| `-debug_slice` | `<n>` | -1 | Enable debug output for slice `<n>` |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable debug output for voxel `(x, y, z)` |
| `-correct` | — | off | Correct PD by T2* estimates |
| `-conform` | — | off | Interpolate volume to isotropic 1 mm³ |
| `-noconform` | — | off | Inhibit isotropic volume interpolation |
| `-nosynth` | — | off | Disable synthesis of output volumes (`niter=0`) |
| `-nocompress` | — | off | Save outputs as `.mgh` instead of `.mgz` |
| `-reciprocity` | — | off | Assume reciprocity in forward model (same coil for transmit and receive) |
| `-extract` | `<x> <y> <z> <dx> <dy> <dz>` | — | Extract a subimage at origin `(x,y,z)` with size `(dx,dy,dz)` |
| `-fa_scale` | `<f>` | 1.0 | Scale all flip angles by `<f>` |
| `-dt` | `<f>` | 1e-6 | Set gradient descent step size |
| `-max` | `<f>` | 1000 | Maximum T2* value |
| `-fsmooth` | `<n> <thresh>` | — | Smooth flip angle map: `<n>` soap-bubble iterations with threshold `<thresh>` |
| `-mask` | `<vol>` | — | Read brain mask volume from `<vol>` |
| `-use_brain_mask` | — | off | Compute SSE only within brain mask derived from PD map |
| `-afi` | `<vol>` | — | Read flip angle map with nominal value 60° from `<vol>` |
| `-fam` | `<vol> <nominal_fa>` | — | Read flip angle map from `<vol>` with specified nominal flip angle |
| `-faf` | `<vol> <ctrl>` | — | Read flip angle field from `<vol>` with control points in `<ctrl>` |
| `-interp`<br>`-st`<br>`-sample`<br>`-sample_type` | `<method>` | trilinear | Interpolation method: `trilinear`, `nearest`, `sinc`, `cubic` |
| `-trilinear` | — | default | Use trilinear interpolation |
| `-nearest` | — | — | Use nearest-neighbour interpolation |
| `-sinc` | `[halfwindow]` | 6 | Use sinc interpolation with optional half-window width |
| `-sinchalfwindow`<br>`-hw` | `<n>` | 6 | Set sinc half-window width |
| `-cubic` | — | — | Use cubic B-spline interpolation |
| `-window` | — | — | (Not implemented; reserved) |
| `-u` | — | — | Print usage and exit |

## Configuration Interactions

- `-tr`, `-te`, `-fa` must be specified before each volume if the header does not contain this information. They apply to the immediately following volume argument.
- `-at` and `-ait` can be used to initialize per-volume transforms; `-at` applies forward, `-ait` applies inverse.
- `-tukey` improves robustness in the presence of motion artefacts or outlier voxels.
- `-faf` provides a voxel-wise flip angle correction, important for 7T data where B1+ inhomogeneity is severe.
- `-fsmooth` takes two arguments: number of soap-bubble smoothing iterations and a threshold.

## Typical Use Cases

```bash
# Fit T1/PD from two flip angles (scan parameters in header)
mri_ms_fitparms \
  flash_FA05.mgz flash_FA20.mgz flash_FA30.mgz \
  /subjects/bert/mri/flash_fit/

# Override scan parameters explicitly
mri_ms_fitparms \
  -tr 20 -te 3.5 -fa 5  flash_FA05.mgz \
  -tr 20 -te 3.5 -fa 20 flash_FA20.mgz \
  -tr 20 -te 3.5 -fa 30 flash_FA30.mgz \
  /subjects/bert/mri/flash_fit/
```

## Pipeline Context

Not part of standard `recon-all`. Used in quantitative MRI pipelines:

1. `mri_ms_fitparms` — estimates T1/PD maps
2. [[mri_ms_EM]] or [[mri_ms_LDA]] — tissue segmentation using T1/PD
3. Optional: atlas-based parcellation using quantitative maps

## Gotchas and Caveats

> [!gotcha] Header scan parameters may be incorrect
> Many scanners do not reliably store TR, TE, and flip angle in the DICOM/MGZ header. Always verify these values against the protocol sheet. Incorrect parameters produce incorrect T1 maps.

> [!gotcha] All volumes must be co-registered
> The simultaneous registration step provides only local refinement. Large inter-run motion (>10 mm) may not converge correctly. Pre-align volumes using [[mri_motion_correct2]] before running this tool.

> [!gotcha] T2* correction is minimal
> The Ernst equation approximation neglects T2* decay for short TE. For TE > ~5 ms, T2* correction (using the `-max` parameter) may be important.

## Related Tools

- [[mri_ms_EM]] — uses T1/PD maps for EM-based tissue segmentation
- [[mri_ms_LDA]] — uses multi-spectral data for LDA-based tissue classification
- [[wiki/tools/mri_convert|mri_convert]] — format conversion

## Confidence and Gaps

**Confident:** Ernst equation model, simultaneous registration, Tukey robust option, flip angle correction field, output directory structure, per-volume TR/TE/FA specification, complete flag list from `get_option()`.
