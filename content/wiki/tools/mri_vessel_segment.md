---
title: "mri_vessel_segment"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mri_vessel_segment.cxx"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_synthstrip]]"
  - "[[mri_watershed]]"
  - "[[mri_vsinus_seg]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full list of ITK filters actually applied in the default (non-shape) mode is not documented in-source."
  - "The --shape mode labels (1, 2, 3) are not explained in comments."
  - "Relationship to the resurf pipeline is not clearly documented."
tags:
  - vessel
  - segmentation
  - surface-refinement
---

# mri_vessel_segment

## Summary

`mri_vessel_segment` segments blood vessels from T1- and T2-weighted MRI volumes using a multimodal approach. It provides two operating modes: a default intensity-based vessel segmentation using the `MRIS_MultimodalRefinement` library, and an alternative `--shape` mode that performs morphological shape analysis of a binary vessel mask to classify objects by size, roundness, and elongation using ITK.

## Source Information

- **Language:** C++
- **Source file:** `resurf/mri_vessel_segment.cxx`
- **Dependencies:** ITK (Insight Toolkit), FreeSurfer `mri.h`/`mrisurf.h` libraries, `mris_multimodal_refinement.h`
- **Note:** Located in the `resurf/` subdirectory, which houses tools for multimodal surface refinement.

## Purpose and Context

Accurate segmentation of cerebral blood vessels is useful for:
1. Excluding vessels from cortical surface reconstruction (they can cause topological errors)
2. Studying vascular anatomy

The tool operates on pairs of T1 and T2 images, exploiting the complementary contrast of each modality to identify vessels. It is part of the `resurf` (re-surface) toolkit for improving surface accuracy using multimodal data.

## Inputs

| Flag | Description |
|------|-------------|
| `-t1 <file>` | T1-weighted input volume (required) |
| `-t2 <file>` | T2-weighted input volume (required in default mode) |
| `-aseg <file>` | Aseg segmentation volume (optional, used in default mode) |
| `-o <file>` | Output vessel segmentation volume (required) |
| `--shape` | Switch to shape-analysis mode (uses only `-t1` as binary mask input) |

## Outputs

| Output | Description |
|--------|-------------|
| Output volume (`-o`) | Vessel segmentation map in the same space as the input |

In default mode: a binary or intensity-weighted vessel map.
In `--shape` mode: a label image classifying objects as label 1 (small round), label 2 (larger round), or label 3 (elongated); large objects (physical size > 1000 units) are removed.

## Mathematical Foundations

**Default mode:** Calls `refinement.SegmentVessel(imageT1, imageT2, vesselMR, 0)` from the `MRIS_MultimodalRefinement` class. The exact algorithm is defined in `mris_multimodal_refinement.h/.cxx`. It uses multimodal intensity features to distinguish vessels from brain parenchyma.

**Shape mode:** Uses ITK morphological analysis on a binary input mask:

1. Binarise input (threshold [0,1] → 255 inside, 0 outside)
2. Convert to label map via `BinaryImageToShapeLabelMapFilter`
3. Compute shape attributes for each object:
   - `PhysicalSize` — volume in mm³
   - `Roundness` — 1.0 = perfect sphere
   - `Elongation` — > 0.99 indicates a tube-like structure
4. Classification rules:
   - `PhysicalSize > 1000` → removed (too large to be a vessel)
   - `Roundness > 0.80` and `PhysicalSize > 10` → label 1
   - `Roundness > 0.80` and `PhysicalSize ≤ 10` → label 2
   - `Elongation > 0.99` → label 3

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-t1` | `<file>` | — | T1-weighted input volume |
| `-t2` | `<file>` | — | T2-weighted input volume (default mode only) |
| `-aseg` | `<file>` | — | Optional aseg segmentation to guide vessel detection |
| `-o` | `<file>` | — | Output filename |
| `--shape` | — | off | Enable shape-analysis mode instead of multimodal intensity segmentation |

## Configuration Interactions

- In default mode, both `-t1` and `-t2` are expected; `-aseg` is optional.
- In `--shape` mode, only `-t1` is read (as a binary vessel mask to be analysed); `-t2` and `-aseg` are ignored.
- The two modes are mutually exclusive: either `--shape` is specified or it is not.

## Typical Use Cases

```bash
# Default multimodal vessel segmentation
mri_vessel_segment \
    -t1 bert/mri/orig.mgz \
    -t2 bert/mri/T2.mgz \
    -aseg bert/mri/aseg.mgz \
    -o bert/mri/vessels.mgz

# Shape-mode analysis of an existing binary vessel mask
mri_vessel_segment \
    -t1 bert/mri/vessels_binary.mgz \
    -o bert/mri/vessels_labeled.mgz \
    --shape
```

## Pipeline Context

This tool is not called by the standard `recon-all` pipeline. It is part of the experimental `resurf` pipeline for multimodal surface refinement:

- Used after obtaining T1 and T2 data aligned to the same space
- The vessel map may be passed to surface refinement tools to exclude vessel voxels

See also [[mri_vsinus_seg]] for deep-learning-based venous sinus segmentation.

## Gotchas and Caveats

> [!gotcha] ITK compilation guards
> Several ITK filter headers (`CoherenceEnhancingDiffusionImageFilter`, `GradientAnisotropicDiffusionImageFilter`, `ThresholdMaximumConnectedComponentsImageFilter`) are wrapped in `#if 0` guards due to compilation errors on Ubuntu 24 with native ITK 5.3. The actual filtering pipeline is therefore reduced from the originally intended design.

> [!gotcha] Shape mode label meanings are undocumented
> Labels 1, 2, 3 in `--shape` mode are assigned by roundness and size thresholds but these thresholds are hardcoded and their biological interpretation is not described in any comment or documentation.

> [!gap] Default mode algorithm
> The actual vessel segmentation algorithm used in default mode (inside `SegmentVessel()`) is implemented in `mris_multimodal_refinement.cxx` and is not described here. The quality and assumptions of this method are unknown without reading that source file.

## Related Tools

- [[mri_vsinus_seg]] — deep learning venous sinus segmentation (tcsh script wrapping a U-Net model)
- [[mri_synthstrip]] — skull stripping (removes non-brain including vessels outside brain)
- [[mri_watershed]] — legacy skull stripping

## Confidence and Gaps

**High confidence:** command-line interface, shape-mode algorithm (directly from source), ITK filter list.

**Medium confidence:** default mode behaviour (delegates to `SegmentVessel()`, not analysed here).

> [!gap] SegmentVessel algorithm
> The implementation of `MRIS_MultimodalRefinement::SegmentVessel()` in `resurf/mris_multimodal_refinement.cxx` was not read for this page. The mathematical details of the default vessel segmentation are therefore unknown.
