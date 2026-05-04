---
title: "mri_rigid_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_rigid_register/mri_rigid_register.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_robust_register]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Whether this is actively used in any pipeline"
tags:
  - registration
  - rigid
  - legacy
---

# mri_rigid_register

## Summary

`mri_rigid_register` performs 6-DOF rigid-body registration between two MRI volumes, producing a linear transform (LTA) file. It is an older tool with known directional asymmetry bugs (documented in source code comments) and is largely superseded by [[mri_robust_register]]. The source code itself contains extensive developer commentary noting that registration direction can produce "completely different results" and advising use of one direction only.

## Source Information

- **Language:** C++
- **Source file:** `mri_rigid_register/mri_rigid_register.cpp`
- **Key includes:** `mrimorph.h`, `mri_conform.h`, `transform.h`, `matrix.h`
- **Key function:** `estimate_rigid_regmatrix()` (reverted to oldest copy due to bugs)

> [!gotcha] Known asymmetric registration bug
> The source code contains extensive developer comments (attributed to `ebeth@nmr.mgh.harvard.edu`) noting that the registration results depend on the order of source and target volumes and can produce "completely different results". The code was reverted to the oldest available implementation, and the bug was not resolved. The developer notes "folks seem to prefer to register flash to mprage than vice versa." For reliable registration, use [[mri_robust_register]] instead.

## Purpose and Context

`mri_rigid_register` estimates a 6-DOF rigid-body (3 translation + 3 rotation) transform between a source and target volume. It was designed for FLASH-to-MPRAGE registration but can be used for any two volumes. The transform is output as an LTA file.

The algorithm optimizes a cost function over rigid transform parameters, starting from an initial alignment based on volume centers.

## Inputs

- **Source volume:** MRI volume to be aligned
- **Target volume:** Reference MRI volume
- **Output LTA:** Path for the output linear transform

## Outputs

- **LTA file:** 4x4 rigid registration matrix in FreeSurfer LTA format

## Mathematical Foundations

The rigid registration estimates a transform:

$$
T = \begin{pmatrix} R & \mathbf{t} \\ \mathbf{0} & 1 \end{pmatrix}
$$

where $R \in SO(3)$ is a rotation matrix (3 DOF) and $\mathbf{t} \in \mathbb{R}^3$ is a translation (3 DOF).

The `MRR_VoxelXformToCoronalRasXform()` function converts the estimated voxel-space transform to a coronal RAS transform for storage in the LTA.

> [!gap] Full algorithm description
> The specific optimization algorithm (gradient descent, Powell's method, or other) is not documented in the source header. The source has multiple `#if 0` blocks with different implementations, and the final version in use is the "oldest copy."

## Configuration Options

Positional usage: `mri_rigid_register [options] <src_volume> <target_volume> <output.lta>`

All option flags use a single `-` prefix and are case-insensitive. The flag parser uses `ISOPTION(*argv[1])` so flags must precede positional arguments.

### Interpolation

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-sinc <hw>` | int | on (hw=3) | Use sinc interpolation with half-window of `hw` voxels |
| `-trilinear` | (none) | off | Switch to trilinear interpolation instead of sinc |

### Registration behaviour

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-scale` | (none) | off (`noscale=1`) | Also compute an intensity scaling factor during registration |
| `-noskull` | (none) | off | Assume skull-stripped images: exclude zero-valued voxels from the fine alignment cost |
| `-tol <val>` | float | 1e-10 | Optimiser convergence tolerance |
| `-window` | (none) | off | Apply a Hanning window to both volumes before registration |
| `-B1 <fname>` | path | none | Load a B1-field map to weight the registration cost |
| `-T <thresh>` | float | 25.0 | Ignore voxel locations where all input images are below this intensity threshold |

### Output and diagnostics

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-write <n>` | int | 0 | Write diagnostic snapshot volumes every `n` iterations |
| `-W <in_vol> <out_fname>` | 2 paths | none | Transform an additional volume (`in_vol`) using the computed registration and write to `out_fname`; can be repeated up to 10,000 times |
| `-A` | (none) | off | Apply the transform and write the registered source volume as an output |
| `-V` | (none) | off | Write the output LTA as a voxel-to-voxel transform (LINEAR_VOXEL_TO_VOXEL); see caveat below |
| `-R <fname>` | path | none | Write a residual image to `fname` |
| `-F` | (none) | off | Do not exit if an output write-file path does not exist (emulates `mri_transform` tolerance) |
| `-N <n>` | int | 10 | Set number of estimation iterations (`niter`); **not actually used** in the current implementation |

## Configuration Interactions

- `-sinc` and `-trilinear` are mutually exclusive; `-trilinear` sets `sinc_flag = 0`, overriding the default sinc.
- `-V` writes a `LINEAR_VOXEL_TO_VOXEL` transform; the source code comment warns that `mri_transform` may not handle this type well and advises the default coronal-RAS-to-coronal-RAS instead.
- `-N <n>` sets the `niter` variable but the source comment marks it as "not used" in the current implementation path.
- `-window` applies a Hanning window centred on the volume before computing the cost; intended to reduce edge artefacts.
- `-B1 <fname>` weights the cost function by the B1 map, useful for registering multi-echo or transmit-field-affected images.

> [!gotcha] Dead code: `-N <n>`
> The `-N` flag parses `niter` but the variable is explicitly marked "// not used" in the source. Passing `-N` has no effect on the number of optimisation iterations.

## Typical Use Cases

```bash
# Register FLASH to MPRAGE (preferred direction per source code comments)
mri_rigid_register flash.mgz mprage.mgz flash_to_mprage.lta
```

> [!gotcha] Use mri_robust_register instead
> For new workflows, [[mri_robust_register]] is strongly preferred. It uses robust statistics to handle outliers and is not affected by the directional asymmetry bug present in this tool.

## Pipeline Context

`mri_rigid_register` is not called by [[wiki/pipelines/recon-all|recon-all]]. It is a legacy tool; [[mri_robust_register]] is the current standard for linear registration within FreeSurfer.

## Gotchas and Caveats

> [!gotcha] Asymmetric results
> Registering A→B gives different results from B→A. This is a fundamental bug in the implementation, documented by the original developer. Always register in the same direction (source=FLASH, target=MPRAGE is the recommended direction per the source comments).

> [!gotcha] Legacy tool with known bugs
> The source code comments indicate this tool has unresolved issues. Use [[mri_robust_register]] for reliable registration.

## Related Tools

- [[mri_robust_register]] — Robust registration (preferred replacement)
- [[mri_em_register]] — EM-based atlas registration
- [[coordinate-systems]] — Coordinate system reference

## Confidence and Gaps

**High confidence:** Full `get_option()` function read; all flags confirmed from source. The asymmetric registration bug is directly documented in source code comments by the original developer.

**Low confidence:** The actual optimisation algorithm in `estimate_rigid_regmatrix()` (the "oldest copy") was not read in detail.

> [!gap] Algorithm details
> The optimisation algorithm used in `estimate_rigid_regmatrix()` (the "oldest copy" implementation) is not described in the source comments and was not read in full.
