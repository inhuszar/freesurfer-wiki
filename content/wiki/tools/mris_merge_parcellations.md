---
title: "mris_merge_parcellations"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_merge_parcellations/mris_merge_parcellations.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_sample_parc]]"
  - "[[mri_annotation2label]]"
  - "[[mri_aparc2aseg]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full set of command-line flags is sparse — source code contains only -v and --fsdir. Confirm whether additional flags exist in compiled binary."
  - "Exact merge logic for non-cingulate regions is not documented; the source merges Rahul's cingulate subdivisions into Christophe's parcellation specifically."
tags:
  - parcellation
  - annotation
  - surface
---

# mris_merge_parcellations

## Summary

`mris_merge_parcellations` merges two cortical parcellation annotation files (`.annot`) into a single output annotation, selectively combining labels from two different parcellation schemes. The tool was specifically designed to incorporate cingulate subdivisions from one parcellation (Rahul's) into another (Christophe's Desikan-Killiany atlas), producing a merged annotation in the output.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_merge_parcellations/mris_merge_parcellations.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_merge_parcellations`
- **Original Author:** Bruce Fischl

## Purpose and Context

This tool addresses the situation where two separate cortical parcellation annotations have been generated for the same surface, and specific label regions from one are preferred over the equivalent regions in the other. The primary use case encoded in the source is grafting cingulate cortex subdivisions (caudalanteriorcingulate, posteriorcingulate, rostralanteriorcingulate) from one parcellation onto the Desikan-Killiany (DK) atlas parcellation, which has coarser cingulate definitions.

The FreeSurfer atlas parcellations (Desikan-Killiany and Destrieux) differ in their granularity of cingulate cortex parcellation. This tool enables a hybrid annotation that borrows finer-grained cingulate divisions from one atlas while retaining the remainder from another.

## Inputs

### Required Inputs

- **`<parc1>`** — path to the first parcellation annotation file (`.annot`), from which specific labels are harvested (e.g., cingulate subdivisions). The hemisphere is inferred from the filename (must follow the `?h.` naming convention).
- **`<parc2>`** — path to the second parcellation annotation file (`.annot`), which serves as the base annotation. Labels outside the harvested set are taken from this annotation.
- **`<output>`** — output annotation filename.

The tool also implicitly reads the corresponding surface file (`<path>/../surf/<hemi>.orig`) and `FreeSurferColorLUT.txt` from `$FREESURFER_HOME`.

### Input Assumptions

> [!assumption] Hemisphere naming convention
> Both annotation filenames must follow the `?h.<name>.annot` convention (e.g., `lh.aparc.annot`). The hemisphere is extracted by scanning the filename for `h.` and reading the preceding character. If the convention is not followed, the tool exits with an error.

> [!assumption] Embedded color table
> Both annotation files must contain embedded color tables (`mris2->ct != NULL`). Annotations without embedded color tables will cause a fatal error.

## Outputs

### Files Created

- **Output annotation** — a merged `.annot` file written to the specified output path. The format is the standard FreeSurfer binary annotation format (see [[annotation-format]]).

### Output Specifications

The output annotation is written to the same surface as the inputs (the `.orig` surface inferred from the path of `parc1`). Coordinate system: surface RAS (see [[coordinate-systems]]).

## Mathematical Foundations

The merge operation is a per-vertex label assignment. For each vertex in the surface:

1. The tool looks up the annotation label (encoded as an RGBA-packed integer) in `parc1` and `parc2`.
2. Vertices belonging to the harvested cingulate label set in `parc1` are assigned the corresponding subdivided label in the output.
3. All other vertices retain the label from `parc2`.

The mapping from coarse cingulate labels to subdivided labels is performed using the `FreeSurferColorLUT.txt` look-up table via `CTABentryNameToAnnotation()`. The specific labels extracted from `parc1` are:

- `s_cingulate`, `g_cingulate`, `s_pericallosal` (input)
- Mapped to: `caudal_acc`, `posterior_cingulate`, `rostral_acc`, `s_caudal_acc`, `s_posterior_cingulate`, `s_rostral_acc`, and corresponding pericallosal subdivisions.

The hemisphere (LH vs. RH) determines which label names are looked up (e.g., `ctx-lh-caudalanteriorcingulate` vs. `ctx-rh-caudalanteriorcingulate`).

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-fsdir <dir>` | string | `$FREESURFER_HOME` | Override the FreeSurfer home directory (used to locate `FreeSurferColorLUT.txt`). |
| `-v <diagno>` | integer | 0 | Set global diagnostic verbosity level (`Gdiag_no`). |
| `--version` | boolean | — | Print version string and exit. |
| `-u`<br>`--help` | boolean | — | Print usage and exit. |

### Configuration Interactions

The tool has minimal configuration options. The key implicit interaction is:

- The output annotation inherits the vertex positions from `parc2` (modified in-place internally), so `parc1` and `parc2` must correspond to the same surface mesh.
- The LUT path depends on `-fsdir` or `$FREESURFER_HOME`; if neither is set, the tool exits with a fatal error.

> [!gotcha] Hard-coded merge logic for cingulate
> The `merge_annotations()` function contains hard-coded logic specific to merging cingulate subdivisions. It is not a general-purpose annotation merge tool; the labels to be transferred are fixed in the source code. Using this tool for arbitrary label merging is not supported without modifying the source.

## Typical Use Cases

### Use Case 1: Merge cingulate subdivisions into Desikan atlas

```bash
mris_merge_parcellations \
  $SUBJECTS_DIR/subject/label/lh.aparc_cingulate_subdivided.annot \
  $SUBJECTS_DIR/subject/label/lh.aparc.annot \
  $SUBJECTS_DIR/subject/label/lh.aparc_merged.annot
```

This takes the cingulate subdivisions from the first annotation and inserts them into the Desikan-Killiany parcellation, writing the result to `lh.aparc_merged.annot`.

## Pipeline Context

`mris_merge_parcellations` is not called by `recon-all` in the standard pipeline. It is a utility tool for post-hoc annotation manipulation.

**No standard predecessor or successor in recon-all.**

## Gotchas and Caveats

> [!gotcha] Usage message is misleading
> The `print_usage()` function in the source prints a message referencing "Hausdorff distance between two labels" — this is incorrect and appears to be copied from another tool. The actual function is annotation merging, not Hausdorff distance computation.

> [!gotcha] In-place modification of parc2 surface
> Internally, the tool reads both `parc1` and `parc2` into surfaces `mris1` and `mris2`, but then calls `merge_annotations(ct, mris1, mris2, mris2)` — i.e., the third argument (output) is the same object as `mris2`. The function modifies `mris2` in place and writes it to the output path.

## Related Tools

- [[mris_ca_label]] — generates cortical parcellation annotations using a probabilistic atlas
- [[mris_sample_parc]] — samples a volumetric parcellation onto a surface
- [[mri_annotation2label]] — converts annotation to individual label files
- [[mri_aparc2aseg]] — maps cortical parcellation to a volumetric segmentation

## Confidence and Gaps

Confidence is **medium**. The source code is short and straightforward; the merge logic and I/O paths are clearly understood. However:

> [!gap] Hard-coded label names
> The label names used in `merge_annotations()` are hard-coded strings (e.g., `"ctx-rh-caudalanteriorcingulate"`). It is not documented anywhere what atlas pair is the intended use case. Confirmation from a developer that this tool is specifically for DK + cingulate-subdivided atlas merges would raise confidence to high.

> [!gap] Whether `parc1` label names need to match LUT exactly
> If the `parc1` annotation was generated with a non-standard atlas (different label names), the `CTABentryNameToAnnotation()` calls will fail with a fatal error. This limitation is not documented.
