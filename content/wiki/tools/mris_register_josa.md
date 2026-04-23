---
title: "mris_register_josa"
type: tool
fs_version: "8.2.0"
source_language: "Python/TensorFlow"
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
last_agent_update: 2026-04-21
gaps:
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

- **Language:** Python
- **Framework:** TensorFlow, with `surfa` for surface I/O and `spheremorph` for the registration model
- **Source file:** `mris_register_josa/mris_register_josa` (executable Python script)
- **Model files:** 
  - `mris_register_josa/mris_register_josa_20241121_lh.h5` (left hemisphere)
  - `mris_register_josa/mris_register_josa_20241121_rh.h5` (right hemisphere)

## Purpose and Context

Spherical surface registration maps each subject's cortical surface to a common atlas space (typically `fsaverage`), enabling inter-subject comparison of cortical features. Traditional FreeSurfer registration ([[mris_register]]) uses an iterative gradient descent approach minimising an energy functional that combines curvature similarity and spatial regularisation. 

`mris_register_josa` replaces this with a feedforward neural network trained to produce the registration field in a single forward pass (at inference time), potentially offering:
- Faster registration
- More consistent results across subjects
- Better handling of unusual cortical morphology captured during training

## Inputs

- `-s <subject_dir>` — path to subject directory (does not use `$SUBJECTS_DIR`; reads `surf/?h.*` files from within it)
- `-h lh|rh` — hemisphere
- `-m model.h5` — model file path (HDF5 format)

Alternatively, individual surface feature files can be specified directly:
- `-S lh.sulc` — sulcal depth file
- `-C lh.curv` — curvature file  
- `-H lh.inflated.H` — mean curvature of inflated surface
- `-t lh.sphere.rot` — initial sphere (rotated) surface

## Outputs

- Default: `<subject_dir>/surf/?h.sphere.reg` (where `<subject_dir>` is the path passed to `-s`)
- Custom: `-o <file>` — specify a full output file path; required if `-s` is not provided

## Mathematical Foundations

SphereMorph learns a registration function:

$$
\phi^* = f_\theta(\mathbf{x}_{subject})
$$

where $\mathbf{x}_{subject}$ is a feature vector derived from the subject's sulcal depth, curvature, and mean curvature maps projected onto the sphere, and $\phi^*$ is the deformation field on $S^2$.

The network $f_\theta$ is a convolutional architecture trained to minimise a similarity loss (e.g., normalised cross-correlation between warped subject features and atlas features) plus a regularisation term:

$$
L = L_{similarity}(\phi \circ x, x_{atlas}) + \lambda L_{reg}(\phi)
$$

The trained model parameters are stored in the `.h5` files. Registration at inference time is a single forward pass through the network.

> [!gap] The specific network architecture, training dataset, atlas used, and loss function details are not known from source inspection alone. The JOSA paper (cited in the tool name) would be the authoritative reference.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-h`<br>`--hmsp` | `lh\|rh` | — | Hemisphere; required |
| `-s`<br>`--subject_dir` | `<path>` | `None` | Path to subject directory (does not use `$SUBJECTS_DIR`); reads `surf/?h.*` files from within it |
| `-m`<br>`--model` | `<file.h5>` | — | Path to model weights HDF5 file; required |
| `-o`<br>`--output` | `<file>` | `<subject_dir>/surf/?h.sphere.reg` | Custom output file path; required if `-s` is not provided |
| `-a`<br>`--arch` | `<name>` | `spm2000` | Network architecture; currently only `spm2000` is supported |
| `-S`<br>`--sulc` | `<file>` | `<surf_dir>/?h.sulc` | Sulcal depth file; overrides the file read from the subject directory |
| `-C`<br>`--curv` | `<file>` | `<surf_dir>/?h.curv` | Curvature file; overrides the file read from the subject directory |
| `-H`<br>`--inflated_curv` | `<file>` | `<surf_dir>/?h.inflated.H` | Mean curvature of inflated surface; overrides the file read from the subject directory |
| `-t`<br>`--sphere_rot` | `<file>` | `<surf_dir>/?h.sphere.rot` | Initial rotated sphere surface |
| `-T`<br>`--threads` | `<num>` | `1` | Number of TensorFlow inter-op parallelism threads |

## Configuration Interactions

- `-s <subject_dir>` takes a full path directly — it does not look up names in `$SUBJECTS_DIR`. When provided, all four surface files (`?h.sulc`, `?h.curv`, `?h.inflated.H`, `?h.sphere.rot`) are read from `<subject_dir>/surf/`. The `-S`, `-C`, `-H`, and `-t` flags override individual files from that directory.
- If `-s` is not provided, individual files must cover all four inputs and `-o` must specify the output path.
- `-m model.h5` is required; the lh and rh model files are distinct and must match the `-h` hemisphere flag.
- `-a`/`--arch` selects the network architecture. Only `spm2000` is currently implemented; any other value raises an error.
- `-T`/`--threads` sets TensorFlow inter-op parallelism. The tool is CPU-based; increasing threads may reduce runtime on multi-core systems.
- The output is a spherical surface file in FreeSurfer binary format with deformed vertex positions representing the registration to atlas space.

## Typical Use Cases

```bash
# Register left hemisphere using full subject directory path and bundled model
mris_register_josa -h lh -s /data/subjects/bert \
  -m $FREESURFER_HOME/mris_register_josa/mris_register_josa_20241121_lh.h5

# Same, but specify a custom output path and use 4 threads
mris_register_josa -h lh -s /data/subjects/bert \
  -m $FREESURFER_HOME/mris_register_josa/mris_register_josa_20241121_lh.h5 \
  -o /data/subjects/bert/surf/lh.sphere.reg -T 4

# Specify individual files instead of subject directory (output path is required)
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
> The tool requires a Python environment with TensorFlow, `surfa`, and the `spheremorph` package installed. If the FreeSurfer Python environment is not activated or the correct packages are missing, the tool will fail.

> [!gotcha] Left/right model files are different
> The `lh` and `rh` model files are distinct — do not use the wrong hemisphere model. The `-h` flag selects the hemisphere and should match the `-m` model file.

## Related Tools

- [[mris_register]] — the traditional, iterative spherical registration tool
- [[mris_sphere]] — produces the spherical surface that is input to registration
- [[recon-all]] — orchestrates the sphere registration step

## Confidence and Gaps

**Confident (from source):** All CLI flags and their defaults; framework is TensorFlow with `surfa` and `spheremorph`; `-s` takes a full path, not a `$SUBJECTS_DIR`-relative name; only `spm2000` architecture is implemented; model files are HDF5; output defaults to `<subject_dir>/surf/?h.sphere.reg`.

**Uncertain:** Training data and atlas used for the bundled model files; whether `mris_register_josa` is invoked by `recon-all` in FS 8.2.0 or is only available as a standalone tool.

> [!gap] The SphereMorph architecture and training details are not documented in the source tree. The JOSA paper should be consulted for technical details. The tool's relationship to the standard `recon-all` pipeline in FS 8.2.0 is not confirmed.
