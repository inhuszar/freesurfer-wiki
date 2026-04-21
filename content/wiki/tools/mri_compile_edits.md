---
title: "mri_compile_edits"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_compile_edits/mri_compile_edits.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[recon-all]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - editing
  - quality-control
  - provenance
---

# mri_compile_edits

## Summary

`mri_compile_edits` scans a subject's `mri/` directory for all manually-edited volumes and produces a single summary volume (`edits.mgz` by default) in which each voxel is labeled with an integer indicating which type of edit was made at that location. It is a provenance and quality-control utility that summarizes all human interventions made during the [[recon-all]] pipeline for a given subject.

## Source Information

- **Language:** C++
- **Source file:** `mri_compile_edits/mri_compile_edits.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

Manual editing is a common part of FreeSurfer quality control. Editors may:
- Add or remove voxels from WM (`wm.mgz`)
- Edit the brain mask (`brain.mgz`, `brainmask.mgz`)
- Correct surfaces via `brain.finalsurfs.mgz`
- Correct the segmentation via `aseg.mgz`

`mri_compile_edits` collects all such changes into a single labeled volume, making it easy to visualize what was changed across all editing passes. The embedded color table describes the meaning of each label.

## Inputs

- `<subject>` — subject name (positional argument 1)
- Optional: `[output_file]` — output filename (default: `edits.mgz`)

The tool reads from `$SUBJECTS_DIR/<subject>/mri/`:
- `brain.mgz` (compared to internal edit markers)
- `wm.mgz` (compared to edit markers)
- `brainmask.mgz` (compared to `brainmask.auto.mgz`)
- `brain.finalsurfs.mgz` (compared to `brain.finalsurfs.auto.mgz`)
- `aseg.mgz` (compared to `aseg.auto.mgz`)

`SUBJECTS_DIR` or `-sdir` must point to the subjects directory.

## Outputs

- `<subjects_dir>/<subject>/mri/<output_file>` — a labeled edit summary volume with an embedded color table.

**Label codes:**

| Value | Meaning | Color |
|-------|---------|-------|
| 1 (`EDIT_WM_OFF`) | Voxel erased from wm.mgz | — |
| 2 (`EDIT_WM_ON`) | Voxel added to wm.mgz | — |
| 3 (`EDIT_BRAIN_OFF`) | Voxel erased from brain.mgz | — |
| 4 (`EDIT_BRAIN_ON`) | Voxel added to brain.mgz | — |
| 5 (`EDIT_BM_CHANGED`) | brainmask.mgz changed relative to auto | — |
| 6 (`EDIT_FINALSURFS_OFF`) | brain.finalsurfs.mgz voxel removed | — |
| 7 (`EDIT_FINALSURFS_ON`) | brain.finalsurfs.mgz voxel added | — |
| 8 (`EDIT_ASEG_CHANGED`) | aseg.mgz changed relative to aseg.auto.mgz | — |

Edit detection uses edit marker voxel values (`WM_EDITED_OFF_VAL`, `WM_EDITED_ON_VAL`) embedded in the edited volumes by the FreeSurfer editing workflow, and direct voxel-wise difference (using `MRIsetDifferentVoxelsWithValue`) for mask and aseg comparisons.

## Mathematical Foundations

The tool performs voxel-wise comparisons:

For WM/brain edit markers:
$$
\text{edit}(v) = \begin{cases} \text{EDIT\_WM\_OFF} & \text{if } wm(v) = \text{WM\_EDITED\_OFF\_VAL} \\ \text{EDIT\_WM\_ON} & \text{if } wm(v) = \text{WM\_EDITED\_ON\_VAL} \end{cases}
$$

For mask and aseg comparisons:
$$
\text{edit}(v) = \text{EDIT\_BM\_CHANGED} \text{ if } \text{brainmask}(v) \neq \text{brainmask.auto}(v)
$$

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory |
| `[output]` | string | `edits.mgz` | Output filename (second positional arg) |

## Typical Use Cases

**Compile all edits for subject bert:**
```bash
mri_compile_edits bert
```

**With explicit output path:**
```bash
mri_compile_edits bert $SUBJECTS_DIR/bert/mri/all_edits.mgz
```

## Pipeline Context

Not a standard [[recon-all]] stage. Run as a post-processing quality control step to document what edits were made. Useful in studies requiring audit trails of manual interventions, or when comparing edit patterns across subjects.

## Gotchas and Caveats

> [!gotcha] Requires auto versions of edited volumes
> For `brainmask`, `brain.finalsurfs`, and `aseg`, the tool compares the edited version to the corresponding `.auto.mgz` version. If `.auto.mgz` files have been deleted or were never created, those edit categories will produce 0 counts.

> [!gotcha] WM edits use embedded markers, not comparison
> WM and brain edits are detected via special voxel values (`WM_EDITED_OFF_VAL`, `WM_EDITED_ON_VAL`) embedded in the volume by the FreeSurfer editing tools. If the edited volume was created by a tool that does not set these markers, the edits will not be detected.

> [!gotcha] Multiple edits at same voxel
> If a voxel was edited multiple times across different volumes (e.g., changed in both `wm.mgz` and `brainmask.mgz`), the output volume will contain only the last edit label written (later in the code's sequence: brain → wm → brainmask → finalsurfs → aseg).

## Related Tools

- [[recon-all]] — the pipeline where edits are made
- [[mri_binarize]] — can extract specific edit types from the compiled volume

## Confidence and Gaps

Source code fully read. Confidence is high.
