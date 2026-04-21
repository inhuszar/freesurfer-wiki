---
title: "mri_claustrum_seg"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "mri_claustrum_seg/mri_claustrum_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthstrip]]"
  - "[[mri_synthseg]]"
  - "[[mri_convert]]"
  - "[[recon-all]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Python model architecture not documented (H5 file)"
  - "Requires GPU or fspython environment"
tags:
  - deep-learning
  - segmentation
  - claustrum
  - tcsh
---

# mri_claustrum_seg

## Summary

`mri_claustrum_seg` segments the bilateral claustrum from an MRI volume using a deep learning model. It is a tcsh wrapper script that orchestrates SynthMorph-based nonlinear registration to MNI152 space, applies a Keras/TensorFlow H5 model (`claustrum_seg_20250616.h5`) to the registered volume, and maps the segmentation back to native space. The output is a labeled volume containing left and right claustrum segmentations.

## Source Information

- **Language:** tcsh (shell script)
- **Source file:** `mri_claustrum_seg/mri_claustrum_seg`

The Python inference script is `claustrum-seg.py` in `$FREESURFER_HOME_FSPYTHON/python/scripts/`.
The model is at `$FREESURFER_HOME_FSPYTHON/models/claustrum_seg_20250616.h5`.

## Purpose and Context

The claustrum is a thin sheet of gray matter deep in the insular region, notoriously difficult to segment reliably with atlas-based methods due to its small size, irregular shape, and proximity to the insula. `mri_claustrum_seg` uses a deep learning approach trained on high-resolution manual segmentations to produce reliable claustrum delineations for morphometric and connectivity research.

The pipeline:
1. Registers the input volume to MNI152 space using `fs-synthmorph-reg`.
2. Applies spatial priors (`segs.warp.claustrum.prior.nii.gz`) to guide cropping.
3. Runs the deep learning model on the cropped MNI-space volume.
4. Maps the segmentation back to native space via the inverse SynthMorph warp.

## Inputs

| Flag | Default | Description |
|------|---------|-------------|
| `--i <invol>` | required | Input MRI volume (any resolution) |
| `--subject <s>` | — | Subject name (alternative to --i for SUBJECTS_DIR-based lookup) |
| `--o <outdir>` | required | Output directory for results |
| `--threads <N>` | 1 | Number of processing threads |
| `--no-strip` | — | Skip brain extraction step |
| `--hemi <hemi>` | both | Process only one hemisphere (`lh` or `rh`) |
| `--surf` | off | Enable surface-based post-processing |
| `--topo` | off | Enable topology correction |
| `--post` | off | Enable additional post-processing steps |
| `--smorphdir <dir>` | auto | Pre-computed SynthMorph registration directory |
| `--test` | off | Run in test mode (skips nonlinear warp, faster) |
| `--save-warp` | on | Save SynthMorph warp to output directory |
| `--save-csv` | off | Save summary CSV table |
| `--ForceUpdate` | off | Force re-run even if outputs exist |
| `--model <file>` | `claustrum_seg_20250616.h5` | Override model file |
| `--cleanup` | on | Remove temporary files after completion |
| `--LF <logfile>` | auto | Override log file path |

## Outputs

Written to `<outdir>/`:
- Claustrum segmentation volume (left/right labels per FreeSurferColorLUT)
- SynthMorph registration results (if `--save-warp`)
- Log file in `<outdir>/log/`

> [!gap] Exact output filename
> The exact output segmentation filename needs verification from the Python script `claustrum-seg.py`.

## Mathematical Foundations

The deep learning model processes volumes registered to a 200 µm MNI152-aligned crop of the claustrum region. It is a convolutional neural network (architecture stored in the H5 model file). The model outputs probabilistic segmentation maps that are converted to hard labels.

Registration uses `fs-synthmorph-reg` which employs SynthMorph: a learning-based deformable registration framework that is contrast-agnostic.

The spatial prior (`segs.warp.claustrum.prior.nii.gz`) is a probability map of claustrum location in MNI152 space, used to define the crop region.

## Configuration Interactions

- `--hemi` limits processing to one hemisphere, approximately halving runtime.
- `--smorphdir` allows reuse of a pre-computed registration, saving the ~10-20 minute SynthMorph step.
- `--test` mode skips nonlinear registration (affine only), producing coarser but faster results.
- `--no-strip` is useful when the input has already been skull-stripped.

## Typical Use Cases

**Standard claustrum segmentation:**
```bash
mri_claustrum_seg --i T1.mgz --o ./claustrum_results --threads 8
```

**Reuse existing SynthMorph registration:**
```bash
mri_claustrum_seg --i T1.mgz --o ./claustrum_results \
  --smorphdir ./claustrum_results/synthmorph
```

**Left hemisphere only:**
```bash
mri_claustrum_seg --i T1.mgz --o ./claustrum_results --hemi lh
```

## Pipeline Context

Not a standard [[recon-all]] stage. This is a standalone post-processing tool for specialized claustrum morphometry research.

## Gotchas and Caveats

> [!gotcha] Requires fspython environment
> The script calls `fspython` (FreeSurfer's managed Python environment) which must include TensorFlow/Keras for the H5 model. If `fspython` is not configured or the GPU environment is unavailable, the tool will fail.

> [!gotcha] CUDA_VISIBLE_DEVICES is emptied
> The script explicitly sets `setenv CUDA_VISIBLE_DEVICES ""`, disabling GPU acceleration. Inference runs on CPU, which may be slow. To enable GPU, modify this line or unset the variable.

> [!gotcha] Registration requires ~10–20 minutes
> The SynthMorph nonlinear registration to MNI152 space is the dominant runtime. Use `--smorphdir` with a pre-computed registration to avoid repeating this step.

> [!gotcha] MNI target resolution
> The target registration resolution is hardcoded as `MNITargetRes = 1.5mm`. Changing this requires script modification.

## Related Tools

- [[mri_synthstrip]] — brain extraction used in the pipeline
- [[mri_synthseg]] — whole-brain deep learning segmentation
- `fs-synthmorph-reg` — SynthMorph registration script used internally

## Confidence and Gaps

Script source fully read. Confidence is high for the pipeline flow. Confidence is low for model architecture and output format.

> [!gap] Python inference script details
> The `claustrum-seg.py` script contains the actual model inference logic. Its exact outputs and label assignments are not documented here.
