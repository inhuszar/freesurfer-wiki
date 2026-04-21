---
title: "dmri_pathstats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "trc/dmri_pathstats.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_paths]]"
  - "[[dmri_group]]"
  - "[[dmri_spline]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading parse_commandline()"
  - "pathstats.overall.txt format not confirmed from source"
tags:
  - diffusion
  - tractography
  - statistics
  - measures
  - tracula
---

# dmri_pathstats

## Summary

`dmri_pathstats` computes diffusion MRI measures (FA, MD, radial diffusivity, axial diffusivity, or user-provided scalar maps) along and at the endpoints of a tractography path. It operates on either a probabilistic path (from `dmri_paths`, via a path map text file) or a deterministic streamline (`.trk` format). The output is a per-voxel text file (`pathstats.byvoxel.txt`) and optionally a summary statistics file and endpoint values, suitable for group analysis with `dmri_group`.

## Source Information

- **Language:** C++
- **Source files:** `trc/dmri_pathstats.cxx`, uses `trc/blood.h`, `trc/spline.h`, `trc/TrackIO.h`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_pathstats`
- **Original author:** Anastasia Yendiki (MGH)

## Purpose and Context

After probabilistic tractography with `dmri_paths`, the posterior probability map identifies which voxels are most likely traversed by a white-matter tract. `dmri_pathstats` extracts the actual diffusion measures at these high-probability voxels, producing a file suitable for arc-length-based group analysis. The tool uses `Blood` (a utility class) to identify the path centerline and `Spline` to interpolate and parameterize the path.

For deterministic tractography (`.trk` input), the tool similarly computes measures along each streamline.

## Inputs

| Variable | Likely flag | Description |
|----------|-------------|-------------|
| `inTrkFile` | `--intrk` | Input `.trk` file (deterministic tractography) |
| `inTrcDir` | `--trcdir` | TRACULA output directory (probabilistic) |
| `inVoxFile` | `--invox` | Path map text file (default: `path.map.txt`) |
| `inXfmFile` | `--xfm` | Optional affine transform file |
| `dtBase` | `--dtbase` | DTI scalar map base filename |
| `outFile` | `--out` | Output overall statistics file |
| `outVoxFile` | `--outvox` | Per-voxel output file |
| `outMedianFile` | `--outmed` | Median values along path |
| `outEndBase` | `--outend` | Base filename for endpoint values |
| `refVolFile` | `--ref` | Reference volume for coordinates |
| `measFileList` | `--meas` | List of diffusion measure volumes |
| `measNameList` | `--name` | Names for the provided measures |
| `probThresh` | `--pthresh` | Probability threshold (default: 0.2) |
| `faThresh` | `--fa` | FA threshold for voxel inclusion (default: 0) |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `pathstats.byvoxel.txt` | Per-voxel coordinates and measures along path | tab-separated text |
| Overall stats file | Mean, weighted mean, and center-weighted mean of each measure | text |
| Endpoint file(s) | Measures at start/end points of path | text |
| Median file | Median values along path sections | text |

**`pathstats.byvoxel.txt` format** (header lines start with `#`, coordinate header starts with `x`):
```
# subjectname <id>
x y z FA MD RD AD ...
1.5 2.0 3.1 0.45 0.0008 0.0006 0.0010 ...
```

## Mathematical Foundations

Measures are summarized using three weighted averages along the path:

1. **Simple mean:** $\bar{m} = \frac{1}{N}\sum_i m_i$

2. **Probability-weighted mean:** $\bar{m}_p = \frac{\sum_i p_i m_i}{\sum_i p_i}$, where $p_i$ is the path posterior probability at voxel $i$.

3. **Center-weighted mean:** Gives higher weight to the central portion of the tract to reduce endpoint noise.

The tool also computes statistics by **arc-length sections** (dividing the path into equal-length segments), enabling position-specific analysis along the tract.

Path coordinates are provided in the volume's RAS coordinate system. If a transform (`--xfm`) is provided, coordinates are mapped to a common space before output.

## Configuration Options

> [!gap] Full flag list
> Complete argument list requires reading `parse_commandline()`. Values above are inferred from global variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `probThresh` | 0.2 | Minimum posterior probability to include a voxel |
| `faThresh` | 0 | Minimum FA to include a voxel |
| `inVoxFile` | `path.map.txt` | Default path map filename within trcdir |

## Typical Use Cases

> [!gap] Exact command syntax
> Without the full argument parser, exact command lines cannot be verified. In TRACULA, this is called by `trac-all`.

```bash
# Compute path stats from TRACULA output, using FA and MD
dmri_pathstats \
  --trcdir /data/subject01/dmri/lh_cst.tr/ \
  --dtbase /data/subject01/dmri/dtifit \
  --out /data/subject01/dmri/lh_cst.tr/pathstats.overall.txt \
  --outvox /data/subject01/dmri/lh_cst.tr/pathstats.byvoxel.txt
```

## Pipeline Context

```
dmri_paths --> dmri_pathstats --> dmri_group
```

`dmri_pathstats` is called by the `trac-all` TRACULA wrapper. Its output `pathstats.byvoxel.txt` is the primary input to `dmri_group` for group analysis.

## Gotchas and Caveats

> [!gotcha] probThresh default of 0.2
> Voxels with posterior probability below 0.2 are excluded from measure computation. This may exclude peripheral path voxels. Lowering the threshold includes more voxels but with lower confidence.

> [!gotcha] DTI vs. custom measures
> If `--dtbase` is provided, the tool automatically loads FA, MD, RD, AD from FSL dtifit-style filenames (e.g., `dtbase_FA.nii.gz`). Custom measures can be added with `--meas`. If neither is provided, coordinate output only.

## Related Tools

- [[dmri_paths]] — produces the posterior maps analyzed by this tool
- [[dmri_group]] — aggregates pathstats across subjects
- [[dmri_spline]] — spline utilities used for path parameterization

## Confidence and Gaps

> [!gap] Argument parser not read
> Complete flags and their defaults require reading `parse_commandline()`.
