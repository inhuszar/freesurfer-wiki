---
title: "mri_voldiff"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_voldiff/mri_voldiff.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_info]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The --vox2ras threshold comparison logic was not fully traced."
tags:
  - comparison
  - validation
  - quality-control
  - regression-testing
---

# mri_voldiff

## Summary

`mri_voldiff` compares two MRI volumes for equality, reporting differences in dimensions, precision, voxel resolution, vox2ras matrix, and pixel values. It exits with a non-zero exit code if any comparison fails, making it suitable for use in automated regression testing and pipeline validation. By default, it requires all properties to match; optional flags permit specific differences to be tolerated.

## Source Information

- **Language:** C++
- **Source file:** `mri_voldiff/mri_voldiff.cpp`

## Purpose and Context

When developing or validating FreeSurfer pipelines, it is important to confirm that an output volume is identical (or nearly identical) to a reference. `mri_voldiff` provides a structured way to detect any differences, distinguishing between header-level disagreements (dimension, precision, resolution, vox2ras) and data-level disagreements (pixel values). Exit codes identify which type of difference was found.

## Inputs

| Flag | Description |
|------|-------------|
| `--v1 vol1` | First input volume |
| `--v2 vol2` | Second input volume |

## Outputs

Printed to stdout:
- Maximum absolute difference between corresponding voxels
- Location (CRS indices and frame) of the maximum difference voxel
- Diagnostic messages for each header property that differs

Exit codes:
| Code | Meaning |
|------|---------|
| 0 | Volumes are identical (within tolerances) |
| 2 | Dimension mismatch |
| 3 | Precision mismatch |
| 4 | Resolution mismatch |
| 5 | Vox2RAS matrix mismatch |
| 6 | Pixel value mismatch |

## Mathematical Foundations

The tool computes the maximum absolute difference between corresponding voxels:

$$
d_{\max} = \max_{c,r,s,f} \left| V_1(c,r,s,f) - V_2(c,r,s,f) \right|
$$

where $(c,r,s,f)$ indexes columns, rows, slices, and frames. The location of $d_{\max}$ is recorded and reported.

The vox2ras comparison uses a configurable threshold $\epsilon$:

$$
\|M_1 - M_2\|_{\text{element}} \leq \epsilon
$$

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--v1` | `vol1` | — | First input volume |
| `--v2` | `vol2` | — | Second input volume |
| `--allow-res` | — | off | Do not fail on resolution mismatch |
| `--allow-prec` | — | off | Do not fail on precision mismatch |
| `--allow-vox2ras` | — | off | Do not fail on vox2ras mismatch |
| `--vox2ras` | `thresh` | 0 | Tolerance for vox2ras comparison |
| `--pix` | `thresh` | 0 | Tolerance for pixel value comparison |
| `--debug` | — | off | Enable debug output |
| `--version` | — | off | Print version |

## Configuration Interactions

- `--allow-res`, `--allow-prec`, `--allow-vox2ras` suppress specific exit codes. They do not affect pixel-level comparison.
- `--pix` sets an absolute tolerance; differences below this value are not reported as failures (exit code 6).
- `--vox2ras` sets an element-wise tolerance for the 4×4 vox2ras matrix.

## Typical Use Cases

```bash
# Strict equality check (fails on any difference)
mri_voldiff --v1 output.mgz --v2 reference.mgz

# Allow floating-point precision differences up to 1e-5
mri_voldiff --v1 output.mgz --v2 reference.mgz --pix 1e-5

# Check only pixel values, ignore header differences
mri_voldiff \
    --v1 output.mgz \
    --v2 reference.mgz \
    --allow-res \
    --allow-prec \
    --allow-vox2ras

# Use in a shell script for regression testing
mri_voldiff --v1 new_output.mgz --v2 expected.mgz
if [ $? -ne 0 ]; then
    echo "REGRESSION: output has changed"
fi
```

## Pipeline Context

`mri_voldiff` is not part of `recon-all`. It is used in:

- FreeSurfer's own regression test suite (`test.sh` scripts in individual tool directories)
- Manual pipeline validation after software updates
- Comparing outputs from different machines or compiler versions

## Gotchas and Caveats

> [!gotcha] Exit code semantics matter
> The exit code identifies which type of mismatch occurred (dimension, precision, resolution, vox2ras, pixel). Scripts using only `if [ $? -ne 0 ]` will catch any failure, but the specific code is useful for diagnosing the type of difference.

> [!gotcha] Pixel comparison is element-wise
> The reported `maxdiff` is the maximum over all voxels, not an average or RMS difference. A single outlier voxel will trigger failure even if all others are identical.

## Related Tools

- [[mri_info]] — inspect header properties of a single volume
- [[mri_convert]] — convert formats (may change precision, affecting comparison)

## Confidence and Gaps

**High confidence:** exit codes (from `#define` constants in source), command-line flags (from variable declarations), max-diff computation logic (from main() function body).

> [!gap] Vox2ras comparison details
> The exact matrix norm or element-wise comparison logic for `--vox2ras` was not fully traced in the parse/check logic.
