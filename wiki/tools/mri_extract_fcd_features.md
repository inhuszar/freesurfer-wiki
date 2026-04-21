---
title: "mri_extract_fcd_features"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_extract_fcd_features/mri_extract_fcd_features.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mris_anatomical_stats]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Complete set of extracted features not documented; requires reading full source"
tags:
  - fcd
  - cortical-dysplasia
  - features
  - classification
---

# mri_extract_fcd_features

## Summary

`mri_extract_fcd_features` extracts per-vertex (surface-based) and per-voxel features from a reconstructed FreeSurfer subject directory for use as input to a Focal Cortical Dysplasia (FCD) classifier. Features include MRI intensity profiles relative to surface distance, FLAIR intensity ratios, and surface distance-based probability measures. Author: Bruce Fischl.

## Source Information

- **Source language:** C++
- **Source file:** `mri_extract_fcd_features/mri_extract_fcd_features.cpp`
- **Key dependencies:** `mri.h`, `mrisurf.h`, `cma.h`, `label.h`, `histo.h`

## Purpose and Context

Focal Cortical Dysplasia is a malformation of cortical development that can be challenging to detect on standard MRI. Automated detection requires extracting morphometric and intensity features from the cortical surface and nearby white matter. This tool computes those features from a fully reconstructed FreeSurfer subject directory and writes them to a feature volume for input to a downstream FCD classifier. It requires a complete `recon-all` reconstruction.

## Inputs

Positional arguments (in order):
1. Subject name (must exist in `SUBJECTS_DIR`)
2. Hemisphere (`lh` or `rh`)
3. Output feature volume path

Default input volumes (relative to subject's `mri/` directory):
- `norm.mgz` — normalized T1
- `ribbon.mgz` — cortical ribbon mask
- `aparc+aseg.mgz` — parcellation + segmentation
- `aseg.mgz` — subcortical segmentation
- `FLAIR.masked.mgz` — optional masked FLAIR image

Default surface files (relative to `surf/`):
- `<hemi>.white`, `<hemi>.pial` — cortical surfaces
- `<hemi>.sphere.d1.left_right` — spherical registration

Default label file:
- `<hemi>.cortex.label`

`SUBJECTS_DIR` must be set.

## Outputs

- Multi-frame feature volume at the specified output path. Each frame corresponds to one feature type.

## Mathematical Foundations

Three classes of features are computed:

1. **Surface distance probability maps** (`MRIcomputeSurfaceDistanceProbabilities()`): At each voxel, computes the probability of the voxel's intensity given its distance from the white or pial surface, using the ribbon and aseg as spatial reference.

2. **Surface distance intensity profiles** (`MRIcomputeSurfaceDistanceIntensities()`): Samples MRI intensities at varying distances from the cortical surface, using a neighbourhood half-width `whalf = 5` by default.

3. **FLAIR intensity ratio** (`MRIcomputeFlairRatio()`): Computes the ratio of FLAIR to T1 intensity at each surface vertex, using the cortical ribbon mask and aseg.

Optional averaging of features over a neighbourhood: `navgs = 0` by default (no smoothing).

## Configuration Options

**Usage:** `mri_extract_fcd_features [options] <subject> <hemi> <output_file>`

Flags are parsed by a custom `get_option()` function using `stricmp` (case-insensitive). Flags use a single leading dash; the full string (after stripping the dash) is matched against option names. The `-V` and `-W` short flags are single-character variants of `-VOL`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-SDIR` / `-sdir` | `dir` | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `-VNO` | `int` | — | Diagnostic vertex number (`Gdiag_no`). |
| `-PIAL` | `string` | `pial` | Name of the pial surface file (in `surf/`). |
| `-WHITE` | `string` | `white` | Name of the white surface file (in `surf/`). |
| `-VOL` / `-V` / `-v` | `string` | `norm.mgz` | Name of the intensity volume (in `mri/`). |
| `-A` / `-a` | `float` | `0` | Number of smoothing iterations applied after feature extraction (`navgs`). Note: parsed via `atof()`. |
| `-W` / `-w` | `int` | `5` | Neighbourhood half-width (`whalf`) for intensity sampling around surfaces. |

> [!gotcha] Missing flags for ribbon, aparc, aseg, flair, cortex, sphere
> Despite these being configurable via global variable initializations in the source (`ribbon_name`, `aparc_name`, `aseg_name`, `flair_name`, `cortex_label`, `sphere_name`), **none of these have corresponding command-line flags** in `get_option()`. They can only be changed by modifying and recompiling the source. The wiki previously listed these as settable flags — this was incorrect.

## Configuration Interactions

- FLAIR features require `FLAIR.masked.mgz` to exist (hardcoded path relative to subject's `mri/` directory); if absent the tool will fail.
- `-W`/`-w` controls the depth of cortical intensity sampling (neighbourhood half-width in voxels).
- `-A`/`-a` smooths feature values over the surface after extraction; default 0 means no smoothing.

## Typical Use Cases

```bash
# Extract FCD features for left hemisphere
mri_extract_fcd_features sub01 lh sub01_lh_fcd_features.mgz

# With custom white/pial surface names and smoothing
mri_extract_fcd_features -WHITE white.preaparc -PIAL pial -A 5 sub01 lh features.mgz
```

## Pipeline Context

Not called by `[[recon-all]]`. Requires a complete recon-all reconstruction. The output features are passed to an FCD classifier (external to FreeSurfer).

## Gotchas and Caveats

> [!assumption] Requires complete recon-all reconstruction
> All cortical surfaces, segmentations, ribbon, and the sphere registration must be present. Partial reconstructions will cause errors.

> [!gotcha] FLAIR is optional but recommended
> Without a FLAIR volume, FLAIR-ratio features cannot be computed. The tool may proceed with zeros for those features or may error depending on implementation.

## Related Tools

- `[[mris_anatomical_stats]]` — computes surface-based morphometric statistics
- `[[mri_edit_wm_with_aseg]]` — called with `-fcd` flag for FCD-specific WM editing

## Confidence and Gaps

**Confident (from code):** Complete flag list confirmed from `get_option()`. Several flags previously listed (ribbon, aparc, aseg, flair, cortex, sphere) do NOT exist and were removed.

**Uncertain:** Complete feature set and output volume frame ordering require reading the full bodies of `MRIcomputeSurfaceDistanceProbabilities`, `MRIcomputeSurfaceDistanceIntensities`, and `MRIcomputeFlairRatio`.
