---
title: "mris_seg2annot"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_seg2annot/mris_seg2annot.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_translate_annotation]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Exact behavior when index values in seg file exceed the color table range is unclear."
tags:
  - annotation
  - segmentation
  - surface
---

# mris_seg2annot

## Summary

`mris_seg2annot` converts a surface-based segmentation file (a per-vertex integer index map) into a FreeSurfer annotation file (`.annot`), using a user-supplied color table. The annotation embeds the color table, making it self-contained and loadable by visualization tools such as `tksurfer` or `freeview`.

## Source Information

- **Language:** C++
- **Source file:** `mris_seg2annot/mris_seg2annot.cpp`
- **Key libraries:** `mrisurf`, `annotation`, `colortab`, `surfcluster`

## Purpose and Context

FreeSurfer cortical parcellations are stored as annotation files (e.g., `lh.aparc.annot`). The native pipeline produces annotations via atlas-based labeling ([[mris_ca_label]]). However, researchers often need to create custom annotations from analysis results — for example, a thresholded functional activation map or a cluster-based region of interest defined as a binary surface map. `mris_seg2annot` bridges this gap by taking any integer-valued surface overlay (the segmentation) and a matching color lookup table, and writing a standard annotation file that is compatible with the rest of the FreeSurfer ecosystem.

The tool is a data-format bridge; it performs no statistical analysis or surface geometry computation.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Surface segmentation file (`--seg`) | Per-vertex integer indices into a color table. Can be any surface overlay with whole-number values. | `.mgh`, `.mgz`, or curvature-like binary |
| Color table (`--ctab`) | Maps integer indices to names and RGBA colors. Same format as `$FREESURFER_HOME/FreeSurferColorsLUT.txt`. | Plain text |
| Subject directory (`--s`) | FreeSurfer subject directory containing the surface. Required when using subject/hemisphere mode. | Directory |
| Hemisphere (`--h` / `--hemi`) | `lh` or `rh`. | — |

**Alternative positional invocation** via --seg2annot seg surf ctab output does not require a recon-all directory structure.

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Annotation file (`--o`) | Per-vertex label map with embedded color table. Default location: `<SUBJECTS_DIR>/<subject>/label/`. | `.annot` |

## Mathematical Foundations

No non-trivial mathematics. The conversion is a direct table lookup: each vertex value in the segmentation file is treated as an integer index into the color table; the corresponding RGB triple and label name are assigned to that vertex in the annotation structure.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--seg` | `<surfseg>` | — | Integer-valued per-vertex overlay file used as LUT indices |
| `--ctab` | `<colortable>` | — | Color table file; maps integer indices to names/RGBA; searched in `$FREESURFER_HOME` by default (prepend `./` for local files) |
| `--s` | `<subject>` | — | Subject identifier for SUBJECTS_DIR directory lookup |
| `--h` / `--hemi` | `lh` or `rh` | — | Hemisphere |
| `--surf` | `<surfname>` | `white` | Surface file name within the subject's surf directory; used to load the surface for annotation |
| `--o` | `<annot>` | — | Output annotation file name; stored in `<subjectdir>/label/` unless a path prefix is given |
| `--annot` | — | off | Flag indicating the output is an annotation file (sets internal `annot` mode) |
| `--ctab-auto` | `[<outctabfile>]` | — | Automatically generate a color table from the segmentation values; optional argument specifies an output path for the generated table |
| `--debug-vertex` | `<vno>` | — | Enable debug output for vertex index `<vno>` (also sets `Gdiag_no`) |
| `--seg2annot` | `<seg> <surf> <ctab> <output>` | — | Directory-structure-independent invocation: takes four positional arguments and exits immediately |

## Configuration Interactions

- `--s`, `--hemi`, `--seg`, `--ctab`, `--o` together define the standard workflow that requires a recon-all directory structure.
- `--surf` can be used to override the default surface name (`white`) within the subject's surf directory.
- `--seg2annot` provides the same functionality without a directory structure, requiring explicit paths to the surface and output files.
- These two modes are mutually exclusive; `--seg2annot` overrides individual flags.
- The color table path is first searched relative to `$FREESURFER_HOME`. To use a local file not in that directory, prepend `./` to the filename.
- `--ctab-auto` and `--ctab` are alternative ways to specify the color table; `--ctab-auto` derives the table from the data itself.
- `--annot` is an internal flag that sets annotation mode; it is set implicitly by the standard workflow.

## Typical Use Cases

**Convert a thresholded functional map to annotation (subject-based):**
```bash
mris_seg2annot \
  --seg lh.myactivation.sig.th8.mgh \
  --s MySubject --h lh \
  --ctab ./MyColorLUT.txt \
  --o ./lh.myactivation.annot
```

**Directory-structure-independent conversion:**
```bash
mris_seg2annot \
  --seg2annot lh.myseg.mgh \
  $SUBJECTS_DIR/MySubject/surf/lh.white \
  ./MyColorLUT.txt \
  ./lh.myannot.annot
```

The resulting `.annot` file can be loaded in `freeview` or `tksurfer` just like `lh.aparc.annot`.

## Pipeline Context

`mris_seg2annot` is not called by `recon-all`. It is a post-processing utility used when:
- Creating custom parcellations from functional or structural analyses.
- Converting segmentation results from external tools into FreeSurfer annotation format for visualization or further analysis.

It is logically downstream of surface-space analysis tools and upstream of annotation-consuming tools such as `mris_anatomical_stats` (which expects annotation format).

## Gotchas and Caveats

> [!gotcha] Color table path resolution
> The color table is searched in `$FREESURFER_HOME` by default. If your custom LUT is in the current directory, you must prepend `./` explicitly (e.g., `--ctab ./MyColorLUT.txt`). Omitting `./` will cause FreeSurfer to look in `$FREESURFER_HOME`, likely failing silently or using the wrong table.

> [!gap] Behavior for out-of-range indices
> What happens when a segmentation file contains index values not present in the color table is not explicitly documented in the source. The behavior is likely to assign a default (black/unknown) color, but this has not been verified.

## Related Tools

- [[mris_ca_label]] — atlas-based cortical parcellation producing standard annotation files
- [[mris_translate_annotation]] — maps an annotation from one parcellation scheme to another
- [[mris_anatomical_stats]] — consumes annotation files to compute morphometric statistics per label
- [[surface-format]] — documentation of FreeSurfer surface and overlay file formats

## Confidence and Gaps

**High confidence:** The conversion logic (seg indices → color table → annotation) is clear from the source. The two invocation modes and path resolution logic for the color table are explicitly documented in the embedded help text.

**Medium confidence:** Behavior for edge cases (out-of-range indices, missing values, non-integer seg values) requires testing.

> [!gap] Unresolved question
> The behavior when a vertex value in the segmentation has no matching entry in the color table is not specified in the source. Needs empirical verification.
