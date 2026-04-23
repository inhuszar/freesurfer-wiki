---
title: "mri_segment_thalamic_nuclei_dti_cnn"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_segment_thalamic_nuclei_dti_cnn/mri_segment_thalamic_nuclei_dti_cnn"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment_hypothalamic_subunits]]"
  - "[[mri_ca_label]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Specific thalamic nuclei label IDs in the output are not listed in the source excerpt."
  - "CNN architecture details are not exposed in the argument parser."
tags:
  - segmentation
  - deep-learning
  - thalamus
  - DTI
  - diffusion-MRI
  - tensorflow
  - subcortical
---

# mri_segment_thalamic_nuclei_dti_cnn

## Summary

`mri_segment_thalamic_nuclei_dti_cnn` segments thalamic nuclei from a combination of T1-weighted MRI, fractional anisotropy (FA), and principal diffusion direction (V1) maps using a convolutional neural network (CNN). The output is a 0.7 mm isotropic thalamic nuclei segmentation. The tool requires both structural and diffusion MRI inputs that are co-registered in physical (header) space.

## Source Information

- **Language:** Python
- **Source file:** `mri_segment_thalamic_nuclei_dti_cnn/mri_segment_thalamic_nuclei_dti_cnn`
- **Framework:** TensorFlow / Keras
- **Key dependencies:** `surfa`, `nibabel`, `numpy`, `scipy`, `tensorflow`

## Purpose and Context

Individual thalamic nuclei (e.g., VPL, MD, LP, LGN) are extremely difficult to delineate on T1-alone MRI due to poor intra-thalamic contrast. DTI-derived FA and principal eigenvector (V1) images provide microstructural information that distinguishes nuclear boundaries. This tool uses a multimodal CNN trained on histology-guided labels to provide reliable automated thalamic parcellation.

## Inputs

**Subject mode (`--s`):**
- A subject processed through `recon-all` and `trac-all -prep`.
- The tool automatically locates T1 and diffusion-derived volumes in the subject directory.

**Manual mode:**
- `--t1 <file>`: T1 image(s). Must be registered to FA in physical coordinates (no resampling).
- `--aseg <file>`: ASEG segmentation registered to FA.
- `--fa <file>`: Fractional anisotropy map.
- `--v1 <file>`: Principal diffusion direction (V1) map.
- `--lta <file>`: Optional LTA transform from T1 to FA space.
- `--lta_inv <file>`: Optional inverse LTA (FA to T1).

## Outputs

- **Segmentation volume** (`--o`): 0.7 mm isotropic thalamic nuclei segmentation.
- **Posteriors** (`--post`): Optional per-class posterior probability maps.
- **Volume table** (`--vol`): Optional CSV file with volumes for all structures and all subjects.

## Mathematical Foundations

The multimodal CNN takes concatenated T1, FA, and V1 volumes (aligned to a common space) and predicts per-voxel posteriors over thalamic nucleus classes:

$$
p(\text{nucleus}_k | T1(x), FA(x), V1(x))
$$

Post-processing uses:
- Binary morphological operations (dilation, erosion, closing, fill holes) via `scipy.ndimage`
- Euclidean distance transform for spatial regularisation
- Connected-component analysis to remove isolated fragments

The final segmentation is:

$$
\text{seg}(x) = \arg\max_k p(\text{nucleus}_k | T1(x), FA(x), V1(x))
$$

The output is at 0.7 mm isotropic resolution to capture fine nuclear boundaries, interpolated from the native diffusion space.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--t1` | `<path>` | — | T1 image(s) registered to FA in physical coordinates |
| `--aseg` | `<path>` | — | ASEG segmentation(s) registered to FA |
| `--fa` | `<path>` | — | FA image(s) |
| `--v1` | `<path>` | — | V1 (principal direction) image(s) |
| `--s` | `<subj>` | — | Subject name in `$SUBJECTS_DIR` (FS + trac-all mode) |
| `--lta` | `<path>` | — | LTA transform from T1 to FA (optional) |
| `--lta_inv` | `<path>` | — | LTA transform from FA to T1 (optional) |
| `--o` | `<path>` | — | Output segmentation file/folder |
| `--vol` | `<file>` | — | Output CSV with structure volumes |
| `--post` | `<path>` | — | Output posterior file/folder |
| `--threads` | `<int>` | 1 | Number of CPU threads |
| `--cpu` | — | off | Force CPU execution even if a GPU is available |
| `--version1` | — | off | Use model version 1.0 (default is 1.1, updated 2023-06-01) |
| `--model` | `<path>` | — | Override the default model file path |
| `--clean` | — | off | Remove auto-generated realigned input images after segmentation |
| `--help` / `-h` | — | — | Print usage and exit |

## Configuration Interactions

- `--s` (subject mode) automatically loads all required inputs. `--t1`, `--fa`, `--v1`, `--aseg` override individual inputs when using the subject mode.
- When inputs are folders (`--t1` is a folder), `--fa`, `--v1`, `--aseg`, and `--o` must also be folders.
- `--lta` and `--lta_inv` are optional; without them the tool assumes T1 and FA are already aligned in header space.

> [!assumption] Physical-space registration
> T1 and FA must be registered via header information (physical coordinates). Do NOT resample when registering. The tool applies the LTA transform internally in header space.

## Typical Use Cases

```bash
# Subject mode (requires recon-all + trac-all -prep)
mri_segment_thalamic_nuclei_dti_cnn --s subj001 --o subj001_thalamus.mgz

# Manual mode with explicit inputs
mri_segment_thalamic_nuclei_dti_cnn \
  --t1 T1_in_FA_space.mgz \
  --aseg aseg_in_FA_space.mgz \
  --fa FA.mgz \
  --v1 V1.mgz \
  --o thalamus_nuclei.mgz

# With volume table
mri_segment_thalamic_nuclei_dti_cnn --s subj001 --o seg.mgz --vol volumes.csv
```

## Pipeline Context

Not called by `recon-all`. Requires both `recon-all` (for T1 processing) and `trac-all -prep` (for diffusion preprocessing) to be completed first. Results can be analysed with [[mri_segstats]].

## Gotchas and Caveats

> [!gotcha] Registration must be in physical coordinates
> A critical constraint: the T1/ASEG must be registered to FA space **using the header** (physical coordinates), not by resampling. Running `mri_convert` with resampling would break the required alignment.

> [!gotcha] DTI data required
> This tool cannot operate on T1-only data. Unlike [[mri_segment_hypothalamic_subunits]], it fundamentally requires FA and V1 maps from diffusion MRI.

> [!gotcha] GPU recommended
> Inference with TensorFlow is computationally intensive. Use a GPU-enabled environment for reasonable runtime.

## Related Tools

- [[mri_segment_hypothalamic_subunits]] — CNN segmentation of hypothalamic subunits
- [[mri_ca_label]] — atlas-based subcortical segmentation (T1-only)
- [[mri_segstats]] — compute statistics from segmentation volumes

## Confidence and Gaps

**Confident (from source):** All flags, physical-coordinate registration requirement, multimodal T1+FA+V1 inputs, 0.7 mm isotropic output, scipy post-processing.

**Uncertain:** Specific thalamic nucleus label IDs; CNN architecture.

> [!gap] Label IDs
> The specific thalamic nucleus label integers in the output segmentation are not listed in the source. Consult `$FREESURFER_HOME/FreeSurferColorLUT.txt` or the FreeSurfer wiki for the thalamic nucleus label scheme.
