---
title: "mri_compute_structure_transforms"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_compute_structure_transforms/mri_compute_structure_transforms.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_nl_align]]"
  - "[[mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "SVD pseudo-inverse method details not verified"
  - "Output LTA format for per-structure transforms not confirmed"
tags:
  - registration
  - segmentation
  - atlas
  - attic
---

# mri_compute_structure_transforms

## Summary

`mri_compute_structure_transforms` computes the optimal per-structure linear (affine) transform for each anatomical label in a non-linear warp field (`.m3z`). Using an SVD pseudo-inverse, it extracts the best-fitting affine approximation of the non-linear deformation field within each labelled region, saving one LTA file per structure.

> [!gotcha] Attic tool
> Source is located in `attic/`, indicating this tool has been retired. It may not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_compute_structure_transforms/mri_compute_structure_transforms.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Non-linear registration (e.g., from `mri_nl_align`) produces a dense warp field that deforms every voxel. For some downstream analyses, a per-structure affine approximation is more interpretable or required. `mri_compute_structure_transforms` extracts this approximation by fitting an affine matrix to the set of displacement vectors within each labelled region.

The approach is documented as using an "SVD pseudo-inverse to compute the optimal linear transform for each struct to the atlas in a previously computed .m3z file."

## Inputs

| Argument | Description |
|----------|-------------|
| `<m3z>` | Non-linear warp field (.m3z from `mri_nl_align`) |
| `<aseg>` | Segmentation volume defining structure labels |
| `<outdir>` | Output directory for per-structure LTA files |

## Outputs

- One LTA file per anatomical label in `<outdir>`, named by CMA label number/name.

## Mathematical Foundations

For each label $l$, let the set of voxels in the label be $\{\mathbf{x}_i\}$ and their atlas-space counterparts (from the warp) be $\{\mathbf{y}_i\}$. The optimal affine matrix $A_l$ minimises:

$$
\|A_l \mathbf{X} - \mathbf{Y}\|_F^2
$$

where $\mathbf{X}$ and $\mathbf{Y}$ are the stacked coordinate matrices. The solution is:

$$
A_l = \mathbf{Y} \mathbf{X}^+ = \mathbf{Y} \mathbf{X}^T (\mathbf{X} \mathbf{X}^T)^{-1}
$$

computed via SVD for numerical stability (pseudo-inverse).

## Configuration Options

| Argument | Description |
|----------|-------------|
| (positional 1) | `.m3z` warp field file |
| (positional 2) | Segmentation volume |
| (positional 3) | Output directory |

No optional flags identified from the brief source inspection.

> [!gap] Complete option list
> The `get_option()` function was not fully read.

## Typical Use Cases

```bash
# Extract per-structure transforms from a nonlinear warp
mri_compute_structure_transforms \
  nonlinear_warp.m3z \
  aseg.mgz \
  structure_transforms/
```

## Pipeline Context

Not part of `recon-all`. Research tool for atlas-based structural analysis or multi-atlas registration. Likely used in conjunction with `mri_nl_align`.

## Gotchas and Caveats

- Tool is in `attic/`; may not be available in current FreeSurfer installations.
- Structures with very few voxels may produce poorly conditioned affine estimates.
- The pseudo-inverse approach assumes the warp is approximately affine within each structure, which may not hold for highly curved or folded structures.

## Related Tools

- [[mri_nl_align]] — produces the `.m3z` warp field consumed by this tool
- [[mri_convert]] — format conversion

## Confidence and Gaps

**Low confidence:** tool is in attic; full option list and output format not verified.
