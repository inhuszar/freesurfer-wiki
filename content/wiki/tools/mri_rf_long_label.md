---
title: "mri_rf_long_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_rf_long_label/mri_rf_long_label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_rf_label]]"
  - "[[mri_rf_long_train]]"
  - "[[mri_rf_train]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-23
audit_skip: true
gaps:
  - "Whether this tool is installed in FS 8.2.0"
  - "How longitudinal features differ from cross-sectional RF labeling"
tags:
  - random-forest
  - longitudinal
  - wmsa
  - deprecated
---

# mri_rf_long_label

## Summary

`mri_rf_long_label` is the longitudinal counterpart to [[mri_rf_label]]. It applies a trained longitudinal Random Forest Array (RFA) classifier to label voxels across multiple timepoints, incorporating temporal information (changes over time) as classification features. The source is in the `attic/` directory, indicating it is deprecated or superseded.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_rf_long_label/mri_rf_long_label.cpp`
- **Status:** Located in `attic/` — legacy/deprecated
- **Original author:** Bruce Fischl
- **Key includes:** `rfa.h`, `gca.h`, `gcamorph.h`, `mrisegment.h`, `mrinorm.h`

> [!gotcha] Attic directory
> The source is in `attic/mri_rf_long_label/`, meaning this tool is considered legacy in the current FreeSurfer codebase. Whether it is compiled and installed in FreeSurfer 8.2.0 is unknown.

## Purpose and Context

`mri_rf_long_label` applies a longitudinally-trained RFA (from [[mri_rf_long_train]]) to label voxels when multiple timepoints are available. The key difference from cross-sectional labeling ([[mri_rf_label]]) is that the classifier can use features derived from intensity differences across timepoints, making it more sensitive to subtle changes (e.g., new or enlarging WMSAs) than the single-timepoint classifier.

The code structure is nearly identical to `mri_rf_label`, with modifications to accept multiple input volumes (one per timepoint) and use the longitudinal RFA.

## Inputs

- Multiple MRI intensity volumes (one per timepoint)
- Trained longitudinal RFA file (from [[mri_rf_long_train]])
- GCA atlas file
- Talairach/LTA transform
- Output label volume path

## Outputs

- **Label volume:** Segmentation with longitudinally-informed WMSA labels

## Mathematical Foundations

The longitudinal RFA incorporates temporal features: in addition to the standard local intensity features at each timepoint, the classifier receives features encoding within-subject intensity changes between timepoints. This allows the classifier to identify voxels that have changed in a manner consistent with WMSA development.

> [!gap] Feature set details
> The exact longitudinal features are defined in the RFA training procedure ([[mri_rf_long_train]]); `mri_rf_long_label` applies the same feature computation at inference time.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-a` | `<n>` | 0 | Apply mean filter `n` times to conditional densities |
| `-alpha` | `<degrees>` | −1 | Override flip angle for all input volumes (converted to radians) |
| `-aseg` | `<vol>` | — | Read aseg volume for post-processing segmentation cleanup |
| `-conform` | — | off | Resample each input volume to 256³ at 1 mm isotropic before labeling |
| `-debug_label` | `<label>` | — | Enable debugging output for the specified label index |
| `-debug_node` | `<x> <y> <z>` | — | Enable debugging for the specified atlas node coordinates |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable per-voxel debugging at the given input voxel coordinates |
| `-f` | — | off | Apply gradient-direction second-derivative filter to input before labeling |
| `-m` | `<vol>` | — | Mask the final labeling with this volume (zero out voxels where mask < 1) |
| `-min_voxels` | `<n>` | 6 | Remove WMSA segments with fewer than `n` voxels during post-processing |
| `-nbrs` | `<rf_file>` | — | Read a second random forest and apply it to relabel voxels neighbouring existing WMSAs |
| `-nowmsa` | — | off | Disable WMSA labels in the output |
| `-pthresh` | `<float>` | −1 | Relabel voxels adjacent to WMSA whose p-value is below this threshold (region growing) |
| `-read_intensities` | `<fname>` | — | Read intensity scaling parameters from file; alias: `-ri` |
| `-ri` | `<fname>` | — | Read intensity scaling parameters from file; alias: `-read_intensities` |
| `-surface` | `<surf_fname>` | — | Remove WMSA voxels that are more than `surface_dist` mm interior to this surface (repeatable) |
| `-surface_dist` | `<float>` | 1.0 | Distance threshold in mm for WMSA surface-proximity removal |
| `-t` | `<float>` | 0.8 | WM prior threshold for building the candidate voxel set |
| `-te` | `<ms>` | −1 | Override echo time (TE) for all input volumes |
| `-thresh` | `<float>` | 0.0 | Only label voxels as WMSA if their random-forest p-value exceeds this threshold |
| `-tr` | `<ms>` | −1 | Override repetition time (TR) for all input volumes |
| `-wmsa` | — | off | Enable WMSA post-processing (relabeling with T2/PD data) |
| `-wmsa_whalf` | `<n>` | 3 | Only examine voxels within `n` voxels of a prior WMSA occurrence |

## Typical Use Cases

```bash
# Apply longitudinal WMSA labeling across two timepoints
mri_rf_long_label \
  tp1_T1.mgz tp2_T1.mgz \
  long_wmsa_classifier.rfa \
  wmsa_atlas.gca \
  transforms/talairach.lta \
  wmsa_long_labels.mgz
```

## Pipeline Context

This tool is not part of the standard [[recon-all]] pipeline. It would be used in longitudinal WMSA research workflows, typically after cross-sectional recon-all processing of each timepoint.

## Gotchas and Caveats

> [!gotcha] Deprecated tool in attic
> Use [[mri_rf_label]] for cross-sectional workflows. The longitudinal version in the attic may not be actively maintained or tested.

> [!gotcha] Requires longitudinal RFA
> The RFA must be trained with [[mri_rf_long_train]], not [[mri_rf_train]]. Cross-sectional and longitudinal RFAs are incompatible.

## Related Tools

- [[mri_rf_label]] — Cross-sectional RF labeling
- [[mri_rf_long_train]] — Trains the longitudinal RFA used by this tool
- [[mri_rf_train]] — Cross-sectional RF training

## Confidence and Gaps

**Medium confidence** — source was read from `attic/mri_rf_long_label/mri_rf_long_label.cpp`; all flags documented from `get_option()`. Attic status means the tool may not be compiled in FreeSurfer 8.2.0.

> [!gap] Installation status
> Whether `mri_rf_long_label` is compiled and installed in FreeSurfer 8.2.0 needs verification.
