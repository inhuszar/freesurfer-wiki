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
last_agent_update: 2026-04-15
gaps:
  - "Full flag enumeration not verified from help output"
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
| Low-resolution reference volume | Full-brain reference image (standard resolution) |
| High-resolution source volume | Small FoV hires acquisition to align |
| Initial transform (optional) | Starting point for registration |

## Outputs

| Output | Description |
|--------|-------------|
| Transform file | Linear transform (LTA or similar) aligning hires to lowres |
| Registered volume (optional) | Hires volume resampled in lowres space |

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

3. **Trimmed likelihood** (robust variant that ignores outlier voxels).

**Global search:**

The parameter space is sampled over a grid of rotations (up to `MAX_ANGLE = 25°`), translations (up to `MAX_TRANS = 30mm`), and scales (up to `MAX_SCALE = 0.5`). The best grid point initializes the local Powell optimization.

**Powell's method:**

Iterative line minimization in the parameter space of the linear transform (typically 6 parameters for rigid, 9 for similarity/affine).

## Configuration Options

> [!gap] Flag list not fully verified
> Flags inferred from source code variable declarations and function signatures.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--apply` | — | on | Apply the transform after registration |
| `--no-apply` | — | off | Compute transform only, don't apply |
| `--angio` | — | off | Angiography mode |
| `--find-label` | `<label> <x> <y> <z>` | — | Find GCAM node at label near given voxel |
| `--regrid` | — | off | Enable regridding |
| `--max-trans` | `<mm>` | `30` | Maximum translation search range (mm) |
| `--max-angle` | `<deg>` | `25` | Maximum rotation search range (degrees) |
| `--fix-intensity` | — | off | Fix intensity scaling during registration |

## Configuration Interactions

- Registration uses a VOXELLIST built from both volumes; the list construction threshold is embedded in the code.
- GCAM (morph) operations integrate with the GCA-based registration framework.

## Typical Use Cases

**Register high-resolution hippocampal scan to whole-brain T1:**
```bash
mri_hires_register lowres_T1.mgz hires_hippo.mgz xfm.lta hires_aligned.mgz
```

## Pipeline Context

`mri_hires_register` is not part of standard `recon-all`. It is used in specialized high-resolution sub-structure analysis workflows:

- **Upstream:** Raw hires and lowres acquisitions (after [[mri_convert]])
- **Downstream:** Combined analysis, surface extraction, morphometry on hires data in whole-brain space

## Gotchas and Caveats

> [!gotcha] Small FoV hires inputs
> The tool includes padding constants (`HIRES_PAD=10`, `LOWRES_PAD=20`) for the voxel list construction. Very small FoV hires scans may require parameter adjustment.

> [!gotcha] Resolution mismatch
> The cost function behavior depends on the relative resolution of the two volumes. Anisotropic hires volumes require careful handling.

## Related Tools

- [[mri_linear_align]] — closely related linear alignment tool (same source directory)
- [[mri_linear_align_binary]] — binary (label map) alignment variant
- [[mri_em_register]] — atlas-based registration

## Confidence and Gaps

**Confident (from source):** Overlap and distance transform cost functions, global search with Powell refinement, max angle/translation search parameters, apply-transform option.

**Uncertain:** Complete command-line flag syntax; exact output format; relationship to `mri_robust_register` for the same use case.
