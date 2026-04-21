---
title: "mri_gcut"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_gcut/mri_gcut.cpp"
  - "mri_gcut/pre_pro.cpp"
  - "mri_gcut/graphcut.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[mri_watershed]]"
  - "[[mri_synthstrip]]"
  - "[[mri_normalize]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Graph cut min-cut algorithm variant (max-flow/min-cut implementation) not identified"
tags:
  - skull-stripping
  - brain-extraction
  - graph-cut
---

# mri_gcut

## Summary

`mri_gcut` performs graph-cut skull stripping of a T1-weighted MRI volume. It first estimates a white matter mask (either from the data or using the FreeSurfer intensity convention of 110), then applies a min-cut/max-flow graph algorithm to separate brain from non-brain tissue. The output is a brain mask (`brainmask.auto.mgz`).

## Source Information

- **Language:** C++
- **Source files:**
  - `mri_gcut/mri_gcut.cpp` — main program
  - `mri_gcut/pre_pro.cpp` — preprocessing
  - `mri_gcut/graphcut.cpp` — graph-cut implementation
- **Original authors:** Vitali Zagorodnov, ZHU Jiaqi (Nanyang Technological University, Singapore)

## Purpose and Context

Skull stripping is a prerequisite for virtually all brain MRI analyses. `mri_gcut` provides an alternative to `mri_watershed` and `mri_synthstrip` using the graph-cut paradigm. The algorithm treats brain extraction as a binary image segmentation problem, where "brain" and "non-brain" are two terminal nodes in a graph, and voxel connectivity defines the edge structure.

The method is particularly effective because it preserves connected cortical regions without over-eroding the brain boundary.

## Inputs

| Input | Description |
|-------|-------------|
| `<input>` | Input T1 MRI volume (`.mgz` format) |

The input is expected to be a FreeSurfer-normalised T1 volume, ideally with white matter intensities near 110 when the `-110` flag is used.

## Outputs

| File | Description |
|------|-------------|
| `brainmask_auto.mgz` (default) | Output brain mask in the same directory as input |

If `-mult` is specified and `brainmask_auto.mgz` already exists, the old mask is saved as `brainmask_auto_old.mgz`.

## Mathematical Foundations

Graph-cut skull stripping formulates brain extraction as a max-flow / min-cut problem on a graph $G = (V, E)$:

- **Nodes** $V$: one node per voxel plus two terminals (source = brain, sink = non-brain).
- **Edges** $E$: neighbourhood edges (6-connectivity or similar) with capacity based on intensity similarity, plus terminal edges based on unary likelihoods.
- **Min-cut:** partition $V$ into brain $\mathcal{B}$ and non-brain $\overline{\mathcal{B}}$ minimising:

$$
E(\mathcal{B}) = \sum_{i \in V} D_i(L_i) + \sum_{(i,j) \in E} V_{ij}(L_i, L_j)
$$

where $D_i$ is the data term (unary cost) and $V_{ij}$ is the smoothness term (pairwise cost).

**White matter seeding:** the brain-side terminal is seeded either by:
1. The largest connected component of intensity-110 voxels (FreeSurfer convention) with `-110`, or
2. An automatic region-growing procedure initialised within the largest connected component of high-intensity voxels.

If the intensity-110 seed component is too small (< threshold), the tool falls back to the automatic seeding.

The threshold parameter `-T` controls the brain/non-brain intensity boundary as a fraction of the estimated white matter intensity.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<input>` | path | required | Input T1 volume (`.mgz`) |
| `-110` | flag | off | Use intensity-110 voxels as white matter seed (FreeSurfer mode) |
| `-mult` | flag | off | Multiply result with existing `brainmask.auto.mgz` (failsafe) |
| `-T <value>` | float | 0.40 | Threshold as fraction of WM intensity (0–1); larger = more conservative |
| `-mask <file>` | path | — | External mask file to use as seed |

## Configuration Interactions

- `-110` and the default region-growing seed are alternatives. If `-110` is specified but the 110-intensity component is too small, the tool automatically falls back to region-growing with a warning.
- `-mult`: when the resulting graph-cut mask is less than 75% the volume of the existing `brainmask.auto.mgz` (from a prior run), the existing mask is used instead of the new cut result. This is a failsafe against catastrophic under-stripping.
- `-T` controls aggressiveness: values closer to 1.0 produce tighter (more conservative) masks with more risk of brain erosion; lower values are more lenient but may leave more non-brain tissue.

> [!gotcha] Failsafe threshold
> If the graph-cut result is less than 75% of the previous mask volume and `-mult` is given, the previous mask is used and the new result is discarded silently. This can mask failures in the graph-cut step.

## Typical Use Cases

```bash
# Basic skull stripping with automatic WM seed
mri_gcut T1.mgz

# Use FreeSurfer 110-intensity convention as seed
mri_gcut -110 T1.mgz

# More conservative threshold (less brain, more skull-stripped)
mri_gcut -110 -T 0.50 T1.mgz

# Combine with existing mask (failsafe mode)
mri_gcut -110 -mult T1.mgz
```

## Pipeline Context

`mri_gcut` is used in `recon-all` as part of `autorecon1` (skull stripping stage). In the standard pipeline, it may be invoked alongside or as an alternative to `mri_watershed`. The `-mult` option is particularly relevant in the pipeline context, where a watershed-derived mask may already exist.

Related stages: skull stripping follows intensity normalisation (`mri_normalize`) and precedes surface tessellation.

## Gotchas and Caveats

- Expected memory: ~1–1.5 GB for a standard 256×256×256 volume.
- Output filename (`brainmask_auto.mgz`) is fixed and written in the same directory as the input. There is no `-o` flag for the output path.
- When the `-110` seed component is too small, the fallback to region-growing may produce different results than expected. The user is not explicitly warned in all cases.
- The tool works on `.mgz` format only.

## Related Tools

- [[mri_watershed]] — alternative skull stripping (watershed algorithm)
- [[mri_synthstrip]] — newer deep-learning skull stripping (preferred in recent pipelines)
- [[mri_normalize]] — produces the intensity-normalised volume typically fed to this tool

## Confidence and Gaps

**High confidence:** algorithm description, options, and failsafe behaviour are all documented in the source header comments.

> [!gap] Graph-cut implementation
> The specific max-flow algorithm variant (e.g., Boykov-Kolmogorov, push-relabel) in `graphcut.cpp` was not identified. Performance and behaviour characteristics depend on this choice.
