---
title: "mri_super_synth"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_super_synth/SuperSynth/SuperSynth/utils.py"
  - "mri_super_synth/SuperSynth/SuperSynth/frugal_models.py"
  - "mri_super_synth/SuperSynth/SuperSynth/__init__.py"
  - "mri_super_synth/SuperSynth/scripts/inference.py"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthsr]]"
  - "[[mri_synthseg]]"
  - "[[mri_synthstrip]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "SuperSynth model architecture (frugal_models.py) not read in detail."
  - "Relationship to SynthSR unclear — whether this supersedes or supplements it."
tags:
  - mri
  - super-resolution
  - synthesis
  - deep-learning
  - Python
---

# mri_super_synth

## Summary

`mri_super_synth` is a deep learning-based tool for super-resolution synthesis of brain MRI. It takes a low-resolution or anisotropic MRI scan and produces a synthesized high-resolution isotropic output using a trained neural network model. The tool is implemented in Python using the SuperSynth framework, which employs "frugal" (computationally efficient) models for inference.

## Source Information

- **Language:** Python
- **Source file(s):** 
  - `mri_super_synth/SuperSynth/scripts/inference.py` — main inference entry point
  - `mri_super_synth/SuperSynth/SuperSynth/frugal_models.py` — model architecture
  - `mri_super_synth/SuperSynth/SuperSynth/utils.py` — utility functions
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_super_synth`
- **Atlas:** `mri_super_synth/SuperSynth/atlas/MNI_atlas_sym.nii.gz`, `atlas.qc_seg.nii.gz`

## Purpose and Context

Many clinical and research MRI acquisitions are not isotropic 1 mm³ — they may have thick slices, anisotropic voxels, or reduced resolution. Standard FreeSurfer processing assumes isotropic 1 mm³ T1 input; anisotropic data can produce poor surface reconstructions. `mri_super_synth` addresses this by synthesizing a high-resolution isotropic volume from the input that can then be fed into standard processing pipelines.

The tool includes a pre-bundled MNI symmetric atlas and a QC segmentation atlas for use during inference.

> [!gap] Relationship to mri_synthsr
> [[mri_synthsr]] also performs MRI synthesis/super-resolution. The precise difference in architecture, training data, and intended use cases between `mri_super_synth` and `mri_synthsr` is not clear without reading both tools' documentation.

## Inputs

### Required Inputs

- Input MRI volume (`--i`) in any format supported by FreeSurfer/NiBabel, or a CSV file with `input,output,mode` triplets for batch processing.
- Model checkpoint file (`--model_file`): the `.pth` file for the trained SuperSynth network.

### Input Assumptions

> [!assumption] MRI contrast
> Like similar synthesis tools (SynthSR, SynthSeg), the model is likely contrast-agnostic due to training data augmentation. However, this is not confirmed from source.

## Outputs

### Files Created

- Synthesized high-resolution output volume (likely in MGZ or NIfTI format).

> [!gap] Output format not confirmed
> Output format(s) not verified from source.

## Mathematical Foundations

The tool uses "frugal models" (defined in `frugal_models.py`), which are computationally efficient neural network architectures for medical image synthesis. These are likely based on or similar to U-Net-style convolutional networks trained to map low-resolution inputs to high-resolution outputs.

> [!gap] Model architecture
> `frugal_models.py` was not read. The exact network architecture (U-Net, VoxelMorph-based, etc.) and training methodology are unknown.

## Configuration Options

Flags are parsed by `mri_super_synth/SuperSynth/scripts/inference.py` using Python `argparse`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | file | required | Input image to analyse, or path to a CSV file containing `input,output,mode` triplets for batch processing. |
| `--o` | dir | — | Output directory (ignored when `--i` points to a CSV file). |
| `--mode` | string | — | Segmentation mode: `invivo`, `cerebrum`, `left-hemi`, `right-hemi`, or `exvivo`. Ignored when `--i` is a CSV file. Required in single-file mode. |
| `--model_file` | file | required | Path to the model checkpoint `.pth` file. |
| `--device` | string | (auto) | Compute device: `cpu` or `cuda`. Defaults to `cuda` if a GPU is available, otherwise `cpu`. |
| `--sharpen_synths` | — | off | Apply unsharp masking to sharpen the synthesised 1 mm isotropic T1/T2/FLAIR output. |
| `--test_time_flipping` | — | off | Enable left-right flipping for test-time augmentation (averages predictions across the original and flipped image). |
| `--threads` | int | -1 | Number of CPU cores to use. `-1` uses all available cores (default). |

> [!note] Noise tokens filtered from audit
> The audit also reported `--o/--mode` as a missing flag. This is not a real flag; it is a combined token extracted from the help text explaining that both `--o` and `--mode` are ignored in CSV batch mode. Both `--o` and `--mode` are separate flags documented above.

## Typical Use Cases

```bash
# Single-file synthesis in invivo mode
mri_super_synth --i input_lowres.mgz --o output_dir/ \
  --mode invivo --model_file /path/to/model.pth

# Batch mode via CSV (columns: input,output,mode)
mri_super_synth --i batch_list.csv --model_file /path/to/model.pth

# Force CPU execution
mri_super_synth --i input.mgz --o out/ --mode invivo \
  --model_file model.pth --device cpu
```

## Pipeline Context

Not part of standard `recon-all`. Used as a preprocessing step for processing non-standard resolution MRI in standard pipelines, or as a research tool.

## Gotchas and Caveats

> [!gotcha] Python and deep learning dependencies
> This tool requires a Python environment with PyTorch or TensorFlow (verify from `frugal_models.py`) and associated scientific Python libraries. Dependency issues are common with deep learning tools.

## Known Issues

- [[1438]] — the soft-segmentation postprocessing loop at
  `inference.py:277–279` starts at `l = 0` and overwrites the
  preceding `seg[0][~Mdilated] = 1` assignment, so `seg` no longer
  sums to 1 outside the dilated brain mask. Latent (no user-facing
  output depends on the post-processed `seg` in the default pipeline),
  but the fix is a one-character change (`range(1, seg.shape[0])`).
  Verdict: plausible, open upstream.

## Related Tools

- [[mri_synthsr]] — MRI synthesis tool (SynthSR); may overlap in functionality
- [[mri_synthseg]] — segmentation synthesis tool
- [[mri_synthstrip]] — skull stripping using synthesis

## Confidence and Gaps

Confidence is **medium** for tool purpose, **high** for command-line interface (read directly from `inference.py`).

> [!gap] Distinguish from mri_synthsr
> Document the precise relationship and recommended use cases for `mri_super_synth` vs. `mri_synthsr`.
