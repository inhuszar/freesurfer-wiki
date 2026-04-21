---
title: "mris_watershed"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_watershed/mris_watershed.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_watershed]]"
  - "[[mris_anatomical_stats]]"
  - "[[mri_synthstrip]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - watershed
  - parcellation
  - clustering
---

# mris_watershed

## Summary

`mris_watershed` performs watershed-based parcellation of a cortical surface by growing basins from local minima (or maxima) in a scalar surface overlay (e.g., curvature, thickness). It produces a label map on the surface where each basin/cluster is assigned a unique integer label. This is a surface-domain analogue of the classical volumetric watershed transform.

## Source Information

- **Language:** C++
- **Source file:** `mris_watershed/mris_watershed.cpp`
- **Algorithm:** Beucher and Meyer inter-pixel watershed (1993)
- **Key functions:** `MRISinitWatershed()`, `MRISwatershed()`, `MRISmergeBasins()`

## Purpose and Context

The watershed transform partitions a surface into regions of influence around local intensity minima. Applied to cortical curvature, it can identify sulcal and gyral regions. The number of final clusters is controlled by iterative merging of the smallest (or most similar) adjacent basins.

Unlike `mri_surfcluster`, which grows clusters from a threshold, `mris_watershed` does not require a threshold — it partitions the entire surface.

### Algorithm (Beucher-Meyer, 1993)

1. Label each local minimum of the intensity function with a distinct label.
2. Initialize a priority queue with all labeled vertices.
3. For each vertex extracted from the queue (in order of increasing intensity), assign it the label of the lowest-altitude adjacent labeled vertex.
4. Repeat until all vertices are labeled.
5. Merge basins iteratively until the number of basins reaches `max_clusters`.

## Inputs

| Input | Description |
|---|---|
| Positional arg 1 | Surface file (e.g., `lh.white`) |
| Positional arg 2 | Intensity overlay file (e.g., curvature or thickness) |
| Positional arg 3 | Output label file name |

Optional:
| Flag | Description |
|---|---|
| `--nbrs N` | Neighbourhood size for vertex connectivity (default: 3) |
| `--max_clusters N` | Target number of clusters after merging (default: 60) |
| `--merge_type` | Merging strategy: `smallest` (merge smallest basin) or `most_similar` (merge most similar adjacent basins). Default: smallest |
| `--label maskfile` | Mask label file (restrict watershed to these vertices) |

## Outputs

| Output | Description |
|---|---|
| Label file (positional arg 3) | Surface label with each vertex assigned to a basin; nlabels label files written |

The output is a series of label files (one per basin), and the total number of basins is printed to stdout.

## Mathematical Foundations

See algorithm above. The merge step iteratively combines basins:

- **MERGE_SMALLEST** (default): Merge the smallest basin (fewest vertices) with its most connected neighbour.
- **MERGE_MOST_SIMILAR**: Merge the pair of adjacent basins with the most similar mean intensity.

> [!math] Basin merging criterion
> For MERGE_SMALLEST at iteration $k$:
> $$b_{\text{merge}} = \arg\min_{b_i} |b_i|$$
> where $|b_i|$ is the number of vertices in basin $b_i$. The selected basin is merged with its adjacent basin that shares the most border edges.

## Configuration Options

| Flag | Argument | Description |
|---|---|---|
| `-nbrs` | N | Neighbourhood ring size (default: 3) |
| `-max_clusters` | N | Target cluster count (default: 60) |
| `-merge` | type | Merge strategy: `smallest` or `most_similar` |
| `-label` | file | Restrict to vertices in label file |

Usage:
```
mris_watershed [options] <surface> <overlay> <output_labels>
```

## Typical Use Cases

**1. Watershed parcellation of curvature (LH):**
```bash
mris_watershed $SUBJECTS_DIR/bert/surf/lh.white \
               $SUBJECTS_DIR/bert/surf/lh.curv \
               lh.watershed_labels
```

**2. With target of 30 clusters:**
```bash
mris_watershed -max_clusters 30 \
               $SUBJECTS_DIR/bert/surf/lh.white \
               $SUBJECTS_DIR/bert/surf/lh.curv \
               lh.curv.watershed
```

## Pipeline Context

Not part of standard `recon-all`. Used in research workflows for:
- Data-driven surface parcellation
- Sulcal basin identification
- Feature extraction for shape analysis

## Gotchas and Caveats

> [!gotcha] max_clusters is a target, not a guarantee
> Merging stops when the basin count reaches `max_clusters`, but the exact number of output basins depends on the input topology and merge sequence. The actual number of output label files may differ slightly.

> [!gotcha] Not related to mri_watershed
> Despite the similar name, `mris_watershed` operates on surfaces (cortical parcellation), whereas [[mri_watershed]] operates on volumes (skull stripping). They share the algorithm family but are completely different tools.

## Related Tools

- [[mri_watershed]] — volumetric watershed for skull stripping
- [[mri_surfcluster]] — threshold-based surface clustering
- [[mris_anatomical_stats]] — measures per-region morphometry

## Confidence and Gaps

Source code read completely. Algorithm verified from Beucher-Meyer reference cited in source. Confidence is **high**.
