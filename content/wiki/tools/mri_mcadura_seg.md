---
title: "mri_mcadura_seg"
type: tool
fs_version: "8.2.0"
source_language: "Shell (tcsh)"
source_files:
  - "scripts/mri_mcadura_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthstrip]]"
  - "[[mri_segment]]"
  - "[[mri_ca_label]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Deep learning model architecture not documented (H5 file format)"
  - "Exact preprocessing steps applied before model inference are not confirmed"
  - "Smorph registration details are not traced"
tags:
  - deep-learning
  - segmentation
  - dura
  - meningeal
---

# mri_mcadura_seg

## Summary

`mri_mcadura_seg` performs deep learning-based segmentation of the meningeal compartments (dura mater and related structures) using a pre-trained neural network model. It segments both left and right hemispheres, uses MNI152 spatial priors for anatomical guidance, and optionally performs skull stripping as part of the preprocessing. The model was trained on FHS (Framingham Heart Study) data.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/mri_mcadura_seg`
- **Model files:** `$FREESURFER_HOME/models/mca-dura.both-lh.nstd21.fhs.h5` (Keras/TF H5 format)
- **Color table:** `$FREESURFER/models/mca-dura.ctab`

## Purpose and Context

The meningeal spaces (dura mater, leptomeninges, and CSF-filled subarachnoid space) are clinically relevant compartments for studying aging, neurodegeneration, and intracranial pressure. Standard FreeSurfer segmentation pipelines do not explicitly model these compartments.

`mri_mcadura_seg` fills this gap by applying a deep learning model to segment meningeal structures. It uses MNI152 spatial probability priors warped to the subject space (one per hemisphere) as additional input features, providing anatomical context to the neural network.

This is an investigational tool not part of the standard `recon-all` pipeline, developed at MGH for research studies.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volume (`--i`) | [[mgz]] / NIfTI | T1-weighted anatomical volume |
| Subject name (`--s`) | string | FreeSurfer subject identifier (alternative to `--i`) |
| MNI152 prior (lh) | NIfTI `.nii.gz` | MNI152 spatial prior for left hemisphere (from `$FREESURFER/average/`) |
| MNI152 prior (rh) | NIfTI `.nii.gz` | MNI152 spatial prior for right hemisphere |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Segmentation volume | [[mgz]] | Meningeal compartment labels, written to `<outdir>/` |
| Log file | text | Detailed processing log in `<outdir>/log/` |

## Mathematical Foundations

The tool applies a supervised deep learning segmentation model (likely a 3D U-Net or similar architecture). The model takes the T1 volume and spatially-registered MNI152 prior maps as input, and outputs per-voxel probability estimates for each meningeal label.

MNI152 prior maps are warped to subject space using spherical morphometric registration (`smorphdir`), ensuring that the anatomical priors are aligned to the individual subject's anatomy despite inter-subject variability.

> [!gap] Model architecture
> The H5 file format suggests a Keras/TensorFlow model. The specific architecture (number of layers, input patch size, etc.) is not documented in the shell script. The model is loaded and run via `fspython` with a deep learning inference script not included in the shell script itself.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i <fname>` | string | null | Input volume filename |
| `--s <subject>` | string | null | Subject name (sets input to `$SUBJECTS_DIR/<subj>/mri/nu.mgz`) |
| `--o <fname>` | string | null | Output segmentation filename |
| `--outdir <dir>` / `--odir` / `--out-dir` / `--tmpdir` / `--tmp` | string | derived from `--o` | Output directory; all five aliases are equivalent and all set `cleanup=0`, preserving the working directory on exit |
| `--threads <n>` | int | 1 | Number of processing threads |
| `--strip` | flag | on | Perform skull stripping before segmentation (default) |
| `--no-strip` | flag | off | Skip skull stripping step |
| `--lh` | flag | — | Process left hemisphere only |
| `--rh` | flag | — | Process right hemisphere only |
| `--force` | flag | off | Force reprocessing even if outputs exist |
| `--no-force` | flag | — | Do not force reprocessing (default) |
| `--smorphdir <dir>` / `--synthmorph-dir` / `--synthmorphdir` | string | null | Use pre-computed SynthMorph registration directory |
| `--manseg <fname>` | string | null | Manual segmentation file (for post-processing override) |
| `--nocleanup` | flag | — | Do not delete temporary working directory |
| `--cleanup` | flag | on | Delete temporary working directory (default) |
| `--log <fname>` | string | auto | Log file path (auto: `<outdir>/log/mri_mcadura_seg.Y…log`) |
| `--nolog` / `--no-log` | flag | — | Suppress log file (redirect to `/dev/null`) |
| `--test` / `--no-test` | flag | off | Count cortex voxels from aseg (requires `--s`) |
| `--debug` | flag | off | Enable tcsh verbose tracing (`set verbose=1; set echo=1`). |

> [!gotcha] Sub-tool flags are not passed through
> `mri_mcadura_seg` calls several sub-tools internally (`mri_sclimbic_seg`, `mri_vol2vol`, `mri_convert`, `mri_binarize`, `mri_segstats`, `fs-synthmorph-reg`, `freeview`). Flags that belong to those tools — such as `--conform`, `--ctab`, `--fov`, `--keep_ac`, `--model`, `--no-cite-sclimbic`, `--output-base`, `--percentile`, `--vmp`, `--write_posteriors` (from `mri_sclimbic_seg`), `--reg`, `--regheader`, `--mov`, `--targ`, `--interp` (from `mri_vol2vol`), `--left-right-reverse-pix`, `--left-right-swap-label-table` (from `mri_convert`), `--match` (from `mri_binarize`), `--accumulate`, `--seg`, `--sum` (from `mri_segstats`), `--affine-only`, `--strip-input` (from `fs-synthmorph-reg`), `--hide-3d-slices`, `--view` (from `freeview`) — are NOT accepted by `mri_mcadura_seg` itself. Passing them on the command line will trigger "ERROR: Flag unrecognized."

## Configuration Interactions

- Either `--i` or `--s` must be provided (not both). `--s` reads `$SUBJECTS_DIR/<subject>/mri/nu.mgz` as input and auto-sets the output path to `$SUBJECTS_DIR/<subject>/mri/mca-dura.mgz` unless `--o` is also given.
- `--no-strip` skips the internal skull-stripping step; if the input is already skull-stripped, this saves time.
- `--smorphdir` (aliases: `--synthmorph-dir`, `--synthmorphdir`) provides a pre-computed SynthMorph registration directory. If omitted, the tool runs `fs-synthmorph-reg` internally and stores results under `<outdir>/synthmorph/`.
- `--lh` or `--rh` restricts processing to one hemisphere, approximately halving runtime.
- `--outdir` (or its aliases `--odir`, `--out-dir`, `--tmpdir`, `--tmp`) implicitly sets `cleanup=0`, preserving the working directory.
- `--nocleanup` also preserves the working directory. By default (`cleanup=1`) the entire `outdir` is deleted on success — only `--o` output and the log survive if neither `--outdir` nor `--nocleanup` is used.

## Typical Use Cases

```bash
# Segment meningeal compartments for subject bert
mri_mcadura_seg --s bert --o /data/bert/mri/mca-dura.mgz

# From an arbitrary volume without a subjects directory
mri_mcadura_seg --i /data/T1.mgz --o /data/dura_seg/mca-dura.mgz

# Right hemisphere only, preserve working directory
mri_mcadura_seg --s bert --o /data/bert/mri/mca-dura.mgz \
                --rh --nocleanup --outdir /data/bert/dura_tmp
```

## Pipeline Context

Not part of standard `recon-all`. This is a standalone deep learning segmentation tool for meningeal structures. It depends on:
- `fspython` (FreeSurfer's Python environment)
- TensorFlow / Keras (for model inference)
- Optionally, a completed `recon-all` run for the subject (for the smorph priors)

## Gotchas and Caveats

> [!gotcha] Requires fspython and GPU (recommended)
> The deep learning inference step requires `fspython` with TensorFlow. While CPU inference is possible, GPU acceleration is strongly recommended for reasonable runtimes.

> [!gotcha] Model trained on FHS cohort
> The model was trained on data from the Framingham Heart Study, which is predominantly older adult participants. Performance on pediatric, pathological (large tumours, severe atrophy), or non-standard T1 contrast data may be degraded.

> [!gotcha] MNI152 prior dependency
> The MNI152 prior files are expected at fixed paths within `$FREESURFER/average/`. If these files are absent or corrupted, the tool will fail.

> [!gotcha] Cleanup deletes outdir by default
> By default (`cleanup=1`), the script deletes the entire working output directory on success. Only the final `--o` output and its log are preserved. Use `--nocleanup` or `--outdir` to retain intermediate files.

> [!assumption] Input should be T1-weighted
> The model was trained on T1-weighted sequences. FLAIR, T2, or other contrasts are not supported.

## Related Tools

- [[mri_synthstrip]] — skull stripping used as preprocessing
- [[mri_segment]] — standard tissue segmentation
- [[mri_ca_label]] — atlas-based cortical/subcortical labelling

## Confidence and Gaps

**Confident:** Shell script structure, model file locations, color table, hemisphere flags, basic I/O.

**Less confident:** Deep learning model architecture, exact preprocessing steps, smorph registration integration, performance on non-FHS populations.
