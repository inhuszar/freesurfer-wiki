---
title: "mri_average"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_average/mri_average.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_concat]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - averaging
  - group-analysis
  - volumes
---

# mri_average

## Summary

`mri_average` computes a voxel-wise average (or RMS) of two or more MRI volumes, optionally after conforming them to isotropic 1 mm space and/or rigidly aligning them with the first volume. It supports a fast simple-average mode, OpenMP parallelism for alignment, and can read the list of input volumes from a text file.

## Source Information

- **Language:** C++
- **Source file:** `mri_average/mri_average.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

`mri_average` is used to:
1. Create group average brain volumes (e.g., for atlas construction).
2. Average multiple acquisitions of the same subject to improve SNR.
3. Compute RMS maps across subjects or time points.

The default mode reads multiple input volumes, optionally conforms each to 256³ 1mm isotropic space, and accumulates a running average. An alignment mode (`-A`) performs iterative rigid registration of each input to the current average before accumulating, enabling the creation of unbiased average templates.

For creating single-subject multi-acquisition averages without conforming, the `-simple-average` mode is most appropriate.

## Inputs

- Two or more input volume files (positional), or
- A text file listing one volume path per line (with `-F`)
- The last positional argument is always the output file

## Outputs

- A single averaged volume in MRI_FLOAT type (or matching type when using simple-average mode).

## Mathematical Foundations

**Standard average** (accumulated using `MRIaverage`):

For $N$ volumes $V_1, \ldots, V_N$ after optional conforming:

$$
\bar{V}(x) = \frac{1}{N} \sum_{i=1}^{N} V_i(x)
$$

**RMS mode** (`-sqr` / `-rms`):

$$
V_{\text{rms}}(x) = \sqrt{\frac{1}{N} \sum_{i=1}^{N} V_i(x)^2}
$$

**Simple-average mode** (`-simple-average`):
A straightforward accumulation without conforming, resampling, or alignment:
$$
\bar{V}(x) = \frac{1}{N} \sum_{i=1}^{N} V_i(x)
$$

**Alignment mode** (`-A`): Before averaging each volume $V_i$ ($i \geq 2$), a PCA-based rigid transform is estimated to align $V_i$ to the current average $\bar{V}$ using principal component analysis of image moments. The transform is then applied via sinc interpolation.

The PCA alignment matrix is computed by `align_pca()`:
1. Compute principal eigenvectors of the intensity-weighted covariance matrix for both volumes
2. Construct the rotation that maps eigenvectors of $V_i$ to eigenvectors of $\bar{V}$
3. Combine with center-of-mass translation

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-conform` | flag | on | Interpolate each volume to 256³ 1mm isotropic before averaging |
| `-noconform` | flag | — | Disable conforming (use original geometry) |
| `-A` | flag | off | Align each volume to running average before accumulation |
| `-sqr`<br>`-rms` | flag | off | Compute RMS instead of mean |
| `-F` | flag | off | Read input volumes from file (first positional arg is list file) |
| `-S <scale>` | float | 0 | Scale all input volumes by this factor before averaging |
| `-P` | flag | off | Binarize images at threshold 1 before averaging (compute occupancy %) |
| `-B <thresh>` | float | 0 | Binarize images at this threshold before averaging |
| `-abs` | flag | off | Take absolute value of each input before averaging |
| `-window` | flag | off | Apply Hanning window to volumes before averaging |
| `-sinc <hw>` | int | 3 (hw) | Use sinc interpolation with half-window `hw` (default: 3) |
| `-trilinear` | flag | off | Use trilinear interpolation instead of sinc |
| `-reduce <N>` | int | 2 | Reduce images N times before alignment (pyramid levels) |
| `-threads <N>` | int | system | Set OpenMP thread count |
| `-simple-average <out> <in1> <in2> ...` | — | — | Fast average without conform/align; output is first arg after flag |
| `-simple-sum <out> <in1> <in2> ...` | — | — | Fast sum (no normalization) |
| `-dt <val>` | float | 1e-6 | Alignment step size |
| `-tol <val>` | float | 1e-5 | Alignment convergence tolerance |
| `-M <val>` | float | 0.0 | Alignment momentum |
| `-T <tx> <ty> <tz>` | float×3 | 0,0,0 | Apply translation to second volume |
| `-R <rx> <ry> <rz>` | float×3 | 0,0,0 | Apply rotation (degrees) to second volume |
| `-W <N>` | int | — | Write diagnostic snapshots every N alignment iterations |

## Configuration Interactions

- `-conform` and `-noconform` are mutually exclusive; `-noconform` disables the default conforming.
- `-A` (alignment) implies sinc interpolation by default; use `-trilinear` to switch.
- `-sqr` and `-P` or `-B` are compatible: binarization occurs first, then squared-average.
- `-simple-average` and `-simple-sum` are standalone modes; they consume the rest of the command line and exit, ignoring most other flags.
- When only a single input volume is provided (plus output), the tool averages across frames of that volume (treating it as a 4D time series).

## Typical Use Cases

**Average four conforming T1 volumes:**
```bash
mri_average subj1/mri/T1.mgz subj2/mri/T1.mgz \
  subj3/mri/T1.mgz subj4/mri/T1.mgz \
  average_T1.mgz
```

**Average with alignment (unbiased template):**
```bash
mri_average -A subj1/mri/T1.mgz subj2/mri/T1.mgz \
  subj3/mri/T1.mgz average_aligned.mgz
```

**Read list from file, no conforming:**
```bash
mri_average -F -noconform volume_list.txt average.mgz
```

**Fast average without conform (multi-acquisition):**
```bash
mri_average -simple-average avg_acq.mgz acq1.mgz acq2.mgz acq3.mgz
```

**Compute occupancy map across subjects:**
```bash
mri_average -P subj1/mri/brainmask.mgz subj2/mri/brainmask.mgz \
  group_brainmask_pct.mgz
```

## Pipeline Context

Not a standard [[wiki/pipelines/recon-all|recon-all]] stage. Used in:
- Atlas construction (e.g., building the MNI305 or fsaverage templates).
- Group analysis preprocessing.
- Multi-acquisition SNR improvement.

## Gotchas and Caveats

> [!gotcha] Default conforming changes geometry
> Unless `-noconform` is specified, all input volumes are resampled to 256³ 1mm isotropic before averaging. This changes the RAS geometry and may introduce interpolation artifacts.

> [!gotcha] Alignment is PCA-based, not intensity-based
> The `-A` mode uses principal component analysis of image moments for alignment — not mutual information or cross-correlation. It assumes all volumes contain approximately the same structure (e.g., all are brain-extracted T1 images) and can fail for dissimilar inputs.

> [!gotcha] Single-input frame averaging
> When only one input volume is given, the tool averages across the volume's frames. This behavior is useful but surprising if you accidentally provide only one file.

> [!gotcha] simple-average bypasses geometry check
> The `-simple-average` mode performs a straight sum/normalize without checking geometry compatibility. Mismatched dimensions will produce incorrect results silently.

## Related Tools

- [[mri_concat]] — concatenates volumes along the frame dimension (no averaging)
- [[wiki/tools/mri_convert|mri_convert]] — format conversion

## Confidence and Gaps

Source code fully read. Confidence is high.

> [!gap] Alignment termination criteria
> The exact stopping criterion for the `-A` alignment optimization (momentum-based gradient descent in `align_with_average`) is not fully documented.
