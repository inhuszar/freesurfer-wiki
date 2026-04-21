---
title: "mri_gcab_train"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_gcab_train/mri_gcab_train.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: null
related:
  - "[[mri_ca_train]]"
  - "[[mri_ca_label]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "GCAB boundary deformation details not confirmed"
tags:
  - atlas
  - gca
  - training
  - attic
---

# mri_gcab_train

## Summary

`mri_gcab_train` trains a GCA Boundary (GCAB) atlas from a set of training subjects. The GCAB model extends the standard Gaussian Classifier Atlas (GCA) with boundary deformation information to refine the exact borders of anatomical structures. This is a research/development tool for atlas construction.

> [!gotcha] Attic tool
> Source is in `attic/`. This tool is likely not compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_gcab_train/mri_gcab_train.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Standard GCA models represent each tissue class with a Gaussian intensity distribution. The GCAB (GCA Boundary) model adds boundary-specific statistics that capture the spatial configuration of structure borders, enabling refinement of segmentation boundaries beyond what intensity alone can determine. `mri_gcab_train` trains this model from aligned training data (subject norm volumes + manual segmentations).

## Inputs

| Input | Description |
|-------|-------------|
| Training subjects | Subject directories with normalised T1 (`orig` or specified) and segmentation (`seg/` directory) |
| Transforms | Per-subject transforms to atlas space (`xform_name`) |
| GCA atlas | Existing GCA file for the GCAB to extend |

## Outputs

- A trained GCAB file (GCA Boundary atlas).

## Mathematical Foundations

The GCAB model augments the GCA with boundary deformation statistics. For each pair of adjacent labels, the model learns the distribution of boundary displacement vectors:

$$P(\delta | \text{label}_A, \text{label}_B) = \mathcal{N}(\mu_\delta, \Sigma_\delta)$$

where $\delta$ is the boundary displacement from the GCA-predicted position.

> [!gap] GCAB technical details
> The GCAB model is defined in `gcaboundary.h/c`. The exact parameterisation of the boundary distribution was not traced from this source file alone.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-seg <dir>` | string | `seg` | Segmentation subdirectory within each subject |
| `-T1 <name>` | string | `orig` | T1 volume name (without extension) |
| `-xform <name>` | string | — | Transform name to atlas space |
| `-smooth <s>` | float | -1 | Label smoothing sigma |
| `-TR <val>` | float | — | FLASH TR |
| `-TE <val>` | float | — | FLASH TE |
| `-FA <val>` | float | — | FLASH flip angle |
| `-navgs <n>` | int | 0 | Number of averaging iterations |
| `-mask <vol>` | volume | — | Brain mask |
| `-insert <label> <vol>` | int+path | — | Insert label from volume |
| `-histo <file>` | path | — | Histogram file |
| `-binarize` | flag | off | Binarise input |
| `-binarize_in <n>` | int | — | Input binarisation value |
| `-binarize_out <n>` | int | — | Output binarisation value |

> [!gap] Complete option list
> The `get_option()` function was not fully read.

## Typical Use Cases

```bash
# Train GCAB from subjects list
mri_gcab_train -xform talairach.lta \
  subject1 subject2 subject3 output.gcab
```

## Pipeline Context

Not part of `recon-all`. Development/research tool for creating new atlas variants. The trained GCAB would be used by a corresponding application tool (companion to `mri_ca_label`) that is also likely in attic.

## Gotchas and Caveats

- Tool is in `attic/`; availability uncertain.
- Requires a large training set (similar to `mri_ca_train`) for meaningful boundary statistics.
- The FLASH-specific parameters (TR, TE, FA) are needed when training from multi-echo data.

## Related Tools

- [[mri_ca_train]] — standard GCA training (active, not in attic)
- [[mri_ca_label]] — GCA-based segmentation

## Confidence and Gaps

**Low confidence:** tool is in attic; GCAB details not fully verified.
