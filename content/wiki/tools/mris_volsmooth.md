---
title: "mris_volsmooth"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/mris_volsmooth"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_surf2surf]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mri_concat]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Behaviour when both --fwhm and --volfwhm are specified simultaneously not fully traced."
tags:
  - surface
  - smoothing
  - volume
  - fmri
---

# mris_volsmooth

## Summary

`mris_volsmooth` smooths a functional or statistical volume along the cortical surface geometry. It samples the volume onto both hemispheres' surfaces, applies surface-based smoothing (within cortex), then projects the smoothed surface values back into the volume. Optionally, it can also smooth the volume outside the cortex with a conventional volumetric Gaussian. The result is a volume where cortical regions are smoothed along the cortical ribbon rather than isotropically, reducing mixing of adjacent gyri.

## Source Information

- **Language:** tcsh (shell script)
- **Source file:** `scripts/mris_volsmooth`
- **Key dependencies:** `mri_vol2surf`, `mri_surf2surf`, `mri_surf2vol`, `mri_concat`, `mri_fwhm`

## Purpose and Context

Standard Gaussian smoothing in volume space blurs across sulcal folds, mixing signal from opposing gyral walls that are close in 3D space but far apart along the cortical sheet. Surface-based smoothing constrains blurring to follow the cortical topology.

`mris_volsmooth` implements this by:
1. Sampling the volume to both hemispheres' surfaces (via `mri_vol2surf`).
2. Smoothing on each surface within the cortex (via `mri_surf2surf --cortex --fwhm`).
3. Back-projecting the smoothed surface values into the volume (via `mri_surf2vol`).
4. Optionally: first smoothing the volume *outside* the cortex with volumetric smoothing (via `mri_fwhm`).

## Inputs

| Flag | Description |
|---|---|
| `--invol` | Input volume (functional or statistical) |
| `--reg` | Registration file (register.dat) between anatomical and functional spaces |
| `--outvol` | Output smoothed volume |
| `--fwhm mm` | Surface smoothing FWHM (mm) |
| `--niters N` | Surface smoothing iterations (alternative to --fwhm) |
| `--volfwhm mm` | Volumetric FWHM applied outside the cortex |
| `--projfrac frac` | Projection fraction for vol2surf/surf2vol (default: 0.5) |
| `--pfa min max delta` | Projection fraction average (alternative to --projfrac) |
| `--surfout stem` | Save intermediate surface overlays to stem.lh.mgh / stem.rh.mgh |
| `--fillribbon` | Fill the entire cortical ribbon (not just one projection fraction) |
| `--no-cleanup` | Keep intermediate temporary files |
| `--log logfile` | Custom log file |

## Outputs

| Output | Description |
|---|---|
| `--outvol` | Smoothed volume (same geometry as input) |
| `--surfout` | Optional surface overlay files (stem.lh.mgh, stem.rh.mgh) |

## Mathematical Foundations

Surface smoothing uses `mri_surf2surf` which implements iterative nearest-neighbour averaging approximating Gaussian smoothing. See [[mri_surf2surf]] for the FWHM-to-iterations relationship.

The workflow is:

$$
V_{\text{smooth}} = \text{surf2vol}\left(\text{surf2surf}_{\text{smooth}}\left(\text{vol2surf}(V)\right)\right)
$$

with optional volumetric smoothing of the non-cortical regions first.

## Configuration Options

See flags table above. All flags are passed as `--flag value`.

## Configuration Interactions

- Either `--fwhm` or `--niters` should be specified (not both) for surface smoothing.
- `--volfwhm` is independent of `--fwhm`; it smooths the volume outside cortex, then the result is used as the merge base for surface values.
- `--projfrac` and `--pfa` are mutually exclusive.
- `--fillribbon` changes `mri_surf2vol` to fill the full ribbon, overriding `--projfrac`.

## Typical Use Cases

**1. Surface-based smoothing of fMRI data:**
```bash
mris_volsmooth --invol func.nii.gz --reg register.dat \
  --fwhm 6 --outvol func.sm6.nii.gz
```

**2. Surface + volumetric smoothing:**
```bash
mris_volsmooth --invol func.nii.gz --reg register.dat \
  --fwhm 6 --volfwhm 3 --outvol func.smcombined.nii.gz
```

**3. Save intermediate surface files:**
```bash
mris_volsmooth --invol stat.mgh --reg register.dat \
  --fwhm 8 --outvol stat.sm8.mgh --surfout surf_tmp
```

## Pipeline Context

Not called by `recon-all`. Used in fMRI analysis workflows where surface-based smoothing is preferred over volumetric smoothing. Common in conjunction with:

- `mri_vol2surf` / `mri_surf2vol` (called internally)
- `mri_glmfit` (receives the smoothed volume or surface data)

## Gotchas and Caveats

> [!gotcha] Registration file required
> A valid `register.dat` (or equivalent) matching the input volume to the anatomical is required. The subject name is read from the first line of the register.dat file.

> [!gotcha] Both hemispheres processed
> Both LH and RH are always processed. There is no hemisphere-selection flag.

> [!gotcha] Cortex-label constraint
> The surface smoothing step always applies `--cortex` (smooths only within `?h.cortex.label`). This prevents medial wall values from bleeding into cortex.

## Related Tools

- [[mri_surf2surf]] — called internally for surface smoothing
- [[mri_vol2surf]] — called internally for volume-to-surface sampling
- [[mri_surf2vol]] — called internally for back-projection
- [[mri_concat]] — used to merge LH and RH surface masks

## Confidence and Gaps

Shell script source read completely. Confidence is **high**.
