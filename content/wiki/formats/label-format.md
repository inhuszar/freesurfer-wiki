---
title: "FreeSurfer Label (.label)"
type: format
fs_version: "8.2.0"
file_extensions:
  - ".label"
produced_by:
  - "[[mri_cor2label]]"
  - "[[mri_annotation2label]]"
  - "[[mri_surfcluster]]"
  - "[[mri_volcluster]]"
  - "[[mris_make_surfaces]]"
  - "[[label-cortex]]"
  - "[[label2flat]]"
  - "[[labels_union]]"
  - "[[labels_intersect]]"
  - "[[labels_disjoint]]"
  - "[[setlabelstat]]"
  - "[[bblabel]]"
consumed_by:
  - "[[mri_label2vol]]"
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[mris_calc]]"
  - "[[mri_surf2surf]]"
  - "[[mris_thickness]]"
  - "[[label2patch]]"
  - "[[label2flat]]"
  - "[[bblabel]]"
  - "[[setlabelstat]]"
  - "[[labels_union]]"
  - "[[labels_intersect]]"
  - "[[labels_disjoint]]"
related:
  - "[[annotation-format]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact behaviour when both surface-type and volume-type points are mixed in a single label file has not been verified."
  - "Behaviour of LabelRead when the vox2ras= token is missing entirely (pre-modern files) has not been traced."
tags:
  - format
  - surface
  - label
  - roi
---

# FreeSurfer Label (.label)

## Overview

A `.label` file is a plain-text ASCII file that identifies a **subset of
surface vertices or volume voxels** by listing their index and spatial
coordinates together with a per-point scalar statistic. It is the primary
format for region-of-interest (ROI) masks, cortical parcellation sub-regions,
functional activation clusters, and any other spatially restricted subset of
points that needs to be stored independently of a full surface or volume.

The format is intentionally simple: one point per line, three coordinate
values, one statistic. No geometry, topology, or atlas information is stored.
The file is always ASCII-readable and trivially parseable.

**Common uses:**

- `?h.cortex.label` — the single most important label in any subject directory;
  defines the cortex proper (excluding the medial wall) and drives surface
  placement, parcellation, and morphometric statistics in `recon-all`
- `?h.cortex+hipamyg.label` — variant that includes hippocampus and amygdala
  vertices; used during pial surface placement
- Brodmann area labels (`?h.BA*.label`) — projections of cytoarchitectonic
  atlases onto individual surfaces
- Functional cluster labels from `mri_surfcluster` or `mri_volcluster`
- Hand-edited ROI marks from FreeView

## File Structure

The format is entirely ASCII text. It is read by `LabelReadFrom()` in
`utils/label.cpp` and written by `LabelWriteInto()` in the same file.

### Line-by-line layout

```
#!ascii label <name> , from subject <subject> vox2ras=<space>\n
<n_points>\n
<vno>  <x>  <y>  <z>  <stat>\n
<vno>  <x>  <y>  <z>  <stat>\n
...
```

**Line 1 — comment / metadata**

```
#!ascii label  , from subject bert vox2ras=TkReg
```

The line begins with the literal `#!ascii label`. It then carries optional
`name` and `subject` fields (can be empty). The critical token is
`vox2ras=<space>`, which encodes the coordinate system:

| `vox2ras=` value | `area->coords` set to | Meaning |
|---|---|---|
| `TkReg` (or `TkReg coords=…`) | `LABEL_COORDS_TKREG_RAS` (1) | Surface RAS / tkregister RAS (most common) |
| contains `"scanner"` | `LABEL_COORDS_SCANNER_RAS` (2) | Scanner RAS (physical space) |
| contains `"voxel"` | `LABEL_COORDS_VOXEL` (3) | Integer voxel CRS |
| absent / unrecognised | `LABEL_COORDS_TKREG_RAS` (1) | Default fallback |

The parser in `LabelReadFrom()` tests for the string `"voxel"` in the `space`
field first, then `"scanner"` in the raw comment line, then falls back to
`LABEL_COORDS_TKREG_RAS`. There is no explicit keyword for TkReg — it is the
default.

**Line 2 — point count**

A single integer giving the number of data rows that follow. Deleted points
(those with `lv[n].deleted != 0`) are excluded from the count when writing via
`LabelWriteInto()`.

**Lines 3… — data rows**

Each row contains exactly five fields separated by whitespace:

```
<vertex_number>  <x>  <y>  <z>  <stat>
```

| Field | C type | printf format | Notes |
|---|---|---|---|
| `vertex_number` | `int` | `%d` | Surface vertex index (0-based); `-1` for volume-only points |
| `x` | `float` | `%2.3f` | X coordinate in the label's coordinate system |
| `y` | `float` | `%2.3f` | Y coordinate |
| `z` | `float` | `%2.3f` | Z coordinate |
| `stat` | `float` | `%10.10f` | Per-point scalar statistic |

The read parser uses `sscanf(cp, "%d %f %f %f %f", &vno, &x, &y, &z, &stat)`.
Parsing stops after `n_points` successfully read rows; any trailing content in
the file is ignored.

### Example (surface label — `?h.cortex.label`)

```
#!ascii label , from subject vox2ras=TkReg
126243
0  -11.290  -100.938  -0.303 0.0000000000
1  -10.512  -101.039  -1.481 0.0000000000
2  -10.911  -101.111  -0.940 0.0000000000
...
```

Vertex indices here are sequential from 0 because the cortex label is built
from an entire hemisphere scan (see [Key Label Files](#key-label-files)).
The stat values are 0.0 for anatomical masks.

### Example (probabilistic atlas label — `?h.BA1_exvivo.label`)

```
#!ascii label  , from subject bert vox2ras=TkReg
2913
36525  -13.337  -42.579  66.559 0.4444440007
35745  -14.002  -43.404  66.644 0.4444440007
37327  -13.711  -41.725  66.263 0.5555559993
...
```

Vertex indices are non-sequential (arbitrary subset of the surface); the stat
column holds per-vertex probability values summing to approximately 1 across
atlas labels.

### Example (volume label — vno = -1)

When `mri_cor2label` operates on a volume without specifying `--surf`, each
matched voxel's coordinates are computed via the tkregister vox2ras matrix and
the vertex number field is set to `-1`:

```
#!ascii label  , from subject  vox2ras=TkReg
42
-1  12.500  -30.200  18.750 0.0000000000
-1  13.500  -30.200  18.750 0.0000000000
...
```

## Surface Labels vs. Volume Labels

FreeSurfer labels come in two functional variants distinguished by the
`vertex_number` field, not by any file-level flag.

### Surface labels (`vno >= 0`)

- Each row references a specific vertex by index on a surface mesh.
- Coordinates (`x`, `y`, `z`) are the Surface RAS (tkRAS) coordinates of that
  vertex, but they are not strictly required to match; the vertex index is the
  primary key for surface operations.
- `is_surface_label()` in `mri_label2vol` returns `true` if and only if every
  point has `vno != -1`.
- When a surface label is loaded and the vertex index is already valid
  (0 ≤ `vno` < `mris->nvertices`), the coordinates are replaced by the
  current surface vertex position via `LabelToCurrent()`. If `vno == -1` but
  the label is being mapped to a surface, the closest vertex is found by
  spatial search in the mesh hash table (`MHTfindVnoOfClosestVertexInTable()`).

### Volume labels (`vno == -1`)

- The vertex number field is `-1` for all rows.
- Coordinates hold the actual spatial position of the voxel centre,
  typically in TkReg RAS unless `vox2ras=` indicates otherwise.
- `mri_label2vol` can use these coordinates directly; it converts them to
  column-row-slice indices via the `Tras2vox` matrix.
- Volume labels cannot be used with surface operations that require a vertex
  index (e.g. `--proj` in `mri_label2vol`).

> [!gotcha] Surface vs. volume distinction is implicit
> There is no file-level flag distinguishing a surface label from a volume
> label. The distinction is derived purely from the `vertex_number` field of
> each row. Code that reads labels (e.g. `mri_label2vol`) checks each point
> individually. A single file can technically mix vno ≥ 0 and vno = -1 rows,
> but this is not a designed use case and tool behaviour in this situation has
> not been verified.

## Coordinate System

The `vox2ras=` token on the comment line specifies which coordinate system the
`x`, `y`, `z` columns use. See [[coordinate-systems]] for full definitions.

**For surface labels (the common case):**

- Coordinates are in **Surface RAS** (also called tkRAS or tkregister RAS).
  This is the coordinate system used by FreeSurfer surfaces: origin at the
  centre of the conformed volume's bounding box, axes aligned with RAS
  orientation.
- The `vox2ras=` token is `TkReg` (or a variant like `TkReg coords=canonical`
  for canonical-space labels).
- Because the vertex index is the primary reference for surface operations,
  the stored coordinates are mostly used for display and for spatial search
  when the vertex index is `-1`.

**For volume labels:**

- Coordinates are in the system indicated by `vox2ras=`. Most commonly this
  is still TkReg RAS (produced by `mri_cor2label` using `MRIxfmCRS2XYZtkreg()`).
- `mri_label2vol` requires TkReg RAS by default; if a label is in scanner RAS
  or voxel coordinates, a template volume must be specified with
  `--tkr-template` so the tool can convert coordinates before mapping.

> [!gotcha] Coordinate system confusion in mri_label2vol
> `mri_label2vol` enforces `LABEL_COORDS_TKREG_RAS` for all labels it
> processes. If a label was saved with `vox2ras=scanner` or `vox2ras=voxel`,
> the tool will refuse to process it unless `--tkr-template` is given. The
> error message is: *"label is not in tkreg coords so you need to specify a
> template with --tkr-template MRI"*.

## The stat Column

The fifth column holds a per-point scalar value whose meaning is
application-dependent:

| Context | Typical stat value | Meaning |
|---|---|---|
| Anatomical mask (`cortex.label`, etc.) | `0.0` | No statistic; presence in list = membership |
| Probabilistic atlas labels (`BA*.label`) | `0.0` – `1.0` | Per-vertex probability of belonging to that area |
| Functional cluster labels (`mri_surfcluster`) | vertex `val` field | Surface-based t/F/z-statistic |
| Activation labels from `mri_cor2label --stat` | voxel value from input | Statistic map value at that location |
| `mri_annotation2label` with `--stat StatFile` | per-vertex overlay value | User-supplied stat file value |

When `LabelWriteInto()` writes the stat, it uses the format `%10.10f` (10
decimal places), which is why anatomical labels show `0.0000000000` and
probabilistic labels show values like `0.4444440007`.

> [!assumption] Zero stat ≠ absent stat
> A `stat` of 0.0 does not mean the point has no statistic; it means the
> statistic is zero. Anatomical labels conventionally use 0.0. Do not attempt
> to threshold anatomical labels on the stat column.

## Key Label Files in the Subject Directory

All label files reside in `$SUBJECTS_DIR/<subject>/label/`.

| File | Contents | Created by |
|---|---|---|
| `lh.cortex.label`, `rh.cortex.label` | Cortex mask: all white surface vertices that are not medial wall, corpus callosum, or lesion | `MRIScortexLabel()` called from `mris_make_surfaces` during the `-make-surfaces` stage |
| `lh.cortex+hipamyg.label`, `rh.cortex+hipamyg.label` | Cortex mask including hippocampus and amygdala vertices; used for pial surface placement | Same function with `KeepHipAmyg=1` |
| `lh.BA1_exvivo.label` … `rh.BA6_exvivo.label` | Brodmann area labels from ex-vivo atlas | `mri_annotation2label` from `BA_exvivo.annot` |
| `lh.BA1_exvivo.thresh.label` etc. | Thresholded versions of BA labels (only high-probability vertices) | Same |
| `lh.high-myelin.label`, `rh.high-myelin.label` | High-myelin cortex regions | `recon-all` supplementary step |

The `?h.cortex.label` file is the **most critical label** in the pipeline:

- `mris_ca_label` uses it to constrain parcellation: vertices outside the
  cortex label are assigned the `unknown` annotation rather than a gyral label.
- `mris_anatomical_stats` restricts morphometric output to vertices within the
  cortex label.
- `mri_surf2surf` can use it as a smoothing mask (`--cortex` flag).
- `mri_surfcluster` has a `--cortex` shortcut that automatically loads it.
- Various stages of `recon-all` pass it via `-l ../label/?h.cortex.label`.

## Tools That Read / Write .label

| Tool | Read | Write | Notes |
|------|------|-------|-------|
| `mri_cor2label` | — | ✓ | Converts thresholded volume or surface overlay to label; `vno=-1` for volume mode |
| `mri_annotation2label` | — | ✓ | Extracts one .label per annotation region from a .annot file |
| `mris_make_surfaces` | — | ✓ | Writes `?h.cortex.label` and `?h.cortex+hipamyg.label` via `MRIScortexLabel()` |
| `mri_surfcluster` | ✓ | ✓ | Reads label as cluster mask; writes one label per cluster |
| `mri_volcluster` | — | ✓ | Writes volume cluster labels (`vno=-1`) |
| [[mri_label2vol]] | ✓ | — | Converts label to binary or multi-label volume |
| [[mris_ca_label]] | ✓ | — | Reads `?h.cortex.label` to constrain parcellation |
| [[mris_anatomical_stats]] | ✓ | — | Uses label to restrict morphometric computation |
| `mris_label2annot` | ✓ | — | Merges multiple labels into an annotation file |
| `mris_thickness` | ✓ | — | Reads cortex label to fill thickness holes |
| [[wiki/tools/freeview|freeview]] | ✓ | ✓ | Load/save labels interactively |
| [[mris_calc]] | ✓ | — | Reads label to restrict arithmetic |
| [[mri_surf2surf]] | ✓ | — | Uses label as smoothing mask |
| `mri_path2label` | — | ✓ | Writes drawn paths as labels |
| `mri_segstats` | ✓ | — | Reads label to mask statistical reporting |
| [[label-cortex]] | — | ✓ | Builds `?h.cortex.label` (cortex minus medial wall / hippo-amyg), with optional gyrus-ambiens recovery |
| [[label2flat]] | ✓ | ✓ | Rewrites a label's coordinates to the 2-D positions of a flattened cortical patch |
| [[label2patch]] | ✓ | — | Rips everything outside a label and writes the surviving sub-mesh as a flatten-able patch |
| [[labels_union]] | ✓ | ✓ | Set **union** of two same-surface labels (by vertex number) |
| [[labels_intersect]] | ✓ | ✓ | Set **intersection** of two labels |
| [[labels_disjoint]] | ✓ | ✓ | Set **difference** (`label1 − label2`) of two labels |
| [[setlabelstat]] | ✓ | ✓ | Overwrites the stat (5th) column of every line with a constant |
| [[bblabel]] | ✓ | ✓ | Clips a label to a rectangular bounding box, keeping only points inside |

## Conversion

### Annotation → individual labels

`mri_annotation2label` splits a [[annotation-format|`.annot`]] file into one `.label` per region:

```bash
mri_annotation2label \
  --subject bert \
  --hemi lh \
  --annotation aparc \
  --outdir $SUBJECTS_DIR/bert/label/
```

This writes `lh.bankssts.label`, `lh.cuneus.label`, etc.

### Individual labels → annotation

`mris_label2annot` merges multiple `.label` files back into a `.annot` file:

```bash
mris_label2annot \
  --s bert \
  --hemi lh \
  --ctab $FREESURFER_HOME/FreeSurferColorLUT.txt \
  --l lh.bankssts.label \
  --l lh.cuneus.label \
  --a custom.annot
```

### Label → volume mask

```bash
mri_label2vol \
  --label lh.BA1_exvivo.label \
  --temp $SUBJECTS_DIR/bert/mri/orig.mgz \
  --regheader $SUBJECTS_DIR/bert/mri/orig.mgz \
  --hemi lh \
  --subject bert \
  --o BA1_mask.mgz
```

### Volume threshold → label

```bash
mri_cor2label \
  --i $SUBJECTS_DIR/bert/mri/aseg.mgz \
  --id 12 \
  --l ./left-putamen.label
```

### Surface overlay threshold → label

```bash
mri_cor2label \
  --i $SUBJECTS_DIR/bert/surf/lh.thickness \
  --surf bert lh \
  --id 1 \
  --thresh 2 \
  --l ./lh.thickness-gt2.label
```

## Reading from Python

```python
import nibabel as nib
import numpy as np

# Read vertex indices only
vertex_indices = nib.freesurfer.io.read_label('lh.cortex.label')
# Returns: numpy array of int, shape (n_points,)

# Read vertex indices and stat values
vertex_indices, stats = nib.freesurfer.io.read_label(
    'lh.BA1_exvivo.label', read_scalars=True
)
# nibabel implementation:
#   np.loadtxt(filepath, dtype=int, skiprows=2, usecols=[0])  # vertex column
#   np.loadtxt(filepath, skiprows=2, usecols=[-1])            # stat column
```

Note: nibabel's `read_label` skips exactly 2 header rows (the comment line and
the point-count line) and reads columns 0 and 4. This is consistent with the
canonical format but will silently misbehave if the file has a non-standard
header (e.g. extra comment lines).

## Gotchas and Caveats

> [!gotcha] Coordinate system is not self-describing for older files
> Files written by legacy tools (or hand-edited) may omit the `vox2ras=`
> token entirely. In that case, `LabelReadFrom()` sets
> `area->coords = LABEL_COORDS_TKREG_RAS` silently. A file without `vox2ras=`
> is assumed to be in Surface RAS by the reader. If the coordinates are
> actually in scanner RAS or voxel CRS, all spatial operations will be
> silently wrong.

> [!gotcha] Vertex ordering is not guaranteed
> The vertex indices in a label do not need to be sorted or contiguous.
> `?h.cortex.label` for a subject processed with `mris_make_surfaces` may
> have indices 0, 1, 2, … simply because the cortex label is built by scanning
> all vertices in order and keeping those marked as cortex. Other labels
> (e.g. BA atlas, cluster labels) list vertices in arbitrary order. Code that
> expects sorted vertex indices, or uses the position in the file as a vertex
> index, will produce incorrect results.

> [!gotcha] The --label vs --annot distinction
> Many tools accept either `--label <file.label>` (a single ROI) or
> `--annot <file.annot>` (a complete parcellation). These are not
> interchangeable. A `.label` file identifies a single set of vertices with no
> colour or region-name metadata. An `.annot` file assigns a colour/label to
> every surface vertex. When a tool expects `--annot` and you pass a `.label`
> file, it will fail or produce garbage without necessarily reporting a
> meaningful error.

> [!gotcha] Deleted points inflate the stored count
> The `n_points` field on line 2 reflects the number of non-deleted points at
> write time. However, the internal `LABEL` struct tracks a `max_points` field
> and an `lv[n].deleted` flag. If a label is modified in memory (points marked
> as deleted) and then written, the file count will be correct. But if a
> program reads `n_points` and allocates arrays of that size, then encounters
> fewer actual data rows than expected, `LabelReadFrom()` will stop reading at
> `n_points` successfully parsed lines — any mismatch causes `nlines < n_points`
> at end-of-file but is not treated as an error if at least one line was read.

> [!gotcha] mri_label2vol requires TkReg RAS; scanner RAS labels need explicit template
> `mri_label2vol` checks `srclabel->coords != LABEL_COORDS_TKREG_RAS` and
> exits with an error if the label is in a different coordinate system, unless
> `--tkr-template` is given. Labels produced from volumes whose tkregister
> matrix differs from the analysis space will produce spatially shifted
> projections if the wrong template is used.

> [!gotcha] LabelRead() path resolution can be surprising
> When called with a `subject_name` argument and a label name without a `/`,
> `LabelRead()` automatically prepends
> `$SUBJECTS_DIR/<subject>/label/` and appends `.label`. If the label name
> already contains a `/`, it is treated as an absolute path. This means
> `mri_cor2label --l ./lh.myroi.label` (with `./`) writes to the current
> directory, but `mri_cor2label --l lh.myroi.label` (without `./`) may try to
> write to `$SUBJECTS_DIR/<subject>/label/lh.myroi.label` instead if a subject
> is set. The workaround is always to include a path separator when targeting
> the current directory.

## Confidence and Gaps

High confidence on the file format — derived from `LabelReadFrom()` and
`LabelWriteInto()` in `utils/label.cpp`, cross-checked against actual
files in `$SUBJECTS_DIR/bert/label/`.

High confidence on the `vno=-1` volume convention — confirmed in
`mri_cor2label/mri_cor2label.cpp` (volume branch) and
`mri_label2vol/mri_label2vol.cpp` (`is_surface_label()` function).

High confidence on the coordinate system constants — confirmed from
`include/mri.h` (`FS_COORDS_*`) and `include/label.h` (`LABEL_COORDS_*`).

> [!gap] Mixed surface/volume point files
> The code does not explicitly prohibit a label file in which some rows have
> `vno >= 0` and others have `vno = -1`. `is_surface_label()` returns false
> as soon as it finds any `vno == -1`, but the reader stores all rows
> regardless. Tool behaviour with such mixed files has not been traced.

> [!gap] Pre-modern label files without vox2ras= token
> Some older FreeSurfer pipelines (pre-~5.x) may have written label files
> without the `vox2ras=` token on the comment line. The parser falls back
> silently to `LABEL_COORDS_TKREG_RAS`. Whether this assumption was correct
> for those older tools has not been verified.
