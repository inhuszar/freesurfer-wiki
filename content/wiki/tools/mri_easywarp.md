---
title: "mri_easywarp"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_easyreg/mri_easywarp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_easyreg]]"
  - "[[mri_easyatlas]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - registration
  - resampling
  - deep-learning
---

# mri_easywarp

## Summary

`mri_easywarp` applies a pre-computed dense deformation field to an input MRI volume, producing a resampled (warped) output. It is the field-application companion to `[[mri_easyreg]]`. The tool loads the deformation field and the input image, converts RAS field coordinates to voxel indices of the input image using the input affine, then interpolates using either trilinear (default) or nearest-neighbour interpolation.

## Source Information

- **Source language:** Python
- **Source file:** `mri_easyreg/mri_easywarp`
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_easywarp` (bash wrapper)
- **Dependencies:** PyTorch, surfa (`sf`), nibabel, numpy

## Purpose and Context

`mri_easywarp` separates the field computation (done by `mri_easyreg`) from field application. This is useful when:
- The same deformation field needs to be applied to multiple volumes (e.g., a T2 image registered alongside a T1)
- Label maps need to be warped with nearest-neighbour interpolation
- Custom fields computed outside EasyReg need to be applied

The tool runs entirely on CPU (CUDA is disabled) and uses PyTorch tensor operations for efficient trilinear interpolation.

## Inputs

- `--i <path>`: Input image to warp. Formats: `.nii`, `.nii.gz`, `.mgz`, `.npz`.
- `--field <path>`: Dense deformation field (4D volume, exactly 3 frames representing x, y, z displacements in physical/RAS space). Must be produced by `mri_easyreg` or compatible tool.

The field volume must have shape $(W, H, D, 3)$. Volumes with a different number of frames will cause a fatal error.

## Outputs

- `--o <path>`: Output warped image. Format inferred from extension (`.nii`, `.nii.gz`, `.mgz`, `.npz`).

The output is written to the coordinate space defined by the deformation field's affine (i.e., the reference image space from `mri_easyreg`).

## Mathematical Foundations

The warping proceeds as follows:

1. **Load field**: Read the 4D field $\phi(i,j,k) \in \mathbb{R}^3$ storing target-space RAS coordinates for each voxel.

2. **Convert to input voxel indices**: Using the inverse of the input image affine $A_{\text{src}}^{-1}$:

$$
\begin{pmatrix} I \\ J \\ K \\ 1 \end{pmatrix} = A_{\text{src}}^{-1} \begin{pmatrix} \phi_x(i,j,k) \\ \phi_y(i,j,k) \\ \phi_z(i,j,k) \\ 1 \end{pmatrix}
$$

where $A_{\text{src}}$ is the $4 \times 4$ voxel-to-RAS affine of the input image.

3. **Trilinear interpolation** (default): For fractional voxel coordinates $(I_v, J_v, K_v)$:

$$
Y(i,j,k) = \sum_{a \in \{f,c\}} \sum_{b \in \{f,c\}} \sum_{e \in \{f,c\}} w_a^x \, w_b^y \, w_e^z \, X(I_a, J_b, K_e)
$$

where $f = \lfloor \cdot \rfloor$, $c = f+1$, and $w_c = v - f$, $w_f = 1 - w_c$.

Voxels outside the input image bounds are set to zero.

4. **Nearest-neighbour interpolation** (with `--nearest`): $Y(i,j,k) = X(\text{round}(I_v), \text{round}(J_v), \text{round}(K_v))$.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i` | `<path>` | required | Input image to warp |
| `--o` | `<path>` | required | Output warped image |
| `--field` | `<path>` | required | Dense deformation field (4D, 3 frames) |
| `--nearest` | flag | off | Use nearest-neighbour interpolation (for label maps) |
| `--threads` | `<int>` | `1` | CPU threads for PyTorch; `-1` = all available |

## Configuration Interactions

- `--nearest` should always be used when warping discrete label maps (e.g., segmentations, parcellations) to avoid interpolation artefacts at label boundaries.
- `--threads` is passed to `torch.set_num_threads()`; does not affect TF (no TF dependency in this script).
- The output coordinate system and voxel geometry are inherited from the deformation field (not the input image). This means the output will have the same affine and dimensions as the field volume.

> [!gotcha] Output space is field space, not input space
> The output image occupies the coordinate frame of the deformation field. If the field was computed by `mri_easyreg` using reference image `R`, the output will be in `R`'s space.

## Typical Use Cases

```bash
# Warp a T2 image using a field from EasyReg (trilinear for intensities)
mri_easywarp --i T2.mgz --field fwd_field.mgz --o T2_in_ref_space.mgz

# Warp a label map (use nearest-neighbour)
mri_easywarp --i aseg.mgz --field fwd_field.mgz --o aseg_warped.mgz --nearest

# Multi-threaded application
mri_easywarp --i T1.mgz --field fwd_field.mgz --o T1_warped.mgz --threads 4
```

## Pipeline Context

`mri_easywarp` is not called by `[[recon-all]]`. It is used after `[[mri_easyreg]]` to apply deformation fields. Typical workflow:
1. `mri_easyreg` — compute registration and produce a forward deformation field (via its `--fwd_field` output flag)
2. `mri_easywarp --field <fwd_field>` — apply that field to additional images or label maps

## Gotchas and Caveats

> [!gotcha] Field must be exactly 3 frames
> The code validates `field_buffer.shape[3] == 3` and exits with a fatal error otherwise.

> [!gotcha] CUDA disabled
> `CUDA_VISIBLE_DEVICES = '-1'` is hardcoded. Even if a GPU is available, the tool uses CPU only.

> [!gotcha] Voxels outside the input FOV become zero
> The trilinear interpolation returns 0 for any query point outside the input image bounding box. This can cause dark borders in the output if the deformation field maps to regions outside the input.

## Related Tools

- `[[mri_easyreg]]` — computes the deformation fields used by this tool
- `[[mri_easyatlas]]` — atlas construction using EasyReg

## Confidence and Gaps

**High confidence:** full source code was read; all arguments, interpolation logic, and coordinate transformation are documented from code.
