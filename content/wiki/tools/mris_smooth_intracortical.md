---
title: "mris_smooth_intracortical"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_smooth_intracortical/mris_smooth_intracortical.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - smoothing
  - surface
  - fMRI
  - intracortical
  - laminar
---

# mris_smooth_intracortical

## Summary

`mris_smooth_intracortical` smooths laminar (intracortical) fMRI data by simultaneously applying tangential smoothing (across cortical surface neighborhoods) and radial smoothing (across multiple depth-resolved surface meshes). This preserves the high spatial resolution of laminar fMRI while increasing SNR without causing the cross-layer blurring that standard volumetric smoothing introduces. Developed by Anna I. Blazejewska.

## Source Information

- **Language:** C++
- **Source file:** `mris_smooth_intracortical/mris_smooth_intracortical.cpp`
- **Reference:** Blazejewska et al., *NeuroImage* 189:601–614, 2019. DOI: [10.1016/j.neuroimage.2019.01.054](https://doi.org/10.1016/j.neuroimage.2019.01.054)
- **Author:** Anna I. Blazejewska
- **Key constants:** `MAX_NB = 6` (max tangential neighborhood), `MAX_SURF = 20` (max surfaces), `MAX_VERTICES = 1000000`

## Purpose and Context

Standard volumetric Gaussian smoothing mixes signals from different cortical layers (depths), destroying the laminar specificity that high-resolution fMRI acquisitions are designed to capture. `mris_smooth_intracortical` solves this by smoothing data defined on a stack of depth-resolved surface meshes (equivolumetric or equidistant laminar surfaces) using:
- **Tangential smoothing:** A weighted average over spatial neighborhoods on the surface.
- **Radial smoothing:** A weighted average across neighboring surface depths.

The result is anisotropic smoothing that respects cortical geometry, enabling intracortical fMRI analysis without compromising laminar resolution.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Surface meshes (multiple) | Stack of depth-resolved surface meshes (e.g., equivolumetric surfaces from surface 0 to surface N). Specified via a glob pattern or directory. | FreeSurfer binary surface |
| Overlay data (multiple) | Per-vertex fMRI data defined on each surface mesh. | `.mgh`, `.mgz` |
| Surface directory (`surf_dir`) | Directory containing surface files. | — |
| Overlay directory (`over_dir`) | Directory containing overlay files. | — |
| Output directory (`out_dir`) | Directory for smoothed output overlays. | — |

**Internal global variables expose the interface:** `surf_path`, `over_path`, `out_path`, `surf_name`, `over_name`, `surf_dir`, `over_dir`, `out_dir`, `out_name`, `surf_num`, `over_num`, `nb_rad`, `ic_size`, `ic_start`, `nb_wf`.

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Smoothed overlays | Per-surface smoothed fMRI data, one file per input surface. | `.mgh`, `.mgz` |

## Mathematical Foundations

The smoothing weight for the tangential neighborhood is computed by `calculate_nb_weights()`. Based on the `nb_wf = 0` (Gaussian) default, weights are:

$$
w_{ij} = \exp\!\left(-\frac{d_{ij}^2}{2\sigma_t^2}\right)
$$

where $d_{ij}$ is the geodesic distance between vertices $i$ and $j$ on the surface, and $\sigma_t$ is determined by the tangential neighborhood radius `nb_rad`.

For radial smoothing across $N$ surfaces, a similar 1D Gaussian is applied:

$$
w_{kl} = \exp\!\left(-\frac{(k-l)^2}{2\sigma_r^2}\right)
$$

where $k, l$ are surface depth indices.

The combined smoothed value at vertex $i$, depth $k$ is:

$$
S_{\text{out}}(i, k) = \frac{\sum_{j,l} w_{ij} w_{kl} \cdot S_{\text{in}}(j, l)}{\sum_{j,l} w_{ij} w_{kl}}
$$

## Configuration Options

### Complete Flag Reference

The tool exits if fewer than 10 arguments are provided (`argc <= 9`), so all flags listed below are effectively required for a valid invocation.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--surf-path <path>` | string | — | **Required.** Path (including filename stem) to the input surface files. |
| `--over-path <path>` | string | — | **Required.** Path (including filename stem) to the input overlay files. |
| `--out-path <path>` | string | — | **Required.** Output path (including filename stem) for smoothed overlay files. |
| `--surf-name <name>` | string | — | Surface filename base name (without path). |
| `--over-name <name>` | string | — | Overlay filename base name (without path). |
| `--surf-dir <dir>` | string | — | Directory containing surface files. |
| `--over-dir <dir>` | string | — | Directory containing overlay files. |
| `--out-dir <dir>` | string | — | Directory for output overlay files. |
| `--out-name <name>` | string | — | Output filename base name. |
| `--surf-num <n>` | integer | — | Number of input surface meshes to process. |
| `--over-num <n>` | integer | — | Number of input overlay files to process. |
| `--nb-size <n>` | integer | — | Tangential neighborhood radius in vertex hops (`nb_rad`). |
| `--ic-size <n>` | integer | 1 | Number of surface depth layers to include in radial smoothing. |
| `--ic-start <n>` | integer | 0 | Index of the first surface layer to process. |
| `--tan-weights <mode>` | string | `"gauss"` | Tangential weighting function: `"gauss"` (Gaussian weights by geodesic distance) or `"distance"` (inverse-distance weights). |

> [!gotcha] `--tan-weights` takes a string, not an integer
> The flag accepts the string value `"gauss"` or `"distance"`. Providing an integer (e.g., `--tan-weights 0`) will be treated as an unrecognised value.

> [!gotcha] Radial smoothing is unweighted (TODO in source)
> When `--ic-size > 1`, the radial (across-layer) smoothing uses a simple unweighted mean of adjacent surface values. The source code contains a `// TODO` comment at this location indicating that weighted radial smoothing was planned but not yet implemented.

## Configuration Interactions

- `surf_num` and `over_num` must match the number of surface/overlay files found by the glob pattern.
- `ic_start` and `ic_size` define which subset of depth surfaces to process.
- `nb_rad` = 0 disables tangential smoothing, applying only radial smoothing.

## Typical Use Cases

**Smooth laminar fMRI data across 6 equivolumetric surfaces:**
```bash
mris_smooth_intracortical \
  --surf-dir /path/to/laminar_surfs \
  --over-dir /path/to/laminar_data \
  --out-dir /path/to/smoothed \
  --surf-name lh.equivol \
  --over-name lh.bold_mean \
  --out-name lh.bold_mean_smooth \
  --surf-num 6 \
  --over-num 6 \
  --nb-size 2 \
  --ic-size 3 \
  --tan-weights gauss
```

## Pipeline Context

`mris_smooth_intracortical` is not part of `recon-all`. It is used in specialized laminar fMRI analysis workflows, typically after generating depth-resolved surfaces (e.g., using tools such as `LayNii` or FreeSurfer's equivolumetric surface tools) and computing per-surface fMRI overlays.

## Gotchas and Caveats

> [!gotcha] Requires pre-generated laminar surfaces
> This tool does not generate laminar surfaces; it only applies smoothing. Laminar surfaces must be pre-computed from the white and pial surfaces.

> [!gotcha] Memory limits
> `MAX_VERTICES = 1000000`. Processing very high-resolution surfaces may require recompilation with a larger limit.

> [!gotcha] Helptext is placeholder
> The source file's embedded help (`BEGINHELP`) contains only "TODO", meaning there is no runtime help output. Users must rely on source code or the published paper for documentation.

## Related Tools

- [[mris_smooth]] — standard tangential surface smoothing (single surface, no radial component)
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

Confidence is **high**. The complete `parse_commandline()` function (~425 lines total source) was read from source. All flags are confirmed. The radial smoothing TODO and `--tan-weights` string-type semantics are confirmed from the source code directly.
