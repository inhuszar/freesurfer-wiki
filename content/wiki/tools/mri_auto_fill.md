---
title: "mri_auto_fill"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_auto_fill/mri_auto_fill.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_fill]]"
  - "[[mri_segment]]"
  - "[[mri_tessellate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Attic status — availability in installed binary uncertain"
  - "Relationship to mri_fill (non-attic version) not fully clarified"
tags:
  - white-matter
  - fill
  - hemisphere-separation
  - atlas
---

# mri_auto_fill

## Summary

`mri_auto_fill` automatically fills the white matter volume by applying atlas-based hemisphere templates to a skull-stripped brain. It uses a GCA morph transform (or legacy M3D morph) to warp left and right hemisphere white matter templates into subject space, then combines and thresholds them against the original T1 intensity to produce a filled WM volume used as input to surface tessellation.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_auto_fill/mri_auto_fill.cpp`
- **Original author:** Bruce Fischl

> [!gotcha] Attic status
> This tool is in the `attic/` directory. The `mri_fill` tool (not in attic) is the currently active WM fill step in [[wiki/pipelines/recon-all|recon-all]].

## Purpose and Context

Creating cortical surfaces in [[wiki/pipelines/recon-all|recon-all]] requires a "filled" WM volume that has the two cerebral hemispheres separated and the subcortical structures removed. This tool was an earlier attempt at this using atlas-warped templates. In the current pipeline, `mri_fill` is called instead.

`mri_auto_fill` warps hemisphere-specific template volumes (containing the expected left and right WM shapes) from atlas space into subject space, then uses the T1 intensity to refine which voxels belong to each hemisphere.

## Inputs

Positional arguments (in order):
1. `<filled vol>` — preliminary filled/skull-stripped volume
2. `<T1 vol>` — T1-weighted normalized volume
3. `<xform>` — GCA morph transform file (`.m3z` or legacy M3D)
4. `<template vol>` — multi-frame atlas template volume containing hemisphere probability maps
5. `<out vol>` — output filled volume

## Outputs

- A single WM fill volume where left hemisphere WM voxels are labeled `LH_FILLED_VOLUME` (4) and right hemisphere WM voxels are labeled `RH_FILLED_VOLUME` (6).

## Mathematical Foundations

The algorithm applies the inverse GCA morph $\mathcal{G}^{-1}$ to warp atlas templates into subject space:

$$
V_{\text{lh}}^{\text{subj}} = \mathcal{G}^{-1}(V_{\text{lh}}^{\text{atlas}})
$$
$$
V_{\text{rh}}^{\text{subj}} = \mathcal{G}^{-1}(V_{\text{rh}}^{\text{atlas}})
$$

The warped templates are then combined using `MRIcombineHemispheres` and thresholded using the T1 intensity profile via `MRIthresholdFilled`. The threshold is the `pct`-th percentile (default: 95th) of the T1 within the WM mask:

$$
V_{\text{out}} = \{v : V_{\text{combined}}(v) > 0 \text{ AND } V_{T1}(v) > \tau_{T1}\}
$$

Ventricles are separately handled via `MRIfillVentricle` to ensure they are not included in the WM fill.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-p <pct>`<br>`-t <pct>` | float | 95.0 | Percentile of T1 for thresholding (`case 'P':` / `case 'T':` fall-through) |
| `-n <val>` | float | 0.1 | Number of sigma for T1 threshold refinement (`case 'N':`) |
| `-f` | flag | off | Toggle hemisphere-overlap correction (`case 'F':` toggles `fix`) |
| `-dilate <N>` | int | 0 | Dilate ventricles N times before filling (`!stricmp`) |
| `-old` | flag | off | Use legacy M3D morph instead of GCAmorph (`!strcmp`, case-sensitive) |

## Typical Use Cases

**Automatically fill WM using atlas morph:**
```bash
mri_auto_fill filled.mgz norm.mgz \
  transforms/talairach.m3z \
  $FREESURFER_HOME/average/RB_all.gca_template.mgz \
  wm_filled.mgz
```

## Pipeline Context

In the current [[wiki/pipelines/recon-all|recon-all]] pipeline, the active WM fill step is `mri_fill`, not `mri_auto_fill`. This tool represents an earlier atlas-based approach that preceded the current method. It is referenced here for historical completeness and for researchers reproducing older pipeline results.

## Gotchas and Caveats

> [!gotcha] Attic tool — not used in current pipeline
> `mri_auto_fill` is in `attic/` and the current fill step uses `mri_fill`. Do not substitute `mri_auto_fill` for `mri_fill` in the standard pipeline.

> [!gotcha] Template volume frame indexing
> The tool uses `#N` frame notation to access sub-volumes within the multi-frame template. If the template does not contain the expected frames, the tool will exit with an error.

## Related Tools

- `mri_fill` — current active WM fill tool in the recon-all pipeline
- [[mri_segment]] — WM segmentation step that precedes fill
- [[mri_tessellate]] — surface tessellation that consumes the filled WM volume
- [[wiki/pipelines/recon-all|recon-all]] — master pipeline

## Confidence and Gaps

Source code read. Confidence is medium due to attic status and complex interaction with multi-frame template format.

> [!gap] Template format
> The exact frame layout of the atlas template volume expected by this tool is not documented in the source or in any accessible FreeSurfer documentation.
