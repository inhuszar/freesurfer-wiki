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
last_agent_update: 2026-04-21
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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `<invol>` | required | Input MRI volume (any resolution) |
| `--s` | `<subject>` | — | Subject name; sets invol to `mri/rawavg.mgz` and outdir to `mri/claustrum` under `SUBJECTS_DIR/<subject>` |
| `--o` | `<outdir>` | required | Output directory for results |
| `--threads` | `<N>` | 1 | Number of processing threads |
| `--strip` / `--no-strip` | — | `--strip` | Enable/disable brain extraction step |
| `--lh` | — | — | Process left hemisphere only (skips rh) |
| `--rh` | — | — | Process right hemisphere only (skips lh) |
| `--surf` / `--no-surf` | — | off | Enable/disable surface-based post-processing (inflate, sphere, curvature) |
| `--topo-correct` / `--no-topo-correct` | — | off | Enable/disable post-hoc topology correction (removes islands via `mri_binarize --fill-holes --remove-islands --fix-vol-topo`) |
| `--post` / `--no-post` | — | off | Save posterior probability volume to `claustrum.<hemi>.post.mgz` |
| `--qc` / `--no-qc` | — | off | Run quality control mode: nonlinearly registers segmentation to MNI152 and computes Dice against 18 manual labels; also computes inter-hemi Dice |
| `--smorphdir` / `--synthmorph-dir` / `--synthmorphdir` | `<dir>` | auto | Pre-computed SynthMorph registration directory (reuse to skip the ~10–20 min registration step) |
| `--save-warp` / `--no-save-warp` | — | on | Save/delete SynthMorph warp files (`warp.to.mni152.*.nii.gz`) after completion |
| `--force` | — | off | Force re-run even if outputs already exist |
| `--no-force` | — | on | Do not force re-run (default; explicit inverse of `--force`) |
| `--model` | `<file>` | `claustrum_seg_20250616.h5` | Override model file path |
| `--direct` | `<input> <output>` | — | Run the deep learning model directly on `<input>`, writing result to `<output>`, without any registration or preprocessing. Exits immediately after inference. |
| `--fovdir` | `<dir>` | — | Reuse the cropped FoV volumes (`<hemi>.crop.nii.gz`) from another claustrum run directory, skipping the prior-based cropping step. Also reuses that directory's SynthMorph registration. |
| `--manseg-lh` | `<file>` | — | Manual LH claustrum segmentation (label ID 138) to compute Dice against the automatic segmentation. |
| `--manseg-rh` | `<file>` | — | Manual RH claustrum segmentation (label ID 139) to compute Dice against the automatic segmentation. |
| `--mni-1.5` | — | active | Set MNI target registration resolution to 1.5 mm (default). |
| `--mni-1.0` | — | off | Set MNI target registration resolution to 1.0 mm (only relevant for QC mode). |
| `--rot` | `<dC> <dR> <dS>` | — | Apply a rotation (in degrees about the C/R/S axes) when resampling the input to the cropped FoV. Used for testing/QC. |
| `--trans` | `<dC> <dR> <dS>` | — | Apply a translation (in mm along C/R/S axes) when resampling the input to the cropped FoV. Used for testing/QC. |
| `--no-conda` | — | active | Do not require an active conda environment. Since `RequireConda` defaults to 0, this flag is a no-op in normal usage but is available for script compatibility. |
| `--cleanup` / `--no-cleanup` | — | on | Remove/keep temporary directory after completion |
| `--tmp` / `--tmpdir` | `<dir>` | `<outdir>/tmpdir.mri_claustrum_seg.$$` | Override temporary directory (setting this also disables cleanup) |
| `--log` | `<logfile>` | auto | Override log file path |
| `--nolog` / `--no-log` | — | off | Disable logging (routes log to `/dev/null`) |
| `--debug` | — | off | Enable tcsh verbose tracing (`set verbose; set echo`) |

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

- `--lh` or `--rh` limits processing to one hemisphere, approximately halving runtime.
- `--smorphdir` (or `--synthmorph-dir` / `--synthmorphdir`) allows reuse of a pre-computed registration, saving the ~10–20 minute SynthMorph step.
- `--qc` mode skips nonlinear registration (affine only), producing coarser but faster results; also computes dice scores if manual segmentations are supplied.
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
mri_claustrum_seg --i T1.mgz --o ./claustrum_results --lh
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
> The default MNI target registration resolution is 1.5 mm (`--mni-1.5`). Use `--mni-1.0` to switch to 1.0 mm resolution, which is only relevant in `--qc` mode.

## Related Tools

- [[mri_synthstrip]] — brain extraction used in the pipeline
- [[mri_synthseg]] — whole-brain deep learning segmentation
- `fs-synthmorph-reg` — SynthMorph registration script used internally

## Confidence and Gaps

Script source fully read. Confidence is high for the pipeline flow. Confidence is low for model architecture and output format.

> [!gap] Python inference script details
> The `claustrum-seg.py` script contains the actual model inference logic. Its exact outputs and label assignments are not documented here.

> [!note] Audit noise: version-number filter on `--mni-1.0` and `--mni-1.5`
> An automated audit may flag `--mni-1.0` and `--mni-1.5` as C3 invalid. These ARE valid flags (tcsh `case` statements at source lines 726–729). The audit filters out any source token ending in `.<digit>` as a version-number artefact, so `--mni-1.0` and `--mni-1.5` are dropped from the source set before comparison.
