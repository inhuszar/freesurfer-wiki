---
title: "mri_evaluate_morph"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_evaluate_morph/mri_evaluate_morph.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_elastic_energy]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "compute_overlap() metric details not fully traced"
tags:
  - registration
  - evaluation
  - morphometry
  - group-analysis
---

# mri_evaluate_morph

## Summary

`mri_evaluate_morph` evaluates the quality of a volumetric registration (morph) by computing the pairwise overlap of segmentation volumes across multiple subjects after applying their respective transforms. For each pair of subjects, it loads their segmentation maps and transforms, maps the segmentations into a common space, and computes a scalar overlap metric. Results are written to an output file.

## Source Information

- **Source language:** C++
- **Source file:** `mri_evaluate_morph/mri_evaluate_morph.cpp`
- **Key dependencies:** `mri.h`, `transform.h`

## Purpose and Context

After group registration (e.g., Talairach or atlas registration via `mri_em_register`), it is important to assess how well the registration aligned corresponding anatomical structures. `mri_evaluate_morph` provides a quantitative overlap metric for this assessment. It reads the segmentation and transform from each subject's FreeSurfer directory (`SUBJECTS_DIR/<subject>/mri/`) and computes pairwise overlap statistics.

## Inputs

Positional arguments (in order):
1. Transform name (e.g., `talairach.xfm` or `talairach.m3z`)
2. Segmentation volume name (e.g., `aseg.mgz`)
3. Subject names (variable number, at least 2 subjects)
4. Output file (last positional argument)

`SUBJECTS_DIR` must be set in the environment.

Up to `MAX_SUBJECTS = 100` subjects are supported.

## Outputs

- ASCII output file with pairwise overlap values (written to the last positional argument).

## Mathematical Foundations

The overlap metric is computed by `compute_overlap(mri_seg1, mri_seg2, transform1, transform2)`. The exact metric is not fully specified in the readable portion of the source but is likely a Dice coefficient or Jaccard index:

$$\text{Overlap}(A, B) = \frac{2 |A \cap B|}{|A| + |B|}$$

after mapping both segmentations to a common space via their respective transforms.

The total overlap is accumulated across all $\binom{N}{2}$ pairs and averaged:

$$\bar{O} = \frac{1}{\binom{N}{2}} \sum_{i < j} \text{Overlap}(S_i \circ T_i^{-1}, S_j \circ T_j^{-1})$$

> [!gap] Exact overlap metric
> The body of `compute_overlap()` was not read. Whether it uses Dice, Jaccard, or a voxel-count-based measure is unclear.

## Configuration Options

| Flag | Description |
|------|-------------|
| `-sdir <dir>` | Override `SUBJECTS_DIR` with `<dir>` |

> [!gap] Full flag list
> Only `-sdir` is identified from the global variable `sdir`. Additional flags may exist in `get_option()`.

## Configuration Interactions

- Requires `SUBJECTS_DIR` either set in environment or via `-sdir`.
- All subjects must have both the transform and segmentation files present under `<SUBJECTS_DIR>/<subject>/mri/`.

## Typical Use Cases

```bash
# Evaluate Talairach registration overlap across 5 subjects
mri_evaluate_morph talairach.xfm aseg.mgz \
  sub01 sub02 sub03 sub04 sub05 overlap_results.txt
```

## Pipeline Context

Not called by `[[recon-all]]`. Used in research pipelines to evaluate group registration quality. Typically run after `[[mri_em_register]]` or other group-level registration tools.

## Gotchas and Caveats

> [!assumption] SUBJECTS_DIR structure required
> Expects the standard FreeSurfer directory structure: `$SUBJECTS_DIR/<subject>/mri/<seg>` and `$SUBJECTS_DIR/<subject>/mri/transforms/<xform>`.

## Related Tools

- `[[mri_em_register]]` — produces the transforms that this tool evaluates
- `[[mri_elastic_energy]]` — alternative registration quality metric based on deformation energy

## Confidence and Gaps

**High confidence:** main function logic, input/output structure confirmed from source.

**Medium confidence:** exact overlap metric requires reading `compute_overlap()`.
