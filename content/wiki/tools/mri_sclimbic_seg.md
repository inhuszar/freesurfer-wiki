---
title: "mri_sclimbic_seg"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_sclimbic_seg/mri_sclimbic_seg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mri_convert]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Exact label set (which limbic structures) not enumerated here — check the model's colour table."
  - "Model architecture details not documented (TensorFlow/Keras model)."
tags:
  - segmentation
  - deep-learning
  - limbic
  - subcortical
  - python
---

# mri_sclimbic_seg

## Summary

`mri_sclimbic_seg` segments subcortical limbic structures from T1-weighted MRI using a deep-learning model implemented in TensorFlow. It can operate on individual image files or on complete FreeSurfer subject directories, and produces volumetric segmentations, optional posterior probability maps, and label volume statistics.

## Source Information

- **Language:** Python
- **Source file:** `mri_sclimbic_seg/mri_sclimbic_seg` (Python script, no `.py` extension)
- **Dependencies:** TensorFlow, numpy, surfa, scipy

## Purpose and Context

Traditional atlas-based subcortical segmentation (e.g., `mri_ca_label`, `mri_segment`) relies on probabilistic atlases trained on manually labelled data. `mri_sclimbic_seg` uses a trained convolutional neural network to directly predict limbic structure labels from T1 image intensities, producing faster and potentially more accurate segmentations of limbic regions (e.g., amygdala, hippocampal subfields, fornix, thalamic nuclei). The tool integrates with both standalone image processing and FreeSurfer subject directories.

## Inputs

Two modes are supported:

**Image mode:**

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `file/dir` | — (required) | Input T1-w image or directory of images |
| `--o` | `file/dir` | — (required) | Output segmentation file or directory |

**Subject mode:**

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--s` | `[subj1 subj2 ...]` | — (required) | FreeSurfer subjects (uses SUBJECTS_DIR); no args = process all |
| `--sd` | `dir` | `$SUBJECTS_DIR` | Override SUBJECTS_DIR |

## Outputs

| Output | Default path | Description |
|--------|-------------|-------------|
| Segmentation file | `<output-base>.mgz` (image mode) / `mri/<output-base>.mgz` (subject mode) | Volumetric label image with limbic structure indices |
| `--write_posteriors` | `<output-base>.posteriors.mgz` | Per-label posterior probability maps |
| `--write_volumes` | `<output-base>.stats` (image mode) / `stats/<output-base>.stats` (subject mode) | Comma-separated volume statistics file |
| `--write_qa_stats` | `<output-base>.qa.stats` | QA statistics (z-scores and confidence values) |

In subject mode, outputs are written to `$SUBJECTS_DIR/<subject>/mri/` and `$SUBJECTS_DIR/<subject>/stats/`.

## Mathematical Foundations

The segmentation is performed by a convolutional neural network trained on manually labelled T1 images. The network outputs a per-voxel probability distribution over $K$ label classes:

$$
p(y_v = k \mid \mathbf{I}) \quad k \in \{0, 1, \ldots, K-1\}
$$

The final segmentation assigns:

$$
\hat{y}_v = \arg\max_k \; p(y_v = k \mid \mathbf{I})
$$

Input intensities are normalised using percentile-based scaling (default percentile, or `--percentile` for custom).

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `file/dir` | — | Input T1-w image(s); required in image mode |
| `--o` | `file/dir` | — | Output segmentation file or directory; required in image mode |
| `--s` | `[subj ...]` | — | Subject list; required in subject mode (no args = all subjects in SUBJECTS_DIR) |
| `--sd` | `dir` | `$SUBJECTS_DIR` | Override SUBJECTS_DIR |
| `--conform` | — | `off` | Resample input to 1mm isotropic before inference; results are put back in native resolution |
| `--etiv` | — | `off` | Include eTIV in volume stats (enabled automatically in subject mode and when `--tal` is given) |
| `--tal` | `file/suffix` | — | Talairach XFM transform for eTIV estimation; can be a file path or a filename suffix |
| `--write_posteriors` | — | `off` | Save per-label posterior probability maps |
| `--write_volumes` | — | `off` | Save label volume stats (enabled automatically in subject mode) |
| `--write_qa_stats` | — | `off` | Save QA stats (z-scores and confidence values) |
| `--exclude` | `id [id ...]` | `[]` | Label IDs to exclude from stats; note: label 853 (anterior commissure) is appended automatically unless `--keep_ac` is set |
| `--keep_ac` | — | `off` | Retain anterior commissure (label 853) in volume/QA stats |
| `--vox-count-volumes` | — | `off` | Use discrete voxel count for label volumes instead of summed posterior probabilities |
| `--model` | `file` | — | Alternative model weights file (default: `$FREESURFER_HOME/models/sclimbic.fsm+ad.t1.nstd00-50.nstd32-50.h5`) |
| `--ctab` | `file` | — | Alternative colour lookup table (default: `$FREESURFER_HOME/models/sclimbic.ctab`) |
| `--population-stats` | `file` | — | Alternative population volume stats file for QA output (default: `$FREESURFER_HOME/models/sclimbic.volstats.csv`) |
| `--threads` | `n` | `1` | Number of CPU threads for TensorFlow |
| `--features` | `n` | `24` | Number of model features |
| `--7t` | — | `off` | Preprocess 7T images (sets `--percentile 99.9`) |
| `--percentile` | `val` | — | Intensity normalisation percentile threshold; if unset, uses max intensity |
| `--cuda-device` | `id` | — | CUDA device ID for GPU inference; `-1` or unset forces CPU |
| `--output-base` | `str` | `sclimbic` | Output filename base string (used to construct output filenames) |
| `--fov` | `n` | `160` | Field of view in voxels for model input shape |
| `--nchannels` | `n` | `1` | Number of input image channels |
| `--logfile` | `file` | — | Log file path (default: `mri_sclimbic.log` in the output directory) |
| `--no-cite-sclimbic` | — | `off` | Suppress citation printout; citation is printed by default |
| `--debug` | — | `off` | Enable debug logging |
| `--vmp` | — | `off` | Print VmPeak memory usage at exit |

> [!note] Audit noise — sub-tool flags not accepted by mri_sclimbic_seg
> The C1 audit reported 12 flags as missing from this page:
> `--ants-n4`, `--distance`, `--inxfm`, `--ltavox2vox`, `--n`, `--no-rescale`,
> `--outlta`, `--proto-iters`, `--src`, `--subject`, `--trg`, `--xfm`.
> All 12 are flags passed to **sub-tools** within the `compute_etiv_from_scratch()`
> helper function (source line 674–685):
> `--no-rescale`, `--n`, `--proto-iters`, `--distance`, `--ants-n4` → `mri_nu_correct.mni`;
> `--xfm` → `talairach_avi`;
> `--src`, `--trg`, `--inxfm`, `--outlta`, `--subject`, `--ltavox2vox` → `lta_convert`.
> None appear in `mri_sclimbic_seg`'s own `argparse` block (lines 55–92 of the
> source). Do not add these flags to this page.

## Configuration Interactions

- `--i` and `--s` are mutually exclusive. Using both causes a fatal error.
- `--etiv` is automatically enabled when `--tal` is specified.
- In subject mode, `--write_volumes` and `--etiv` are enabled by default.
- Anterior commissure (label 853) is automatically excluded from stats unless `--keep_ac` is set.
- `--7T` is a shorthand that sets `--percentile 99.9` to handle the different intensity distribution of 7T images.
- `--cuda-device -1` forces CPU use. Setting `CUDA_VISIBLE_DEVICES=-1` in the environment has the same effect.

> [!gotcha] TensorFlow import is deferred
> TensorFlow is not imported until needed to allow fast command-line parsing. If the TF environment is misconfigured, the error will appear only at inference time, not at startup.

## Typical Use Cases

```bash
# Segment a single T1 image
mri_sclimbic_seg --i T1.mgz --o sclimbic_seg.mgz

# Process multiple FreeSurfer subjects
mri_sclimbic_seg --s bert ernie alice

# Process all subjects in SUBJECTS_DIR
mri_sclimbic_seg --s

# GPU inference
mri_sclimbic_seg --i T1.mgz --o seg.mgz --cuda-device 0

# Save posteriors and QA stats
mri_sclimbic_seg --i T1.mgz --o seg.mgz \
    --write_posteriors --write_qa_stats
```

## Pipeline Context

Not part of the standard `recon-all` pipeline but can be run on subjects after `recon-all` completes. Complements `recon-all`'s subcortical segmentation (`mri_ca_label`) with a focus on limbic structures.

## Gotchas and Caveats

> [!gotcha] Requires FreeSurfer home
> `FREESURFER_HOME` must be set. The script checks for it at startup and fails fatally if absent.

> [!gotcha] Anterior commissure excluded by default
> Label 853 (anterior commissure) is silently excluded from volume statistics unless `--keep_ac` is explicitly provided. This is a design decision to reduce false positives in the stats.

> [!gotcha] GPU memory
> Running on GPU requires sufficient VRAM for the model. CPU fallback is supported but may be slow for large batches.

> [!gotcha] Subject mode output paths
> In subject mode, output paths are automatically constructed. The `--output-base` flag controls the filename prefix (default `sclimbic`), affecting filenames like `sclimbic_seg.mgz`, `sclimbic_vols.stats`.

## Related Tools

- [[mri_ca_label]] — atlas-based subcortical segmentation
- [[mri_binarize]] — for post-processing segmentation masks

## Confidence and Gaps

**Confident:** Full flag set, I/O modes, and key behaviours confirmed from complete Python source code.

> [!gap] Label set
> The specific limbic structures segmented (label IDs and names) depend on the embedded colour table in the model. These are not enumerated in this page. Run `mri_sclimbic_seg --ctab` or inspect the output segmentation with Freeview to see the full label set.

> [!gap] Model architecture
> The neural network architecture (number of layers, convolution sizes, etc.) is defined in the model weights file and not accessible from the script alone.
