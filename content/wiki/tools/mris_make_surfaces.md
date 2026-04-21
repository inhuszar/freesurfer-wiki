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
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The multimodal pial refinement (T2/FLAIR) path needs deeper documentation, particularly MRIScomputePialTargetLocationsMultiModal()."
  - "The exact border value computation in MRIScomputeBorderValues_new() with auto-detected stats needs verification."
  - "The in_out_in_flag (Arthur's flag) behaviour is undocumented."
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

| Flag | Description |
|------|-------------|
| `-white <name>` | Output name for white surface (default: `white`). Use `NOWHITE` to compute but not save. |
| `-pial <name>` | Output name for pial surface (default: `pial`). |
| `-whiteonly` | Only generate white matter surface (skip pial). |
| `-nowhite` | Only generate pial surface (use existing white surface). |
| `-orig_white <surf>` | Starting white surface for deformation. |
| `-orig_pial <surf>` | Starting pial surface for deformation. |

### Input Volumes

| Flag | Description |
|------|-------------|
| `-T1 <T1vol>` | T1 volume to use as primary intensity source (default: `brain`). |
| `-wvol <whitevol>` | Override volume for white surface placement. |
| `-SDIR <dir>` | Override `SUBJECTS_DIR`. |

### Multimodal Pial Refinement

| Flag | Description |
|------|-------------|
| `-T2_min_inside <thresh>` | Minimum T2 value allowed inside the cortical ribbon. |
| `-T2_max_inside <thresh>` | Maximum T2 value allowed inside the cortical ribbon. |
| `-T2_outside_min <thresh>` | Minimum T2 value outside pial that drives outward deformation. |
| `-T2_outside_max <thresh>` | Maximum T2 value outside pial that drives outward deformation. |
| `-nsigma_above <n>` | Number of sigmas above WM mean allowed for GM T2 intensity. |
| `-nsigma_below <n>` | Number of sigmas below WM mean allowed for GM T2 intensity. |
| `-wm_weight <w>` | WM weight in T2 threshold calculation (default: 3). |
| `-dura_thresh <thresh>` | Manual threshold for dura avoidance in multi-echo protocols. |
| `-min_peak_pct <inside> <outside>` | Histogram peak fraction for local GM thresholds. |

### Smoothing and Averaging

| Flag | Description |
|------|-------------|
| `-a <avgs>` | Curvature averaging iterations (default: 10). |
| `-pa <avgs>` | Max pial curvature averaging (default: 16). |
| `-wa <avgs>` | Max white curvature averaging (default: 4). |

### Output Control

| Flag | Description |
|------|-------------|
| `-c` | Do NOT create curvature and area files from white surface. |
| `-cortex 0-or-1` | Set to 0 to disable cortex label file creation. |
| `-long` | Longitudinal mode. |
| `-output <suffix>` | Append suffix to all outputs (prevents overwriting). |
| `-erase_cerebellum` | Erase cerebellar voxels from the input image (requires `aseg`). |

### Intensity Thresholds (manual override)

| Flag | Description |
|------|-------------|
| `-min_border_white <val>` | Minimum white matter border intensity. |
| `-max_border_white <val>` | Maximum white matter border intensity. |
| `-min_gray_at_white_border <val>` | Minimum gray matter intensity at white border. |
| `-max_gray <val>` | Maximum gray matter intensity. |
| `-max_gray_at_csf_border <val>` | Maximum gray matter intensity at CSF border. |
| `-min_gray_at_csf_border <val>` | Minimum gray matter intensity at CSF border. |
| `-max_csf <val>` | Maximum CSF intensity. |
| `-first_wm_peak` | Settle WM surface at first peak in intensity profile rather than highest. |
| `-max_gray_scale <mgs>` | Scale factor for setting `outside_hi` during white deformation (default: 0). |

### Energy Weights

| Flag | Description |
|------|-------------|
| `-intensity <w>` | Weight of intensity cost. |
| `-curv <w>` | Weight of curvature cost. |
| `-tspring <w>` | Weight of tangential spring cost. |
| `-nspring <w>` | Weight of normal spring cost. |
| `-repulse <w>` | Weight of repulsion force. |

### Diagnostic / Debug

| Flag | Description |
|------|-------------|
| `-q` | Omit self-intersection check; generate gray/white surface only. |
| `-v <vertexno>` | Set diagnostic vertex number. |
| `-diag-vertex <vertexno>` | Enable per-vertex debug output. |
| `-save-target` | Save target surface (debugging). |
| `-save-res` | Save residual surface (debugging). |
| `-rip <ripfile>` | Save ripflag overlay. |
| `-sigma-white <file>` | Save white surface sigma overlay. |
| `-sigma-pial <file>` | Save pial surface sigma overlay. |
| `-border-vals-hires` | Enable hires border values options. |
| `-no-unitize` | Disable face normal unitisation. |
| `-w <value>` | Unknown (source comment says "unknown"). |

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
  -T2_min_inside 10 -T2_max_inside 300 \
  -T2_outside_min 10 -T2_outside_max 300 \
  subject01 lh
```

### Debug a specific vertex

```bash
mris_make_surfaces -diag-vertex 12345 subject01 lh
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
**Related pipeline:** [[recon-all]]

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
- [[recon-all]] — pipeline orchestrator

## Confidence and Gaps

Confidence is **high** for the overall algorithm, the primary flag list (from help XML and source global variable declarations), default values, and pipeline context. Confidence is **medium** for the exact border value computation logic and the multimodal pial refinement pathway.

> [!gap] Auto-detected statistics interaction
> The interaction between `mris_autodet_gwstats` output files and the internal threshold variables in `mris_make_surfaces` has not been traced through the source. The exact mechanism by which `mris_autodet_gwstats` results are communicated to `mris_make_surfaces` (file format, flag passing) requires further investigation.

> [!gap] Multimodal pial refinement
> The `MRIScomputePialTargetLocationsMultiModal()` function (now in `mrisurf_mri.cpp`) handles T2/FLAIR-guided pial refinement. Its algorithm — particularly how it identifies dura/vessel voxels and computes corrected pial targets — has not been documented.

> [!gap] in_out_in_flag
> A flag `in_out_in_flag` is defined in the source with the comment "for Arthur (as are most things)". Its effect on surface placement is not documented.
