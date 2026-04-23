---
title: "mris_translate_annotation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_translate_annotation/mris_translate_annotation.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_annotation2label]]"
  - "[[mris_ca_label]]"
  - "[[mris_label2annot]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "translate_annotation() function body not read — the translation table format and lookup mechanism need documentation."
  - "Format of translation file not documented."
tags:
  - surface
  - annotation
  - parcellation
  - translation
---

# mris_translate_annotation

## Summary

`mris_translate_annotation` remaps the label values in a cortical surface annotation file according to a user-supplied translation table. It reads an existing annotation, applies a label-to-label remapping (translating old label names/colors to new ones based on a translation file), and writes the result as a new annotation file. This allows users to convert between different parcellation colour schemes or merge/rename labels without rerunning the atlas-based labeling.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_translate_annotation/mris_translate_annotation.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_translate_annotation`

## Purpose and Context

Different FreeSurfer atlases (Desikan-Killiany, Destrieux, DKT) use different label names and colour values. When an annotation has been generated from one colour table but must be compared or combined with data from another, the label values must be remapped. `mris_translate_annotation` provides this remapping.

The translation is specified via a translation file (`<trans_name>`), which maps source label names/values to target label names/values.

## Inputs

### Required Inputs

(Positional arguments: `<subject> <hemi> <in_annot> <trans_name> <out_annot>`)

- **`<subject>`** — FreeSurfer subject ID.
- **`<hemi>`** — hemisphere (`lh` or `rh`).
- **`<in_annot>`** — input annotation file path (`.annot`).
- **`<trans_name>`** — name or path of the translation table file.
- **`<out_annot>`** — output annotation file path.

`SUBJECTS_DIR` must be set in the environment (cannot be overridden on the command line).

The tool reads `surf/<hemi>.orig` as the surface topology.

### Input Assumptions

> [!assumption] Translation file format
> The translation file (`trans_name`) must be in a format readable by `translate_annotation()`. The exact format is not documented in the source header.

> [!gap] Translation file format
> The `translate_annotation()` function was not fully read. The format of the translation table (text file with label name pairs? colour-to-colour mapping?) needs to be documented.

## Outputs

### Files Created

- **Translated annotation** — written to `<out_annot>` in FreeSurfer binary annotation format (see [[annotation-format]]). Label values are remapped according to the translation table; unlisted labels may be preserved or set to unknown.

## Mathematical Foundations

The translation operation is a per-vertex label remapping:
$$
l_i' = T(l_i)
$$
where $l_i$ is the annotation value at vertex $i$ and $T$ is the translation function defined by the translation file. Labels not present in the table are typically left unchanged or set to a background/unknown value.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-v <diagno>` | integer | — | Set diagnostic level (Gdiag_no). |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

> [!gotcha] `SUBJECTS_DIR` cannot be overridden on the command line
> Despite the error message referencing "cmd line", there is no `--sdir` or `-s` flag. `SUBJECTS_DIR` must be set in the environment before running the tool.

### Configuration Interactions

Minimal configuration. The translation is fully specified by the translation file.

## Typical Use Cases

### Use Case 1: Translate Destrieux annotation to DK-equivalent labels

```bash
mris_translate_annotation \
  subject lh \
  $SUBJECTS_DIR/subject/label/lh.aparc.a2009s.annot \
  $FREESURFER_HOME/average/destrieux_to_dk_translation.txt \
  $SUBJECTS_DIR/subject/label/lh.aparc.translated.annot
```

## Pipeline Context

`mris_translate_annotation` is not called by `recon-all`. It is a post-processing utility for annotation format conversion.

## Gotchas and Caveats

> [!gotcha] Translation file location
> The translation file path can be relative or absolute. If relative, it is likely resolved relative to the current working directory, not the subjects directory.

## Related Tools

- [[mri_annotation2label]] — converts annotation to individual label files
- [[mris_ca_label]] — generates annotations using atlas-based labeling
- [[mris_label2annot]] — builds annotation from individual label files

## Confidence and Gaps

Confidence is **medium**. The I/O paths and high-level purpose are clear. The translation file format and `translate_annotation()` implementation were not read.

> [!gap] Translation file format
> Document the format of the translation table file expected by `translate_annotation()`.
