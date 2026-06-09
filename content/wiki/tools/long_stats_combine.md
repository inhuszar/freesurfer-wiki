---
title: "long_stats_combine"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/long_stats_combine"
  - "python/fsbindings/legacy.py"
families: []                     # longitudinal QDEC workflow helper
recon_all_stage: null
related:
  - "[[wiki/concepts/longitudinal-processing|longitudinal-processing]]"
  - "[[long_qdec_table]]"
  - "[[long_mris_slopes]]"
  - "[[asegstats2table]]"
  - "[[aparcstats2table]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - longitudinal
  - qdec
  - stats
  - python
---

# long_stats_combine

## Summary

`long_stats_combine` harvests **per-time-point ROI statistics** from a set of
longitudinally processed subjects and **appends them as new columns** to a
longitudinal QDEC table. Given a QDEC table (`fsid fsid-base …`), a stats file name
(e.g. `aseg.stats` or `lh.aparc.stats`), and a measure (e.g. `volume`,
`thickness`), it runs [[asegstats2table]] or [[aparcstats2table]] across every
time point's `.long.<template>` directory to build one big "stacked" stats table,
then merges that table into the QDEC table — producing a single table ready for a
group GLM. Alternatively, a pre-built stacked stats table can be supplied directly
with `--instats`.

## Source Information

- **Language:** Python 3 (uses `optparse`)
- **Source files:**
  [`scripts/long_stats_combine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine) (driver) and
  [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py) (`LongQdecTable`, esp. `append_table`).
- **Original author:** Martin Reuter
- **Binary/script location:** `$FREESURFER_HOME/bin/long_stats_combine` (wrapper that execs `fspython $FREESURFER_HOME/python/scripts/long_stats_combine`).
- **FreeSurfer tools invoked:** [[asegstats2table]] (with `--common-segs`) or [[aparcstats2table]] (with `--common-parcs --hemi --parc`), depending on the stats-file name.

## Purpose and Context

After every time point of every subject has been processed in the longitudinal
stream, a typical ROI (volume/thickness) analysis needs a flat table with one row
per time point and one column per ROI measure, alongside the study covariates.
`long_stats_combine` automates building that table: it expands each subject's time
points into their `<tpid>.long.<template>` IDs, stacks the requested stats across
all of them with the appropriate `*stats2table` tool, and then **column-binds** the
result onto the QDEC table (matching by subject and time-point order). The combined
table is what you feed to a longitudinal GLM (e.g. an LME or a two-stage model via
[[wiki/tools/mri_glmfit|mri_glmfit]]).

> [!contradiction] Internal name and `--out` help text are stale; the real output flag is `--outqdec`
> The file's own header comment and logger still say **`long_stats_tps`**
> ([`scripts/long_stats_combine:4`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L4),
> [`:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L39)) — a copy-paste leftover from the sibling
> script `long_stats_tps`. More importantly, the `HELPTEXT` block advertises
> **`--out <name>`** ([`:63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L63)),
> but **no `--out` option is defined**; the actual output-table flag is
> **`--outqdec`** ([`:151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L151)).
> Passing `--out` will be ignored (optparse may error on the unknown option). Code
> is authoritative: use `--outqdec`.

## Inputs

### Required Inputs

- **`--qdec <file>`** — longitudinal QDEC table whose first two columns are
  `fsid  fsid-base` ([`scripts/long_stats_combine:147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L147),
  required at [`:160-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L160-L165)).
  Must be a **longitudinal** table; a cross-sectional one is rejected
  ([`:230-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L230-L232)).

Then **either** the harvest inputs:

- **`--stats <name>`** — bare stats filename, e.g. `aseg.stats`, `lh.aparc.stats`,
  `rh.aparc.a2009s.stats` ([`:148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L148)).
- **`--meas <name>`** — the column/measure to extract, e.g. `volume`, `thickness`,
  `mean`, `std` ([`:149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L149)).
- **`--sd <path>`** — full path to the FreeSurfer subjects directory
  ([`:150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L150)); sets `SUBJECTS_DIR`.

**or** a pre-stacked table:

- **`--instats <file>`** — a stacked stats table in the same subject/time-point
  order as the QDEC table, supplied instead of `--stats`/`--meas`/`--sd`
  ([`:153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L153)).

### Input Assumptions

> [!assumption] Longitudinal results exist under `<tpid>.long.<template>`
> By default the stats are read from the **longitudinally processed** directories:
> each time point ID `tp` is expanded to `tp.long.<template>`
> ([`scripts/long_stats_combine:257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L257)),
> so the long stream must have completed and `<sd>/<tp>.long.<template>/stats/<stats>`
> must exist for every time point. `--cross` switches to the plain cross-sectional
> IDs and is **for testing only** ([`:142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L142),
> [`:254-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L254-L255)).
> With `--instats`, the supplied table must already be in the same row order as the
> QDEC table.

## Outputs

### Files Created

| Output | Flag | Contents |
|--------|------|----------|
| Combined long QDEC table | `--outqdec <name>` | the input QDEC table with the harvested/stacked stats columns appended |
| Stacked stats table | `--outstats <name>` | the raw `*stats2table` output (all subjects × time points), kept instead of a temp file |

At least one of `--outqdec`/`--outstats` is required
([`scripts/long_stats_combine:186-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L186-L188)).
When neither `--instats` nor `--outstats` is given, the stacked table is written to
a **temporary file** and deleted after merging
([`:275-277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L275-L277),
[`:300-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L300-L301)).

### Output Specifications

Both outputs are whitespace-delimited text tables. The combined table carries the
original `fsid fsid-base …` header extended with the ROI-measure column names, one
data row per time point. The stacked stats table is exactly what
[[asegstats2table]]/[[aparcstats2table]] emit with `-d space`.

## Mathematical Foundations

None — this is a data-marshalling tool. It computes no statistics itself; it
*invokes* `*stats2table` to read pre-computed per-subject stats and then performs a
**column-wise join** of the resulting table onto the QDEC table.

> [!internal] The join is `LongQdecTable.append_table`
> Merging the stacked stats into the QDEC table is done by
> `qdectable.append_table(alltable)`
> ([`scripts/long_stats_combine:295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L295);
> implementation at [`python/fsbindings/legacy.py:1007`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L1007)).
> It concatenates the stats columns onto each existing row, matching by subject and
> time-point order; it explicitly refuses to operate on a cross-sectional table
> ([`legacy.py:1008-1010`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py#L1008-L1010)).

## Configuration Options

### Complete Flag Reference

Options defined at [`scripts/long_stats_combine:147-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L147-L155).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--qdec` | string (file) | *(required)* | Longitudinal QDEC table (`fsid fsid-base …`). |
| `--stats` | string | *(required unless `--instats`)* | Bare stats filename to harvest, e.g. `aseg.stats`, `lh.aparc.stats`. A leading `lh.`/`rh.` routes to [[aparcstats2table]]. |
| `--meas` | string | *(required unless `--instats`)* | Measure column to extract, e.g. `volume`, `thickness`, `mean`, `std`. |
| `--sd` | string (path) | *(required unless `--instats`)* | Subjects directory (also sets `SUBJECTS_DIR`). |
| `--outqdec` | string (file) | — | Output combined long QDEC table (one of `--outqdec`/`--outstats` required). The help calls this `--out`; that name does not work. |
| `--outstats` | string (file) | — | Save the stacked stats table (all subjects × time points) instead of using a temp file. |
| `--instats` | string (file) | — | Use this pre-stacked stats table instead of harvesting (mutually exclusive with `--stats`/`--meas`/`--outstats`). |
| `--cross` | bool | off | Read **cross-sectional** stats dirs instead of `*.long.*` (testing only). |

The dispatch to the stacking tool is name-driven
([`scripts/long_stats_combine:280-287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L280-L287)):
if `--stats` begins with `lh.`/`rh.`, the script strips the prefix and the `.stats`
suffix and calls `aparcstats2table --common-parcs --hemi <lh|rh> --parc <parc>`;
otherwise it calls `asegstats2table --common-segs --stats <stats>`.

### Configuration Interactions

> [!gotcha] `--instats` excludes `--stats`/`--meas`/`--outstats`
> Supplying `--instats` together with `--stats` or `--meas` is a hard error
> ([`scripts/long_stats_combine:178-180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L178-L180));
> so is `--instats` together with `--outstats` (the message tells you to just copy
> the file yourself, [`:181-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L181-L183)).
> Pick **one** path: harvest (`--stats --meas --sd`) **or** pre-stacked
> (`--instats`).

> [!gotcha] Hemisphere stats go to `aparcstats2table`, everything else to `asegstats2table`
> The routing keys purely off the `lh.`/`rh.` prefix of `--stats`. A surface parc
> stats file **must** carry the hemi prefix (`lh.aparc.stats`) to reach
> [[aparcstats2table]]; a name like `aparc.stats` (no hemi) would be sent to
> [[asegstats2table]] and fail. Conversely `aseg.stats` must not carry a hemi
> prefix.

> [!gotcha] At least one output is mandatory, but `--outqdec` is what merges
> If you give only `--outstats`, you get the stacked stats table but the QDEC merge
> is skipped (the merge runs only when `--outqdec` is set,
> [`scripts/long_stats_combine:293-297`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L293-L297)).
> To get the combined table you must pass `--outqdec`.

## Typical Use Cases

### 1. Append aseg volumes to a longitudinal QDEC table

```bash
long_stats_combine \
  --qdec long.qdec.table.dat \
  --stats aseg.stats --meas volume \
  --sd $SUBJECTS_DIR \
  --outqdec long.qdec.aseg-volume.dat
```

### 2. Append left-hemisphere aparc thickness, keeping the stacked table

```bash
long_stats_combine \
  --qdec long.qdec.table.dat \
  --stats lh.aparc.stats --meas thickness \
  --sd $SUBJECTS_DIR \
  --outstats lh.aparc-thickness.stacked.dat \
  --outqdec long.qdec.lh-aparc-thickness.dat
```

### 3. Merge a previously stacked stats table

```bash
long_stats_combine \
  --qdec long.qdec.table.dat \
  --instats lh.aparc-thickness.stacked.dat \
  --outqdec long.qdec.lh-aparc-thickness.dat
```

## Pipeline Context

`long_stats_combine` is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it
runs after the longitudinal stream completes, as the ROI-table assembly step of a
longitudinal QDEC/GLM analysis. It typically follows [[long_qdec_table]] (which can
produce per-subject or sorted tables) and feeds the combined table to a
longitudinal GLM via [[wiki/tools/mri_glmfit|mri_glmfit]] (e.g. an LME). For
*surface-map* (rather than ROI) longitudinal analysis, the parallel tool is
[[long_mris_slopes]].

**Predecessor:** longitudinally processed subjects + a `long.qdec.table.dat`
(optionally massaged by [[long_qdec_table]]) → **long_stats_combine**
([[asegstats2table]]/[[aparcstats2table]]) → **Successor:**
[[wiki/tools/mri_glmfit|mri_glmfit]] / longitudinal LME modelling.

## Gotchas and Caveats

> [!gotcha] Documented `--out` does not exist — use `--outqdec`
> See the [!contradiction] above. The `HELPTEXT` line "`--out <name>  File name of
> output long qdec table`" is wrong for this script; the working flag is
> `--outqdec`.

> [!gotcha] `--cross` is a testing flag, not a real cross-sectional mode
> `--cross` reads from the plain `<tpid>/stats` directories instead of
> `<tpid>.long.<template>/stats`. The help marks it "(for testing only)"; do not use
> it to build a genuine cross-sectional analysis table.

> [!gotcha] Row order must match for `--instats`
> When you supply `--instats`, the stacked table is appended by **position** (per
> subject, per time point). If its row order differs from the QDEC table, columns
> will be mis-aligned. Build the stacked table from the *same* QDEC table.

## Error Compensation and Guard Rails

- **Argument validation.** Enforces `--qdec`; requires `--stats`+`--meas`+`--sd`
  unless `--instats`; rejects the `--instats`/`--stats`/`--meas`/`--outstats`
  conflicts; requires at least one of `--outqdec`/`--outstats`
  ([`scripts/long_stats_combine:160-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L160-L188)).
- **Cross-vs-long guard.** A cross-sectional QDEC table (second column ≠
  `fsid-base`) is rejected before any harvesting
  ([`:230-232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L230-L232)).
- **Subprocess failure check.** `run_cmd` aborts on a non-zero return from the
  `*stats2table` call ([`:198-208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L198-L208)).
- **Temp-file cleanup.** The transient stacked table is removed when neither
  `--instats` nor `--outstats` is set.
- **Always exits 0** on success ([`:303-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine#L303-L304)).

## Related Tools

- [[wiki/concepts/longitudinal-processing|longitudinal-processing]] — the analysis workflow this serves.
- [[long_qdec_table]] — builds/splits/sorts the QDEC table this tool extends (shared `LongQdecTable` parser).
- [[long_mris_slopes]] — the surface-map counterpart (within-subject slope/rate maps rather than ROI columns).
- [[asegstats2table]] — invoked for volumetric (`aseg`-style) stats.
- [[aparcstats2table]] — invoked for surface parcellation (`?h.aparc`) stats.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — the downstream longitudinal GLM.
- `long_stats_tps` *(no wiki page yet)* — sibling script (whose name this file's header still bears) that stacks a **single** time point with `--tp`/`--qcol`.

## Confidence and Gaps

**High confidence:** the complete option set (`--qdec --stats --meas --sd --outqdec
--outstats --instats --cross`), the `--out`→`--outqdec` discrepancy, the
`lh.`/`rh.`→[[aparcstats2table]] routing, the `*.long.<template>` ID expansion, the
mutual-exclusion rules, and the `append_table` join — all read directly from
[`scripts/long_stats_combine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine)
and [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py).

## References

- FreeSurfer source: [`scripts/long_stats_combine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/long_stats_combine) and [`python/fsbindings/legacy.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/fsbindings/legacy.py) (v8.2.0).
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012.
- FreeSurfer wiki: [LongitudinalStatistics](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalStatistics), [LongitudinalProcessing](https://surfer.nmr.mgh.harvard.edu/fswiki/LongitudinalProcessing).
