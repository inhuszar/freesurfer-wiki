---
title: "mri_glmfit-sim"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/mri_glmfit-sim"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit]]"
  - "[[mri_concat]]"
  - "[[mri_binarize]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full list of --sim-sign interactions with permutation tests not traced"
  - "Cache directory format and usage details"
  - "GRF-based correction details"
tags:
  - glm
  - statistics
  - multiple-comparisons
  - simulation
  - cluster
  - fdr
  - permutation
---

# mri_glmfit-sim

## Summary

`mri_glmfit-sim` performs multiple-comparisons correction on the output of [[mri_glmfit]] using Monte Carlo simulation, permutation testing, Gaussian Random Field (GRF) theory, or false discovery rate (FDR). It reads the `mri_glmfit.log` file from a completed [[mri_glmfit]] analysis to reconstruct the original analysis parameters, runs a specified number of null simulations (by re-running `mri_glmfit` with synthesized or permuted data), builds a cluster-size distribution (CSD), and then thresholds the actual contrast maps at a user-specified cluster-wise p-value.

## Source Information

- **Source language:** tcsh shell script
- **Source file:** `scripts/mri_glmfit-sim`
- **Original author:** Douglas N. Greve

## Purpose and Context

After [[mri_glmfit]] produces per-voxel/vertex significance maps, raw voxel-wise p-values must be corrected for multiple comparisons. `mri_glmfit-sim` provides this correction via:

1. **Monte Carlo simulation** (`mc-full`, `mc-z`): generates null distributions by synthesizing random data with the same smoothness and design as the original, re-running the GLM, and recording the maximum cluster size across iterations.
2. **Permutation testing** (`perm`): shuffles subject labels across iterations to generate the null distribution.
3. **Gaussian Random Field (GRF) theory** (`--grf`): analytic approximation based on the estimated FWHM.
4. **False Discovery Rate (FDR)** (`--fdr`): Benjamini-Hochberg correction.

The tool calls `mri_surfcluster` (for surface data) or `mri_volcluster` (for volume data) to apply the resulting threshold.

## Inputs

| Input | Description |
|-------|-------------|
| `--glmdir dir` | Path to the `mri_glmfit` output directory (required) |
| `--sim nulltype nsim thresh csdbase` | Simulation type, number of iterations, vertex-wise threshold, CSD basename |
| `--no-sim csdbase` | Skip simulation; use existing CSD files with given base name |

The tool reads `mri_glmfit.log` from `glmdir` to reconstruct the original `mri_glmfit` command line.

For simulation modes other than `perm`, the `fwhm.dat` file in the GLM directory must exist (produced by `mri_glmfit` by default).

## Outputs

For each contrast in the GLM directory:

| File | Description |
|------|-------------|
| `<contrast>/<csdbase>.sig.cluster.mgz` | Cluster-wise significance map |
| `<contrast>/<csdbase>.sig.voxel.mgz` | Voxel-wise corrected significance map |
| `<contrast>/<csdbase>.sig.masked.mgz` | Significance masked at cluster threshold |
| `<contrast>/<csdbase>.sig.ocn.mgz` | Cluster index map (each cluster labeled) |
| `<contrast>/<csdbase>.sig.cluster.summary` | Text summary table of significant clusters |
| `csd/<csdbase>.j???-<contrast>.csd` | Raw CSD files from each simulation iteration |

## Mathematical Foundations

**Cluster-based correction:**

For each simulation iteration $j$:
1. Synthesize null data (Gaussian noise or permuted labels) with the same design matrix and FWHM as the original.
2. Run `mri_glmfit` on the null data.
3. Apply the vertex-wise threshold $t$ to the null significance map.
4. Record the size of the largest surviving cluster: $C_j^\text{max}$.

The empirical null distribution of maximum cluster size is $\{C_j^\text{max}\}_{j=1}^{N_\text{sim}}$.

For the observed data, a cluster of size $C_\text{obs}$ has corrected cluster-wise p-value:

$$p_\text{cluster} = \frac{\#\{C_j^\text{max} \geq C_\text{obs}\}}{N_\text{sim}}$$

**FDR correction:**

Applies the Benjamini-Hochberg procedure to per-voxel p-values to control the expected proportion of false positives among rejections. Activated via `--fdr`.

**GRF theory:**

Analytic correction based on the Euler characteristic of excursion sets. Requires the estimated FWHM of the residuals (from `fwhm.dat`). Activated via `--grf`.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--glmdir` | `dir` | GLM output directory from mri_glmfit |
| `--sim` | `nulltype nsim thresh csdbase` | Simulation: nulltype=`perm`/`mc-full`/`mc-z`; nsim=iterations; thresh=vertex-wise threshold; csdbase=output base name |
| `--no-sim` | `csdbase` | Skip simulation; threshold with existing CSD files |
| `--sim-sign` | `abs/pos/neg` | Sign for cluster formation (default: `abs`) |
| `--cwpvalthresh` | `p` | Cluster-wise p-value threshold (default: 0.05) |
| `--fwhm` | `fwhm` | Override FWHM (mm) from fwhm.dat |
| `--fwhm-add` | `delta` | Add delta to FWHM estimate |
| `--grf` | — | Use GRF (Gaussian Random Field) theory instead of simulation |
| `--fdr` | — | Use FDR correction instead of simulation |
| `--bonferroni` | `N` | Bonferroni correction with N independent tests |
| `--cache` | — | Use pre-computed CSD cache from `$FREESURFER_HOME/average/mult-comp-cor` |
| `--cache-label` | `label` | Cache label (default: `cortex`) |
| `--perm-resid` | — | Permute residuals (ter Braak method; default on) |
| `--perm-force` | — | Force permutation even with non-orthogonal design |
| `--perm-sign-flip` | — | Use sign-flip permutation (for one-sample tests) |
| `--nJobs` | `N` | Number of parallel simulation jobs |
| `--bg` | — | Run simulation jobs in background |
| `--no-y` | — | Do not require the original y file |
| `--annot` | `annot` | Annotation for cluster reporting (default: `aparc`) |
| `--no-annot` | — | Disable annotation-based cluster reporting |
| `--centroid` | — | Report cluster centroids |
| `--perm-nonstatcor` | — | Non-stationarity correction for permutation |
| `--fwhm-map` | `file` | Local FWHM map for non-stationarity correction |
| `--seed` | `seed` | Random seed for simulation |
| `--log` | `logfile` | Log file path |
| `--tmp` | `tmpdir` | Temporary directory |
| `--nocleanup` | — | Do not clean up temporary files |
| `--debug` | — | Enable debug output |

## Configuration Interactions

- `--sim` and `--no-sim` are mutually exclusive; `--no-sim` assumes CSD files already exist from a previous run.
- `--grf` and `--fdr` replace the simulation step; `--sim` should not be specified with these flags.
- `--cache` uses pre-computed null distributions (shipped with FreeSurfer for fsaverage surface analyses); this is faster than re-running simulation but only valid when the data are on fsaverage.
- `--perm` (permutation) is incompatible with `--wls` analyses (weighted least squares); the script exits with an error if WLS was used in the original GLM.
- `--sim-sign` must match the direction of the hypothesis being tested; `abs` tests for any effect, `pos`/`neg` for directed effects.
- `--nJobs` > 1 distributes simulation iterations across parallel processes; `--bg` runs them in the background and polls for completion.

## Typical Use Cases

**Monte Carlo simulation on a surface GLM:**
```bash
mri_glmfit-sim \
  --glmdir lh.thickness.glmfit \
  --sim mc-z 5000 1.3 mc-z.sim \
  --sim-sign abs \
  --cwpvalthresh 0.05
```

**Permutation test (e.g., for non-Gaussian data):**
```bash
mri_glmfit-sim \
  --glmdir lh.thickness.glmfit \
  --sim perm 5000 1.3 perm.sim \
  --sim-sign abs
```

**FDR correction (no simulation needed):**
```bash
mri_glmfit-sim \
  --glmdir lh.thickness.glmfit \
  --fdr \
  --sim-sign abs
```

**Use pre-computed cache (fsaverage surface only):**
```bash
mri_glmfit-sim \
  --glmdir lh.thickness.glmfit \
  --cache \
  --cache-label cortex \
  --sim-sign abs \
  --cwpvalthresh 0.05 \
  --no-sim mc-z.cache
```

## Pipeline Context

`mri_glmfit-sim` is run after [[mri_glmfit]] in group-level analysis workflows:

- **Upstream:** [[mri_glmfit]] (must complete and produce `mri_glmfit.log`)
- **Downstream:** Visualization in [[freeview]], `mri_surfcluster` / `mri_volcluster` for further cluster extraction

The output `sig.cluster.summary` files contain tables of significant clusters suitable for reporting.

## Gotchas and Caveats

> [!gotcha] Requires mri_glmfit.log
> `mri_glmfit-sim` reads `mri_glmfit.log` to reconstruct the original analysis. If you move or rename the `--glmdir`, you must ensure the paths embedded in `mri_glmfit.log` still resolve correctly, or the simulation may fail.

> [!gotcha] FWHM from fwhm.dat is critical
> For `mc-full` and `mc-z` simulation, the FWHM of the residuals (stored in `fwhm.dat`) controls the spatial correlation of the simulated null data. If FWHM estimation was disabled (`--no-est-fwhm` in mri_glmfit), simulation cannot proceed without manually providing `--fwhm`.

> [!gotcha] Permutation with WLS fails
> If the original GLM used `--wls`, permutation testing (`--sim perm`) is not supported. The script explicitly checks and exits with an error.

> [!gotcha] Cache only valid for fsaverage
> The `--cache` option uses pre-computed CSD files distributed with FreeSurfer in `$FREESURFER_HOME/average/mult-comp-cor/`. These are only valid when analyzing data on the `fsaverage` subject with default settings.

> [!gotcha] sig.cluster.mgz sign convention
> The cluster significance map preserves the sign of the t-statistic: positive clusters have positive values, negative clusters have negative values. This is consistent with [[mri_glmfit]]'s `sig.mgh` output.

## Related Tools

- [[mri_glmfit]] — produces the input GLM output that mri_glmfit-sim operates on
- [[mri_concat]] — used upstream to create the 4D input
- [[mri_binarize]] — used to create masks

## Confidence and Gaps

**Confident (from source):** Simulation types (perm, mc-z, mc-full), GRF and FDR modes, CSD file structure, cluster thresholding via `mri_surfcluster`/`mri_volcluster`, parallel job support.

**Uncertain:** Exact non-stationarity correction (`--perm-nonstatcor`); full cache directory format; interaction of `--fwhm-map` with cluster statistics.

> [!gap] Non-stationarity correction
> The `--perm-nonstatcor` and `--fwhm-map` flags enable local FWHM-based correction for non-stationarity. The mathematical details of this correction and the required format of `fwhm-map` are not fully traced from the script source.
