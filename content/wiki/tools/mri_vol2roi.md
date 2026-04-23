---
title: "mri_vol2roi"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_vol2roi/mri_vol2roi.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2label]]"
  - "[[mri_label2vol]]"
  - "[[mri_binarize]]"
  - "[[mri_vol2surf]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Source is in the attic/ directory, suggesting this tool may be deprecated or unmaintained."
  - "Relationship to current pipeline and preferred alternatives is unclear."
tags:
  - roi
  - sampling
  - volume
  - attic
---

# mri_vol2roi

## Summary

`mri_vol2roi` samples a volume to compute statistics within one or more regions of interest (ROIs). The tool takes an input volume and an ROI definition and extracts summary statistics (mean, max, etc.) for each ROI. It is an older utility that resides in the `attic/` subdirectory of the FreeSurfer source, suggesting it may be deprecated or superseded by other tools.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_vol2roi/mri_vol2roi.cpp`
- **Note:** Located in `attic/`, which contains legacy/deprecated FreeSurfer tools that are no longer actively developed. The binary may still be distributed and functional, but is not actively maintained.

## Purpose and Context

Region-of-interest (ROI) analyses extract summary statistics from a statistical map or functional volume restricted to anatomically defined regions. `mri_vol2roi` is an older implementation of this workflow. For current use, tools such as `mri_segstats` or `mri_label2vol` combined with `mri_vol2surf` are preferred.

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Source volume | `--srcvol <path>` | Volume from which the ROI is extracted (stem or stem.ext) |
| Source registration | `--srcreg <file>` | Registration between source volume and subject anatomy (`register.dat`) |
| Label file | `--label <file>` | FreeSurfer label file defining the ROI spatially |
| Label registration | `--labelreg <file>` | Matrix mapping label XYZ to subject anatomical coordinates |
| Mask volume | `--mskvol <path>` | Mask volume (same spatial dimensions as source) for thresholding |

## Outputs

| Output | Flag | Description |
|--------|------|-------------|
| ROI average text file | `--roiavgtxt <file>` | Text file with label hit count, final voxel count, and per-frame averages |
| ROI average volume | `--roiavg <stem>` | Volume containing the ROI-averaged values |
| Final mask volume | `--finalmskvol <path>` | Binary volume (1=in ROI, 0=out) of the final selected voxels |
| Final mask CRS text | `--finalmskcrs <file>` | Text file listing 0-based col/row/slice of each mask voxel |
| Source masked volume | `--srcmskvol <path>` | Source volume with non-ROI voxels zeroed out |
| Voxel-level list | `--list <file>` | Text file with per-voxel CRS and per-frame values for all ROI voxels |

## Mathematical Foundations

The tool averages all source-volume voxels that fall within the final mask. For multi-frame (4-D) statistical volumes in selxavg format, each frame is raised to an appropriate power before averaging and back-transformed afterward, so that variance frames are handled correctly (variance → square root after averaging → reported as std dev).

## Configuration Options

All flags confirmed from `parse_commandline()` in `attic/mri_vol2roi/mri_vol2roi.cpp`.

### Source volume

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--srcvol` | `<path>` | — | Source volume stem or stem.ext |
| `--srcfmt` | `<fmt>` | `bvolume` | Source volume format (`bvolume`, `bfile`, `bshort`, `bfloat`, `cor`) |
| `--srcreg` | `<file>` | — | Source-to-anatomy registration file (`register.dat`) |
| `--srcoldreg` | — | off | Use old-style registration format |
| `--srcwarp` | `<file>` | — | Source warping transform (currently unused in computation) |

### Label ROI

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--label`<br>`--labelfile` | `<file>` | — | Path to FreeSurfer label file |
| `--labelreg` | `<file>` | — | Matrix mapping label XYZ to anatomical coordinates (tkregister space) |
| `--labeltal` | — | off | Treat label as in Talairach space; loads `talairach.xfm` automatically; also sets `--fixxfm` |
| `--talxfm` | `<file>` | `talairach.xfm` | Alternative Talairach XFM file (from subject `mri/transforms/`); forces `--labeltal` |
| `--labelfillthresh` | `<float>` | ~0 | Fraction of a voxel that must be filled by label points to include it (0–1) |

### Mask volume

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mskvol` | `<path>` | — | Mask volume stem or stem.ext (must match source dimensions) |
| `--mskfmt` | `<fmt>` | — | Mask volume format |
| `--mskthresh` | `<float>` | `0.5` | Threshold; voxel magnitude must exceed this to be included |
| `--msktail` | `abs\|pos\|neg` | `abs` | Sign criterion: `abs` = ignore sign, `pos` = must be positive, `neg` = must be negative |
| `--mskframe` | `<int>` | `0` | 0-based frame of the mask volume to use for thresholding |
| `--mskinvert` | — | off | Invert the mask after thresholding |

### Output

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--roiavgtxt` | `<file>` | — | Save ROI average as text (label hits, final hits, per-frame means) |
| `--roiavg` | `<stem>` | — | Save ROI average as a volume (stem or stem.ext) |
| `--finalmskvol` | `<path>` | — | Save final binary mask volume |
| `--finalmskcrs` | `<file>` | — | Save 0-based col/row/slice of mask voxels to text file |
| `--srcmskvol` | `<path>` | — | Save source volume with non-ROI voxels zeroed |
| `--list` | `<file>` | — | Save per-voxel CRS + per-frame values for all ROI voxels |

### Output format

Output volume format is controlled by the `FSF_OUTPUT_FORMAT` environment variable (e.g., `mgh`, `mgz`, `nii`, `nii.gz`, `bhdr`). If unset, defaults to `bhdr`.

### Miscellaneous

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fixxfm` | — | off | Fix transform; set automatically by `--labeltal` |
| `--nofixxfm` | — | — | Explicitly disable `--fixxfm` |
| `--oldtxtstyle` | — | off | Use old text output style (writes `nmskhits` instead of label/final hit counts) |
| `--plaintxtstyle` | — | off | Plain text output: omit label/final hit count header rows |
| `--debug` | — | off | Enable verbose debug output |
| `--version` | — | — | Print version string and exit |
| `--help` | — | — | Print usage and detailed help, then exit |

## Configuration Interactions

- Either `--roiavgtxt`, `--roiavg`, or `--list` must be specified; the tool exits with an error if no output is given.
- `--roiavg` must be specified even if only the text output is wanted (historical constraint noted in the help text).
- `--labelreg` and `--labeltal` are mutually exclusive.
- `--fixxfm` is set automatically by `--labeltal` and `--talxfm`.
- `--mskfmt` accepts only `bvolume`, `bfile`, `bshort`, `bfloat`, or `cor`; other values cause an error exit.

## Typical Use Cases

```bash
# ROI average from a mask volume (no label)
mri_vol2roi \
  --srcvol stat.nii.gz \
  --mskvol roi_mask.nii.gz \
  --roiavgtxt roi_avg.txt \
  --roiavg /tmp/roi_avg_vol

# ROI average using a FreeSurfer label
mri_vol2roi \
  --srcvol beta.nii \
  --srcreg register.dat \
  --label lh.fusiform.label \
  --roiavgtxt fusi_avg.txt \
  --roiavg /tmp/not_needed

# Per-voxel listing of ROI values
mri_vol2roi \
  --srcvol beta.nii \
  --mskvol mask.nii \
  --list list.dat

# Create a binary mask volume from a label
mri_vol2roi \
  --label your.label \
  --srcvol f \
  --srcreg register.dat \
  --finalmskvol labelbinmask \
  --roiavg /tmp/not.wanted.dat
```

## Pipeline Context

This tool is not part of the standard `recon-all` pipeline. It is a post-processing utility for ROI analyses.

> [!gotcha] Deprecated tool
> The source file is located in `attic/mri_vol2roi/`, which is the FreeSurfer subdirectory for legacy tools. Users should consider whether `mri_segstats` or a combination of `mri_label2vol` + `mri_vol2surf` better meets their current needs.

## Gotchas and Caveats

> [!gotcha] Attic location
> Tools in the `attic/` directory are not actively maintained. Behaviour may differ from documentation, and bugs may not be fixed.

## Related Tools

- [[mri_vol2label]] — converts volume values to label files
- [[mri_label2vol]] — converts label files back to volumes
- [[mri_binarize]] — creates binary ROI masks
- [[mri_vol2surf]] — samples volume onto surface for surface-based ROI analyses

## Confidence and Gaps

**Medium confidence:** Flag table and behaviour are confirmed from a full reading of `attic/mri_vol2roi/mri_vol2roi.cpp`. The tool's place in current workflows is not well documented; `mri_segstats` is the actively maintained alternative for most use cases.

> [!note] Audit noise: `--mskreg` and `--msksamesrc`
> An automated audit flags `--mskreg` and `--msksamesrc` as missing. These names appear only in an error message at line 820 (`"cannot specify both --mskreg and --msksamesrc"`) and in variable names (`mskregfile`, `msksamesrc`), but neither flag is parsed by `parse_commandline()`. They are not valid CLI flags.
