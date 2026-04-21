---
title: "mri_compute_volume_intensities"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_volume_fractions/mri_compute_volume_intensities.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_compute_volume_fractions]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - partial-volume
  - intensity
  - correction
---

# mri_compute_volume_intensities

## Summary

`mri_compute_volume_intensities` computes "unpartial-volumed" intensity estimates for each tissue type (white matter, cortical gray, subcortical gray, CSF) at every voxel of an input MRI volume. It takes a source intensity volume and pre-computed partial volume fraction maps (from [[mri_compute_volume_fractions]]) as inputs, and outputs a corrected intensity volume.

## Source Information

- **Language:** C++
- **Source file:** `mri_compute_volume_fractions/mri_compute_volume_intensities.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Given an observed intensity $I$ at a voxel that is a mixture of tissue types, this tool attempts to recover the "true" intensity for each compartment by solving a local linear system using the partial volume fractions. The result is a volume where each voxel contains intensities corrected for partial volume mixing — useful for high-resolution functional MRI analyses and laminar studies.

## Inputs

Positional arguments:
1. **`src`**: source intensity volume (e.g., mean BOLD, T1-weighted)
2. **`pvf_stem`**: stem for partial volume fraction files (from [[mri_compute_volume_fractions]]); the tool reads `{stem}.cortex.mgz`, `{stem}.subcort_gm.mgz`, `{stem}.csf.mgz`, `{stem}.wm.mgz`
3. **`output`**: output volume path

## Outputs

A single-frame (or multi-frame with `--separate`) [[mgz]] volume containing the unpartial-volumed intensity estimate at each voxel.

## Mathematical Foundations

The unpartial-volumed intensities are computed by `compute_unpartial_volumed_intensities()`. At each voxel $\mathbf{x}$:

1. Collect the $(2w+1)^3$ voxels in a neighbourhood of half-width $w$ (in mm, converted to voxels per dimension).
2. For each neighbour voxel $\mathbf{y}$, compute a Gaussian weight $w_{\mathbf{y}} = \exp\!\left(-\tfrac{1}{2}\|\mathbf{y}-\mathbf{x}\|^2/\sigma^2\right)$.
3. Build a weighted design matrix $A$ of shape $[n_\text{vox} \times K]$ where each row is $w_{\mathbf{y}} \cdot (f_\text{wm}(\mathbf{y}),\, f_\text{gm}(\mathbf{y}),\, f_\text{csf}(\mathbf{y}))$ — the three weighted partial-volume fractions (cortical GM and subcortical GM are merged into one GM fraction). The number of columns $K \in \{1,2,3\}$ is reduced if any tissue class has negligible total weight (fraction $< 1\%$ of the dominant class).
4. Solve the weighted least-squares system $A \hat{s} \approx b$ using the pseudoinverse, where $b_{\mathbf{y}} = w_{\mathbf{y}} \cdot I(\mathbf{y})$ is the weighted observed intensity.
5. The estimated intensity vector $\hat{s}$ contains tissue-specific intensities for the classes present in the neighbourhood.

In single-frame output mode (default), the tissue-specific intensity for the class with the largest volume fraction at $\mathbf{x}$ is written to the output. In multi-frame mode (`-SEPARATE_FRAMES`), all three estimated intensities (WM, GM, CSF) are written as separate frames.

## Configuration Options

All flags use a single dash. Option matching is case-insensitive.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-w <N>` | int | 4 | Half-width of the cubic neighbourhood window in mm; the actual number of voxels per dimension is `ceil(N / voxel_size)`. Must be ≥ 1. |
| `-s <sigma>` | float | 1.0 | Gaussian weighting kernel sigma (mm); controls how quickly neighbour contributions decay with distance. |
| `-SEPARATE_FRAMES` | — | false | Output a 3-frame volume containing the tissue-specific intensities for WM (frame 0), GM (frame 1), and CSF (frame 2) at each voxel, instead of the single dominant-class intensity. |
| `-DEBUG_VOXEL <x> <y> <z>` | 3 × int | — | Enable per-voxel diagnostic output at voxel `(x, y, z)`. |

## Configuration Interactions

- `-SEPARATE_FRAMES` changes the output from a single-frame volume (dominant class intensity) to a 3-frame volume (WM, GM, CSF in that order).
- `-w` and `-s` jointly control the neighbourhood: `-w` sets the spatial extent of the analysis window, while `-s` controls how much each neighbour contributes relative to its distance from the centre voxel. Together they define the effective resolution of the tissue-intensity estimation.
- Tissue classes with negligible presence in the neighbourhood (fraction $< 1\%$ of the largest class) are excluded from the least-squares system, reducing the number of estimated intensities and improving numerical stability.

## Typical Use Cases

```bash
# Compute unpartial-volumed intensities for a functional scan
mri_compute_volume_intensities func.mgz pvf_stem output_unpv.mgz

# Larger neighbourhood (8mm) and wider smoothing
mri_compute_volume_intensities -w 8 -s 2.0 func.mgz pvf_stem output_unpv.mgz

# Separate frames per tissue class
mri_compute_volume_intensities -SEPARATE_FRAMES func.mgz pvf_stem output_unpv.mgz
```
(where `pvf_stem` refers to a set of files named `pvf_stem.cortex.mgz`, `pvf_stem.subcort_gm.mgz`, `pvf_stem.csf.mgz`, `pvf_stem.wm.mgz`)

## Pipeline Context

Used after [[mri_compute_volume_fractions]] in a PVE correction pipeline:
1. [[mri_compute_volume_fractions]] produces fraction maps.
2. `mri_compute_volume_intensities` inverts the mixing model.

## Gotchas and Caveats

> [!gotcha] Hardcoded stem naming
> The fraction files are expected to follow the exact naming convention `{stem}.cortex.mgz`, `{stem}.subcort_gm.mgz`, `{stem}.csf.mgz`, `{stem}.wm.mgz`. Any deviation from this convention (e.g., different format extension) will cause an error.

## Related Tools

- [[mri_compute_volume_fractions]] — produces the required partial volume fraction maps

## Confidence and Gaps

**High confidence (from source):** All flags confirmed from complete `get_option()` read. The unpartial-volume algorithm (`compute_unpartial_volumed_intensities`) was fully read and is characterized in the Mathematical Foundations section above. Flag names, argument types, and defaults are all confirmed from source.
