---
title: "mris_warp"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_warp/mris_warp.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_transform]]"
  - "[[mri_synthmorph]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Deformation surface overlay format details not documented."
  - "Quality check metrics computed by mris_warp__check_deformation not read."
tags:
  - surface
  - warp
  - deformation
  - displacement-field
---

# mris_warp

## Summary

`mris_warp` applies a displacement (deformation) field to warp a surface. The displacement field can be specified as a volume (M3Z morph file) or as a surface overlay (MGZ or NIfTI). After applying the warp, it checks the quality of the output surface for degenerate geometry (e.g., inverted triangles, excessive distortion).

## Source Information

- **Language:** C++
- **Source file:** `mris_warp/mris_warp.cpp`
- **Original author:** Jonathan Polimeni (MGH)
- **Key libraries:** `gcamorph`, `registerio`, `resample`

## Purpose and Context

`mris_warp` is used when you need to deform a cortical surface using a pre-computed displacement field. This is distinct from spherical registration (which operates in a 2D registration space); `mris_warp` applies 3D Euclidean displacements directly to vertex positions in the surface's coordinate space.

Typical use cases include:
- Applying fMRI B0 distortion correction fields to surfaces
- Warping surfaces to match a deformed or distorted anatomy
- Creating intermediate surfaces by fractional warping

## Inputs

`mris_warp` does not take positional arguments. All inputs are specified via `--` flags. The registration file (`--reg`) is **required**.

| Flag | Default | Description |
|------|---------|-------------|
| `--surf <file>` | `white` | Surface file path to warp. |
| `--hemi <lh\|rh>` | — | Hemisphere (used for internal bookkeeping; extracted from the registration file subject). |
| `--deformvol <file>` | `deform_vol_abs.nii.gz` | Volume displacement field (currently the only active code path; see gotcha below). |
| `--deformsurf <file>` | `deform_surf_abs.mgz` | Surface overlay displacement field (parsed but implementation may be incomplete — see TODO comments in source). |
| `--m3z <file>` | `deform_vol_rel.m3z` | M3Z morph displacement field (parsed but the M3Z code path is commented out in the current source). |
| `--reg <file>` | `register.dat` | Registration file mapping surface tkRAS to the deformation field's coordinate space (required). |
| `--out <file>` | `white.warp` | Output warped surface file path. |

## Outputs

| Output | Description |
|---|---|
| Warped surface | Written to the path specified by `--out` (default: `white.warp`). |
| Intersection count | Number of self-intersecting faces printed to stdout for both input and warped surfaces. |

## Mathematical Foundations

For each vertex $v_i$ with coordinates $(x, y, z)$:
1. Look up the displacement $(\Delta x, \Delta y, \Delta z)$ at the corresponding position in the deformation field.
2. Apply: $v_i' = (x + \Delta x, y + \Delta y, z + \Delta z)$.

The deformation field is sampled using the `--reg` registration file to transform vertex coordinates into the deformation field's space.

> [!math] Absolute vs relative displacement
> - Volume/surface overlays (`--deformvol`, `--deformsurf`): absolute RAS displacements
> - M3Z files (`--m3z`): relative displacements (field stores the new position minus old position, using M3Z conventions)

After warping, a quality check function `mris_warp__check_deformation()` evaluates the surface for geometric artifacts.

## Configuration Options

### Complete Flag Reference

All flags use double-dash prefix; names are case-insensitive (parsed with `strcasecmp`).

| Flag | Argument type | Default | Description |
|------|--------------|---------|-------------|
| `--surf <file>` | string | `white` | Path to the surface file to warp (`surf_filename`). Cannot be `inflated` — tool will abort. |
| `--hemi <lh\|rh>` | string | — | Hemisphere name; used internally with the registration file (`hemi`). |
| `--deformvol <file>` | string | `deform_vol_abs.nii.gz` | Volume displacement field file (`deformvol_filename`). This is the active code path. |
| `--deformsurf <file>` | string | `deform_surf_abs.mgz` | Surface overlay displacement field file (`deformsurf_filename`). Parsed but code path may be incomplete. |
| `--m3z <file>` | string | `deform_vol_rel.m3z` | M3Z morph file (`m3z_filename`). Parsed but the M3Z code path is commented out in the source. |
| `--reg <file>` | string | `register.dat` | Registration file (read by `regio_read_register`); maps surface coordinates to the volume warp space. Required. |
| `--out <file>` | string | `white.warp` | Output warped surface file (`warpsurf_filename`). |
| `--abs` | boolean | false (`FLAG__abs=0`) | Interpret displacement field as absolute RAS positions rather than offsets. |
| `--rel` | boolean | true (`FLAG__abs=0`) | Interpret displacement field as relative (offset) displacements. This is the default. |
| `--debug` | boolean | false | Enable debug output (`debug=1`). |
| `--regheader` | boolean | — | Use registration from volume header instead of a `.dat` file. Currently unsupported — exits immediately with an error. |
| `--help` | boolean | — | Print help text and exit. |
| `--version` | boolean | — | Print version string and exit. |

> [!gotcha] --s flag does not exist
> The wiki previously listed `--s` as a flag for the source subject. This flag does **not** exist in the source code. The subject is identified implicitly through the `--reg` registration file, which embeds the subject name via `regio_read_register()`.

> [!gotcha] --so flag does not exist
> The flag `--so` does not appear anywhere in the `mris_warp` source code. Use `--out` to specify the output warped surface file path.

> [!gotcha] M3Z code path is disabled
> The `--m3z` flag is parsed and sets `m3z_filename`, but the actual GCAMread/apply code is commented out with `// NOTE: mri_convert expects M3Z files ...`. In the current source, only `--deformvol` (volume warp) is functional.

> [!gotcha] `--warpsurf` renamed to `--out`
> The output flag is `--out`, not --warpsurf. Earlier documentation was incorrect.

## Typical Use Cases

**1. Warp white surface using a volume displacement field:**
```bash
mris_warp --hemi lh --surf lh.white \
  --deformvol B0_correction.nii.gz --reg register.dat \
  --out lh.white.unwarped
```

**2. Warp using relative displacement (--rel is default):**
```bash
mris_warp --hemi lh --surf lh.white \
  --deformvol deform_field.nii.gz --reg register.dat \
  --rel --out lh.white.morphed
```

## Pipeline Context

Not part of standard `recon-all`. Used in specialized workflows such as distortion correction for fMRI or diffusion MRI studies where surfaces need to match a distorted EPI space.

## Gotchas and Caveats

> [!gotcha] Coordinate space confusion
> The displacement field must be in the same coordinate space as the surface (tkRAS). The `--reg` file handles the mapping from surface coordinates to the displacement field's coordinate system. Mismatch will produce silently wrong results.

> [!gotcha] Quality check limitations
> The internal quality check detects degenerate geometry but does not prevent writing a degenerate output surface.

## Related Tools

- [[mri_transform]] — applies LTA/GCAM transforms to volumes
- [[mri_synthmorph]] — learning-based registration producing displacement fields

## Confidence and Gaps

Confidence is **high** for the complete flag list (derived from full reading of `parse_commandline()` in `mris_warp.cpp`) and the active code path (volume warp only). The M3Z code path and surface overlay path are known to be either commented out or incomplete from the source code review.
