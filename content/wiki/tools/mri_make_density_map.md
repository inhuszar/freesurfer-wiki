---
title: "mri_make_density_map"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_make_density_map/mri_make_density_map.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact partial volume estimation algorithm not fully traced"
  - "Jacobian correction details unclear from code header only"
tags:
  - density
  - segmentation
  - attic
---

# mri_make_density_map

## Summary

`mri_make_density_map` applies a spatial transform (optionally with Jacobian correction) to a segmentation volume with partial volume estimates to construct a tissue density map. It projects label-specific partial-volume probability estimates from a segmentation space into a target space. This tool resides in the `attic/` directory, indicating it is legacy code not part of the active build.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_make_density_map/mri_make_density_map.cpp`
- **Author:** Bruce Fischl
- **Status note:** In the `attic/` subdirectory — not compiled into the standard FreeSurfer 8.2.0 build. Kept for historical reference.

## Purpose and Context

This tool was designed to support multi-subject atlas construction and group-level density analyses. By transforming segmentation volumes into a common space and optionally applying Jacobian volume correction, it converts discrete per-voxel segmentation labels into continuous tissue density maps suitable for voxel-based morphometry (VBM) style analyses. The Jacobian correction compensates for local volume changes introduced by a nonlinear warp.

The tool accepts a GCA morphological transform (GCAM) and can optionally smooth the resulting density map with a Gaussian kernel.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Segmentation volume | [[mgz]] / any MRI | Labeled segmentation (e.g., aseg.mgz) |
| Intensity volume | [[mgz]] | Corresponding intensity image |
| Transform file | `.m3z`, `.lta` | Spatial transform to target space |
| Target/template volume | [[mgz]] | Defines output geometry (optional, via `-like`) |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Density map | [[mgz]] | Continuous partial-volume tissue density in target space |

## Mathematical Foundations

For each label $l$ and voxel $\mathbf{x}$ in the source segmentation, the partial-volume estimate $p_l(\mathbf{x})$ is mapped to the target voxel $\mathbf{y} = T(\mathbf{x})$ where $T$ is the transform. With Jacobian correction enabled, the contribution is scaled by $|J_T(\mathbf{x})|$, the determinant of the Jacobian of the warp, preserving tissue volume under the transformation:

$$
\rho_l(\mathbf{y}) = \sum_{\mathbf{x}: T(\mathbf{x})=\mathbf{y}} p_l(\mathbf{x}) \cdot |J_T(\mathbf{x})|
$$

Optional Gaussian smoothing with kernel width $\sigma$ is applied post-warp to create continuous density fields.

The spatial resolution for accumulation is controlled by the `resolution` parameter (default 0.25 mm).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-like <fname>` | string | null | Use this volume's geometry for output |
| `-xform <fname>` | string | null | Apply this transform to segmentation |
| `-sigma <f>` | float | 0 | Gaussian smoothing sigma (mm) applied after warping |
| `-nreductions <n>` | int | 0 | Number of reductions applied to output resolution |
| `-surf` | flag | off | Use surface-based rather than volume-based mode |

## Configuration Interactions

- `-xform` and the positional `xform_fname` argument are both pathways to supply a transform; the positional argument takes precedence.
- `-surf` mode alters the processing pathway substantially — the density accumulation traverses surface vertices rather than volume voxels.
- `-sigma` > 0 enables a post-warp Gaussian blur; the blur is applied in the target space.

> [!gap] Jacobian correction activation
> The source code header mentions optional Jacobian correction but the flag to enable it explicitly is not identified from the header alone. Full argument parsing in `get_option()` would need to be reviewed.

## Typical Use Cases

```bash
# Create WM density map in MNI305 space
mri_make_density_map \
  subject/mri/aseg.mgz \
  subject/mri/norm.mgz \
  subject/mri/transforms/talairach.m3z \
  2 \
  density_WM.mgz
```

## Pipeline Context

This tool is **not** invoked in the standard `recon-all` pipeline. It was used in early group-level atlas building workflows predating modern tools such as `mri_volsynth` or FreeSurfer's group analysis utilities. The GCAM transform (`.m3z`) consumed here is the same format produced by [[mri_em_register]] and related tools.

## Gotchas and Caveats

> [!gotcha] Attic status
> This tool resides in `attic/` and is not compiled by the standard FreeSurfer CMake build. If you need to use it, it must be compiled manually. It may rely on API versions that have since changed.

> [!gotcha] Resolution parameter
> The internal `resolution` variable defaults to 0.25 mm and affects the sub-voxel accumulation grid. At coarser transform resolutions, artifacts in the density map can arise if this is not matched to the warp resolution.

## Related Tools

- [[mri_segment]] — produces the segmentation input
- [[mri_convert]] — for format conversions
- [[mri_em_register]] — produces GCA morphological transforms consumed here
- [[coordinate-systems]] — explains the scanner/Talairach coordinate systems relevant to the transform

## Confidence and Gaps

**Confident:** Tool purpose, input/output structure, Gaussian smoothing parameter, attic status.

**Less confident:** Jacobian correction flag, exact partial-volume algorithm, surface mode behaviour.

> [!gap] Surface mode
> The `-surf` flag triggers a different code path but the details are not documented in the header. The surface file argument positions are unclear without reading `get_option()` fully.
