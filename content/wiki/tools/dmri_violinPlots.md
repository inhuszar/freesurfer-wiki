---
title: "dmri_violinPlots"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "anatomicuts/dmri_plots.py"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_stats_ac]]"
  - "[[dmri_ac.sh]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Binary name is dmri_violinPlots but source file is dmri_plots.py — confirm mapping"
  - "Output plot format (PNG, PDF, SVG) not confirmed"
tags:
  - diffusion
  - visualization
  - violin-plot
  - group-analysis
  - anatomicuts
  - python
---

# dmri_violinPlots

## Summary

`dmri_violinPlots` generates violin plots comparing diffusion MRI measures across groups of subjects, organized by fiber bundle structure and hemisphere. It reads per-subject CSV files containing AnatomiCuts bundle statistics, groups subjects according to a provided CSV labels file, and produces violin plots showing the distribution of diffusion measures (mean FA, MD, etc.) for each group, structure, and hemisphere side.

## Source Information

- **Language:** Python
- **Source file:** `anatomicuts/dmri_plots.py`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_violinPlots`
- **Authors:** Andrew Zhang, Viviana Siless (MGH), July 2019
- **Dependencies:** Python 3, matplotlib, pandas, csv, os, sys

> [!gap] Binary to source mapping
> The binary `dmri_violinPlots` is installed at `/usr/local/freesurfer/8.2.0/bin/dmri_violinPlots`. The source file appears to be `anatomicuts/dmri_plots.py` based on content and authorship, but the exact mapping should be confirmed.

## Purpose and Context

After extracting per-bundle diffusion measures with `dmri_stats_ac` or `dmri_extractSurfaceMeasurements`, `dmri_violinPlots` provides a visualization of group differences. Violin plots show both the distribution shape and median, making them more informative than box plots for typical neuroscience group comparisons (e.g., patients vs. controls).

The script reads:
- A directory of subject result files (CSVs from `dmri_stats_ac`)
- A labels CSV mapping subject IDs to group numbers
- A structure name to plot

## Inputs

| Argument | Position | Description |
|----------|----------|-------------|
| `directory` | 1 | Path to directory containing per-subject CSV files |
| `labels` | 2 | CSV file mapping subject names to group numbers |
| `structure` | 3 | Name of the structure/bundle to plot |

Usage (from source):
```
./executable directory labels structure
```

**Labels file format** (CSV):
- Column 1: Subject name/ID
- Column 2: Group number (integer)

## Outputs

| Output | Description |
|--------|-------------|
| Violin plot(s) | Matplotlib figures showing measure distributions per group | PNG or interactive display |

> [!gap] Output file format
> The script calls `plt.show()` and `plt.savefig()` or similar. Whether it saves to file or opens an interactive window, and the default format, is not confirmed from the portion of source read.

## Mathematical Foundations

Violin plots display the kernel density estimate (KDE) of the data distribution for each group, mirrored around a central axis. The KDE uses a Gaussian kernel:

$$
\hat{f}(x) = \frac{1}{nh} \sum_{i=1}^n K\!\left(\frac{x - x_i}{h}\right)
$$

where $K$ is the Gaussian kernel and $h$ is the bandwidth (determined by matplotlib's default Scott's rule or Silverman's rule).

The script organizes plots by group number and hemisphere side (left/right), displaying one violin per group.

## Configuration Options

The script uses positional command-line arguments only:

| Position | Description |
|----------|-------------|
| 1 | Directory of subject CSV files |
| 2 | Group labels CSV file |
| 3 | Structure name to plot |

No optional flags are supported. Incorrect argument count causes the script to print the usage message and exit.

## Configuration Interactions

- The `structure` argument must match the structure name as it appears in the per-subject CSV files (from `dmri_stats_ac` output).
- The script separates left (`lh`) and right (`rh`) hemisphere structures automatically based on filename or CSV content.

## Typical Use Cases

```bash
# Generate violin plots for the left corticospinal tract
dmri_violinPlots \
  /data/anatomicuts_results/ \
  /data/group_labels.csv \
  lh_cst

# Using Python directly
python dmri_plots.py /data/results/ labels.csv arcuate_fasciculus
```

## Pipeline Context

`dmri_violinPlots` is a post-analysis visualization tool. It is not called by `recon-all` or `dmri_ac.sh`. It is run after per-subject statistics have been extracted and group labels assigned.

```
dmri_stats_ac (per subject) --> dmri_violinPlots (group visualization)
```

## Gotchas and Caveats

> [!gotcha] Exactly 3 arguments required
> The script checks `len(sys.argv) != 4` (including the script name) and exits if not exactly 3 positional arguments are provided.

> [!gotcha] Group numbering is 1-based
> The script finds the maximum group number starting from 1 (`max_group = 1`). Group numbers in the labels CSV should be integers starting at 1.

> [!gotcha] Python 3 dependency
> Requires Python 3 with matplotlib and pandas. These must be available in the FreeSurfer Python environment.

## Related Tools

- [[dmri_stats_ac]] — produces the per-subject CSV files used as input
- [[dmri_AnatomiCuts]] — clustering that defines the structures being plotted
- [[dmri_ac.sh]] — pipeline orchestrator

## Confidence and Gaps

> [!gap] Output format
> Whether plots are saved to files or displayed interactively, and the output file format, is not confirmed from the portion of source read.

> [!gap] Source file mapping
> The installed binary may be a wrapper or renamed version of `dmri_plots.py`. The exact mapping should be verified.
