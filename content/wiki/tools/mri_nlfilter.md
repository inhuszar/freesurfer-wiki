---
title: "mri_nlfilter"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_nlfilter/mri_nlfilter.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_polv]]"
  - "[[mri_normalize]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "Whether any recon-all stage calls this tool"
tags:
  - filtering
  - nonlinear
  - smoothing
---

# mri_nlfilter

## Summary

`mri_nlfilter` applies a nonlinear spatial filter to a 3-D MRI volume. The default filter is a min-max (MINMAX) filter operating within local image regions. Additional filter modes include Gaussian, median, histogram equalization, mean-masked, and offset-based filtering. The tool processes the volume in overlapping 3-D blocks of a configurable size and applies the selected filter within each block.

## Source Information

- **Language:** C++
- **Source file:** `mri_nlfilter/mri_nlfilter.cpp`
- **Key includes:** `filter.h`, `mri.h`, `region.h`

## Purpose and Context

`mri_nlfilter` provides a collection of spatial filter operations for preprocessing or post-processing MRI volumes. The default MINMAX filter is a nonlinear edge-enhancing filter that operates by computing local offset vectors (orientation of least variance, see [[mri_polv]]) and then applying a min-max decision along those offsets. This type of filtering was historically used in the FreeSurfer preprocessing stream to enhance tissue boundaries before segmentation.

The histogram equalization mode can match an input volume's intensity histogram to that of a template volume, which is useful for cross-scanner intensity normalization.

## Inputs

- **Input volume:** Any FreeSurfer-readable 3-D MRI volume ([[mgz]], NIfTI, etc.)
- **Template volume (histogram mode only):** A reference volume whose histogram is used as the equalization target

## Outputs

- **Filtered output volume:** Same geometry as input, with filtered intensities written to the specified output path

## Mathematical Foundations

**MINMAX filter (default):**

The MINMAX filter is a nonlinear operator designed to sharpen tissue boundaries. For each voxel $v$ in a local region:
1. An offset direction is computed from the plane of least variance (POLV) normal (see `MRIcentralPlaneOfLeastVarianceNormal`).
2. The filter samples voxel intensities along the computed offset directions within a window of size `filter_window_size`.
3. The output is determined by the extremal (min or max) value along the direction of steepest gradient.

**Gaussian filter:**

$$
I_\text{out}(v) = (I * G_\sigma)(v)
$$

where $G_\sigma$ is a 1-D separable Gaussian kernel with standard deviation $\sigma$ (default: 2.0).

**Histogram equalization:**

The intensity CDF of the input is remapped to match the CDF of the template volume, using `MRIhistoEqualize` with a range of `[0, 28000]`.

> [!internal] References internal code
> The POLV normal computation is implemented in `MRIcentralPlaneOfLeastVarianceNormal()` (shared library). See also [[mri_polv]] for the standalone POLV tool.

## Configuration Options

Usage: `mri_nlfilter [options] <input_volume> <output_volume>`

Option flags use a single `-` prefix. Filter-type flags are long-form words (e.g., `-gaussian`); window-size and region flags use single uppercase letters. All option matching is case-insensitive.

### Filter type selection (mutually exclusive)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-minmax` | (none) | **default** | Apply the MINMAX nonlinear edge-enhancing filter (default if no filter flag is given) |
| `-gaussian <sigma>` | float | — | Apply Gaussian convolution with the given sigma; sets filter to `FILTER_GAUSSIAN` |
| `-median` | (none) | — | Apply median filter within the filter window |
| `-mean` | (none) | — | Apply mean (box) filter within the filter window |
| `-cpolv` | (none) | — | Apply CPOLV (central plane of least variance) median filter |
| `-hmatch <fname>` | path | — | Apply histogram matching: remap input intensities to match the histogram of template volume `fname` in range [0, 28000] |
| `-meanmask` | (none) | — | Apply mean-masked filter; requires extra positional arguments (see gotcha below) |
| `-none` | (none) | — | No filtering: copy input to output without modification |

### Window and region size

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-F <n>` | int | 3 | Filter window size (must be ≥ 3); controls the neighbourhood used for median/mean/minmax filtering |
| `-W <n>` | int | 3 | Offset window size (must be ≥ 3); controls the neighbourhood for computing the POLV offset direction |
| `-R <n>` | int | 16 | Block (region) size in voxels for the tiled regional processing loop |

### Pre-blur sigma

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-blur <sigma>` / `-B <sigma>` / `-b <sigma>` | float | 0.5 | Sigma of the Gaussian kernel used to smooth the input before computing the offset field; set to 0 to disable pre-blur. `-B` and `-b` are short-form aliases matched by `toupper(*option) == 'B'`. |

### Crop and offset

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-nc` | (none) | off | Disable bounding-box cropping; process the full volume extent including zero-valued background |
| `-N` | (none) | off | Disable offset computation; apply the selected filter globally without computing local POLV offsets |

## Configuration Interactions

- The filter-type flags are mutually exclusive; the last one specified wins since each overwrites the `filter_type` global.
- `-nc` combined with `-N` enables a global (non-regional) single-pass filter. This is the only code path that calls `MRIconvolveGaussian` or `MRImedian` on the full volume directly; other filter types are not supported in this mode and will error.
- `-blur 0` disables the pre-blur step entirely (no blurring kernel is allocated and `mri_blur = NULL`).
- `-hmatch <fname>`: when histogram matching is selected, the tool reads the template, runs `MRIhistoEqualize`, writes the result, and exits immediately — the normal regional processing loop is **not** executed.
- The `meanmask` filter mode (`-meanmask`) changes the positional argument order to: `mri_nlfilter -meanmask <input> <mask_vol> <niter> <thresh> <output>`. This is non-standard and deviates from the normal `<input> <output>` convention.

> [!gotcha] Mean-masked filter has non-standard argument order
> When `-meanmask` is selected, positional arguments 2–5 are `<mask_volume> <niter> <thresh> <output>`, not `<output>` alone. Using the tool as `mri_nlfilter -meanmask input.mgz output.mgz` will misparse arguments.

> [!gotcha] `-t` flag does not exist
> Earlier documentation described a `-t <int>` flag for filter type selection. This flag does not exist in the source. Filter types are selected by named flags: `-minmax`, `-gaussian`, `-median`, `-mean`, `-cpolv`, `-hmatch`, `-meanmask`, `-none`.

## Typical Use Cases

```bash
# Default MINMAX nonlinear filter
mri_nlfilter input.mgz output.mgz

# Gaussian filter with sigma=1.5
mri_nlfilter -gaussian 1.5 input.mgz output.mgz

# Histogram equalization against a template
mri_nlfilter -hmatch template.mgz input.mgz output.mgz

# Median filter with window size 5, no local offsets
mri_nlfilter -median -F 5 -N input.mgz output.mgz

# MINMAX filter without pre-blur (set sigma=0 via -blur)
mri_nlfilter -blur 0 input.mgz output.mgz
```

## Pipeline Context

`mri_nlfilter` is not a standard step in the main [[recon-all]] processing stream. It was historically used as a preprocessing step for segmentation, and may be invoked in custom scripts that require intensity-domain preprocessing or edge sharpening before surface reconstruction.

## Gotchas and Caveats

> [!gotcha] Bounding-box cropping is on by default
> The `crop = 1` default means the filter only operates within the bounding box of non-zero voxels. Use `-no_crop` to process the entire volume, which may be important when zero-valued boundary voxels are meaningful.

> [!gotcha] MINMAX filter depends on POLV normals
> The MINMAX filter internally computes a Gaussian-blurred copy of the input and the POLV (plane of least variance) orientation before applying the min-max decision. If the blurring sigma (`-sigma`) is set to zero, the POLV computation may become unstable in uniform regions.

> [!gotcha] Mean-masked filter requires non-standard argument ordering
> When `-t` selects the mean-masked filter, the command line argument order changes to `input mask_volume niter thresh output`, which deviates from the standard `input output` convention.

## Related Tools

- [[mri_polv]] — Computes the plane of least variance normal (POLV), used internally by the MINMAX filter
- [[mri_normalize]] — Intensity normalization pipeline tool

## Confidence and Gaps

**High confidence:** Full `get_option()` and `main()` functions read from source; all flags, argument counts, defaults, and filter-type name-to-constant mapping confirmed. The `-t <int>` flag and `-ow`/`-ol` flags in the previous version of this page do not exist in the source.

**Medium confidence:** The `FILTER_CPOLV_MEDIAN` type was seen in the switch statement but its exact behaviour (as distinct from MINMAX) was not fully traced through the library.
