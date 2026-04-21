---
title: "mri_pglands_seg"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_pglands_seg/mri_pglands_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[recon-all]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Model architecture details (neural network type not specified in main script)"
  - "Whether this tool is called by recon-all by default or must be run manually"
tags:
  - deep-learning
  - segmentation
  - pituitary
  - pineal
  - pytorch
---

# mri_pglands_seg

## Summary

`mri_pglands_seg` is a deep learning-based tool for segmenting the pituitary and pineal glands from T1-weighted MRI. It produces four volumetric labels: anterior pituitary (label 883), posterior pituitary (label 903), infundibulum (label 904), and pineal gland (label 900). The tool uses a PyTorch neural network and supports both standalone mode (arbitrary input paths) and FreeSurfer subject-directory mode.

## Source Information

- **Language:** Python
- **Source file:** `mri_pglands_seg/mri_pglands_seg`
- **Runtime dependencies:** PyTorch, NumPy, SciPy (`ndimage`), `surfa` (FreeSurfer Python library)
- **Hardware support:** CPU and CUDA GPU

## Purpose and Context

The pituitary and pineal glands are small subcortical structures not segmented by the standard FreeSurfer pipeline. `mri_pglands_seg` provides an automated segmentation of these four structures using a convolutional neural network trained on T1-weighted images. The tool integrates into the FreeSurfer subject directory structure when run in FreeSurfer mode (`--s`/`--sd`), automatically finding the appropriate input volumes and placing outputs in the subject's `mri/` directory.

> [!assumption] Input data assumption
> Expects a T1-weighted MRI volume as input. The model was trained on standard 1mm T1 images; performance on non-standard acquisitions is not guaranteed.

## Inputs

**Normal mode (`--i`):**
- One or more T1-weighted MRI volumes or a directory of images

**FreeSurfer mode (`--s`/`--sd`):**
- Subject IDs in a FreeSurfer subjects directory; the tool locates the appropriate T1 automatically

**Optional:** Pre-computed Talairach affine transform (`--tal`), MNI template transform (`--mni_template_transform`), QA transform (`--qa_transform`)

## Outputs

- **Segmentation volume:** A label volume containing:
  - 883: Pituitary anterior lobe
  - 903: Pituitary posterior lobe
  - 904: Infundibulum (pituitary stalk)
  - 900: Pineal gland
- **Optional:** Posterior probability maps (`--write_posteriors`), volume statistics (`--write_vol_stats`), QA statistics (`--write_qa_stats`)
- In FreeSurfer mode, output is written to `<subject>/mri/pglands_seg.mgz` by default

## Mathematical Foundations

The segmentation uses a deep convolutional neural network (CNN) implemented in PyTorch. The input image is cropped to a patch around the midline region (`--crop_patch_size`) to focus on the target structures. Intensity normalization uses a robust percentile normalization (`--robust_norm_percent`).

> [!gap] Network architecture
> The specific network architecture (U-Net, transformer, etc.) is implemented in the `pglands_seg` subdirectory/library but was not read. The main script only instantiates a `PGlandsSegmenter` class.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-i` / `--i` | `<file(s) or dir>` | Input T1 image(s) or directory (normal mode) |
| `-s` / `--s` | `<subject(s)>` | FreeSurfer subject ID(s) (FS mode) |
| `--sd` | `<dir>` | Subjects directory (overrides `SUBJECTS_DIR`) |
| `-o` / `--o` | `<file(s) or dir>` | Output segmentation path(s) or directory |
| `--outbase` | `<name>` | Output file basename (default determined by input) |
| `--model` | `<fname>` | Path to model weights file |
| `--lut` | `<fname>` | Custom lookup table for label colors |
| `--mni_template` | `<fname>` | MNI template volume for normalization |
| `--mni_template_transform` | `<fname>` | Affine transform to MNI space |
| `--tal` | `<fname>` | Talairach affine transform |
| `--qa_transform` | `<fname>` | QA warp transform |
| `--crop_patch_size` | `<int>` | Patch size for cropping around target region |
| `--center_crop` | (none) | Use center crop instead of adaptive crop |
| `--robust_norm_percent` | `<float>` | Percentile for robust intensity normalization |
| `--write_posteriors` | (none) | Write posterior probability maps |
| `--write_vol_stats` | (none) | Write volumetric statistics |
| `--write_qa_stats` | (none) | Write QA statistics |
| `--etiv` | (none) | Include eTIV in output statistics |
| `--use_cuda` | (none) | Use CUDA GPU if available (falls back to CPU) |

## Configuration Interactions

- `--i` and `--s` are mutually exclusive: one selects normal mode, the other selects FreeSurfer mode.
- `--sd` is only meaningful in FreeSurfer mode (`--s`).
- `--use_cuda` enables GPU acceleration but falls back to CPU silently if CUDA is not available.
- In FreeSurfer mode, output paths are determined automatically from the subject directory; `--o` overrides this with a user-specified directory.
- `--etiv` is automatically enabled in FreeSurfer mode (`include_etiv = True if pargs.etiv or mode == 'FS'`).

## Typical Use Cases

```bash
# Segment a single T1 image
mri_pglands_seg --i T1.mgz --o pglands_seg.mgz

# Run on a FreeSurfer subject
mri_pglands_seg --s subject01

# Run on multiple subjects with GPU
mri_pglands_seg --s subject01 subject02 subject03 --use_cuda

# Run on a subjects directory
mri_pglands_seg --sd /data/subjects/
```

## Pipeline Context

`mri_pglands_seg` is not part of the standard [[recon-all]] processing stream. It is a supplementary segmentation tool that must be run separately after standard recon-all processing.

> [!gap] Pipeline integration
> Whether this tool is intended to be run as part of a standard post-recon-all workflow or as an entirely independent analysis is not clear from the source alone.

## Gotchas and Caveats

> [!gotcha] FREESURFER_HOME must be set
> The script explicitly checks for `FREESURFER_HOME` at startup and exits with an error if it is not set. This applies even in normal mode.

> [!gotcha] CPU fallback is silent
> `--use_cuda` will silently fall back to CPU if CUDA is unavailable, rather than raising an error. This means a job intended for GPU may run on CPU without warning, which can be very slow.

> [!gotcha] Small structure segmentation
> The pituitary gland is approximately 10x13x6 mm, and the pineal gland is even smaller (5-8 mm diameter). Segmentation accuracy depends critically on image resolution and quality. Low-resolution or non-isotropic T1 images may produce unreliable results.

## Related Tools

- [[mri_segment]] — White-matter segmentation tool
- [[recon-all]] — Standard pipeline

## Confidence and Gaps

**High confidence:** Source language, label IDs, input modes, output structure, CUDA fallback, eTIV auto-enable, `FREESURFER_HOME` check.

**Medium confidence:** Model architecture details (implemented in a separate module).

> [!gap] Model and training details
> The `PGlandsSegmenter` class and the underlying model are implemented in `mri_pglands_seg/pglands_seg/` which was not read in detail.
