---
title: "mri_mark_temporal_lobe"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_mark_temporal_lobe/mri_mark_temporal_lobe.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_ca_label]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "MRImarkTemporalWM algorithm not fully traced"
  - "Which CMA labels are reclassified as temporal WM is not confirmed"
tags:
  - segmentation
  - temporal-lobe
  - white-matter
---

# mri_mark_temporal_lobe

## Summary

`mri_mark_temporal_lobe` takes a subject's segmentation volume and re-labels temporal lobe white matter voxels with a dedicated temporal WM label. It reads a segmentation (e.g., `seg.mgz`) and writes a new volume where temporal white matter is explicitly marked. This is used to improve subsequent segmentation of temporal lobe structures.

## Source Information

- **Language:** C++
- **Source file:** `mri_mark_temporal_lobe/mri_mark_temporal_lobe.cpp`

## Purpose and Context

The temporal lobe presents challenges for white matter segmentation because its white matter is spatially adjacent to CSF-filled spaces and has variable myelination. By explicitly labelling temporal WM in a preliminary segmentation, downstream tools like `mri_segment` or atlas-based labelling can make better use of prior probability models for temporal lobe structures.

The core logic is implemented in `MRImarkTemporalWM()`, which uses CMA (Cortical and Medial Area) label knowledge to identify and reclassify temporal white matter voxels.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Subject name | string | FreeSurfer subject identifier (positional arg 1) |
| Output filename | string | Relative to subject's `mri/` dir (positional arg 2, last arg) |

The input segmentation is read from `$SUBJECTS_DIR/<subject>/mri/seg` (or the value of `-seg`).

**Usage:** `mri_mark_temporal_lobe [options] <subject_name> <out_fname>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Labeled volume | [[mgz]] | Segmentation with temporal WM explicitly marked; written to subject's `mri/<out_fname>` |

## Mathematical Foundations

The `MRImarkTemporalWM()` function operates on the CMA segmentation label space. Voxels previously labelled as generic cerebral white matter (`Left_Cerebral_White_Matter` or `Right_Cerebral_White_Matter`) that satisfy spatial proximity and neighbourhood criteria specific to the temporal lobe are reclassified.

The exact spatial criteria (likely involving neighbourhood label statistics or anatomical bounding boxes derived from CMA labels) are implemented in the `cma.h` / `cma.cpp` utilities.

> [!gap] MRImarkTemporalWM algorithm
> The implementation of `MRImarkTemporalWM()` is not in the tool's own source file — it is implemented in the shared CMA utilities. The exact decision rules for which WM voxels are reclassified as temporal are not traced here.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-seg <name>` | string | `seg` | Name of segmentation volume in subject's `mri/` dir |
| `-sdir <path>` | string | `$SUBJECTS_DIR` | Override SUBJECTS_DIR |

> [!gap] Full flag list
> The `get_option()` function may contain additional flags not visible in the source header. The `-seg` flag is inferred from the `seg_dir` static variable initialized to `"seg"`.

## Configuration Interactions

- The output filename is always relative to the subject's `mri/` directory. You cannot specify an absolute output path without modifying `subjects_dir`.
- The `-sdir` flag allows overriding `$SUBJECTS_DIR` for batch processing.

## Typical Use Cases

```bash
# Mark temporal WM for subject bert, output to wm_temporal.mgz
mri_mark_temporal_lobe bert wm_temporal.mgz

# With custom subjects directory
mri_mark_temporal_lobe -sdir /data/subjects bert wm_temporal.mgz
```

## Pipeline Context

Not part of standard `recon-all` as a primary step. Typically used as a preprocessing step before re-running segmentation in subjects with known temporal lobe processing issues. May be invoked manually in troubleshooting workflows.

## Gotchas and Caveats

> [!gotcha] Output path is relative to subject's mri directory
> The output file is written to `$SUBJECTS_DIR/<subject>/mri/<out_fname>`. You cannot write to an arbitrary absolute path — the code prepends the subjects directory.

> [!gotcha] Requires existing segmentation
> The input segmentation must already exist at `$SUBJECTS_DIR/<subject>/mri/seg` (or the path specified by `-seg`). This tool does not run segmentation itself.

> [!assumption] Expects CMA label set
> The temporal WM identification logic relies on the standard FreeSurfer CMA label vocabulary (e.g., `Left_Cerebral_White_Matter`, `ctx-lh-entorhinal`, etc.). Segmentations from external tools that do not use the CMA label table will not be processed correctly.

## Related Tools

- [[mri_segment]] — produces the initial segmentation that this tool refines
- [[mri_ca_label]] — atlas-based segmentation that may also benefit from temporal WM marking
- [[mri_convert]] — for format conversion

## Confidence and Gaps

**Confident:** Input/output structure, output path construction, purpose (temporal WM re-labelling).

**Less confident:** `MRImarkTemporalWM()` algorithm details, complete flag list.
