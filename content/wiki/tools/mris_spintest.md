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
last_agent_update: 2026-04-21
gaps:
  - "The exact spatial correlation statistic (MRIspatialCC) implementation needs verification."
  - "--sd and --gdiag appear in print_usage() but are not implemented in parse_commandline()."
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
| Reference mask (optional, `--ref-mask`) | Binary mask for the reference map. | `.mgh`, `.mgz` |
| Map mask (optional, `--map-mask`) | Binary mask for the test map. | `.mgh`, `.mgz` |
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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sphere` | surface file | — | Sphere surface (required) |
| `--ref` | map file | — | Reference (stationary) map (required) |
| `--map` | map file | — | Test (rotated) map (required) |
| `--ref-mask` | mask file | — | Mask for reference map only |
| `--map-mask` | mask file | — | Mask for test map only |
| `--mask` | mask file | — | Apply same mask to both reference and test maps |
| `--o` | directory | — | Output directory (required when `--nperm > 0`) |
| `--nperm` | integer | `0` | Number of spin permutations (0 = no permutation; requires `--o` when > 0) |
| `--seed` | unsigned long | — | Random seed for reproducibility |
| `--ref-frame` | integer | `0` | Frame index in reference map (0-based) |
| `--cc` | file | — | Output file for observed correlation (required when `--nperm == 0`) |
| `--cc-glmfit` | file | — | Output file for observed correlation in GLM-fit format |
| `--threads` | integer | `1` | Number of OpenMP threads |
| `--max-threads` | — | `off` | Use maximum available OpenMP threads |
| `--max-threads-1` / `--max-threads-minus-1` | — | `off` | Use one fewer than the maximum available OpenMP threads |
| `--debug` | — | `off` | Enable debug output |
| `--checkopts` | — | `off` | Validate options and exit without running |
| `--sd` | `<dir>` | — | (Listed in help, not implemented) Would set `SUBJECTS_DIR`; not handled in `parse_commandline()` — passing it causes an "Option unknown" error |
| `--gdiag` | `<int>` | — | (Listed in help, not implemented) Would set diagnostic level; not handled in `parse_commandline()` — passing it causes an "Option unknown" error |
| `--s` | `<subject> <hemi>` | — | (Planned, not implemented) Mentioned in a source comment (`// revmapflag, dojac, --s subject hemi`) but not wired in the parser |

> [!gap] --sd, --gdiag, and --s listed in help or comments but not implemented
> `print_usage()` lists `--sd SUBJECTS_DIR` and `--gdiag diagno`, but neither is handled in `parse_commandline()`. A source comment also references `--s subject hemi` but it is not wired. All three will cause an "Option unknown" error if passed. They appear to be planned but unimplemented flags.

## Configuration Interactions

- `--nperm 0` computes only the observed correlation without a permutation distribution. P-values cannot be computed in this mode; `--cc` must be specified instead of `--o`.
- `--seed` enables reproducibility of the permutation results. Without it, each run produces different permutations.
- `--ref-mask` and `--map-mask` restrict the correlation to the masked vertices; `--mask` applies the same mask to both maps. These are important when excluding medial wall vertices.
- `--cc-glmfit` writes the correlation in GLM-fit format compatible with `mri_glmfit`; the observed correlation is also written as `cc.glmfit.dat` in the output directory when permutations are run.

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
> The medial wall has no meaningful cortical data. Masks (`--ref-mask`, `--map-mask`, or `--mask`) should be used to exclude medial wall vertices from the correlation computation and permutation test.

> [!gotcha] Many permutations required
> Reliable p-values require large permutation counts (≥1000; ideally ≥5000 for p < 0.001). Each permutation requires a full sphere resampling, so computation time scales linearly with `--nperm`.

## Related Tools

- [[mris_spherical_average]] — averages data on the sphere
- [[mris_sphere]] — produces the sphere used as input
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**Medium confidence.** The `MRISspinTest` class and its core methods are clearly defined in the source. The complete CLI has been verified from `parse_commandline()`. The exact `MRIspatialCC()` implementation needs deeper reading to confirm the spatial correlation formula.
