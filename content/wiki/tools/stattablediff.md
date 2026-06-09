---
title: "stattablediff"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/stattablediff"
families: []                     # standalone QA/regression utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[aparcstats2table]]"
  - "[[asegstats2table]]"
  - "[[groupstatsdiff]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[merge_stats_tables]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - group-analysis
  - qa
  - regression-testing
  - diff
---

# stattablediff

## Summary

`stattablediff` computes a per-subject, per-structure difference between **two
stats tables** of the kind produced by [[asegstats2table]] or
[[aparcstats2table]] (subjects in rows, ROIs in columns). It reads both tables,
intersects them on the common structures and subjects, subtracts the second
table from the first cell-by-cell, optionally expresses the result as a percent
difference (relative to the mean of the two tables, to table 1, or to table 2),
and writes a new stats table of the differences. It is the table-level
comparison engine that [[groupstatsdiff]] calls once per ROI measure when
regression-testing two recon-all analyses (e.g. two FreeSurfer versions or two
platforms).

## Source Information

- **Language:** Python 3 (uses `numpy` and the `surfa` package)
- **Source file:** [`scripts/stattablediff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff)
- **Binary/script location:** `$FREESURFER_HOME/bin/stattablediff`
- **Key dependencies:** `numpy` (matrix arithmetic), `surfa` (only for
  `surfa.system.fatal()` error reporting, [`scripts/stattablediff:63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L63)).

## Purpose and Context

When the same set of subjects is processed twice — with a different FreeSurfer
version, on a different operating system, or with a changed parameter — a
sensitive way to detect the effect of the change is to compare the resulting
morphometry **tables** rather than eyeballing individual volumes. `stattablediff`
produces exactly that comparison: a difference table that downstream tools
(notably [[wiki/tools/mri_glmfit|mri_glmfit]]) can test for a statistically
significant systematic shift.

It is a low-level building block. The user almost never runs it on raw
recon-all output directly; instead [[groupstatsdiff]] builds the input tables
(via [[asegstats2table]]/[[aparcstats2table]] inside [[groupstats]]) and invokes
`stattablediff` once per ROI table with a fixed set of flags. It can, however,
be run by hand on any two compatible tables.

> [!gotcha] "Diff" here means table 1 minus table 2 — not an absolute value
> The output is the **signed** difference `t1 - t2` (optionally scaled or turned
> into a percent), [`scripts/stattablediff:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L102). The sign tells you the
> direction of the change between the two analyses; it is not a magnitude.

## Inputs

### Required Inputs

- **`--t1 <table1>`** and **`--t2 <table2>`** — two stats tables in the
  whitespace-delimited format written by [[asegstats2table]] /
  [[aparcstats2table]] / [[merge_stats_tables]]: a header line whose first
  field is `Measure:<name>` followed by ROI/structure column names, then one
  line per subject (subject name in column 1, numeric values after). Both files
  must exist ([`scripts/stattablediff:30-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L30-L31)).
- **`--o <outfile>`** — path of the difference table to write.

### Input Assumptions

> [!assumption] Two tables of the same measure, same subjects, same structures
> The two tables must describe the **same measure** — the part of the header
> after the last colon (`Measure:volume` → `volume`) must match, or the tool
> aborts ([`scripts/stattablediff:62-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L62-L63)). By default the subject lists
> must be **identical and in the same order** (relaxed with `--diff-subjs`), and
> the structure sets must match (relaxed with `--common`). The two tables must
> always have the **same number of subjects**, even with `--diff-subjs`
> ([`scripts/stattablediff:87-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L87-L88)).

- Values are parsed with Python `float()`; non-numeric cells raise an error.
- Subjects are paired **positionally** (row *i* of table 1 with row *i* of table
  2), [`scripts/stattablediff:96-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L96-L99). With `--diff-subjs` the names may
  differ but the ordering still determines the pairing.

## Outputs

### Files Created

A single difference table at the `--o` path. There is no separate log file.

| File | Format | Contents |
|------|--------|----------|
| `<outfile>` (`--o`) | whitespace-delimited stats table | Header `Measure:<meas>-diff` + common structure names; one row per subject pair (`subj1,subj2` as the row label) holding the signed/scaled/percent differences |

### Output Specifications

The header is written as `Measure:<measure>-diff` followed by the
double-space-joined list of common structures, [`scripts/stattablediff:121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L121).
Each subsequent row begins with a **combined row label** `subs1[i],subs2[i]`
(the two paired subject names joined by a comma, [`scripts/stattablediff:91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L91)),
then the per-structure values formatted with `%f`
([`scripts/stattablediff:122-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L122-L123)). When the two subject lists are identical
the label is `subj,subj`. The result is itself a valid stats table and can be
fed straight into [[wiki/tools/mri_glmfit|mri_glmfit]] `--table`.

## Mathematical Foundations

For paired subject *i* and common structure *j*, let $a_{ij}$ be the value in
table 1 and $b_{ij}$ the value in table 2. The raw difference is

$$d_{ij} = (a_{ij} - b_{ij})\,\frac{\text{mul}}{\text{div}}$$

where `mul` (default 1) and `div` (default 1) are the optional scalar
multiply/divide factors ([`scripts/stattablediff:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L102)).

If a percent mode is requested, the difference is divided by a denominator
$p_{ij}$ and multiplied by 100:

$$d_{ij} \leftarrow 100\,\frac{d_{ij}}{p_{ij}},\qquad
p_{ij}=\begin{cases}
(a_{ij}+b_{ij})/2 & \texttt{--percent}\\
a_{ij} & \texttt{--percent1}\\
b_{ij} & \texttt{--percent2}
\end{cases}$$

(see [`scripts/stattablediff:106-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L106-L115)).

> [!math] Division-by-zero in percent mode is set to zero, not NaN
> Wherever the percent denominator $p_{ij}=0$ (e.g. a structure with zero volume
> in both runs), the corresponding output cell is forced to `0` rather than
> producing `inf`/`nan`, [`scripts/stattablediff:116-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L116-L117). This keeps the
> output table numeric and `mri_glmfit`-readable, but it means a "0% difference"
> can also mean "undefined because the structure was empty in both runs."

## Configuration Options

### Complete Flag Reference

All flags come from the `argparse` block
([`scripts/stattablediff:11-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L11-L24)). The three `--percent*` flags and the
`--mul`/`--div` scalars are the only numerical controls; the rest govern which
rows/columns are compared.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--t1` | string | *(required)* | Input table 1 (output of [[asegstats2table]]/[[aparcstats2table]]). |
| `--t2` | string | *(required)* | Input table 2, compared against table 1. |
| `--o` | string | *(required)* | Output difference table path. |
| `--percent` | bool | off | Express each difference as a percent of the **mean** of the two tables, $100(a-b)/[(a+b)/2]$. |
| `--percent1` | bool | off | Express each difference as a percent of **table 1**, $100(a-b)/a$. |
| `--percent2` | bool | off | Express each difference as a percent of **table 2**, $100(a-b)/b$. |
| `--mul` | float | `1` | Multiply every difference by this value (applied before the percent step). |
| `--div` | float | `1` | Divide every difference by this value (applied before the percent step). |
| `--common` | bool | off | Compute the diff only on structures **common** to both tables instead of erroring when the structure sets differ; columns may be reordered. |
| `--rm-exvivo` | bool | off | Strip the substring `_exvivo` from the header before parsing, so version-6+ BA labels (`BA1_exvivo`) match version-5.3 names (`BA1`). |
| `--diff-subjs` | bool | off | Allow the two tables to have **differently named** subjects (still paired positionally, still must be equal in count). |
| `--noreplace53` | bool | off | Do **not** apply the 5.3→later structure-name renaming (see below). Default behaviour **does** replace. |

### The 5.3 → later name remapping (default ON)

Unless `--noreplace53` is given, both tables' column headers are rewritten on
read so that legacy FreeSurfer 5.3 names line up with current names
([`scripts/stattablediff:41-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L41-L46)):

| 5.3 name | rewritten to |
|----------|--------------|
| `Left-Thalamus-Proper` | `Left-Thalamus` |
| `Right-Thalamus-Proper` | `Right-Thalamus` |
| `CerebralWhiteMatterVol` | `CorticalWhiteMatterVol` |
| `lhCerebralWhiteMatterVol` | `lhCorticalWhiteMatterVol` |
| `rhCerebralWhiteMatterVol` | `rhCorticalWhiteMatterVol` |

This is what lets a 5.3 table be diffed against an 8.x table without every
renamed structure showing up as "unique."

### Configuration Interactions

> [!gotcha] The three percent flags are checked in priority order, not mutually excluded
> `argparse` does not forbid combining `--percent`, `--percent1`, and
> `--percent2`. The code picks the denominator with an `if/elif/elif` chain
> ([`scripts/stattablediff:106-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L106-L111)), so if more than one is passed,
> **`--percent` wins**, then `--percent1`, then `--percent2`. With none set, the
> output is the raw (optionally mul/div-scaled) difference.

> [!gotcha] `--common` controls structures; `--diff-subjs` controls subjects — they are independent
> Differing **structure** sets without `--common` is fatal
> ([`scripts/stattablediff:74-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L74-L75)); differing **subject** names without
> `--diff-subjs` is fatal ([`scripts/stattablediff:84-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L84-L85)). They guard
> different axes of the table and you may need both. Note that even with
> `--diff-subjs`, an unequal **count** of subjects is always fatal
> ([`scripts/stattablediff:87-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L87-L88)).

> [!gotcha] `--rm-exvivo` and `--noreplace53` address different legacy mismatches
> `--rm-exvivo` removes `_exvivo` from Brodmann-area names (v6 renamed `BA1` →
> `BA1_exvivo`); the default 5.3 remap fixes Thalamus-Proper and the
> WhiteMatterVol family. [[groupstatsdiff]] passes `--rm-exvivo` for the aparc/BA
> tables but not for the aseg tables. To compare a genuine 5.3 table you
> typically want the default remap left ON (do **not** pass `--noreplace53`).

## Typical Use Cases

### 1. Percent difference between two aseg volume tables (the groupstatsdiff pattern)

```bash
# Tables were produced by asegstats2table for the same subjects under two FS builds
stattablediff --t1 v7/rois/aseg.lh.volume.dat \
              --t2 v8/rois/aseg.lh.volume.dat \
              --o  diff/aseg.lh.volume.dat \
              --percent --common
```

Writes a table of per-subject, per-structure percent volume differences,
restricted to structures present in both versions.

### 2. Compare two different cohorts of equal size, raw difference

```bash
stattablediff --t1 cohortA.thickness.dat \
              --t2 cohortB.thickness.dat \
              --o  AvsB.thickness.diff.dat \
              --diff-subjs --common
```

Pairs subject *i* of A with subject *i* of B by position (names may differ) and
reports the unscaled thickness difference.

### 3. Feed the difference table to mri_glmfit for a one-sample test

```bash
stattablediff --t1 t1.dat --t2 t2.dat --o diff.dat --percent --common
mri_glmfit --table diff.dat --osgm --glmdir glm.diff
```

Tests whether the mean per-structure difference is significantly non-zero.

## Pipeline Context

`stattablediff` is not part of [[wiki/pipelines/recon-all|recon-all]]. Its
canonical caller is [[groupstatsdiff]], which runs it once per ROI table (aseg
volume, aseg intensity, each aparc/BA measure, wmparc volume), then passes the
resulting difference table to [[wiki/tools/mri_glmfit|mri_glmfit]]. The input
tables themselves are built by [[groupstats]] using [[asegstats2table]] /
[[aparcstats2table]].

**Predecessor:** [[asegstats2table]] / [[aparcstats2table]] (build the two
tables) → **stattablediff** → **Successor:**
[[wiki/tools/mri_glmfit|mri_glmfit]] (test the difference table).

It is the table-level analogue of the per-subject [[asegstatsdiff]] /
[[aparcstatsdiff]] wrappers: those diff **one subject against another within a
single table**, whereas `stattablediff` diffs **two whole tables of the same
subjects**.

## Gotchas and Caveats

> [!gotcha] Subjects are matched by position, not by name
> Even without `--diff-subjs`, the pairing is `subs1[i]` ↔ `subs2[i]`
> ([`scripts/stattablediff:96-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L96-L99)). If the two tables list the same
> subjects in a **different order**, the (non-`--diff-subjs`) equality check
> `subs1 == subs2` fails and the tool aborts — which is the intended guard — but
> with `--diff-subjs` a mis-ordered table will be silently mis-paired. Make sure
> both tables are sorted the same way.

> [!gotcha] `--common` may reorder columns
> The common-structure list is built by scanning table 1 and keeping those also
> present in table 2 ([`scripts/stattablediff:67-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L67-L68)); the output column
> order therefore follows table 1, which need not match either input's original
> order. The help text notes this ("may reorder").

> [!gotcha] Structures unique to one table are reported as info, not silently dropped
> For every structure present in only one table the tool prints
> `info: table N has unique structure <name>` ([`scripts/stattablediff:72-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L72-L73)).
> Without `--common` this is immediately followed by a fatal error; with
> `--common` the structure is excluded from the diff. Watch the stdout to see
> what was dropped.

## Error Compensation and Guard Rails

- **Measure mismatch is fatal.** If the `Measure:` tags of the two tables
  differ, the tool stops rather than diffing apples and oranges
  ([`scripts/stattablediff:62-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L62-L63)).
- **Legacy-name harmonisation on by default.** The 5.3 remap and (when asked)
  `_exvivo` stripping let mismatched-but-equivalent structure names line up
  instead of being treated as unique (above).
- **Percent-mode zero-protection.** Division by a zero denominator yields `0`,
  not a non-finite value ([`scripts/stattablediff:116-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L116-L117)).
- **No common data is fatal.** If, after intersection, there are no common
  structures (or subjects), the tool aborts with a clear message
  ([`scripts/stattablediff:68-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff#L68-L69)).

## Related Tools

- [[asegstats2table]] — produces the subcortical/segmentation tables that are diffed.
- [[aparcstats2table]] — produces the cortical-parcellation tables that are diffed.
- [[groupstatsdiff]] — the orchestrator that calls `stattablediff` once per ROI table, then `mri_glmfit`.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — consumes the difference table to test for a systematic shift.
- [[merge_stats_tables]] — an alternative way to assemble multi-subject tables that `stattablediff` can read.
- [[asegstatsdiff]] / [[aparcstatsdiff]] — per-subject (one-vs-one) tcsh analogues used by `test_recon-all.csh`.

## Confidence and Gaps

**High confidence:** complete flag set, the diff and percent formulae, the
positional subject pairing, the default-on 5.3 remap and its exact rename
table, the `_exvivo` stripping, the zero-denominator protection, and the
fatal-error guard rails — all read directly from
[`scripts/stattablediff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff).

## References

- FreeSurfer source: [`scripts/stattablediff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stattablediff) (v8.2.0).
- Built-in help: `stattablediff --help` (the `argparse` usage block).
- Caller: [`scripts/groupstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff) (constructs the `stattablediff` command lines).
