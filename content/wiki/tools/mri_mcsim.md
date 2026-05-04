---
title: "mri_mcsim"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mcsim/mri_mcsim.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_maps2csd]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - statistics
  - monte-carlo
  - multiple-comparisons
  - surface
---

# mri_mcsim

## Summary

`mri_mcsim` computes Cluster Size Distribution (CSD) tables for surface-based multiple comparison correction via Monte Carlo simulation. It generates white Gaussian noise, smooths it on a surface mesh, applies a threshold, and records the maximum cluster size across many repetitions. The resulting empirical distribution is used by `mri_glmfit-sim` to compute cluster-level p-values. Pre-computed tables for `fsaverage` are distributed with FreeSurfer in `$FREESURFER_HOME/average/mult-comp-cor/`.

## Source Information

- **Language:** C++
- **Source file:** `mri_mcsim/mri_mcsim.cpp`

## Purpose and Context

Voxel-wise multiple comparison correction (e.g., Bonferroni) is overly conservative for spatially smooth neuroimaging data. Cluster-based correction is more powerful: a cluster of contiguous suprathreshold vertices is significant if its size exceeds what would be expected under the null hypothesis. The null distribution of the maximum cluster size is not analytically tractable for arbitrary surface meshes, so it is estimated via Monte Carlo simulation.

`mri_mcsim` runs many ($N \geq 10000$) iterations of:
1. Generate white Gaussian noise on the surface vertices.
2. Smooth the noise with a specified FWHM Gaussian kernel.
3. Apply a z-score threshold (positive, negative, or absolute).
4. Find the largest cluster (measured in vertices or mm²).
5. Append this value to the CSD table.

The resulting CSD for each combination of FWHM, threshold, and sign is stored in a structured directory tree.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Surface | FreeSurfer surface file | Target surface (e.g., fsaverage lh) |
| Label (optional) | FreeSurfer label | Restrict search space to a cortical region |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| CSD files | `.csd` | One per FWHM × threshold × sign combination |
| CSD PDF files | text | Optional; empirical PDFs/CDFs |

Output directory structure: `<outdir>/<fwhm>/<sign>/<threshold>/mc-z[.jobN].csd`

## Mathematical Foundations

For each iteration $i$ out of $N_{rep}$:

1. Generate noise $\epsilon_i(\mathbf{v}) \sim \mathcal{N}(0,1)$ for each surface vertex $\mathbf{v}$.
2. Smooth: $\tilde{\epsilon}_i = G_{FWHM} * \epsilon_i$ where $G_{FWHM}$ is the surface heat-diffusion smoothing kernel with the specified FWHM.
3. Threshold: identify connected clusters where $|\tilde{\epsilon}_i(\mathbf{v})| > \theta$.
4. Record $C_i = \max_{\text{clusters}} |\text{cluster}|$.

The empirical CSD is:

$$
\hat{F}(k) = P(\max \text{cluster size} \geq k) \approx \frac{1}{N_{rep}} \sum_{i=1}^{N_{rep}} \mathbf{1}[C_i \geq k]
$$

A cluster of size $k$ in a real analysis is significant at level $\alpha$ if $\hat{F}(k) \leq \alpha$.

The simulation is run independently for each FWHM value (typically 0, 5, 10, 15, 20, 25 mm) and each threshold (typically 1.3, 2.0, 2.3, 3.0, 3.5) and sign (`pos`, `neg`, `abs`).

## Configuration Options

All flags use double dashes. Parsing is case-insensitive.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o <dir>` | string | required | Top-level output directory; subdirectory tree `fwhm<N>/<sign>/th<N>/` is created automatically. |
| `--base <stem>` | string | required | Base filename stem for CSD output files (e.g., `mc-z`); parallel jobs should use distinct stems such as `mc-z.j001`. |
| `--surf <subject> <hemi>` | 2 × string | required | Subject name and hemisphere (`lh` or `rh`); loads `<hemi>.white` surface from `$SUBJECTS_DIR/<subject>/surf/`. |
| `--surface <subject> <hemi>` | 2 × string | — | Alias for `--surf`. |
| `--nreps <n>` | int | required | Number of Monte Carlo simulation iterations. |
| `--fwhm <fwhm1> [<fwhm2> ...]` | float(s) | — | One or more FWHM values (mm) to simulate; multiple values can follow consecutively without repeating the flag. |
| `--thresh <t1> [<t2> ...]` | float(s) | — | One or more z-score thresholds (as $-\log_{10}(p)$ values) to simulate; multiple values can follow consecutively. |
| `--nsign <n>` | int | 3 | Number of sign conditions to simulate: `3` = `{neg, abs, pos}` (default); `2` = `{neg, abs}`; `1` = `{abs}` only. |
| `--label <file>` | string | `cortex` | Label file restricting the search space; defaults to `<hemi>.cortex.label` in the subject's `label/` directory. Mutually exclusive with `--mask`. |
| `--no-label` | boolean | false | Disable label masking entirely (use whole surface). |
| `--mask <file>` | string | — | Binary mask volume (MRI) restricting the search space, as an alternative to a label file. Mutually exclusive with `--label`. |
| `--no-save-mask` | boolean | false | Do not save the derived mask to `<outdir>/mask.mgh`; useful when running many parallel jobs to avoid write conflicts. |
| `--surfname <name>` | string | `white` | Name of the surface to load from the subject's `surf/` directory (e.g., `white`, `pial`). |
| `--avgvtxarea` | boolean | false | Report cluster area using the average vertex area (scales vertex count by average vertex area) instead of the actual summed vertex area. |
| `--no-avgvtxarea` | boolean | — | Disable `--avgvtxarea` (default). |
| `--seed <n>` | int | auto | Random seed for noise synthesis; default is derived from the time-of-day. Set explicitly for reproducibility. |
| `--save-iter` | boolean | false | Save CSD output after every iteration; enables fault-tolerant parallel runs and incremental progress. |
| `--no-save-iter` | boolean | — | Disable `--save-iter` (default). |
| `--save <file>` | string | `<outdir>/mri_mcsim.save` | Path of a trigger file; if this file is created externally while the simulation is running, the current output is saved. |
| `--stop <file>` | string | `<outdir>/mri_mcsim.stop` | Path of a stop-trigger file; if created externally, the simulation terminates cleanly after saving. |
| `--done <file>` | string | — | Write elapsed time (in minutes) to this file when the simulation completes. |
| `--log <file>` | string | — | Write a log of each iteration's output to this file. |
| `--sd <dir>` | string | `$SUBJECTS_DIR` | Override the `SUBJECTS_DIR` environment variable. |
| `--save-weight` | boolean | false | Save per-cluster vertex weight in the CSD (experimental). |
| `--no-fix-fsalh` | boolean | false | Disable the built-in hack that removes two stray vertices (102161 and 102162) from the `fsaverage lh.cortex.label` mask. |
| `--debug` | boolean | false | Enable verbose diagnostic output. |
| `--checkopts` | boolean | false | Validate options and exit without running. |
| `--nocheckopts` | boolean | — | Disable option checking (inverse of `--checkopts`; restores default behaviour). |
| `--test` | boolean | false | Internal testing shortcut: sets FWHM to 3–6 mm, thresholds to `{2.0, 3.0}`, 2 sign conditions, subject to `fsaverage5 lh`, 2 repetitions, and seed to 53. Not intended for production use. |
| `--version` | boolean | — | Print version and exit. |
| `--help` | boolean | — | Print help and exit. |

> [!note] Noise tokens filtered from C1 audit
> An audit reported 11 flags as missing from this page. None are real `mri_mcsim` options — all were extracted from help text examples showing usage of other tools or from a `print_usage()` entry that has no corresponding `parse_commandline()` case:
> - `--cache`, `--cache-dir`, `--cache-label` — `mri_glmfit-sim` options mentioned in the help text; not `mri_mcsim` flags.
> - `--csd`, `--csd-out`, `--csdpdf`, `--csdpdf-only` — `mri_surfcluster` options shown in the parallelisation example; not `mri_mcsim` flags.
> - `--fwhm-max` — appears in `print_usage()` only (`--fwhm-max FWHMMax`); there is no matching case in `parse_commandline()`. The value `fwhmmax=30` is a global constant used as a fallback; it cannot be set via the CLI.
> - `--hemi` — not a flag; the hemisphere is passed as the second positional argument to `--surf`.
> - `--outdir`, `--subject` — options for `mri_annotation2label`, which is shown in a preparatory example; not `mri_mcsim` flags.

## Configuration Interactions

- `--label` and `--mask` are mutually exclusive; specifying one clears the other. The default is `--label cortex` (the `<hemi>.cortex.label` file); use `--no-label` to run without any search-space restriction.
- `--fwhm` and `--thresh` each accept multiple consecutive values, allowing a single invocation to sweep multiple simulation conditions.
- `--nsign` controls how many sign conditions (positive, negative, absolute) are simulated. The default of 3 simulates all three.
- `--save-iter` is required for parallel execution: each parallel job writes its own partial CSD, which are merged afterwards with `mri_surfcluster`.
- `--base` must differ between parallel jobs to avoid output file collisions.
- The `--no-fix-fsalh` flag is needed only if you want to include the stray fsaverage lh vertices for testing purposes; in normal use, the default hack is correct.
- FWHM list and threshold list must both be non-empty at runtime; the `--test` option (internal testing shortcut, not intended for production use) sets both to small test values automatically.

## Typical Use Cases

```bash
# Standard whole-hemisphere simulation (10000 iterations, may take hours)
mri_mcsim --o /path/to/mult-comp-cor/newsubject/lh/cortex \
  --base mc-z --save-iter \
  --surf newsubject lh --nreps 10000

# Parallel: two jobs of 5000 each
mri_mcsim --o /path/to/mc/fsaverage/lh/cortex \
  --base mc-z.j001 --save-iter \
  --surf fsaverage lh --nreps 5000

mri_mcsim --o /path/to/mc/fsaverage/lh/cortex \
  --base mc-z.j002 --save-iter \
  --surf fsaverage lh --nreps 5000

# Merge with mri_surfcluster (repeat for each FWHM/sign/thresh combo)
mri_surfcluster \
  --csd /path/to/mc/fsaverage/lh/cortex/fwhm10/abs/th20/mc-z.j001.csd \
  --csd /path/to/mc/fsaverage/lh/cortex/fwhm10/abs/th20/mc-z.j002.csd \
  --csd-out /path/to/mc/fsaverage/lh/cortex/fwhm10/abs/th20/mc-z.csd \
  --csdpdf /path/to/mc/fsaverage/lh/cortex/fwhm10/abs/th20/mc-z.cdf \
  --csdpdf-only
```

## Pipeline Context

Part of the `mri_glmfit-sim` multiple comparison workflow:

1. `mri_glmfit` — fits GLM, produces z/t maps
2. `mri_mcsim` — generates null CSD tables (or uses pre-computed tables in `$FREESURFER_HOME/average/mult-comp-cor/`)
3. `mri_glmfit-sim` — applies CSD to produce corrected p-value maps

Pre-computed tables for fsaverage and fsaverage_sym are distributed with FreeSurfer, so `mri_mcsim` typically only needs to be run for custom subjects or custom search spaces.

## Gotchas and Caveats

> [!gotcha] Runtime can be days for large surfaces
> 10000 iterations on a high-resolution surface with multiple FWHM values can take many hours or days. Always use `--save-iter` and parallel execution.

> [!gotcha] CSD tables are specific to the surface and search space
> A CSD computed for fsaverage whole cortex cannot be applied to a custom subject or a restricted ROI. The surface mesh and label must match exactly between simulation and analysis.

> [!gotcha] Smoothing kernel changes the effective degrees of freedom
> The FWHM used in the simulation must match the FWHM used in the actual analysis (specified in `mri_glmfit`). A mismatch will produce incorrect cluster p-values.

## Related Tools

- [[mri_maps2csd]] — applies the same cluster-extraction step to real data maps
- [[wiki/tools/mri_glmfit|mri_glmfit]] — produces the statistical maps for which CSD correction is applied

## Confidence and Gaps

**Confident (from source):** All flags confirmed from complete `parse_commandline()` read. Note: `--fwhm-max` appears in `print_usage()` but is **not implemented** in `parse_commandline()` and cannot be set via the CLI; it is a global constant (`fwhmmax=30`) used as a fallback when `--fwhm` is not given. Core Monte Carlo simulation algorithm, CSD construction, parallel execution approach, output directory structure, default label (`cortex`), cluster area computation (actual vs. average vertex area), stop/save trigger file mechanism.
