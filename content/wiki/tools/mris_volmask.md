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
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-23
gaps:
  - "Exact OBBTree algorithm details not read."
audit_suppress_c3:
  - "--surf_white"
  - "--surf_pial"
  - "--label_background"
  - "--label_left_white"
  - "--label_left_ribbon"
  - "--label_right_white"
  - "--label_right_ribbon"
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
| `<subject>` (positional) | Subject name in `$SUBJECTS_DIR` |
| `--sd` | SUBJECTS_DIR (or from environment) |
| `--aseg_name` | Base name of the aseg/template MRI (default: `aseg`; full path is `mri/<name>.mgz`) |
| `--surf_white` | Alternate white surface root name (default: `white`; used as `?h.<name>`) |
| `--surf_pial` | Alternate pial surface root name (default: `pial`; used as `?h.<name>`) |

## Outputs

| Output | Description |
|---|---|
| `ribbon.mgz` | Combined LH+RH ribbon mask (named by `--out_root`) |
| `lh.ribbon.mgz` | LH hemisphere ribbon (when `--save_ribbon`) |
| `rh.ribbon.mgz` | RH hemisphere ribbon (when `--save_ribbon`) |
| `aseg.ribbon.mgz` | Edited aseg with ribbon inserted (when `--edit_aseg`) |
| Distance maps | Optional: per-surface signed distance fields (when `--save_distance`) |

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

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--sd` | dir | `$SUBJECTS_DIR` | SUBJECTS_DIR |
| `--aseg_name` | name | `aseg` | Base name of the aseg/template MRI (full path: `mri/<name>.mgz`) |
| `--surf_white` | root | `white` | White surface root name (produces `?h.<root>`) |
| `--surf_pial` | root | `pial` | Pial surface root name (produces `?h.<root>`) |
| `--out_root` | root | `ribbon` | Output file base name (produces `mri/<root>.mgz`) |
| `--lh-only` | (flag) | off | Process LH only |
| `--rh-only` | (flag) | off | Process RH only |
| `--parallel` | (flag) | off | Compute surface distances in parallel (OpenMP) |
| `--save_distance` | (flag) | off | Save signed distance maps for each surface |
| `--save_ribbon` | (flag) | off | Save per-hemisphere ribbon volumes (`?h.ribbon.mgz`) |
| `--edit_aseg` | (flag) | off | Insert ribbon into aseg and save as `aseg.ribbon.mgz` |
| `--cap_distance` | N | `3` | Maximum distance for signed distance field computation |
| `--label_left_white` | N | `20` | Label value for LH white matter |
| `--label_left_ribbon` | N | `10` | Label value for LH cortical ribbon |
| `--label_right_white` | N | `120` | Label value for RH white matter |
| `--label_right_ribbon` | N | `110` | Label value for RH cortical ribbon |
| `--label_background` | N | `0` | Label value for background |
| `--verbose` | (flag) | off | Enable debug/diagnostic output |
| `--all-info` | (flag) | off | Print full version and build information and exit |

## Configuration Interactions

- `--lh-only` and `--rh-only` are mutually exclusive.
- `--edit_aseg` reads the aseg named by `--aseg_name` (default: `aseg.mgz`) and inserts the ribbon, producing `aseg.ribbon.mgz`.
- `--parallel` enables OpenMP parallelism; only effective if the binary was compiled with OpenMP support.
- The subject name is always a positional argument. Surface and aseg paths are constructed automatically from `$SUBJECTS_DIR/<subject>/surf/` and `$SUBJECTS_DIR/<subject>/mri/`.
- `--surf_white` and `--surf_pial` let you substitute different surface variants (e.g., `pial.T2`) without specifying full paths.

## Typical Use Cases

**1. Create ribbon for a subject (standard usage):**
```bash
mris_volmask bert
```

**2. Create ribbon and edit aseg:**
```bash
mris_volmask --edit_aseg bert
```

**3. LH only, save distance maps:**
```bash
mris_volmask --lh-only --save_distance --save_ribbon bert
```

**4. Parallel computation:**
```bash
mris_volmask --parallel bert
```

## Pipeline Context

`mris_volmask` is called during **autorecon3** of `recon-all`:

```
recon-all autorecon3:
  ...
  mris_volmask <subject>
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
> The default labels used by `mris_volmask` are: LH WM=20, LH ribbon=10, RH WM=120, RH ribbon=110, background=0. These are internal ribbon labels, distinct from the FreeSurfer CMA aseg labels (LH WM=2, LH cortex=3, RH WM=41, RH cortex=42). The ribbon.mgz produced by `mris_volmask` is used as a structural mask, not as a segmentation with CMA labels. Do not change these unless you understand the downstream effects.

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

> [!note] Audit noise: AddOptionBool/AddOptionString framework
> An automated audit may report `--aseg_name`, `--cap_distance`, `--edit_aseg`, `--label_background`, `--label_left_ribbon`, `--label_left_white`, `--label_right_ribbon`, `--label_right_white`, `--lh-only`, `--out_root`, `--parallel`, `--rh-only`, `--save_distance`, `--save_ribbon`, `--surf_pial`, `--surf_white`, `--verbose` as C3 invalid. This is a false positive: the `CmdLineInterface::AddOptionBool` and `AddOptionString` methods store flag names without the `--` prefix (e.g., `"lh-only"`, `"aseg_name"`). When the user passes `--lh-only`, the framework strips `--` and matches. The audit scans for `--lh-only` literal in source and does not find it.

> [!gap] Default label values
> The IoParams constructor has been read directly. Default label values confirmed: LH WM=20, LH ribbon=10, RH WM=120, RH ribbon=110, background=0. These differ from the CMA aseg label scheme.
