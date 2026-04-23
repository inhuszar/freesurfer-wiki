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
last_agent_update: 2026-04-21
gaps:
  - "The exact column layouts of 'David's' and 'Sue's' table formats require reading LoadDavidsTable() and LoadSuesTable()."
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
| Statistics file (`--stat`) | Table in "David's" format mapping structure indices to statistical values. Specifying this flag also enables David's-format loading. | Plain text |
| Statistics file (`--sue`) | Table in "Sue's" format. Takes two arguments: file path and column index. Also enables log10 scaling by default. | Plain text |
| Segmentation volume (`--seg`) | Anatomical segmentation volume (e.g., `aseg.mgz`). | `.mgz`/`.mgh` |
| Annotation (`--annot`) | If specified, construct the segmentation from a surface annotation. Takes three arguments: annotation name, subject name, hemisphere. | `.annot`; takes 3 args |
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

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--stat file` | filename | — | Input statistics file in "David's" format; also sets `DoDavid = 1` |
| `--sue file col` | filename, int | — | Input statistics file in "Sue's" format with column index; also sets `log10flag = 1` and `DoSue = 1` |
| `--seg file` | filename | — | Input segmentation volume |
| `--annot annot subject hemi` | 3 args | — | Use surface annotation instead of seg volume; provide annotation name, subject name, and hemisphere |
| `--o file` | filename | — | Output statistics volume |
| `--no-log10` | — | off | Disable log10 scaling (use raw values from "Sue's" table) |
| `--no-strip4` | — | off | Do not strip the top 4 header rows from "Sue's" table (`DoStrip4=1` by default) |

## Configuration Interactions

- `--stat` and `--sue` are mutually exclusive format selectors (`DoDavid` vs `DoSue`). Exactly one must be specified.
- `--no-log10` disables the log10 scaling that `--sue` enables by default. It has no effect without `--sue`.
- `--no-strip4` prevents the top 4 header rows from being skipped when reading "Sue's" format.
- --annot <annot> <subject> <hemi> takes all three arguments together as a single flag invocation. It overrides --seg and constructs the segmentation from the surface annotation on-the-fly. Subject and hemisphere are provided as positional arguments to --annot, not as separate --s/--hemi flags (which do not exist in this tool).

## Typical Use Cases

**Map region statistics to segmentation volume (David's format):**
```bash
# Map a statistics file (David's format) back onto the segmentation volume
mri_stats2seg \
  --stat stats.mgh \
  --seg $SUBJECTS_DIR/$subject/mri/aseg.mgz \
  --o asegstats.mgh
```

**Sue's format with column selection:**
```bash
mri_stats2seg \
  --sue stats.txt 3 \
  --seg $SUBJECTS_DIR/$subject/mri/aseg.mgz \
  --no-strip4 \
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
> The user must know whether their statistics file is in "David's" (--stat) or "Sue's" (--sue) format. Providing the wrong flag will silently produce incorrect results.

> [!gotcha] `--annot` takes three positional arguments
> Unlike most FreeSurfer tools, this tool does not use separate --s subject and --hemi hemi flags. Instead, --annot consumes the next three positional arguments as annotation name, subject name, and hemisphere. Passing them separately will fail with an unknown-option error.

> [!gotcha] Annotation mode constructs seg in memory
> When `--annot` is used, the tool calls `MRISannotIndex2Seg()` to construct a volume segmentation from the annotation on-the-fly. This requires the subject's white surface to be accessible.

## Related Tools

- [[mris_anatomical_stats]] — produces the statistics tables consumed by this tool
- [[surface-format]] — format reference

## Confidence and Gaps

**High confidence.** The flag set confirmed from `parse_commandline()`. Prior incorrect flags (--david, --hemi, --s, --log10, --nostrip4) do not exist in source. The flags --avgwf, --avgwfvol, --ctab-default, --in, --stat-txt, --sum also do not exist in this tool; they belong to `mri_segstats`.

> [!gap] Table format details
> The exact column layouts of "David's" and "Sue's" formats are not documented in the source header; they are implemented in `LoadDavidsTable()` and `LoadSuesTable()`. Deeper source reading would clarify this.
