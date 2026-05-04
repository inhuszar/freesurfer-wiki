---
title: "mri_exvivo_strip"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "exvivo/mri_exvivo_strip"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_exvivo_norm]]"
  - "[[mri_watershed]]"
  - "[[mri_synthstrip]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Model architecture not documented"
  - "Border distance convention not fully confirmed"
tags:
  - ex-vivo
  - skull-stripping
  - deep-learning
  - brain-mask
---

# mri_exvivo_strip

## Summary

`mri_exvivo_strip` performs deep learning-based skull/tissue stripping on ex vivo MRI data. It uses a hemisphere-specific TensorFlow/Keras model to predict a distance-to-boundary map, then thresholds the result to produce a brain mask. The mask is applied to the input volume to produce the stripped output. This tool is the ex vivo counterpart to `[[mri_watershed]]` and `[[mri_synthstrip]]`.

## Source Information

- **Source language:** Python
- **Source file:** `exvivo/mri_exvivo_strip`
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_exvivo_strip`
- **DL model:** `$FREESURFER_HOME/models/exvivo.strip.<hemi>.h5`
- **Dependencies:** TensorFlow, neurite (`ne`), surfa (`sf`), numpy

## Purpose and Context

Ex vivo brain tissue samples are often embedded in fixative, surrounded by plastic containers, or accompanied by other non-brain tissue. Standard skull-stripping tools trained on in vivo data fail on these samples. This tool uses a learned model trained on ex vivo data to detect and mask out non-brain tissue.

## Inputs

- `-i / --invol <path>`: Input ex vivo MRI volume (required)
- `--hemi <lh|rh>`: Hemisphere to process (required); selects the corresponding model

## Outputs

- `-o / --outvol <path>`: Output skull-stripped volume (required)
- `--pred <path>`: Optional — write the raw model prediction (distance map)
- `--norm <path>`: Optional — write the conformalized input

## Mathematical Foundations

The pipeline:

1. **Input preprocessing:** Values above `--uthresh` are zeroed. Volume is shifted and clipped to $[0, 1]$.

2. **Volume conforming:** Input is conformed to $256 \times 256 \times 256$ at 1 mm, LIA orientation.

3. **Model inference:** The model predicts a signed distance-to-boundary field (or similar distance transform). The prediction is a single-channel volume with shape matching the input.

4. **Mask creation:** Voxels with prediction value $\le \text{border}$ are assigned to the interior (brain mask); others are exterior:
$$
\text{mask}(x) = \begin{cases} 1 & \text{if prediction}(x) \le \text{border} \\ 0 & \text{otherwise} \end{cases}
$$
Default `--border = 4`.

5. **Resampling:** The predicted mask is resampled to match the original input geometry using `mri_mask.resample_like(mri_in)`.

6. **Application:** The mask is multiplied by the (optionally zeroed above uthresh) input.

> [!gotcha] Volume size hardcoded at 256³
> The code contains commented-out shape attempts (`[192,160,192]`, `[192,160,160]`) before settling on `[256]*3`. The final active value is `vol_shape = [256]*3`.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-i / --invol` | path | required | Input ex vivo volume |
| `-o / --outvol` | path | required | Output stripped volume |
| `--hemi` | `lh` or `rh` | required | Hemisphere (selects model) |
| `--pred` | path | none | Write raw model prediction |
| `--norm` | path | none | Write conformalized input |
| `--fv` | flag | off | Launch freeview after processing |
| `--uthresh` | float | 5000 | Threshold above which values are zeroed before processing |
| `--border` | int | 4 | Distance threshold for interior/exterior classification |
| `--multichannel` | flag | off | Input has multiple channels |
| `--model` | path | none | Use alternative model file |
| `--wts` | path | none | Alternative model weights file |
| `--gpu` | string | none | GPU number (unset → CPU) |

## Configuration Interactions

- `--hemi` must match the hemisphere of the input; wrong hemisphere model will produce incorrect stripping.
- `--border` controls how aggressively the brain is stripped: higher values include more interior voxels, lower values are more conservative.
- `--gpu` enables GPU inference.
- `--model` overrides `$FREESURFER_HOME` model path.

## Typical Use Cases

```bash
# Strip ex vivo left hemisphere scan
mri_exvivo_strip -i exvivo_lh.mgz -o exvivo_lh_stripped.mgz --hemi lh

# Adjust border threshold for tighter strip
mri_exvivo_strip -i exvivo_lh.mgz -o exvivo_lh_stripped.mgz --hemi lh --border 2

# GPU processing
mri_exvivo_strip -i exvivo_lh.mgz -o exvivo_lh_stripped.mgz --hemi lh --gpu 0
```

## Pipeline Context

Not called by `[[wiki/pipelines/recon-all|recon-all]]`. Used in ex vivo MRI pipelines, typically after `[[mri_exvivo_norm]]`.

## Gotchas and Caveats

> [!gotcha] Hardcoded 256³ conforming
> The script contains leftover commented-out shape variants; the active conforming is to $256 \times 256 \times 256$.

> [!gotcha] FREESURFER_HOME must be set
> Required for model loading.

> [!gotcha] Border threshold is in prediction-space units
> The `--border` threshold applies to the model's output values (interpreted as a distance map). Meaning depends on the model's training objective.

## Related Tools

- `[[mri_exvivo_norm]]` — ex vivo intensity normalization (companion tool)
- `[[mri_watershed]]` — in vivo skull stripping
- `[[mri_synthstrip]]` — learning-based in vivo skull stripping

## Confidence and Gaps

**High confidence:** all arguments and stripping pipeline confirmed from full source read.
