---
title: "mri_easyatlas"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mri_easyreg/mri_easyatlas"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_easyreg]]"
  - "[[mri_easywarp]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Output atlas coordinate space and voxel geometry not fully documented"
  - "Reliability map format and interpretation not specified"
tags:
  - registration
  - atlas
  - deep-learning
  - synthmorph
---

# mri_easyatlas

## Summary

`mri_easyatlas` constructs a population-averaged MRI atlas from a directory of input scans using the EasyReg deep-learning registration framework. It iteratively registers all input images to one another via SynthSeg segmentation and a VoxelMorph-based deformable registration model, then averages the aligned images into an unbiased template volume. Optionally, reliability maps can be used for weighted averaging, which is recommended when the input data are not 1 mm isotropic.

## Source Information

- **Source language:** Python
- **Source file:** `mri_easyreg/mri_easyatlas`
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_easyatlas` (bash wrapper calling the Python script)
- **Deep learning model:** `$FREESURFER_HOME/models/easyreg_v10_230103.h5` (VoxelMorph), `$FREESURFER_HOME/models/synthseg_2.0.h5` (SynthSeg segmentation)
- **Dependencies:** TensorFlow, Keras, VoxelMorph (`vxm`), surfa (`sf`), nibabel, scipy, numpy, PyTorch

## Purpose and Context

`mri_easyatlas` is the atlas-construction component of the EasyReg suite. Rather than requiring a pre-defined template, it builds a subject-specific or study-specific atlas from a cohort of input scans. The resulting unbiased template can serve as a group-level reference for downstream registrations, morphometric analysis, or longitudinal studies. It is not a standard step in the `recon-all` pipeline but is useful for group studies where no standard-space template is appropriate.

The tool avoids requiring skull-stripped or standardized inputs by relying on SynthSeg to produce contrast-agnostic segmentations that guide the registration step.

## Inputs

- `--i <dir>`: Input directory containing MRI volumes. Supported formats: `.nii.gz`, `.nii`, `.mgz`.
- The tool reads all matching files from the directory sorted alphabetically.
- SynthSeg segmentations are computed automatically and stored in a `SynthSeg/` subdirectory.
- No assumptions about voxel size or orientation are strictly required, but 1 mm isotropic volumes are preferred. Non-isotropic data should use `--use_reliability_maps`.

## Outputs

Written to `--o <outdir>`:
- `<outdir>/SynthSeg/` — SynthSeg segmentations for each input
- `<outdir>/Registrations/` — pairwise or template-based registration fields
- `<outdir>/temp/` — intermediate temporary files
- Atlas volume (name depends on implementation; not directly visible from argument parser)

> [!gap] Unresolved question
> The exact filename of the final atlas volume written to the output directory is not specified in the argument parser; it must be inferred from running the tool or from downstream documentation.

## Mathematical Foundations

Atlas construction follows an unbiased group registration strategy:

1. **SynthSeg segmentation** of each input image to produce contrast-invariant label maps with parcellation labels (including cortical parcels > label 1000).

2. **EasyReg pairwise registration**: each input is registered to a reference (or iteratively to an evolving mean) using the pre-trained VoxelMorph model (`easyreg_v10_230103.h5`). Registration produces forward and backward dense deformation fields.

3. **Template averaging**: deformed images are averaged (possibly with reliability-map weighting) into the atlas.

The internal atlas affine is initialized to:

$$A = \begin{pmatrix} -1 & 0 & 0 & 79 \\ 0 & 0 & 1 & -104 \\ 0 & -1 & 0 & 79 \\ 0 & 0 & 0 & 1 \end{pmatrix}$$

with volume size $[160, 160, 192]$ voxels (a standard 1 mm MNI-like space used by EasyReg internally).

> [!math] Reliability maps
> When `--use_reliability_maps` is enabled, each voxel contribution to the atlas mean is weighted by a reliability estimate, down-weighting voxels that are unreliably interpolated (e.g., near field-of-view boundaries in non-isotropic data).

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i` | `<dir>` | required | Input directory with scan volumes (.nii.gz, .nii, .mgz) |
| `--o` | `<dir>` | required | Output directory for atlas and intermediate files |
| `--threads` | `<int>` | `-1` (all cores) | Number of CPU threads (TF + PyTorch); `-1` uses all available |
| `--use_reliability_maps` | flag | off | Use reliability maps for weighted averaging (recommended for non-isotropic data) |

## Configuration Interactions

- `--threads` sets both TensorFlow inter/intra-op threads and PyTorch threads. Setting to `-1` auto-detects CPU count.
- `--use_reliability_maps` should always be set when input data are not 1 mm isotropic, as interpolation artefacts near FOV boundaries can otherwise bias the atlas.
- The tool requires `FREESURFER_HOME` to be set (checked explicitly at startup) and loads models from `$FREESURFER_HOME/models/`.
- CUDA is disabled (`CUDA_VISIBLE_DEVICES=-1`); runs on CPU only.

## Typical Use Cases

```bash
# Build atlas from a directory of 1mm isotropic T1w scans
mri_easyatlas --i /data/study/scans/ --o /data/study/atlas/

# Build atlas from non-isotropic data with reliability weighting
mri_easyatlas --i /data/study/scans/ --o /data/study/atlas/ --use_reliability_maps

# Limit to 8 CPU threads
mri_easyatlas --i /data/study/scans/ --o /data/study/atlas/ --threads 8
```

## Pipeline Context

`mri_easyatlas` is not called by `[[recon-all]]`. It is a standalone atlas-construction tool. Typical usage:
1. Run `[[mri_easyreg]]` for individual subject-to-template registration once the atlas is built.
2. Use `[[mri_easywarp]]` to apply the resulting deformation fields.

## Gotchas and Caveats

> [!gotcha] CUDA is always disabled
> The source code hardcodes `os.environ['CUDA_VISIBLE_DEVICES'] = '-1'`, so the tool always runs on CPU regardless of whether a GPU is available.

> [!gotcha] SynthSeg requires cortical parcellation labels
> The code checks `np.sum(ref_seg_buffer > 1000) == 0` and exits fatally if no cortical labels are found. This means SynthSeg must produce parcellation-level output, not just whole-brain segmentation. The tool uses `synthseg_2.0.h5` and `synthseg_parc_2.0.h5`.

> [!gotcha] Non-isotropic inputs degrade atlas quality
> Without `--use_reliability_maps`, non-isotropic input data can produce biased atlas voxels near the boundaries of each image's field of view.

> [!gap] Output atlas filename
> The exact output atlas filename is not documented in the argument parser. Users should inspect the output directory after the run.

## Related Tools

- `[[mri_easyreg]]` — pairwise deep-learning registration using the same model
- `[[mri_easywarp]]` — applies deformation fields produced by EasyReg
- `[[mri_fuse_intensity_images]]` — alternative intensity image fusion for longitudinal studies

## Confidence and Gaps

**High confidence:** argument list (from source), deep learning model paths, threading behaviour, CUDA disabled, SynthSeg dependency.

**Medium confidence:** exact atlas averaging algorithm; the source code is too large to read in full and the atlas construction loop is not fully visible from the first 100 lines.

> [!gap] Atlas averaging loop
> The atlas construction loop (lines 100+) was not fully read. The exact iterative strategy (number of rounds, convergence criterion) is unknown.
