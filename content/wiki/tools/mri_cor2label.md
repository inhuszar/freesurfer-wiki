---
title: "mri_cor2label"
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
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - label
  - conversion
  - surface
---

# mri_cor2label

## Summary

`mri_cor2label` converts voxel values in any volume or surface overlay to a FreeSurfer label file (`.label`). It searches for voxels (or surface vertices) with a specified value and records their coordinates in label format. Despite the historical name ("COR to label"), the tool operates on any format readable by `mri_convert` including `.mgz`, `.nii`, and surface overlays.

## Source Information

- **Language:** C++
- **Source file:** `mri_cor2label/mri_cor2label.cpp`
- **Original author:** Douglas Greve

## Purpose and Context

Label files in FreeSurfer store lists of surface vertex coordinates (or volume voxel coordinates in RAS space). `mri_cor2label` is the standard way to extract a subset of voxels or vertices from a volume or surface overlay into a label file. Typical applications:
- Extracting a subcortical structure from `aseg.mgz` as a label.
- Creating a surface label from a thresholded thickness or overlay map.
- Creating probabilistic labels from probability maps (via `--opt`).

The name is a misnomer: the tool is not specific to COR format and works on any readable volume.

## Inputs

- **`--i input`**: input volume (or surface overlay when `--surf` is used)
- **`--id labelid`**: integer value to extract (voxels/vertices equal to this value are included); OR
- **`--thresh thresh`**: threshold the input so that voxels with value > thresh are included (label id = 1 implied)
- **`--l labelfile`**: output label file path

Optional:
- **`--surf subject hemi [surfname]`**: interpret input as a surface overlay; coordinates come from the surface vertices (default surface: `white`)
- **`--v volfile`**: write the volume of the extracted label (mm³) to a text file
- **`--opt target delta valmap`**: threshold optimization mode (see below)
- **`--remove-holes-islands`**: post-process label to remove holes and isolated islands (surface only)
- **`--dilate N`** / **`--erode N`**: dilate/erode label by N iterations (surface only; dilation first)

## Outputs

- A FreeSurfer `.label` file containing:
  - For volumes: one entry per matching voxel, with tkRAS coordinates (from the vox2ras-tkr matrix) and statistic value 0.
  - For surfaces: one entry per matching vertex, with vertex xyz from the specified surface.
- Optionally, a text file with the label volume in mm³ (`--v`).

## Mathematical Foundations

**Volume coordinates**: xyz values are computed using the tkregister vox2ras matrix (the "tk RAS" coordinate system, not scanner RAS):

$$
\begin{pmatrix} x \\ y \\ z \\ 1 \end{pmatrix} = M_\text{vox2ras-tkr} \begin{pmatrix} c \\ r \\ s \\ 1 \end{pmatrix}
$$

where $c, r, s$ are column, row, slice indices. See [[coordinate-systems]] for the difference between scanner RAS and tkRAS.

**Optimal threshold mode** (`--opt`): Performs a brute-force search over threshold $\tau \in [0, 1]$ (step size `delta`) to find the value for which the total area of suprathreshold vertices in `valmap` is closest to `target`. Useful for creating probabilistic labels with a target total area matching the population mean.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i input` | file | required | Input volume or surface overlay |
| `--id labelid` | int | required (or `--thresh`) | Value to match |
| `--thresh thresh` | float | — | Threshold: include voxels where input > thresh |
| `--l labelfile` | file path | required | Output label file |
| `--v volfile` | file path | none | Write label volume (mm³) to text file |
| `--surf subject hemi [surf]` | strings | none | Surface mode; coordinates from surface vertices |
| `--opt target delta valmap` | float float file | none | Optimal threshold mode |
| `--remove-holes-islands` | — | off | Remove label holes and islands (surface only) |
| `--dilate N` | int | 0 | Dilate label by N iterations (surface only) |
| `--erode N` | int | 0 | Erode label by N iterations after dilation (surface only) |
| `--mask maskfile` | file | none | Binary mask: restrict computation to mask voxels |

## Configuration Interactions

- `--id` and `--thresh` are alternative ways to select voxels; `--thresh` sets `DoThresh=1` and the label id is implicitly 1.
- `--surf` changes the coordinate computation from volume tkRAS to surface vertex xyz; without `--surf`, surface overlays passed as input will be treated as volumes.
- `--remove-holes-islands`, `--dilate`, `--erode` require `--surf` mode; they are silently ignored in volume mode.
- `--opt` requires `--surf` mode and overrides `--id`; it binarizes the input at the optimal threshold before creating the label.
- Dilation is applied before erosion (regardless of order specified on the command line).

## Typical Use Cases

Extract left putamen (label 12) from aseg to a label file:
```bash
mri_cor2label \
  --i $SUBJECTS_DIR/subject/mri/aseg.mgz \
  --id 12 \
  --l ./left-putamen.label
```

Create a surface label of thick cortex (thickness > 2mm):
```bash
# Step 1: binarize
mri_binarize --i lh.thickness --min 2 --o lh.thick.mgh
# Step 2: convert to label
mri_cor2label --i lh.thick.mgh --surf subject lh --id 1 \
  --l ./lh.thick.label
```

Create a label from a probability map with target area:
```bash
mri_cor2label --i label.prob.mgz --id 1 --l ./lh.prob.label \
  --surf fsaverage lh \
  --opt 922.18 .001 $SUBJECTS_DIR/fsaverage/surf/lh.white.avg.area.mgh
```

## Pipeline Context

Not called by [[recon-all]] directly. Used in:
- ROI extraction from parcellations for ROI-based fMRI analyses
- Creating surface labels from functional or morphometric overlays
- Generating probability-based labels from atlas priors

Related inverse operation: [[mri_label2vol]] converts label files back to volumes.

## Gotchas and Caveats

> [!gotcha] Implicit label directory for relative paths
> If the label filename does not contain a `/`, the program attempts to write to `$SUBJECTS_DIR/subject/label/`. Prefix with `./` to write to the current directory.

> [!gotcha] Name is misleading
> The "COR" in the name refers to the old FreeSurfer COR format, not the modern coronal orientation. The tool works on any volume format.

> [!gotcha] tkRAS coordinates, not scanner RAS
> Volume labels store tkRAS (tkregister RAS) coordinates, not scanner RAS. See [[coordinate-systems]] for the distinction. Surface labels store the surface vertex coordinates directly.

## Related Tools

- [[mri_label2vol]] — inverse: converts labels to volumes
- [[mri_binarize]] — threshold volumes before passing to `mri_cor2label`

## Confidence and Gaps

Confidence is **high**. Source is extensively documented with embedded help text and is fully read.
