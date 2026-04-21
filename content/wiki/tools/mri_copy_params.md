---
title: "mri_copy_params"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_modify/mri_copy_params.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - header
  - metadata
  - parameters
---

# mri_copy_params

## Summary

`mri_copy_params` copies volume header parameters (geometry, acquisition parameters, or both) from a template volume onto an input volume and writes the result to an output file. It is used to fix or transfer metadata such as the vox2ras matrix, voxel sizes, TR/TE/flip angle, and other acquisition parameters when these have been lost or corrupted during processing.

## Source Information

- **Language:** C++
- **Source file:** `mri_modify/mri_copy_params.cpp`
- **Original author:** Yasunari Tosa

## Purpose and Context

During format conversion or processing, volume header information can be lost or become inconsistent. `mri_copy_params` provides a targeted fix: it reads a correctly-headered template volume and copies its parameters onto the target data volume. The voxel data itself comes entirely from the input volume.

Common use cases:
- Restoring correct RAS geometry after a processing step that stripped it.
- Copying acquisition parameters (TR, TE, flip angle) from a raw scan to a derived volume.
- Adjusting the vox2ras matrix without resampling.

## Inputs

- **`in_vol`**: the volume whose voxel data is to be preserved
- **`template_vol`**: the volume from which header parameters are copied (only the header is read, not voxel data)
- **`out_vol`**: output file path

## Outputs

A copy of `in_vol` with header parameters replaced by those from `template_vol`, written to `out_vol`.

## Mathematical Foundations

The core operation calls one of:
- `MRIcopyPulseParameters(temp, dst)`: copies TR, TE, TI, flip angle, and related acquisition parameters.
- `MRIcopyHeader(temp, dst)` (default): copies the full header including vox2ras matrix, voxel size, data type, and acquisition parameters.

Optionally when `--ras` is used, only the RAS geometry is copied (vox2ras matrix and voxel sizes) without pulse parameters.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--pulse` | — | off | Copy only pulse parameters (TR, TE, flip angle) |
| `--ras` | — | off | Copy only RAS geometry (vox2ras, voxel sizes) |
| `--size` | — | off | Force copying of voxel sizes even when resolutions differ |

Without any flags, the full header is copied via `MRIcopyHeader()`.

## Configuration Interactions

- `--pulse` and `--ras` are mutually exclusive flags selecting subsets of parameters.
- `--size` is meaningful primarily when `--ras` is not used and the voxel sizes differ between volumes; it forces size copying that would otherwise be skipped with a warning.
- If dimensions differ between `in_vol` and `template_vol`, a warning is printed but copying proceeds. This can result in geometrically inconsistent output if the vox2ras is also being copied.

> [!gotcha] Mismatched dimensions
> If the volumes have different numbers of voxels but the same geometry, copying the full header including vox2ras may produce a geometrically valid but dimensionally inconsistent volume. The tool warns but does not stop.

## Typical Use Cases

Copy full header from a reference scan:
```bash
mri_copy_params processed.mgz reference.mgz corrected.mgz
```

Copy only pulse parameters (preserve geometry):
```bash
mri_copy_params processed.mgz raw_scan.mgz with_pulse_params.mgz --pulse
```

Copy RAS geometry only:
```bash
mri_copy_params processed.mgz correctly_oriented.mgz reoriented.mgz --ras
```

## Pipeline Context

Not called by [[recon-all]]. Used in:
- Post-processing data repair
- Format conversion pipelines where header fidelity must be maintained
- Copying acquisition metadata from raw DICOM-derived volumes to processed outputs

## Gotchas and Caveats

> [!gotcha] Overwrites all metadata by default
> The default (no flags) copies the entire header from `template_vol`, including voxel size, dimensions metadata, and all acquisition parameters. This may overwrite information that was correctly set in `in_vol`.

> [!gotcha] Volume dimensions are not changed
> `mri_copy_params` never resamples data. If `template_vol` has different dimensions than `in_vol`, the geometry will be inconsistent with the data. Use [[mri_convert]] if resampling is needed.

## Related Tools

- [[mri_convert]] — general conversion with geometry modification options
- [[mri_info]] — display volume header parameters

## Confidence and Gaps

Confidence is **high**. The source is short and clearly documented.
