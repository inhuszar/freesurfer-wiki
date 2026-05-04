---
title: "dmri_trk2trk"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_trk2trk.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_ac.sh]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Exact output ASC format not confirmed"
  - "--over scalar overlay functionality not fully characterised"
tags:
  - diffusion
  - tractography
  - transformation
  - registration
  - trk
  - tracula
---

# dmri_trk2trk

## Summary

`dmri_trk2trk` is a Swiss-army-knife tool for transforming and filtering streamlines stored in TrackVis `.trk` files. It applies affine and/or non-linear spatial transforms to streamline coordinates, filters streamlines by inclusion/exclusion masks, converts tractography to volume density maps, merges multiple `.trk` files, and extracts individual streamlines or subsets. It is extensively used in the TRACULA pipeline and the AnatomiCuts pipeline for transferring streamlines between coordinate spaces.

## Source Information

- **Language:** C++
- **Source file:** `trc/dmri_trk2trk.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_trk2trk`
- **Original author:** Anastasia Yendiki (MGH)
- **Key libraries:** FreeSurfer MRI library, `vial.h` (AffineReg, NonlinReg), `spline.h`, `TrackIO.h`

## Purpose and Context

When streamlines are generated in one space (e.g., DWI native space) they often need to be transferred to another space (e.g., T1 anatomy, MNI atlas) for anatomical overlay or group analysis. `dmri_trk2trk` handles this spatial transformation while preserving or modifying the `.trk` header geometry to maintain consistency.

The tool supports:
- **Affine registration**: Apply a linear transform matrix
- **Non-linear warp**: Apply a displacement field
- **Mask filtering**: Keep/exclude streamlines by ROI
- **Format conversion**: `.trk` ↔ ASCII text ↔ density volume
- **Streamline operations**: Merge, average, subsample, smooth

## Inputs

From global variables:

| Variable | Flag | Description |
|----------|------|-------------|
| `inTrkList` | `--in <file> [...]` | Input `.trk` file(s) |
| `inAscList` | `--inasc <file> [...]` | Input ASCII coordinate file(s) |
| `inDir` | `--indir <dir>` | Input directory; `.trk` file names are relative to this |
| `inRefFile` | `--inref <file>` | Input reference volume (defines input space; needed for `--reg`/`--regnl`) |
| `outRefFile` | `--outref <file>` | Output reference volume (defines output space; needed for `--reg`/`--regnl`/`--outvol`) |
| `affineXfmFile` | `--reg <file>` | Affine registration file (`.lta` or FSL `.mat`), applied first |
| `nonlinXfmFile` | `--regnl <file>` | Non-linear registration file (`.m3z`), applied second |
| `incMaskList` | `--imask <file> [...]` | Inclusion mask(s): keep only streamlines passing through |
| `excMaskList` | `--emask <file> [...]` | Exclusion mask(s): remove streamlines passing through |
| `incTermMaskList` | `--itmask <file> [...]` | Terminal inclusion mask(s): keep only streamlines terminating in |
| `excTermMaskList` | `--etmask <file> [...]` | Terminal exclusion mask(s): remove streamlines terminating in |
| `outTrkList` | `--out <file> [...]` | Output `.trk` file(s) |
| `outAscList` | `--outasc <file> [...]` | Output ASCII file(s) |
| `outVolList` | `--outvol <file> [...]` | Output density volume file(s) |
| `outDir` | `--outdir <dir>` | Output directory; output file names are relative to this |

Additional operation flags:

| Variable | Flag | Description |
|----------|------|-------------|
| `doInvXfm` | `--inv` | Invert the registration transform |
| `doFill` | `--fill` | Fill gaps between mapped points by linear interpolation |
| `overList` | `--over <file> [...]` | Scalar overlay 1D volume(s) to associate with streamlines, applied to all inputs |
| `doMean` | `--mean` | Output only the mean streamline |
| `doNearMean` | `--nearmean` | Output only the streamline nearest to the mean |
| `doNth` | `--nth <n>` | Extract only the N-th streamline (0-based) |
| `doEvery` | `--every <n>` | Extract every N-th streamline |
| `doSmooth` | `--smooth` | Smooth streamlines |
| `lengthMin` | `--lmin <n>` | Minimum streamline length (number of points); streamlines with <= this many points are excluded |
| `lengthMax` | `--lmax <n>` | Maximum streamline length (number of points); streamlines with >= this many points are excluded |

Utility flags (parsed by `parse_commandline()`, confirmed from source):

| Flag | Description |
|------|-------------|
| `--debug` | Enable verbose debug output |
| `--checkopts` | Check options only; do not run processing |
| `--nocheckopts` | Disable `--checkopts` (default) |
| `--version` | Print version string and exit |
| `--help` | Print usage and exit |

> [!note] No --merge flag
> There is no --merge flag. Merging multiple input `.trk` files into a single output is achieved by specifying multiple files with `--in` and a single file with `--out`. The merge happens implicitly.

> [!note] No --invnl flag
> There is no separate --invnl flag for inverting only the non-linear warp. The --inv flag inverts all applied transforms (affine and/or non-linear).

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `.trk` file | Transformed/filtered streamlines | TrackVis `.trk` |
| ASCII file | Streamline coordinates as text | text |
| Volume file | Streamline density/count map | MGZ/NIfTI |

## Mathematical Foundations

**Affine transformation:** Each streamline point $\mathbf{p}$ is transformed as:
$$
\mathbf{p}' = \mathbf{A}\mathbf{p} + \mathbf{t}
$$
where $\mathbf{A}$ is the $3 \times 3$ rotation/scale matrix and $\mathbf{t}$ is the translation vector from the affine transform file.

**Non-linear transformation:** A displacement field $\mathbf{d}(\mathbf{p})$ is added:
$$
\mathbf{p}' = \mathbf{p} + \mathbf{d}(\mathbf{p})
$$
interpolated at $\mathbf{p}$ from the warp volume. The `--inv` flag inverts the applied warp(s).

**TrackVis coordinate system:** `.trk` files use a coordinate system defined by their header (voxel size, origin, orientation). `dmri_trk2trk` reads the input and output reference volumes to determine the correct voxel-to-RAS transforms and updates the `.trk` header accordingly.

## Configuration Options

All flags are confirmed from `parse_commandline()` in `trc/dmri_trk2trk.cxx`.

### Input / Output

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--in` | `<file> [...]` | — | Input `.trk` file(s). Multiple files may be listed; one output file triggers merge. |
| `--inasc` | `<file> [...]` | — | Input ASCII plain-text coordinate file(s), as an alternative to `.trk`. Each line has voxel coordinates of one point; empty lines separate streamlines. Cannot be combined with `--in`. |
| `--indir` | `<dir>` | — | Input directory; names of input files are resolved relative to this path. |
| `--out` | `<file> [...]` | — | Output `.trk` file(s). One file per input, or one file to merge all inputs. |
| `--outasc` | `<file> [...]` | — | Output ASCII text file(s). |
| `--outvol` | `<file> [...]` | — | Output streamline density volume(s). Requires `--outref`. |
| `--outdir` | `<dir>` | — | Output directory; output file names are resolved relative to this path. |
| `--inref` | `<file>` | — | Input reference volume defining the input coordinate space. Required when `--reg` or `--regnl` is specified. |
| `--outref` | `<file>` | — | Output reference volume defining the output coordinate space. Required when `--reg`, `--regnl`, or `--outvol` is specified. |

### Registration / Transform

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--reg` | `<file>` | — | Affine registration file (`.lta` or FSL `.mat`). Applied first, before `--regnl`. |
| `--regnl` | `<file>` | — | Non-linear registration file (`.m3z`). Applied second, after `--reg`. |
| `--inv` | — | off | Invert all applied transforms (affine and/or non-linear). |

### Mask Filtering

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--imask` | `<file> [...]` | — | Inclusion mask(s): keep only streamlines that pass through at least one voxel in each mask. |
| `--emask` | `<file> [...]` | — | Exclusion mask(s): remove streamlines that pass through any voxel in each mask. |
| `--itmask` | `<file> [...]` | — | Terminal inclusion mask(s): keep only streamlines whose start or end point lies inside each mask. |
| `--etmask` | `<file> [...]` | — | Terminal exclusion mask(s): remove streamlines whose start or end point lies inside each mask. |

### Streamline Operations

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fill` | — | off | Fill gaps between mapped points by linear interpolation. Useful when transforming to a higher-resolution space. |
| `--over` | `<file> [...]` | — | Scalar overlay 1D volume(s) to associate per-point with streamlines. Overlay values are mapped from the mean streamline to each individual streamline by nearest-neighbour lookup. |
| `--mean` | — | off | Output only the mean streamline (discards all others). Cannot be combined with `--nearmean` or `--nth`. |
| `--nearmean` | — | off | Output only the streamline nearest to the mean. Cannot be combined with `--mean`. |
| `--nth` | `<n>` | — | Extract only the N-th streamline (0-based). Cannot be combined with `--every` or `--mean`. |
| `--every` | `<n>` | — | Extract every N-th streamline. Cannot be combined with `--nth`. |
| `--lmin` | `<n>` | — | Minimum streamline length (number of points). Streamlines with <= this many points are discarded. |
| `--lmax` | `<n>` | — | Maximum streamline length (number of points). Streamlines with >= this many points are discarded. |
| `--smooth` | — | off | Smooth streamlines (integer coordinate rounding). |

### Utility

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--debug` | — | off | Enable verbose debug output. |
| `--checkopts` | — | off | Check options only; do not run processing. |
| `--nocheckopts` | — | off | Disable `--checkopts` (default). |
| `--version` | — | — | Print version string and exit. |
| `--help` | — | — | Print usage and exit. |

> [!note] No dedicated `--merge` flag
> Merging multiple input `.trk` files into a single output is implicit: specify multiple files with `--in` and a single file with `--out`. The combined token `--reg/--regnl` and `--reg/--regnl/--outvol` appearing in help strings are not flags — they are help-text shorthand for the separate `--reg`, `--regnl`, and `--outvol` flags, which are each individually confirmed in source. The audit token `--reg/--regnl` and `--reg/--regnl/--outvol` are audit noise from help-string parsing.

## Typical Use Cases

```bash
# Transform streamlines from DWI space to anatomical (T1) space
dmri_trk2trk \
  --in streamlines_dwi.trk \
  --out streamlines_anat.trk \
  --inref fa.nii.gz \
  --outref brain.nii.gz \
  --reg FSLREG.diff2struct.mat

# Apply non-linear warp (affine + nonlinear)
dmri_trk2trk \
  --in streamlines.trk \
  --out streamlines_mni.trk \
  --inref brain.nii.gz \
  --outref MNI305.nii.gz \
  --reg affine.mat \
  --regnl warp.nii.gz

# Filter by inclusion mask
dmri_trk2trk \
  --in whole_brain.trk \
  --out cst_filtered.trk \
  --inref fa.nii.gz \
  --outref fa.nii.gz \
  --imask roi_cst.nii.gz

# Convert TRK to density volume
dmri_trk2trk \
  --in streamlines.trk \
  --outvol density.nii.gz \
  --inref fa.nii.gz \
  --outref fa.nii.gz

# Merge multiple TRK files (no --merge flag; specify multiple --in and one --out)
dmri_trk2trk \
  --in run1.trk run2.trk run3.trk \
  --out merged.trk
```

## Pipeline Context

`dmri_trk2trk` is used throughout the TRACULA and AnatomiCuts pipelines:
- In `dmri_ac.sh` (`dwi2anat`, `ToAnat`, `ToTarget` functions) for transforming streamlines between DWI and anatomical spaces
- In TRACULA for registering tracts to a common atlas space

```
dmri_paths --> dmri_trk2trk (register to atlas) --> dmri_group
dmri_AnatomiCuts --> dmri_trk2trk (to anat space) --> dmri_extractSurfaceMeasurements
```

## Gotchas and Caveats

> [!gotcha] TRK header must be consistent with reference volumes
> The `.trk` header encodes the voxel-to-world transform. If the reference volumes don't match the actual coordinate system, streamlines will be displayed incorrectly. Always provide both `--inref` and `--outref`.

> [!gotcha] FSL matrix convention
> FSL `.mat` files use a flirt-convention that is not the same as a voxel-to-voxel matrix. `dmri_trk2trk` uses the `AffineReg` class from `vial.h` which handles this conversion.

> [!gotcha] Transform inversion
> Transforms are applied in the "forward" direction by default. Use --inv to invert all applied transforms (affine and/or non-linear). There is no separate --invnl flag; --inv applies to whichever transforms (--reg and/or --regnl) are specified. Confusing forward and inverse warps is a common error.

## Related Tools

- [[dmri_paths]] — produces `.trk` files processed by this tool
- [[dmri_pathstats]] — extracts measures from the transformed streamlines
- [[dmri_ac.sh]] — calls this tool for space transformations
- [[coordinate-systems]] — understanding the coordinate spaces involved

## Confidence and Gaps

> [!note] C1 audit noise sources
> An automated flag-inventory audit reported 27 apparent C1_MISSING flags. All 27 correspond to real flags confirmed in `parse_commandline()` in `trc/dmri_trk2trk.cxx`. They were missing only from the Configuration Options table (flags appeared in the Inputs section instead). Combined help-text tokens `--reg/--regnl` and `--reg/--regnl/--outvol` are audit noise — these are shorthand descriptions in the help string, not separate flags. All individual flags (`--reg`, `--regnl`, `--outvol`) are confirmed and now documented in the Configuration Options table.

> [!gap] Overlay (`--over`) downstream usage
> The `--over` flag and `overList` variable are confirmed from source. Each overlay volume is read and its values are mapped onto streamline points by finding the nearest point on the mean streamline. The overlay scalars are written into the `.trk` scalar fields (`n_scalars` in the TrackVis header). How downstream tools (e.g., `dmri_pathstats`) interpret or consume these per-point scalars is not fully characterised.
