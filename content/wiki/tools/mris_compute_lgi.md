---
title: "mris_compute_lgi"
type: tool
fs_version: "8.2.0"
source_language: "Shell (tcsh) + MATLAB"
source_files:
  - "mris_compute_lgi/mris_compute_lgi"
  - "mris_compute_lgi/compute_lgi.m"
  - "mris_compute_lgi/make_outer_surface.m"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_smooth]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_curvature]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The exact MATLAB version requirements are not documented."
  - "The geodesic sphere radius (hardcoded at 25 mm) is not user-configurable; interaction between radius and smoothing on final lGI values needs quantitative characterisation."
tags:
  - surface
  - gyrification
  - lgi
  - matlab
  - morphometry
---

# mris_compute_lgi

## Summary

`mris_compute_lgi` computes the local gyrification index (lGI) at each vertex of a cortical surface. lGI quantifies how much cortex is buried within sulci relative to the outer brain surface, providing a vertex-wise measure of cortical folding. The tool is a tcsh wrapper that orchestrates a MATLAB-based computation pipeline.

## Source Information

- **Language:** tcsh shell script + MATLAB
- **Source files:**
  - `mris_compute_lgi/mris_compute_lgi` (main script)
  - `mris_compute_lgi/compute_lgi.m` (MATLAB: core lGI computation)
  - `mris_compute_lgi/make_outer_surface.m` (MATLAB: outer surface construction)
  - Supporting MATLAB utilities in `mris_compute_lgi/`
- **Original author:** Marie Schaer
- **Reference:** Schaer M. et al., "A Surface-based Approach to Quantify Local Cortical Gyrification", IEEE Transactions on Medical Imaging, 2007, TMI-2007-0180

## Purpose and Context

The gyrification index measures how folded the cortex is — folded cortex has more surface area than the outer envelope of the brain. The local gyrification index (lGI) provides a per-vertex measure of this folding by comparing the pial surface area within a geodesic sphere to the area of the outer (inflated) surface within the same sphere.

lGI is a validated morphometric measure used in studies of cortical development, psychiatric disorders, and brain evolution.

## Inputs

Positional:

| Positional | Description |
|-----------|-------------|
| `<input>` | Input surface file (pial surface, e.g., `lh.pial`) |

Optional flags:

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i <file>` | path | — | Input surface file (required; also `-i` / `--input`) |
| `--close_sphere_size <n>` | int | 15 | Morphological closing sphere size (mm) for outer surface construction |
| `--smooth_iters <n>` | int | 30 | Smoothing iterations for outer surface |
| `--step_size <n>` | int | 100 | Step size (vertex stride) for lGI computation |
| `--dont_extract` | — | off | Skip `mris_extract_main_component` step |
| `--dontrun` | — | off | Print commands but do not execute them |
| `--echo` | — | off | Enable command echo for debugging (alias: `--debug`) |

## Outputs

| Output | Description |
|--------|-------------|
| `<input>-outer-smoothed` | Outer surface (smoothed) in current directory |
| `pial_lgi` | Per-vertex lGI values written to `<input>-pial_lgi` |
| `tmp-mris_compute_lgi-<input>/` | Temporary working directory |

> [!gotcha] Output in current directory
> Output files are written to the current working directory, not to the subject's surf/ directory. The caller must manage file placement.

## Mathematical Foundations

The local gyrification index at vertex $v$ is defined as:

$$
\text{lGI}(v) = \frac{A_{\text{pial}}(v, r)}{A_{\text{outer}}(v, r)}
$$

where:
- $A_{\text{pial}}(v, r)$ is the pial surface area within a geodesic sphere of radius $r$ centred at $v$
- $A_{\text{outer}}(v, r)$ is the outer surface area within the same sphere

The outer surface is constructed by:
1. Filling the pial surface volume (`mris_fill`).
2. Applying morphological closing with sphere radius `close_sphere_size` (`make_outer_surface.m`).
3. Extracting the main component (`mris_extract_main_component`).
4. Smoothing (`mris_smooth -n smooth_iters`).

## Configuration Options

See the flags table in Inputs. The outer surface construction parameters (`--close_sphere_size`, `--smooth_iters`) primarily affect the denominator of the lGI ratio.

## Configuration Interactions

- The geodesic sphere radius is hardcoded at 25 mm and is not configurable from the command line. Larger radii would produce smoother, lower lGI values.
- `--close_sphere_size` controls how much the outer surface "bridges" over sulci. Larger values produce a smoother outer surface.
- `--dont_extract` skips the main-component extraction step, which may be appropriate for hemispheres without disconnected components.

> [!gotcha] Geodesic radius is hardcoded
> The geodesic sphere radius used for lGI computation is hardcoded to 25 mm in the script. There is no `--radius` command-line flag; to use a different radius the script must be edited directly.

> [!gotcha] MATLAB required
> The tool requires MATLAB to be available (`getmatlab` must return a valid path). It will exit with an error if MATLAB is not found.

## Typical Use Cases

```bash
# Compute lGI on left pial surface (standard usage)
cd $SUBJECTS_DIR/bert/surf
mris_compute_lgi --i lh.pial

# Custom step size (process every 50th vertex instead of every 100th)
mris_compute_lgi --step_size 50 --i lh.pial

# Dry run (print commands only)
mris_compute_lgi --dontrun --i lh.pial
```

## Pipeline Context

Not part of the standard `recon-all` pipeline (though it can be run after). Called in cortical development and folding research.

After `recon-all` completes:
```bash
mris_compute_lgi --i lh.pial
mris_compute_lgi --i rh.pial
```

The resulting `pial_lgi` files can be analysed with [[mris_anatomical_stats]] or visualised in Freeview.

## Gotchas and Caveats

> [!gotcha] MATLAB dependency
> The tool requires MATLAB. It is not compatible with Octave. This is a significant limitation in HPC environments where MATLAB licences are restricted.

> [!gotcha] Temporary directory not cleaned up on error
> If the computation fails, the `tmp-mris_compute_lgi-<input>/` directory is left behind. Clean it up manually before rerunning.

> [!gotcha] Output placement
> Results are placed in the current working directory, not the subject's surf/ directory. Always `cd` to the surf/ directory before running, or copy outputs manually.

> [!gotcha] Geodesic projection uses MATLAB
> The core geodesic computation (`PropagateGeodesic.m`, `SearchProjectionOnPial.m`) is implemented in MATLAB, not C++. This makes the tool significantly slower than other FreeSurfer surface tools.

## Related Tools

- [[mris_curvature]] — computes intrinsic curvature measures
- [[mris_smooth]] — used internally for outer surface smoothing
- [[mris_anatomical_stats]] — can report lGI statistics per parcellation region

## Confidence and Gaps

**Confident:** Pipeline steps, I/O, MATLAB dependency, output placement, and key parameters confirmed from source script.

> [!gap] MATLAB version requirements
> The minimum required MATLAB version for the `.m` scripts is not documented. Newer MATLAB versions may have deprecated functions used in the scripts.
