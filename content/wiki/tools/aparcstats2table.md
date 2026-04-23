---
title: "aparcstats2table"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/aparcstats2table"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[stats-format]]"
  - "[[parcellation-schemes]]"
  - "[[asegstats2table]]"
  - "[[mri_segstats]]"
  - "[[fsgd-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Behaviour of --etiv when eTIV is absent from the stats file (bare except clause silently exits)"
  - "Effect of --scale on the eTIV and BrainSegVolNotVent columns that bypass hemi/measure decoration"
tags:
  - statistics
  - table
  - parcellation
---

# aparcstats2table

## Summary

`aparcstats2table` reads per-subject cortical parcellation stats files
(`?h.aparc.stats` or equivalent) for a list of subjects and assembles them
into a single cross-subject table. Each row represents one subject and each
column represents one parcellation region; values are a single morphometric
measure (surface area by default). The output is a plain-text, delimiter-separated
matrix ready for import into statistical software (R, Python, SPSS, etc.).

## Source Information

- **Language:** Python 3
- **Source file:** `scripts/aparcstats2table` (452 lines)
- **Authors:** Douglas Greve (original), Krish Subramaniam (rewrite), MGH
- **Parser library:** `fsbindings.legacy.AparcStatsParser`
  (`python/fsbindings/legacy.py`)
- **Script location:** `$FREESURFER_HOME/bin/aparcstats2table`

## Purpose and Context

After [[recon-all]] completes, each subject has per-hemisphere stats files
produced by [[mris_anatomical_stats]] (`lh.aparc.stats`, `rh.aparc.stats`,
`lh.aparc.a2009s.stats`, etc.) that contain morphometric measures for every
cortical parcellation region. These files are well-suited for single-subject
inspection but are not directly usable for group-level analysis.

`aparcstats2table` solves this by iterating over a list of subjects,
reading the appropriate `.stats` file for each, and stacking the results
into a subjects × parcellations matrix. The result is consumed by
general-purpose statistical packages for ANOVA, regression, or
machine-learning analyses on cortical morphometry.

`aparcstats2table` is not called by `recon-all`; it is a post-processing
utility run after all subjects have been processed.

## Inputs

### Required Inputs

1. **A subject list** — specified by one of the mutually exclusive methods
   described below. Each subject name must correspond to a subdirectory of
   `$SUBJECTS_DIR`.

2. **The cortical stats file** — the script constructs the path automatically
   as:
   ```
   $SUBJECTS_DIR/<subject>/stats/<hemi>.<parc>.stats
   ```
   The file must be a valid [[stats-format]] cortical stats file produced by
   [[mris_anatomical_stats]].

### Input Assumptions

> [!assumption] `$SUBJECTS_DIR` must be set
> The script calls `fsutils.check_subjdirs()`, which reads `$SUBJECTS_DIR` from
> the environment. If this variable is not set, the script exits with an error.
> Subjects are located under `$SUBJECTS_DIR/<subject>/stats/`.

> [!assumption] Input file must exist and be non-empty
> `AparcStatsParser.__init__()` raises `BadFileError` if the file does not exist
> or has fewer than 10 bytes. With `--skip`, the subject is silently omitted;
> without `--skip`, the script exits with a non-zero code.

> [!assumption] All subjects must have the same set of parcellations by default
> The parser collects the **union** of all parcellations across all subjects.
> Missing parcellations for any subject are filled with `0.0`. If you want
> only parcellations present in every subject, use `--common-parcs`.

## Outputs

### Files Created

A single plain-text table file at the path specified by `-t`/`--tablefile`.

**Table structure (default orientation):**
- Row 0 (header): the first cell contains `<hemi>.<parc>.<meas>` (e.g.,
  `lh.aparc.area`); remaining cells contain column titles of the form
  `<hemi>_<parcname>_<meas>` (e.g., `lh_bankssts_area`).
- Rows 1…N: each subject, with the subject name in the first column and
  measure values in subsequent columns.

**Column title decoration** is controlled by `--parcid-only`:
- Default: `lh_<parcname>_<meas>` (hemisphere prefix and measure suffix added
  by `TableWriter.decorate_col_titles`).
- `--parcid-only`: just `<parcname>` with no prefix/suffix.

**Special columns always appended (regardless of `--parcid-only`):**
- `eTIV` — parsed from the `# Measure EstimatedTotalIntraCranialVol` header
  line of each stats file, not from the data block. Always present unless
  absent from the input file.
- `BrainSegVolNotVent` — parsed from `# Measure BrainSegNotVent` header line.
- `WhiteSurfArea` (when `--meas area`) — parsed from `# Measure Cortex,
  WhiteSurfArea` header line.
- `MeanThickness` (when `--meas thickness`) — parsed from `# Measure Cortex,
  MeanThickness` header line.

> [!gotcha] `eTIV` and `BrainSegVolNotVent` bypass column decoration
> `TableWriter.write()` contains an explicit special case: when the column name
> is `eTIV` or `BrainSegVolNotVent` and the prefix is `lh_` or `rh_`, the
> decoration is skipped and the column is written as just `eTIV` or
> `BrainSegVolNotVent`. This prevents them from appearing as `lh_eTIV_area`,
> which would be nonsensical.

**Delimiter:** controlled by `--delimiter` (default tab). Output values are
written as `%s` representations of Python floats; the `--transpose` flag swaps
rows and columns.

**Append mode:** when `--append` is set and the output file already exists, the
script opens it in append mode and writes a blank line followed by the new table.

## Mathematical Foundations

`aparcstats2table` performs no mathematical computation itself. It is a
data-reorganization tool. The mathematical content is in the `.stats` files it
reads; see [[stats-format]] and [[mris_anatomical_stats]] for the definitions
of each measure.

**Column index mapping** (from `AparcStatsParser.measure_column_map` in
`fsbindings/legacy.py`):

| Measure value | Column in `.stats` data block | Units |
|---------------|-------------------------------|-------|
| `area` (default) | 2 (`SurfArea`) | mm² |
| `volume` | 3 (`GrayVol`) | mm³ |
| `thickness` | 4 (`ThickAvg`) | mm |
| `thickness.T1` | 4 (`ThickAvg`) | mm |
| `thicknessstd` | 5 (`ThickStd`) | mm |
| `meancurv` | 6 (`MeanCurv`) | mm⁻¹ |
| `gauscurv` | 7 (`GausCurv`) | mm⁻² |
| `foldind` | 8 (`FoldInd`) | unitless |
| `curvind` | 9 (`CurvInd`) | unitless |

Columns are 0-indexed in the code; the data block is split on whitespace and
the column numbers above refer to 0-based list indices of the non-comment lines.

**eTIV scaling** (`--etiv` flag): when requested, the script divides every cell
value (except `lhSurfaceHoles`, `rhSurfaceHoles`, `SurfaceHoles`,
`BrainSegVol-to-eTIV`, `MaskVol-to-eTIV`) by the subject's `eTIV` value and
multiplies by 100, expressing volumes as a percentage of estimated total
intracranial volume. This is identical to the eTIV normalization in
[[asegstats2table]].

**Scaling** (`--scale`): a multiplicative scalar applied to all table values
after any eTIV normalization. Applied as `table[row][col] *= scale`.

## Configuration Options

### Subject / Input Specification (mutually exclusive — exactly one required)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subjects sub1 sub2 ...` | string list | — | Variadic list of subject names (all after the flag until the next flag). Uses `fsutils.callback_var`. |
| `-s subjectname` | string (repeatable) | — | Specify subjects one at a time; can be repeated. Appends to the subjects list. |
| `--subjectsfile <file>` | path | — | Text file with one subject name per line. |
| `--qdec <file>` | path | — | QDEC table (CSV); reads the `fsid` column, skipping lines beginning with `#`. |
| `--qdec-long <file>` | path | — | Longitudinal QDEC table; reads `fsid` and `fsid-base`, constructs names of the form `<fsid>.long.<fsid-base>`. |
| `--fsgd <file>` | path | — | [[fsgd-format\|FSGD]] group descriptor file; extracts subject names from `INPUT` lines. |

### Required Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--hemi` | `lh` or `rh` | none (required) | Hemisphere. Used to construct the stats file path (`lh.<parc>.stats` or `rh.<parc>.stats`) and as the column title prefix. |
| `-t FILE` / `--tablefile FILE` | path | none (required) | Output file path for the assembled table. |

### Parcellation and Measure Selection

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--parc <name>` / `-p` | `-p` | string | `aparc` | Parcellation name. Determines which stats file is read: `<hemi>.<parc>.stats`. Common alternatives: `aparc.a2009s` (Destrieux), `aparc.DKTatlas`. Any annotation name for which a corresponding `.stats` file exists is accepted. |
| `--measure <meas>` / `-m` | `-m` | enum | `area` | Measure to extract. Valid: `area`, `volume`, `thickness`, `thickness.T1`, `thicknessstd`, `meancurv`, `gauscurv`, `foldind`, `curvind`. |

### Parcellation Filtering

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--common-parcs` | bool | off | Write only parcellations present in **all** subjects (intersection). Default writes the union; missing parcellations get `0.0`. |
| `--parcs-from-file <file>` | path | none | Read a list of parcellation names (one per line) and output only those parcellations in that order. Takes precedence over `--common-parcs`. |

### Output Formatting

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--delimiter <name>` / `-d` | `-d` | enum | `tab` | Column separator. Valid: `tab`, `space`, `comma`, `semicolon`. |
| `--parcid-only` | — | bool | off | Suppress hemisphere prefix and measure suffix from column headers. Writes bare parcellation names. `eTIV` and `BrainSegVolNotVent` are never decorated regardless. |
| `--transpose` | — | bool | off | Transpose the output: rows become parcellations, columns become subjects. |
| `--append` | — | bool | off | Append to an existing output file (adds a blank line before the new table) rather than overwriting. |

### Behaviour Modifiers

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--skip` | — | bool | off | If a stats file cannot be found or is too small (`BadFileError`), skip that subject and continue. Default: exit with error. |
| `--etiv` | — | bool | off | Normalize all values to percentage of eTIV. Reads `eTIV` from the `# Measure EstimatedTotalIntraCranialVol` header line. |
| `--scale <float>` | — | float | 1.0 | Multiply all output values by this scalar after any eTIV normalization. |
| `--report-rois` | — | bool | off | **Deprecated** (prints a warning). Formerly reported per-subject ROI differences; the `-v` flag is now preferred. |
| `-v` / `--debug` | — | bool | off | Enable DEBUG-level logging from `aparclogger`. Prints per-file processing details. |

### Configuration Interactions

> [!gotcha] Subject specification flags are mutually exclusive
> Exactly one of `--subjects`, `-s`, `--subjectsfile`, `--qdec`,
> `--qdec-long`, or `--fsgd` may be specified. If more than one is given,
> the script exits with an error. `--subjects` and repeated `-s` flags
> accumulate into the **same** list (`dest='subjects'`), so mixing `-s` with
> `--subjects` on the same command line is valid and both are counted as a
> single input method.

> [!gotcha] `--common-parcs` and --parcs-from-file are not mutually exclusive in the code but interact
> If both `--common-parcs` and `--parcs-from-file` are given, `--parcs-from-file`
> takes effect first (restricting the parsed parcellations), and then
> `--common-parcs` further restricts to the intersection of those. In practice,
> specifying both is unusual and the interaction may produce unexpected results.

> [!gotcha] `--etiv` silently skips surface-related columns
> When `--etiv` is active, the code skips `lhSurfaceHoles`, `rhSurfaceHoles`,
> `SurfaceHoles`, `BrainSegVol-to-eTIV`, and `MaskVol-to-eTIV` to avoid
> dividing dimensionless ratios and counts by eTIV. All other columns —
> including non-volume measures like `thickness` or `meancurv` — are divided
> by eTIV, which is semantically incorrect for measures that are not volumes.
> Use `--etiv` only when `--meas area` or `--meas volume` is selected.

> [!gotcha] `--scale` is applied after `--etiv`
> If both `--etiv` and `--scale` are specified, all values are first normalized
> to percent-eTIV and then multiplied by the scale factor.

> [!gotcha] --append does not validate table compatibility
> When appending, no check is made that the new table has the same columns as
> the existing file. Appending tables with different parcellations or measures
> produces a malformed file that most parsers will reject.

## Typical Use Cases

### Extract cortical thickness for all subjects (left hemisphere, Desikan atlas)

```bash
aparcstats2table \
  --subjects sub-01 sub-02 sub-03 sub-04 \
  --hemi lh \
  --meas thickness \
  --tablefile lh_aparc_thickness.txt
```

The output `lh_aparc_thickness.txt` has one row per subject and one column
per parcellation region, with values in mm. Two additional columns
(`MeanThickness` and `eTIV`) are appended from the `# Measure` header block.

### Extract surface area using the Destrieux atlas (right hemisphere)

```bash
aparcstats2table \
  --subjects sub-01 sub-02 sub-03 \
  --hemi rh \
  --parc aparc.a2009s \
  --meas area \
  --tablefile rh_a2009s_area.txt
```

### Read subjects from a text file, output comma-delimited

```bash
aparcstats2table \
  --subjectsfile /path/to/subjects.txt \
  --hemi lh \
  --meas volume \
  --delimiter comma \
  --tablefile lh_aparc_volume.csv
```

`subjects.txt` should contain one subject name per line (no spaces in names).

### Use with a QDEC table

```bash
aparcstats2table \
  --qdec group.qdec.table.dat \
  --hemi lh \
  --meas thickness \
  --tablefile lh_thickness.txt
```

The QDEC file must have a column header row with a field named `fsid`.

### Extract only a subset of parcellations in a specific order

```bash
# Create a file listing desired parcellations:
echo -e "superiorfrontal\nmiddlefrontal\ninferiorfrontal" > frontal_parcs.txt

aparcstats2table \
  --subjects sub-01 sub-02 sub-03 \
  --hemi lh \
  --meas thickness \
  --parcs-from-file frontal_parcs.txt \
  --tablefile lh_frontal_thickness.txt
```

### Skip subjects with missing stats files

```bash
aparcstats2table \
  --subjects sub-01 sub-02 sub-03_missing \
  --hemi lh \
  --meas area \
  --skip \
  --tablefile lh_area.txt
```

`sub-03_missing` will be omitted from the output without causing an error.

### Normalize by eTIV (appropriate only for area and volume measures)

```bash
aparcstats2table \
  --subjects sub-01 sub-02 sub-03 \
  --hemi lh \
  --meas area \
  --etiv \
  --tablefile lh_area_pct_etiv.txt
```

### Transpose the table (useful when subjects are few, regions many)

```bash
aparcstats2table \
  --subjects sub-01 sub-02 \
  --hemi lh \
  --meas thickness \
  --transpose \
  --tablefile lh_thickness_transposed.txt
```

## Pipeline Context

`aparcstats2table` is not part of the [[recon-all]] pipeline. It is a
post-processing tool intended for group-level analysis.

**Prerequisite outputs** (produced by `recon-all`):
- `$SUBJECTS_DIR/<subject>/stats/lh.aparc.stats` — produced by
  [[mris_anatomical_stats]] in the `autorecon3` stage
- `$SUBJECTS_DIR/<subject>/stats/rh.aparc.stats` — same

**Typical usage pattern:**
1. Run `recon-all` to completion for all subjects.
2. Verify stats files exist for all subjects.
3. Run `aparcstats2table` to generate the cross-subject table.
4. Import the table into R, Python (pandas), or SPSS for group analysis.

The complementary tool for subcortical segmentation data is
[[asegstats2table]], which reads `aseg.stats` instead of `?h.aparc.stats`.

## Gotchas and Caveats

> [!gotcha] Missing parcellations are filled with 0.0, not NaN
> If a subject is missing a parcellation (e.g., a very small region not
> detected), the cell value is set to `0.0` by `make_table2d()`. This
> can bias group statistics. Use `--common-parcs` if you want to restrict
> to parcellations present in every subject, or examine the data for zero
> values before analysis.

> [!gotcha] `--report-rois` is deprecated
> This flag prints a warning message (`WARNING: --report-rois deprecated.
> Use -v instead`) and does nothing else. It was formerly used to report
> per-subject ROI presence/absence differences. The functionality is now
> available via the `-v`/`--debug` logging flag.

> [!gotcha] `--hemi` is required and must match the stats file
> The flag has no default and the script exits if omitted. The chosen
> hemisphere is both used to locate the file and to prefix column titles.
> There is no batch mode that processes both hemispheres in a single call;
> run the tool twice (once per hemisphere) if both are needed.

> [!gotcha] Column values in the header row reflect the `--parcid-only` setting
> Without `--parcid-only`, column headers are `lh_bankssts_area` (prefix and
> suffix). With `--parcid-only`, they are just `bankssts`. This affects
> downstream parsing if scripts look for specific column names.

> [!gotcha] `eTIV` column always appended from the `# Measure` block
> Even if `--etiv` normalization is not requested, an `eTIV` column is always
> appended at the end of the table (parsed from the `# Measure
> EstimatedTotalIntraCranialVol` header line). Likewise `BrainSegVolNotVent`
> is always appended. This is hardcoded in `AparcStatsParser.parse()` and
> cannot be suppressed without modifying the script.

> [!gotcha] `thickness.T1` is an alias for `thickness`
> The `--meas thickness.T1` option maps to the same column index (4,
> `ThickAvg`) as `thickness` in the parser. The distinction between
> `thickness` and `thickness.T1` is not documented in the code and the
> two options produce identical output.

## Related Tools

- [[mris_anatomical_stats]] — generates the `?h.aparc.stats` files that
  this script reads
- [[asegstats2table]] — the analogous tool for subcortical segmentation
  (`aseg.stats`) data
- [[mri_segstats]] — generates `aseg.stats` and other segmentation stats files
- [[stats-format]] — specification of the `.stats` file format
- [[parcellation-schemes]] — background on the Desikan, Destrieux, and DKT
  parcellation atlases

## Confidence and Gaps

**High confidence** (derived directly from source code):
- All flag names, types, defaults, and their effects on processing
- The column index mapping from `--meas` values to `.stats` data-block columns
- The union/intersection logic for handling missing parcellations
- The special-case handling of `eTIV`, `BrainSegVolNotVent`, `WhiteSurfArea`,
  and `MeanThickness` (parsed from the `# Measure` header block, not the
  data block)
- The `TableWriter` decoration logic and the bypass for `eTIV` /
  `BrainSegVolNotVent` column names

**Medium confidence** (inferred from code; needs user-level validation):
- Behaviour with parcellation atlases other than `aparc` and `aparc.a2009s`
- Correctness of `--qdec-long` subject name construction in edge cases

> [!note] Audit noise: `--meas` vs `--measure`
> An automated audit may flag `--meas` as a missing flag. This string appears in the script's docstring examples (`--meas meancurv`) but is NOT a valid CLI flag. The actual parser flag is `--measure` (with `dest='meas'`). The wiki correctly uses `--measure`.

> [!gap] `--etiv` with non-volume measures
> The `--etiv` flag divides all column values (except a hardcoded exclusion
> list) by eTIV. When `--meas thickness` or `--meas meancurv` is used, this
> division produces values in mm/mm³ or mm⁻¹/mm³, which are dimensionally
> meaningless. The script does not warn about this. This is a potential
> user error that is easy to make.

> [!gap] `--etiv` bare `except` clause
> The eTIV scaling block is wrapped in a bare `except:` clause. If the
> `eTIV` key is missing from the table (e.g., the stats file does not contain
> a `# Measure EstimatedTotalIntraCranialVol` line), the script exits with
> a generic error message and no indication of which subject caused the problem.
> The exact failure mode for partial missing eTIV data has not been traced.
