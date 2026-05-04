---
title: "mri_synthseg"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_synthseg/mri_synthseg"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthmorph]]"
  - "[[mri_synthsr]]"
  - "[[mri_synthstrip]]"
  - "[[mri_segment]]"
  - "[[mri_ca_label]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Number of output labels in SynthSeg 2.0 vs 1.0 needs verification from label files."
  - "Photo-SynthSeg reconstruction requirements not fully documented."
tags:
  - segmentation
  - deep-learning
  - contrast-agnostic
  - synthesis
  - tensorflow
---

# mri_synthseg

## Summary

`mri_synthseg` is a deep-learning segmentation tool that parcellates brain MRI into anatomical structures without requiring any contrast-specific training data. Based on the SynthSeg framework, it uses a U-Net trained on synthetic images spanning the full space of MRI contrasts and acquisition parameters. It segments T1w, T2w, FLAIR, PD, CT, and virtually any other 3D brain MRI with a single model. An optional parcellation mode also delineates cortical regions.

## Source Information

- **Language:** Python
- **Source file:** `mri_synthseg/mri_synthseg` (Python script)
- **Model weights:** `$FREESURFER_HOME/models/synthseg_2.0.h5` (default), `synthseg_1.0.h5`, `synthseg_robust_2.0.h5`
- **Framework:** TensorFlow/Keras
- **Original authors:** Benjamin Billot, Juan Eugenio Iglesias, et al. (MGH/UCL)

### Key References

- Billot B et al. "SynthSeg: Segmentation of brain MRI scans of any contrast and resolution without retraining." Medical Image Analysis, 2023.
- Billot B et al. "Robust machine learning segmentation for large-scale analysis of heterogeneous clinical brain MRI datasets." PNAS, 2023.

## Purpose and Context

Traditional atlas-based segmentation tools (`mri_ca_label`, `recon-all`) require T1-weighted input acquired at ~1mm isotropic resolution. Clinical scans — often acquired with varying contrasts, thick slices, and different scanners — fail with these tools. SynthSeg eliminates this constraint by training on synthetic images that simulate arbitrary MRI physics, enabling:

- Segmentation of clinical scans (T2, FLAIR, PD)
- Segmentation of low-resolution scans (thick-slice)
- Segmentation of CT scans
- Processing of retrospective datasets without preprocessing

## Inputs

| Input | Description |
|---|---|
| `--i` | Input image path or folder of images |
| `--model` | Alternative model weights (`.h5` file) |

The input can be any 3D brain MRI or CT volume in MGH/MGZ or NIfTI format. Multi-frame or 4D inputs are not supported — the tool operates on single-frame 3D volumes. The image must have a valid image-to-world matrix.

## Outputs

| Output | Description |
|---|---|
| `--o` | Segmentation output (integer labels) |
| `--parc` | Cortical parcellation output (when `--parc` flag given) |
| `--post` | Posterior probability maps (one frame per label) |
| `--resample` | Resampled input (1mm isotropic, after internal preprocessing) |
| `--vol` | CSV file with structure volumes (mm³) |
| `--qc` | CSV file with QC scores per subject |

The output segmentation uses the FreeSurfer label scheme. SynthSeg 2.0 segments ~33 subcortical and cortical structures. With `--parc`, cortical parcellation is added using a second model.

## Mathematical Foundations

SynthSeg uses a **contrast-invariant training strategy**:

1. **Generative model of anatomy:** Spatial deformations are applied to a segmentation atlas to produce a range of anatomical configurations.
2. **Contrast synthesis:** For each synthetic anatomy, MRI intensities are randomly sampled from Gaussian distributions conditioned on tissue label — no real MRI data is used during training.
3. **Augmentation:** Simulated acquisition artifacts (bias field, resolution degradation, noise, resampling) are applied to cover the clinical scan space.
4. **Network:** A 3D U-Net is trained on synthetic image–segmentation pairs, learning anatomy-driven features invariant to contrast.

At inference:
- The input volume is resampled to isotropic 1mm voxels internally.
- Intensities are min-max normalized to [0, 1].
- A topological correction step is applied post-segmentation.

> [!math] Topological correction
> Post-segmentation, a topology-aware post-processing step enforces anatomically plausible topologies using the `synthseg_topological_classes_2.0.npy` label file, which defines which structures must be topologically consistent.

## Configuration Options

| Flag | Argument | Default | Description |
|---|---|---|---|
| `--i` | path | — | Input image or folder |
| `--o` | path | — | Segmentation output |
| `--parc` | (flag) | `off` | Also perform cortical parcellation |
| `--robust` | (flag) | `off` | Use robust model (SynthSeg-robust 2.0, slower) |
| `--fast` | (flag) | `off` | Skip some processing steps for speed |
| `--ct` | (flag) | `off` | Clip input to Hounsfield range [0, 80] for CT |
| `--vol` | csvfile | — | Save structure volumes to CSV |
| `--qc` | csvfile | — | Save QC scores to CSV |
| `--post` | path | — | Save posterior probabilities |
| `--resample` | path | — | Save resampled input |
| `--crop` | size [size ...] | — | Analyse only a cropped patch |
| `--autocrop` | (flag) | `off` | Auto-crop to ignore background voxels |
| `--threads` | N | `1` | Number of CPU threads |
| `--cpu` | (flag) | `off` | Force CPU processing (disable GPU) |
| `--v1` | (flag) | `off` | Use SynthSeg 1.0 model |
| `--keepgeom` | (flag) | `off` | Force output geometry to match input |
| `--addctab` | (flag) | `on` | Embed color table in output |
| `--noaddctab` | (flag) | `off` | Do not embed color table |
| `--photo` | left/right/both | — | Photo-SynthSeg: segment from dissection photo stack |
| `--model` | h5file | — | Use alternative model weights |

## Configuration Interactions

- `--robust` automatically sets `--fast` (the robust model is slower but uses the same inference speed flags).
- `--v1` is incompatible with `--robust` (SynthSeg-robust is only in version 2.0).
- `--ct` and `--photo` are incompatible.
- `--qc` is incompatible with `--photo` (QC model not available for photo inputs).
- `--parc` in Photo-SynthSeg mode: the `--parc` flag is noted as "not well tested with single hemispheres."
- `--model` overrides all version/robust/photo selection and uses the specified weights directly.

> [!gotcha] Default is SynthSeg 2.0
> If neither `--v1` nor `--robust` is specified, SynthSeg 2.0 is used. This is the recommended default for in vivo T1w scans. For heterogeneous clinical datasets, `--robust` may give more stable results at the cost of speed.

> [!gotcha] CT input requires --ct flag
> Without `--ct`, CT intensities are not clipped to [0, 80] Hounsfield units and the model will produce poor results. The flag is mandatory for CT scans.

## Typical Use Cases

**1. Segment a T1w scan:**
```bash
mri_synthseg --i T1.mgz --o synthseg.mgz --vol volumes.csv
```

**2. Segment a clinical T2 FLAIR scan with QC:**
```bash
mri_synthseg --i FLAIR.nii.gz --o FLAIR_seg.nii.gz \
  --vol volumes.csv --qc qc.csv
```

**3. Segment with cortical parcellation using robust model:**
```bash
mri_synthseg --i scan.mgz --o seg.mgz --parc --robust
```

**4. Batch segment a folder of scans:**
```bash
mri_synthseg --i /path/to/scans/ --o /path/to/segs/ --vol batch_volumes.csv
```

**5. Segment a CT scan:**
```bash
mri_synthseg --i ct.nii.gz --o ct_seg.nii.gz --ct
```

## Pipeline Context

`mri_synthseg` is a standalone segmentation tool that can replace `mri_ca_label` + `mri_aparc2aseg` for clinical or heterogeneous data. It is not called by the standard `recon-all` pipeline, which requires T1w input and uses atlas-based methods.

For T1w research datasets, `recon-all` remains the gold standard. For non-T1w or low-quality data, `mri_synthseg` is preferred.

See also: [[mri_synthstrip]] (skull stripping, also contrast-agnostic), [[mri_synthmorph]] (registration), [[mri_synthsr]] (super-resolution).

## Gotchas and Caveats

> [!gotcha] Memory requirements
> The full 3D U-Net requires significant GPU memory (~8GB for 256³ volumes). For memory-constrained systems, `--cpu` is available but much slower.

> [!gotcha] Input geometry matters
> The image-to-world matrix must correctly encode anatomical orientation. If the image appears flipped or rotated in a viewer, SynthSeg may produce poor results. Use `mri_info` to check orientation.

> [!gotcha] Thread count and TensorFlow
> The `--threads` flag sets the number of TensorFlow intra-op threads. For single-subject processing, 1 thread is often optimal. For batch processing, increasing threads can help but may conflict with parallel job submission.

> [!gotcha] Volume estimates from thick-slice data
> When segmenting thick-slice data, SynthSeg internally upsamples to 1mm isotropic. Volume estimates from such data should be interpreted cautiously due to partial-volume effects at the original resolution.

## Related Tools

- [[mri_synthmorph]] — learning-based registration (same family of contrast-agnostic tools)
- [[mri_synthsr]] — super-resolution and contrast synthesis
- [[mri_synthstrip]] — learning-based skull stripping
- [[mri_ca_label]] — atlas-based segmentation (requires T1w)
- [[mri_segment]] — white matter segmentation

## Confidence and Gaps

Source code (Python script) and model structure read directly. The architecture is described in the published SynthSeg papers. Confidence is **high** for flags and basic behaviour.

> [!gap] Label table
> The exact set of output labels in SynthSeg 2.0 (from `synthseg_segmentation_names_2.0.npy`) was not read. The number and names of structures should be verified against the model label files in `$FREESURFER_HOME/models/`.
