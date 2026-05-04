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
  - "[[wiki/tools/freeview|freeview]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `vol` | — (required) | Input MRI volume |
| `--o`<br>`--seg` | `outsegvol` | — | Output segmentation volume |
| `--outdir` | `dir` | — | Output directory (also turns off cleanup) |
| `--s` | `subjectid` | — | Process a subject from SUBJECTS_DIR (sets `invol=mri/nu.mgz`, `seg=mri/vsinus.mgz` by default) |
| `--threads` | `n` | 1 | Number of threads |

## Outputs

Output files are written to `--outdir`:

| File | Default path | Description |
|------|-------------|-------------|
| Segmentation volume | `outdir/vsinus.mgz` (or `mri/vsinus.mgz` with `--s`) | Venous sinus label map |
| Log files | `outdir/log/mri_vsinus_seg.Y<year>.M<month>...log` | Processing log in `outdir/log/` |

## Mathematical Foundations

The segmentation is based on a U-Net architecture:

- **Input FOV:** 144³ voxels
- **Prior regularisation:** MNI152-space prior probability maps are incorporated to bias predictions towards anatomically plausible locations
- **Registration:** SynthMorph-based deformable registration aligns the input to MNI152 space for prior application

> [!gap] Architecture details
> The U-Net architecture (number of levels, filter counts, skip connections) is defined in the model file and was not read for this page.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `vol` | — (required) | Input MRI volume |
| `--o`<br>`--seg` | `segvol` | `outdir/vsinus.mgz` | Output segmentation volume path |
| `--outdir` | `dir` | — | Output directory (also disables cleanup) |
| `--s` | `subjectid` | — | Subject in SUBJECTS_DIR |
| `--sd` | `dir` | `$SUBJECTS_DIR` | Override SUBJECTS_DIR (setenv SUBJECTS_DIR) |
| `--threads` | `n` | 1 | Number of threads |
| `--ctxseg` | `ctxseg` | — | Cortical segmentation; removes vsinus voxels overlapping cortex labels 3 and 42 |
| `--rca-synthseg` | — | off | Set `ctxseg` to `mri/synthseg.rca.mgz` (requires `--s`) |
| `--no-rca-synthseg` | — | default | Disable `--rca-synthseg` |
| `--dice` | `vol` | — | Reference segmentation volume for Dice evaluation |
| `--features` | `n` | 24 | Number of U-Net features |
| `--model`<br>`--m` | `modelfile` | `$FREESURFER_HOME_FSPYTHON/models/vsinus.no-sp.m.all.nstd10-070.h5` | Override default model file |
| `--ctab` | `ctabfile` | auto-generated in `outdir/` | Override default colour table |
| `--synthmorphdir` | `dir` | `outdir/synthmorph` | Use existing SynthMorph registration directory (skips re-registration) |
| `--out-post` | `vol` | — | Output posterior sum volume (also enables `--post`) |
| `--post` | — | off | Enable posterior output (saved to `mri/vsinus.posterior.mgz` with `--s`) |
| `--no0post` | — | off | Disable posterior output (`DoPost=0`) |
| `--direct` | `input output` | — | Run segmentation directly without cropping or preprocessing |
| `--rerun` | — | off | Rerun only if an intermediate stage is out of date |
| `--force` | — | off | Force rerun of everything from scratch |
| `--no-force` | — | default | Disable forced rerun |
| `--log` | `logfile` | `outdir/log/mri_vsinus_seg.Y...log` | Redirect log to this file |
| `--nolog`<br>`--no-log` | — | off | Suppress log output (sets log to `/dev/null`) |
| `--tmp`<br>`--tmpdir` | `dir` | `/scratch/tmpdir.mri_vsinus_seg.$$` or `outdir/tmpdir...` | Temporary directory (also disables cleanup) |
| `--cleanup` | — | on (when `--o` only) | Clean up temporary files |
| `--no-cleanup`<br>`--nocleanup` | — | off | Keep temporary files |
| `--debug` | — | off | Enable verbose debug output |
| `--help` | — | — | Print help |
| `--version` | — | — | Print version |

## Configuration Interactions

- `--i` and `--s` are alternative input modes. `--s` also sets default paths for `--o` and `--outdir`.
- `--sd` overrides the `SUBJECTS_DIR` environment variable when using `--s`.
- `--ctxseg` and `--rca-synthseg` are mutually exclusive; `--rca-synthseg` requires `--s`.
- `--o` and `--outdir` can be used together or separately. Using --o alone causes a temporary `outdir` to be created with cleanup enabled. Using --outdir alone sets `seg` to `outdir/vsinus.mgz` with cleanup disabled.
- `--model` / `--m` overrides the default model path from `$FREESURFER_HOME_FSPYTHON/models/`.
- `--post` enables posterior output. `--out-post` additionally specifies the output filename and also sets `DoPost=1`. `--no0post` explicitly sets `DoPost=0`. Posteriors are computed in cropped space and mapped back to native space.
- `--synthmorphdir` skips SynthMorph-based registration if the `reg.targ_to_invol.lta` file already exists in that directory.
- `--direct` bypasses all preprocessing (cropping, prior mapping, registration) and calls `mri_sclimbic_seg` directly, then exits.

## Typical Use Cases

```bash
# Segment venous sinuses from a standalone T1 volume
mri_vsinus_seg \
    --i bert/mri/orig.mgz \
    --o bert/mri/vsinus.mgz \
    --threads 4

# Process a subject from SUBJECTS_DIR (uses mri/nu.mgz as input by default)
mri_vsinus_seg \
    --s bert \
    --threads 4

# Keep intermediate files for debugging
mri_vsinus_seg \
    --i bert/mri/orig.mgz \
    --outdir bert/mri/vsinus/ \
    --threads 4 \
    --nocleanup
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
- [[wiki/tools/freeview|freeview]] — for visualising the output segmentation

## Confidence and Gaps

**High confidence:** all flag names and arguments verified against `parse_args` in script source; I/O paths and cleanup logic traced through `check_params`. Default column values verified against variable initialisations at script top.

**Low confidence:** model architecture, prior details; the Python code invoked by the script was not read.

> [!gap] Python backend
> The Python code that implements the actual segmentation (beyond the shell wrapper) was not read. Full model architecture and inference details require reading the Python scripts invoked by this wrapper.
