---
title: "long_stats_slopes"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_stats_slopes"
families: ["long_*"]
recon_all_stage: null
related:
  - "[[long_stats_tps]]"
  - "[[long_submit_postproc]]"
  - "[[long_submit_jobs]]"
  - "[[longitudinal-processing]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mris_calc]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The X design matrix is written but the inline comment shows an alternative centering (time-meant) that is commented out; the active build centers on times[0] (tp1). Confirmed from code, but the rationale for choosing tp1 over mean centering for the design matrix is not documented in the source."
  - "Behaviour of the GLM fit when more than 2 time points are non-monotonic in the time variable is not validated here; mri_glmfit is treated as a black box."
tags:
  - longitudinal
  - statistics
  - slopes
  - glm
  - aggregation
---

# long_stats_slopes

## Summary

`long_stats_slopes` fits a **within-subject linear model** to a longitudinal
FreeSurfer stats measure (e.g. `volume`, `thickness`, `mean`) and derives
per-subject **change measures** from it: the rate of change (slope), several
flavours of percent change, the temporal average, and optionally GLM residuals.
For every `fsid-base` (subject template) listed in a longitudinal qdec table, it
stacks the per-time-point stats from the `<tpNid>.long.<template>` directories
into a time-series table, fits a straight line of measure-versus-time with
[[wiki/tools/mri_glmfit|mri_glmfit]], and writes the resulting derived measures
into that subject's `<template>/stats/` directory as stats-tables. It can also
concatenate the per-subject results across the whole study into a single stacked
table ready for group analysis.

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`; uses `optparse`)
- **Source file:** [`scripts/long_stats_slopes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes)
- **Binary/script location:** `$FREESURFER_HOME/bin/long_stats_slopes`
- **Key library import:** `LongQdecTable`, `BadFileError` from `fsbindings.legacy` ([`scripts/long_stats_slopes:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L34)) — the longitudinal qdec-table parser.
- **FreeSurfer tools invoked:** [`asegstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L450) / [`aparcstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L455) (stack the per-tp stats), [`mri_glmfit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L479) (the linear fit), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L492) (split GLM β frames, convert to/from stats-tables), [`mris_calc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L499) (arithmetic on the β maps), [`mri_concat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L525) (residual L1 norm), and [`merge_stats_tables`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L624) (cross-subject stacking).

## Purpose and Context

In the FreeSurfer longitudinal stream each subject contributes several time
points, all processed against an unbiased within-subject template (the `base`),
producing `<tpNid>.long.<template>` directories. The scientifically interesting
quantity is usually not the value at any single time point but **how a structure
changes over time** — atrophy rate, cortical thinning per year, percent change.
`long_stats_slopes` automates that per-subject computation:

1. It reads the longitudinal qdec table to learn which time points belong to
   which subject template and what the time variable is (e.g. `age`).
2. For each subject it assembles the longitudinal per-time-point stats into a
   single table (one row per time point).
3. It fits a straight line (intercept + slope) of the measure against time using
   [[wiki/tools/mri_glmfit|mri_glmfit]].
4. From the two fit coefficients ($\beta_0$, $\beta_1$) it derives the requested
   change measures and writes them, per region, into the subject's
   `<template>/stats/` directory in the same stats-table format the rest of
   FreeSurfer's group tools consume.

It is run **by hand** (or dispatched per-subject by [[long_submit_postproc]] on a
cluster), *after* the longitudinal recon-all runs have finished. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]] itself; it is a post-processing
/ analysis tool that sits downstream of the long stream. The closely related
[[long_stats_tps]] extracts a *single* time point's values rather than fitting a
slope. See [[longitudinal-processing]] for the surrounding pipeline.

## Inputs

### Required Inputs

- **Longitudinal qdec table** (`--qdec`) — a whitespace-delimited text table
  whose first two columns are `fsid` and `fsid-base`. `fsid` is the
  cross-sectional id of one time point; `fsid-base` is the within-subject
  template id that groups time points belonging to the same subject. The third
  column is taken as the time variable by default (overridable with `--time`).
  Lines beginning with `#` are comments. Parsed by `LongQdecTable`
  ([`scripts/long_stats_slopes:342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L342)).
- **Stats file name** (`--stats`) — the basename (no path) of the stats file to
  read inside each `<tpNid>.long.<template>/stats/` directory, e.g. `aseg.stats`
  or `lh.aparc.stats`. A leading `lh.`/`rh.` switches the stacker from
  `asegstats2table` to `aparcstats2table` ([`scripts/long_stats_slopes:451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L451-L455)).
- **Measure** (`--meas`) — the column of the stats file to analyse, e.g.
  `volume`, `thickness`, `mean`, `std`.
- **Subjects dir** (`--sd`) — full path to the FreeSurfer `SUBJECTS_DIR` that
  holds the templates and `.long.` directories. If omitted, the script falls
  back to `$SUBJECTS_DIR`, then to the directory recorded in the qdec table
  ([`scripts/long_stats_slopes:384-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L384-L391)).
- **At least one computation** must be requested — see the flag table. The script
  exits with an error if none of `--do-avg`, `--do-rate`, `--do-pc1fit`,
  `--do-pc1`, `--do-spc`, or `--resid` is active ([`scripts/long_stats_slopes:285-288`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L285-L288)).

Each subject must have **at least two time points** ([`scripts/long_stats_slopes:418-420`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L418-L420)), and the per-subject template directory `<sd>/<template>` must already exist.

### Input Assumptions

> [!assumption] Longitudinally-processed inputs already exist
> The script assumes every `<tpNid>.long.<template>` directory has already been
> produced by the longitudinal recon-all stream and contains the named stats file
> with the named measure column. The time-series table is built by
> `asegstats2table`/`aparcstats2table` reading those directories; if a
> `.long.` directory or its stats file is missing, the underlying stacker
> fails and `long_stats_slopes` aborts. The qdec table's second column **must**
> be `fsid-base` (a cross-sectional table is rejected, [`scripts/long_stats_slopes:349-351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L349-L351)).

> [!gotcha] The time variable must be present (or use `--generic-time`)
> By default the script needs a numeric time column in the qdec table (the 3rd
> column, or the one named by `--time`). If the qdec table has *no* variable
> columns at all and `--generic-time` is not given, it errors and tells you to
> add a time column ([`scripts/long_stats_slopes:358-364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L358-L364)). `--generic-time`
> assumes the time points are listed in temporal order and assigns
> $t = 1, 2, 3, \dots$ Use real ages/times whenever possible, because the rate
> units (per year, etc.) come directly from the time column.

## Outputs

### Files Created

All per-subject outputs are written into `<sd>/<template>/stats/`. Default names
embed the stats file and measure; pass the matching `--out-*` flag to rename.
With the default `long.` prefix (it becomes `cross.` only under `--cross`):

| File (default name) | Produced by flag | Contents |
|---------------------|------------------|----------|
| `long.<stats>.<meas>-rate.dat` | `--do-rate` / `--out-rate` | Slope $\beta_1$ per region — the rate of change in measure-units per time-unit. |
| `long.<stats>.<meas>-pc1.dat` | `--do-pc1` / `--out-pc1` | Percent change relative to the **actual** tp1 value: $100\,\beta_1/\text{tp1}$. |
| `long.<stats>.<meas>-pc1fit.dat` | `--do-pc1fit` / `--out-pc1fit` | Percent change relative to the **fitted** tp1 value: $100\,\beta_1/\beta_0$ (recommended over `pc1`). |
| `long.<stats>.<meas>-spc.dat` | `--do-spc` / `--out-spc` | Symmetrized percent change: rate over the temporal average, $100\,\beta_1/\beta_m$. |
| `long.<stats>.<meas>-avg.dat` | `--do-avg` / `--out-avg` | Temporal average $\beta_m$ — the linear fit evaluated at the mean time. |
| `long.<stats>.<meas>-stack.dat` | `--do-stack` / `--out-stack` | The raw time-series table (one row per time point) for the subject. |
| `long.<stats>.<meas>-resid<N>.dat` | `--resid <N>` (N≥1) / `--out-resid` | GLM residual at time point *N* (per region). |
| `long.<stats>.<meas>-resid-mean.dat` | `--resid 0` / `--out-resid` | Mean absolute (L1) residual across time points. |

Optionally, **study-level stacked tables** (one row per subject) are written to
the explicit paths given by `--stack-avg`, `--stack-rate`, `--stack-pc1`,
`--stack-pc1fit`, `--stack-spc`, and `--stack-resid`, by concatenating the
per-subject files with `merge_stats_tables` ([`scripts/long_stats_slopes:622-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L622-L645)).

A per-subject temporary directory `./tmp-<template>_<stats>_<meas>_XXXX` is
created in the **current working directory** for intermediate GLM files and is
removed on success ([`scripts/long_stats_slopes:423-424`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L423-L424), [`615`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L615)).

### Output Specifications

Each `*.dat` output is a FreeSurfer **stats-table**: a whitespace-separated text
table with a `Measure:<meas>-<kind>` header cell, region/segmentation names as
columns, and one data row per subject template (created via
`mri_convert --out_stats_table --like <template> …`,
[`scripts/long_stats_slopes:518`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L518)). The numerical units depend on the
measure and the time variable: a `volume` rate with `age` in years is
mm³/year; a `thickness` rate is mm/year. Negative values denote shrinkage /
thinning.

## Mathematical Foundations

For each subject the script fits the ordinary-least-squares line

$$y_i \approx \beta_0 + \beta_1\,(t_i - t_1)$$

where $y_i$ is the measure at time point $i$ and $t_i$ is the time value. The
design matrix is written explicitly with the **first time point as the origin**
(`X-long.mat` rows are `1  (time - times[0])`, [`scripts/long_stats_slopes:465-467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L465-L467)), so the intercept $\beta_0$ is the **fitted value at tp1** and $\beta_1$ is the
**slope** (rate). The fit is performed by [[wiki/tools/mri_glmfit|mri_glmfit]],
which writes the two coefficients into `beta.mgh`; the script splits them into
`beta0.mgh` and `beta1.mgh` with `mri_convert --frame`.

The temporal-average coefficient is evaluated from the fit at the mean time
$\bar t$:

$$\beta_m = \beta_0 + (\bar t - t_1)\,\beta_1$$

computed by two `mris_calc` operations ([`scripts/long_stats_slopes:499-502`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L499-L502)). The derived measures are then:

> [!math] Derived change measures
> $$\text{rate} = \beta_1 \qquad
>   \text{pc1} = 100\,\frac{\beta_1}{y_1} \qquad
>   \text{pc1fit} = 100\,\frac{\beta_1}{\beta_0} \qquad
>   \text{spc} = 100\,\frac{\beta_1}{\beta_m} \qquad
>   \text{avg} = \beta_m$$
>
> `pc1` divides by the *measured* first time point ($y_1$, the first data row of
> the stacked table), whereas `pc1fit` divides by the *fitted* first time point
> ($\beta_0$); the latter is less noisy and is the recommended percent-change
> measure. `spc` (symmetrized percent change) normalises by the temporal average
> $\beta_m$ and is the most robust, but $\beta_m$ shifts if time points are added.

> [!math] Two-time-point degenerate fit
> With exactly two time points the model has zero residual degrees of freedom, so
> the script adds `--allow-zero-dof` to the `mri_glmfit` call
> ([`scripts/long_stats_slopes:472-473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L472-L473)). The slope is then just the
> finite difference $(y_2 - y_1)/(t_2 - t_1)$.

Residuals (`--resid`) are harvested from the GLM's `eres.mgh` (enabled with
`--eres-save`): `--resid N` (N≥1) extracts frame *N−1*; `--resid 0` produces the
mean absolute residual via `mri_concat --abs --mean` ([`scripts/long_stats_slopes:507-533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L507-L533)).

> [!internal] The GLM itself lives in mri_glmfit
> `long_stats_slopes` only sets up the design matrix and the per-region data
> table; the actual least-squares solution, residuals, and degrees-of-freedom
> handling are performed by [[wiki/tools/mri_glmfit|mri_glmfit]]. Per-region
> arithmetic on the coefficient "maps" is delegated to [[mris_calc]].

## Configuration Options

### Complete Flag Reference

Enumerated from the `optparse` setup ([`scripts/long_stats_slopes:137-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L137-L290)). Boolean flags take no argument.

#### Required arguments

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string | *(required)* | Longitudinal qdec table; first two columns `fsid fsid-base`. |
| `--stats` | string | *(required)* | Stats filename without path, e.g. `aseg.stats`, `lh.aparc.stats`. A `lh.`/`rh.` prefix routes to `aparcstats2table`. |
| `--meas` | string | *(required)* | Measure (column) to analyse, e.g. `volume`, `thickness`, `mean`, `std`. |
| `--sd` | string | `$SUBJECTS_DIR`, then qdec table value | Full path to the subjects dir holding the templates and `.long.` dirs. |

#### Computations (request at least one)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--do-rate` | bool | off | Output the slope (rate of change) $\beta_1$. |
| `--do-pc1` | bool | off | Output percent change relative to the measured tp1 value. |
| `--do-pc1fit` | bool | off | Output percent change relative to the fitted tp1 value (recommended over `--do-pc1`). |
| `--do-spc` | bool | off | Output symmetrized percent change (rate over temporal average). |
| `--do-avg` | bool | off | Output the temporal average (fit at mean time). |
| `--do-stack` | bool | off | Write the per-subject time-series table into the template stats dir (otherwise it stays in the temp dir). |
| `--resid` | int | `-1` (off) | Export GLM residuals: `N`≥1 = residual at time point *N*; `0` = mean absolute residual; `<0` = no residual export. |

#### Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--time` | string | 3rd qdec column | Name of the qdec column to use as the time variable (e.g. `age`). Must match a column header. |
| `--generic-time` | bool | off | Ignore the time column and assume time points are ordered, using $t=1,2,3,\dots$ |
| `--cross` | bool | off | Use cross-sectional `<tpNid>` directories instead of `<tpNid>.long.<template>` (testing only); also switches the output prefix from `long.` to `cross.`. |

#### Within-subject output names (each implies its computation)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--out-rate` | string | `long.<stats>.<meas>-rate.dat` | Rename the rate output. Supplying it forces `--do-rate`. |
| `--out-pc1` | string | `long.<stats>.<meas>-pc1.dat` | Rename the pc1 output. Forces `--do-pc1`. |
| `--out-pc1fit` | string | `long.<stats>.<meas>-pc1fit.dat` | Rename the pc1fit output. Forces `--do-pc1fit`. |
| `--out-spc` | string | `long.<stats>.<meas>-spc.dat` | Rename the spc output. Forces `--do-spc`. |
| `--out-avg` | string | `long.<stats>.<meas>-avg.dat` | Rename the average output. Forces `--do-avg`. |
| `--out-stack` | string | `long.<stats>.<meas>-stack.dat` | Rename the time-series table. Forces `--do-stack`. |
| `--out-resid` | string | `…-resid<N>.dat` / `…-resid-mean.dat` | Rename the residual output. **Requires** `--resid <N>`; supplying `--out-resid` without `--resid` is an error ([`scripts/long_stats_slopes:276-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L276-L278)). |

#### Study-level stacked tables (cross-subject)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--stack-rate` | string | off | Full path to a table stacking every subject's rate output. |
| `--stack-pc1` | string | off | Full path to a table stacking every subject's pc1 output. |
| `--stack-pc1fit` | string | off | Full path to a table stacking every subject's pc1fit output. |
| `--stack-spc` | string | off | Full path to a table stacking every subject's spc output. |
| `--stack-avg` | string | off | Full path to a table stacking every subject's average output. |
| `--stack-resid` | string | off | Full path to a table stacking every subject's residual output. |

### Configuration Interactions

> [!gotcha] `--out-*` silently turns on the matching computation
> Each `--out-<kind>` flag both renames the output **and** sets the corresponding
> `do_<kind>` to True ([`scripts/long_stats_slopes:252-283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L252-L283)). So `--out-rate myrate.dat`
> is enough to compute the rate; you do not also need `--do-rate`. This is the
> easiest way to accidentally produce an output you did not intend.

> [!gotcha] `--stack-<kind>` does not, by itself, compute that measure
> The cross-subject `--stack-*` flags only concatenate per-subject files that the
> per-subject loop already wrote. The stacking code joins
> `all<kind>` lists ([`scripts/long_stats_slopes:622-645`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L622-L645)) that are
> populated **only** when the matching computation ran. Always pair, e.g.,
> `--stack-rate` with `--do-rate` (or `--out-rate`); otherwise the stack is built
> from an empty input list.

> [!gotcha] `--out-resid` without `--resid` is rejected; `--resid` chooses tp vs. mean
> A residual export requires a time-point selector: `--resid N` (N≥1) for a
> specific time point, `--resid 0` for the mean absolute residual. Passing
> `--out-resid` alone exits with an error ([`scripts/long_stats_slopes:276-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L276-L278)), and the residual contributes to `do_something`
> only when `--resid >= 0`.

> [!gotcha] `--time` vs. `--generic-time`
> If both are meaningful, the explicit `--time <col>` is resolved first
> ([`scripts/long_stats_slopes:367-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L367-L379)); `--generic-time` only takes effect
> when there is no usable variable column. Use one or the other deliberately —
> generic time changes the *units* of every rate/percent-change output (per
> "time point" rather than per year).

## Typical Use Cases

### Use Case 1: Per-subject atrophy rate and symmetrized percent change for subcortical volumes

```bash
# For each subject template in the qdec table, fit aseg volume vs age and
# write rate + spc tables into <template>/stats/.
long_stats_slopes \
  --qdec long.qdec.table.dat \
  --stats aseg.stats --meas volume \
  --sd $SUBJECTS_DIR \
  --do-rate --do-spc --time age
```

### Use Case 2: Cortical thinning rate with a study-wide stacked table

```bash
# Left-hemisphere aparc thickness; also concatenate every subject's rate
# into one group table for downstream analysis.
long_stats_slopes \
  --qdec long.qdec.table.dat \
  --stats lh.aparc.stats --meas thickness \
  --sd $SUBJECTS_DIR \
  --do-rate --do-pc1fit \
  --stack-rate /analysis/lh.aparc.thickness-rate.all.dat
```

### Use Case 3: Generic (ordered) time when no age column is available

```bash
long_stats_slopes \
  --qdec long.qdec.table.dat \
  --stats aseg.stats --meas volume --sd $SUBJECTS_DIR \
  --do-rate --generic-time
```

## Pipeline Context

`long_stats_slopes` is a **post-processing / analysis** tool, run after the
longitudinal recon-all stream has completed for all subjects. It is **not**
invoked by [[wiki/pipelines/recon-all|recon-all]]. On a cluster, it is typically
dispatched per-subject by [[long_submit_postproc]], which writes a per-template
sub-table and submits one `long_stats_slopes --qdec <sub-table> …` job each.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] longitudinal runs
(`<tpNid>.long.<template>` directories with their `stats/` files) →
**`long_stats_slopes`** → **Successor:** group analysis with
[[wiki/tools/mri_glmfit|mri_glmfit]] / [[wiki/tools/qdec_glmfit|qdec_glmfit]] on
the stacked tables, or direct inspection in a spreadsheet.

See [[longitudinal-processing]] for the full cross → base → long → stats picture,
and [[long_stats_tps]] for extracting a single time point instead of a slope.

## Gotchas and Caveats

> [!gotcha] Temporary directory is created in the current working directory
> The per-subject temp dir is `mkdtemp` with prefix `./tmp-…`
> ([`scripts/long_stats_slopes:423-424`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L423-L424)), i.e. relative to **wherever you
> launched the command**, not the subjects dir. You therefore need write
> permission in the CWD. It is removed on success but may linger if a step
> aborts.

> [!gotcha] `spc` and `avg` shift when time points are added
> Because the temporal average $\beta_m$ is evaluated at the mean time of the
> *current* set of time points, both the symmetrized percent change and the
> average change if you later add a scan. The rate ($\beta_1$) and `pc1fit` are
> more stable references for re-analysis.

> [!gotcha] `--cross` is for testing only
> `--cross` reads the cross-sectional `<tpNid>` directories rather than the
> unbiased `<tpNid>.long.<template>` results and emits `cross.`-prefixed files.
> It bypasses the entire point of the longitudinal stream (reduced
> asymmetry-induced bias) and should not be used for real analysis.

> [!gotcha] Exits 0 even though sub-steps can hard-fail
> The script ends with `sys.exit(0)` ([`scripts/long_stats_slopes:650`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L650)),
> but every internal command is wrapped by `run_cmd`, which calls `sys.exit(1)`
> on any non-zero return ([`scripts/long_stats_slopes:293-303`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L293-L303)). So a
> mid-run failure does abort with status 1; the final `exit(0)` only applies once
> all subjects processed cleanly.

## Error Compensation and Guard Rails

- **Zero-DOF guard.** With two time points the GLM has no residual degrees of
  freedom, so `--allow-zero-dof` is added automatically
  ([`scripts/long_stats_slopes:472-473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L472-L473)).
- **Minimum time points enforced.** A subject with fewer than two time points is
  rejected with an explicit error ([`scripts/long_stats_slopes:418-420`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L418-L420)).
- **Cross-sectional qdec rejected.** A table whose 2nd column is not `fsid-base`
  is refused ([`scripts/long_stats_slopes:349-351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L349-L351)).
- **Subjects-dir resolution chain.** `--sd` → `$SUBJECTS_DIR` → value stored in
  the qdec table; if none resolves, it errors ([`scripts/long_stats_slopes:384-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L384-L391)).
- **macOS library path.** On Darwin it sets `DYLD_LIBRARY_PATH` to the bundled
  gcc libs so the called binaries load ([`scripts/long_stats_slopes:395-396`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L395-L396)).

## Related Tools

- [[long_stats_tps]] — sibling that **extracts a single time point's** stats (or a
  qdec column) into a stacked table, rather than fitting a slope.
- [[long_submit_postproc]] — dispatches `long_stats_slopes` (or any `--qdec`
  script) per-subject on a cluster.
- [[long_submit_jobs]] — submits the cross/base/long recon-all runs that produce
  the inputs this tool reads.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — performs the within-subject linear fit.
- [[mris_calc]] — per-region arithmetic on the β coefficient maps.
- [[wiki/tools/mri_convert|mri_convert]] — splits GLM frames and converts between
  `mgh` and stats-table formats.
- [[mri_concat]] — computes the mean absolute residual.
- [[asegstats2table]] / [[aparcstats2table]] — stack the per-time-point stats into
  the time-series table.
- `merge_stats_tables` *(no wiki page yet)* — concatenates per-subject outputs
  into the study-level `--stack-*` tables.
- [[longitudinal-processing]] — the concept page for the whole stream.

## Confidence and Gaps

**High confidence:** the complete flag set and defaults, the design-matrix
construction (tp1-centered), the β-derived formulae for rate/pc1/pc1fit/spc/avg,
the residual handling, the auto `--allow-zero-dof` for two time points, the
`--out-*`→`--do-*` coupling, and the cross-subject stacking — all read directly
from [`scripts/long_stats_slopes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes).

> [!gap] Design-matrix centering choice
> The active design matrix centers on tp1 (`time - times[0]`), while a
> commented-out line centers on the mean (`time - meant`,
> [`scripts/long_stats_slopes:466-467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes#L466-L467)). The slope $\beta_1$ is
> identical either way, but $\beta_0$ (hence `pc1fit`) depends on the choice;
> the rationale for tp1-centering is not documented in the source.

## References

- FreeSurfer source: [`scripts/long_stats_slopes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_slopes) (v8.2.0).
- Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181-1196, 2010. <http://dx.doi.org/10.1016/j.neuroimage.2010.07.020>
- Reuter M, Fischl B. *Avoiding Asymmetry-Induced Bias in Longitudinal Image Processing.* NeuroImage 57(1):19-21, 2011. <http://dx.doi.org/10.1016/j.neuroimage.2011.02.076>
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. <http://dx.doi.org/10.1016/j.neuroimage.2012.02.084>
