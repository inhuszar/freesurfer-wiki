---
title: "feat2segstats"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/feat2segstats"
families: []                     # FSL/FEAT interoperability script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[aseg2feat]]"
  - "[[aparc2feat]]"
  - "[[asegstats2table]]"
  - "[[feat2surf]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - fsl
  - feat
  - segstats
  - statistics
  - roi
  - interoperability
---

# feat2segstats

## Summary

`feat2segstats` extracts **per-segment summary statistics** from an FSL FEAT
analysis. For each requested FEAT statistic volume (COPEs, varcopes, z-stats,
parameter estimates, residual variance, etc.) it runs [[mri_segstats]] using a
FreeSurfer segmentation that was previously resampled into the FEAT functional
space by [[aseg2feat]] (or [[aparc2feat]]), producing one `.dat` summary table
per statistic per segmentation. The tables list, for every anatomical structure,
the mean (and other moments) of that statistic over the structure's voxels — so
you can ask, e.g., "what is the mean COPE-1 effect in the left hippocampus?"
across many subjects. The resulting `.dat` files are designed to be aggregated
across subjects with [[asegstats2table]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/feat2segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats)
- **Binary/script location:** `$FREESURFER_HOME/bin/feat2segstats`
- **Original author:** Doug Greve
- **Core helper invoked:** [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L143-L147) (the per-segment statistic engine). Filename utilities `stem2fname` / `fname2stem` are used to resolve FSL files regardless of `.nii`/`.nii.gz`/`.img` extension.

## Purpose and Context

After an FSL FEAT first- or higher-level analysis, the GLM outputs (COPEs,
z-statistics, PEs, …) live as volumes in `featdir/stats/`. To summarise these by
anatomy — for ROI analysis or cross-subject tabulation — you need the volume
broken down by a segmentation that is in the *same* functional space.

`feat2segstats` is the consumer end of the FreeSurfer/FSL bridge:

1. `reg-feat2anat` registers FreeSurfer anatomy to the FEAT functional space.
2. [[aseg2feat]] / [[aparc2feat]] resample a FreeSurfer segmentation into that
   space (written into `featdir/reg/freesurfer/`).
3. **`feat2segstats`** runs [[mri_segstats]] for each chosen statistic volume
   against that segmentation, writing `.dat` tables.
4. [[asegstats2table]] gathers the per-subject `.dat` files into a single table.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run by hand
on completed FEAT analyses.

## Inputs

### Required Inputs

- **One or more FEAT directories** — given with `--feat` (repeatable) and/or
  `--featdirfile`. Each must contain the resampled segmentation and the
  `featdir/stats/` directory of FEAT outputs.
- **A segmentation name** (`--seg`, `--aseg`, or `--aparc+aseg`) — *required*.
  The segmentation volume is looked up as
  `featdir/reg/freesurfer/<seg>` (resolved across extensions by `stem2fname`,
  [`scripts/feat2segstats:89-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L89-L95)).
  This is the file produced by [[aseg2feat]]/[[aparc2feat]] **without**
  `--svstats`.
- **At least one statistic selection** — `--copes`, `--varcopes`, `--zstats`,
  `--pes`, `--rvar`, `--exf`, `--mean_func`, `--mask`, or one/more `--stat`.
  With none of these the script exits with "nothing to do"
  ([`scripts/feat2segstats:290-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L290-L294)).

### Input Assumptions

> [!assumption] The segmentation must already be in the FEAT functional space
> `feat2segstats` does **not** resample anything; it expects
> `featdir/reg/freesurfer/<seg>.<ext>` to already exist (from [[aseg2feat]] or
> [[aparc2feat]]). If `stem2fname` cannot find it the script prints the error and
> aborts with "Make sure to run aseg2feat"
> ([`scripts/feat2segstats:89-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L89-L95)).
> The statistic volumes are read from `featdir/stats/` and must be in
> voxel-for-voxel correspondence with that segmentation (which holds when both
> derive from the same FEAT analysis).

> [!gotcha] Segmentation is read from `reg/freesurfer/`, not `stats/`
> Even though [[aseg2feat]] has a `--svstats` option that writes the segmentation
> into `featdir/stats/`, `feat2segstats` always looks in
> `featdir/reg/freesurfer/<seg>`. Run [[aseg2feat]] **without** `--svstats` (its
> default) so the segmentation lands where `feat2segstats` expects it.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<statname>.dat` (e.g. `cope1.dat`, `zstat3.dat`, `sigmasquareds.dat`) | `featdir/freesurfer/segstats/<seg>/` | The [[mri_segstats]] summary table for that statistic over each segment of `<seg>`: one row per structure with voxel count, volume, and intensity moments (mean, std, min, max, range) of the statistic. |
| `feat2segstats.log` | `featdir/reg/freesurfer/` | Full command, environment, the resolved stat list, and every `mri_segstats` invocation/output. A pre-existing log is rotated to `.log.bak`; suppressed entirely with `--nolog` (logs to `/dev/null`). |

The output directory is created with `mkdir -p`
([`scripts/feat2segstats:132-133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L132-L133)).

### Output Specifications

Each `.dat` file is a standard `mri_segstats --sum` table (a `# ColHeaders`
ASCII summary). The structure→index mapping follows the colour table in effect
(see `--ctab`). These tables are the input format expected by
[[asegstats2table]] `--inputs … --meas mean`.

## Mathematical Foundations

`feat2segstats` performs no statistics itself; all per-segment reduction (voxel
counting, masking by label, computing mean/std/min/max over each structure) is
done by [[mri_segstats]].

> [!internal] The per-segment statistics live in mri_segstats
> The fixed core invocation is
> [`mri_segstats --seg <seg> --sum <out>.dat --in <statvol> [--nonempty] [--ctab … | --ctab-default …]`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L143-L147).
> See [[mri_segstats]] for how each structure's summary moments are computed and
> what columns the `.dat` table contains.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/feat2segstats:168-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L168-L272)).
Boolean flags take no argument. The statistic-selection flags are **additive**:
you may combine as many as you like, and the union of all selected volumes is
processed.

#### Inputs and segmentation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--feat` | string (repeatable) | *(required)* | A FEAT output directory; repeatable. |
| `--featdirfile` | string (filename) | — | ASCII file listing FEAT directories; contents appended. Combinable with `--feat`, repeatable. |
| `--seg` | string | *(required)* | Segmentation basename under `featdir/reg/freesurfer/` (e.g. `aseg`, `aparc+aseg`). |
| `--aseg` | bool | — | Shorthand for `--seg aseg`. |
| `--aparc+aseg` | bool | — | Shorthand for `--seg aparc+aseg`. |
| `--ctab` | string (filename) | `FreeSurferColorLUT.txt` (intended) | Colour lookup table passed to `mri_segstats --ctab`. The file must exist or the script aborts. **See the gotcha below — the no-`--ctab` default path is buggy.** |

#### Statistic selection (additive; at least one required)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--copes` | bool | off | Process all `cope*.nii*` volumes in `stats/`. |
| `--varcopes` | bool | off | Process all `varcope*.nii*` volumes. |
| `--zstats` | bool | off | Process all `zstat*.nii*` volumes. |
| `--pes` | bool | off | Process all `pe*.nii*` (parameter-estimate) volumes. |
| `--rvar` | bool | off | Add `sigmasquareds` (FEAT residual variance) to the stat list. |
| `--exf`<br>`--example_func` | bool | off | Add `../example_func` (one level up from `stats/`). |
| `--mean_func` | bool | off | Add `../mean_func`. |
| `--mask` | bool | off | Add `../mask` (the help itself notes "probably not too useful"). |
| `--stat` | string (repeatable) | — | Add an explicit statistic stem (resolved under `stats/`); repeatable for several named volumes. |

#### Reporting and logging

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--all-segs` | bool | on (forced) | *Intended* to report on every segment including empty ones. **In practice the variable it sets is already 1 and cannot be turned off — see gotcha; the script always passes `--nonempty` to `mri_segstats`, so empty segments are dropped.** |
| `--nolog` | bool | off | Do not write a log file (logs to `/dev/null`). |
| `--debug` | bool | off | Enable `set echo`/`verbose` command tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--all-segs` is a no-op, and the script always drops empty segments
> `DoAllSegs` is initialised to **1** and `--all-segs` sets it to 1 again — there
> is no flag that sets it to 0 ([`scripts/feat2segstats:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L27),
> [`:205-207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L205-L207)).
> Because the code adds `--nonempty` to `mri_segstats` precisely **when**
> `DoAllSegs == 1` ([`scripts/feat2segstats:145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L145)),
> the effect is the opposite of the flag's name and help text: empty segments are
> always **excluded**. To genuinely report empty structures you would have to
> edit the script (drop `--nonempty`). Treat `--all-segs` as cosmetic.

> [!gotcha] The default (no-`--ctab`) colour-table path passes an empty argument
> When `--ctab` is **not** given, the code runs
> [`set cmd = ($cmd --ctab-default $ctab)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L146-L147)
> with `$ctab` **empty**, so it appends a bare `--ctab-default` (no filename) to
> the `mri_segstats` command. In `mri_segstats`, `--ctab-default` legitimately
> takes no argument (it selects the built-in default LUT), so this usually works
> — but if the next token is consumed unexpectedly the behaviour is fragile. The
> robust, predictable choice is to pass `--ctab $FREESURFER_HOME/FreeSurferColorLUT.txt`
> explicitly.

- All statistic-selection flags are **additive**; e.g. `--copes --zstats --rvar`
  processes every COPE, every z-stat, and `sigmasquareds`.
- `--seg`/`--aseg`/`--aparc+aseg` set the same `seg` variable; the **last wins**.
- `--feat` and `--featdirfile` are additive and repeatable.
- The glob-based selectors (`--copes`, etc.) are evaluated inside a
  `pushd $statsdir` so the `cope*`/`zstat*` patterns match files in
  `featdir/stats/` ([`scripts/feat2segstats:97-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L97-L129)).

## Typical Use Cases

### 1. Mean of every COPE per aseg structure

```bash
# Requires: aseg2feat --feat fbert.feat   (segmentation in reg/freesurfer/)
feat2segstats --feat fbert.feat --aseg --copes
# → fbert.feat/freesurfer/segstats/aseg/cope1.dat, cope2.dat, ...
```

### 2. COPEs, z-stats and residual variance against aparc+aseg

```bash
feat2segstats --feat fbert.feat --aparc+aseg --copes --zstats --rvar
```

### 3. A single named statistic with an explicit colour table

```bash
feat2segstats --feat fbert.feat --seg aseg \
  --stat tstat1 --ctab $FREESURFER_HOME/FreeSurferColorLUT.txt
```

### 4. Aggregate across subjects (the intended downstream step)

```bash
# After running feat2segstats on each subject's FEAT dir:
asegstats2table --inputs \
  sub1.feat/freesurfer/segstats/aparc+aseg/cope1.dat \
  sub2.feat/freesurfer/segstats/aparc+aseg/cope1.dat \
  sub3.feat/freesurfer/segstats/aparc+aseg/cope1.dat \
  --meas mean --t cope1.table.dat
```

(This is the example from the script's own help,
[`scripts/feat2segstats:353-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L353-L358).)

## Pipeline Context

`feat2segstats` is a stand-alone FreeSurfer↔FSL bridge tool; it is **not**
invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessors:** FSL FEAT (produces `stats/cope*`, `zstat*`, …) **and**
[[aseg2feat]]/[[aparc2feat]] (produce `reg/freesurfer/<seg>`) →
**feat2segstats** → **Successor:** [[asegstats2table]] (cross-subject
tabulation). The surface analogue of this whole flow is [[feat2surf]] (which
samples the same FEAT volumes onto the cortical surface instead of summarising
them by segment).

## Gotchas and Caveats

> [!gotcha] Hard stop on the first failure
> Any non-zero return from `stem2fname` (segmentation or statistic not found) or
> from `mri_segstats` aborts the whole run with `exit 1`
> ([`scripts/feat2segstats:90-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L90-L95),
> [`:136-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L136-L140),
> [`:150-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L150-L151)),
> so later FEAT directories in a batch are not processed. Fix the offending input
> and re-run.

> [!gotcha] Glob selectors silently do nothing if no files match
> If you pass `--copes` but `stats/` has no `cope*.nii*`, the glob expands to the
> literal pattern, `fname2stem` is applied to a non-existent file, and you may
> get spurious entries or an empty stat list. Confirm the FEAT analysis actually
> produced the stat type you requested.

> [!gotcha] Output path is fixed under `freesurfer/segstats/<seg>/`
> There is no flag to redirect the `.dat` output; it always goes to
> `featdir/freesurfer/segstats/<seg>/<stat>.dat`
> ([`scripts/feat2segstats:132-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L132-L141)).
> Re-running overwrites the previous tables for that segmentation.

## Error Compensation and Guard Rails

- **Extension-agnostic file resolution.** Both the segmentation and each
  statistic are located with `stem2fname`/`fname2stem`, so `.nii`, `.nii.gz`, and
  `.img` FEAT outputs are handled transparently.
- **Required-input checks.** The script enforces at least one FEAT dir, a
  segmentation, and at least one statistic selection before running
  ([`scripts/feat2segstats:280-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L280-L294)).
- **No silent data modification** of FEAT outputs — it only writes new `.dat`
  tables and a log.

## Related Tools

- [[mri_segstats]] — the engine that computes the per-segment statistics; all
  the math and the `.dat` table layout come from here.
- [[aseg2feat]] / [[aparc2feat]] — produce the in-functional-space segmentation
  this tool consumes (run **without** `--svstats`).
- [[asegstats2table]] — aggregates the per-subject `.dat` tables into one table.
- [[feat2surf]] — the surface-based analogue (FEAT volumes → cortical surface).
- `reg-feat2anat` *(no wiki page yet)* — establishes the FEAT↔anatomical
  registration upstream of [[aseg2feat]]/[[aparc2feat]].

## Confidence and Gaps

**High confidence:** the complete flag set, the additive statistic selectors,
the fixed output location, the segmentation lookup in `reg/freesurfer/`, and the
two genuine defects (the inert `--all-segs`/always-`--nonempty` behaviour and the
empty `--ctab-default` argument) — all read directly from
[`scripts/feat2segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats).

> [!gap] Exact column set of the `.dat` tables
> The precise columns of each `<stat>.dat` file (and whether `--nonempty`
> renumbers rows) are determined by the `mri_segstats` version in the install;
> see [[mri_segstats]] for the authoritative `--sum` table specification.

## References

- FreeSurfer source: [`scripts/feat2segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats) (v8.2.0).
- Built-in help: `feat2segstats --help` (the `BEGINHELP` block,
  [`scripts/feat2segstats:347-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2segstats#L347-L358)).
- Companions: [[aseg2feat]], [[aparc2feat]], [[asegstats2table]].
