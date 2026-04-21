---
title: "mri_xvolavg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_xvolavg/mri_xvolavg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_average]]"
  - "[[mri_concat]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - mri
  - averaging
  - group-analysis
  - volume
---

# mri_xvolavg

## Summary

`mri_xvolavg` (cross-volume average) averages multiple MRI volumes — which can be 4D — into a single output volume. Author: Douglas Greve. It is a simple multi-volume averaging utility for group-level analysis or multi-run averaging. All input volumes must have the same dimensions; the output is their element-wise arithmetic mean.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_xvolavg/mri_xvolavg.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_xvolavg`
- **Original Author:** Douglas Greve

## Purpose and Context

Computing a group-average MRI (for structural or functional data) is a fundamental step in neuroimaging group analyses. `mri_xvolavg` reads multiple input volumes and computes their per-voxel arithmetic mean. It supports 4D volumes (multiple frames per volume), averaging across the time/frame dimension as well as across subjects.

This tool is simpler than [[mri_average]] (which performs registration) and [[mri_concat]] (which concatenates along the frame dimension). Use `mri_xvolavg` when volumes are already in a common space and you want a simple mean.

## Inputs

### Required Inputs

(Specified via flags)

- **`--vol <vol>`** — one or more input volume files. Can be repeated multiple times.
- **`--out <vol>`** — output averaged volume.

### Input Assumptions

> [!assumption] All volumes must have the same geometry
> Dimensions (number of voxels, frames) and voxel sizes must be identical across all inputs. No registration is performed.

> [!assumption] Legacy bfloat support
> The tool uses `MRIio_old.h` for I/O, suggesting it may also support the legacy bfloat format in addition to MGZ/NIfTI.

## Outputs

### Files Created

- **Averaged volume** — arithmetic mean of all input volumes, written to the path specified by `--o`. Same dimensions and type as input.

## Mathematical Foundations

For each voxel at location $(x, y, z, f)$ across $N$ input volumes:
$$\text{out}(x,y,z,f) = \frac{1}{N} \sum_{n=1}^{N} \text{vol}_n(x,y,z,f)$$

No weighting, outlier removal, or robust estimation. Simple arithmetic mean.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol <vol>` | string | repeatable (required, ≥2) | Input volume path. Repeat once per input volume. |
| `--out <vol>` | string | required | Output volume path. |
| `--vol_type <type>` | string | auto | Format type string for all input volumes (any type accepted by `mri_convert`). |
| `--out_type <type>` | string | same as input | Format type string for the output volume. |
| `--debug` | flag | off | Enable debug output (prints verbose progress). |
| `--nodebug` | flag | — | Disable debug output (explicit off). |
| `--version` | flag | — | Print version string and exit. |
| `--help` | flag | — | Print usage and exit. |

> [!gotcha] Flag names differ from other tools
> The input flag is `--vol` (not `--i`) and the output flag is `--out` (not `--o`). This differs from many other FreeSurfer tools. There are no `--i`/`--o` aliases.

### Configuration Interactions

- All `--vol` inputs are treated equally; no weighting.
- `--vol_type` applies uniformly to all inputs; mixing format types is not supported.
- `--out_type` defaults to the same type as the input if not specified.

## Typical Use Cases

### Use Case 1: Average group T1 volumes

```bash
mri_xvolavg \
  --vol $SUBJECTS_DIR/subject1/mri/norm.mgz \
  --vol $SUBJECTS_DIR/subject2/mri/norm.mgz \
  --vol $SUBJECTS_DIR/subject3/mri/norm.mgz \
  --out /path/to/group_average.mgz
```

### Use Case 2: Average 4D functional volumes

```bash
mri_xvolavg \
  --vol run1.mgz \
  --vol run2.mgz \
  --vol run3.mgz \
  --out mean_bold.mgz
```

## Pipeline Context

`mri_xvolavg` is not called by `recon-all`. It is used in group analysis pipelines and multi-run averaging.

## Gotchas and Caveats

> [!gotcha] No registration
> Unlike [[mri_average]], this tool performs no inter-subject registration. Volumes must already be in a common space (e.g., Talairach, MNI) before averaging.

> [!gotcha] All inputs weighted equally
> There is no support for weighted averaging. All subjects contribute equally regardless of data quality.

## Related Tools

- [[mri_average]] — averages volumes with optional registration (for cross-subject averaging)
- [[mri_concat]] — concatenates volumes along the frame dimension (does not average)

## Confidence and Gaps

**High confidence.** The complete `parse_commandline()` function was read. All flags verified from source. Flag names (`--vol`, `--out`, `--vol_type`, `--out_type`) confirmed.
