---
title: "mri_exvivo_norm"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "exvivo/mri_exvivo_norm"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_exvivo_strip]]"
  - "[[mri_normalize]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Model architecture details not documented"
  - "Training data and normalization target (units) not specified"
tags:
  - ex-vivo
  - normalization
  - deep-learning
  - bias-field
---

# mri_exvivo_norm

## Summary

`mri_exvivo_norm` applies a deep learning-based intensity normalization to ex vivo MRI data (post-mortem brain tissue). It uses a hemisphere-specific TensorFlow/Keras model to predict a normalization field, which is smoothed and applied to the input volume. Iterative normalization rounds are supported. The tool is designed for ex vivo MRI where conventional in vivo normalization algorithms fail due to different tissue contrasts and acquisition protocols.

## Source Information

- **Source language:** Python
- **Source file:** `exvivo/mri_exvivo_norm`
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_exvivo_norm`
- **DL model:** `$FREESURFER_HOME/models/exvivo.norm.<hemi>.h5`
- **Dependencies:** TensorFlow, neurite (`ne`), surfa (`sf`), numpy

## Purpose and Context

Ex vivo MRI acquisitions have different intensity characteristics from in vivo scans: no blood perfusion, different contrast agents, different scanner protocols, and often severe intensity non-uniformity. Standard bias field correction tools (e.g., `mri_nu_correct.mni`) are not well-suited to ex vivo data. This tool provides a hemisphere-specific, learned normalization that is robust to ex vivo conditions.

## Inputs

- `-i / --invol <path>`: Input ex vivo MRI volume (required)
- `--hemi <lh|rh>`: Hemisphere to process (required); selects the corresponding model

## Outputs

- `-o / --outvol <path>`: Output normalized volume (required)
- `--pred <path>`: Optional — write the raw model prediction (normalization field) before applying
- `--norm <path>`: Optional — write the conformalized input to `norm.mgz`

## Mathematical Foundations

The normalization pipeline:

1. **Input conditioning:** Values above `--uthresh` are set to zero. The volume is shifted by its minimum and scaled by its 99th percentile, then clipped to $[0, 2]$.

2. **Volume conforming:** The input is conformed to the model's input shape with 1 mm voxels and LIA orientation using `mri_in.conform()` (surfa library).

3. **Model inference:** The model predicts a normalization field. The penultimate layer output (not the final layer) is used: `model = tf.keras.Model(model_in.inputs, [model_in.layers[-2].output])`.

4. **Bias field application:** The predicted field is smoothed with `--sigma` (default: 0.5 mm Gaussian) and divided from the input to normalize.

5. **Optional iterations:** Repeated `--nrounds` times with the normalized output as the new input.

6. **Optional mean matching:** `--norm_mean` rescales the output so its mean matches the input mean.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-i / --invol` | path | required | Input ex vivo volume |
| `-o / --outvol` | path | required | Output normalized volume |
| `--hemi` | `lh` or `rh` | required | Hemisphere (selects model) |
| `--pred` | path | none | Write raw model prediction |
| `--norm` | path | none | Write conformalized input |
| `--fv` | flag | off | Launch freeview after processing |
| `--norm_mean` | flag | off | Rescale output mean to match input mean |
| `--write_rounds` | flag | off | Write intermediate results after each round |
| `--uthresh` | float | 5000 | Threshold above which values are set to zero |
| `--sigma` | float | 0.5 | Sigma for Gaussian smoothing of bias field (mm) |
| `--nrounds` | int | 1 | Number of iterative normalization rounds |
| `--multichannel` | flag | off | Input has multiple channels |
| `--model` | path | none | Use alternative model file |
| `--wts` | path | none | Alternative model weights file |
| `--gpu` | string | none | GPU number (`-1` or unset → CPU) |

## Configuration Interactions

- `--hemi` selects the model (`exvivo.norm.lh.h5` or `exvivo.norm.rh.h5`). Must match the hemisphere being processed.
- `--model` overrides the default FREESURFER_HOME model path.
- `--gpu` enables GPU inference; without it the tool defaults to `/cpu:0`.
- `--nrounds > 1` with `--write_rounds` writes one output volume per round (useful for debugging convergence).
- `--sigma` controls how much the predicted normalization field is smoothed before application; a value of 0 means no smoothing.

## Typical Use Cases

```bash
# Normalize left hemisphere ex vivo MRI
mri_exvivo_norm -i exvivo_lh.mgz -o exvivo_lh_norm.mgz --hemi lh

# 3 rounds of iterative normalization
mri_exvivo_norm -i exvivo_lh.mgz -o exvivo_lh_norm.mgz --hemi lh --nrounds 3

# GPU-accelerated processing
mri_exvivo_norm -i exvivo_lh.mgz -o exvivo_lh_norm.mgz --hemi lh --gpu 0
```

## Pipeline Context

Not called by `[[wiki/pipelines/recon-all|recon-all]]`. Used in ex vivo MRI processing pipelines, typically before `[[mri_exvivo_strip]]` and other ex vivo-specific steps.

## Gotchas and Caveats

> [!gotcha] Hemisphere-specific model required
> Using the wrong hemisphere model (`--hemi lh` on an RH volume) may produce incorrect normalization. There is no automatic hemisphere detection.

> [!gotcha] Model uses penultimate layer output
> The code explicitly uses `model_in.layers[-2].output` rather than the model's final output. This is intentional but means the "predicted normalization" and the final layer output differ.

> [!gotcha] FREESURFER_HOME must be set
> Without `$FREESURFER_HOME`, model loading fails with a fatal error.

## Related Tools

- `[[mri_exvivo_strip]]` — ex vivo skull stripping (companion tool)
- `[[mri_normalize]]` — in vivo intensity normalization

## Confidence and Gaps

**High confidence:** all arguments and normalization pipeline confirmed from full source read.
