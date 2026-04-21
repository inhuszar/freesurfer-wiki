---
title: "mri_refine_seg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_refine_seg/mri_refine_seg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mri_relabel_hypointensities]]"
  - "[[mri_ca_label]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - segmentation
  - refinement
  - post-processing
---

# mri_refine_seg

## Summary

`mri_refine_seg` post-processes a volumetric segmentation by removing spurious clusters and correcting topological errors. For each label in a configured list, it enforces a maximum number of connected components (clusters). Excess clusters (beyond the allowed maximum) are recoded by assigning each voxel to its most common neighboring label. This produces a topologically cleaner segmentation by eliminating isolated fragments.

## Source Information

- **Language:** C++
- **Source file:** `mri_refine_seg/mri_refine_seg.cpp`
- **Key includes:** `argparse.h`, `mri.h`, `mri2.h`, `volcluster.h`, `pointset.h`

## Purpose and Context

Automated segmentation tools sometimes produce fragmented clusters — for example, two disconnected blobs of thalamus, or isolated voxels of cortex surrounded by white matter. `mri_refine_seg` addresses this by identifying all connected components for each label and removing those that exceed a configured maximum count. The cleaning operation is a majority-vote relabeling: each voxel in the removed cluster is iteratively assigned the label of its most common face-adjacent neighbor.

The tool reads a list of "component" definitions specifying which label to clean, how many clusters are allowed, and optionally an "additional" label (e.g., hypointensities) whose voxels may also be included in the cluster definition.

## Inputs

- **Input segmentation:** A volumetric label volume ([[mgz]] or NIfTI)
- **Component specifications:** Passed via command-line flags specifying label IDs, max cluster counts, and optional additional labels

## Outputs

- **Refined segmentation:** Same geometry as input, with spurious clusters relabeled to neighboring structures

## Mathematical Foundations

**Cluster detection:** For each label $l$ with a defined component spec:
1. The segmentation volume is binarized to isolate voxels with label $l$ (and optionally an `additional` label).
2. Connected components are identified using 6-connectivity (face-adjacent voxels only).
3. If the number of components exceeds `max`, the smallest components are selected for removal.

**Majority-vote relabeling:** For each voxel $v$ in a removed cluster:
1. Find the most common face-adjacent label among $v$'s neighbors that is not $l$.
2. Assign $v$ that label.
3. Iterate until all voxels in the cluster have been relabeled (some voxels may need multiple passes if initially surrounded only by other cluster voxels).

> [!math] Relabeling convergence
> The iterative relabeling is guaranteed to terminate because each iteration relabels at least one voxel (those at the cluster boundary that have a non-$l$ neighbor), and the cluster shrinks monotonically.

## Configuration Options

Flags are parsed by `ArgumentParser` (from `argparse.h`). The tool accepts exactly three flags; the component definitions are entirely hardcoded in the source.

| Flag | Alias | Argument | Description |
|------|-------|----------|-------------|
| `-i` | `--in` | `<file>` | Input segmentation volume (required). |
| `-o` | `--out` | `<file>` | Output refined segmentation volume (required). |
| `--debug` | — | (flag) | Save debug outputs: `refinement.orig.mgz`, `refinement.mask.mgz`, `refinement.points.json` in the output directory. |

> [!gotcha] No user-configurable component definitions
> The `--comp` flag does NOT exist. All component definitions (which labels to clean, max cluster counts, additional labels) are hardcoded in the source. There is no mechanism to add or override component specifications at runtime.

**Hardcoded component behaviour (from source):**

| Label(s) | Max clusters | Additional label | Notes |
|----------|-------------|-----------------|-------|
| Most brain structures (all unique labels except excluded set) | 1 | — | Default: retain only largest cluster |
| Thalamus (10, 49) | 1 | — | |
| Caudate (11, 50) | 1 | — | |
| Putamen (12, 51) | 1 | — | |
| Pallidum (13, 52) | 1 | — | |
| Hippocampus (17, 53) | 1 | — | |
| Amygdala (18, 54) | 1 | — | |
| Subcortical GM structures above | 1 | 80 (non-WM hypo) | Hypointensities included in cluster definition |
| White matter (2, 41) | 1 | 77 (WM hypo) | WM hypointensities included in cluster definition |
| Lateral ventricles (4, 43) | 2 | — | Two clusters allowed (left/right) |

**Excluded from stray-cluster refinement (hardcoded):**

Labels 5, 44 (inferior lateral ventricle), 7, 46 (cerebellum WM), 30, 62 (vessel), 31, 63 (choroid plexus), 24 (CSF), 77 (WM hypointensities), 80 (non-WM hypointensities), 85 (optic chiasm), 165 (skull), 258 (soft nonbrain tissue), 259 (fluid in eyes).

## Configuration Interactions

- `--debug` writes three extra files relative to the output directory; these can be inspected in Freeview to review what changed.
- The tool iterates until no more stray labels remain (convergence loop), so labels influence each other across iterations.

## Typical Use Cases

```bash
# Run with default hardcoded refinement
mri_refine_seg --i aseg.mgz --o aseg_refined.mgz

# Run with debug output
mri_refine_seg --i aseg.mgz --o aseg_refined.mgz --debug
```

## Pipeline Context

`mri_refine_seg` is not a standard step in the main [[recon-all]] stream. It can be used as a post-processing step after any automated segmentation that may produce disconnected clusters. It is conceptually related to [[mri_relabel_hypointensities]], which also performs label reassignment based on local context.

## Gotchas and Caveats

> [!gotcha] 6-connectivity only
> The cluster detection uses only 6-connectivity (face-adjacent voxels), not 26-connectivity. Two clusters connected only at an edge or corner are counted as separate clusters.

> [!gotcha] Only excess clusters are removed
> The tool removes clusters beyond the `max` count, not all but the largest. The "excess" clusters are the smallest ones (by voxel count). The largest cluster is always retained.

> [!gotcha] Relabeling ignores diagonal neighbors
> The majority-vote relabeling also uses only face-adjacent neighbors (`c±1, r±1, s±1`), not diagonal neighbors.

## Related Tools

- [[mri_segment]] — White-matter segmentation (may produce fragmented output)
- [[mri_relabel_hypointensities]] — Relabel hypointensity clusters near surfaces
- [[mri_ca_label]] — Atlas-based segmentation

## Confidence and Gaps

**High confidence.** Full source read. All three flags confirmed from `ArgumentParser` setup (`--i`/`-i`, `--o`/`-o`, `--debug`). All hardcoded component definitions documented. The previously listed `--comp` flag does not exist and has been removed from this page.
