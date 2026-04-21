---
title: "mri_compute_seg_overlap"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compute_seg_overlap/mri_compute_seg_overlap.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_compute_overlap]]"
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

# mri_compute_seg_overlap

## Summary

`mri_compute_seg_overlap` computes Dice and Jaccard overlap coefficients between two segmentation volumes, targeting a fixed default set of 24 neuroanatomical structures (or all labels with `--all_labels`). It reports per-structure statistics and overall subcortical Dice, and can write results to multiple log files for mean, standard deviation, and overall overlap. It also supports a standalone `-dice` mode with extended output (TPR, FDR) for arbitrary label sets.

## Source Information

- **Language:** C++
- **Source file:** `mri_compute_seg_overlap/mri_compute_seg_overlap.cpp`
- **Original authors:** Xiao Han, Nick Schmansky
- **Help:** XML-based help embedded in `mri_compute_seg_overlap.help.xml.h`

## Purpose and Context

Designed specifically for evaluating FreeSurfer subcortical and cortical segmentations, this tool computes Dice and Jaccard overlap between a reference segmentation (`seg1`) and a test segmentation (`seg2`). The default label set covers 24 bilateral structures including ventricles, hippocampus, thalamus, caudate, putamen, pallidum, amygdala, and accumbens. White matter and cortex are included in per-structure output but excluded from the overall subcortical Dice aggregate.

The `-dice` mode provides a more flexible interface that also reports true positive rate (TPR) and false discovery rate (FDR), and can use any color table.

## Inputs

- **`seg1`**: reference segmentation volume (any `MRIread`-compatible format)
- **`seg2`**: test segmentation volume (must have identical dimensions)
- Both volumes must have the same width × height × depth.

## Outputs

Printed to stdout:
- Jaccard coefficients per label
- Dice coefficients per label (with volumes if color table loaded)
- Mean ± std of Jaccard and Dice across evaluated structures
- Overall subcortical Dice (18 structures, excludes WM, cortex, accumbens)

Optional log files (all append-mode):
- `-log fname`: per-structure Dice values, mean, std, overall subcortical Dice
- `-mlog fname`: mean Dice only
- `-slog fname`: std of Dice only
- `-olog fname`: overall subcortical Dice only

`-dice` mode writes:
- `datfile`: one Dice value per structure (single line)
- `tablefile`: columns: index, name, Jaccard, Dice, count1, count2, overlap, vol_diff%

## Mathematical Foundations

Let $A_i$ = voxels of label $i$ in seg1, $B_i$ = same in seg2.

**Jaccard:**
$$
J_i = \frac{|A_i \cap B_i|}{|A_i \cup B_i| + 10^{-10}}
$$

**Dice:**
$$
D_i = \frac{2 |A_i \cap B_i|}{|A_i| + |B_i| + 10^{-10}}
$$

A small epsilon ($10^{-10}$) prevents division by zero when both volumes contain zero voxels for a given label.

**Overall subcortical Dice** (18 structures):
$$
D_\text{subcort} = \frac{2 \cdot \text{subcor\_overlap}}{\text{subcor\_vol1} + \text{subcor\_vol2}}
$$

**True positive rate (TPR)** and **false discovery rate (FDR)** in `-dice` mode:
$$
\text{TPR} = \frac{|A \cap B|}{|A|} \qquad \text{FDR} = \frac{|B \setminus A|}{|B|}
$$

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--all_labels` | — | off | Compute overlap for all labels present in either volume |
| `--log fname` / `-L fname` | file | none | Log per-structure Dice values (append mode) |
| `--mlog fname` | file | none | Log mean Dice (append) |
| `--slog fname` | file | none | Log std Dice (append) |
| `--olog fname` | file | none | Log overall subcortical Dice (append) |
| `--wm 0\|1` | 0 or 1 | 1 | Include (1) or exclude (0) white matter from stats |
| `--cortex 0\|1` | 0 or 1 | 1 | Include (1) or exclude (0) cortex from stats |
| `--default-ctab` | — | off | Load `$FREESURFER_HOME/FreeSurferColorLUT.txt` for label names |
| `--table fname` | file | none | Load color table from file and save tabular output |
| `--dice seg1 seg2 ctab ReportEmpty ExcludeId datfile tablefile` | multiple | — | Standalone Dice computation mode with full table output |
| `--dice-mask maskfile` | file | none | Apply mask before `-dice` computation (must precede `--dice`) |
| `--tpfpfn outvol manseg autoseg segid...` | multiple | — | Create TP/FP/FN volume for given segmentation IDs |

## Configuration Interactions

- `--all_labels` overrides the default 24-structure list and evaluates all labels with non-zero overlap.
- `--default-ctab` / `--table` enable label name display in the Dice output; without them, only numeric IDs are shown.
- `--wm 0` and `--cortex 0` can be used together to evaluate only subcortical structures.
- `-dice` is a fully standalone mode that bypasses the regular processing path; it reads its own seg1/seg2 from its own arguments and exits immediately after writing outputs.
- `--dice-mask` must be specified before `--dice` in the argument list (parsed earlier in get_option).

## Typical Use Cases

Basic evaluation with default label set:
```bash
mri_compute_seg_overlap auto_aseg.mgz manual_aseg.mgz
```

Full table with color labels, log mean Dice:
```bash
mri_compute_seg_overlap --table dice_table.txt --mlog mean_dice.txt \
  auto_aseg.mgz manual_aseg.mgz
```

All labels evaluation:
```bash
mri_compute_seg_overlap --all_labels --default-ctab \
  auto_aseg.mgz manual_aseg.mgz
```

Standalone Dice with TPR/FDR:
```bash
mri_compute_seg_overlap --dice auto_aseg.mgz manual_aseg.mgz \
  $FREESURFER_HOME/FreeSurferColorLUT.txt 0 0 dice.dat dice.table.txt
```

## Pipeline Context

Not called by [[recon-all]]. Used for:
- Longitudinal segmentation reproducibility studies
- Algorithm development and benchmarking
- Cross-site and cross-scanner validation

## Gotchas and Caveats

> [!gotcha] Dimensions must match exactly
> The tool checks that width, height, and depth are identical and exits with an error if they differ. No resampling is performed.

> [!gotcha] Default label set is hard-coded
> The 24 default structures are defined at compile time. To evaluate a non-standard segmentation, `--all_labels` is required. The "overall subcortical Dice" always uses a fixed 18-structure subset regardless of which labels are present.

> [!gotcha] Log files use append mode
> Unlike [[mri_compute_overlap]], the log files in this tool are opened with `"a+"` (append), meaning repeated runs accumulate results in the same file.

> [!gotcha] `--dice-mask` ordering constraint
> The `-dice-mask` flag must appear before `--dice` on the command line because the mask is stored in a global variable checked when `--dice` is parsed. Wrong ordering silently ignores the mask.

## Related Tools

- [[mri_compute_overlap]] — simpler overlap tool for arbitrary user-specified labels
- [[mri_diff]] — volume comparison (geometry, pixel data)

## Confidence and Gaps

Confidence is **high**. Source fully read. Default label constants are from `cma.h` and match the FreeSurfer standard subcortical label set.
