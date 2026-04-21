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
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface not extracted"
  - "Specific energy functional terms not all identified"
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

$$E(\phi) = E_\text{data}(\phi) + E_\text{reg}(\phi)$$

where:
- $E_\text{data}$ measures image similarity (intensity-based, using mean intensity matching by default)
- $E_\text{reg}$ penalises non-smooth deformations (using bending energy or metric distortion)

The warp field is parameterised as a dense displacement $\phi(\mathbf{x}) = \mathbf{x} + \mathbf{u}(\mathbf{x})$ on a regular grid.

Key parameters:
- `skip` (default 2): subsampling factor during initial stages
- `distance` (default 1.0 mm): spacing of control points
- `match_mean_intensity` (default 1): scale intensities to match means before comparison
- `nozero` (default 1): exclude zero voxels from the similarity computation
- `renormalize` (default 1): renormalise intensities
- WMSA labels are removed from the atlas by default (`nowmsa = 1`)

> [!internal] References internal GCAM code
> The non-linear registration engine is implemented in `gcamorph.h/cpp`. See [[internal-gcamorph]] for details.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | Target volume |
| (positional 2) | volume | required | Source volume |
| (positional 3) | path | required | Output warp / registered volume |
| `-skip <n>` | int | 2 | Subsampling stride |
| `-distance <d>` | float | 1.0 | Control point spacing (mm) |
| `-ribbon <vol>` | volume | — | Ribbon volume for constrained alignment |
| `-nozero` | flag | on | Exclude zero voxels |
| `-renormalize` | flag | on | Renormalise intensity |
| `-match_mean` | flag | on | Match mean intensity |
| `-erosions <n>` | int | 0 | Number of erosions before alignment |
| `-scale_values <s>` | float | 1.0 | Scale source values |
| `-label_dist <file>` | path | — | Label distance map |
| `-label_ignore <file>` | path | — | Labels to ignore |
| `-regrid` | flag | off | Regrid the morph |
| `-rip` | flag | off | Rip (restrict in place) |
| `-apply` | flag | on | Apply transform |
| `-no_apply` | flag | — | Do not apply transform |
| `-handle_expanded_ventricles` | flag | off | Special handling for expanded ventricles |

> [!gap] Complete option list
> Full `get_option()` not read.

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
mri_nl_align target.mgz source.mgz warp.m3z -no_apply
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
