---
title: "mris_surface_to_vol_distances"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_surface_to_vol_distances/mris_surface_to_vol_distances.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_spherical_average]]"
  - "[[mris_sphere]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "What 'surface to vol distances' specifically means in this context needs clarification - the source computes distance histograms between subject surfaces and an average surface."
  - "Full command-line flags not captured."
tags:
  - distance
  - surface
  - group-analysis
  - histogram
---

# mris_surface_to_vol_distances

## Summary

`mris_surface_to_vol_distances` computes histograms of distances between individual subject surfaces and an average surface (or template), using the spherical registration to establish correspondence. For each vertex of an average/template surface, it accumulates the distances to the corresponding vertex across multiple subjects, producing distance histograms written to output files. The tool is used for group-level surface variability analysis.

## Source Information

- **Language:** C++
- **Source file:** `mris_surface_to_vol_distances/mris_surface_to_vol_distances.cpp`
- **Key data structure:** Per-vertex histogram arrays — `histograms[nvertices][subjects][bins]`

## Purpose and Context

Understanding how much individual cortical surfaces deviate from a group average provides a measure of anatomical variability. `mris_surface_to_vol_distances` computes this for a cohort of subjects by:
1. Loading the average/template sphere.
2. For each subject, loading the subject's sphere and computing the 3D distance between corresponding vertices (established via the spherical coordinate system).
3. Binning these distances into a histogram.
4. Writing the per-vertex histograms to output files.

The distance range is configurable (`min_distance` to `max_distance`, default: 1–20 mm).

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Average subject (positional arg 1) | Name of the template/average subject. Its sphere is used as the reference. | Subject name |
| Hemisphere (positional arg 2) | `lh` or `rh` | — |
| Subject list (positional args 3..N-1) | Individual subjects to compare to the average. | Subject names |
| Output prefix (last positional arg) | Prefix for output histogram files. | String |
| `SUBJECTS_DIR` | Standard FreeSurfer subjects directory. | — |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Distance histogram files | Per-vertex distance histograms with output prefix. | Plain text or binary |

> [!gap] Output format
> The exact format and naming convention of output histogram files are not documented in the source header.

## Mathematical Foundations

For each vertex $v$ of the average sphere and each subject $s$, the distance $d_{v,s}$ between the average vertex and the corresponding vertex on subject $s$'s sphere is computed. This distance is binned:

$$\text{bin index} = \lfloor d_{v,s} - d_{\min} \rfloor$$

where $d_{\min} = 1$ mm and $d_{\max} = 20$ mm by default, giving $\lfloor d_{\max} - d_{\min} \rfloor$ bins.

The histogram at vertex $v$ is:
$$H_v[k] = |\{s : d_{v,s} \in [d_{\min} + k, d_{\min} + k + 1)\}|$$

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-sdir path` | directory | Overrides `SUBJECTS_DIR` |
| `-min_dist D` | float | Minimum distance for histogram (default: 1 mm) |
| `-max_dist D` | float | Maximum distance for histogram (default: 20 mm) |

**Usage:** `mris_surface_to_vol_distances [options] <avg_subject> <hemi> <subject1> ... <output_prefix>`

## Configuration Interactions

The number of histogram bins is derived automatically from `max_distance - min_distance`.

## Typical Use Cases

**Compute surface variability histograms for a group relative to fsaverage:**
```bash
mris_surface_to_vol_distances \
  fsaverage lh \
  subject1 subject2 subject3 \
  lh_variability
```

## Pipeline Context

Not part of `recon-all`. Used in atlas validation and group variability studies to characterize how much individual cortical surfaces deviate from a template.

## Gotchas and Caveats

> [!gotcha] Memory allocation
> The histogram array is allocated as `histograms[nvertices][subjects][bins]`. For large cohorts and high-resolution surfaces, this can be substantial.

> [!gotcha] Sphere vs. inflated
> The distance computed is the 3D Euclidean distance between vertex positions on the sphere surfaces, which is a proxy for geodesic registration error, not anatomical displacement.

## Related Tools

- [[mris_spherical_average]] — averages surface data across subjects
- [[mris_sphere]] — generates the sphere surface
- [[surface-format]] — surface format reference

## Confidence and Gaps

**Medium confidence.** The overall algorithm (sphere-based correspondence + distance histograms) is clear from the source. Output format details require further investigation.
