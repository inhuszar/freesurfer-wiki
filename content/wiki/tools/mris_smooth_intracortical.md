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
| Surface meshes (multiple) | Stack of depth-resolved surface meshes (e.g., equivolumetric surfaces from WM to pial). Glob-expanded from `--surf_dir` + `--surf_name`. | FreeSurfer binary surface |
| Overlay data (multiple) | Per-vertex fMRI data defined on each surface mesh. Glob-expanded from `--overlay_dir` + `--overlay_name`. | `.mgh`, `.mgz` |
| Surface directory | Path to surface files; set via `--surf_dir`. | — |
| Overlay directory | Path to overlay files; set via `--overlay_dir`. | — |
| Output directory | Path for smoothed outputs; set via `--output_dir` (defaults to overlay dir). | — |

**Internal global variables** (set at runtime, not by flags): `surf_path`, `over_path`, `out_path`, `surf_num`, `over_num` are computed automatically from the glob expansion of `surf_dir`/`surf_name` and `overlay_dir`/`overlay_name`; they are not CLI flags.

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

The tool exits if fewer than 10 arguments are provided (`argc <= 9`), so the required flags below must all be present for a valid invocation. Surface and overlay counts are determined automatically by glob expansion — there are no `--surf-num` or `--over-num` flags.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--surf_dir <dir>` | string | — | **Required.** Directory containing surface mesh files. |
| `--surf_name <name>` | string | — | **Required.** Filename pattern for surface files (supports `*` and `?` globs). Multiple matches are sorted WM-to-pial order. |
| `--overlay_dir <dir>` | string | — | **Required.** Directory containing overlay files. |
| `--overlay_name <name>` | string | — | **Required.** Filename pattern for overlay files (supports `*` and `?` globs). |
| `--output_dir <dir>` | string | same as `overlay_dir` | Directory for output overlay files. |
| `--output_name <name>` | string | derived from first overlay | Output overlay filename base. |
| `--tan-size <n>` | integer | 0 | Tangential extent of the smoothing kernel. With `gauss` weighting this is the FWHM in mm; with `distance` it is the vertex-hop radius. `0` = no tangential smoothing. |
| `--rad-size <n>` | integer | 1 | Radial extent of the intracortical smoothing kernel (number of adjacent surface meshes). `1` = no radial smoothing. |
| `--rad-start <n>` | integer | 0 | Index of the starting surface mesh for radial smoothing (0 = white matter side). |
| `--tan-weights <mode>` | string | `"gauss"` | Tangential weighting function: `"gauss"` (Gaussian with FWHM = `tan-size`) or `"distance"` (1/distance). |

> [!gotcha] `--tan-weights` takes a string, not an integer
> The flag accepts the string value `"gauss"` or `"distance"`. Providing an integer (e.g., `--tan-weights 0`) will trigger the "Unknown value" warning and fall back to Gaussian weighting.

> [!gotcha] Radial smoothing is unweighted (TODO in source)
> The radial (across-layer) smoothing uses a simple unweighted mean of adjacent surface values. The source code contains a `// TODO` comment indicating that weighted radial smoothing was planned but not yet implemented. The `--rad-weights` flag documented in the help text is not actually parsed.

## Configuration Interactions

- The number of surfaces and overlays is determined automatically by glob expansion of `--surf_name` and `--overlay_name`; the counts must match for intracortical smoothing.
- `--rad-start` and `--rad-size` define which subset of depth surfaces to include in radial smoothing.
- `--tan-size 0` disables tangential smoothing, applying only radial smoothing.

## Typical Use Cases

**Smooth laminar fMRI data across 6 equivolumetric surfaces:**
```bash
mris_smooth_intracortical \
  --surf_dir /path/to/laminar_surfs \
  --overlay_dir /path/to/laminar_data \
  --output_dir /path/to/smoothed \
  --surf_name "lh.equivol.*" \
  --overlay_name "lh.bold_mean.*" \
  --output_name lh.bold_mean_smooth \
  --tan-size 2 \
  --rad-size 3 \
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

Confidence is **high**. The complete `parse_commandline()` and `print_usage()` functions were read from source. All flags confirmed: `--surf_dir`, `--surf_name`, `--overlay_dir`, `--overlay_name`, `--output_dir`, `--output_name`, `--tan-size`, `--rad-size`, `--rad-start`, `--tan-weights`. Note: `--surf-path`, `--over-path`, `--out-path`, `--surf-num`, `--over-num` are not CLI flags; counts and paths are set internally via glob. `--rad-weights` appears only in the `print_usage()` help text as "not yet implemented" and is not actually parsed — it has been removed from the flag table.
