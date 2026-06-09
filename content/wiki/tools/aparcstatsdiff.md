---
title: "aparcstatsdiff"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/aparcstatsdiff"
families: []                     # standalone per-subject QA wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[aparcstats2table]]"
  - "[[asegstatsdiff]]"
  - "[[stattablediff]]"
  - "[[groupstatsdiff]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - qa
  - regression-testing
  - diff
  - aparc
---

# aparcstatsdiff

## Summary

`aparcstatsdiff` compares the **cortical-parcellation morphometry (aparc) of two
single subjects** for a chosen hemisphere, parcellation scheme, and measure. It
runs [[aparcstats2table]] on the two subjects to build one table, then appends a
`pctdiff` row giving the percent difference of each cortical region's value
between the two subjects, prints the differing regions sorted by percent change,
and reports a sum-of-squares-of-differences total. Its exit code is the **number
of regions with a non-zero difference**, making it a per-subject pass/fail
regression check; it is driven by `test_recon-all.csh`. It is the cortical
counterpart of [[asegstatsdiff]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/aparcstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff)
- **Binary/script location:** `$FREESURFER_HOME/bin/aparcstatsdiff`
- **Tools invoked:** [`aparcstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L64) and the shell helper `fs_temp_file`. Percent and sum-of-square differences are computed inline with `bc`.

## Purpose and Context

When a code change might affect the cortical surface reconstruction or
parcellation, `aparcstatsdiff` quantifies how one reference subject's per-region
thickness/area/volume moved before vs. after the change. Given two subject IDs
plus a hemisphere, parcellation, and measure, it produces the side-by-side table
plus the percent change per region and an overall sum-of-squares discrepancy
score.

It is principally a **regression-test helper**. `test_recon-all.csh` calls it in
a triple loop over `{rh,lh} × {aparc,aparc.a2009s} × {area,volume,thickness}` and
treats a non-zero exit as a difference to report
([`scripts/test_recon-all.csh:696-715`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L696-L715)). It is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

Five positional arguments, plus an optional sixth
([`scripts/aparcstatsdiff:3-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L3-L61)):

- **`<subj1> <subj2>`** — two subject IDs under `$SUBJECTS_DIR`; both must exist
  and must be different.
- **`<hemi>`** — `rh` or `lh` (validated, [`scripts/aparcstatsdiff:41-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L41-L44)).
- **`<parc>`** — `aparc` or `aparc.a2009s` (validated,
  [`scripts/aparcstatsdiff:45-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L45-L48)).
- **`<meas>`** — `area`, `volume`, or `thickness` (validated,
  [`scripts/aparcstatsdiff:49-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L49-L52)).
- **`[<outdir>]`** *(optional)* — directory for the output table; defaults to the
  current directory ([`scripts/aparcstatsdiff:57-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L57-L61)).

### Input Assumptions

> [!assumption] Two finished subjects with the requested ?h.<parc>.stats
> Each subject must have the `stats/<hemi>.<parc>.stats` file that
> [[aparcstats2table]] reads for the requested measure. Unlike [[asegstatsdiff]],
> the [[aparcstats2table]] call here does **not** pass a common-structures flag,
> so the two subjects are expected to have the same cortical regions for the
> chosen parcellation (they normally do).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `aparcstats-<hemi>.<parc>.<meas>.txt` | `<outdir>` or `.` | The [[aparcstats2table]] table for the two subjects, with an appended `pctdiff` row giving the per-region percent change. |

The sorted list of differing regions and the sum-of-squares total are printed to
**stdout**; `test_recon-all.csh` redirects that into its per-combination log
([`scripts/test_recon-all.csh:702-703`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L702-L703)).

### Output Specifications

- The output filename is fixed by the inputs:
  `aparcstats-${hemi}.${parc}.${meas}.txt`
  ([`scripts/aparcstatsdiff:56-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L56-L61)).
- The appended `pctdiff` row holds the per-region percent change (or `0` for
  regions that did not change), [`scripts/aparcstatsdiff:98-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L98-L134).
- **Exit code = number of regions with a non-zero difference**
  (`exit ${diffcount}`, [`scripts/aparcstatsdiff:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L154)).

## Mathematical Foundations

For each cortical region, with subject-1 value $v_1$ and subject-2 value $v_2$,
let the difference be $d=v_2-v_1$ and the mean be $\bar v=(v_1+v_2)/2$. The
percent difference is

$$\text{pctdiff}=100\,\frac{d}{\bar v}=100\,\frac{v_2-v_1}{(v_1+v_2)/2}$$

([`scripts/aparcstatsdiff:108-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L108-L120)). The script also accumulates an overall
discrepancy as the **sum of squared raw differences**

$$\text{totaldiff}=\sum_{\text{regions}} d^2$$

reported at the end as "Total diff measure (sum-of-square-of-diff)"
([`scripts/aparcstatsdiff:110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L110), [`scripts/aparcstatsdiff:151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L151)). All
arithmetic is `bc` at `scale=4`.

> [!gotcha] Normalises by the average, unlike asegstatsdiff
> The percent here divides by the **average** of the two subjects ($d/\bar v$),
> matching [[stattablediff]] `--percent`, but differing from [[asegstatsdiff]],
> which divides by **subject 1**. The cortical and subcortical wrappers therefore
> use different percent conventions.

## Configuration Options

This tool takes **positional arguments only** — there are no flags.

| Position | Type | Default | Description |
|----------|------|---------|-------------|
| `<subj1>` | string | *(required)* | First subject ID (reference / "before"). |
| `<subj2>` | string | *(required)* | Second subject ID ("after"); must differ from `<subj1>`. |
| `<hemi>` | `rh`\|`lh` | *(required)* | Hemisphere. |
| `<parc>` | `aparc`\|`aparc.a2009s` | *(required)* | Cortical parcellation scheme. |
| `<meas>` | `area`\|`volume`\|`thickness` | *(required)* | Morphometric measure to compare. |
| `<outdir>` | string | `.` | Optional directory for the output table. |

### Configuration Interactions

There are no flags, but the four enumerated positional arguments are strictly
validated and any value outside the allowed set aborts with a specific message
([`scripts/aparcstatsdiff:41-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L41-L52)). The two subjects must be different
([`scripts/aparcstatsdiff:37-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L37-L40)). Note the validator accepts only the two
classic parcellations (`aparc`, `aparc.a2009s`) — `aparc.DKTatlas` and BA are not
permitted here (use [[stattablediff]]/[[groupstatsdiff]] for those).

## Typical Use Cases

### 1. Before/after a code change, one hemisphere/parc/measure

```bash
# Left-hemisphere Desikan-Killiany thickness, bert.before vs bert.after
aparcstatsdiff bert.before bert.after lh aparc thickness
echo "regions changed: $status"
```

### 2. As a regression check writing to a log directory

```bash
aparcstatsdiff ref_subj test_subj rh aparc.a2009s volume /path/to/logdir \
  > /path/to/logdir/aparcstatsdiff-rh-aparc.a2009s-volume.txt
# exit status (= number of changed regions) is the pass/fail signal
```

This mirrors `test_recon-all.csh`, which loops the call over both hemispheres,
both parcellations, and all three measures.

## Pipeline Context

`aparcstatsdiff` is a stand-alone QA helper invoked by the FreeSurfer test
harness `test_recon-all.csh`, not by [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** two finished [[wiki/pipelines/recon-all|recon-all]] subjects →
**aparcstatsdiff** → **Successor:** the test harness's pass/fail logic (or manual
inspection of the table).

It is the **cortical** sibling of [[asegstatsdiff]] (same one-vs-one,
build-table-then-append-pctdiff pattern) and the **per-subject** counterpart of
the group-table [[stattablediff]].

## Gotchas and Caveats

> [!gotcha] Non-zero exit means "differences found," not "crashed"
> The exit code is the **count of regions that changed**
> ([`scripts/aparcstatsdiff:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L154)); a successful run with any real difference
> exits non-zero. Distinguish it from the genuine error exits (which print a
> `FAILED:`/usage/validation message and `exit 1`).

> [!gotcha] Only one hemisphere/parc/measure per invocation
> Unlike [[groupstatsdiff]], this script does a single combination at a time; to
> cover all of them you must loop (as `test_recon-all.csh` does).

> [!gotcha] Column-count guards abort on table shape mismatch
> The script checks that the label row and both subject rows have equal column
> counts and aborts otherwise ([`scripts/aparcstatsdiff:82-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L82-L93)), catching a
> malformed [[aparcstats2table]] output before computing bogus diffs.

## Error Compensation and Guard Rails

- **Existence, distinctness, and value validation.** Both subjects must exist and
  differ, and `hemi`/`parc`/`meas` must each be one of the allowed values, or the
  script aborts with a specific message ([`scripts/aparcstatsdiff:29-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L29-L52)).
- **Build-failure surfacing.** If [[aparcstats2table]] fails, its captured output
  is printed and the script exits 1 ([`scripts/aparcstatsdiff:70-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L70-L75)).
- **Zero-difference rows recorded as 0.** Regions with no change get an explicit
  `0` in the `pctdiff` row rather than being dropped
  ([`scripts/aparcstatsdiff:125-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L125-L127)), keeping the row aligned with the
  table columns.

## Related Tools

- [[aparcstats2table]] — the tool `aparcstatsdiff` runs to build the cortical table.
- [[asegstatsdiff]] — the subcortical sibling (takes just two subjects, compares aseg volume).
- [[stattablediff]] — the table-level (group) diff engine; the many-subject analogue.
- [[groupstatsdiff]] — full cross-version group QA, which uses [[stattablediff]] across all parcellations/measures.

## Confidence and Gaps

**High confidence:** the five/six positional-argument contract and its
validation, the [[aparcstats2table]] invocation, the
normalise-by-average percent formula, the sum-of-squares total, the appended
`pctdiff` row, and the count-of-differences exit code — all read directly from
[`scripts/aparcstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff) and confirmed by its
loop usage in [`scripts/test_recon-all.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L696-L715).

## References

- FreeSurfer source: [`scripts/aparcstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff) (v8.2.0).
- Built-in usage: run `aparcstatsdiff` with no arguments
  ([`scripts/aparcstatsdiff:3-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparcstatsdiff#L3-L25)).
- Caller: [`scripts/test_recon-all.csh:696-715`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L696-L715).
