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
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
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

`mri_synthsr_hyperfine` generates a synthetic 1mm isotropic MP-RAGE from a pair of T1 and T2 Hyperfine scans acquired at native 1.5×1.5×5mm axial resolution. It is a standalone Python script (not a wrapper around [[mri_synthsr]]) that uses its own dedicated model trained specifically for paired low-field T1/T2 inputs.

## Source Information

- **Language:** Python (standalone script)
- **Source file:** `mri_synthsr/mri_synthsr_hyperfine`
- **Model weights:** `$FREESURFER_HOME/models/synthsr_v10_210712_hyperfine.h5` (hardcoded; not overrideable via CLI)
- **Framework:** TensorFlow/Keras

## Purpose and Context

Low-field portable MRI systems (e.g., Hyperfine Swoop, 64 mT) produce images with significantly lower SNR and different contrast compared to clinical high-field scanners. This tool takes the paired T1 and T2 volumes from such a system — registered to each other in physical coordinates (do not resample when registering; alignment is achieved via image headers) — and produces a synthetic 1mm isotropic MP-RAGE.

Unlike [[mri_synthsr]], this tool requires both T1 and T2 inputs and uses a dedicated Hyperfine-specific model. The model weights are hardcoded and cannot be overridden from the command line.

## Inputs

| Flag | Argument | Description |
|------|----------|-------------|
| `--t1` | path | T1 image(s) at native 1.5×1.5×5mm axial resolution. Can be a single image file or a folder. |
| `--t2` | path | T2 image(s). Must be registered to the T1 in physical coordinates (via headers, not resampled). Must be a folder if `--t1` is a folder. |

## Outputs

| Flag | Argument | Description |
|------|----------|-------------|
| `--o` | path | Synthetic 1mm isotropic MP-RAGE output(s). Must be a folder if `--t1` is a folder. |

## Mathematical Foundations

The tool applies a 5-level U-Net (`nb_features=24`, `feat_mult=2`, `nb_conv_per_level=2`) that takes the concatenated T1 and T2 volumes (2-channel input) and produces a single-channel synthetic T1 output. Preprocessing resamples both inputs to 1mm isotropic, aligns to RAS orientation, normalises intensities, and pads to a shape divisible by 32. Postprocessing rescales intensities and realigns to the original T1 orientation.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--t1` | path | required | Input T1 image or folder |
| `--t2` | path | required | Input T2 image or folder (registered to T1) |
| `--o` | path | required | Output synthetic MP-RAGE or folder |
| `--threads` | N | 1 | Number of CPU threads |
| `--cpu` | (flag) | off | Force CPU inference (sets `CUDA_VISIBLE_DEVICES=-1`) |

> [!gotcha] No model override
> Unlike [[mri_synthsr]], the model file path is hardcoded in the script. There is no `--model`, `--lowfield`, or `--v1` flag. The model `synthsr_v10_210712_hyperfine.h5` is always used.

## Configuration Interactions

- Both `--t1` and `--t2` are required; the script will exit with a fatal error if either is absent.
- If `--t1` is a folder, `--t2` must also be a folder containing the same number of images.
- Folder-mode outputs are named by appending `_synthsr` to the input stem.

## Typical Use Cases

**Convert a Hyperfine Swoop T1/T2 pair to synthetic MP-RAGE:**
```bash
mri_synthsr_hyperfine --t1 hyperfine_T1.nii.gz --t2 hyperfine_T2.nii.gz --o synthetic_T1.mgz
```

**Then run recon-all:**
```bash
recon-all -i synthetic_T1.mgz -s subject_lowfield -all
```

**Process a folder of paired scans:**
```bash
mri_synthsr_hyperfine --t1 /data/t1s/ --t2 /data/t2s/ --o /data/synthsr_out/
```

## Pipeline Context

Used as a preprocessing step before `recon-all` for Hyperfine low-field MRI data. The T2 input must be registered to the T1 in physical space (using image headers, not resampled). After running, pass the synthetic MP-RAGE to `recon-all -i`.

## Gotchas and Caveats

> [!gotcha] T2 must be registered to T1 via headers
> The T2 image must be co-registered to the T1 using header information only. Do NOT resample the T2 when registering — the script handles resampling internally via `resample_volume_like`. See the FreeSurfer wiki for registration instructions.

> [!gotcha] Designed for 1.5×1.5×5mm Hyperfine input
> The model was trained on 1.5×1.5×5mm axial acquisitions. Using images at substantially different resolution or orientation may degrade output quality.

> [!gotcha] Not a wrapper around mri_synthsr
> Despite the similar name, this is a fully independent script with its own model, preprocessing pipeline, and CLI. The flags --lowfield, --v1, --model, --ct, --disable_flipping, --disable_sharpening, and --i from `mri_synthsr` do not exist here.

## Related Tools

- [[mri_synthsr]] — single-input super-resolution for standard MRI; different model and CLI
- [[mri_synthseg]] — contrast-agnostic segmentation

## Confidence and Gaps

Confidence is **high** — the full source code was read. The CLI, model path, preprocessing, and network architecture are all confirmed from source.

> [!gap] Training data details
> The citation in the script (Iglesias et al., Radiology, 2022) covers the Hyperfine SynthSR method but the exact training cohort and data augmentation details are not documented in the script itself.
