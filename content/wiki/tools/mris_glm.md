---
title: "mris_glm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_glm/mris_glm.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_fwhm]]"
  - "[[mris_preproc]]"
  - "[[surface-format]]"
  - "[[fsgd-format]]"
status: draft
confidence: low
last_agent_update: 2026-04-21
gaps:
  - "Tool is in the attic/ directory — may be deprecated; unclear if it is installed in 8.2.0 binary"
  - "Relationship to mri_glmfit (preferred alternative) is undocumented"
  - "FSGD format interaction with design matrix construction not fully traced"
tags:
  - surface
  - glm
  - statistics
  - deprecated
---

# mris_glm

## Summary

`mris_glm` performs vertex-wise General Linear Model (GLM) inference on cortical surface data. It accepts a design matrix (or [[fsgd-format|FreeSurfer Group Descriptor file]]), a set of surface overlays sampled to a common space, and a contrast vector, and computes vertex-wise beta maps, contrast effect size, residuals, and significance statistics. It is an older tool; the preferred current approach for surface-based GLMs in FreeSurfer is `mri_glmfit`.

> [!gotcha] Attic tool — potentially deprecated
> `mris_glm` resides in the `attic/` directory of the FreeSurfer 8.2.0 source tree. This indicates it may no longer be actively maintained or installed. Users performing vertex-wise GLMs should use `mri_glmfit` instead, which provides substantially more functionality and is actively supported.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_glm/mris_glm.cpp`
- **Original author:** Douglas N. Greve
- **Status:** Attic (potentially deprecated)

## Purpose and Context

`mris_glm` performs the standard vertex-wise mass-univariate GLM:

$$
\mathbf{Y} = \mathbf{X} \boldsymbol{\beta} + \boldsymbol{\epsilon}
$$

where $\mathbf{Y}$ is the (subjects × vertices) data matrix, $\mathbf{X}$ is the design matrix, $\boldsymbol{\beta}$ are the regression coefficients, and $\boldsymbol{\epsilon}$ are the residuals. After estimation, a contrast $\mathbf{c}^T \boldsymbol{\beta}$ is tested for significance.

It exists alongside surface-based tools like `mri_glmfit` which supersede it for most purposes.

## Inputs

| Input | Description |
|-------|-------------|
| Design matrix | ASCII matrix file (`--design`) or [[fsgd-format\|FSGD]] file (`--fsgd`) |
| Surface overlays | List of subject overlay files via `--i`, a file of paths via `--ifile`, or auto-resolved surface measure via `--surfmeas` |
| Contrast vector | ASCII matrix file (`--contrast`) or inline values (`--gcv`) |
| Sphere registration | `sphere.reg` (used to resample to common space via `--trgsubj`) |

## Outputs

| Output | Description |
|--------|-------------|
| Beta map | Regression coefficients per vertex (`--beta betafile`) |
| CES map | Contrast effect size (`--ces cesfile`) |
| Residuals | Model residuals (`--eres eresfile`) |
| Residual variance | Per-vertex residual variance (`--var`) |
| Fitted values | Predicted values (`--yhat`) |
| Output data | All data in a combined file (`--y yfile`) |
| T-ratio | Vertex-wise t- or F-statistic (`--t`) |
| Significance | -log10(p) signed by t direction (`--sigt`) |

## Mathematical Foundations

The OLS estimator:
$$
\hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{Y}
$$

Contrast effect size:
$$
\text{CES} = \mathbf{c}^T \hat{\boldsymbol{\beta}}
$$

F-statistic:
$$
F = \frac{\text{CES}^2}{\text{Var}(\text{CES})}
$$

where $\text{Var}(\text{CES}) = \hat{\sigma}^2 \mathbf{c}^T (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{c}$.

## Configuration Options

### Design Matrix and Input Data

| Flag                    | Arguments             | Default                    | Description                                                                                                                                                                        |
| ----------------------- | --------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--design fname`        | path                  | —                          | ASCII design matrix file. First column is subject ID; remaining columns are the design matrix.                                                                                     |
| `--fsgd fname [gd2mtx]` | path, optional string | `dods` (if gd2mtx omitted) | [[fsgd-format\|FreeSurfer Group Descriptor file]]. Optional second argument is the matrix construction method: `dods` (different offset, different slope) or `doss` (different offset, same slope). |
| `--hemi hemi`           | `lh` or `rh`          | —                          | Hemisphere to process. Required.                                                                                                                                                   |
| `--trgsubj subject`     | string                | —                          | Target subject for resampling (e.g., `fsaverage`, `ico`). Required. Also accepted as `--ts`.                                                                                       |
| `--sd subjectsdir`      | path                  | `$SUBJECTS_DIR`            | Subjects directory.                                                                                                                                                                |
| `--icoorder order`      | integer               | `7` (163842 vertices)      | Icosahedron order when `--trgsubj ico`.                                                                                                                                            |
| `--surfmeas name`       | string                | —                          | Surface measure name resolved under each subject's `surf/` directory (e.g., `thickness`). Sets input format to `curv` automatically.                                               |
| `--i input1 input2 ...` | paths                 | —                          | Explicit list of input overlay files, one per subject row in the design matrix.                                                                                                    |
| `--ifile fname`         | path                  | —                          | File listing input paths, one per line (alternative to `--i`).                                                                                                                     |
| `--ifmt fmt`            | string                | auto-detected              | Format of input files: `curv`, `paint`/`w`/`wfile`, `bfloat`, `bshort`, `analyze`, `spm`, etc. Set to `curv` automatically by `--surfmeas`.                                        |
| `--frame M`             | integer               | `0`                        | Use 0-based frame M from multi-frame inputs.                                                                                                                                       |
| `--nsmooth N`           | integer               | `0`                        | Number of nearest-neighbour smoothing iterations applied per subject before resampling.                                                                                            |
| `--abs`                 | —                     | off                        | Apply absolute value to input data after smoothing.                                                                                                                                |

### Design Matrix Output

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--xmat matfile` | path | — | Save design matrix to file. |
| `--xmatfmt fmt` | string | `matlab4` | Format for `--xmat`: `matlab4` or `ascii`. |
| `--xmatonly` | — | off | Build and save design matrix only, then exit. Requires `--fsgd` and `--xmat`. |

### Estimation Outputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--y name [fmt]` | path, optional fmt | — | Save assembled input data after resampling and smoothing. |
| `--beta name [fmt]` | path, optional fmt | — | Save regression coefficient map. |
| `--var name [fmt]` | path, optional fmt | — | Save residual error variance map. |
| `--eres name [fmt]` | path, optional fmt | — | Save residual error map. |
| `--yhat name [fmt]` | path, optional fmt | — | Save signal estimate (fitted values). |

### Precomputed Estimation Inputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--beta_in name [fmt]` | path, optional fmt | — | Load previously computed beta map (use with `--var_in` to skip re-estimation). |
| `--var_in name [fmt]` | path, optional fmt | — | Load previously computed residual variance map. Must be paired with `--beta_in`. |

### Contrast and Inference

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--contrast fname` | path | — | ASCII contrast matrix file. |
| `--gcv c1 ... cN` | floats | — | Contrast vector specified directly on the command line. |
| `--ces name [fmt]` | path, optional fmt | — | Save contrast effect size map. |
| `--t name [fmt]` | path, optional fmt | — | Save t-ratio (or F-statistic for multi-row contrasts). |
| `--sigt name [fmt]` | path, optional fmt | — | Save significance as -log10(p) signed by t direction. Not corrected for multiple comparisons. |
| `--tmax fname` | path | — | Append max-t and min-p to text file (for simulations). |

### Synthesis and Simulation

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--gaussian mean std` | floats | — | Synthesize input data as Gaussian noise. |
| `--cdf cdffile` | path | — | Synthesize input data by sampling from a CDF text file. |
| `--seed seed` | integer | `-1` (auto from time) | RNG seed for synthesis. |
| `--mcsim nsim fname nithr ithrlo ithrhi ithrsign nsthr sthrlo sthrhi` | see description | — | Monte Carlo simulation for cluster inference. Takes 9 arguments. |
| `--permute` | — | off | Randomly permute rows of the design matrix for permutation testing. |

### Miscellaneous

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--force` | — | off | Force processing even if design matrix condition number exceeds 100000. |
| `--allowsubjrep` | — | off | Allow repeated subject names in the [[fsgd-format\|FSGD]] file. |
| `--parseonly` | — | off | Parse command line and check options, then exit without processing. |
| `--debug` | — | off | Enable debug output. |
| `--help` | — | — | Print help text and exit. |
| `--version` | — | — | Print version and exit. |

> [!note] Output format specifiers
> Output format specifiers (`[fmt]`) accept: `bfloat`, `bshort`, `spm`, `analyze`, `analyze4d`, `COR`, `paint`, `w`, `wfile`. Surface formats (`paint`, `w`, `wfile`) cannot be used for `--beta`, `--y`, `--yhat`, or `--eres`.

## Configuration Interactions

- `--fsgd` and `--design` are alternative ways to specify the design matrix. `--fsgd` triggers automatic design matrix construction from the [[fsgd-format|group descriptor]]; `--design` reads a pre-built ASCII matrix directly.
- `--xmatonly` requires `--fsgd` and `--xmat`; it builds and saves the design matrix then exits, skipping the GLM computation entirely.
- `--nsmooth` applies nearest-neighbour surface smoothing to each subject's input before resampling to the target subject.
- `--frame` selects a single frame when the input overlays have multiple frames.
- `--beta_in` and `--var_in` must be used together. When both are specified, the estimation step is skipped and only contrast/inference is performed.
- `--trgsubj` is required in all cases. Use `ico` for icosahedron target (then `--icoorder` controls resolution); otherwise specify a subject in `$SUBJECTS_DIR`.
- `--ts` is an alias for `--trgsubj`.

## Typical Use Cases

> [!gap] Usage examples
> Concrete usage examples for `mris_glm` are not well documented, and the tool may no longer function in FS 8.2.0. Users should use `mri_glmfit` for new analyses.

**Preferred modern alternative:**
```bash
mri_glmfit --y lh.thickness.mgh --fsgd subjects.fsgd dods \
    --C contrast.mtx --surf fsaverage lh \
    --cortex --glmdir glmdir/
```

## Pipeline Context

`mris_glm` is not part of `recon-all`. It is a post-processing analysis tool for group-level inference on surface data.

Typical workflow (historical):
1. [[recon-all]] produces per-subject surface metrics
2. `mris_preproc` resamples metrics to fsaverage
3. `mris_glm` (or preferably `mri_glmfit`) performs vertex-wise inference

## Gotchas and Caveats

> [!gotcha] Deprecated — use mri_glmfit
> This tool is in the `attic/` directory and may not be compiled or installed in FreeSurfer 8.2.0. The `mri_glmfit` command provides a more feature-complete and actively maintained replacement.

> [!gotcha] Subject list size limit
> The code allocates fixed arrays: `inputlist[1000]` and `subjectlist[1000]`, limiting analyses to 1000 subjects/inputs. Not typically a concern in practice.

## Related Tools

- [[mris_fwhm]] — smoothness estimation and smoothing for surface data
- [[mris_preproc]] — group-level surface data preparation
- [[fsgd-format]] — group descriptor file format specification

## Confidence and Gaps

**Flag names: high confidence** — all flags verified from `parse_commandline()` in `attic/mris_glm/mris_glm.cpp`. Previous versions of this page used incorrect names (--desmtx, --conmtx, --eresvar, --x, --h, --input, --inputfmt, --subjects, --surfmeasure, --surfreg, --yid, --gd2mtx); those have been corrected.

**Confirmed non-existent flags (verified 2026-04-21):**
- `--fsgdf`: not a valid flag; the correct flag is `--fsgd`
- `--matonly`: not a valid flag; the correct flag is `--xmatonly`
- `--trgsubject`: not a valid flag; the correct flag is `--trgsubj` (with alias `--ts`)

**Installed binary: low confidence** — see gap below.

> [!gap] Attic status
> It is unknown whether `mris_glm` is compiled and installed in FreeSurfer 8.2.0. The `attic/` directory in the source tree typically contains deprecated or experimental tools. Verification requires checking the installed binary.
