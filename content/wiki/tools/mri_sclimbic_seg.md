---
title: "mri_sclimbic_seg"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_sclimbic_seg/mri_sclimbic_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mri_convert]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact label set (which limbic structures) not enumerated here — check the model's colour table."
  - "Model architecture details not documented (TensorFlow/Keras model)."
tags:
  - segmentation
  - deep-learning
  - limbic
  - subcortical
  - python
---

# mri_sclimbic_seg

## Summary

`mri_sclimbic_seg` segments subcortical limbic structures from T1-weighted MRI using a deep-learning model implemented in TensorFlow. It can operate on individual image files or on complete FreeSurfer subject directories, and produces volumetric segmentations, optional posterior probability maps, and label volume statistics.

## Source Information

- **Language:** Python
- **Source file:** `mri_sclimbic_seg/mri_sclimbic_seg` (Python script, no `.py` extension)
- **Dependencies:** TensorFlow, numpy, surfa, scipy

## Purpose and Context

Traditional atlas-based subcortical segmentation (e.g., `mri_ca_label`, `mri_segment`) relies on probabilistic atlases trained on manually labelled data. `mri_sclimbic_seg` uses a trained convolutional neural network to directly predict limbic structure labels from T1 image intensities, producing faster and potentially more accurate segmentations of limbic regions (e.g., amygdala, hippocampal subfields, fornix, thalamic nuclei). The tool integrates with both standalone image processing and FreeSurfer subject directories.

## Inputs

Two modes are supported:

**Image mode:**

| Flag | Description |
|------|-------------|
| `--i <file/dir>` | Input T1-w image or directory of images |
| `--o <file/dir>` | Output segmentation file or directory |

**Subject mode:**

| Flag | Description |
|------|-------------|
| `--s [<subj1> <subj2> ...]` | FreeSurfer subjects (uses SUBJECTS_DIR); no args = process all |
| `--sd <dir>` | Override SUBJECTS_DIR |

## Outputs

| Output | Description |
|--------|-------------|
| Segmentation file | Volumetric label image with limbic structure indices |
| `--write_posteriors` | Per-label posterior probability maps |
| `--write_volumes` | Comma-separated volume statistics file |
| `--write_qa_stats` | QA statistics (z-scores and confidence values) |

In subject mode, outputs are written to `$SUBJECTS_DIR/<subject>/mri/` and `$SUBJECTS_DIR/<subject>/stats/`.

## Mathematical Foundations

The segmentation is performed by a convolutional neural network trained on manually labelled T1 images. The network outputs a per-voxel probability distribution over $K$ label classes:

$$
p(y_v = k \mid \mathbf{I}) \quad k \in \{0, 1, \ldots, K-1\}
$$

The final segmentation assigns:

$$
\hat{y}_v = \arg\max_k \; p(y_v = k \mid \mathbf{I})
$$

Input intensities are normalised using percentile-based scaling (default percentile, or `--percentile` for custom).

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `--i <file/dir>` | Input image(s) | required (image mode) |
| `--o <file/dir>` | Output file/dir | required (image mode) |
| `--s [subjects...]` | Subject list | required (subject mode) |
| `--sd <dir>` | SUBJECTS_DIR override | env var |
| `--conform` | Resample to 1mm isotropic before inference | off |
| `--etiv` | Include eTIV in stats | off (on in subject mode) |
| `--tal <file/suffix>` | Talairach XFM for eTIV estimation | — |
| `--write_posteriors` | Save posterior probability maps | off |
| `--write_volumes` | Save volumetric stats | off (on in subject mode) |
| `--write_qa_stats` | Save QA stats | off |
| `--exclude <id...>` | Exclude label IDs from stats | [853] (AntCom) |
| `--keep_ac` | Keep anterior commissure in stats | off |
| `--vox-count-volumes` | Use discrete voxel count for volumes | off |
| `--model <file>` | Alternative model weights | default model |
| `--ctab <file>` | Alternative colour table | default ctab |
| `--population-stats <file>` | Alternative population volume stats | default |
| `--threads <n>` | Number of CPU threads | 1 |
| `--features <n>` | Number of model features | 24 |
| `--7T` | Preprocess for 7T (sets percentile=99.9) | off |
| `--percentile <val>` | Intensity normalisation percentile | default |
| `--cuda-device <id>` | GPU device for inference | CPU |
| `--output-base <str>` | Output filename base string | `sclimbic` |
| `--fov <n>` | Field of view (voxels) | 160 |
| `--nchannels <n>` | Input channels | 1 |
| `--logfile <file>` | Log file path | `mri_sclimbic.log` |
| `--no-cite-sclimbic` | Suppress citation printout at the end | off (citation printed by default) |
| `--debug` | Debug logging | off |
| `--vmp` | Print vmpeak at end | off |

## Configuration Interactions

- `--i` and `--s` are mutually exclusive. Using both causes a fatal error.
- `--etiv` is automatically enabled when `--tal` is specified.
- In subject mode, `--write_volumes` and `--etiv` are enabled by default.
- Anterior commissure (label 853) is automatically excluded from stats unless `--keep_ac` is set.
- `--7T` is a shorthand that sets `--percentile 99.9` to handle the different intensity distribution of 7T images.
- `--cuda-device -1` forces CPU use. Setting `CUDA_VISIBLE_DEVICES=-1` in the environment has the same effect.

> [!gotcha] TensorFlow import is deferred
> TensorFlow is not imported until needed to allow fast command-line parsing. If the TF environment is misconfigured, the error will appear only at inference time, not at startup.

## Typical Use Cases

```bash
# Segment a single T1 image
mri_sclimbic_seg --i T1.mgz --o sclimbic_seg.mgz

# Process multiple FreeSurfer subjects
mri_sclimbic_seg --s bert ernie alice

# Process all subjects in SUBJECTS_DIR
mri_sclimbic_seg --s

# GPU inference
mri_sclimbic_seg --i T1.mgz --o seg.mgz --cuda-device 0

# Save posteriors and QA stats
mri_sclimbic_seg --i T1.mgz --o seg.mgz \
    --write_posteriors --write_qa_stats
```

## Pipeline Context

Not part of the standard `recon-all` pipeline but can be run on subjects after `recon-all` completes. Complements `recon-all`'s subcortical segmentation (`mri_ca_label`) with a focus on limbic structures.

## Gotchas and Caveats

> [!gotcha] Requires FreeSurfer home
> `FREESURFER_HOME` must be set. The script checks for it at startup and fails fatally if absent.

> [!gotcha] Anterior commissure excluded by default
> Label 853 (anterior commissure) is silently excluded from volume statistics unless `--keep_ac` is explicitly provided. This is a design decision to reduce false positives in the stats.

> [!gotcha] GPU memory
> Running on GPU requires sufficient VRAM for the model. CPU fallback is supported but may be slow for large batches.

> [!gotcha] Subject mode output paths
> In subject mode, output paths are automatically constructed. The `--output-base` flag controls the filename prefix (default `sclimbic`), affecting filenames like `sclimbic_seg.mgz`, `sclimbic_vols.stats`.

## Related Tools

- [[mri_ca_label]] — atlas-based subcortical segmentation
- [[mri_binarize]] — for post-processing segmentation masks

## Confidence and Gaps

**Confident:** Full flag set, I/O modes, and key behaviours confirmed from complete Python source code.

> [!gap] Label set
> The specific limbic structures segmented (label IDs and names) depend on the embedded colour table in the model. These are not enumerated in this page. Run `mri_sclimbic_seg --ctab` or inspect the output segmentation with Freeview to see the full label set.

> [!gap] Model architecture
> The neural network architecture (number of layers, convolution sizes, etc.) is defined in the model weights file and not accessible from the script alone.
