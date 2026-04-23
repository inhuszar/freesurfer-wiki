---
title: "mri_nl_align"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hires_register/mri_nl_align.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_linear_align]]"
  - "[[mri_ca_register]]"
  - "[[mri_compute_structure_transforms]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Specific energy functional terms not all identified"
  - "Some single-letter flags (-v, -x, -tl, -save, etc.) need source line lookup for exact semantics"
tags:
  - registration
  - non-linear
  - warp
  - high-resolution
---

# mri_nl_align

## Summary

`mri_nl_align` computes a non-linear (dense) volumetric alignment between two MRI volumes. It is based on the GCA morphing framework (Fischl et al., NeuroImage 2004) and produces a `.m3z` (morph 3D) warp field. The tool is part of the high-resolution registration toolkit and is designed for fine-grained non-linear alignment beyond what affine registration provides.

## Source Information

- **Language:** C++
- **Source file:** `mri_hires_register/mri_nl_align.cpp`
- **Original author:** Bruce Fischl
- **Reference:** Fischl et al., NeuroImage, 2004

## Purpose and Context

Non-linear registration is needed when two brains differ in shape beyond a global linear transform. `mri_nl_align` optimises a dense displacement field to maximise the local similarity between the source (moving) volume and the target, subject to regularisation constraints on the smoothness of the warp. It uses the GCAM (GCA Morph) framework internally.

## Inputs

| Argument | Description |
|----------|-------------|
| `<target>` | Target (fixed) volume |
| `<source>` | Source (moving) volume |
| `<output>` | Output warp field (`.m3z`) or registered volume |

Optional: ribbon volume for ribbon-constrained alignment.

## Outputs

- Non-linear warp field (`.m3z` file).
- Optionally: registered source volume.

## Mathematical Foundations

The non-linear registration minimises:

$$
E(\phi) = E_\text{data}(\phi) + E_\text{reg}(\phi)
$$

where:
- $E_\text{data}$ measures image similarity (intensity-based, using mean intensity matching by default)
- $E_\text{reg}$ penalises non-smooth deformations (using bending energy or metric distortion)

The warp field is parameterised as a dense displacement $\phi(\mathbf{x}) = \mathbf{x} + \mathbf{u}(\mathbf{x})$ on a regular grid.

Key parameters:
- `skip` (default 2): subsampling factor during initial stages
- `distance` (default 1.0 mm): expand border by this distance each outer cycle
- `match_mean_intensity` (default 1): scale intensities to match means before comparison
- `-z` (controls `nozero`, default 1): exclude zero voxels from the similarity computation
- `renormalize` (default 1): renormalise intensities
- WMSA labels are removed from the atlas by default (`nowmsa = 1`)

> [!internal] References internal GCAM code
> The non-linear registration engine is implemented in `gcamorph.h/cpp`. See [[internal-gcamorph]] for details.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| (positional 1) | volume | required | Target volume |
| (positional 2) | volume | required | Source volume |
| (positional 3) | path | required | Output warp / registered volume |
| `-a <n>` | int | — | Smooth gradient with N averages |
| `-apply <val>` | int (0/1) | 1 | Apply (1) or skip (0) transform after registration |
| `-area <val>` | float | — | Set l_area coefficient |
| `-area_intensity <val>` | float | — | Set l_area_intensity coefficient |
| `-area_smoothness <val>` | float | — | Set l_area_smoothness coefficient |
| `-aseg` | flag | off | Treat inputs as segmentations; disables intensity renorm, sets dtrans=1 |
| `-asmooth <val>` | float | — | Alias for `-area_smoothness` |
| `-b <val>` | float | — | Set l_binary coefficient |
| `-bigventricles` | flag | off | Enable special handling for expanded ventricles |
| `-nobigventricles` | flag | off | Disable special handling for expanded ventricles |
| `-d <val>` | float | — | Set l_distance coefficient |
| `-debug_label <n>` | int | — | Debug label by index |
| `-debug_node <x> <y> <z>` | int int int | — | Debug a specific node coordinate |
| `-debug_voxel <x> <y> <z>` | int int int | — | Debug a specific voxel coordinate |
| `-diag <vol>` | volume | — | Write diagnostics to volume |
| `-diag2 <vol>` | volume | — | Write d2 diagnostics to volume |
| `-diag_target <vol>` | volume | — | Write target diagnostics to volume |
| `-distance <d>` | float | 1.0 | Expand border by d mm per outer cycle |
| `-dt <val>` | float | 0.005 | Time step |
| `-dtrans <val>` | float | — | Distance transform coefficient |
| `-e <val>` | float | — | Set l_elastic coefficient |
| `-erode <n>` | int | 0 | Erode source and target N times before morphing |
| `-fixed` | flag | off | Use fixed time-step integration (alias for `-momentum`) |
| `-i <fname>` | path | — | Read inverse of transform from file |
| `-intensity <val>` | float | 0.025 | Set l_log_likelihood coefficient (alias for `-ll`) |
| `-j <val>` | float | 1.0 | Set l_jacobian coefficient |
| `-k <val>` | float | 20.0 | Set exp_k parameter |
| `-label <fname>` | path | — | Ignore voxels in named label |
| `-label_dist <fname>` | path | — | Preserve metric properties in named label |
| `-lambda <val>` | float | — | Set Lame lambda parameter |
| `-levels <n>` | int | 6 | Number of multi-scale levels |
| `-likelihood <val>` | float | — | Set l_likelihood coefficient |
| `-ll <val>` | float | 0.025 | Set l_log_likelihood coefficient (alias for `-intensity`) |
| `-m <val>` | float | 0.9 | Set momentum |
| `-mask <fname>` | path | — | Mask inputs with named volume |
| `-match_mean <val>` | int (0/1) | 1 | Match (1) or skip (0) mean intensity matching |
| `-match_peak` | flag | off | Match peak of intensity ratio histogram |
| `-min_sigma <val>` | float | 0.4 | Minimum sigma value |
| `-momentum` | flag | off | Use fixed time-step integration (alias for `-fixed`) |
| `-mu <val>` | float | — | Set Lame mu parameter |
| `-n <n>` | int | 1000 | Number of iterations |
| `-nobigventricles` | flag | off | Disable expanded ventricle handling |
| `-noneg <val>` | int | — | Control fold handling during minimisation (0/1/-1) |
| `-noregrid` | flag | off | Disable regridding |
| `-optimal` | flag | off | Use line-search (optimal) integration |
| `-passes <n>` | int | 3 | Number of passes through all levels |
| `-regrid` | flag | off | Enable regridding |
| `-renormalize <val>` | int (0/1) | 1 | Enable (1) or disable (0) intensity renormalisation |
| `-ribbon <fname>` | path | — | Read ribbon and insert into aseg |
| `-rip` | flag | off | Rip all nodes except the one being debugged |
| `-rthresh <val>` | float | — | Compression ratio threshold (also enables uncompress) |
| `-s <val>` | float | 2.0 | Set l_smoothness coefficient |
| `-scale <val>` | float | 1.0 | Scale input values |
| `-sigma <val>` | float | 8.0 | Gaussian sigma |
| `-skip <n>` | int | 2 | Subsampling stride in source data |
| `-t <fname>` | path | — | Read forward transform from file |
| `-target_diag <vol>` | volume | — | Alias for `-diag_target` |
| `-threads <n>` | int | — | Number of OpenMP threads |
| `-tol <val>` | float | 0.1 | Convergence tolerance |
| `-uncompress` | flag | off | Enable morph uncompression |
| `-v <val>` | — | — | Set Gdiag verbosity level |
| `-view <x> <y> <z>` | int int int | — | Set viewing voxel for diagnostics |
| `-w <n>` | int | — | Write diagnostics every N iterations |
| `-wmsa <val>` | int (0/1) | 1 | Enable (1) or disable (0) WMSA label removal from atlas |
| `-write_grad` | flag | off | Write gradient maps |
| `-write_neg` | flag | off | Write map of negative nodes |
| `-z <val>` | int | 1 | Control zero-voxel exclusion (1=exclude, 0=include, -1=exclude then include) |

## Configuration Interactions

- `-ribbon` constrains the warp to be consistent with the cortical ribbon, preventing biologically implausible deformations.
- `-match_mean_intensity` and `-renormalize` affect the intensity normalisation prior to alignment; both default to 1 (enabled).
- `-skip` controls the granularity of the initial warp; higher values are faster but less precise.

## Typical Use Cases

```bash
# Non-linear alignment of source to target
mri_nl_align target.mgz source.mgz warp.m3z

# With ribbon constraint and more detailed initial sampling
mri_nl_align target.mgz source.mgz warp.m3z \
  -ribbon ribbon.mgz -skip 1

# Compute warp only, don't apply
mri_nl_align target.mgz source.mgz warp.m3z -apply 0
```

## Pipeline Context

Not a standard `recon-all` stage. Part of the high-resolution registration toolkit. The `.m3z` output can be consumed by:
- `dmri_vox2vox` (for diffusion tractography coordinates)
- `mri_compute_structure_transforms` (for per-structure affine approximations)
- `mri_ca_register` family for atlas-based non-linear registration

## Gotchas and Caveats

- WMSA (white matter signal abnormality) labels are silently removed from the atlas by default (`nowmsa = 1`).
- The source surface matching (`target_surf`, `source_surf`) targets use hardcoded filenames referring to specific atlas conventions.
- The tool uses the legacy GCAM framework; newer registration approaches may be preferred for general use.

## Related Tools

- [[mri_linear_align]] — affine initialisation for non-linear alignment
- [[mri_ca_register]] — atlas-specific non-linear registration
- [[mri_compute_structure_transforms]] — per-structure linear approximations from `.m3z` output

## Confidence and Gaps

**Medium confidence:** algorithm confirmed from reference and global variable declarations. Full option list not verified.
