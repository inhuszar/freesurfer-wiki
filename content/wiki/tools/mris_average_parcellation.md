---
title: "mris_average_parcellation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_average_parcellation/mris_average_parcellation.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_compute_parc_overlap]]"
  - "[[mris_register]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source in attic/ — verify if installed in 8.2.0."
  - "Output format (frequency map vs. majority-vote annotation) needs confirmation."
tags:
  - parcellation
  - annotation
  - group-average
  - atlas
---

# mris_average_parcellation

## Summary

`mris_average_parcellation` computes a frequency-weighted group average of cortical parcellation labels across a set of subjects. For each vertex in the target space, it counts how often each label appears across subjects (after spherical registration), producing either a majority-vote annotation or a vertex-wise label frequency map.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_average_parcellation/mris_average_parcellation.cpp`
- **Note:** Source lives in `attic/` — may not be installed in all distributions.

## Purpose and Context

When building or evaluating surface-based atlases, it is useful to know how consistently each cortical region is assigned a particular label across subjects. `mris_average_parcellation` aggregates annotation files from multiple subjects (registered to a common sphere) and computes per-vertex label frequencies, enabling identification of regions with high vs. low labelling consistency.

## Inputs

| Input | Description |
|-------|-------------|
| `<hemi>` | Hemisphere: `lh` or `rh` (positional) |
| `<annot_name>` | Annotation file name (e.g., `aparc`) (positional) |
| `<subject1> ... <subjectN>` | List of subject names (positional) |
| `<out_fname>` | Output file path (positional) |

- Reads `$SUBJECTS_DIR/<subject>/surf/<hemi>.<surface>` and corresponding annotation files.
- Requires `SUBJECTS_DIR` to be set.

## Outputs

| Output | Description |
|--------|-------------|
| `<out_fname>` | Per-vertex label frequency data or majority-vote annotation |

## Mathematical Foundations

For each vertex $v$ and each subject $s$, let $\ell(v, s)$ be the label assigned. The frequency of label $k$ at vertex $v$ is:

$$
p(k, v) = \frac{1}{N} \sum_{s=1}^{N} \mathbb{1}[\ell(v, s) = k]
$$

The majority-vote annotation assigns:

$$
\hat{\ell}(v) = \arg\max_k \; p(k, v)
$$

The `counts` array (shape: `nvertices × nlabels`) is the core data structure, allocated as `int **counts`.

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `-sdir <dir>` | Override SUBJECTS_DIR | env var |
| (positional args) | hemi, annot_name, subjects..., out_fname | required |

> [!gap] Full flag set not verified
> The `get_option()` body was not fully read. Additional flags may exist.

## Configuration Interactions

Subjects are processed in the order listed. Missing or unreadable annotation files will cause the tool to exit with an error for that subject.

## Typical Use Cases

```bash
# Average aparc parcellations across three subjects
mris_average_parcellation lh aparc bert ernie alice \
    /tmp/lh.avg_aparc.freq
```

## Pipeline Context

Not part of `recon-all`. Used in atlas development and group-consistency analysis.

## Gotchas and Caveats

> [!gotcha] Attic placement
> The source is in `attic/` and the binary may not ship with standard FreeSurfer distributions.

## Related Tools

- [[mris_ca_label]] — produces annotation files
- [[mris_compute_parc_overlap]] — computes Dice similarity between two annotations
- [[mris_register]] — registration needed before averaging

## Confidence and Gaps

**Confident:** Core purpose and data structure confirmed from source.

> [!gap] Output format
> Whether the output is a frequency matrix, a curv file, or an annotation is not confirmed. The `out_fname` and counts writing logic were not fully traced.
