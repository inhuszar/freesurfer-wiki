---
title: "mri_vol2label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_cor2label/mri_cor2label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label2vol]]"
  - "[[mri_binarize]]"
  - "[[mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The --opt probability-map thresholding mode needs further testing to verify the brute-force search behaviour."
tags:
  - labels
  - conversion
  - surface
  - segmentation
---

# mri_vol2label

## Summary

`mri_vol2label` (installed as a renamed copy of `mri_cor2label`) converts voxel values in a volume or surface overlay into a FreeSurfer label file. It searches the input for voxels matching a specified label ID and writes their 3D coordinates and statistics to a `.label` file. It can also operate on surface overlays, applying morphological dilation and erosion.

## Source Information

- **Language:** C++
- **Source file:** `mri_cor2label/mri_cor2label.cpp`
- **Installation note:** The binary is produced by compiling `mri_cor2label.cpp` and then installing it under the name `mri_vol2label` (see `CMakeLists.txt`). Both names are functionally identical.
- **Original author:** Douglas Greve (MGH)

## Purpose and Context

FreeSurfer uses label files (`.label`) to define regions of interest on surfaces or in volumes. `mri_vol2label` provides the conversion in the volume-to-label direction:

- Extract a parcellation region from an aseg or aparc+aseg volume
- Create a surface label from a thresholded overlay (e.g., thickness > 2mm)
- Feed downstream tools like `mri_label2vol`, `mris_anatomical_stats`, or cortical ROI analyses

The inverse operation is performed by [[mri_label2vol]].

## Inputs

| Flag | Description |
|------|-------------|
| `--i input` | Input volume (any format readable by `mri_convert`) or surface overlay |
| `--id labelid` | Integer value to match in the input volume |
| `--thresh thresh` | Threshold mode: include voxels where `input > thresh` instead of exact match |
| `--surf subject hemi [surf]` | Interpret input as a surface overlay for the given subject/hemi/surface |

## Outputs

| Flag | Description |
|------|-------------|
| `--l labelfile` | Output `.label` file |
| `--v volfile` | Optional: write label volume (binary map) to this file |

> [!gotcha] Label file path
> If the label filename does not contain a forward slash (`/`), the program will attempt to write to `$SUBJECTS_DIR/<subject>/label/`. Include `./` to write to the current directory.

## Mathematical Foundations

For **volume mode**: the tool reads the vox2ras-tkregister matrix from the volume header and converts each matching voxel's CRS indices to tkRAS coordinates. These $(x, y, z)$ values are written to the label file with a statistic value of 0.

$$
\begin{pmatrix} x \\ y \\ z \\ 1 \end{pmatrix} = M_{\text{tkRAS}} \begin{pmatrix} c \\ r \\ s \\ 1 \end{pmatrix}
$$

For **surface mode**: the $(x, y, z)$ values are the vertex coordinates directly from the surface geometry file.

**`--opt` mode (probability map):** Performs a brute-force threshold search from 0 to 1 in steps of `delta` to find the threshold that makes the sum of suprathreshold values in `valmap` closest to `target`. Designed for creating group-average labels that match target area sizes.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `input` | — | Input volume or surface overlay file |
| `--c` | `input` | — | Alias for `--i`; input volume or surface overlay file |
| `--id` | `labelid` | — | Integer label value to extract |
| `--thresh` | `thresh` | — | Threshold: include voxels where `input > thresh` |
| `--l` | `labelfile` | — | Output label file path |
| `--v` | `volfile` | — | Write binary label volume |
| `--m` | `binmask binval` | — | Save output as binary volume `binmask` with value `binval` (surface mode only) |
| `--stat` | — | off | Copy voxel value into the stat field of the label instead of using 0 |
| `--surf` | `subject hemi [surf]` | — | Surface mode; default surface is `white` |
| `--surf-path` | `surface` | — | Specify the surface file path directly, bypassing subject/hemi lookup; implies surface mode |
| `--sd` | `dir` | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` for this invocation |
| `--opt` | `target delta valmap` | — | Probability map threshold optimisation |
| `--remove-holes-islands` | — | off | Remove holes and isolated islands (surface mode only) |
| `--dilate` | `ndilations` | 0 | Number of label dilations (surface mode only) |
| `--erode` | `nerosions` | 0 | Number of label erosions (surface mode only) |
| `--ring` | `nring` | — | Generate a ring of vertices `nring` hops wide around the label (surface mode only) |
| `--synthlabel` | — | off | Synthesize a label (internal/testing use) |
| `--verbose` | — | off | Enable verbose output |
| `--help` | — | — | Print help |

## Configuration Interactions

- `--thresh` and `--id` are alternative selection modes. If `--thresh` is specified, all voxels `> thresh` are included regardless of `--id`.
- `--stat` and `--id` are mutually exclusive; the tool exits with an error if both are specified.
- `--m`, `--remove-holes-islands`, `--dilate`, `--erode`, and `--ring` require `--surf` mode.
- `--surf-path` implies surface mode and sets `subject_name` to an empty string; it cannot be combined with `--surf`.
- `--opt` requires `--surf` mode and overrides simple `--id` matching.
- Dilation is applied before erosion when both are specified.
- `--c` and `--i` are identical aliases; either sets the input file.

> [!note] `--min` and `--o` are not mri_vol2label flags
> The `--min` and `--o` flags appear in the help text only as part of a `mri_binarize` example command. They are flags for [[mri_binarize]], not for `mri_vol2label`.

## Typical Use Cases

```bash
# Extract left putamen (label 12) from aseg
mri_vol2label \
    --i $SUBJECTS_DIR/bert/mri/aseg.mgz \
    --id 12 \
    --l ./left-putamen.label

# Create surface label of vertices with cortical thickness > 2mm
mri_binarize --i $SUBJECTS_DIR/bert/surf/lh.thickness --min 2 \
    --o lh.thick2.mgh
mri_vol2label \
    --i lh.thick2.mgh \
    --surf bert lh \
    --id 1 \
    --l ./lh.thickness-gt2mm.label
```

## Pipeline Context

`mri_vol2label` is not called by standard `recon-all`. It is a post-processing utility typically used in:

- ROI extraction from segmentation volumes
- Surface label generation for group studies
- Downstream input to `mris_anatomical_stats` or `mri_label2vol`

## Gotchas and Caveats

> [!gotcha] Name mismatch
> The binary `mri_vol2label` is compiled from `mri_cor2label.cpp`. The source file was originally named for COR format volumes but the functionality works on any format. Documentation and error messages may still refer to `mri_cor2label`.

> [!gotcha] Coordinate system: tkRAS not Scanner RAS
> Coordinates in the output label file are in **tkRAS** (FreeSurfer's surface RAS), not scanner RAS. This is the correct system for use with surface tools, but be aware when using labels with other software. See [[coordinate-systems]].

## Related Tools

- [[mri_label2vol]] — inverse: converts label back to volume
- [[mri_binarize]] — creates binary volumes that can feed into vol2label
- [[mri_convert]] — handles format conversion of input volumes

## Confidence and Gaps

**High confidence:** command-line interface (from BEGINUSAGE block in source), coordinate system handling (from help text and code logic), installation as renamed copy of `mri_cor2label`.

> [!gap] --opt mode
> The `--opt` probability-map optimisation mode was not fully traced in the source. The help text describes a brute-force threshold search but the implementation details were not verified.
