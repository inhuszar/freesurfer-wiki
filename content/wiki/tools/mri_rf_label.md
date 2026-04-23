---
title: "mri_rf_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_rf_label/mri_rf_label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_rf_train]]"
  - "[[mri_ca_label]]"
  - "[[mri_segment]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Whether this tool is used in any recon-all stage"
tags:
  - segmentation
  - random-forest
  - classification
  - wmsa
---

# mri_rf_label

## Summary

`mri_rf_label` applies a trained Random Forest Array (RFA) classifier to label voxels in an MRI volume. It is the classification counterpart to [[mri_rf_train]]. The primary application is white matter signal abnormality (WMSA) labeling, where the random forest classifier assigns voxels to either normal white matter or WMSA classes based on local intensity features. Optional post-processing steps include removing small WMSA clusters and constraining WMSA labels near surfaces.

## Source Information

- **Language:** C++
- **Source file:** `mri_rf_label/mri_rf_label.cpp`
- **Original author:** Bruce Fischl
- **Key includes:** `rfa.h`, `gca.h`, `gcamorph.h`, `mrisegment.h`
- **Key functions:** `label_with_random_forest()`, `relabel_wmsa_nbrs_with_random_forest()`, `postprocess_segmentation_with_aseg()`, `postprocess_grow_wmsas()`

## Purpose and Context

Random forest classification in FreeSurfer is used to identify white matter signal abnormalities (WMSAs, also called white matter hyperintensities). The classifier is trained using [[mri_rf_train]] on labeled training data, and `mri_rf_label` applies the trained RFA model to new subjects.

The labeling can be done in standard mode (applying the RFA to all voxels) or in WMSA neighbor mode (only relabeling voxels adjacent to existing WMSA labels, for refinement). Post-processing options:
- Remove WMSA clusters below a minimum size
- Constrain WMSA labels based on the aseg segmentation
- Grow WMSA regions to neighboring white matter voxels based on probability thresholds
- Remove WMSAs too close to the cortical surface

## Inputs

| Input | Description |
|-------|-------------|
| Input MRI volume(s) | One or more intensity input volumes (e.g., T1, T2, FLAIR) |
| RFA file | Trained random forest array (from [[mri_rf_train]]) |
| [[gca-format|GCA file]] | Gaussian classifier atlas for prior probability computation |
| Transform | Talairach/LTA transform to atlas space |
| Labeled output path | Destination for the labeled volume |

## Outputs

- **Label volume:** A segmentation volume with WMSA voxels marked with the WM-signal-abnormality label
- **Optional p-value volume:** Probability map for WMSA classification

## Mathematical Foundations

The Random Forest Array (RFA) is a spatially organized ensemble of random forest classifiers. Each node in the RFA corresponds to a region of atlas space and contains a classifier trained on local intensity features.

For classification:
1. Each input voxel is mapped to atlas space using the Talairach transform.
2. The corresponding RFA node's classifier is applied to the local intensity feature vector.
3. The classifier outputs a class probability and label assignment.

Post-processing filters:
- **Minimum size filter:** Remove WMSAs with fewer than `min_voxels` (default: 6) voxels.
- **Surface proximity filter:** Remove WMSA voxels within `surface_dist` (default: 1 mm) of the cortical surface.
- **WMSA growth:** Grow WMSA regions to neighboring WM voxels if $p > \text{pthresh}$.

## Configuration Options

All flags are case-insensitive (`stricmp`). The flag list is verified from `get_option()` in the source.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-aseg` | `<fname>` | — | Load an aseg segmentation from `fname` for post-processing constraints. |
| `-nbrs` | `<fname>` | — | Read an RFA classifier from `fname` and apply it only to voxels adjacent to existing WMSA labels (refinement pass). |
| `-min_voxels` | `<int>` | `6` | Remove WMSA clusters with fewer than this many voxels. |
| `-surface` | `<name>` | — | Surface name whose distance defines the WMSA proximity constraint (repeatable, up to `MAX_SURFACES`). |
| `-surface_dist` | `<float>` | `1.0` | Remove WMSA voxels within this distance (mm) interior to the specified surfaces. |
| `-nowmsa` | (none) | off | Remove all WMSA labels from the atlas before classification. |
| `-wmsa` | (none) | off | Enable WMSA relabeling post-processing step. |
| `-conform` | (none) | off | Resample input volume(s) to 256³ at 1 mm isotropic before labeling. |
| `-thresh` | `<float>` | — | Only label voxels as WMSA if the random forest WMSA probability exceeds this threshold. |
| `-pthresh` | `<float>` | — | Relabel voxels adjacent to WMSA regions whose p-value is below this threshold. |
| `-wmsa_whalf` | `<int>` | — | Only examine voxels within this many voxels of an existing WMSA label. |
| `-TR` | `<float>` | — | FLASH sequence repetition time (ms). |
| `-TE` | `<float>` | — | FLASH sequence echo time (ms). |
| `-ALPHA` | `<float>` | — | FLASH sequence flip angle (degrees; converted internally to radians). |
| `-read_intensities`<br>`-ri` | `<fname>` | — | Read intensity scaling from `fname` (repeatable). |
| `-T` | `<float>` | `0.8` | WM atlas prior threshold; only voxels with WM prior ≥ this value are treated as WM candidates. |
| `-V` | `<int>` | — | Set `Gdiag_no` for verbose diagnostics at a specific label number. |
| `-A` | `<int>` | — | Apply this many mean-filter passes to conditional densities. |
| `-M` | `<fname>` | — | Apply binary mask from `fname` to the final labeling. |
| `-F` | (none) | off | Apply mode filter post-processing to labeling output. |
| `-1` | `<gca_fname>` | — | Use a single global classifier (not RFA) loaded from `gca_fname`. |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable verbose debugging for input voxel at `(x, y, z)`. |
| `-debug_node` | `<x> <y> <z>` | — | Enable verbose debugging for atlas node at `(x, y, z)`. |
| `-debug_label` | `<label>` | — | Enable verbose debugging for a specific label index. |

> [!gotcha] Dead code: `-F` filter with threshold
> The `-F` (filter) case in `get_option()` contains a `#if 0` block that originally read a filter count and threshold value (2 args). In the current code, `-F` simply sets `filter = 1` with no argument. The full filter-with-threshold form is compiled out.

## Configuration Interactions

- `-wmsa` enables WMSA-specific post-processing; `-nowmsa` removes all WMSA labels from the atlas (opposite operations; mutually exclusive).
- `-nbrs <fname>` restricts classification to voxels adjacent to existing WMSA labels; useful for WMSA refinement in a second pass. (Note: the wiki previously listed this as `-only_nbrs_rf` but the actual flag is `-nbrs`.)
- `-pthresh` is only used when post-processing WMSA growth is enabled; without a threshold, no growth is applied.
- Multiple `-surface` flags can be specified (up to `MAX_SURFACES`) to constrain WMSA distance from multiple surfaces.

## Typical Use Cases

```bash
# Apply WMSA random forest labeling
mri_rf_label -wmsa \
  T1.mgz T2.mgz \
  wmsa_classifier.rfa \
  wmsa_atlas.gca \
  transforms/talairach.lta \
  wmsa_labels.mgz
```

## Pipeline Context

`mri_rf_label` is not a standard step in [[recon-all]]. It is used in research workflows for WMSA (white matter hyperintensity) detection and labeling, typically after the main recon-all processing is complete.

## Gotchas and Caveats

> [!gotcha] Requires trained RFA
> The RFA classifier file must be trained first using [[mri_rf_train]]. No default classifier is provided by the tool itself.

> [!gotcha] GCA and RFA must match
> The GCA atlas and the RFA were trained together; mixing classifiers from different training runs will produce incorrect results.

## Related Tools

- [[mri_rf_train]] — Trains the RFA used by this tool
- [[mri_ca_label]] — Atlas-based labeling (alternative approach)
- [[mri_segment]] — White matter segmentation

## Confidence and Gaps

**High confidence:** Source language, file, key functions, post-processing options (min_voxels default=6, surface_dist default=1.0, wmsa logic). Flag list verified from `get_option()` in source.

> [!note] Audit noise: `-1` false positive
> An automated audit may flag `-1` as C3 invalid. This IS a valid flag (`case '1':` in the source switch-on-first-char parser). The extractor skips digit-only case values when extracting flags, so it doesn't find `-1` in source. The flag is confirmed valid.
