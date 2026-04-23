---
title: "mri_simulate_atrophy"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_simulate_atrophy/mri_simulate_atrophy.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_normalize]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Attic tool — unknown if compiled/installed in 8.2.0"
  - "Border label defaults per target label not fully traced for all label types"
tags:
  - mri
  - simulation
  - atrophy
  - longitudinal
  - deprecated
---

# mri_simulate_atrophy

## Summary

`mri_simulate_atrophy` simulates atrophic changes in cortical or subcortical structures in a T1-weighted MRI volume. Given a segmentation (aseg) and a normalized T1 image, it darkens the T1 intensities at the boundary between a target structure (e.g., hippocampus) and its neighboring tissue by a specified percentage, simulating volume loss. Gaussian noise is also added. This is used to generate synthetic longitudinal data for testing atrophy detection algorithms.

> [!gotcha] Attic tool
> This tool resides in `attic/` and may not be compiled or installed in FreeSurfer 8.2.0. It was likely used for validation studies in the longitudinal processing stream.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_simulate_atrophy/mri_simulate_atrophy.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Simulating atrophy is valuable for:
- Validating longitudinal processing pipelines (e.g., FreeSurfer's `-long` stream)
- Testing sensitivity and specificity of atrophy detection algorithms
- Generating ground-truth longitudinal data for algorithm benchmarking

The simulation works by modifying T1 intensities at the boundary of a target label, making them darker (lower intensity) to mimic partial volume effects that occur as a structure shrinks.

## Inputs

| Positional | Description |
|------------|-------------|
| `argv[1]` | Segmentation volume (aseg.mgz) |
| `argv[2]` | Normalized T1 volume (norm.mgz or brain.mgz) |
| `argv[argc-1]` | Output volume filename |

## Outputs

| Output | Description |
|--------|-------------|
| Output volume | Modified T1 volume with simulated atrophy (written to `argv[argc-1]`) |

## Mathematical Foundations

The simulation darkens boundary voxels of the target structure by `atrophy_pct` (default: 5%):

For each voxel at the boundary between the target label and neighboring border labels:
$$
I_{\text{out}}(x) = I_{\text{in}}(x) \cdot (1 - \text{atrophy\_pct})
$$

Gaussian noise with zero mean and standard deviation `noise_sigma` (default: 4 intensity units) is then added to the entire brain:
$$
I_{\text{final}} = I_{\text{out}} + \mathcal{N}(0, \sigma^2_n)
$$

where $\sigma_n = 4$ by default. The noise is masked to exclude non-brain voxels (using `MRImaskZero`).

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-l <label>` | integer | Left_Hippocampus (17) | Target label to simulate atrophy in (CMA label integer) |
| `-a <pct>` | float | 0.05 (5%) | Atrophy fraction; values > 1 are interpreted as a percentage and divided by 100 |
| `-n <sigma>` | float | 4.0 | Standard deviation of added Gaussian noise |
| `-debug_voxel <x> <y> <z>` | integers | — | Enable debug output for voxel at coordinates (x, y, z) |

> [!gotcha] No CLI flag for border labels
> The border labels (neighbors used to detect the boundary of the target structure) are hardcoded in `main()`. For `Left_Hippocampus` these are `Left_Lateral_Ventricle`, `Left_Inf_Lat_Vent`, and `Unknown`. There is no CLI flag to override them.

**Default border labels for Left_Hippocampus:**
- Left_Lateral_Ventricle
- Left_Inf_Lat_Vent
- Unknown

## Configuration Interactions

- `-l` sets the target label. The corresponding border labels are hardcoded per target and cannot be changed via the CLI.
- Noise is always added regardless of other settings (no option to disable it).
- `-a` values above 1 are treated as a percentage (e.g., `-a 10` becomes 0.10 internally); values above 100 cause an error.

## Typical Use Cases

**Simulate 5% hippocampal atrophy (default):**
```bash
mri_simulate_atrophy aseg.mgz norm.mgz simulated_atrophy.mgz
```

**Simulate 10% atrophy in a different structure:**
```bash
mri_simulate_atrophy -l 17 -a 0.10 aseg.mgz norm.mgz norm_10pct_atrophy.mgz
```

## Pipeline Context

Not part of `recon-all`. Used in research and validation contexts:
1. Run `recon-all` on a baseline scan
2. Use `mri_simulate_atrophy` to create a synthetic follow-up with known atrophy
3. Run `recon-all -long` on the simulated follow-up
4. Evaluate detection sensitivity

## Gotchas and Caveats

> [!gotcha] Hard-coded default labels
> The default target label is `Left_Hippocampus` and the default border labels are hardcoded in `main()` using CMA label constants. Using other structures requires explicit `-label` and `-border` flags.

> [!gotcha] Noise always added
> Gaussian noise is unconditionally added to the output. There is no flag to suppress noise addition. The noise is masked to the brain (non-zero voxels in norm.mgz).

## Related Tools

- [[mri_segment]] — produces the aseg segmentation used as input
- [[mri_normalize]] — produces the norm.mgz volume used as input

## Confidence and Gaps

**Confident (from source):**
- Default parameter values (noise_sigma, atrophy_pct, target/border labels)
- Processing logic (darken boundary + add noise)
- Input/output structure

> [!gap] Attic status
> It is unknown whether this tool is compiled and available in FreeSurfer 8.2.0.
