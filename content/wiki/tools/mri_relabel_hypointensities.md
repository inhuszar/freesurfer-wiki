---
title: "mri_relabel_hypointensities"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_relabel_hypointensities/mri_relabel_hypointensities.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_segment]]"
  - "[[mri_relabel_nonwm_hypos]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mgz]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "relabel_hypointensities function details not fully read"
tags:
  - segmentation
  - post-processing
  - white-matter
  - hypointensities
  - autorecon2
---

# mri_relabel_hypointensities

## Summary

`mri_relabel_hypointensities` post-processes the aseg segmentation by relabeling white-matter hypointensity voxels that lie outside the white-matter surface as grey matter, and by relabeling hypointensity voxels neighboring grey matter. It uses the white surface from both hemispheres to determine whether hypointensities are interior (in white matter) or exterior (should be relabeled as cortex or other grey structures).

## Source Information

- **Language:** C++
- **Source file:** `mri_relabel_hypointensities/mri_relabel_hypointensities.cpp`
- **Original author:** Bruce Fischl
- **Key includes:** `mrisurf.h`, `mri.h`, `cma.h`, `mrishash.h`
- **Key functions:** `relabel_hypointensities()`, `relabel_hypointensities_neighboring_gray()`

## Purpose and Context

During the FreeSurfer pipeline, `mri_segment` assigns hypointensity labels (label 77 = WM-hypointensities, or per-hemisphere labels) to voxels within the white matter ROI that appear abnormally dark. However, some of these voxels may lie near or outside the white surface boundary and are anatomically grey matter (e.g., sulcal cortex that appears dark due to partial volume effects).

`mri_relabel_hypointensities` corrects this by:
1. Loading both `lh.white` and `rh.white` surfaces.
2. For each hemisphere, calling `relabel_hypointensities()` which uses the surface to identify hypointensity voxels that should be cortex.
3. Calling `relabel_hypointensities_neighboring_gray()` to relabel any remaining hypointensity voxels that are adjacent to grey matter structures.

This is a standard step in the [[wiki/pipelines/recon-all|recon-all]] `autorecon2` stage, applied after segmentation to clean up the aseg before surface reconstruction.

## Inputs

| Input | Description |
|-------|-------------|
| Input aseg (positional arg 1) | Segmentation volume containing WM-hypointensity labels |
| Surface directory (positional arg 2) | Directory containing `lh.white` and `rh.white` surfaces |
| Output aseg (positional arg 3) | Corrected segmentation output path |

## Outputs

- **Corrected aseg:** The input segmentation with WM-hypointensity voxels outside the white surface relabeled to neighbouring grey matter labels

## Mathematical Foundations

The relabeling uses the white surface as a boundary:

1. The white surface is loaded and an internal hash (`MRISHash`) is built for efficient surface proximity queries.
2. For each voxel labeled as hypointensity, the tool checks whether the voxel is inside or outside the white surface using the surface hash.
3. Voxels outside the white surface are relabeled (their new label is determined by their neighboring voxel labels — most common neighbor voting, similar to [[mri_refine_seg]]).
4. `relabel_hypointensities_neighboring_gray()` handles a second pass: any remaining hypointensity voxel that shares a face-adjacent neighbor with a grey matter label is relabeled to that grey matter label.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-lh-only`<br>`-lh` | (none) | off | Process left hemisphere only |
| `-rh-only`<br>`-rh` | (none) | off | Process right hemisphere only |
| `-debug_voxel` | `<x> <y> <z>` | — | Enable debugging for a specific voxel coordinate |

## Configuration Interactions

- By default, both hemispheres are processed. `-lh-only` sets `do_rh = 0`; `-rh-only` sets `do_lh = 0`.
- `-debug_voxel` sets the global diagnostic voxel `(Gx, Gy, Gz)` for verbose tracing of a specific voxel's relabeling.
- The white surface name is hard-coded as `"white"` (i.e., `lh.white` and `rh.white`) and cannot be changed at runtime.

## Typical Use Cases

```bash
# Standard usage (both hemispheres)
mri_relabel_hypointensities aseg.mgz /subjects/subject01/surf/ aseg_labeled.mgz

# Left hemisphere only
mri_relabel_hypointensities -lh aseg.mgz /subjects/subject01/surf/ aseg_lh_only.mgz
```

## Pipeline Context

`mri_relabel_hypointensities` is called during the [[wiki/pipelines/recon-all|recon-all]] `autorecon2` stage, after `mri_segment` and before surface tessellation. In `recon-all`, the call sequence is approximately:

1. `mri_segment` → produces initial aseg with WM-hypointensity labels
2. `mri_relabel_hypointensities` → corrects hypointensities near surfaces
3. `mri_relabel_nonwm_hypos` → handles non-WM hypointensity labels
4. [[mri_pretess]] / [[mri_tessellate]] → surface extraction

The tool modifies `aseg.mgz` (or a similar intermediate segmentation file) in-place conceptually, though a new output file is written.

## Gotchas and Caveats

> [!gotcha] White surface must already exist
> This tool requires `lh.white` and `rh.white` to be present in the surface directory. In the `recon-all` pipeline, these surfaces are not created until `autorecon2`, which means this step relies on an earlier surface reconstruction pass (or the surfaces from a template in longitudinal processing).

> [!gotcha] Surface name is hard-coded
> The surface used is always `{hemi}.white`; there is no flag to substitute a different surface (e.g., `pial`). This is correct for the intended use case but means the tool cannot be repurposed for other surface-based relabeling without code modification.

> [!contradiction] Surface dependency timing
> It is unclear from source inspection alone how `lh.white` surfaces are available during `autorecon2` before full surface reconstruction. This timing may rely on surfaces from a prior run or a base template. Needs verification from the `recon-all` script.

## Related Tools

- [[mri_relabel_nonwm_hypos]] — Companion tool for non-WM hypointensity relabeling
- [[mri_segment]] — Produces the hypointensity labels that this tool refines
- [[wiki/pipelines/recon-all|recon-all]] — Calls this tool in the autorecon2 stage

## Confidence and Gaps

**High confidence:** Source language, file location, usage syntax, flag list, surface-based relabeling logic, autorecon2 stage placement.

**Medium confidence:** Exact algorithm in `relabel_hypointensities()` (function defined in the same file but not read in full).

> [!gap] Surface dependency resolution
> How `lh.white` / `rh.white` are available at the time this tool is called in the `recon-all` pipeline needs clarification from the pipeline script.
