---
title: "mri_deface"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_deface/mri_deface.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_defacer]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "mri_deface requires two GCA atlas files (brain atlas and face atlas) whose paths are not documented"
  - "Exact face removal algorithm (region filled with what intensity/label) not confirmed"
  - "License bypass mechanism (SURF_ERROR_FRONT_DOOR) purpose unclear — may be legacy"
tags:
  - defacing
  - de-identification
  - privacy
  - gca
---

# mri_deface

## Summary

`mri_deface` removes facial features from an MRI volume to protect subject privacy. It uses two GCA (Gaussian Classifier Atlas) files — one for the whole brain and one trained on facial structures — to localize and replace the facial region with background values. This is the older of the two FreeSurfer defacing tools; see also [[mri_defacer]] for the newer approach.

## Source Information

- **Language:** C++
- **Source file:** `mri_deface/mri_deface.cpp`
- **Original author:** Not attributed in header (likely Bruce Fischl)
- **Note:** The source contains `sprintf(fname, "S%sER%sRONT%sOR", "URF", "_F", "DO"); setenv(fname,"1",0);` which bypasses license checking — likely a legacy workaround.

## Purpose and Context

Patient de-identification is a regulatory requirement for sharing neuroimaging data. `mri_deface` removes enough of the facial structure that subjects cannot be visually re-identified from 3D renderings while preserving brain tissue. The approach uses a probabilistic atlas of the face to localize facial voxels, then fills them with background intensity.

This tool uses the GCA machinery shared with [[mri_em_register]] for registration-based face localization.

## Inputs

Positional arguments:
1. **`gca_fname`**: path to the brain GCA atlas file
2. **`gca_face_fname`**: path to the face GCA atlas file
3. **`in_fname`**: input MRI volume to deface
4. **`out_fname`**: output defaced volume

## Outputs

- **`out_fname`**: the defaced MRI volume with facial voxels replaced by background (fill value)

## Mathematical Foundations

The defacing pipeline:
1. Registers the input volume to the brain GCA atlas using GCA-based registration (`register_mri()` with multi-scale optimization), producing an affine transform.
2. Uses the face GCA atlas and the transform to localize voxels belonging to facial structures.
3. Calls `MRIremoveFace()` to replace facial voxels with `fill_val` (default 0), using `fill_brain_volume()` to protect brain tissue near the face from being incorrectly removed.

The registration uses the same framework as [[mri_em_register]]: multi-scale linear optimization over intensity samples drawn from the GCA atlas, with excluded labels (hippocampus, amygdala, basal ganglia) to avoid biasing the registration on highly variable structures.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-norm fname` | file | none | Normalized volume (uses different intensity model) |
| `-mask fname` | file | none | Brain mask |
| `-fill val` | int | 0 | Fill value for removed facial voxels |
| `-mean` | — | off | Use mean intensity of neighborhood for fill |
| `-radius N` | int | 7 | Radius of fill region around face voxels |
| `-noscale` | — | off | Skip intensity normalization |
| `-noiscale` | — | off | Skip independent intensity scaling |
| `-xform fname` | file | none | Use pre-computed transform instead of estimating |
| `-blur sigma` | float | 0 | Blur sigma before optimization |
| `-translation_only` | — | off | Only estimate translation (no rotation) |

> [!gap] Full option list
> The `get_option()` function in the source was not fully read. The table above is partially reconstructed from global variable declarations. Additional options may exist.

## Configuration Interactions

- `-mask` restricts optimization to the masked region.
- `-xform` skips the registration step and uses the provided transform to localize the face directly.
- `-mean` uses local mean intensity for fill instead of `-fill val`, producing a more naturalistic-looking defaced volume.

## Typical Use Cases

Deface a T1 volume:
```bash
mri_deface \
  $FREESURFER_HOME/average/talairach_mixed_with_skull.gca \
  $FREESURFER_HOME/average/face.gca \
  T1.mgz \
  T1_defaced.mgz
```

> [!gap] GCA file paths
> The standard locations for the brain and face GCA files in FreeSurfer 8.2.0 have not been verified. They may be in `$FREESURFER_HOME/average/`. Check the FreeSurfer distribution.

## Pipeline Context

Not called by [[recon-all]]. Applied before sharing data publicly or before processing if de-identification is required. Typically run on the original T1 before `recon-all`.

> [!gotcha] Run before recon-all
> `mri_deface` should be applied to the raw T1 input, not the FreeSurfer-processed outputs. Running it on `orig.mgz` after `recon-all` may require rerunning parts of the reconstruction pipeline.

## Gotchas and Caveats

> [!gotcha] May affect cortical surface reconstruction
> Removing facial voxels can alter the brain boundary near the orbits and temporal poles. In some cases, the defacing fill region may encroach on brain tissue, particularly in subjects with prominent temporal poles or thin skulls. Inspect the output before using it for cortical reconstruction.

> [!gotcha] Newer alternative available
> [[mri_defacer]] is a more modern defacing tool that uses a different (surface-based) approach. Prefer `mri_defacer` for new workflows.

## Related Tools

- [[mri_defacer]] — newer surface-based defacing tool
- [[mri_em_register]] — shares the same GCA registration framework

## Confidence and Gaps

Confidence is **medium**. The overall approach is clear from the main() function and function declarations. Detailed algorithm for `MRIremoveFace()` was not read.
