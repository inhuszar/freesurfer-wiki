---
title: "asegstatsdiff"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/asegstatsdiff"
families: []                     # standalone per-subject QA wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[asegstats2table]]"
  - "[[aparcstatsdiff]]"
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
  - aseg
---

# asegstatsdiff

## Summary

`asegstatsdiff` compares the **subcortical segmentation statistics (aseg) of two
single subjects**. It runs [[asegstats2table]] on the two subjects to build one
`asegstats.txt` table, then appends a `pctdiff` row holding the percent
difference of each structure's volume between subject 1 and subject 2, and prints
a sorted list of the structures that differ. Its exit code is the **number of
structures with a non-zero difference**, which makes it a convenient pass/fail
check for regression testing — and indeed it is driven by
`test_recon-all.csh`. It is the per-subject, one-vs-one counterpart of the
table-level [[stattablediff]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/asegstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff)
- **Binary/script location:** `$FREESURFER_HOME/bin/asegstatsdiff`
- **Tools invoked:** [`asegstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L40) (with `--common-segs`) and the shell helper `fs_temp_file`. Percent differences are computed inline with `bc`.

## Purpose and Context

When a code change might affect the automatic subcortical segmentation, the
quickest sanity check is to process one reference subject before and after the
change and quantify how its aseg volumes moved. `asegstatsdiff` packages that:
given two subject IDs it produces the side-by-side volume table plus the percent
change per structure, and signals (via exit code) whether anything changed.

It exists primarily as a **regression-test helper**. `test_recon-all.csh`
invokes it as `asegstatsdiff ref_subj <test_subj> <logdir>` and treats a non-zero
exit as a difference to report ([`scripts/test_recon-all.csh:682-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L682-L693)). It is
**not** part of [[wiki/pipelines/recon-all|recon-all]] itself.

## Inputs

### Required Inputs

- **`<subj1> <subj2>`** — two subject IDs under `$SUBJECTS_DIR`; both must exist
  and must be **different** ([`scripts/asegstatsdiff:22-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L22-L33)).
- **`[<outdir>]`** *(optional)* — directory to write `asegstats.txt`; defaults to
  the current directory ([`scripts/asegstatsdiff:34-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L34-L38)).

### Input Assumptions

> [!assumption] Two finished subjects with aseg.stats
> Each subject must have the `stats/aseg.stats` that [[asegstats2table]] reads.
> Because it is called with `--common-segs`, structures present in only one
> subject are dropped rather than causing a failure
> ([`scripts/asegstatsdiff:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L40)). The script compares the **volume** column
> (it greps the header line for `:volume`, [`scripts/asegstatsdiff:50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L50)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `asegstats.txt` | `<outdir>` or `.` | The [[asegstats2table]] volume table for the two subjects, with an appended `pctdiff` row giving the per-structure percent change. |

The sorted list of differing structures, and a header block, are printed to
**stdout** (not saved to a file); `test_recon-all.csh` redirects that stdout into
its own log ([`scripts/test_recon-all.csh:684-685`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L684-L685)).

### Output Specifications

- The appended row is labelled `pctdiff`; a structure with zero difference gets a
  literal `0`, otherwise the percent value ([`scripts/asegstatsdiff:70-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L70-L103)).
- **Exit code = number of structures with a non-zero difference**
  (`exit ${diffcount}`, [`scripts/asegstatsdiff:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L119)). Exit 0 means the two
  subjects' aseg volumes are identical.

## Mathematical Foundations

For each structure, with subject-1 volume $v_1$ and subject-2 volume $v_2$, the
difference is $d=v_2-v_1$ and the percent difference is

$$\text{pctdiff}=100\,\frac{v_2-v_1}{v_1}\quad(\text{if } v_1\neq 0),\qquad
100\,\frac{v_2-v_1}{v_2}\quad(\text{if } v_1=0)$$

i.e. it normalises by subject 1, falling back to subject 2 only when $v_1=0$
([`scripts/asegstatsdiff:79-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L79-L89)). All arithmetic is done with `bc` at
`scale=4`.

> [!gotcha] Different normaliser than aparcstatsdiff and stattablediff
> `asegstatsdiff` normalises by **subject 1** ($d/v_1$), whereas
> [[aparcstatsdiff]] normalises by the **average** of the two ($d/\bar v$) and
> [[stattablediff]] `--percent` also uses the average. The percent values from the
> three tools are therefore not directly comparable.

## Configuration Options

This tool takes **positional arguments only** — there are no flags.

| Position | Type | Default | Description |
|----------|------|---------|-------------|
| `<subj1>` | string | *(required)* | First subject ID (the reference / "before"). |
| `<subj2>` | string | *(required)* | Second subject ID (the "after"); must differ from `<subj1>`. |
| `<outdir>` | string | `.` | Optional directory for `asegstats.txt`. |

### Configuration Interactions

There are no flags and therefore no flag interactions. The only constraints are
positional: exactly two subject names (a third argument is taken as the output
directory), and the two subjects must be different
([`scripts/asegstatsdiff:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L30-L33)).

## Typical Use Cases

### 1. Before/after a code change on one subject

```bash
# Compare subject bert.before with bert.after; result table in current dir
asegstatsdiff bert.before bert.after
echo "structures changed: $status"
```

### 2. As a regression check writing to a log directory

```bash
asegstatsdiff ref_subj test_subj /path/to/logdir > /path/to/logdir/asegstatsdiff.txt
# exit status (= number of changed structures) is the pass/fail signal
```

This is exactly how `test_recon-all.csh` uses it.

## Pipeline Context

`asegstatsdiff` is a stand-alone QA helper invoked by the FreeSurfer test
harness `test_recon-all.csh`, not by [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** two finished [[wiki/pipelines/recon-all|recon-all]] subjects →
**asegstatsdiff** → **Successor:** the test harness's pass/fail logic (or manual
inspection of `asegstats.txt`).

It is the **per-subject** analogue of [[stattablediff]]: where `stattablediff`
diffs two whole group tables of the same subjects, `asegstatsdiff` diffs **two
subjects within one freshly built table**. For the cortical-parcellation
equivalent see [[aparcstatsdiff]].

## Gotchas and Caveats

> [!gotcha] Non-zero exit is success-with-differences, not failure
> The exit code is the **count of changed structures**
> ([`scripts/asegstatsdiff:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L119)), so any real difference makes the script exit
> non-zero even though it ran correctly. Do not treat a non-zero status as a
> crash; distinguish it from the genuine error exits (which print a `FAILED:` or
> usage message). `test_recon-all.csh` deliberately reports the count.

> [!gotcha] Only volume is compared
> The script extracts the `:volume` column from [[asegstats2table]]
> ([`scripts/asegstatsdiff:50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L50)); aseg intensity or other measures are not
> considered. For multi-measure ROI comparison use [[groupstatsdiff]] /
> [[stattablediff]].

> [!gotcha] Column-count guards abort on table shape mismatch
> If the label row and a subject row, or the two subject rows, have unequal
> numbers of columns, the script aborts with a message
> ([`scripts/asegstatsdiff:54-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L54-L65)) — this catches a malformed
> [[asegstats2table]] output before computing bogus diffs.

## Error Compensation and Guard Rails

- **Existence and distinctness checks.** Both subjects are verified to exist and
  to be different before any work is done
  ([`scripts/asegstatsdiff:22-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L22-L33)).
- **`--common-segs` tolerance.** [[asegstats2table]] is run with `--common-segs`
  so a structure present in only one subject does not abort the table build
  ([`scripts/asegstatsdiff:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L40)).
- **Zero-volume normaliser fallback.** When subject 1's volume is zero, the
  percent is normalised by subject 2 instead, avoiding division by zero
  ([`scripts/asegstatsdiff:82-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L82-L86)).
- **Build-failure surfacing.** If [[asegstats2table]] fails, its captured output
  is printed and the script exits 1 ([`scripts/asegstatsdiff:43-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L43-L47)).

## Related Tools

- [[asegstats2table]] — the tool `asegstatsdiff` runs to build the volume table.
- [[aparcstatsdiff]] — the cortical-parcellation sibling (same pattern, takes hemi/parc/meas).
- [[stattablediff]] — the table-level (group) diff engine; the many-subject analogue.
- [[groupstatsdiff]] — full cross-version group QA, which uses [[stattablediff]] rather than this per-subject wrapper.

## Confidence and Gaps

**High confidence:** positional-argument contract, the `--common-segs`
[[asegstats2table]] invocation, the volume-only comparison, the
normalise-by-subject-1 percent formula with zero fallback, the appended
`pctdiff` row, and the count-of-differences exit code — all read directly from
[`scripts/asegstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff) and confirmed by its
usage in [`scripts/test_recon-all.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L682-L693).

## References

- FreeSurfer source: [`scripts/asegstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff) (v8.2.0).
- Built-in usage: run `asegstatsdiff` with no arguments
  ([`scripts/asegstatsdiff:5-20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/asegstatsdiff#L5-L20)).
- Caller: [`scripts/test_recon-all.csh:682-693`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/test_recon-all.csh#L682-L693).
