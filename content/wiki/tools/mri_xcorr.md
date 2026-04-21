---
title: "mri_xcorr"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_xcorr/mri_xcorr.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_voldiff]]"
  - "[[mri_wbc]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/ — may be deprecated."
  - "The full flag set was not traced from source."
tags:
  - correlation
  - comparison
  - attic
---

# mri_xcorr

## Summary

`mri_xcorr` computes voxel-wise cross-correlation between two input volumes and optionally applies a mask. It is a diagnostic/analysis tool for measuring spatial correspondence between two volumetric maps. The source resides in `attic/mri_xcorr/`, suggesting it may be a legacy tool.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_xcorr/mri_xcorr.cpp`
- **Original author:** Douglas Greve (MGH)
- **Note:** Located in `attic/` — legacy status. Main variables: `v1File`, `v2File`, `maskFile`, `outFile`.

## Purpose and Context

Cross-correlation between two volumetric images is used to:
1. Assess similarity between a predicted and measured map
2. Compute lag-based temporal correlation in fMRI timeseries
3. Validate registration quality (spatial cross-correlation)

## Inputs

| Variable | Description |
|----------|-------------|
| `v1File` | First input volume |
| `v2File` | Second input volume |
| `maskFile` | Optional mask volume |

> [!gap] Flags not fully documented
> The full flag set was not traced from source. Run `mri_xcorr --help`.

## Outputs

| Variable | Description |
|----------|-------------|
| `outFile` | Output cross-correlation volume |

## Mathematical Foundations

The voxel-wise cross-correlation is computed between corresponding voxels across the two input volumes. Based on the function call `fMRIxcorr()` (from `fmriutils` library), this likely computes the Pearson correlation between the two volumes' frame timeseries at each voxel:

$$\rho(c,r,s) = \frac{\sum_t (v_1(c,r,s,t) - \bar{v}_1)(v_2(c,r,s,t) - \bar{v}_2)}{\sqrt{\sum_t(v_1-\bar{v}_1)^2} \sqrt{\sum_t(v_2-\bar{v}_2)^2}}$$

or a lagged cross-correlation for temporal analysis.

> [!gap] Exact cross-correlation type
> Whether this computes temporal (across frames) or spatial (across voxels) cross-correlation, and whether a lag is supported, was not confirmed from source.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--v1` | `vol1` | First input volume |
| `--v2` | `vol2` | Second input volume |
| `--mask` | `maskvol` | Optional mask |
| `--o` | `outvol` | Output cross-correlation volume |
| `--debug` | — | Debug output |
| `--version` | — | Print version |

> [!gap] Complete flag list
> The above flags were inferred from variable declarations in the source header. The complete set may differ. Consult `--help`.

## Configuration Interactions

> [!gap] Interactions not documented

## Typical Use Cases

```bash
# Compute cross-correlation between two functional volumes
mri_xcorr \
    --v1 bold1.mgz \
    --v2 bold2.mgz \
    --o xcorr.mgz
```

## Pipeline Context

Not part of `recon-all`. Used in fMRI analysis for comparing timeseries maps.

## Gotchas and Caveats

> [!gotcha] Deprecated tool
> Source is in `attic/`. Consider [[mri_wbc]] for current whole-brain connectivity analyses.

## Related Tools

- [[mri_voldiff]] — compares two volumes for equality
- [[mri_wbc]] — whole-brain connectivity (more comprehensive)

## Confidence and Gaps

**Low confidence:** Most details are inferred from variable names and function calls.

> [!gap] Source not fully read
> `attic/mri_xcorr/mri_xcorr.cpp` was not fully read. All details require source review.
