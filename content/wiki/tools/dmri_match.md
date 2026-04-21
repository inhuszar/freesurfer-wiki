---
title: "dmri_match"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/AnatomiCuts_correspondences.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_ac.sh]]"
  - "[[dmri_stats_ac]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading the full main() parser"
  - "Exact cost matrix construction for Hungarian algorithm not fully traced"
tags:
  - diffusion
  - tractography
  - matching
  - hungarian
  - cross-subject
---

# dmri_match

## Summary

`dmri_match` establishes correspondence between AnatomiCuts fiber bundle clusters from two subjects by solving an optimal assignment problem using the Hungarian (Kuhn-Munkres) algorithm. Given two subjects' cluster sets (from `dmri_AnatomiCuts`) and their respective parcellation images, it computes a pairwise similarity matrix between clusters and finds the minimum-cost one-to-one matching, producing a CSV file mapping each cluster in subject 1 to its best-matching cluster in subject 2.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/AnatomiCuts_correspondences.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_match`
- **Author:** Viviana Siless (MGH)
- **Key libraries:** ITK, VTK, VNL (`vnl_hungarian_algorithm`), FreeSurfer `colortab.h`

## Purpose and Context

Cross-subject fiber bundle correspondence is a prerequisite for group-level tract analysis. Since AnatomiCuts independently clusters each subject's tractography, the cluster indices are not inherently aligned across subjects. `dmri_match` solves this alignment problem using the Hungarian algorithm — a classical combinatorial optimization method — to find the globally optimal one-to-one assignment of clusters between two subjects that minimizes a measure of inter-subject bundle dissimilarity.

This is called the "Hungarian" step in the `dmri_ac.sh` pipeline.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Segmentation 1 | `-s1` | Parcellation image for subject 1 | NIfTI/MGZ |
| Segmentation 2 | `-s2` | Parcellation image for subject 2 | NIfTI/MGZ |
| Cluster directory 1 | `-h1` | Directory containing subject 1's AnatomiCuts `.trk` clusters | path |
| Cluster directory 2 | `-h2` | Directory containing subject 2's AnatomiCuts `.trk` clusters | path |
| Number of clusters | `-c` | Number of clusters to match | int |
| Output file | `-o` | Output correspondence CSV | CSV |
| Labels flag | `-labels` | Use label-based similarity | flag |
| Hungarian flag | `-hungarian` | Use Hungarian algorithm (vs. greedy) | flag |
| Bounding box flag | `-bb` | Use bounding box constraint | flag |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Correspondence CSV | Mapping of cluster indices: cluster_i in subject1 → cluster_j in subject2 with cost | CSV |

## Mathematical Foundations

The similarity between cluster $A$ from subject 1 and cluster $B$ from subject 2 is computed as a label-histogram-based distance. Using the `LabelsEntropyAndIntersectionMembershipFunction`:

$$d(A, B) = \sum_{\text{positions}} H(\text{labels}_A^{\text{pos}}, \text{labels}_B^{\text{pos}})$$

where $H$ is a histogram distance or entropy-based dissimilarity over the anatomical labels encountered at each resampled streamline position.

The **Hungarian algorithm** then solves the linear assignment problem:

$$\min_{\sigma} \sum_{i=1}^{N} d(A_i, B_{\sigma(i)})$$

where $\sigma$ is a permutation over $N$ clusters. This finds the globally optimal one-to-one matching in $O(N^3)$ time. The VNL implementation (`vnl_hungarian_algorithm`) is used.

The source also handles **symmetric matching** across hemispheres using `SymmetricLabelId()`, which maps left-hemisphere label IDs to their right-hemisphere equivalents using the FreeSurferColorLUT color table.

## Configuration Options

From the `dmri_ac.sh` usage pattern:

| Flag | Type | Description |
|------|------|-------------|
| `-s1 <file>` | file | Parcellation image for subject 1 |
| `-s2 <file>` | file | Parcellation image for subject 2 |
| `-h1 <dir>` | dir | AnatomiCuts cluster directory for subject 1 |
| `-h2 <dir>` | dir | AnatomiCuts cluster directory for subject 2 |
| `-c <n>` | int | Number of clusters to match |
| `-o <file>` | file | Output correspondence CSV file |
| `-labels` | flag | Use label-based membership function |
| `-hungarian` | flag | Use Hungarian algorithm (vs. greedy matching) |
| `-bb` | flag | Apply bounding-box spatial constraint |

> [!gap] Complete flag list
> Additional flags may exist in the full argument parser that are not used in the `dmri_ac.sh` default call.

## Configuration Interactions

- `-labels` and `-hungarian` are typically used together for optimal label-based assignment.
- `-bb` restricts matches to spatially proximate clusters (bounding box overlap), which can improve speed and relevance when only anatomically nearby bundles should be matched.
- The cluster count `-c` must match the count used in `dmri_AnatomiCuts`.

## Typical Use Cases

```bash
# Standard Hungarian matching between subject and template
dmri_match \
  -s1 /data/template/dmri/wmparc2dwi.nii.gz \
  -s2 /data/subject01/dmri/wmparc2dwi.nii.gz \
  -h1 /data/template/dmri.ac/45/4/ \
  -h2 /data/subject01/dmri.ac/45/4/ \
  -o /data/subject01/dmri.ac/45/4/match/template_subject01_c200_hungarian.csv \
  -labels -hungarian -c 200

# With bounding box constraint
dmri_match -s1 seg1.nii.gz -s2 seg2.nii.gz \
           -h1 clusters1/ -h2 clusters2/ \
           -o match.csv -labels -hungarian -c 100 -bb
```

## Pipeline Context

`dmri_match` is called by `dmri_ac.sh` (`Hungarian` function) after `dmri_AnatomiCuts` and `streamlineFilter` (outlier removal). The correspondence CSV it produces is consumed by `dmri_stats_ac` and `dmri_extractSurfaceMeasurements`.

```
dmri_AnatomiCuts --> streamlineFilter --> dmri_match --> dmri_stats_ac
```

## Gotchas and Caveats

> [!gotcha] Cluster count must match
> The `-c` argument must correspond to the number of clusters that exist in the cluster directories. If the directories contain fewer clusters (due to filtering), the matching will fail or produce incorrect results.

> [!gotcha] Hemisphere symmetry via FreeSurferColorLUT
> The tool reads `$FREESURFER_HOME/FreeSurferColorLUT.txt` to resolve symmetric label IDs. If `FREESURFER_HOME` is not set or the LUT is missing, this will fail silently or crash.

## Related Tools

- [[dmri_AnatomiCuts]] — produces the cluster files consumed by this tool
- [[dmri_stats_ac]] — uses the correspondence CSV to extract measures
- [[dmri_extractSurfaceMeasurements]] — also uses the correspondence CSV
- [[dmri_ac.sh]] — orchestrates the matching step

## Confidence and Gaps

> [!gap] Full argument parser not read
> The flag descriptions are based on the `dmri_ac.sh` usage. The full argument parser in `main()` was not read.
