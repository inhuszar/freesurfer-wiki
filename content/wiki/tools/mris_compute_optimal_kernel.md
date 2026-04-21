---
title: "mris_compute_optimal_kernel"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_compute_optimal_kernel/mris_compute_optimal_kernel.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_compute_acorr]]"
  - "[[mris_smooth]]"
  - "[[mris_register]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source in attic/. Installation status in 8.2.0 unknown."
  - "Internal MRIScomputeOptimalGaussianKernel() function details not documented."
tags:
  - surface
  - smoothing
  - kernel
  - optimisation
---

# mris_compute_optimal_kernel

## Summary

`mris_compute_optimal_kernel` computes the isotropic Gaussian smoothing kernel that best aligns an individual cortical label with a group-average label in the LMS (least mean squares) sense. The output is the standard deviation of this optimal Gaussian kernel, which can be interpreted as a measure of registration accuracy.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `attic/mris_compute_optimal_kernel/mris_compute_optimal_kernel.cpp`
- **Note:** Source in `attic/`.

## Purpose and Context

After spherical registration, individual subjects are aligned to an atlas. However, the alignment is imperfect — cortical sulci and gyri do not perfectly match even after registration. The optimal smoothing kernel for a given subject quantifies how much the subject's labels must be blurred to best match the group average, providing an interpretable measure of registration quality at the label level.

## Inputs

| Positional | Description |
|-----------|-------------|
| `<subject>` | FreeSurfer subject name |
| `<hemi>` | Hemisphere |
| `<subject_label>` | Individual subject label file |
| `<group_label>` | Group average label file |
| `<output>` | Output file for sigma value |

- Requires `SUBJECTS_DIR`.

## Outputs

| Output | Description |
|--------|-------------|
| `<output>` | Scalar sigma value (standard deviation of optimal kernel, in mm) |

## Mathematical Foundations

The tool finds $\sigma^*$ that minimises the LMS difference between the individual label $L_{\text{sub}}$ smoothed with a Gaussian of width $\sigma$ and the group label $L_{\text{grp}}$:

$$\sigma^* = \arg\min_\sigma \sum_v \left[ G_\sigma * L_{\text{sub}}(v) - L_{\text{grp}}(v) \right]^2$$

where $G_\sigma$ denotes convolution with an isotropic Gaussian of standard deviation $\sigma$.

The search is implemented by `MRIScomputeOptimalGaussianKernel()`, which iterates over averaging steps (`step_size` to `max_avgs`) and identifies the minimum.

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `-step <n>` | Step size for kernel search | 10 |
| `-max <n>` | Maximum averaging steps | 1000 |
| `-w <file>` | Write kernel output to file | `""` (no write) |
| `--orig <name>` | Original surface name | `orig` |

> [!gap] Flag names need verification
> Inferred from global variables. Confirm from `get_option()`.

## Configuration Interactions

- `step_size` and `max_avgs` define the search resolution and range.
- `-w` enables writing the sigma value to a file in addition to stdout.

## Typical Use Cases

```bash
# Find optimal kernel for bert's V1 label vs. group average
mris_compute_optimal_kernel bert lh \
    label/lh.V1.label \
    /path/to/group_avg/lh.V1.label \
    /tmp/lh.V1.optimal_sigma.txt
```

## Pipeline Context

Not part of `recon-all`. Used in atlas evaluation and registration quality assessment.

## Gotchas and Caveats

> [!gotcha] Attic placement
> Source in `attic/`. May not be installed in standard distributions.

## Related Tools

- [[mris_compute_acorr]] — spatial autocorrelation analysis
- [[mris_smooth]] — applies the computed smoothing kernel

## Confidence and Gaps

**Confident:** Core purpose and mathematical model confirmed from source.

> [!gap] Full flag set and MRIScomputeOptimalGaussianKernel internals
> Verify from source; attic status reduces confidence.
