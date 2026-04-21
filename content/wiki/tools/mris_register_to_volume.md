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
confidence: high
last_agent_update: 2026-04-21
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

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--reg` | `regfile` | — | Registration file (input/output); identity matrix used if omitted |
| `--mov` | `fvol` | — | Moving (reference) volume; **required** |
| `--surf` | `surface` | — | Surface file; **required** |
| `--pial` | `pial` | _(none)_ | Pial surface to include in similarity |
| `--pial_only` | `pial` | _(none)_ | Use pial surface only (discard white) in similarity |
| `--median` | | `off` | Apply median filter to input volume before registration |
| `--patch` | `patch` | _(none)_ | Load surface patch and limit calculations to patch vertices |
| `--label` | `label` | _(none)_ | Load label and limit calculations to labelled vertices |
| `--dilate` | `ndil` | `2` | Dilate rip flags N times (used with `--patch` / `--label`) |
| `--tx-mmd` | `txmin txmax txdelta` | `0 0 0` | Translation grid search in x (mm) |
| `--ty-mmd` | `tymin tymax tydelta` | `0 0 0` | Translation grid search in y (mm) |
| `--tz-mmd` | `tzmin tzmax tzdelta` | `0 0 0` | Translation grid search in z (mm) |
| `--ax-mmd` | `axmin axmax axdelta` | `0 0 0` | Rotation grid search about x (deg) |
| `--ay-mmd` | `aymin aymax aydelta` | `0 0 0` | Rotation grid search about y (deg) |
| `--az-mmd` | `azmin azmax azdelta` | `0 0 0` | Rotation grid search about z (deg) |
| `--max_rot` | `angle` | `20` | Maximum rotation angle (degrees) to search over |
| `--max_trans` | `dist` | `200` | Maximum translation (mm) to search over |
| `--tscale` | `scale` | `5.0` | Translation scale factor for coarse grid search |
| `--skip` | `min max` | `8 32` | Vertex skip range; registration iterates from max down to min |
| `--sigma` | `min max` | `0.5 2` | Blurring kernel sigma range (mm); iterates from max down to min |
| `--cost` | `costfile` | _(none)_ | Output cost function values during search |
| `--out-reg` | `outreg` | _(none)_ | Registration file updated continuously at each new lowest cost |
| `--interp` | `type` | `trilinear` | Interpolation method: `trilinear` or `nearest` |
| `--no-crop` | | `off` | Disable automatic anatomy cropping |
| `--crop` | | `off` | Force anatomy cropping on |
| `--profile` | | `off` | Print execution timing information |
| `--noise` | `stddev` | _(none)_ | Add Gaussian noise of given stddev to input (testing only) |
| `--seed` | `randseed` | `-1` | Random seed for noise generation |
| `--CNR` | | `off` | Use CNR-based similarity function |
| `--DOT` | | `on` | Use gradient-normal (dot product) similarity (default) |
| `--GRADIENT` | | `off` | Use raw gradient magnitude similarity |
| `--dist` | | `off` | Use distance-based similarity function |
| `--border` | `border` | `20` | Number of border voxels to ignore (mask size) |
| `--aseg` | | `off` | Use aseg segmentation during registration |
| `--noglobal` | | `off` | Skip global grid search; go straight to Powell optimisation |
| `--w` | `N` | `1` | Write snapshot every N iterations |
| `--rm` | | `off` | Read previously computed median-filtered volume from disk |
| `--rg` | | `off` | Read previously computed gradient volume from disk |
| `--s` | `subject` | _(none)_ | Subject name written into register.dat subject field |
| `--cropy` | `y0 y1` | `-1 -1` | Restrict volume crop to Y-voxel range `[y0, y1]` |
| `--debug` | | `off` | Enable verbose debug output during command-line parsing |
| `--gdiagno` | `N` | `-1` | Set `Gdiag_no` for verbose diagnostic output |

## Configuration Interactions

- `--tx-mmd`, `--ty-mmd`, `--tz-mmd`, `--ax-mmd`, `--ay-mmd`, `--az-mmd` define 6-DOF grid search bounds and step sizes.
- `--CNR` replaces the default gradient-normal similarity. `--DOT` restores the default. `--GRADIENT` uses raw gradient magnitude. `--dist` uses distance similarity.
- `--median` and `--CNR` can be combined but their interaction is not documented.
- `--no-crop` disables automatic anatomy cropping; cropping reduces computation by limiting the volume to the surface's bounding box. `--crop` forces cropping on.
- `--noise` and `--seed` are for testing only; they corrupt the input data.
- `--noglobal` skips the global grid search and goes directly to Powell optimisation; useful when the initial registration in `--reg` is already close to the solution.
- `--max_rot` and `--max_trans` bound the global search space; defaults are 20 degrees and 200 mm.
- `--label` and `--patch` both restrict calculations to a subset of vertices; `--dilate` expands the rip mask around the restricted area when used with these options.

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
> A fine grid over 6 DOF with small step sizes can require enormous computation. For practical use, limit the search range with `--max_rot` / `--max_trans` and use `--noglobal` to skip the grid search entirely and go straight to Powell optimisation if a good initialisation is available in the registration file.

## Related Tools

- [[mris_register_to_label]] — similar tool for binary label targets
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from source `parse_commandline`):** Full flag set from source; --angle_init/--trans_init do NOT exist (removed); --DOT, --GRADIENT, --dist similarity alternatives confirmed; --max_rot/--max_trans bounds; --noglobal; --rm/--rg; --aseg; --label/--patch/--dilate; --s/--tscale/--w/--gdiagno; --cropy; --debug; sinc warning; default crops anatomy; CNR option. All defaults verified from static variable initialisations.

**Uncertain:** CNR similarity function implementation details; --cropy interaction with the unconditional crop in main() (DoCrop=0 by default, but volume is always extracted in main). Note: --mri_reg appears in the printed usage text but is NOT parsed by `parse_commandline`; use --mov instead.

> [!gap] The CNR-based similarity function (`--CNR`) implementation was not read. Its relationship to the mris_ms_surface_CNR formulation is unknown.
