---
title: "mri_synthsr"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_synthsr/mri_synthsr"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthseg]]"
  - "[[mri_synthmorph]]"
  - "[[mri_convert]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Details of unsharp masking post-processing step not verified from source."
  - "Output resolution is always 1mm isotropic — verify if this is strictly enforced."
tags:
  - super-resolution
  - synthesis
  - deep-learning
  - contrast-agnostic
  - tensorflow
---

# mri_synthsr

## Summary

`mri_synthsr` converts a brain MRI of any contrast and resolution into a synthetic 1mm isotropic MP-RAGE (T1-weighted MPRAGE equivalent) using a deep-learning model (SynthSR). It performs simultaneous super-resolution and contrast synthesis, enabling the use of tools designed for T1w inputs (including `recon-all`) on non-T1w or low-resolution clinical scans. The output is a 1mm isotropic synthetic T1w volume.

## Source Information

- **Language:** Python
- **Source file:** `mri_synthsr/mri_synthsr` (Python script)
- **Model weights:** `$FREESURFER_HOME/models/synthsr_v20_230130.h5` (default v2), `synthsr_v10_210712.h5` (v1), `synthsr_lowfield_v20_230130.h5` (low-field/HyperFine)
- **Framework:** TensorFlow/Keras
- **Key dependency:** `scipy` (for Gaussian filtering, interpolation)

### Key References

- Iglesias JE et al. "Joint super-resolution and synthesis of 1 mm isotropic MP-RAGE volumes from clinical MRI exams with scans of different contrast, orientation, and slice thickness." NeuroImage, 2023.

## Purpose and Context

`mri_synthsr` addresses the problem of processing clinical MRI data with `recon-all`. Standard FreeSurfer requires:
- T1-weighted contrast
- ~1mm isotropic resolution

Clinical scans (T2, FLAIR, PD-weighted; thick-slice coronal or sagittal; low-field scans) fail with `recon-all`. SynthSR solves this by producing a synthetic 1mm T1w image, after which the standard `recon-all` pipeline can proceed as normal.

The related tool `mri_synthsr_hyperfine` is a thin wrapper that calls `mri_synthsr --lowfield` (see [[mri_synthsr_hyperfine]]).

## Inputs

| Input | Description |
|---|---|
| `--i` | Input image or folder of images to super-resolve |
| `--model` | Custom model file (overrides built-in model selection) |

Input can be `.mgz`, `.nii.gz`, or `.nii`. A single 3D volume (or folder of volumes for batch processing). The input can be:
- Any MRI contrast (T1, T2, FLAIR, PD, etc.)
- Any resolution (thick-slice, anisotropic)
- Any orientation
- CT scans (with `--ct`)

## Outputs

| Output | Description |
|---|---|
| `--o` | Synthetic 1mm isotropic MP-RAGE volume |

The output is a single 3D volume at 1mm isotropic resolution, synthetic T1w contrast, saved in the same format as the input (or as specified).

## Mathematical Foundations

SynthSR is a paired image-to-image translation network trained on:
1. Real 1mm isotropic T1w volumes as targets.
2. Synthetically degraded versions of those volumes (simulated arbitrary contrasts, resolutions, orientations) as inputs.

The network learns the inverse of the degradation process. At inference:
- The network takes the input scan (any contrast, any resolution) and produces a 1mm T1w output.
- An optional unsharp masking step sharpens the output by enhancing high-frequency content.

> [!math] Unsharp masking (post-processing)
> When enabled (default: on), the output $I_{\text{sharp}}$ is computed as:
> $$
> I_{\text{sharp}} = I + \alpha (I - G_\sigma * I)
> $$
> where $G_\sigma$ is a Gaussian blurring kernel and $\alpha$ is the sharpening strength. This enhances edges in the synthetic T1w output.

## Configuration Options

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--i` | path | — | Input image or folder |
| `--o` | path | — | Output synthetic T1w image |
| `--ct` | (flag) | off | Clip input to [0, 80] Hounsfield units for CT |
| `--disable_sharpening` | (flag) | off | Disable unsharp masking post-processing |
| `--disable_flipping` | (flag) | off | Disable flipping augmentation at test time |
| `--lowfield` | (flag) | off | Use model for low-field scans (Hyperfine Swoop etc.) |
| `--v1` | (flag) | off | Use version 1 model (July 2021) |
| `--threads` | N | 1 | Number of CPU cores |
| `--cpu` | (flag) | off | Force CPU processing |
| `--model` | h5file | — | Use custom model weights |

## Configuration Interactions

- `--lowfield` and `--v1` are mutually exclusive (low-field model is v2 only).
- `--model` overrides `--lowfield` and `--v1`.
- `--ct` must be set for CT inputs to avoid clipping errors.
- `--disable_sharpening` and `--disable_flipping` are intended for debugging or specialized use cases.

## Typical Use Cases

**1. Convert T2 FLAIR to synthetic T1w:**
```bash
mri_synthsr --i FLAIR.nii.gz --o synthetic_T1.mgz
```

**2. Convert CT scan:**
```bash
mri_synthsr --i brain_ct.nii.gz --o synthetic_T1.mgz --ct
```

**3. Batch convert a folder:**
```bash
mri_synthsr --i /path/to/clinical_scans/ --o /path/to/synthetic_T1s/
```

**4. Use low-field model:**
```bash
mri_synthsr --i lowfield_scan.nii.gz --o synthetic_T1.mgz --lowfield
```

**5. Then run recon-all on synthetic T1:**
```bash
recon-all -i synthetic_T1.mgz -s subject01 -all
```

## Pipeline Context

`mri_synthsr` serves as a **preprocessing step** before `recon-all` for non-T1w or non-isotropic data:

```
Clinical scan (any contrast/resolution)
    → mri_synthsr → synthetic 1mm T1w
    → recon-all -i synthetic_T1.mgz -s subj -all
    → standard FreeSurfer outputs
```

It is not part of the standard `recon-all` pipeline itself.

## Gotchas and Caveats

> [!gotcha] Output is synthetic, not real T1w
> The output is a model-generated image that mimics T1w contrast. Quantitative intensity values are not physically meaningful. It should only be used as input to `recon-all` or for visualization, not for absolute intensity analysis.

> [!gotcha] Field-of-view coverage
> If the input has incomplete brain coverage (e.g., truncated cerebellum), the synthetic output will also have incomplete coverage. SynthSR does not hallucinate missing anatomy.

> [!gotcha] Low-field vs general model
> The low-field model (`--lowfield`) was specifically trained for Hyperfine Swoop scans (64mT). Using it on standard-field scans may produce inferior results compared to the default model.

## Related Tools

- [[mri_synthsr_hyperfine]] — wrapper calling `mri_synthsr --lowfield`
- [[mri_synthseg]] — contrast-agnostic segmentation (does not require T1w)
- [[mri_synthmorph]] — contrast-agnostic registration
- [[mri_convert]] — format conversion

## Confidence and Gaps

Python source and model file names read directly. Architecture description from published paper. Confidence is **high** for flags and general behaviour.

> [!gap] Flipping augmentation
> The `--disable_flipping` flag suggests test-time flipping augmentation (TTA) is used by default. Details of how flipping is averaged are not documented in the source.
