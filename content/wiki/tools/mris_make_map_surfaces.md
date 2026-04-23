---
title: "mris_make_map_surfaces"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_make_map_surfaces/mris_make_map_surfaces.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Exact output surface names confirmed from source; energy functional details not fully traced."
  - "Exact output surface names and format not confirmed."
  - "Tool is in the 'attic' directory; may be deprecated."
tags:
  - surface
  - deformation
  - atlas
  - legacy
---

# mris_make_map_surfaces

## Summary

`mris_make_map_surfaces` performs **surface deformation that maximises the likelihood of the underlying MRI data** for generating mapped (atlas-aligned) surfaces. It takes a brain volume and an output directory as primary arguments, with an optional segmentation volume. The tool is in the `attic/` directory of the FreeSurfer source, suggesting it may be deprecated or used only in specialised workflows.

## Source Information

- **Language:** C++
- **Primary source:** `attic/mris_make_map_surfaces/mris_make_map_surfaces.cpp`
- **Associated XML:** `attic/mris_make_map_surfaces/mris_make_map_surfaces.help.xml`

> [!gotcha] Tool is in the attic directory
> The source is in `attic/mris_make_map_surfaces/`, indicating this tool is legacy or deprecated. It may not be compiled or installed in current FreeSurfer distributions.

## Purpose and Context

The tool's description ("Surface deformation that maximises the likelihood of the underlying MRI data") suggests it is a variant of the `mris_make_surfaces` approach but with the output surfaces placed in an atlas-mapped coordinate frame. This is consistent with the tool's name — "map surfaces" could refer to surfaces that are deformed in a mapped (atlas) space rather than subject space.

A plausible use case is generating surfaces for a group average or template brain that faithfully represents the underlying MRI while being spatially aligned with an atlas. This would be useful for building atlas surface models.

## Inputs

| Argument | Description |
|----------|-------------|
| `<subject>` (positional 1) | Subject ID (looked up in `$SUBJECTS_DIR` or `-sdir`). |
| `<brain.mgz>` (positional 2) | Input brain volume (used for MRI-likelihood energy). |
| `<output_suffix>` (positional 3) | Suffix used for naming output surfaces (e.g., `mapped`). |
| `-aseg <file>` | Optional subcortical segmentation volume. |

## Outputs

The output surface is written to `$SUBJECTS_DIR/<subject>/surf/both.<suffix>` as a single concatenated (both-hemisphere) surface using `MRISwrite`. The format is the standard FreeSurfer binary surface format.

## Mathematical Foundations

Based on the description, the deformation likely uses an energy functional similar to `mris_make_surfaces`:

$$
E = E_{\text{MRI-likelihood}} + \lambda E_{\text{smooth}}
$$

where $E_{\text{MRI-likelihood}}$ is derived from the probability of the observed intensities given the expected WM/GM/CSF distributions at each vertex's position.

> [!gap] Exact energy functional
> The algorithm details require a full source read.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-aseg <file>` | path | — | Subcortical segmentation volume (ASeg). Used to mask cerebellum, brainstem, and non-cortical structures from the MRI before surface deformation. |
| `-sdir <dir>` | path | `$SUBJECTS_DIR` | Override the FreeSurfer subjects directory. |
| `-dt <t>` | float | 0.5 | Integration time step for surface deformation. |
| `-map <coeff>` | float | 1.0 | Weight of the MRI-likelihood (map) term in the energy functional (`parms.l_map`). |
| `-map2d <coeff>` | float | 0.0 | Weight of the 2-D map term in the energy functional (`parms.l_map2d`). |
| `-tspring <coeff>` | float | 1.0 | Weight of the tangential spring term (`parms.l_tspring`). |
| `-nspring <coeff>` | float | 0.5 | Weight of the normal spring term (`parms.l_nspring`). |
| `-spring <coeff>` | float | 0.0 | Weight of the isotropic spring term (`parms.l_spring`). |
| `-tol <t>` | float | 1e-4 | Convergence tolerance for the surface optimisation (`parms.tol`). |
| `-debug_voxel <x> <y> <z>` | ints | — | Enable verbose diagnostic output at voxel `(x, y, z)`. Takes three arguments. |
| `-a <min> <max>` | ints | 2 16 | Set minimum and maximum number of smoothing averages per iteration pass. |
| `-m <momentum>` | float | — | Set the optimisation momentum (`INTEGRATE_MOMENTUM`). |
| `-r <coeff>` | float | 5.0 | Surface repulsion coefficient (`l_surf_repulse`). |
| `-n <niters>` | int | 1000 | Maximum number of integration iterations. |
| `-w <n>` | int | 0 | Write intermediate surface snapshots every `n` iterations (sets `DIAG_WRITE`). |
| `-q` | flag | off | Quick mode: disable self-intersection testing (`IPFLAG_NO_SELF_INT_TEST`). |

## Configuration Interactions

- The tool requires exactly 4 positional arguments: `<prog> <subject> <brain.mgz> <suffix>`. With fewer than 4 arguments it calls `usage_exit()`.
- `-sdir` overrides `$SUBJECTS_DIR`. If neither is set, the tool exits with an error.
- `-aseg` masks cerebellum cortex, brainstem, cerebellar WM, and unknown voxels outside 2-voxel range of cerebral cortex to zero before the deformation energy is computed.
- The outer loop always runs 3 passes; within each pass it sweeps `n_averages` from `max` to `min` (halving each step). `-a <min> <max>` controls these bounds.
- Output is written to `$SUBJECTS_DIR/<subject>/surf/both.<suffix>` as a single concatenated (both-hemisphere) surface.
- White and pial coordinates are read from `lh.<white_name>`, `rh.<white_name>`, and `lh.<pial_name>`, `rh.<pial_name>` in `<subjects_dir>/<subject>/surf/`. The default names are `white` and `pial` (not overridable via CLI).

## Typical Use Cases

```bash
# Basic usage: deform surfaces for subject fsaverage using brain.mgz, output suffix "mapped"
mris_make_map_surfaces fsaverage brain.mgz mapped

# With aseg masking, custom subjects directory, and tighter tolerances
mris_make_map_surfaces -sdir /data/subjects \
  -aseg /data/subjects/fsaverage/mri/aseg.mgz \
  -tol 1e-5 -dt 0.25 \
  fsaverage brain.mgz mapped
```

## Pipeline Context

`mris_make_map_surfaces` is not part of the standard `recon-all` pipeline. Its location in the `attic/` directory suggests it may have been used in atlas construction workflows or template generation pipelines that are no longer current.

## Gotchas and Caveats

> [!gotcha] Legacy tool
> Located in `attic/`. Likely not compiled or installed in standard FreeSurfer distributions. Use `mris_make_surfaces` for standard cortical surface placement.

## Related Tools

- [[mris_make_surfaces]] — the current standard surface placement tool
- [[surface-format]] — FreeSurfer surface file format
- [[mgz]] — MGZ volume format

## Confidence and Gaps

Confidence is **medium**. The full `get_option()` function was read and all flags are now documented. The exact details of the MRI-likelihood energy term (`parms.l_map`) inside `MRISpositionSurface` were not traced.

> [!gap] Energy functional detail
> The weight of each energy term (`l_map`, `l_map2d`, `l_tspring`, `l_nspring`, `l_spring`) is user-settable, but the exact formulation of the likelihood term inside `MRISpositionSurface` (in `mrisurf.c`) has not been traced for this tool.
