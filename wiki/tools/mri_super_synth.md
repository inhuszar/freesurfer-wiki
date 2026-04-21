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
last_agent_update: 2026-04-15
gaps:
  - "inference.py not read — exact command-line interface unknown."
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

- Input MRI volume in any format supported by FreeSurfer/NiBabel.

> [!gap] Exact command-line interface
> The `inference.py` script was not read. Required and optional arguments are unknown.

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

> [!gap] Command-line interface unknown
> `inference.py` was not read. Flags, required arguments, and optional parameters are unknown.

## Typical Use Cases

```bash
mri_super_synth --i input_lowres.mgz --o output_hires.mgz
```

Note: exact flag syntax unconfirmed.

## Pipeline Context

Not part of standard `recon-all`. Used as a preprocessing step for processing non-standard resolution MRI in standard pipelines, or as a research tool.

## Gotchas and Caveats

> [!gotcha] Python and deep learning dependencies
> This tool requires a Python environment with PyTorch or TensorFlow (verify from `frugal_models.py`) and associated scientific Python libraries. Dependency issues are common with deep learning tools.

## Related Tools

- [[mri_synthsr]] — MRI synthesis tool (SynthSR); may overlap in functionality
- [[mri_synthseg]] — segmentation synthesis tool
- [[mri_synthstrip]] — skull stripping using synthesis

## Confidence and Gaps

Confidence is **medium** for tool purpose, **low** for command-line interface details.

> [!gap] Read inference.py
> The main inference script should be read to document the command-line interface and confirm input/output specifications.

> [!gap] Distinguish from mri_synthsr
> Document the precise relationship and recommended use cases for `mri_super_synth` vs. `mri_synthsr`.
