---
title: "mri_linear_align"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hires_register/mri_linear_align.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_nl_align]]"
  - "[[mri_linear_align_binary]]"
  - "[[mri_linear_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - registration
  - linear
  - alignment
  - high-resolution
---

# mri_linear_align

## Summary

`mri_linear_align` computes the optimal linear (affine) alignment between two MRI volumes. It uses a combination of a global parameter search followed by Powell's method for refinement, optimising a voxel-list-based likelihood or gradient-match criterion. It is part of the high-resolution registration toolkit (`mri_hires_register/`).

## Source Information

- **Language:** C++
- **Source file:** `mri_hires_register/mri_linear_align.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

`mri_linear_align` is a fine-grained linear registration tool designed to complement non-linear alignment. It finds the optimal rigid or affine transform between a target and source volume using intensity-based criteria, including:
- Intensity likelihood (sum of squared differences with GCA atlas model)
- Gradient match
- Trimmed likelihood (robust to outliers)

The registration proceeds in two phases: a global exhaustive search over rotation/translation parameter space (within bounds), then Powell's method for refinement.

## Inputs

| Argument | Description |
|----------|-------------|
| `<target>` | Target (fixed) volume |
| `<source>` | Source (moving) volume |
| `<output>` | Output registered volume or transform |

## Outputs

- Registered source volume and/or transform file (LTA).

## Mathematical Foundations

The registration minimises a cost function over the linear transform $A$ (affine matrix):

**Likelihood:** $\mathcal{L}(A) = \sum_{i \in \text{target voxels}} \left(T_i - S(A^{-1}\mathbf{x}_i)\right)^2$

**Gradient match:** $\mathcal{G}(A) = \sum_i \nabla T_i \cdot \nabla S(A^{-1}\mathbf{x}_i)$

**Trimmed likelihood** (robust): same as likelihood but discarding outlier voxel pairs.

The global search covers rotations up to `MAX_ANGLE` (default 25°) and translations up to `MAX_TRANS` (default 30 mm), with scale changes up to `MAX_SCALE` (default 0.5, i.e., $\pm 50\%$).

Refinement uses `powell_minimize()` or `powell_minimize_rigid()` for rigid-body constrained optimisation.

## Configuration Options

Positional usage: `mri_linear_align [options] <target> <source> <output_xform>`

All option flags use a single `-` prefix and are case-insensitive.

### Positional arguments

| Position | Description |
|----------|-------------|
| 1 | Target (fixed) volume |
| 2 | Source (moving) volume |
| 3 | Output transform file (LTA or registered volume if `-apply 1`) |

### Search bounds

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-max_angle <deg>` | float | 25.0 | Maximum rotation range for global search (degrees, converted to radians internally) |
| `-trans <mm>` | float | 30.0 | Maximum translation range for initial coarse translation search (mm) |
| `-max_scale <f>` | float | 0.5 | Maximum scale change as a fraction; search covers scales in [1−f, 1+f] |

### Cost function

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-gradient` | (none) | off | Use gradient-match criterion instead of the default intensity likelihood |
| `-distance <d>` | float | 30.0 (derived from `MAX_TRANS`) | Expansion border in mm per outer optimisation cycle |

### Label-based registration

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-find_label <label> <x> <y> <z>` | int + 3 floats | off | Restrict registration to voxels of `label` near RAS coordinate `(x, y, z)` |

### Transform application and output

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-apply <0\|1>` | int | 1 | If 1, apply the transform and write the registered source volume; if 0, compute the transform only |
| `-skip <n>` | int | (default from code) | Skip every `n`-th voxel in the source voxel list during cost evaluation (reduces memory and time) |

### Rigid constraint

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-R` | (none) | off | Constrain the transform to be rigid (6 DOF) instead of affine (9 DOF); activates `powell_minimize_rigid()` |

### Diagnostics

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-W <n>` | int | 0 | Write snapshot volumes every `n` iterations (enables `DIAG_WRITE`) |
| `-debug_voxel <x> <y> <z>` | 3 ints | off | Enable per-voxel debugging output for the specified voxel (sets `Gx`, `Gy`, `Gz`) |
| `-view <x> <y> <z>` | 3 ints | off | Set a "viewing" voxel for diagnostic display (sets `Gsx`, `Gsy`, `Gsz`); distinct from `-debug_voxel` |

## Configuration Interactions

- `-apply 0` skips writing a registered output volume; the transform itself is always computed.
- `-gradient` switches the inner `pf_likelihood` function pointer from `compute_likelihood` to `compute_gradient_match`; these cannot be combined.
- `-R` enables `parms.rigid = 1` which selects `powell_minimize_rigid()` instead of `powell_minimize()` in the refinement phase; the global search uses a smaller search scale (0.25 instead of 1.0).
- `-find_label` restricts the voxel list used for cost computation to a specific anatomical label; the label and approximate RAS location must both be supplied.

## Typical Use Cases

```bash
# Align source to target, save registered source
mri_linear_align target.mgz source.mgz aligned_source.mgz

# Compute transform only
mri_linear_align target.mgz source.mgz output.lta -no_apply
```

## Pipeline Context

Not a standard `recon-all` stage. Part of the high-resolution registration toolkit. Typically used as an initialisation step before non-linear alignment with `mri_nl_align`.

## Gotchas and Caveats

- Memory requirements depend on the voxel list size; for high-resolution inputs, the global search can be slow.
- The MAX_ANGLE and MAX_TRANS bounds must be set appropriately for the expected misalignment.
- The tool operates on intensity information directly, without atlas guidance.

## Related Tools

- [[mri_nl_align]] — non-linear alignment (uses linear alignment as initialisation)
- [[mri_linear_align_binary]] — binary volume variant of this tool
- [[mri_linear_register]] — older linear registration tool

## Confidence and Gaps

**High confidence:** Full `get_option()` function read from source; all flags, argument counts, and defaults confirmed. Source file is `mri_hires_register/mri_linear_align.cpp` (not `mri_linear_align/mri_linear_align.cpp`).

**Medium confidence:** Default for `-skip` was not given an explicit initialiser in the global variable declarations read; the value shown in the source header defaults to the `MORPH_PARMS` struct default.
