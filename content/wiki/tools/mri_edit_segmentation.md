---
title: "mri_edit_segmentation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_edit_segmentation/mri_edit_segmentation.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_edit_segmentation_with_surfaces]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mri_ca_label]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Complete list of all MLE-based editing rules not documented"
  - "border_only and unknown_only mode behaviours not fully traced"
tags:
  - segmentation
  - editing
  - post-processing
---

# mri_edit_segmentation

## Summary

`mri_edit_segmentation` applies a set of rule-based post-processing corrections to an existing volumetric segmentation (such as an aseg produced by `mri_ca_label`), using the T1 intensity volume as additional evidence. It corrects specific regions including hippocampus, amygdala, caudate, lateral ventricles, cortical gray matter, and border voxels, using a Maximum Likelihood Estimation (MLE) approach based on local intensity statistics.

## Source Information

- **Source language:** C++
- **Source file:** `mri_edit_segmentation/mri_edit_segmentation.cpp`
- **Key dependencies:** `mri.h`, `cma.h`, `mrinorm.h` (FreeSurfer internal libraries)

## Purpose and Context

After automatic subcortical segmentation, boundary voxels between structures are sometimes misclassified due to partial-volume effects or intensity overlap. `mri_edit_segmentation` applies anatomy-specific rules to relabel ambiguous voxels. It targets regions known to be difficult for probabilistic atlases: the medial temporal lobe structures (hippocampus, amygdala), basal ganglia (caudate), ventricular boundaries, and cortical-subcortical interfaces.

## Inputs

Positional arguments (in order):
1. Input labeled volume (e.g., `aseg.mgz`)
2. T1 intensity volume (e.g., `brain.mgz` or `norm.mgz`)
3. Output labeled volume path

## Outputs

- Output labeled volume at path specified by argument 3, with edited segmentation labels.

## Mathematical Foundations

The core algorithm uses Maximum Likelihood Estimation: for ambiguous voxels, the tool computes which of two candidate labels ($l_1$, $l_2$) is more likely given local intensity statistics:

$$
\hat{l} = \arg\max_{l \in \{l_1, l_2\}} P(I | l) \cdot P(l | \text{neighbors})
$$

This is implemented in `mle_label()`. The tool also uses `change_label()` for deterministic rule-based relabeling based on neighbourhood context.

Region-specific editing functions:
- `edit_border_voxels()` — relabels voxels at structure borders
- `edit_ventricular_unknowns()` — reclaims "unknown" voxels adjacent to ventricles
- `edit_hippocampus()` — hippocampus-specific rules
- `edit_amygdala()` — amygdala-specific rules
- `edit_caudate()` — caudate-specific rules
- `edit_lateral_ventricles()` — lateral ventricle boundary rules
- `edit_cortical_gray_matter()` — cortical GM / subcortical interface rules

## Configuration Options

All flags are case-insensitive. The full `get_option()` has been read.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-unknown`<br>`-UNKNOWN` | — | off | Apply only the `edit_ventricular_unknowns()` correction; relabels "unknown" voxels between ventricle and WM or near hypointensities (sets `unknown_only=1`) |
| `-border`<br>`-BORDER` | — | off | Apply only the `edit_border_voxels()` correction (sets `border_only=1`) |
| `-no1d` | — | off | Disable 1-D intensity normalization prior to MLE computations; does not set any variable — the `printf` fires but no flag variable is changed (appears to be dead/incomplete code) |
| `-DEBUG_VOXEL <x> <y> <z>` | int×3 | disabled | Enable per-voxel diagnostic output for voxel (x, y, z); sets global `Gx`, `Gy`, `Gz` |
| `-u`<br>`-?` | — | — | Print usage and exit |

> [!gotcha] Dead code: `-no1d`
> The `-no1d` handler prints "disabling 1d normalization..." but does not set any flag variable. The 1-D normalisation is not actually disabled. This is a stub that was never completed.

## Configuration Interactions

- If neither `-unknown` nor `-border` is specified, all editing functions are applied in sequence.
- `-unknown` and `-border` are mutually exclusive via separate flags; only the first-matched branch applies if both were somehow set.
- `-no1d` has no effect (dead code).

## Typical Use Cases

```bash
# Apply all corrections
mri_edit_segmentation aseg.mgz norm.mgz aseg_edited.mgz

# Apply only border voxel corrections
mri_edit_segmentation -border aseg.mgz norm.mgz aseg_border_edited.mgz

# Apply only unknown voxel corrections near ventricles
mri_edit_segmentation -unknown aseg.mgz norm.mgz aseg_unk_edited.mgz
```

## Pipeline Context

`mri_edit_segmentation` may be applied after `[[mri_ca_label]]` to refine the aseg. It is not a standard `[[wiki/pipelines/recon-all|recon-all]]` step in recent FreeSurfer versions, having been largely superseded by more sophisticated approaches. It may be called from custom pipelines or research scripts.

## Gotchas and Caveats

> [!gotcha] Requires T1 volume as second argument
> The T1 intensity volume must be the raw or normalized T1, not a segmentation or binary mask. The MLE computations depend on actual intensity values.

> [!assumption] Assumes CMA label space
> The tool uses CMA (cortical-and-subcortical mapping) label indices from `cma.h`. Non-standard label maps are not supported.

## Related Tools

- `[[mri_edit_segmentation_with_surfaces]]` — surface-constrained segmentation editing
- `[[mri_edit_wm_with_aseg]]` — WM volume editing using aseg as prior
- `[[mri_ca_label]]` — generates the initial aseg segmentation

## Confidence and Gaps

**High confidence (flags):** All flags confirmed from complete reading of `get_option()`. The flag list is exhaustive: `-unknown`, `-border`, `-no1d` (dead code), `-DEBUG_VOXEL`, `-u`/`-?`. No additional option branches exist.

**Medium confidence (editing rules):** The complete set of MLE-based rules in each editing function (`edit_hippocampus`, `edit_amygdala`, etc.) was not fully traced.
