---
title: "mris_deform"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_deform/mris_deform.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_mef_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "Relationship to mris_place_surface (the newer surface placement tool) not confirmed."
  - "Whether this is used in any recon-all stage needs confirmation."
tags:
  - surface
  - deformation
  - high-resolution
  - piecewise-model
---

# mris_deform

## Summary

`mris_deform` deforms a cortical surface to lie at the gray/white or pial boundary using a **piecewise-constant generative model** of the MRI intensity profile. The tool is designed for ultra-high resolution data where the standard intensity-based gradient deformation in `mris_make_surfaces` may not be optimal. It fits a laminar intensity model to each vertex's normal profile, estimating target locations for white, pial, and layer IV surfaces simultaneously.

## Source Information

- **Language:** C++
- **Primary source:** `mris_deform/mris_deform.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Standard `mris_make_surfaces` deforms surfaces by searching for MRI intensity extrema (e.g., WM/GM boundary gradient) along each vertex's surface normal. This approach works well at 1 mm isotropic resolution but may be suboptimal at higher resolutions (e.g., 0.5–0.7 mm submillimetre MRI) where the laminar structure of the cortex is partially resolvable.

`mris_deform` instead fits a **piecewise-constant intensity profile model** to the normal profile at each vertex. The model partitions the intensity profile into white matter (WM), supragranular (SG), infragranular (IG), and outside regions, and finds the configuration of boundary positions that minimises the residual between the observed intensity profile and the piecewise-constant model. Multiple cortical area types are supported (`PROFILE_GENERIC`, `PROFILE_V1`, `PROFILE_AGRANULAR`), allowing the model to account for known area-specific laminar patterns.

## Inputs

```
mris_deform [options] <input surface> <input volume> <xform> <output surface>
```

| Argument | Description |
|---------|-------------|
| `<input surface>` | Initial surface to deform (e.g., `lh.white`). Also used to infer hemisphere and base name. |
| `<input volume>` | MRI volume (e.g., T1-weighted or ex vivo) providing the intensity profile for fitting. |
| `<xform>` | Transform file (LTA or other; use `identity.nofile` for no transform). |
| `<output surface>` | Base name for output surfaces (e.g., `lh.white`). Outputs are `<base>.white`, `<base>.pial`, `<base>.layerIV`. |

The sphere coordinates are read automatically from a `sphere` file in the same directory as `<input surface>`.

## Outputs

| Output | Description |
|--------|-------------|
| Deformed white surface | Surface placed at the WM/GM boundary per the piecewise model. |
| Deformed pial surface | Surface placed at the GM/CSF boundary. |
| Layer IV surface (optional) | Surface approximating cortical layer IV. |
| Overlay files | Target positions, distances, and intensity values per vertex (for diagnostics). |

## Mathematical Foundations

For each vertex $v$, the tool extracts an intensity profile $I(d)$ along the surface normal at distances $d \in [-d_{\text{max}}, d_{\text{max}}]$ from the current surface position.

A piecewise-constant model is fit:

$$
\hat{I}(d) = \begin{cases}
\mu_{\text{WM}} & d < d_w \\
\mu_{\text{IG}} & d_w \leq d < d_{\text{ig}} \\
\mu_{\text{SG}} & d_{\text{ig}} \leq d < d_p \\
\mu_{\text{out}} & d \geq d_p
\end{cases}
$$

The optimal boundary positions $(d_w, d_{\text{ig}}, d_p)$ and mean intensities $(\mu_{\text{WM}}, \mu_{\text{IG}}, \mu_{\text{SG}}, \mu_{\text{out}})$ are found by minimising the residual:

$$
\text{RMS} = \sqrt{\frac{1}{N}\sum_{i=1}^N (I(d_i) - \hat{I}(d_i))^2}
$$

Multiple error functions are supported (L1, L2, normalised cross-correlation, L1+NCC combination), selected via `DEFORMATION_PARMS.error_type`.

The source also implements a stria of Gennari model (`try_stria_model`) specific to V1, where a thin high-intensity band in layer IV modifies the piecewise model.

## Configuration Options

### Complete Flag Reference

All flags use single-dash prefix; names are case-insensitive.

| Flag | Argument type | Default | Description |
|------|--------------|---------|-------------|
| `-vavgs <N>` | int | 0 | Number of iterations to average vertex values after each deformation step. |
| `-loc <val>` | float | 10.0 (`parms.l_location`) | Weight of the location term in the deformation energy (pulls vertices toward target positions). |
| `-white_only` | boolean | false (`white_only=0`) | Deform only the white matter surface; skip pial surface computation. |
| `-ico` | boolean | false | Search multiple surface normal angles during optimisation (`dp.search_multiple_angles=1`). |
| `-max_offset <val>` or `-max_wm_offset <val>` | float | 30.0 (`dp.max_wm_intensity_offset`) | Maximum allowed WM intensity offset from the expected WM value. |
| `-max_ig_offset <val>` | float | 50.0 (`dp.max_ig_intensity_offset`) | Maximum allowed infragranular (IG) layer intensity offset. |
| `-max_sg_offset <val>` | float | 50.0 (`dp.max_sg_intensity_offset`) | Maximum allowed supragranular (SG) layer intensity offset. |
| `-max_dist <val>` | float | `MAX_DIST` (defined in source) | Maximum deformation distance along the surface normal (mm). |
| `-tol <val>` | float | 1e-6 (`parms.tol`) | Convergence tolerance for the deformation optimiser. |
| `-dark_csf` | boolean | false (`dp.dark_csf=0`) | Assume the fluid outside the brain is dark (e.g., ex vivo scans). |
| `-bright_csf` | boolean | — | Assume the fluid outside the brain is bright; sets `dp.dark_csf=0`, `dp.outside_val=300`. |
| `-thresh <val>` | float | 0 | Intensity threshold below which vertices are "ripped" (excluded from deformation). |
| `-pad <N>` | int | 2 (`pad_voxels`) | Number of voxels to pad at the volume boundary (vertices in this region are ripped). |
| `-T1` | boolean | — | Preset parameters for T1-weighted MPRAGE contrast: sets `dp.wm_val=110`, `dp.infra_granular_val=85`, `dp.supra_granular_val=70`, `dp.contrast_type=T1`, etc. |
| `-T2` | boolean | — | Preset parameters for T2-weighted contrast: sets `dp.wm_val=110`, `dp.infra_granular_val=140`, `dp.supra_granular_val=180`, `dp.contrast_type=T2`, etc. |
| `-sg <val>` | float | 190.0 (T2* default) | Expected mean supragranular intensity (`dp.supra_granular_val`). |
| `-ig <val>` | float | 160.0 (T2* default) | Expected mean infragranular intensity (`dp.infra_granular_val`). |
| `-stria <val>` | float | 135.0 (`dp.stria_val`) | Expected mean stria of Gennari intensity (for V1 model). |
| `-S <val>` | float | 3.0 (`dp.sigma`) | Gaussian sigma for gradient computation (mm). |
| `-A <N>` | int | — | Smooth the deformation gradient `<N>` times before applying (`parms.n_averages`). |
| `-mean` | boolean | — | Use mean filter instead of the default median filter for intensity profiles. |
| `-gaussian` | boolean | — | Use Gaussian filter for intensity profiles. |
| `-nofilter` | boolean | — | Disable intensity profile filtering entirely. |
| `-intensity` | boolean | — | Use intensity histograms to nudge the white matter surface (`dp.use_intensity=1`, `dp.fix_intensities=1`). |
| `-aseg <file>` | string | — | Segmentation volume (aseg) to fill ventricle regions. |
| `-layerIv` | boolean | — | Reposition surface to the cortical layer IV border (`dp.which_border=LAYER_IV_BORDER`). |
| `-pial` | boolean | — | Reposition surface to the pial boundary (`dp.which_border=PIAL_BORDER`). |
| `-ncorr` | boolean | — | Use normalised cross-correlation as the error functional (`ERROR_FUNC_NORM_CORR`). |
| `-L1` | boolean | — | Use L1 norm as the error functional (`ERROR_FUNC_L1`). |
| `-L2` | boolean | — | Use L2 norm as the error functional (default; `ERROR_FUNC_L2`). |
| `-L1ncorr <weight>` | float | — | Use weighted combination of L1 and normalised cross-correlation (`ERROR_FUNC_NCORR_L1`); `<weight>` is the NCC weight (`dp.ncorr_weight`). |
| `-debug_voxel <x> <y> <z>` | int×3 | — | Enable debug output for voxel at CRS coordinate `(x, y, z)`. |
| `-v1 <file>` | string | — | Read V1 prior probability label from `<file>` (`label_fname`); enables area-specific stria model. |
| `-label_only` | boolean | — | Run V1 labelling only and exit (`label_only=1`). |
| `-max_grad` | boolean | — | Use the intensity gradient maximum as the target location (`dp.use_max_grad=1`). |
| `-V <n>` | int | — | Debug vertex `n` (`Gdiag_no`). |
| `-L <file>` | string | — | Read a label file and restrict deformation to its vertices. |
| `-R <name>` | string | — | Read pre-computed surfaces with base name `<name>` for initialisation (`read_flag=1`, `read_name=<name>`). |
| `-W <N>` | int | — | Write surface snapshots every `N` iterations (`parms.write_iterations`). |
| `-I` | boolean | — | Invert the transform before applying (`invert=1`). |
| `--version` | boolean | — | Print version string and exit. |
| `-u` or `?` | boolean | — | Print usage and exit. |
| `-identity.nofile` | — | — | **Not a flag.** This is the literal string value `identity.nofile` passed as the `<xform>` positional argument to skip the transform step. When `argv[3]` equals this string (case-insensitive), `MRIStransform()` is not called. Commonly used for ex vivo data or when the volume is already in surface space. |

### Configuration Interactions

- `-T1` and `-T2` are parameter presets that set several `dp.*` fields simultaneously. Applying one of these followed by individual flags (e.g., `-sg`) will override the preset value for that field.
- `-L2` (the default), `-L1`, `-ncorr`, and `-L1ncorr` are mutually exclusive; the last flag parsed wins.
- `-mean`, `-gaussian`, and `-nofilter` are mutually exclusive filter modes; the last flag parsed wins.
- `-white_only` skips all pial-related computation; `-pial` and `-layerIv` have no effect when `-white_only` is also set.
- `-intensity` overrides the location-based deformation with a histogram-based approach; `parms.l_location` is not used in this mode.
- `-v1` combined with `-layerIv` enables the stria-of-Gennari model specific to primary visual cortex.

## Typical Use Cases

```bash
# Deform a white surface using T1-weighted contrast preset, no transform
mris_deform -T1 lh.white T1.mgz identity.nofile lh

# Ex vivo (T2*-weighted) deformation of both white and pial surfaces
mris_deform lh.white exvivo.mgz identity.nofile lh

# Deform only white surface, using L1 norm
mris_deform -white_only -L1 lh.white exvivo.mgz identity.nofile lh
```

## Pipeline Context

`mris_deform` does not appear to be called by `recon-all`. It is intended for specialised high-resolution or ex vivo surface reconstruction workflows where the standard `mris_make_surfaces` approach is insufficient.

> [!gap] Pipeline usage confirmation needed
> Whether `mris_deform` is invoked by any FreeSurfer script (including high-resolution protocols) requires checking the `recon-all` script and any associated high-res processing scripts.

## Gotchas and Caveats

> [!gotcha] Designed for ultra-high-resolution data
> Using `mris_deform` on standard 1 mm isotropic data is likely suboptimal compared to `mris_make_surfaces`. The piecewise model assumes that the laminar intensity profile is partially resolvable.

> [!gotcha] Multiple cortical area profiles
> The tool uses different piecewise models for different cortical areas (V1, agranular, generic). The default is `PROFILE_GENERIC`. Specifying an incorrect area model will produce systematic placement errors in that area.

## Related Tools

- [[mris_make_surfaces]] — the standard surface placement tool used by recon-all
- [[mris_mef_surfaces]] — multi-echo FLASH surface placement (similar specialised approach)
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

Confidence is **high** for the full flag list and command-line syntax (derived from complete reading of `get_option()` and `main()` in `mris_deform.cpp`). The algorithmic approach is well-documented in the struct definitions and code comments. Pipeline integration remains uncertain.
