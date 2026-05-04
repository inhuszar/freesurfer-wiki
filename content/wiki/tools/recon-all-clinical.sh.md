---
title: "recon-all-clinical.sh"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "recon_all_clinical/recon-all-clinical.sh"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_synthseg]]"
  - "[[mri_synthsr]]"
  - "[[mri_synthstrip]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The SynthDist surface fitting model (synthsurf_v10_230420.h5) details and algorithm not documented."
  - "Exact recon-all stages run vs. skipped compared to standard pipeline not enumerated."
tags:
  - pipeline
  - clinical
  - rapid
  - SynthSeg
  - SynthSR
  - SynthDist
---

# recon-all-clinical.sh

## Summary

`recon-all-clinical.sh` is a rapid cortical reconstruction pipeline designed for clinical MRI scans of arbitrary contrast, orientation, and resolution. Unlike standard `recon-all` (which requires 1 mm isotropic T1-weighted input and takes ~6–10 hours), this script processes heterogeneous clinical scans in approximately 1–2 hours by substituting deep learning-based shortcuts (SynthSeg, SynthSR, SynthDist) for the computationally expensive iterative Bayesian steps. It produces volumetric segmentation, surface parcellation, and morphometric statistics compatible with standard FreeSurfer outputs.

## Source Information

- **Language:** tcsh (shell script)
- **Source file(s):** `recon_all_clinical/recon-all-clinical.sh`
- **Binary/script location:** `$FREESURFER_HOME/bin/recon-all-clinical.sh`
- **Python model:** `$FREESURFER_HOME/models/synthsurf_v10_230420.h5`

## Purpose and Context

Clinical neuroimaging produces a wide variety of MRI protocols: thick-slice T2 FLAIR, low-resolution T1 MPRAGE, CT scans, multi-orientation acquisitions. Standard `recon-all` cannot handle these reliably because it relies on assumptions of 1 mm isotropic T1-weighted input. `recon-all-clinical.sh` removes these constraints by using:

1. **SynthSeg** — contrast-agnostic volumetric brain segmentation and linear Talairach registration.
2. **SynthSR** — super-resolution synthesis: produces a synthetic 1 mm MPRAGE-like volume for visualization and further processing.
3. **SynthDist** — deep learning-based surface fitting using predicted distance maps, providing topologically accurate cortical surfaces without the traditional iterative gradient-based deformation.

The result is a faster, more robust pipeline suitable for clinical cohort studies where scan quality is heterogeneous.

## Inputs

### Required Inputs

- **`-i <INPUT_SCAN>`** — path to the input scan (any contrast, resolution, or orientation).
- **`-subjid <SUBJECT_ID>`** — subject identifier.
- **`-threads <THREADS>`** — number of processing threads.

### Optional Inputs

- **`-sdir <SUBJECTS_DIR>`** — subjects directory (defaults to `$SUBJECTS_DIR` environment variable).
- **`-ct`** — CT mode: clips input intensities to the [0, 80] Hounsfield unit range before processing (required for CT scans).

### Input Assumptions

> [!assumption] No contrast or resolution assumptions
> Unlike `recon-all`, this pipeline makes no assumptions about MRI contrast, orientation, or voxel size. The SynthSeg model was trained on highly augmented synthetic data spanning a wide range of acquisition parameters.

> [!assumption] CT flag required for Hounsfield unit data
> CT scans must be processed with `-ct` to clip the intensity range correctly. Without this flag, CT data will produce incorrect results.

## Outputs

The pipeline produces the standard FreeSurfer subject directory structure:

- `mri/aseg.mgz` — SynthSeg-based subcortical segmentation.
- `mri/synthSR.mgz` — SynthSR-synthesized 1 mm MPRAGE-like volume.
- `surf/lh.white`, `surf/rh.white` — white matter surfaces.
- `surf/lh.pial`, `surf/rh.pial` — pial surfaces.
- `surf/lh.sphere`, etc. — spherical surfaces.
- `label/*.annot` — cortical parcellation annotations.
- `stats/*.stats` — morphometric statistics.

## Mathematical Foundations

**SynthSeg:** A 3D U-Net trained to segment 33 brain structures from MRI of any contrast or resolution, using a generative model of synthetic training data. Outputs: label volume + linear Talairach registration parameters.

**SynthSR:** A second U-Net trained to produce a synthetic T1-weighted 1 mm isotropic volume from any input contrast. Enables downstream tools that expect T1-weighted input.

**SynthDist (surface fitting):** Uses a deep learning model (`synthsurf_v10_230420.h5`) to predict signed distance maps for the white and pial surfaces, from which topologically correct surfaces are extracted directly. This avoids the iterative gradient-following surface deformation in standard `recon-all`.

> [!gap] SynthDist algorithm details
> The exact architecture and training of `synthsurf_v10_230420.h5` is not documented in the source. The reference paper (Gopinath et al., arXiv 2305.01827) describes the overall approach.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i <path>` | string | required | Input scan path. |
| `-subjid <id>` | string | required | Subject identifier. |
| `-threads <n>` | integer | required | Number of processing threads. |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Subjects directory override. |
| `-ct` | boolean | false | CT mode: clips intensities to [0, 80] HU. |
| `-h`<br>`--help` | boolean | — | Print help and exit. |

### Configuration Interactions

- `-ct` fundamentally changes the intensity preprocessing; never apply to standard MRI data.
- `-threads` is passed to the deep learning models for parallel inference.

> [!gotcha] tcsh 6.17.06 bug warning
> The script explicitly checks for tcsh v6.17.06 and warns about an exit code bug in that version. Users should update tcsh if running this version.

## Typical Use Cases

### Use Case 1: Process clinical T2 FLAIR scan

```bash
recon-all-clinical.sh \
  -i /path/to/clinical_FLAIR.dcm \
  -subjid patient001 \
  -threads 8 \
  -sdir /data/subjects
```

### Use Case 2: Process CT scan

```bash
recon-all-clinical.sh \
  -i /path/to/head_CT.nii.gz \
  -subjid patient002 \
  -threads 4 \
  -ct
```

## Pipeline Context

`recon-all-clinical.sh` is an alternative to standard `recon-all` for non-standard MRI inputs. It is not called by `recon-all`. The two pipelines are mutually exclusive for a given subject — use one or the other.

**Comparison with standard pipeline:**
| Aspect | recon-all | recon-all-clinical.sh |
|--------|-----------|----------------------|
| Input requirements | 1mm isotropic T1 | Any contrast/resolution |
| Processing time | ~6-10 hours | ~1-2 hours |
| Segmentation | EM/GCA-based | SynthSeg deep learning |
| Surface fitting | Gradient-based deformation | SynthDist distance maps |
| Registration | mritotal / talairach_avi | SynthSeg linear reg |

## Gotchas and Caveats

> [!gotcha] Not a drop-in replacement for standard recon-all
> Results from `recon-all-clinical.sh` are not directly comparable to standard `recon-all` outputs. Group studies should use a consistent pipeline for all subjects.

> [!gotcha] Python/deep learning environment required
> The SynthSeg, SynthSR, and SynthDist models require the FreeSurfer Python environment with PyTorch. Ensure `$FREESURFER_HOME/python/` is properly configured.

> [!gotcha] CT processing requires -ct flag
> Processing CT without `-ct` will produce incorrect results. The HU range clipping is critical for deep learning model performance on CT data.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — standard cortical reconstruction pipeline (requires 1mm isotropic T1)
- [[mri_synthseg]] — SynthSeg segmentation (called internally)
- [[mri_synthsr]] — SynthSR synthesis (called internally)
- [[recon-all-exvivo]] — ex vivo tissue reconstruction pipeline

## Confidence and Gaps

Confidence is **high** for the overall pipeline structure and configuration, based on the script source. Internal algorithm details of SynthDist are not documented.

## References

- Gopinath K, Greve DN, Das S, Arnold S, Magdamo C, Iglesias JE (2023). "Cortical analysis of heterogeneous clinical brain MRI scans for large-scale neuroimaging studies." arXiv:2305.01827.
- Billot B, Greve DN, Puonti O, et al. (2023). "SynthSeg: Segmentation of brain MRI scans of any contrast and resolution without retraining." *Medical Image Analysis*, 83, 102789.
- Billot B, Magdamo C, Arnold SE, Das S, Iglesias JE (2023). "Robust machine learning segmentation for large-scale analysis of heterogeneous clinical brain MRI datasets." *PNAS*, 120(9), e2216399120.
- Iglesias JE, Billot B, Balbastre Y, et al. (2023). "SynthSR: a public AI tool to turn heterogeneous clinical brain scans into high-resolution T1-weighted images for 3D morphometry." *Science Advances*, 9(5), eadd3607.
