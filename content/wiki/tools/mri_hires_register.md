---
title: "mri_hires_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hires_register/mri_hires_register.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_linear_align]]"
  - "[[mri_linear_align_binary]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "GCA morph integration details for high-resolution registration"
  - "Relationship to mri_robust_register not clarified"
tags:
  - registration
  - high-resolution
  - alignment
  - gca
---

# mri_hires_register

## Summary

`mri_hires_register` computes a linear transform aligning a high-resolution (hires) volume to a low-resolution (lowres) reference volume, using overlap or distance-transform-based criteria. The tool performs a global search over rotation/translation/scale space followed by Powell's method for local refinement. It supports registration of both intensity-based volumes and binary label maps. It can optionally apply the computed transform and write out the registered volume.

## Source Information

- **Source language:** C++
- **Source file:** `mri_hires_register/mri_hires_register.cpp`
- **Original author:** Bruce Fischl
- **Related sources:** `mri_hires_register/mri_linear_align.cpp`, `mri_hires_register/mri_linear_align_binary.cpp`

## Purpose and Context

`mri_hires_register` was developed for registering high-resolution acquisitions (e.g., high-resolution hippocampal protocol scans) to standard-resolution whole-brain images. The scenario is:

- A high-resolution sub-millimeter volume is acquired for specific structures (hippocampus, cerebellum)
- This volume needs to be aligned to the whole-brain T1 in standard 1mm space for combined analysis
- Standard registration tools may fail or perform poorly due to the extreme resolution mismatch and small field of view of the hires scan

The tool works by:
1. Building voxel lists (VOXELLISTs) from both volumes
2. Performing a brute-force global search over rigid and/or affine transform parameters
3. Refining with Powell's method using image overlap or distance transform-based cost functions
4. Optionally writing the aligned volume

## Inputs

| Input | Description |
|-------|-------------|
| High-resolution labeling volume (positional 1) | Hires label/segmentation volume to register |
| Intensity volume (positional 2) | Intensity image for the hires acquisition |
| Low-resolution aseg volume (positional 3) | Low-resolution reference segmentation |
| Output transform file (positional 4) | Path for the output transform (LTA) |

## Outputs

| Output | Description |
|--------|-------------|
| Transform file | Linear transform (LTA) aligning hires to lowres |
| Registered volume (optional) | Hires volume resampled in lowres space (written when `apply_transform=1`) |

## Mathematical Foundations

**Cost functions:**

The tool offers multiple cost functions for measuring alignment quality:

1. **Overlap (default):**
$$
\mathcal{C}_\text{overlap}(T) = -\frac{|\text{hires}(T) \cap \text{lowres}|}{|\text{hires}(T) \cup \text{lowres}|}
$$

2. **Distance transform SSE:**
$$
\mathcal{C}_\text{DT}(T) = \sum_{v \in \text{hires}} d_\text{lowres}(T(v))^2
$$

where $d_\text{lowres}(\mathbf{x})$ is the distance transform of the lowres reference volume.

**Global search:**

The parameter space is sampled over a grid of rotations (up to `MAX_ANGLE = 25°`), translations (up to `MAX_TRANS = 30mm`), and scales (up to `MAX_SCALE = 0.5`). The best grid point initializes the local Powell optimization.

**Powell's method:**

Iterative line minimization in the parameter space of the linear transform (typically 6 parameters for rigid, 9 for similarity/affine).

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-angio` | — | off | Assume inputs are vascular labelings; use distance-transform SSE cost |
| `-regrid` | — | off | Enable regridding |
| `-noregrid` | — | off | Disable regridding |
| `-optimal` | — | — | Use optimal time-step integration (`GCAM_INTEGRATE_OPTIMAL`) |
| `-fixed`<br>`-momentum` | — | — | Use fixed time-step integration (`GCAM_INTEGRATE_FIXED`) |
| `-fix` | — | off | Use predefined intensities for class means |
| `-find_label` | `<label> <x> <y> <z>` | — | Find GCA morph node at label near voxel `(x,y,z)` |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable debug output for voxel `(x,y,z)` |
| `-view` | `<x> <y> <z>` | — | Set debug view voxel to `(x,y,z)` |
| `-trans` | `<mm>` | 30 | Maximum translation search range (mm) |
| `-max_angle` | `<deg>` | 25 | Maximum rotation search range (degrees) |
| `-max_scale` | `<f>` | 0.5 | Maximum scale deviation for search |
| `-distance` | `<mm>` | 1.0 | Expand border by `<mm>` every outer cycle |
| `-levels` | `<n>` | 6 | Number of multi-resolution levels |
| `-skip` | `<n>` | 2 | Skip `<n>` voxels when sampling hires data |
| `-tol` | `<f>` | 0.1 | Convergence tolerance |
| `-dt` | `<f>` | 0.005 | Integration time step |
| `-sigma` | `<f>` | 8 | Gaussian sigma for smoothing |
| `-rthresh` | `<f>` | — | Compression ratio threshold |
| `-intensity`<br>`-ll` | `<f>` | — | Log-likelihood weight (`mp.l_log_likelihood`) |
| `-area` | `<f>` | — | Area regularisation weight (`mp.l_area`) |
| `-area_intensity` | `<f>` | — | Area-intensity regularisation weight (`mp.l_area_intensity`) |
| `-d` | `<f>` | 1.0 | Distance regularisation weight (`mp.l_distance`) |
| `-m` | `<f>` | 0.9 | Gradient descent momentum |
| `-n` | `<n>` | 1000 | Number of morph iterations |
| `-s` | `<f>` | 1.0 | Smoothness regularisation weight (`mp.l_smoothness`) |
| `-t` | `<xfm>` | — | Read initial transform from file |
| `-i` | `<vol>` | — | Read intensity image from file for debugging |
| `-b` | `<f>` | 0.025 | Binary regularisation weight (`mp.l_binary`) |
| `-j` | `<f>` | 1.0 | Jacobian regularisation weight (`mp.l_jacobian`) |
| `-a` | `<n>` | 256 | Number of gradient smoothing averages |
| `-k` | `<f>` | — | Exponential constant `mp.exp_k` |
| `-w` | `<n>` | 0 | Write intermediate results every `<n>` iterations |
| `-u` | — | — | Print usage and exit |

## Configuration Interactions

- `-angio` switches the cost function from overlap to distance-transform SSE and restricts the label set used for registration to arterial labels.
- `-fixed`/`-momentum` and `-optimal` control the integration strategy used by the GCA morph step (not the linear search).
- `apply_transform` is enabled by default (`apply_transform = 1`); there is no CLI flag to disable it — the variable is only set via source-level defaults.
- Registration uses a VOXELLIST built from both volumes; the list construction threshold is embedded in the code.

## Typical Use Cases

**Register high-resolution hippocampal label volume to whole-brain aseg:**
```bash
mri_hires_register hires_labels.mgz hires_intensity.mgz aseg.mgz xfm.lta
```

## Pipeline Context

`mri_hires_register` is not part of standard `recon-all`. It is used in specialized high-resolution sub-structure analysis workflows:

- **Upstream:** Raw hires and lowres acquisitions (after [[wiki/tools/mri_convert|mri_convert]])
- **Downstream:** Combined analysis, surface extraction, morphometry on hires data in whole-brain space

## Gotchas and Caveats

> [!gotcha] Small FoV hires inputs
> The tool includes padding constants (`HIRES_PAD=10`, `LOWRES_PAD=20`) for the voxel list construction. Very small FoV hires scans may require parameter adjustment.

> [!gotcha] Resolution mismatch
> The cost function behavior depends on the relative resolution of the two volumes. Anisotropic hires volumes require careful handling.

> [!gotcha] apply_transform is always on
> There is no command-line flag to disable applying the transform and writing the registered volume. The variable `apply_transform = 1` is set at compile time and cannot be overridden from the CLI.

## Related Tools

- [[mri_linear_align]] — closely related linear alignment tool (same source directory)
- [[mri_linear_align_binary]] — binary (label map) alignment variant
- [[mri_em_register]] — atlas-based registration

## Confidence and Gaps

**Confident (from source):** Overlap and distance transform cost functions, global search with Powell refinement, max angle/translation/scale search parameters, complete flag list from `get_option()`, positional argument order.

**Uncertain:** Exact output format; relationship to `mri_robust_register` for the same use case; GCA morph step integration details.
