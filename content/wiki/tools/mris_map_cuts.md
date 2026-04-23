---
title: "mris_map_cuts"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_map_cuts/mris_map_cuts.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_sphere]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The MRISmapCuts() function logic needs documentation."
  - "Whether the output patch is used by any standard pipeline tool needs confirmation."
tags:
  - surface
  - patch
  - cuts
  - flattening
  - utility
---

# mris_map_cuts

## Summary

`mris_map_cuts` maps cutting planes (patch boundaries) from one surface representation to another. Given an input patch file (which defines which vertices are "ripped" / excluded from a flattening operation on one surface), it propagates those cuts to the corresponding positions on a second surface using the shared spherical registration (`sphere.reg`). The output is a new patch file valid for the second surface.

## Source Information

- **Language:** C++
- **Primary source:** `mris_map_cuts/mris_map_cuts.cpp`
- **Original author:** Bruce Fischl
- **Key function:** `MRISmapCuts()` (defined in the same file)

## Purpose and Context

Cortical flattening requires cutting the surface along specific paths to create a flat patch without too much distortion. These cuts are typically defined manually or algorithmically on one surface representation (e.g., the inflated surface) and stored in a patch file. When the same cuts need to be applied to a different registration of the same surface (e.g., after re-running registration, or for a different surface type like the original white surface), the cutting boundaries must be re-mapped.

`mris_map_cuts` performs this re-mapping: it reads the input surface with cuts applied (as a patch where ripped vertices are marked), uses the spherical registration (`sphere.reg`) to find the corresponding vertices in the output surface, and writes a new patch for that surface.

## Inputs

| Argument | Description |
|----------|-------------|
| `<in_patch_fname>` (positional 1) | Input patch file (contains the cut/rip information in the context of the input surface). The hemisphere is inferred from the filename (e.g., `lh.patch.flat`). |
| `<out_patch_fname>` (positional 2) | Output patch file path. Hemisphere is inferred from this filename too. |

The tool infers the surface files from the patch filenames:
- Input surface: read from the same directory as `in_patch_fname`, named `<hemi>.sphere.reg` (default `orig_surf_name = "sphere.reg"`).
- Output surface: read from the same directory as `out_patch_fname`, named `<hemi>.sphere.reg`.
- Inflated surfaces: also read as `<hemi>.inflated` from the same paths for `MRISreadVertexPositions`.

## Outputs

| Output | Description |
|--------|-------------|
| `<out_patch_fname>` | Patch file with cuts mapped to the output surface. |

## Mathematical Foundations

The cut mapping transfers ripped vertex status between surfaces by using the canonical vertex positions stored in each surface's spherical registration:

1. Load input surface with spherical registration (`sphere.reg`) → save canonical vertices.
2. Load output surface with spherical registration → save canonical vertices.
3. Load inflated vertex positions onto the output surface.
4. Read the patch from the input surface (marks which vertices are ripped).
5. Call `MRISmapCuts(mris_in, mris_out)`: for each ripped vertex in `mris_in`, find the nearest vertex in `mris_out` by canonical (spherical) coordinates, and mark it as ripped.
6. Optionally dilate the ripped region by `dilate` iterations (`-D <N>`).
7. Write the output patch.

The mapping is a nearest-neighbour transfer in spherical parameter space: vertices that are cut in the input surface are matched to the closest vertex in the output surface based on their position on the shared `sphere.reg` sphere.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-D <N>` | int | 0 | Dilate the ripped region by N iterations after mapping |

The tool also uses the following defaults that can be overridden by modifying the globals (but no command-line flags expose them):
- `orig_surf_name = "sphere.reg"` — surface file used for canonical vertex positions.
- `inf_surf_name = "inflated"` — inflated surface for vertex position loading.

## Configuration Interactions

- `-D <N>` dilates the output rip region, which is useful when the nearest-neighbour mapping produces a slightly narrower cut than desired. Each dilation step expands the ripped region by one vertex layer.

## Typical Use Cases

### Re-map cuts from one registration to another

```bash
mris_map_cuts \
  $SUBJECTS_DIR/subject01/surf/lh.patch.flat \
  $SUBJECTS_DIR/subject01/surf/lh.patch.flat.remapped
```

### Map cuts with dilation

```bash
mris_map_cuts -D 2 \
  $SUBJECTS_DIR/subject01/surf/lh.patch.flat \
  $SUBJECTS_DIR/subject01/surf/lh.patch.flat.dilated
```

## Pipeline Context

`mris_map_cuts` is not part of the standard `recon-all` pipeline. It is used in manual flattening workflows when cut boundaries need to be transferred between surface representations.

## Gotchas and Caveats

> [!gotcha] Hemisphere inferred from filename
> The hemisphere (`lh` or `rh`) is inferred from the input and output patch filenames by looking for a two-character substring before the first `.` in the last path component. If the patch filename does not follow the `<hemi>.<rest>` convention, the hemi inference will default to `lh`. Ensure filenames follow FreeSurfer conventions.

> [!gotcha] Surface files must be in the same directory as the patch
> The tool constructs the surface filename by combining the directory path of the patch file with `<hemi>.sphere.reg`. Both the input and output `sphere.reg` surfaces must be in the same directories as their respective patch files.

> [!gotcha] Nearest-neighbour mapping may introduce minor cuts
> The spherical nearest-neighbour mapping is inexact. Vertices near the cut boundary may be mapped to slightly different positions. Use `-D` to dilate the output cuts if the mapping produces gaps.

## Related Tools

- [[mris_sphere]] — produces the `sphere.reg` surfaces used in the mapping
- [[surface-format]] — FreeSurfer surface and patch file formats

## Confidence and Gaps

Confidence is **high**. The source was read nearly in full; the `main()` function and `get_option()` logic were confirmed. The `-D` flag and the hemisphere-inference logic were verified from the source.

> [!gap] MRISmapCuts() implementation
> The `MRISmapCuts()` function is defined in the same file but was not read. Its nearest-neighbour matching algorithm (KD-tree vs. linear scan vs. hash table) has not been verified.
