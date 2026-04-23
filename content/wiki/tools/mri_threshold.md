---
title: "mri_threshold"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_threshold/mri_threshold.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_surfcluster]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - threshold
  - binarize
  - volume
  - intensity
---

# mri_threshold

## Summary

`mri_threshold` applies intensity thresholding to an MRI volume. By default it performs lower thresholding: voxels with intensity below the threshold are set to zero. With `-u`, it performs upper thresholding: voxels above the threshold are zeroed. An optional binarization step replaces suprathreshold values with a specified constant. Operates across all frames or on a single specified frame.

## Source Information

- **Language:** C++
- **Source file:** `mri_threshold/mri_threshold.cpp`
- **Key functions:** `MRIthreshold()`, `MRIthresholdAllFrames()`, `MRIupperthresholdAllFrames()`, `MRIbinarize()`

## Purpose and Context

This is a simple intensity manipulation tool for creating masks and binarizing volumes. For more complex thresholding (e.g., with separate above/below values, probability maps, label-specific operations), use [[mri_binarize]] instead.

## Inputs

| Input | Description |
|---|---|
| Positional arg 1 | Input volume |
| Positional arg 2 | Threshold value |
| Positional arg 3 | Output volume |

Usage:
```
mri_threshold [options] <in_vol> <thresh> <out_vol>
```

## Outputs

| Output | Description |
|---|---|
| Positional arg 3 | Thresholded output volume |

## Mathematical Foundations

Default (lower threshold):
$$
\text{out}(v) = \begin{cases} \text{in}(v) & \text{if } \text{in}(v) \geq \text{thresh} \\ 0 & \text{otherwise} \end{cases}
$$

Upper threshold (`-u`):
$$
\text{out}(v) = \begin{cases} \text{in}(v) & \text{if } \text{in}(v) \leq \text{thresh} \\ 0 & \text{otherwise} \end{cases}
$$

With binarization (`-b bval`):
$$
\text{out}(v) = \begin{cases} bval & \text{if } \text{in}(v) \geq \text{thresh} \\ 0 & \text{otherwise} \end{cases}
$$

Multi-frame logic: when no specific frame is selected, if **any** frame has a value below threshold at a voxel, that voxel is rejected (set to zero) in **all** frames. This is an all-frames intersection semantics.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-b`<br>`-B` | value | — | Binarize: set suprathreshold voxels to `value` |
| `-u`<br>`-U` | (none) | off | Upper threshold (zero voxels ABOVE threshold) |
| `-f`<br>`-F` | N | — | Apply threshold to specific frame N only (zero-based) |
| `--version` | (none) | — | Print version |

## Configuration Interactions

- `-u` and `-b` can be combined: upper threshold followed by binarization of remaining voxels.
- `-f` restricts operation to one frame; without it, all frames are processed with intersection semantics.
- With `-u` and `-b`: `MRIbinarizeNoThreshold()` is called (no second thresholding needed since the upper threshold already removed the high values).

## Typical Use Cases

**1. Keep voxels above 50:**
```bash
mri_threshold brain.mgz 50 brain_thr50.mgz
```

**2. Binarize at threshold 100:**
```bash
mri_threshold -b 1 brain.mgz 100 mask.mgz
```

**3. Upper threshold (keep voxels below 200):**
```bash
mri_threshold -u brain.mgz 200 brain_uthr200.mgz
```

**4. Threshold single frame:**
```bash
mri_threshold -f 0 timeseries.mgz 500 timeseries_thr.mgz
```

## Pipeline Context

Not part of standard `recon-all`. Used as a preprocessing/postprocessing utility.

## Gotchas and Caveats

> [!gotcha] Multi-frame semantics
> When operating on multi-frame volumes without `-f`, the threshold is applied with "any frame below threshold → zero all frames" semantics. This is less common than "threshold each frame independently" — use `-f` to process one frame at a time if independent per-frame thresholding is needed.

> [!gotcha] mri_binarize is more powerful
> For flexible above/below values, label-based operations, or probability map binarization, [[mri_binarize]] provides more options. `mri_threshold` is intentionally simple.

## Related Tools

- [[mri_binarize]] — more flexible thresholding with above/below values, label operations
- [[mri_surfcluster]] — threshold-based surface cluster analysis

## Confidence and Gaps

Source code read completely. Confidence is **high**.
