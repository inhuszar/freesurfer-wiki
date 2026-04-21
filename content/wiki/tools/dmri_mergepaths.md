---
title: "dmri_mergepaths"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_mergepaths.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_group]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading parse_commandline()"
  - "Output file naming when using --dir not confirmed"
tags:
  - diffusion
  - tractography
  - tracula
  - merging
  - posterior
---

# dmri_mergepaths

## Summary

`dmri_mergepaths` combines posterior probability distribution volumes from multiple white-matter tracts (output by `dmri_paths`) into a single 4D volume. Each input tract's posterior map becomes one frame in the output 4D file, enabling joint visualization and analysis of multiple tracts simultaneously. The tool also supports a dispersion threshold for quality control.

## Source Information

- **Language:** C++
- **Source file:** `trc/dmri_mergepaths.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_mergepaths`
- **Original author:** Anastasia Yendiki (MGH)

## Purpose and Context

`dmri_paths` produces a separate posterior probability map for each white-matter tract. `dmri_mergepaths` consolidates these individual maps into a single 4D volume for efficient storage, visualization, and group-level analysis. This is particularly useful for displaying all TRACULA tracts simultaneously in a viewer like `freeview`.

The tool also has an input directory mode (`--dir`) where it auto-discovers path map files within a TRACULA output directory structure.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Input volumes | `inFile` list | List of per-tract posterior maps to merge | MGZ/NIfTI |
| Input directory | `inDir` | TRACULA output directory (finds maps automatically) | path |
| Color table | `ctabFile` | Color table for the output (optional) | text |
| Dispersion threshold | `dispThresh` | Quality threshold for including tracts | float |

## Outputs

| Output | Flag | Description | Format |
|--------|------|-------------|--------|
| 4D merged volume | `outFile` | All tract posteriors stacked as frames | MGZ/NIfTI |

## Mathematical Foundations

The merging operation is simple concatenation: each input volume (which must have the same geometry) becomes one frame in the output 4D series. For each input frame $k$ with maximum value $M_k$:

1. The input volume is read.
2. Each voxel value is copied to frame $k$ of the output volume.
3. If `dispThresh > 0`, tracts where the maximum posterior value falls below the threshold are excluded.

No spatial transformation is applied; all inputs must be in the same space.

## Configuration Options

> [!gap] Full flag list
> Complete flags require reading `parse_commandline()`. From global variable declarations:

| Variable | Likely flag | Description |
|----------|-------------|-------------|
| `nframe` | `--nframe` or auto | Number of frames (input volumes) |
| `inFile` | `--in` | List of input tract posterior files |
| `inDir` | `--dir` | Input directory (auto-discovers path maps) |
| `outFile` | `--out` | Output merged 4D volume |
| `ctabFile` | `--ctab` | Color table file |
| `dispThresh` | `--disp` | Dispersion threshold (default: 0 = no threshold) |

## Typical Use Cases

> [!gap] Exact command syntax unknown
> Based on the global variables and processing logic:

```bash
# Merge all tract posteriors from a TRACULA run
dmri_mergepaths \
  --in lh_cst.mgz rh_cst.mgz cc_body.mgz lh_unc.mgz \
  --out all_tracts.mgz

# Using directory mode
dmri_mergepaths \
  --dir /data/subject01/dmri/ \
  --out /data/subject01/dmri/all_tracts.mgz
```

## Pipeline Context

`dmri_mergepaths` is used as a post-processing step after per-tract tractography with `dmri_paths`:

```
dmri_paths (per tract) --> dmri_mergepaths --> visualization / group analysis
```

It is not called by `recon-all`. It may be called by the `trac-all` TRACULA wrapper.

## Gotchas and Caveats

> [!gotcha] All input volumes must have the same geometry
> The output volume is initialized from the first input. All subsequent inputs are assumed to have identical voxel dimensions, origin, and orientation. Geometry mismatches are not detected and will produce silently incorrect output.

> [!gotcha] Missing input volumes are handled silently
> The source logs a warning if an input volume cannot be read but continues processing the remaining inputs. The output will have empty (zero) frames for missing inputs.

## Related Tools

- [[dmri_paths]] — produces the per-tract posterior maps merged by this tool
- [[dmri_pathstats]] — computes statistics from these posteriors
- [[dmri_group]] — group-level aggregation across subjects

## Confidence and Gaps

> [!gap] Argument parser not fully read
> Full flag names and their defaults require reading `parse_commandline()`.
