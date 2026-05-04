---
title: "mri_label2vol"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_label2vol/mri_label2vol.cpp"
  - "utils/resample.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mri_binarize]]"
  - "[[mris_ca_label]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: review
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "MRIsurfaceLabel2VolOpt (--fill-ribbon method) internals not traced beyond entry point"
  - "MRIaseg2volMU and MRIseg2SegPVF algorithm details not traced"
tags:
  - label
  - annotation
  - segmentation
  - projection
  - utility
---

# mri_label2vol

## Summary

`mri_label2vol` rasterizes surface labels, surface annotation files, or
volumetric segmentation files into a volumetric space. It supports three
mutually exclusive input modes: [[label-format|`.label` files]] (binary or multi-label),
`.annot` annotation files (cortical parcellations), and segmentation volumes
(e.g., `aseg.mgz`). The label geometry is mapped into the output volume space
via a registration file or from headers. The core algorithm uses a hit-count
intermediate volume to arbitrate when multiple label points fall in the same
voxel.

## Source Information

- **Language:** C++
- **Primary source:** `mri_label2vol/mri_label2vol.cpp` (1391 lines, author: Douglas N. Greve)
- **Core library:** `utils/resample.cpp` (projection functions)
- **Binary location:** `$FREESURFER_HOME/bin/mri_label2vol`

## Purpose and Context

`mri_label2vol` is used for:

- Converting [[wiki/tools/freeview|freeview]]-drawn or automatically generated surface labels to
  volume ROI masks
- Converting cortical parcellation annotations (Desikan, Destrieux, DKT)
  produced by [[mris_ca_label]] / [[mri_aparc2aseg]] to volumetric
  segmentations for ROI analysis
- Importing volumetric segmentations (aseg) in a different resolution or space
- Mapping a label onto a volume for use with [[mri_binarize]], [[mri_concat]],
  or other volume tools

Not called by [[wiki/pipelines/recon-all|recon-all]] directly.

## Inputs

### Three mutually exclusive input modes

**Label mode:**
- `--label <labelfile>` — FreeSurfer `.label` file; repeatable for multiple labels

**Annotation mode:**
- `--annot <annotfile>` — surface annotation (`.annot`) file
- Requires `--subject` and `--hemi`

**Segmentation mode:**
- `--seg <segvol>` — volumetric segmentation (e.g., `aseg.mgz`)
- `--aparc+aseg` — shortcut for `$SUBJECTS_DIR/$subject/mri/aparc+aseg.mgz`

### Registration (one required)

- `--reg <file>` — tkregister-style `.dat` register file
- `--regheader <labelvolid>` — compute from headers
- `--identity` — identity matrix (label and template in same space)
- `--lta <file>` — LTA transform file

### Template volume (required except with `--fill-ribbon`)

- `--temp <vol>` — output will have the geometry of this volume

## Outputs

- `--o <vol>` — output volume ([[mgz]] or NIfTI), `MRI_INT` type
- `--hits <vol>` — multi-frame hit-count volume (one frame per label)
- `--pvf <vol>` — partial volume fraction = hits / TempVoxVol
- `--label-stat <vol>` — label stat field (5th column of `.label` file) projected to volume

## Mathematical Foundations

### Core Rasterization Algorithm

The transform from label point to template voxel:
$$
\mathbf{T}_{\text{ras}\to\text{vox}} = \mathbf{T}_\text{vol}^{-1} \cdot \mathbf{R}
$$

where $\mathbf{T}_\text{vol}$ is the template's vox-to-RAS (tkregister style by
default, or scanner-RAS with `--native-vox2ras`) and $\mathbf{R}$ is the
registration matrix.

For each label point $(x, y, z)$:
$$
(c, r, s)^T = \mathbf{T}_{\text{ras}\to\text{vox}} \cdot (x, y, z, 1)^T
$$
rounded to nearest integer. Out-of-bounds points are silently skipped.

**Hit counting:** Each label point increments a counter in a `MRI_SHORT` hit
volume `HitVol[c,r,s,label_index]`. After all points are processed, a voxel is
assigned to label $k$ if:
$$
\text{HitVol}[c,r,s,k] > \text{nHitsThresh}
$$

where:
$$
\text{nHitsThresh} = \text{FillThresh} \times \frac{\text{TempVoxVol}}{\text{LabelVoxVol}}
$$

- `FillThresh` (default 0.0): fraction of template voxel that must be covered
- `TempVoxVol` = $x_s \cdot y_s \cdot z_s$ of the template
- `LabelVoxVol` (default 1.0 mm³): assumed volume per label point

With default `FillThresh = 0`, a single hit per voxel is sufficient. Increasing
`FillThresh` towards 1.0 requires denser label coverage (useful when upsampling
coarse labels into a fine template).

**Winner-takes-all:** When multiple labels hit the same voxel, the label with
the most hits wins.

### Output Label Encoding

| Mode | Code assigned to in-range voxels |
|------|----------------------------------|
| Single `--label` | 1 (= `BinVal`, first label) |
| Multiple `--label` | `nthlabel + 1 + offset` (1-based) |
| `--annot` | `nthlabel + offset` (0-based, no +1) |
| `--seg` | Original label value from segmentation |

`--offset <k>` adds k to all non-zero output values.

### Projection Along Surface Normal (`--proj`)

When labels are on a surface (vertex numbers ≠ -1), each label point can be
projected along the surface normal:

- `type = abs`: $\mathbf{x}' = \mathbf{x} + d \cdot \hat{n}$ (fixed mm distance)
- `type = frac`: $\mathbf{x}' = \mathbf{x} + f \cdot \tau \cdot \hat{n}$ (fraction of thickness)

Sampling is performed at all depths from `start` to `stop` by `delta`.

## Configuration Options

### Complete Flag Reference

#### Input mode (mutually exclusive)

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--label` | `labelfile` | string (repeatable) | none | Push another `.label` file onto the input list (`LabelList[nlabels++]`). Multiple invocations build a multi-label rasterization. |
| `--annot` | `annotfile` | string | none | Load a surface annotation file; sets the internal `SurfNeeded` flag so `--subject` and `--hemi` become required. |
| `--seg` | `segvol` | string | none | Load a volumetric segmentation (e.g., `aseg.mgz`) instead of surface labels. |
| `--aparc+aseg` | — | flag | off | Shortcut equivalent to `--seg $SUBJECTS_DIR/$subject/mri/aparc+aseg.mgz`; requires `--subject` or `--reg`. |

#### Registration (exactly one required)

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--reg` | `file` | string | none | Path to a tkregister-style `register.dat` file. |
| `--regheader` | `[labelvolid]` | string (optional) | none | Compute the registration from volume headers. The optional argument is the volume whose header defines label-side RAS; if omitted, the `--seg` volume must already have been specified (used as the source). Sets `RegHeader = 1`. |
| `--identity` | — | flag | off | Use the 4×4 identity matrix as registration (label and template assumed to be in the same RAS). |
| `--lta` | `file` | string | none | Load an LTA transform file; also captures `lta->subject` as the subject name. Internally still routes through the registration pathway. |
| `--invertmtx` | — | flag | 0 | Invert the registration matrix after loading. |
| `--native-vox2ras` | — | flag | 0 | Build the template's vox→RAS using the scanner-native vox2ras (`mri->native_vox2ras`) instead of the tkregister vox2ras. Required for labels created in scanner RAS (e.g., by `scuba`). |
| `--tkr-template` | `vol` | string | none | Load a template volume header used to convert labels into Surface (tkr) RAS when the label coordinates are not already in tkrRAS. Also used to define the output geometry under `--fill-ribbon`. |

#### Template / subject / hemisphere

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--temp` | `vol` | string | none | Template volume defining the output geometry (required unless `--fill-ribbon`). |
| `--subject` | `name` | string | none (or from `--lta`) | Subject name for surface loading; required when `SurfNeeded` (annotation, projection, fill-ribbon, or `--aparc+aseg` without `--reg`). |
| `--hemi` | `lh\|rh` | string | none | Hemisphere; validated by `checkhemi()`. Required when surface loading is needed. |
| `--surf` | `surface` | string | `white` | Surface name to load (e.g., `white`, `pial`) for projection or fill-ribbon. |
| `--sd` | `dir` | string | `$SUBJECTS_DIR` env | Override `SUBJECTS_DIR` for this run. If unset and the env var is also unset, the program exits. |

#### Fill threshold and label volume

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--fillthresh` | `frac` | double | 0.0 | Fraction of a template voxel that must be covered by label points before that voxel is assigned to the label. Note: only the form `--fillthresh` is accepted; `--fill-thresh` is **not** a valid alias. |
| `--labvoxvol` | `mm3` | double | 1.0 | Assumed physical volume in mm³ per label point; enters the `nHitsThresh` formula. |

#### Projection along surface normal

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--proj` | `type start stop delta` | string + 3×double | off | Sample each surface label point at depths `start..stop` step `delta` along the vertex normal. `type` must be `abs` (mm) or `frac` (fraction of cortical thickness). Validated: `start ≤ stop`, `delta > 0`, and `delta = 0` only when `start == stop`. Sets `SurfNeeded`. |

#### Segmentation mode options

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--upsample` | `factor` | int | -1 (off) | Integer upsampling factor applied to the segmentation before mapping (used by `MRIaseg2volMU`). |
| `--resmm` | `mm` | double | 0 | Target upsample resolution in mm (alternative to `--upsample`). |
| `--new-aseg2vol` | — | flag | 0 | Use the newer `MRIseg2SegPVF()` algorithm with partial-volume fractions. |
| `--no-new-aseg2vol` | — | flag | — | Force the old `MRIaseg2volMU()` path (cancels a prior `--new-aseg2vol`). |
| `--ttype` | — | flag | none | Load the `default-jan-2014` tissue-type color table for the segmentation. |
| `--ttype+head` | — | flag | none | Load the `default-jan-2014+head` tissue-type color table (includes head/extra-cerebral classes). |

#### Fill ribbon mode

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--fill-ribbon` | — | flag | 0 | Switch to the ribbon-based surface-label rasterizer (`MRIsurfaceLabel2VolOpt`) instead of the hit-count algorithm. Implies `SurfNeeded`. |

#### Output

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--o` | `vol` | string | none | Output volume (required). Type is `MRI_INT`. |
| `--hits` | `vol` | string | none | Write the multi-frame hit-count volume (one frame per label, `MRI_SHORT`). |
| `--pvf` | `vol` | string | none | Write the partial-volume-fraction volume = hits / TempVoxVol. |
| `--label-stat` | `vol` | string | off | Write a volume containing the 5th-column "stat" value of the `.label` file projected to the template; only meaningful with `--label`. |
| `--offset` | `k` | int | 0 | Integer added to every non-zero output label code. |
| `--stat-thresh` | `thresh` | double | -1 | Skip label points whose stat field is less than `thresh`. Sets `DoStatThresh = 1`. |

#### Diagnostics and special operations

| Flag | Arguments | Type | Default | Effect |
|------|-----------|------|---------|--------|
| `--help` | — | flag | — | Print full help text and exit. |
| `--version` | — | flag | — | Print version string and exit. |
| `--debug` | — | flag | 0 | Enable verbose debug printing during option parsing. |
| `--defects` | `surf defectno.mgz voltemplate.mgz offset mergeflag output [label]` | 6 or 7 args | — | Standalone subcommand: convert a surface defect-number overlay (e.g., from `lh.orig.nofix`) into a volumetric segmentation via `MRISdefects2Seg()`, optionally restricted to a label. Writes `output` and exits immediately, bypassing all other processing. |

### Configuration Interactions

> [!gotcha] Input modes are mutually exclusive
> `--label`, `--annot`, `--seg`, and --aparc+aseg cannot be combined.
> Specifying multiple raises a fatal error.

> [!gotcha] Registration methods are mutually exclusive
> `--reg`+`--regheader`, `--identity`+`--reg`, and `--identity`+`--regheader`
> all produce errors. Choose exactly one.

> [!gotcha] `--annot` requires `--subject` and `--hemi`
> Without these, the surface cannot be loaded for annotation-to-label
> conversion. An error is raised in `check_options()`.

> [!gotcha] `--proj` requires surface labels (vertex numbers ≠ -1)
> Label files created from volume coordinates (vertex number = -1) cannot be
> projected along a surface normal. The behavior for such labels with `--proj`
> is undefined.

> [!gotcha] `--label-stat` is only valid with `--label`
> Using --label-stat with `--annot` or `--seg` raises an error. The stat
> field is specific to `.label` file format (5th column).

> [!gotcha] `--temp` is required unless `--fill-ribbon`
> The fill-ribbon method determines the output geometry from the ribbon volume;
> all other methods require an explicit `--temp`.

> [!gotcha] Single hit sufficient at default FillThresh
> With `FillThresh = 0.0` (default), even a single label point landing in a
> voxel is enough to assign it. For high-resolution label → low-resolution
> template mappings, increase `--fillthresh` to require denser coverage.

> [!gotcha] Label coordinates must be in tkregister RAS
> Labels must be in tkregister RAS coordinates (the default for FreeSurfer surface
> labels). If a label was created with `scuba` in scanner coordinates, use
> `--native-vox2ras`. If the coordinate system is ambiguous, use `--tkr-template`.
> See [[coordinate-systems]] for the distinction between scanner-RAS and tkregister-RAS.

> [!gotcha] `--regheader` without an argument requires prior `--seg`
> The `--regheader` flag accepts an optional label-side volume identifier. If
> omitted, the parser falls back to the value passed to `--seg` — but that flag
> must already have appeared earlier on the command line. Otherwise the program
> exits with an error message about argument order.

> [!gotcha] `--aparc+aseg` needs `--subject` or `--reg`
> Without one of these, the parser cannot locate the subject's
> `mri/aparc+aseg.mgz` and exits.

> [!gotcha] `--fillthresh`, not --fill-thresh
> The accepted spelling is `--fillthresh` (one word). The hyphenated form is
> not registered in the option parser and silently fails the unknown-option
> check.

> [!gotcha] `--defects` is a standalone subcommand
> When `--defects` is given, `mri_label2vol` performs the defect-to-segmentation
> conversion and immediately calls `exit(0)`. None of the label/annot/seg
> options are honoured in that mode.

> [!gotcha] `--upsample`, `--resmm`, `--new-aseg2vol`, `--ttype*` apply only in segmentation mode
> These flags affect the `--seg` / `--aparc+aseg` code paths and are silently
> ignored for `--label` and `--annot` inputs.

## Typical Use Cases

### Convert cortex label to binary volume mask

```bash
mri_label2vol \
  --label $SUBJECTS_DIR/bert/label/lh.cortex.label \
  --temp $SUBJECTS_DIR/bert/mri/orig.mgz \
  --reg $SUBJECTS_DIR/bert/mri/transforms/register.dat \
  --o lh_cortex_vol.mgz
```

### Convert annotation to volume parcellation

```bash
mri_label2vol \
  --annot $SUBJECTS_DIR/bert/label/lh.aparc.annot \
  --subject bert \
  --hemi lh \
  --temp $SUBJECTS_DIR/bert/mri/orig.mgz \
  --reg $SUBJECTS_DIR/bert/mri/transforms/register.dat \
  --o lh_aparc_vol.mgz
```

### Multiple labels → indexed mask

```bash
mri_label2vol \
  --label ROI1.label \
  --label ROI2.label \
  --label ROI3.label \
  --temp orig.mgz \
  --regheader orig.mgz \
  --o roi_mask.mgz
# ROI1 → value 1, ROI2 → value 2, ROI3 → value 3
```

### Fill cortical thickness into volume (with projection)

```bash
mri_label2vol \
  --label $SUBJECTS_DIR/bert/label/lh.cortex.label \
  --proj frac 0 1 0.1 \
  --subject bert --hemi lh \
  --temp $SUBJECTS_DIR/bert/mri/orig.mgz \
  --reg register.dat \
  --o lh_cortex_thick.mgz
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]]. Used in analysis scripts for ROI definition and
parcellation-to-volume projection.

## Gotchas and Caveats

> [!gotcha] Only one hemisphere per call (documented bug)
> From the help text ([line 1084](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/resample.cpp#L1084)): "Cannot convert surface labels with different
> hemispheres." Each invocation handles one hemisphere. Use separate calls for
> lh and rh, then combine with [[mri_concat]] or [[mri_binarize]].

> [!gotcha] Annotation vs. label output encoding
> Annotation mode uses 0-based indexing; label mode uses 1-based indexing.
> This asymmetry can cause off-by-one errors when comparing outputs from both
> modes. The `--offset` flag can be used to align them.

> [!gotcha] Winner-takes-all for overlapping labels
> When multiple labels hit the same voxel, the label with the most hits wins.
> For single-point labels (each point = 1 mm³) hitting the same 1 mm³ voxel,
> the ordering is effectively last-write-wins if all hit counts are equal.

> [!gotcha] `SUBJECTS_DIR` must be set
> The tool checks for `$SUBJECTS_DIR` in the environment at startup and exits
> if it is unset, even when no subject directory is needed.

## Related Tools

- [[mri_vol2surf]] — forward: volume → surface
- [[mri_surf2vol]] — forward: surface overlay → volume
- [[mri_binarize]] — post-process the output volume (threshold, erode, dilate)
- [[mris_ca_label]] — produces the annotation files that `mri_label2vol` can convert

## Confidence and Gaps

High confidence on all flag handling, coordinate transform, and encoding logic —
derived directly from the `main()` and `check_options()` source.

> [!gap] `--fill-ribbon` internals
> `MRIsurfaceLabel2VolOpt()` is called for fill-ribbon mode. Its algorithm is
> distinct from the hit-count method but was not traced into the source library.

> [!gap] Segmentation mode upsampling
> The interaction between `--upsample`/`--resmm` and the `MRIaseg2volMU()` /
> `MRIseg2SegPVF()` algorithms is not fully documented here.
