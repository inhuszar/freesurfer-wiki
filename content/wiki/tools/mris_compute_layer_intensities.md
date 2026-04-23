---
title: "mris_compute_layer_intensities"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_volume_fractions/mris_compute_layer_intensities.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_compute_volume_fractions]]"
  - "[[mris_BA_segment]]"
  - "[[mri_vol2surf]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Relationship between -nlayers and required number of volume fraction frames not fully tested."
  - "-curv stratification output format not documented."
tags:
  - surface
  - cortical-layers
  - intensity
  - laminar
  - histology
---

# mris_compute_layer_intensities

## Summary

`mris_compute_layer_intensities` computes the mean MRI intensity within each of the cortical layers (1–6) for each voxel in a volume, using pre-computed volume fractions that partition the cortical ribbon into laminar compartments. The output is a multi-frame volume where each frame corresponds to one cortical layer.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mri_compute_volume_fractions/mris_compute_layer_intensities.cpp`
- **Note:** Source lives in the `mri_compute_volume_fractions/` directory, reflecting its close relationship with volume-fraction computations.

## Purpose and Context

Laminar MRI analysis exploits intensity variations perpendicular to the cortical surface to characterise cytoarchitectonic structure. `mris_compute_layer_intensities` is a key step in this pipeline: given a pre-computed volume of laminar fractions (how much of each voxel belongs to each cortical layer, from [[mris_compute_volume_fractions]]), it weights the observed intensities to estimate the per-layer mean intensity. The result enables layer-specific analysis of quantitative MRI contrasts.

## Inputs

Positional arguments:

| Positional | Description |
|-----------|-------------|
| `<subject>` | FreeSurfer subject name |
| `<hemi>` | Hemisphere |
| `<intensity_vol>` | Intensity volume (e.g., T1, T2*, R1) |
| `<volume_fractions>` | Per-layer volume fraction volume (multi-frame) |
| `<output>` | Output layer-intensity volume |

- Reads `$SUBJECTS_DIR/<subject>/surf/<hemi>.<surface>` for surface geometry.
- Reads multiple surface files when multiple layers are being processed.

## Outputs

| Output | Description |
|--------|-------------|
| `<output>` | Multi-frame volume; frame $i$ = mean intensity in cortical layer $i+1$ |

Default: 6 cortical layers (`NLAYERS = 6`).

## Mathematical Foundations

For each voxel $x$ and layer $l$:

$$
I_l(x) = \frac{\int_{\Omega_l(x)} I(\xi) \, d\xi}{\int_{\Omega_l(x)} d\xi} \approx \frac{\sum_\xi f_l(\xi, x) \cdot I(\xi)}{\sum_\xi f_l(\xi, x)}
$$

where $f_l(\xi, x)$ is the volume fraction of voxel $\xi$ attributed to layer $l$ of the cortex passing through voxel $x$, computed by [[mris_compute_volume_fractions]] or related tools.

A thresholded version (`vfrac_thresh`) ignores voxels whose total cortical volume fraction falls below a threshold.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-nlayers <n>` | int | 6 | Number of cortical layers |
| `-w <whalf>` | int | 3 | Half-window size for neighbourhood averaging |
| `-fs_names` | — | off | Use FreeSurfer standard surface naming (`white` / `pial`); requires `-s` |
| `-thresh <t>` | float | -1 (disabled) | Minimum volume-fraction threshold; activates thresholded intensity estimation |
| `-curv <n>` | int | 0 | Number of curvature bins for curvature-stratified analysis |
| `-lh` | — | required | Process left hemisphere |
| `-rh` | — | required | Process right hemisphere |
| `-s <subject>` | string | — | Subject name (required when `-fs_names` is used) |
| `-v <vertex>` | int | — | Debug: print diagnostics for this vertex number |
| `-debug_voxel <x> <y> <z>` | int triple | — | Debug: print diagnostics for voxel (x, y, z) |

## Configuration Interactions

- `-thresh` activates the thresholded computation path (`compute_thresholded_layer_intensities()`), which uses a different internal function than the default path.
- `-curv` enables curvature-stratified analysis; results are further subdivided by surface curvature bins.
- `-fs_names` must be combined with `-s <subject>` to enable standard FreeSurfer surface path resolution; without `-s` the tool exits with an error.
- Either `-lh` or `-rh` must be specified; the parser exits with an error if neither is provided (`"must specify -rh or -lh"`).

## Typical Use Cases

```bash
# Compute layer intensities for subject bert, left hemisphere
mris_compute_layer_intensities bert lh \
    $SUBJECTS_DIR/bert/mri/T1.mgz \
    $SUBJECTS_DIR/bert/mri/lh.volume_fractions.mgz \
    $SUBJECTS_DIR/bert/mri/lh.layer_intensities.mgz
```

## Pipeline Context

Not part of `recon-all`. Used in ultra-high field (7T) cortical laminar analysis pipelines, typically after computing volume fractions with [[mris_compute_volume_fractions]]. The output can feed into [[mris_BA_segment]] for Brodmann area delineation.

## Gotchas and Caveats

> [!gotcha] MAX_LAYERS = 50
> The code supports up to 50 layers (`MAX_LAYERS`), though the default is 6. Large numbers of layers require correspondingly multi-frame volume fraction inputs.

> [!gotcha] Source in mri_compute_volume_fractions/
> The source file is in the `mri_compute_volume_fractions/` directory, not a dedicated `mris_compute_layer_intensities/` directory. This may affect installation packaging.

## Related Tools

- [[mris_compute_volume_fractions]] — computes the volume fractions used as input
- [[mris_BA_segment]] — uses laminar intensities for Brodmann area mapping
- [[mri_vol2surf]] — related volume-to-surface projection

## Confidence and Gaps

**Confident:** Core algorithm, layer count, thresholding mode, I/O structure, and all flag names confirmed from `get_option()` in source.
