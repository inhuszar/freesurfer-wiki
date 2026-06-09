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
last_agent_update: 2026-06-09
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
| `-norm fname` | file | — | Intensity-normalized volume for improved atlas matching |
| `-mask fname` | file | — | Brain mask; restricts optimization to masked region |
| `-fill val` | int | 0 | Fill value for removed facial voxels |
| `-mean N` | int | — | Replace defaced voxels with local NxNxN mean intensity |
| `-radius N` | int | 7 | Erase everything more than N mm from possible brain |
| `-noscale` | — | off | Skip intensity normalization |
| `-noiscale` | — | off | Skip independent intensity scaling |
| `-novar` | — | off | Do not use variance estimates from GCA |
| `-xform fname` | file | — | Use pre-computed transform instead of estimating |
| `-t fname` | file | — | Alias: use previously computed LTA transform |
| `-b sigma` | float | 0 | Blur input image with this sigma before optimization |
| `-transonly` | — | off | Only estimate translation parameters (no rotation or scaling) |
| `-center` | — | off | Use GCA centroid as origin of transform |
| `-dist val` | float | — | Weight for distance term (`l_dist`) |
| `-distance val` | float | — | Alias for `-dist` |
| `-area val` | float | — | Weight for area term (`l_area`) |
| `-nlarea val` | float | — | Weight for non-linear area term (`l_nlarea`) |
| `-intensity val` | float | — | Weight for intensity term (`l_intensity`) |
| `-corr val` | float | — | Alias for `-intensity` |
| `-levels N` | int | -1 | Number of multi-resolution levels (−1 = default) |
| `-nscales N` | int | 1 | Number of scales for optimal linear transform search |
| `-scales N` | int | 1 | Alias for `-nscales` |
| `-spacing N` | int | 8 | Maximum GCA atlas spacing |
| `-steps N` | int | 5 | Number of angular search steps |
| `-s N` | int | 5 | Alias for `-steps` (sets max_angles / MAX_TRANS_STEPS) |
| `-reduce N` | int | 1 | Number of times to reduce input images before aligning |
| `-num N` | int | 1 | Number of linear transforms to find |
| `-prior val` | float | MIN_PRIOR | Minimum prior threshold for GCA samples |
| `-nsamples fname` | file | — | Write normalized transformed sample control points to file |
| `-samples fname` | file | — | Write control points to file |
| `-fsamples fname` | file | — | Write transformed control points to file |
| `-isamples fname` | file | — | Alias for `-fsamples` |
| `-renorm fname` | file | — | Renormalize using predicted intensity values in file |
| `-write_mean fname` | file | — | Write GCA means volume to file |
| `-flash fname` | file | — | Use FLASH forward model with tissue parameters in file |
| `-example T1 seg` | 2 files | — | Use example T1 and segmentation to guide intensity |
| `-alpha deg` | float | — | Flip angle in degrees (FLASH imaging parameter) |
| `-tr msec` | float | — | Repetition time TR in milliseconds |
| `-te msec` | float | — | Echo time TE in milliseconds |
| `-contrast` | — | off | Use contrast to find labels |
| `-debug_label N` | int | — | Debug specific GCA label N |
| `-debug_voxel x y z` | 3 ints | — | Debug specific voxel |
| `-diag fname` | file | — | Open diagnostics file for writing |
| `-d tx ty tz` | 3 floats | 0 0 0 | Apply translation offset (tx, ty, tz) in mm |
| `-r rx ry rz` | 3 floats | 0 0 0 | Apply rotation angles (rx, ry, rz) in degrees |
| `-f fname` | file | — | Read manually defined control points from file |
| `-n N` | int | 25 | Number of EM alignment iterations |
| `-dt val` | float | 5e-6 | Time step for EM alignment |
| `-tol val` | float | 1e-3 | Convergence tolerance |
| `-m val` | float | 0.8 | Momentum for EM alignment |
| `-p pct` | float | 0.25 | Fraction of top WM points to use as control points |
| `-w N` | int | 0 | Write intermediate results every N iterations |

## Configuration Interactions

- `-mask` restricts optimization to the masked region.
- `-xform` / `-t` loads a previously computed LTA transform, skipping the registration step entirely and using the provided transform to localize the face directly.
- `-mean N` uses a local NxNxN mean intensity for fill instead of the fixed `-fill val`, producing a more naturalistic-looking defaced volume.
- `-b sigma` blurs the input before optimization; equivalent to what some documentation calls "blur sigma".
- `-transonly` restricts registration to translation only, which is faster but less accurate for significantly misaligned data.
- `-nscales` / `-scales` controls how many resolution scales are searched during optimal linear transform estimation.

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

Not called by [[wiki/pipelines/recon-all|recon-all]]. Applied before sharing data publicly or before processing if de-identification is required. Typically run on the original T1 before `recon-all`.

> [!gotcha] Run before recon-all
> `mri_deface` should be applied to the raw T1 input, not the FreeSurfer-processed outputs. Running it on `orig.mgz` after `recon-all` may require rerunning parts of the reconstruction pipeline.

## Gotchas and Caveats

> [!gotcha] May affect cortical surface reconstruction
> Removing facial voxels can alter the brain boundary near the orbits and temporal poles. In some cases, the defacing fill region may encroach on brain tissue, particularly in subjects with prominent temporal poles or thin skulls. Inspect the output before using it for cortical reconstruction.

> [!gotcha] Newer alternative available
> [[mri_defacer]] is a more modern defacing tool that uses a different (surface-based) approach. Prefer `mri_defacer` for new workflows.

## Related Tools

- [[mri_defacer]] — newer surface-based defacing tool
- [[mideface]] — modern "minimally invasive" defacing driver; the recommended successor to this legacy GCA-based tool
- [[deface_subject]] — one-line wrapper that runs `mri_deface` on a subject's `orig` volume with FreeSurfer's standard brain/face GCA atlases
- [[mri_em_register]] — shares the same GCA registration framework

## Confidence and Gaps

Confidence is **medium**. The overall approach and all CLI options are documented from the `get_option()` function. Detailed algorithm for `MRIremoveFace()` was not read.
