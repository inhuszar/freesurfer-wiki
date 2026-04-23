---
title: "mri_fit_bias"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fit_bias/mri_fit_bias.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[mri_nu_correct.mni]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - bias-field
  - intensity-normalization
  - parametric-model
---

# mri_fit_bias

## Summary

`mri_fit_bias` estimates and corrects spatial intensity bias field in MRI volumes by fitting a parametric model (Discrete Cosine Transform or polynomial) to the intensity non-uniformity. It uses tissue-class segmentation (WM, cortex, subcortical) to separate the true tissue signal from the bias field, then solves a linear system to estimate the bias field parameters. The corrected volume has a more spatially uniform intensity distribution. Author: Douglas Greve.

## Source Information

- **Source language:** C++
- **Source file:** `mri_fit_bias/mri_fit_bias.cpp`
- **Key dependencies:** `mri.h`, `mri2.h`, `matrix.h`, `cma.h`, `region.h`, `cmdargs.h`

## Purpose and Context

MRI scanners produce spatially varying intensity non-uniformity (bias field) due to RF field inhomogeneity. Unlike N3/N4-based correction (`[[mri_nu_correct.mni]]`), `mri_fit_bias` uses an explicit anatomical segmentation as a tissue prior to constrain the bias field estimation. This makes the estimate less susceptible to intensity variations that are due to true tissue differences rather than scanner non-uniformity.

## Inputs

- `--i <file>`: Input source volume to correct (required)
- `--seg <file>`: Segmentation volume used as tissue prior (required)
- `--mask <file>`: Binary mask volume (optional)

## Outputs

- `--o <file>`: Bias-corrected output volume (required)
- `--bias <file>`: Estimated bias field volume

Optional diagnostic outputs:
- `--X <file>`: Design matrix (text format)
- `--y <file>`: Observations vector (text format)
- `--dct <file>`: DCT field volume
- `--beta <file>`: Estimated beta coefficients (text format)
- `--yhat <file>`: Fitted values
- `--res <file>`: Residuals

## Mathematical Foundations

The bias field model assumes:

$$
\log I(x) = \log S(x) + \log B(x) + \epsilon
$$

where $I(x)$ is observed intensity, $S(x)$ is true tissue signal, $B(x)$ is bias field, and $\epsilon$ is noise.

### Discrete Cosine Transform (DCT) basis

The bias field $\log B(x)$ is represented as a linear combination of DCT basis functions $\{\psi_k(x)\}$:

$$
\log B(x) = \sum_k \beta_k \psi_k(x)
$$

The low-pass cutoff for the DCT basis is controlled by `lpfcutoffmm = 23` mm (default). DCT coefficients above this frequency are excluded.

### Linear system

For voxels in the tissue mask, the design matrix $X$ has rows $[\psi_1(x), \ldots, \psi_K(x)]$ and the observation vector $y$ contains log-intensity values. The ordinary least-squares estimate is:

$$
\hat{\beta} = (X^T X)^{-1} X^T y
$$

The bias field is then $B(x) = \exp(\sum_k \hat{\beta}_k \psi_k(x))$, and the corrected volume is $I(x) / B(x)$.

### Tissue class priors

WM segments: labels `{2, 41, 251, 252, 253, 254, 255}` (from `wmsegs[]` in source)
Cortical GM segments: labels `{3, 42}`
Excluded segments: `{30, 62, 77, 85, 16, 7, 8, 46, 47, 12, 51, 13, 52, 11, 50, 17, 53, 18, 54, 10, 49, 28, 60, 26, 58}`

## Configuration Options

All flags use `--` prefix and are case-insensitive (parsed with `strcasecmp`).

### Required inputs/outputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i <file>` | path | required | Input volume to bias-correct |
| `--seg <file>` | path | required | Segmentation volume providing WM/cortex tissue class labels |
| `--o <file>` | path | required | Output bias-corrected volume |

### Optional inputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--mask <file>` | path | none | Binary mask; voxels outside the mask are zeroed in the output |

### Model parameters

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--cutoff <mm>` | float | 23.0 | Low-pass spatial frequency cutoff for the DCT basis (mm); DCT components with period shorter than this are excluded |
| `--erode <n>` | int | 1 | Number of 3-D erosion steps applied to the segmentation mask before fitting (reduces boundary effects) |
| `--thresh <t>` | float | 0.0 | Exclude voxels with intensity ≤ `t` from the fitting |

### Performance

| Flag | Alias | Arguments | Default | Description |
|------|-------|-----------|---------|-------------|
| `--threads <n>` | `--nthreads` | int | 0 | Number of OpenMP threads; 0 uses the system default |
| `--sd <dir>` / `-sdir` | `-SDIR` | path | `$SUBJECTS_DIR` | Override the FreeSurfer subjects directory |

### Diagnostic outputs

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--bias <file>` | path | none | Write the estimated bias field volume |
| `--dct <file>` | path | none | Write the DCT basis field volume |
| `--X <file>` | path | none | Write the design matrix (text) |
| `--y <file>` | path | none | Write the observations vector (text) |
| `--beta <file>` | path | none | Write the estimated beta coefficients (text) |
| `--yhat <file>` | path | none | Write the fitted values |
| `--res <file>` | path | none | Write the residuals |

### Behaviour control

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--debug` | (none) | off | Enable debug output |
| `--checkopts` | (none) | off | Validate all options and exit without running |
| `--nocheckopts` | (none) | off | Disable option validation check |
| `--version` | (none) | — | Print version and exit |
| `--help` | (none) | — | Print usage and exit |

## Configuration Interactions

- `--seg` is required (`check_options()` will error if absent). The tool will not run without a segmentation.
- `--erode` shrinks the tissue mask inward before fitting; this reduces the influence of partial-volume voxels at segment boundaries.
- `--cutoff` controls the spatial frequency cutoff of the DCT bias model; smaller values (shorter cutoff period) allow more rapid spatial variation to be modelled, while very large values produce a near-constant bias estimate.
- `--thresh` excludes voxels with intensity ≤ the threshold from fitting; useful for suppressing background noise contributions.
- `--threads > 0` enables OpenMP parallelism; requires an OpenMP-enabled build.
- `--mask` zeros the output volume outside the mask but does not necessarily restrict the fitting to masked voxels; `--thresh` is the primary mechanism for excluding voxels from the regression.

## Typical Use Cases

```bash
# Basic bias correction using aseg segmentation
mri_fit_bias --i orig.mgz --seg aseg.mgz --o orig_bc.mgz --bias bias_field.mgz

# Tighter spatial model (higher cutoff)
mri_fit_bias --i orig.mgz --seg aseg.mgz --o orig_bc.mgz --cutoff 40

# With mask and more erosion
mri_fit_bias --i orig.mgz --seg aseg.mgz --mask brainmask.mgz \
  --erode 3 --o orig_bc.mgz
```

## Pipeline Context

Not a standard `[[recon-all]]` step. Used in research pipelines for bias field correction as an alternative to `[[mri_nu_correct.mni]]`, particularly when a tissue segmentation is available.

## Gotchas and Caveats

> [!gotcha] Requires segmentation as tissue prior
> Unlike N3/N4, this tool needs an aseg or similar segmentation. Running it without a segmentation provides less constrained estimation.

> [!gotcha] DCT basis excludes subcortical structures
> The `exsegs[]` array excludes many subcortical structures (thalamus, putamen, hippocampus, etc.) from the fitting. This is intentional as these structures have different intensities.

> [!gotcha] Log-domain fitting
> The bias field is estimated in log-intensity space. The output bias field is in the same log space; the correction divides in linear space.

## Related Tools

- `[[mri_normalize]]` — intensity normalization (simpler approach)
- `[[mri_nu_correct.mni]]` — N3-based bias correction (not segmentation-guided)

## Confidence and Gaps

**High confidence:** Full `parse_commandline()` function read; all flags, defaults, and argument types confirmed from source. Correct flag names are --i, --o, --cutoff, --erode (previous wiki had wrong names --src, --out, --lpcutoff, --nerode).

> [!gotcha] Flag name corrections vs. earlier documentation
> The wiki previously used `--src`, `--out`, `--lpcutoff`, and `--nerode`. The actual flag names in the source are `--i`, `--o`, `--cutoff`, and `--erode`.
