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
  - "[[fsgd-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-23
audit_skip: true
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

$$
p_\text{cluster} = \frac{\#\{C_j^\text{max} \geq C_\text{obs}\}}{N_\text{sim}}
$$

**FDR correction:**

Applies the Benjamini-Hochberg procedure to per-voxel p-values to control the expected proportion of false positives among rejections. Activated via `--fdr`.

**GRF theory:**

Analytic correction based on the Euler characteristic of excursion sets. Requires the estimated FWHM of the residuals (from `fwhm.dat`). Activated via `--grf`.

## Configuration Options

### Simulation method (choose one)

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--sim` | `nulltype nsim thresh csdbase` | Full simulation specification: nulltype=`perm`/`mc-full`/`mc-z`; nsim=iterations; thresh=vertex-wise threshold (-log10 p); csdbase=output base name. | — (required unless `--no-sim`, `--grf`, `--fdr`, or `--cache`) |
| `--perm` | `nsim thresh sign` | Shorthand for permutation simulation: `nsim` iterations, cluster-forming threshold `thresh` (-log10 p), and `sign` (`pos`/`neg`/`abs`). Sets csdbase automatically to `perm.th<thresh10>.<sign>`. | — |
| `--no-sim` | `csdbase` | Skip simulation; threshold with existing CSD files named `csdbase`. | — |
| `--cache` or `--mczsim` or `--mcsim` | `thresh sign` | Use pre-computed CSD cache from `$FREESURFER_HOME/average/mult-comp-cor`. Valid thresholds: 1.3, 2.0, 2.3, 3.0, 3.3, 4.0. Sets DoSim=0. | — |
| `--grf` | `vwthresh sign` | Use Gaussian Random Field theory (volumes only). Takes vertex-wise threshold (-log10 p) and sign. Sets DoSim=0. | — |
| `--fdr` | — | Use FDR correction instead of simulation. | off |

### Cache options

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--cache-dir` or `--mczsim-dir` | `dir` | Override directory for pre-computed CSD cache files. | `$FREESURFER_HOME/average/mult-comp-cor` |
| `--cache-label` or `--mczsim-label` | `label` | Label subdirectory within the cache (e.g., `cortex`, `label`). | `cortex` |

### Cluster thresholding

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--cwpvalthresh` or `--cwp` | `p` | Cluster-wise p-value threshold. Only clusters with p < `p` are reported. | `0.05` |
| `--sim-sign` | `abs`/`pos`/`neg` | Sign for cluster formation: `abs` tests for any effect, `pos`/`neg` for directed effects. | — (required with `--sim`) |
| `--bonferroni` | `N` | Additional Bonferroni correction across `N` independent spaces. | `0` (disabled) |
| `--2spaces` | — | Bonferroni correction across 2 spaces (e.g., lh and rh). Shorthand for `--bonferroni 2`. | off |
| `--3spaces` | — | Bonferroni correction across 3 spaces (e.g., lh, rh, mni305). Shorthand for `--bonferroni 3`. | off |

### FWHM control

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--fwhm-override` | `fwhm` | Override FWHM (mm) read from `fwhm.dat` in glmdir. | — (use value from `fwhm.dat`) |
| `--fwhm-add` | `delta` | Add `delta` mm to the estimated FWHM before cache table lookup. | `0` |

### Permutation options

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--perm-resid` | — | Permute residuals instead of raw data (ter Braak method). Allows permutation with non-orthogonal designs. Requires `--eres-save` in the original `mri_glmfit` run. | on |
| `--no-perm-resid` | — | Disable `--perm-resid`; permute the raw input data instead. Also sets `PermForce=0`. | off |
| `--perm-force` | — | Force permutation even with non-orthogonal design. | on (set by default and by `--perm-resid`) |
| `--no-perm-force` | — | Disable forced permutation on non-orthogonal designs. | off |
| `--perm-nonstatcor` | — | Non-stationarity correction for permutation. Requires `--save-fwhm-map` in the original `mri_glmfit` run; the script locates `glmdir/fwhm.*` automatically. | off |
| `--perm-pvr-override` | — | Override PVR (per-vertex regressor) behavior during permutation. | off |
| `--no-perm-pvr-override` | — | Disable PVR override during permutation. | off |

> [!note] `--perm-signflip` appears in the help text but is not parsed from the command line
> The help text mentions `--perm-signflip`, but the option is not present in the script's `parse_args` switch. Sign-flipping permutation is activated automatically when the original `mri_glmfit` run used `--osgm` (detected from `mri_glmfit.log`), not by a user-supplied flag to `mri_glmfit-sim`.

### Input/mask overrides

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--glmdir` | `dir` | GLM output directory from `mri_glmfit` (required). The tool reads `mri_glmfit.log` from this directory to reconstruct the original analysis. | — (required) |
| `--y` | `file` | Override the input `y` file path (instead of determining it from glmdir). Must exist on disk. | — (determined from glmdir) |
| `--mask` | `maskfile` | Override brain mask from `glmdir`. Suggested for use with `--base`. | — (read from glmdir) |

### Output control

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--base` | `csdbase` | Explicitly set the CSD output base name. Overrides the automatically generated name. | — (auto-generated from method and threshold) |
| `--annot` | `annot` | Annotation file for cluster region reporting. | `aparc` |
| `--a2009s` | — | Use `aparc.a2009s` instead of `aparc` for region reporting. Shorthand for `--annot aparc.a2009s`. | off |
| `--no-out-annot` | — | Disable writing the cluster annotation output file. | off (annotation is written) |
| `--centroid` | — | Report cluster centroid coordinates/annotation instead of the peak vertex. | off (reports peak) |
| `--no-cluster-mean` or `--no-y` | — | Do not compute per-subject means within each cluster. Skips needing the original `y` file. | off (means are computed) |
| `--spatial-sum` | — | Compute spatial sum over cluster voxels instead of average when building `y.ocn.dat`. Useful when input represents area or volume. | off (average) |
| `--grf-ocn-anat` | — | Map the OCN (output cluster number) volume into anatomical (fsaverage) space. Only applies when `--grf` is used. | off |
| `--no-grf-ocn-anat` | — | Disable anatomical-space OCN mapping. | on (off by default; this flag is a no-op at default) |

### Parallel job control

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--bg` | `N` | Divide simulation into `N` background jobs and poll for completion. Sets DoBackground=1 and DoPoll=1. | `1` (no background jobs) |
| `--no-bg` | — | Disable background job execution and polling. | off |
| `--pbsubmit` | `N` | Submit `N` cluster jobs via `pbsubmit` (Martinos center cluster scheduler). Sets DoPBSubmit=1 and DoPoll=1. | off |
| `--sleep` | `seconds` | Number of seconds to sleep between background job completion polls. | `10` |

### Miscellaneous

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--overwrite` | — | Delete existing CSD files and re-run simulation even if CSD files for the given `csdbase` already exist. Without this flag, the script exits with an error if CSD files are found. | off |
| `--seed` | `seed` | Random seed for simulation. | — (unseeded) |
| `--log` | `logfile` | Log file path. | `<glmdir>/<csdbase>.mri_glmfit-sim.log` |
| `--tmp` | `tmpdir` | Temporary directory for intermediate files. | `<glmdir>/tmp.mri_glmfit-sim-<PID>` |
| `--uniform` | `min max` | Use uniform PDF instead of Gaussian for null data synthesis. | off (Gaussian) |
| `--allowdiag` | — | For volume analyses, allow diagonal (edge/corner) neighbors when forming clusters. Default is on; must match `mri_volcluster` setting. | on |
| `--no-allowdiag` | — | For volume analyses, only allow face-adjacent neighbors (no diagonal). | off |
| `--vol-subject` | `subject` | Override the volume subject (used for GRF cache lookup). | `fsaverage` |
| `--subject-override` | `subject` | Override the subject read from `mri_glmfit.log`. | — (read from log) |
| `--diag-cluster` | — | Diagnostic cluster mode (incompatible with `--bg` and `--pbsubmit`; requires `--sim`). | off |
| `--debug` | — | Enable verbose/debug output (sets `verbose` and `echo`). | off |

> [!note] `--hemi`, `--surf`, `--fsgd`, `--label` are read from `mri_glmfit.log`
> `mri_glmfit-sim` reconstructs the original `mri_glmfit` command line from `mri_glmfit.log`. Flags like `--surf`, `--hemi`, `--fsgd`, and `--label` are therefore parsed from the log, not from the `mri_glmfit-sim` command line directly. The script internally detects the analysis type (surface vs. volume), hemisphere, subject, and label from the logged command.

> [!note] Cluster output flags `--cwsig` and `--vwsig`
> --cwsig (cluster-wise significance map) and --vwsig (voxel-wise significance map) are output filenames passed internally to `mri_surfcluster` or `mri_volcluster` by the script. They are not user-facing `mri_glmfit-sim` flags; the output paths are determined from `glmdir` and `csdbase` automatically.

## Configuration Interactions

- `--sim` and `--no-sim` are mutually exclusive; `--no-sim` assumes CSD files already exist from a previous run.
- `--grf` and `--fdr` replace the simulation step; `--sim` should not be specified with these flags.
- `--cache` uses pre-computed null distributions (shipped with FreeSurfer for fsaverage surface analyses); this is faster than re-running simulation but only valid when the data are on fsaverage.
- `--perm` (permutation) is incompatible with `--wls` analyses (weighted least squares); the script exits with an error if WLS was used in the original GLM.
- `--sim-sign` must match the direction of the hypothesis being tested; `abs` tests for any effect, `pos`/`neg` for directed effects.
- `--bg N` divides the simulation into `N` parallel background jobs and polls for completion. If background jobs die uncleanly, the script will poll indefinitely.
- `--perm-resid` is on by default; it is only meaningful when `nulltype=perm`. It also forces `PermForce=1`.
- `--no-y`/`--no-cluster-mean` must be placed first on the command line because the script attempts to locate the `y` file while parsing `--glmdir` if `DoClusterMean` is still 1.

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
  --cache 2.0 abs \
  --cwpvalthresh 0.05
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
> For `mc-full` and `mc-z` simulation, the FWHM of the residuals (stored in `fwhm.dat`) controls the spatial correlation of the simulated null data. If FWHM estimation was disabled (`--no-est-fwhm` in mri_glmfit), simulation cannot proceed without manually providing `--fwhm-override`.

> [!gotcha] Permutation with WLS fails
> If the original GLM used `--wls`, permutation testing (`--sim perm`) is not supported. The script explicitly checks and exits with an error.

> [!gotcha] Cache only valid for fsaverage
> The `--cache` option uses pre-computed CSD files distributed with FreeSurfer in `$FREESURFER_HOME/average/mult-comp-cor/`. These are only valid when analyzing data on the `fsaverage` subject with default settings.

> [!gotcha] sig.cluster.mgz sign convention
> The cluster significance map preserves the sign of the t-statistic: positive clusters have positive values, negative clusters have negative values. This is consistent with [[mri_glmfit]]'s `sig.mgh` output.

> [!gotcha] --no-cluster-mean must be first on the command line
> The script checks `DoClusterMean` while processing the `--glmdir` path (it attempts to resolve the `y` file immediately). If `--no-cluster-mean` is placed after `--glmdir`, the script will already have tried to find the `y` file and may exit with an error. Always place `--no-cluster-mean` (or `--no-y`) first.

## Related Tools

- [[mri_glmfit]] — produces the input GLM output that mri_glmfit-sim operates on
- [[mri_concat]] — used upstream to create the 4D input
- [[mri_binarize]] — used to create masks

## Confidence and Gaps

**Confident (from source):** Simulation types (perm, mc-z, mc-full), GRF and FDR modes, CSD file structure, cluster thresholding via `mri_surfcluster`/`mri_volcluster`, parallel job support, full parse_args flag inventory.

**Uncertain:** Exact non-stationarity correction (`--perm-nonstatcor`); full cache directory format; interaction of `--fwhm-map` with cluster statistics.

> [!gap] Non-stationarity correction
> The `--perm-nonstatcor` flag enables local FWHM-based correction for non-stationarity. The mathematical details of this correction are not fully traced from the script source. The required `fwhm.*` map is located automatically by the script from `glmdir` (requires `--save-fwhm-map` in the original `mri_glmfit` run).
