---
title: "mri_compute_overlap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_overlap/mri_compute_overlap.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_compute_seg_overlap]]"
  - "[[mri_diff]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - overlap
  - dice
  - jaccard
  - segmentation
  - quality-assurance
---

# mri_compute_overlap

## Summary

`mri_compute_overlap` computes three label-overlap measures — volume difference, Dice coefficient, and Jaccard index — between two volumetric label/segmentation images. It can operate on a user-specified list of label values or on all labels in the volume simultaneously (`-a`). Results are printed to stdout and optionally written to a log file.

## Source Information

- **Language:** C++
- **Source file:** `mri_compute_overlap/mri_compute_overlap.cpp`
- **Original author:** Nick S. (full name not in file)

## Purpose and Context

This is a simple quality-assurance and validation tool for comparing two segmentation volumes. Common uses include:
- Comparing an automated segmentation against a manual ground truth.
- Comparing two pipeline outputs (e.g., before/after a parameter change).
- Reporting cross-subject or test-retest reproducibility.

It complements [[mri_compute_seg_overlap]], which targets a fixed set of neuroanatomical structures and computes Dice against the FreeSurfer color LUT.

## Inputs

- **`volume 1`**: first segmentation volume (any format readable by `MRIread`)
- **`volume 2`**: second segmentation volume (same geometry expected)
- **Label numbers** (optional): one or more integer label values to evaluate; if absent, `-a` must be used
- **`-mask vol`** (optional): binary mask volume restricting computation to non-zero voxels

## Outputs

Printed to stdout (and optionally to a log file):
- For each label: volume difference (%), Dice coefficient (%), Jaccard index (%)
- If multiple labels: aggregate totals across all evaluated labels

Log file (tab-separated columns): `label_id  vol_diff  dice  jaccard`

## Mathematical Foundations

Let $A$ = set of voxels with label $l$ in volume 1, $B$ = same in volume 2.

**Volume difference:**
$$
\text{VolDiff}(l) = \frac{2 \cdot ||A| - |B||}{|A| + |B|} \times 100\%
$$

**Dice coefficient** (intersection over mean):
$$
\text{Dice}(l) = \frac{2 |A \cap B|}{|A| + |B|} \times 100\%
$$

**Jaccard index** (intersection over union):
$$
J(l) = \frac{|A \cap B|}{|A \cup B|} \times 100\%
$$

The relationship between Dice and Jaccard is:
$$
\text{Dice} = \frac{2J}{1 + J}
$$

> [!math] Note on the source code's volume difference formula
> The help text in the source says `volume difference = 2*|A|-|B|/|A|+|B|` which appears to have a typo. The actual code computes `|nvox1-nvox2| / ((nvox1+nvox2)/2)`, i.e., the absolute difference over the mean volume — equivalent to the formula above without the factor of 2 on the numerator.

> [!contradiction] Help text vs. code
> The printed help message shows `(1) volume difference = 2*|A|-|B|/|A|+|B|` but the code actually computes `|nvox1-nvox2| / mean(nvox1, nvox2)`. Code is authoritative.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-a` | — | off | Compute overlap for all labels present in the volumes |
| `-s` | — | off | Show segmentation label names (uses CMA label table) |
| `-total` | — | off | Compute total voxel agreement (exact match fraction, any label) |
| `-nosummary` | — | off | Suppress aggregate summary across all labels |
| `-mask vol` | volume | none | Restrict computation to non-zero voxels in mask |
| `-l fname` | file path | none | Log results to file (also sets `-q` implicitly) |
| `-q` | — | off | Quiet: suppress stdout output |
| `-t l1 l2` | integers | — | Translate label `l1` to `l2` in both volumes before comparison |
| `-string str` | string | — | Prepend string(s) to log file output lines |
| `-h` | — | — | Print extended help |

## Configuration Interactions

- `-l fname` sets quiet mode automatically; results go only to the log file.
- `-total` is mutually exclusive with the label-list or `-a` mode: it computes overall voxel agreement across all non-background labels without per-label breakdown.
- `-t` applies in-place relabeling before any metric computation; useful to merge sub-labels.
- `-s` only affects display (label names); it enables segmentation name resolution via `cma_label_to_name()`, which works best for standard FreeSurfer CMA labels (0–13000 range). `-a` iterates up to 1000 labels unless `-s` is also set, in which case it uses `MAX_CMA_LABEL`.

> [!gotcha] Label iteration limit with `-a`
> Without `-s`, `-a` iterates labels 0–999. With `-s`, it iterates to `MAX_CMA_LABEL` (~13000). If you have a custom segmentation with labels above 999 and do not use `-s`, those labels are silently skipped.

## Typical Use Cases

Compare automated vs. manual hippocampus segmentation (label 17):
```bash
mri_compute_overlap auto_seg.mgz manual_seg.mgz 17
```

Compare all labels, show names, log to file:
```bash
mri_compute_overlap -a -s -l overlap_results.txt auto_seg.mgz manual_seg.mgz
```

Compute total voxel agreement with prefix strings:
```bash
mri_compute_overlap -total -string subject001 auto_seg.mgz manual_seg.mgz
```

Compute overlap within a brain mask:
```bash
mri_compute_overlap -a -mask brainmask.mgz auto_seg.mgz manual_seg.mgz
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]]. Typically used in:
- Segmentation validation pipelines
- Cross-scanner reproducibility studies
- Algorithm benchmarking

## Gotchas and Caveats

> [!gotcha] No geometry check
> The tool does not verify that both volumes have the same geometry (dimensions, voxel size, orientation). Mismatched volumes will produce meaningless results without any error.

> [!gotcha] Log file is overwritten
> The log file is opened with `"w+"` (write+truncate), not `"a+"`. Despite the comment in the source suggesting append mode, each run overwrites the log.

> [!gotcha] Division by zero for empty labels
> If a label exists in one volume but not the other (mean size = 0), the volume difference and Dice computations will divide by zero. The code uses `nvox_mean` as denominator without a guard; this produces `inf` or `nan` output. Labels absent from both volumes are safely skipped.

## Related Tools

- [[mri_compute_seg_overlap]] — similar but targets a fixed neuroanatomical label set with richer output (per-structure Dice table)
- [[mri_diff]] — structural comparison of two volumes (geometry, resolution, pixel data)

## Confidence and Gaps

Confidence is **high**. The source is short and self-contained. All flags are fully visible in `get_option()` and `usage_exit()`.
