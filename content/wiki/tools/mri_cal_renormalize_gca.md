---
title: "mri_cal_renormalize_gca"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_cal_renormalize_gca/mri_cal_renormalize_gca.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_train]]"
  - "[[mri_ca_register]]"
  - "[[mri_em_register]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - atlas
  - normalization
  - longitudinal
  - GCA
---

# mri_cal_renormalize_gca

## Summary

`mri_cal_renormalize_gca` renormalizes a Gaussian Classifier Atlas (GCA) for a set of longitudinal time-point volumes. It reads a list of time-point subjects, concatenates their normalized T1 volumes into a multi-frame input, and updates the GCA's conditional intensity distributions using the transform from the base subject. This is the longitudinal counterpart of [[mri_ca_normalize]], and is used when constructing or updating an atlas from longitudinal data.

## Source Information

- **Language:** C++
- **Source file:** `mri_cal_renormalize_gca/mri_cal_renormalize_gca.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

The [[wiki/pipelines/recon-all|recon-all]] longitudinal pipeline processes multiple time points from the same subject by creating a base template and then running each time point's reconstruction with the base's atlas. `mri_cal_renormalize_gca` adapts the GCA model to the observed intensities across all time points, improving the intensity model's accuracy for the specific subject and scanner session characteristics.

It reads a file listing time-point subject names, constructs a multi-frame MRI from their individual normalized volumes, and calls `GCArenormalize()` or related functions to update the Gaussian parameters in the atlas.

## Inputs

Positional arguments:
1. `<time_point_file>` — text file, one time-point subject name per line
2. `<in_vol>` — name of the normalized volume (relative to each subject's mri/ directory)
3. `<input_gca>` — path to input GCA atlas file
4. `<transform_file>` — LTA/XFM/M3D transform file (base subject to atlas)
5. `<output_gca>` — path to write the renormalized GCA

The subjects directory is inferred from the path of the time-point file.

## Outputs

- A renormalized GCA file at the specified output path.

## Mathematical Foundations

Let $\{V_1, \ldots, V_T\}$ be the normalized volumes from $T$ time points. For each atlas node $(x_p, y_p, z_p)$ and tissue label $k$, the GCA stores a Gaussian:

$$
p(I | k, x_p, y_p, z_p) = \mathcal{N}(I; \mu_k, \sigma_k^2)
$$

Renormalization updates $\mu_k$ and $\sigma_k^2$ by accumulating observations from voxels mapped to the atlas node via the transform $T$:

$$
\hat{\mu}_k = \frac{1}{N_k} \sum_{t,v \in k} V_t(T^{-1}(v))
$$

The function `GCAregularizeConditionalDensities(gca, 0.5)` is called on the input atlas to regularize initial estimates before renormalization.

In `-longinput` mode, volumes are read from `<sdir>/<tp>.long.<base>/mri/<in_vol>`. Otherwise from `<sdir>/<base>/longtp/<tp>/<in_vol>`.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-mask <file>` | string | — | Apply brain mask before renormalization |
| `-novar` | — | off | Unify variance across all GCA nodes (do not use per-node variance estimates) |
| `-longinput` | — | off | Read volumes from `<tp>.long.<base>/mri/` path format instead of `<base>/longtp/<tp>/` |
| `-debug_voxel <x> <y> <z>` | int int int | — | Print per-voxel debug output at the specified CRS coordinate; sets global debug voxel `Gx`/`Gy`/`Gz` |
| `-debug_node <x> <y> <z>` | int int int | — | Print per-node debug output for the specified GCA node coordinate; sets global GCA debug node `Ggca_x`/`Ggca_y`/`Ggca_z` |
| `-w` | — | off | Enable diagnostic write mode (`DIAG_WRITE`); causes intermediate volumes to be written during processing |

## Typical Use Cases

**Renormalize atlas for a longitudinal subject:**
```bash
mri_cal_renormalize_gca \
  $SUBJECTS_DIR/bert_base/longtp/timepoints.txt \
  norm.mgz \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  $SUBJECTS_DIR/bert_base/mri/transforms/talairach.m3z \
  $SUBJECTS_DIR/bert_base/mri/long.renorm.gca
```

## Pipeline Context

Called as part of the [[wiki/pipelines/recon-all|recon-all]] longitudinal processing stream (`-long` flag). It runs after the base subject's atlas registration ([[mri_ca_register]]) and before the time-point-specific segmentation steps.

## Gotchas and Caveats

> [!gotcha] Time-point file path encodes subjects directory
> The subjects directory is derived from the directory portion of `<time_point_file>`, with the last path component (the base subject name) stripped. This means the file must be placed in `$SUBJECTS_DIR/<base_subject>/`. The code performs `FileNamePath` and then strips the last `/`-delimited component.

> [!gotcha] Regularization applied before renormalization
> `GCAregularizeConditionalDensities(gca, 0.5)` is always called on the input atlas before renormalization. This blends the input conditional densities toward uniform, which may affect convergence.

## Related Tools

- [[mri_ca_normalize]] — the cross-sectional counterpart
- [[mri_ca_train]] — builds the initial GCA atlas
- [[mri_ca_register]] — performs atlas registration (produces the transform input)
- [[mri_em_register]] — affine registration step that precedes ca_register

## Confidence and Gaps

Source code fully read. Confidence is high.
