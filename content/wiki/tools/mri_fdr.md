---
title: "mri_fdr"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fdr/mri_fdr.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_fwhm]]"
  - "[[mri_vol2surf]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - statistics
  - fdr
  - multiple-comparisons
  - neuroimaging
---

# mri_fdr

## Summary

`mri_fdr` applies False Discovery Rate (FDR) correction to one or more statistical maps. Given statistical volumes (stored as $-\log_{10}(p)$ by default), it computes the FDR-corrected voxel-wise threshold at a specified FDR level and optionally writes thresholded output volumes. Multiple input volumes can be provided simultaneously, optionally with masks and per-input output paths. Author: Douglas Greve.

## Source Information

- **Source language:** C++
- **Source file:** `mri_fdr/mri_fdr.cpp`
- **Key dependencies:** `mri.h`, `mri2.h`, `randomfields.h`, `fmriutils.h`, `cmdargs.h`

## Purpose and Context

In neuroimaging mass-univariate analyses, thousands of voxels are tested simultaneously. FDR control (Benjamini-Hochberg procedure) is a widely used method to limit the proportion of false discoveries. `mri_fdr` applies this correction to statistical volumes, computing the voxel-wise threshold that achieves the desired FDR level. It is applicable to activation maps from fMRI or morphometric studies.

## Inputs

Multiple `--i` flags, each optionally followed by a mask file and an output path:
```
--i <input_vol> [mask_vol] [output_vol] [frame]
```

Each `--i` block specifies:
1. `input_vol` — statistical map (required)
2. `mask_vol` — binary mask (optional; use keyword `nomask` to skip)
3. `output_vol` — where to write the thresholded result (optional; `nooutput` to skip)
4. `frame` — which frame of the input to process (optional; default = `--f` value)

## Outputs

- Thresholded statistical volumes at paths specified by `--i ... output_vol` blocks
- Voxel-wise threshold value printed to stdout: `voxel-wise-threshold <value>`
- Optional threshold saved to file via `--thfile`

## Mathematical Foundations

The FDR procedure (Benjamini-Hochberg):

1. Sort all $N$ voxel p-values: $p_{(1)} \le p_{(2)} \le \cdots \le p_{(N)}$.
2. Find the largest $k$ such that $p_{(k)} \le \frac{k}{N} \cdot \alpha$ where $\alpha$ is the FDR level.
3. Threshold: reject all null hypotheses for $p \le p_{(k)}$.

The tool handles the $-\log_{10}(p)$ convention: a stored value $v$ corresponds to $p = 10^{-v}$.

Sign-separation modes allow applying FDR to positive (`--pos`), negative (`--neg`), or absolute (`--abs`) statistics separately.

The core computation is in `MRIfdr2vwth()` which returns the voxel-wise threshold `vthresh`.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i <vol> [mask] [out] [frame]` | paths | required | Input volume (with optional mask, output, frame) |
| `--fdr <level>` | float | required | FDR level (e.g., 0.05) |
| `--pos` | flag | off | Apply FDR to positive statistics only |
| `--neg` | flag | off | Apply FDR to negative statistics only |
| `--abs` | flag | default | Apply FDR to absolute values of statistics |
| `--no-log10p` | flag | off | Input is raw p-values, not $-\log_{10}(p)$ |
| `--f <frame>` | int | `0` | Default frame index for all inputs |
| `--thfile <file>` | path | none | Save computed threshold to ASCII file |
| `--debug` | flag | off | Enable debug output |
| `--checkopts` | flag | off | Check options and exit without running |

## Configuration Interactions

- `--pos`, `--neg`, and `--abs` set `signid = +1, -1, 0` respectively. They are mutually exclusive; the last specified wins.
- `--no-log10p` changes the input interpretation: values are treated as p-values directly rather than $-\log_{10}(p)$.
- `--f` sets the default frame index, overridden per-input if a frame is specified in the `--i` block.
- Multiple `--i` blocks can be provided; all are processed together in a single FDR procedure (`MRIfdr2vwth` accepts arrays of inputs).

## Typical Use Cases

```bash
# Basic FDR correction at 5% level
mri_fdr --i activation.mgz nomask thresholded.mgz --fdr 0.05

# FDR with mask
mri_fdr --i activation.mgz mask.mgz thresholded.mgz --fdr 0.05

# Positive-only FDR correction
mri_fdr --i activation.mgz mask.mgz thresholded.mgz --fdr 0.05 --pos

# Multiple inputs jointly controlled
mri_fdr \
  --i vol1.mgz mask1.mgz out1.mgz \
  --i vol2.mgz mask2.mgz out2.mgz \
  --fdr 0.05

# Save threshold value to file
mri_fdr --i activation.mgz nomask thresholded.mgz --fdr 0.05 --thfile thresh.txt
```

## Pipeline Context

Not called by `[[wiki/pipelines/recon-all|recon-all]]`. Used in post-processing of statistical maps from fMRI or VBM analyses. Typically applied after computing a statistical map and before visualization.

## Gotchas and Caveats

> [!gotcha] Default input convention is -log10(p)
> The tool expects $-\log_{10}(p)$ values by default (as output by most FreeSurfer tools). Passing raw p-values without `--no-log10p` will produce incorrect results.

> [!gotcha] nomask and nooutput are literal keywords
> To skip mask or output for a specific `--i` block, the literal strings `nomask` and `nooutput` must be used.

> [!gotcha] Multiple inputs share the same FDR threshold
> When multiple volumes are specified with `--i`, they are processed together in a single FDR procedure. The threshold applies across all input voxels.

## Related Tools

- `[[mri_fwhm]]` — estimates smoothness of statistical maps
- `[[mri_vol2surf]]` — maps volumes to surfaces (used before FDR in surface-based analysis)

## Confidence and Gaps

**High confidence:** all arguments, FDR procedure, and sign-separation modes confirmed from source.
