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
last_agent_update: 2026-04-22
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

The tool samples MRI intensity along surface normals at `nsamples` points (default: 20) spanning from just inside the white matter surface to the pial surface.

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
| Polynomial fit | Optional: polynomial fit to profile if `-p order` or `-q` |

## Mathematical Foundations

For each vertex $v$ with white surface position $\mathbf{w}_v$ and pial surface position $\mathbf{p}_v$:

The sample position at fractional depth $t \in [0, 1]$ is:

$$
\mathbf{x}_v(t) = (1-t)\mathbf{w}_v + t\mathbf{p}_v
$$

MRI intensity is sampled at $N = $ `nsamples` equally-spaced depth levels:
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

### Sampling and Profile Parameters

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-nsamples N` | integer | 20 | Number of depth samples between WM and pial |
| `-samples N` | integer | 20 | Alias for `-nsamples` |
| `-max T` | float | 5.0 | Maximum cortical thickness to consider (mm) |
| `-n N` | integer | 2 | Neighborhood size for profile computation |
| `-nbrs N` | integer | 1 | Nearest-neighbor count |
| `-a N` | integer | 0 | Number of profile averaging iterations across space |
| `-e N` | integer | 0 | Extra sample points added to each end of the profile |
| `-wm_border W` | float | 3.0 | Distance from WM border for WM reference sampling (mm) |
| `-normalize` | — | off | Normalize profiles by cortical thickness (equal-length profiles) |
| `-use_normal N` | integer | 0 | Sample along surface normal (1=on) instead of vertex-to-vertex |
| `-use_pial 0\|1` | 0/1 | 1 | Whether to use pial surface as outer boundary |
| `-normal dist_in dist_out` | float float | — | Use surface normal sampling in interval [-dist_in, dist_out] |
| `-normals dist_in dist_out` | float float | — | Alias for `-normal` |
| `-nsigma S` | float | — | Apply surface normal smoothing with sigma S before sampling |

### Normalization

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-inorm` | — | off | Normalize intensities to mean background noise level |
| `-norm_gw V` | float | — | Normalize so that gray/white boundary has value V |
| `-norm_white V` | float | — | Normalize relative to white matter reference value V |
| `-norm_csf V` | float | — | Normalize relative to CSF reference value V |
| `-norm_pial V` | float | — | Normalize so that gray/CSF boundary has value V |
| `-norm_mid V` | float | — | Normalize so that mid-ribbon has value V |
| `-norm_mean V` | float | — | Normalize to mean value V |
| `-norm_median V` | float | — | Normalize to median value V |
| `-z` | — | off | Zero-mean each profile |
| `-wmnorm fname` | path | — | Read WM segmentation volume for WM intensity normalization |

### Surface and Region Selection

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-pial name` | string | `pial` | Name of pial surface file |
| `-white name` | string | `white` | Name of white matter surface file |
| `-sphere name` | string | `sphere` | Name of sphere surface used for neighborhood lookup |
| `-l label_name` | string | — | Restrict computation to labeled region (repeatable) |
| `-c curv_fname thresh` | path int | — | Curvature mask: read file and limit to sulcal (thresh>0) or gyral (thresh<0) regions |
| `-flatten flat_name flat_res` | string float | — | Read flattened coordinates from file with given resolution |
| `-aseg fname` | path | — | Read aseg segmentation volume to constrain WM voxels |
| `-sdir dir` | path | `$SUBJECTS_DIR` | Override subjects directory |

### Quality Filtering

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-b N` | integer | 0 | Remove (1) or keep (0) bad intensity profiles at boundaries |
| `-t T` | float | — | Threshold for bad profile detection |
| `-erode N` | integer | 0 | Erode cortex label N times before computation |
| `-overlay fname t0 t1` | path ints | — | Use overlay as mask; average frames in interval [t0, t1] |
| `-ratio fname o1 o2 o3 o4` | path ints | — | Compute ratio of overlay interval [o1,o2] / [o3,o4] |

### Output Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-write_thickness fname` | path | — | Write computed thickness to file |
| `-thickness fname` | path | — | Alias for `-write_thickness` |
| `-write_surf name` | string | — | Write variational pial surface target locations to file |
| `-mean fname` | path | — | Output mean profile integral (curv format) to file |
| `-p order` | integer | — | Fit polynomial of given order to each profile |
| `-q` | — | off | Fit quadratic to each profile and write as curvature |

### Laplacian Thickness

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-laplace res` | float | 0.5 | Use Laplacian thickness with PDE resolution res mm |
| `-laplacian res` | float | 0.5 | Alias for `-laplace` |
| `-rl name` | string | — | Read pre-computed Laplace solution volume from file |

### Transform / Registration

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-xform fname` | path | — | Registration transform mapping T1 to input volume |
| `-at fname` | path | — | Alias for `-xform` |
| `-ait fname` | path | — | Apply registration transform inversely |
| `-invert` | — | off | Apply the given registration transform in inverse direction |
| `-src fname` | path | — | Source volume used when computing the registration transform |
| `-lta_src fname` | path | — | Alias for `-src` |
| `-dst fname` | path | — | Destination volume used when computing the registration transform |
| `-lta_dst fname` | path | — | Alias for `-dst` |

### Integration Tuning (Variational Thickness)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-new` | — | off | Use variational thickness measurement (also `-fmin`, `-variational`) |
| `-fmin` | — | off | Alias for `-new` |
| `-variational` | — | off | Alias for `-new` |
| `-tol T` | float | 1e-3 | Convergence tolerance for variational optimization |
| `-dt T` | float | 0.01 | Time step for variational integration |
| `-m M` | float | 0.1 | Momentum for variational integration |
| `-tsmooth W` | float | — | Thickness smoothness weight (`l_tsmooth`) |
| `-tnormal W` | float | 0.01 | Thickness normal weight (`l_thick_normal`) |
| `-tspring W` | float | 1.0 | Thickness spring weight (`l_thick_spring`) |
| `-tparallel W` | float | 1.0 | Thickness parallel weight (`l_thick_parallel`) |
| `-tmin W` | float | — | Minimum thickness weight (`l_thick_min`) |
| `-triangle W` | float | 1.0 | Ashburner triangle weight |
| `-w N` | integer | — | Write iterations (enables DIAG_WRITE) |

### Debugging / Runtime

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-openmp N` | integer | — | Set number of OpenMP threads |
| `-debug_voxel x y z` | ints | — | Enable debugging for voxel at coordinates (x, y, z) |

## Typical Use Cases

**Compute cortical intensity profiles from T1 volume:**
```bash
mris_intensity_profile -nsamples 30 bert lh T1.mgz profiles_lh.mgz
```

**Compute normalized profiles using white matter reference:**
```bash
mris_intensity_profile -normalize -wm_border 2 bert lh T1.mgz profiles_normalized_lh.mgz
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
