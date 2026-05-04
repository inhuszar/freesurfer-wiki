---
title: "mri_si_prep"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_si_prep/mri_si_prep.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_segment]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - mri
  - interpolation
  - segmentation
  - preparation
---

# mri_si_prep

## Summary

`mri_si_prep` prepares MRI intensity and segmentation volumes for "smart interpolation" by reducing the field of view (FoV) around a specified structure and subsampling along one dimension. It takes a full-FoV intensity volume and a full-FoV segmentation volume, crops them to a region containing the specified segmentation label(s) with optional padding, and outputs reduced-FoV versions with every $k$-th slice retained along the specified interpolation dimension. This is used as a preprocessing step for MRI super-resolution or slice interpolation methods targeting specific anatomical structures.

## Source Information

- **Language:** C++
- **Source file:** `mri_si_prep/mri_si_prep.cpp`
- **Author:** Doug Greve
- **Help file:** `mri_si_prep/mri_si_prep.help.xml`

## Purpose and Context

Smart interpolation (SI) algorithms can synthesize missing slices in MRI volumes, particularly useful for:
- Anisotropic MRI data where one dimension has lower resolution
- Generating training data for slice-interpolation networks
- Creating reduced-FoV volumes for efficient processing of specific structures (e.g., hippocampus)

`mri_si_prep` is the input preparation step that:
1. Identifies the bounding box of the specified segmentation region
2. Optionally pads the bounding box by `npad` voxels
3. Crops both the intensity and segmentation volumes to the bounding box
4. Retains every `nskip`-th slice along the specified dimension (simulating the thick-slice acquisition)

The output volume has a reduced FoV and contains only every `nskip`-th slice in the interpolation dimension, with the remaining slices set to zero or removed.

## Inputs

| Flag | Description |
|------|-------------|
| `--i invol inseg` | Full-FoV input intensity volume and segmentation volume |
| `--segno segno` | Segmentation number(s) to process (repeatable) |

## Outputs

| Flag | Description |
|------|-------------|
| `--o outvol outseg` | Output reduced-FoV intensity and segmentation volumes |

## Mathematical Foundations

The FoV reduction is defined by the bounding box of segmentation label(s) in the input segmentation volume, expanded by `npad` voxels in all directions. The subsampling retains only slices at positions $i$ where $i \mod \text{nskip} = 0$ along the interpolation dimension.

The interpolation dimension is specified as:
- Axial (ap direction): `--ax` or `--dim 4`
- Coronal (is direction): `--cor` or `--dim 5`
- Sagittal (lr direction): `--sag` or `--dim 6`

The `SIfill` function fills every `nskip`-th slice with 1 as a separate mode (`--fill` argument).

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i invol inseg` | paths | required | Input intensity and segmentation volumes |
| `--o outvol outseg` | paths | required | Output reduced-FoV intensity and segmentation volumes |
| `--segno segno` | integer | required | Segmentation label number (repeat for multiple labels) |
| `--nskip nskip` | integer | required | Keep every nskip-th slice |
| `--dim interpdim` | 1-6 or ax/cor/sag | required | Interpolation dimension |
| `--ax` | — | — | Axial interpolation (equivalent to `--dim 4` or `--dim ax`) |
| `--cor` | — | — | Coronal interpolation (equivalent to `--dim 5` or `--dim cor`) |
| `--sag` | — | — | Sagittal interpolation (equivalent to `--dim 6` or `--dim sag`) |
| `--npad npad` | integer | -1 (auto) | Crop padding in voxels around segmentation bounding box |
| `--threads N` | integer | 1 | Number of OpenMP threads |
| `--fill template nskip interpdim outvol` | paths+ints | — | Standalone fill mode: set every nskip slice to 1 along interp dir |

## Configuration Interactions

- `--ax`, `--cor`, and `--sag` are shorthand equivalents of `--dim 4`, `--dim 5`, `--dim 6` respectively; using more than one is not meaningful.
- `--segno` can be repeated multiple times to include multiple structure labels in the FoV crop.
- `--npad` defaults to -1 (automatic padding); set explicitly to control the bounding box expansion.
- `--fill` mode is a standalone operation that does not require `--i`/`--o`/`--segno` — it fills a template volume.

## Typical Use Cases

**Prepare left hippocampus (label 17) for coronal SI with 5× undersampling:**
```bash
mri_si_prep --nskip 5 --segno 17 --dim cor --threads 2 --npad 5 \
    --i orig.mgz aseg.mgz --o si.orig.mgz si.lh.hippo.mgz
```

**Prepare with multiple structures (both hippocampi):**
```bash
mri_si_prep --nskip 4 --segno 17 --segno 53 --cor --npad 3 \
    --i T1.mgz aseg.mgz --o T1.si.mgz seg.si.mgz
```

## Pipeline Context

Not part of `recon-all`. Used in super-resolution or smart interpolation research pipelines:

1. `mri_si_prep` — crops and subsamples the input volumes
2. Smart interpolation algorithm (neural network or classical) — reconstructs missing slices
3. `mri_convert` or other tool — reassembles full-FoV volume

## Gotchas and Caveats

> [!gotcha] Segmentation label must exist in inseg
> If the specified `--segno` label does not appear in the segmentation volume, the bounding box will be empty and the output may be a zero-size volume or error.

> [!gotcha] npad defaults to -1 (auto)
> When --npad is not specified, the default is -1 which may trigger automatic padding detection. For reproducible outputs, specify `--npad` explicitly.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — general MRI format conversion and cropping
- [[mri_segment]] — produces the segmentation used as input

## Confidence and Gaps

**Confident (from source and help.xml):**
- Complete flag list from `mri_si_prep.help.xml`
- Dimension specification (ax/cor/sag or numeric)
- Fill mode operation
- OpenMP threading support
