---
title: "mri_gca_ambiguous"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_gca_ambiguous/mri_gca_ambiguous.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mri_log_likelihood]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Ambiguity definition not fully traced"
  - "Full option list not confirmed"
tags:
  - atlas
  - gca
  - flash
  - ambiguity
---

# mri_gca_ambiguous

## Summary

`mri_gca_ambiguous` identifies voxels where a Gaussian Classifier Atlas (GCA) model is ambiguous — i.e., where multiple tissue classes have similar likelihood given the observed MRI intensities. It is designed for FLASH (multi-echo, multi-flip-angle) acquisitions and reports a global ambiguity measure as well as an ambiguity volume.

## Source Information

- **Language:** C++
- **Source file:** `mri_gca_ambiguous/mri_gca_ambiguous.cpp`

## Purpose and Context

A GCA assigns each voxel to the most probable tissue class given its MRI intensity. However, at certain combinations of acquisition parameters (TR, TE, flip angle), some tissue pairs (e.g., GM and WM) may have very similar predicted intensities, making the atlas unreliable. `mri_gca_ambiguous` quantifies this ambiguity by simulating MRI contrast for a given set of acquisition parameters and computing the overlap between class-conditional intensity distributions.

This information can be used to optimise FLASH acquisition parameters to minimise ambiguity for a given atlas.

## Inputs

| Argument | Description |
|----------|-------------|
| `<gca>` | GCA atlas file |
| `<output>` | Output ambiguity map volume |

Optional: MRI volume (if `-i` is specified) for subject-specific ambiguity.

## Outputs

- Ambiguity map volume: per-voxel ambiguity values.
- Log file `amb.log` (default) with global ambiguity statistics per acquisition parameter combination.

## Mathematical Foundations

For a given set of acquisition parameters, the tool simulates the expected MRI signal for each tissue class using the FLASH signal equation:

$$
S = M_0 \sin\alpha \cdot \frac{1 - e^{-T_R/T_1}}{1 - \cos\alpha \cdot e^{-T_R/T_1}} \cdot e^{-T_E/T_2^*}
$$

where $M_0$ is the proton density, $T_1$ and $T_2^*$ are relaxation times, $\alpha$ is the flip angle, $T_R$ is the repetition time, and $T_E$ is the echo time.

The ambiguity for a class pair $(c_1, c_2)$ is related to the overlap between the two Gaussian distributions:

$$
\text{Amb}(c_1, c_2) = \exp\left(-\frac{(\mu_1 - \mu_2)^2}{2(\sigma_1^2 + \sigma_2^2)}\right)
$$

The tool provides 1D, 2D, and 3D ambiguity computation functions (`GCAcompute1DAmbiguity`, `GCAcompute2DAmbiguity`, `GCAcompute3DAmbiguity`) for different numbers of FLASH channels.

> [!gap] Exact ambiguity formula
> The precise definition of the global ambiguity metric `pamb` in the source was not fully traced.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | GCA file | required | GCA atlas |
| (positional 2) | path | required | Output ambiguity map |
| `-TR <val>` | float | 20.0 | Repetition time (ms) |
| `-TE <val>` | float | 3.0 | Echo time (ms) |
| `-min_fa1 <val>` | float | 1.0 | Minimum flip angle 1 (deg) |
| `-max_fa1 <val>` | float | 40.0 | Maximum flip angle 1 (deg) |
| `-min_fa2 <val>` | float | 1.0 | Minimum flip angle 2 (deg) |
| `-max_fa2 <val>` | float | 40.0 | Maximum flip angle 2 (deg) |
| `-min_fa3 <val>` | float | 1.0 | Minimum flip angle 3 (deg) |
| `-max_fa3 <val>` | float | 40.0 | Maximum flip angle 3 (deg) |
| `-fa_step <val>` | float | 1.0 | Flip angle step size (deg) |
| `-l <logfile>` | path | `amb.log` | Log file |
| `-class <n>` | int | -1 | Restrict to specific class number |
| `-left` | flag | off | Left hemisphere only |
| `-lambda <val>` | float | 100.0 | Regularisation lambda |
| `-optimize` | flag | off | Optimise acquisition parameters |
| `-append` | flag | off | Append to log file |

## Configuration Interactions

- `-optimize` mode iterates over the flip angle parameter grid and finds the combination minimising global ambiguity.
- `-class <n>` restricts ambiguity computation to a single tissue class, useful for targeted analysis.
- `-left` computes ambiguity for the left hemisphere only.

## Typical Use Cases

```bash
# Compute ambiguity map for default FLASH parameters
mri_gca_ambiguous atlas.gca ambiguity_map.mgz

# Optimise flip angles for FLASH acquisition
mri_gca_ambiguous atlas.gca ambiguity_map.mgz \
  -TR 20 -TE 3 -optimize \
  -min_fa1 5 -max_fa1 35 \
  -min_fa2 5 -max_fa2 35

# Append to existing log
mri_gca_ambiguous atlas.gca amb_out.mgz -append -l my_amb.log
```

## Pipeline Context

Not part of standard `recon-all`. Used in research settings to optimise FLASH protocol design for multi-echo segmentation. Related to the FLASH-based GCA atlas creation pipeline.

## Gotchas and Caveats

- The tool is specific to FLASH (multi-echo, multi-flip-angle) acquisitions and their T1/T2* parameterisation.
- Large flip angle grids with small step sizes can produce very large log files and long runtimes.
- The `scale` variable (default $10^{12}$) in the source is used to normalise the GCA before processing; this is a non-obvious internal parameter.

## Related Tools

- [[mri_ca_label]] — uses GCA for segmentation
- [[mri_log_likelihood]] — computes log-likelihood under GCA model

## Confidence and Gaps

**Medium confidence:** FLASH signal model and basic structure confirmed from source. Exact ambiguity metric not fully verified.
