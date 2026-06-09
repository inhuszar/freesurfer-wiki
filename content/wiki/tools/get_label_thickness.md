---
title: "get_label_thickness"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/get_label_thickness"
families: []                     # tiny text-processing helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[mri_segstats]]"
  - "[[mris_convert]]"
  - "[[label-format]]"
  - "[[curv-format]]"
  - "[[make_cortex_label]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - thickness
  - label
  - cortex
  - text-processing
  - roi
---

# get_label_thickness

## Summary

`get_label_thickness` is a tiny text-filtering helper that pulls the per-vertex cortical thickness values for the vertices listed in a FreeSurfer label file out of an ASCII thickness file. It takes three positional arguments — a label file, an ASCII (text) thickness file, and an output filename — and writes, for each vertex in the label, the matching line from the thickness file. It does no geometry, registration, or averaging; it is a `grep`/`awk` join on vertex numbers.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/get_label_thickness`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness)
- **Binary/script location:** `$FREESURFER_HOME/bin/get_label_thickness`

## Purpose and Context

A FreeSurfer [[label-format|label]] enumerates a set of surface vertices (an ROI on the cortical surface). Cortical thickness, normally stored in the binary [[curv-format|curv]] file `?h.thickness`, can be exported to a text file (one `vertex value` pair per line) with e.g. [[mris_convert]] `-c`. `get_label_thickness` then restricts that text file to just the vertices named in the label, producing a small table of thickness values for the ROI — convenient for ad-hoc inspection or piping into another script.

It is a stand-alone convenience utility, **not** part of [[wiki/pipelines/recon-all|recon-all]] (it appears only in `scripts/CMakeLists.txt`). For quantitative ROI thickness statistics, the canonical tool is [[mris_anatomical_stats]] (which reports mean thickness within a label directly); `get_label_thickness` is the bare-bones, dependency-free alternative when you just want the raw per-vertex numbers.

## Inputs

### Required Inputs

The three arguments are positional ([`scripts/get_label_thickness:11-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L11-L13)); there is no flag parsing and no `--help`/`--version`:

1. **Label file** (`$1`) — an ASCII FreeSurfer [[label-format|label]]. The first two lines (the `#!ascii …` comment and the vertex count) are stripped, leaving the per-vertex rows whose first column is the vertex number ([`scripts/get_label_thickness:20-21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L20-L21)).
2. **ASCII thickness file** (`$2`) — a text file with one line per vertex whose first field is the vertex number and which contains the thickness value (e.g. produced by `mris_convert -c lh.thickness lh.white lh.thickness.asc`).
3. **Output file** (`$3`) — destination for the filtered lines; overwritten if it already exists ([`scripts/get_label_thickness:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L27)).

### Input Assumptions

> [!assumption] Vertex numbering must match between label and thickness file
> The join is purely on the first whitespace-delimited field (the vertex index),
> matched with an anchored `grep -e "^$v"`
> ([`scripts/get_label_thickness:28-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L28-L30)). The label and the ASCII thickness
> file must therefore come from the **same surface** (same hemisphere, same
> subject, same tessellation) so that vertex indices correspond.

## Outputs

### Files Created

| File | Contents |
|------|----------|
| output file (`$3`) | the lines of the ASCII thickness file (`$2`) whose vertex number appears in the label (`$1`), in label order — one line per label vertex |

### Output Specifications

The output is a plain-text table; each row is a verbatim line from the input thickness file (typically `vertex x y z thickness` or `vertex thickness`, depending on how the ASCII thickness file was generated). The tool computes no summary statistics.

## Mathematical Foundations

None — this is a string-matching filter (an inner join on vertex index). No interpolation, averaging, or transformation is performed.

## Configuration Options

None. There are no flags; all three inputs are positional and mandatory in order.

## Typical Use Cases

### Extract thickness for an ROI label

```bash
# 1. Export thickness to ASCII (one line per vertex).
mris_convert -c $SUBJECTS_DIR/subj/surf/lh.thickness \
  $SUBJECTS_DIR/subj/surf/lh.white lh.thickness.asc

# 2. Filter to the vertices in an ROI label.
get_label_thickness lh.roi.label lh.thickness.asc lh.roi.thickness.asc
```

`lh.roi.thickness.asc` then holds the thickness lines for exactly the vertices in
`lh.roi.label` (example invocation from the script header,
[`scripts/get_label_thickness:5-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L5-L7)).

## Pipeline Context

Stand-alone helper; **not** called by [[wiki/pipelines/recon-all|recon-all]] or
[[trac-all]].

**Predecessors:** a surface label ([[make_cortex_label]], `mri_annotation2label`,
or a hand-drawn label) and an ASCII thickness file ([[mris_convert]] `-c` of
`?h.thickness`) → **get_label_thickness** → **Successors:** ad-hoc analysis of the
extracted values (e.g. averaging in a spreadsheet or another script).

**Predecessor:** [[mris_convert]] → **This tool** → **Successor:** user analysis.

## Gotchas and Caveats

> [!gotcha] `tcsh -ef` aborts on the first error
> The shebang is `#!/bin/tcsh -ef` ([`scripts/get_label_thickness:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L1)),
> so the script exits immediately on any failed command and on any undefined
> variable. Calling it with fewer than three arguments leaves `$2`/`$3` undefined
> and the script aborts rather than printing usage.

> [!gotcha] Substring vertex matches are possible
> The match is the anchored but unbounded pattern `^$v` (no trailing word
> boundary), so vertex `12` would also match a line beginning `120`
> ([`scripts/get_label_thickness:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L29)). In practice the ASCII thickness file
> is whitespace-delimited so this rarely bites, but it is a latent edge case for
> oddly formatted inputs.

> [!gotcha] Header stripping is positional, not pattern-based
> The first two lines are removed by re-grepping out copies of the current first
> line ([`scripts/get_label_thickness:20-21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L20-L21)); this assumes the standard
> two-line ASCII label header (comment line + count). A non-standard header could
> drop the wrong rows.

## Error Compensation and Guard Rails

Minimal by design. The only guard rail is removing a pre-existing output file
before appending ([`scripts/get_label_thickness:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness#L27)); there is no
argument validation, existence checking, or usage message. `tcsh -ef` provides
implicit fail-fast behaviour.

## Related Tools

- [[mris_anatomical_stats]] — the canonical way to get mean cortical thickness within a label (with proper area weighting and statistics).
- [[mri_segstats]] — analogous per-label/segment statistics in the volume domain.
- [[mris_convert]] — `-c` exports a binary thickness (curv) file to the ASCII form this tool consumes.
- [[make_cortex_label]] — one source of the input surface label.

## Confidence and Gaps

**High confidence:** the entire 33-line script was read; behaviour, the three
positional arguments, the header-stripping logic, and the vertex-matching join are
fully determined from [`scripts/get_label_thickness`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness). It has no flags and no
hidden modes.

## References

- FreeSurfer source: [`scripts/get_label_thickness`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/get_label_thickness) (v8.2.0).
- See [[label-format]] for the ASCII label layout and [[curv-format]] for the thickness (curv) format.
