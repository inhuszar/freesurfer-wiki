---
title: "dmri_vox2vox"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_vox2vox.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - diffusion
  - registration
  - coordinates
---

# dmri_vox2vox

## Summary

`dmri_vox2vox` applies affine and/or non-linear warp transforms to voxel coordinates stored in plain-text files. It is part of the tractography toolkit and is used to propagate seed-point or waypoint coordinates from one image space to another during diffusion MRI processing.

## Source Information

- **Language:** C++
- **Source file:** `trc/dmri_vox2vox.cxx`
- **Original author:** Anastasia Yendiki

## Purpose and Context

In tractography pipelines, seed regions and pathway constraints are often defined as lists of voxel coordinates in a reference space. When the diffusion data is registered to another space (e.g., subject anatomy or MNI atlas), these coordinate lists must be transformed accordingly. `dmri_vox2vox` performs this coordinate-level transformation, reading triplets of (x, y, z) voxel coordinates from text files and writing the transformed coordinates to output text files.

The tool supports a sequential application of: (1) an affine registration (`.mat` file, applied first) and (2) a non-linear warp field (`.m3z` file, applied second). The inverse of the non-linear warp can optionally be applied instead of the forward warp.

## Inputs

- One or more plain-text coordinate files, each containing triplets of floating-point voxel coordinates (one triplet per line, space-separated).
- An input reference volume (`--inref`): defines the voxel space of the input coordinates.
- An output reference volume (`--outref`): defines the target voxel space.
- Optionally: an affine registration file (`--reg`, FSL `.mat` format) and/or a non-linear warp file (`--regnl`, `.m3z` format).

> [!assumption] Coordinate format
> Input text files must contain exactly triplets of numbers. The number of values in each file must be divisible by 3; otherwise the program exits with an error.

## Outputs

- One output text file per input file, containing the transformed (x, y, z) triplets, one per line.

## Mathematical Foundations

The coordinate transform is applied in sequence:

1. **Affine step:** The affine registration matrix $A$ (read from the `.mat` file via `AffineReg::ReadXfm`) is applied to each 3D point as $\mathbf{p}' = A \mathbf{p}$.

2. **Non-linear step:** The non-linear displacement field (read from the `.m3z` file via `NonlinReg::ReadXfm`) is applied by interpolating the warp field at $\mathbf{p}'$ to produce the final point $\mathbf{p}''$.

If `--invnl` is specified, the inverse of the non-linear warp is applied instead (using `NonlinReg::ApplyXfmInv`), which is relevant when mapping coordinates from atlas space back to subject space.

> [!gap] Warp inversion method
> The exact numerical method used by `NonlinReg::ApplyXfmInv` is not documented in the source header. It may use iterative inversion of the displacement field. Needs verification.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--in <file> [...]` | string(s) | required | Input coordinate text file(s) |
| `--indir <dir>` | string | — | Directory prefix for input files |
| `--out <file> [...]` | string(s) | required | Output coordinate text file(s), one per input |
| `--outdir <dir>` | string | — | Directory prefix for output files |
| `--inref <file>` | volume | required | Reference volume defining input voxel space |
| `--outref <file>` | volume | required | Reference volume defining output voxel space |
| `--reg <file>` | `.mat` | — | Affine registration (applied first) |
| `--regnl <file>` | `.m3z` | — | Non-linear warp (applied second) |
| `--invnl` | flag | off | Apply inverse of non-linear warp |
| `--debug` | flag | off | Enable verbose debugging output |
| `--checkopts` | flag | off | Check options and exit without processing |
| `--version` | flag | — | Print version and exit |

## Configuration Interactions

- `--reg` and `--regnl` can be used independently or together. When both are given, the affine is applied first, then the non-linear warp.
- `--invnl` only has effect when `--regnl` is also specified.
- `--indir` and `--outdir` are prepended to the respective file names; the number of `--in` and `--out` files must match exactly.

> [!gotcha] CVS build dependency
> The non-linear warp code (`NonlinReg`) is conditionally compiled under `#ifndef NO_CVS_UP_IN_HERE`. If FreeSurfer was built without CVS support, `--regnl` and `--invnl` are silently unavailable.

## Typical Use Cases

```bash
# Apply affine-only transform to seed coordinates
dmri_vox2vox \
  --in seeds_dwi.txt \
  --out seeds_anat.txt \
  --inref dwi.nii.gz \
  --outref orig.mgz \
  --reg bbregister.mat

# Apply affine + nonlinear warp to multiple coordinate files
dmri_vox2vox \
  --indir /path/to/dwi \
  --in seeds1.txt seeds2.txt \
  --outdir /path/to/anat \
  --out seeds1_anat.txt seeds2_anat.txt \
  --inref dwi.nii.gz \
  --outref orig.mgz \
  --reg affine.mat \
  --regnl warp.m3z

# Apply inverse nonlinear warp (atlas -> subject)
dmri_vox2vox \
  --in atlas_seeds.txt \
  --out subject_seeds.txt \
  --inref mni305.mgz \
  --outref orig.mgz \
  --reg affine.mat \
  --regnl warp.m3z \
  --invnl
```

## Pipeline Context

`dmri_vox2vox` is part of the diffusion/tractography pipeline (`trc/`). It is typically invoked as part of the `trac-all` workflow to transform seed-point coordinate lists between the DWI and structural spaces. It does not appear as a direct stage of `recon-all`.

Related pipeline components: [[wiki/tools/mri_convert|mri_convert]], [[bbregister]].

## Gotchas and Caveats

- The tool reads and writes **voxel** coordinates, not RAS or surface RAS coordinates. Users must be aware of which coordinate system their seed files use.
- The affine `.mat` is in FSL format; this differs from FreeSurfer's `.lta` format. Mixing the two will produce incorrect results.
- There is no explicit validation that the number of `--in` and `--out` arguments matches; mismatches may cause silent write failures.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — general volume conversion and resampling
- [[mri_info]] — inspect volume coordinate system metadata

## Confidence and Gaps

**High confidence:** command-line interface and transform application order (from source code).

> [!gap] Non-linear inverse algorithm
> The exact method for computing `NonlinReg::ApplyXfmInv` is not visible without reading the `vial.h` / `vial.cpp` implementation. The inversion strategy (iterative, precomputed, etc.) is unknown.
