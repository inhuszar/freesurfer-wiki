---
title: "mris_BA_segment"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_BA_segment/mris_BA_segment.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[mris_register]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full flag set for get_option() not read."
  - "Definition of laminar intensity profiles and how they are constructed is not documented here."
tags:
  - surface
  - brodmann
  - segmentation
  - myeloarchitectonics
---

# mris_BA_segment

## Summary

`mris_BA_segment` segments a Brodmann area (specifically area MT/V5 in the documented use case) from cortical MRI data by fitting laminar intensity profiles to subject data and comparing them to known cytoarchitectonic probability distributions. It uses a log-likelihood maximisation approach seeded by a prior label to delineate the cortical area.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_BA_segment/mris_BA_segment.cpp`
- Uses MT radius statistics from Zilles data: mean 7.79 mm, std 1.13 mm.

## Purpose and Context

Brodmann areas are cytoarchitectonically defined cortical regions that cannot be identified from T1 MRI alone using sulcal geometry. `mris_BA_segment` uses laminar intensity profiles (sampled perpendicular to the cortical surface) as a proxy for local cytoarchitecture, combined with spatial priors, to probabilistically locate specific Brodmann areas. The primary target documented in the source is area MT (middle temporal area), though the framework is general.

This is a specialised research tool for mapping myeloarchitectonic or cytoarchitectonic boundaries on individual subjects.

## Inputs

| Input | Description |
|-------|-------------|
| `<surf_name>` | Surface file path (positional 1) |
| `<profile_name>` | Laminar intensity profile volume (positional 2) |
| `<prior_name>` | Prior label file for seed region (positional 3) |
| `<out_name>` | Output label file path (positional 4) |

- The profile volume should have one frame per cortical layer, with intensities sampled perpendicular to the surface.
- The prior label provides an approximate seed region around the expected Brodmann area location.

## Outputs

| Output | Description |
|--------|-------------|
| `<out_name>` | Output label file defining the segmented Brodmann area |

## Mathematical Foundations

For each candidate region (defined by a centre vertex $v_0$ and radius $r$), the log-likelihood of the observed intensity profiles given a MT-like cytoarchitectonic model is computed:

$$
\mathcal{L}(v_0, r) = \sum_{v \in \mathcal{N}(v_0, r)} \log p(\text{profile}(v) \mid \text{MT model})
$$

The MT log-likelihood function `compute_MT_log_likelihood()` is parameterised by the mean radius $\bar{r} = 7.79$ mm and standard deviation $\sigma_r = 1.13$ mm (from Zilles dataset), combined with within-region profile statistics.

The tool scales the brain by $\sqrt{A_{\text{orig}} / A_{\text{total}}}$ to normalise for overall brain size before computing geodesic distances.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-n <nbhd_size>` | int | 2 | Neighbourhood size |
| `-a <navgs>` | int | 0 | Number of smoothing averages |

> [!gap] Flag set incomplete
> Additional flags may exist; `get_option()` was not fully read.

## Configuration Interactions

- Brain scaling (normalisation for size) is always applied before geodesic distance computation.
- The prior label is used to constrain the search region.

## Typical Use Cases

```bash
# Segment MT from laminar profiles with a prior label
mris_BA_segment lh.sphere.reg lh.mt_profiles.mgz \
    label/lh.MT_prior.label label/lh.MT_auto.label
```

## Pipeline Context

Not part of the standard `recon-all` pipeline. Used in specialised analyses of myeloarchitectonics or cytoarchitectonics that require high-resolution imaging data (e.g., 7T MRI with laminar sampling). Requires pre-computed laminar intensity profiles (e.g., from `mris_compute_layer_intensities`).

## Gotchas and Caveats

> [!gotcha] Domain-specific tool
> This tool is designed for a very specific scientific question (Brodmann area delineation from laminar profiles). It is not a general-purpose parcellation tool.

> [!gotcha] Laminar profiles must be pre-computed
> The `<profile_name>` volume must be prepared externally; the tool does not perform profile sampling internally.

## Related Tools

- [[mris_ca_label]] — atlas-based cortical parcellation
- [[mris_compute_layer_intensities]] — may produce the profile input
- [[mris_anatomical_stats]] — morphometric statistics on resulting labels

## Confidence and Gaps

**Confident:** Core algorithm structure, MT model parameters, and I/O confirmed from source.

> [!gap] Profile volume format
> The exact expected format of the laminar profile volume (how many frames, what sampling) is not documented in this page. Investigate `mris_compute_layer_intensities` output format.
