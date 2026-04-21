---
title: "mri_compute_distances"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hires_register/mri_compute_distances.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_label_volume]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - distance
  - segmentation
  - evaluation
---

# mri_compute_distances

## Summary

`mri_compute_distances` computes the average Hausdorff distance (or centroid distance) between corresponding labelled regions in two segmentation volumes. It is used for evaluating the spatial correspondence of labelled structures across subjects or between manual and automated segmentations.

## Source Information

- **Language:** C++
- **Source file:** `mri_hires_register/mri_compute_distances.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

When comparing two segmentations (e.g., automated vs. manual, or two automated segmentations), a standard metric is the Hausdorff distance between corresponding label boundaries. `mri_compute_distances` computes this for one or more specified labels, reporting the average and standard deviation.

Optionally, centroid distances can be computed instead of Hausdorff distances (via `-c`), which is faster but less sensitive to boundary shape.

## Inputs

| Argument | Description |
|----------|-------------|
| `<seg1>` | First segmentation volume |
| `<seg2>` | Second segmentation volume |
| `<label1> <label2> ...` | One or more integer label values to compute distances for |

Label values refer to CMA (cortical/subcortical) anatomical labels as defined in FreeSurfer's label numbering scheme.

## Outputs

- Printed to stdout: for each label: `<label_id> <label_name> <distance> <sigma>`
- Also printed to stderr: same information with `±` notation for standard deviation.

## Mathematical Foundations

For each specified label, the tool computes the average Hausdorff distance between all segments of that label in the two volumes.

The **Hausdorff distance** between two sets $A$ and $B$ is:

$$
d_H(A, B) = \max\left(\sup_{a \in A} \inf_{b \in B} d(a,b),\; \sup_{b \in B} \inf_{a \in A} d(a,b)\right)
$$

The **average Hausdorff distance** used here averages over all pairs of segments (connected components) between the two volumes for a given label, using `MRIcomputeSegmentPairHausdorffDistance()`.

The **centroid distance** (when `-c` is used) computes:

$$
d_c(A, B) = \|\text{centroid}(A) - \text{centroid}(B)\|_2
$$

between corresponding segment centroids via `MRIcomputeSegmentPairCentroidDistance()`.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (positional 1) | volume | required | First segmentation volume |
| (positional 2) | volume | required | Second segmentation volume |
| (positional 3+) | int(s) | required | Label value(s) to compute distances for |
| `-t <in> <out>` | int pair | — | Translate label `<in>` to `<out>` before computing (repeatable) |
| `-c` | flag | off | Compute centroid distances instead of Hausdorff |

## Configuration Interactions

- `-t <in> <out>` can be specified multiple times to remap label values before distance computation. This is applied to both volumes simultaneously.
- `-c` and default (Hausdorff) modes are mutually exclusive; the last specified mode wins.

## Typical Use Cases

```bash
# Compute Hausdorff distance for hippocampus (label 17) and amygdala (label 18)
mri_compute_distances aseg_auto.mgz aseg_manual.mgz 17 18

# Centroid distance for multiple structures
mri_compute_distances seg1.mgz seg2.mgz -c 17 18 10 11 12

# With label remapping (combine labels 17 and 53 into one)
mri_compute_distances seg1.mgz seg2.mgz -t 53 17 17
```

## Pipeline Context

Not part of `recon-all`. Used in evaluation workflows, e.g., benchmarking segmentation algorithms or assessing registration quality. Can be combined with `mri_label_volume` for volume-based evaluation alongside distance-based evaluation.

## Gotchas and Caveats

- The Hausdorff distance is computed at the segmentation voxel level, not the sub-voxel surface level. Results depend on voxel size.
- If a label is absent in one or both segmentations, the result may be undefined or zero — the tool does not explicitly warn about missing labels.
- Label translation (`-t`) is applied before segmentation, so it changes which voxels are included in the analysis.

## Related Tools

- [[mri_label_volume]] — compute volume of labelled regions
- [[mri_convert]] — format conversion

## Confidence and Gaps

**High confidence:** usage and algorithm are clear from the source code and function names.
