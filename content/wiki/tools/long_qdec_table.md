---
title: "long_qdec_table"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_qdec_table"
  - "python/fsbindings/legacy.py"
families: []                     # longitudinal QDEC workflow helper
recon_all_stage: null
related:
  - "[[wiki/concepts/longitudinal-processing|longitudinal-processing]]"
  - "[[long_stats_combine]]"
  - "[[long_mris_slopes]]"
  - "[[qdec_glmfit]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - longitudinal
  - qdec
  - table
  - python
---

# long_qdec_table

## Summary

`long_qdec_table` is a small Python utility for manipulating a **longitudinal
QDEC table** — a whitespace-delimited text file whose first two columns are
`fsid` (the time-point ID) and `fsid-base` (the within-subject base/template ID),
followed by arbitrary numeric or categorical covariate columns. It can **split** a
table into per-value sub-tables (e.g. one file per subject), **collapse** a
longitudinal table into a cross-sectional one (averaging numeric columns over time
points), and **sort** each subject's rows by a chosen column (e.g. age). All real
work is delegated to the `LongQdecTable` class in `fsbindings.legacy`.

## Source Information

- **Language:** Python 3 (uses `optparse`)
- **Source files:**
  [`scripts/long_qdec_table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table) (driver) and
  [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py) (the `LongQdecTable` class).
- **Original author:** Martin Reuter
- **Binary/script location:** `$FREESURFER_HOME/bin/long_qdec_table` (a wrapper that execs `fspython $FREESURFER_HOME/python/scripts/long_qdec_table`).

## Purpose and Context

QDEC and `mri_glmfit`-based longitudinal analyses are driven by a table that lists
every time point, the subject (base) it belongs to, and the per-time-point
covariates. `long_qdec_table` is the housekeeping tool for that file. Three needs
recur in longitudinal pipelines:

- **Parallelization / per-subject processing** — splitting the master table by
  `fsid-base` yields one `long.qdec.<subject>.dat` per subject, which can be fed to
  per-subject runs of [[long_mris_slopes]] or [[long_stats_combine]] independently.
- **Group-level (cross-sectional) modelling** — collapsing a longitudinal table
  into one row per subject (averaging numeric covariates) produces a table suitable
  for a standard cross-sectional GLM on a within-subject summary measure (rate,
  SPC, average) computed by [[long_mris_slopes]].
- **Ordering** — making sure each subject's rows are in time order (e.g. by age)
  before a slope/rate computation that assumes ordered or baseline-first rows.

## Inputs

### Required Inputs

- **`--qdec <file>`** — the longitudinal QDEC table. Required for every operation
  ([`scripts/long_qdec_table:101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L101),
  enforced at [`:109-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L109-L112)).

The table format (header line + data rows; `#`-prefixed rows are ignored):

```
fsid     fsid-base  age   weight   IQ
Elmo_1   Elmo       3     10       1000
#Elmo_2  Elmo       3.5   15       1100
Elmo_3   Elmo       4     20       1300
Snuffy_1 Snuffy     20    40       1100
Snuffy_2 Snuffy     21    45       1200
```

The first column is the time-point ID (`fsid`), the second the base ID
(`fsid-base`); the parser stores the remaining column names as the table's
`variables` ([`python/fsbindings/legacy.py:864-867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L864-L867)).
An optional leading `subjects_dir <path>` line is recognised and preserved
([`legacy.py:854-855`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L854-L855)).

### Input Assumptions

> [!assumption] Second column must be `fsid-base` (a longitudinal table)
> A table whose header second column is **not** `fsid-base` is parsed as
> cross-sectional (`self.cross = True`,
> [`python/fsbindings/legacy.py:866-871`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L866-L871)).
> `--split fsid-base` and `--cross` are meaningful only for a true longitudinal
> table. For `--split <covariate>` and `--cross`, the split/averaging assumes the
> covariate is constant per subject (for `--split`) or numeric (to be averaged, for
> `--cross`); non-numeric columns in `--cross` keep the value from the subject's
> first row.

## Outputs

### Files Created

| Operation | Output file(s) | Contents |
|-----------|----------------|----------|
| `--split fsid-base` | `long.qdec.<subjectid>.dat` (one per subject) | the rows for one subject |
| `--split <column>` | `long.qdec.<column>.<value>.dat` (one per distinct value) | rows whose `<column>` equals `<value>` |
| `--cross --out <name>` | `<name>` | one row per subject; numeric columns averaged across time, others taken from the first row |
| `--sort <column> --out <name>` | `<name>` | the table with each subject's rows sorted by `<column>` |

The output naming for `--split` is built at
[`scripts/long_qdec_table:144-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L144-L150):
the `<column>.` prefix is dropped when splitting on `fsid-base`.

### Output Specifications

Written tables are whitespace-delimited text with a header line. A collapsed
(`--cross`) table is written with a `fsid …` header (no `fsid-base`), since it is
now cross-sectional; a longitudinal table keeps the `fsid fsid-base …` header. A
preserved `subjects_dir` line is re-emitted if present
([`python/fsbindings/legacy.py:1067-1085`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L1067-L1085)).

## Mathematical Foundations

The only quantitative operation is the per-subject averaging in `--cross`.

> [!math] Cross-sectional collapse
> For each subject, every column $j>0$ is replaced by the mean over that subject's
> $T$ rows when all entries parse as floats, $\bar{x}_j = \frac{1}{T}\sum_{t} x_{j,t}$;
> if any entry is non-numeric the column instead takes the **first row's** value
> ([`python/fsbindings/legacy.py:968-983`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L968-L983)).
> "First" means first in input order, so a sensible collapse usually wants the table
> sorted (e.g. baseline-first) beforehand.

> [!internal] Table logic lives in `LongQdecTable`
> Parsing, `split()`, `make_cross()`, `sort()`, and `write()` are all methods of
> `LongQdecTable` in [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py)
> (lines 794+). The driver script is essentially argument parsing plus dispatch.

## Configuration Options

### Complete Flag Reference

All options are `optparse` long options, defined at
[`scripts/long_qdec_table:101-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L101-L105).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string (file) | *(required)* | Input longitudinal QDEC table (`fsid fsid-base …`). |
| `--split` | string (column) | — | Split the table by `<column>` into separate files (use `fsid-base` to get one file per subject). Cannot split on `fsid`. |
| `--cross` | bool | off | Collapse to one row per subject (numeric columns averaged); requires `--out`. |
| `--sort` | string (column) | — | Sort each subject's rows by `<column>` (e.g. `age`); requires `--out`. Use `tpid` to sort by the time-point ID. |
| `--out` | string (file) | — | Output filename for `--cross` and `--sort`. Not used by `--split`. |

### Configuration Interactions

> [!gotcha] `--cross` and `--sort` require `--out`; `--split` ignores it
> The parser enforces that if `--sort` is given **or** `--cross` is set, `--out`
> must be present, exiting otherwise
> ([`scripts/long_qdec_table:114-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L114-L116)).
> `--split`, by contrast, generates its own filenames and does **not** consult
> `--out`.

> [!gotcha] Operations are independent and run in sequence, all writing to one `--out`
> `--split`, `--cross`, and `--sort` are evaluated in separate `if` blocks
> ([`scripts/long_qdec_table:141-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L141-L162)),
> so more than one can fire in a single invocation. Because both `--cross` and
> `--sort` write to the **same** `--out`, combining them means whichever runs later
> (`--sort`) overwrites the file — and `--sort` operates on the *already collapsed*
> single-row-per-subject table. Run them in separate invocations to avoid surprise.

> [!gotcha] `--split fsid` is rejected
> Splitting on the time-point ID would put one row per file and is explicitly
> refused ([`python/fsbindings/legacy.py:926-928`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L926-L928)).
> Splitting on a covariate requires that covariate to be **constant within each
> subject**, or the split aborts with an error
> ([`legacy.py:947-950`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L947-L950)).

## Typical Use Cases

### 1. One table per subject (for parallel processing)

```bash
# Produces long.qdec.<subject>.dat for each subject.
long_qdec_table --qdec long.qdec.table.dat --split fsid-base
```

### 2. Sort each subject's time points by age

```bash
long_qdec_table --qdec long.qdec.table.dat --sort age --out long.qdec.sorted.dat
```

### 3. Collapse to a cross-sectional table (one row per subject)

```bash
# age/weight/IQ averaged across each subject's time points.
long_qdec_table --qdec long.qdec.sorted.dat --cross --out cross.qdec.table.dat
```

### 4. Split by a grouping covariate

```bash
# long.qdec.group.control.dat, long.qdec.group.patient.dat, ...
long_qdec_table --qdec long.qdec.table.dat --split group
```

## Pipeline Context

`long_qdec_table` is **not** called by [[wiki/pipelines/recon-all|recon-all]]; it
is a preparation/bookkeeping step in the longitudinal QDEC/GLM analysis workflow
that runs *after* all time points are longitudinally processed. It produces the
per-subject or collapsed tables consumed by [[long_mris_slopes]] (surface slope
maps) and [[long_stats_combine]] (stacking ROI stats into the table), and
ultimately by [[qdec_glmfit]] / [[wiki/tools/mri_glmfit|mri_glmfit]].

**Predecessor:** longitudinally processed subjects + a hand-built
`long.qdec.table.dat` → **long_qdec_table** (split/sort/collapse) →
**Successor:** [[long_mris_slopes]] / [[long_stats_combine]] →
[[wiki/tools/mri_glmfit|mri_glmfit]].

## Gotchas and Caveats

> [!gotcha] Comment rows and ordering matter
> Rows beginning with `#` are dropped during parsing, which is the intended way to
> exclude a time point. Because `--cross` takes non-numeric values (and the
> baseline) from the *first* listed row of each subject, ensure the table is sorted
> (e.g. run `--sort age` first) so the "first" row is the true baseline.

> [!gotcha] `--out` is silently ignored by `--split`
> Passing `--out` together with only `--split` has no effect; the split filenames
> are fixed (`long.qdec.[<col>.]<value>.dat`). Do not expect `--out` to rename
> them.

## Error Compensation and Guard Rails

- **Required-argument checks.** Missing `--qdec` prints help and exits; missing
  `--out` for `--cross`/`--sort` exits with a clear message
  ([`scripts/long_qdec_table:109-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L109-L116)).
- **Bad-file handling.** A missing or malformed table raises `BadFileError`, caught
  and reported as "not found or wrong format"
  ([`scripts/long_qdec_table:132-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table#L132-L138)).
- **Split sanity.** Refuses `--split fsid`; verifies a covariate split is
  well-defined (constant within subject) before writing.

## Related Tools

- [[wiki/concepts/longitudinal-processing|longitudinal-processing]] — the QDEC/GLM workflow this serves.
- [[long_stats_combine]] — appends stacked ROI-stats columns to a longitudinal QDEC table (shares the `LongQdecTable` parser).
- [[long_mris_slopes]] — consumes the (often per-subject) QDEC table to fit within-subject surface slopes.
- [[qdec_glmfit]] / [[wiki/tools/mri_glmfit|mri_glmfit]] — the downstream group GLM.

## Confidence and Gaps

**High confidence:** complete flag set, the `--out` requirement logic, the
split/sort/cross semantics, the cross-collapse averaging rule, and the
`fsid-base` requirement — verified against both
[`scripts/long_qdec_table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table)
and the `LongQdecTable` methods in
[`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py).

## References

- FreeSurfer source: [`scripts/long_qdec_table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_qdec_table) and [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py) (v8.2.0).
- FreeSurfer wiki: [LongitudinalTwoStageModel](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalTwoStageModel), [LongitudinalProcessing](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalProcessing).
