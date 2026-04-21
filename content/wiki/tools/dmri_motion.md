---
title: "dmri_motion"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_motion.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_paths]]"
  - "[[dmri_bset]]"
  - "[[dt_recon]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading parse_commandline()"
  - "Exact motion score computation not traced beyond global variable initialization"
tags:
  - diffusion
  - motion
  - quality-control
  - preprocessing
  - tracula
---

# dmri_motion

## Summary

`dmri_motion` computes measures of head motion in diffusion MRI data. It estimates between-volume translational and rotational motion from registration matrices (either provided as a text file or estimated from the DWI data itself), computes a motion score, and identifies "bad" frames that exceed a motion threshold. The tool outputs per-frame motion estimates and a summary score that can be used for quality control of DWI acquisitions.

## Source Information

- **Language:** C++
- **Source file:** `trc/dmri_motion.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_motion`
- **Original author:** Anastasia Yendiki (MGH)

## Purpose and Context

Head motion is a major confound in diffusion MRI. `dmri_motion` provides quantitative motion estimates to:
1. Characterize data quality before tractography.
2. Identify volumes to be flagged or removed.
3. Produce motion summaries for reporting in publications.

The tool handles two scenarios:
- **Between-volume motion** (rigid-body): Estimated from a registration matrix file.
- **Within-volume motion** (slice dropout): Estimated directly from DWI signal using a physics-based model with threshold parameters $T$ (default 100) and $D$ (default 0.001 — diffusivity parameter for signal estimation).

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Registration matrices | `inMatFile` | Text file of per-volume registration matrices |
| DWI volumes | `inDwiList` | List of DWI volume files (for within-volume estimation) |
| B-values | `inBvalList` | List of b-value files corresponding to DWI volumes |
| Output file | `outFile` | Summary motion statistics output |
| Frame output | `outFrameFile` | Per-frame motion values output |

Global defaults: `T = 100`, `D = .001`.

## Outputs

| Output | Description |
|--------|-------------|
| Summary file | Mean translation (`travg`), mean rotation (`roavg`), motion score (`score`), fraction bad frames (`pbad`) |
| Frame file | Per-frame translation and rotation values |

## Mathematical Foundations

**Between-volume motion:** Translation and rotation are extracted from the registration matrices for each consecutive volume pair. The displacement measures are:

- Translation: $t = \|\Delta \mathbf{x}\|_2$ (mm)
- Rotation: $r = \|\Delta \boldsymbol{\theta}\|_2$ (degrees, Euler angles)

**Within-volume motion** (slice dropout detection): For each slice in each DWI volume, the observed signal is compared to the signal predicted from a diffusion model. A slice is flagged as "bad" if:

$$
\frac{S_{\text{observed}}}{S_{\text{predicted}}} < T
$$

where the predicted signal uses the Stejskal-Tanner equation:
$$
S = S_0 \exp(-b \cdot D)
$$

with $D$ as the apparent diffusion coefficient (default $D = 0.001$ mm²/s).

The **motion score** aggregates these measures into a single quality metric. Frames with excessive motion are counted as bad frames (`nbadframe`), and the fraction bad (`pbad = nbadframe / total_frames`) quantifies overall data quality.

## Configuration Options

> [!gap] Full flag list
> The complete flags require reading `parse_commandline()`. From global variables:

| Variable | Likely flag | Description | Default |
|----------|-------------|-------------|---------|
| `inMatFile` | `--mat` | Input motion matrix file | — |
| `inDwiList` | `--dwi` | List of DWI files (for within-volume estimation) | — |
| `inBvalList` | `--bval` | List of b-value files | — |
| `outFile` | `--out` | Output summary statistics file | — |
| `outFrameFile` | `--frame` | Output per-frame motion file | — |
| `T` | `--T` | Signal threshold for slice dropout | 100 |
| `D` | `--D` | Diffusivity for signal prediction | 0.001 |

## Typical Use Cases

> [!gap] Exact command syntax unknown
> Based on the global variables:

```bash
# Compute between-volume motion from eddy_correct matrices
dmri_motion \
  --mat eddy_correct_matrices.txt \
  --out motion_summary.txt \
  --frame motion_per_frame.txt

# Compute within-volume motion from DWI signal
dmri_motion \
  --dwi dwi_run1.nii.gz dwi_run2.nii.gz \
  --bval bvals_run1 bvals_run2 \
  --out motion_summary.txt
```

## Pipeline Context

`dmri_motion` is typically run before tractography as a quality control step. In the TRACULA pipeline it may be called by `trac-all` during the preprocessing stage. It is not called by `recon-all`.

```
DWI acquisition --> eddy correction --> dmri_motion (QC) --> dmri_paths / dmri_train
```

## Gotchas and Caveats

> [!gotcha] Multiple runs support
> The code handles multiple DWI runs (stored in `runstart` vector). The `--dwi` flag can accept multiple files.

## Related Tools

- [[dmri_paths]] — tractography downstream of motion QC
- [[dmri_bset]] — shell extraction that may precede motion estimation
- [[dt_recon]] — pipeline that includes eddy correction before tensor fitting

## Confidence and Gaps

> [!gap] Argument parser not read
> Full flags and their defaults require reading `parse_commandline()`.

> [!gap] Motion score formula
> The exact formula for `score` (combining translation and rotation into a scalar quality score) is not traced from the top-level source.
