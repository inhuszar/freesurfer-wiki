---
title: "mri_jacobian"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_jacobian/mri_jacobian.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - morphometry
  - deformation
  - jacobian
  - nonlinear-registration
  - volume-change
---

# mri_jacobian

## Summary

`mri_jacobian` computes the Jacobian determinant of a nonlinear morphological deformation field (stored as a GCAM / m3z file). The Jacobian determinant at each voxel quantifies the local volume change induced by the deformation: values greater than 1 indicate local expansion, values less than 1 indicate local compression, and a value of 1 indicates no volume change. The output is a volumetric map of these determinants, optionally log-transformed or smoothed.

## Source Information

- **Source language:** C++
- **Source file:** `mri_jacobian/mri_jacobian.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Deformation-based morphometry (DBM) measures structural differences between individuals or groups by analyzing the deformation field required to register each subject's brain to a common template. The Jacobian determinant is the primary measurement in DBM:

- **Positive Jacobian $> 1$:** local tissue expansion (the subject has more volume than the template)
- **Positive Jacobian $< 1$:** local tissue compression (the subject has less volume)
- **$\log J$:** log-Jacobian is often preferred for statistical analysis as it is symmetric around zero, making it more appropriate for group comparisons

The input is typically a GCAM (`.m3z`) morph file produced by nonlinear registration tools such as `mri_em_register` with nonlinear mode, or similar atlas registration pipelines.

## Inputs

| Input | Positional | Description |
|-------|-----------|-------------|
| GCAM morph | argv[1] | Nonlinear deformation field (`.m3z` / GCAM format) |
| Template volume | argv[2] | MRI volume defining the output geometry |
| Output file | argv[3] or last | Path for Jacobian determinant volume |

## Outputs

| Output | Description |
|--------|-------------|
| Jacobian map | Volumetric map of determinant values (or log-determinant with `-log`) |
| Area maps (optional) | Current area and original area maps (with `-write-areas`) |

## Mathematical Foundations

For a deformation field $\phi: \mathbb{R}^3 \to \mathbb{R}^3$, the Jacobian matrix at point $\mathbf{x}$ is:

$$J(\mathbf{x}) = \frac{\partial \phi}{\partial \mathbf{x}} = \begin{pmatrix} \frac{\partial \phi_1}{\partial x_1} & \frac{\partial \phi_1}{\partial x_2} & \frac{\partial \phi_1}{\partial x_3} \\ \frac{\partial \phi_2}{\partial x_1} & \cdots & \cdots \\ \frac{\partial \phi_3}{\partial x_1} & \cdots & \frac{\partial \phi_3}{\partial x_3} \end{pmatrix}$$

The Jacobian determinant $\det(J(\mathbf{x}))$ measures local volume change.

In the GCAM representation, local volume changes are computed as the ratio of current voxel areas to original voxel areas:

$$J_\text{det} = \frac{A_\text{current}}{A_\text{original}}$$

where areas are the metric-space areas stored in the GCAM nodes.

The computation (`GCAMmorphFieldFromAtlas` or `GCAMwriteMRI` with `GCAM_AREA`) extracts these area ratios from the GCAM data structure.

**Log-Jacobian (with `-log`):**

$$\log J = \log_{10}\left(\frac{A_\text{current}}{A_\text{original}}\right)$$

**Smoothing:** If `-sigma <s>` is specified, a Gaussian kernel with standard deviation $s$ is convolved with the Jacobian map before writing.

**LTA correction:** If a linear transform is provided via `-lta`, the Jacobian determinant is divided by the linear part of the transform's determinant:

$$J_\text{corrected} = \frac{J}{\det(M_L)}$$

This isolates the nonlinear component of volume change.

## Configuration Options

All flags use a single dash and are matched case-insensitively.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-l` | — | false | Compute $\log_{10}$ of the Jacobian determinant before writing. |
| `-z` | — | false | Make the log-Jacobian zero-mean by subtracting the volume mean; also implies `-l`. |
| `-s <sigma>` | float | 0 (no smoothing) | Gaussian smooth both the area and original-area volumes with standard deviation `<sigma>` voxels before computing the ratio. |
| `-w` | — | false | Also write the current area and original-area volumes, suffixed `_area.mgz` and `_orig_area.mgz` on the output filename. |
| `-a` | — | false | Operate in atlas coordinate space (uses `GCAMwriteMRI` path) instead of subject space (uses `GCAMmorphFieldFromAtlas` path). |
| `-init` | — | false | Re-initialize GCAM node areas to the cube of the GCAM grid spacing before computing; use when the area fields in the GCAM are not set. |
| `-remove <lta>` | string | — | Read an LTA linear transform and divide the original-area volume by the determinant of that transform, isolating the nonlinear Jacobian component. |
| `-tm3d` | — | false | Indicates the input `.m3z` was produced by `mri_cvs_register` (tm3d format); implies `-init` to reinitialize GCAM areas. |
| `-debug_voxel <x> <y> <z>` | 3 × int | — | Print per-voxel debugging information for the GCAM node nearest to atlas voxel `(x, y, z)`. |
| `-dt` | — | — | Accepted but performs no operation (dead flag). |

> [!gotcha] Dead code: `-dt`
> The `-dt` option is parsed and accepted but the corresponding code block is empty. It has no effect.

> [!gotcha] Flag prefix is single dash only
> All flags use a single leading dash (e.g., `-l`, `-s 4`, `-a`). Double-dash forms are not accepted and will cause an "unknown option" error.

## Configuration Interactions

- `-l` and `-z` are related: `-z` implies `-l`. Using `-z` without `-l` still enables log-transform.
- `-remove <lta>` is the flag for LTA-based correction (not `-lta` as sometimes erroneously written); it divides the `orig_area` by the linear determinant before computing the ratio, isolating the nonlinear volume change.
- `-init` and `-tm3d` both trigger GCAM area re-initialization; `-tm3d` additionally logs the CVS-register origin of the file.
- `-a` changes whether the Jacobian is computed in subject space or atlas space; the interpretation differs between these contexts.
- `-s` smoothing is applied before the area ratio computation (to both numerator and denominator), not after; this differs from post-hoc smoothing and produces slightly different results.

## Typical Use Cases

**Compute Jacobian determinant for deformation-based morphometry:**
```bash
mri_jacobian subject.m3z T1.mgz jacobian.mgz
```

**Log-Jacobian for group statistical analysis:**
```bash
mri_jacobian -l -s 4 subject.m3z T1.mgz log_jacobian.mgz
```

**Correct for linear registration component:**
```bash
mri_jacobian -l -remove linear_part.lta subject.m3z T1.mgz log_jacobian_nonlinear.mgz
```

**Zero-mean log-Jacobian (implies log):**
```bash
mri_jacobian -z subject.m3z T1.mgz log_jacobian_zeromean.mgz
```

## Pipeline Context

`mri_jacobian` is not called by `recon-all`. It is used in deformation-based morphometry (DBM) research workflows:

1. Nonlinear registration of each subject to a template (produces `.m3z` per subject)
2. `mri_jacobian` per subject to extract the Jacobian determinant
3. Statistical analysis (e.g., [[mri_glmfit]]) on stacked Jacobian maps

## Gotchas and Caveats

> [!gotcha] GCAM RAS-to-vox conversion required
> The code calls `GCAMrasToVox(gcam, mri)` before computing areas. The GCAM must be in the correct coordinate system relative to the template volume.

> [!gotcha] Areas in GCAM vs. voxel Jacobian
> The Jacobian is computed from the ratio of metric-space areas stored in the GCAM nodes, not from finite differences of the displacement field. This is a GCAM-specific representation and may differ from Jacobian computations in other software packages (e.g., ANTs).

> [!gotcha] log10 vs. natural log
> `mri_jacobian -log` computes $\log_{10}$, not natural log. This differs from some other software packages that use natural logarithm for log-Jacobian analysis.

## Related Tools

- [[mri_em_register]] — produces the nonlinear GCAM morph files consumed by mri_jacobian
- [[mri_glmfit]] — group statistical analysis on Jacobian maps

## Confidence and Gaps

**Confident (from source):** All flags confirmed from complete `get_option()` read. GCAM input, area ratio computation, log/smooth/LTA-correction options, atlas vs. subject space modes, `-tm3d` purpose (CVS register morph origin), output format.
