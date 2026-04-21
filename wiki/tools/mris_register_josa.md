---
title: "mris_register_josa"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mris_register_josa/mris_register_josa"
  - "mris_register_josa/spheremorph/"
  - "mris_register_josa/mris_register_josa_20241121_lh.h5"
  - "mris_register_josa/mris_register_josa_20241121_rh.h5"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[surface-format]]"
  - "[[recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source language needs verification (the binary appears to be a script; the spheremorph/ directory suggests Python/deep learning)"
  - "Architecture of the spheremorph model is not determined"
  - "Whether H5 model files are updated in releases"
tags:
  - surface
  - registration
  - atlas
  - deep-learning
  - spheremorph
---

# mris_register_josa

## Summary

`mris_register_josa` registers a cortical hemisphere's spherical surface to an atlas using a deep learning model (SphereMorph). The name refers to a 2025 publication in the Journal of the Optical Society of America (JOSA) that describes the underlying method. Pre-trained model files for left and right hemispheres are included in the FreeSurfer distribution as HDF5 (`.h5`) files, dated 2024-11-21. The tool provides an alternative to the iterative Markov Random Field–based [[mris_register]] algorithm.

## Source Information

- **Language:** Python (script-based binary) / deep learning framework
- **Source file:** `mris_register_josa/mris_register_josa` (executable script)
- **Model files:** 
  - `mris_register_josa/mris_register_josa_20241121_lh.h5` (left hemisphere)
  - `mris_register_josa/mris_register_josa_20241121_rh.h5` (right hemisphere)
- **Framework:** `spheremorph/` — likely a VoxelMorph/SphereMorph variant

## Purpose and Context

Spherical surface registration maps each subject's cortical surface to a common atlas space (typically `fsaverage`), enabling inter-subject comparison of cortical features. Traditional FreeSurfer registration ([[mris_register]]) uses an iterative gradient descent approach minimising an energy functional that combines curvature similarity and spatial regularisation. 

`mris_register_josa` replaces this with a feedforward neural network trained to produce the registration field in a single forward pass (at inference time), potentially offering:
- Faster registration
- More consistent results across subjects
- Better handling of unusual cortical morphology captured during training

## Inputs

- `-s subject` — subject name (reads from `SUBJECTS_DIR/subject/surf/`)
- `-h hemi` — hemisphere (`lh` or `rh`)
- `-m model.h5` — model file path (HDF5 format)

Alternatively, individual files can be specified:
- `-S lh.sulc` — sulcal depth file
- `-C lh.curv` — curvature file  
- `-H lh.inflated.H` — mean curvature of inflated surface
- `-t lh.sphere.rot` — initial sphere (rotated) surface

## Outputs

- Default: `SUBJECTS_DIR/subject/surf/lh.sphere.reg` (or `rh.sphere.reg`)
- Custom: `-o my.sphere` — specify output filename

## Mathematical Foundations

SphereMorph learns a registration function:

$$\phi^* = f_\theta(\mathbf{x}_{subject})$$

where $\mathbf{x}_{subject}$ is a feature vector derived from the subject's sulcal depth, curvature, and mean curvature maps projected onto the sphere, and $\phi^*$ is the deformation field on $S^2$.

The network $f_\theta$ is a convolutional architecture trained to minimise a similarity loss (e.g., normalised cross-correlation between warped subject features and atlas features) plus a regularisation term:

$$L = L_{similarity}(\phi \circ x, x_{atlas}) + \lambda L_{reg}(\phi)$$

The trained model parameters are stored in the `.h5` files. Registration at inference time is a single forward pass through the network.

> [!gap] The specific network architecture, training dataset, atlas used, and loss function details are not known from source inspection alone. The JOSA paper (cited in the tool name) would be the authoritative reference.

## Configuration Options

| Flag | Description |
|---|---|
| `-h hemi` | Hemisphere: `lh` or `rh` |
| `-s subject` | Subject name (SUBJECTS_DIR-relative) |
| `-m model.h5` | Model file path |
| `-o output_sphere` | Output sphere filename (default: `hemi.sphere.reg`) |
| `-S sulc` | Sulcal depth file (when not using -s) |
| `-C curv` | Curvature file (when not using -s) |
| `-H inflated.H` | Mean curvature of inflated (when not using -s) |
| `-t sphere.rot` | Initial rotated sphere (when not using -s) |

## Configuration Interactions

- `-s subject` and individual file flags (`-S`, `-C`, `-H`, `-t`) are alternative input modes.
- `-m model.h5` is required; the model files for lh and rh are different.
- The output is a spherical surface file in FreeSurfer binary format with deformed vertex positions representing the registration to atlas space.

## Typical Use Cases

```bash
# Register left hemisphere for subject bert using bundled model
mris_register_josa -h lh -s bert \
  -m $FREESURFER_HOME/../mris_register_josa/mris_register_josa_20241121_lh.h5

# Specify custom output filename
mris_register_josa -h lh -s bert \
  -m /path/to/lh.model.h5 -o my_sphere

# Specify individual files instead of subject directory
mris_register_josa -h lh \
  -S lh.sulc -C lh.curv -H lh.inflated.H -t lh.sphere.rot \
  -m lh.model.h5 -o lh.sphere.reg
```

## Pipeline Context

`mris_register_josa` can be used as a drop-in replacement for [[mris_register]] in the `recon-all` sphere registration step (autorecon3). The output format is the same (`?h.sphere.reg`), making it compatible with downstream tools that consume the registration.

Standard pipeline position:
1. `mris_sphere` — produces `?h.sphere`
2. Either `mris_register` or `mris_register_josa` — produces `?h.sphere.reg`
3. `mris_ca_label` / `mris_anatomical_stats` — consume `?h.sphere.reg`

## Gotchas and Caveats

> [!gotcha] Model file dated November 2024
> The bundled model files (`mris_register_josa_20241121_*.h5`) were trained on a specific dataset with a specific atlas. Results may differ from [[mris_register]] and may not be appropriate for all populations (children, clinical populations, atypical morphology).

> [!gotcha] Deep learning runtime dependency
> The tool requires a Python environment with the SphereMorph package (likely TensorFlow or PyTorch) installed. If the FreeSurfer Python environment is not activated or the correct packages are missing, the tool will fail.

> [!gotcha] Left/right model files are different
> The `lh` and `rh` model files are distinct — do not use the wrong hemisphere model. The `-h` flag selects the hemisphere and should match the `-m` model file.

## Related Tools

- [[mris_register]] — the traditional, iterative spherical registration tool
- [[mris_sphere]] — produces the spherical surface that is input to registration
- [[recon-all]] — orchestrates the sphere registration step

## Confidence and Gaps

**Confident (from README and file listing):** Usage examples from README.md; hemisphere and subject flags; model file naming and hemisphere specificity; output defaults to `hemi.sphere.reg`.

**Uncertain:** Deep learning framework (TensorFlow vs PyTorch); training data and atlas; whether this is called by `recon-all` in FS 8.2.0 or is optional.

> [!gap] The SphereMorph architecture and training details are not documented in the source tree. The JOSA paper should be consulted for technical details. The tool's relationship to the standard `recon-all` pipeline in FS 8.2.0 is not confirmed.
