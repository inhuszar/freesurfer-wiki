---
title: "mris_remove_negative_vertices"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_sphere/mris_remove_negative_vertices.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_sphere]]"
  - "[[surface-format]]"
  - "[[recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The definition of 'negative vertex' in the spherical context is not documented in the source header"
tags:
  - surface
  - sphere
  - topology
  - quality-control
---

# mris_remove_negative_vertices

## Summary

`mris_remove_negative_vertices` removes "negative vertices" from a spherical surface — vertices that create faces with negative (clockwise) orientation on the sphere. Such vertices arise during spherical parameterisation when the mapping folds over itself, creating "flipped" triangles. Removing these ensures the spherical surface is a proper orientation-preserving map of the cortex.

## Source Information

- **Language:** C++
- **Source file:** `mris_sphere/mris_remove_negative_vertices.cpp`
- **Location:** `mris_sphere/` — shares source directory with the spherical mapping tool
- **Original author:** Bruce Fischl
- **Key parameters:** `INTEGRATION_PARMS` with `l_neg = 0.0`, momentum-based integration

## Purpose and Context

During spherical parameterisation (`mris_sphere`), the cortical surface is mapped onto a sphere. Highly curved sulcal regions or topological near-problems can cause the map to fold over, creating triangles with reversed orientation (negative area on the sphere). These "negative" or "flipped" triangles violate the homeomorphism requirement for valid spherical registration.

`mris_remove_negative_vertices` iteratively adjusts vertex positions on the sphere to eliminate these orientation-reversed faces using an energy minimisation that penalises negative face area.

## Inputs

- Positional arg 1: input surface file (spherical surface with potential negative vertices)
- Positional arg 2: output surface file

## Outputs

- Output spherical surface with negative vertices removed (FreeSurfer binary format)

## Mathematical Foundations

The integration parameters define an energy functional where the negative-vertex penalty is driven by the `l_neg` term. The default `l_neg = 0.0` in the code initialisation, but this may be overridden:

$$
E = l_{angle} E_{angle} + l_{area} E_{area} + l_{neg} E_{neg} + l_{spring} E_{spring}
$$

where $E_{neg}$ penalises faces with negative orientation (clockwise winding on the sphere).

The optimisation uses momentum-based integration (`INTEGRATE_MOMENTUM`):

$$
v_i^{t+1} = v_i^t + \mu \cdot v_i^t - \eta \nabla E(v_i^t)
$$

with `parms.momentum = 0.0` and `parms.tol = 0.5` for convergence.

Default integration parameters:
- `parms.dt = 1`
- `parms.tol = 0.5`
- `parms.niterations = 1000`
- `parms.momentum = 0.0`

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<in_surf>` | positional 1 | required | Input surface file (spherical surface with potential negative vertices). |
| `<out_surf>` | positional 2 | required | Output surface file path. |
| `-V <vno>` | integer | — | Set debug vertex number (`Gdiag_no`). Enables detailed per-vertex diagnostic output. |
| `-M <f>` | float | 0.0 | Set integration momentum and switch to `INTEGRATE_MOMENTUM`. Overrides the default of 0.0 momentum. |
| `-W <n>` | integer | — | Enable diagnostic writing every `<n>` iterations (`DIAG_WRITE`, `parms.write_iterations = n`). |
| `-N <n>` | integer | 1000 | Set the maximum number of optimisation iterations (`parms.niterations`). |
| `--help` / `-help` | flag | — | Print usage and exit. |
| `--version` / `-version` | flag | — | Print version string and exit. |

> [!gotcha] Usage string is misleading
> The `print_usage()` function shows `<surface file> <patch file name> <output patch>` (copied from another tool). The actual argument parsing uses only two positional arguments: the input surface and the output surface.

## Configuration Interactions

- `-M` both sets the momentum value and changes the integration type to `INTEGRATE_MOMENTUM`. Setting momentum via this flag without the type would not occur.
- `-W` enables writing diagnostic snapshots of the surface during optimisation. The output frequency is `write_iterations` iterations.
- `-N` and the default of 1000 define the hard cap on optimisation time. For severely folded surfaces, increasing `-N` may be needed.

## Typical Use Cases

```bash
# Remove negative vertices from a spherical surface
mris_remove_negative_vertices lh.sphere lh.sphere.fixed
```

## Pipeline Context

This tool is called internally by `mris_sphere` as a post-processing step when the spherical parameterisation produces flipped triangles. It may also be run manually after custom spherical operations.

Pipeline position:
1. `mris_inflate` — inflates white surface to approximate sphere
2. `mris_sphere` — performs spherical parameterisation; may call this tool internally
3. If sphere has negative vertices: `mris_remove_negative_vertices sphere sphere.fixed`
4. `mris_register` / `mris_register_josa` — spherical registration

## Gotchas and Caveats

> [!gotcha] Not typically needed manually
> In standard `recon-all`, this correction is applied automatically as part of `mris_sphere` processing. Manual invocation is needed only if custom spherical operations produce flipped triangles.

> [!gotcha] Momentum is zero by default
> With `parms.momentum = 0.0`, the optimisation has no momentum term. This makes convergence slower but avoids overshooting.

> [!gotcha] 1000 iteration limit
> The optimisation runs for at most `parms.niterations = 1000` iterations. For severely folded surfaces, this may not be sufficient.

## Related Tools

- `mris_sphere` — spherical parameterisation; primary user of this tool
- [[mris_remove_intersection]] — removes Euclidean (3D) self-intersections
- [[surface-format]] — FreeSurfer surface format
- [[recon-all]] — calls mris_sphere which may invoke this tool

## Confidence and Gaps

**Confident (from code):** All optional flags verified from `get_option()` source: `-V`, `-M`, `-W`, `-N`. Default parameters (dt=1, tol=0.5, niterations=1000, momentum=0.0, integration_type=INTEGRATE_MOMENTUM) confirmed. Two positional arguments (`<in_surf>`, `<out_surf>`) confirmed.

**Uncertain:** Precise definition of "negative vertex" as implemented in the energy functional (the `l_neg` term is initialized to 0.0 at startup; how it is then set non-zero during optimisation is in the surface library code, not this file).
