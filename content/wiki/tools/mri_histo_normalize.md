---
title: "mri_histo_normalize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_histo_normalize/mri_histo_normalize.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_histo_eq]]"
  - "[[mri_normalize]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be distributed in v8.2.0"
  - "Iterative convergence criterion not fully described"
  - "Complete flag list not verified"
tags:
  - normalization
  - histogram
  - multi-subject
  - preprocessing
  - attic
---

# mri_histo_normalize

## Summary

`mri_histo_normalize` performs iterative histogram-based intensity normalization of a set of MRI volumes to a common reference. Given an input volume and a collection of multiple subjects' volumes, it computes a histogram for each volume and iteratively adjusts intensities using a linear mapping (determined from the template histogram) until the average RMS change in voxel intensities falls below a tolerance. This is a multi-subject normalization utility located in `attic/`, indicating legacy status.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_histo_normalize/mri_histo_normalize.cpp`
- **Original author:** Bruce Fischl
- **Location note:** In `attic/` — likely superseded by [[mri_histo_eq]] or other normalization tools.

## Purpose and Context

When processing large multi-subject datasets, systematic intensity differences between scans (due to scanner variation, acquisition protocol changes, or inter-session drift) can confound morphometric analyses. `mri_histo_normalize` addresses this by normalizing the intensity histograms of multiple input volumes to match a reference (template) distribution.

The tool uses an iterative approach:
1. Computes histograms for each input volume
2. Builds a template histogram (e.g., average of all subjects or a fixed reference)
3. Computes a linear mapping from each subject's histogram to the template
4. Applies the mapping and checks for convergence

Unlike [[mri_histo_eq]] (which uses CDF matching), this tool applies a linear (scale/shift) normalization determined from histogram peaks or matching control points.

> [!gotcha] Attic location
> This tool resides in `attic/` and may not be compiled or installed in FreeSurfer 8.2.0 standard distributions. Consider [[mri_histo_eq]] or `mri_normalize` as alternatives.

## Inputs

| Input | Description |
|-------|-------------|
| Input volume name | Filename stem of the per-subject volumes |
| Subject list | One subject name per argument (between input and output) |
| Output volume name | Where to write the normalized result |
| `$SUBJECTS_DIR` | Subject directory (from environment or `--sdir`) |
| Optional mask | Binary mask limiting the region used for histogram computation |

Usage pattern:
```
mri_histo_normalize <input_vol> <subject1> <subject2> ... <output_vol>
```

## Outputs

| Output | Description |
|--------|-------------|
| Normalized volume | Input volume with linearly adjusted intensities |

## Mathematical Foundations

The tool uses a linear histogram normalization approach. For each subject $i$, a linear mapping $y = a_i x + b_i$ is determined by aligning the subject's histogram to the template histogram. The mapping minimizes an RMS criterion:

$$
\text{RMS}_i = \sqrt{\frac{1}{N} \sum_v (y_{i,v}' - y_\text{template,v})^2}
$$

Iteration continues until:
$$
\bar{\text{RMS}} < \text{tol}
$$

where $\text{tol}$ defaults to 0.5 (average RMS change in voxel intensities).

The template histogram `htemplate` is built from the average of all input histograms in the first iteration, then updated iteratively.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--sdir` | `<dir>` | Override `$SUBJECTS_DIR` |
| `--mask` | `<file>` | Mask volume for histogram computation |
| `--xfm` | `<file>` | Transform file for alignment |
| `--tol` | `<val>` | Convergence tolerance (default: 0.5) |
| `--adaptive` | — | Use adaptive normalization |

> [!gap] Flag list reconstructed from source — needs verification
> The flags above are inferred from source variable declarations. Complete help output needed.

## Configuration Interactions

- Up to 100 subjects can be processed simultaneously (`MAX_SUBJECTS = 100`).
- `--mask` restricts histogram computation to brain voxels, preventing background from skewing the intensity mapping.
- `--tol` controls convergence sensitivity; lower values require more iterations.

## Typical Use Cases

**Normalize multiple subjects to a common histogram:**
```bash
# With SUBJECTS_DIR set:
mri_histo_normalize brain.mgz sub01 sub02 sub03 brain_norm.mgz
```

## Pipeline Context

`mri_histo_normalize` is not part of `recon-all`. It is a post-processing normalization tool for group studies. It should be applied after individual subject reconstruction and before group-level analysis.

## Gotchas and Caveats

> [!gotcha] Attic location
> The tool is in `attic/` and may not be compiled in standard FreeSurfer 8.2.0 builds.

> [!gotcha] Linear normalization only
> Unlike [[mri_histo_eq]] (which uses CDF matching for nonlinear equalization), this tool applies only a linear (scale + offset) correction. It may not fully harmonize histograms with different shapes.

## Related Tools

- [[mri_histo_eq]] — histogram equalization via CDF matching (non-linear)
- [[mri_normalize]] — bias-field-aware intensity normalization

## Confidence and Gaps

**Confident (from source):** Multi-subject iterative approach, linear histogram normalization, MAX_SUBJECTS=100 limit, convergence tolerance 0.5, reads from SUBJECTS_DIR.

**Uncertain:** Full flag set; exact template histogram construction algorithm; whether the tool is functional in v8.2.0.
