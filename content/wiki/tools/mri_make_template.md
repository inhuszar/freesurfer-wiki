---
title: "mri_make_template"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_make_template/mri_make_template.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[mri_segment]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full flag enumeration requires reading get_option() completely"
  - "Exact prior accumulation algorithm unclear from header"
tags:
  - template
  - atlas
  - attic
  - group-analysis
---

# mri_make_template

## Summary

`mri_make_template` builds a multi-subject anatomical template by accumulating voxel-wise statistics (mean, variance) from multiple subjects' normalized MRI volumes, optionally weighted by per-subject transforms. It also computes tissue prior probability maps. This tool resides in `attic/` and is not compiled in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_make_template/mri_make_template.cpp`
- **Status note:** In `attic/` — legacy code. Not compiled in FreeSurfer 8.2.0.

## Purpose and Context

Template construction is the foundation of atlas-based segmentation. `mri_make_template` iteratively processes a list of subjects, each with their own structural T1 volume and spatial transform to a common atlas space, and accumulates:

1. A running mean intensity volume (T1 mean template)
2. A running variance/standard deviation volume
3. Per-tissue prior probability volumes

These outputs were used to bootstrap Gaussian Classifier Atlas (GCA) construction in early FreeSurfer versions. The modern equivalent workflow uses `mri_ca_train` and associated tools.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Subject list | command line | One or more subject names (from `$SUBJECTS_DIR`) |
| Transform files | `.lta`, `.m3d` | Per-subject transforms to atlas space |
| Tissue binary masks | [[mgz]] | White matter / other binary segmentations |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| T1 mean volume | [[mgz]] | Voxel-wise mean intensity across subjects |
| T1 std volume | [[mgz]] | Voxel-wise standard deviation |
| Prior probability maps | [[mgz]] | Per-tissue probability volumes |
| Transform mean/covariance | text | Optional; statistics of the warp field ensemble |

## Mathematical Foundations

For $N$ subjects, the per-voxel mean and standard deviation are computed incrementally:

$$
\bar{I}(\mathbf{x}) = \frac{1}{N} \sum_{i=1}^{N} I_i(T_i(\mathbf{x}))
$$

$$
\sigma(\mathbf{x}) = \sqrt{\frac{1}{N} \sum_{i=1}^{N} \left(I_i(T_i(\mathbf{x})) - \bar{I}(\mathbf{x})\right)^2}
$$

where $T_i$ is the subject-to-atlas transform. The `MRIaccumulateMeansAndVariances()` and `MRIcomputeMeansAndStds()` functions implement this.

For masked (partial) accumulation, `MRIaccumulateMaskedMeansAndVariances()` tracks a per-voxel degree-of-freedom (dof) count to handle missing data.

Prior probabilities are accumulated in `MRIupdatePriors()` by counting how many subjects have a given tissue label at each atlas voxel, then normalizing.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-t` | `<xform>` | — | Transform filename to apply to each subject volume |
| `-T1` | `<name>` | `T1` | Name of T1 volume within each subject's `mri/` directory |
| `-s`<br>`-v` | `<fname>` | — | Write variance estimates to a separate file |
| `-b` | `<name>` | — | Binary mask volume name; enables prior probability computation mode |
| `-smooth` | `<f>` | 0 | Gaussian smoothing sigma applied to mean template |
| `-erode` | `<n>` | 0 | Number of morphological erosion iterations applied to each volume |
| `-open` | `<n>` | 0 | Number of morphological open operations applied to each volume |
| `-binarize` | `<thresh>` | — | Binarize input volumes at given threshold before accumulation |
| `-x` | `<mean_fname> <cov_fname>` | — | Write transform mean and covariance to the specified files |
| `-statsonly` | — | off | Compute transform statistics only; skip intensity template |
| `-novar` | — | off | Skip variance computation and output |
| `-n` | — | — | Do not apply transform to the first subject volume |
| `-sdir` | `<path>` | `$SUBJECTS_DIR` | Override subjects directory |

## Configuration Interactions

- `-novar` and `-s <fname>` (variance output) are mutually exclusive in intent; `-novar` suppresses variance output entirely.
- `-smooth`, `-erode`, and `-open` are applied to each subject's volume before accumulation, acting as preprocessing steps.
- `-statsonly` combined with `-x <mean> <cov>` is useful for computing transform statistics without building the intensity template.
- `-n` skips the transform for the very first subject only; subsequent subjects still have `-t` applied.

## Typical Use Cases

```bash
# Build a T1 mean template from a list of subjects
mri_make_template -t talairach.lta \
  sub01 sub02 sub03 sub04 sub05 \
  T1_mean.mgz
```

## Pipeline Context

Not part of standard `recon-all`. This tool was used in atlas building workflows that predate the `mri_ca_train` pipeline. The outputs feed into tools like `mri_ca_train` (early version) for GCA construction.

## Gotchas and Caveats

> [!gotcha] Attic status
> Located in `attic/` — not compiled by default. Manual compilation required.

> [!gotcha] Debug coordinates
> The source defines `DEBUG_X=62, DEBUG_Y=254, DEBUG_Z=92` as hardcoded debug voxel coordinates. These are internal and do not affect normal operation.

> [!gotcha] check_mri threshold
> The internal `check_mri()` function flags voxels with values above $10^5$ as errors. Volumes with large unnormalized intensities (e.g., raw diffusion data) will trigger false error reports.

## Related Tools

- [[mri_normalize]] — normalization step that should precede template building
- [[mri_segment]] — produces the binary tissue masks consumed here
- [[mri_em_register]] — produces the per-subject atlas transforms

## Confidence and Gaps

**Confident:** Purpose (multi-subject template construction), statistical accumulation approach, output types, attic status.

**Less confident:** Prior accumulation algorithm details, transform covariance matrix format.
