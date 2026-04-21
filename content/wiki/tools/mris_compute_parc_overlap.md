---
title: "mris_compute_parc_overlap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_compute_parc_overlap/mris_compute_parc_overlap.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_compute_overlap]]"
  - "[[mris_annot_diff]]"
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - annotation
  - overlap
  - dice
  - statistics
---

# mris_compute_parc_overlap

## Summary

`mris_compute_parc_overlap` compares two cortical parcellation annotations for a subject and computes: (1) an overall Dice coefficient measuring parcellation agreement, and (2) mean minimum boundary distance for each label, indicating spatial accuracy of boundary placement in millimetres. It is the primary tool for quantitative parcellation evaluation in FreeSurfer.

## Source Information

- **Language:** C++ (original author: Nick Schmansky)
- **Source file:** `mris_compute_parc_overlap/mris_compute_parc_overlap.cpp`

## Purpose and Context

When evaluating a new cortical parcellation algorithm (e.g., testing a new atlas or modified parameters), it is essential to quantify how closely the output matches a reference annotation. `mris_compute_parc_overlap` provides two complementary metrics:

1. **Dice coefficient**: vertex-count-based overlap per label — measures how much the two annotations agree on label assignment.
2. **Mean minimum distance**: average distance between boundary vertices of the same label in each annotation — measures spatial accuracy of boundary placement.

These metrics together characterise both volumetric overlap and boundary precision.

## Inputs

Required flags:

| Flag | Description |
|------|-------------|
| `--s <subject>` | FreeSurfer subject name |
| `--hemi <hemi>` | Hemisphere: `lh` or `rh` |
| `--annot1 <annotfile>` | First annotation file (reference) |
| `--annot2 <annotfile>` | Second annotation file (test) |

Optional:

| Flag | Description | Default |
|------|-------------|---------|
| `--sd <dir>` | Override SUBJECTS_DIR | env var |
| `--use-labels <file>` | Text file listing labels to check (one per line) | all labels |
| `--label1 <name>` | Compare single label from annot1 | — |
| `--label2 <name>` | Compare single label from annot2 | — |
| `--version` | Print version | — |
| `--help` | Print help | — |

## Outputs

Output to stdout:

- Overall Dice coefficient across all labels.
- Per-label: label name, Dice coefficient, mean minimum boundary distance (mm).

## Mathematical Foundations

For two annotation sets $A$ and $B$ and label $k$:

**Dice coefficient:**
$$
D_k = \frac{2 |A_k \cap B_k|}{|A_k| + |B_k|}
$$

where $|A_k|$ is the number of vertices labelled $k$ in annotation $A$.

**Mean minimum boundary distance:**

Let $\partial A_k$ be the set of boundary vertices of label $k$ in annotation $A$ (vertices labelled $k$ adjacent to a vertex with a different label). Then:

$$
d_k = \frac{1}{|\partial A_k|} \sum_{v \in \partial A_k} \min_{u \in \partial B_k} \|v - u\|
$$

The `meanMinDist` field in `LABEL_INFO` stores this per-label value.

## Configuration Options

See the flags table in Inputs.

## Configuration Interactions

- `--use-labels` restricts the comparison to a subset of labels, useful when only certain regions are of interest.
- `--label1` and `--label2` enable single-label comparisons (e.g., checking a single parcellation region).
- When `--annot1` and `--annot2` are both specified as just names (without path), the tool constructs paths from `$SUBJECTS_DIR/<subject>/label/<hemi>.<annot>.annot`.

## Typical Use Cases

```bash
# Compare automatic parcellation against manual reference
mris_compute_parc_overlap --s bert --hemi lh \
    --annot1 aparc --annot2 aparc.manual

# Compare specific labels only
mris_compute_parc_overlap --s bert --hemi lh \
    --annot1 aparc --annot2 aparc.new \
    --use-labels /tmp/roi_labels.txt

# Single-label comparison
mris_compute_parc_overlap --s bert --hemi lh \
    --label1 precentral --label2 precentral
```

## Pipeline Context

Not part of `recon-all`. Used in:
- Validation of automatic parcellation quality.
- Regression testing when atlas parameters change.
- Intra-rater and inter-rater reliability studies.

## Gotchas and Caveats

> [!gotcha] MAX_LABELS = 100
> The tool supports at most 100 label types in the boundary comparison arrays. Parcellations with more than 100 labels (e.g., the Destrieux atlas with 74 bilateral regions) should still work, but verify the boundary labels structure size.

> [!gotcha] MAX_VNOS = 200000
> Boundary vertex storage is limited to 200,000 vertices per label. For very large labels on high-resolution surfaces, this may be insufficient.

> [!gotcha] Annotation paths
> If annotation file names are provided without a full path, the tool constructs paths using the subject directory convention. If annotation files are in non-standard locations, full paths must be provided.

## Related Tools

- [[mris_compute_overlap]] — reports per-label areas (not overlap between two annotations)
- [[mris_annot_diff]] — counts vertex-level differences (simpler, no Dice or distance)
- [[mris_ca_label]] — produces annotation files

## Confidence and Gaps

**Confident:** Full flag set, Dice computation, boundary distance computation, and limit constants all confirmed from source.
