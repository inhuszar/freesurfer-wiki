---
title: "dmri_group"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_group.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_pathstats]]"
  - "[[dmri_paths]]"
  - "[[dmri_mergepaths]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Output file format for group-level path not confirmed"
tags:
  - diffusion
  - tractography
  - group-analysis
  - tracula
---

# dmri_group

## Summary

`dmri_group` combines per-subject tractography path statistics (from `dmri_pathstats`) across multiple subjects to create group-level representations. It reads `pathstats.byvoxel.txt` files from multiple subjects, optionally applies affine (and non-linear) spatial transforms to map each subject's path into a common reference space, and computes group-level statistics (mean path, arc-length parameterization, and measure summaries at sections along the path).

## Source Information

- **Language:** C++
- **Source file:** `trc/dmri_group.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_group`
- **Original author:** Anastasia Yendiki (MGH)
- **Key libraries:** FreeSurfer MRI library, affine/nonlinear registration (`AffineReg`, `NonlinReg` from `vial.h`)

## Purpose and Context

`dmri_group` is the group-analysis step of the TRACULA (TRActs Constrained by UnderLying Anatomy) pipeline. After individual-subject tractography (`dmri_paths`) and per-subject measure extraction (`dmri_pathstats`), `dmri_group` aggregates measures across subjects in a common anatomical space. The group-level representation enables cross-subject comparison of diffusion measures (FA, MD, etc.) at corresponding points along fiber tracts.

The tool implements arc-length parameterization: each subject's path is parameterized by arc length, and measures are interpolated to common arc-length positions, allowing comparison at corresponding fractional positions along the tract regardless of subject-specific path length differences.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Subject list file (`inListFile`) | Text file where each line contains: path_directory [ref_volume [affine_xfm [nonlin_xfm]]] | text |
| `pathstats.byvoxel.txt` | Per-voxel path statistics from each subject's tractography output | text |
| Reference volume (`outRefFile`) | Common space reference volume | MGZ/NIfTI |

**List file format:** Each line contains 1–4 space-separated fields:
1. Path directory (required) — `dmri_pathstats` output directory
2. Input reference volume (optional) — subject's native space volume
3. Affine transform (optional) — subject-to-group-space affine transform
4. Non-linear warp (optional) — subject-to-group-space non-linear warp

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Group mean path | Coordinates of mean path in output reference space | text |
| Group path RAS | Mean path in RAS coordinates | text |
| Group measure file (`outBase`) | Per-point mean and variability of diffusion measures along path | text |

> [!gap] Output base format
> The exact format of `outBase` outputs is not fully characterized from the source header alone.

## Mathematical Foundations

**Arc-length parameterization:** For each subject $s$, the path is parameterized by arc length. The arc length from the start to point $i$ is:

$$
\text{arc}_i = \sum_{j=1}^{i} \|p_j - p_{j-1}\|_2
$$

where $p_j$ are path point coordinates. Measures at equivalent fractional positions $\alpha \in [0,1]$ across subjects are compared by interpolating to uniform arc-length samples.

**Knot identification:** The code automatically identifies 6 knot points along each path: start (0%), 25%, 50%, 75%, end (100%), plus possibly additional custom knots.

**Outlier removal:** The code implements threshold-based outlier removal using inter-subject distance thresholds (`lthresh1`, `lthresh2`, `uthresh1`, `uthresh2`) computed from the group statistics, consistent with TRACULA's robust statistics approach.

**Group statistics:** Mean path coordinates and mean/variance of measures at each arc-length position are computed across subjects after transform to the common reference space.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--list` | `file` | — | Input subject list file (one line per subject: path_dir [ref_vol [affine_xfm [nonlin_xfm]]]) |
| `--ref` | `file` | — | Output reference volume defining the common space |
| `--out` | `base` | — | Output base filename for group-level path and measure files |
| `--nointerp` | — | off | Disable arc-length interpolation of measures to a uniform grid |
| `--sec` | `N` | 0 (disabled) | Number of sections (arc-length positions) along the path for measure extraction |

## Typical Use Cases

```bash
dmri_group \
  --list subjects.list \
  --ref mni305.mgz \
  --out group_lh_cst \
  --sec 20
```

where `subjects.list` has one line per subject with path directory, optional reference volume, and optional affine/nonlinear transforms.

## Pipeline Context

`dmri_group` is called as the final step of the per-tract TRACULA analysis:

```
dmri_paths --> dmri_pathstats --> dmri_group
```

The `recon-all` script does not call this tool. It is invoked from the TRACULA `trac-all` wrapper.

## Gotchas and Caveats

> [!gotcha] Subjects with missing path data are skipped
> If `pathstats.byvoxel.txt` cannot be opened, the subject is skipped with a warning (`WARN: Skipping ahead`). The group statistics will be computed from the remaining subjects without error.

> [!gotcha] Non-linear registration requires CVS support
> Non-linear transform support is conditionally compiled (`#ifndef NO_CVS_UP_IN_HERE`). The CVS (Cortical Volume and Surface) registration system must be available at compile time for non-linear warps to work.

## Related Tools

- [[dmri_pathstats]] — produces the per-subject input files for this tool
- [[dmri_paths]] — probabilistic tractography that precedes pathstats
- [[dmri_mergepaths]] — alternative aggregation of path posteriors

## Confidence and Gaps

**Confident:** Full flag set confirmed from `parse_commandline()`. The prior --nsec flag does not exist in source; the correct flag is --sec.

> [!gap] Output file format
> The exact format of `--out` base outputs (group mean path, group measures) is not fully characterised from the source header alone.
