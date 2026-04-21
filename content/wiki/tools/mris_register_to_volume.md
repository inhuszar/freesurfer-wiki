---
title: "mris_register_to_volume"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_register_to_volume/mris_register_to_volume.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register_to_label]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Skip and sigma search ranges not detailed in BEGINUSAGE block"
  - "CNR similarity function not fully characterised"
tags:
  - surface
  - registration
  - rigid
  - volume
  - gradient
---

# mris_register_to_volume

## Summary

`mris_register_to_volume` computes a rigid alignment between a cortical surface and an intensity volume by maximising the gradient magnitude across the gray/white boundary divided by its variance. Unlike [[mris_register_to_label]], it works directly with the intensity gradient rather than a pre-computed label's distance transform. It supports grid search over translations and rotations, multiple similarity functions, and noise testing.

## Source Information

- **Language:** C++
- **Source file:** `mris_register_to_volume/mris_register_to_volume.cpp`
- **Original author:** Greg Grev
- **Note:** Shares its source directory with [[mris_register_to_label]]

## Purpose and Context

`mris_register_to_volume` addresses the same problem as [[mris_register_to_label]] but operates on raw intensity volumes rather than binary labels. This is appropriate when a label defining the boundary is not available, but the intensity contrast at the surface boundary is visible (e.g., T1w brain at the white/gray interface).

Applications include:
- Post-processing rigid correction of surface-to-volume alignment
- Registration of surfaces to additional MRI contrasts
- Quality control via CNR-based similarity

## Inputs

- `--reg regfile` — input/output registration file
- `--mov fvol` — moving (fixed reference) volume
- `--surf surface` — surface to register
- `--pial pial_surface` — pial surface (optional)

## Outputs

- `--out-reg outreg` — registration file at lowest cost (updated during search)
- `--cost costfile` — cost function values during search

## Mathematical Foundations

The default similarity maximises:

$$
S(R, t) = \frac{\sum_v |\nabla I(Rv + t)|^2}{\text{Var}(|\nabla I|)}
$$

where $I$ is the input intensity volume, $R$ is the rotation matrix, and $t$ is the translation.

The CNR-based similarity uses:

$$
S_{CNR}(R, t) = \text{CNR between WM and GM at surface vertices}
$$

A Gaussian blurring kernel of sigma $\sigma$ is optionally applied before computing gradients (`--sigma`).

The tool can also add Gaussian noise of specified standard deviation to test registration robustness (`--noise`).

## Configuration Options

| Flag | Description |
|---|---|
| `--reg regfile` | Registration file (input/output) |
| `--mov fvol` | Moving volume |
| `--surf surface` | Surface file |
| `--pial pial` | Pial surface (optional) |
| `--pial_only pial` | Use only pial in similarity |
| `--median` | Apply median filter |
| `--patch patch` | Surface patch |
| `--tx-mmd txmin txmax txdelta` | Translation search in x (mm) |
| `--ty-mmd tymin tymax tydelta` | Translation search in y (mm) |
| `--tz-mmd tzmin tzmax tzdelta` | Translation search in z (mm) |
| `--ax-mmd axmin axmax axdelta` | Rotation search about x (deg) |
| `--ay-mmd aymin aymax aydelta` | Rotation search about y (deg) |
| `--az-mmd azmin azmax azdelta` | Rotation search about z (deg) |
| `--cost costfile` | Output cost function file |
| `--interp type` | Interpolation: `trilinear` or `nearest` |
| `--no-crop` | Do not crop anatomy (crops by default) |
| `--profile` | Print execution time |
| `--noise stddev` | Add Gaussian noise for sensitivity testing |
| `--seed randseed` | Random seed for noise |
| `--skip min max` | Skip fraction of vertices for speed |
| `--sigma min max` | Blurring kernel sigma range |
| `--CNR` | Use CNR-based similarity function |
| `--border border` | Ignore border region |
| `--out-reg outreg` | Registration at lowest cost |

## Configuration Interactions

- `--tx-mmd`, `--ty-mmd`, `--tz-mmd`, `--ax-mmd`, `--ay-mmd`, `--az-mmd` define 6-DOF grid search bounds and step sizes.
- `--CNR` replaces the default gradient-based similarity with a CNR function.
- `--median` and `--CNR` can be combined but their interaction is not documented.
- `--no-crop` disables automatic anatomy cropping; cropping reduces computation by limiting the volume to the surface's bounding box.
- `--noise` and `--seed` are for testing only; they corrupt the input data.

## Typical Use Cases

```bash
# Register surface to volume with grid search
mris_register_to_volume \
  --reg lh.dat --mov brain.mgz \
  --surf lh.white \
  --tx-mmd -5 5 1 --ty-mmd -5 5 1 --tz-mmd -5 5 1 \
  --ax-mmd -5 5 1 --ay-mmd -5 5 1 --az-mmd -5 5 1 \
  --out-reg lh.registered.dat

# CNR-based registration
mris_register_to_volume \
  --reg lh.dat --mov brain.mgz \
  --surf lh.white --CNR \
  --out-reg lh.registered.dat
```

## Pipeline Context

Not part of `recon-all`. Used for surface-to-volume post-correction in research workflows.

## Gotchas and Caveats

> [!gotcha] sinc interpolation broken
> Same warning as in [[mris_register_to_label]]: "sinc interpolation is broken except for maybe COR to COR." Use `trilinear` or `nearest`.

> [!gotcha] Crops by default
> The tool crops the anatomy volume by default to speed up computation. Use `--no-crop` if this is undesirable.

> [!gotcha] Grid search can be slow
> A fine grid over 6 DOF with small step sizes can require enormous computation. For practical use, initialise near the expected solution with `--angle_init` / `--trans_init` and use a coarse grid.

## Related Tools

- [[mris_register_to_label]] — similar tool for binary label targets
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from BEGINUSAGE):** Full flag set from embedded usage block; sinc warning; default crops anatomy; CNR option.

**Uncertain:** CNR similarity function implementation details; `--sigma` and `--skip` parameter semantics (min/max range meaning).

> [!gap] The CNR-based similarity function (`--CNR`) implementation was not read. Its relationship to the mris_ms_surface_CNR formulation is unknown.
