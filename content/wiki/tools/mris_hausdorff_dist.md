---
title: "mris_hausdorff_dist"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_hausdorff_dist/mris_hausdorff_dist.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mris_label_area]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "HDIST_MODE_SYMMETRIC_MEAN definition not traced — unclear what exact metric is computed"
  - "Distance transform type (DTRANS_MODE_SIGNED) implications for Hausdorff computation not fully documented"
tags:
  - surface
  - distance
  - morphometry
  - labels
---

# mris_hausdorff_dist

## Summary

`mris_hausdorff_dist` computes the Hausdorff distance between two surface regions (labels) on a cortical mesh. The Hausdorff distance is a measure of how far apart two sets of points are — specifically, the largest minimum distance from any point in one set to the nearest point in the other set. This tool supports both explicit label file inputs and annotation-based all-pairs computation.

## Source Information

- **Language:** C++
- **Source file:** `mris_hausdorff_dist/mris_hausdorff_dist.cpp`
- **Original author:** Bruce Fischl
- **Key dependency:** `MARS_DT_Boundary.h` (distance transform on surface)

## Purpose and Context

The Hausdorff distance is used in surface-based analyses to:
- Measure the worst-case spatial overlap or divergence between two parcellation regions
- Quantify how different two labelings are on the same surface
- Evaluate parcellation consistency across subjects or methods
- Compute all-pairs distances between parcellation regions (annotation mode)

The tool uses a surface distance transform (`MRISdistanceTransform`) rather than Euclidean distance, so distances respect the geodesic geometry of the cortical surface.

## Inputs

**Two-label mode (standard):**

| Positional | Description |
|------------|-------------|
| `argv[1]` | FreeSurfer surface file |
| `argv[2]` | First label file (`.label`) OR surface overlay (any MRI-readable format) |
| `argv[3]` | Second label file (`.label`) OR surface overlay |

When overlays are provided instead of label files, the tool creates binary labels by thresholding the overlay values at the `-b` threshold.

**Annotation mode (`-a`):**

| Flag | Description |
|------|-------------|
| `-a <annot_name>` | Read annotation from surface; compute all-pairs Hausdorff distances between every pair of parcellation regions |

## Outputs

- **Two-label mode:** Prints a single float (Hausdorff distance in mm) to stdout.
- **Annotation mode:** Prints one line per pair: `region1_name region2_name index1 index2 distance`.

## Mathematical Foundations

The Hausdorff distance between two label sets $A$ and $B$ on a surface is:

$$
d_H(A, B) = \max\left(\sup_{a \in A} \inf_{b \in B} d_S(a, b),\; \sup_{b \in B} \inf_{a \in A} d_S(b, a)\right)
$$

where $d_S(\cdot, \cdot)$ is the geodesic distance along the surface mesh.

The implementation uses `HDIST_MODE_SYMMETRIC_MEAN` as the default mode, which may compute a symmetrized or averaged version rather than the strict maximum. The surface distance transform (`MRISdistanceTransform`) with `DTRANS_MODE_SIGNED` computes a signed distance: negative inside the label, positive outside.

The Hausdorff computation (`MRIScomputeHausdorffDistance`) takes both signed distance transforms and derives the Hausdorff metric from them.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-a <annot_name>` | string | — | Annotation file name; triggers all-pairs mode |
| `-b <thresh>` | float | 0 | When inputs are overlays: threshold to create binary labels |

Positional arguments:
1. Surface file
2. Label/overlay 1 (required in two-label mode)
3. Label/overlay 2 (required in two-label mode)

## Configuration Interactions

- When `-a` is specified, positional label arguments 2 and 3 are ignored; all-pairs distances are computed between every pair of annotation regions.
- When `-b` is > 0, both input overlays are thresholded to create label sets. This mode is only active when the inputs are overlay files rather than `.label` files (detected via `mri_identify`).

## Typical Use Cases

**Compute Hausdorff distance between two label files:**
```bash
mris_hausdorff_dist lh.white lh.region1.label lh.region2.label
```

**Compute Hausdorff distance between two thresholded overlays:**
```bash
mris_hausdorff_dist -b 0.5 lh.white lh.activation1.mgh lh.activation2.mgh
```

**Compute all-pairs Hausdorff distances for an annotation:**
```bash
mris_hausdorff_dist -a aparc lh.white
```

## Pipeline Context

Not part of `recon-all`. Used as a post-processing analysis tool for comparing parcellations or label sets. Relevant for:
- Parcellation quality assessment
- Inter-rater reliability studies
- Atlas comparison

## Gotchas and Caveats

> [!gotcha] Output goes to stdout
> Results are printed to standard output only — there is no `--o` flag. Redirect stdout to capture results: `mris_hausdorff_dist ... > distances.txt`.

> [!gotcha] Signed distance transform
> The implementation uses `DTRANS_MODE_SIGNED` for the distance transform, meaning vertices inside the label have negative distances. The Hausdorff computation accounts for this, but if a custom analysis uses intermediate values, the sign convention should be considered.

> [!gap] HDIST_MODE_SYMMETRIC_MEAN
> The default computation mode is `HDIST_MODE_SYMMETRIC_MEAN`. The exact formula implemented in `MRIScomputeHausdorffDistance` has not been traced — it may be the standard Hausdorff maximum, a symmetric mean, or another variant.

## Related Tools

- [[mris_label_area]] — computes area of label regions
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from source):**
- Two-label and annotation modes
- Distance transform type (`DTRANS_MODE_SIGNED`)
- Overlay-to-label conversion via binarization threshold
- Output format (stdout only)

> [!gap] Exact Hausdorff variant
> `HDIST_MODE_SYMMETRIC_MEAN` is the default mode but the precise mathematical formula is not confirmed without tracing into `mrisurf.h`.
