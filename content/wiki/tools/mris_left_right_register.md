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

The tool supports single-surface mode (`-1`) for registering to another individual's surface rather than an atlas, and multi-scale registration via the `-nsigmas` and `-sigmas` flags.

## Inputs

| Flag/Positional | Description |
|-----------------|-------------|
| `argv[1]` | Input surface to register |
| `argv[2]` | Target surface (atlas or mirror hemisphere) |
| `argv[3]` | Output registered surface |
| `-1` | Single surface mode: register directly to another individual surface |
| `--annot annot` | Use this annotation for registration |

## Outputs

| Output | Description |
|--------|-------------|
| Registered surface | Sphere with updated vertex positions reflecting the left-right registration |

## Mathematical Foundations

The registration optimizes:

$$E = -\lambda_{\text{corr}} \sum_v \text{corr}(f_v, f_{\text{target}}) + \lambda_{\text{smooth}} \sum_{(u,v)} \|v_u - v_v\|^2$$

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
| `-1` | — | off | Single surface mode (register to individual, not atlas) |
| `-reverse` | — | off | Use reversed hemisphere as target |
| `-w N` | integer | 0 | Write intermediate results every N iterations |
| `-v N` | integer | -1 | Set Gdiag_no to vertex N for verbose diagnostics |
| `-n nbrs` | integer | 1 | Neighborhood size |
| `-navgs N` | integer | 0 | Number of smoothing averages |
| `-s scale` | float | 1.0 | Scale factor |
| `-ocorr weight` | float | 1.0 | Overall correlation weight (`l_ocorr`) |
| `-target_hemi H` | int | LEFT | Target hemisphere (LEFT=0, RIGHT=1) |
| `-multi_scale` | — | off | Enable multi-scale registration |
| `-which_norm N` | int | NORM_MEAN | Normalization method |
| `-annot annot_name` | string | — | Annotation name for alignment |
| `-nangles N` | integer | 8 | Number of angular search directions |
| `-max_passes P` | integer | 4 | Maximum registration passes |
| `-min_degrees D` | float | 0.5 | Minimum angular step (degrees) |
| `-max_degrees D` | float | 64.0 | Maximum angular step (degrees) |
| `-start fname` | path | — | Starting registration surface |
| `-inflated name` | string | — | Inflated surface name |
| `-sigma S` | float | — | Add smoothing sigma (repeatable, up to 10) |
| `-jacobian fname` | path | — | Output Jacobian file |
| `-dalpha D` | float | 0 | Alpha rotation offset |
| `-dbeta D` | float | 0 | Beta rotation offset |
| `-dgamma D` | float | 0 | Gamma rotation offset |

## Configuration Interactions

- `-1` (single surface mode) enables direct subject-to-subject registration without an atlas target. The input and atlas surfaces are treated as both derived from individual subjects.
- `-reverse` mirrors the subject's surface before registration.
- `-sigma` can be specified multiple times (up to `MAX_SIGMAS=10`) to define a multi-scale smoothing schedule.
- `-target_hemi` controls which hemisphere is used as the target in the registration.
- `-jacobian` writes the Jacobian of the registration to the specified file.

## Typical Use Cases

**Register left hemisphere to right hemisphere (for xhemi analysis):**
```bash
mris_left_right_register lh.sphere.reg rh.sphere.reg lh.rh.sphere.reg
```

**Single-surface mode (register lh to rh of the same subject):**
```bash
mris_left_right_register -1 lh.sphere rh.sphere lh.to_rh.sphere
```

## Pipeline Context

Not part of standard `recon-all`. Used in asymmetry analysis pipelines:

1. [[recon-all]] produces `lh.sphere.reg` and `rh.sphere.reg`
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
- Single-surface mode via `-1`

> [!gap] Output format and naming
> Whether the output is written as a standard sphere file or with a special naming convention is not confirmed.
