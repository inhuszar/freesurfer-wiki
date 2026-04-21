---
title: "mri_make_uchar"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_convert/mri_make_uchar.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[mri_convert]]"
  - "[[mri_normalize]]"
  - "[[mri_nu_correct.mni]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Optional flags beyond positional args not confirmed from code header alone"
tags:
  - conversion
  - intensity-normalization
  - autorecon1
---

# mri_make_uchar

## Summary

`mri_make_uchar` converts an MRI volume to 8-bit unsigned character (uchar) format with white-matter-anchored intensity normalization. It uses the Talairach transform to locate a spherical brain region, estimates the white matter peak from the intensity histogram within that sphere, and scales the volume so that white matter maps to approximately intensity 110. The result is saved as a `UCHAR` (0–255) MGZ volume.

## Source Information

- **Language:** C++
- **Source file:** `mri_convert/mri_make_uchar.cpp`
- **Author:** Bruce Fischl

## Purpose and Context

In the `recon-all` autorecon1 pipeline, `mri_make_uchar` is called after N3/N4 bias correction to produce the final conformed, intensity-normalized 8-bit volume (`T1.mgz` or `nu.mgz` downstream). Converting to uchar reduces storage and processing overhead. The white-matter normalization ensures that downstream intensity-based tools (e.g., watershed skull stripping, EM segmentation) operate in a consistent intensity range regardless of scanner-specific scaling differences.

The Talairach transform is used to define a sphere of radius `MAX_R` (default 50 mm) centred on the brain, ensuring only brain voxels contribute to the white matter histogram estimate.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volume | [[mgz]] / any MRI | Floating-point or multi-byte MRI volume (e.g., after N3 correction) |
| Talairach transform | `.lta` | Linear transform to Talairach space; used to locate brain sphere |
| Output filename | string | Positional argument 3 |

**Usage:** `mri_make_uchar [options] <input.mgz> <talairach.lta> <output.mgz>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Uchar volume | [[mgz]] | 8-bit (0–255) intensity-normalized volume |

## Mathematical Foundations

The normalization procedure in `MRIconvertToUchar()`:

1. Apply the Talairach LTA to locate the brain centre in the input volume's voxel space.
2. Extract a sphere of radius `MAX_R` mm around the brain centre.
3. Build a cumulative histogram of voxel intensities within the sphere.
4. Find the intensity $I_1$ at the `FIRST_PERCENTILE` (default 1st percentile) — represents the near-black background cut-off.
5. Find the intensity $I_{WM}$ at the `WM_PERCENTILE` (default 90th percentile) — represents the white matter peak.
6. Compute a linear rescaling:

$$
I_{out} = \frac{I_{in} - I_1}{I_{WM} - I_1} \times 110
$$

7. Clip the result to [0, 255] and cast to `UCHAR`.

The target white matter value of 110 is a FreeSurfer convention and matches the expected intensity for downstream tools (particularly `mri_normalize` and `mri_em_register`).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (none documented in header) | — | — | Only positional args confirmed from source |

The following compile-time parameters can be modified but are not runtime flags:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `FIRST_PERCENTILE` | 0.01 | Bottom of the intensity range (background) |
| `WM_PERCENTILE` | 0.90 | Top of the intensity range (white matter) |
| `MAX_R` | 50.0 mm | Radius of brain sphere for histogram estimation |

> [!gap] Runtime flags
> The `get_option()` function exists but its contents are not shown in the first 120 lines of source. Additional flags beyond the three positional arguments may exist but are unconfirmed.

## Configuration Interactions

The tool's behaviour is primarily determined by the three positional arguments. The Talairach transform is mandatory — without a valid LTA, the brain sphere cannot be located and the histogram will include non-brain voxels, degrading WM estimation.

## Typical Use Cases

```bash
# Convert N3-corrected volume to uchar with WM normalization
mri_make_uchar \
  $SUBJECTS_DIR/bert/mri/nu.mgz \
  $SUBJECTS_DIR/bert/mri/transforms/talairach.lta \
  $SUBJECTS_DIR/bert/mri/T1.mgz
```

This is the typical invocation within `recon-all` autorecon1.

## Pipeline Context

Called in `recon-all` autorecon1 stage, after:
- [[mri_nu_correct.mni]] (N3 bias field correction)
- `talairach_avi` or [[mri_em_register]] (to produce the Talairach LTA)

The output feeds into:
- [[mri_normalize]] (intensity normalization using the GCA atlas)
- [[mri_watershed]] / [[mri_synthstrip]] (skull stripping)

## Gotchas and Caveats

> [!gotcha] WM target = 110 is a FreeSurfer hardcoded convention
> The value 110 for white matter intensity is assumed throughout the FreeSurfer pipeline. Deviations from this convention (e.g., if `mri_make_uchar` is run with incorrect parameters or a failed Talairach alignment) will cause failures in downstream EM-based segmentation tools.

> [!gotcha] Talairach LTA required even for conforming non-Talairach data
> The LTA is used only to locate the brain centre sphere for histogram estimation. It does not warp the output. However, if the LTA is of poor quality (e.g., a failed Talairach registration), the histogram will be biased.

> [!gotcha] Output is always uchar regardless of input type
> Even if the input has fractional intensities, the output is discretized to uint8. Precision below 1/110 of the WM value is lost.

> [!assumption] Input is conformable 1mm isotropic
> Expects a volume that has already been conformed to 1mm isotropic by `mri_convert --conform` (256×256×256 at 1mm). Non-conformed inputs are not explicitly rejected but may produce unexpected results.

## Related Tools

- [[mri_convert]] — lives in the same source directory; handles format conversion and initial conformation
- [[mri_normalize]] — intensity normalization step that follows in the pipeline
- [[mri_nu_correct.mni]] — N3 bias correction step that precedes this tool

## Confidence and Gaps

**Confident:** Core algorithm (sphere-based WM histogram normalization), Talairach sphere radius, percentile parameters, pipeline placement, output type.

**Less confident:** Whether additional runtime flags exist beyond the three positional arguments.
