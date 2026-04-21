---
title: "mris_label2annot"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_label2annot/mris_label2annot.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mri_aparc2aseg]]"
  - "[[mris_info]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact behavior when multiple labels overlap a vertex is context-dependent"
tags:
  - surface
  - labels
  - annotation
  - parcellation
---

# mris_label2annot

## Summary

`mris_label2annot` converts a set of individual surface label files into a single FreeSurfer annotation (`.annot`) file. Each label file defines a set of vertices belonging to a named cortical region. The tool assigns color-table indices to each label, creating a per-vertex parcellation. Vertices not covered by any label are assigned index 0 (unless `--no-unknown` is used). This is the inverse of the `mri_annotation2label` operation.

## Source Information

- **Language:** C++
- **Source file:** `mris_label2annot/mris_label2annot.cpp`
- **Original author:** Doug Greve

## Purpose and Context

FreeSurfer parcellations are stored as annotation (`.annot`) files, which assign a color-table index to each surface vertex. However, individual regions are often stored as separate `.label` files (e.g., after user editing or from custom ROI definitions). `mris_label2annot` combines these individual labels into a unified annotation file.

Key use cases:
- Combining edited or custom labels into an annotation
- Creating custom parcellations from subsets of the aparc
- Converting hand-drawn ROIs to annotation format for `mri_aparc2aseg`
- Building custom atlases

The tool writes the annotation to `$SUBJECTS_DIR/subject/label/hemi.annotname.annot`.

> [!gotcha] Safety check: refuses to overwrite
> If the output annotation file already exists, `mris_label2annot` exits immediately with an error. The user must manually delete the existing file before re-running. This prevents accidental data loss.

## Inputs

| Flag | Description |
|------|-------------|
| `--s subject` | Subject name |
| `--h hemi` | Hemisphere (lh or rh) |
| `--ctab colortablefile` | Color table file (FreeSurferColorLUT.txt format) defining structure names, indices, and colors |
| `--l labelfile` | Label file (repeatable); order determines mapping to color table indices |
| `--ldir labeldir` | Directory to search for label files (when using ctab-derived names) |

Either `--l` flags or `--ctab`-derived filenames must be provided for the label files.

## Outputs

| Output | Description |
|--------|-------------|
| `hemi.annotname.annot` | FreeSurfer binary annotation file written to `$SUBJECTS_DIR/subject/label/` |
| `nhitsfile` | Optional overlay: number of labels per vertex (for debugging overlapping labels) |

## Mathematical Foundations

The annotation maps each vertex to a color-table index. For a vertex $v$:

1. Initialize all vertices to index 0 (Unknown)
2. For each label $i$ in order (1, 2, 3, ...):
   - All vertices in label $i$ are assigned index $i$ in the color table
   - If a vertex appears in multiple labels, it is assigned to the **last** label specified

The `--nhits` overlay records how many labels covered each vertex, enabling detection of overlapping labels.

Vertex-to-annotation mapping: each index $i$ corresponds to a unique color (R, G, B) encoded as a single integer: `annot = R + G*256 + B*256^2`.

## Configuration Options

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--s subject` | string | Subject name |
| `--h hemi` | lh or rh | Hemisphere |
| `--ctab colortablefile` | path | Color table in FreeSurferColorLUT format |
| `--l labelfile` | path | Label file (repeatable; order matters) |
| `--ldir labeldir` | path | Directory for label files when using ctab-derived names |
| `--a annotname` | string | Output annotation name (written to `hemi.annotname.annot`) |
| `--nhits nhitsfile` | path | Optional: overlay file with label hit counts per vertex |
| `--no-unknown` | — | Start labeling at index 0; do not map unlabeled vertices |
| `--thresh threshold` | float | Require vertex stat field > threshold to include in label |
| `--dilate_into_unknown label` | string | Dilate specified label into bordering Unknown vertices |
| `--sd SUBJECTS_DIR` | path | Override SUBJECTS_DIR |

## Configuration Interactions

- When `--l` flags are provided, labels are mapped to consecutive color table indices starting at 1 (or 0 with `--no-unknown`). The order of `--l` flags determines the color table index assignment.
- When no `--l` flags are given but `--ctab` is provided, label filenames are constructed from the color table as `hemi.parcname.label`, found in `--ldir` if specified.
- `--thresh` filters out vertices with low stat values in the label file, useful when label files contain statistical weights.
- `--dilate_into_unknown` expands a specific label into any immediately adjacent Unknown (unlabeled) vertices, removing gaps.
- `--no-unknown` shifts all indices down by 1; unlabeled vertices are not given index 0.

## Typical Use Cases

**Convert three labels to an annotation:**
```bash
mris_label2annot --s bert --h lh --ctab aparc.annot.ctab \
    --a myaparc \
    --l lh.unknown.label \
    --l lh.bankssts.label \
    --l lh.caudalanteriorcingulate.label \
    --nhits nhits.mgh
```

**Create annotation from a label directory (ctab-driven):**
```bash
mris_label2annot --s bert --h lh \
    --ctab aparc.annot.ctab \
    --ldir ./my_labels/ \
    --no-unknown \
    --a custom_parc
```

**Rebuild aparc after editing labels:**
```bash
cd $SUBJECTS_DIR/bert/label
# edit lh.superiortemporal.label in tksurfer
mri_annotation2label --hemi lh --subject bert --outdir ./tmp_labels
# ... edit ./tmp_labels/lh.superiortemporal.label ...
mris_label2annot --hemi lh --subject bert \
    --ctab aparc.annot.ctab \
    --ldir ./tmp_labels \
    --no-unknown --a aparc_edited
```

## Pipeline Context

Not part of `recon-all`. Used in post-processing parcellation workflows:

1. [[mris_ca_label]] produces the default `aparc.annot`
2. User edits individual labels in tksurfer/freeview
3. `mris_label2annot` reconstructs the annotation from edited labels
4. [[mri_aparc2aseg]] converts the annotation back to a volumetric segmentation

## Gotchas and Caveats

> [!gotcha] Will not overwrite existing annotation
> If `hemi.annotname.annot` already exists in the subject's label directory, the tool exits with an error. Always delete the old file first.

> [!gotcha] Last label wins for overlapping vertices
> When a vertex is covered by multiple input labels, it receives the index of the **last** label specified on the command line, not the first or a majority vote.

> [!gotcha] Index assignment order
> The first label is mapped to color table index 1 (not 0). Index 0 is reserved for Unknown (unlabeled) vertices. With `--no-unknown`, the first label maps to index 0.

## Related Tools

- [[mris_ca_label]] — the tool that produces default parcellation annotations
- [[mri_aparc2aseg]] — converts `.annot` to volumetric segmentation
- [[mris_info]] — can print color tables from `.annot` files
- [[surface-format]] — annotation file format

## Confidence and Gaps

**Confident (from embedded BEGINHELP block and source):**
- Full flag list
- Overwrite protection behavior
- Label-to-index mapping order
- `--nhits` overlay semantics
- `--no-unknown` effect on index numbering
