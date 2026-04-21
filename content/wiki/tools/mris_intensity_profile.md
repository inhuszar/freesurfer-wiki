---
title: "mris_intensity_profile"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_thickness/mris_intensity_profile.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Number and spacing of depth samples along the cortical profile not confirmed"
  - "Normalization scheme (inorm vs norm_gw etc.) not fully traced"
tags:
  - surface
  - intensity
  - cortical-depth
  - profile
---

# mris_intensity_profile

## Summary

`mris_intensity_profile` computes the intensity profile of an MRI volume through the cortical ribbon along the surface normal at each vertex. For each vertex on the cortical surface, it samples the MRI intensity at multiple depths between the white matter and pial surfaces, producing a per-vertex multi-frame overlay representing the laminar intensity profile. This is useful for studying cortical myelination, intracortical contrast, and laminar-specific signal in quantitative MRI (e.g., T1, T2*, R1).

## Source Information

- **Language:** C++
- **Source file:** `mris_thickness/mris_intensity_profile.cpp` (co-located with thickness tools)
- **Original author:** Bruce Fischl

## Purpose and Context

The cortical intensity profile captures how MRI signal varies from white matter to CSF across the cortical ribbon. Key applications:
- **Intracortical myelin mapping**: T1 signal drops more steeply near the white matter in heavily myelinated areas
- **Laminar MRI analysis**: sub-millimeter MRI can resolve cortical layers
- **Cortical type mapping**: different cytoarchitectural types show distinct profile shapes
- **Quality control**: checks for misplaced surfaces

The tool samples MRI intensity along surface normals at `max_samples` points (default: 20) spanning from just inside the white matter surface to the pial surface.

## Inputs

| Input | Description |
|-------|-------------|
| Subject | FreeSurfer subject directory (resolved via `SUBJECTS_DIR`) |
| Hemisphere | `lh` or `rh` |
| MRI volume | Volume from which intensities are sampled (e.g., `T1.mgz`, `norm.mgz`) |
| White surface | `?h.white` (default surface name: `white`) |
| Pial surface | `?h.pial` (default surface name: `pial`) |
| Sphere | `?h.sphere` (for neighborhood lookup) |
| Aseg | Optional segmentation (`aseg.mgz`) for WM normalization |

## Outputs

| Output | Description |
|--------|-------------|
| Profile overlay | Multi-frame surface MGH file: each frame is one depth level (white → pial) |
| WM intensities | Optional: white matter reference intensities per vertex |
| Thickness | Optional: written if `--write_thickness` specified |
| Polynomial fit | Optional: polynomial fit to profile if `--poly` or `--quad` |

## Mathematical Foundations

For each vertex $v$ with white surface position $\mathbf{w}_v$ and pial surface position $\mathbf{p}_v$:

The sample position at fractional depth $t \in [0, 1]$ is:

$$
\mathbf{x}_v(t) = (1-t)\mathbf{w}_v + t\mathbf{p}_v
$$

MRI intensity is sampled at $N = $ `max_samples` equally-spaced depth levels:
$$
I_v(n) = I_{\text{MRI}}\left(\mathbf{x}_v\left(\frac{n}{N-1}\right)\right), \quad n = 0, 1, \ldots, N-1
$$

Normalization modes (controlled by various flags):
- `norm_gw`: normalize by (gray - white) intensity contrast
- `norm_white`: normalize by white matter reference intensity at that vertex
- `norm_csf`: normalize by CSF intensity
- `inorm`: intensity normalization using WM reference

> [!gap] Exact interpolation method
> The sampling uses `MRISfindNearestVerticesAndMeasureCorticalIntensityProfiles` which likely uses trilinear interpolation within the volume. The exact implementation has not been confirmed.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-wm_border_mm W` | float | 3.0 | Distance from WM border for WM reference sampling |
| `-max_samples N` | integer | 20 | Number of depth samples between WM and pial |
| `-max_thick T` | float | 5.0 | Maximum cortical thickness to consider (mm) |
| `-nbhd_size N` | integer | 2 | Neighborhood size for profile computation |
| `-nbrs N` | integer | 1 | Nearest-neighbor count |
| `-navgs N` | integer | 0 | Number of profile averaging iterations |
| `-flat flat_name` | string | — | Name of flatmap to project onto |
| `-flat_res R` | float | 0 | Flatmap resolution |
| `-normalize` | — | off | Normalize profiles by local WM intensity |
| `-inorm` | — | off | Intensity normalization |
| `-norm_gw` | — | off | Normalize by (gray - white) intensity |
| `-norm_white W` | float | — | White matter normalization reference |
| `-norm_csf C` | float | — | CSF normalization reference |
| `-norm_pial P` | float | — | Pial normalization reference |
| `-norm_mid M` | float | — | Mid-cortex normalization reference |
| `-norm_mean M` | float | — | Mean normalization |
| `-norm_median M` | float | — | Median normalization |
| `-zero_mean` | — | off | Zero-mean each profile |
| `-use_normal` | — | off | Use surface normal direction instead of vertex-to-vertex |
| `-use_pial 0|1` | 0/1 | 1 | Whether to use pial surface as outer boundary |
| `-pial pial_name` | string | `pial` | Name of pial surface |
| `-white white_name` | string | `white` | Name of white surface |
| `-label label_name` | string | — | Restrict computation to labeled region (repeatable) |
| `-overlay fname t0 t1` | path ints | — | Use overlay as mask |
| `-curv fname thresh` | path float | — | Curvature mask file and threshold |
| `-sdir dir` | path | `$SUBJECTS_DIR` | Subjects directory |
| `-remove_bad` | — | off | Remove profiles with bad boundary values |
| `-num_erode N` | integer | 0 | Erode cortex label N times |
| `-thresh T` | float | — | Threshold for bad profile detection |
| `-pial_normal_avgs N` | integer | 5 | Averaging iterations for pial normal computation |
| `-laplace_thick` | — | off | Use Laplace equation for thickness |
| `-laplace_res R` | float | 0.5 | Laplace resolution |
| `-read_laplace name` | string | — | Read pre-computed Laplace solution |
| `-write_surf name` | string | — | Write computed surface to this name |
| `-sphere_name name` | string | `sphere` | Sphere surface name |
| `-write_thickness fname` | path | — | Write computed thickness to file |
| `-poly` | — | off | Fit polynomial to each profile |
| `-quad` | — | off | Fit quadratic to each profile |
| `-wm_norm fname` | path | — | WM normalization volume |

## Typical Use Cases

**Compute cortical intensity profiles from T1 volume:**
```bash
mris_intensity_profile -max_samples 30 bert lh T1.mgz profiles_lh.mgz
```

**Compute normalized profiles using white matter reference:**
```bash
mris_intensity_profile -normalize -wm_border_mm 2 bert lh T1.mgz profiles_normalized_lh.mgz
```

## Pipeline Context

Not part of standard `recon-all`. This is a post-processing tool for intracortical MRI analysis.

Typical dependency chain:
1. [[recon-all]] produces white and pial surfaces
2. [[mris_make_surfaces]] places surfaces precisely
3. `mris_intensity_profile` samples MRI along the cortical depth

## Gotchas and Caveats

> [!gotcha] Source file location
> Despite being a surface analysis tool, the source is in `mris_thickness/` because it was developed as part of the cortical thickness analysis toolkit.

> [!gotcha] Coordinate system
> The sampling uses the surface RAS coordinate system. The MRI volume must be in the same coordinate space for correct sampling. Misregistered surfaces and volumes will produce incorrect profiles.

## Related Tools

- [[mris_make_surfaces]] — produces the white and pial surfaces used as sampling boundaries
- [[surface-format]] — surface file format
- [[coordinate-systems]] — relationship between surface RAS and scanner RAS

## Confidence and Gaps

**Confident (from source):**
- Depth sampling approach (linear interpolation between white and pial)
- Default parameter values
- Normalization options (multiple modes available)

> [!gap] Exact sampling implementation
> `MRISfindNearestVerticesAndMeasureCorticalIntensityProfiles` implementation details (interpolation method, edge handling) have not been traced.
