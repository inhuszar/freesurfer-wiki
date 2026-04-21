---
title: "mri_remove_neck"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_remove_neck/mri_remove_neck.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mri_synthstrip]]"
  - "[[recon-all]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - skull-stripping
  - preprocessing
  - neck
  - gca
---

# mri_remove_neck

## Summary

`mri_remove_neck` removes non-brain tissue inferior to the brain (neck, lower skull base, cervical spine) from a T1-weighted MRI volume using a GCA atlas and a spatial transform. Voxels identified as non-brain by the atlas are zeroed out (or filled with a configurable fill value). This is a preprocessing step that can improve subsequent skull stripping and segmentation by eliminating inferior structures that confuse the watershed or atlas-based algorithms.

## Source Information

- **Language:** C++
- **Source file:** `mri_remove_neck/mri_remove_neck.cpp`
- **Original author:** Bruce Fischl
- **Key includes:** `gca.h`, `mri.h`, `mrimorph.h`, `mrinorm.h`, `cma.h`
- **Key function:** `MRIremoveNonBrain(mri_src, mri_dst, transform, gca, radius, fill_val)`

## Purpose and Context

Full-head MRI scans include the neck, lower jaw, and cervical spine which are not needed for brain analysis. These structures can interfere with atlas-based registration, skull stripping, and intensity normalization by introducing large intensity variations and spatial extent outside the expected brain volume. `mri_remove_neck` uses a GCA atlas and a Talairach transform to identify brain-inferior regions and replace them with zeros.

The tool requires four positional arguments (in order): input volume, transform file, GCA file, and output path. The GCA defines the brain extent, and the transform maps the subject to atlas space.

> [!assumption] Input data assumption
> Expects a T1-weighted volume with an initial Talairach transform already computed. The GCA must be the same atlas used for the Talairach registration.

## Inputs

Positional arguments (in order from `main()`):

| Position | Variable | Description |
|----------|----------|-------------|
| 1 | `in_fname` | Full-head T1-weighted input volume |
| 2 | `transform_fname` | Talairach or LTA transform file to atlas space |
| 3 | `gca_fname` | GCA atlas file (`.gca`) defining brain extent |
| 4 | `out_fname` | Output volume path (neck-removed result) |

**Usage:** `mri_remove_neck [options] <in_vol> <transform> <gca> <out_vol>`

## Outputs

- **Neck-removed volume:** Same geometry as input, with inferior non-brain voxels set to `fill_val` (default: 0)

## Mathematical Foundations

The algorithm uses the GCA atlas combined with the spatial transform to:
1. Map each subject voxel to atlas space
2. Identify voxels that are at or inferior to the brain's inferior boundary in atlas space (using the `radius` parameter as a margin)
3. Zero out those voxels in the output volume

The `fill_brain_volume()` function creates a binary mask from the GCA, and `MRIremoveNonBrain()` applies the mask with the given fill value.

## Configuration Options

All flags are case-insensitive (parsed via `stricmp` after uppercasing the option with `StrUpper`). The full `get_option()` has been read.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--help` / `--usage` | — | — | Print help and exit |
| `-FILL <n>` | int | 0 | Value to write to removed (non-brain) voxels; sets `fill_val` |
| `-RADIUS <n>` | int | 25 | Distance in mm beyond the GCA-estimated brain inferior boundary that is also removed; larger values are more aggressive; sets `radius` |
| `-TR <f>` | float | 0.0 | Repetition time in ms for FLASH sequence GCA mapping; sets `TR` |
| `-TE <f>` | float | 0.0 | Echo time in ms for FLASH sequence GCA mapping; sets `TE` |
| `-ALPHA <f>` | float (degrees) | 0.0 | Flip angle in degrees for FLASH sequence GCA mapping; stored internally as radians (`RADIANS(f)`); sets `alpha` |
| `-V <n>` | int | — | Set global diagnostic number `Gdiag_no` for per-voxel debugging |
| `-?` / `-H` / `-U` | — | — | Print usage and exit |

## Configuration Interactions

- `-TR`, `-TE`, `-ALPHA` are only relevant when the GCA was trained on FLASH (multi-echo, multi-flip-angle) data. For standard MPRAGE-trained GCAs these flags have no effect on the neck removal logic.
- `-RADIUS` controls the margin below the brain's inferred inferior boundary. The default of 25 mm is appropriate for most adult brains; values that are too large may erroneously erase inferior brain structures (brainstem, cerebellum).

## Typical Use Cases

```bash
# Remove neck from a full-head T1 using GCA and Talairach transform
# Order: <in_vol> <transform> <gca> <out_vol>
mri_remove_neck \
  rawavg.mgz \
  transforms/talairach.lta \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  rawavg_no_neck.mgz

# More aggressive removal (40 mm below brain inferior boundary)
mri_remove_neck -RADIUS 40 \
  rawavg.mgz \
  transforms/talairach.lta \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  rawavg_no_neck.mgz
```

## Pipeline Context

`mri_remove_neck` is not a standard step in the default [[recon-all]] pipeline. It may be called as a preprocessing step in specialized workflows where the field of view includes significant neck tissue that interferes with subsequent processing. In the standard pipeline, [[mri_watershed]] and [[mri_synthstrip]] handle skull stripping without explicit neck removal.

## Gotchas and Caveats

> [!gotcha] Requires Talairach transform
> The tool requires an initial Talairach transform to map the subject to atlas space. This means a prior registration step must have been run (e.g., `mri_em_register`).

> [!gotcha] Fill value affects downstream processing
> The default fill value of 0 replaces neck voxels with background. Some pipelines may expect brain tissue values in those voxels. Verify that the fill value is compatible with downstream tools.

> [!gotcha] Aggressive removal can clip inferior brain
> If `-radius` is too large, inferior brain structures (brainstem, cerebellum) may be erroneously removed. The default of 25 mm should be appropriate for most adult brains.

## Related Tools

- [[mri_watershed]] — Skull stripping algorithm (often used instead)
- [[mri_synthstrip]] — Deep learning skull stripping (modern alternative)
- [[recon-all]] — Master pipeline

## Confidence and Gaps

**High confidence:** All flags confirmed from complete reading of `get_option()` in source. Positional argument order corrected (4 args, not 5): `<in_vol> <transform> <gca> <out_vol>`. Default `fill_val=0`, default `radius=25`, flag case insensitivity (StrUpper applied), and FLASH parameter storage in radians all verified from source.

**Medium confidence:** Exact GCA-based brain boundary detection algorithm (in `fill_brain_volume()`) not fully traced.
