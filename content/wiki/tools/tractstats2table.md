---
title: "tractstats2table"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/tractstats2table"
families: []                     # TRACULA group-stats aggregator (*2table family)
recon_all_stage: null
related:
  - "[[wiki/pipelines/trac-all|trac-all]]"
  - "[[trac-paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_group]]"
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact column names accepted by --only-measures/--exclude-measures depend on the header of dmri_pathstats output (e.g. FA_Avg, MD_Avg, Count); read from the parser, not enumerated against a live .stats file."
  - "StableDict.keys() is indexed with [0] in sanitize_table (Python-2 idiom); under Python 3 this requires the fsbindings shim to return an indexable view — assumed working as shipped."
tags:
  - tracula
  - diffusion
  - statistics
  - table
  - group-analysis
---

# tractstats2table

## Summary

`tractstats2table` collects the per-subject pathway-statistics files produced by
TRACULA ([[dmri_pathstats]], via [[trac-paths]]) and assembles them into a single
table suitable for group statistics: one row per subject, one column per measure.
It has two modes — `--overall`, which tabulates whole-pathway summary measures
(e.g. average FA, mean diffusivity, streamline count), and `--byvoxel`, which
tabulates a single chosen scalar (`AD`, `RD`, `MD`, or `FA`) sampled along the
length of one pathway. It is the TRACULA analogue of [[asegstats2table]] /
[[aparcstats2table]] and is run by the user after a `trac-all` study completes.

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`)
- **Source file:** [`scripts/tractstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table)
- **Script location:** `$FREESURFER_HOME/bin/tractstats2table`
- **Original author:** Krish Subramaniam (MGH)
- **Key library:** `fsbindings.legacy` — provides the parsers `TractOverallStatsParser` and `TractByvoxelStatsParser`, the `TableWriter`, and the `StableDict`/`Ddict` ordered containers ([`scripts/tractstats2table#L11-L12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L11-L12)).

## Purpose and Context

A TRACULA run produces, for every subject and every reconstructed pathway, a
`pathstats.overall.txt` (whole-path summary measures) and a
`pathstats.byvoxel.txt` (measures sampled at each point along the path). For a
group analysis you need these gathered into a rectangular table keyed by subject.
`tractstats2table` does exactly that, parsing a set of those files for **one
pathway** and emitting a delimited table that statistics software (R, MATLAB,
Excel, FreeSurfer's own GLM tools) can read.

It is the per-pathway, table-building complement to [[dmri_group]] (which `trac-all
-stat` uses to assemble cohort path measures in template space): `dmri_group`
operates on reconstructed path distributions across subjects, whereas
`tractstats2table` operates on the already-computed `.stats` text files.

> [!gotcha] One table is for one pathway
> Every input `.stats` file fed to a single invocation must describe the **same**
> pathway; mixing pathways is rejected (see Error Compensation). To tabulate
> several pathways, run `tractstats2table` once per pathway.

## Inputs

### Required Inputs

The set of `pathstats.overall.txt` (for `--overall`) or `pathstats.byvoxel.txt`
(for `--byvoxel`) files, supplied by exactly one of three mutually-exclusive
mechanisms ([`scripts/tractstats2table#L34-L51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L34-L51)):

1. `-i <file>` repeated once per input,
2. `--inputs <file1> <file2> …` (a single multi-valued option), or
3. `--load-pathstats-from-file <listfile>` (a text file with one path per line;
   environment variables in the paths are expanded).

A **mode** (`--overall` or `--byvoxel`) and an **output table** (`--tablefile`)
are also required.

### Input Assumptions

> [!assumption] Same pathway, consistent measures across all inputs
> Every input `.stats` file must be a valid [[dmri_pathstats]] output for the same
> pathway, and (for `--overall`) must contain the same set of measures. The parser
> rejects files that are missing or "too small to be a valid statsfile"
> (`BadFileError`, [`scripts/tractstats2table#L360-L362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L360-L362)). The subject name and
> pathway name are read from inside each file (the `subject`/`pathway` fields).

## Outputs

### Files Created

| File | Contents |
|------|----------|
| `--tablefile` (e.g. `lh.cst.FA.table`) | the assembled table: rows = subjects, columns = measures (overall) or along-path sample indices (byvoxel). The top-left cell is `Pathstats` (overall) or `<pathway>/<measure>` (byvoxel). |

### Output Specifications

A plain-text, delimited table written by `fsbindings.legacy.TableWriter`
([`scripts/tractstats2table#L306-L316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L306-L316)). The field delimiter is set by
`--delimiter` (tab by default; `comma`, `space`, `semicolon` also accepted). With
`--transpose`, rows and columns are swapped (measures down, subjects across) —
useful when there are few subjects relative to measures.

## Mathematical Foundations

None — this is a parsing-and-tabulation utility. It reads numbers already computed
by [[dmri_pathstats]] and arranges them; it performs no statistics itself.

> [!internal] Parsing and the stable table live in fsbindings
> The measure extraction (`TractOverallStatsParser`, `TractByvoxelStatsParser`),
> the measure-set intersection/union reconciliation, and the ordered table
> container (`StableDict`, `Ddict`, `TableWriter`) are all in
> `fsbindings.legacy`. `tractstats2table` only drives them.

## Configuration Options

### Complete Flag Reference

Enumerated from `options_parse()`
([`scripts/tractstats2table#L86-L193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L86-L193)):

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--load-pathstats-from-file` | string (path) | — | Text file listing one input `.stats` file per line; env-vars in the paths are expanded. Mutually exclusive with `-i`/`--inputs`. |
| `--inputs` | string list | — | Whitespace-separated list of input `.stats` files (a single multi-valued option; need not be last). |
| `-i` | string (repeatable) | — | One input `.stats` file; repeat for each input. |
| `-o`<br>`--overall` | bool | — | Operate on whole-path (overall) statistics. Mutually exclusive with `--byvoxel`. |
| `--only-measures` | string list | — | (overall only) Output only these measures, in this order. |
| `--exclude-measures` | string list | — | (overall only) Exclude these measures from the table. |
| `-b`<br>`--byvoxel` | bool | — | Operate on along-the-path (byvoxel) statistics. Mutually exclusive with `--overall`. |
| `--byvoxel-measure` | string | — | (required with `--byvoxel`) Which scalar to tabulate along the path: one of `AD`, `RD`, `MD`, `FA`. |
| `-t`<br>`--tablefile` | string (path) | *(required)* | Output table file. |
| `-d`<br>`--delimiter` | choice | `tab` | Field delimiter: `tab`, `comma`, `space`, or `semicolon`. |
| `--transpose` | bool | off | Write the transpose (measures as rows, subjects as columns). |
| `-v`<br>`--debug` | bool | off | Increase verbosity (sets the logger to DEBUG). |

### Configuration Interactions

> [!gotcha] Exactly one input mechanism, exactly one mode
> `--inputs`/`-i` and `--load-pathstats-from-file` cannot be combined
> ([`scripts/tractstats2table#L153-L155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L153-L155)); supplying neither is an error
> ([`#L148-L151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L148-L151)). Likewise `--overall` and `--byvoxel` are mutually
> exclusive and one is required ([`#L161-L167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L161-L167)).

> [!gotcha] Measure-filter flags are mode-specific
> `--only-measures` / `--exclude-measures` are valid **only** with `--overall`;
> `--byvoxel-measure` is **required** with `--byvoxel` and rejected with
> `--overall`. Crossing them is a hard error
> ([`scripts/tractstats2table#L169-L188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L169-L188)).

> [!contradiction] `--byvoxel-measure` help/error text lists a stray "DA"
> The valid set is `AD, RD, MD, FA` (checked at
> [`scripts/tractstats2table#L186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L186)), but the error string printed on an invalid
> value reads "should be one of AD, RD, MD, DA" ([`#L187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L187)). Code is
> authoritative: `FA` is accepted, `DA` is not.

## Typical Use Cases

### 1. Whole-path FA and streamline count across a cohort

```bash
# pathfiles.txt lists each subject's pathstats.overall.txt for one pathway.
tractstats2table --load-pathstats-from-file $HOME/pathfiles.txt \
  --overall --only-measures FA_Avg Count \
  --tablefile lh.cst.overall.table
```

### 2. Along-the-path FA for two subjects

```bash
tractstats2table \
  --inputs bert/dpath/lh.cst_AS/pathstats.byvoxel.txt \
           fsaverage/dpath/lh.cst_AS/pathstats.byvoxel.txt \
  --byvoxel --byvoxel-measure FA \
  --tablefile lh.cst.FA.byvoxel.table
```

### 3. Comma-delimited, transposed overall table

```bash
tractstats2table -i s1/.../pathstats.overall.txt -i s2/.../pathstats.overall.txt \
  --overall --exclude-measures Count \
  --delimiter comma --transpose \
  --tablefile uf.overall.csv
```

## Pipeline Context

`tractstats2table` runs **after** a TRACULA study, as a post-processing /
group-analysis convenience. It is not called by
[[wiki/pipelines/trac-all|trac-all]] itself (it does not appear in the `trac-all`
source); the user runs it on the `pathstats.*.txt` files that [[trac-paths]]
produced.

**Predecessor:** [[trac-paths]] → [[dmri_pathstats]] (which writes
`pathstats.overall.txt` / `pathstats.byvoxel.txt`) → **tractstats2table** →
**Successor:** external statistics software / FreeSurfer GLM tools.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] Subject and pathway names come from inside the files
> The row labels (subjects) and the single common pathway are read from fields
> *within* each `.stats` file, not from the file path. A file with a malformed or
> missing subject/pathway field triggers an error
> ([`scripts/tractstats2table#L255-L264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L255-L264), [`#L300-L301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L300-L301)).

> [!gotcha] `--only-measures` ordering is honoured
> With `--only-measures`, the requested measures appear in the table in the order
> you list them, not the order in the file ([`scripts/tractstats2table#L343-L344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L343-L344)).

## Error Compensation and Guard Rails

- **Consistent-pathway check:** all inputs must share one pathway name; otherwise
  the script prints the conflicting names and exits
  ([`scripts/tractstats2table#L253-L264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L253-L264)).
- **Consistent-measures check:** the union and intersection of measures across all
  files must be equal, else it errors ("One of the files have different measure
  than others", [`scripts/tractstats2table#L286-L288`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L286-L288)).
- **Bad/too-small files** are caught as `BadFileError` with a clear message
  ([`#L360-L362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L360-L362)).
- **Missing list file** named via `--load-pathstats-from-file` errors with
  "the file … doesnt exist" ([`#L224-L226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L224-L226)).

## Related Tools

- [[trac-paths]] — produces the `pathstats.overall.txt` / `pathstats.byvoxel.txt` inputs (via [[dmri_pathstats]]).
- [[dmri_pathstats]] — computes the per-subject whole-path and along-path measures this tool tabulates.
- [[dmri_group]] — the `trac-all -stat` cohort-assembly tool (operates on path distributions in template space rather than on `.stats` text files).
- [[asegstats2table]], [[aparcstats2table]] — the volumetric/cortical analogues that turn `aseg`/`aparc` stats into subject × measure tables.
- [[wiki/pipelines/trac-all|trac-all]] — the TRACULA orchestrator whose output this tool consumes.

## Confidence and Gaps

**High confidence:** the three input mechanisms and their mutual exclusion, the
two modes and their measure-filter rules, the `AD/RD/MD/FA` byvoxel set, the
delimiter/transpose options, and the consistency checks — all read directly from
[`scripts/tractstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table).

> [!gap] Exact measure names depend on dmri_pathstats output
> The strings accepted by `--only-measures`/`--exclude-measures` are whatever
> column headers [[dmri_pathstats]] writes (e.g. `FA_Avg`, `MD_Avg`, `Count`); they
> were not enumerated against a live `.stats` file here.

> [!gap] Python-2 idioms in the table builder
> `sanitize_table` indexes `StableDict.keys()` with `[0]`
> ([`scripts/tractstats2table#L303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L303)), a Python-2 idiom; correct behaviour under
> Python 3 relies on the `fsbindings.legacy` shim returning an indexable view.
> Assumed working as shipped, not exercised.

## References

- FreeSurfer source: [`scripts/tractstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table) (v8.2.0).
- Built-in help: `tractstats2table --help` (the `HELPTEXT` block, [`scripts/tractstats2table#L22-L84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tractstats2table#L22-L84)).
- Yendiki A. et al. *Front. Neuroinform.* 5:23 (2011) — TRACULA.
