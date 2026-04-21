---
title: "mris_curvature_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_curvature_stats/mris_curvature_stats.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_curvature]]"
  - "[[mris_anatomical_stats]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - curvature
  - statistics
  - morphometry
---

# mris_curvature_stats

## Summary

`mris_curvature_stats` computes descriptive statistics on curvature values across a cortical surface, optionally restricted to a label or filtered by magnitude. It supports multiple curvature types derived from the principal curvatures $k_1$ and $k_2$: raw (native), mean ($H$), Gaussian ($K$), sharpness ($S$), curvedness ($C$), shape index ($SI$), bending energy ($BE$), and folding index ($FI$). All second-order types are activated together by the `-G` flag. Statistics include mean, variance, min, max, and surface integrals, with optional histogram output. The tool was originally authored by Bruce Fischl and extensively extended by Rudolph Pienaar.

## Source Information

- **Language:** C++
- **Primary source:** `mris_curvature_stats/mris_curvature_stats.cpp`
- **Authors:** Bruce Fischl (original), Rudolph Pienaar (extensions)

## Purpose and Context

While `mris_curvature` computes per-vertex curvature values, `mris_curvature_stats` aggregates those values into summary statistics suitable for group comparison studies. It can also compute derived curvature measures (bending energy, shape index, etc.) that are not directly available from `mris_curvature`. The parcel-level summary statistics are useful for ROI-based curvature analysis aligned with parcellation atlases.

## Inputs

| Argument | Description |
|----------|-------------|
| Subject name (positional 1) | FreeSurfer subject identifier. |
| Hemisphere (positional 2) | `lh` or `rh`. |
| Curvature file name(s) (positional 3+) | One or more curvature overlay file basenames (e.g., `curv`, `sulc`). The surface to load them from is set by `-F` (default `smoothwm`). |

## Outputs

Outputs are written to stdout and optionally to files. The output includes:

- Per-surface statistics: min, max, mean, variance over all (non-filtered) vertices.
- Per-label statistics (when `-L` is specified): statistics restricted to the labelled region.
- Histogram of the curvature distribution (enabled by `-H` or `-P`).
- Optional secondary curvature overlay files (K, H, k1, k2, S, C, BE, FI) written to disk (enabled by `--writeCurvatureFiles` or implicitly by `-O`).

## Mathematical Foundations

The tool implements the following curvature-derived measures:

| Symbol | Name | Formula |
|--------|------|---------|
| $H$ | Mean curvature | $H = \frac{k_1 + k_2}{2}$ |
| $K$ | Gaussian curvature | $K = k_1 \cdot k_2$ |
| $S$ | Sharpness | $S = (k_1 - k_2)^2$ |
| $C$ | Curvedness | $C = \sqrt{\frac{k_1^2 + k_2^2}{2}}$ |
| $SI$ | Shape index | $SI = \frac{2}{\pi} \arctan\!\left(\frac{k_1+k_2}{k_2-k_1}\right)$ (when $k_1 \neq k_2$) |
| $BE$ | Bending energy | $BE = k_1^2 + k_2^2$ |
| $FI$ | Folding index | $FI = |k_1| \cdot (|k_1| - |k_2|)$ |

Surface integrals are computed in four modes:

| Mode | Description |
|------|-------------|
| Natural | Integral over all vertices (unweighted by curvature sign). |
| Rectified | Integral of $|c|$ (absolute value of curvature). |
| Positive | Integral restricted to vertices with $c \geq 0$. |
| Negative | Integral restricted to vertices with $c < 0$. |

The mean integral is normalised by the total surface area of the counted vertices.

## Configuration Options

### Complete Flag Reference

> [!gotcha] No separate per-curvature-type flags
> There are **no** individual flags such as `-K`, `-H`, `-k1`, `-k2`, `-SI`, `-BE`, `-FI` for activating individual second-order curvature types. All second-order types (K, H, k1, k2, S, C, BE, FI) are computed and reported together when `-G` is specified. Shape index requires the separate `--shapeIndex` flag in addition to `-G`.

#### Long flags (double-dash)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--lowPassFilter <f>` | float | — | Retain only vertices whose rectified curvature magnitude is **below** `<f>`. |
| `--highPassFilter <f>` | float | — | Retain only vertices whose rectified curvature magnitude is **above** `<f>`. |
| `--lowPassFilterGaussian <f>` | float | — | Low-pass filter on Gaussian curvature. |
| `--highPassFilterGaussian <f>` | float | — | High-pass filter on Gaussian curvature. |
| `--postScale <f>` | float | — | Multiply the curvature values by `<f>` after all other processing. |
| `--filterLabel <fname>` | string | — | Save the set of vertices that survive the filter step to a label file. |
| `--discrete` | boolean | — | Use discrete curvature calculations (this is the default mode). |
| `--continuous` | boolean | — | Use continuous (second fundamental form) curvature calculations instead of discrete. |
| `--writeCurvatureFiles` | boolean | — | Write each computed curvature type to a `.crv` overlay file on disk. Also activated implicitly by `-O`. |
| `--signedPrincipals` | boolean | — | Report signed (rather than unsigned magnitude) principal curvatures. |
| `--regionalPercentages` | boolean | — | Report each parcel's curvature as a percentage of the total surface curvature. |
| `--shapeIndex` | boolean | — | Enable shape index ($SI$) analysis. Must be combined with `-G` to compute the required principal curvatures. |
| `--vertexAreaNormalize` | boolean | — | Normalise each vertex's curvature by its vertex area. |
| `--vertexAreaWeigh` | boolean | — | Weight each vertex's curvature contribution by its vertex area when computing integrals. |
| `--vertexAreaNormalizeFrac` | boolean | — | Normalise by fractional vertex area (vertex area divided by total surface area). |
| `--vertexAreaWeighFrac` | boolean | — | Weight by fractional vertex area. |

#### Single-character flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-O <stem>` | string | — | Output file stem. Enables file-based output for all statistics and implicitly sets `--writeCurvatureFiles`. |
| `-F <surfname>` | string | `smoothwm` | Surface file name (without hemisphere prefix) to load curvature values from. |
| `-L <labelfile>` | string | — | Restrict statistics to the vertices in the specified label file. |
| `-A <n>` | integer | 0 | Number of smoothing averages applied to the curvature before analysis. |
| `-C <f>` | float | — | Raw scale factor applied to curvature values. |
| `-D <f>` | float | — | Scale minimum: values below this threshold are clamped. |
| `-E <f>` | float | — | Scale maximum: values above this threshold are clamped. |
| `-G` | boolean | — | Activate all second-order Gaussian curvature computations: K, H, k1, k2, S (sharpness), C (curvedness), BE (bending energy), FI (folding index). Does **not** enable shape index by itself; combine with `--shapeIndex` for that. |
| `-S <condition>` | string | — | Write summary statistics output tagged with the given condition label string. |
| `-H <bins>` | integer | — | Output a histogram of the curvature distribution with `<bins>` bins (count mode). Also enables min/max display. |
| `-P <bins>` | integer | — | Output a percentage histogram with `<bins>` bins. |
| `-B <binsize>` | float | — | Override the histogram bin size (instead of computing it from range and bin count). |
| `-I <start>` | float | — | Set the histogram start value. |
| `-J <end>` | float | — | Set the histogram end value. |
| `-Z <vno>` | integer | — | Zero the curvature value at the specified vertex index before analysis. |
| `-Q <maxUlps>` | integer | — | Set the floating-point comparison `maxUlps` tolerance for histogram bin assignment. |
| `-N` | boolean | — | Normalise curvature (`MRISnormalizeCurvature`) before analysis. |
| `-M` | boolean | — | Show min and max vertex values in the output. |
| `-V` | boolean | — | Print version string and exit. |

## Configuration Interactions

- `-G` must be set for any second-order curvature type (K, H, k1, k2, S, C, BE, FI) to be computed. Without `-G`, only the raw curvature statistics are reported.
- `-G` together with `--shapeIndex` activates shape index analysis. `--shapeIndex` alone has no effect if the principal curvatures are not computed.
- `--lowPassFilter` and `--highPassFilter` may be combined to implement a bandpass filter; vertices outside the pass band are excluded from statistics.
- `-O <stem>` implicitly activates `--writeCurvatureFiles`; any curvature type enabled by `-G` will also be written to disk.
- `-H` and `-P` are alternative histogram modes; both can be enabled simultaneously but only one is typically used.
- `-B`, `-I`, `-J` only have effect when a histogram mode (`-H` or `-P`) is active.
- `-A` smoothing is applied before any filtering or statistical computation.
- `--discrete` and `--continuous` are mutually exclusive computation modes; `--discrete` is the default.
- `--vertexAreaNormalize` and `--vertexAreaWeigh` can be combined with `--vertexAreaNormalizeFrac`/`--vertexAreaWeighFrac` but the interactions are additive within the integral computation.

## Typical Use Cases

### Compute raw curvature statistics for a subject

```bash
mris_curvature_stats subject01 lh curv
```

### Compute all second-order curvature types

```bash
mris_curvature_stats -G subject01 lh curv
```

### Compute second-order curvature including shape index, write files

```bash
mris_curvature_stats -G --shapeIndex --writeCurvatureFiles -O /tmp/subject01_lh subject01 lh curv
```

### Compute bending energy restricted to a label

```bash
mris_curvature_stats -G -L $SUBJECTS_DIR/subject01/label/lh.cortex.label subject01 lh curv
```

### Compute histogram of curvature distribution

```bash
mris_curvature_stats -H 100 subject01 lh curv
```

## Pipeline Context

`mris_curvature_stats` is not called by `recon-all` directly. It is used in post-processing and group analysis pipelines for morphometric studies of cortical geometry. It complements `mris_anatomical_stats` (which focuses on thickness and surface area) with curvature-based shape descriptors.

## Gotchas and Caveats

> [!gotcha] No separate per-curvature-type flags
> Despite what the help text may suggest, there are no flags `-K`, `-H`, `-SI`, `-BE`, `-FI`, `-k1`, `-k2` to activate individual curvature types. All second-order types are enabled together via `-G`. Shape index additionally requires `--shapeIndex`.

> [!gotcha] Shape index is undefined when k1 = k2
> The shape index formula $SI = \arctan((k_1+k_2)/(k_2-k_1))$ has a division-by-zero when $k_1 = k_2$ (an umbilic point). The source explicitly handles this: `return (af_k1 == af_k2 ? 0 : atan(...))`. Umbilic points are assigned $SI = 0$.

> [!gotcha] Output verbosity
> The tool produces a substantial amount of stdout output. Redirect to a file for programmatic use.

> [!gotcha] `-F` changes the surface, not the curvature overlay
> The `-F` flag sets the surface file name (e.g., `white`, `pial`) that is loaded. The curvature overlay names are the positional arguments. Both must be consistent (e.g., a curvature file computed on `white` should be loaded with `-F white`).

## Related Tools

- [[mris_curvature]] — computes the per-vertex curvature values analysed by this tool
- [[mris_anatomical_stats]] — complementary morphometric statistics (thickness, area)
- [[surface-format]] — curvature overlay file format

## Confidence and Gaps

Confidence is **high**. The complete `get_option()` function (lines 2410–2611 of `mris_curvature_stats.cpp`) was read from source. All flags are confirmed from the `stricmp`-based parser. Mathematical definitions are confirmed from the source enum and function implementations.
