---
title: "mris_label_area"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_label_area/mris_label_area.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[mris_label2annot]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Whether area is mid-surface area or pial/white area not confirmed"
tags:
  - surface
  - labels
  - area
  - morphometry
---

# mris_label_area

## Summary

`mris_label_area` computes the surface area of cortical regions defined by an annotation (`.annot`) file on a FreeSurfer surface. Given one or more integer label indices, it sums the vertex areas of all vertices assigned to each label and reports the area in mm². Optionally, it can report area as a percentage of total surface area (`-p`) and write output to a log file (`-l`).

## Source Information

- **Language:** C++
- **Source file:** `mris_label_area/mris_label_area.cpp`
- **Author:** (no explicit author in source header)

## Purpose and Context

Surface area measurements of cortical regions are a key morphometric measure in FreeSurfer analyses. `mris_label_area` provides a quick way to extract per-label area statistics from an annotation, without the full statistical output of `mris_anatomical_stats`. 

This tool is simpler and more focused than `mris_anatomical_stats`: it reports areas only, for all labels in the annotation, and can be scripted easily.

## Inputs

| Positional | Description |
|------------|-------------|
| `argv[1]` | Subject name |
| `argv[2]` | Hemisphere (`lh` or `rh`) |
| `argv[3]` | Surface name (e.g., `white`, `pial`) |
| `argv[4]` | Annotation name (e.g., `aparc`) |
| `argv[5..N]` | One or more integer label indices to process (required — at least one label must be supplied) |

## Outputs

- **stdout**: Printed table of label areas (and percentage if `-p` is set)
- **log file**: Written to `<logfile>` if `-l <logfile>` is specified

Output format (stdout):
```
label_index  area_mm2  [pct]
```

## Mathematical Foundations

For each label $i$ in the annotation, the area is computed by summing per-vertex areas:

$$
A_i = \sum_{v : \text{annot}(v) = i} a_v
$$

where $a_v$ is the area associated with vertex $v$, computed from `MRIScomputeMetricProperties` as the average of the areas of the faces incident to vertex $v$:

$$
a_v = \frac{1}{3} \sum_{k \ni v} A_k^{\text{face}}
$$

where $A_k^{\text{face}}$ is the area of face $k$ computed via the cross product of its edge vectors.

If `-p` is set, each label area is also expressed as a fraction of the total surface area.

## Configuration Options

The parser strips one leading dash (`option = argv[1] + 1`) and dispatches via a case-insensitive string comparison and a character switch.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-p` | — | off | Also report area as a percentage of total surface area |
| `-l <logfname>` | path | — | Write per-label area output to `logfname` (supports `%d` for label number) |
| `-c <table>` | path | — | Read a named annotation lookup table from `table` |
| `-t <in> <out>` | 2 integers | — | Translate label index `in` to `out` before computing areas |
| `-sdir <dir>` | path | `$SUBJECTS_DIR` | Override the subjects directory |

Positional arguments (required after flags):
1. Subject name
2. Hemisphere (`lh` or `rh`)
3. Surface name (e.g., `white`, `pial`)
4. Annotation name (e.g., `aparc`)
5..N. Label indices (at least one required)

## Configuration Interactions

- `-p` and `-l` are independent and can be combined.
- `-t <in> <out>` translates label IDs before computing areas; useful for re-mapping annotation indices.
- `-c <table>` loads a named annotation table that maps raw annotation integers to human-readable names; affects how labels are looked up internally.

## Typical Use Cases

**Print area for label index 42:**
```bash
mris_label_area bert lh white aparc 42
```

**Print area as percentage of total surface for multiple labels:**
```bash
mris_label_area -p bert lh white aparc 42 43 44 > lh.aparc.areas.txt
```

**Write to log file:**
```bash
mris_label_area -l lh.areas.log bert lh white aparc 42
```

## Pipeline Context

Not part of `recon-all`. Used in post-processing for extracting area measurements from cortical parcellations.

Typical context:
1. [[recon-all]] produces `?h.aparc.annot`
2. `mris_label_area` extracts per-region areas
3. Results are aggregated across subjects for group comparisons

For a more complete set of statistics (thickness, volume, mean curvature), use [[mris_anatomical_stats]].

## Gotchas and Caveats

> [!gotcha] Requires SUBJECTS_DIR
> The tool constructs surface and annotation paths from `$SUBJECTS_DIR`. Either set this environment variable or pass `-sdir <dir>` on the command line.

> [!gotcha] Surface determines area type
> The surface specified (e.g., `white` vs `pial`) determines which surface area is computed. FreeSurfer morphometric convention uses `white` for cortical surface area measurements.

## Related Tools

- [[mris_anatomical_stats]] — more comprehensive per-region morphometric statistics
- [[mris_label2annot]] — creates annotation files from labels
- [[surface-format]] — surface and annotation file formats

## Confidence and Gaps

**Confident (from source):**
- Required positional argument order (subject, hemi, surf, annot, label indices)
- `-p`, `-l`, `-c`, `-t`, `-sdir` flags confirmed from `get_option()`
- Area computation using `MRIScomputeMetricProperties` + per-vertex area summation via `MRISannotArea()`
