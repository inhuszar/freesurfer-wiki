---
title: "long_stats_tps"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_stats_tps"
families: ["long_*"]
recon_all_stage: null
related:
  - "[[long_stats_slopes]]"
  - "[[long_submit_postproc]]"
  - "[[long_submit_jobs]]"
  - "[[longitudinal-processing]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "When --qcol is combined with --stats/--meas/--sd the help text says a column 'will be appended to the stats tables', but options_parse() makes --qcol mutually exclusive with those flags (exits with an error), so the 'append' behaviour described in the help is not reachable in this version. Recorded as a contradiction."
tags:
  - longitudinal
  - statistics
  - aggregation
  - timepoint
---

# long_stats_tps

## Summary

`long_stats_tps` extracts the stats for **one chosen time point** from every
subject in a longitudinal study and stacks them into a single table (one row per
subject). For the time point number you request, it walks the longitudinal qdec
table, identifies each subject's `<tpNid>.long.<template>` directory for that time
point, and uses [[asegstats2table]] (or [[aparcstats2table]] for a `lh.`/`rh.`
stats file) to assemble a cross-subject table of the chosen measure. Alternatively
(`--qcol`) it can pull a single column straight out of the qdec table for that
time point, without touching any stats file. It is the time-point analogue of
[[long_stats_slopes]], which instead fits a slope across time points.

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`; uses `optparse`)
- **Source file:** [`scripts/long_stats_tps`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps)
- **Binary/script location:** `$FREESURFER_HOME/bin/long_stats_tps`
- **Key library import:** `LongQdecTable`, `BadFileError` from `fsbindings.legacy` ([`scripts/long_stats_tps:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L34)).
- **FreeSurfer tools invoked:** [`asegstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L302) / [`aparcstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L307) (the actual stacking). Note: the sibling script `long_stats_combine` carries the same `long_stats_tps` header comment and shares this code lineage.

## Purpose and Context

When analysing a longitudinal study you often want a single cross-subject table
for one specific visit — for example, "everyone's hippocampal volume at baseline"
or "everyone's cortical thickness at the third time point". `long_stats_tps`
produces exactly that: given a time-point index, it gathers the corresponding
`<tpNid>.long.<template>` stats from every subject and stacks them into one
stats-table.

This complements [[long_stats_slopes]] (which derives rate/percent-change *across*
time points): use `long_stats_tps` when you want the raw measured values at a
fixed visit, and `long_stats_slopes` when you want change measures. It is run **by
hand** after the longitudinal recon-all runs finish, or dispatched per-subject by
[[long_submit_postproc]]. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]. See [[longitudinal-processing]] for the
surrounding pipeline.

## Inputs

### Required Inputs

- **Longitudinal qdec table** (`--qdec`) — whitespace-delimited; first two
  columns `fsid` and `fsid-base`. Parsed by `LongQdecTable`
  ([`scripts/long_stats_tps:213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L213)). Comment lines start with `#`.
- **Time point number** (`--tp`, integer) — which time point to extract
  (1-based; `--tp 1` is the first listed time point of each subject).
- **Output file name** (`--out`) — path/name of the stacked table to write.

Plus **either** the stats trio **or** the `--qcol` alternative:

- Stats mode (default): **`--stats`** (stats filename without path, e.g.
  `aseg.stats` or `lh.aparc.stats`), **`--meas`** (measure column, e.g. `volume`,
  `thickness`), and **`--sd`** (full path to the subjects dir).
- Column mode: **`--qcol`** (a column name in the qdec table) — then `--stats`,
  `--meas`, and `--sd` are **not** used.

### Input Assumptions

> [!assumption] Longitudinally-processed inputs and a deep-enough qdec table
> The script assumes the `<tpNid>.long.<template>/stats/` directory for the
> requested time point already exists for every subject; it checks for the stats
> directory and aborts if missing ([`scripts/long_stats_tps:280-283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L280-L283)). Every subject must list **at least `--tp`
> time points**, or the run errors ([`scripts/long_stats_tps:258-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L258-L260)). The qdec table must be longitudinal (2nd
> column `fsid-base`); a cross-sectional table is rejected
> ([`scripts/long_stats_tps:221-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L221-L223)).

> [!gotcha] Time-point ordering follows the qdec table, not any time variable
> `--tp N` selects the *N*-th time point **as listed for that subject** in the
> qdec table (`tplist[options.tp-1]`, [`scripts/long_stats_tps:263`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L263), [`267-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L267-L269)). It does **not** sort by age or any
> time column. Make sure your qdec rows are in the intended temporal order.

## Outputs

### Files Created

- **`--out`** — a single stacked stats-table. In stats mode it has one row per
  subject template (the time-point id `<tpNid>.long.<template>`) and region
  columns of the chosen measure, written by `asegstats2table`/`aparcstats2table`
  ([`scripts/long_stats_tps:308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L308)). In `--qcol` mode it is a two-column
  text file: a `Measure <qcol>` header followed by one `<tpid> <value>` line per
  subject ([`scripts/long_stats_tps:287-295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L287-L295)).

No temporary directories are created; the stacking tool writes `--out` directly.

### Output Specifications

The stats-mode output is a standard FreeSurfer stats-table (whitespace-separated,
`-d space`): a header row of region/segmentation names and one numeric data row
per subject for the requested time point. The `--qcol` output is a minimal
two-column table of the raw qdec values. Units are inherited from the source
stats measure (e.g. volume in mm³, thickness in mm).

## Mathematical Foundations

None — `long_stats_tps` performs **no numerical computation** of its own. It is a
selector and dispatcher: it picks the requested time-point id per subject and
hands the list to `asegstats2table`/`aparcstats2table`, which read and tabulate
the values. (Contrast [[long_stats_slopes]], which fits a linear model.)

## Configuration Options

### Complete Flag Reference

Enumerated from the `optparse` setup ([`scripts/long_stats_tps:117-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L117-L186)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string | *(required)* | Longitudinal qdec table; first two columns `fsid fsid-base`. |
| `--tp` | int | *(required)* | Time-point number to extract (1-based, in qdec listing order). |
| `--out` | string | *(required)* | Output filename for the stacked table. |
| `--stats` | string | required unless `--qcol` | Stats filename without path, e.g. `aseg.stats`, `lh.aparc.stats`. A `lh.`/`rh.` prefix routes to `aparcstats2table`. |
| `--meas` | string | required unless `--qcol` | Measure (column) to extract, e.g. `volume`, `thickness`, `mean`, `std`. |
| `--sd` | string | required unless `--qcol` | Full path to the subjects dir holding the `.long.` directories. Exported as `SUBJECTS_DIR`. |
| `--qcol` | string | off | **Alternative** to the stats trio: extract this column from the qdec table itself for the chosen time point (no stats file read). |
| `--cross` | bool | off | Use cross-sectional `<tpNid>` directories instead of `<tpNid>.long.<template>` (testing only). |

### Configuration Interactions

> [!gotcha] `--qcol` is mutually exclusive with `--stats` / `--meas` / `--sd`
> If `--qcol` is given, supplying any of `--stats`, `--meas`, or `--sd` is a hard
> error ("either specify --qcol OR --sd --meas --stats",
> [`scripts/long_stats_tps:168-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L168-L171)). Choose one mode: tabulate a
> stats measure, **or** pull a qdec column. When `--qcol` is absent, all three of
> `--stats`/`--meas`/`--sd` are required ([`scripts/long_stats_tps:158-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L158-L167)).

> [!contradiction] Help text vs. code on combining `--qcol` with stats
> The help block says that if `--qcol` is "specifed in addition to the above, a
> column will be appended to the stats tables"
> ([`scripts/long_stats_tps:71-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L71-L74)). The argument parser, however, treats
> `--qcol` and the stats trio as mutually exclusive and exits with an error if
> both are given ([`scripts/long_stats_tps:168-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L168-L171)). **Code is
> authoritative:** in v8.2.0 the "append a qdec column to the stats table"
> behaviour is not reachable.

> [!gotcha] `--cross` defeats the longitudinal stream
> `--cross` reads cross-sectional `<tpNid>` directories rather than the unbiased
> `<tpNid>.long.<template>` results ([`scripts/long_stats_tps:266-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L266-L269)). It exists for testing and should not be used for
> analysis.

## Typical Use Cases

### Use Case 1: Baseline hippocampal/subcortical volumes across subjects

```bash
# Stack the aseg volumes at the first time point into one cross-subject table.
long_stats_tps \
  --qdec long.qdec.table.dat \
  --stats aseg.stats --meas volume \
  --sd $SUBJECTS_DIR \
  --tp 1 \
  --out aseg.volume.tp1.dat
```

### Use Case 2: Cortical thickness at the third visit (left hemisphere)

```bash
long_stats_tps \
  --qdec long.qdec.table.dat \
  --stats lh.aparc.stats --meas thickness \
  --sd $SUBJECTS_DIR \
  --tp 3 \
  --out lh.aparc.thickness.tp3.dat
```

### Use Case 3: Pull a qdec column (e.g. age) at a given time point

```bash
# No stats file involved — just the 'age' column at time point 2.
long_stats_tps \
  --qdec long.qdec.table.dat \
  --qcol age \
  --tp 2 \
  --out age.tp2.dat
```

## Pipeline Context

`long_stats_tps` is a **post-processing / analysis** tool, run after the
longitudinal recon-all stream completes. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]]. On a cluster it is typically submitted
per-subject by [[long_submit_postproc]] (any script taking `--qdec`).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] longitudinal runs
(`<tpNid>.long.<template>/stats/`) → **`long_stats_tps`** → **Successor:** group
analysis on the stacked table (e.g. import into a spreadsheet, or feed to a
group GLM together with the outputs of [[long_stats_slopes]]).

See [[longitudinal-processing]] for the full picture, and [[long_stats_slopes]]
for change-over-time measures.

## Gotchas and Caveats

> [!gotcha] Subjects with too few time points abort the whole run
> If any subject lists fewer than `--tp` time points, the script prints an error
> and exits immediately ([`scripts/long_stats_tps:258-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L258-L260)) — it does
> not skip that subject. Drop short subjects from the qdec table (or comment out
> their rows with `#`) before extracting a late time point.

> [!gotcha] Exits 0 on success but hard-exits on any sub-step failure
> The script ends with `sys.exit(0)` ([`scripts/long_stats_tps:313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L313)),
> but the `run_cmd` wrapper around the stacking call exits 1 on a non-zero return
> ([`scripts/long_stats_tps:189-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L189-L199)).

## Error Compensation and Guard Rails

- **Cross-sectional qdec rejected** ([`scripts/long_stats_tps:221-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L221-L223)).
- **Per-subject time-point count enforced** against `--tp` ([`scripts/long_stats_tps:258-260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L258-L260)).
- **Stats directory existence checked** before stacking ([`scripts/long_stats_tps:280-283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L280-L283)).
- **`--qcol` column must exist** in the qdec variables, else it errors with the
  list of available columns ([`scripts/long_stats_tps:230-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L230-L240)).
- **`SUBJECTS_DIR` is set** from `--sd` so the called table tools resolve the
  subjects ([`scripts/long_stats_tps:244-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L244-L247)).

## Related Tools

- [[long_stats_slopes]] — sibling that fits a **slope across** time points
  (rate, percent change) instead of extracting one time point.
- [[long_submit_postproc]] — dispatches `long_stats_tps` (or any `--qdec` script)
  per-subject on a cluster.
- [[long_submit_jobs]] — submits the cross/base/long recon-all runs that produce
  the inputs.
- [[asegstats2table]] — stacks volumetric/segmentation stats (used in stats mode).
- [[aparcstats2table]] — stacks surface parcellation stats (used for `lh.`/`rh.`
  stats files).
- [[longitudinal-processing]] — the concept page for the whole stream.

## Confidence and Gaps

**High confidence:** the complete flag set, the two operating modes (stats vs.
`--qcol`) and their mutual exclusion, the 1-based time-point selection in qdec
order, the routing between `asegstats2table` and `aparcstats2table`, and the
guard rails — all read directly from
[`scripts/long_stats_tps`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps).

> [!gap] Unreachable "append qcol to stats" path
> The help text advertises appending a qdec column to a stats table when `--qcol`
> is combined with `--stats`, but the parser forbids that combination
> ([`scripts/long_stats_tps:168-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps#L168-L171)). Either the help is stale or a code
> path was removed; the feature is not available in v8.2.0.

## References

- FreeSurfer source: [`scripts/long_stats_tps`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_tps) (v8.2.0).
- Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181-1196, 2010. <http://dx.doi.org/10.1016/j.neuroimage.2010.07.020>
- Reuter M, Fischl B. *Avoiding Asymmetry-Induced Bias in Longitudinal Image Processing.* NeuroImage 57(1):19-21, 2011. <http://dx.doi.org/10.1016/j.neuroimage.2011.02.076>
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. <http://dx.doi.org/10.1016/j.neuroimage.2012.02.084>
