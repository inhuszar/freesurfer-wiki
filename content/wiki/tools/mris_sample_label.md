---
title: "mris_sample_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_sample_label/mris_sample_label.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_label2vol]]"
  - "[[mri_annotation2label]]"
  - "[[mris_sample_parc]]"
  - "[[mri_label2label]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The label sampling algorithm (how MGZ voxels are converted to vertex membership) not read in detail — LabelfromASeg() logic needs examination."
tags:
  - surface
  - label
  - sampling
  - coordinates
---

# mris_sample_label

## Summary

`mris_sample_label` samples a label file onto a surface, associating label membership with surface vertices. It takes a label file (either a FreeSurfer `.label` file or an MGZ segmentation volume) and a surface, and produces an output label file where vertices within the label region are listed with their surface coordinates. When the input is an MGZ segmentation, it uses `LabelfromASeg()` to extract vertices whose corresponding voxels match a specified label value.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_sample_label/mris_sample_label.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_sample_label`

## Purpose and Context

Surface labels define regions of interest on cortical or subcortical surfaces. `mris_sample_label` converts between two label representations:

1. A volumetric MGZ label (a segmentation volume with integer labels) → surface vertex membership.
2. A `.label` file → surface vertex membership (identity mapping; preserves and potentially interpolates vertex positions).

The output label file is in FreeSurfer binary `.label` format, usable with other label-based tools and in [[freeview]].

## Inputs

### Required Inputs

(Positional arguments: `<in_label> <surf> <out_label>`)

- **`<in_label>`** — input label: either a `.label` file (FreeSurfer label format) or an `.mgz` volume (segmentation). File type is determined by the extension.
- **`<surf>`** — surface file to project onto. Vertex coordinates are saved from this surface.
- **`<out_label>`** — output `.label` file.

### Input Assumptions

> [!assumption] MGZ input is a segmentation volume
> When the input has a `.mgz` extension, it is treated as a segmentation volume (integer-valued). The tool calls `LabelfromASeg(mri, voxval)` to extract vertices matching `voxval`.

> [!assumption] Surface coordinate system
> The surface vertex positions are stored in surface RAS (tkRAS) coordinates. See [[coordinate-systems]].

## Outputs

### Files Created

- **Output label** — FreeSurfer binary label file (see [[label-format]]) listing vertex indices and surface RAS coordinates of all vertices in the label.

## Mathematical Foundations

When input is a `.label` file, vertex positions are read from the surface at the stored vertex indices.

When input is an `.mgz` volume, `LabelfromASeg(mri, voxval)` creates a label from all voxels with value equal to `voxval`. The surface vertex coordinates are then used to determine label membership, with nearest-voxel or trilinear sampling.

> [!gap] LabelfromASeg() sampling logic
> The exact algorithm used by `LabelfromASeg()` (whether it checks surface vertex proximity to voxels, or does volume-to-surface projection) needs verification from the label utility source.

## Configuration Options

### Complete Flag Reference

`mris_sample_label` has a minimal option set. The `get_option()` function contains only `--help`, `--version`, and `?`/`U` (usage) — no other flags exist.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--version` or `-version` | boolean | — | Print version string and exit. |
| `-u` or `?` | boolean | — | Print usage and exit. |
| `--help` or `-help` | boolean | — | Print help text and exit. |

> [!gotcha] No `--voxval` flag exists
> The previous wiki entry listed `--voxval` and `-v` as flags for controlling the MGZ label value to extract. These flags do **not** exist in the source. The variable `voxval` is a static global initialised to 1 and is never modifiable via the command line. To extract a label value other than 1, the MGZ input must be pre-processed to remap the desired label to value 1 (e.g., with `mri_binarize`).

### Configuration Interactions

- When the input is an `.mgz` file (determined by extension), `LabelfromASeg(mri, voxval)` is called with the hardcoded `voxval=1`.
- When the input is a `.label` file, it is read directly as a FreeSurfer label. The surface is then used for hole-filling via `LabelFillHoles()`.
- The output always uses `LabelFillHoles()`, which interpolates missing vertices.

## Typical Use Cases

### Use Case 1: Convert segmentation label value 1 to surface label

```bash
# Only works for voxel value 1 — pre-binarize to remap other values
mri_binarize --i $SUBJECTS_DIR/subject/mri/aparc+aseg.mgz \
             --match 1021 --o /tmp/lh.parsopercularis.mgz
mris_sample_label \
  /tmp/lh.parsopercularis.mgz \
  $SUBJECTS_DIR/subject/surf/lh.white \
  $SUBJECTS_DIR/subject/label/lh.parsopercularis.label
```

### Use Case 2: Convert existing label file to surface coordinates

```bash
mris_sample_label \
  $SUBJECTS_DIR/subject/label/lh.manual.label \
  $SUBJECTS_DIR/subject/surf/lh.white \
  $SUBJECTS_DIR/subject/label/lh.manual.sampled.label
```

## Pipeline Context

`mris_sample_label` is not called by `recon-all`. It is used in label processing workflows as a format conversion and sampling utility.

## Gotchas and Caveats

> [!gotcha] voxval is hardcoded to 1 and cannot be changed on the command line
> `mris_sample_label` always extracts voxels with value 1 from MGZ inputs. There is no flag to change this. To use it with a specific label (e.g., label 1021 for left parsopercularis in `aparc+aseg`), first binarize the desired label to value 1 using `mri_binarize --match 1021`, then pass the binarized volume to `mris_sample_label`.

> [!gotcha] Output label uses LabelFillHoles(), not direct sampling
> The output label is produced by `LabelFillHoles(label, mris, ORIGINAL_VERTICES)`, which fills topological holes in the label by interpolating vertex membership. The raw MGZ-to-vertex assignment (via `LabelfromASeg`) may have gaps near label boundaries that are then filled.

## Related Tools

- [[mri_label2vol]] — converts surface labels to volumetric labels (reverse direction)
- [[mri_annotation2label]] — extracts individual parcellation labels from annotation files
- [[mris_sample_parc]] — samples volumetric parcellations onto a surface (annotation output)
- [[mri_label2label]] — resamples labels between subjects

## Confidence and Gaps

Confidence is **high** for the complete flag list (there are essentially none), the positional argument structure, and the critical gotcha about `voxval` being hardcoded. Confidence is **low** for the internal `LabelfromASeg()` algorithm.

> [!gap] LabelfromASeg() algorithm
> Read the implementation of `LabelfromASeg()` in `utils/label.c` to understand whether this is a surface-to-volume projection or a voxel-to-vertex assignment.
