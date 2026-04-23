---
title: "mris_errors"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_errors/mris_errors.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_euler_number]]"
  - "[[mris_fix_topology]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The exact definition of the area and angle error metrics is not documented in the source header."
  - "Whether output is printed to stdout or written to a file is unclear from the source."
tags:
  - surface
  - quality-control
  - self-intersection
  - topology
---

# mris_errors

## Summary

`mris_errors` measures surface errors, specifically area and angle distortions relative to the original smooth surface. It computes a per-vertex or per-face error measure by comparing the current surface metric properties to those stored in the `smoothwm` surface. It can also read patches. This tool is primarily used for quality assessment of surface deformation results.

## Source Information

- **Language:** C++
- **Source file:** `mris_errors/mris_errors.cpp`
- **Author:** Bruce Fischl (inferred)
- **Key functions:** `MRISareaErrors()`, `MRISangleErrors()`

## Purpose and Context

After surface deformations (e.g., inflation, registration), the original metric properties (areas, angles) are distorted. `mris_errors` quantifies these distortions by comparing the current vertex positions to the stored `ORIGINAL_VERTICES` (from `smoothwm`). This is useful for diagnosing pathological surface deformations.

## Inputs

- **Surface file** (positional arg 1): Path to a FreeSurfer surface or surface patch.
- When `-p` is set, the tool reads `<hemi>.smoothwm` from the same directory as the patch, then reads the patch file.

## Outputs

Results are printed to stdout. When `-w` is set, the error values are written back to the surface as curvature values (output file path not extracted from source).

## Mathematical Foundations

**Area errors** (`-a`): For each face, compares the current triangle area to the original (smoothwm) triangle area. The error is a per-face or per-vertex aggregate measure of area distortion.

**Angle errors** (default): Compares face normal angles between the current and original surface, measuring angular distortion at each vertex.

The neighbourhood sampling uses `MRISsampleAtEachDistance()` with `nbhd_size=7` and `max_nbrs=12` by default (configurable together via `-vnum` or `-distances`), sampling the local neighbourhood to build a statistical profile of distortions.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-a` | — | off | Compute area errors (default: angle errors) |
| `-p` | — | off | Input is a surface patch rather than a full surface |
| `-w` | — | off | Write error values to surface as curvature |
| `-vnum`<br>`-distances` | `<nbhd_size> <max_nbrs>` | `7 12` | Set neighbourhood size and maximum neighbours (both flags accept two integer arguments) |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `-a` and the default (angle errors) are mutually exclusive; `-a` sets `area_flag=1` which routes to `MRISareaErrors()` instead of `MRISangleErrors()`.
- `-p` (patch mode) requires `smoothwm` to be in the same directory as the patch; the full surface is loaded first, then the patch is overlaid.
- `-vnum` and `-distances` are aliases for the same operation; both accept two arguments (`nbhd_size` and `max_nbrs`) and set both values simultaneously.

## Typical Use Cases

```bash
# Compute angle errors for a surface
mris_errors lh.inflated

# Compute area errors
mris_errors -a lh.inflated

# Compute errors for a patch
mris_errors -p lh.occipital.patch
```

## Pipeline Context

Not called by `recon-all`. Used in diagnostic/research workflows to assess surface deformation quality. Related to [[mris_euler_number]] for topology checking and [[mris_fix_topology]] for correction.

## Gotchas and Caveats

> [!gotcha] Requires smoothwm in same directory
> The tool reads `MRISreadOriginalProperties(mris, "smoothwm")` to load the reference metric. This requires `<hemi>.smoothwm` to exist in the surface directory.

> [!gotcha] Patch mode changes file search path
> In patch mode (`-p`), the tool determines the hemi from the patch filename and looks for `<hemi>.smoothwm` in the directory containing the patch file.

## Related Tools

- [[mris_euler_number]] — topological quality check (Euler number)
- [[mris_fix_topology]] — corrects topological defects
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**Confident (from source):** Patch mode, area vs. angle error flag, neighbourhood parameters, smoothwm dependency.

**Uncertain:** Exact mathematical definition of the error metrics; output format and file path for `-w` mode.

> [!gap] Error metric formulas
> `MRISareaErrors()` and `MRISangleErrors()` are defined in `mrisurf_metricProperties` but not fully read. The exact per-vertex/per-face computation is unknown without reading those library functions.
