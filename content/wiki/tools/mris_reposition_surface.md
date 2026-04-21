---
title: "mris_reposition_surface"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_reposition_surface/mris_reposition_surface.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_make_surfaces]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[freeview]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The exact surface repositioning algorithm (how vertex positions are moved toward intensity-guided targets near control points) is not fully read; need to read the repositioning loop body after line 100."
tags:
  - surface
  - editing
  - control-points
  - intensity
---

# mris_reposition_surface

## Summary

`mris_reposition_surface` moves surface vertices near user-specified control points (a pointset file) toward local intensity gradient maxima in a reference volume. This is a targeted surface correction tool: a user places control points in [[freeview]] at locations where the automated surface placement was incorrect, and this tool nudges the surface to better fit the intensity data at those locations. It is an interactive surface editing aid.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_reposition_surface/mris_reposition_surface.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_reposition_surface`
- **Original Author:** Not explicitly named in the header; uses FreeSurfer JSON pointset infrastructure.

## Purpose and Context

Automated cortical surface placement can fail in regions of low contrast, lesions, or artifacts. `mris_reposition_surface` provides a semi-automated correction mechanism: the user identifies problematic regions via control points in [[freeview]], and this tool repositions nearby surface vertices to respect the local intensity profile.

It bridges manual quality control (QC) with automated processing, reducing the need for full manual editing of surface vertices.

## Inputs

### Required Inputs

(Flags: `-s`/`--surf`, `-v`/`--volume`, `-p`/`--points`, `-o`/`--out`)

- **`-s <surf>`** — input FreeSurfer surface file (e.g., `lh.pial`, `lh.white`).
- **`-v <volume>`** — reference MRI volume used as intensity guide (e.g., `T1.mgz`).
- **`-p <points>`** — JSON-format pointset file (as produced by [[freeview]]) containing control point coordinates. The JSON must have keys `"points"` (array of `{coordinates: {x, y, z}}`) and `"vox2ras"` (either `"tkreg"` for tkRAS or scanner RAS).
- **`-o <out>`** — output surface file path.

### Input Assumptions

> [!assumption] Pointset coordinate system
> The tool reads the `vox2ras` field from the JSON file to determine whether coordinates are in tkRAS (`"tkreg"`) or scanner RAS. If not tkRAS, coordinates are converted to surface RAS using `MRIRASToSurfaceRAS()`.

> [!assumption] JSON pointset format
> Control points must be in the FreeSurfer/freeview JSON pointset format. Plain text `.dat` control point files are not supported by this tool.

## Outputs

### Files Created

- **Repositioned surface** — output surface file at the path specified by `-o`. Same format as the input surface (FreeSurfer binary surface format, see [[surface-format]]).

## Mathematical Foundations

For each control point, the algorithm:

1. Finds the closest surface vertex to the control point.
2. SearchCan es within a neighborhood of radius `-z`/`--size` for the vertex with the maximum local intensity gradient in the volume.
3. Moves nearby vertices toward the target location, weighted by proximity.
4. This is iterated `-i`/`--iterations` times.

The search uses Gaussian-weighted gradient estimation with smoothing parameter `-g`/`--sigma` (in mm). 

> [!gap] Exact repositioning algorithm
> The inner repositioning loop (after line 100 in the source) was not fully read. The precise way vertices are moved (steepest gradient ascent, force field, or direct displacement) needs verification.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s` / `--surf <path>` | string | required | Input surface file. |
| `-v` / `--volume <path>` | string | required | Reference MRI volume. |
| `-p` / `--points <path>` | string | required | JSON control point file. |
| `-o` / `--out <path>` | string | required | Output surface file. |
| `-z` / `--size <n>` | integer | 1 | Neighborhood search size around each control point (must be ≥1). |
| `-g` / `--sigma <f>` | float | 2.0 | Gaussian smoothing sigma (mm) for gradient computation. |
| `-i` / `--iterations <n>` | integer | 1 | Number of repositioning iterations. |

### Configuration Interactions

- `--size` and `--sigma` together control the spatial extent and smoothness of the gradient field used to guide vertex movement.
- `--iterations` > 1 repeatedly refines the surface position; each iteration starts from the previous output.

## Typical Use Cases

### Use Case 1: Reposition pial surface at user-marked locations

```bash
mris_reposition_surface \
  -s $SUBJECTS_DIR/subject/surf/lh.pial \
  -v $SUBJECTS_DIR/subject/mri/T1.mgz \
  -p /path/to/control_points.json \
  -o $SUBJECTS_DIR/subject/surf/lh.pial.edited \
  --sigma 3 --iterations 2
```

## Pipeline Context

`mris_reposition_surface` is not called by `recon-all`. It is used in manual surface editing workflows:

1. Run `recon-all` to completion.
2. View results in [[freeview]].
3. Place control points at surface errors.
4. Run `mris_reposition_surface` to correct.
5. Optionally re-run downstream `recon-all` stages.

**Predecessor:** [[mris_make_surfaces]] (automated surface placement) → **This tool** (manual correction) → downstream analysis.

## Gotchas and Caveats

> [!gotcha] Requires JSON pointset, not .dat file
> Classic FreeSurfer control point files (`.dat`) are not accepted. Control points must be saved as a JSON pointset from [[freeview]].

> [!gotcha] Coordinate system mismatch
> If the JSON `vox2ras` field is not correctly set to `"tkreg"` when using tkRAS coordinates, the tool will apply an erroneous coordinate transform and place vertices at incorrect locations.

## Related Tools

- [[mris_make_surfaces]] — automated surface placement that may be corrected with this tool
- [[freeview]] — used to visualize surfaces and create the control point JSON files
- [[mri_edit_wm_with_aseg]] — another semi-manual correction tool for white matter volume

## Confidence and Gaps

Confidence is **medium**. The input parsing and coordinate handling are clearly read. The inner repositioning algorithm needs verification.

> [!gap] Inner repositioning loop
> The surface repositioning logic after line 100 of the source was not read. The exact algorithm for moving vertices based on the gradient field around control points needs documentation.
