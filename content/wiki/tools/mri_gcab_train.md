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
confidence: medium
last_agent_update: 2026-04-22
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

$$
P(\delta | \text{label}_A, \text{label}_B) = \mathcal{N}(\mu_\delta, \Sigma_\delta)
$$

where $\delta$ is the boundary displacement from the GCA-predicted position.

> [!gap] GCAB technical details
> The GCAB model is defined in `gcaboundary.h/c`. The exact parameterisation of the boundary distribution was not traced from this source file alone.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-a <n>` | integer | 0 | Number of mean-filter averaging iterations applied to classifiers after training. |
| `-binarize <in> <out>` | integer integer | — | Binarise segmentation: map input label value `<in>` to output value `<out>`. |
| `-debug_label <n>` | integer | — | Debug label by CMA index. |
| `-debug_nbr <n>` | integer | — | Debug neighbour label by CMA index. |
| `-debug_node <x> <y> <z>` | 3 integers | — | Debug GCA node at atlas coordinates (x,y,z). |
| `-debug_voxel <x> <y> <z>` | 3 integers | — | Debug voxel at volume coordinates (x,y,z). |
| `-h <file>` | string | — | Write histogram of classes per voxel to `<file>`. |
| `-insert <fname> <label>` | string integer | — | Insert non-zero voxels from `<fname>` as label `<label>`. |
| `-mask <vol>` | string | — | Mask input volumes with the specified MRI volume. |
| `-node_spacing <f>` | float | — | Node spacing in mm for the GCAB model. |
| `-nomrf` | — | off | Disable computation of MRF statistics. |
| `-noxform` | — | off | Disable application of transform to atlas space. |
| `-parc_dir <dir>` | string | `seg` | Segmentation subdirectory within each subject (alias for `-seg_dir`). |
| `-s <scale>` | float | — | Scale all input volumes by `<scale>` after reading. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Subjects directory. |
| `-seg <dir>` | string | `seg` | Segmentation subdirectory within each subject (alias for `-seg_dir`). |
| `-seg_dir <dir>` | string | `seg` | Segmentation subdirectory within each subject (alias for `-parc_dir`). |
| `-segmentation <dir>` | string | `seg` | Alias for `-seg_dir`. |
| `-smooth <s>` | float | -1 | Sigma for regularizing conditional densities (disabled if ≤ 0). |
| `-spacing <f>` | float | 8.0 | PDF sampling spacing in mm. |
| `-T1 <name>` | string | `orig` | T1 volume name (without extension) within subject `mri/` directory. |
| `-v <n>` | integer | — | Diagnostic level (`Gdiag_no`). |
| `-xform <name>` | string | — | Transform filename for atlas registration. |

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

**Medium confidence:** full `get_option()` function read from source; all flags verified. GCAB algorithmic details remain unconfirmed from this source file alone.

> [!gap] GCAB technical details
> The boundary deformation parameterisation is defined in `gcaboundary.h/c`. The exact semantics of `GCABalloc` parameters (8, 0, 30, 10, target_label) were not fully traced.
