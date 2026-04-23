---
title: "mri_train_autoencoder"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_train_autoencoder/mri_train_autoencoder.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthesize]]"
status: draft
confidence: medium
last_agent_update: 2026-04-23
audit_skip: true
gaps:
  - "Source is in attic/ — may not be compiled or distributed in FreeSurfer 8.2.0."
  - "SAE framework (autoencoder.h/c) not read; output file format not verified."
tags:
  - mri
  - machine-learning
  - autoencoder
  - training
  - attic
---

# mri_train_autoencoder

## Summary

`mri_train_autoencoder` trains an autoencoder neural network on MRI volumes. It is located in the `attic/` directory of the FreeSurfer source, indicating it is deprecated, experimental, or superseded by modern deep learning tools. The tool likely uses a classical (non-deep-learning) autoencoder framework implemented in C++, predating the Python-based deep learning tools in modern FreeSurfer.

## Source Information

- **Language:** C++
- **Source file(s):** `attic/mri_train_autoencoder/mri_train_autoencoder.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_train_autoencoder` (if compiled)
- **Note:** Source is in `attic/` — likely not compiled in FreeSurfer 8.2.0.

## Purpose and Context

Autoencoder-based MRI processing (dimensionality reduction, anomaly detection, synthesis) was an active research area in the mid-2000s when this tool was likely developed. The tool trains a compressed representation of MRI data. Modern equivalents use deep learning frameworks (PyTorch, TensorFlow) and are not implemented in C++.

> [!gotcha] Attic/deprecated status
> This tool is in `attic/` and almost certainly not compiled or distributed in FreeSurfer 8.2.0. Users requiring autoencoder-based MRI analysis should use modern Python-based tools.

## Inputs

| Input | Description |
|-------|-------------|
| `<input_volume>` (positional 1) | MRI volume to train on (any format readable by `MRIread`). UCHAR volumes are rescaled to [0, 1] before training. |
| `-r fname` | Optional: path to a previously saved autoencoder to load and extend with a new layer |

## Outputs

| Output | Description |
|--------|-------------|
| `<output_file>` (positional 2) | Trained autoencoder written by `SAEwrite`. Also used as base path for the synthesis output. |
| `<output_file>.out.mgz` | Synthesised reconstruction volume produced after training (written unless synthesis is disabled internally) |

## Mathematical Foundations

An autoencoder is a neural network trained to reconstruct its input through a bottleneck:
$$
\hat{x} = D(E(x))
$$
where $E$ is an encoder mapping input $x$ to a lower-dimensional latent code, and $D$ is a decoder reconstructing the input. Training minimises $\|x - \hat{x}\|^2$.

The C++ implementation likely uses a custom back-propagation implementation in the FreeSurfer `rforest` or similar framework.

## Configuration Options

The parser uses single-dash flag stripping (`option = argv[1] + 1`), so all flags take a single dash. Positional arguments are `<input_volume>` and `<output_file>` (in that order).

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-n` | N | `4` | Number of levels in the Gaussian image pyramid |
| `-w` | N | `2` | Half-window size for patch extraction (full window = 2N+1) |
| `-s` | scale | `0.5` | Scale factor for hidden layer size relative to input layer |
| `-d` | dt | `0.01` | Learning rate (step size) for gradient descent |
| `-m` | momentum | `0.5` | Momentum coefficient for gradient descent |
| `-t` | tol | `0.0001` | Convergence tolerance |
| `-r` | fname | — | Read a previously trained autoencoder from `fname` and add a layer before training |
| `-c` | — | off | Use Polak-Ribière conjugate gradient minimisation instead of gradient descent |
| `-b` | acceptance_sigma proposal_sigma | — | Use Boltzmann machine integration with given acceptance and proposal sigma values |
| `-x` | x0 x1 y0 y1 z0 z1 | — | Extract and train on a subregion of the volume (six integer arguments) |
| `-debug_voxel` | Gx Gy Gz | — | Set diagnostic voxel coordinates for verbose debugging |

## Pipeline Context

Not part of `recon-all`.

## Gotchas and Caveats

> [!gotcha] Almost certainly not available
> Verify whether `mri_train_autoencoder` is present in `/usr/local/freesurfer/8.2.0/bin/`.

## Related Tools

- [[mri_synthesize]] — MRI synthesis (modern alternative approach)

## Confidence and Gaps

Confidence is **medium**. Source read directly from `attic/mri_train_autoencoder/mri_train_autoencoder.cpp`. Flag table is complete. Attic status means the tool may not be compiled or installed in FreeSurfer 8.2.0.

> [!gap] Verify existence
> Check whether this binary exists in the installed FreeSurfer 8.2.0: `ls $FREESURFER_HOME/bin/mri_train_autoencoder`.

> [!gap] SAE framework details
> The `SAE` (Stacked Autoencoder) struct and `SAEtrainFromMRI` function are defined in `autoencoder.h` / `autoencoder.c`. The detailed training loop, convergence criteria, and output file format are in that library and were not read.
