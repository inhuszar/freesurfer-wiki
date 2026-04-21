---
title: "mri_ms_EM_with_atlas"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_ms_EM_with_atlas/mri_ms_EM_with_atlas.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ms_EM]]"
  - "[[mri_ms_fitparms]]"
  - "[[mri_ca_label]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "GCA atlas integration details not fully traced"
tags:
  - segmentation
  - EM
  - multi-spectral
  - atlas
  - flash
  - attic
---

# mri_ms_EM_with_atlas

## Summary

`mri_ms_EM_with_atlas` extends [[mri_ms_EM]] by incorporating a Gaussian Classifier Atlas (GCA) as spatial prior information during multi-spectral EM segmentation. It uses heuristic strategies specific to FLASH imaging (e.g., two flip angles at 30° and 5°) to initialize tissue classes — using the ratio of flip-angle images to identify CSF — and can optionally use atlas priors to constrain the segmentation. This tool resides in `attic/` and is not part of the active build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_ms_EM_with_atlas/mri_ms_EM_with_atlas.cpp`
- **Author:** Xiao Han
- **Status note:** In `attic/` — legacy code, not compiled in FreeSurfer 8.2.0.

## Purpose and Context

This tool extends [[mri_ms_EM]] with two major enhancements:

1. **Atlas-guided segmentation:** An optional GCA atlas and its associated spatial transform can be provided to inject prior probabilities into the EM framework, improving segmentation quality in regions of poor contrast.

2. **FLASH-specific heuristics:** The source header specifically mentions "assume using two averages, first is 30, second is 5" (flip angles 30° and 5°), with hardcoded mixing weights for these two flip angles (`weight30=0.990247`, `weight5=-0.139292`). The intensity ratio between the two flip angles is used to identify CSF, which in turn refines the brain mask.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| FLASH volumes | [[mgz]] | Multi-echo FLASH volumes at two flip angles (30° and 5°) |
| GCA atlas | `.gca` | Optional Gaussian Classifier Atlas for prior probabilities |
| Transform | `.lta`, `.m3z` | Transform aligning atlas to subject space |
| Number of classes | int | Positional argument |
| Output stem | string | Base for output files |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Segmentation | [[mgz]] | Tissue class assignments |
| Bias-corrected volumes | [[mgz]] | INU-corrected FLASH images |
| Synthesized volume | [[mgz]] | Synthetic contrast image (e.g., T1-like) |

## Mathematical Foundations

Extends the [[mri_ms_EM]] GMM-EM with atlas-derived spatial priors:

$$
q_{ik} \propto \pi_k^{atlas}(\mathbf{x}_i) \cdot \mathcal{N}(\mathbf{y}_i \mid \boldsymbol{\mu}_k, \boldsymbol{\Sigma}_k)
$$

where $\pi_k^{atlas}(\mathbf{x}_i)$ is the GCA-derived prior probability for class $k$ at voxel $\mathbf{x}_i$.

**CSF identification from flip-angle ratio:** The ratio $I_{30}/I_5$ is sensitive to T1 — CSF has a very long T1 and therefore a very different ratio from brain tissue. The heuristic uses this ratio to initialize the CSF class before running EM.

**Dura removal:** A `FIX_DURA = 1` flag indicates dura mater is removed from the segmentation result using spatial reasoning.

**Image synthesis:** The `synth_flag` enables writing a synthesized image (likely a T1-weighted synthetic from the estimated T1 and PD maps).

**Contrast inversion:** The `-invert` flag inverts the output image contrast, which may be useful for compatibility with other tools expecting a specific polarity.

## Configuration Options

Flag list verified against `attic/mri_ms_EM_with_atlas/mri_ms_EM_with_atlas.cpp` (`get_option()`).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-gca <fname>` | string | null | GCA atlas filename |
| `-xform <fname>` | string | null | Transform from atlas to subject space |
| `-no_INU` | flag | off | Disable INU bias correction |
| `-kappa <f>` | float | 1e-8 | Covariance regularization |
| `-T1_PD` | flag | off | Treat inputs as T1 and PD (not two flip angles) |
| `-invert` | flag | off | Invert output image contrast |
| `-remove_cerebellum` | flag | off | Remove cerebellum in the final synthesized image |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Enable debug output for the voxel at coordinates `(x, y, z)` |
| `-conform` | flag | off | Interpolate volume to isotropic 1 mm³ |
| `-noconform` | flag | — | Inhibit isotropic volume interpolation (cancels `-conform`) |
| `-fuzzy_lda` | flag | off | Use fuzzy LDA weighting scheme instead of standard class assignments |
| `-clear_dura` | flag | off | Remove voxels belonging to the second tissue class (dura removal) |
| `-whole_volume` | flag | off | Synthesize background region as well (only with `-lda`) |
| `-lda <class1> <class2>` | 2 ints | — | Use LDA method to generate synthesized volume from the two specified classes |
| `-synthonly` | flag | off | Write synthesized image only; do not output membership functions |
| `-norm` | flag | off | Normalize input volumes to N(0,1) before EM |
| `-mask <fname>` | string | — | Use `<fname>` as a mask for regions of interest |
| `-rescale` | flag | off | Rescale membership functions to improve contrast |
| `-noprior` | flag | off | Do not use prior in computing memberships |
| `-synth_f <fname>` | string | — | Output synthesized image to the given file |
| `-hseg_f <fname>` | string | — | Output hard segmentation to the given file |
| `-hard_seg` | flag | off | Output a hard segmentation to `<out_pre>.hseg` |
| `-label <fname>` | string | — | Use `<fname>` as segmentation volume |
| `-mask_subcortical` | flag | off | Also mask subcortical grey matter regions |
| `-st <method>` / `-sample <method>` / `-sample_type <method>` / `-interp <method>` | string | `trilinear` | Interpolation method (`trilinear`, `nearest`, `sinc`, `cubic`) |
| `-sinc [<hw>]` | int (opt.) | 3 | Use sinc interpolation with optional half-window size |
| `-trilinear` | flag | — | Use trilinear interpolation (explicit shorthand) |
| `-cubic` | flag | — | Use cubic interpolation |
| `-nearest` | flag | — | Use nearest-neighbour interpolation |
| `-sinchalfwindow <n>` / `-hw <n>` | int | 3 | Set sinc interpolation half-window size |
| `-beta <f>` | float | — | Weight for MRF (Markov Random Field) regularization |
| `-regularize <lambda>` | float | — | Regularize covariance matrix with the given lambda |

## Configuration Interactions

- `-gca` and `-xform` must be provided together; one without the other will cause an error.
- `-T1_PD` changes the interpretation of the two input volumes from flip-angle images to T1 and PD maps.
- `-invert` combined with `-remove_cerebellum` produces a stripped, contrast-inverted synthetic image.
- `-synthonly` skips membership function output; `-synth_f` and `-hseg_f` specify alternative output paths.
- `-lda` requires `-whole_volume` if synthesis of background regions is needed.
- Interpolation flags (`-st`, `-sample`, `-trilinear`, `-nearest`, `-sinc`, `-cubic`) are aliases; the last one specified wins.
- `-conform` and `-noconform` are mutually exclusive; default is to not conform.

## Typical Use Cases

```bash
# FLASH segmentation with GCA atlas
mri_ms_EM_with_atlas \
  flash_FA30.mgz flash_FA5.mgz \
  -gca /path/to/RB_all.gca \
  -xform talairach.m3z \
  3 seg_output

# T1/PD inputs without atlas
mri_ms_EM_with_atlas -T1_PD T1map.mgz PDmap.mgz 3 seg_output
```

## Pipeline Context

Not part of standard `recon-all`. Was used in research pipelines for multi-echo FLASH datasets, particularly for brain morphometry studies requiring quantitative tissue characterization.

## Gotchas and Caveats

> [!gotcha] Attic status
> In `attic/` — not compiled in FreeSurfer 8.2.0.

> [!gotcha] Hardcoded FLASH flip angle weights
> The mixing weights `weight30=0.990247` and `weight5=-0.139292` are hardcoded for 30° and 5° flip angles. Using this tool with different flip angles will produce incorrect CSF identification and may degrade segmentation quality.

> [!gotcha] Atlas must be aligned to the same space as the FLASH data
> The GCA atlas spatial priors are applied in voxel space after the transform is applied. If the FLASH volumes and the transform are not in compatible spaces, the atlas priors will be applied incorrectly.

## Related Tools

- [[mri_ms_EM]] — the atlas-free version
- [[mri_ms_fitparms]] — fits quantitative T1/PD from FLASH
- [[mri_ca_label]] — atlas-based labelling for standard T1 data

## Confidence and Gaps

**Confident:** Atlas integration concept, CSF identification via flip-angle ratio, FIX_DURA behaviour, hardcoded FLASH weights, attic status.

**Less confident:** Exact GCA integration algorithm, synthesized image computation details.
