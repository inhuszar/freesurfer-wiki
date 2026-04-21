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

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-xform <fname>` | string | null | Filename of transform to atlas space |
| `-T1 <name>` | string | `T1` | Name of T1 volume within subject's `mri/` directory |
| `-var <fname>` | string | null | Output variance volume filename |
| `-binary <name>` | string | null | Binary mask volume name |
| `-smooth <f>` | float | 0 | Gaussian smoothing sigma |
| `-erode <n>` | int | 0 | Number of morphological erosion iterations |
| `-open <n>` | int | 0 | Number of open operations |
| `-binarize` | flag | off | Binarize input volumes before accumulation |
| `-xform_mean <fname>` | string | null | Output transform mean |
| `-xform_covariance <fname>` | string | null | Output transform covariance |
| `-stats_only` | flag | off | Only compute statistics, do not write template |
| `-novar` | flag | off | Do not compute variance |
| `-first_transform` | flag | off | Use only the first transform for all subjects |

## Configuration Interactions

- `-novar` and `-var <fname>` are mutually exclusive in intent.
- `-smooth`, `-erode`, and `-open` are applied to each subject's volume before accumulation, acting as preprocessing steps.
- `-stats_only` combined with `-xform_mean` / `-xform_covariance` is useful for computing transform statistics without building the intensity template.

## Typical Use Cases

```bash
# Build a T1 mean template from 10 subjects
for subj in $(cat subjectlist.txt); do
  mri_make_template -xform $SUBJECTS_DIR/$subj/mri/transforms/talairach.lta \
    $subj T1_mean.mgz T1_std.mgz
done
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

**Less confident:** Complete flag list, prior accumulation algorithm, transform covariance format.

> [!gap] Complete flag enumeration
> The static variables visible in the header suggest roughly 12 flags, but `get_option()` must be read in full for confirmation.
