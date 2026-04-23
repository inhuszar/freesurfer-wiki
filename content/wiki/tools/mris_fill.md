---
title: "mris_fill"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_fill/mris_fill.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact algorithm used by MRISfillInterior() needs documentation in an internals page."
tags:
  - surface
  - volume
  - fill
  - binary-mask
  - utility
---

# mris_fill

## Summary

`mris_fill` fills the interior of a closed FreeSurfer surface mesh with a binary label in a volumetric image, producing a binary mask volume. The output resolution can be specified by the user; by default it is 0.25 mm isotropic. A template volume can optionally be provided to define the output geometry. The tool is useful for converting surface-defined regions (e.g., cortical ribbon boundaries) into volumetric masks.

## Source Information

- **Language:** C++
- **Primary source:** `mris_fill/mris_fill.cpp`
- **Original author:** Bruce Fischl
- **Key internal function:** `MRISfillInterior()` (in `mrisurf` library)

## Purpose and Context

Many FreeSurfer analyses operate in surface space, but some downstream tools require volumetric representations. `mris_fill` rasterises the interior of a surface at arbitrary resolution, producing a binary volume mask. This is analogous to voxelising a 3D mesh.

Common use cases include:
- Converting the white or pial surface into a volumetric ribbon for region-of-interest masking.
- Generating high-resolution binary masks for partial volume estimation.
- Creating test volumes for surface reconstruction pipelines.

## Inputs

| Argument | Description |
|----------|-------------|
| `<input surface>` (positional 1) | Input FreeSurfer binary surface file. Must be a closed, orientable manifold. |

## Outputs

| Argument | Description |
|----------|-------------|
| `<output volume>` (positional 2) | Binary MGZ volume with 1 inside the surface and 0 outside. |

## Mathematical Foundations

The interior fill uses a ray-casting or inside-outside test on the triangulated surface:

$$
\text{voxel}(i,j,k) = \begin{cases} 1 & \text{if point } p_{ijk} \text{ is inside } \mathcal{S} \\ 0 & \text{otherwise} \end{cases}
$$

The surface is sampled at the specified resolution (`-r`) or at the resolution of the template volume (`-t`). The `MRISfillInterior()` function handles the inside-outside determination.

If `-c` is used, the output is resampled to a 256³ 1 mm isotropic LIA volume, matching the standard FreeSurfer conformed space.

When a template volume is provided with `-t`, the output geometry (voxel size, dimensions, orientation) is copied from the template, and the surface is filled at that template's resolution.

## Configuration Options

The parser strips one leading dash (`option = argv[1] + 1`) and dispatches on the first character (case-insensitive).

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-r <val>` | float | 0.25 | Output voxel resolution in mm (isotropic). Passed directly to `MRISfillInterior`. |
| `-c` | — | off | Conform the output to a 256³ 1 mm isotropic LIA volume (overrides `-r`). |
| `-t <template.mgz>` | path | — | Use this volume's geometry as the output template (overrides `-r`). |
| `-s <factor>` | integer | 1 | Upsample the template by this integer factor before filling (used with `-t`). |

## Configuration Interactions

- `-c` takes precedence over `-r` and produces a standard FreeSurfer conformed 256³ volume.
- `-t` and `-s` together allow filling at a finer grid than the template: the template is upsampled by `factor` before rasterisation.
- Without any resolution flags, the default resolution is 0.25 mm isotropic — much finer than the standard 1 mm processing resolution. This produces large output volumes.

> [!gotcha] Default resolution produces large files
> The default 0.25 mm resolution produces a volume of approximately $1024^3$ voxels, which is ~1 GB for a full brain. Specify `-t brain.mgz` to match the standard resolution if fine detail is not needed.

## Typical Use Cases

### Fill white surface at standard resolution

```bash
mris_fill -t $SUBJECTS_DIR/subject01/mri/brain.mgz \
  $SUBJECTS_DIR/subject01/surf/lh.white \
  $SUBJECTS_DIR/subject01/mri/lh.white.fill.mgz
```

### Fill pial surface at high resolution

```bash
mris_fill -r 0.5 \
  $SUBJECTS_DIR/subject01/surf/lh.pial \
  $SUBJECTS_DIR/subject01/mri/lh.pial.highres.fill.mgz
```

### Fill surface to conformed space

```bash
mris_fill -c \
  $SUBJECTS_DIR/subject01/surf/lh.white \
  $SUBJECTS_DIR/subject01/mri/lh.white.conformed.fill.mgz
```

## Pipeline Context

`mris_fill` is not called by `recon-all` directly. It is a utility tool for converting surfaces to volumetric masks. Related volumetric operations in the pipeline (such as the cortical ribbon mask) are performed by other tools (`mri_aparc2aseg`).

## Gotchas and Caveats

> [!gotcha] Surface must be closed and orientable
> `MRISfillInterior()` requires a topologically correct, closed manifold surface. If the surface has holes or self-intersections, the interior determination is undefined and the output may be incorrect. Run `mris_fix_topology` before using `mris_fill` if the surface has known defects.

> [!gotcha] Output volume geometry when no template is provided
> When neither `-conform` nor `-vol` is specified, the output volume geometry is derived from the surface's own volume geometry header. If the surface has no embedded geometry (rare but possible), a default 256³ geometry is added with a warning.

> [!gotcha] Binary output only
> The output is a binary 0/1 volume (using `MRI_UCHAR` type). No distance maps or probability values are produced. For distance-to-surface maps, use other tools.

## Related Tools

- [[mris_make_surfaces]] — produces the surfaces that this tool fills
- [[surface-format]] — FreeSurfer surface file format
- [[mgz]] — output volume format

## Confidence and Gaps

Confidence is **high**. The source file is relatively compact and was read in full, confirming the command-line interface, the three resolution modes, and the central call to `MRISfillInterior()`.

> [!gap] MRISfillInterior() algorithm
> The exact inside-outside determination algorithm used by `MRISfillInterior()` (ray casting, winding number, or other) is in `mrisurf.cpp` and has not been documented in the wiki. An internals page for this function would be valuable.
