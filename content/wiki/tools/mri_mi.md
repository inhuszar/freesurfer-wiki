---
title: "mri_mi"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mi/mri_mi.cpp"
  - "mri_mi/mri_mi.h"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - information-theory
  - registration
  - quality-control
---

# mri_mi

## Summary

`mri_mi` computes the Mutual Information (MI) between two input MRI volumes that share the same geometry and coordinate space. It outputs the MI value, which can be used as a quality metric for registration or as a similarity measure between two co-registered images. Both volumes must be geometrically aligned (same voxel grid).

## Source Information

- **Language:** C++
- **Source file:** `mri_mi/mri_mi.cpp`, `mri_mi/mri_mi.h`
- **Author:** Lilla Zollei

## Purpose and Context

Mutual information is a widely used similarity metric in medical image registration, particularly for multi-modal alignment (e.g., T1 vs. T2, MRI vs. PET). `mri_mi` computes MI between two already-aligned volumes as an image quality metric or post-registration validation tool — it does not perform registration itself.

The tool uses joint and marginal histograms with configurable bin counts to estimate the probability distributions needed for MI computation.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Volume 1 | [[mgz]] / any MRI | First input volume |
| Volume 2 | [[mgz]] / any MRI | Second input volume (must have same geometry as volume 1) |

**Usage:** `mri_mi [options] <vol1> <vol2>`

Both volumes must have identical dimensions, voxel sizes, and coordinate frames. The tool does not perform resampling.

## Outputs

The MI value is printed to `stdout`. No output file is written unless a silent mode flag suppresses console output.

## Mathematical Foundations

Mutual information between two random variables $X$ (intensities in vol1) and $Y$ (intensities in vol2) is:

$$
I(X; Y) = H(X) + H(Y) - H(X, Y)
$$

where $H(\cdot)$ is the Shannon entropy:

$$
H(X) = -\sum_{x} p(x) \log_2 p(x)
$$

and $H(X,Y)$ is the joint entropy:

$$
H(X, Y) = -\sum_{x,y} p(x,y) \log_2 p(x,y)
$$

The marginal distributions $p(x)$ and $p(y)$, and the joint distribution $p(x,y)$, are estimated from intensity histograms with configurable bin counts (default 64 bins each).

The histogram is initialized from the min–max intensity range of each volume (`HISTOinit()` with `min1, max1` and `min2, max2`).

## Configuration Options

All flags use a single dash. Options are matched case-insensitively via `stricmp`.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--bins <n1> <n2>` | 2 × int | 64 64 | Set the number of histogram bins for volume 1 and volume 2 simultaneously. Both values must be provided as consecutive arguments. |
| `--silent` | boolean | false | In non-silent mode (default), prints per-volume progress messages and labels the MI result. In silent mode, prints only the bare numerical MI value — useful for scripting (`mi=$(mri_mi --silent v1.mgz v2.mgz)`). |

> [!gotcha] `--bins` takes two arguments, not one
> The flag --bins n1 n2 consumes two following arguments and sets both bin counts simultaneously. There are no separate --bins1 or --bins2 flags.

## Configuration Interactions

- `--bins` controls the granularity of both the marginal and joint histograms. More bins increase precision but also increase sensitivity to outlier voxels that set the min/max range of the histogram. For 8-bit data (0–255), the default 64 bins provides approximately 4 intensity levels per bin.
- `--silent` suppresses progress messages but does not suppress the final MI result; in silent mode the output is a bare float on a single line, suitable for shell variable capture.

## Typical Use Cases

```bash
# Compute MI between two co-registered T1 volumes
mri_mi T1_scan1.mgz T1_scan2.mgz

# Compare T1 and T2 after registration with 128 bins each
mri_mi --bins 128 128 T1.mgz T2.mgz

# Silent mode for scripting (captures only the bare MI number)
mi_value=$(mri_mi --silent T1.mgz T2.mgz)
echo "MI = $mi_value"
```

## Pipeline Context

Not part of standard `recon-all`. Used in:
- Post-registration quality control to verify alignment quality.
- Multi-modal registration pipeline validation (T1/T2/FLAIR alignment).
- Longitudinal studies to assess scan similarity across time points.

## Gotchas and Caveats

> [!gotcha] Volumes must have identical geometry
> The two input volumes must have exactly the same dimensions and voxel grid. If volumes are in different spaces (e.g., one in native space, one in MNI), MI will be computed between misaligned data, yielding meaningless results. Use [[mri_convert]] or [[mri_mask]] to align geometries first.

> [!gotcha] Histogram bin count affects MI magnitude
> The estimated MI value depends on the number of bins. Comparing MI values computed with different bin counts is not valid. For longitudinal or group comparisons, always use the same bin parameters.

> [!gotcha] Intensity range affects histogram
> The histogram is initialized from the actual min–max of each volume. If one volume has outlier voxels (e.g., from B0 artefacts), the effective bin width may be very large, reducing MI sensitivity. Consider clipping intensities before computing MI.

## Related Tools

- [[mri_em_register]] — uses MI-based similarity internally for registration
- [[mri_convert]] — for format conversion and geometry alignment
- [[coordinate-systems]] — relevant for ensuring volumes are in the same space

## Confidence and Gaps

**Confident:** All flags (from complete source reading), MI formula using joint histogram, histogram initialization from min-max, output to stdout.
