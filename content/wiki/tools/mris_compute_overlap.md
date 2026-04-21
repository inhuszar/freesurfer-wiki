---
title: "mris_compute_overlap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_compute_overlap/mris_compute_overlap.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_compute_parc_overlap]]"
  - "[[mris_annot_diff]]"
  - "[[mris_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - annotation
  - overlap
  - area
  - statistics
---

# mris_compute_overlap

## Summary

`mris_compute_overlap` computes the surface area of each label in an annotation file, along with the total cortical surface area, and optionally outputs the area as a percentage of total. It reports per-label area statistics to stdout or a log file.

## Source Information

- **Language:** C++
- **Source file:** `mris_compute_overlap/mris_compute_overlap.cpp`

## Purpose and Context

In cortical parcellation work, it is often useful to know how much surface area each label occupies, both absolutely and as a fraction of total cortex. `mris_compute_overlap` provides this per-label area breakdown. Despite its name ("overlap"), the tool's primary function is area computation per annotation label. It may have originally been intended for overlap computation between two annotations, but the current implementation reads a single annotation and reports areas.

## Inputs

Positional arguments:

| Positional | Description |
|-----------|-------------|
| `<subject_name>` | FreeSurfer subject name |
| `<hemi>` | Hemisphere: `lh` or `rh` |
| `<surf_name>` | Surface file name (e.g., `white`) |
| `<annot_name>` | Annotation name (e.g., `aparc`) |

- Reads `$SUBJECTS_DIR/<subject>/surf/<hemi>.<surf_name>`.
- Reads `$SUBJECTS_DIR/<subject>/label/<hemi>.<annot_name>.annot`.
- Requires `SUBJECTS_DIR`.

## Outputs

Output to stdout (and optionally to a log file):

- Per-label: label name, surface area in mm².
- If `--pct` is set: area as percentage of total surface.

## Mathematical Foundations

Surface area for each label is computed by summing triangle areas for all faces whose vertices belong to that label:

$$
A_k = \sum_{v: \text{annot}(v) = k} a_v
$$

where $a_v$ is the per-vertex area (area of triangles incident to $v$, divided by 3). `MRIScomputeMetricProperties()` is called first to ensure face areas are current.

The percentage mode divides by total area:

$$
A_k\% = \frac{A_k}{A_{\text{total}}} \times 100
$$

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `-l <fname>` | Log file path | stdout |
| `--in-label <n>` | Restrict to input label integer | -1 (all) |
| `--out-label <n>` | Restrict to output label integer | -1 (all) |
| `--pct` | Report areas as percentages | off |
| `-sdir <dir>` | Override SUBJECTS_DIR | env var |

## Configuration Interactions

- `--pct` requires a successful call to `MRIScomputeMetricProperties()` so `mris->total_area` is valid.
- `--in-label` and `--out-label` were present in the source but may be vestigial (originally for overlap computation between two labels).

## Typical Use Cases

```bash
# Report aparc label areas for left hemisphere
mris_compute_overlap bert lh white aparc

# Report as percentages, log to file
mris_compute_overlap --pct -l /tmp/areas.txt bert lh white aparc
```

## Pipeline Context

Not part of `recon-all`. Used in quality assessment of parcellation results and research analyses.

## Gotchas and Caveats

> [!gotcha] Single annotation only
> Despite the name, the tool operates on a single annotation file. For pairwise overlap (Dice coefficient), use [[mris_compute_parc_overlap]] instead.

## Related Tools

- [[mris_compute_parc_overlap]] — pairwise parcellation overlap (Dice)
- [[mris_annot_diff]] — vertex-level annotation difference count
- [[mris_anatomical_stats]] — full morphometric statistics per parcellation region

## Confidence and Gaps

**Confident:** I/O, area computation, and option set confirmed from source.
