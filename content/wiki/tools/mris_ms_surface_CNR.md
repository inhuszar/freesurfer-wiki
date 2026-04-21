---
title: "mris_ms_surface_CNR"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_ms_surface_CNR/mris_ms_surface_CNR.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ms_refine]]"
  - "[[mris_make_surfaces]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source file is in the attic/ directory — may not be compiled in standard FS 8.2.0 builds"
  - "Full command-line syntax not confirmed"
tags:
  - surface
  - multimodal
  - CNR
  - quality-metric
  - FLASH
---

# mris_ms_surface_CNR

## Summary

`mris_ms_surface_CNR` computes the contrast-to-noise ratio (CNR) along a cortical surface (specifically the white surface boundary) from multiple input MRI volumes. It evaluates the discriminability between the white matter and gray matter tissue compartments at each surface vertex, producing a per-vertex CNR overlay. This is primarily a quality-assessment tool for multi-echo or multi-contrast acquisitions.

## Source Information

- **Language:** C++ (filed as `.c` in comments, compiled as C++)
- **Source file:** `attic/mris_ms_surface_CNR/mris_ms_surface_CNR.cpp`
- **Original author:** Xiao Han
- **Note:** The source resides in the `attic/` directory, indicating it may be legacy/research code not included in the standard build.

## Purpose and Context

When using multi-spectral MRI (e.g., multi-echo FLASH) to drive surface placement, it is useful to quantify how well each imaging contrast discriminates gray from white matter at the cortical surface. `mris_ms_surface_CNR` provides this metric by:

1. Sampling the MRI signal at a set of points inside the surface (WM side) and outside it (GM side)
2. Computing a multivariate CNR using covariance matrices of the signal vectors
3. Outputting the per-vertex CNR as a surface overlay

The tool also supports smoothing steps before CNR computation and optional weighting across volumes.

## Inputs

- A cortical white surface file (FreeSurfer binary format)
- One or more MRI volumes (up to `MAX_IMAGES = 200`)
- Subject name and hemisphere specification (`-s`, `-hemi`)
- Optionally a thickness file (`-thickness`)

## Outputs

- A per-vertex CNR overlay file (`.curv` or `.paint` format, selectable via `-out`)

## Mathematical Foundations

The CNR at each vertex is computed using a multivariate formulation. For $N$ input volumes, the signal at each vertex is represented as a vector $\mathbf{x} \in \mathbb{R}^N$ sampled inside (WM) and outside (GM) the surface.

The within-class covariance matrices $\mathbf{S}_{W_1}$, $\mathbf{S}_{W_2}$ are accumulated, and the multivariate CNR is:

$$
\text{CNR} = \frac{(\bar{\mathbf{x}}_{WM} - \bar{\mathbf{x}}_{GM})^T \mathbf{S}_W^{-1} (\bar{\mathbf{x}}_{WM} - \bar{\mathbf{x}}_{GM})}{\text{(normalisation)}}
$$

The code uses `MATRIX` objects (`SW1`, `SW2`, `SW`, `InvSW`) from the FreeSurfer linear algebra library to carry out this computation. A per-volume weight vector (`mri_weight`) can optionally modulate the contribution of each volume.

## Configuration Options

> [!gap] Full flag list not confirmed from --help output.

| Flag | Description |
|---|---|
| `-s subject` | Subject name (used to build path to surf directory) |
| `-hemi hemi` | Hemisphere (`lh` or `rh`) |
| `-sdir SUBJECTS_DIR` | Override `SUBJECTS_DIR` |
| `-out fname` | Output CNR filename (default: curv or paint format) |
| `-thickness fname` | Surface thickness file |
| `-smooth N` | Number of smoothing steps before CNR computation (default 60) |
| `-conform` | Conform input volumes |
| (positional) volumes | Input MRI volumes (repeated) |

## Configuration Interactions

- Multiple volumes are processed jointly via covariance matrices; the order of volumes does not affect the multivariate CNR value.
- `-smooth N` applies Gaussian smoothing to the input volume before CNR computation; higher values reduce sensitivity to noise but blur the tissue boundary.

## Typical Use Cases

```bash
# Compute CNR along left white surface from two FLASH volumes
mris_ms_surface_CNR -s bert -hemi lh -out lh.cnr.curv flash5.mgz flash20.mgz
```

## Pipeline Context

This tool is not part of the standard `recon-all` pipeline. It is used in research workflows to evaluate the quality of multi-spectral surface placement after running [[mris_ms_refine]] or similar tools.

## Gotchas and Caveats

> [!gotcha] Legacy code in attic/
> The source file resides in `attic/mris_ms_surface_CNR/`. This suggests it may not be included in the standard FreeSurfer 8.2.0 build, or it may have been superseded. Verify with `ls $FREESURFER_HOME/bin/mris_ms_surface_CNR` before relying on it.

> [!gotcha] MAX_IMAGES limit
> Hard limit of 200 input volumes. In practice, fewer than 10 FLASH echoes are typical.

> [!gotcha] Smoothing default
> The default `nSmoothSteps = 60` performs substantial smoothing before CNR computation. For high-resolution data where localisation is important, this should be reduced.

## Related Tools

- [[mris_ms_refine]] — multi-spectral surface refinement using T1/PD estimates
- [[mris_make_surfaces]] — standard surface placement
- [[surface-format]] — FreeSurfer surface file format

## Confidence and Gaps

**Confident (from code):** Multivariate CNR formulation; covariance matrix approach; smoothing step; up to 200 input volumes.

**Uncertain:** Whether this binary is compiled in FS 8.2.0 (source is in `attic/`); exact output format conventions.

> [!gap] Source is in `attic/` directory. It is available as a binary in FS 8.2.0 (`$FREESURFER_HOME/bin/`), suggesting it was copied over even if not actively maintained.
