---
title: "mri_easyreg"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_easyreg/mri_easyreg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_easyatlas]]"
  - "[[mri_easywarp]]"
  - "[[mri_fslmat_to_lta]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full details of the EasyReg neural network architecture not documented"
  - "SynthSeg parcellation label requirement for cortical parcels not fully clarified"
tags:
  - registration
  - deep-learning
  - deformable-registration
  - synthmorph
---

# mri_easyreg

## Summary

`mri_easyreg` performs deep-learning-based deformable image registration between a reference and a floating MRI volume. It uses the EasyReg framework: SynthSeg segmentation is computed for both images (or loaded if pre-existing), and a pre-trained VoxelMorph model registers them in a two-stage (affine + nonlinear) pipeline. Outputs include registered images, forward/backward dense deformation fields, and forward/backward affine matrices. The tool is contrast-agnostic due to its reliance on segmentation-guided registration.

## Source Information

- **Source language:** Python
- **Source file:** `mri_easyreg/mri_easyreg`
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_easyreg` (bash wrapper calling the Python script)
- **Deep learning model:** `$FREESURFER_HOME/models/easyreg_v10_230103.h5` (VoxelMorph registration), `$FREESURFER_HOME/models/synthseg_2.0.h5` and `synthseg_parc_2.0.h5` (segmentation)
- **Dependencies:** TensorFlow, Keras, VoxelMorph (`vxm`), surfa (`sf`), nibabel, scipy, numpy, PyTorch

## Purpose and Context

EasyReg is designed as a user-friendly, general-purpose registration tool that works across MRI contrasts (T1, T2, FLAIR, etc.) without contrast-specific training. It replaces the need for manually selecting a registration metric or pre-processing protocol. The SynthSeg segmentation step produces a contrast-invariant intermediate representation, and the VoxelMorph model learned to register these segmentations.

Use cases include:
- Cross-modal registration (e.g., T1 to T2)
- Multi-site registration where scanner differences exist
- Longitudinal registration
- Group-level atlas construction (via [[mri_easyatlas]])

## Inputs

- `--ref <path>`: Reference image (the target/fixed space). Formats: `.nii`, `.nii.gz`, `.mgz`.
- `--ref_seg <path>`: SynthSeg segmentation of the reference image. Created automatically if it does not exist on disk.
- `--flo <path>`: Floating image (the source/moving image).
- `--flo_seg <path>`: SynthSeg segmentation of the floating image. Created automatically if it does not exist.

Both segmentations must include cortical parcellation labels (values > 1000). If loaded from disk, the tool validates this requirement.

## Outputs

All outputs are optional but at least one must be specified:

- `--ref_reg <path>`: Registered reference image (reference resampled into its own space, useful for QA).
- `--flo_reg <path>`: Registered floating image (floating resampled into reference space).
- `--fwd_field <path>`: Forward dense deformation field (floating → reference), 4D volume with 3 frames (x, y, z displacements in mm).
- `--bak_field <path>`: Backward dense deformation field (reference → floating).
- `--fwd_mat <path>`: Forward affine transformation matrix.
- `--bak_mat <path>`: Backward affine transformation matrix.

> [!gap] Deformation field coordinate convention
> Whether the deformation fields encode absolute RAS coordinates or relative displacements, and which coordinate system they use (scanner RAS vs. voxel), is not documented explicitly. See [[coordinate-systems]] for context.

## Mathematical Foundations

EasyReg operates in two stages:

### Stage 1: Affine registration
A global affine transformation aligns the two SynthSeg segmentations. The transformation is parameterized as a $4 \times 4$ matrix in homogeneous coordinates.

### Stage 2: Deformable registration
A VoxelMorph-style convolutional neural network predicts a dense deformation field $\phi: \mathbb{R}^3 \rightarrow \mathbb{R}^3$ that maps reference voxel positions to floating image positions. The registration minimizes a learned objective over the segmentation-guided representations.

The atlas space used internally has affine:
$$A = \begin{pmatrix} -1 & 0 & 0 & 79 \\ 0 & 0 & 1 & -104 \\ 0 & -1 & 0 & 79 \\ 0 & 0 & 0 & 1 \end{pmatrix}, \quad \text{size } [160, 160, 192]$$

The registration is performed in this normalized atlas space and then transformed back to the original image coordinates.

> [!math] Deformation field application
> The deformation field $\phi$ is stored as a 4D volume of shape $(W, H, D, 3)$. To apply it, the target-space voxel coordinates $(I, J, K)$ are computed by:
> $$\begin{pmatrix} I \\ J \\ K \\ 1 \end{pmatrix} = A_{\text{src}}^{-1} \begin{pmatrix} \phi_x \\ \phi_y \\ \phi_z \\ 1 \end{pmatrix}$$
> where $A_{\text{src}}$ is the source image affine. This computation is implemented in `mri_easywarp`.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--ref` | `<path>` | required | Reference (fixed) image |
| `--ref_seg` | `<path>` | required | SynthSeg segmentation of reference (auto-created if absent) |
| `--flo` | `<path>` | required | Floating (moving) image |
| `--flo_seg` | `<path>` | required | SynthSeg segmentation of floating (auto-created if absent) |
| `--ref_reg` | `<path>` | optional | Output registered reference image |
| `--flo_reg` | `<path>` | optional | Output registered floating image (in reference space) |
| `--fwd_field` | `<path>` | optional | Output forward deformation field |
| `--bak_field` | `<path>` | optional | Output backward deformation field |
| `--fwd_mat` | `<path>` | optional | Output forward affine matrix |
| `--bak_mat` | `<path>` | optional | Output backward affine matrix |
| `--affine_only` | flag | off | Skip nonlinear deformable registration; affine only |
| `--autocrop` | flag | off | Ignore background voxels in FOV (crop to brain region) |
| `--threads` | `<int>` | `1` | Number of CPU threads for TF + PyTorch; `-1` = all available |

## Configuration Interactions

- At least one of `--ref_reg`, `--flo_reg`, `--fwd_field`, `--bak_field` must be specified.
- `--affine_only` stops before the VoxelMorph step; no deformation field is generated.
- `--autocrop` reduces computation by ignoring background voxels but may affect registration accuracy near the FOV boundary.
- `--threads` affects both TF (`set_inter_op_parallelism_threads` / `set_intra_op_parallelism_threads`) and PyTorch (`set_num_threads`).
- CUDA is always disabled; the tool runs on CPU only.
- `FREESURFER_HOME` must be set for model loading.

## Typical Use Cases

```bash
# Full registration: floating to reference, save all outputs
mri_easyreg \
  --ref reference.mgz --ref_seg reference_seg.mgz \
  --flo floating.mgz --flo_seg floating_seg.mgz \
  --flo_reg registered.mgz \
  --fwd_field fwd_field.mgz --bak_field bak_field.mgz \
  --fwd_mat fwd_mat.txt --bak_mat bak_mat.txt

# Affine-only registration
mri_easyreg \
  --ref reference.mgz --ref_seg reference_seg.mgz \
  --flo floating.mgz --flo_seg floating_seg.mgz \
  --flo_reg registered_affine.mgz \
  --affine_only

# Multi-threaded registration
mri_easyreg \
  --ref ref.mgz --ref_seg ref_seg.mgz \
  --flo flo.mgz --flo_seg flo_seg.mgz \
  --flo_reg flo_reg.mgz --fwd_field field.mgz \
  --threads 8
```

## Pipeline Context

`mri_easyreg` is not called by `[[recon-all]]`. It is a standalone registration utility. After registration:
- Apply deformation fields with `[[mri_easywarp]]`
- Build group atlases with `[[mri_easyatlas]]`

## Gotchas and Caveats

> [!gotcha] CUDA always disabled
> `CUDA_VISIBLE_DEVICES = '-1'` is hardcoded; GPU acceleration is not available.

> [!gotcha] SynthSeg must include cortical parcellation labels
> Both `ref_seg` and `flo_seg` must contain voxels with values > 1000 (cortical parcellation labels). Segmentations from older SynthSeg versions or whole-brain-only segmentations will cause a fatal error.

> [!gotcha] Segmentation path is required even if the file exists
> Both `--ref_seg` and `--flo_seg` are required arguments. If the files already exist on disk, they are loaded; if not, they are computed. But the argument must still be specified.

> [!gotcha] Deformation field is 3-frame 4D volume
> The deformation field is a 4D MRI volume with exactly 3 frames (one per spatial dimension). Passing a file with a different number of frames will cause `mri_easywarp` to fail.

## Related Tools

- `[[mri_easywarp]]` — applies EasyReg deformation fields to new volumes
- `[[mri_easyatlas]]` — builds group atlas using EasyReg
- `[[mri_fslmat_to_lta]]` — converts FSL-style affine matrices to LTA format
- `[[coordinate-systems]]` — for understanding the RAS coordinate convention used by deformation fields

## Confidence and Gaps

**High confidence:** argument list (from source), model paths, threading, CUDA disabled, required outputs constraint.

**Medium confidence:** exact network architecture, training data, and registration accuracy guarantees.

> [!gap] Full registration pipeline
> The inner registration loop (lines 100+ of source) was not fully read. Details of the atlas-space normalization, the VoxelMorph forward pass, and the inverse-field computation are inferred from context.
