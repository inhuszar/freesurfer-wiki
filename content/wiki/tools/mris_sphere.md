---
title: "mris_sphere"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_sphere/mris_sphere.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_inflate]]"
  - "[[mris_register]]"
  - "[[recon-all]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "MRISunfold() energy functional details not traced (in shared lib)"
  - "QSphere (-q) mode vs. full sphere mode differences not fully characterised"
  - "DEFAULT_RADIUS value not confirmed from source"
tags:
  - surface
  - spherical-mapping
  - autorecon2
  - autorecon3
---

# mris_sphere

## Summary

`mris_sphere` maps a cortical surface (see [[surface-representations]])
to a sphere by minimising metric distortion while projecting vertices onto
a spherical target surface. The output (`?h.sphere`) is used by
[[mris_register]] to perform spherical surface registration to a group
atlas (see [[registration-overview]]), enabling cross-subject surface-based
analysis. The spherical representation assigns each cortical location a
canonical position on the unit sphere that is consistent across subjects.

`mris_sphere` is called **twice** in recon-all:

1. **QSphere** (autorecon2, quick mode `-q`): maps `smoothwm.nofix` → 
   `qsphere.nofix` for topology correction. Uses `-q` (quick) mode with
   300 inflation iterations and 3 passes.
2. **Sphere** (autorecon3, default mode): maps `inflated` → `sphere` using
   full metric distortion minimisation.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_sphere/mris_sphere.cpp` (879 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_sphere`
- **Reference:** Fischl, Sereno, Dale (1999), NeuroImage 9(2):195–207

## Purpose and Context

A spherical parameterisation is needed for:

1. **Atlas registration**: `mris_register` aligns subject spheres to a
   group-average sphere using folding patterns. Registration is infeasible
   on the folded surface directly.
2. **Topology correction**: `mris_topology_fixer` works in the spherical
   domain. `qsphere.nofix` is used to initialise this correction. See
   [[recon-all]] for the surrounding pipeline.
3. **Resampling and morphing**: many surface operations (e.g., cortical
   parcellation, surface resampling to fsaverage) work in spherical coordinates.

## Inputs

### Required Inputs

| Argument | Description |
|----------|-------------|
| `insurf` | Input surface (e.g., `surf/lh.inflated` or `surf/lh.smoothwm.nofix`) |
| `outsurf` | Output spherical surface (e.g., `surf/lh.sphere`) |

The tool also reads the **original surface** (`smoothwm` by default, set by
`-O orig_name`) to compute metric properties relative to the original geometry.
This is how metric distortion is measured — relative to the original surface,
not the inflated surface.

### Input Assumptions

> [!assumption] Input should be substantially pre-inflated
> The tool begins by projecting the input surface onto an ellipsoid
> (`MRISprojectOntoSphere`) and then minimises metric distortion. If the input
> is not already close to spherical (as `inflated` is), the projection may
> invert faces. The eversion check (`MRIScountNegativeFaces > 0.8 * nfaces`)
> will then call `MRISevertSurface()` to correct.

> [!assumption] Original properties are read from smoothwm (unless -q)
> `MRISreadOriginalProperties(mris, orig_name)` reads metric properties
> (edge lengths, areas) from `smoothwm` by default. These define the "rest"
> metric that distortion is measured against. With `-q`, original properties
> are not read ([line 210–220](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_sphere/mris_sphere.cpp#L210-L220)).

## Outputs

### Files Created

| File | Description |
|------|-------------|
| `outsurf` | Spherical surface mesh (all vertices on a sphere of radius `target_radius`) |

## Mathematical Foundations

### Spherical Mapping Algorithm

The mapping minimises the following energy (based on the `INTEGRATION_PARMS`
structure and the referenced paper):

$$
E = \lambda_{\text{dist}} \sum_{\langle i,j\rangle} (d_{ij} - d^0_{ij})^2 + \lambda_{\text{area}} \sum_f (A_f - A^0_f)^2
$$

where $d^0_{ij}$ and $A^0_f$ are the original (pre-inflation) edge lengths and
face areas loaded from `smoothwm`.

Default energy weights:
- `l_dist = 1.0` (edge length preservation)
- `l_area = 1.0` (area preservation)
- `l_spring = 0.0` (spring term off)
- `l_curv = 0.0` (curvature term off)

Default integration parameters:
- `niterations = 25`
- `n_averages = 1024` (initial smoothing averages)
- `dt = 0.05`
- `tol = 0.5`
- `integration_type = INTEGRATE_LINE_MINIMIZE`
- `momentum = 0.9`

### Pipeline

1. **Scale input** to fit within 75% of `DEFAULT_RADIUS`.
2. **Pre-inflate** (if `do_inflate = 1`): run `MRISinflateToSphere()` with
   `inflate_iterations=1000` iterations, momentum-based integration.
3. **Project** onto sphere: `MRISprojectOntoSphere(mris, mris, target_radius)`.
4. **Eversion check**: if >80% of faces are negative, call `MRISevertSurface()`.
5. **Minimise metric distortion**: 
   - Quick mode (`-q`): `MRISquickSphere()` with 3 passes.
   - Default: `MRISunfold()` with `max_passes` passes.
6. **Remove negative triangles**: `MRISremoveOverlapWithSmoothing()` with
   1000 iterations (if `remove_negative=1`, which is ON by default).
7. Write output.

### Target radius

By default, `target_radius = DEFAULT_RADIUS` (a compile-time constant,
likely 100 mm; the exact value was not confirmed from this reading).

With `-RA`: `target_radius = sqrt(total_area / (4π))`, which matches the
radius of a sphere with the same total area as the input surface.

> [!gap] DEFAULT_RADIUS value
> The value of `DEFAULT_RADIUS` (used as the sphere radius) is defined in
> `mrisurf.h` and was not read in this session. Common FreeSurfer
> implementations use 100 mm, but this should be verified.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `insurf` | positional | — | Input surface |
| `outsurf` | positional | — | Output spherical surface |
| `--help`<br>`--usage`<br>`-H`<br>`-?`<br>`-U` | bool | — | Print help (XML usage) and exit |
| `--version` | bool | — | Print version string and exit |
| `-A <n>` | int | 1024 | `parms.n_averages` — initial smoothing average count for the optimisation schedule |
| `-adaptive` | bool | OFF | Set `integration_type = INTEGRATE_ADAPTIVE` (overrides default `INTEGRATE_LINE_MINIMIZE`) |
| `-angle <f>` | float | 0.0 | `parms.l_angle` — angle preservation weight |
| `-area <f>` | float | 1.0 | `parms.l_area` — face area preservation weight |
| `-avgs <n>` | int | 0 | `smooth_avgs` — average original vertex positions N times before computing the reference metric (only used when `-q` is OFF) |
| `-B <scale>` | float | 1.0 | `base_dt_scale` — multiplier producing `parms.base_dt = base_dt_scale * parms.dt` |
| `-convex <f>` | float | 1.0 | `l_convex` — convexity weight used during the inflation sub-phase (only when `-I` or `-q`) |
| `-curv <f>` | float | 0.0 | `parms.l_curv` — curvature weight |
| `-D <f>` | float | 0.0 | `disturb` — perturb every vertex position by this amount before projection (calls `mrisDisturbVertices`) |
| `-debug` | bool | OFF | Set `Gdiag = DIAG_SHOW` |
| `-dist <f>` | float | 1.0 | `parms.l_dist` — edge length preservation weight |
| `-distances <nbhd> <max>`<br>`-vnum <nbhd> <max>` | int int | 7, 8 | `parms.nbhd_size` and `parms.max_nbrs` (sampled neighbourhood sizes) |
| `-dt <f>` | float | 0.05 | `parms.dt` — integration time step (also resets `parms.base_dt`) |
| `-dt_dec <f>` | float | 0.99 | `parms.dt_decrease` |
| `-dt_inc <f>` | float | 1.01 | `parms.dt_increase` |
| `-error_ratio <f>` | float | 1.03 | `parms.error_ratio` (used by adaptive integration) |
| `-expand <f>` | float | 0.0 | `l_expand` — expansion weight; if > 0 calls `MRISexpandSurface()` before inflation |
| `-I` | bool | OFF | `do_inflate = 1` — pre-inflate the input via `MRISinflateToSphere()` before projection |
| `-iarea <f>` | float | 0.0 | `inflate_area` — area weight during inflation sub-phase |
| `-iavgs <n>` | int | 0 | `inflate_avgs` — averages during inflation sub-phase |
| `-idt <f>` | float | 0.9 | `inflate_dt` — dt for inflation sub-phase |
| `-in <n>` | int | 1000 | `inflate_iterations` — iteration count for inflation sub-phase |
| `-inlarea <f>` | float | 0.0 | `inflate_nlarea` — non-linear area weight during inflation sub-phase |
| `-ispring <f>` | float | 0.0 | `inflate_spring` — spring weight during inflation sub-phase |
| `-itol <f>` | float | 1.0 | `inflate_tol` — tolerance for inflation sub-phase |
| `-itspring <f>` | float | 0.0 | `inflate_tspring` — tangential spring weight during inflation sub-phase |
| `-L` | bool | OFF | `load = 1` — read surface, project it, but do NOT run optimisation or write the output (used as a debug/inspection mode) |
| `-left-right-reverse` | bool | OFF | Mirror the input by negating x and reversing face order (calls `MRISreverseFaceOrder`) |
| `-lm` | bool | OFF | Set `integration_type = INTEGRATE_LM_SEARCH` (binary-search line minimisation) |
| `-M <momentum>` | float | 0.9 | Set `integration_type = INTEGRATE_MOMENTUM` and `parms.momentum = momentum` |
| `-N <n>` | int | 25 | `parms.niterations` — number of optimisation iterations per pass |
| `-name <str>` | string | (derived from output filename suffix, else `sphere`) | `parms.base_name` — base name used by intermediate writes |
| `-nbrs <n>` | int | 2 | `nbrs` — neighbourhood ring size used by `MRISsetNeighborhoodSize()` |
| `-NLAREA <f>` | float | 0.0 | `parms.l_nlarea` — non-linear area weight |
| `-NLDIST <f>` | float | 0.0 | `parms.l_nldist` — non-linear distance weight |
| `-no-vol-geom`<br>`-remove-vol-geom` | bool | OFF (KeepVolGeom=1) | Set `KeepVolGeom = 0`; output written with `mris->vg.valid = 0` (volume geometry stripped) |
| `-notal` | bool | (default) | `talairach = 0` — disables Talairach transform (note: code's stderr message is mislabelled) |
| `-O <name>` | string | `smoothwm` | `orig_name` — name of original surface read by `MRISreadOriginalProperties` (relative to input surface path) |
| `-p <n>` | int | 1 | `max_passes` — maximum number of unfolding/quick-sphere passes |
| `-PAREA <f>` | float | 0.0 | `parms.l_parea` — positive area weight |
| `-Q`<br>`-q` | bool | OFF | Quick mode preset: sets `quick=1`, `do_inflate=1`, `inflate_iterations=300`, `max_passes=3`, `nbrs=1`, `remove_negative=0`, zeros `l_spring/l_dist/l_parea/l_area`, sets `l_nlarea=1.0`, `tol=0.1`, `n_averages=32`. Skips reading original properties. |
| `-R` | bool | OFF | Toggle `randomly_project` (currently set but not consumed by main flow — vestigial) |
| `-RA` | bool | OFF | Set `target_radius = -1`; main loop then computes `sqrt(total_area / 4π)` so the sphere has the same area as the input surface |
| `-RADIUS <f>` | float | `DEFAULT_RADIUS` | `target_radius` — explicit target sphere radius (mm) |
| `-remove_negative <0\|1>` | int | 1 | After main optimisation, run `MRISremoveOverlapWithSmoothing()` for 1000 iterations to eliminate inverted faces |
| `-rotate <α> <β> <γ>` | float×3 | 0,0,0 | Pre-rotate input by Euler angles (degrees → radians) via `MRISrotate` |
| `-rusage <file>` | string | NULL | `rusage_file` — resource usage log file (variable stored, not actively written from this binary) |
| `-S <scale>` | float | 1.0 | `scale` — written into `parms.scale` (consumed by downstream `MRISunfold`) |
| `-seed <n>` | long | (system) | Calls `setRandomSeed(n)` |
| `-sphere <f>` | float | 0.025 | `l_sphere` — sphere weight used during inflation sub-phase |
| `-spring <f>` | float | 0.0 | `parms.l_spring` |
| `-spring_norm <f>` | float | 1.0 | `l_spring_norm` — used during inflation sub-phase |
| `-T <xform> <vol>` | string string | — | Read LTA `xform` and template volume `vol`, then apply transform to surface (`xform_fname`, `vol_fname`) |
| `-talairach` | bool | OFF | `talairach = 1` — call `MRIStalairachTransform()` on surface before projection |
| `-threads <n>`<br>`-openmp <n>` | int | (system) | Set `OMP_NUM_THREADS` and `omp_set_num_threads()` |
| `-tol <f>` | float | 0.5 | `parms.tol` — convergence tolerance |
| `-tspring <f>` | float | 0.0 | `parms.l_tspring` — tangential spring weight |
| `-V <vno>` | int | — | `Gdiag_no` — vertex number to trace for debugging |
| `-W <n>` | int | 1000 | Enable `DIAG_WRITE` and set `parms.write_iterations` (write intermediate surfaces every n iterations) |

### Configuration Interactions

> [!gotcha] `-q` (quick mode) changes many parameters simultaneously
> The `-Q`/`-q` flag simultaneously sets: `quick=1`, `do_inflate=1`,
> `inflate_iterations=300`, `max_passes=3`, `nbrs=1`, `remove_negative=0`,
> `parms.l_spring = parms.l_dist = parms.l_parea = parms.l_area = 0`,
> `parms.l_nlarea = 1.0`, `parms.tol = 0.1`, `parms.n_averages = 32`. It
> additionally causes the tool to **skip** `MRISreadOriginalProperties()`,
> so no `-O` surface is needed. It is a preset for fast approximate
> spherical mapping (used for topology correction, not final registration).

> [!gotcha] `-remove_negative 0` skips the post-mapping cleanup
> After the main optimisation, `MRISremoveOverlapWithSmoothing()` runs with
> 1000 iterations to eliminate remaining overlapping/inverted triangles.
> Disabling this with `-remove_negative 0` (or implied by `-q`) produces
> a sphere that may have triangle inversions.

> [!gotcha] `-O` must match an existing surface file relative to the input path
> `MRISreadOriginalProperties(mris, orig_name)` reads the original surface
> relative to the input surface path. The default `orig_name = "smoothwm"`.
> If the smoothwm surface is not present (e.g., stand-alone use), the tool
> will fail. This step is bypassed entirely when `-q` is given.

> [!gotcha] `-L` (load) suppresses optimisation AND output
> `-L` reads the surface, projects it onto the sphere, but skips both
> `MRISunfold()`/`MRISquickSphere()` and the final `MRISwrite()`. It also
> suppresses the `MRISinflateToSphere()` pre-inflation. It is effectively
> a no-op inspection mode.

> [!gotcha] Integration mode flags are mutually overriding
> `-adaptive`, `-lm`, and `-M` each set `parms.integration_type` to a
> different value. Whichever appears last on the command line wins. The
> default (when none are given) is `INTEGRATE_LINE_MINIMIZE`.

> [!gotcha] `-RA` and `-RADIUS` are mutually exclusive in effect
> Both write to `target_radius`; whichever appears last wins. `-RA` sets
> it to `-1` as a sentinel so the area-matching radius is computed at
> run time, while `-RADIUS` sets an explicit value.

> [!gotcha] `-T` requires both an LTA file and a template volume
> The `-T` option consumes two arguments (`xform_fname` and `vol_fname`).
> The volume is required because `MRIStransform()` needs voxel geometry
> for the transformation.

## Typical Use Cases

### Use Case 1: QSphere (quick, for topology correction)

```bash
# recon-all QSphere call (on smoothwm.nofix):
mris_sphere -q -p 6 -a 128 surf/lh.smoothwm.nofix surf/lh.qsphere.nofix
```

### Use Case 2: Full sphere mapping (autorecon3)

```bash
# recon-all sphere call:
mris_sphere -threads $OMP_NUM_THREADS surf/lh.inflated surf/lh.sphere
```

## Pipeline Context

**autorecon2 — QSphere stage** ([[recon-all]] lines 3689–3697):

```
mris_inflate → lh.inflated.nofix
                      ↓
  mris_sphere -q -p 6 -a 128 lh.smoothwm.nofix lh.qsphere.nofix
                      ↓
            lh.qsphere.nofix
                      ↓
        mris_topology_fixer (topology fix)
```

Exact recon-all QSphere command ([`scripts/recon-all:3690`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3690)):
```bash
mris_sphere -q -p 6 -a 128 surf/lh.smoothwm.nofix surf/lh.qsphere.nofix
```

**autorecon3 — Sphere stage** ([[recon-all]] lines 4172–4205):

```
mris_inflate → lh.inflated
                    ↓
    mris_sphere -threads $OMP_NUM_THREADS lh.inflated lh.sphere
                    ↓
               lh.sphere
                    ↓
         rca-surfreg / mris_register (surfreg)
```

(See [[mris_register]] for the next stage.)

Exact recon-all Sphere command ([`scripts/recon-all:4184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4184)):
```bash
mris_sphere -threads $OMP_NUM_THREADS [$-seed $RngSeed] [$-remove_negative 1] \
    surf/lh.inflated surf/lh.sphere
```

Note: autorecon3 starts at `mris_sphere`. The beginning of autorecon3 is
documented in `recon-all` at line 9727: *"Creates surf/?h.sphere. The
-autorecon3 stage begins here."*

## Gotchas and Caveats

> [!gotcha] QSphere and Sphere use different inputs
> The QSphere stage maps `smoothwm.nofix` (the unfixed, pre-topology-fix
> surface). The main Sphere stage maps `inflated` (the fixed, post-
> topology-correction inflated surface). These are two distinct surfaces.

> [!gotcha] Threading is significant for performance
> `mris_sphere` is OpenMP-enabled. recon-all passes `-threads $OMP_NUM_THREADS`
> for the main Sphere stage. Without threading, the full sphere mapping can take
> 30–60 minutes for typical-resolution surfaces. The QSphere stage does not
> receive `-threads` in the recon-all call.

> [!gotcha] Eversion detection threshold is 80% of faces
> If more than 80% of faces have negative orientation after projection, the
> surface is considered everted and `MRISevertSurface()` is called. A surface
> with exactly 80% inverted faces would NOT trigger eversion correction.

## Related Tools

- [[mris_inflate]] — produces the `inflated` surface that is the Sphere input
- [[mris_register]] (invoked from `rca-surfreg`) — registers the sphere to a group atlas
- [[mris_smooth]] — earlier in the pipeline

## Confidence and Gaps

Confidence **high** for flags, algorithm overview, and recon-all integration.

> [!gap] MRISunfold() energy functional
> The exact gradient expressions inside `MRISunfold()` are in the shared
> `mrisurf` library and were not traced.

> [!gap] DEFAULT_RADIUS value
> Needs confirmation from `mrisurf.h`.

## References

- Fischl, B., Sereno, M.I., Dale, A.M. (1999). *Cortical Surface-Based
  Analysis II: Inflation, Flattening, and a Surface-Based Coordinate System.*
  NeuroImage, 9(2):195–207. [cited in source header]
