---
title: "groupstatsdiff"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/groupstatsdiff"
families: []                     # standalone cross-version QA driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[groupstats]]"
  - "[[stattablediff]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mri_glmfit-sim]]"
  - "[[mri_compute_seg_overlap]]"
  - "[[fscalc]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - group-analysis
  - qa
  - regression-testing
  - diff
  - cross-version
---

# groupstatsdiff

## Summary

`groupstatsdiff` compares **two output directories produced by [[groupstats]]**
to evaluate the difference between two recon-all analyses — typically two
FreeSurfer versions, the same version on two platforms, or two parameter
settings. For every ROI table it runs [[stattablediff]] to compute a per-subject
percent-difference table and then fits a GLM with
[[wiki/tools/mri_glmfit|mri_glmfit]]; for every smoothed surface map it computes
a voxel-wise difference (and percent difference) with [[fscalc]] and fits a GLM
(with [[mri_glmfit-sim]] cluster correction); and for the aseg segmentations it
computes per-subject Dice overlap with [[mri_compute_seg_overlap]]. The result
is a difference directory that quantifies, structure by structure and vertex by
vertex, how the two analyses diverge.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/groupstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff)
- **Binary/script location:** `$FREESURFER_HOME/bin/groupstatsdiff`
- **Tools invoked:** [`stattablediff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L94), [`mri_glmfit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L101), [`mri_compute_seg_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L121) (Dice), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L210), and [`mri_glmfit-sim`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L230).

## Purpose and Context

A recurring FreeSurfer QA question is "did this change alter the output, and by
how much?" `groupstatsdiff` answers it at the **group level**. You run
[[groupstats]] twice — once on each analysis condition, with the **same subjects**
— and pass the two resulting directories (`--g1`, `--g2`). The script then
mirrors the structure of the [[groupstats]] output, replacing each "build"
operation with a "difference" operation:

- ROI tables → [[stattablediff]] (percent diff, common structures) → GLM.
- Surface maps → [[fscalc]] subtraction (and percent diff) → GLM (+ cluster sim).
- aseg volumes → [[mri_compute_seg_overlap]] Dice per subject.

It reads the analysis configuration (measures, hemispheres, parcellations, FWHM)
**from the `--g1` directory's manifest files**, so the two inputs must have been
produced with compatible [[groupstats]] settings. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] OSGM vs. native FSGD changes the question being asked
> With `--osgm` the GLM tests the **mean paired difference** between the two
> analyses (the usual "are they different?" test). Without it, the script uses the
> FSGD design from the [[groupstats]] run, which tests for an **interaction**
> between the effect of interest (e.g. age) and the analysis condition
> ([`scripts/groupstatsdiff:521-528`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L521-L528)). If [[groupstats]] was run with OSGM,
> the two modes coincide.

## Inputs

### Required Inputs

- **`--g1 <group1dir>`** and **`--g2 <group2dir>`** — two [[groupstats]] output
  directories (must exist; checked at parse time,
  [`scripts/groupstatsdiff:281-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L281-L284) and
  [`scripts/groupstatsdiff:290-293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L290-L293)).
- **`--o <outdir>`** — output difference directory (created).

### Input Assumptions

> [!assumption] Two compatible groupstats directories with the same subjects
> Both inputs must contain the files [[groupstats]] writes: `group.fsgd`,
> `rois/*.dat`, `maps/*.sm*.mgh`, and the manifest files
> `mapmeas.list.txt`/`hemi.list.txt`/`aparc.list.txt`/`fwhm.list.txt`. The
> measure/hemi/aparc/fwhm lists are read from **`--g1` only**
> ([`scripts/groupstatsdiff:72-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L72-L75)), so `--g2` is assumed to have the same
> configuration. The subjects should match between the two runs (relax with
> `--allow-subj-diff`, which is forwarded to [[stattablediff]] as `--diff-subjs`).

- **FSGD source.** The design used by the GLM is `--g1`'s `group.fsgd`
  ([`scripts/groupstatsdiff:463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L463)); the subject list for Dice comes from its
  `Input` lines ([`scripts/groupstatsdiff:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L109)).
- **Dice subject directories.** For the aseg Dice step, the original
  `$SUBJECTS_DIR` of each run is needed to find `aseg.mgz`; by default it is the
  **parent directory** of each group dir (`dirname $g1dir`), overridable with
  `--sd1`/`--sd2` ([`scripts/groupstatsdiff:465-466`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L465-L466)).

## Outputs

All output is written under `--o`, mirroring [[groupstats]]: `rois/` for table
diffs and their GLMs, `maps/` for map diffs and their GLMs, and a dedicated
`rois/aseg.dice/` directory.

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `groupstatsdiff.log` | `outdir/` | Full command log (`--log` / `--no-log`). |
| `rois/diff.<table>.dat` | `outdir/rois/` | Per-subject percent-difference table from [[stattablediff]] for each aseg/aparc/wmparc ROI table. |
| `rois/glm.<table>/` | `outdir/rois/` | [[wiki/tools/mri_glmfit|mri_glmfit]] output for each difference table. |
| `rois/aseg.dice/dice.dat` | `outdir/rois/aseg.dice/` | Concatenated per-subject aseg Dice overlap values. |
| `rois/aseg.dice/<subj>.dice.dat`, `<subj>.dice.table.dat` | `outdir/rois/aseg.dice/` | Per-subject Dice output from [[mri_compute_seg_overlap]]. |
| `rois/aseg.dice/{aseg.ctab,slist.txt}` | `outdir/rois/aseg.dice/` | The color table used and the subject list. |
| `maps/diff.<meas>.<hemi>.sm<NN>.mgh` | `outdir/maps/` | Voxel-wise map difference (`fscalc sub0`). |
| `maps/pctdiff.<meas>.<hemi>.sm<NN>.mgh` | `outdir/maps/` | Voxel-wise percent map difference (`fscalc pctdiff0`). |
| `maps/glm.<meas>.<hemi>.sm<NN>/` | `outdir/maps/` | [[wiki/tools/mri_glmfit|mri_glmfit]] (+ [[mri_glmfit-sim]] for fwhm>0) on the map difference. |

### Output Specifications

- Difference **tables** are stats tables (`Measure:<meas>-diff`) consumable by
  [[wiki/tools/mri_glmfit|mri_glmfit]] `--table`.
- Difference **maps** are `.mgh` on the **fsaverage** surface, computed as
  `g1 - g2` with any voxel that is zero in either input set to zero
  ([`scripts/groupstatsdiff:208-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L208-L210)); the percent map uses `fscalc pctdiff0`
  ([`scripts/groupstatsdiff:236-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L236-L237)).
- The help suggests visualising a result as, e.g., an overlay of
  `maps/glm.thickness.lh.sm10/osgm/sig.mgh` with a time-course of
  `maps/diff.thickness.lh.sm10.mgh` ([`scripts/groupstatsdiff:529-537`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L529-L537)).

## Mathematical Foundations

`groupstatsdiff` is an orchestration script; the numerics are in the tools it
calls. The percent-difference table arithmetic
($100\,(a-b)/[(a+b)/2]$) is performed by [[stattablediff]]; the voxel-wise
difference and percent difference are performed by [[fscalc]] (`sub0`,
`pctdiff0`); the GLM/contrast statistics by
[[wiki/tools/mri_glmfit|mri_glmfit]]; cluster correction by
[[mri_glmfit-sim]]; and the segmentation overlap is the **Dice coefficient**
computed by [[mri_compute_seg_overlap]]:

$$\mathrm{Dice}(A,B)=\frac{2\,|A\cap B|}{|A|+|B|}$$

> [!internal] Difference and statistics math live in the called tools
> See [[stattablediff]] (table percent diff and zero-denominator handling),
> [[fscalc]] (`sub0`/`pctdiff0` voxel ops), [[mri_compute_seg_overlap]] (Dice),
> [[wiki/tools/mri_glmfit|mri_glmfit]] (GLM), and [[mri_glmfit-sim]] (cluster FWE).

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/groupstatsdiff:265-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L265-L435)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--g1` | string (dir) | *(required)* | First [[groupstats]] output directory. |
| `--g2` | string (dir) | *(required)* | Second [[groupstats]] output directory (compared against `--g1`). |
| `--o` | string | *(required)* | Output difference directory. |
| `--osgm` | bool | off (native FSGD) | Use a one-sample group-mean GLM (`mri_glmfit --osgm`) instead of the FSGD design — tests the mean difference between the two analyses. |
| `--common` / `--no-common` | bool | common **on** | Pass / withhold `--common` to [[stattablediff]] so only structures present in both tables are diffed. |
| `--allow-subj-diff`<br>`--no-allow-subj-diff` | bool | off | Allow the two runs to have differently named subjects (forwards `--diff-subjs` to [[stattablediff]]). |
| `--no-maps` | bool | maps on | ROI/table diffs only; skip the surface-map difference branch. |
| `--no-area`<br>`--noarea` | bool | off | Exclude the `area` measure from both ROI and map diffs. |
| `--no-volume`<br>`--novolume` | bool | off | Exclude the `volume` measure from both ROI and map diffs. |
| `--no-aparcstats` | bool | on | Skip the cortical (aparc/BA/a2009s) table diffs. |
| `--no-asegstats` | bool | on | Skip the aseg table diffs (and, with them, the Dice step). |
| `--no-wmparcstats` | bool | on | Skip the wmparc table diff. **Note:** this case sets `DoAsegStats=0`, not `DoWMParcStats` (see gotcha). |
| `--no-stats` | bool | on | Skip **all** ROI/table diffs (aparc + aseg + wmparc); maps still run. |
| `--no-ba`<br>`--no-BA`<br>`--noba` | bool | off | Skip the Brodmann-area (`BA`) table diffs. |
| `--no-prune` | bool | prune on | Pass `--no-prune` to [[wiki/tools/mri_glmfit|mri_glmfit]] on the map diffs (may be necessary when g1 == g2). |
| `--fwhm` | float (repeatable) | from `--g1` manifest | Override the FWHM list (each value must already exist as a smoothed map in both inputs). |
| `--sd1` / `--sd2` | string (dir) | parent of `--g1` / `--g2` | Subjects directories used to locate `aseg.mgz` for the Dice computation. |
| `--no-dice` | bool | dice **on** | Skip the per-subject aseg Dice overlap step. |
| `--dice-ctab` | string (file) | `$FREESURFER_HOME/ASegStatsLUT.txt` | Color table for the Dice computation. |
| `--lh` / `--rh` | bool | from `--g1` manifest | Restrict to one hemisphere. |
| `--log` | string | `outdir/groupstatsdiff.log` | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | log on | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temporary directory (also sets `nocleanup`). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temporary files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--no-wmparcstats` disables aseg stats, not wmparc — likely a copy-paste bug
> The `--no-wmparcstats` case sets `DoAsegStats = 0`
> ([`scripts/groupstatsdiff:372-374`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L372-L374)) rather than `DoWMParcStats = 0`. So
> `--no-wmparcstats` actually turns off the **aseg** table diffs and Dice, while
> the wmparc diff still runs. (Only `--no-stats` reliably turns off the wmparc
> branch.) Code is authoritative; treat the flag name as misleading. See
> [[bugs/groupstatsdiff-no-wmparcstats]] if a bug page exists.

> [!gotcha] `--common` is on by default here, unlike bare stattablediff
> [[stattablediff]] does not intersect structures unless told to, but
> `groupstatsdiff` defaults `DoCommon=1` and passes `--common`
> ([`scripts/groupstatsdiff:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L95)). Use `--no-common` only if you are certain the
> two runs produced identical structure sets (otherwise the diff will abort on
> the first mismatched table).

> [!gotcha] The fsgd-equality guard is disabled
> `check_params` computes whether the two `group.fsgd` files differ but the
> abort is gated behind a constant `0` (`if(0 && $n != 0)`,
> [`scripts/groupstatsdiff:458-462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L458-L462)), so a mismatch is **not** caught. The
> design from `--g1` is used regardless. Make sure the two runs share a design.

> [!gotcha] An `area` map-GLM error is swallowed
> If [[wiki/tools/mri_glmfit|mri_glmfit]] fails on the **area** map difference,
> the script assumes it is due to pruning of zero area-diffs (which "can happen
> when comparing t1-only with the t2 stream") and continues to the next measure
> instead of aborting ([`scripts/groupstatsdiff:220-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L220-L227)). A genuine area
> failure will therefore be masked; consider `--no-prune`.

### `--fwhm` override semantics

`--fwhm` here **overrides** the FWHM list from the manifest, but only values that
were actually smoothed by [[groupstats]] (i.e. for which `*.sm<NN>.mgh` exists in
both inputs) will work — `groupstatsdiff` does no smoothing of its own. Repeated
`--fwhm` accumulate ([`scripts/groupstatsdiff:331-334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L331-L334)); if none is given the
list is taken from `--g1`'s `fwhm.list.txt` ([`scripts/groupstatsdiff:75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L75)).

## Typical Use Cases

### 1. Difference between two FreeSurfer versions (OSGM)

```bash
# g.v7 and g.v8 are groupstats outputs over the same subjects
groupstatsdiff --g1 g.v7 --g2 g.v8 --o diff.v7v8 --osgm
```

Produces percent-diff ROI tables + GLMs, map diffs + GLMs, and per-subject aseg
Dice in `diff.v7v8/`.

### 2. Test for an age × version interaction (native FSGD)

```bash
# group.fsgd in each input encodes the age covariate
groupstatsdiff --g1 g.v7 --g2 g.v8 --o diff.interaction
```

Omitting `--osgm` uses the FSGD design to test whether the version effect depends
on age.

### 3. Same-version platform comparison, ROI tables only, no Dice

```bash
groupstatsdiff --g1 g.linux --g2 g.mac --o diff.platform \
  --osgm --no-maps --no-dice
```

### 4. Identical inputs sanity check (avoid prune error)

```bash
# When g1 == g2 the map diffs are all zero; disable pruning so mri_glmfit succeeds
groupstatsdiff --g1 g.v8 --g2 g.v8 --o diff.self --osgm --no-prune
```

## Pipeline Context

`groupstatsdiff` is the **second half** of the [[groupstats]] regression-QA
workflow. It is not called by recon-all or trac-all.

**Predecessor:** [[groupstats]] (run once per analysis condition) →
**groupstatsdiff** → **Successor:** inspection of the difference maps/tables
(e.g. in [[wiki/tools/freeview|freeview]]) or the per-subject Dice scores.

Internally it dispatches: [[stattablediff]] → [[wiki/tools/mri_glmfit|mri_glmfit]]
for the ROI branch; [[fscalc]] → [[wiki/tools/mri_glmfit|mri_glmfit]] →
[[mri_glmfit-sim]] for the map branch; and [[mri_compute_seg_overlap]] for the
aseg Dice branch.

## Gotchas and Caveats

> [!gotcha] Configuration is inherited from --g1, not re-derived
> Measures, hemispheres, parcellations, and FWHM all come from `--g1`'s manifest
> files ([`scripts/groupstatsdiff:72-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L72-L75)). If `--g2` was built with a
> different measure or hemisphere set, the corresponding tables/maps in `--g2`
> simply will not be found and the run errors on the missing file. Build both
> inputs with the same [[groupstats]] options.

> [!gotcha] Dice needs the original subjects directories
> The Dice step reads `<sd>/<subj>/mri/aseg.mgz` for each run
> ([`scripts/groupstatsdiff:117-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L117-L118)). The default `sd1`/`sd2` is the parent
> of the group dir; if your group directories are not siblings of the
> `$SUBJECTS_DIR` used to create them, you must pass `--sd1`/`--sd2` explicitly or
> `--no-dice`.

> [!gotcha] aseg "other" hemisphere is diffed too
> Like [[groupstats]], the aseg loop runs over `lh rh other`
> ([`scripts/groupstatsdiff:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L87)), so you will see `diff.aseg.other.*` tables.

## Error Compensation and Guard Rails

- **Input existence checks.** `--g1`, `--g2`, `--sd1`, `--sd2`, and
  `--dice-ctab` are all verified to exist at parse time and abort if missing
  ([`scripts/groupstatsdiff:278-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L278-L321)).
- **Exit-on-error.** Each [[stattablediff]]/[[wiki/tools/mri_glmfit|mri_glmfit]]
  /[[fscalc]] step aborts the script on non-zero status (`if($status) exit 1`),
  **except** the `--osgm`-independent area-map special case (above) and the
  cluster-sim step.
- **Common-structure default.** `--common` is on by default so mismatched
  structure lists are reconciled rather than fatal (above).
- **Zero-in-either-input → zero.** The map difference and percent-difference set
  any voxel that is zero in either input to zero
  ([`scripts/groupstatsdiff:208-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L208-L210)), avoiding spurious large diffs at
  medial-wall / undefined vertices.

## Related Tools

- [[groupstats]] — produces the two input directories; `groupstatsdiff` consumes them.
- [[stattablediff]] — the per-table percent-diff engine called once per ROI table.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — fits the GLM to each difference table/map.
- [[mri_glmfit-sim]] — cluster-wise correction for the smoothed map diffs.
- [[fscalc]] — computes the voxel-wise map difference and percent difference.
- [[mri_compute_seg_overlap]] — computes per-subject aseg Dice overlap.

## Confidence and Gaps

**High confidence:** the full flag set and aliases, the OSGM-vs-FSGD logic, the
config-from-`--g1` inheritance, the table/map/Dice three-branch structure, the
default-on `--common`, the input existence checks, and the `area` special case —
all read directly from
[`scripts/groupstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff). The
`--no-wmparcstats` → `DoAsegStats=0` behaviour and the constant-`0`-gated fsgd
check are verbatim from the source and are flagged as likely defects above.

## References

- FreeSurfer source: [`scripts/groupstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff) (v8.2.0).
- Built-in help: `groupstatsdiff --help` (the `BEGINHELP` block, [`scripts/groupstatsdiff:512-539`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff#L512-L539)).
- Companion: [`scripts/groupstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats) (produces the input directories).
