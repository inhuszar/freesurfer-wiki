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
last_agent_update: 2026-04-21
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

- **`--i input`** / **`--c input`**: input volume (or surface overlay when `--surf` is used); `--c` is a legacy alias
- **`--id labelid`**: integer value to extract (voxels/vertices equal to this value are included); OR
- **`--thresh thresh`**: threshold the input so that voxels with value > thresh are included (label id = 1 implied)
- **`--l labelfile`**: output label file path

Optional:
- **`--surf subject hemi [surfname]`**: interpret input as a surface overlay; coordinates come from the surface vertices (default surface: `white`)
- **`--sd dir`**: set `SUBJECTS_DIR` to `dir`
- **`--surf-path surface`**: directly specify the surface file path (sets subject to empty string; implies `--surf` mode)
- **`--v volfile`**: write the volume of the extracted label (mm³) to a text file
- **`--m maskfile maskval`**: save output as a binary volume with value `maskval` (surface mode only); note this is `--m`, not --mask
- **`--stat`**: copy voxel/vertex value to the stat field of the label (instead of 0)
- **`--ring N`**: dilate label to a ring of width N iterations (surface only)
- **`--opt target delta valmap`**: threshold optimization mode (see below)
- **`--remove-holes-islands`**: post-process label to remove holes and isolated islands (surface only)
- **`--dilate N`** / **`--erode N`**: dilate/erode label by N iterations (surface only; dilation first)
- **`--synthlabel`**: synthesize the label (internal testing)
- **`--verbose`**: verbose output

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

Flag list verified against `mri_cor2label/mri_cor2label.cpp`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` / `--c` | `<file>` | required | Input volume or surface overlay (`--c` is legacy alias) |
| `--l` | `<file>` | required | Output label file |
| `--id` | `<int>` | required (or `--thresh`) | Value to match in input |
| `--thresh` | `<float>` | — | Threshold: include voxels where input > thresh (sets label id = 1) |
| `--stat` | — | off | Copy voxel/vertex value to label stat field (default: 0) |
| `--v` | `<file>` | none | Write label volume (mm³) to text file |
| `--surf` | `<subject> <hemi> [<surf>]` | none | Surface mode; coordinates from surface vertices (default surf: `white`) |
| `--sd` | `<dir>` | none | Set `SUBJECTS_DIR` |
| `--surf-path` | `<surface>` | none | Directly specify surface file path (implies surface mode) |
| `--m` | `<maskfile> <maskval>` | none | Save output as binary volume with value `maskval` (surface only) |
| `--opt` | `<target> <delta> <valmap>` | none | Optimal threshold mode |
| `--remove-holes-islands` | — | off | Remove label holes and islands (surface only) |
| `--dilate` | `<N>` | 0 | Dilate label by N iterations (surface only) |
| `--erode` | `<N>` | 0 | Erode label by N iterations after dilation (surface only) |
| `--ring` | `<N>` | none | Dilate to a ring of width N (surface only) |
| `--synthlabel` | — | off | Synthesize the label (testing) |
| `--verbose` | — | off | Verbose output |

> [!gotcha] --mask does not exist
> The flag --mask does not exist in the source. The flag for binary masking is --m <maskfile> <maskval> (two arguments).

## Configuration Interactions

- `--id` and `--thresh` are alternative ways to select voxels; `--thresh` sets `DoThresh=1` and the label id is implicitly 1.
- `--surf` changes the coordinate computation from volume tkRAS to surface vertex xyz; without `--surf`, surface overlays passed as input will be treated as volumes.
- `--surf-path` directly sets the surface file path and implies surface mode; it sets the subject name to an empty string.
- `--remove-holes-islands`, `--dilate`, `--erode`, `--ring`, and `--m` require `--surf` mode.
- `--opt` requires `--surf` mode and overrides `--id`; it binarizes the input at the optimal threshold before creating the label.
- Dilation is applied before erosion (regardless of order specified on the command line).
- `--stat` copies the raw voxel/vertex value to the label stat column; by default the stat field is 0.

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

Confidence is **high**. Full flag list verified from source. All flags confirmed: --c/--i, --l, --id, --thresh, --stat, --v, --surf, --sd, --surf-path, --m, --opt, --dilate, --erode, --ring, --remove-holes-islands, --synthlabel, --verbose. The --mask flag does not exist; the correct flag is --m.
