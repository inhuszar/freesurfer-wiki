---
title: "mris_AA_shrinkwrap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_shrinkwrap/mris_AA_shrinkwrap.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Unclear whether this tool is used in any current recon-all stage."
  - "Relationship to mris_shrinkwrap (if any) not confirmed."
tags:
  - surface
  - shrinkwrap
  - skull
  - active-surface
---

# mris_AA_shrinkwrap

## Summary

`mris_AA_shrinkwrap` fits a spherical or icosahedral surface mesh onto the inner skull boundary by iteratively deforming it to minimise a distance-based cost function derived from a smoothed distance map of the brain volume. The "AA" designation suggests an active-appearance or atlas-adaptive variant of the basic shrink-wrap algorithm used to initialise skull-stripping surfaces.

## Source Information

- **Language:** C++
- **Primary source:** `mris_shrinkwrap/mris_AA_shrinkwrap.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Shrink-wrap algorithms initialise a closed surface large enough to encompass the entire head, then iteratively contract it toward the brain boundary while maintaining surface regularity via tangential smoothing and repulsion forces. The inner skull surface obtained serves as an initialisation for skull stripping or as a constraint in surface-based skull modelling.

The `mris_AA_shrinkwrap` variant appears to use an atlas-adaptive (AA) approach, possibly incorporating an MRI intensity model to guide the deformation more accurately than a purely geometric shrink-wrap.

> [!gap] AA acronym and algorithm
> The exact meaning of "AA" in the tool name, and whether it refers to "Active Appearance", "Atlas-Adapted", or another variant, is not documented in the available source file header. A full read of the algorithmic logic in `mris_AA_shrinkwrap.cpp` is required to resolve this.

## Inputs

```
mris_AA_shrinkwrap [options] <T1_vol> <PD_vol> <output_dir>
```

| Argument | Description |
|---------|-------------|
| `<T1_vol>` | T1-weighted MRI volume (`T1_fname`), providing intensity for cortical boundary guidance. |
| `<PD_vol>` | Proton-density (PD)-weighted MRI volume (`PD_fname`), used alongside T1 for contrast. |
| `<output_dir>` | Output directory where result surfaces are written (`output_dir`). |

## Outputs

| Output | Description |
|--------|-------------|
| Output surface file | Deformed surface representing the inner skull or brain outer boundary. |

## Mathematical Foundations

The shrink-wrap deformation minimises a surface energy of the form:

$$
E = E_{\text{dist}} + \lambda_s E_{\text{smooth}} + \lambda_r E_{\text{repulse}}
$$

where:
- $E_{\text{dist}}$ pulls each vertex toward the nearest point on the target iso-surface derived from a distance map of the MRI.
- $E_{\text{smooth}}$ is a tangential spring energy penalising vertex displacement from the local centroid, ensuring mesh regularity.
- $E_{\text{repulse}}$ prevents surface self-intersection.

The rigid gradient update `compute_rigid_gradient()` and position optimisation `MRISfindOptimalRigidPosition()` suggest that the surface can also undergo a global rigid repositioning step before the vertex-level deformation.

> [!internal] Implementation detail
> The source defines `MRISrepositionToInnerSkull()`, suggesting the primary application is fitting to the inner skull boundary, consistent with skull-stripping initialisation.

## Configuration Options

### Complete Flag Reference

All flags use single-dash prefix; names are case-insensitive (parsed with `stricmp`).

| Flag | Argument type | Default | Description |
|------|--------------|---------|-------------|
| `-fine` | boolean | false | Set icosahedron subdivision level to 5 (`ic_init=5`): fine-grained initial surface mesh. |
| `-coarse` | boolean | false | Set icosahedron subdivision level to 4 (`ic_init=4`): coarser initial surface mesh. |
| `-ic <N>` | int | — | Directly set the icosahedron subdivision level for the initial surface mesh (`ic_init=N`). |
| `-nbrs <N>` | int | — | Set neighbourhood size for curvature computations (`nbrs=N`). |
| `-shrink <val>` | float | — | Set shrinkwrap energy weight (`parms.l_shrinkwrap=val`). |
| `-name <str>` | string | — | Set the output base name (`parms.base_name=str`). |
| `-tol <val>` | float | — | Set convergence tolerance (`parms.tol=val`). |
| `-debug_voxel <x> <y> <z>` | int×3 | — | Enable debugging for voxel at CRS coordinate `(x, y, z)`. |
| `-dt <val>` | float | — | Set the time step for surface deformation (`parms.dt=val`; also sets `parms.base_dt` and switches to momentum integration). |
| `-spring <val>` | float | — | Set the spring normalisation energy weight (`parms.l_spring_norm=val`). |
| `-tsmooth <val>` | float | — | Set the tangential smoothing energy weight (`l_tsmooth=val`). |
| `-grad <val>` | float | — | Set the gradient-following energy weight (`parms.l_grad=val`). |
| `-tspring <val>` | float | — | Set the tangential spring energy weight (`parms.l_tspring=val`). |
| `-nspring <val>` | float | — | Set the normal spring energy weight (`parms.l_nspring=val`). |
| `-curv <val>` | float | — | Set the curvature energy weight (`parms.l_curv=val`). |
| `-smooth <N>` | int | — | Number of smoothing iterations applied after deformation (`smooth=N`). |
| `-output <str>` | string | — | Output filename suffix (`output_suffix=str`). |
| `-intensity <val>` | float | — | Set the intensity-matching energy weight (`parms.l_intensity=val`). |
| `-lm` | boolean | — | Use line-minimisation integration instead of fixed time step (`parms.integration_type=INTEGRATE_LINE_MINIMIZE`). |
| `-S <str>` | string | — | Set the output file suffix (`suffix=str`). |
| `-Q` | boolean | — | Quick mode: disable self-intersection testing (`parms.flags |= IPFLAG_NO_SELF_INT_TEST`). |
| `-M <val>` | float | — | Set integration momentum (`parms.momentum=val`; enables `INTEGRATE_MOMENTUM`). |
| `-R <val>` | float | — | Set surface repulsion energy weight (`l_surf_repulse=val`). |
| `-B <val>` | float | — | Set base time-step scale factor (`base_dt_scale=val`). |
| `-V <n>` | int | — | Debug vertex `n` (`Gdiag_no`). |
| `-W <N>` | int | — | Write surface snapshots every `N` iterations (`parms.write_iterations`). |
| `-N <N>` | int | — | Set maximum number of deformation iterations (`parms.niterations`). |
| `--version` or `-version` | boolean | — | Print version string and exit. |
| `--help` or `-help` | boolean | — | Print help and exit. |

### Configuration Interactions

- `-fine`, `-coarse`, and `-ic` all set `ic_init`; the last specified wins. `-fine` sets level 5 (denser mesh), `-coarse` sets level 4.
- `-dt` switches the integration type to `INTEGRATE_MOMENTUM` and overrides any previous `-lm` setting.
- `-lm` uses line minimisation; it is overridden if `-dt` is also specified.
- `-Q` disables the self-intersection check, making the tool faster but potentially producing self-intersecting output surfaces.

## Typical Use Cases

```bash
# Shrinkwrap using T1 and PD volumes, write results to output/
mris_AA_shrinkwrap T1.mgz PD.mgz output/

# Fine-resolution mesh, 200 iterations
mris_AA_shrinkwrap -fine -N 200 T1.mgz PD.mgz output/
```

## Pipeline Context

`mris_AA_shrinkwrap` does not appear to be called directly by `recon-all` in the standard single-subject stream. It may be used in alternative skull-stripping pipelines, multi-echo processing, or ex vivo workflows.

> [!gap] Pipeline integration unclear
> Whether and where this tool is called by `recon-all` or other scripts requires inspection of the FreeSurfer script infrastructure.

## Gotchas and Caveats

> [!gotcha] Tool may be legacy or specialised
> The presence in the `mris_shrinkwrap/` subdirectory alongside related tools suggests this may be a specialised variant not used in the default pipeline. Use with caution outside of documented workflows.

## Related Tools

- [[mris_make_surfaces]] — primary surface placement tool in the standard pipeline
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

Confidence is **medium** for the complete flag list (derived from full reading of `get_option()`) and positional argument syntax. The algorithm energy functional is inferred from the energy term names (spring, gradient, repulsion, shrinkwrap) but its mathematical form was not traced in detail through the MRIS deformation framework.
