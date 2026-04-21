---
title: "mris_spintest"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_spintest/mris_spintest.cpp"
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
  - "Full command-line interface not fully captured from first 120 lines."
  - "The exact spatial correlation statistic (MRIspatialCC) implementation needs verification."
tags:
  - statistics
  - spin-test
  - spatial-correlation
  - surface
  - permutation
---

# mris_spintest

## Summary

`mris_spintest` performs a spin test for assessing the statistical significance of spatial correlations between two maps defined on the cortical sphere. It rotates one map by random spherical rotations (spins) to generate a null distribution that preserves the spatial autocorrelation structure, then computes p-values for the observed correlation. Developed by Douglas N. Greve.

## Source Information

- **Language:** C++
- **Source file:** `mris_spintest/mris_spintest.cpp`
- **Key class:** `MRISspinTest` — encapsulates spin test computation
- **Key methods:** `SpinCC()` (correlation at given rotation), `SpinPerm()` (permutation distribution), `PermTest()` (p-value computation)
- **Key libraries:** `mrisurf`, `mrisutils`, `randomfields`, `mri2`, `resample`
- **Note:** Despite the file header mentioning GTM/MG/RBV (partial volume correction), the main implementation is the spin test.

## Purpose and Context

When comparing two brain maps (e.g., a genetic gradient and a functional connectivity map), the spatial autocorrelation within each map inflates nominal p-values obtained from standard permutation tests that randomly reassign vertex labels. The spin test (Alexander-Bloch et al., 2018) addresses this by rotating one map on the sphere using random rotations (Euler angles α, β, γ), which preserves the spatial structure of the map while breaking its correspondence with the reference map. `mris_spintest` implements this on the FreeSurfer sphere representation.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Sphere surface (`--sphere`) | The sphere surface for both maps (e.g., `lh.sphere.reg`). | FreeSurfer binary surface |
| Reference map (`--ref`) | The map that remains stationary during spin permutations. | `.mgh`, `.mgz` |
| Test map (`--map`) | The map that is rotated. | `.mgh`, `.mgz` |
| Reference mask (optional, `--refmask`) | Binary mask for the reference map. | `.mgh`, `.mgz` |
| Map mask (optional, `--mapmask`) | Binary mask for the test map. | `.mgh`, `.mgz` |
| Output directory (`--o`) | Directory for output files. | Directory |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `cc.dat` | Observed spatial correlation vector (one value per frame). | Text |
| `cc.glmfit.dat` | Correlation in GLM-fit format. | Text |
| `cc.perm.dat` | Permutation distribution (nperm × nframes). | Text |
| `p.neg.dat` | One-tailed p-values (negative direction). | Text |
| `p.abs.dat` | Two-tailed p-values. | Text |
| `p.pos.dat` | One-tailed p-values (positive direction). | Text |

## Mathematical Foundations

**Spatial correlation statistic:** `MRIspatialCC()` computes the spatial cross-correlation between the reference and map at each vertex, returning a vector of correlation values (one per map frame).

**Spin rotation:** For each permutation, the test map is rotated on the unit sphere by Euler angles $(\alpha, \beta, \gamma)$ drawn from a uniform distribution on SO(3). The rotation is applied to the vertex coordinates of the sphere, and the map values are re-sampled at the rotated positions using the sphere hash table:

$$
R = R_z(\alpha) \cdot R_y(\beta) \cdot R_z(\gamma)
$$

where $R_z$ and $R_y$ are rotation matrices about the z and y axes.

**P-value computation:** Given the observed correlation vector $\mathbf{c}$ and permutation distribution $\{c_p^{(i)}\}_{i=1}^{N_{\text{perm}}}$:

$$
p_{\text{pos}} = \frac{|\{i : c_p^{(i)} > c\}|}{N_{\text{perm}}}
$$
$$
p_{\text{neg}} = \frac{|\{i : c_p^{(i)} < c\}|}{N_{\text{perm}}}
$$
$$
p_{\text{abs}} = \frac{|\{i : |c_p^{(i)}| > |c|\}|}{N_{\text{perm}}}
$$

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--sphere` | surface file | Sphere surface |
| `--ref` | map file | Reference (stationary) map |
| `--map` | map file | Test (rotated) map |
| `--refmask` | mask file | Mask for reference map |
| `--mapmask` | mask file | Mask for test map |
| `--o` | directory | Output directory |
| `--nperm N` | integer | Number of spin permutations (default: 0, no permutation) |
| `--seed S` | unsigned long | Random seed for reproducibility |
| `--refframe F` | integer | Frame index in reference map (default: 0) |
| `--cc` | file | Output file for observed correlation |
| `--glmfit` | file | Output file in GLM format |
| `--threads N` | integer | Number of OpenMP threads |

> [!gap] Full flag list
> Additional flags may be defined in `parse_commandline()`. The above are from global variable declarations.

## Configuration Interactions

- `--nperm 0` computes only the observed correlation without a permutation distribution. P-values cannot be computed in this mode.
- `--seed` enables reproducibility of the permutation results. Without it, each run produces different permutations.
- `--refmask` and `--mapmask` restrict the correlation to the masked vertices; this is important when excluding medial wall vertices.

## Typical Use Cases

**Compute spin-test p-values for correlation between two surface maps (1000 permutations):**
```bash
mris_spintest \
  --sphere lh.sphere.reg \
  --ref lh.genetic_gradient.mgh \
  --map lh.fc_map.mgh \
  --nperm 1000 \
  --seed 42 \
  --o spintest_output/
```

## Pipeline Context

`mris_spintest` is not part of `recon-all`. It is a research statistics tool used in:
- Brain-wide association studies comparing cortical maps.
- Validation of spatial overlaps between functional and structural gradients.
- Any analysis requiring null hypothesis testing of spatial correlations on the cortical surface.

## Gotchas and Caveats

> [!gotcha] Medial wall vertices
> The medial wall has no meaningful cortical data. Masks (`--refmask`, `--mapmask`) should be used to exclude medial wall vertices from the correlation computation and permutation test.

> [!gotcha] Many permutations required
> Reliable p-values require large permutation counts (≥1000; ideally ≥5000 for p < 0.001). Each permutation requires a full sphere resampling, so computation time scales linearly with `--nperm`.

## Related Tools

- [[mris_spherical_average]] — averages data on the sphere
- [[mris_sphere]] — produces the sphere used as input
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**Medium confidence.** The `MRISspinTest` class and its core methods are clearly defined in the source. The exact `MRIspatialCC()` implementation and the full CLI require deeper reading.
