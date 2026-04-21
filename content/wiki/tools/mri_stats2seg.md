---
title: "mri_stats2seg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_stats2seg/mri_stats2seg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The 'David' and 'Sue' table format naming requires context about the original authors."
tags:
  - statistics
  - segmentation
  - visualization
  - volume
---

# mri_stats2seg

## Summary

`mri_stats2seg` maps per-structure statistical values (e.g., p-values or effect sizes from a segmentation statistics file) back onto the voxels of a segmentation volume, creating a volumetric scalar map where each voxel's value equals the statistic for its anatomical label. The result can be overlaid on a structural volume in `tkmedit` or `freeview` for visualization. Attributed to Douglas N. Greve.

## Source Information

- **Language:** C++
- **Source file:** `mri_stats2seg/mri_stats2seg.cpp`
- **Key libraries:** `mrisurf`, `mri`, `annotation`, `cmdargs`
- **Key functions:** `LoadDavidsTable()`, `LoadSuesTable()` — load statistics from two different table formats

## Purpose and Context

`mri_segstats` produces per-structure statistics tables. To visualize these statistics spatially (which brain regions have significant effects?), it is useful to map the statistics back to voxel space. `mri_stats2seg` does this: for each voxel in the segmentation volume, it looks up the voxel's anatomical label, retrieves the corresponding statistic from the table, and writes it to the output volume. The result is a "statistics atlas" volume that can be viewed as an overlay.

The tool supports two table formats (informally named "David's table" and "Sue's table", after the original developers who used these formats).

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Statistics file (`--stat`) | Table mapping anatomical structure indices to statistical values. | Plain text (David's or Sue's format) |
| Segmentation volume (`--seg`) | Anatomical segmentation volume (e.g., `aseg.mgz`). | `.mgz`/`.mgh` |
| Annotation (optional, `--annot`) | If specified, construct the segmentation from a surface annotation instead of a volume. | `.annot` via `--s` and `--hemi` |
| Subject (`--s`) | Subject name (required if `--annot` is specified). | — |
| Hemisphere (`--hemi`) | Hemisphere for annotation lookup. | `lh` or `rh` |
| Output volume (`--o`) | Output statistics volume. | `.mgz`/`.mgh` |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Statistics volume | Per-voxel scalar map where each voxel's value is the statistic for its anatomical label. Zero for unlabeled voxels. | `.mgz`/`.mgh` (float) |

## Mathematical Foundations

The operation is a simple lookup:

$$
\text{output}(x,y,z) = \begin{cases} \text{stat}[\text{seg}(x,y,z)] & \text{if } \text{seg}(x,y,z) \neq 0 \\ 0 & \text{otherwise} \end{cases}
$$

where $\text{stat}[\cdot]$ is the lookup table indexed by anatomical label ID, and $\text{seg}(x,y,z)$ is the label at each voxel.

For annotation-based segmentation, `MRISannotIndex2Seg()` first converts the surface annotation to a volume.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--stat file` | filename | Input statistics file |
| `--seg file` | filename | Input segmentation volume |
| `--annot name` | annotation name | Use annotation instead of segmentation volume |
| `--s subject` | subject name | Subject (required with `--annot`) |
| `--hemi hemi` | `lh`/`rh` | Hemisphere (required with `--annot`) |
| `--o file` | filename | Output statistics volume |
| `--david` | — | Load statistics in "David's" table format |
| `--sue col` | integer | Load statistics from "Sue's" table, column `col` |
| `--log10` | — | Input values are already -log10(p); don't apply further transformation |
| `--nostrip4` | — | Don't strip the top 4 rows of Sue's table |

## Configuration Interactions

- `--david` and `--sue` are mutually exclusive format selectors. Exactly one must be specified.
- `--log10` applies to Sue's table format; it indicates the input values are already on a -log10(p) scale.
- `--annot` requires `--s` and `--hemi`; it overrides `--seg` and constructs the segmentation from the surface annotation.

## Typical Use Cases

**Map region statistics to segmentation volume (David's format):**
```bash
# First run mri_segstats to generate statistics
mri_segstats \
  --in $SUBJECTS_DIR/$subject/mri/norm.mgz \
  --seg $SUBJECTS_DIR/$subject/mri/aseg.mgz \
  --ctab-default \
  --avgwfvol stats.mgh --avgwf stats.txt \
  --sum sum.txt

# Then map statistics back to volume
mri_stats2seg \
  --stat stats.mgh \
  --seg $SUBJECTS_DIR/$subject/mri/aseg.mgz \
  --o asegstats.mgh
```

**Visualize in tkmedit:**
```bash
tkmedit $subject norm.mgz -aux ./asegstats.mgh \
  -segmentation $SUBJECTS_DIR/$subject/mri/aseg.mgz \
  $FREESURFER_HOME/FreeSurferColorLUT.txt
```

## Pipeline Context

`mri_stats2seg` is not part of `recon-all`. It is a post-processing visualization utility in the analysis pipeline:
1. Run `mri_segstats` to compute per-structure statistics.
2. Run `mri_stats2seg` to project statistics back to volume space.
3. Overlay in `freeview` or `tkmedit` for anatomically contextualized visualization.

## Gotchas and Caveats

> [!gotcha] Table format must be specified
> The user must know whether their statistics file is in "David's" or "Sue's" format and specify the appropriate flag. Providing the wrong flag will silently produce incorrect results.

> [!gotcha] Annotation mode constructs seg in memory
> When `--annot` is used, the tool calls `MRISannotIndex2Seg()` to construct a volume segmentation from the annotation on-the-fly. This requires the subject's white surface to be accessible.

## Related Tools

- [[mris_anatomical_stats]] — produces the statistics tables consumed by this tool
- [[surface-format]] — format reference

## Confidence and Gaps

**High confidence.** The lookup logic and table format handling are clearly visible in the source. The "David's" and "Sue's" naming is informal and their exact formats require inspection of `LoadDavidsTable()` and `LoadSuesTable()`.

> [!gap] Table format details
> The exact column layouts of "David's" and "Sue's" formats are not documented in the source header; they are implemented in `LoadDavidsTable()` and `LoadSuesTable()`. Deeper source reading would clarify this.
