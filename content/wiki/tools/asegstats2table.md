---
title: "asegstats2table"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/asegstats2table"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[stats-format]]"
  - "[[color-lut]]"
  - "[[aparcstats2table]]"
  - "[[fsgd-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Placeholder_Segmentation resolution logic uses Python 2-style iteritems() — may fail in some Python 3 environments"
  - "stiv scaling uses SegmentedTotalIntracranialVol key; not confirmed whether this matches the ShortName used in all FS versions"
tags:
  - statistics
  - table
  - segmentation
---

# asegstats2table

## Summary

`asegstats2table` reads per-subject subcortical segmentation stats files
(`aseg.stats` or equivalent) for a list of subjects and assembles them into a
single cross-subject table. Each row represents one subject and each column
represents one segmented structure; values are a single morphometric measure
(volume in mm³ by default). The output is a plain-text, delimiter-separated
matrix ready for import into statistical software (R, Python, SPSS, etc.).

## Source Information

- **Language:** Python 3
- **Source file:** `scripts/asegstats2table` (671 lines)
- **Authors:** Douglas Greve (original), Krish Subramaniam (rewrite), MGH
- **Parser library:** `fsbindings.legacy.AsegStatsParser`
  (`python/fsbindings/legacy.py`)
- **Script location:** `$FREESURFER_HOME/bin/asegstats2table`

## Purpose and Context

After [[wiki/pipelines/recon-all|recon-all]] completes, each subject has a subcortical segmentation
stats file (`aseg.stats`) produced by [[mri_segstats]] that contains volumes
and intensity statistics for every structure in the `aseg.mgz` segmentation.
These per-subject files are not directly usable for group-level analysis.

`asegstats2table` solves this by iterating over a list of subjects, reading
the appropriate `.stats` file for each, and stacking the results into a
subjects × structures matrix. The result is used for group-level statistical
modelling of subcortical morphometry (e.g., hippocampal volume comparisons,
thalamus asymmetry analyses).

`asegstats2table` is not called by `recon-all`; it is a post-processing
utility run after all subjects have been processed.

Unlike [[aparcstats2table]], `asegstats2table` also accepts direct paths to
stats files (`--inputs`/`-i`), making it usable with non-standard segmentation
outputs from [[mri_segstats]] that were not produced by `recon-all`.

## Inputs

### Required Inputs

**Either** a subject list (methods 1 and 2, which require `$SUBJECTS_DIR`) **or**
a list of stats file paths (methods 3 and 4, which do not):

1. `--subjects sub1 sub2 ...` / `-s subjectname` — subject names; the script
   constructs paths as `$SUBJECTS_DIR/<subject>/stats/aseg.stats`
2. `--subjectsfile <file>` / `--qdec <file>` / `--qdec-long <file>` /
   `--fsgd <file>` — alternative ways to provide a subject list
3. `--inputs file1 file2 ...` — direct paths to stats files (bypass
   `$SUBJECTS_DIR`; subject labels in the output table become row numbers 0, 1, …)
4. `-i filepath` (repeatable) — same as `--inputs`, one file at a time

### Input Assumptions

> [!assumption] `$SUBJECTS_DIR` must be set when using subject-list modes
> Methods 1–2 call `fsutils.check_subjdirs()` to read `$SUBJECTS_DIR`.
> If unset, the script exits with an error. The `--sd` flag can override
> this at runtime: `--sd /path/to/subjects` sets `os.environ['SUBJECTS_DIR']`.

> [!assumption] Default stats file is `stats/aseg.stats`
> When using subject-list methods, the file read is:
> `$SUBJECTS_DIR/<subject>/stats/aseg.stats`.
> Both `--subdir` and `--statsfile` (or `--stats`) override the subdirectory
> and filename components respectively.

> [!assumption] All subjects must have the same segmentation set by default
> If the segmentation sets differ across subjects, the script exits with an
> error unless `--common-segs` (intersection) or `--all-segs` (union) is
> specified.

> [!assumption] Input file must exist and be non-empty
> `AsegStatsParser.__init__()` raises `BadFileError` if the file does not exist
> or has fewer than 10 bytes. With `--skip`, the subject is silently omitted;
> without it, the script exits.

## Outputs

### Files Created

A single plain-text table file at the path specified by `-t`/`--tablefile`.

**Table structure (default orientation):**
- Row 0 (header): the first cell contains `Measure:<meas>` (e.g.,
  `Measure:volume`); remaining cells contain the anatomical structure names
  from the stats file (e.g., `Left-Lateral-Ventricle`, `Right-Hippocampus`).
  No hemisphere or measure decoration is applied to column headers (unlike
  [[aparcstats2table]]).
- Rows 1…N: each subject, with the subject name (or row number when `--inputs`
  is used) in the first column and measure values in subsequent columns.

**Global volume measures** are appended as extra columns when `--meas volume`
is selected (unless suppressed by `--no-vol-extras`). These are parsed from
the `# Measure` header block of the stats file. The set of appended columns
is hardcoded in `AsegStatsParser.parse()` and includes (where present in the
input file):

`lhCortexVol`, `rhCortexVol`, `CortexVol`, `lhCerebralWhiteMatterVol`,
`rhCerebralWhiteMatterVol`, `CerebralWhiteMatterVol`, `SubCortGrayVol`,
`TotalGrayVol`, `SupraTentorialVol`, `SupraTentorialVolNotVent`,
`EstimatedTotalIntraCranialVol`, `SegmentedTotalIntracranialVol`,
`MaskVol`, `BrainSegVol-to-eTIV`, `MaskVol-to-eTIV`,
`lhSurfaceHoles`, `rhSurfaceHoles`, `SurfaceHoles`,
`BrainSegVol`, `BrainSegVolNotVent`, `BrainSegVolNotVentSurf`

(Legacy names such as `lhCorticalWhiteMatterVol` and `CorticalWhiteMatterVol`
are also listed in the parser for backward compatibility with older stats files.)

> [!gotcha] Global volume extras are only appended for `--meas volume`
> The hardcoded `# Measure` parsing block in `AsegStatsParser.parse()` only
> runs when `measure == 'volume'`. When `--meas mean` or other measures are
> used, no global measures are appended.

**Delimiter:** controlled by `--delimiter` (default tab).
**Append mode:** when `--append` is set, the tool opens the file in append mode
and writes a blank line followed by the new table.
**Transpose:** `--transpose` swaps rows and columns; values in the transposed
table are formatted with `%g` (rather than `%s` in the default orientation).

### When `--inputs` is used

Subject labels in the first column are integer row indices (0, 1, 2, …) rather
than subject names, because the script has no subject name information when
given direct file paths.

## Mathematical Foundations

`asegstats2table` performs no mathematical computation itself beyond optional
normalization. The mathematical content is in the `.stats` files it reads;
see [[stats-format]] and [[mri_segstats]] for the definitions of each measure.

**Column index mapping** (from `AsegStatsParser.measure_column_map` in
`fsbindings/legacy.py`; indices are into the whitespace-split data row):

| `--meas` value | Column in `.stats` data block | Field | Units |
|----------------|-------------------------------|-------|-------|
| `volume` (default) | 3 (`Volume_mm3`) | PV-corrected volume | mm³ |
| `nvoxels` | 2 (`NVoxels`) | Raw voxel count | unitless |
| `nvertices` | 2 | Same column as `nvoxels`; used for surface-mode stats | unitless |
| `Area_mm2` | 3 | Same column as `volume`; used for surface-mode stats | mm² |
| `mean` | 5 (`normMean`) | Mean intensity | MR units |
| `std` | 6 (`normStdDev`) | Std dev of intensity | MR units |
| `max` | 8 (`normMax`) | Maximum intensity | MR units |
| `snr` | 10 | SNR column (present only when `--snr` was passed to `mri_segstats`) | unitless |

> [!gotcha] `snr` column index may not exist in standard `aseg.stats` files
> The `snr` measure maps to column index 10, which only exists if `mri_segstats`
> was called with `--snr`. Standard `recon-all`-produced `aseg.stats` files
> do not have this column. Requesting `--meas snr` on such files will raise an
> `IndexError`.

**eTIV normalization** (`--etiv`): divides every cell value (except
`lhSurfaceHoles`, `rhSurfaceHoles`, `SurfaceHoles`, `BrainSegVol-to-eTIV`,
`MaskVol-to-eTIV`) by the subject's `EstimatedTotalIntraCranialVol` and
multiplies by 100. The eTIV value is read from the extra-column entry
`EstimatedTotalIntraCranialVol` that was appended from the `# Measure` block.

**sTIV normalization** (`--stiv`): identical operation but divides by
`SegmentedTotalIntracranialVol` (the SynthSeg-derived TIV estimate). Requires
that the input stats file contains a `# Measure SegmentedTotalIntraCranialVol`
header line.

**Scaling** (`--scale`): a multiplicative scalar applied to all table values
after any eTIV/sTIV normalization.

## Configuration Options

### Subject / Input Specification (mutually exclusive — exactly one required)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subjects sub1 sub2 ...` | string list | — | Variadic list of subject names. Uses `fsutils.callback_var`. |
| `-s subjectname` | string (repeatable) | — | Specify subjects one at a time; can be repeated. |
| `--subjectsfile <file>` | path | — | Text file with one subject name per line. |
| `--qdec <file>` | path | — | QDEC table (CSV); reads the `fsid` column. |
| `--qdec-long <file>` | path | — | Longitudinal QDEC table; constructs `<fsid>.long.<fsid-base>` names. |
| `--fsgd <file>` | path | — | [[fsgd-format\|FSGD]] group descriptor; extracts subjects from `INPUT` lines. |
| `--inputs file1 file2 ...` | path list | — | Direct stats file paths; bypasses `$SUBJECTS_DIR`. Row labels become integers. |
| `-i filepath` | path (repeatable) | — | Single stats file path; can be repeated. Same effect as `--inputs`. |

### Required Option

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--tablefile FILE`<br>`-t` | `-t` | path | none (required) | Output file path for the assembled table. |

### File Location Overrides (subject-list modes only)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--subdir <dir>` | string | `stats` | Subdirectory under `$SUBJECTS_DIR/<subject>/` to look for the stats file. |
| `--stats <fname>`<br>`--statsfile <fname>` | string | `aseg.stats` | Stats filename to use instead of `aseg.stats`. Both flags are synonyms (`dest='statsfname'`). |
| `--sd <path>` | path | `$SUBJECTS_DIR` | Override `$SUBJECTS_DIR` at runtime. Sets `os.environ['SUBJECTS_DIR']`. |

### Measure Selection

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--meas <measure>`<br>`-m` | `-m` | enum | `volume` | Measure to extract. Valid: `volume`, `Area_mm2`, `nvoxels`, `nvertices`, `mean`, `std`, `snr`, `max`. |

### Segmentation Filtering

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--segno seg1 seg2 ...` | int list | none | Include only the specified segmentation IDs (by integer label number). Order is preserved. Mutually exclusive with `--segids-from-file`. |
| `--no-segno seg1 seg2 ...` | int list | none | Exclude the specified segmentation IDs. |
| `--segids-from-file <file>` | path | none | Text file with one segmentation ID per line; output only those IDs in that order. Mutually exclusive with `--segno`. |
| `--maxsegno <N>` | int | none | Discard all segmentations with ID > N. Useful for removing high-ID placeholder labels. |
| `--common-segs` | bool | off | Output only segmentations present in **all** stats files (intersection). |
| `--all-segs` | bool | off | Output segmentations that are the union of all stats files; missing entries get `0.0`. |
| `--no-vol-extras` | bool | off | Suppress the global volume measures (`# Measure` block entries) that are normally appended when `--meas volume` is used. |

### Output Formatting

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--delimiter <name>`<br>`-d` | `-d` | enum | `tab` | Column separator. Valid: `tab`, `space`, `comma`, `semicolon`. |
| `--transpose` | — | bool | off | Transpose output: rows become structures, columns become subjects. Values formatted with `%g`. |
| `--append` | — | bool | off | Append to an existing output file rather than overwriting. |

### Normalization and Scaling

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--etiv` | bool | off | Normalize all values to percentage of estimated total intracranial volume (`EstimatedTotalIntraCranialVol`). Mutually exclusive with `--stiv`. |
| `--stiv` | bool | off | Normalize all values to percentage of segmented total intracranial volume (`SegmentedTotalIntracranialVol`, from SynthSeg). Mutually exclusive with `--etiv`. |
| `--scale <float>` | float | 1.0 | Multiply all output values by this scalar after normalization. |

### Behaviour Modifiers

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--skip` | — | bool | off | Skip subjects whose stats file cannot be found or is too small. |
| `--replace53` | — | bool | off | Replace FreeSurfer 5.3 structure names (`Left-Thalamus-Proper`, `CorticalWhiteMatterVol`, etc.) with their post-5.3 equivalents. Useful for combining data across FS versions. |
| `-v`<br>`--debug` | — | bool | off | Enable DEBUG-level logging from `aseglogger`. |

### Configuration Interactions

> [!gotcha] Subject-list and `--inputs` modes are mutually exclusive
> Exactly one input method may be specified. The script counts the number of
> active input methods and exits if the count is greater than one or if none
> is provided.

> [!gotcha] `--etiv` and `--stiv` are mutually exclusive
> If both are specified, the script exits immediately with an error:
> `"ERROR: Cannot pass --etiv and --stiv flags simultaneously"`.

> [!gotcha] `--segno` and `--segids-from-file` are mutually exclusive
> The script checks and exits if both are given. Either specify IDs inline
> with `--segno` or provide them in a file with `--segids-from-file`.

> [!gotcha] `--common-segs` and `--all-segs` are mutually exclusive in effect, not validated
> Both flags set different Boolean attributes (`common_flag` vs. `all_flag`)
> and `sanitize_table()` checks them in sequence. If both are set, `--common-segs`
> takes precedence (its branch is checked first). The script does not error on
> this combination.

> [!gotcha] Default behaviour errors when segmentations differ across subjects
> Without `--common-segs` or `--all-segs`, `sanitize_table()` checks that the
> union and intersection of segmentation sets are identical. If they differ
> (i.e., any subject is missing a segmentation or has an extra one), the script
> exits with:
> `"ERROR: All stat files should have the same segmentations."`
> This is the most common runtime error when combining subjects processed with
> different FreeSurfer versions or recon-all configurations.

> [!gotcha] Global volume extras cannot be filtered by `--segno` or `--no-segno`
> The `# Measure` header entries (appended as extra columns when
> `--meas volume` and --no-vol-extras is not set) are parsed in a second
> pass through the file and are added unconditionally. The `--segno` and
> `--no-segno` filters only apply to the data-block rows (the actual
> segmentation entries), not to the header-block extras.

> [!gotcha] `--no-vol-extras` only affects `--meas volume`
> The global volume extras are only appended during the `volume` measure path.
> `--no-vol-extras` has no effect when `--meas mean` or other measures are used
> (the extras are not appended in those cases regardless).

> [!gotcha] `--inputs` mode loses subject name labels
> When stats files are provided directly with `--inputs` or `-i`, the first
> column of the output table contains sequential integers (0, 1, 2, …) rather
> than subject names. There is no mechanism to assign custom row labels.

> [!gotcha] `--replace53` modifies structure names in memory only
> The `--replace53` flag renames five structures in the parsed `id_name_map`
> before the table is assembled. It does not modify any files on disk and
> only applies to the current run.

## Typical Use Cases

### Extract subcortical volumes for a group of subjects

```bash
asegstats2table \
  --subjects sub-01 sub-02 sub-03 sub-04 \
  --meas volume \
  --tablefile aseg_volumes.txt
```

The output has one row per subject and one column per segmented structure
(including appended global measures such as `BrainSegVol` and
`EstimatedTotalIntraCranialVol`).

### Read subjects from a text file

```bash
asegstats2table \
  --subjectsfile /path/to/subjects.txt \
  --meas volume \
  --tablefile aseg_volumes.txt
```

### Extract only specific structures by segmentation ID

```bash
# Left hippocampus = 17, Right hippocampus = 18
asegstats2table \
  --subjects sub-01 sub-02 sub-03 \
  --segno 17 18 \
  --meas volume \
  --tablefile hippocampus_volumes.txt
```

### Use a non-default stats file (e.g., wmparc.stats)

```bash
asegstats2table \
  --subjects sub-01 sub-02 sub-03 \
  --statsfile wmparc.stats \
  --meas volume \
  --all-segs \
  --tablefile wmparc_volumes.txt
```

Because `wmparc.stats` may include different structures across subjects,
`--all-segs` or `--common-segs` is typically required.

### Provide stats files directly (without SUBJECTS_DIR)

```bash
asegstats2table \
  --inputs /data/sub-01/stats/aseg.stats \
            /data/sub-02/stats/aseg.stats \
  --meas volume \
  --tablefile aseg_volumes.txt
```

Row labels in the output will be `0` and `1`, not subject names.

### Output comma-delimited, skip missing subjects

```bash
asegstats2table \
  --subjects sub-01 sub-02 sub-03_missing \
  --meas volume \
  --delimiter comma \
  --skip \
  --tablefile aseg_volumes.csv
```

### Normalize by eTIV

```bash
asegstats2table \
  --subjects sub-01 sub-02 sub-03 \
  --meas volume \
  --etiv \
  --tablefile aseg_pct_etiv.txt
```

### Use with a QDEC file

```bash
asegstats2table \
  --qdec group.qdec.table.dat \
  --meas volume \
  --tablefile aseg_volumes.txt
```

### Combine data across FreeSurfer 5.3 and later subjects

```bash
asegstats2table \
  --subjects fs53_sub fs82_sub \
  --meas volume \
  --replace53 \
  --all-segs \
  --tablefile aseg_combined.txt
```

`--replace53` renames `Left-Thalamus-Proper` → `Left-Thalamus` (and four
other structures) so that subjects processed with FS 5.3 and later versions
use consistent names and can be placed in the same column.

### Transpose the table

```bash
asegstats2table \
  --subjects sub-01 sub-02 \
  --meas volume \
  --transpose \
  --tablefile aseg_volumes_transposed.txt
```

## Pipeline Context

`asegstats2table` is not part of the [[wiki/pipelines/recon-all|recon-all]] pipeline. It is a
post-processing utility for group-level analysis.

**Prerequisite outputs** (produced by `recon-all`):
- `$SUBJECTS_DIR/<subject>/stats/aseg.stats` — produced by [[mri_segstats]]
  in the `autorecon3` stage

**Typical usage pattern:**
1. Run `recon-all` to completion for all subjects.
2. Verify that `stats/aseg.stats` exists for all subjects.
3. Run `asegstats2table` to generate the cross-subject table.
4. Import the table into R, Python (pandas), or SPSS for group analysis.

The complementary tool for cortical parcellation data is
[[aparcstats2table]], which reads `?h.aparc.stats` instead of `aseg.stats`.

## Gotchas and Caveats

> [!gotcha] Mismatched segmentations across subjects causes immediate exit
> The most common error when running this tool across a diverse cohort is:
> `"ERROR: All stat files should have the same segmentations."`
> This occurs when one or more subjects has a different set of labels in their
> `aseg.stats` (e.g., due to different FreeSurfer versions, different exclusion
> flags passed to `mri_segstats`, or pathological anatomy). Use `--common-segs` to
> take the intersection or `--all-segs` to take the union.

> [!gotcha] Global volume extras are always appended for `--meas volume`
> Unless `--no-vol-extras` is specified, extra columns derived from the
> `# Measure` header block are appended to the table. These include
> `BrainSegVol`, `EstimatedTotalIntraCranialVol`, etc. Their presence can
> surprise users who expect the table to contain only data-block rows.

> [!gotcha] `--replace53` hardcodes exactly five structure name substitutions
> The list in `asegstats2table` is:
> - `Left-Thalamus-Proper` → `Left-Thalamus`
> - `Right-Thalamus-Proper` → `Right-Thalamus`
> - `CorticalWhiteMatterVol` → `CerebralWhiteMatterVol`
> - `lhCorticalWhiteMatterVol` → `lhCerebralWhiteMatterVol`
> - `rhCorticalWhiteMatterVol` → `rhCerebralWhiteMatterVol`
>
> No other name differences between FS 5.3 and later versions are handled.

> [!gotcha] `Placeholder_Segmentation` resolution may fail in Python 3
> The `sanitize_table()` function uses `iteritems()` on a `StableDict` object
> (a Python 2-era ordered dictionary substitute). The `fsbindings/legacy.py`
> module provides a Python 3 port of `StableDict`, but the use of `iteritems()`
> may cause `AttributeError` in strict Python 3 environments. This code path
> is only exercised when `--segno` requests an ID that is absent from some
> input files, causing a `Placeholder_Segmentation` entry to be created.

> [!gotcha] `--etiv` requires volume extras to be present
> `--etiv` reads `EstimatedTotalIntraCranialVol` from the extra columns
> appended by the volume parser. If `--no-vol-extras` is also specified,
> `EstimatedTotalIntraCranialVol` will not be present in the table and
> the `--etiv` block will raise a `KeyError` wrapped in a bare `except:`
> clause, producing a generic error message.

> [!gotcha] `--stiv` requires SynthSeg output
> `--stiv` reads `SegmentedTotalIntracranialVol` from the extra columns.
> This entry is only appended if the input `aseg.stats` file contains a
> `# Measure SegmentedTotalIntraCranialVol, sTIV,` header line, which is
> only written by `mri_segstats` when called with `--stiv <file>`. Subjects
> processed without SynthSeg will cause a `KeyError` under `--stiv`.

## Related Tools

- [[mri_segstats]] — generates the `aseg.stats` files that this script reads
- [[aparcstats2table]] — the analogous tool for cortical parcellation
  (`?h.aparc.stats`) data
- [[stats-format]] — specification of the `.stats` file format
- [[color-lut]] — the color lookup table (`ASegStatsLUT.txt`) that assigns
  structure names to segmentation label IDs
- [[mri_ca_label]] — produces the `aseg.mgz` segmentation consumed by
  `mri_segstats`

## Confidence and Gaps

**High confidence** (derived directly from source code):
- All flag names, types, defaults, and their effects
- The column index mapping for all supported `--meas` values
- The hardcoded list of global volume extras and their `# Measure` prefixes
- The union/intersection/exit-on-mismatch logic in `sanitize_table()`
- The `--replace53` substitution list
- The special-case exclusions in `--etiv`/`--stiv` normalization

**Medium confidence** (inferred; needs validation):
- Behaviour with non-standard stats files (e.g., `lh.w-g.pct.stats`,
  `wmparc.stats`) where column numbering may differ
- Correctness of `Placeholder_Segmentation` resolution across diverse inputs

> [!gap] `Placeholder_Segmentation` Python 3 compatibility
> `sanitize_table()` calls `iteritems()` on a `StableDict`. The `StableDict`
> implementation in `fsbindings/legacy.py` provides Python 3 compatibility
> in most methods, but the `iteritems()` usage in the placeholder resolution
> block has not been tested under current Python 3 environments. If `--segno`
> is used with IDs absent from some files, this code path may fail.

> [!gap] `snr` column availability
> The `snr` measure maps to column index 10, which is only written by
> `mri_segstats --snr`. Standard `recon-all`-produced `aseg.stats` files do
> not include this column. The script will raise an `IndexError` if `--meas snr`
> is requested on such files. This is not validated before processing.
