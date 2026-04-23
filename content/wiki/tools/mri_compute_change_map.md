---
title: "mri_compute_change_map"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_change_map/mri_compute_change_map.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_fwhm]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - longitudinal
  - change-map
  - statistics
---

# mri_compute_change_map

## Summary

`mri_compute_change_map` computes a voxelwise longitudinal change map between two registered MRI volumes. It uses a robust estimate of the noise level to convert intensity differences into a statistical map, enabling detection of regions that have changed significantly between time points. The tool also supports neighbourhood-based p-value computation and multiple comparisons correction.

## Source Information

- **Language:** C++
- **Source file:** `mri_compute_change_map/mri_compute_change_map.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Longitudinal change maps quantify local intensity differences between paired (registered) MRI volumes. Rather than a raw subtraction, `mri_compute_change_map` normalises the difference by a robust noise estimate to produce a map interpretable as a statistical quantity (approximately proportional to signal-to-noise of change). This is useful for detecting focal atrophy, lesion evolution, or other time-varying structural changes.

## Inputs

| Argument | Description |
|----------|-------------|
| `<vol1>` | First time-point volume |
| `<vol2>` | Second time-point volume |
| `<transform>` | Registration transform aligning vol2 to vol1 (LTA or `identity.nofile`) |
| `<output>` | Output change map volume |

Both volumes must be in the same space after applying the transform.

## Outputs

- `<output>`: change map volume, with values proportional to the magnitude of change relative to noise.
- Optional log file (via `-l <logfile>`).

## Mathematical Foundations

The change map is computed by `MRIcomputeChangeMap()`:

1. Compute the voxelwise difference $\Delta(\mathbf{x}) = I_2(T^{-1}(\mathbf{x})) - I_1(\mathbf{x})$ where $T$ is the registration transform.
2. Fit a histogram of differences with `HISTOrobustGaussianFit()` (iterated at decreasing smoothing levels: 20, 10, 5, 1) to estimate the robust Gaussian mean $\mu$ and standard deviation $\hat{\sigma}$ of the difference distribution.
3. For each voxel, compute a Gaussian CDF-based one-tailed p-value $p$ from the centred deviation $(I_2 - \mu) - I_1$ and the estimated $\hat{\sigma}$.
4. Convert to $-\log_{10}(p)$ for the output map; underflow voxels (where $p$ is numerically 0) are set to twice the maximum observed difference.

The neighbourhood p-value computation (`-n <size>`) combines the $-\log_{10}(p)$ values in a cubic neighbourhood of half-width `<size>` around each voxel:

$$
-\log_{10}(p_\text{nbhd}) = \sum_{\mathbf{y} \in \text{nbhd}(\mathbf{x})} -\log_{10}(1 - p(\mathbf{y}))
$$

Bonferroni correction (`-b`) multiplies each voxel's p-value by the number of brain voxels (those with non-zero change map values).

## Configuration Options

All flags use a single dash. Option matching is case-insensitive.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | First time-point volume. |
| (positional 2) | volume | required | Second time-point volume. |
| (positional 3) | transform | required | Registration transform (LTA file) that maps volume 2 coordinates into volume 1 space, or `identity.nofile` if both are already co-registered. |
| (positional 4) | path | required | Output change map (a $-\log_{10}(p)$ volume in the geometry of volume 1). |
| `-l <logfile>` | path | — | Write the estimated noise standard deviation ($\hat{\sigma}$) to a log file (one float per line). |
| `-s <sigma>` | float | 0.0 | Gaussian-smooth both input volumes with sigma `<sigma>` mm before computing the change map; applies iterative border erosion proportional to sigma to remove smoothing edge effects. |
| `-m <wsize>` | int | 0 | Apply a mean filter with window size `<wsize>` voxels to both input volumes before computing the change map; applies `(wsize-1)/2` border erosions. Mutually exclusive with `-s`. |
| `-e <n>` | int | 0 | Erode zero-voxel borders of each input volume `<n>` additional times before computing the change map (reduces skull-strip boundary artefacts). |
| `-n <size>` | int | 0 | Combine per-voxel $-\log_{10}(p)$ values over a cubic neighbourhood of half-width `<size>` voxels using additive log-probability combination. |
| `-b` | boolean | false | Apply Bonferroni correction: multiply the $-\log_{10}(p)$ value at each voxel by the number of non-zero voxels in the change map. |
| `-mask <vol>` | volume | — | Binary mask volume; zeros out matching voxels in both input volumes prior to change map computation. |
| `-debug_voxel <x> <y> <z>` | 3 × int | — | Enable per-voxel diagnostic output at voxel `(x, y, z)`. |
| `-identity.nofile` | — | — | **Not a flag — positional value.** Passing the string `identity.nofile` as positional argument 3 selects identity transform mode (no LTA file required). The audit extractor promotes this positional comparison to pseudo-flag `-identity.nofile`. |

## Configuration Interactions

- `-s <sigma>` and `-m <wsize>` are alternative smoothing operations applied to inputs before change computation; do not use both together.
- `-e <n>` and the automatic erosion inside `-s` are additive: if both are specified, the total erosion depth is the sum.
- `-n` and `-b` are post-processing steps on the change map and can be combined: first neighbourhood combination, then Bonferroni.
- `-b` counts non-zero change-map voxels as the number of tests; if the map is sparse, Bonferroni correction may be very conservative.
- `identity.nofile` as the transform causes the tool to set a voxel-to-voxel identity LTA internally, correctly configuring the geometry for the change computation.

## Typical Use Cases

```bash
# Basic change map between two time points
mri_compute_change_map tp1_norm.mgz tp2_norm.mgz \
  tp1_to_tp2.lta change_map.mgz

# With Gaussian smoothing and neighbourhood statistics
mri_compute_change_map tp1_norm.mgz tp2_norm.mgz \
  identity.nofile change_map.mgz \
  -s 1.5 -n 3 -b

# With log output (saves estimated noise sigma)
mri_compute_change_map tp1_norm.mgz tp2_norm.mgz \
  register.lta change_map.mgz -l change_stats.log

# With brain mask
mri_compute_change_map tp1_norm.mgz tp2_norm.mgz \
  register.lta change_map.mgz -mask brain_mask.mgz
```

## Pipeline Context

`mri_compute_change_map` is not a standard `recon-all` stage. It is used in longitudinal research workflows, typically after registration of paired time points. It complements the surface-based longitudinal pipeline by providing a volumetric change measure.

## Gotchas and Caveats

- The two input volumes must be in matched space. If a transform is provided, it is applied internally to vol2 before computing differences.
- The noise estimate is derived from the volumes themselves — atypical tissue (e.g., lesions, edema) may inflate the noise estimate and reduce sensitivity.
- Using `identity.nofile` as the transform requires that the volumes are already co-registered in voxel space.

## Related Tools

- [[mri_convert]] — format conversion and resampling
- [[mri_fwhm]] — spatial smoothness estimation (related statistical maps)

## Confidence and Gaps

**High confidence (from source):** All flags confirmed from complete `get_option()` read. Robust Gaussian fit noise estimation algorithm fully traced (`HISTOrobustGaussianFit` with iterated smoothing), Gaussian CDF-based p-value computation, neighbourhood combination formula, Bonferroni correction implementation, and output as $-\log_{10}(p)$ map all confirmed from source code.
