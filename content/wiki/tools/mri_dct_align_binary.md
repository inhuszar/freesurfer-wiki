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
last_agent_update: 2026-04-22
gaps:
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

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-debug_voxel` | `<x> <y> <z>` | — | Enable per-voxel debugging at the given voxel coordinates |
| `-cj` | — | off | Constrain the Jacobian; sets `ratio_thresh=0.25` and disables negative-vertex allow |
| `-neg` | — | off | Allow negative vertices during morphing |
| `-morph_to` | — | off | Morph source to atlas space instead of the default |
| `-find_label` | `<label> <x> <y> <z>` | — | Find a specific CMA label near the given RAS coordinates |
| `-distance` | — | — | Use distance-transform SSE as the overlap cost instead of direct overlap counting |
| `-scale_smoothness` | `<0\|1>` | 1 | Scale the smoothness coefficient; also sets `npasses=2` |
| `-momentum` | — | — | Use fixed time-step integration (alias: `-fixed`) |
| `-fixed` | — | — | Use fixed time-step integration (alias: `-momentum`) |
| `-levels` | `<n>` | — | Number of multi-resolution levels |
| `-area` | `<float>` | — | Area term weight (`l_area`) |
| `-tol` | `<float>` | — | Convergence tolerance |
| `-si` | `<float>` | — | Smooth GCA morph intensities with the given sigma |
| `-sigma` | `<float>` | — | Sigma parameter for GCA morph |
| `-rthresh` | `<float>` | — | Jacobian compression ratio threshold |
| `-dt` | `<float>` | — | Integration time step |
| `-passes` | `<n>` | 2 | Number of integration passes |
| `-skip` | `<n>` | 2 | Voxel subsampling step for source/target voxel lists |
| `-hippo` | — | off | Assume source is a high-resolution hippocampal volume and target is an aseg; sets `navgs=1024`, `sigma=0`, `l_distance=0` |
| `-none` | — | off | Make no assumptions about label type (neither angio nor hippo) |
| `-wm` | — | off | Assume source and target are white-matter volumes |
| `-upsample` | `<n>` | — | Upsample the GCA morph `n` times |
| `-a` | `<n>` | — | Smooth gradient with the given number of averages (`navgs`) |
| `-b` | `<float>` | — | Binary term weight (`l_binary`) |
| `-f` | `<n>` | — | Apply `n` mode filters before writing the transformed volume |
| `-i` | `<fname>` | — | Read intensity image from file for debugging |
| `-j` | `<float>` | — | Jacobian term weight (`l_jacobian`) |
| `-k` | `<float>` | — | Exponential `k` parameter (`exp_k`) |
| `-l` | `<label>` | Right\_Hippocampus | Use named aseg label as the target structure (sets mode to LABEL) |
| `-m` | `<float>` | — | Momentum value |
| `-n` | `<n>` | 10 | Number of DCT coefficients |
| `-p` | `<n>` | 1 | Padding of source bounding box in voxels (`PADVOX`) |
| `-t` | `<fname>` | — | Read initial affine transform from file |
| `-view` | `<x> <y> <z>` | — | Set the viewing voxel coordinates for diagnostic output (`Gsx`, `Gsy`, `Gsz`) |
| `-w` | `<n>` | — | Write snapshot every `n` iterations (enables `DIAG_WRITE`) |

## Configuration Interactions

- The cost function can be switched between overlap and distance transform.
- `binary_label` and `target_label` control which voxel values are treated as "label" in source and target.

## Typical Use Cases

Align a binary vessel mask to a template:
```bash
mri_dct_align_binary source_vessels.mgz template_vessels.mgz warp.dct
```

## Pipeline Context

Specialized tool for vascular or binary-mask registration. Not called by [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] Only binary volumes
> The tool uses voxel list extraction for label voxels. Non-binary inputs (multi-label segmentations) will use only the target label value, ignoring other labels.

> [!gotcha] Angio-specific label list
> The source defines a hard-coded list of "non-artery" labels (venous structures from CMA) that are excluded during cost computation. For non-angiographic use, this filtering may inappropriately exclude some labels.

## Related Tools

- [[mri_dct_align]] — intensity-based DCT alignment
- [[mri_distance_transform]] — compute distance transforms used as cost

## Confidence and Gaps

Confidence is **medium**. Core algorithm concepts are clear from source. All flags documented from `get_option()`. Cost metric details need further characterisation.
