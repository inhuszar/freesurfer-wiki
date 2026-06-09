---
title: "table2map"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/table2map"
families: []                     # standalone table→volume/overlay mapper
recon_all_stage: null
related:
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
  - "[[mri_segstats]]"
  - "[[make-segvol-table]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Label-name matching depends on the surfa library's lookup.search() and a hard-coded set of name-mangling heuristics; some parcellation naming conventions may still miss and only emit a warning."
tags:
  - segmentation
  - parcellation
  - statistics
  - visualization
  - surfa
---

# table2map

## Summary

`table2map` paints a **per-structure value table back onto an image**. Given a
stats table whose rows are structure names and whose columns are measurements
(e.g. the output of [[asegstats2table]] or [[aparcstats2table]]), it looks up
each structure's label index in a colour lookup table, finds the voxels (or
surface vertices) carrying that index in a supplied **segmentation** (`--seg`) or
**parcellation overlay** (`--parc`), and writes each selected location's value
into an output map. The result is a volume (or surface overlay) with one frame
per selected table column — the inverse of building a stats table.

## Source Information

- **Language:** Python 3 (uses [`surfa`](https://github.com/freesurfer/surfa) and NumPy)
- **Source file:** [`scripts/table2map`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map)
- **Binary/script location:** `$FREESURFER_HOME/bin/table2map`
- **Key library:** `surfa` (`sf.load_volume`, `sf.load_overlay`, `sf.load_label_lookup`)

## Purpose and Context

A FreeSurfer group analysis usually ends with a **table** (subjects/structures ×
measurements). To *see* a per-structure result anatomically — say, to colour
each cortical region by its mean thickness or its group t-statistic —
that table has to be rendered back into image space. `table2map` does this:
for every (structure, value) pair it fills the corresponding region of a
segmentation/parcellation with the value, producing a map you can load in
[[wiki/tools/freeview|freeview]].

It is the natural **inverse** of the `*stats2table` tools
([[asegstats2table]], [[aparcstats2table]]) and of [[make-segvol-table]]: those
flatten a segmentation into a table; `table2map` re-expands a table into an
image. It is a **standalone** visualisation/utility script, not part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **Input table** (`-t`/`--table`) — whitespace-delimited text. Row 0 is the
  header; column 0 of each row is the structure name, the remaining columns are
  numeric values ([`scripts/table2map#L31-L50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L31-L50)). This is exactly the layout the
  FreeSurfer `*stats2table` tools emit.
- **Output map** (`-o`/`--out`) — path for the resulting volume/overlay.
- **Exactly one of:**
  - **`-s`/`--seg`** — a label **volume** to map onto (e.g. `aseg.mgz`,
    [[mri_aparc2aseg|aparc+aseg.mgz]]); loaded with `sf.load_volume`.
  - **`-p`/`--parc`** — a surface **parcellation overlay** to map onto; loaded
    with `sf.load_overlay`.

### Input Assumptions

> [!assumption] Table rows name structures that exist in the lookup table
> Each table row's first token must be a structure **name** resolvable to a label
> index in the active lookup table (see [Label matching](#mathematical-foundations)).
> For a `--seg`, the default lookup is `$FREESURFER_HOME/FreeSurferColorLUT.txt`
> ([`scripts/table2map#L106-L108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L106-L108)); for a `--parc`, the labels embedded in
> the overlay are used ([`#L109-L110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L109-L110)). Unmatched names are skipped with a
> warning, not an error ([`#L119-L122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L119-L122)).

> [!assumption] Seg/parc and table share the same labelling scheme
> The segmentation or parcellation must use the same label-naming convention as
> the table headers, otherwise the name→index search fails for those rows.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<out>` (`-o`) | [[mgz]] / [[nifti]] (volume, with `--seg`) or surface overlay (with `--parc`) | The value map: each structure's voxels/vertices set to that structure's table values; everything else `0`. |

### Output Specifications

The output has **one frame per selected table column**
([`scripts/table2map#L96-L101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L96-L101)):

- With `--seg`: shape `(*seg.shape, n_columns)` — a multi-frame volume on the
  segmentation grid (geometry inherited from the input segmentation via
  `input_seg.new(...)`).
- With `--parc`: shape `(n_vertices, n_columns)` — a multi-frame surface overlay.

Initialised to zeros; for each matched structure, every voxel/vertex equal to its
label index is assigned that structure's value vector
([`scripts/table2map#L124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L124)). Frame *k* corresponds to the *k*-th selected
column.

## Mathematical Foundations

There is no numerical modelling — the operation is a **name→index→mask
assignment**. The only non-trivial logic is robust label-name matching:

> [!math] Label-name resolution (`find_label_index`)
> For a structure name, the script tries, in order
> ([`scripts/table2map#L57-L92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L57-L92)):
> 1. exact match via `labels.search(name, exact=True)`;
> 2. exact match after stripping common metric suffixes appended by
>    `*stats2table` — `_area`, `_volume`, `_thickness`, `_thicknessstd`,
>    `_thickness.T1`, `_meancurv`, `_gauscurv`, `_foldind`, `_curvind`;
> 3. cortical-name reconstruction: for `lh`/`rh`, rewrite `"<hemi>_..."` into
>    `"ctx_<hemi>_..."`, `"ctx-<hemi>-..."`, or the bare suffix, and search each.
>
> If none match, the row is skipped with a warning. The assignment itself is
> `map_image[input_seg == index] = values` — a boolean-mask write.

> [!internal] Image/overlay/LUT I/O is in `surfa`
> Loading volumes/overlays and lookup tables, the `== index` masking, and saving
> are all handled by the `surfa` library, not this script.

## Configuration Options

### Complete Flag Reference

All options are from the `argparse` setup
([`scripts/table2map#L11-L18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L11-L18)). Source `--help` matches exactly.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-t`<br>`--table` | string (file) | *(required)* | Input value table (header row + `name value…` rows). |
| `-o`<br>`--out` | string (file) | *(required)* | Output map path (volume for `--seg`, overlay for `--parc`). |
| `-s`<br>`--seg` | string (file) | — | Segmentation **volume** to map onto. Mutually exclusive with `--parc`. |
| `-p`<br>`--parc` | string (file) | — | Surface **parcellation overlay** to map onto. Mutually exclusive with `--seg`. |
| `-c`<br>`--columns` | string list | all columns | Restrict to these named table columns (and hence output frames). Each must exist in the header. |
| `-l`<br>`--lut` | string (file) | `FreeSurferColorLUT.txt` (seg) / overlay labels (parc) | Alternative label lookup table for name→index resolution. |
| `-h`<br>`--help` | bool | — | Print usage and exit. |

### Configuration Interactions

> [!gotcha] `--seg` and `--parc` are mutually exclusive and exactly one is required
> Supplying **both** aborts with "Must provide only one of --seg or --parc
> input"; supplying **neither** aborts with "Must provide either --seg or --parc
> input" ([`scripts/table2map#L21-L25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L21-L25)). They also select the output type
> (volume vs. surface overlay) and the default lookup source.

> [!gotcha] `--lut` only applies in the `--seg` path's default; `--parc` uses overlay labels
> When `--lut` is given it is always honoured. But the **default** differs by
> mode: `--seg` defaults to `FreeSurferColorLUT.txt`, while `--parc` defaults to
> the labels carried inside the overlay ([`scripts/table2map#L104-L110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L104-L110)). Pass
> `--lut` explicitly if your parcellation's embedded labels do not match the
> table names.

> [!gotcha] Some rows are dropped on purpose
> `eTIV` and `BrainSegVolNotVent` rows are removed unconditionally
> ([`scripts/table2map#L52-L55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L52-L55)), and any row whose name contains `SurfArea`
> is skipped in the mapping loop ([`#L115-L117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L115-L117)). These are whole-brain or
> non-structural metrics that have no single region to paint.

- `--columns` filters which columns become output frames; column order in the
  output follows the order you list them (or the header order if omitted).

## Typical Use Cases

### 1. Paint aseg volumes onto a segmentation

```bash
# asegstats2table output → a volume coloured by each structure's value
table2map --table aseg.volume.table \
  --seg $SUBJECTS_DIR/bert/mri/aseg.mgz \
  --out aseg_volume_map.mgz
freeview -v aseg_volume_map.mgz
```

### 2. Paint a single thickness column onto a cortical parcellation overlay

```bash
table2map --table lh.aparc.thickness.table \
  --parc $SUBJECTS_DIR/bert/label/lh.aparc.annot \
  --columns bert_thickness \
  --out lh.thickness_map.mgz
```

### 3. Visualise a group statistic with a custom LUT

```bash
table2map --table group_tstat.table \
  --seg aparc+aseg.mgz --lut my_custom_LUT.txt \
  --out group_tstat_map.mgz
```

## Pipeline Context

`table2map` is a **standalone** visualisation utility; it is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** a stats table from [[asegstats2table]] / [[aparcstats2table]]
(themselves fed by [[mri_segstats]] / `aparcstats`), or
[[make-segvol-table]] → **table2map** (plus a matching `--seg`/`--parc`) →
**Successor:** [[wiki/tools/freeview|freeview]] for display.

**Inverse direction:**
[[asegstats2table]]/[[aparcstats2table]] (image → table) ⟷ **table2map**
(table → image).

## Gotchas and Caveats

> [!gotcha] Unmatched structure names warn, they do not stop the run
> If a row's name cannot be resolved to a label index, the script prints
> `warning: <name> does not exist in lookup table.` and continues
> ([`scripts/table2map#L119-L122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L119-L122)). A typo or a mismatched LUT can therefore
> yield a near-empty map with no error — check the warnings.

> [!gotcha] Output frame order follows column selection, not the table file order, when `--columns` is used
> The output frame for value column *k* is the *k*-th entry of the resolved
> `columns` list ([`scripts/table2map#L43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L43), [`#L96-L101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L96-L101)). Track which frame is
> which by the `--columns` order you pass.

> [!gotcha] Cortical name matching is heuristic
> The `ctx_`/`ctx-` reconstruction handles common aparc naming, but the source
> comment itself calls cross-parcellation naming "a complete mess"
> ([`scripts/table2map#L77-L78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L77-L78)). Unusual parcellations may need an explicit
> `--lut` whose names match the table headers.

## Error Compensation and Guard Rails

- **Mutual-exclusion / presence checks** on `--seg`/`--parc`
  ([`scripts/table2map#L21-L25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L21-L25)).
- **Column validation:** a `--columns` name not in the header is a fatal error
  ([`#L40-L42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L40-L42)).
- **Suffix-stripping and `ctx` reconstruction** automatically reconcile the
  metric-decorated names that `*stats2table` produces with the bare LUT names
  ([`#L64-L92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L64-L92)) — a form of input compensation.
- **Non-structural rows** (`eTIV`, `BrainSegVolNotVent`, `*SurfArea*`) are dropped
  so they do not corrupt the map ([`#L52-L55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L52-L55), [`#L115-L117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map#L115-L117)).

## Related Tools

- [[asegstats2table]] — builds the subcortical value tables this tool inverts (image → table).
- [[aparcstats2table]] — builds the cortical-parcellation value tables (image → table).
- [[mri_segstats]] — generates the per-subject `*.stats` summaries consumed by the `*stats2table` tools.
- [[make-segvol-table]] — another table builder (subcortical volumes); its conceptual inverse is also `table2map`.
- [[color-lut]] — the structure-name ↔ index lookup tables that drive `find_label_index`.
- [[wiki/tools/freeview|freeview]] — typical viewer for the resulting map.

## Confidence and Gaps

**High confidence:** complete flag set (matches `--help` exactly), the
seg/parc mutual exclusion, the multi-frame output shape, the dropped-row rules,
and the name-resolution cascade — read directly from
[`scripts/table2map`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map).

> [!gap] Robustness of name matching across parcellations
> `find_label_index` covers exact names, `*stats2table` suffixes, and common
> `lh/rh` cortical rewrites, but the source acknowledges naming inconsistency
> across parcellations. Some schemes may still miss and only emit a warning; the
> exact set of failure cases was not enumerated against real tables.

## References

- FreeSurfer source: [`scripts/table2map`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/table2map) (v8.2.0).
- Built-in help: `table2map --help`.
- `surfa` library: <https://github.com/freesurfer/surfa>.
