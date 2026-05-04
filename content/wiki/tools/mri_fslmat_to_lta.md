---
title: "mri_fslmat_to_lta"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fslmat_to_lta/mri_fslmat_to_lta.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - transform
  - lta
  - fsl
  - interoperability
---

# mri_fslmat_to_lta

## Summary

`mri_fslmat_to_lta` converts an FSL FLIRT affine transformation matrix (`.mat` file) to a FreeSurfer Linear Transform Array (`.lta`) file. It requires the source and destination image volumes to correctly embed the voxel-size scaling into the transform. Optionally, the transform can be inverted. This is the standard interoperability bridge between FSL and FreeSurfer affine registration results.

## Source Information

- **Source language:** C++
- **Source file:** `mri_fslmat_to_lta/mri_fslmat_to_lta.cpp`
- **Key dependencies:** `mri.h`, `transform.h`, `fio.h`

## Purpose and Context

FSL FLIRT outputs affine transformations as a $4 \times 4$ matrix in a FSL-specific convention (voxel-to-voxel with voxel sizes as scale factors). FreeSurfer uses the LTA format which stores the transform as a $4 \times 4$ matrix in a specified coordinate system with full volume geometry metadata. Conversions between these formats require knowledge of both the source and destination image geometries (specifically their voxel sizes).

## Inputs

Positional arguments (in order):
1. Source volume (FSL fixed/reference image) — used to extract `srcG` geometry
2. Destination volume (FSL moving image) — used to extract `dstG` geometry
3. FSL `.mat` file (input transform)
4. Output `.lta` file path

## Outputs

- LTA transform file at the specified output path.

## Mathematical Foundations

FSL FLIRT stores the transform as a voxel-to-voxel matrix $M_{\text{FSL}}$ that accounts for voxel sizes. The conversion to a standard voxel-to-voxel matrix $V_{\text{to\_V}}$ is:

$$
V_{\text{to\_V}} = D_{\text{dst}}^{-1} \cdot M_{\text{FSL}} \cdot D_{\text{src}}
$$

where $D_{\text{src}}$ and $D_{\text{dst}}$ are diagonal matrices of source and destination voxel sizes:

$$
D_{\text{src}} = \text{diag}(\Delta x_{\text{src}}, \Delta y_{\text{src}}, \Delta z_{\text{src}}, 1)
$$
$$
D_{\text{dst}}^{-1} = \text{diag}(1/\Delta x_{\text{dst}}, 1/\Delta y_{\text{dst}}, 1/\Delta z_{\text{dst}}, 1)
$$

This is implemented as:
```
invTgt * fsl_mat * Dsrc = V_to_V
```

The resulting $V_{\text{to\_V}}$ is stored in the LTA together with the full volume geometry of both source and destination.

> [!math] Coordinate convention
> FSL FLIRT convention defines the transform as mapping from source voxels to destination voxels, with voxel sizes incorporated. The FreeSurfer LTA convention typically stores RAS-to-RAS transforms internally but the code here stores the voxel-to-voxel form.

When `-inverse` is specified, `MatrixInverse(V_to_V)` is computed before writing.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-inverse` | flag | off | Invert the transform before writing to LTA |

## Configuration Interactions

- `-inverse` flips the direction of the transform (destination → source instead of source → destination).
- The four positional arguments are mandatory in the specified order; there is no named argument mode.

## Typical Use Cases

```bash
# Convert FSL FLIRT matrix to LTA (standard direction)
mri_fslmat_to_lta source.nii.gz destination.nii.gz flirt.mat output.lta

# Invert before writing
mri_fslmat_to_lta source.nii.gz destination.nii.gz flirt.mat output_inv.lta -inverse

# Using mgz volumes
mri_fslmat_to_lta source.mgz destination.mgz flirt.mat output.lta
```

## Pipeline Context

Not called by `[[wiki/pipelines/recon-all|recon-all]]`. Used when integrating FSL-based registrations into FreeSurfer workflows, e.g., when registering to MNI space using FSL FLIRT and then applying the transform in FreeSurfer.

## Gotchas and Caveats

> [!gotcha] Argument order is strict
> The arguments must be: source, destination, FSL mat, output LTA — in this exact order. Swapping source and destination (common mistake when coming from FSL conventions) will produce an incorrect transform.

> [!gotcha] FSL convention: source = reference, destination = moving
> In FLIRT, the "reference" image is the fixed space and the "input" image is the moving image. The transform maps input→reference. In `mri_fslmat_to_lta`, argument 1 is source (= FLIRT reference), argument 2 is destination (= FLIRT moving image space).

> [!contradiction] Argument naming vs FSL convention
> The help text says "source volume" for arg 1 and "destination volume" for arg 2. In FSL FLIRT terminology, the output matrix maps from the "input" (moving) to the "reference" (fixed). Careful attention to the FLIRT documentation is required when determining which volumes to supply.

> [!gotcha] Voxel size must match the actual transform
> If the volumes specified are not the exact source/destination used when running FLIRT, the voxel-size scaling will be incorrect and the converted LTA will be wrong.

## Related Tools

- `[[wiki/tools/mri_convert|mri_convert]]` — general format conversion
- `[[mri_em_register]]` — FreeSurfer-native affine registration
- `[[coordinate-systems]]` — background on LTA, voxel, and RAS coordinate systems

## Confidence and Gaps

**High confidence:** conversion formula and all arguments confirmed from full source read.
