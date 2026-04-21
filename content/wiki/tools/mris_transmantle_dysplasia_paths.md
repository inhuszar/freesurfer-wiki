---
title: "mris_transmantle_dysplasia_paths"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_transmantle_dysplasia_paths/mris_transmantle_dysplasia_paths.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_rf_label]]"
  - "[[mris_rf_train]]"
  - "[[mri_transform]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The complete MCMC spline path estimation algorithm details need deeper source reading."
tags:
  - surface
  - dysplasia
  - MCMC
  - spline
  - tractography
---

# mris_transmantle_dysplasia_paths

## Summary

`mris_transmantle_dysplasia_paths` estimates the probability that transmantle cortical pathways (radial paths from the cortical surface to the lateral ventricles) correspond to focal cortical dysplasia (FCD) type II lesions with transmantle signs. It uses a Markov Chain Monte Carlo (MCMC) algorithm to fit Catmull-Rom splines connecting each cortical vertex to the lateral ventricles along paths consistent with transmantle dysplasia anatomy, and produces a posterior probability map of transmantle dysplasia at each cortical location.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_transmantle_dysplasia_paths/mris_transmantle_dysplasia_paths.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_transmantle_dysplasia_paths`
- **Original Author:** Bruce Fischl

## Purpose and Context

Transmantle dysplasia (type IIb FCD) is a form of focal cortical dysplasia characterized by a signal abnormality that extends from the cortex radially inward to the lateral ventricle in a "transmantle" sign visible on FLAIR MRI. `mris_transmantle_dysplasia_paths` automates detection of this sign by:

1. For each cortical vertex, computing the shortest path to the ventricle (initialization).
2. Using MCMC to sample the posterior distribution over Catmull-Rom splines connecting the vertex to the ventricle.
3. Evaluating spline quality based on MRI intensity along the path (high FLAIR signal in white matter), distance from the ventricle gradient, WM distance, and path length penalties.
4. Aggregating posterior probability across all sampled splines to produce a per-vertex transmantle probability map.

## Inputs

### Required Inputs

Positional arguments (exact order from `usage_exit()` and `main()`):

1. `<surface>` — cortical surface file (FreeSurfer binary, e.g., `lh.white`).
2. `<intensity_volume>` — MRI volume for path intensity scoring (e.g., FLAIR or T1).
3. `<aseg>` — anatomical segmentation volume for ventricle identification and distance computation.
4. `<transform>` — registration transform from volume space to surface space; pass the literal string `identity.nofile` to use an identity transform.
5. `<output>` — output MGZ volume for path log probabilities.

- **Surface** is passed directly as `argv[1]` (not looked up via SUBJECTS_DIR).
- **Transform** accepts any FS-readable transform format or the special string `identity.nofile`.

### Input Assumptions

> [!assumption] FLAIR or high-contrast WM imaging preferred
> The intensity scoring penalises paths that do not traverse high-intensity white matter tissue. FLAIR MRI where transmantle signs appear as hyperintensities is the intended input type.

## Outputs

### Files Created

- **Posterior probability volume** — an MGZ volume (indexed by vertex position or voxel) containing the posterior probability of transmantle dysplasia at each location.
- Optionally, intermediate spline files may be written.

## Mathematical Foundations

**Spline parameterisation:** Each path is a Catmull-Rom spline with `spline_control_points` (default 5) control points, initialised along the shortest path from the cortical vertex to the ventricle.

**MCMC sampling:** The MCMC algorithm (Metropolis-Hastings) proposes perturbations to spline control points drawn from a Gaussian with standard deviation `proposal_sigma` (default 5.0 mm). Proposals are accepted with probability:
$$\alpha = \min\left(1, \frac{P(s') \cdot \mathcal{L}(s')}{P(s) \cdot \mathcal{L}(s)}\right)$$

**Energy function:** The spline energy combines several terms weighted by flags in `energy_flags`:
- `SPLINE_WM_DIST` — distance from white matter (penalise paths outside WM).
- `SPLINE_LENGTH` — path length penalty (penalise overly long paths).
- `SPLINE_ABOVE` / `SPLINE_BELOW` — penalties for path going above or below the cortex.
- `SPLINE_SIGNED` — signed distance-based penalty.

Key parameters:
- `spline_length_penalty` = 5 (default)
- `spline_nonwm_penalty` = 200 (default)
- `spline_interior_penalty` = 1000 (default)
- `max_wm_dist` = -2.5 mm (path must be within 2.5 mm of WM boundary)
- `mcmc_samples` = 10000 (default MCMC iterations)

## Configuration Options

**Usage:** `mris_transmantle_dysplasia_paths [options] <surface> <intensity_volume> <aseg> <transform> <output>`

Flags are parsed by a custom `get_option()` function using `stricmp` (case-insensitive matching after stripping the leading `-`).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--DEBUG_VOXEL` | `x y z` | — | Enable debug output for voxel at coordinates `(x, y, z)` (three integer arguments; sets `Gx`, `Gy`, `Gz`). |
| `--RAND` | (flag) | off | Randomize input intensity data; used for null distribution estimation. |
| `-R` | (flag) | off | Read previously computed splines from disk instead of running MCMC (`read_flag = 1`). |
| `-L` | `string` | — | Read a cortex label file and rip (freeze) vertices outside the label, restricting MCMC to the labelled region. |
| `-P` | `int` | `10000` | Number of MCMC sampling iterations (`mcmc_samples`). |
| `-V` | `int` | — | Diagnostic vertex number (`Gdiag_no`); enables per-vertex debug output. |
| `-N` | `float` | — | Noise level used to deflect the ventricle distance transform negative gradient vectors (affects path randomness). |

> [!gotcha] Many flags in the previous version of this page did not exist
> Flags such as `--spline_cp`, `--spline_len_pen`, `--spline_nonwm_pen`, `--spline_int_pen`, `--max_wm_dist`, `--proposal_sigma`, `--accept_sigma`, `--mcmc_samples`, `--label`, `--read`, `--randomize` were not present in `get_option()`. The MCMC sample count is set via `-P`; all other parameters (spline control points, penalties, sigma) are hardcoded constants in the source.

### Configuration Interactions

- `-P` (MCMC samples) is the primary performance/accuracy tradeoff parameter.
- `-L` (label) restricts computation to a subset of cortical vertices, dramatically reducing runtime.
- `-R` skips MCMC and reads previously saved splines; use after a prior run to recompute posteriors with different weighting without re-running the full MCMC.
- `--RAND` randomizes intensities for statistical null hypothesis testing.

## Typical Use Cases

### Use Case 1: Compute transmantle dysplasia probability map

```bash
mris_transmantle_dysplasia_paths \
  -P 20000 \
  $SUBJECTS_DIR/subject/surf/lh.white \
  $SUBJECTS_DIR/subject/mri/FLAIR.mgz \
  $SUBJECTS_DIR/subject/mri/aseg.mgz \
  $SUBJECTS_DIR/subject/mri/transforms/talairach.lta \
  $SUBJECTS_DIR/subject/mri/transmantle_prob.mgz
```

### Use Case 2: Restrict to a label (faster)

```bash
mris_transmantle_dysplasia_paths \
  -L $SUBJECTS_DIR/subject/label/lh.cortex.label \
  -P 10000 \
  $SUBJECTS_DIR/subject/surf/lh.white \
  $SUBJECTS_DIR/subject/mri/FLAIR.mgz \
  $SUBJECTS_DIR/subject/mri/aseg.mgz \
  identity.nofile \
  $SUBJECTS_DIR/subject/mri/transmantle_prob.mgz
```

## Pipeline Context

Not part of `recon-all`. This is a specialized research/clinical tool for FCD type IIb detection. Typical workflow:

1. Acquire FLAIR MRI and run standard `recon-all`.
2. Run `mris_transmantle_dysplasia_paths` to generate probability map.
3. Threshold probability map to identify candidate transmantle lesions.
4. Optionally combine with [[mris_rf_label]] FCD probability maps.

## Gotchas and Caveats

> [!gotcha] Computationally expensive
> MCMC with 10,000 samples per vertex is computationally intensive for a full hemisphere surface (~160,000 vertices). Consider restricting to an ROI with `--label`.

> [!gotcha] Specialized for transmantle FCD type IIb
> This tool is highly specific to the transmantle dysplasia phenotype. It is not a general cortical dysplasia detector. For FCD type I or IIa without transmantle signs, [[mris_rf_label]] is more appropriate.

## Related Tools

- [[mris_rf_label]] — surface-based random forest FCD detection (different algorithm)
- [[mris_rf_train]] — trains the random forest used by mris_rf_label

## Confidence and Gaps

Confidence is **medium-high**. The full command-line interface (all flags and positional argument order) is confirmed from `get_option()` and `usage_exit()`. Many flags previously listed on this page did not exist and have been removed. The MCMC algorithm details require deeper source reading.

> [!gap] MCMC spline algorithm details
> The internal constants (spline control point count, energy penalties, proposal sigma) are hardcoded and visible in the source but their interaction in the full MCMC loop was not traced in detail.
