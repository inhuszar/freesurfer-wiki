---
title: "long_mris_slopes"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_mris_slopes"
  - "python/fsbindings/legacy.py"
families: []                     # longitudinal QDEC workflow helper
recon_all_stage: null
related:
  - "[[wiki/concepts/longitudinal-processing|longitudinal-processing]]"
  - "[[long_qdec_table]]"
  - "[[long_stats_combine]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mris_calc]]"
  - "[[mris_fwhm]]"
  - "[[mri_surf2surf]]"
  - "[[mri_concat]]"
  - "[[mris_label_calc]]"
  - "[[mri_label2label]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - longitudinal
  - surface
  - slopes
  - glm
  - qcache
  - python
---

# long_mris_slopes

## Summary

`long_mris_slopes` computes **within-subject slope maps** of a surface measure
(e.g. cortical `thickness`) across the time points of a longitudinal study. For
each subject it fits a per-vertex linear model of the measure against a time
variable (usually `age`) via [[wiki/tools/mri_glmfit|mri_glmfit]], and from the fit
derives, per vertex: the **rate** (slope), the **percent change** relative to the
first time point (`pc1`, `pc1fit`), the **symmetrized percent change** relative to
the temporal average (`spc`), and the **temporal average** (`avg`). It writes these
maps into each subject's base/template `surf/` directory, can intersect the
within-subject cortex labels, optionally smooths the data, and — with `--qcache` —
resamples everything onto a common target subject (e.g. `fsaverage`) and stacks the
per-subject maps into group files ready for [[wiki/tools/mri_glmfit|mri_glmfit]].

## Source Information

- **Language:** Python 3 (uses `optparse`)
- **Source files:**
  [`scripts/long_mris_slopes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes) (driver) and
  [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py) (`LongQdecTable`).
- **Original author:** Martin Reuter
- **Binary/script location:** `$FREESURFER_HOME/bin/long_mris_slopes` (wrapper that execs `fspython $FREESURFER_HOME/python/scripts/long_mris_slopes`).
- **FreeSurfer tools invoked:** [[wiki/tools/mri_glmfit|mri_glmfit]] (per-subject line fit), [[mris_calc]] (per-vertex arithmetic for rate/SPC/PC), [[mris_fwhm]] (surface smoothing), [[mri_concat]] (stacking frames), [[wiki/tools/mri_convert|mri_convert]] (frame split/convert), [[mri_surf2surf]] (resample to qcache target), [[mris_label_calc]] (label intersect/erode), [[mri_label2label]] (map label to target).

## Purpose and Context

In a robust longitudinal analysis (Reuter et al., 2012), each subject's time points
are processed relative to a within-subject template, yielding spatially aligned
per-vertex surface measures. The scientific quantity of interest is usually the
**within-subject change over time** (e.g. atrophy rate), not the absolute value.
`long_mris_slopes` produces exactly those change maps, in the subject's template
space, by fitting a straight line per vertex and post-processing the fit
coefficients. Producing the change maps within subject first (then mapping to a
common space) is the recommended two-stage strategy: it removes between-subject
geometry differences and reduces bias before the group statistic.

The tool is deliberately a **pipeline glue script**: every per-vertex computation
is a call to [[mris_calc]] on the GLM's `beta.mgh`, and group assembly is a chain
of [[mri_concat]]/[[mri_surf2surf]] calls. The interesting content is *which*
quantity each `--do-*` produces and *how* the fit coefficients are combined.

## Inputs

### Required Inputs

- **`--qdec <file>`** — longitudinal QDEC table (`fsid fsid-base …`); the third
  column is the time variable by default ([`scripts/long_mris_slopes:386`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L386),
  required at [`:444-448`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L444-L448)).
- **`--hemi {lh|rh|both}`** — hemisphere(s) to process
  ([`:388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L388),
  [`:454-456`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L454-L456)); `both` loops over `lh` then `rh`.
- **`--meas <name>`** — the surface input measure, e.g. `thickness`
  ([`:387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L387));
  required whenever any analysis (`--do-*`/`--resid`) is requested
  ([`:479-482`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L479-L482)).
  With only `--do-label` it is not needed.
- **`--sd <path>`** — full path to the subjects directory
  ([`:389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L389),
  [`:484-486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L484-L486); also taken from `SUBJECTS_DIR` or the table's
  `subjects_dir` line if omitted, [`:698-705`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L698-L705)).
- **At least one analysis/output flag** — one or more of `--do-avg`, `--do-rate`,
  `--do-pc1fit`, `--do-pc1`, `--do-spc`, `--do-label`, `--stack-*`, or
  `--isec-labels` ([`:508-510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L508-L510)).

Each subject's base/template directory must contain the per-time-point measures
`<tpid>.long.<template>/surf/<hemi>.<meas>` and, for `--do-label`, the cortex
labels `<tpid>.long.<template>/label/<hemi>.cortex.label`.

### Input Assumptions

> [!assumption] Longitudinally processed surfaces with ≥2 time points
> The per-vertex measure files are read from the `<tpid>.long.<template>`
> directories ([`scripts/long_mris_slopes:755`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L755),
> [`:862`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L862)),
> so the longitudinal stream must be complete. Any subject entering the analysis
> needs **≥2 time points** or the run aborts
> ([`:855-858`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L855-L858)).
> The time variable must be numeric; if the table has no covariate columns you must
> pass `--generic-time` to assume times 1,2,3,…
> ([`:672-678`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L672-L678)).
> For percent-change maps, prior smoothing is strongly recommended (see gotcha).

## Outputs

### Files Created

Within-subject maps are written to `<template>/surf/<hemi>.<NAME>[.fwhm<f>].mgh`
(qcache-resampled versions add `.<qtarget>` before `.mgh`):

| Output | Flag | Default `<NAME>` | Meaning |
|--------|------|------------------|---------|
| Rate (slope) | `--do-rate` | `long.<meas>-rate` | slope $\beta_1$ of the line fit (measure-units per time-unit) |
| Percent change vs TP1 (fit) | `--do-pc1fit` | `long.<meas>-pc1fit` | $100\,\beta_1/\beta_0$ (TP1 value from the fit) |
| Percent change vs TP1 | `--do-pc1` | `long.<meas>-pc1` | $100\,\beta_1/m_1$ (measured TP1 value) |
| Symmetrized % change | `--do-spc` | `long.<meas>-spc` | $100\,\beta_1/\bar{m}$ (temporal average) |
| Temporal average | `--do-avg` | `long.<meas>-avg` | fit evaluated at mean time, $\beta_m$ |
| Stacked measure (time series) | `--do-stack` | `long.<meas>-stack` | the per-time-point measures concatenated |
| Residual (per TP or mean) | `--resid <n>` | `long.<meas>-resid<n>` / `-resid-mean` | GLM residual for time point `n` (or mean-abs residual for `0`) |
| Intersected cortex label | `--do-label` | `long.cortex` | per-subject intersection of all TP `?h.cortex.label`, written to `<template>/label/<hemi>.<OUT_LABEL>.label` |

Group-level (qcache) stacked outputs are written to the path given to each
`--stack-*` flag (one stacked `.mgh` per fwhm level, with `.fwhm<f>` inserted):

| Flag | Stacks |
|------|--------|
| `--stack-avg` / `--stack-rate` / `--stack-pc1fit` / `--stack-pc1` / `--stack-spc` / `--stack-resid` | the corresponding per-subject map across all subjects on the `--qcache` target |
| `--isec-labels <name>` | intersection (then erosion) of all subjects' mapped cortex labels on the target |

### Output Specifications

All maps are surface overlays in [[mgz]]/`.mgh` form (one value per vertex). Maps
live on the subject's template geometry unless `--qcache <target>` resamples them to
the target subject's geometry. Group stacks have one frame per subject. See
[[hemi.thickness|hemi.thickness]] for the canonical input-measure file and
[[hemi.cortex.label|hemi.cortex.label]] for the cortex label.

## Mathematical Foundations

> [!math] Per-vertex linear fit
> For each vertex the measure $y$ is regressed on time with design matrix rows
> $[\,1,\;t_i - t_1\,]$ (time re-centred to the first time point,
> [`scripts/long_mris_slopes:931-935`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L931-L935)),
> fit by [[wiki/tools/mri_glmfit|mri_glmfit]] (`--no-contrasts-ok`, with
> `--allow-zero-dof` for the 2-time-point case,
> [`:938-949`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L938-L949)).
> The two `beta.mgh` frames are the intercept $\beta_0$ (value at $t_1$) and slope
> $\beta_1$. The temporal average is evaluated at the mean time,
> $\beta_m = \beta_0 + (\bar t - t_1)\,\beta_1$
> ([`:968-972`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L968-L972)).

> [!math] Change quantities
> $$\text{rate}=\beta_1,\quad \text{pc1fit}=100\frac{\beta_1}{\beta_0},\quad \text{pc1}=100\frac{\beta_1}{m_1},\quad \text{spc}=100\frac{\beta_1}{\beta_m},\quad \text{avg}=\beta_m$$
> where $m_1$ is the (optionally smoothed) measured value at TP1. `pc1fit` and `spc`
> are preferred over `pc1` because the fit/average are less noisy than a single
> time point; `spc` is symmetric because it normalizes by the temporal average. Each
> is computed by [[mris_calc]] `div` then `mul 100`
> (e.g. SPC at [`:1070-1082`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L1070-L1082)).
> **Note:** because `spc`/`avg` depend on the temporal average, their values change
> when time points are added or removed.

> [!math] Smoothing happens before the division
> When `--fwhm`/`--qcache` request smoothing, the coefficient maps $\beta_0,\beta_1,
> \beta_m$ (and the TP1 measure for `pc1`) are smoothed with [[mris_fwhm]]
> *before* forming the ratio ([`:1004-1028`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L1004-L1028)).
> This matters numerically: the division can blow up where the denominator is near
> zero, so pre-smoothing the numerator and denominator is essential for the
> percent-change maps.

> [!internal] No closed-form here
> The least-squares fit itself is performed entirely by
> [[wiki/tools/mri_glmfit|mri_glmfit]]; this script only writes the design matrix,
> splits `beta.mgh`, and combines frames with [[mris_calc]].

## Configuration Options

### Complete Flag Reference

Options are grouped in the source via `optparse` option groups
([`scripts/long_mris_slopes:385-436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L385-L436)).

#### Required arguments

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string (file) | *(required)* | Longitudinal QDEC table (`fsid fsid-base …`). |
| `--meas` | string | *(required for analysis)* | Surface input measure, e.g. `thickness`. Not required for `--do-label`-only. |
| `--hemi` | `lh`\|`rh`\|`both` | *(required)* | Hemisphere(s); `both` runs lh then rh. |
| `--sd` | string (path) | `$SUBJECTS_DIR` / table's `subjects_dir` | Subjects directory. |

#### Computations (choose one or more)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--do-avg` | bool | off | Output the temporal average (fit at mean time). |
| `--do-rate` | bool | off | Output the rate (slope $\beta_1$). |
| `--do-pc1fit` | bool | off | Output percent change w.r.t. TP1 from the fit ($100\beta_1/\beta_0$). |
| `--do-pc1` | bool | off | Output percent change w.r.t. the measured TP1 value. |
| `--do-spc` | bool | off | Output symmetrized percent change (w.r.t. temporal average). |
| `--do-stack` | bool | off | Save the stacked per-time-point measure (time series) into the template surf dir. |
| `--resid` | int | `-1` (no export) | Export the GLM residual for time point `<n>` (1-based); `0` exports the mean absolute residual. |
| `--do-label` | bool | off | Intersect all time points' cortex labels into `<template>/label/<hemi>.<OUT_LABEL>.label`. |
| `--qcache` | string (target) | — | Resample all requested maps/labels to target subject (e.g. `fsaverage`) and, without `--fwhm`, at fwhm 0,5,10,15,20,25. |

#### Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fwhm` | int | — | Smooth at this fwhm (required for percent-change unless `--nosmooth`). |
| `--nosmooth` | bool | off | Explicitly skip smoothing (override the pct-change smoothing requirement). |
| `--time` | string (column) | 3rd column | Name of the time-variable column in the QDEC table. |
| `--generic-time` | bool | off | Assume times 1,2,3,… (use when the table has no time column). |
| `--in-label` | string | — | Use a pre-existing label (in `<template>/label/`) instead of `--do-label`, for smoothing/masking. |
| `--jac` | bool | off | Apply Jacobian correction when resampling (for area/volume maps); passed to [[mri_surf2surf]] `--jac`. |

#### Within-subject output names (override defaults)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--name-avg` | string | `long.<meas>-avg` | Output name (no `?h.`) for the temporal average. |
| `--name-rate` | string | `long.<meas>-rate` | Output name for the rate. |
| `--name-pc1fit` | string | `long.<meas>-pc1fit` | Output name for pc1fit. |
| `--name-pc1` | string | `long.<meas>-pc1` | Output name for pc1. |
| `--name-spc` | string | `long.<meas>-spc` | Output name for spc. |
| `--name-resid` | string | `long.<meas>-resid<n>` | Output name for the residual; requires `--resid`. |
| `--out-stack` | string | `long.<meas>-stack` | Output name for the stacked time series. |
| `--out-label` | string | `long.cortex` | Output name for the intersected cortex label. |

#### Outputs on the common `--qcache` target

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--isec-labels` | string (path) | — | Intersect (and erode) all subjects' labels on the target; requires `--qcache`. |
| `--stack-avg`<br>`--stack-rate`<br>`--stack-pc1fit`<br>`--stack-pc1`<br>`--stack-spc`<br>`--stack-resid` | string (path) | — | Stack the corresponding per-subject map across all subjects on the target (one file per fwhm level); each requires `--qcache`. |

### Configuration Interactions

> [!gotcha] Percent-change maps require smoothing or an explicit `--nosmooth`
> If `--do-pc1fit`/`--do-pc1`/`--do-spc` are requested without `--fwhm`, without
> `--nosmooth`, and without `--qcache`, the script errors and tells you to smooth
> ([`scripts/long_mris_slopes:516-518`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L516-L518)).
> The division by a near-zero denominator otherwise produces extreme values. (With
> `--qcache` and no `--fwhm`, the tool sweeps fwhm 0,5,10,15,20,25 automatically.)

> [!gotcha] You must supply a label: `--do-label` XOR `--in-label`
> Running any analysis without `--do-label` and without `--in-label` is an error
> ([`scripts/long_mris_slopes:496-498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L496-L498));
> specifying **both** is also flagged ([`:501-502`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L501-L502)).
> The label both masks the output and bounds the smoothing. `--isec-labels` without
> `--in-label` auto-enables `--do-label` ([`:505-506`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L505-L506)).

> [!gotcha] All `--stack-*` and `--isec-labels` require `--qcache`
> Group stacking and label intersection happen on the common target geometry, so
> any `--stack-*` ([`:490-493`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L490-L493))
> or `--isec-labels` ([`:520-522`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L520-L522))
> without `--qcache` is rejected. You can run *only* the stacking step (no `--do-*`)
> to assemble previously created qcache maps.

> [!gotcha] `--fwhm` and `--nosmooth` are mutually exclusive
> Supplying both is an error ([`:512-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L512-L514)).

> [!gotcha] `--resid <n>` needs `--name-resid` consistency
> Specifying `--name-resid` without `--resid` (or vice-versa, where the residual tp
> is needed) is checked: a `--name-resid` set with `resid < 0` errors
> ([`:474-476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L474-L476)).
> `--resid` triggers `mri_glmfit --eres-save` so residuals are available
> ([`:942-943`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L942-L943)).

> [!gotcha] `--time` column must exist in the table
> If `--time <name>` is given, the name is matched (case-insensitively) against the
> table's covariate columns; not finding it aborts
> ([`:681-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L681-L693)).
> Without `--time` the **third** table column is used; a table with no covariate
> columns requires `--generic-time`.

## Typical Use Cases

### 1. All within-subject change maps for one hemisphere

```bash
# avg, rate, pc1fit, spc + stacked thickness + intersected cortex label.
long_mris_slopes --qdec ./long.qdec.table.dat --meas thickness --hemi lh \
  --do-avg --do-rate --do-pc1fit --do-spc --do-stack --do-label \
  --fwhm 15 --time age --sd ./
```

### 2. Build a QDEC cache on fsaverage (several smoothing levels)

```bash
long_mris_slopes --qdec ./long.qdec.table.dat --meas thickness --hemi lh \
  --do-avg --do-rate --do-pc1fit --do-spc --do-stack --do-label \
  --time age --qcache fsaverage --sd ./
```

### 3. Stack previously created SPC maps for group GLM

```bash
long_mris_slopes --qdec ./long.qdec.table.dat --meas thickness --hemi lh \
  --fwhm 15 --qcache fsaverage \
  --stack-spc ./lh.thickness-spc.stack.mgh --sd ./
# -> feed the stack to mri_glmfit for the group analysis
```

### 4. Intersect previously mapped cortex labels on fsaverage

```bash
long_mris_slopes --qdec ./long.qdec.table.dat --hemi lh \
  --qcache fsaverage --in-label long.cortex.fsaverage.label \
  --isec-labels ./lh.long.isec.fsaverage.cortex.label --sd ./
```

## Pipeline Context

`long_mris_slopes` is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is
the surface-map analysis step of the longitudinal QDEC/GLM workflow, run after the
longitudinal stream finishes. It is the surface counterpart of the ROI-table tool
[[long_stats_combine]]: where that appends ROI columns to a table,
`long_mris_slopes` produces per-vertex change maps. Its stacked qcache outputs feed
directly into [[wiki/tools/mri_glmfit|mri_glmfit]] for the group-level statistic.

**Predecessor:** longitudinally processed subjects + a `long.qdec.table.dat`
(optionally per-subject via [[long_qdec_table]]) → **long_mris_slopes**
([[wiki/tools/mri_glmfit|mri_glmfit]] + [[mris_calc]] + [[mris_fwhm]] +
[[mri_surf2surf]]) → **Successor:** [[wiki/tools/mri_glmfit|mri_glmfit]] group GLM
on the stacked qcache maps.

## Gotchas and Caveats

> [!gotcha] SPC/AVG are not stable when the time set changes
> Because `spc` and `avg` normalize by / evaluate the temporal average (mid-interval
> fit), their per-vertex values shift if you add or drop a time point. `rate` and
> `pc1fit` (normalized by the TP1 fit) are more stable. The script's own help notes
> this for SPC ([`scripts/long_mris_slopes:181-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L181-L187)).

> [!gotcha] Negative rate means thinning
> For `thickness`, `--do-rate` yields slope in mm/time-unit (mm/year if the time
> column is age in years); **negative** values are atrophy
> ([`:168-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L168-L171)).

> [!gotcha] Two-time-point subjects use zero-dof GLM
> With exactly two time points the line fit has no residual degrees of freedom, so
> the script adds `--allow-zero-dof`; the fit is exact through the two points
> ([`:938-949`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L938-L949)).
> A subject with <2 time points is rejected.

> [!gotcha] Temporary working dirs are created in the *current* directory
> Per-subject scratch directories are made as `./tmp-<subject>_<hemi>_<meas>_*`
> ([`:866-867`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L866-L867))
> and removed on success ([`:1136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L1136)).
> Run from a writable directory; on a hard failure these may be left behind.

> [!gotcha] Dead/commented two-tp fast path
> A direct two-time-point difference path exists but is fully commented out
> ([`:883-921`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L883-L921));
> the GLM path (`if 1==1:`) always runs. This is historical and has no effect, but
> explains why the 2-tp case still invokes `mri_glmfit`.

## Error Compensation and Guard Rails

- **Comprehensive argument validation** before any processing: required args,
  label requirement, smoothing requirement for pct-change, `--fwhm`/`--nosmooth`
  conflict, `--stack-*`/`--isec-labels` needing `--qcache`, and residual-naming
  consistency ([`scripts/long_mris_slopes:444-522`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L444-L522)).
- **Existence checks** for the template dir, the `--qcache` target, the per-tp
  cortex labels, and each [[mris_calc]] output; missing files abort with a precise
  message.
- **Default name synthesis** — every output name defaults to `long.<meas>-<kind>`
  unless overridden ([`:458-473`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L458-L473)),
  so a minimal invocation still produces well-named files.
- **`--qcache`-without-`--fwhm` fwhm sweep** (0,5,10,15,20,25) so a single command
  produces a full smoothing series for QDEC.
- **Per-command failure check** via `run_cmd` (aborts on non-zero return).
- **macOS shim**: sets `DYLD_LIBRARY_PATH` on Darwin
  ([`:709-710`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes#L709-L710)).

## Related Tools

- [[wiki/concepts/longitudinal-processing|longitudinal-processing]] — the two-stage surface analysis this implements.
- [[long_qdec_table]] — prepares/splits the QDEC table consumed here.
- [[long_stats_combine]] — the ROI-table counterpart (volume/thickness columns rather than vertex maps).
- [[wiki/tools/mri_glmfit|mri_glmfit]] — fits the per-subject line and runs the downstream group GLM.
- [[mris_calc]] — per-vertex arithmetic for rate/SPC/PC.
- [[mris_fwhm]] — surface smoothing of the coefficient maps.
- [[mri_surf2surf]] — resamples maps to the `--qcache` target.
- [[mri_concat]] / [[wiki/tools/mri_convert|mri_convert]] — stack and frame-split the maps.
- [[mris_label_calc]] / [[mri_label2label]] — intersect/erode and map cortex labels.

## Confidence and Gaps

**High confidence:** the full option inventory across all five option groups, the
analysis math (intercept/slope → rate/pc1/pc1fit/spc/avg, time recentred to TP1,
average at mean time), the smoothing-before-division rule, the zero-dof 2-tp
handling, the `--qcache` fwhm sweep and group-stacking logic, and every required/
mutual-exclusion check — all read directly from
[`scripts/long_mris_slopes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes)
(with the table parser in
[`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py)).

## References

- FreeSurfer source: [`scripts/long_mris_slopes`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_mris_slopes) (v8.2.0).
- Reuter M, Rosas HD, Fischl B. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181-1196, 2010.
- Reuter M, Fischl B. *Avoiding Asymmetry-Induced Bias in Longitudinal Image Processing.* NeuroImage 57(1):19-21, 2011.
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. [doi:10.1016/j.neuroimage.2012.02.084](https://dx.doi.org/10.1016/j.neuroimage.2012.02.084)
- FreeSurfer wiki: [LongitudinalProcessing](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalProcessing), [LongitudinalStatistics](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalStatistics).
