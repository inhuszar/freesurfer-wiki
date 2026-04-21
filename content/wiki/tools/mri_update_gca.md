---
title: "mri_update_gca"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_update_gca/mri_update_gca.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_train]]"
  - "[[mri_ca_label]]"
  - "[[mri_em_register]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/ — may not be compiled or distributed."
  - "Source not read — functionality inferred from name."
tags:
  - mri
  - GCA
  - atlas
  - training
  - attic
---

# mri_update_gca

## Summary

`mri_update_gca` updates a Gaussian Classifier Atlas (GCA) model with new training data, allowing incremental refinement of an existing atlas without full retraining from scratch. It is located in the `attic/` directory and is likely deprecated or unmaintained in FreeSurfer 8.2.0. The tool takes an existing `.gca` file and updates its Gaussian mixture model parameters based on new labelled MRI data.

## Source Information

- **Language:** C++
- **Source file(s):** `attic/mri_update_gca/mri_update_gca.cpp`
- **Binary/script location:** Likely not compiled in FreeSurfer 8.2.0
- **Note:** Source is in `attic/`

## Purpose and Context

The GCA (Gaussian Classifier Atlas) is FreeSurfer's probabilistic atlas for subcortical segmentation (used by `mri_ca_label` and `mri_em_register`). Training a GCA from scratch (via `mri_ca_train`) requires a large cohort of labelled subjects. `mri_update_gca` provided a way to incrementally update an existing GCA with additional training examples, which was useful when new labelled cases became available after initial atlas construction.

> [!gotcha] Attic/deprecated
> This tool is in `attic/`. Modern FreeSurfer atlas updates are performed by rerunning `mri_ca_train` on the expanded dataset.

## Inputs

> [!gap] Source not read
> Inputs unknown. Likely: existing `.gca` file + labelled MRI volumes + transform files.

## Outputs

> [!gap] Source not read
> Likely an updated `.gca` file.

## Mathematical Foundations

GCA parameters are Gaussian mixture models at each spatial location in atlas space. Updating involves:
$$\mu_k' = \frac{N_k \mu_k + n_k \bar{x}_k}{N_k + n_k}$$
$$\sigma_k'^2 = \frac{N_k \sigma_k^2 + n_k s_k^2}{N_k + n_k}$$

where $N_k$ is the existing count, $n_k$ is new data count, and $\bar{x}_k$, $s_k^2$ are new sample mean and variance.

## Configuration Options

> [!gap] Unknown

## Pipeline Context

Not part of `recon-all`.

## Related Tools

- [[mri_ca_train]] — full GCA training from scratch (preferred modern approach)
- [[mri_ca_label]] — uses GCA for segmentation
- [[mri_em_register]] — uses GCA for registration

## Confidence and Gaps

Confidence is **low**. Source not read; attic status.

> [!gap] Verify existence
> Check whether `mri_update_gca` is present in FreeSurfer 8.2.0 `bin/`.
