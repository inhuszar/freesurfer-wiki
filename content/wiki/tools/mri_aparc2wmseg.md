---
title: "mri_aparc2wmseg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_aparc2wmseg/mri_aparc2wmseg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_aparc2aseg]]"
  - "[[mris_ca_label]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Tool described as 'not yet tested' in its own help string — production readiness is unclear"
tags:
  - white-matter
  - parcellation
  - segmentation
---

# mri_aparc2wmseg

## Summary

`mri_aparc2wmseg` creates a white-matter parcellation volume by projecting the cortical surface annotation (`aparc`) onto subcortical white matter voxels. For each voxel in the `aseg` that is labeled as white matter (label 2 = left WM, label 41 = right WM), the tool finds the nearest vertex on the `lh.white` or `rh.white` surface and assigns the WM voxel the parcellation label of that vertex, offset by the standard hemi base (1000 for lh, 2000 for rh). All non-WM voxels retain their original `aseg` label.

## Source Information

- **Language:** C++
- **Source file:** `mri_aparc2wmseg/mri_aparc2wmseg.cpp`

> [!gotcha] Stability warning
> The tool's own `print_help()` function prints "WARNING: this program is not yet tested!" before exiting. Treat outputs with caution and verify against [[mri_aparc2aseg]] if possible.

## Purpose and Context

The standard `aparc+aseg` produced by [[mri_aparc2aseg]] assigns cortical labels to gray matter and leaves white matter as undifferentiated label 2 (lh) or 41 (rh). `mri_aparc2wmseg` extends the parcellation into white matter, producing a WM segmentation where each WM voxel inherits the label of the nearest cortical surface vertex. This is useful for tractography, WM parcellation-based connectivity analyses, and per-region WM morphometry.

The relationship to the companion tool [[mri_aparc2aseg]] is direct: where `mri_aparc2aseg` maps annotations to the full brain volume, `mri_aparc2wmseg` focuses exclusively on WM voxels in an existing aseg.

## Inputs

- `SUBJECTS_DIR/<subject>/surf/lh.white` and `rh.white`
- `SUBJECTS_DIR/<subject>/label/lh.aparc.annot` and `rh.aparc.annot`
- `SUBJECTS_DIR/<subject>/mri/aseg.mgz` (also tries `.mgh` and COR format)

The `SUBJECTS_DIR` environment variable must be set.

## Outputs

- A single WM segmentation volume specified by `--wmseg`. The geometry is identical to the input `aseg`. Non-WM voxels carry their original aseg values; WM voxels carry `<parcellation_index> + <hemi_offset>` where hemi_offset is 1000 (lh) or 2000 (rh).

## Mathematical Foundations

For each white matter voxel at column-row-slice $(c, r, s)$:

1. Convert CRS to Surface RAS using the tkregister vox2ras matrix $M_{vox2ras}$:
$$
   \mathbf{r} = M_{vox2ras} \begin{pmatrix} c \\ r \\ s \\ 1 \end{pmatrix}
$$

2. Find the nearest vertex in the lh.white hash table with distance $d_{lh}$ and in the rh.white hash table with distance $d_{rh}$.

3. Assign the annotation of the closest surface:
$$
   \text{label}(c,r,s) = \text{annotid}(\text{nearest vertex}) + \begin{cases} 1000 & \text{if } d_{lh} < d_{rh} \\ 2000 & \text{otherwise} \end{cases}
$$

The hash table `MHTcreateVertexTable_Resolution(..., 16)` enables $O(1)$ average-case nearest-vertex lookup.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s <subject>` | string | required | Subject name |
| `--wmseg <file>` | string | required | Output WM segmentation file path |
| `--debug` | flag | off | Enable verbose debug output |
| `--help` | flag | — | Print usage |
| `--version` | flag | — | Print version string |

## Configuration Interactions

The tool has a minimal interface. `--s` and `--wmseg` are the only required arguments. The annotation is hardcoded to `aparc`; there is no option to substitute a different parcellation.

> [!gap] Hardcoded aparc annotation
> The annotation filename is hardcoded as `lh.aparc.annot` / `rh.aparc.annot`. There is no `--annotation` flag, making it impossible to use `aparc.a2009s` or custom parcellations without modifying the source.

## Typical Use Cases

**Produce WM parcellation for subject bert:**
```bash
mri_aparc2wmseg --s bert \
  --wmseg $SUBJECTS_DIR/bert/mri/aparc.wmseg.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Intended as a post-processing step after the cortical parcellation is complete (after [[mris_ca_label]] has produced `lh.aparc.annot`/`rh.aparc.annot`). The output can be used by tractography pipelines that require labeled WM.

## Gotchas and Caveats

> [!gotcha] Untested tool
> The source code's `print_help()` explicitly states the program is "not yet tested." Results should be validated carefully.

> [!gotcha] RH annotation lookup bug
> In the source code, when the RH surface is closer, the annotation is looked up using `lhwhite->ct` (left hemisphere color table) for the right hemisphere annotation ID. This is almost certainly a copy-paste bug and may produce incorrect annotation IDs for RH voxels:
> ```cpp
> if (rhwhite->ct)
>   CTABfindAnnotation(lhwhite->ct, annot, &annotid);  // should be rhwhite->ct
> ```

> [!gotcha] Voxels equidistant from both hemispheres
> When `dlhw == drhw`, the right hemisphere branch is taken (the `else` clause), so ties favor the right hemisphere.

## Related Tools

- [[mri_aparc2aseg]] — maps cortical parcellation to all brain tissue, not just WM
- [[mris_ca_label]] — produces the aparc annotation consumed by this tool
- [[mri_label2vol]] — alternative route for projecting labels to volume

## Confidence and Gaps

Source code fully read. Confidence is medium due to the documented instability and apparent RH color table bug.

> [!gap] Production status
> It is unclear whether this tool is used in any released FreeSurfer pipeline or whether it has been superseded by [[mri_aparc2aseg]] with WM labeling options.
