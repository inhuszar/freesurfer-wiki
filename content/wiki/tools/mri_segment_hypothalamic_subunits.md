---
title: "mri_segment_hypothalamic_subunits"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_segment_hypothalamic_subunits/mri_segment_hypothalamic_subunits"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment_thalamic_nuclei_dti_cnn]]"
  - "[[mri_ca_label]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Name or architecture of the internal Keras model is not exposed in the argument parser."
  - "Specific hypothalamic subunit label IDs are not listed in the source excerpt."
tags:
  - segmentation
  - deep-learning
  - hypothalamus
  - tensorflow
  - subcortical
---

# mri_segment_hypothalamic_subunits

## Summary

`mri_segment_hypothalamic_subunits` is a Python-based deep-learning tool that segments hypothalamic subunits from T1-weighted MRI. It can operate in two modes: (1) **FreeSurfer mode** — running on subjects that have already been processed with `recon-all`; and (2) **standalone T1 mode** — running on raw T1 scans approximately 1 mm isotropic. It uses a TensorFlow/Keras CNN model and outputs segmentation volumes in the subject's `mri/` folder.

## Source Information

- **Language:** Python
- **Source file:** `mri_segment_hypothalamic_subunits/mri_segment_hypothalamic_subunits`
- **Framework:** TensorFlow / Keras
- **Key dependencies:** `surfa`, `nibabel`, `numpy`, `scipy`, `tensorflow`

## Purpose and Context

The hypothalamus is a small, complex deep brain structure involved in autonomic regulation, sleep, and neuroendocrine function. Its subunits are difficult to segment reliably with atlas-based methods due to poor MRI contrast. This tool provides a CNN-based alternative.

Outputs are stored alongside `aseg.mgz` and can be analysed with [[mri_segstats]].

## Inputs

**FreeSurfer mode (`--s`):**
- Named subject(s) in `$SUBJECTS_DIR` that have been processed with `recon-all`.

**Standalone T1 mode (`--i`):**
- One or more T1-weighted MRI files (path to a file or a folder of files), approximately 1 mm isotropic.

## Outputs

- **Segmentation volume**: Written to `<subjects_dir>/<subject>/mri/` (FS mode) or to `--o` path (T1 mode). Label integers correspond to hypothalamic subunit IDs.
- **Posteriors** (`--write_posteriors` / `--post`): Optional per-class probability maps.
- **Resampled image** (`--resample`): Optional resampled T1 used internally.

## Mathematical Foundations

The tool uses a **convolutional neural network** trained on manually labelled T1 datasets to predict per-voxel posterior probabilities for each hypothalamic subunit label. Post-processing includes:

- Gaussian smoothing (`scipy.ndimage.gaussian_filter`)
- Binary dilation/erosion for morphological regularisation
- Euclidean distance transform (`scipy.ndimage.distance_transform_edt`) for spatial constraints
- Connected-component labelling (`scipy.ndimage.label`) for isolated region removal

The network outputs are passed through a softmax layer producing posterior probabilities $p(\text{label}_k | x)$ for each voxel $x$. The final segmentation is the argmax:

$$
\text{seg}(x) = \arg\max_k p(\text{label}_k | x)
$$

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--s` | `[<subj>...]` | — | Subject name(s) in `$SUBJECTS_DIR` (FS mode) |
| `--sd` | `<dir>` | `$SUBJECTS_DIR` | Override subjects directory |
| `--write_posteriors` | — | off | Save posterior probability maps (FS mode) |
| `--i` | `<path>` | — | Input T1 image or folder (T1 mode) |
| `--o` | `<path>` | — | Output segmentation file or folder (T1 mode) |
| `--post` | `<path>` | — | Output posterior file(s) (T1 mode) |
| `--resample` | `<path>` | — | Write resampled T1 image(s) (T1 mode) |
| `--threads` | `<int>` | 1 | Number of CPU threads |
| `--cpu` | — | off | Force CPU usage (disable GPU) |
| `--vol` | `<path>` | — | (T1 mode, optional) Override the default input volume path (alternative to `--i`) |
| `--crop` | `<x1> <x2> <y1> <y2> <z1> <z2>` | — | (T1 mode, optional) Crop bounding box indices applied before segmentation |
| `--help`<br>`-h` | — | — | Print usage and exit |

## Configuration Interactions

- `--s` and `--i`/`--o` are mutually exclusive (FS mode vs. T1 mode). Specifying both causes undefined behaviour.
- `--write_posteriors` applies to FS mode; `--post` is the T1 mode equivalent.
- If `--s` is specified with no arguments, the tool processes all subjects found in `$SUBJECTS_DIR`.
- `--sd` overrides the `SUBJECTS_DIR` environment variable.

## Typical Use Cases

```bash
# FreeSurfer mode: run on one subject
mri_segment_hypothalamic_subunits --s subj001

# FreeSurfer mode: run on multiple subjects
mri_segment_hypothalamic_subunits --s subj001 subj002 subj003

# FreeSurfer mode: all subjects in SUBJECTS_DIR
mri_segment_hypothalamic_subunits --s

# Standalone T1 mode
mri_segment_hypothalamic_subunits --i T1.mgz --o hypothalamus_seg.mgz

# With posteriors
mri_segment_hypothalamic_subunits --i T1.mgz --o hypothalamus_seg.mgz --post posteriors.mgz
```

## Pipeline Context

Not called by `recon-all`. Run as a post-`recon-all` step. Results can be analysed with [[mri_segstats]]. See also [[mri_segment_thalamic_nuclei_dti_cnn]] for a related CNN-based deep structure segmentation tool.

## Gotchas and Caveats

> [!gotcha] GPU/CPU compatibility
> The tool uses TensorFlow. GPU availability significantly speeds up inference. Use `--cpu` on systems without CUDA support to avoid GPU detection errors.

> [!gotcha] Input resolution
> The tool expects approximately 1 mm isotropic T1 images. Non-isotropic inputs may produce degraded results.

> [!gotcha] recon-all prerequisite
> In FreeSurfer mode (`--s`), `recon-all` must have been run successfully. The tool reads files from the subject's `mri/` directory.

> [!assumption] T1 contrast
> The CNN was trained on T1-weighted images. T2-weighted or FLAIR inputs are not supported and will produce erroneous results.

## Related Tools

- [[mri_segment_thalamic_nuclei_dti_cnn]] — CNN-based thalamic nuclei segmentation
- [[mri_ca_label]] — atlas-based subcortical segmentation
- [[mri_segstats]] — compute statistics from segmentation volumes

## Confidence and Gaps

**Confident (from source):** Both modes, all flags, TensorFlow/Keras framework, scipy post-processing steps.

**Uncertain:** Specific hypothalamic subunit labels and their IDs; model architecture details.

> [!gap] Label IDs
> The source excerpt does not list the specific hypothalamic subunit label integers. Consult `$FREESURFER_HOME/FreeSurferColorLUT.txt` for the label IDs used in the output segmentation.
