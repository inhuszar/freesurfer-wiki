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
last_agent_update: 2026-04-21
gaps:
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

| Variable | Flag | Description |
|----------|------|-------------|
| `inTrkFile` | `--intrk` | Input `.trk` file (deterministic tractography) |
| `inRoi1File`<br>`inRoi2File` | `--rois <file1> <file2>` | Labeling ROI files for `.trk` input (optional) |
| `inTrcDir` | `--intrc` | TRACULA output directory (probabilistic) |
| `inVoxFile` | `--invox` | Path map text file (default: `path.map.txt`) |
| `inXfmFile` | `--inlta` | Affine transform file (LTA format) |
| `dtBase` | `--dtbase` | DTI scalar map base filename |
| `pathName` | `--path` | Path name (tract name label) |
| `subjName` | `--subj` | Subject name |
| `outFile` | `--out` | Output overall statistics file |
| `outVoxFile` | `--outvox` | Per-voxel output file |
| `outMedianFile` | `--median` | Median values along path |
| `outEndBase` | `--ends` | Base filename for endpoint values |
| `refVolFile` | `--ref` | Reference volume for coordinates |
| `measFileList` | `--meas` | List of diffusion measure volumes (space-separated, multiple allowed) |
| `measNameList` | `--measname` | Names for the provided measures (space-separated, multiple allowed) |
| `probThresh` | `--pthr` | Probability threshold (default: 0.2) |
| `faThresh` | `--fthr` | FA threshold for voxel inclusion (default: 0) |

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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--intrk` | `<file>` | — | Input `.trk` streamline file (deterministic tractography) |
| `--rois` | `<file1> <file2>` | — | Endpoint ROI label files for `.trk` input (optional) |
| `--intrc` | `<dir>` | — | TRACULA output directory (probabilistic tractography) |
| `--invox` | `<file>` | `path.map.txt` | Path map text file (relative to `--intrc` dir) |
| `--inlta` | `<file>` | — | Affine transform (LTA) to map coordinates to common space (optional) |
| `--dtbase` | `<base>` | — | DTI scalar map base filename (loads `_FA`, `_MD`, `_RD`, `_AD`) (optional) |
| `--meas` | `<file> ...` | — | One or more custom diffusion measure volumes (optional) |
| `--measname` | `<name> ...` | — | Names for the custom measures (matched to `--meas`; auto-named `Meas1`, `Meas2`… if omitted) |
| `--path` | `<name>` | — | Tract/path name label for output headers (optional) |
| `--subj` | `<name>` | — | Subject name for output headers (optional) |
| `--out` | `<file>` | — | Output overall statistics file |
| `--outvox` | `<file>` | — | Per-voxel output file (optional) |
| `--median` | `<file>` | — | Output `.trk` file of median streamline (optional; requires `--intrk`) |
| `--ends` | `<base>` | — | Base filename for endpoint values (optional; requires `--intrk`) |
| `--ref` | `<vol>` | — | Reference volume for endpoint output (required by `--ends` if `--dtbase`/`--meas` absent) |
| `--pthr` | `<val>` | `0.2` | Minimum posterior probability to include a voxel (fraction of robust max; range 0–1) |
| `--fthr` | `<val>` | `0` | Minimum FA to include a voxel (0 = no FA threshold applied; range 0–1) |

## Typical Use Cases

```bash
# Compute path stats from TRACULA output, using FA/MD/RD/AD from dtifit
dmri_pathstats \
  --intrc /data/subject01/dmri/lh_cst.tr/ \
  --dtbase /data/subject01/dmri/dtifit \
  --out /data/subject01/dmri/lh_cst.tr/pathstats.overall.txt \
  --outvox /data/subject01/dmri/lh_cst.tr/pathstats.byvoxel.txt

# With custom measure and probability threshold
dmri_pathstats \
  --intrc /data/subject01/dmri/lh_cst.tr/ \
  --meas /data/subject01/dmri/kurtosis.nii.gz \
  --measname AK \
  --pthr 0.1 \
  --out pathstats.overall.txt \
  --outvox pathstats.byvoxel.txt
```

## Pipeline Context

```
dmri_paths --> dmri_pathstats --> dmri_group
```

`dmri_pathstats` is called by the `trac-all` TRACULA wrapper. Its output `pathstats.byvoxel.txt` is the primary input to `dmri_group` for group analysis.

## Gotchas and Caveats

> [!gotcha] --pthr default of 0.2
> Voxels with posterior probability below 0.2 are excluded from measure computation. This may exclude peripheral path voxels. Lowering the threshold with `--pthr` includes more voxels but with lower confidence.

> [!gotcha] DTI vs. custom measures
> If `--dtbase` is provided, the tool automatically loads FA, MD, RD, AD from FSL dtifit-style filenames (e.g., `dtbase_FA.nii.gz`). Custom measures can be added with `--meas` and named with `--measname`. If neither is provided, coordinate output only.

## Related Tools

- [[dmri_paths]] — produces the posterior maps analyzed by this tool
- [[dmri_group]] — aggregates pathstats across subjects
- [[dmri_spline]] — spline utilities used for path parameterization

## Confidence and Gaps

**Confident (from source):** All flags verified from `parse_commandline()` in `trc/dmri_pathstats.cxx`. Flag names, argument counts, and variable assignments confirmed.
