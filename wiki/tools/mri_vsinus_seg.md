---
title: "mri_vsinus_seg"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/mri_vsinus_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vessel_segment]]"
  - "[[mri_synthstrip]]"
  - "[[freeview]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The full U-Net architecture and training data for the vsinus model are not described in source."
  - "The exact post-processing pipeline (SynthMorph-based registration, MNI152 prior) was not fully traced."
  - "Model file path and download instructions should be verified against current installation."
tags:
  - segmentation
  - deep-learning
  - venous-sinus
  - unet
---

# mri_vsinus_seg

## Summary

`mri_vsinus_seg` is a deep-learning-based venous sinus segmentation tool implemented as a tcsh wrapper script. It uses a U-Net model trained to segment the major dural venous sinuses (superior sagittal sinus, transverse sinuses, sigmoid sinuses, etc.) from MRI data. The tool applies an MNI152 prior for spatial regularisation and uses SynthMorph-based registration. It is part of the emerging class of AI-based FreeSurfer segmentation tools.

## Source Information

- **Language:** tcsh (shell script wrapper)
- **Source file:** `scripts/mri_vsinus_seg`
- **Model:** `$FREESURFER_HOME/models/vsinus.no-sp.m.all.nstd10-070.h5` (Keras HDF5 model)
- **Prior:** `$FREESURFER/average/vsinus.no-sp.prior.mni152.1.0mm.mgz`
- **Python backend:** Invokes Python/TensorFlow via fspython

## Purpose and Context

The dural venous sinuses are large venous structures adjacent to the cortex that can be mistaken for brain tissue in parcellation and skull-stripping pipelines. Accurate venous sinus segmentation is useful for:

1. Excluding sinuses from surface reconstruction to prevent topological errors
2. Clinical applications (thrombosis detection, surgical planning)
3. Neuroimaging studies investigating cerebrovascular anatomy

The tool uses a supervised U-Net trained on manually labelled data with field-of-view (FOV) of 144 voxels, applying MNI152-space prior probability maps for regularisation.

## Inputs

| Flag | Description |
|------|-------------|
| `--invol vol` | Input MRI volume |
| `--outdir dir` | Output directory |
| `--subject subjectid` | Process a subject from SUBJECTS_DIR |
| `--threads n` | Number of threads (default 1) |

## Outputs

Output files are written to `--outdir`:

| File | Description |
|------|-------------|
| Segmentation volume | Venous sinus label map |
| Log files | Processing log in `outdir/log/` |

## Mathematical Foundations

The segmentation is based on a U-Net architecture:

- **Input FOV:** 144³ voxels
- **Prior regularisation:** MNI152-space prior probability maps are incorporated to bias predictions towards anatomically plausible locations
- **Registration:** SynthMorph-based deformable registration aligns the input to MNI152 space for prior application

> [!gap] Architecture details
> The U-Net architecture (number of levels, filter counts, skip connections) is defined in the model file and was not read for this page.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--invol` | `vol` | Input volume |
| `--outdir` | `dir` | Output directory |
| `--subject` | `subjectid` | Subject in SUBJECTS_DIR |
| `--threads` | `n` | Number of threads |
| `--seg` | `segvol` | Pre-existing segmentation to use |
| `--ctxseg` | `ctxseg` | Cortical segmentation for context |
| `--diceseg` | `vol` | Reference segmentation for Dice evaluation |
| `--features` | `n` | Number of U-Net features (default 24) |
| `--fov` | `n` | FOV size (default 144) |
| `--model` | `modelfile` | Alternative model file |
| `--priormni` | `vol` | Alternative MNI152 prior |
| `--synthmorphdir` | `dir` | SynthMorph directory |
| `--no-post` | — | Skip post-processing |
| `--rerun` | — | Force re-run even if output exists |
| `--tmpdir` | `dir` | Temporary directory |
| `--cleanup` | — | Clean up temporary files |
| `--nocleanup` | — | Keep temporary files |
| `--debug` | — | Enable debug mode |
| `--help` | — | Print help |
| `--version` | — | Print version |

## Configuration Interactions

- `--invol` and `--subject` are alternative input modes.
- `--model` overrides the default model path from `$FREESURFER_HOME/models/`.
- `--no-post` skips post-processing steps (exact steps not documented here).

## Typical Use Cases

```bash
# Segment venous sinuses from a standalone T1 volume
mri_vsinus_seg \
    --invol bert/mri/orig.mgz \
    --outdir bert/mri/vsinus/ \
    --threads 4

# Process a subject from SUBJECTS_DIR
mri_vsinus_seg \
    --subject bert \
    --outdir $SUBJECTS_DIR/bert/mri/vsinus/ \
    --threads 4
```

## Pipeline Context

`mri_vsinus_seg` is not part of the standard `recon-all` pipeline. It is a standalone post-processing tool for venous sinus analysis. The output may be used to mask sinuses from downstream analyses.

See also [[mri_vessel_segment]] for multimodal intensity-based vessel segmentation.

## Gotchas and Caveats

> [!gotcha] Model file must be present
> The model file `vsinus.no-sp.m.all.nstd10-070.h5` must be present in `$FREESURFER_HOME/models/`. It may not be included in the default FreeSurfer distribution and may require separate download.

> [!gotcha] Script name is mri_vsinus_seg, not mri_vsinus_segment
> The binary/script is called `mri_vsinus_seg` (without the full `-ment` suffix), whereas [[mri_vessel_segment]] is a separate tool for general vessel segmentation.

> [!gotcha] FOV restriction
> The U-Net was trained with a fixed FOV of 144 voxels. Input volumes of very different resolution or FOV may need resampling before processing.

## Related Tools

- [[mri_vessel_segment]] — intensity-based vessel segmentation using multimodal T1/T2 data
- [[mri_synthstrip]] — skull stripping (may inadvertently include/exclude sinus tissue)
- [[freeview]] — for visualising the output segmentation

## Confidence and Gaps

**Medium confidence:** input/output structure (from script source), model location, general U-Net approach.

**Low confidence:** model architecture, prior details, post-processing pipeline.

> [!gap] Python backend
> The Python code that implements the actual segmentation (beyond the shell wrapper) was not read. Full model architecture and inference details require reading the Python scripts invoked by this wrapper.
