---
title: "csvprint"
type: tool
fs_version: "8.2.0"
source_language: "Python"        # python3
source_files:
  - "scripts/csvprint"
families: []                     # standalone CSV/TSV column extractor
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_synthseg]]"
  - "[[asegstats2table]]"
  - "[[stats-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - csv
  - tsv
  - tables
  - adni
  - extraction
---

# csvprint

## Summary

`csvprint` extracts and prints selected columns from a comma- or tab-separated
table whose **first row is a header of field names**. You give it the file and one
or more field names, and it prints those fields' values for every data row, one
row per output line, space-separated. It also offers a few cohort-specific row
**filters** for ADNI (`--rid`, `--s`, `--v`) and GSP (`--l`) datasets, which keep
only rows matching given RID / subject / VISCODE / Label values. Rows with any
selected field missing or empty are silently skipped. It is the small Python
helper [[wiki/pipelines/recon-all|recon-all]] uses to pull the total intracranial
volume out of the [[mri_synthseg]] volume CSV.

## Source Information

- **Language:** Python 3 (`#!/usr/bin/env python3`), standard-library `csv` only
- **Source file:** [`scripts/csvprint`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint)
- **Binary/script location:** `$FREESURFER_HOME/bin/csvprint`
- **External tools called:** none — it uses Python's built-in `csv` module ([`scripts/csvprint:18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L18), [`:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L140)).

## Purpose and Context

Many FreeSurfer and external pipelines emit tabular results as CSV/TSV — e.g. the
per-structure volume table from [[mri_synthseg]], ADNI demographic spreadsheets,
or GSP label tables. Often a script needs just one or a few columns from such a
table (a single value, or one column per subject), without pulling in a full
spreadsheet library. `csvprint` fills that niche: a dependency-free,
header-aware column selector with a couple of dataset-specific row filters baked
in for the ADNI and GSP cohorts the FreeSurfer group works with.

The in-tree use is in [[wiki/pipelines/recon-all|recon-all]]
([`scripts/recon-all:1670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1670)), which extracts the
`total intracranial` volume from the SynthSeg CSV and stores it as the eTIV
estimate:

```tcsh
set synthsegcsv = $subjdir/stats/synthseg.vol.csv
set synthsegtiv = $subjdir/stats/synthseg.tiv.dat
if(-e $synthsegcsv) then
  set ud = `UpdateNeeded $synthsegtiv $synthsegcsv`
  csvprint --csv $synthsegcsv --f "total intracranial" > $synthsegtiv
endif
```

Note the field name `"total intracranial"` contains a space and is quoted — a
single value, written to `synthseg.tiv.dat`.

## Inputs

### Required Inputs

- **`--csv <file>`** — the CSV (or TSV) file to read; its first row must be the
  header of field names ([`scripts/csvprint:50-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L50-L53)). Required — omitting it
  prints `ERROR: csv file needed` and exits `1`
  ([`scripts/csvprint:102-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L102-L105)).
- **`--f` / `--field <field1> [field2 ...]`** — one or more field (column) names
  to print, matched **exactly** against the header
  ([`scripts/csvprint:54-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L54-L58)). Required — omitting it prints
  `ERROR: field needed` and exits `1` ([`scripts/csvprint:106-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L106-L109)). A
  requested field absent from the header is a hard error
  ([`scripts/csvprint:173-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L173-L181)).

### Input Assumptions

> [!assumption] First row is a header; field names match exactly
> The first row is consumed as the header and used to map field **names** to
> **column indices** ([`scripts/csvprint:145-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L145-L183)). Field matching is
> exact and case-sensitive (Python `in`/`list.index`), so `"Total Intracranial"`
> will not match a header `"total intracranial"`. Quoting (`"`) is honoured by the
> `csv` reader, so fields containing the delimiter are parsed correctly
> ([`scripts/csvprint:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L140)).

> [!gotcha] Delimiter is decided by file extension, overriding `--tsv`
> Although there is a `--tsv` flag, the final delimiter is set **after** argument
> parsing from the file extension: a `.csv` name forces comma and a `.tsv` name
> forces tab ([`scripts/csvprint:133-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L133-L135)). So `csvprint --tsv --csv
> data.csv …` still parses with commas. `--tsv` only matters for files whose
> extension is neither `.csv` nor `.tsv`. Code is authoritative here.

## Outputs

### Files Created

None — `csvprint` writes only to **stdout**. (Callers redirect it to a file,
e.g. `> synthseg.tiv.dat`.) Each kept row produces one output line: the selected
fields' values in the order requested, each followed by a single space, then a
newline ([`scripts/csvprint:211-215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L211-L215)).

### Output Specifications — the output / exit-code contract

| Channel | Content |
|---------|---------|
| stdout | One line per surviving data row; within a line, the chosen fields are printed in request order, **space-separated, with a trailing space** before the newline ([`scripts/csvprint:211-215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L211-L215)). With no rows passing the filters, output is empty. |

| Exit status | Meaning |
|-------------|---------|
| `0` | Normal completion ([`scripts/csvprint:219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L219)), **including** the "no arguments → print help" case ([`scripts/csvprint:126-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L126-L128)). |
| `1` | A usage/validation error: unknown flag ([`:83-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L83-L85)), a flag missing its argument ([`:33-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L33-L36)), missing `--csv`/`--f` ([`:102-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L102-L109)), or a requested/needed field (`--f` field, or `RID`/`VISCODE`/`Label` when the corresponding filter is used) not present in the header ([`:149-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L149-L181)). |

> [!gotcha] No-argument run "succeeds" (exit 0) and prints help
> Running `csvprint` with no arguments prints the USAGE block and exits **0**
> ([`scripts/csvprint:125-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L125-L128)), not a non-zero "no input" error. There
> is no `-help`/`--help` flag — passing `--help` is an *unrecognised flag* and
> exits `1` ([`scripts/csvprint:83-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L83-L85)).

## Mathematical Foundations

None — `csvprint` performs no numerical computation. The only transformation that
is more than a string copy is the **subject-name → RID** conversion under `--s`,
which strips leading zeros by round-tripping through an integer:
`int("0041") = 41` ([`scripts/csvprint:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L67)). Selection, filtering, and
printing are all done by string equality and list indexing.

## Configuration Options

### Complete Flag Reference

All flags are parsed in `parse_args`
([`scripts/csvprint:39-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L39-L89)). The multi-value flags (`--f`, `--rid`,
`--s`, `--v`, `--l`) greedily consume following arguments **until the next flag**,
where "a flag" is any token of length ≥ 3 starting with `--`
([`scripts/csvprint:92-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L92-L96)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--csv` | string | *(required)* | Input table file. May be CSV or TSV; the delimiter is taken from the `.csv`/`.tsv` extension (see gotcha) ([`scripts/csvprint:50-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L50-L53)). |
| `--field`<br>`--f` | string list | *(required)* | One or more header field names to print, in the order given. Consumes all following non-flag tokens ([`scripts/csvprint:54-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L54-L58)). |
| `--rid`<br>`--RID` | string list | *(none)* | **ADNI filter.** Keep only rows whose `RID` column value is in this list. Requires a `RID` header column, else error ([`scripts/csvprint:59-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L59-L63), [`:149-154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L149-L154)). |
| `--s` | string list | *(none)* | **ADNI filter by FreeSurfer subject name.** Each value is converted to a RID by stripping leading zeros (`int()`), then used exactly like `--rid` ([`scripts/csvprint:64-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L64-L68)). |
| `--v`<br>`--viscode` | string list | *(none)* | **ADNI filter.** Keep only rows whose `VISCODE` (visit code) is in this list. Requires a `VISCODE` header column ([`scripts/csvprint:69-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L69-L73), [`:157-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L157-L162)). |
| `--l`<br>`--label` | string list | *(none)* | **GSP filter.** Keep only rows whose `Label` column is in this list. Requires a `Label` header column ([`scripts/csvprint:74-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L74-L78), [`:164-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L164-L169)). |
| `--tsv` | bool | comma | Set the delimiter to tab — but only effective when the file extension is not `.csv`/`.tsv`, which override it ([`scripts/csvprint:79-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L79-L80), [`:133-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L133-L135)). |
| `--debug` | bool | off | Print each parsed flag to stdout while parsing ([`scripts/csvprint:81-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L81-L82)). |

Any other `--`-token is an unrecognised flag → `ERROR: flag <x> not recognized`,
exit `1` ([`scripts/csvprint:83-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L83-L85)).

### Configuration Interactions

- **Filters are ANDed.** If more than one of `--rid`/`--s`, `--v`, `--l` is
  given, a row must satisfy *all* of them to be printed: each filter `continue`s
  (skips the row) independently ([`scripts/csvprint:187-196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L187-L196)).
- **`--s` and `--rid` share one list.** Both append to the same `ridlist`
  ([`scripts/csvprint:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L62), [`:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L67)); using both just unions the RIDs
  (after `--s`'s leading-zero stripping). There is no conflict.
- **A filter requires its key column.** Using `--rid`/`--s` needs a `RID` column;
  `--v` needs `VISCODE`; `--l` needs `Label`. The check happens once, on the
  header row, and is fatal if the column is absent
  ([`scripts/csvprint:149-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L149-L169)). The printed `--f` fields are independent
  of the filter columns — you can filter on `RID` but print only `total
  intracranial`.

> [!gotcha] Multi-value flags swallow tokens until the next `--xxx`
> Because `--f a b c` keeps consuming arguments until something that looks like a
> flag, you cannot interleave a positional after a list flag. Put `--csv` and any
> bare values *before* the greedy list flags, or end the list with the next flag.
> A token shorter than 3 characters, or one not starting with `--`, is treated as
> a value, not a flag ([`scripts/csvprint:92-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L92-L96)) — e.g. a lone `-x`
> would be (mis)read as a field value.

## Typical Use Cases

### Use Case 1: Pull one value (recon-all eTIV idiom)

```bash
# Extract the total intracranial volume from the SynthSeg CSV.
csvprint --csv synthseg.vol.csv --f "total intracranial" > synthseg.tiv.dat
```

([`scripts/recon-all:1670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1670))

### Use Case 2: Print several columns

```bash
# One line per row, with Left-Hippocampus then Right-Hippocampus.
csvprint --csv aseg.vol.csv --f Left-Hippocampus Right-Hippocampus
```

### Use Case 3: ADNI subset (filter + select)

```bash
# Only RID 41 and 137, only the baseline visit, print the hippocampal volume.
csvprint --csv adni_long.csv --rid 41 137 --v bl --f Hippocampus
# Equivalent using FreeSurfer subject names (leading zeros stripped):
csvprint --csv adni_long.csv --s 0041 0137 --v bl --f Hippocampus
```

### Use Case 4: Tab-separated file

```bash
# .tsv extension selects the tab delimiter automatically.
csvprint --csv table.tsv --f subject thickness
```

## Pipeline Context

`csvprint` is a **table-extraction utility**, not a numbered processing stage. It
is, however, invoked *inside* [[wiki/pipelines/recon-all|recon-all]] during the
SynthSeg-based segmentation/eTIV step: after [[mri_synthseg]] writes its volume
CSV, `csvprint` reads back the `total intracranial` value into
`stats/synthseg.tiv.dat` ([`scripts/recon-all:1664-1672`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1664-L1672)). It is not
tied to a single autorecon stage and is otherwise a general-purpose helper.

**Predecessor:** a tool that emits a CSV/TSV table (e.g. [[mri_synthseg]],
[[asegstats2table]]) → **csvprint** → **Successor:** whatever consumes the
extracted value/columns (here, the eTIV file used later in recon-all stats).

## Gotchas and Caveats

> [!gotcha] Rows with a missing/empty selected field are silently dropped
> Before printing, each selected column is checked; if a row is too short or any
> selected cell is empty, the whole row is skipped with no message
> ([`scripts/csvprint:198-208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L198-L208)). So the number of output lines can be
> fewer than the number of data rows, and blank cells vanish rather than printing
> as empty.

> [!gotcha] Trailing space on every output line
> Each value is written with a `"%s "` format (value + space), and a bare newline
> ends the line ([`scripts/csvprint:213-215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L213-L215)). Every line therefore ends in
> a space before the newline. Downstream parsers that split on whitespace are
> unaffected, but an exact string compare against the line will see the trailing
> space. (recon-all reads the single value via shell `set`, which trims it.)

> [!gotcha] The missing-cell length test is off by one
> The guard uses `if(len(row) < i)` to detect a too-short row
> ([`scripts/csvprint:201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L201), [`:212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L212)), but a valid index `i` needs
> `len(row) > i` (equivalently the test should be `len(row) <= i`). For a row that
> is short by exactly one column (`len(row) == i`), the guard does not fire and
> the subsequent `row[i]` raises an `IndexError`. In practice rows are usually
> full or padded, so this rarely triggers, but a ragged final column can crash the
> script. Code is authoritative — this is the actual behaviour.

> [!gotcha] `--s` requires numeric subject names
> The subject→RID conversion is `int(subj)`; a non-numeric subject name (e.g.
> `bert`) raises a `ValueError` and aborts ([`scripts/csvprint:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L67)). `--s`
> is meant for ADNI-style zero-padded numeric IDs only.

## Error Compensation and Guard Rails

- **Required-argument checks**: missing `--csv` or `--f` is fatal with a clear
  message ([`scripts/csvprint:102-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L102-L109)); a flag that needs a value but
  has none triggers `argnerr` and exit `1` ([`scripts/csvprint:33-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L33-L36)).
- **Header validation**: every requested `--f` field — and the `RID`/`VISCODE`/
  `Label` columns when their filters are used — is verified against the header
  before any data row is processed; a missing column is fatal
  ([`scripts/csvprint:149-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L149-L181)).
- **Missing-data rows are skipped** rather than printed with blanks
  ([`scripts/csvprint:198-208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L198-L208)).
- **Delimiter auto-detection** from the extension protects against a `--tsv`/`.csv`
  mismatch by letting the extension win ([`scripts/csvprint:133-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L133-L135)).
- No compensation for a malformed header, a too-short row by exactly one column
  (see the off-by-one gotcha), or a non-numeric `--s` value.

## Known Bugs

- [[00173]] — off-by-one row-length guard `len(row)<i` (should be `<=`) raises `IndexError` on a row short by exactly one column; `--tsv` is silently overridden by the file extension.

## Related Tools

- [[mri_synthseg]] — produces the volume CSV (`synthseg.vol.csv`) that `csvprint` reads inside recon-all for the eTIV estimate.
- [[wiki/pipelines/recon-all|recon-all]] — the in-tree caller; uses `csvprint` to extract `total intracranial`.
- [[asegstats2table]] — a richer, FreeSurfer-aware table builder/extractor for `aseg`/`aparc` stats; `csvprint` is the minimalist, dependency-free counterpart for generic CSV/TSV.
- [[stats-format]] — the FreeSurfer stats-table conventions that such CSV/TSV outputs follow.

## Confidence and Gaps

**High confidence.** The complete flag set, the greedy multi-value parsing, the
extension-based delimiter override, the AND-ed filters, the missing-row skip, the
trailing-space output, and the off-by-one length guard were all read directly
from [`scripts/csvprint`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint), and the recon-all call site was
confirmed in [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all). No unresolved
questions.

## References

- FreeSurfer source: [`scripts/csvprint`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint) (v8.2.0).
- Caller: [`scripts/recon-all:1670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1670) (SynthSeg eTIV extraction).
- Built-in usage: `csvprint` with no arguments ([`scripts/csvprint:21-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/csvprint#L21-L29)).
- Cohorts referenced by the filters: ADNI (`RID`/`VISCODE`), GSP (`Label`).
