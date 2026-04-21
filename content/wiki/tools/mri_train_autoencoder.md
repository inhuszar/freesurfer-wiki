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
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/ — may not be compiled or distributed."
  - "Source not read — all details inferred from name."
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

> [!gap] Source not read
> Inputs unknown.

## Outputs

> [!gap] Source not read
> Outputs unknown.

## Mathematical Foundations

An autoencoder is a neural network trained to reconstruct its input through a bottleneck:
$$
\hat{x} = D(E(x))
$$
where $E$ is an encoder mapping input $x$ to a lower-dimensional latent code, and $D$ is a decoder reconstructing the input. Training minimises $\|x - \hat{x}\|^2$.

The C++ implementation likely uses a custom back-propagation implementation in the FreeSurfer `rforest` or similar framework.

## Configuration Options

> [!gap] Not read
> Unknown.

## Pipeline Context

Not part of `recon-all`.

## Gotchas and Caveats

> [!gotcha] Almost certainly not available
> Verify whether `mri_train_autoencoder` is present in `/usr/local/freesurfer/8.2.0/bin/`.

## Related Tools

- [[mri_synthesize]] — MRI synthesis (modern alternative approach)

## Confidence and Gaps

Confidence is **low**. Source not read; attic status means the tool may not exist in the installed distribution.

> [!gap] Verify existence
> Check whether this binary exists in the installed FreeSurfer 8.2.0.
