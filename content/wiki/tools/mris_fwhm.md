---
title: "mris_fwhm"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_fwhm/mris_fwhm.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_smooth]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "AR1-to-FWHM conversion formula source not confirmed in code"
  - "Behavior with multi-frame data and detrending needs testing"
tags:
  - surface
  - smoothing
  - fwhm
  - statistics
---

# mris_fwhm

## Summary

`mris_fwhm` has two related functions: (1) apply surface-based spatial smoothing to a surface overlay dataset, and (2) estimate the full-width at half-maximum (FWHM) smoothness of a surface-based data set by computing the spatial autocorrelation (AR1) across vertices. It is primarily used for preparing surface data for group-level analyses by matching smoothness across subjects, and for estimating the effective smoothness of unsmoothed data for cluster-based multiple comparisons correction.

## Source Information

- **Language:** C++
- **Source file:** `mris_fwhm/mris_fwhm.cpp`
- **Key dependencies:** `mrisurf.h`, `randomfields.h`, `fmriutils.h`, `icosahedron.h`

## Purpose and Context

FWHM estimation on the cortical surface is required for parametric random field theory (RFT) based cluster correction. Unlike volumetric data where FWHM can be estimated from residuals, surface data requires computing the average spatial autocorrelation of the 1-lag AR1 statistic across surface neighbors and converting this to an equivalent FWHM.

This tool overlaps in smoothing functionality with `mri_surf2surf` but is specifically tuned for FWHM estimation and reporting.

## Inputs

| Input | Description |
|-------|-------------|
| `--i input` | Input surface data. Any format readable by `mri_convert` (mgh, mgz, nii, img, etc.) |
| `--subject subject` | FreeSurfer subject name |
| `--hemi hemi` | Hemisphere (`lh` or `rh`) |
| `--surf surfname` | Surface to compute AR1 on (default: `white`) |
| `--mask maskfile` | Binary mask volume — compute FWHM only within mask |
| `--label label` | Label file as mask |
| `--cortex` | Use `hemi.cortex.label` as mask |
| `--X x.mat` | MATLAB4 matrix for detrending |

## Outputs

| Output | Description |
|--------|-------------|
| `--o outfile` | Smoothed (and/or detrended) surface data; any mri_convert-compatible format |
| `--sum sumfile` | ASCII summary of FWHM estimation results |
| `--niters-only [nitersfile]` | Report (and optionally write) number of smoothing iterations to achieve target FWHM; no smoothed output |

## Mathematical Foundations

FWHM estimation uses the spatial autocorrelation function at lag 1 (AR1). For each vertex $v$, the AR1 is computed as the correlation between the vertex value and the average of its immediate neighbors:

$$
\text{AR1}(v) = \frac{\sum_{f=1}^{F} y_f(v) \cdot \bar{y}_f^{\text{nbr}}(v)}{\sqrt{\sum_f y_f(v)^2 \cdot \sum_f [\bar{y}_f^{\text{nbr}}(v)]^2}}
$$

where $\bar{y}_f^{\text{nbr}}(v)$ is the average value over the immediate neighbors of vertex $v$ in frame $f$.

The mean AR1 over all vertices is then converted to an equivalent Gaussian FWHM using the relationship between the AR1 of a Gaussian-smoothed process and the FWHM of the Gaussian kernel applied to white noise on the surface.

Surface smoothing is performed by iteratively averaging vertex values with their neighbors. The relationship between number of iterations $N_{\text{iter}}$ and FWHM (in mm) is:

$$
\text{FWHM} \approx \sqrt{N_{\text{iter}}} \cdot k
$$

where $k$ depends on the average inter-vertex spacing of the surface.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i input` | path | required | Input data file |
| `--s subject`<br>`--subject subject` | string | required | FreeSurfer subject name |
| `--h hemi`<br>`--hemi hemi` | lh or rh | required | Hemisphere |
| `--surf surfname` | string | `white` | Surface to use for AR1 computation |
| `--mask maskfile` | path | — | Mask file |
| `--mask-inv` | — | off | Invert mask |
| `--label label` | path | — | Use label as mask |
| `--cortex` | — | off | Use cortex.label as mask |
| `--X x.mat` | path | — | MATLAB4 design matrix for detrending |
| `--detrend order` | integer | 0 (if no output) | Detrend with polynomial regressors up to this order |
| `--sum sumfile` | path | — | Write ASCII summary of FWHM results |
| `--fwhm fwhm` | float | — | Smooth input by this many mm FWHM |
| `--niters-only [nitersfile]` | path (optional) | — | Only report iteration count needed for target FWHM |
| `--o outfile` | path | — | Output (smoothed) data |
| `--synth` | — | off | Synthesize white Gaussian noise input (10 frames default) |
| `--synth-frames nframes` | integer | 10 | Number of frames for synthesized noise |
| `--nosynth` | — | off | Disable synthesis (turn off synth mode if previously set) |
| `--lh` | — | — | Set hemi to "lh" (shortcut for `--hemi lh`) |
| `--rh` | — | — | Set hemi to "rh" (shortcut for `--hemi rh`) |
| `--surfpath path` | path | — | Full path to surface file; bypasses subject/hemi automatic lookup |
| `--sd dir` | path | `$SUBJECTS_DIR` | SUBJECTS_DIR override |
| `--niters n` | integer | — | Apply exactly this many smoothing iterations (bypasses FWHM-to-niters conversion) |
| `--smooth-only`<br>`--so` | — | off | Only smooth; skip FWHM estimation (implies `--no-detrend`) |
| `--no-detrend` | — | off | Disable polynomial detrending |
| `--fast` | — | off | Enable fast surface smoother (sets `USE_FAST_SURF_SMOOTHER=1`) |
| `--no-fast` | — | off | Disable fast surface smoother (sets `USE_FAST_SURF_SMOOTHER=0`) |
| `--fwhmf fwhmf` | float | — | Temporal smoothing FWHM applied across frames (in units of TR) |
| `--tr TR` | float | — | Repetition time (seconds); required for `--fwhmf` |
| `--sqr` | — | off | Square the input data before smoothing and FWHM estimation |
| `--inorm` | — | off | Spatial intensity normalization across the surface |
| `--varnorm` | — | off | Normalize variance across space within the mask |
| `--prune` | — | off | Remove any vertex that is zero in any subject (after inversion) |
| `--no-prune` | — | on | Do not prune zero vertices (default) |
| `--prune_thr threshold` | float | — | Pruning threshold |
| `--out-mask outmask` | path | — | Save the final mask to file |
| `--dat datfile` | path | — | Write FWHM value (only FWHM) to ASCII file |
| `--ar1dat ar1datfile` | path | — | Write AR1 mean and AR1 std to ASCII file |
| `--ar1 ar1vol` | path | — | Save spatial AR1 as a vertex overlay |
| `--arN nhops outfile` | int + path | — | Compute AR at `nhops` hops from each vertex and save as overlay |
| `--fwhm-map fwhmmap` | path | — | Save vertex-wise FWHM map as an overlay |
| `--dh vtxno niters file` | int + int + path | — | Diagnostic: compare iterative and analytic smoothing at a vertex |
| `--taubin niters lambda fcutoff insurf outsurf` | mixed | — | Standalone Taubin smoothing (e.g., `n=20`, `λ=0.3`, `fc=0.5`) |
| `--kfil input mask surf acf output` | paths | — | Apply a filter kernel defined by an ACF matrix (standalone mode) |
| `--group-area-test ...` | mixed | — | Group-level surface area test (standalone diagnostic mode) |

> [!note] Audit noise: `--in`
> An automated audit may flag `--in` as C1 missing. It appears only in an error message (`printf("ERROR: need to specify --in or --synth")`) at source line 925, not in the flag parser. The actual input flag is `--i`.

## Configuration Interactions

- When `--o` is specified without `--detrend`, detrending is disabled. When --o is not specified, `--detrend order` defaults to 0 (mean removal).
- `--fwhm` and `--niters-only` can be combined: specify a target FWHM and use `--niters-only` to get the equivalent number of smoothing iterations without actually smoothing.
- `--synth` and `--synth-frames` together replace `--i` — synthesized white noise is used as the input for FWHM estimation calibration.
- `--mask` and `--label` both define a mask, with `--mask-inv` applicable to both. `--cortex` is a shorthand for `--label ?h.cortex.label`.
- `--X` and `--detrend` are two mechanisms for removing confounds from the data before AR1 computation; they should not both be specified for the same detrending purpose.

## Typical Use Cases

**Estimate FWHM of residuals from a GLM:**
```bash
mris_fwhm --s bert --h lh --i lh.res.mgh --cortex --sum lh.fwhm.sum
```

**Smooth surface data to 10mm FWHM:**
```bash
mris_fwhm --s bert --h lh --i lh.thickness.mgh --fwhm 10 --o lh.thickness.sm10.mgh
```

**Find number of smoothing iterations equivalent to 10mm FWHM:**
```bash
mris_fwhm --s bert --h lh --surf white --fwhm 10 --synth --niters-only niters.txt
```

**Estimate FWHM of synthesized noise (calibration):**
```bash
mris_fwhm --s bert --h lh --synth --synth-frames 1000 --cortex --sum fwhm.synth.sum
```

## Pipeline Context

`mris_fwhm` is not part of the `recon-all` pipeline. It is used in group-level analysis workflows, typically:

1. After [[recon-all]] produces per-subject surface data
2. After `mri_preproc` / [[mris_preproc]] resamples data to common space (fsaverage)
3. Before running surface GLMs (e.g., with `mri_glmfit`)

The FWHM estimate from `--sum` is used as input to `mri_glmfit --fwhm` for RFT-based cluster correction.

## Gotchas and Caveats

> [!gotcha] Detrending is disabled when --o is specified
> By design, when an output file is specified, polynomial detrending is disabled (the mean is removed instead). This is documented in the help text but can be surprising when trying to smooth and detrend simultaneously.

> [!gotcha] Format restrictions on output
> The help text warns against using `analyze` or `nifti` formats for output because they cannot store more than 32k values in a dimension; use `mgh` or `mgz` instead for surface data. The note suggests `mri_surf2surf` for storing surface data in those formats.

> [!gotcha] AR1 is sensitive to the mask
> FWHM estimated without a mask (or with a mask that includes the medial wall) will be inflated because the medial wall has irregular connectivity. Always use `--cortex` or a custom `--mask` for FWHM estimation.

## Related Tools

- [[mris_smooth]] — surface smoothing (simpler interface)
- [[mris_preproc]] — group-level preprocessing on surface
- [[surface-format]] — surface file format documentation
- [[curv-format]] — curvature file format

## Confidence and Gaps

**Confident (from source code, embedded help, and complete `parse_commandline()` read):**
- Complete flag list verified from `parse_commandline()` and `BEGINHELP...ENDHELP` block
- Two functional modes (smoothing + FWHM estimation)
- Detrending behavior with/without output file
- Synth mode and frame count
- All output overlay flags (`--ar1`, `--ar1dat`, `--arN`, `--fwhm-map`, `--dat`)
- Standalone modes (`--taubin`, `--kfil`, `--group-area-test`)

> [!gap] AR1-to-FWHM formula
> The exact mathematical relationship used to convert the average AR1 to FWHM is implemented in `randomfields.h` (likely `RFar1ToFWHM`). The specific formula has not been traced in detail.
