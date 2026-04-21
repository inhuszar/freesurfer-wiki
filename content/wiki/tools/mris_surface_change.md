---
title: "mris_surface_change"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_surface_change/mris_surface_change.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_thickness]]"
  - "[[mris_thickness_diff]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full command-line syntax not captured; parse_commandline() not read."
  - "In the attic/ directory - may not be included in standard FreeSurfer installation."
tags:
  - surface
  - longitudinal
  - change
  - displacement
---

# mris_surface_change

## Summary

`mris_surface_change` computes the longitudinal displacement between two surfaces in the surface-normal direction, producing a per-vertex scalar map representing how much each surface has moved between two time points. It is a longitudinal analysis tool for measuring local surface change (e.g., cortical atrophy as inward pial surface displacement). Attributed to Bruce Fischl.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_surface_change/mris_surface_change.cpp`
- **Location note:** Found in the `attic/` subdirectory, indicating it may be a legacy or experimental tool not included in the standard installation binary distribution.
- **Key function:** `compute_surface_distance(mris1, mris2, mris_out)` — computes per-vertex displacement between surfaces

## Purpose and Context

Longitudinal cortical analysis requires measuring how surfaces change between scan sessions. Unlike `mris_thickness` (which measures the distance between the pial and white surfaces at a single time point), `mris_surface_change` measures the displacement of the same surface (e.g., the pial surface) between two time points (sessions). The displacement is measured in the surface-normal direction to capture cortical thinning as an inward displacement.

This approach is different from thickness differencing (see [[mris_thickness_diff]]), which subtracts thickness maps; instead, it directly measures 3D surface displacement projected onto the normal.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Surface 1 (`surf1_fname`) | Surface at time point 1 (e.g., baseline pial surface). | FreeSurfer binary surface |
| Surface 2 (`surf2_fname`) | Surface at time point 2 (e.g., follow-up pial surface). | FreeSurfer binary surface |
| Output filename (`out_fname`) | Path for the output displacement map. | Surface overlay |

**Usage (inferred):** `mris_surface_change [options] <surf1> <surf2> <output>`

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Displacement map | Per-vertex normal-direction displacement from surf1 to surf2. | Surface overlay (curvature or `.mgh`) |

## Mathematical Foundations

For each vertex $v$ on surface 1, the displacement is computed as the signed distance to the corresponding vertex on surface 2, projected onto the surface normal:

$$d_v = (\mathbf{p}_{v,2} - \mathbf{p}_{v,1}) \cdot \hat{\mathbf{n}}_v$$

where $\mathbf{p}_{v,1}$ and $\mathbf{p}_{v,2}$ are the 3D positions of vertex $v$ on surface 1 and surface 2, and $\hat{\mathbf{n}}_v$ is the unit surface normal at vertex $v$ on surface 1. Negative values indicate inward displacement (atrophy); positive values indicate outward displacement (expansion).

The `compute_surface_distance()` function implements this computation internally.

## Configuration Options

> [!gap] Full option list
> The full option list is defined in `parse_commandline()`, which was not read in full. The tool uses the standard FreeSurfer cmdargs pattern.

## Typical Use Cases

**Compute pial surface displacement between baseline and 2-year follow-up:**
```bash
mris_surface_change \
  $SUBJECTS_DIR/sub01_tp1/surf/lh.pial \
  $SUBJECTS_DIR/sub01_tp2/surf/lh.pial \
  lh.pial_change.mgh
```

## Pipeline Context

`mris_surface_change` is not part of `recon-all`. It is used in longitudinal neuroimaging studies to:
- Map local cortical surface displacement over time.
- Detect focal atrophy patterns (e.g., in Alzheimer's disease, multiple sclerosis).
- Complement thickness-difference maps with direct geometric change measurements.

> [!gotcha] Attic location
> The source is in `attic/`, which typically means the tool is not compiled or distributed in the standard FreeSurfer binary release. Verify that the binary exists in `$FREESURFER_HOME/bin/` before using.

## Gotchas and Caveats

> [!gotcha] Registration required
> The two surfaces must be in register (same vertex correspondence and aligned coordinate systems). Using surfaces from unregistered subjects or different hemispheres will produce meaningless results.

> [!gotcha] Sign convention
> Inward displacement (atrophy/thinning) is negative, outward displacement is positive. This may be counterintuitive for thickness analysis where more positive = thicker.

## Related Tools

- [[mris_thickness]] — measures thickness at a single time point
- [[mris_thickness_diff]] — computes difference between thickness maps
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**Medium confidence.** The overall purpose and `compute_surface_distance()` function signature are clear. Full CLI is not captured.

> [!gap] Binary availability
> The `attic/` location suggests this may not be compiled in standard builds. Binary availability in FreeSurfer 8.2.0 needs verification.
