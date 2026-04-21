---
title: "mris_annot_diff"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_annot_diff/mris_annot_diff.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_compute_parc_overlap]]"
  - "[[mris_ca_label]]"
  - "[[mris_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - annotation
  - parcellation
  - qa
  - diff
---

# mris_annot_diff

## Summary

`mris_annot_diff` compares two FreeSurfer annotation (`.annot`) files vertex-by-vertex and reports the number of vertices where the label assignments differ. Optionally, it can also compare the embedded colour tables for name and RGBA value mismatches. It is primarily a quality-assurance and regression-testing utility.

## Source Information

- **Language:** C++
- **Source file:** `mris_annot_diff/mris_annot_diff.cpp`
- Uses the `ArgumentParser` framework and the FreeSurfer `colortab`/`mrisurf` libraries.

## Purpose and Context

When developing or validating parcellation atlases and labelling pipelines, it is useful to compare two annotation outputs to quantify differences. `mris_annot_diff` provides a fast, scriptable check: it reads both annotation files, compares label values at each vertex, and exits with code `1` if any differences are found (or `0` if they match). This makes it suitable for use in automated test suites.

The tool also optionally checks whether the embedded colour tables (label names and RGBA values) are identical, which is useful when tracking atlas version changes.

## Inputs

| Input | Description |
|-------|-------------|
| `annot1` | Path to first `.annot` file (positional) |
| `annot2` | Path to second `.annot` file (positional) |

- Both files must have the same number of vertices; the tool will error if they do not match.
- Annotation files are FreeSurfer binary `.annot` format — each vertex carries a packed RGB integer encoding a label.

## Outputs

The tool writes to stdout:

- Count of differing vertices (always printed).
- Per-vertex difference details with vertex number and RGB values of both annotations (only with `--verbose`).
- Colour table comparison results (only with `--diff-ctab`).

Exit code is `0` if annotations are identical, `1` if differences are found.

## Mathematical Foundations

No mathematical transform is performed. The comparison is an exact integer equality test on packed annotation values:

$$
\text{diff}(v) = \mathbb{1}[\text{annot1}[v] \neq \text{annot2}[v]]
$$

$$
\text{ndiffs} = \sum_{v=0}^{N-1} \text{diff}(v)
$$

For the colour table comparison, label names and integer RGBA components are compared with `strcmp` and integer equality checks respectively.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `annot1` | positional string | required | First annotation file |
| `annot2` | positional string | required | Second annotation file |
| `--verbose` | flag | `false` | Print per-vertex differences and their RGB values |
| `--diff-ctab` | flag | `false` | Also compare the embedded colour tables entry by entry |

## Configuration Interactions

- `--verbose` and `--diff-ctab` are independent; both can be specified simultaneously.
- Without `--verbose`, only the total count of differences is printed, making the output machine-parseable.
- `--diff-ctab` continues even if vertex-level diffs were found; exit code reflects both checks.

## Typical Use Cases

```bash
# Silent regression check: exits 0 if identical, 1 if different
mris_annot_diff lh.aparc.annot lh.aparc.expected.annot

# Verbose: show which vertices differ and their label colours
mris_annot_diff --verbose lh.aparc.annot lh.aparc.new.annot

# Also compare the colour tables
mris_annot_diff --diff-ctab lh.aparc.annot lh.aparc.annot.v2
```

## Pipeline Context

Not part of the standard `recon-all` pipeline. Used in:
- Regression testing of parcellation tools.
- QA when updating atlas `.gcs` files and comparing new vs. old labels.
- Validating annotation transfer after [[mris_apply_reg]].

## Gotchas and Caveats

> [!gotcha] Vertex count mismatch is fatal
> If the two annotation files have different vertex counts, the tool exits with a fatal error rather than reporting a diff. Ensure both files were generated from the same surface tessellation.

> [!gotcha] Annotation format only
> The source comment explicitly states "the program only works with `.annot`" — it does not support GIFTI `.gii` label files or FreeSurfer `.label` files directly.

> [!gotcha] Exit code semantics for scripting
> The exit code is `1` (error-like) when differences are found, which is the standard diff-tool convention but may require explicit handling in shell pipelines that treat all non-zero exits as errors.

## Related Tools

- [[mris_compute_parc_overlap]] — computes Dice coefficient and mean min-distance between two parcellations (more quantitative)
- [[mris_ca_label]] — produces annotation files
- [[mris_convert]] — can convert between annotation formats

## Confidence and Gaps

**Confident:** Full tool behaviour is directly readable from the short, complete source file. Flag set, vertex comparison logic, colour table comparison logic, and exit code semantics are all confirmed from code.

**No significant gaps identified.**
