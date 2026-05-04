---
title: "mris_make_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_surfaces/mris_make_surfaces.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_fix_topology]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[mris_autodet_gwstats]]"
  - "[[surface-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "The multimodal pial refinement (T2/FLAIR) path needs deeper documentation, particularly MRIScomputePialTargetLocationsMultiModal()."
  - "The exact border value computation in MRIScomputeBorderValues_new() with auto-detected stats needs verification."
  - "The precise effect of -inoutin (in_out_in_flag) on surface quality is undocumented."
tags:
  - surface
  - surface-placement
  - white-surface
  - pial-surface
  - autorecon2
  - critical
---

# mris_make_surfaces

## Summary

`mris_make_surfaces` is the primary cortical surface placement tool in the FreeSurfer pipeline. Starting from a topology-correct initial mesh (`orig`), it iteratively deforms the surface to precisely locate the **white matter/gray matter boundary** (white surface) and the **gray matter/CSF boundary** (pial surface) by minimising a combined energy functional that balances MRI intensity adherence, surface smoothness, and self-intersection avoidance. It also produces the cortical thickness estimate (distance between white and pial surfaces) and optionally a mid-cortical (layer IV approximation) surface.

## Source Information

- **Language:** C++
- **Primary source:** `mris_make_surfaces/mris_make_surfaces.cpp`
- **Original author:** Bruce Fischl
- **Also contains (same directory):** `mris_autodet_gwstats.cpp`, `mris_place_surface.cpp`, `mris_mef_surfaces.cpp`, `mris_exvivo_surfaces.cpp`

## Purpose and Context

After `mris_fix_topology` produces a topologically correct surface, the vertex positions remain at the initial tessellation locations (which approximate the white matter boundary but lack precision). `mris_make_surfaces` refines these positions by:

1. **White surface placement:** Deforming vertices from the initial `orig` surface to lie precisely at the WM/GM intensity boundary.
2. **Pial surface placement:** Starting from the white surface, further deforming outward to reach the GM/CSF boundary.

The white and pial surfaces are fundamental to all downstream cortical analyses: cortical thickness (vertex-wise distance between them), parcellation (applied on the surface), surface area, and gyrification index all derive from these surfaces.

In `recon-all`, `mris_make_surfaces` is called **twice**:
- First call (AutoRecon2): places `lh.white` and `lh.pial` using only the T1 volume.
- Second call (AutoRecon3, if T2/FLAIR is available): refines the pial surface using the additional contrast.

## Inputs

The tool reads files from the standard subject directory:

| File | Path | Description |
|------|------|-------------|
| Initial surface | `surf/<hemi>.orig` | Topology-correct initial surface mesh. |
| Brain volume | `mri/brain.mgz` (default) | T1-weighted brain volume (T1 source for white/gray intensity). |
| WM volume | `mri/wm.mgz` | White matter binary mask. |
| Fill volume | `mri/filled.mgz` | Filled WM mask (used for label determination). |
| `aseg.mgz` | `mri/aseg.mgz` | Subcortical segmentation (used to erase cerebellum if `-erase_cerebellum`). |
| `aparc.annot` | `label/<hemi>.aparc.annot` | Parcellation (used to determine midline and cortex label). |
| T2/FLAIR volume | Optional | Secondary modality for pial refinement (`-T2` or FLAIR). |
| White surface stats | Auto-detected or `mris_autodet_gwstats` output | Intensity thresholds for white surface placement. |

## Outputs

| File | Path | Description |
|------|------|-------------|
| White surface | `surf/<hemi>.white` | WM/GM boundary surface. |
| Pial surface | `surf/<hemi>.pial` | GM/CSF boundary surface. |
| Cortical thickness | `surf/<hemi>.thickness` | Per-vertex shortest distance between white and pial (mm). |
| Mean curvature | `surf/<hemi>.curv` | Mean curvature of the white surface. |
| Sulcal depth | `surf/<hemi>.sulc` | Sulcal depth overlay (signed distance from inflated surface). |
| Area | `surf/<hemi>.area` | Per-vertex surface area. |
| Cortex label | `label/<hemi>.cortex.label` | Label of non-medial-wall cortical vertices. |
| Mid-gray surface | `surf/<hemi>.graymid` | Midpoint surface between white and pial (if `-graymid`). |

## Mathematical Foundations

### Energy Functional

The surface deformation minimises:

$$
E_{\text{total}} = w_I E_{\text{intensity}} + w_c E_{\text{curvature}} + w_t E_{\text{tspring}} + w_n E_{\text{nspring}} + w_r E_{\text{repulse}}
$$

where:
- $E_{\text{intensity}}$: attracts each vertex toward a **target intensity** on the normal profile.
- $E_{\text{curvature}}$: penalises sharp local curvature deviations (smoothness prior).
- $E_{\text{tspring}}$: tangential spring term resisting departure from the local mean vertex position.
- $E_{\text{nspring}}$: normal spring term.
- $E_{\text{repulse}}$: self-intersection prevention.

Weights are set by flags: `-intensity`, `-curv`, `-tspring`, `-nspring`, `-repulse`. Default weights are embedded in `INTEGRATION_PARMS`.

### Intensity Target Computation

For each vertex, the algorithm:
1. Samples the MRI intensity along the vertex normal in and out of the current surface position.
2. Computes local intensity statistics: mean and standard deviation of WM and GM intensities within a neighbourhood.
3. Defines intensity thresholds (border values) from auto-detected or user-provided class statistics.

For the **white surface**:
- `max_border_white` (MAX_BORDER_WHITE = 105): upper bound for WM-side intensities.
- `min_border_white` (MIN_BORDER_WHITE = 85): lower bound for WM-side intensities.
- `min_gray_at_white_border` (MIN_GRAY_AT_WHITE_BORDER = 70): minimum GM intensity at the WM boundary.

For the **pial surface**:
- `max_gray` (MAX_GRAY = 95): maximum GM intensity.
- `min_gray_at_csf_border` (MIN_GRAY_AT_CSF_BORDER = 40): minimum GM intensity at the GM/CSF boundary.
- `max_gray_at_csf_border` (MAX_GRAY_AT_CSF_BORDER = 75): maximum intensity allowed at the outer pial boundary.

These default values are calibrated for normalised T1 volumes (brain intensities in the range 0–110). They are overridden by `mris_autodet_gwstats` output in current FreeSurfer versions.

### Multi-resolution Smoothing Schedule

Surface placement uses a multi-scale approach. The number of curvature averaging iterations decreases as the surface approaches its target, from `max_pial_averages` (default: 16) down to `min_pial_averages` (default: 2) for the pial surface, and from `max_white_averages` (default: 4) down to `min_white_averages` (default: 0) for the white surface. This prevents premature locking to a smoothed solution.

### Midline and Medial Wall

After white surface placement, the tool calls `fix_midline()` to prevent the surface from crossing the midline into the contralateral hemisphere, and creates the cortex label file marking the non-medial-wall vertices.

### T2/FLAIR Pial Refinement

When a T2 or FLAIR volume is provided, the pial surface placement is augmented with multimodal information via `MRIScomputePialTargetLocationsMultiModal()`. This function identifies regions where the T2 intensity suggests the pial boundary is misplaced (e.g., due to dura or vessels) and provides corrected target locations. Intensity thresholds (`T2_min_inside`, `T2_max_inside`, `T2_min_outside`, `T2_max_outside`) control which T2 intensities are considered consistent with cortical gray matter.

## Configuration Options

### Positional Arguments

| Argument | Description |
|----------|-------------|
| `<Subject Name>` | FreeSurfer subject identifier. |
| `<Hemisphere>` | `lh` or `rh`. |

### Surface Selection

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-white <name>` | — | `white` | Output name for white surface (default: `white`). Use `NOWHITE` to compute but not save. |
| `-pial <name>` | — | `pial` | Output name for pial surface (default: `pial`). |
| `-whiteonly` | — | — | Only generate white matter surface (skip pial). |
| `-nowhite` | — | — | Only generate pial surface (use existing white surface). |
| `-orig_white <surf>` | — | — | Starting white surface for deformation. |
| `-orig_pial <surf>` | — | — | Starting pial surface for deformation. |

### Input Volumes

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-T1 <vol>` | — | `brain` | T1 volume to use as primary intensity source (default: `brain`). Alias: `-gvol`. |
| `-gvol <vol>` | — | — | Alias for `-T1`. |
| `-wvol <vol>` | — | — | Override volume for white surface placement. |
| `-wm <vol>` | — | `wm` | Override WM volume name (default: `wm`). |
| `-filled <vol>` | — | `filled` | Override filled WM volume name (default: `filled`). |
| `-aseg <vol>` | — | `aseg` | Override aseg volume name used for midline prevention (default: `aseg`). |
| `-SDIR <dir>` | — | — | Override `SUBJECTS_DIR`. |
| `-autodetsurf <file>` | — | — | Use this file (output of `mris_autodet_gwstats`) for auto-detected intensity statistics. |
| `-cover_seg <vol>` | — | — | Create surfaces to cover a segmented volume; disables auto-detect stats and sets `grad_dir=1`. |
| `-orig_sphere <surf>` | — | — | Override sphere surface name used for sphere locations. |
| `-hires <label>` | — | — | Label file for hires processing region. |
| `-highres <label>` | — | — | Alias for `-hires`. |

### Multimodal Pial Refinement

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-T2 <vol>` | — | — | T2 volume for multimodal pial refinement; sets contrast type to T2 and default T2 thresholds. |
| `-T2dura <vol>` | — | — | Alias for `-T2`. |
| `-flair <vol>` | — | — | FLAIR volume for multimodal pial refinement; sets contrast type to FLAIR and default FLAIR thresholds. |
| `-flair_white` | — | — | Deform white matter surface to match FLAIR volume instead of pial. |
| `-flairwhite` | — | — | Alias for `-flair_white`. |
| `-T2_min_inside <thresh>` | — | — | Minimum T2 value allowed inside the cortical ribbon (default with `-T2`: 110). |
| `-T2_max_inside <thresh>` | — | — | Maximum T2 value allowed inside the cortical ribbon (default with `-T2`: 300). |
| `-T2_min_outside <thresh>` | — | — | Minimum T2 value outside pial that drives outward deformation (default with `-T2`: 130). |
| `-T2_max_outside <thresh>` | — | — | Maximum T2 value outside pial that drives outward deformation (default with `-T2`: 300). |
| `-T2_min <thresh>` | — | — | Set both `-T2_min_inside` and `-T2_min_outside` to the same value. |
| `-nsigma_above <n>` | — | — | Number of sigmas above WM mean allowed for GM T2 intensity. |
| `-nsigmas_above <n>` | — | — | Alias for `-nsigma_above`. |
| `-nsigma_below <n>` | — | — | Number of sigmas below WM mean allowed for GM T2 intensity. |
| `-nsigmas_below <n>` | — | — | Alias for `-nsigma_below`. |
| `-nsigma <n>` | — | 2 | Dura threshold as number of sigmas from mean (default: 2). |
| `-nsigmas <n>` | — | — | Alias for `-nsigma`. |
| `-wm_weight <w>` | — | 3 | WM weight in T2 threshold calculation (default: 3). |
| `-dura_thresh <thresh>` | — | — | Manual threshold for dura avoidance in multi-echo protocols. |
| `-dura+thresh <thresh>` | — | — | Alias for `-dura_thresh`. |
| `-dura <name> <nechos>` | — | — | Detect dura using multi-echo data; takes echo basename and number of echoes. |
| `-min_peak_pct <li> <ri> <lo> <ro>` | — | — | Four histogram peak fractions (left/right inside, left/right outside) for local GM threshold bounds. |
| `-max_out <dist>` | — | — | Maximum outward displacement distance (default with `-T2`/`-flair`: 3 mm). |
| `-followgradients` | — | — | Follow gradients to refine pial surface placement. |
| `-pial_offset <val>` | — | — | Offset pial target intensity values by this amount. |
| `-location <w>` | — | — | Weight of the location term (`l_location`) in the energy functional. |

### Smoothing and Averaging

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-pa <max> [<min>]` | — | — | Max (and optionally min) pial curvature averaging iterations (default max: 16, min: 2). |
| `-wa <max> [<min>]` | — | — | Max (and optionally min) white curvature averaging iterations (default max: 4, min: 0). |
| `-smooth <n>` | — | — | Number of smoothing iterations applied to the initial surface before deformation. |
| `-smooth_pial <n>` | — | — | Number of smoothing iterations applied to the pial surface before deformation. |
| `-vavgs <n>` | — | 5 | Number of iterations for smoothing border values (default: 5). |

### Output Control

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-c` | — | — | Do NOT create curvature and area files from white surface. |
| `-cortex <0\|1>` | — | 1 | Set to 0 to disable cortex label file creation (default: 1). |
| `-long` | — | — | Longitudinal mode: changes surface initialisation and some intensity statistics. |
| `-output <suffix>` | — | — | Append suffix to all outputs (prevents overwriting). |
| `-erase_cerebellum` | — | — | Erase cerebellar voxels from the input image (requires `aseg`). |
| `--erasecerebellum` | — | — | Alias for `-erase_cerebellum`. |
| `-nocerebellum` | — | — | Alias for `-erase_cerebellum`. |
| `-erase_brainstem` | — | — | Erase brainstem voxels from the input image (requires `aseg`). |
| `--erasebrainstem` | — | — | Alias for `-erase_brainstem`. |
| `-nobrainstem` | — | — | Alias for `-erase_brainstem`. |
| `-graymid` | — | — | Generate the mid-gray (`graymid`) surface at the midpoint between white and pial. |
| `-write_vals` | — | — | Write gray and white surface target intensity values to `.mgz` files. |
| `-write_aseg <vol>` | — | — | Write corrected aseg volume to this path after surface editing. |
| `-smoothwm <n>` | — | — | Write a smoothed white surface (`smoothwm`) after `n` smoothing iterations. |
| `-name <name>` | — | — | Base name for output files (`parms.base_name`). |
| `-mgz` | — | — | Assume MGZ format for all volume files. |
| `-noauto` | — | — | Disable auto-detection of intensity border ranges. |
| `-noaseg` | — | — | Disable use of aseg volume for midline prevention. |
| `-noaparc` | — | — | Disable use of aparc to prevent surfaces crossing the midline. |
| `-nowmsa` | — | — | Remove WM signal abnormalities (WMSA) from input data before deformation. |

### Intensity Thresholds (manual override)

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-min_border_white <val>` | — | — | Minimum white matter border intensity. |
| `-wlo <val>` | — | — | Alias for `-min_border_white` (same name used in `mri_segment`). |
| `-max_border_white <val>` | — | — | Maximum white matter border intensity. |
| `-min_gray_at_white_border <val>` | — | — | Minimum gray matter intensity at white border. |
| `-max_gray <val>` | — | — | Maximum gray matter intensity. |
| `-ghi <val>` | — | — | Alias for `-max_gray` (same name used in `mri_segment`). |
| `-max_gray_at_csf_border <val>` | — | — | Maximum gray matter intensity at CSF border. |
| `-min_gray_at_csf_border <val>` | — | — | Minimum gray matter intensity at CSF border. |
| `-max_csf <val>` | — | — | Maximum CSF intensity. |
| `-min_csf <val>` | — | — | Minimum CSF intensity. |
| `-max_gray_scale <mgs>` | — | 0 | Scale factor for `outside_hi = (max_border_white + mgs*max_gray) / (mgs+1)` during white deformation (default: 0). |
| `-scale_std <factor>` | — | — | Scale estimated WM and GM intensity standard deviations by this factor. |
| `-variablesigma <val>` | — | — | Variable sigma value for border computation. |
| `-wsigma <sigma>` | — | — | Gaussian smoothing sigma applied to the volume for white surface placement. |
| `-psigma <sigma>` | — | — | Gaussian smoothing sigma applied to the volume for pial surface placement. |
| `-pblur <sigma>` | — | — | Additional Gaussian smoothing sigma applied to pial volume. |
| `-white_offset <val>` | — | — | Offset white target intensity values by this amount. |
| `-mode <0\|1>` | — | — | Use class modes (1) instead of means (0) for intensity statistics. |

### Energy Weights

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-intensity <w>` | — | — | Weight of intensity cost (`l_intensity`). |
| `-curv <w>` | — | — | Weight of curvature cost (`l_curv`). |
| `-tspring <w>` | — | — | Weight of tangential spring cost (`l_tspring`). |
| `-nspring <w>` | — | — | Weight of normal spring cost (`l_nspring`). |
| `-repulse <w>` | — | — | Weight of repulsion force (`l_repulse`). |
| `-spring <w>` | — | — | Weight of generic spring term (`l_spring`). |
| `-spring_nzr <w>` | — | — | Weight of non-zero-rest spring term (`l_spring_nzr`). |
| `-nltspring <w>` | — | — | Weight of nonlinear tangential spring term (`l_nltspring`). |
| `-hinge <w>` | — | — | Weight of hinge energy term (`l_hinge`). |
| `-tsmooth <w>` | — | — | Weight of tangential smoothing term (`l_tsmooth`). |
| `-grad <w>` | — | — | Weight of gradient term (`l_grad`). |
| `-grad_dir <int>` | — | — | Gradient direction constraint: -1 (inward), 0 (unconstrained), 1 (outward). |
| `-dt <val>` | — | — | Time step for momentum integration (`parms.dt`). |
| `-tol <pct>` | — | — | Convergence tolerance as percentage change in SSE/RMS. |
| `-nwhite <n>` | — | — | Number of integration steps for white surface positioning. |
| `-ngray <n>` | — | — | Number of integration steps for pial surface positioning. |
| `-lm` | — | — | Use line minimisation integration instead of momentum. |
| `-nbrs <n>` | — | — | Vertex neighbourhood size. |
| `-nbhd_size <n>` | — | — | Neighbourhood size for thickness calculation. |
| `-inoutin` | — | — | Apply a final white matter deformation pass after pial placement (in-out-in). |
| `-fix_mtl` | — | — | Lock hippocampus and amygdala vertices during pial deformation. |
| `-both` | — | — | Do not remove contralateral hemisphere vertices. |
| `-soap` | — | — | Use soap-bubble smoothing to remove vertex self-intersections. |
| `-unpinch` | — | — | Remove pinches from surface before deforming. |
| `-add` | — | — | Add vertices to the tessellation during deformation. |
| `-max <mm>` | — | 5 mm | Maximum cortical thickness (default: 5 mm). |
| `-max_thickness <mm>` | — | — | Alias for `-max`. |
| `-fill_interior <label>` | — | — | Fill the interior of the surface with this label value. |
| `-pnbrs <n>` | — | — | Spread pial constraint values out to `n` vertex neighbours. |
| `-wval <vno> <val>` | — | — | Constrain white surface target intensity for vertex `vno` to `val`. |
| `-pval <vno> <val>` | — | — | Constrain pial surface target intensity for vertex `vno` to `val`. |
| `-rval <label>` | — | RH_LABEL | Fill value for right hemisphere (default: RH_LABEL). |
| `-lval <label>` | — | LH_LABEL | Fill value for left hemisphere (default: LH_LABEL). |
| `-openmp <n>` | — | — | Set number of OpenMP threads. |
| `-v6-cbv` | — | — | Use version 6 border value computation method. |
| `-no_rms` | — | — | Disable RMS error decrease check (`parms.check_tol = 0`). |
| `-norms` | — | — | Alias for `-no_rms`. |

### Diagnostic / Debug

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-q` | — | — | Omit self-intersection check; generate gray/white surface only. |
| `-v <vertexno>` | — | — | Set global diagnostic vertex number (`Gdiag_no`). |
| `-debug-vertex <vno> <surf> <mri> <aseg> <which> <ins_hi> <blo> <bhi> <olo> <ohi> <sigma>` | — | — | Run `MRIScomputeBorderValues` for a single vertex with explicit parameters and exit. Useful for diagnosing surface placement failures at a specific vertex. |
| `-debug_voxel <x> <y> <z>` | — | — | Set global debug voxel coordinates. Alias: `-d`. |
| `-save-target` | — | — | Save the target surface to disk (debugging). |
| `-no-save-target` | — | — | Disable saving of target surface. |
| `-save-res` | — | — | Save the residual surface to disk (debugging). |
| `-no-save-res` | — | — | Disable saving of residual surface. |
| `-rip <file>` | — | — | Save ripflag overlay to this file (full path; hemi/suffix must be included). |
| `-sigma-white <file>` | — | — | Save white surface sigma overlay to this file. |
| `-sigma-pial <file>` | — | — | Save pial surface sigma overlay to this file. |
| `-no-unitize` | — | — | Disable face normal unitisation (`UnitizeNormalFace = 0`). |
| `-first-peak-d1` | — | — | Enable `FindFirstPeakD1` option in `MRIScomputeBorderValues_new()`. |
| `-first-peak-d2` | — | — | Enable `FindFirstPeakD2` option in `MRIScomputeBorderValues_new()`. |
| `-read_pinch <file>` | — | — | Read pinch initialisation from file before deforming. |
| `-overlay` | — | — | Toggle T1 volume overlay with edited white matter. |
| `-location-mov-len <val>` | — | — | Set `LOCATION_MOVE_LEN` used in `mrisComputeTargetLocationTerm()`. |
| `-w <n>` | — | — | Set `parms.write_iterations`; enables `DIAG_WRITE`. |
| `-ct <file>` | — | — | Read a color table from file. |
| `-b <scale>` | — | — | Set `base_dt_scale` (scales `parms.base_dt`). |
| `-d <x> <y> <z>` | — | — | Set global debug voxel coordinates (same as `-debug_voxel`). |
| `-m <momentum>` | — | — | Set momentum value and switch to momentum integration (must be in `[0, 1)`). |
| `-n <n>` | — | — | Set number of integration iterations (`parms.niterations`). |
| `-o <surf>` | — | — | Read original vertex positions from this surface file (`orig_name`). |
| `-r <w>` | — | — | Set surface repulsion weight (`l_surf_repulse`). |
| `-s <suffix>` | — | — | Append suffix string to output names (legacy single-char alias for file suffix). |
| `-t <xform>` | — | — | Apply ventricular transform from this file. |

## Configuration Interactions

- `-whiteonly` and `-nowhite` are mutually exclusive; each suppresses half the pipeline.
- `-nowhite` requires a previously-placed white surface to exist (either `?h.white` or the surface specified by `-orig_white`). Without it, the tool will fail.
- `-orig_white` is NOT smoothed before white surface deformation; the smoothed initial surface is first computed from `orig`, and then overwritten by `orig_white`. This allows starting from a previously placed white surface without re-smoothing.
- `-T2_*` flags only take effect when a T2 or FLAIR volume is also provided (via `recon-all` `-T2` or `-FLAIR` flags). Setting these flags without a secondary volume has no effect.
- `-cortex 0` disables creation of the cortex label file; downstream tools that use this label (`mris_anatomical_stats`, parcellation) will then fail or produce incorrect results.
- `-c` suppresses creation of curvature/area files; this may break downstream tools that expect `?h.curv` and `?h.area` to exist.
- `-long` changes initialisation behaviour for longitudinal processing.
- The default intensity thresholds are calibrated for volumes where WM ≈ 110 and CSF ≈ 0. Volumes with different intensity ranges (e.g., from `mri_convert -conform` without intensity normalisation) may require manual threshold adjustment.

> [!gotcha] Auto-detected stats override defaults
> In current FreeSurfer, `mris_autodet_gwstats` runs before `mris_make_surfaces` and produces intensity statistics that override the hardcoded defaults. If `mris_autodet_gwstats` output is missing or wrong, `mris_make_surfaces` may produce incorrect surfaces without explicit error messages.

## Typical Use Cases

### Standard recon-all call (white and pial)

```bash
mris_make_surfaces subject01 lh
```

### White surface only (first pass in some pipelines)

```bash
mris_make_surfaces -whiteonly subject01 lh
```

### Pial surface only (reuse previously placed white)

```bash
mris_make_surfaces -nowhite subject01 lh
```

### T1 + T2 pial refinement

```bash
# This is invoked by recon-all -T2 <T2.mgz> automatically:
mris_make_surfaces -nowhite \
  -T2 T2.mgz \
  -T2_min_inside 110 -T2_max_inside 300 \
  -T2_min_outside 130 -T2_max_outside 300 \
  subject01 lh
```

### Debug a specific vertex

```bash
# Set global diagnostic vertex (outputs per-vertex debug during normal run)
mris_make_surfaces -v 12345 subject01 lh

# Run per-vertex border value debugging standalone and exit
mris_make_surfaces -debug-vertex 12345 lh.white brain.mgz aseg.mgz 1 110 85 105 40 75 2.0
```

## Pipeline Context

`mris_make_surfaces` is called in `recon-all` **AutoRecon2** (white surface) and **AutoRecon3** (pial refinement with T2/FLAIR if available):

### AutoRecon2 sequence leading to first call

| Step | Tool | Output |
|------|------|--------|
| Topology correction | `mris_fix_topology` | `lh.orig` |
| **White+pial placement** | **`mris_make_surfaces`** | **`lh.white`, `lh.pial`, `lh.thickness`** |
| Smoothing (white) | `mris_smooth` | `lh.smoothwm` |
| Inflation | `mris_inflate` | `lh.inflated` |
| Curvature | `mris_curvature` | `lh.white.H`, `lh.white.K` |

### AutoRecon3 sequence (with T2/FLAIR)

| Step | Tool | Output |
|------|------|--------|
| Pial refinement | `mris_make_surfaces -nowhite` | `lh.pial` (updated) |
| Thickness recompute | `mris_make_surfaces` | `lh.thickness` (updated) |

**Runs before:** [[mris_smooth]] (second pass), parcellation tools
**Runs after:** [[mris_fix_topology]], [[mris_autodet_gwstats]]
**Related pipeline:** [[wiki/pipelines/recon-all|recon-all]]

## Gotchas and Caveats

> [!gotcha] Intensity normalisation required
> The default intensity thresholds assume WM ≈ 110 (FreeSurfer normalised space). Un-normalised volumes (raw T1) will produce grossly misplaced surfaces. The brain volume (`brain.mgz`) should already have been through `mri_normalize`.

> [!gotcha] Cerebellum removal
> `-erase_cerebellum` requires `aseg.mgz` to exist and correctly label the cerebellum. If the cerebellar labelling is wrong, the tool will erase incorrect voxels.

> [!gotcha] Dura and vessel artefacts in pial placement
> The pial surface is susceptible to being attracted to dural vessels or dura matter, which can have similar T1 intensities to gray matter. The T2/FLAIR refinement (`-nowhite` with T2 volume) specifically addresses this. Without T2/FLAIR, the pial surface may be systematically too thick in affected regions.

> [!gotcha] `-w` flag has unknown behaviour
> The source code documents the `-w <value>` flag with the comment "unknown." Its effect is not described in the help XML or the source comments. Do not use this flag.

> [!gotcha] NOWHITE output name
> Setting `-white NOWHITE` causes the white surface to be computed (and used for pial placement) but **not written to disk**. This is subtly different from `-nowhite`, which skips white surface placement entirely.

> [!gotcha] Longitudinal mode changes initialisation
> With `-long`, the surface initialisation and some intensity statistics are computed differently to account for the known subject template. Do not mix `-long` with standard `recon-all` processing.

## Related Tools

- [[mris_fix_topology]] — must run before this tool; produces `lh.orig`
- [[mris_autodet_gwstats]] — auto-detects intensity statistics used by this tool
- [[mris_smooth]] — smooths the white surface after placement
- [[mris_inflate]] — inflates the smoothed white surface
- [[mris_sphere]] — maps the inflated surface to a sphere (runs after this)
- [[mris_register]] — registers the sphere to an atlas (runs after this)
- [[surface-format]] — FreeSurfer surface file format
- [[wiki/pipelines/recon-all|recon-all]] — pipeline orchestrator

## Confidence and Gaps

Confidence is **high** for the overall algorithm, the primary flag list (from help XML and source global variable declarations), default values, and pipeline context. Confidence is **medium** for the exact border value computation logic and the multimodal pial refinement pathway.

> [!gap] Auto-detected statistics interaction
> The interaction between `mris_autodet_gwstats` output files and the internal threshold variables in `mris_make_surfaces` has not been traced through the source. The exact mechanism by which `mris_autodet_gwstats` results are communicated to `mris_make_surfaces` (file format, flag passing) requires further investigation.

> [!gap] Multimodal pial refinement
> The `MRIScomputePialTargetLocationsMultiModal()` function (now in `mrisurf_mri.cpp`) handles T2/FLAIR-guided pial refinement. Its algorithm — particularly how it identifies dura/vessel voxels and computes corrected pial targets — has not been documented.

> [!gap] in_out_in_flag effect
> The `-inoutin` flag sets `in_out_in_flag = 1` which applies a final white matter deformation pass after pial placement. The precise effect on surface quality and when it should be used is not documented in the source comments.
