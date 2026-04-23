---
title: "mri_dualperm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_dualperm/mri_dualperm.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_glmfit]]"
  - "[[mri_mvglmfit]]"
  - "[[mri_fwhm]]"
  - "[[fsgd-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "DualPerm statistical theory not fully described"
tags:
  - statistics
  - permutation-test
  - glm
---

# mri_dualperm

## Summary

`mri_dualperm` performs dual permutation tests and related spatial correlation analyses on two MRI dataset "modes". It extends the standard permutation testing framework to handle simultaneous testing of two measurement modes (e.g., two imaging contrasts or two hemispheres), computing both within-mode permutation p-values and cross-mode statistics. Written by Douglas N. Greve.

## Source Information

- **Language:** C++
- **Source file:** `mri_dualperm/mri_dualperm.cpp`
- **Original author:** Douglas N. Greve
- **Copyright year:** 2025 (most recent in the codebase)

## Purpose and Context

Standard permutation testing is used in neuroimaging to obtain non-parametric p-values that account for the non-normality of spatial correlation statistics. `mri_dualperm` extends this to a dual-mode setting, where two separate brain maps or hemispheres are analysed jointly. The tool models each "mode" as a GLM (general linear model) and performs sign-flipping or shuffling permutations on one or both modes, computing cross-mode correlation (perm12) as well as within-mode statistics (perm1, perm2).

Permutation types supported: sign-flip (1), shuffle (2), sign-flip + shuffle (3), and pstack (pre-computed permutation sequences).

## Inputs

For each mode (two modes required):
- A data volume or surface file (`--mode`)
- An [[fsgd-format|FSGDF]] design file or OLS single group mean specification
- Optionally: a mask, a permutation stack, a frame list, or a subset specification

## Outputs

Written to `--o`:
- Per-mode and cross-mode permutation p-value maps
- GLM fit outputs (betas, residuals, t/F maps)
- Permutation stack files (if requested)

## Mathematical Foundations

For each mode $m \in \{1, 2\}$, a GLM is fitted:

$$
\mathbf{y}_m = X_m \boldsymbol{\beta}_m + \boldsymbol{\varepsilon}_m
$$

The cross-mode statistic is based on the spatial correlation between the two residualised or test-statistic maps. Under the null hypothesis, the two modes are independent; permutation destroys this independence.

Permutation types:
- **Sign-flip:** multiply observations by random $\pm 1$ (valid under exchangeability).
- **Shuffle:** randomly permute observation order (valid under exchangeability of rows).
- **Sign-flip + shuffle:** combines both.

The `perm12` statistic tests whether the two modes are spatially correlated beyond what is expected by chance.

> [!math] Dual permutation p-value
> Let $T$ be the observed cross-mode statistic. Under $N$ permutations:
> $$
> p = \frac{\#\{T_i > T\}}{N}
> $$
> where $T_i$ is the cross-mode statistic under the $i$-th permutation.

> [!gap] Complete statistical model
> The exact form of the cross-mode statistic $T$ (e.g., Pearson correlation, inner product, or other) was not identified from the class definition alone.

## Configuration Options

All flags use double-dash (`--`) prefix. Flags that operate on a specific mode use a `1` or `2` suffix (e.g., `--mode1`, `--mode2`). `--mapN` is an alias for `--modeN`. Flag list fully verified from `parse_commandline()` in source.

| Flag                                       | Argument    | Default     | Description                                                                               |
| ------------------------------------------ | ----------- | ----------- | ----------------------------------------------------------------------------------------- |
| `--o <dir>`                                | path        | required    | Output directory.                                                                         |
| `--mode1 <file>`<br>`--map1 <file>`         | path        | required    | Input data stack for mode 1.                                                              |
| `--mode2 <file>`<br>`--map2 <file>`         | path        | required    | Input data stack for mode 2 (not required when `--mode1-only`/`--map1-only`).             |
| `--mode1-only`<br>`--map1-only`             | (none)      | off         | Analyze only mode 1 (for creating atlases and surrogates).                                |
| `--mask1 <file>`                           | path        | —           | Brain mask for mode 1.                                                                    |
| `--mask2 <file>`                           | path        | —           | Brain mask for mode 2.                                                                    |
| `--fsgd1 <file>`                           | path        | —           | [[fsgd-format\|FSGD]] design file for mode 1.                                                              |
| `--fsgd2 <file>`                           | path        | —           | [[fsgd-format\|FSGD]] design file for mode 2.                                                              |
| `--osgm1`                                  | (none)      | off         | Analyze mode 1 as one-sample group mean (instead of `--fsgd`).                            |
| `--osgm2`                                  | (none)      | off         | Analyze mode 2 as one-sample group mean.                                                  |
| `--tsgd1`                                  | (none)      | off         | Analyze mode 1 as two-sample group difference.                                            |
| `--tsgd2`                                  | (none)      | off         | Analyze mode 2 as two-sample group difference.                                            |
| `--ptype1 <int>`                           | int         | `0`         | Permutation type for mode 1: 0=none, 1=sign-flip, 2=shuffle, 3=sign+shuffle.              |
| `--ptype2 <int>`                           | int         | `0`         | Permutation type for mode 2.                                                              |
| `--no-residualize1`                        | (none)      | off         | Do not residualize mode 1 before permuting (not recommended).                             |
| `--no-residualize2`                        | (none)      | off         | Do not residualize mode 2 before permuting.                                               |
| `--readd1`                                 | (none)      | off         | Use residuals read from file for mode 1 (sets residualize=2).                             |
| `--readd2`                                 | (none)      | off         | Use residuals read from file for mode 2.                                                  |
| `--surrogates1 <file>`                     | path        | —           | Input surrogate stack for mode 1 (output of a previous `--mode1-only` run).               |
| `--surrogates2 <file>`                     | path        | —           | Input surrogate stack for mode 2.                                                         |
| `--save-surrogates1`                       | (none)      | off         | Save all surrogates for mode 1 in a single stack file.                                    |
| `--save-surrogates2`                       | (none)      | off         | Save all surrogates for mode 2.                                                           |
| `--list1 <file>`                           | path        | —           | Frame list file for mode 1 (selects a subset of frames from the data stack).              |
| `--list2 <file>`                           | path        | —           | Frame list file for mode 2.                                                               |
| `--subset1 <n> <type>`                     | int, string | —           | Use a random subset of `n` observations for mode 1; `type` is `first`, `last`, or `rand`. |
| `--subset2 <n> <type>`                     | int, string | —           | Use a random subset of `n` observations for mode 2.                                       |
| `--nperm <n>`                              | int         | required    | Number of permutations to run.                                                            |
| `--seed <s>`                               | ulong       | time-of-day | Random seed; if not specified, time-of-day is used.                                       |
| `--threads <n>`                            | int         | 1           | Number of OpenMP threads (only effective with OpenMP build).                              |
| `--pX-save`                                | (none)      | off         | Save permuted design matrices.                                                            |
| `--save-input`<br>`--input-save`            | (none)      | off         | Save the input data to the output directory.                                              |
| `--merge <outdir> <srcdir1> <srcdir2> ...` | paths       | —           | Merge results from multiple `mri_dualperm` output directories. Exits after merge.         |
| `--debug`                                  | (none)      | off         | Enable verbose diagnostic output.                                                         |
| `--checkopts`                              | (none)      | off         | Check options only; do not run any computation.                                           |
| `--nocheckopts`                            | (none)      | —           | Disable option checking (default).                                                        |
| `--version`                                | (none)      | —           | Print version string and exit.                                                            |
| `--help`                                   | (none)      | —           | Print usage and exit.                                                                     |

## Configuration Interactions

- `--mode1` and `--mode2` must each be specified once. `--mode1-only` removes the requirement for `--mode2`.
- For each mode, exactly one of `--fsgdN`, `--osgmN`, `--tsgdN`, or `--surrogatesN` must be specified; these are mutually exclusive design specifications.
- `--surrogatesN` makes `--modeN`, `--maskN`, and `--fsgdN` forbidden for that mode; the surrogates file replaces those inputs entirely.
- `--seed` controls random number generation for permutation order; if omitted, time-of-day is used (non-reproducible).
- `--no-residualizeN` disables residualisation for mode N before permuting; this changes what the cross-mode statistic measures and is generally not recommended.
- `--ptype1`/`--ptype2` independently control the permutation type for each mode; the two modes can use different permutation strategies.
- The `--merge` flag exits immediately after merging directories and does not run a permutation test.

## Typical Use Cases

```bash
# Dual permutation test between two imaging modalities
mri_dualperm \
  --mode1 mode1_data.mgh \
  --fsgd1 mode1_design.fsgd \
  --mode2 mode2_data.mgh \
  --fsgd2 mode2_design.fsgd \
  --nperm 5000 \
  --o dual_perm_results \
  --threads 8
```

## Pipeline Context

Not part of `recon-all`. A research-level statistical tool for group studies. Typically used after `mri_glmfit` or `mri_mvglmfit` to obtain permutation-based p-values.

## Gotchas and Caveats

- Two modes must be specified; the tool requires paired observations across modes.
- Permutation testing assumes exchangeability; this may not hold for longitudinal or paired designs without explicit blocking.
- Memory requirements can be substantial for large permutation stacks.

## Related Tools

- [[mri_glmfit]] — standard GLM fitting without dual permutation
- [[mri_mvglmfit]] — multivariate GLM
- [[mri_fwhm]] — spatial smoothness estimation for cluster correction

## Confidence and Gaps

**High confidence:** Complete flag list verified from `parse_commandline()` in source (re-confirmed 2026-04-21). All 41 distinct flag strings from the parser are documented; paired `1`/`2` variants are consolidated into single table rows. No flags are genuinely absent. Class structure and permutation type values (0/1/2/3) confirmed.

> [!note] Audit noise: base forms and template placeholders
> An automated audit flags 20 items as missing: base forms (`--fsgd`, `--osgm`, `--tsgd`, `--list`, `--mode`, `--pstack`, `--subset`, `--x`, `--gdiag`) from error messages (e.g., `"must spec one of --osgm --tsgd or --fsgd"`), and template forms with an `n` suffix (`--fsgdn`, `--osgmn`, `--maskn`, etc.) from help-text lines like `"--osgmN : analyze modality N as a OSGM"` where the uppercase `N` is lowercased to `n` during scanning. None of these are valid parser flags; the actual parser uses numeric suffixes `1`/`2`.

**Medium confidence:** Exact form of the cross-mode statistic `T` (e.g., Pearson correlation, inner product) was not identified from the code.
