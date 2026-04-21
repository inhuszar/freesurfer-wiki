---
title: "mri_label_histo"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_label_histo/mri_label_histo.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label_vals]]"
  - "[[mri_label_volume]]"
  - "[[mri_binarize]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Effect of -a flag: all_flag is parsed but not obviously used in the main label loop"
tags:
  - label
  - histogram
  - intensity
---

# mri_label_histo

## Summary

`mri_label_histo` computes and plots the intensity histogram of voxels belonging to a specific label in a segmentation volume. Given a T1 volume and a labelled segmentation, it extracts the intensity values at all voxels with the specified label and writes the histogram to a plot file.

## Source Information

- **Language:** C++
- **Source file:** `mri_label_histo/mri_label_histo.cpp`

## Purpose and Context

Understanding the intensity distribution of a segmented region is useful for quality control (verifying that a labelled region has the expected tissue contrast), for bias field estimation, and for atlas training. `mri_label_histo` provides a quick way to compute this distribution without extracting the raw values.

## Inputs

| Argument | Description |
|----------|-------------|
| `<T1_vol>` | Input intensity volume (T1-weighted or other contrast) |
| `<labeled_vol>` | Segmentation volume with integer labels |
| `<label>` | Integer label to compute histogram for |
| `<output_plot>` | Output histogram plot file (e.g., `.dat` or gnuplot format) |

## Outputs

- A histogram plot file (`HISTOplot` output) containing the frequency distribution of intensity values for the specified label.

## Mathematical Foundations

The histogram is computed as:

$$
H[k] = |\{i : I(\mathbf{x}_i) = k \text{ and } L(\mathbf{x}_i) = \ell\}|
$$

where $I(\mathbf{x})$ is the intensity volume, $L(\mathbf{x})$ is the label volume, and $\ell$ is the target label. The number of bins is determined by the `MRIhistogramLabel()` function (auto-determined from the data range).

## Configuration Options

| Argument | Description |
|----------|-------------|
| (positional 1) | T1 intensity volume |
| (positional 2) | Segmentation/label volume |
| (positional 3) | Integer label value |
| (positional 4) | Output histogram plot file |
| `-l <logfile>` | Optional log file path; if specified, the log file is opened in append mode and results are logged there |
| `-q` | Quiet mode (sets `quiet = 1`; effect on output not fully traced but parsed) |
| `-a` | All-labels mode: compute histograms for all labels present in the segmentation volume |

## Configuration Interactions

- `-a` sets `all_flag = 1` but the current `main()` reads a fixed label from `argv[3]` and calls `MRIhistogramLabel` for only that label. The `all_flag` variable is parsed but not used in the visible code path to loop over labels; its actual effect is uncertain.
- The output format is determined by `HISTOplot()`, which writes a text-based histogram file suitable for gnuplot.
- `-l <logfile>` opens the log file in append mode; if the file cannot be opened, the tool exits with an error.

> [!gap] `-a` flag behaviour
> The `all_flag = 1` variable is set by `-a` but no loop over all labels was observed in `main()`. The flag may be dead code or may affect an internal function call not traced here.

## Typical Use Cases

```bash
# Histogram of intensities within hippocampus (label 17)
mri_label_histo norm.mgz aseg.mgz 17 hippocampus_histo.dat

# With log output
mri_label_histo norm.mgz aseg.mgz 17 histo.dat -l histo.log
```

## Pipeline Context

Not part of `recon-all`. Diagnostic tool used in atlas training, quality control, and protocol optimisation.

## Gotchas and Caveats

- The histogram resolution (number of bins) is determined automatically; the tool does not expose a bin-count parameter.
- Output is a text file (not an image); plotting requires gnuplot or another tool.
- The intensity volume and label volume must be in the same space.

## Related Tools

- [[mri_label_vals]] — extract raw intensity values at label locations
- [[mri_label_volume]] — compute volume of labelled regions
- [[mri_binarize]] — threshold/binarise volumes

## Confidence and Gaps

**High confidence:** Full `get_option()` and `main()` functions read from source; all three flags confirmed (`-l`, `-q`, `-a`), positional argument order confirmed (T1 vol, labeled vol, label int, output file).

> [!gap] `-a` flag behaviour
> The `all_flag` variable is set by `-a` but `main()` processes only the single label given at `argv[3]`. The flag may be dead code or interact with an internal histogram function that was not fully traced.
