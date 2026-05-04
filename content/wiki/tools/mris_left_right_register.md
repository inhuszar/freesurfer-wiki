---
title: "mris_left_right_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_left_right_register/mris_left_right_register.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Whether output is a new sphere.reg or modifies in place is not confirmed"
  - "Relationship to xhemi analysis (cross-hemispheric comparison) is inferred but not confirmed"
tags:
  - surface
  - registration
  - left-right
  - symmetry
  - sphere
---

# mris_left_right_register

## Summary

`mris_left_right_register` registers a cortical surface from one hemisphere to the other, enabling cross-hemispheric comparisons. Like `mris_register`, it performs spherical surface registration using an iterative gradient descent optimization, but the target atlas is the other hemisphere's surface (or a hemispheric template). This is used in studies of hemispheric asymmetry and for creating symmetric atlases.

## Source Information

- **Language:** C++
- **Source file:** `mris_left_right_register/mris_left_right_register.cpp`
- **Original author:** Bruce Fischl
- **Key dependency:** `gcsa.h` (Gaussian Classifier Surface Atlas)

## Purpose and Context

Cross-hemispheric registration enables:
- Detecting structural asymmetries between left and right hemispheres
- Creating symmetric cortical atlases (lh-to-rh registered)
- FreeSurfer's `xhemi` analysis pipeline for hemispheric lateralization

The algorithm is essentially the same as `mris_register` (spherical registration via curvature feature matching) but uses the opposite hemisphere's surface features as the registration target. The default surfaces used for registration features are `inflated` and `smoothwm` (via sulc/H).

The tool supports multi-scale registration via the `-sigma` (repeatable) and `-multi_scale` flags.

## Inputs

| Positional | Description |
|------------|-------------|
| `argv[1]` | Input surface to register |
| `argv[2]` | Target surface (atlas or mirror hemisphere) |
| `argv[3]` | Output registered surface |

## Outputs

| Output | Description |
|--------|-------------|
| Registered surface | Sphere with updated vertex positions reflecting the left-right registration |

## Mathematical Foundations

The registration optimizes:

$$
E = -\lambda_{\text{corr}} \sum_v \text{corr}(f_v, f_{\text{target}}) + \lambda_{\text{smooth}} \sum_{(u,v)} \|v_u - v_v\|^2
$$

where:
- $\text{corr}$ is the normalized cross-correlation between the subject's surface features and the target template features
- Features are defined at each vertex on the sphere as vectors from multiple surfaces (inflated.H, sulc)
- $\lambda_{\text{corr}}$ = `l_ocorr` (default: 1.0)
- The optimization uses multi-scale angular displacements from `max_degrees` (64°) down to `min_degrees` (0.5°)

The target hemisphere is mirrored (reflected through a sagittal plane) to create a valid registration target.

Registration surfaces used:
```
surface_names[] = {"inflated", "smoothwm", "smoothwm"}
curvature_names[] = {"inflated.H", "sulc", NULL}
```

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-reverse` | — | off | Use reversed hemisphere as target |
| `-w N` | integer | 100 | Write intermediate results every N iterations |
| `-v N` | integer | — | Set Gdiag_no to vertex N for verbose diagnostics |
| `-s scale` | float | 1.0 | Scale factor applied to parameterization |
| `-n N` | integer | 100 | Number of iterations per pass |
| `-a N` | integer | 1024 | Number of gradient smoothing averages |
| `-m momentum` | float | 0.95 | Momentum for gradient descent |
| `-p N` | integer | 4 | Maximum number of registration passes |
| `-o name` | string | `smoothwm` | Name of original surface for metric properties |
| `-ocorr weight` | float | 1.0 | Overall correlation weight (`l_ocorr`) |
| `-multi_scale N` | integer | — | Number of scales for multi-scale registration |
| `-median` | — | off | Use median normalization instead of mean |
| `-nonorm` | — | off | Disable curvature normalization entirely |
| `-annot name` | string | — | Annotation name; zero medial wall before registration |
| `-nangles N` | integer | 8 | Number of angular search directions per scale |
| `-min_degrees D` | float | 0.5 | Minimum angular step size (degrees) |
| `-max_degrees D` | float | 64.0 | Maximum angular step size (degrees) |
| `-inflated name` | string | — | Use named surface as the inflated surface; also sets `IP_USE_INFLATED` |
| `-infname name` | string | — | Set inflated surface name and corresponding curvature file (e.g., `name.H`) |
| `-sigma S` | float | — | Add smoothing sigma level (repeatable, up to 10) |
| `-jacobian fname` | path | — | Write Jacobian of the registration to this file |
| `-rotate alpha beta gamma` | 3 floats | 0 0 0 | Apply initial rotation by (alpha, beta, gamma) degrees |
| `-sreg fname` | path | — | Start registration from coordinates in this file |
| `-dist coef` | float | 5.0 | Weight for distance preservation term (`l_dist`) |
| `-area coef` | float | 0.0 | Weight for area preservation term (`l_area`) |
| `-parea coef` | float | 0.1 | Weight for pairwise area term (`l_parea`) |
| `-nlarea coef` | float | 1.0 | Weight for non-linear area term (`l_nlarea`) |
| `-corr coef` | float | 1.0 | Weight for cross-correlation term (`l_corr`) |
| `-spring coef` | float | — | Weight for spring energy term (`l_spring`) |
| `-lap coef` | float | — | Weight for Laplacian energy term (`l_lap`) |
| `-e coef` | float | 10000 | Weight for external label energy (`l_external`) |
| `-curv` | — | on | Use smoothwm curvature for final alignment |
| `-nocurv` | — | off | Disable smoothwm curvature for final alignment |
| `-norot` | — | off | Disable initial rigid alignment |
| `-nosulc` | — | off | Disable sulc-based initial alignment |
| `-sulc name` | string | `sulc` | Replacement curvature file for sulc alignment |
| `-canon name` | string | `sphere` | Name of canonical surface for reading coordinates |
| `-c fname` | path | — | Curvature filename for diagnostics |
| `-l label gcsa name` | path path string | — | Add label constraint using GCSA atlas |
| `-lm` | — | off | Use line minimization integration |
| `-adaptive` | — | off | Use adaptive time step integration |
| `-search` | — | off | Use binary search line minimization |
| `-dt DT` | float | 0.9 | Time step for gradient descent |
| `-dt_inc val` | float | 1.0 | Time step increase factor |
| `-dt_dec val` | float | 1.0 | Time step decrease factor |
| `-error_ratio val` | float | 1.1 | Error ratio threshold for step size adaptation |
| `-tol val` | float | 0.5 | Convergence tolerance |
| `-distances nbhd max` | 2 ints | -10 10 | Neighborhood size and max neighbors for distance computation |
| `-vnum nbhd max` | 2 ints | -10 10 | Alias for `-distances` |
| `-nbrs N` | integer | 1 | Neighborhood size for curvature computation |
| `-nsurfaces N` | integer | — | Number of surfaces/curvatures to use for alignment |
| `-surf0 name` | string | `inflated` | Override name of surface 0 |
| `-surf1 name` | string | `smoothwm` | Override name of surface 1 |
| `-surf2 name` | string | `smoothwm` | Override name of surface 2 |
| `-curv0 name` | string | `inflated.H` | Override curvature file for surface 0 |
| `-curv1 name` | string | `sulc` | Override curvature file for surface 1 |
| `-curv2 name` | string | — | Override curvature file for surface 2 |
| `-topology` | — | off | Preserve topology of positive-area triangles |
| `-vsmooth` | — | off | Use space/time varying smoothness weighting |
| `-remove_negative N` | int | 1 | Remove negative triangles via iterative smoothing (1=yes, 0=no) |
| `-overlay-dir dir` | path | — | Set overlay directory path |
| `-1` | — | off | Treat the target as a single subject's surface (`single_surf = True`) rather than a group average |

## Configuration Interactions

- `-reverse` mirrors the subject's surface before registration.
- `-sigma` can be specified multiple times (up to `MAX_SIGMAS=10`) to define a multi-scale smoothing schedule.
- `-jacobian` writes the Jacobian of the registration to the specified file.
- `-rotate` applies an initial rigid rotation before the iterative optimization; unlike the `-dalpha`/`-dbeta`/`-dgamma` pattern seen in older tools, this is a single flag taking three angular arguments.
- `-infname` sets a custom inflated surface name and automatically sets the corresponding curvature file to `<name>.H`, which differs from `-inflated` (which only enables `IP_USE_INFLATED`).
- `-canon` overrides the canonical surface from which vertex coordinates are read (default: `sphere`).

## Typical Use Cases

**Register left hemisphere to right hemisphere (for xhemi analysis):**
```bash
mris_left_right_register lh.sphere.reg rh.sphere.reg lh.rh.sphere.reg
```

**Use multi-scale smoothing schedule:**
```bash
mris_left_right_register -sigma 4 -sigma 2 -sigma 1 lh.sphere.reg rh.sphere.reg lh.rh.sphere.reg rh.lh.sphere.reg
```

## Pipeline Context

Not part of standard `recon-all`. Used in asymmetry analysis pipelines:

1. [[wiki/pipelines/recon-all|recon-all]] produces `lh.sphere.reg` and `rh.sphere.reg`
2. `mris_left_right_register` creates a cross-hemispheric registration
3. `mri_vol2surf` or similar projects hemispheric data for comparison

## Gotchas and Caveats

> [!gotcha] Requires both hemispheres to be processed
> Both the left and right hemisphere surfaces must be available since the registration uses one as the target for the other.

> [!gotcha] Similar to but not identical to mris_register
> While the algorithm is similar to `mris_register`, the default parameters and target hemisphere logic differ. Do not substitute `mris_register` directly for cross-hemispheric registration.

## Related Tools

- [[mris_register]] — standard atlas registration (intra-hemisphere)
- [[mris_sphere]] — produces the sphere used as input
- [[surface-format]] — surface file formats

## Confidence and Gaps

**Confident (from source):**
- Registration surfaces (inflated, smoothwm, inflated.H, sulc)
- Default parameter values
- Multi-scale sigma schedule via `-sigma` (repeatable)

> [!gap] Output format and naming
> Whether the output is written as a standard sphere file or with a special naming convention is not confirmed.
