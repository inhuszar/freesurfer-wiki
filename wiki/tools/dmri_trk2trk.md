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
  - "[[mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading parse_commandline()"
  - "Exact output ASC format not confirmed"
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

| Variable | Likely flag | Description |
|----------|-------------|-------------|
| `inTrkList` | `--in` | Input `.trk` file(s) |
| `inAscList` | `--inasc` | Input ASCII coordinate file(s) |
| `inRefFile` | `--inref` | Input reference volume (defines input space) |
| `outRefFile` | `--outref` | Output reference volume (defines output space) |
| `affineXfmFile` | `--reg` | Affine transform file (FSL `.mat` or LTA) |
| `nonlinXfmFile` | `--regnl` | Non-linear warp file |
| `incMaskList` | `--incmask` | Inclusion mask(s): keep only streamlines passing through |
| `excMaskList` | `--excmask` | Exclusion mask(s): remove streamlines passing through |
| `incTermMaskList` | `--incterm` | Terminal inclusion: keep only streamlines ending in |
| `excTermMaskList` | `--excterm` | Terminal exclusion: remove streamlines ending in |
| `outTrkList` | `--out` | Output `.trk` file(s) |
| `outAscList` | `--outasc` | Output ASCII file(s) |
| `outVolList` | `--outvol` | Output density volume file(s) |

Additional operation flags:

| Variable | Likely flag | Description |
|----------|-------------|-------------|
| `doMerge` | `--merge` | Merge all input `.trk` files into one |
| `doInvXfm` | `--inv` | Invert the affine transform |
| `doFill` | `--fill` | Fill gaps in streamlines |
| `doMean` | `--mean` | Output mean streamline |
| `doNearMean` | `--nearmean` | Output streamline nearest to mean |
| `doNth` | `--nth` | Extract the N-th streamline |
| `doEvery` | `--every` | Extract every N-th streamline |
| `doSmooth` | `--smooth` | Smooth streamlines |
| `lengthMin` | `--lmin` | Minimum streamline length (mm) |
| `lengthMax` | `--lmax` | Maximum streamline length (mm) |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `.trk` file | Transformed/filtered streamlines | TrackVis `.trk` |
| ASCII file | Streamline coordinates as text | text |
| Volume file | Streamline density/count map | MGZ/NIfTI |

## Mathematical Foundations

**Affine transformation:** Each streamline point $\mathbf{p}$ is transformed as:
$$\mathbf{p}' = \mathbf{A}\mathbf{p} + \mathbf{t}$$
where $\mathbf{A}$ is the $3 \times 3$ rotation/scale matrix and $\mathbf{t}$ is the translation vector from the affine transform file.

**Non-linear transformation:** A displacement field $\mathbf{d}(\mathbf{p})$ is added:
$$\mathbf{p}' = \mathbf{p} + \mathbf{d}(\mathbf{p})$$
interpolated at $\mathbf{p}$ from the warp volume. The `--invnl` flag inverts the non-linear warp.

**TrackVis coordinate system:** `.trk` files use a coordinate system defined by their header (voxel size, origin, orientation). `dmri_trk2trk` reads the input and output reference volumes to determine the correct voxel-to-RAS transforms and updates the `.trk` header accordingly.

## Configuration Options

> [!gap] Full flag list
> Complete flags require reading `parse_commandline()`. Key flags inferred from global variables are listed above.

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
  --incmask roi_cst.nii.gz

# Convert TRK to density volume
dmri_trk2trk \
  --in streamlines.trk \
  --outvol density.nii.gz \
  --inref fa.nii.gz \
  --outref fa.nii.gz

# Merge multiple TRK files
dmri_trk2trk \
  --in run1.trk run2.trk run3.trk \
  --out merged.trk \
  --merge
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

> [!gotcha] Non-linear warp direction
> Non-linear warps are applied in the "forward" direction by default. Use `--invnl` for the inverse warp. Confusing forward and inverse warps is a common error.

## Related Tools

- [[dmri_paths]] — produces `.trk` files processed by this tool
- [[dmri_pathstats]] — extracts measures from the transformed streamlines
- [[dmri_ac.sh]] — calls this tool for space transformations
- [[coordinate-systems]] — understanding the coordinate spaces involved

## Confidence and Gaps

> [!gap] Full argument parser not read
> Complete flag names and defaults require reading `parse_commandline()`.

> [!gap] Overlay (`--over`) functionality
> The `overList` and `overnames` variables suggest overlay/scalar data can be associated with streamlines. This functionality is not characterized.
