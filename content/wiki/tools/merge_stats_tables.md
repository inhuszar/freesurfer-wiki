---
title: "merge_stats_tables"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/merge_stats_tables"
families: []                     # standalone table-assembly utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
  - "[[stattablediff]]"
  - "[[groupstats]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The --segno / --no-segno / --segids-from-file / --maxsegno options are present in the help text and stubbed in the code but commented out; they are not active in v8.2.0."
tags:
  - statistics
  - group-analysis
  - tables
  - longitudinal
  - merge
---

# merge_stats_tables

## Summary

`merge_stats_tables` merges a set of **already-built stats tables** (one per
subject, or any compatible stats-table files) into a single combined table with
subjects in rows and structures/ROIs in columns. Unlike [[asegstats2table]] /
[[aparcstats2table]], which read raw `*.stats` files and extract one measure, it
operates on files that are themselves in stats-table layout (a `Measure:` header
plus columns), reconciles their — possibly differing — column sets, and writes
one table. It is used chiefly to stack per-subject longitudinal summary tables
(it is called repeatedly by `long_stats_slopes`).

## Source Information

- **Language:** Python 3 (`optparse`-based; uses the legacy FreeSurfer Python helpers)
- **Source file:** [`scripts/merge_stats_tables`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables)
- **Binary/script location:** `$FREESURFER_HOME/bin/merge_stats_tables`
- **Original author:** Martin Reuter
- **Key dependency:** `fsbindings.legacy` (imported as `fsutils`,
  [`scripts/merge_stats_tables:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L30)) — provides `check_subjdirs`,
  the ordered-dict helpers (`Ddict`, `StableDict`), the set helpers
  (`unique_union`, `intersect_order`), the `callback_var` argument callback, and
  the `TableWriter` class. The same machinery backs [[asegstats2table]] /
  [[aparcstats2table]] (the source comment even reads "Command Line Options
  Parser for asegstats2table", [`scripts/merge_stats_tables:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L119)).

## Purpose and Context

The `*stats2table` tools turn raw recon-all `*.stats` files into a subjects×ROIs
table for one measure. `merge_stats_tables` solves the complementary problem: you
already have a stack of small, single-purpose tables (for example one
longitudinal-slope table per subject) and you want them concatenated into one
wide table that [[wiki/tools/mri_glmfit|mri_glmfit]] or a spreadsheet can
consume. Because different subjects can have slightly different structure lists,
the tool offers three reconciliation policies (error, intersection, or union)
so the merge does not silently mismatch columns.

It is not part of [[wiki/pipelines/recon-all|recon-all]]. Its in-tree caller is
the longitudinal-analysis script `long_stats_slopes`, which invokes it once per
derived measure (avg, rate, pc1, spc, resid, …) with `--inputs … --all-segs`
([`scripts/long_stats_slopes:624-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L624-L645)).

## Inputs

### Required Inputs

The list of input tables is given in **one of four mutually-exclusive ways**
([`scripts/merge_stats_tables:178-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L178-L210)):

1. **`-s <subj>` (repeatable)** — subject IDs; the input file inside each is
   `$SUBJECTS_DIR/<subj>/<subdir>/<intable>` (subdir defaults to `stats`).
2. **`--subjects <subj1> <subj2> …`** — same as repeated `-s`, given as a list
   that need not be the final argument (uses the `callback_var` callback).
3. **`-i <file>` (repeatable)** — explicit input-file paths (any location).
4. **`--inputs <file1> <file2> …`** — same as repeated `-i`, given as a list.

With methods 1–2 (subject mode) **`--intable <fname>` is required** to name the
stats-table file inside each subject's `stats/` directory
([`scripts/merge_stats_tables:220-222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L220-L222)). Methods 3–4 (input mode) take
the file paths directly.

Two further options are always required:

- **`-t`/`--tablefile <out>`** — the output table path
  ([`scripts/merge_stats_tables:212-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L212-L214)).
- **`-m`/`--meas <string>`** — the measure name written into the output header
  ([`scripts/merge_stats_tables:216-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L216-L218)). This is a free-text label, not a
  selector — it does not pick a column out of the inputs (contrast with
  `*stats2table`, where `--meas` chooses which statistic to extract).

### Input Assumptions

> [!assumption] Each input is already a stats table, not a raw *.stats file
> Every input file is parsed as: a first line `Measure:<...>` whose remaining
> whitespace-separated fields are the **column (structure) names**, then one
> line per row whose first field is the **row label** (subject) and the rest are
> values; lines containing `#` are skipped ([`scripts/merge_stats_tables:448-468`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L448-L468)).
> Feeding a raw `aseg.stats`/`?h.aparc.stats` file directly will not work — run
> [[asegstats2table]] / [[aparcstats2table]] first.

> [!gotcha] In `--inputs`/`-i` mode the row label is a number, not a subject name
> The help notes that with direct inputs "the subject name is not printed in the
> file (just the row number)" ([`scripts/merge_stats_tables:77-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L77-L79)). The row
> label is whatever sits in column 1 of each input table's data rows. Use subject
> mode (`-s`/`--subjects`) if you need subject names preserved as row labels.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<outfile>` (`-t`) | stats table, delimiter set by `--delimiter` | First cell `Measure:<meas>`; remaining header cells are the reconciled structure list; one row per input row, holding that row's value for each structure (missing entries filled with `0.0`). |

The output is written by the legacy `TableWriter`
([`scripts/merge_stats_tables:434-445`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L434-L445)); `--transpose` swaps rows and columns.

### Output Specifications

- The corner cell is literally `Measure:<meas>` (the `-m` value),
  [`scripts/merge_stats_tables:439`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L439).
- Column order depends on the reconciliation policy: with `--all-segs` it is the
  order-preserving **union** across inputs; with `--common-segs` the
  order-preserving **intersection**; with neither, the (verified-identical)
  column set of the first input ([`scripts/merge_stats_tables:390-410`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L390-L410)).
- Cells with no value for a given row are written as `0.0`
  ([`scripts/merge_stats_tables:416-425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L416-L425)).
- The default field delimiter is **space** ([`scripts/merge_stats_tables:165-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L165-L167));
  the help summary's claim that the default is "tab" is contradicted by the code.

> [!contradiction] Help text vs. code on the default delimiter
> The `--delimiter` help string says "default is space" while the SUMMARY block
> says "tab ( default)" ([`scripts/merge_stats_tables:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L110) vs.
> [`scripts/merge_stats_tables:141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L141)). The `optparse` default is `'space'`
> ([`scripts/merge_stats_tables:166-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L166-L167)) — **code wins: the default
> separator is a single space.**

## Mathematical Foundations

None — `merge_stats_tables` performs **no arithmetic** on the cell values. It
reads strings, reconciles the column headers (set union/intersection), pads
missing cells with `0.0`, and writes the result. All "computation" is bookkeeping
over ordered dictionaries (`Ddict`/`StableDict`) and set operations
(`unique_union`, `intersect_order`).

> [!internal] Reconciliation and writing live in the legacy helper module
> The union/intersection helpers and the `TableWriter` come from
> `fsbindings.legacy` (`python/fsbindings/legacy.py`), shared with
> [[asegstats2table]] / [[aparcstats2table]]. See `[[internal-fsbindings-legacy]]`
> (if present) for the implementation of `unique_union`, `intersect_order`, and
> `TableWriter`.

## Configuration Options

### Complete Flag Reference

Active flags from `options_parse()`
([`scripts/merge_stats_tables:146-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L146-L173)). Several `*stats2table`-style segment
filters (`--segno`, `--no-segno`, `--segids-from-file`, and the un-advertised
`--maxsegno`) are **commented out** in this version and are not parseable; they
are listed separately under "Advertised but not implemented" below.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s <subj>` | string (repeatable) | — | Add one subject; input file is `$SUBJECTS_DIR/<subj>/<subdir>/<intable>`. |
| `--subjects <subj…>` | string list | — | All subjects as a list (need not be last); equivalent to repeated `-s`. |
| `--subjectsfile <file>` | string | — | Read the subject list from a file (one subject per line). |
| `-i <file>` | string (repeatable) | — | Add one explicit input table path (any location). |
| `--inputs <file…>` | string list | — | All input table paths as a list (need not be last). |
| `--intable <fname>` | string | — | **Required in subject mode**: the stats-table filename to read inside each subject's `stats/` (e.g. a slope table). |
| `--subdir <dir>` | string | `stats` | Subdirectory under each subject to look in, instead of `stats/`. |
| `-t`<br>`--tablefile` | string | *(required)* | Output table path. |
| `-m`<br>`--meas` | string | *(required)* | Measure label written into the output header (free text, not a column selector). |
| `--common-segs` | bool | off | Output only the structures **common to all** inputs (intersection). |
| `--all-segs` | bool | off | Output the **union** of all structures; fill absent cells with `0.0`. |
| `-d`<br>`--delimiter` | choice: `space`/`tab`/`comma`/`semicolon` | `space` | Field separator in the output table. |
| `--transpose` | bool | off | Write the transpose (structures in rows, subjects in columns). |
| `--skip` | bool | off | Skip an input whose file is missing instead of aborting. |
| `-v`<br>`--debug` | bool | off | Verbose/debug logging. |
| `-h`/`--help` | bool | — | Print the SUMMARY help and exit. |

#### Advertised but not implemented

The SUMMARY `HELPTEXT` still describes three segment-filter options whose
`add_option` calls (and all of their error-checking and parsing logic) are
**commented out** in this version, so `optparse` rejects them as unrecognized.
Keep them out of any real command line.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--segids-from-file <file>` | string | — | **Non-functional.** Documented at [`scripts/merge_stats_tables:94-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L94-L96) but the `add_option` is commented out ([`scripts/merge_stats_tables:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L156)). Intended to restrict output to the seg ids listed in `<file>`. |
| `--segno <id…>` | int list | — | **Non-functional.** Documented at [`scripts/merge_stats_tables:98-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L98-L100); `add_option` commented out ([`scripts/merge_stats_tables:157-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L157-L158)). Intended to output only the requested seg ids. |
| `--no-segno <id…>` | int list | — | **Non-functional.** Documented at [`scripts/merge_stats_tables:102-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L102-L103); `add_option` commented out ([`scripts/merge_stats_tables:159-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L159-L160)). Intended to exclude the given seg ids. |

(A fourth stub, `--maxsegno`, has a commented-out `add_option` at
[`scripts/merge_stats_tables:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L155) too, but unlike the three above it is
**not** mentioned in the SUMMARY `HELPTEXT` — only in an unused help-string
variable — so it is not even advertised.) See the gap callout below.

### Configuration Interactions

> [!gotcha] The four subject/input specifiers are mutually exclusive
> You may use **exactly one** of `-s`/`--subjects` (subject mode), `--inputs`/`-i`
> (input mode), or `--subjectsfile`. Combining a subject specifier with an input
> specifier, or with `--subjectsfile`, is a fatal error
> ([`scripts/merge_stats_tables:200-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L200-L210)). Subject mode additionally
> **requires** `--intable` ([`scripts/merge_stats_tables:220-222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L220-L222)).

> [!gotcha] `--all-segs` and `--common-segs` cannot both be set
> Specifying both aborts ([`scripts/merge_stats_tables:224-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L224-L226)). With
> **neither**, all inputs must already share an identical structure set or the
> merge fails with a message telling you to choose one of the two flags
> ([`scripts/merge_stats_tables:401-409`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L401-L409)).

> [!gotcha] Duplicate row labels are always fatal
> If two input rows carry the same first-column label (e.g. the same subject
> appears twice), the tool stops with "duplicate row found … therefore
> stopping!" ([`scripts/merge_stats_tables:370-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L370-L377)) — there is no flag to
> de-duplicate.

## Typical Use Cases

### 1. Stack explicit per-subject tables (the long_stats_slopes pattern)

```bash
# Combine pre-built per-subject slope tables into one wide table, taking
# the union of structures and zero-filling gaps.
merge_stats_tables --inputs s1/long.aseg-avg.dat s2/long.aseg-avg.dat s3/long.aseg-avg.dat \
  -t long.all.aseg-avg.dat --meas aseg-avg --all-segs
```

### 2. Merge a named stats table across subjects from `$SUBJECTS_DIR`

```bash
# Read stats/aseg.morph.table from each subject (subject mode needs --intable)
merge_stats_tables -s subj01 -s subj02 -s subj03 \
  --intable aseg.morph.table -t merged.morph.dat --meas morph --common-segs
```

### 3. Transpose for many-structure / few-subject inspection

```bash
merge_stats_tables --subjectsfile subjects.txt --intable mytable.dat \
  -t merged.dat --meas mymeas --all-segs --transpose --delimiter comma
```

## Pipeline Context

Not called by [[wiki/pipelines/recon-all|recon-all]]. The in-tree consumer is
`long_stats_slopes` (longitudinal stream), which builds a per-measure stack of
subject tables and merges each with `--inputs … --all-segs`
([`scripts/long_stats_slopes:624-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L624-L645)).

**Predecessor:** [[asegstats2table]] / [[aparcstats2table]] or `long_stats_slopes`
(produce the per-subject tables) → **merge_stats_tables** → **Successor:**
[[wiki/tools/mri_glmfit|mri_glmfit]] or any tabular analysis.

Relationship to the rest of this family: [[asegstats2table]] /
[[aparcstats2table]] **build** a table from raw stats for one measure;
`merge_stats_tables` **concatenates** several existing tables;
[[stattablediff]] **differences** two tables; [[groupstats]] orchestrates the
build+GLM for a whole group.

## Gotchas and Caveats

> [!gotcha] `--meas` is a label, not a selector
> In [[asegstats2table]] `--meas volume` chooses the volume column from the raw
> stats; here `--meas` is only the text stamped into the output header
> ([`scripts/merge_stats_tables:439`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L439)) and has no effect on which numbers
> are merged. Whatever values are in the input tables are carried through.

> [!gotcha] Missing structures are filled with 0.0, which can look like real zeros
> Under `--all-segs`, a subject lacking a structure gets `0.0` for it
> ([`scripts/merge_stats_tables:418-425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L418-L425)). A downstream reader cannot
> distinguish "structure measured as 0" from "structure absent." Prefer
> `--common-segs` when that ambiguity matters.

> [!gotcha] Lines containing `#` in an input are dropped
> The parser skips any input line containing `#` ([`scripts/merge_stats_tables:462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L462)).
> This removes comment lines but would also drop a data row whose label happened
> to contain `#`.

## Error Compensation and Guard Rails

- **Always exits 0.** Even on a successful, well-formed run the script ends with
  `sys.exit(0)` ([`scripts/merge_stats_tables:542`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L542)); error conditions exit
  non-zero earlier. Callers should rely on the presence/content of the output
  table, not a distinctive success code.
- **`--skip` tolerates missing inputs.** A `FileNotFoundError` is skipped with a
  message rather than aborting when `--skip` is set
  ([`scripts/merge_stats_tables:512-519`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L512-L519)); otherwise it is fatal and the
  message suggests `--skip`.
- **Column-set reconciliation** prevents silently mismatched merges: with no
  policy flag, inconsistent structure sets are a hard error directing you to
  `--common-segs`/`--all-segs` ([`scripts/merge_stats_tables:401-409`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L401-L409)).
- A negative-int `numpy` deprecation warning is suppressed at import
  ([`scripts/merge_stats_tables:22-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L22-L23)).

## Related Tools

- [[asegstats2table]] — builds a subcortical table from raw `aseg.stats`; common upstream producer.
- [[aparcstats2table]] — builds a cortical-parcellation table; common upstream producer.
- [[stattablediff]] — differences two of these tables (the complementary "compare" operation).
- [[groupstats]] — group-analysis orchestrator that builds tables and runs GLMs.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — typical consumer of the merged table.
- [[long_stats_slopes]] — longitudinal driver that calls `merge_stats_tables` once per derived measure.

## Confidence and Gaps

**High confidence:** the four input-specification modes and their
mutual-exclusion rules, the required `--intable`/`-t`/`--meas`, the
union/intersection/zero-fill reconciliation, the duplicate-row guard, the
`#`-line skipping, the space default delimiter (code), and "no arithmetic" — all
read directly from
[`scripts/merge_stats_tables`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables).

> [!gap] Segment-filter options are stubbed out in this version
> `--segno`, `--no-segno`, and `--segids-from-file` are described in the SUMMARY
> help but their `add_option`/parsing code is commented out
> ([`scripts/merge_stats_tables:155-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L155-L160) and
> [`scripts/merge_stats_tables:228-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables#L228-L251)). A fourth, `--maxsegno`, is also
> stubbed out but is not even mentioned in the SUMMARY help. None are **available**
> in v8.2.0; passing them yields an "unrecognized option" error.

## References

- FreeSurfer source: [`scripts/merge_stats_tables`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/merge_stats_tables) (v8.2.0).
- Built-in help: `merge_stats_tables --help` (the `HELPTEXT` SUMMARY block).
- Caller: [`scripts/long_stats_slopes:624-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L624-L645).
