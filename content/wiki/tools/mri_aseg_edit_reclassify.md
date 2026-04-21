---
title: "mri_aseg_edit_reclassify"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_aseg_edit_reclassify/mri_aseg_edit_reclassify.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_aseg_edit_train]]"
  - "[[mri_ca_label]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Attic status — availability in installed binary uncertain"
  - "SVM model file format not documented"
tags:
  - segmentation
  - SVM
  - machine-learning
  - aseg
---

# mri_aseg_edit_reclassify

## Summary

`mri_aseg_edit_reclassify` uses a pre-trained Support Vector Machine (SVM) classifier to automatically reclassify border voxels of a target anatomical label in an existing `aseg` segmentation. It is the inference companion to [[mri_aseg_edit_train]], which trains the SVM. The default target label is the left hippocampus (label 17), but this can be changed. Voxels on the label boundary that the SVM classifies as negative are relabeled as `Left_undetermined`.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_aseg_edit_reclassify/mri_aseg_edit_reclassify.cpp`
- **Original author:** Bruce Fischl

> [!gotcha] Attic status
> This tool is in the `attic/` directory. It may not be compiled or distributed in standard FreeSurfer 8.2.0 installations.

## Purpose and Context

Manual correction of automated segmentations is labor-intensive. This tool attempts to automate the reclassification of segmentation boundary voxels using an SVM trained on examples of correct and incorrect boundary labeling. The SVM operates on multi-scale intensity features computed around each border voxel, enabling the classifier to leverage local texture and gradient information.

The workflow requires:
1. Training: Use [[mri_aseg_edit_train]] on subjects with manual corrections to produce an SVM model file.
2. Inference: Use this tool (`mri_aseg_edit_reclassify`) to apply the model to new subjects.

## Inputs

Positional arguments (in order):
1. `<aseg_in>` — input aseg segmentation volume
2. `<norm>` — normalized T1 volume (e.g., `norm.mgz`)
3. `<svm_file>` — trained SVM model file from [[mri_aseg_edit_train]]
4. `<aseg_out>` — output corrected aseg volume

## Outputs

- A single aseg volume with border voxels of the target label reclassified. Voxels where the SVM outputs a negative decision value are changed to `Left_undetermined` (label index for undetermined).

## Mathematical Foundations

For each voxel $(x, y, z)$ on the boundary of the target label:

**Feature construction** at $N$ scales ($\sigma \in \{0, 0.5, 1.0, 2.0\}$) over a $3 \times 3 \times 3$ window:

For each scale $i$:
- Gaussian smoothed image: $G_i = G_{\sigma_i} * V_{\text{norm}}$
- Gradient: $\nabla G_i$ (Sobel operator)
- Laplacian: $\Delta G_i$
- Second directional derivative along y-axis: $\partial^2_{yy} G_i$
- Distance transform gradient: $\nabla d_{\text{target}}$

The full feature vector for the $3^3 = 27$ window locations × 4 scales × 4 channels gives:

$$
n_{\text{inputs}} = 3^3 \times N_{\text{scales}} \times (3 + 1) = 432
$$

**SVM classification:**
$$
\text{decision} = \mathbf{w}^T \mathbf{x} + b
$$

If $\text{decision} < 0$, the voxel is relabeled.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-T <label>` | int | 17 (Left_Hippocampus) | Target label to reclassify border voxels for |
| `--help` | flag | — | Print help |
| `--version` | flag | — | Print version |

## Configuration Interactions

Minimal interface: the four positional arguments are required. The only configurable parameter is the target label via `-T`.

## Typical Use Cases

**Reclassify hippocampus border voxels using a trained SVM:**
```bash
mri_aseg_edit_reclassify \
  $SUBJECTS_DIR/subject/mri/aseg.mgz \
  $SUBJECTS_DIR/subject/mri/norm.mgz \
  svm_hippocampus.model \
  $SUBJECTS_DIR/subject/mri/aseg_corrected.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Part of an experimental workflow for automated segmentation correction using SVMs trained on manually edited subjects.

## Gotchas and Caveats

> [!gotcha] Reclassification only removes voxels
> The SVM only relabels voxels as `Left_undetermined`; it does not reassign them to a different anatomical structure. To reassign, a subsequent [[mri_ca_label]] or [[mri_segment]] step would be needed.

> [!gotcha] Fixed window size
> The feature extraction window is hardcoded to $3 \times 3 \times 3$ (`WSIZE = 3`). There is no command-line option to change the spatial neighborhood.

> [!gotcha] Target label hardcoded
> The default target is label 17 (Left_Hippocampus) with source label Left_Hippocampus. Use `-T` to change. The source label in the training code is paired with this target, so the SVM model must have been trained for the same target label.

## Related Tools

- [[mri_aseg_edit_train]] — trains the SVM model used here
- [[mri_ca_label]] — the primary atlas-based segmentation tool
- [[mri_segment]] — white matter segmentation

## Confidence and Gaps

Source code fully read. Confidence is medium; attic status and lack of SVM model documentation create gaps.

> [!gap] SVM model format
> The SVM model file format (read by `SVMread()`) is not externally documented. The source references `svm.h` in the FreeSurfer include tree.
