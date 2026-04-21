---
title: "mri_histo_eq"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_histo_eq/mri_histo_eq.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_histo_normalize]]"
  - "[[mri_normalize]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Behaviour with multi-frame volumes not documented"
tags:
  - normalization
  - histogram
  - preprocessing
  - intensity
---

# mri_histo_eq

## Summary

`mri_histo_eq` performs histogram equalization of a source MRI volume to match the intensity distribution of a template volume. Given a source image and a template image, it remaps the source intensities so that its histogram matches the template's histogram. An optional LTA transform can be used to align the source and template before computing the histogram mapping. This is a preprocessing step for multi-site harmonization or for preparing images for atlas-based algorithms that expect a specific intensity distribution.

## Source Information

- **Source language:** C++
- **Source file:** `mri_histo_eq/mri_histo_eq.cpp`
- **Original author:** (no explicit author in header, copyright to MGH)

## Purpose and Context

Histogram equalization / matching is used to normalize the intensity scale of MRI volumes acquired with different scanner protocols, field strengths, or institutions. Unlike simple linear scaling, histogram matching nonlinearly remaps intensities to achieve the same statistical distribution as the target. Use cases include:

- Pre-processing for multi-site studies before group analysis
- Preparing images for atlas-based segmentation algorithms trained on a specific intensity range
- Correcting systematic intensity differences between follow-up scans

`mri_histo_eq` computes the cumulative distribution function (CDF) of both the source and template volumes and creates a lookup table that maps each source intensity to the template intensity with the same cumulative probability.

## Inputs

| Input | Positional | Description |
|-------|-----------|-------------|
| Source volume | argv[1] | Volume to be equalized |
| Template volume | argv[2] | Reference volume whose histogram to match |
| Output file | argv[3] | Path for the equalized output volume |

Optional:
- LTA transform filename (specified with `-t <xform_name>`) to bring the template into the source space before computing the histogram mapping

## Outputs

| Output | Description |
|--------|-------------|
| Equalized volume | Source volume with intensities remapped to match template histogram |

## Mathematical Foundations

**Default mode (`MRIhistoNormalize`):**

The default function `MRIhistoNormalize(mri_src, NULL, mri_template, 30, 170)` normalises the intensity distribution of the source to match the template. The parameters `30` and `170` are the low and high intensity thresholds passed to the function; voxels outside this range in the template are excluded from the histogram computation.

**Adaptive mode (`MRIadaptiveHistoNormalize`):**

With `-a`, the function `MRIadaptiveHistoNormalize(mri_src, NULL, mri_template, 8, 32, 30)` is called. Parameters are `nblocks=8`, `block_size=32`, `threshold=30`. This performs a spatially-varying (block-wise) histogram normalisation.

**Transform mode:**

If `-t <xform>` is provided, the tool reads the LTA for both source and template from the directory of each volume (the transform filename is stripped to its basename and appended to each volume's path). It then computes a combined transform $M = M_{src}^{-1} \cdot M_{template}$ and resamples the template into the source space before histogram normalisation.

## Configuration Options

Usage: `mri_histo_eq [options] <source_volume> <template_volume> <output_volume>`

All option flags use a single `-` prefix. The parser uses a `switch` on the uppercase first character of the option string.

### Positional arguments

| Position | Description |
|----------|-------------|
| 1 | Source volume to normalise |
| 2 | Template volume whose histogram to match |
| 3 | Output normalised volume path |

### Optional flags

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-a` | (none) | off | Use adaptive (block-wise) histogram normalisation (`MRIadaptiveHistoNormalize`) with 8 blocks of size 32 and threshold 30 |
| `-t <xform_name>` | filename (no path) | none | LTA filename (without directory path) to spatially align source and template before computing the histogram mapping; the tool looks for `<src_dir>/<xform_name>` and `<template_dir>/<xform_name>` |

## Configuration Interactions

- `-a` and the default mode are mutually exclusive; `-a` switches the normalisation function entirely.
- `-t <xform>` is applied to the template (not the source): it computes $M_{src}^{-1} \cdot M_{template}$ and resamples the template into the source space. The matched histogram is then applied to the original source. The transform file must be in the same directory as each respective volume.
- Without `-t`, histograms are computed directly from the unregistered volumes; this assumes both volumes are already in approximately the same intensity space.

> [!gotcha] The `-t` flag takes only the filename, not a full path
> The source extracts `FileNameOnly(xform_fname, xform_fname)` stripping the path, then prepends each volume's own directory. Passing a full path will cause incorrect LTA lookup.

## Typical Use Cases

**Match source histogram to template (default normalisation):**
```bash
mri_histo_eq source.mgz template.mgz equalized.mgz
```

**Adaptive block-wise normalisation:**
```bash
mri_histo_eq -a source.mgz template.mgz equalized.mgz
```

**With spatial alignment (transform in same directory as each volume):**
```bash
# Places register.lta in source/ and template/ directories first
mri_histo_eq -t register.lta source.mgz template.mgz equalized.mgz
```

## Pipeline Context

`mri_histo_eq` is not called by `recon-all`. It is a preprocessing tool typically used:
- Before multi-site group analysis to normalize intensity scales
- As a preprocessing step for segmentation algorithms

## Gotchas and Caveats

> [!gotcha] Histogram matching does not correct bias fields
> Histogram equalization normalizes the global intensity distribution but does not correct spatially-varying intensity inhomogeneity (bias field). For bias correction, use `mri_nu_correct` before or after histogram equalization.

> [!gotcha] Non-brain voxels affect the histogram
> If the volumes are not skull-stripped, background and skull voxels will influence the histogram and potentially distort the mapping. Apply a brain mask before equalization or ensure both volumes have similar tissue compositions.

## Related Tools

- [[mri_histo_normalize]] — alternative normalization using control point matching
- [[mri_normalize]] — bias-field-aware normalization

## Confidence and Gaps

**High confidence:** Full `get_option()` and `main()` functions read from source; both flags (`-a` and `-t`) confirmed with exact semantics. Default function is `MRIhistoNormalize` (not `MRIhistoEqualize`); adaptive function is `MRIadaptiveHistoNormalize`. Output is always in the source volume's space. The previous `-xfm` flag name was incorrect; the actual flag is `-t`.

**Medium confidence:** Behaviour with multi-frame volumes is unverified.

> [!gotcha] Flag name correction
> The previous wiki had `-xfm` as the transform flag. The actual flag in the source is `-t <xform_name>` (single-character switch on `'T'`).
