---
title: "mris_inflate"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_inflate/mris_inflate.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_smooth]]"
  - "[[mris_sphere]]"
  - "[[recon-all]]"
  - "[[freeview-surfaces]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Full spring energy functional derivation in MRISinflateBrain()/MRISinflateToSphere() not traced (in shared mrisurf lib)"
  - "Sulcal depth (sulc) sign convention — positive = sulcus vs. positive = gyrus not confirmed"
  - "In 8.2.0 the mrisComputeSulcInMM() call inside the save block is commented out; effect of -mm flag on the saved sulc file in this release needs runtime verification"
tags:
  - surface
  - inflation
  - autorecon2
  - autorecon3
---

# mris_inflate

## Summary

`mris_inflate` expands a folded cortical surface mesh into a smooth, inflated
representation by modelling the mesh as a system of springs and minimising a
combination of metric distortion and area-preservation energy. The inflated
surface is used as input for spherical mapping ([[mris_sphere]]) and for
visualisation. As a by-product, it computes and saves the **sulcal depth**
(`?h.sulc`) and the **mean curvature** of the white surface.

`mris_inflate` is called twice in recon-all:

1. **Inflate1** (autorecon2): inflates `smoothwm.nofix` → `inflated.nofix`
   without saving sulcal depth (`-no-save-sulc`).
2. **Inflate2** (autorecon2, post-white): inflates `smoothwm` → `inflated`,
   `sulc`, and `curv.H` (mean curvature of white surface).

## Source Information

- **Language:** C++
- **Source file(s):** `mris_inflate/mris_inflate.cpp` (716 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_inflate`
- **Reference:** Fischl, Sereno, Dale (1999), NeuroImage 9(2):195–207

## Purpose and Context

The folded cortical surface cannot be directly mapped to a sphere because the
folds introduce topological obstructions. Inflation gradually unfolds the surface
by reducing metric distortion while preserving vertex topology. The inflated
surface is nearly spherical and serves as a good starting point for spherical
mapping. The sulcal depth (`sulc`) file records how far each vertex moved
during inflation, which is a proxy for sulcal/gyral identity and is used by
[[mris_sphere]] and [[mris_register]] for alignment.

## Inputs

### Required Inputs

| Argument | Description |
|----------|-------------|
| `insurf` | Input (folded) surface (e.g., `surf/lh.smoothwm.nofix`) |
| `outsurf` | Output (inflated) surface (e.g., `surf/lh.inflated.nofix`) |

### Input Assumptions

> [!assumption] Surface must be already smoothed
> The input is expected to be a smoothed surface (`smoothwm` or
> `smoothwm.nofix`). Inflating the raw `orig.nofix` directly would preserve
> more voxel-grid artefacts, but recon-all always calls `mris_smooth` first.

## Outputs

### Files Created

| File | Description |
|------|-------------|
| `outsurf` | Inflated surface mesh |
| `?h.sulc` | Sulcal depth: signed distance each vertex moved during inflation (mm) |

With `-no-save-sulc` (Inflate1): `?h.sulc` is NOT written.

The sulcal depth file `sulc` is a [[curv-format]] file read by
[[mris_register]] and [[mris_sphere]] for alignment.

## Mathematical Foundations

### Inflation Energy

The inflation is driven by minimising a spring energy functional. Based on the
source header and the INTEGRATION_PARMS structure, the objective combines
several terms:

$$E = \lambda_{\text{spring}} \sum_{\langle i,j \rangle} (d_{ij} - d^0_{ij})^2 + \lambda_{\text{area}} \sum_f (A_f - A^0_f)^2 + \lambda_{\text{sphere}} E_{\text{sphere}}$$

where:
- $d_{ij}$ = edge length between adjacent vertices $i$ and $j$
- $d^0_{ij}$ = rest length (stored metric)
- $A_f$ = face area, $A^0_f$ = rest area
- $E_{\text{sphere}}$ = penalty for non-spherical configuration
- $\lambda_{\text{spring}}, \lambda_{\text{area}}, \lambda_{\text{sphere}}$ are
  the energy weights (`l_spring_norm`, `l_area`, `l_sphere`)

Default energy weights (from `parms` initialisation in `main()`):

| Parameter | Default | Flag |
|-----------|---------|------|
| `l_spring_norm` | 1.0 | `-spring_norm` |
| `l_dist` | 0.1 (`DEFAULT_DIST`) | `-dist` |
| `l_spring` | 0.0 | `-spring` / `-S` |
| `l_area` | 0.0 | `-area` |
| `l_curv` | 0.0 | `-curv` |
| `l_angle` | 0.0 | `-angle` |
| `l_sphere` | 0.0 (unset; activates `MRISinflateToSphere` if set) | `-sphere` |

Integration parameters (from `parms` defaults):

| Parameter | Default | Flag |
|-----------|---------|------|
| `niterations` | 10 (`DEFAULT_ITERATIONS`) per averaging level | `-N` |
| `n_averages` | 16 | `-A` |
| `tol` | 1e-4 | `-tol` |
| `dt` | 0.9 | `-dt` |
| `momentum` | 0.9 | `-M` |
| `dt_increase` | 1.0 | `-dt_inc` |
| `dt_decrease` | 1.0 | `-dt_dec` |
| `error_ratio` | 50.0 | `-error_ratio` |
| `desired_rms_height` | 0.015 | `-F` |
| `epsilon` | `EPSILON` | `-E` |
| `nbrs` (neighbourhood ring) | 2 | `-nbrs` |
| `navgs` (pre-smoothing iters) | 0 | `-avgs` |

> [!gap] Full energy functional
> `MRISinflate()` is defined in the shared `mrisurf` library. The precise
> energy functional (exact form of the spring/area/sphere terms and the
> gradient computation) was not traced in this session.

### Sulcal depth computation

After inflation, the sulcal depth at each vertex $v_i$ is computed as the
signed dot product of the displacement vector (inflated position minus original
position) with the surface normal. Sulci (concave regions) move outward during
inflation and receive one sign; gyri (convex regions) move inward and receive
the other sign.

The standard convention: positive sulc = sulcal wall (moved outward), negative
sulc = gyral crown (moved inward). However:

> [!gap] Sulc sign convention
> The exact sign convention (positive = sulcus vs. positive = gyrus) was not
> confirmed from the source. Different FreeSurfer versions have used different
> conventions. Verify from the `mrisComputeSulcInMM()` function.

## Configuration Options

### Complete Flag Reference

Enumerated from `get_option()` in `mris_inflate.cpp`. Option names are matched case-insensitively (`stricmp`); single-character options are matched after `toupper()`.

#### Positional arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `insurf` | path | — | Input (folded) surface mesh ([[surface-format]]) |
| `outsurf` | path | — | Output (inflated) surface mesh ([[surface-format]]) |

#### Inflation behaviour

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-no-save-sulc` | switch | save=ON | Suppresses writing of the `?h.<sulc_name>` curvature file. |
| `-save-sulc` | switch | ON | Re-enables sulc writing (default; provided for symmetry with `-no-save-sulc`). |
| `-sulc <name>` | string | `sulc` | Filename stem for the sulcal-depth curvature file (`?h.<name>`). |
| `-mm` | switch | OFF | After inflation, compute sulc as the mm-distance between the inflated and white surfaces projected onto the white-surface normal (calls `mrisComputeSulcInMM`). When OFF, sulc is zero-meaned. (Note: in 8.2.0 the call is commented out in the save block; the flag still suppresses the zero-mean step.) |
| `-scale_brain <0\|1>` | int | 1 | If non-zero, rescale the inflated surface to the original total area after inflation via `MRISscaleBrainArea()`. |
| `-scale <f>` | float | 0 | Sets `parms.scale` (per-iteration brain-area rescaling factor) and disables the rms-height target by setting `desired_rms_height = -1`. Overlaps in name with `-scale_brain` but is parsed as a distinct option. |
| `-T` | switch | OFF | Apply the Talairach transform to the surface before inflation (`MRIStalairachTransform`). |
| `-explode <f>` | float | OFF | Enable explode mode with the given stress threshold; treats the input as a patch and computes mean curvature before inflation. |
| `-lh` | switch | — | Force `mris->hemisphere = LEFT_HEMISPHERE` (used by topofit when output names omit hemisphere). |
| `-rh` | switch | — | Force `mris->hemisphere = RIGHT_HEMISPHERE`. |

#### Energy term weights

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-spring_norm <f>` | float | 1.0 | `parms.l_spring_norm` — weight of the normal spring term. |
| `-spring <f>` | float | 0.0 | `parms.l_spring` — weight of the isotropic spring term. |
| `-S <f>` | float | 0.0 | Single-character alias for `-spring`. |
| `-nspring <f>` | float | 0.0 | `parms.l_nspring` — weight of the normal-component spring. |
| `-tspring <f>` | float | 0.0 | `parms.l_tspring` — weight of the tangential spring. |
| `-dist <f>` | float | 0.1 (`DEFAULT_DIST`) | `parms.l_dist` — metric-distance preservation weight. |
| `-area <f>` | float | 0.0 | `parms.l_area` — face-area preservation weight. (The source contains a second, unreachable `-area` branch that would have set `l_parea`.) |
| `-curv <f>` | float | 0.0 | `parms.l_curv` — curvature term weight. |
| `-angle <f>` | float | 0.0 | `parms.l_angle` — angle preservation term. |
| `-sphere <f>` | float | 0.0 | `parms.l_sphere` — sphere term weight. **Setting this to a non-zero value switches the integrator from `MRISinflateBrain()` to `MRISinflateToSphere()`** and also sets `parms.a = 128.0` (target ellipsoid). |

#### Integration controls

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-N <n>` | int | 10 (`DEFAULT_ITERATIONS`) per averaging level | `parms.niterations` — iterations per multiscale averaging level. Auto-multiplied by `1/xsize` for high-resolution input volumes (xsize < 0.8 mm). |
| `-A <n>` | int | 16 | `parms.n_averages` — number of multiresolution averaging levels. |
| `-avgs <n>` | int | 0 | Number of vertex-position pre-smoothing iterations before inflation (`MRISaverageVertexPositions`). |
| `-nbrs <n>` | int | 2 | Neighbourhood ring size for `MRISsetNeighborhoodSizeAndDist`. |
| `-tol <f>` | float | 1e-4 | `parms.tol` — convergence tolerance. |
| `-dt <f>` | float | 0.9 | `parms.dt` — time step; also sets `base_dt` and forces momentum integration. |
| `-M <f>` | float | 0.9 | `parms.momentum` — momentum coefficient; forces momentum integration. |
| `-B <f>` | float | 1.0 (`BASE_DT_SCALE`) | Base-dt scale factor: `parms.base_dt = base_dt_scale * parms.dt`. |
| `-dt_inc <f>` | float | 1.0 | `parms.dt_increase` — dt increase factor on accepted steps. |
| `-dt_dec <f>` | float | 1.0 | `parms.dt_decrease` — dt decrease factor on rejected steps. |
| `-error_ratio <f>` | float | 50.0 | `parms.error_ratio` — threshold ratio for step rejection. |
| `-lm` | switch | OFF | Use line-minimisation integration (`INTEGRATE_LINE_MINIMIZE`) instead of momentum. |
| `-F <f>` | float | 0.015 | `parms.desired_rms_height` — target rms surface height. |
| `-E <f>` | float | `EPSILON` | `parms.epsilon` — integration epsilon. |
| `-hvariable` | switch | OFF | Sets `IPFLAG_HVARIABLE`: use a variable desired mean curvature to drive integration. |

#### Diagnostics, I/O and runtime

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-name <s>` | string | derived from `outsurf` extension | Sets `parms.base_name` used for snapshot/diagnostic file names. |
| `-W <n>` | int | 0 | `parms.write_iterations` — write a snapshot every n iterations; sets `DIAG_WRITE`. |
| `-V <n>` | int | — | `Gdiag_no` — vertex index for verbose diagnostics. |
| `-seed <n>` | long | — | Set RNG seed (`setRandomSeed`). |
| `-rusage <file>` | path | — | Append getrusage statistics to `<file>` after completion. |
| `-threads <n>` | int | `OMP_NUM_THREADS` | Set OpenMP thread count (`omp_set_num_threads`). |
| `-help`, `-usage`, `-u`, `-?` | switch | — | Print help (renders the embedded `mris_inflate.help.xml`) and exit. |
| `-version` | switch | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `-sphere <f>` switches the integrator
> When `parms.l_sphere == 0` (the default), `mris_inflate` calls
> `MRISinflateBrain()`. As soon as `-sphere` is passed with a non-zero
> weight (and `-explode` is not set), the code instead calls
> `MRISinflateToSphere()` and forces the target ellipsoid radius parameter
> `parms.a = 128`. This is a behavioural switch, not just a weight tweak.

> [!gotcha] `-no-save-sulc` used in Inflate1 only
> Inflate1 (on `smoothwm.nofix`) passes `-no-save-sulc` because the sulcal
> depth is not meaningful on the unfixed surface. Inflate2 (on `smoothwm`,
> post white-surface placement) omits this flag and produces the final `sulc`.

> [!gotcha] `-scale_brain 1` rescales area after inflation
> By default (`scale_brain=1`), the tool rescales the inflated surface to
> match the original surface area after inflation via `MRISscaleBrainArea()`.
> Disabling with `-scale_brain 0` skips this final rescale and produces a
> larger inflated surface.

> [!gotcha] `-scale` is NOT `-scale_brain`
> `-scale <f>` and `-scale_brain <0|1>` are parsed as **distinct** options
> (`stricmp` is exact). `-scale` writes `parms.scale` (per-iteration brain
> area rescaling during integration) and additionally sets
> `desired_rms_height = -1.0`, disabling the rms-height stopping criterion.
> `-scale_brain` only toggles the post-inflation `MRISscaleBrainArea()` call.

> [!gotcha] Duplicate `-area` branch
> The source contains two `-area` blocks: the first (reachable) sets
> `parms.l_area`; the second (unreachable, dead code) was intended to set
> `parms.l_parea`. There is therefore no command-line switch to set
> `l_parea` from `mris_inflate`.

> [!gotcha] `-dt` and `-M` force momentum integration
> Both `-dt <f>` and `-M <f>` set `parms.integration_type = INTEGRATE_MOMENTUM`,
> overriding any previously specified `-lm` (line minimisation). Order of
> flags on the command line therefore matters when mixing these.

> [!gotcha] High-resolution input auto-scales iterations
> If the source volume voxel size is below 0.8 mm, `parms.niterations` is
> multiplied by `1/xsize` automatically. The user-supplied `-N` value is
> the pre-scaling baseline.

> [!gotcha] `-mm` is partially disabled in 8.2.0
> The `-mm` flag still sets `compute_sulc_mm = 1`, which suppresses the
> default `MRISzeroMeanCurvature()` call. However, the actual
> `mrisComputeSulcInMM(mris)` call inside the save block is commented out
> in the 8.2.0 source, so the saved sulc is the post-inflation curvature
> without zero-meaning rather than a true mm displacement.

## Typical Use Cases

### Use Case 1: recon-all Inflate1 (no sulc)

```bash
mris_inflate -no-save-sulc surf/lh.smoothwm.nofix surf/lh.inflated.nofix
```

### Use Case 2: recon-all Inflate2 (with sulc)

```bash
mris_inflate surf/lh.smoothwm surf/lh.inflated
# Produces: inflated, lh.sulc
```

## Pipeline Context

**autorecon2 — Inflate1** (recon-all lines 3648–3673):

```
mris_smooth → lh.smoothwm.nofix
                     ↓
    mris_inflate -no-save-sulc lh.smoothwm.nofix lh.inflated.nofix
                     ↓
            lh.inflated.nofix
                     ↓
          QSphere → lh.qsphere.nofix
```

**autorecon2 — Inflate2** (post white-surface, recon-all ~line 3770):

```
mris_make_surfaces → lh.white.preaparc
mris_smooth → lh.smoothwm
                     ↓
    mris_inflate lh.smoothwm lh.inflated
                     ↓
        lh.inflated, lh.sulc
                     ↓
         mris_sphere (autorecon3)
```

Exact recon-all Inflate1 command (line 3658–3660):
```bash
mris_inflate -no-save-sulc surf/lh.smoothwm.nofix surf/lh.inflated.nofix
```

## Gotchas and Caveats

> [!gotcha] sulc is not computed during Inflate1
> The first inflation pass (Inflate1, autorecon2) uses `-no-save-sulc` and
> produces `inflated.nofix` without `sulc`. The actual `sulc` used by
> downstream registration tools is from Inflate2 (post-white surface).

> [!gotcha] Inflate1 runs on the topologically unfixed surface
> `smoothwm.nofix` may still have topology errors (handles, holes). Inflation
> can propagate these artefacts and sometimes exaggerate them. They are
> repaired by `mris_topology_fixer` after the QSphere stage, not before
> inflation.

> [!gotcha] OpenMP threading
> The `mris_sphere` and `mris_inflate` binaries have OpenMP-enabled code
> paths. Thread count is controlled by `-threads` or `OMP_NUM_THREADS`.
> recon-all does not pass `-threads` to `mris_inflate` (unlike `mris_sphere`).

## Related Tools

- [[mris_smooth]] — produces the smoothed surface that is the inflation input
- [[mris_sphere]] — maps the inflated surface to a sphere (uses `inflated` as input)
- [[mris_register]] — registers the spherical surface to atlas
- [[freeview-surfaces]] — primary GUI for displaying `?h.inflated`; the "Map cursor to" field in the surface panel maps cursor positions from inflated back to the white surface geometry

## Confidence and Gaps

Confidence **high** for flags, algorithm overview, and recon-all integration.

> [!gap] Full spring energy functional
> `MRISinflate()` is in the shared `mrisurf` library. The precise gradient
> computation and integration scheme were not traced.

> [!gap] Sulc sign convention
> Positive = sulcal wall vs. positive = gyral crown needs confirmation.

## References

- Fischl, B., Sereno, M.I., Dale, A.M. (1999). *Cortical Surface-Based
  Analysis II: Inflation, Flattening, and a Surface-Based Coordinate System.*
  NeuroImage, 9(2):195–207. [cited in source header]
