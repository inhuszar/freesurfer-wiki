---
title: "mris_transform"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_transform/mris_transform.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_transform]]"
  - "[[mris_apply_reg]]"
  - "[[coordinate-systems]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The 3D morph (GCAM) application path to surfaces — how a volumetric warp field is applied to surface vertices — is not documented in detail."
tags:
  - surface
  - transform
  - LTA
  - warp
  - coordinates
---

# mris_transform

## Summary

`mris_transform` applies a spatial transform (linear LTA or nonlinear 3D morph/GCAM) to the vertex positions of a cortical surface, writing the transformed surface. For linear transforms, it converts the LTA to a voxel-to-voxel matrix and applies it; for nonlinear transforms, it applies the morph field. It also supports an inverse transform mode. When the transform is the identity (`identity.nofile`), it simply copies the surface.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_transform/mris_transform.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_transform`

## Purpose and Context

After computing a registration between a subject and a template (e.g., via `mri_register` or `mri_em_register`), the transform must be applied to surfaces when moving them to the target space. `mris_transform` performs this coordinate-space change on surface geometry, producing a surface in the new coordinate system.

This is distinct from [[mris_apply_reg]] (which is designed for spherical registration resampling) and more analogous to [[mri_transform]] (which does the same for volumes). The typical use is applying a Talairach or MNI registration transform to a pial or white surface.

## Inputs

### Required Inputs

(Positional arguments: `<input_surface> <transform_file> <output_surface>`)

- **`<input_surface>`** — FreeSurfer binary surface file.
- **`<transform_file>`** — transform in any format supported by `TransformRead()`: LTA (`.lta`), morph (`.m3z`/GCAM), or the string `identity.nofile`.
- **`<output_surface>`** — destination for the transformed surface.

### Optional Inputs

- **`--trx-src <volume>`** — source volume geometry for the transform (required if the LTA does not embed valid source geometry).
- **`--trx-dst <volume>`** — destination volume geometry (required if the LTA does not embed valid destination geometry).

### Input Assumptions

> [!assumption] LTA must have valid src/dst geometry for linear transforms
> If the LTA file does not embed valid source or destination volume geometry, the tool requires `--trx-src` and `--trx-dst` to be specified. Without these, the tool exits with an error.

> [!assumption] 3D morph applies to vertex coordinates
> For nonlinear 3D morphs (GCAM), the transform is applied directly to vertex positions in the volume coordinate space.

## Outputs

### Files Created

- **Transformed surface** — written to `<output_surface>` in FreeSurfer binary surface format. Volume geometry info from the destination space is embedded in the output surface.

## Mathematical Foundations

**Linear transform path:**

1. Read LTA via `TransformRead()`.
2. Apply `LTAreduce()` to compose all chained transforms in the LTA array.
3. If source or destination geometry is missing, read from the specified volumes.
4. Convert to `LINEAR_VOX_TO_VOX` type via `LTAchangeType()`, which converts between RAS, vox, and tkRAS representations:
$$
M_{\text{vox2vox}} = M_{\text{dst\_vox2ras}}^{-1} \cdot M_{\text{ras2ras}} \cdot M_{\text{src\_vox2ras}}
$$
5. Apply the vox-to-vox matrix to each surface vertex (first converting from surface RAS to voxel coordinates, then applying the matrix, then converting back).

**Nonlinear (GCAM) path:**

For 3D morphs, the warp field is evaluated at each vertex position, and the vertex is displaced accordingly.

**Inverse mode:** With `--is-inverse`, the inverse of the transform is applied.

See [[coordinate-systems]] for definitions of the coordinate spaces involved.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--is-inverse` / `-i` | boolean | false | Apply the inverse transform. |
| `--trx-src <vol>` / `-s` | string | — | Source volume to supply geometry for the transform. Required if LTA lacks valid source geometry. |
| `--trx-dst <vol>` / `-d` | string | — | Destination volume to supply geometry. Required if LTA lacks valid destination geometry. |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

### Configuration Interactions

- `--trx-src` and `--trx-dst` override the geometry embedded in the LTA file. If the LTA already has valid geometry, these flags are not needed.
- `--is-inverse` works for both linear and (if the morph supports it) nonlinear transforms.
- When `identity.nofile` is the transform, the tool bypasses all transform logic and simply copies the surface.

> [!gotcha] Environment variable USE_AVERAGE305
> If the LTA's destination was average_305 and geometry is not embedded, the source code suggests setting `USE_AVERAGE305` to `true` in the environment as an alternative to providing `--trx-dst`. This is an undocumented workaround.

## Typical Use Cases

### Use Case 1: Apply Talairach transform to white surface

```bash
mris_transform \
  $SUBJECTS_DIR/subject/surf/lh.white \
  $SUBJECTS_DIR/subject/mri/transforms/talairach.lta \
  $SUBJECTS_DIR/subject/surf/lh.white.tal
```

### Use Case 2: Apply nonlinear morph to surface

```bash
mris_transform \
  lh.white \
  $SUBJECTS_DIR/subject/mri/transforms/subject_to_atlas.m3z \
  lh.white.atlas
```

### Use Case 3: Identity (no transform, copy)

```bash
mris_transform lh.white identity.nofile lh.white.copy
```

## Pipeline Context

`mris_transform` is not called in the standard `recon-all` pipeline. It is used in multi-subject analyses requiring surfaces to be brought into a common space (e.g., Talairach, MNI).

## Gotchas and Caveats

> [!gotcha] LTA geometry requirements
> Many LTA files produced by FreeSurfer tools do not embed valid volume geometry. In these cases, `--trx-src` and `--trx-dst` must be specified, or the tool will fail with an error message about invalid geometry.

> [!gotcha] Different from mris_apply_reg
> [[mris_apply_reg]] is designed for spherical registration resampling and operates differently. Use `mris_transform` for affine/nonlinear volumetric transforms and `mris_apply_reg` for spherical registration-based resampling.

## Related Tools

- [[mri_transform]] — analogous tool for MRI volumes (not surfaces)
- [[mris_apply_reg]] — surface resampling via spherical registration
- [[coordinate-systems]] — coordinate system definitions and transform representations

## Confidence and Gaps

Confidence is **high**. The main transform paths (linear, nonlinear, identity) and flag handling are clearly read from the source.

> [!gap] GCAM application to surface vertices
> The specific mechanics of how a GCAM warp field is applied to surface vertex coordinates (which interpolation scheme, which coordinate space) were not fully traced in `MRISapplyTransform()`.

> [!note] Audit noise: single-dash stripping parser
> An automated audit may report `--is-inverse` as C3 invalid. This is a false positive: `get_option()` uses `option = argv[1] + 1` to strip the leading dash, then compares with `!stricmp(option, "-is-inverse")`. Double-dash form `--is-inverse` is correctly accepted.
