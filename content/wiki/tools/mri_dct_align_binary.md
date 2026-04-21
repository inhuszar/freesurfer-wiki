---
title: "mri_dct_align_binary"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_dct_align/mri_dct_align_binary.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_dct_align]]"
  - "[[mri_distance_transform]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full option list requires reading get_option() which was not included in source read"
  - "Exact overlap/distance-transform cost metric not fully characterized"
tags:
  - registration
  - nonlinear
  - DCT
  - binary
  - label
---

# mri_dct_align_binary

## Summary

`mri_dct_align_binary` performs DCT-based nonlinear alignment specifically optimized for binary label volumes (e.g., angiography masks, vessel or structure segmentations). Unlike [[mri_dct_align]] which uses intensity-based cost, this tool uses voxel overlap (or distance transform) between binary source and target label volumes as the optimization metric.

## Source Information

- **Language:** C++
- **Source file:** `mri_dct_align/mri_dct_align_binary.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

When aligning binary segmentation masks (where intensity is meaningless — voxels are either 0 or 1), intensity-based cost functions are inappropriate. `mri_dct_align_binary` instead maximizes label overlap using either direct overlap counting or a distance-transform-based soft overlap metric. This is useful for:
- Aligning vessel or artery segmentations
- Registering binary structure masks to atlas templates
- Refining coarse label-based nonlinear registrations

The tool is oriented toward angiographic data (contains explicit angio/non-artery label constants in source) but is applicable to any binary mask alignment problem.

## Inputs

- **`source`**: binary source label volume
- **`target`**: binary target label volume
- **`output`**: output DCT parameter file

Optional: an affine LTA initialization (via `-lta`).

## Outputs

- DCT parameter file (text format)
- Optionally the aligned binary volume (`output.mgz`)

## Mathematical Foundations

**Overlap cost** (`compute_overlap`):

$$
C_\text{overlap} = -\frac{|S \cap T|}{|S \cup T|}
$$

where $S$ and $T$ are the sets of voxels labeled as target label in source and target respectively. This is the negative Jaccard index.

**Distance transform cost** (`compute_distance_transform_sse`):

$$
C_\text{dist} = \sum_{\mathbf{x} \in S} d_T(\mathbf{x})^2
$$

where $d_T(\mathbf{x})$ is the distance from source label voxel $\mathbf{x}$ to the nearest target label voxel.

The DCT coefficient optimization uses Powell's method (`powell_minimize`) with the voxel lists (`VOXEL_LIST`) of source and target label voxels as the data structures. DCT coefficients default to `Gncoef = 10` (more than [[mri_dct_align]]'s default of 5).

## Configuration Options

> [!gap] Options not fully enumerated
> The `get_option()` function was not read. Based on global variable definitions:

| Variable | Default | Likely flag | Description |
|----------|---------|-------------|-------------|
| `Gncoef` | 10 | `-ncoef` | Number of DCT coefficients |
| `skip` | 2 | `-skip` | Voxel subsampling step |
| `distance` | 1.0 | `-distance` | Distance threshold |
| `binary_label` | 128 | `-label` | Label value for binary mask |
| `target_label` | 128 | `-target_label` | Target label value |
| `apply_transform` | 1 | `-noapply` | Write aligned output |
| `pf_overlap` | `compute_overlap` | `-dt` (inferred) | Switch to distance-transform cost |

## Configuration Interactions

- The cost function can be switched between overlap and distance transform.
- `binary_label` and `target_label` control which voxel values are treated as "label" in source and target.

## Typical Use Cases

Align a binary vessel mask to a template:
```bash
mri_dct_align_binary source_vessels.mgz template_vessels.mgz warp.dct
```

## Pipeline Context

Specialized tool for vascular or binary-mask registration. Not called by [[recon-all]].

## Gotchas and Caveats

> [!gotcha] Only binary volumes
> The tool uses voxel list extraction for label voxels. Non-binary inputs (multi-label segmentations) will use only the target label value, ignoring other labels.

> [!gotcha] Angio-specific label list
> The source defines a hard-coded list of "non-artery" labels (venous structures from CMA) that are excluded during cost computation. For non-angiographic use, this filtering may inappropriately exclude some labels.

## Related Tools

- [[mri_dct_align]] — intensity-based DCT alignment
- [[mri_distance_transform]] — compute distance transforms used as cost

## Confidence and Gaps

Confidence is **medium**. Core algorithm concepts are clear. Full option list needs verification.
