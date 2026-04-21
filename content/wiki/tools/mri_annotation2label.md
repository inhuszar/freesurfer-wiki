---
title: "mri_annotation2label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_annotation2label/mri_annotation2label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mri_label2vol]]"
  - "[[mri_aparc2aseg]]"
  - "[[mris_anatomical_stats]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - annotation
  - label
  - surface
  - parcellation
---

# mri_annotation2label

## Summary

`mri_annotation2label` converts a cortical parcellation [[annotation-format|annotation file]] (`.annot`) into a set of individual per-region [[label-format|label files]] (`.label`) or into a volume-format surface segmentation. It also supports creating a border overlay of parcellation boundaries, computing a lobar grouping annotation, and exporting the embedded color table. The inverse operation (combining label files back into an annotation) is not performed by this tool.

## Source Information

- **Language:** C++
- **Source file:** `mri_annotation2label/mri_annotation2label.cpp`
- **Original author:** Douglas Greve

## Purpose and Context

FreeSurfer stores cortical parcellations as `.annot` files — compact binary files that assign each surface vertex an integer annotation index and embed a color table mapping those indices to anatomical names. For many downstream analyses, users need individual label files (one per region) that contain the vertex numbers belonging to that region together with their XYZ coordinates on a specified surface. `mri_annotation2label` performs this extraction.

It is closely related to [[mri_aparc2aseg]], which projects the parcellation into volumetric space. The output label files are consumed by tools such as [[mris_anatomical_stats]] and [[mri_label2vol]].

The tool can also aggregate parcellation regions into coarser lobar groupings (frontal, parietal, temporal, occipital, etc.) using three progressively stricter definitions.

## Inputs

- A subject directory tree (`SUBJECTS_DIR/<subject>/`)
- Surface file: `SUBJECTS_DIR/<subject>/surf/<hemi>.<surface>` (default: `white`)
- Annotation file: `SUBJECTS_DIR/<subject>/label/<hemi>.<annotation>.annot` (default: `aparc`)
- Optionally: a statistical overlay file (curv or MGH format) to embed values into the label `stat` field

## Outputs

Depending on flags, one of:

1. **Per-region label files** — one `.label` file per parcellation region, named either `<hemi>.<name>.label` (in `--outdir` mode) or `<labelbase>-<NNN>.label` (in `--labelbase` mode)
2. **Volume-encoded surface segmentation** — a pseudo-volume where each vertex position carries an integer label ID compatible with `FreeSurferColorLUT.txt` (via `--seg`)
3. **Border overlay** — a binary overlay where parcel boundaries are 1 and interior vertices are 0 (via `--border`)
4. **Lobar annotation** — a new `.annot` file grouping parcels by lobe (via `--lobes` / `--lobesStrict` / `--lobesStrictPHCG`)
5. **Color table** — ASCII color table corresponding to the annotation (via `--ctab`)

## Mathematical Foundations

The annotation file stores per-vertex annotations as packed RGB integers. The [[color-lut|color table]] embedded in the annotation maps each unique annotation value to a named region and an integer index. `mri_annotation2label` decodes this by calling `CTABfindAnnotation()` which inverts the RGB packing:

$$
\text{index} = \text{CTABfindAnnotation}(\text{annotation\_rgb})
$$

Vertex XYZ coordinates in the output label files are taken from the requested surface (default: `white`), which stores coordinates in **Surface RAS** (tkRAS) space — see [[coordinate-systems]].

The segmentation base offsets for standard parcellations are:

| Annotation | lh base | rh base |
|-----------|---------|---------|
| `aparc` | 1000 | 2000 |
| `aparc.a2005s` | 1100 | 2100 |
| `aparc.a2009s` | 11100 | 12100 |
| other | 0 | 0 |

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subject <s>` / `--s <s>` | string | required | Subject name |
| `--hemi <h>` | string | required | Hemisphere (`lh` or `rh`) |
| `--annotation <name>` | string | `aparc` | Annotation base name or full path |
| `--surface <name>` / `--surf <name>` | string | `white` | Surface to use for vertex XYZ coordinates |
| `--outdir <dir>` | string | — | Output directory; files named `<hemi>.<name>.label` |
| `--labelbase <base>` | string | — | Output base path; files named `<base>-<NNN>.label` |
| `--label <int>` | int | — | Extract only this single label index |
| `--seg <file>` | string | — | Write volume-format surface segmentation |
| `--segbase <int>` | int | auto | Override segmentation index base |
| `--ctab <file>` | string | — | Write ASCII color table |
| `--border <file>` | string | — | Write binary border overlay volume |
| `--border-annot <file>` | string | — | Write annotation with only border vertices |
| `--lobes <file>` | string | — | Write lobar annotation (default grouping) |
| `--lobesStrict <file>` | string | — | Write lobar annotation (precentral→frontal, postcentral→parietal) |
| `--lobesStrictPHCG <file>` | string | — | Write lobar annotation (strict + parahippocampal gyrus lobe) |
| `--stat <file>` | string | — | Surface overlay file; values embedded in label stat field |
| `--sd <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory |
| `--a2005s` | flag | off | Shortcut to set annotation to `aparc.a2005s` |
| `--debug` | flag | off | Enable debug output |

## Configuration Interactions

- `--outdir` and `--labelbase` are mutually exclusive; both cannot be specified together.
- If neither `--outdir` nor `--labelbase` is given, label files attempt to be placed in `$SUBJECTS_DIR/<subject>/label/`. If `labelbase` has no `/` in it, the tool tries to write to `$SUBJECTS_DIR/<subject>/label`. Always use `./` prefix to force current directory.
- `--segbase` overrides the automatic base offset; relevant when the annotation is not `aparc` or `aparc.a2005s`.
- `--ctab` writes the embedded color table with `idbase` set to `--segbase`; this changes the IDs in the output table.
- `--lobes*` flags exit immediately after writing the lobar annotation; no label files are produced.
- `--seg` exits immediately after writing the segmentation volume; no label files are produced.
- `--border` / `--border-annot` exits immediately after writing the border; no label files are produced.

## Typical Use Cases

**Extract all aparc label files into a directory:**
```bash
mri_annotation2label --subject bert --hemi lh \
  --outdir $SUBJECTS_DIR/bert/label/aparc_labels/
```

**Extract all aparc labels with numeric base names:**
```bash
mri_annotation2label --subject bert --hemi rh \
  --labelbase ./labels/aparc-rh
```

**Convert annotation to segmentation volume (aparc+aseg compatible indices):**
```bash
mri_annotation2label --subject bert --hemi lh \
  --seg ./lh.aparc.seg.mgz
```

**Create lobar annotation:**
```bash
mri_annotation2label --subject bert --hemi lh \
  --lobesStrict $SUBJECTS_DIR/bert/label/lh.lobes.strict.annot
```

**Extract a single label (e.g., bankssts):**
```bash
mri_annotation2label --subject bert --hemi lh \
  --outdir ./labels --label 2
```

## Pipeline Context

`mri_annotation2label` is commonly run after [[mris_ca_label]] produces the cortical parcellation annotation, and before [[mris_anatomical_stats]] which reads per-region label files for morphometric statistics. It is not a standard [[recon-all]] stage but is frequently invoked in post-processing workflows.

## Gotchas and Caveats

> [!gotcha] labelbase without a path separator
> If `--labelbase` is given a string without a `/` (e.g., just `aparc-lh`), the tool attempts to place files in `$SUBJECTS_DIR/<subject>/label/`. Prefix with `./` to write to the current directory: `--labelbase ./aparc-lh`.

> [!gotcha] --table is obsolete
> Passing `--table` causes a fatal error with a message explaining that the color table is now embedded directly in the annotation file. This flag no longer exists.

> [!gotcha] Annotation file fallback naming
> The code first tries `<SUBJECTS_DIR>/<subject>/label/<hemi>.<annotation>.annot`, then falls back to `<hemi>_<annotation>.annot` (underscore instead of dot). This accommodates older naming conventions.

> [!gotcha] Empty regions produce no label file
> If no vertices belong to a parcellation index, no label file is created for that index. The expected number of output files therefore varies per subject.

> [!gotcha] XYZ coordinates are surface-specific
> The XYZ coordinates in label files reflect the specified surface (default `white`). If you subsequently load the label into `freeview` with a different surface, the vertex positions will appear correct but the XYZ columns may not match.

## Related Tools

- [[mris_ca_label]] — produces the `.annot` file this tool reads
- [[mri_label2vol]] — projects label files into volumetric space
- [[mri_aparc2aseg]] — directly maps annotation to volume without intermediate labels
- [[mris_anatomical_stats]] — reads label files for morphometric reporting

## Confidence and Gaps

Source code fully read. Confidence is high for all documented behaviour.

> [!gap] lobar grouping definitions
> The exact mapping of parcellation names to lobes under `--lobes` vs `--lobesStrict` vs `--lobesStrictPHCG` is implemented in `MRISaparc2lobes()` in `mrisurf.c`. The precise region assignments have not been verified here.
