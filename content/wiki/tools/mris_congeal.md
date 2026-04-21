---
title: "mris_congeal"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_congeal/mris_congeal.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_average_curvature]]"
  - "[[mris_ca_train]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full flag set from get_option() not verified."
  - "Congealing algorithm (simultaneous vs. sequential registration) details need confirmation."
  - "gcsaSSE function semantics not documented."
tags:
  - surface
  - registration
  - atlas
  - congealing
  - group
---

# mris_congeal

## Summary

`mris_congeal` performs simultaneous group-wise surface registration (congealing) — registering all subjects simultaneously to a common template that is co-optimised with the registrations. Unlike [[mris_register]] which registers each subject to a fixed atlas, `mris_congeal` updates both the atlas and the individual registrations jointly, producing an unbiased group template.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_congeal/mris_congeal.cpp`
- Uses the GCSA infrastructure and `mris_register`-like spherical registration code.

## Purpose and Context

Standard atlas-based registration introduces a bias towards the chosen atlas. Congealing (or "groupwise registration") addresses this by simultaneously optimising all registrations so that the group average template emerges naturally from the data. This is particularly valuable for atlas construction and for population studies where no pre-existing atlas is appropriate.

The congealing approach:
1. Initialises with a preliminary atlas or identity registrations.
2. Iteratively updates individual subject registrations.
3. Simultaneously updates the group template.
4. Converges to a joint optimum.

## Inputs

Positional arguments:

| Positional | Description |
|-----------|-------------|
| `<hemi>` | Hemisphere: `lh` or `rh` |
| `<sphere_name>` | Input sphere file name (e.g., `sphere`) |
| `<canon_name>` | Canonical sphere name |
| `<annot_name>` | Annotation file name |
| `<subject1...>` | Subject names to co-register |
| `<output_dir>` | Directory for output files |

- Requires `SUBJECTS_DIR`.
- Uses `inflated.H` (mean curvature) and `sulc` (sulcal depth) as registration features.

## Outputs

| Output | Description |
|--------|-------------|
| Per-subject sphere files | Updated registered sphere files in the output directory |
| Atlas template | Group average template (exact format to be confirmed) |

## Mathematical Foundations

The congealing objective minimises the total registration energy across all subjects:

$$
E_{\text{total}} = \sum_{s=1}^{N} \left[ E_{\text{corr}}(s, \text{atlas}) + \lambda E_{\text{metric}}(s) \right]
$$

where $E_{\text{corr}}$ is the GCSA-based label correlation term and $E_{\text{metric}}$ penalises surface distortion.

The `gcsaSSE()` function (defined in the source) computes the GCSA-based sum of squared errors between a subject's features and the current group template.

Multi-scale optimisation uses sigmas: `sigmas[0..nsigmas]` for progressive blurring.

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `-n <navgs>` | Feature smoothing averages | 0 |
| `-sigma <s>` | Registration sigma (can be specified multiple times) | — |
| `-l <ocorr>` | Overlap correlation weight | 1.0 |
| `-1` | Single-subject mode (not group) | off |
| `-a <annot>` | Annotation name | — |
| `-P <n>` | Max registration passes | 4 |
| `-A <max>` | Max degrees rotation | 64.0 |
| `-a <min>` | Min degrees rotation | 0.5 |
| `-G <nangles>` | Number of rotation angles | 8 |
| `-N <nbrs>` | Neighbourhood size | 1 |
| `-reverse` | Reverse subject | off |

> [!gap] Flag names need verification
> Most flags were inferred from global variables. Confirm from `get_option()`.

## Configuration Interactions

- `nsigmas` controls the number of multi-scale registration stages; each sigma defines a smoothing level.
- `atlas_size = 3` is the number of surfaces used in the atlas (hardcoded).

## Typical Use Cases

```bash
# Congeal a group of subjects
mris_congeal lh sphere sphere.reg aparc \
    bert ernie alice frank george \
    /tmp/congeal_output/
```

## Pipeline Context

Not part of `recon-all`. Used in atlas construction workflows as an alternative to registering to a fixed atlas.

## Gotchas and Caveats

> [!gotcha] Computationally intensive
> Congealing over a large subject pool is significantly more expensive than individual registration, as all subjects must be held in memory and updated simultaneously.

## Related Tools

- [[mris_register]] — per-subject registration to a fixed atlas
- [[mris_average_curvature]] — post-registration group averaging
- [[mris_ca_train]] — alternative atlas construction approach

## Confidence and Gaps

**Confident:** Core concept, GCSA usage, multi-scale structure, and surface name arrays confirmed from source.

> [!gap] Full flag set and output format
> The `get_option()` body was not fully read. Output file naming convention in `output_dir` was not verified.
