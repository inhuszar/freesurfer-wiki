---
title: "mri_cnr"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_cnr/mri_cnr.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_info]]"
  - "[[mris_anatomical_stats]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - quality-control
  - contrast-to-noise
  - surface
  - morphometry
---

# mri_cnr

## Summary

`mri_cnr` computes the Contrast-to-Noise Ratio (CNR) between white matter and gray matter using FreeSurfer surface boundaries. For each hemisphere, it samples the input MRI volume at positions defined by the white and pial surfaces to estimate WM, GM, and CSF intensities, and reports the CNR for each input volume and for the combined bilateral average. It is primarily used as a quality control metric for the input T1 image.

## Source Information

- **Language:** C++
- **Source file:** `mri_cnr/mri_cnr.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

CNR quantifies how well the MRI volume distinguishes white matter from gray matter, which directly affects the quality of cortical surface reconstruction. Low CNR may indicate poor image quality, motion artifacts, or suboptimal acquisition parameters. `mri_cnr` provides an objective numeric estimate of this quality by using the already-reconstructed surfaces as a gold-standard boundary between tissue classes.

The tool can also compute the intensity slope across the WM-GM boundary using a linear regression approach (when `-slope` is specified), providing additional texture information about the tissue contrast profile.

## Inputs

- `<path>` — a directory containing `lh.white`, `lh.pial`, `rh.white`, `rh.pial` surface files (positional argument 1)
- `<vol1> [<vol2>...]` — one or more MRI volumes to evaluate (positional arguments 2+)

Optional:
- `--label <lh_label> <rh_label>` — restrict analysis to specified label files (one per hemisphere)

## Outputs

Printed to stdout:
- Per-hemisphere, per-volume CNR values
- Total CNR (mean of lh + rh) for each volume

Optionally:
- Log file (`-log <file>`)
- Slope files (`-slope <base>`) written as `<path>/<hemi>.<base>.slope.mgz` and `.offset.mgz`

## Mathematical Foundations

`compute_volume_cnr()` samples the MRI volume at positions normal to the white surface (inward into WM) and at positions normal to the pial surface (outward into GM and CSF). It estimates:
- WM mean $\mu_{WM}$, variance $\sigma^2_{WM}$ from inward samples
- GM mean $\mu_{GM}$, variance $\sigma^2_{GM}$ from between-surface samples
- CSF mean $\mu_{CSF}$, variance $\sigma^2_{CSF}$ from outward samples (if applicable)

CNR is defined as:

$$
\text{CNR} = \frac{(\mu_{WM} - \mu_{GM})^2}{\sigma^2_{WM} + \sigma^2_{GM}}
$$

For bilateral total CNR:
$$
\text{CNR}_{\text{total}} = \frac{\text{CNR}_{lh} + \text{CNR}_{rh}}{2N_{\text{vols}}}
$$

The slope fitting (`MRIScomputeSlope`) uses least-squares linear regression of intensity vs. distance across the WM-GM boundary:
$$
I(d) \approx a \cdot d + b
$$

where $d$ is the distance from the white surface (negative into WM, positive toward CSF).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--label <lh_label> <rh_label>` | string×2 | — | Restrict to label region on each hemisphere |
| `-log <file>` | string | — | Write CNR results to log file |
| `-slope <base>` | string | — | Compute and write WM-GM slope/offset maps |
| `-dist-in <val>` | float | — | Distance inside WM for slope sampling |
| `-dist-out <val>` | float | — | Distance outside pial for slope sampling |
| `-step-in <val>` | float | — | Step size inside for slope |
| `-step-out <val>` | float | — | Step size outside for slope |
| `-interp <type>` | int | TRILINEAR | Interpolation method for volume sampling |
| `-only-total` | flag | off | Only print the total CNR, suppress per-hemisphere output |

## Configuration Interactions

- `-slope` requires `-dist-in`, `-dist-out`, `-step-in`, `-step-out` to be set; these define the sampling profile.
- `-label` applies different region-of-interest masks to lh and rh simultaneously.
- Multiple input volumes are processed in a single run; CNR is reported for each.

## Typical Use Cases

**Basic CNR quality check after recon-all:**
```bash
mri_cnr $SUBJECTS_DIR/bert/surf \
  $SUBJECTS_DIR/bert/mri/norm.mgz
```

**Check CNR on raw T1 vs normalized:**
```bash
mri_cnr $SUBJECTS_DIR/bert/surf \
  $SUBJECTS_DIR/bert/mri/orig/001.mgz \
  $SUBJECTS_DIR/bert/mri/norm.mgz
```

**Only print total (for scripting):**
```bash
mri_cnr -only-total $SUBJECTS_DIR/bert/surf \
  $SUBJECTS_DIR/bert/mri/norm.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Typically run as a post-processing quality control step after the cortical surfaces have been generated (after autorecon2/3), since the tool requires `lh.white`, `lh.pial`, `rh.white`, and `rh.pial`.

## Gotchas and Caveats

> [!gotcha] Requires already-reconstructed surfaces
> `mri_cnr` cannot be used before surfaces exist. It uses the white and pial surfaces as the tissue boundary reference, meaning it measures CNR relative to the *final* reconstruction, which may itself be influenced by CNR.

> [!gotcha] Path must contain both hemispheres
> The tool processes both hemispheres in a single pass. The `<path>` argument must contain all four surface files (`lh.white`, `lh.pial`, `rh.white`, `rh.pial`). Partial hemisphere setups will cause file-not-found errors.

> [!gotcha] CNR definition varies across the field
> FreeSurfer's CNR definition uses the squared mean difference normalized by the sum of variances. This differs from CNR definitions in MRI physics literature (which typically use peak-to-peak contrast divided by noise RMS). Do not compare directly with values reported using other definitions.

## Related Tools

- [[mri_info]] — provides basic volume metadata including voxel size and data type
- [[mris_anatomical_stats]] — reports surface morphometry (area, thickness) that depends on surface quality

## Confidence and Gaps

Source code fully read. Confidence is high.

> [!gap] Exact compute_volume_cnr sampling parameters
> The exact sampling distances (how far into WM/GM the samples are taken) are implementation details in `compute_volume_cnr()`. These affect the CNR value and should be verified for comparisons across studies.
