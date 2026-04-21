---
title: "mri_synthsr_hyperfine"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_synthsr/mri_synthsr_hyperfine"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthsr]]"
  - "[[mri_synthseg]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - super-resolution
  - synthesis
  - deep-learning
  - low-field-mri
  - hyperfine
---

# mri_synthsr_hyperfine

## Summary

`mri_synthsr_hyperfine` is a thin wrapper around [[mri_synthsr]] that automatically selects the low-field MRI model (`--lowfield`). It is designed for scans acquired with low-field MRI systems such as the Hyperfine Swoop (64 mT), producing a synthetic 1mm isotropic T1w image from low-SNR, low-resolution low-field acquisitions.

## Source Information

- **Language:** Python (shell wrapper)
- **Source file:** `mri_synthsr/mri_synthsr_hyperfine` (a second Python script, not a symlink)
- **Model weights:** `$FREESURFER_HOME/models/synthsr_lowfield_v20_230130.h5`
- **Framework:** TensorFlow/Keras (same as `mri_synthsr`)

## Purpose and Context

Low-field portable MRI systems produce images with significantly lower SNR, lower resolution, and different contrast characteristics compared to clinical high-field scanners. The SynthSR model for standard scans performs poorly on low-field data. A dedicated model was trained on paired high-field T1w and simulated low-field inputs.

`mri_synthsr_hyperfine` exposes this model without requiring the user to remember the `--lowfield` flag.

## Inputs

Same as [[mri_synthsr]]:
- `--i`: Input low-field MRI volume or folder of volumes

## Outputs

Same as [[mri_synthsr]]:
- `--o`: Synthetic 1mm isotropic MP-RAGE volume

## Mathematical Foundations

Identical to [[mri_synthsr]] — super-resolution and contrast synthesis via a trained U-Net, using the low-field-specific model weights `synthsr_lowfield_v20_230130.h5`.

## Configuration Options

Identical to [[mri_synthsr]]. The `--lowfield` model is automatically selected; `--v1` and specifying a custom `--model` override this.

| Flag | Argument | Description |
|---|---|---|
| `--i` | path | Input low-field image or folder |
| `--o` | path | Output synthetic T1w |
| `--ct` | (flag) | Clip to Hounsfield [0, 80] |
| `--disable_sharpening` | (flag) | Disable unsharp masking |
| `--disable_flipping` | (flag) | Disable test-time flipping augmentation |
| `--threads` | N | CPU threads (default: 1) |
| `--cpu` | (flag) | Force CPU |
| `--model` | h5file | Override model file |

## Configuration Interactions

See [[mri_synthsr]] — identical.

## Typical Use Cases

**1. Convert a Hyperfine Swoop scan to synthetic T1w:**
```bash
mri_synthsr_hyperfine --i hyperfine_scan.nii.gz --o synthetic_T1.mgz
```

**2. Then run recon-all:**
```bash
recon-all -i synthetic_T1.mgz -s subject_lowfield -all
```

## Pipeline Context

Same as [[mri_synthsr]]: used as a preprocessing step before `recon-all` for low-field MRI data.

## Gotchas and Caveats

> [!gotcha] Low-field model only
> This wrapper always uses the low-field model. For standard high-field scans, use [[mri_synthsr]] instead. Using the low-field model on high-field scans may degrade output quality.

## Related Tools

- [[mri_synthsr]] — general-purpose SynthSR (calls this with `--lowfield`)
- [[mri_synthseg]] — contrast-agnostic segmentation

## Confidence and Gaps

This tool is a wrapper around [[mri_synthsr]]; documentation follows from that page. Confidence is **high**.
