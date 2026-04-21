---
title: "mri_ctab_fix"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ctab_fix/mri_ctab_fix.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_label]]"
  - "[[mris_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - color-table
  - LUT
  - annotation
  - segmentation
---

# mri_ctab_fix

## Summary

`mri_ctab_fix` is a color table (LUT) management utility with four modes: check a single LUT for duplicate annotation assignments (`-c`), fix annotation conflicts between two LUTs (`-1`), split a merged LUT back into two original LUTs (`-2`), and merge two LUTs into one combined table (`-m`). It is used to ensure consistent annotation (RGBA color) assignments across segmentation label tables.

## Source Information

- **Language:** C++
- **Source file:** `mri_ctab_fix/mri_ctab_fix.cpp`

## Purpose and Context

FreeSurfer segmentations and parcellations use color lookup tables (LUTs) to map integer label IDs to names and RGBA colors. When combining or comparing segmentations from different sources, conflicts arise:
- Same label name mapped to different annotation values in two LUTs
- Different label names mapped to the same annotation value (duplicate colors)

`mri_ctab_fix` detects and resolves these conflicts, enabling consistent multi-atlas or combined segmentation workflows. The "annotation" in this context is a packed 32-bit integer encoding the RGBA color, used by FreeSurfer annotation files (`.annot`).

## Inputs

Depending on mode:
- `-c inctab [outfixedctab]`: one input LUT
- `-1 inctab_1 inctab_2 [outfixedctab_1 outfixedctab_2]`: two input LUTs
- `-2 inctab_1 inctab_2 ctab_merged outfixedctab_1 outfixedctab_2`: two inputs + merged LUT
- `-m inctab_1 inctab_2 [mergedctab]`: two input LUTs

LUTs are in ASCII format (FreeSurfer `FreeSurferColorLUT.txt` style).

## Outputs

Depends on mode:
- `-c`: reports duplicates to stdout; optionally writes fixed LUT to file
- `-1`: prints/writes fixed `inctab_2` where conflicts are resolved
- `-2`: writes split LUTs derived from the merged table
- `-m`: writes merged LUT to file or stdout

## Mathematical Foundations

An "annotation" is a packed integer computed from the RGBA color:
$$\text{annotation} = R + G \cdot 256 + B \cdot 256^2$$

Label consistency requires that for any label name $n$:
- Across both LUTs: the same annotation value is assigned to the same name
- Within one LUT: no two different names share the same annotation value

The tool uses `std::map<std::string, int>` (label name → annotation) for efficient lookup and conflict detection.

When fixing (`-1`), conflicting annotation values in `inctab_2` are reassigned using `CTABprintAnnotationAssignment()` with a fixed random seed of 12 (set via `setRandomSeed(12)`).

## Configuration Options

| Mode flag | Arguments | Description |
|-----------|-----------|-------------|
| `-c` | `inctab [outfixedctab]` | Check single LUT for duplicate annotations |
| `-1` | `inctab_1 inctab_2 [outfixedctab_1 outfixedctab_2]` | Fix inctab_2 to be consistent with inctab_1 |
| `-2` | `inctab_1 inctab_2 ctab_merged outfixedctab_1 outfixedctab_2` | Split merged LUT back into two |
| `-m` | `inctab_1 inctab_2 [mergedctab]` | Merge two LUTs (inctab_1 structure preserved; inctab_2 renumbered) |
| `-e exception` | label name | Skip this label when checking/fixing (works with `-c` and `-1`) |

## Configuration Interactions

- `-e exception` is compatible with `-c` and `-1` to skip a specific label.
- `-1` preserves `inctab_1` unchanged; only `inctab_2` is modified.
- `-m` assigns sequential IDs to labels from `inctab_2` that don't exist in `inctab_1`, starting after the last ID in `inctab_1`.
- `-2` requires a pre-existing merged LUT (created by `-m`) and the two original LUTs for reference.
- Random seed is always fixed at 12 for reproducibility of annotation re-assignment.

## Typical Use Cases

Check a LUT for duplicate color assignments:
```bash
mri_ctab_fix -c MyAtlas.txt FixedAtlas.txt
```

Fix LUT2 to be annotation-consistent with LUT1:
```bash
mri_ctab_fix -1 Atlas1.txt Atlas2.txt Atlas1_fixed.txt Atlas2_fixed.txt
```

Merge two LUTs:
```bash
mri_ctab_fix -m Atlas1.txt Atlas2.txt MergedAtlas.txt
```

Split a merged LUT back:
```bash
mri_ctab_fix -2 Atlas1_orig.txt Atlas2_orig.txt MergedAtlas.txt \
  Atlas1_split.txt Atlas2_split.txt
```

## Pipeline Context

Not called by [[recon-all]]. Used in atlas creation and multi-atlas fusion workflows.

## Gotchas and Caveats

> [!gotcha] Fixed random seed
> Annotation reassignment always uses seed 12. This ensures reproducibility but means all runs produce the same reassigned colors. If multiple fix operations are run on different pairs, there may still be color conflicts between the separately-fixed tables.

> [!gotcha] `-m` renumbers labels from inctab_2
> Labels in `inctab_2` that are not in `inctab_1` get new sequential IDs starting after the last ID in `inctab_1`. Any downstream code referencing the original `inctab_2` label IDs will be broken.

## Related Tools

- [[mri_ca_label]] / [[mris_ca_label]] — produce segmentations that use color tables
- `mri_aparc2aseg` — combines surface parcellation with aseg using color tables

## Confidence and Gaps

Confidence is **high**. The source file is fully read and all four modes are well-documented in the source comments.
