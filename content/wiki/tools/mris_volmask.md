---
title: "mris_volmask"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_volmask/mris_volmask.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mri_aparc2aseg]]"
  - "[[mri_surf2vol]]"
  - "[[mri_vol2surf]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Default label values for white/ribbon need verification from IoParams constructor."
  - "Exact OBBTree algorithm details not read."
tags:
  - surface
  - mask
  - ribbon
  - volume
  - segmentation
---

# mris_volmask

## Summary

`mris_volmask` creates a voxel-based mask (the cortical "ribbon") from the four FreeSurfer cortical surfaces (lh.white, lh.pial, rh.white, rh.pial). Each voxel is labelled according to its position relative to the surfaces: white matter (inside white surface), cortical ribbon (between white and pial), or background. Uses an oriented bounding box (OBB) tree algorithm for efficient surface-to-volume distance computation. Also used to edit the aseg segmentation to include ribbon information.

## Source Information

- **Language:** C++
- **Source file:** `mris_volmask/mris_volmask.cpp`
- **Key libraries:** `MRISOBBTree`, `MRISdistancefield`, `fastmarching`, `cmd_line_interface`
- **Original author:** Krish Subramaniam (MGH)
- **Variants:** `mris_volmask_novtk` (no VTK dependency), `mris_volmask_vtk` (VTK-based)

## Purpose and Context

The cortical ribbon is the anatomical region between the white matter surface and the pial surface. Many FreeSurfer analyses (e.g., `mri_aparc2aseg`, fMRI surface projection) require a voxelwise definition of where the cortex is. `mris_volmask` produces this definition:

1. Computes signed distance fields from each of the 4 surfaces (lh/rh white, lh/rh pial).
2. Labels each voxel based on sign of distance: inside white surface → WM label; between white and pial → ribbon label; outside pial → background.
3. Combines left and right hemisphere masks.

The output ribbons are written as `lh.ribbon.mgz`, `rh.ribbon.mgz` by default, and the combined mask as `ribbon.mgz`.

## Inputs

| Input | Description |
|---|---|
| `--subject` / positional | Subject name in `$SUBJECTS_DIR` |
| `--sd` | SUBJECTS_DIR (or from environment) |
| `--template` | Template MRI for voxel grid geometry (default: aseg.mgz) |
| `--lh_wsurf` | LH white surface path (advanced mode) |
| `--lh_psurf` | LH pial surface path (advanced mode) |
| `--rh_wsurf` | RH white surface path (advanced mode) |
| `--rh_psurf` | RH pial surface path (advanced mode) |

## Outputs

| Output | Description |
|---|---|
| `ribbon.mgz` | Combined LH+RH ribbon mask |
| `lh.ribbon.mgz` | LH hemisphere ribbon |
| `rh.ribbon.mgz` | RH hemisphere ribbon |
| `aseg.ribbon.mgz` | Edited aseg with ribbon inserted (when `--edit_aseg`) |
| Distance maps | Optional: per-surface distance fields |

Output is written to `$SUBJECTS_DIR/<subject>/mri/` by default.

## Mathematical Foundations

### OBB Tree Distance Field

The tool uses an Oriented Bounding Box (OBB) Tree data structure to efficiently compute the signed distance from each voxel to the nearest surface triangle. The signed distance is negative inside the surface and positive outside.

> [!math] Ribbon label assignment
> For each voxel $v$:
> - $d_{\text{white}}(v)$ = signed distance to white surface
> - $d_{\text{pial}}(v)$ = signed distance to pial surface
> - If $d_{\text{white}} < 0$: label = white matter
> - If $d_{\text{white}} > 0$ and $d_{\text{pial}} < 0$: label = cortical ribbon
> - If $d_{\text{pial}} > 0$: label = background

The `capValue` parameter (resolution) controls how far from the surface the distance field is computed; voxels beyond this distance are capped.

### Parallel Computation

When built with OpenMP, the distance field computation for the 4 surfaces runs in parallel threads (up to 4 threads simultaneously).

## Configuration Options

| Flag | Argument | Description |
|---|---|---|
| `--subject` | name | Subject name (uses standard SUBJECTS_DIR paths) |
| `--sd` | dir | SUBJECTS_DIR |
| `--aseg` | file | Alternative aseg for template/editing |
| `--lh_wsurf` | path | Manual LH white surface path |
| `--lh_psurf` | path | Manual LH pial surface path |
| `--rh_wsurf` | path | Manual RH white surface path |
| `--rh_psurf` | path | Manual RH pial surface path |
| `--surf_wroot` | root | Alternate white surface root name |
| `--surf_proot` | root | Alternate pial surface root name |
| `--out_root` | root | Alternate output file root name |
| `--lh_only` | (flag) | Process LH only |
| `--rh_only` | (flag) | Process RH only |
| `--parallel` | (flag) | Compute surface distances in parallel |
| `--save_dist` | (flag) | Save surface distance maps |
| `--save_ribbon` | (flag) | Save per-hemisphere ribbon volumes |
| `--edit_aseg` | (flag) | Insert ribbon into aseg and save as aseg.ribbon.mgz |
| `--label_lh_white` | N | Label value for LH white matter (default: 2) |
| `--label_lh_ribbon` | N | Label value for LH cortical ribbon (default: 3) |
| `--label_rh_white` | N | Label value for RH white matter (default: 41) |
| `--label_rh_ribbon` | N | Label value for RH cortical ribbon (default: 42) |
| `--label_background` | N | Label value for background (default: 0) |

## Configuration Interactions

- `--lh_only` and `--rh_only` are mutually exclusive.
- `--edit_aseg` reads `aseg.mgz` (or `--aseg`) and inserts the ribbon, producing `aseg.ribbon.mgz`.
- `--parallel` enables OpenMP parallelism; only effective if the binary was compiled with OpenMP support.
- When using `--subject`, all surface paths are constructed automatically. Advanced mode (manual `--lh_wsurf` etc.) overrides this.

## Typical Use Cases

**1. Create ribbon for a subject (standard usage):**
```bash
mris_volmask --subject bert
```

**2. Create ribbon and edit aseg:**
```bash
mris_volmask --subject bert --edit_aseg
```

**3. LH only, save distance maps:**
```bash
mris_volmask --subject bert --lh_only --save_dist --save_ribbon
```

**4. Parallel computation:**
```bash
mris_volmask --subject bert --parallel
```

## Pipeline Context

`mris_volmask` is called during **autorecon3** of `recon-all`:

```
recon-all autorecon3:
  ...
  mris_volmask --subject <subject>
  ...
  mri_aparc2aseg (uses ribbon.mgz)
```

The ribbon output is used by:
- `mri_aparc2aseg` / `mri_surf2volseg` — to label cortex in volumetric segmentations
- `mri_vol2surf` / `mri_surf2vol` — for volume-to-surface sampling
- fMRI analysis tools that need to identify cortical voxels

The `mris_volmask_novtk` and `mris_volmask_vtk` variants are alternative builds with different VTK dependencies; their behaviour is identical.

## Gotchas and Caveats

> [!gotcha] Ribbon.mgz label scheme
> The default labels match the FreeSurfer CMA scheme: LH WM=2, LH ribbon=3, RH WM=41, RH ribbon=42, background=0. These match `aseg.mgz` labels. Do not change these unless you understand the downstream effects.

> [!gotcha] Distance cap value
> The `capValue` parameter limits how far the distance field is computed. Voxels beyond this distance from any surface are assigned the background label without a distance computation. This affects accuracy near the medial wall or thick regions.

> [!gotcha] VTK variants
> `mris_volmask_vtk` requires a VTK installation. `mris_volmask_novtk` does not use VTK and is the version typically distributed. The default `mris_volmask` binary is the novtk variant in most installations.

## Related Tools

- [[mri_aparc2aseg]] — uses ribbon output to create cortical segmentation
- [[mri_surf2vol]] — surface-to-volume projection using ribbon
- [[mri_vol2surf]] — volume-to-surface sampling

## Confidence and Gaps

Source code read directly. OBBTree algorithm not read in detail. Confidence is **high** for interface and general algorithm; **medium** for the specific distance field implementation.

> [!gap] Default label values
> The IoParams constructor (which sets default label values) was not read in full. The label values stated above are based on the standard FreeSurfer CMA scheme and the code structure but should be verified.
