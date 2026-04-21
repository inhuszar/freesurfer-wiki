---
title: "mris_ms_refine"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_ms_refine/mris_ms_refine.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[mris_place_surface]]"
  - "[[mris_refine_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Whether this tool is called in any standard recon-all stage is unknown"
tags:
  - surface
  - multimodal
  - refinement
  - FLASH
---

# mris_ms_refine

## Summary

`mris_ms_refine` refines the placement of cortical surfaces (white and pial boundaries) using multi-spectral (multi-echo FLASH) MRI data. It uses voxel-wise estimates of T1 relaxation time and proton density (PD) derived from multiple FLASH volumes to classify tissue as white matter, gray matter, or CSF, and iteratively adjusts surface vertex positions to maximise tissue boundary contrast.

## Source Information

- **Language:** C++
- **Source file:** `mris_ms_refine/mris_ms_refine.cpp`
- **Key constants:** `MAX_FLASH_VOLUMES 50`, `ORIG_EXPANSION_DIST 1.0 mm`, `MAX_SAMPLES 1000`
- **Key data structure:** `EXTRA_PARMS` — per-vertex T1/PD statistics for WM, GM, CSF, with inward/outward displacement bounds

## Purpose and Context

Standard FreeSurfer surface placement (`mris_make_surfaces`, `mris_place_surface`) relies on a single T1-weighted volume. `mris_ms_refine` extends this to the multi-spectral setting: given $N$ FLASH volumes acquired at different flip angles, it estimates T1 and PD at each voxel via a least-squares fit to the Ernst equation, then uses these biophysical parameters to make tissue-classification decisions more reliable, particularly in pathological or atypical brains where a single T1-weighted signal is ambiguous.

The tool also supports an optional "fix T1" mode and scales all image intensities to a common PD reference before processing.

## Inputs

- A cortical surface file in FreeSurfer binary surface format (white or pial)
- Two or more FLASH MRI volumes (MGZ or other FS-readable format), each acquired with a different flip angle
- Optionally a pre-computed T1 map and PD map

## Outputs

- Refined cortical surface file (FreeSurfer binary surface format)

## Mathematical Foundations

The FLASH signal for a given voxel at flip angle $\alpha$ and repetition time $TR$ is:

$$S(\alpha) = M_0 \sin\alpha \cdot \frac{1 - e^{-TR/T1}}{1 - \cos\alpha \cdot e^{-TR/T1}}$$

By acquiring at multiple flip angles, T1 and $M_0$ (proportional to PD) can be estimated. The code computes per-vertex histograms of T1 and PD values in WM and GM regions and derives adaptive thresholds stored in the `EXTRA_PARMS` structure:

```c
IS_WM(T1,PD,vno,ep) = (T1 >= ep->cv_min_wm_T1[vno]) && (T1 <= ep->cv_max_wm_T1[vno]) && ...
IS_GM(T1,PD,vno,ep) = (T1 >= ep->cv_min_gm_T1[vno]) && (T1 <= ep->cv_max_gm_T1[vno]) && ...
```

This per-vertex adaptive classification is a key distinction from the fixed-threshold approach in standard surface placement.

## Configuration Options

**Usage:** `mris_ms_refine [options] <subject> <hemisphere> <xform> <flash1> <flash2> ... <residuals>`

Flags are parsed by a custom `get_option()` function using case-insensitive matching. All long option names strip the leading `--` before matching.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--nbrs` | `int` | — | Set neighbourhood size for surface averaging. |
| `--sample` | `nearest`\|`trilinear` | — | Volume sampling type: `nearest` or `trilinear`. |
| `--fix_T1` | (flag) | off | Fix T1 values of gray and white matter (enables T1-corrected tissue classification). |
| `--min_max_scale` | `int` | — | Min/max filter size (in voxels); controls the scale of intensity normalization. |
| `--orig` | (flag) | off | Use the `orig` surface as the initial surface placement instead of the input surface. |
| `--start` | `white pial` | — | Use named white and pial surface files for initial placement (disables `--orig`). Two string arguments. |
| `--maxv` | `int` | — | Limit computations to the first N vertices (for debugging). |
| `--minv` | `int` | — | Start computations from vertex number N (for debugging). |
| `--dstep` | `float` | — | Volume sampling step size in mm along the normal. |
| `--T1` | `file` | — | Read pre-computed T1 parameter map from file (bypasses T1 estimation from FLASH). |
| `--TOL` | `float` | `1e-3` | Integration tolerance for convergence. |
| `--PD` | `file` | — | Read pre-computed PD (proton density) parameter map from file. |
| `--brain` | `string` | `brain` | Name of brain volume to load from the subject's `mri/` directory. |
| `--SDIR` | `dir` | `$SUBJECTS_DIR` | Override subjects directory. |
| `--median` | (flag) | off | Apply median filtering to parameter maps before use. |
| `--map_dir` | `dir` | — | Read parameter maps and residuals from this directory instead of the default. |
| `--graymid` | (flag) | off | Generate a graymid surface at the midpoint between white and pial. |
| `--rval` | `int` | — | Fill value for right hemisphere in the segmentation. |
| `--nbhd_size` | `int` | — | Neighbourhood size for cortical thickness calculation. |
| `--lval` | `int` | — | Fill value for left hemisphere in the segmentation. |
| `--whiteonly` | (flag) | off | Generate only the white matter surface (skip pial refinement). |
| `--pial` | `string` | — | Output pial surface filename. |
| `--write_vals` | (flag) | off | Write gray and white surface targets to `.w` files for inspection. |
| `--name` | `string` | — | Base name for output files (overrides `parms.base_name`). |
| `--dt` | `float` | `0.5` | Integration time step; sets `parms.dt` and switches to momentum integration. |
| `--spring` | `float` | `0.0` | Spring energy weight (`parms.l_spring`). |
| `--repulse` | `float` | `1.0` | Self-repulsion energy weight (`parms.l_repulse`). |
| `--grad` | `float` | — | Gradient energy weight (`parms.l_grad`). |
| `--external` | `float` | `1.0` | External energy weight (`parms.l_external`). |
| `--tspring` | `float` | `1.0` | Tangential spring energy weight (`parms.l_tspring`). |
| `--nspring` | `float` | `0.5` | Normal spring energy weight (`parms.l_nspring`). |
| `--curv` | `float` | `0.1` | Curvature energy weight (`parms.l_curv`). |
| `--smooth` | `int` | — | Number of smoothing iterations to apply to the surface before deformation. |
| `--smooth_parms` | `int` | — | Number of smoothing iterations to apply to parameter maps. |
| `--output` | `string` | — | Output suffix appended to all output file names. |
| `--vavgs` | `int` | — | Number of averaging iterations to smooth surface values before use. |
| `--white` | `string` | `white` | White matter surface name. |
| `--intensity` | `float` | `0.0` | Intensity energy weight (`parms.l_intensity`). |
| `--lm` | (flag) | off | Use line minimization instead of momentum integration. |
| `--smoothwm` | `int` | — | Write a smoothed white-matter surface with this many iterations. |
| `--sigma` | `float` | — | Gaussian smoothing sigma applied to volumes. |
| `--add` | (flag) | off | Allow adding vertices to the tessellation during deformation. |
| `-S` | `string` | — | Suffix appended to output filenames (single-char alias). |
| `-T` | `file` | — | Apply ventricular transform from file (sets `xform_fname`). |
| `-O` | `string` | — | Read original vertex positions from named surface. |
| `-Q` | (flag) | off | Quick mode: disable self-intersection test. |
| `-P` | (flag) | off | Enable intensity profile plotting (diagnostic). |
| `-A` | `int [int]` | — | Set `max_averages`; optionally set `min_averages` as a second integer if next arg is a digit. |
| `-M` | `float` | `0.0` | Set integration momentum and switch to momentum mode. |
| `-R` | `float` | `5.0` | Surface repulsion energy weight (`parms.l_surf_repulse`). |
| `-B` | `float` | — | Base dt scale factor (`base_dt_scale`). |
| `-V` | `int` | — | Diagnostic vertex number (`Gdiag_no`). |
| `-C` | (flag) | on | Toggle creation of area and curvature files for the white surface. |
| `-W` | `int` | — | Write intermediate surfaces every N iterations (also enables `DIAG_WRITE`). |
| `-N` | `int` | `100` | Number of optimization iterations (`parms.niterations`). |

## Configuration Interactions

- The tool requires at least two FLASH volumes to estimate T1 and PD; a single volume will produce undefined behaviour.
- `--T1` and `--PD` bypass the FLASH-based T1/PD estimation; if provided, the FLASH volumes are still read but T1/PD are taken from the supplied maps.
- `--orig` and `--start` are mutually exclusive; `--start` wins (sets `orig_flag = 0`).
- `--lm` and `-M` are mutually exclusive integration mode selectors.
- `-W` enables `DIAG_WRITE`, which activates verbose diagnostic output throughout the deformation loop.
- `-A` accepts one or two integer arguments depending on whether the next token is a digit.

## Typical Use Cases

```bash
# Refine white surface using two FLASH volumes
mris_ms_refine lh.white flash_flip5.mgz flash_flip20.mgz lh.white.ms

# Restrict to a subset of vertices for debugging
mris_ms_refine -vno 1000 5000 lh.white flash5.mgz flash20.mgz flash30.mgz lh.white.ms_debug
```

> [!gap] These command lines are reconstructed from source code inspection, not from validated runs.

## Pipeline Context

`mris_ms_refine` is not called in the standard `recon-all` pipeline. It is intended for research use when multi-echo FLASH data are available, as a refinement step after initial surface creation by [[mris_make_surfaces]] or [[mris_place_surface]].

Typical pipeline position:
1. [[recon-all]] autorecon2 produces initial white/pial surfaces
2. `mris_ms_refine` applies multi-spectral correction to improve placement

## Gotchas and Caveats

> [!gotcha] Per-vertex adaptive thresholds
> Unlike standard surface placement, this tool computes tissue classification thresholds separately for each vertex based on the local T1/PD distribution. This makes it more robust to regional intensity variations but also means that global intensity scaling artifacts in FLASH data will propagate unevenly.

> [!gotcha] Maximum FLASH volumes
> The hard limit `MAX_FLASH_VOLUMES 50` is set in the code. Exceeding this will cause a buffer overflow.

> [!gotcha] ORIG_EXPANSION_DIST
> The constant `ORIG_EXPANSION_DIST 1.0` (mm) approximates the average cortical thickness used to initialise inward/outward search bounds. This is a global default; the actual cortical thickness varies considerably and is estimated per-vertex.

## Related Tools

- [[mris_make_surfaces]] — standard single-modality surface placement
- [[mris_place_surface]] — modern replacement for mris_make_surfaces
- [[mris_refine_surfaces]] — refines surfaces in a labeled region
- [[mris_ms_surface_CNR]] — computes contrast-to-noise ratio along the surface from multi-echo data

## Confidence and Gaps

**Confident (from code):** T1/PD estimation via FLASH signal model; per-vertex adaptive WM/GM/CSF classification; `EXTRA_PARMS` structure fields; support for up to 50 FLASH volumes.

**Confident (from code):** Complete flag list confirmed from `get_option()`. T1/PD estimation via FLASH signal model; per-vertex adaptive WM/GM/CSF classification; `EXTRA_PARMS` structure fields; support for up to 50 FLASH volumes; all energy weights and their defaults.

**Uncertain:** Exact output file naming convention; whether this tool is compatible with FS 8.x's updated surface I/O routines.
