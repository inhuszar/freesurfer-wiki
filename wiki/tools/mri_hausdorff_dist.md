---
title: "mri_hausdorff_dist"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_hausdorff_dist/mri_hausdorff_dist.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_label_accuracy]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - evaluation
  - distance
  - segmentation
  - quality-control
---

# mri_hausdorff_dist

## Summary

`mri_hausdorff_dist` computes the modified (mean) Hausdorff distance or the maximum Hausdorff distance between binary label regions across a set of input volumes. Given multiple binary segmentation volumes (or volumes that will be binarized), it measures how well the boundaries agree by computing the directed Hausdorff distance from each volume's boundary to every other volume's boundary. The output is a distance matrix or summary statistics written to a file.

## Source Information

- **Source language:** C++
- **Source file:** `mri_hausdorff_dist/mri_hausdorff_dist.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

The Hausdorff distance is a standard metric for evaluating the agreement between two sets (in this context, two segmentation boundaries). It is used in:

- **Segmentation evaluation:** comparing an automated segmentation against a manual ground truth
- **Inter-rater reliability:** measuring how consistently two raters delineate the same structure
- **Longitudinal consistency:** measuring boundary stability across time points
- **Atlas evaluation:** comparing atlas-based segmentations against reference standards

`mri_hausdorff_dist` supports both the classic maximum Hausdorff distance (which is sensitive to outliers) and the modified mean Hausdorff distance (more robust).

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Input volumes | positional | Two or more binary (or binarizable) volumes |
| File list | `-F` | Text file listing volume paths, one per line |

- Volumes are binary by default (non-zero = foreground).
- `-b <thresh>` can threshold a continuous volume to produce a binary mask before computing distance.
- `-l <label>` specifies which integer label value to treat as foreground in a label volume (default: 1).

## Outputs

The tool writes a text file (last positional argument) containing the distance values. The format is a matrix or a per-pair list.

## Mathematical Foundations

For two binary sets $A$ and $B$ in $\mathbb{R}^3$:

**Directed Hausdorff distance from $A$ to $B$:**

$$d(A \to B) = \sup_{a \in \partial A} \inf_{b \in \partial B} \|a - b\|$$

**Symmetric (maximum) Hausdorff distance:**

$$H(A, B) = \max\left(d(A \to B),\; d(B \to A)\right)$$

**Modified (mean) Hausdorff distance** (default in `mri_hausdorff_dist`):

$$H_\text{mean}(A, B) = \frac{1}{|\partial A|} \sum_{a \in \partial A} \inf_{b \in \partial B} \|a - b\|$$

where $\partial A$ and $\partial B$ are the boundaries (surface voxels) of $A$ and $B$.

The distance computation uses a signed distance transform (DTRANS_MODE_SIGNED) so boundary voxels are identified as zero-crossings of the signed distance field, and distances are reported in physical millimetres by default (using the voxel size from the image header).

## Configuration Options

All flags use a single dash. Option matching is case-insensitive.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-F` | — | false | Read input volume file paths from a text file instead of positional arguments; in this mode the first positional argument is the filename of the text file listing one volume path per line. |
| `-max` | — | false | Compute the maximum (worst-case) Hausdorff distance instead of the default mean of minimum distances. |
| `-b <thresh>` | float | — | Binarize each input volume at threshold `<thresh>` before computing distances: voxels above threshold become `target_label`, voxels at or below become 0. |
| `-l <label>` | int | 1 | Integer label value to use as the foreground class in the distance computation (applies after binarization if `-b` is also given). |
| `-g <sigma>` | float | 0 (off) | Gaussian-smooth each input volume with standard deviation `<sigma>` voxels before distance computation; reduces sensitivity to staircase boundary artefacts. |
| `-v` | — | false | Ignore voxel size information and report distances in voxel units (sets `xsize = ysize = zsize = 1`). Default is to use physical mm from the image header. |

> [!gotcha] Default distance unit is mm, not voxels
> Distances are computed in physical millimetres using the voxel size from the image header. Use `-v` to report raw voxel distances (which makes the result independent of voxel size).

## Configuration Interactions

- `-b <thresh>` and `-l <label>` interact: binarization runs first (converting suprathreshold voxels to `target_label`), and then the distance transform uses `target_label` as the foreground.
- `-max` and the default mean mode are mutually exclusive; the last parsing of the flag wins (but there is only one `-max` flag).
- `-g <sigma>` is applied before binarization and distance transform; smoothing a binary image effectively softens the boundary, which can change which voxels qualify as boundary zero-crossings.

## Typical Use Cases

**Compare two binary segmentations:**
```bash
mri_hausdorff_dist seg1.mgz seg2.mgz distances.txt
```

**Compare a set of segmentations listed in a file (all pairs):**
```bash
mri_hausdorff_dist -F seg_list.txt distances.txt
```

**Maximum Hausdorff distance with binarization:**
```bash
mri_hausdorff_dist -max -b 0.5 prob_map1.mgz prob_map2.mgz hdist.txt
```

**Compute distance using a specific label as foreground:**
```bash
mri_hausdorff_dist -l 17 seg1.mgz seg2.mgz hdist.txt
```

**Report distances in voxels rather than mm:**
```bash
mri_hausdorff_dist -v seg1.mgz seg2.mgz hdist_vox.txt
```

## Pipeline Context

`mri_hausdorff_dist` is not part of `recon-all`. It is a standalone evaluation tool, commonly used in:
- Segmentation algorithm development and benchmarking
- Quality control of automated segmentations
- Cross-site reliability studies

## Gotchas and Caveats

> [!gotcha] Boundary computation in 3D
> In discrete 3D volumes, boundary voxels are defined as foreground voxels with at least one background neighbor. Highly irregular boundaries (e.g., from low-resolution volumes) can produce artificially large Hausdorff distances due to staircase effects. Use `-blur` to mitigate this.

> [!gotcha] Distance units
> By default, distances are in physical mm (using the image voxel size from the header). Use `-v` to force voxel units instead, which makes the result independent of voxel size but not directly comparable across different resolutions.

> [!gotcha] Computational cost scales with volume size
> For large volumes, the pairwise distance computation over all boundary voxels can be slow. Up to 100 volumes can be processed simultaneously (limited by `MAX_VOLUMES = 100`).

## Related Tools

- [[mri_binarize]] — creates binary masks from continuous or label volumes
- [[mri_label_accuracy]] — alternative accuracy metric (boundary distance-based)

## Confidence and Gaps

**Confident (from source):** All flags confirmed from complete `get_option()` read. Mean vs. max Hausdorff options, binarization, label selection, MAX_VOLUMES=100 limit, distance-transform-based boundary computation, mm vs. voxel unit modes, output file format (one float per line per volume, comparing each volume against volume 0).
