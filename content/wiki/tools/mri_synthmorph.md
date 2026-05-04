---
title: "mri_synthmorph"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_synthmorph/mri_synthmorph"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthseg]]"
  - "[[mri_synthsr]]"
  - "[[mri_transform]]"
  - "[[coordinate-systems]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Joint registration symmetric mid-space implementation details not verified from synthmorph module source."
  - "GPU memory requirements for each model variant not documented."
tags:
  - registration
  - deep-learning
  - contrast-agnostic
  - deformable-registration
  - transforms
---

# mri_synthmorph

## Summary

`mri_synthmorph` is a deep-learning-based registration tool for 3D brain MRI that operates without preprocessing (no skull stripping, no contrast normalization). Based on the SynthMorph framework, it provides rigid, affine, and deformable registration modes, all contrast-invariant. The tool reads and writes LTA (linear) and MGZ displacement field (deformable) transforms in physical RAS space. It is the recommended tool for acquisition-agnostic registration in FreeSurfer 8.x.

## Source Information

- **Language:** Python
- **Source file:** `mri_synthmorph/mri_synthmorph` (Python script)
- **Model weights:**
  - `synthmorph.rigid.1.h5` — rigid registration
  - `synthmorph.affine.2.h5` — affine registration
  - `synthmorph.deform.3.h5` — deformable registration
  - `synthmorph.joint.*.h5` — combined affine + deformable (joint model)
- **Framework:** TensorFlow + `surfa` library
- **Key module:** `synthmorph/` subdirectory in `mri_synthmorph/`

### Key References

- Hoffmann M et al. "SynthMorph: learning contrast-invariant registration without acquired images." IEEE TMI, 41(3), 543–558, 2022.
- Hoffmann M et al. "Anatomy-specific acquisition-agnostic affine registration learned from fictitious images." SPIE Medical Imaging, 2023.
- Hoffmann M et al. "Anatomy-aware and acquisition-agnostic joint registration with SynthMorph." Imaging Neuroscience, 2, 1–33, 2024.

## Purpose and Context

Classical registration tools (`mri_robust_register`, `mri_em_register`) require matched contrasts or specific preprocessing. `mri_synthmorph` eliminates these requirements by training on purely synthetic images derived from label maps (no real MRI). It learns anatomy-driven features that generalize across:

- Different MRI contrasts (T1, T2, FLAIR, PDw, etc.)
- Different resolutions and voxel sizes
- Different orientations
- Different field strengths and scanner manufacturers

The registration operates in physical RAS space, producing transforms compatible with FreeSurfer's LTA format and displacement fields readable by `mri_warp_convert`.

## Inputs

| Input | Description |
|---|---|
| `moving` | Moving (source) image to be registered |
| `fixed` | Fixed (target/reference) image |
| `-i trans` | Initial matrix transform applied before registration |

Inputs can be `.mgz` or `.nii.gz`/`.nii`. Both single-frame 3D volumes are required. The images need correct anatomical orientation (valid voxel-to-world matrix) — the head must appear correctly oriented in a viewer.

## Outputs

| Output | Description |
|---|---|
| `-o image` | Moving image registered to fixed space (resampled) |
| `-O image` | Fixed image registered to moving space (inverse) |
| `-t trans` | Transform from moving to fixed (LTA or MGZ displacement field) |
| `-T trans` | Transform from fixed to moving (inverse) |

Transform format:
- Matrix transforms (rigid, affine): `.lta` files (LTA format)
- Displacement fields (deformable): `.mgz` files with 3 frames (RAS shifts in x, y, z)

## Mathematical Foundations

SynthMorph trains a network $f_\theta$ (U-Net-like architecture) on paired synthetic images $(I_m, I_f)$ generated from label maps, learning a deformation field $\phi$ that aligns the moving image to the fixed image.

> [!math] Registration objective
> The network minimizes:
> $$
> \mathcal{L}(\theta) = \mathcal{L}_{\text{sim}}(I_f, I_m \circ \phi) + \lambda \mathcal{L}_{\text{reg}}(\phi)
> $$
> where $\mathcal{L}_{\text{sim}}$ is an image similarity term (normalized cross-correlation or mutual information on label encodings), and $\mathcal{L}_{\text{reg}}$ is a regularization term penalizing non-smooth deformations. The regularization weight $\lambda$ corresponds to the `--hyper` / `-r` parameter at inference.

> [!math] Integration steps
> The deformable field $\phi$ is parameterized as a stationary velocity field (SVF) and integrated using scaling-and-squaring with `--steps` (default 7) integration steps:
> $$
> \phi = \exp(v) = v \circ v \circ \cdots \text{ (2}^n\text{ times)}
> $$
> Fewer steps reduce memory and speed up inference but can cause inaccuracies and folding voxels.

### Joint Registration

The joint model performs affine + deformable registration in a single pass, operating in an affine mid-space to guarantee symmetric transforms. This differs from running affine then deformable sequentially.

### Internal Pre-processing

Before registration, each image is internally:
1. Resampled to isotropic 1mm voxels in the registration space.
2. Intensities min-max normalized to [0, 1].
3. Reoriented to LIA (left-inferior-anterior) axes.

## Configuration Options

The tool uses a subcommand structure:

### `mri_synthmorph register [options] moving fixed`

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-m` | model | `joint` | Model: `joint`, `deform`, `affine`, or `rigid` |
| `-o` | image | — | Moving registered to fixed |
| `-O` | image | — | Fixed registered to moving |
| `-H` | (none) | off | Update voxel-to-world header only (no resampling); matrix transforms only |
| `-t` | trans | — | Save moving-to-fixed transform |
| `-T` | trans | — | Save fixed-to-moving transform |
| `-i` | trans | — | Initial matrix transform applied to moving |
| `-M` | (none) | off | Apply half initial transform to each image (for symmetry with deformable) |
| `-j` | N | — | Number of TensorFlow threads |
| `-g` | (none) | off | Use GPU (CUDA_VISIBLE_DEVICES or GPU 0) |
| `-d` | dir | — | Output directory for registered image and transforms |
| `-r` | lambda | 0.5 | Regularization weight in (0, 1) for deformable |
| `-n` | N | 7 | Integration steps for deformable (min: 5) |
| `-e` | extent | 256 | Registration space extent: 192 or 256 voxels |
| `-w` | weights | — | Alternative model weights (`.h5` file) |
| `-h` | (none) | — | Print help |

### `mri_synthmorph apply [options] trans image`

Apply an existing transform to another image.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-o` | image | — | Output (warped) image |
| `-r` | ref | — | Reference image for output geometry |
| `-t` | type | — | Output data type (uint8, uint16, int16, int32, float32) |
| `-n` | method | `linear` | Interpolation: `linear` or `nearest` |
| `-f` | value | 0 | Fill value for voxels outside the FOV |
| `-j` | N | — | TensorFlow threads |
| `-g` | (none) | off | Use GPU |
| `-h` | (none) | — | Print help |

## Configuration Interactions

- `-m deform` assumes prior affine alignment (or initialization via `-i`); without it, deformable-only registration may fail.
- `-m joint` is the recommended default: it combines affine and deformable in a symmetric mid-space.
- `-M` (mid-space symmetry) requires `-i` to be specified.
- `-H` (header-only, no resampling) is only valid for matrix transforms (rigid/affine), not deformable.
- For joint registration with separate affine and deformable weights, `-w` must be given twice.
- `-e 192` reduces memory and speeds up inference but may crop anatomy for large-field scans.

> [!gotcha] Deformable-only requires prior affine alignment
> If you run `-m deform` without first running an affine registration or providing `-i`, the deformable step may fail to find a good solution because it lacks the global alignment needed to find local correspondences.

> [!gotcha] --steps below 5 causes folding
> Setting `-n` below 5 integration steps can cause non-diffeomorphic transforms (folded voxels). The minimum allowed value is 5.

## Typical Use Cases

**1. Joint affine + deformable registration (recommended default):**
```bash
mri_synthmorph register -o registered.mgz -t transform.lta \
  moving.mgz fixed.mgz
```

**2. Affine-only registration saving transform:**
```bash
mri_synthmorph register -m affine -t affine.lta \
  moving.nii.gz fixed.nii.gz
```

**3. Rigid registration, update header only (no resampling):**
```bash
mri_synthmorph register -m rigid -H -o out.mgz \
  moving.mgz fixed.mgz
```

**4. Deformable registration initialized from affine:**
```bash
mri_synthmorph register -m deform -i affine.lta \
  -t deform.mgz -o out.mgz moving.mgz fixed.mgz
```

**5. Apply a deformable transform to a label map (nearest-neighbour):**
```bash
mri_synthmorph apply -n nearest -o warped_labels.mgz \
  deform.mgz labels.mgz
```

**6. GPU registration with reduced regularization (smoother warp):**
```bash
mri_synthmorph register -g -r 0.25 -o out.mgz \
  moving.mgz fixed.mgz
```

## Pipeline Context

`mri_synthmorph` is not part of the standard `recon-all` pipeline, but is used for:

- **Cross-subject registration** when subjects have different contrasts
- **Template registration** (registering individual subjects to MNI or custom templates)
- **Longitudinal registration** for multi-timepoint analysis
- **Cross-modality registration** (e.g., aligning T2 to T1)

For standard within-subject, T1w registration, `mri_robust_register` or `mri_em_register` remain available. For any non-T1w or cross-modality scenario, `mri_synthmorph` is preferred.

See also: [[mri_transform]] (apply LTA/GCAM transforms), [[coordinate-systems]].

## Gotchas and Caveats

> [!gotcha] Orientation correctness is critical
> The registration internally converts to LIA orientation using the voxel-to-world matrix. If the matrix is incorrect (e.g., the image is flipped), registration will fail silently or produce wrong results. Always verify orientation with `freeview` or `mri_info`.

> [!gotcha] Transform format is not mri_convert compatible directly
> The deformable transforms (MGZ with 3 frames) are in RAS displacement space, not the GCAM format used by `mri_convert -gcam`. Use `mri_warp_convert` to convert between formats.

> [!gotcha] Container vs. native execution
> The source includes a Docker container script (`fs-synthmorph-reg`). The container mounts `SUBJECTS_DIR` to `/mnt`. When running natively, `SUBJECTS_DIR` is ignored.

## Related Tools

- [[mri_synthseg]] — contrast-agnostic segmentation
- [[mri_synthsr]] — super-resolution and synthesis
- [[mri_transform]] — apply LTA/GCAM transforms to volumes

## Confidence and Gaps

The Python source script and embedded help text were read directly. Model architecture references are from published papers. Confidence is **high** for command-line interface; **medium** for internal model details.

> [!gap] Symmetric joint transform implementation
> The symmetric mid-space approach for joint registration is described in the paper but not verified in the synthmorph Python module source. The exact implementation may differ from the simplified description above.
