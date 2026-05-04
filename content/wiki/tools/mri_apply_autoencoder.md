---
title: "mri_apply_autoencoder"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_train_autoencoder/mri_apply_autoencoder.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be built or installed in 8.2.0"
  - "SAE architecture details not confirmed"
  - "Exact use case and downstream applications unknown"
tags:
  - deep-learning
  - autoencoder
  - attic
---

# mri_apply_autoencoder

## Summary

`mri_apply_autoencoder` applies a trained Stacked Autoencoder (SAE) model to an MRI volume for unsupervised feature extraction. The tool loads a pre-trained SAE file, runs the input volume through the encoder network, and writes the resulting feature representation as an output volume. It is based on the stacked autoencoder framework described by Shin et al. (2012) for multi-organ detection.

> [!gotcha] Attic tool
> The source file is located in `attic/mri_train_autoencoder/`, indicating this tool has been retired or is no longer actively maintained. It may not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_train_autoencoder/mri_apply_autoencoder.cpp`
- **Original author:** Bruce Fischl
- **Reference:** H.-C. Shin et al., "Stacked Autoencoders for Unsupervised Feature Learning and Multiple Organ Detection," IEEE TPAMI, 2012.

## Purpose and Context

Stacked autoencoders (SAEs) are deep unsupervised neural networks that learn compact representations of input data by training an encoder–decoder pair to reconstruct the input. The encoder portion can be used for feature extraction. In the MRI context, this allows learning of patch-based representations of brain tissue, potentially useful for anomaly detection or segmentation initialisation.

`mri_apply_autoencoder` applies a pre-trained SAE (created by the companion tool `mri_train_autoencoder`, also in the attic) to produce per-voxel feature maps.

## Inputs

| Argument | Description |
|----------|-------------|
| `<input>` | Input MRI volume |
| `<sae_file>` | Pre-trained SAE model file |
| `<output>` | Output feature map volume |

## Outputs

- Feature map volume: the encoder activations for each voxel's neighbourhood, written as `<out>.AE.p.mgz`.
- When `-s` (synthesize) mode is active, a synthesised reconstruction is written to `<out>.out.mgz`.
- When `-r` (read) mode is active: reads a pre-computed p-value map and writes label files `cube.inputs.label` / `cube.outputs.label`.

## Mathematical Foundations

A stacked autoencoder consists of $L$ layers. Each layer $l$ implements:

$$
\mathbf{h}^{(l)} = \sigma\left(W^{(l)} \mathbf{h}^{(l-1)} + \mathbf{b}^{(l)}\right)
$$

where $\sigma$ is an activation function (typically sigmoid), $W^{(l)}$ is the weight matrix, and $\mathbf{b}^{(l)}$ is the bias. The deepest encoder layer $\mathbf{h}^{(L)}$ provides the feature representation.

The tool builds an image pyramid (`mri_pyramid`) with `nlevels` levels (default 4) and applies the SAE at each scale.

> [!gap] Exact architecture
> The SAE file format and network architecture are defined in `autoencoder.h` / `autoencoder.c`, which were not read during this documentation pass.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-t <vol>` | path | — | Training volume used to compute similarity measures |
| `-s` | — | off | Synthesise output volume using the autoencoder instead of encoding |
| `-r` | — | off | Read pre-computed AE p-value map (`<out>.AE.p.mgz`) and generate label files |
| `-x <x0> <x1> <y0> <y1> <z0> <z1>` | integers | — | Restrict processing to the specified voxel sub-region |
| `-ras <r> <a> <s>` | floats | — | Apply SAE at a specific TK RAS point; maps to voxel for debug focus |
| `-debug_voxel <x> <y> <z>` | integers | — | Enable debug output for voxel at coordinates (x, y, z) |

## Configuration Interactions

- `-ras` sets a specific TK RAS focus point; the corresponding voxel becomes `Gx/Gy/Gz` for debug/similarity output.
- `-r` (read) mode bypasses feature extraction entirely; the tool reads a pre-computed `<out>.AE.p.mgz` file and writes label files.
- `-s` (synthesize) and normal feature-extraction mode are mutually exclusive paths through `main()`.
- `-x` crops the input before building the image pyramid; voxel coordinates in other flags are relative to the original (uncropped) volume.

## Typical Use Cases

```bash
# Apply SAE to extract features
mri_apply_autoencoder input.mgz trained_sae.bin features.mgz
```

## Pipeline Context

Not part of `recon-all`. This is a research tool from the atlas/machine-learning development effort within the Fischl lab. Its practical deployment context is unclear.

## Gotchas and Caveats

- Tool is in the `attic/` directory and likely not compiled or installed in standard FreeSurfer 8.2.0 distributions.
- Requires a pre-trained SAE file generated by `mri_train_autoencoder` (also in attic).
- Memory requirements scale with volume size and number of pyramid levels.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — format conversion for inputs

## Confidence and Gaps

**Low confidence:** tool is in the attic; it may not be available. Internal SAE structure not verified.

> [!gap] Availability
> Whether this tool is compiled and installed in FreeSurfer 8.2.0 needs verification. The binary may not exist in `$FREESURFER_HOME/bin/`.
