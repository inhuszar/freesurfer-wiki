---
title: "mri_cluster"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_volcluster/mri_cluster.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_volcluster]]"
  - "[[mri_surfcluster]]"
  - "[[mri_binarize]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - statistics
  - clustering
  - connected-components
  - group-analysis
---

# mri_cluster

## Summary

`mri_cluster` performs connected-component clustering on a thresholded MRI overlay (volume or surface), grouping spatially contiguous suprathreshold voxels or vertices into labeled clusters. It supports volume-based and surface-based inputs, optional masking, and OpenMP parallelism. The tool also implements a "corify" operation that extracts the temporal core of segmentations across frames.

## Source Information

- **Language:** C++
- **Source file:** `mri_volcluster/mri_cluster.cpp`
- **Original author:** Douglas N. Greve

Note: The binary is `mri_cluster` but the source lives in the `mri_volcluster/` directory alongside `mri_volcluster.cpp`.

## Purpose and Context

`mri_cluster` identifies spatially contiguous clusters of suprathreshold voxels in statistical maps (e.g., t-maps, z-maps), which is a fundamental step in cluster-based statistical inference. Clusters can be defined by:
- A minimum threshold (`--thmin`)
- A maximum threshold (`--thmax`)
- Sign (positive, negative, or absolute value)
- Neighbor topology (face-connected = 6-neighbor, edge-connected = 18-neighbor, or corner-connected = 26-neighbor)

Outputs are written to an output directory with cluster labeling and statistics.

## Inputs

| Flag | Description |
|------|-------------|
| `--i <overlay>` | Input overlay volume or surface overlay |
| `--mask <mask>` | Binary mask restricting clustering to non-zero voxels |
| `--surf <surffile>` | Surface file (for surface-based clustering) |

## Outputs

Written to `--o <outdir>`:
- Cluster map volume (voxels labeled by cluster number)
- Cluster size/centroid summary table (cluster number, size, centroid, peak value)

## Mathematical Foundations

**Connected components** on a binary activation map $B$ (derived from thresholding):

$$
B(x) = \mathbf{1}\!\left[\text{thmin} \leq \text{sign}(V(x)) \cdot V(x) \leq \text{thmax}\right]
$$

The clustering algorithm uses recursive region growing (`GrowOne`): starting from each unvisited active voxel, it finds all connected active voxels within the specified topology (face/edge/corner neighbors).

**Spatial-temporal corification** (`--corify`): For a 4D segmentation across frames, the "core" of a segmentation $k$ across the temporal dimension is:

$$
\text{core}(v, k) = \begin{cases} k & \text{if } \frac{\text{number of frames where } V(v) \neq k}{\text{total frame span}} \leq \tau \\ 0 & \text{otherwise} \end{cases}
$$

where $\tau$ is the corify threshold (0 = strict: present in all frames, 1 = loose).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o <outdir>` | string | required | Output directory |
| `--i <overlay>` | string | required | Input overlay volume or surface file |
| `--thmin <val>` | float | $-\infty$ | Minimum threshold for cluster inclusion |
| `--thmax <val>` | float | $+\infty$ | Maximum threshold |
| `--abs` | flag | off | Threshold on absolute value of overlay |
| `--pos` | flag | off | Threshold only positive values |
| `--neg` | flag | off | Threshold only negative values |
| `--mask <file>` | string | — | Binary mask volume |
| `--surf <file>` | string | — | Surface file for surface-based clustering |
| `--face` | flag | default(vol) | Face (6-neighbor) topology for volumes |
| `--edge` | flag | — | Edge (18-neighbor) topology |
| `--corner` | flag | — | Corner (26-neighbor) topology |
| `--corify <invol> <thresh> <outvol>` | — | — | Standalone corify operation (see below) |
| `--threads <N>` | int | 1 | OpenMP thread count |
| `--max-threads` | flag | — | Use maximum available threads |
| `--checkopts` | flag | — | Check options and exit without running |
| `--debug` | flag | — | Enable debug output |

## Configuration Interactions

- `--abs`, `--pos`, and `--neg` are mutually exclusive sign selection modes.
- `--face`, `--edge`, `--corner` are mutually exclusive topology modes. For volumes, the default is face (`nbrtype = 1`). Surface clustering ignores topology flags (always uses surface vertex adjacency).
- `--surf` and topology flags (`--face`, `--edge`, `--corner`) are mutually exclusive: specifying a surface file with topology flags produces an error.
- `--corify` is a standalone mode: it reads `invol`, applies the temporal core operation with threshold `thresh`, writes to `outvol`, and exits.

## Typical Use Cases

**Cluster a positive statistical map:**
```bash
mri_cluster --i zstat.mgz --thmin 2.3 --pos --o clusters/
```

**Cluster with a brain mask:**
```bash
mri_cluster --i tstat.mgz --thmin 3.0 --abs \
  --mask brainmask.mgz --o clusters/
```

**Surface-based clustering:**
```bash
mri_cluster --i lh.zstat.mgz --surf lh.white --thmin 2.3 --pos --o clusters/
```

**Temporal corification of a segmentation:**
```bash
mri_cluster --corify longitudinal_segs.mgz 0.2 core_segs.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Used in group-level statistical analysis workflows, particularly in:
- FSFAST fMRI analysis pipelines.
- Group-level morphometric analysis (e.g., VBM-style studies).
- Longitudinal change detection (combined with [[mri_compute_change_map]]).

## Gotchas and Caveats

> [!gotcha] Default topology for volumes is face (6-neighbor)
> The default `nbrtype = 1` (face connectivity) is set in `check_options()`. Diagonal neighbors are not included. For some applications (e.g., matching SPM cluster definitions), edge or corner connectivity may be needed.

> [!gotcha] Corify threshold semantics
> The corify threshold is a fraction between 0 and 1 where 0 means "must be present in all frames" (strictest) and 1 means "can be absent in all frames" (loosest). This is opposite to the intuition of "how much can be missing."

> [!gotcha] Output directory must exist or be creatable
> The tool creates the output directory if it does not exist via `mkdir -p`. If the path is invalid, the tool fails.

## Related Tools

- `mri_volcluster` — older per-cluster-size threshold significance testing (different from this tool despite the shared directory)
- [[mri_surfcluster]] — surface cluster analysis with significance thresholds
- [[mri_binarize]] — threshold a map before clustering
- [[mri_compute_change_map]] — longitudinal change map that can be clustered

## Confidence and Gaps

Source code fully read. Confidence is high.
