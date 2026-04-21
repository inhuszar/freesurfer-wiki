---
title: "mris_compute_volume_fractions"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_compute_volume_fractions/mris_compute_volume_fractions.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_compute_layer_intensities]]"
  - "[[mri_vol2surf]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The accuracy parameter semantics (what unit and range) need clarification from mris_compVolFrac.h."
tags:
  - surface
  - volume-fraction
  - cortical-ribbon
  - laminar
  - morphometry
---

# mris_compute_volume_fractions

## Summary

`mris_compute_volume_fractions` computes, for each voxel in a reference volume, the fraction of that voxel's volume that lies within a specified surface. The output is a volume of the same dimensions as the input, where each voxel value is a number between 0 and 1 indicating what fraction of the voxel is "inside" the surface. This is used for accurate partial-volume modelling and laminar analysis.

## Source Information

- **Language:** C++ (original author: Ender Konukoglu)
- **Source file:** `mris_compute_volume_fractions/mris_compute_volume_fractions.cpp`
- Core computation: `MRIcomputeVolumeFractionFromSurface()` from `mris_compVolFrac.h`.

## Purpose and Context

Standard voxel-based tissue classification assigns each voxel a single tissue class (grey matter, white matter, CSF). In reality, voxels near tissue boundaries contain a mixture. Volume fractions quantify this mixture precisely: a voxel partially inside the white surface and partially outside might be 0.3 white matter and 0.7 other. These fractions enable:

- Accurate partial-volume correction in quantitative MRI.
- Laminar MRI analysis (by computing fractions relative to each cortical layer surface).
- More accurate cortical thickness and area measurements.

## Inputs

| Flag | Description | Required |
|------|-------------|----------|
| `--vol <file>` | Reference volume (defines voxel grid) | yes |
| `--surf <file>` | Surface file | yes |
| `--o <file>` | Output volume path | yes |
| `--accuracy <val>` | Accuracy parameter for volume computation | optional |

## Outputs

| Output | Description |
|--------|-------------|
| `<output>` | Volume of same dimensions as input; each voxel = fraction of voxel inside surface (float, 0–1) |

## Mathematical Foundations

For each voxel $x$ and surface $S$, the volume fraction is:

$$f(x) = \frac{V(x \cap \text{interior}(S))}{V(x)}$$

where $V$ denotes volume and "interior" is the region enclosed by the surface $S$.

The computation uses `MRIcomputeVolumeFractionFromSurface()`, which implements an accurate numerical integration over surface triangles to determine the fraction of each voxel volume that lies inside the closed surface. The `Accuracy` parameter controls the numerical precision (smaller = more accurate, slower).

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `--vol <file>` | Reference volume | required |
| `--surf <file>` | Surface file | required |
| `--o <file>` | Output file | required |
| `--accuracy <val>` | Numerical accuracy level | -1000 (default behaviour) |
| `--debug` | Enable debug output | off |

## Configuration Interactions

- The `--accuracy` parameter with its unusual default of -1000 suggests an internal interpretation in `MRIcomputeVolumeFractionFromSurface()`. The exact semantics should be verified in `mris_compVolFrac.h`.

## Typical Use Cases

```bash
# Compute fraction of each voxel inside white surface
mris_compute_volume_fractions \
    --vol $SUBJECTS_DIR/bert/mri/T1.mgz \
    --surf $SUBJECTS_DIR/bert/surf/lh.white \
    --o $SUBJECTS_DIR/bert/mri/lh.white_volfrac.mgz

# With custom accuracy
mris_compute_volume_fractions \
    --vol $SUBJECTS_DIR/bert/mri/T1.mgz \
    --surf $SUBJECTS_DIR/bert/surf/lh.pial \
    --accuracy 0.001 \
    --o lh.pial_volfrac.mgz
```

## Pipeline Context

Not part of `recon-all`. Used in laminar MRI analysis pipelines:

1. Compute volume fractions for each cortical layer surface.
2. Feed fractions to [[mris_compute_layer_intensities]].
3. Analyse layer-specific intensities for cytoarchitectonic mapping.

## Gotchas and Caveats

> [!gotcha] Surface must be closed
> The surface must form a closed manifold for the "interior" to be well-defined. Open surfaces (patches) will produce undefined results.

> [!gotcha] Debug message at startup
> The tool prints "working!" at startup (a developer artefact in the source). This is harmless but unexpected.

> [!gotcha] Accuracy default
> The default `Accuracy` of -1000 is unusual. Check `mris_compVolFrac.h` to understand how this value is interpreted.

## Related Tools

- [[mris_compute_layer_intensities]] — uses volume fractions as input
- [[mri_vol2surf]] — surface projection without partial-volume modelling

## Confidence and Gaps

**Confident:** I/O structure, purpose, and core call (`MRIcomputeVolumeFractionFromSurface`) confirmed from source.

> [!gap] Accuracy parameter semantics
> The default value of -1000 for `Accuracy` is not self-explanatory. Check `mris_compVolFrac.h` for the interpretation.
