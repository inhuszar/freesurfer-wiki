---
title: "mris_rotate"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_rotate/mris_rotate.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_reverse]]"
  - "[[mris_transform]]"
  - "[[mris_rescale]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - rotation
  - transform
  - coordinates
---

# mris_rotate

## Summary

`mris_rotate` applies a 3D rotation to a cortical surface by rotating all vertex positions through specified Euler angles (alpha, beta, gamma in degrees) about the X, Y, and Z axes respectively. Alternatively, when a registration file (`.reg` or LTA) is provided, it extracts only the rotational component from the transform matrix and applies that rotation. The tool writes the rotated surface in FreeSurfer binary format.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_rotate/mris_rotate.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_rotate`

## Purpose and Context

Surface rotation is needed in several contexts:

1. **Bilateral registration:** Rotating a spherical surface to correct for rotational misalignment between subjects.
2. **Coordinate frame alignment:** Aligning a surface to a particular orientation before registration.
3. **Registration-based rotation:** Extracting and applying only the rotational component of a registration (e.g., `tkregister2` `.dat` file), stripping translation.

The tool uses `MRISrotate()` for Euler angle rotation and `LTAmat2RotMat()` to extract the rotational component from an LTA/registration file.

## Inputs

### Required Inputs

(Positional arguments: `<input surface> <alpha> <beta> <gamma> <output surface>`)

- **`<input surface>`** — FreeSurfer binary surface file.
- **`<alpha>`** — rotation about X axis (degrees).
- **`<beta>`** — rotation about Y axis (degrees).
- **`<gamma>`** — rotation about Z axis (degrees).
- **`<output surface>`** — destination for the rotated surface.

Note: when `--reg` is specified, the alpha/beta/gamma values are still required positional arguments but are ignored (they are replaced by the rotational component of the registration matrix).

### Optional Inputs

- **`--reg <regfile>`** — registration file (`.dat` tkregister format or LTA). When provided, the rotational component is extracted from this file and applied instead of the Euler angles.

### Input Assumptions

> [!assumption] Rotation is about the origin
> Rotations are applied about the coordinate origin (0, 0, 0). For surfaces not centred at the origin, this will combine rotation with an effective translation.

## Outputs

### Files Created

- **Rotated surface** — output in FreeSurfer binary surface format (see [[surface-format]]). Volume geometry information is preserved from the input surface.

## Mathematical Foundations

**Euler angle rotation:** The rotation is composed of three sequential rotations about the X, Y, and Z axes:
$$R = R_z(\gamma) \cdot R_y(\beta) \cdot R_x(\alpha)$$
where each $R_i(\theta)$ is the standard rotation matrix for angle $\theta$ about axis $i$. Applied to each vertex:
$$(x', y', z')^T = R \cdot (x, y, z)^T$$

**Registration-based rotation:** When `--reg` is specified:
1. The LTA is read and converted to `REGISTER_DAT` (tkregister) type via `LTAchangeType()`.
2. `LTAmat2RotMat()` extracts the rotational component $R$ by performing polar decomposition (or equivalent) on the linear part of the transform, discarding translation and scale.
3. `MRISrotate()` is called with the extracted rotation matrix.

The source note indicates that `MRIScenter()` (centering the surface before rotation) is commented out with a note that it may not be needed for sphere surfaces.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--reg <regfile>` | string | — | Registration file (`.dat` or `.lta`). When specified, the rotational component of the transform is extracted and applied instead of the Euler angles. |
| `--no-volgeom` | boolean | — | (Inferred from `VolGeomValid` variable.) Disables volume geometry updating. |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

> [!gap] `VolGeomValid` flag syntax
> The source declares `VolGeomValid = 1` and `regfile = NULL`. The exact command-line flag that sets `VolGeomValid = 0` was not read from `get_option()` in full.

### Configuration Interactions

- When `--reg` is specified, the Euler angle positional arguments (`alpha`, `beta`, `gamma`) must still be provided but are completely ignored.
- When the LTA type is not `REGISTER_DAT`, it is automatically converted before extraction of rotational component.

> [!gotcha] Positional angles required even with --reg
> The command-line parser still expects 5 positional arguments (`input alpha beta gamma output`) even when `--reg` is provided. Placeholder values (e.g., `0 0 0`) must be supplied.

## Typical Use Cases

### Use Case 1: Rotate sphere by explicit Euler angles

```bash
mris_rotate lh.sphere 0 0 45 lh.sphere.rotated
```

Rotates the sphere 45 degrees about the Z axis.

### Use Case 2: Apply rotational component from a registration

```bash
mris_rotate --reg talairach.lta lh.sphere 0 0 0 lh.sphere.reg_rotated
```

Extracts the rotation from `talairach.lta` and applies it to the sphere surface.

## Pipeline Context

`mris_rotate` is not called by standard `recon-all`. It is used in custom registration and alignment pipelines.

## Gotchas and Caveats

> [!gotcha] Rotation about the origin
> If the surface is not centred at (0, 0, 0), the rotation will not be a pure rotation about the surface centroid. For sphere surfaces with radius 100 mm centred at the origin, this is correct behaviour.

## Related Tools

- [[mris_reverse]] — reflects (mirrors) rather than rotates a surface
- [[mris_transform]] — applies full linear/nonlinear transforms (including translation and scale)
- [[mris_rescale]] — scales the surface radius

## Confidence and Gaps

Confidence is **high**. The main logic is clearly read from source. The flag for `VolGeomValid` is the only minor gap.

> [!gap] VolGeomValid flag syntax
> The exact command-line flag(s) that control `VolGeomValid` should be verified from `get_option()` or `--help`.
