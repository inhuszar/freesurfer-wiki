---
title: "gtmstats2table"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gtmstats2table"
families: []                     # *2table aggregator (asegstats2table family in spirit)
recon_all_stage: null
related:
  - "[[mri_gtmpvc]]"
  - "[[gtmseg]]"
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
  - "[[mri_glmfit]]"
  - "[[mri_info]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - pet
  - gtm
  - stats
  - table
  - petsurfer
---

# gtmstats2table

## Summary

`gtmstats2table` collects per-region GTM values from a set of
[[mri_gtmpvc]] output directories and assembles them into a single
whitespace-separated table — one row per input directory (subject/run), one
column per GTM ROI — in the same spirit as `asegstats2table` and
`aparcstats2table`. By default it extracts each region's **partial-volume-corrected
uptake** (the GTM regression coefficient, column 7 of each `gtm.stats.dat`); with
`--voxels` or `--volume` it instead reports the region's voxel count or physical
volume in mm³. The resulting table is designed to be fed straight into
[[mri_glmfit]] `--table` for group analysis.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gtmstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table)
- **Binary/script location:** `$FREESURFER_HOME/bin/gtmstats2table`
- **Helper invoked:** [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L64) (only in `--volume` mode, to read the mask voxel volume); otherwise pure `awk`/`bc`.

## Purpose and Context

[[mri_gtmpvc]] performs geometric-transfer-matrix partial-volume correction for a
**single** PET dataset and writes, among other outputs, a per-region statistics
file `gtm.stats.dat`. For a group study you need those per-region values gathered
across all subjects into a tidy subjects × regions matrix. `gtmstats2table` is
that gathering step: point it at every subject's `mri_gtmpvc` output directory and
it concatenates the chosen quantity into one table whose first row is the ROI
names and whose subsequent rows are the inputs (numbered 1, 2, 3, …).

It is the GTM analogue of [[asegstats2table]] / [[aparcstats2table]], and its
output is explicitly intended to be consumed by [[mri_glmfit]] for surface-/ROI-
based group statistics.

## Inputs

### Required Inputs

- **One or more GTM output directories** — each is an `mri_gtmpvc` `--o` output
  folder and must contain `gtm.stats.dat`. Specify them either:
  - repeatedly on the command line with `--gtmdir <dir>` (alias `--g`), or
  - in a text file (one or more dirs, whitespace-separated) passed with
    `--f <file>` ([`scripts/gtmstats2table:109-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L109-L120)).
- **An output path** — `--o <outputtable>`.

For `--volume` mode, each directory must additionally contain
`aux/mask.nii.gz`, whose voxel volume is read with [[mri_info]]
([`scripts/gtmstats2table:62-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L62-L69)).

### Input Assumptions

> [!assumption] Every gtmdir holds a `gtm.stats.dat` with the same ROI set in the same order
> The script reads the ROI **names from the first directory only** (column 3 of
> its `gtm.stats.dat`, [`scripts/gtmstats2table:47-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L47-L48)) and then reads
> only the numeric value column from every directory. It assumes all inputs were
> produced with the **same segmentation** (e.g. the same [[gtmseg]] colour
> table), so that the regions line up column-for-column. There is **no check**
> that the ROI lists actually match across inputs — a mismatch silently produces
> a misaligned table. `check_params` only verifies that each `gtm.stats.dat`
> exists ([`scripts/gtmstats2table:160-166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L160-L166)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<outputtable>` | the `--o` path you give | Whitespace-separated table. **Row 1:** `GTM <roi1> <roi2> …` (literal token `GTM` followed by the ROI names). **Rows 2…N+1:** `<n> <val1> <val2> …`, where `n` is the 1-based input order number and the values are the chosen quantity for each ROI. |

The parent directory of the output is created if needed
([`scripts/gtmstats2table:39-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L39-L43)); any existing output file is removed first
([`scripts/gtmstats2table:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L46)).

### Output Specifications

The table is plain text. The **first column is an integer index** (input order),
*not* a subject name — you must keep track of the input→subject mapping yourself
(e.g. by the order of your `--gtmdir`/`--f` list). The header row begins with the
literal `GTM`. This layout matches what [[mri_glmfit]] `--table` expects.

## Mathematical Foundations

The tool is a text extractor; the only arithmetic is in `--volume` mode.

> [!math] The three measures
> Let the source be column *c* of each `gtm.stats.dat` row. The columns are
> written by `mri_gtmpvc` (function `WriteVRFStats`,
> [`utils/gtm.cpp:797-836`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gtm.cpp#L797-L836)) as
> `n  segid  name  tissue-type  nvox  vrf  [beta]  [stddev]`. Hence:
> - **`--uptake`** (default): $v_i = \beta_i$, the **column-7** GTM regression
>   coefficient — the PVC-corrected mean activity in region $i$
>   ([`scripts/gtmstats2table:55-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L55-L57)).
> - **`--voxels`**: $v_i = N_i$, the **column-5** voxel count
>   ([`scripts/gtmstats2table:58-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L58-L60)).
> - **`--volume`**: $v_i = N_i \cdot \mathrm{voxvol}$, the voxel count times the
>   per-voxel volume (mm³) of `aux/mask.nii.gz`, computed with `bc`
>   ([`scripts/gtmstats2table:61-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L61-L75)).

> [!internal] The values themselves come from the GTM solve
> Column 7 (`beta`) is the solution of the GTM linear system
> $y = \mathrm{GTM}\,\beta$ computed inside [[mri_gtmpvc]] (see
> [`utils/gtm.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gtm.cpp)). `gtmstats2table` does no
> kinetic modelling or correction of its own — it only transcribes.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser
([`scripts/gtmstats2table:96-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L96-L144)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Output table path. |
| `--gtmdir`<br>`--g` | string (repeatable) | *(≥1 required)* | An `mri_gtmpvc` output directory containing `gtm.stats.dat`. Repeat for multiple inputs. |
| `--f` | string | — | Text file listing gtmdirs (whitespace-separated); its contents are appended to the directory list. |
| `--uptake` | bool | **on** | Report the PVC-corrected uptake (GTM coefficient, column 7). The default. |
| `--voxels` | bool | off | Report the number of voxels in each ROI (column 5) instead of uptake. |
| `--volume` | bool | off | Report each ROI's physical volume in mm³ (voxels × voxel volume from `aux/mask.nii.gz`). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` / `--version` | bool | — | Print help / version and exit. |

### Configuration Interactions

> [!gotcha] The measure flags are last-one-wins, not exclusive
> `--uptake`, `--voxels`, and `--volume` all assign the single variable `meas`
> ([`scripts/gtmstats2table:122-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L122-L130)). They are not flagged as mutually
> exclusive; if you pass more than one, the **last** on the command line takes
> effect. There is no way to emit more than one measure in a single run.

Other interactions:

- `--gtmdir`/`--g` and `--f` are **additive**: directories from both sources are
  concatenated into one list, in command-line order, then file order.
- `--volume` is the only mode that touches the filesystem beyond `gtm.stats.dat`
  (it needs `aux/mask.nii.gz`); `--uptake` and `--voxels` read only
  `gtm.stats.dat`.

## Typical Use Cases

### 1. Build an uptake table for a group (command-line list)

```bash
gtmstats2table --o gtm.uptake.table \
  --gtmdir cumi001/gtm.psf04 \
  --gtmdir cumi002/gtm.psf04 \
  --gtmdir cumi003/gtm.psf04
```

Row 1 is `GTM <roi names…>`; rows 2–4 are the three subjects' PVC uptakes.

### 2. Build the same table from a list file

```bash
echo cumi001/gtm.psf04 cumi002/gtm.psf04 cumi003/gtm.psf04 > gtmdirs.txt
gtmstats2table --o gtm.uptake.table --f gtmdirs.txt
```

### 3. Report ROI volumes instead of uptake

```bash
# Needs aux/mask.nii.gz in each gtmdir; values are in mm^3.
gtmstats2table --o gtm.volume.table --volume --f gtmdirs.txt
```

### 4. Feed the table to mri_glmfit

```bash
# One-sample group mean (OSGM) across the collected uptakes.
mri_glmfit --table gtm.uptake.table --osgm --o glm.gtm.uptake
```

## Pipeline Context

`gtmstats2table` sits at the **group-aggregation** end of the PETsurfer workflow.

**Predecessor:** [[mri_gtmpvc]] (run once per PET dataset, each producing a
`gtm.stats.dat`) → **gtmstats2table** (gather across datasets) →
**Successor:** [[mri_glmfit]] (group GLM on the table).

Upstream of `mri_gtmpvc` are [[gtmseg]] (the segmentation) and a finished
[[wiki/pipelines/recon-all|recon-all]]. `gtmstats2table` is **not** part of
`recon-all` and is run by hand once all subjects have been PVC-corrected.

**Predecessor:** [[mri_gtmpvc]] → **This tool** → **Successor:** [[mri_glmfit]]

## Gotchas and Caveats

> [!gotcha] First column is an index, not a subject name
> Downstream you must remember which input was 1, 2, 3, … — the table carries no
> subject identifiers ([`scripts/gtmstats2table:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L77)). Keep your
> `--gtmdir`/`--f` ordering stable.

> [!gotcha] ROI names taken from the first gtmdir only
> The header is built from `gtmdir[1]` ([`scripts/gtmstats2table:47-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L47-L49)).
> If a later input used a different segmentation (different ROI set/order), the
> columns will be mislabelled with no warning. Use a single, shared [[gtmseg]]
> segmentation for the whole group.

> [!gotcha] `--volume` requires `aux/mask.nii.gz`
> Without it, the `mri_info --voxvol` call fails and the script exits
> ([`scripts/gtmstats2table:63-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L63-L67)). The mask is a standard `mri_gtmpvc`
> auxiliary output, so this only bites if the gtmdir is incomplete.

> [!gotcha] Uptake is the GTM coefficient, not raw PET intensity
> The reported "uptake" is the **partial-volume-corrected** regional value (the
> `beta` from the GTM solve), not the uncorrected mean of the input PET. Units
> follow whatever the input PET carried (e.g. SUVR if the PET was SUVR-scaled).

## Error Compensation and Guard Rails

- **Existence checks only.** `check_params` requires `--o`, requires at least one
  gtmdir, and verifies each `gtm.stats.dat` exists; otherwise it exits with an
  error ([`scripts/gtmstats2table:150-166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L150-L166)). There is **no** validation
  that ROI lists agree across inputs.
- **Clobbers the output.** An existing output file is deleted before writing
  ([`scripts/gtmstats2table:46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L46)).
- **Fail-fast in `--volume`.** A non-zero `mri_info` status aborts the run
  ([`scripts/gtmstats2table:66-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L66-L67)).

## Related Tools

- [[mri_gtmpvc]] — produces the per-dataset `gtm.stats.dat` that this tool reads.
- [[gtmseg]] — builds the segmentation whose ROIs become the table columns.
- [[asegstats2table]] / [[aparcstats2table]] — the analogous aggregators for `aseg`/`aparc` stats; same output style.
- [[mri_glmfit]] — the intended consumer of the table (`--table`).
- [[mri_info]] — used only in `--volume` mode to read the mask voxel volume.

## Confidence and Gaps

**High confidence:** the full flag set, the additive `--gtmdir`/`--f` behaviour,
the last-one-wins measure selection, and the exact source columns (3 = name,
5 = nvox, 7 = uptake/beta) — the latter cross-checked against the `mri_gtmpvc`
writer `WriteVRFStats` ([`utils/gtm.cpp:797-836`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gtm.cpp#L797-L836)).

## References

- FreeSurfer source: [`scripts/gtmstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table) (v8.2.0).
- Built-in help: `gtmstats2table --help` (the `BEGINHELP` block, [`scripts/gtmstats2table:198-228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gtmstats2table#L198-L228)).
- Column source: `WriteVRFStats` in [`utils/gtm.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/gtm.cpp).
- PETsurfer documentation: https://surfer.nmr.mgh.harvard.edu/fswiki/PetSurfer
