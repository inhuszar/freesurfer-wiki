---
title: "mris_divide_parcellation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_divide_parcellation/mris_divide_parcellation.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mri_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - parcellation
  - annotation
  - label
---

# mris_divide_parcellation

## Summary

`mris_divide_parcellation` splits one or more parcels in a cortical parcellation (annotation file) into sub-divisions perpendicular to the parcel's long axis. Divisions can be specified either by name in a "splitfile" (method 1) or by supplying an area threshold in mm² that causes each parcel to be recursively split until all sub-divisions are below the threshold (method 2). This is useful for creating finer-grained parcellations from standard atlases.

## Source Information

- **Language:** C++
- **Source file:** `mris_divide_parcellation/mris_divide_parcellation.cpp`
- **Author:** Bruce Fischl

## Purpose and Context

Standard cortical parcellations (e.g., Desikan-Killiany `aparc`) contain large regions that may be too coarse for some analyses. `mris_divide_parcellation` allows sub-dividing specified regions while keeping the rest of the parcellation intact. The output is a new annotation file that can be loaded directly into `tksurfer` or `freeview`.

## Inputs

- **Subject** (positional arg 1): Subject name in `$SUBJECTS_DIR`.
- **Hemisphere** (positional arg 2): `lh` or `rh`.
- **Source annotation** (positional arg 3): Name of the input annotation (e.g., `aparc.annot`). The actual file is `$SUBJECTS_DIR/<subj>/label/<hemi>.<annot>`.
- **Splitfile or area threshold** (positional arg 4): Either:
  - Path to a text file with two columns: `<labelname> <Ndivisions>`
  - A floating-point number interpreted as an area threshold in mm²
- **Output annotation** (positional arg 5): Output annotation file name (written to `$SUBJECTS_DIR/<subj>/label/<hemi>.<outannot>`).

## Outputs

- **Annotation file**: Modified annotation with divided parcels. Division naming convention: the first sub-division retains the original label name; subsequent divisions are named `<name>_div2`, `<name>_div3`, etc.

## Mathematical Foundations

Parcels are divided perpendicular to their **long axis**. The long axis is computed as the principal axis of the label's vertex positions (first eigenvector of the covariance matrix of vertex coordinates restricted to the parcel). Division boundaries are placed at equal intervals along this axis.

For the area-threshold method, each parcel of area $A > A_{\text{thresh}}$ is split into $\lceil A / A_{\text{thresh}} \rceil$ divisions.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sdir` | `<dir>` | `$SUBJECTS_DIR` | Override subjects directory |
| `--rgb-scale` | `<int>` | 30 | Colour scale for new label colours in the annotation |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

The primary parameters are positional: `subject hemi sourceannot [splitfile|areathresh] outannot`.

## Configuration Interactions

- The fourth positional argument determines the method: if it can be parsed as a floating-point number, it is treated as an area threshold; otherwise it is treated as a splitfile path.
- `--rgb-scale` controls how new sub-division labels get assigned colours in the output annotation colour table.

## Typical Use Cases

```bash
# Method 1: split specific labels using a splitfile
cd $SUBJECTS_DIR/subj001/label
echo "superiorfrontal 4" >  split.txt
echo "precentral      3" >> split.txt
mris_divide_parcellation subj001 rh aparc.annot split.txt rh.aparc.split

# Method 2: split all labels larger than 100 mm²
mris_divide_parcellation subj001 rh aparc.annot 100 rh.aparc.split.100mm2

# View result
tksurfer subj001 rh inflated -annot aparc.split
```

## Pipeline Context

Not called by `recon-all`. Used in post-processing to create finer parcellations for connectivity or morphometric analyses. The input annotation is typically produced by [[mris_ca_label]] or [[mri_ca_label]]. Statistics on the sub-divided parcellation can be computed with [[mris_anatomical_stats]].

## Gotchas and Caveats

> [!gotcha] Label name format in splitfile
> Label names in the splitfile must match the annotation-specific name convention — for `aparc.annot`, omit the `ctx-lh-` or `ctx-rh-` prefix. For example, use `posteriorcingulate`, not `ctx-lh-posteriorcingulate`.

> [!gotcha] Output file path
> The output annotation is written relative to `$SUBJECTS_DIR/<subj>/label/`. The output argument should be just the file name, not a full path.

> [!gotcha] First division keeps original name
> Sub-division numbering starts at 2 (`_div2`, `_div3`, ...). The first division retains the original name. This means splitting a region into $N$ parts produces labels: `name`, `name_div2`, ..., `name_divN`.

## Related Tools

- [[mris_ca_label]] — generates cortical parcellation annotation files
- [[mri_ca_label]] — subcortical parcellation
- [[mris_anatomical_stats]] — computes stats from annotation files
- [[mris_distance_transform]] — geodesic distance transforms on labels

## Confidence and Gaps

**Confident (from source):** Both methods (splitfile and area threshold), naming convention, output location, RGB scale option.

**Uncertain:** Whether the long-axis computation uses vertex positions in the current surface or a canonical space.
