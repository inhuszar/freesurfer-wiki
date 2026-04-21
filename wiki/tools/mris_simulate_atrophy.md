---
title: "mris_simulate_atrophy"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_simulate_atrophy/mris_simulate_atrophy.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_thickness]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact atrophy simulation model and its validation are not documented in the source header."
tags:
  - simulation
  - atrophy
  - cortical-thickness
  - research
---

# mris_simulate_atrophy

## Summary

`mris_simulate_atrophy` simulates cortical atrophy in a T1-weighted MRI volume by darkening intensities in the cortex proportionally to a specified atrophy fraction, using partial volume models and tissue compartment fractions. It can generate synthetic longitudinal datasets with controlled atrophy for algorithm validation. The tool is attributed to Bruce Fischl.

## Source Information

- **Language:** C++
- **Source file:** `mris_simulate_atrophy/mris_simulate_atrophy.cpp`
- **Key functions:** `MRISsimulateAtrophy()`, `MRIComputePartialVolumeFractions()`, `compute_unpartial_volumed_intensities()`
- **Key libraries:** `mri`, `mrisurf`, `label`, `transform`, `cma`

## Purpose and Context

Longitudinal neuroimaging studies require ground-truth validation data to assess the sensitivity of cortical thickness measurement algorithms. `mris_simulate_atrophy` creates such ground truth by:
1. Computing partial volume fractions for WM, GM, subcortical GM, and CSF at each voxel using a high-resolution model.
2. Darkening the T1 signal in a target region (specified by a label file) by replacing cortical tissue with CSF in proportion to the requested atrophy fraction.
3. Adding configurable Gaussian noise to the simulated volume.

This allows systematic evaluation of how well thickness algorithms detect known amounts of atrophy.

## Inputs

```
mris_simulate_atrophy [options] <subject> <hemi> <label> <atrophy_fraction> <output_volume>
```

| Argument | Position | Description |
|---------|----------|-------------|
| `<subject>` | 1 | FreeSurfer subject ID. |
| `<hemi>` | 2 | Hemisphere: `lh` or `rh`. |
| `<label>` | 3 | Label filename (looked up as `$SUBJECTS_DIR/<subject>/label/<hemi>.<label>`). Defines the cortical region to atrophy. |
| `<atrophy_fraction>` | 4 | Atrophy fraction in [0, 1] (or [0, 100] as percent — auto-divided by 100 if > 1). |
| `<output_volume>` | 5 | Output simulated T1 volume path (`.mgz`). |

The tool reads from `$SUBJECTS_DIR/<subject>/mri/` (`brain.finalsurfs.mgz`, `aseg.mgz`) and `surf/` (`lh.white`, `lh.pial`, `rh.white`, `rh.pial`) automatically.

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Simulated T1 volume | Modified T1 with artificially darkened cortex in the target region. | `.mgz` |
| Optional noisy atrophy volume | T1 with both simulated atrophy and added Gaussian noise. | `.mgz` |

## Mathematical Foundations

The atrophy simulation replaces cortical grey matter with CSF in the partial volume model. At each voxel, the simulated intensity is:

$$I_{\text{sim}}(x) = f_{\text{WM}} \cdot I_{\text{WM}} + f_{\text{GM}}(1-\alpha) \cdot I_{\text{GM}} + [f_{\text{CSF}} + f_{\text{GM}} \cdot \alpha] \cdot I_{\text{CSF}}$$

where $\alpha \in [0,1]$ is the atrophy fraction, $f_{\text{WM}}, f_{\text{GM}}, f_{\text{CSF}}$ are the partial volume fractions computed at resolution `resolution` (default: 0.5 mm), and $I_{\text{WM}}, I_{\text{GM}}, I_{\text{CSF}}$ are the "unpartial-volumed" (pure-tissue) intensities estimated from the volume.

**Noise model:** Additive Gaussian noise with standard deviation `noise_sigma` (default: 4) is optionally added to the simulated volume.

**Batch mode:** The tool supports looping over a range of atrophy fractions (from `atrophy_min` to `atrophy_max` in steps of `atrophy_step`) and noise levels to generate multiple synthetic datasets in a single run.

## Configuration Options

### Complete Flag Reference

All flags use single-dash prefix; names are case-insensitive.

| Flag | Argument type | Default | Description |
|------|--------------|---------|-------------|
| `-SDIR <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory (`sdir`). |
| `-T1 <name>` or `-input <name>` | string | `brain.finalsurfs.mgz` | T1 volume filename within `<subject>/mri/` (`T1_name`). |
| `-arange <min>:<step>:<max>` or `-atrophy_range <min>:<step>:<max>` | float colon-separated | — | Batch range for atrophy fraction. Three colon-separated values: `min:step:max`. Example: `0.0:0.1:0.5`. Overrides the positional `<atrophy_fraction>`. |
| `-nrange <min>:<step>:<max>` or `-noise_range <min>:<step>:<max>` | float colon-separated | — | Batch range for noise sigma. Three colon-separated values: `min:step:max`. |
| `-W <N>` | int | 1 | Half-window size for unpartial-volumed intensity estimation (`whalf`; must be ≥ 1). |
| `-S <val>` | float | 1.0 | Gaussian smoothing sigma (mm) applied during intensity estimation (`sigma`). |
| `-N <val>` | float | 4.0 | Noise standard deviation for additive Gaussian noise (`noise_sigma`). |
| `-R <val>` | float | 0.5 | Subvoxel resolution (mm) for the partial volume computation grid (`resolution`). |
| `-DEBUG_VOXEL <x> <y> <z>` | int×3 | — | Enable debug output for voxel at CRS coordinate `(x, y, z)`. |
| `--version` | boolean | — | Print version string and exit (handled by `handleVersionOption`). |
| `-u` or `?` | boolean | — | Print usage and exit. |

> [!gotcha] White and pial surface names are hardcoded
> Unlike many other tools, `mris_simulate_atrophy` has no flags to override the white surface name (hardcoded to `white`) or pial surface name (hardcoded to `pial`). Similarly, the aseg filename is hardcoded to `aseg.mgz`. Only the T1 volume name can be changed via `-T1`.

### Configuration Interactions

- Batch mode is triggered automatically when `-arange` or `-nrange` is specified. In batch mode, the tool generates one output volume per combination of atrophy fraction and noise level, appending `_a<atrophy>_n<noise>` to the output filename base.
- Without `-arange`, the single positional `<atrophy_fraction>` is used; noise uses the single value from `-N` (default 4.0).
- `-R` controls the density of the partial volume computation; lower values are more accurate but substantially slower. Value of 0.5 mm is the default and recommended for 1 mm isotropic T1 data.
- `-W` (half-window) and `-S` (sigma) control the local intensity estimation used to compute unpartial-volumed tissue intensities. Increasing `-W` averages over a larger neighbourhood.

## Typical Use Cases

**Simulate 20% cortical atrophy in a region of interest:**
```bash
mris_simulate_atrophy \
  MySubject lh \
  cortex_roi.label \
  0.20 \
  lh.simulated_atrophy_20pct.mgz
```

**Batch simulation across atrophy levels 0–50% in steps of 10%:**
```bash
mris_simulate_atrophy \
  -arange 0.0:0.1:0.5 \
  MySubject lh \
  cortex_roi.label \
  0.0 \
  lh.simulated_atrophy.mgz
```

Note: In batch mode, the output filename becomes the base; actual files will be named `lh.simulated_atrophy_a0.0_n4.0.mgz`, etc.

## Pipeline Context

`mris_simulate_atrophy` is not part of `recon-all`. It is a research tool for:
- Generating ground-truth synthetic longitudinal datasets.
- Validating cortical thickness measurement algorithms ([[mris_thickness]]).
- Power analysis for longitudinal study design.

## Gotchas and Caveats

> [!gotcha] High-resolution subvoxel computation is slow
> The partial volume fraction computation at 0.5 mm resolution is computationally intensive. Reducing `resolution` further (e.g., 0.25 mm) can make the tool extremely slow.

> [!gotcha] Label file defines the atrophy region
> Only the cortical region covered by the input label is affected. The rest of the volume remains unchanged. Labels must be in surface RAS coordinates matching the white surface.

## Related Tools

- [[mris_thickness]] — measures the cortical thickness that this tool is designed to test
- [[surface-format]] — surface and volume format reference

## Confidence and Gaps

**High confidence.** The complete flag list (from full `get_option()` reading), positional argument order (from `main()`), and partial volume simulation model are all confirmed from source. The mathematical validation of the atrophy model was not found in the source comments or header.
