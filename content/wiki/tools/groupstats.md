---
title: "groupstats"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/groupstats"
families: []                     # standalone group-analysis driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[aparcstats2table]]"
  - "[[asegstats2table]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mris_preproc]]"
  - "[[mris_fwhm]]"
  - "[[mri_glmfit-sim]]"
  - "[[groupstatsdiff]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - statistics
  - group-analysis
  - glm
  - qa
  - regression-testing
---

# groupstats

## Summary

`groupstats` builds a complete group-analysis directory from a set of finished
recon-all subjects. In a single run it (1) assembles surface ROI tables for
every cortical parcellation (aparc, BA, aparc.a2009s) and surface measure
(thickness, area, volume, w-g.pct) with [[aparcstats2table]], (2) assembles
subcortical and white-matter ROI tables with [[asegstats2table]] (aseg volume
and intensity, wmparc volume), (3) concatenates and smooths the vertex-wise
surface maps with [[mris_preproc]] and [[mris_fwhm]], and (4) fits a GLM with
[[wiki/tools/mri_glmfit|mri_glmfit]] (plus cluster simulation via
[[mri_glmfit-sim]]) to every table and every smoothed map. It was written
primarily as a regression-testing harness — its output is the input to
[[groupstatsdiff]] — but it can serve as an almost-complete group study by
itself.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/groupstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats)
- **Binary/script location:** `$FREESURFER_HOME/bin/groupstats`
- **Tools invoked:** [`aparcstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L145), [`asegstats2table`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L198), [`mri_glmfit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L151), [`mris_preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L245), [`mris_fwhm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L256), and [`mri_glmfit-sim`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L269), plus the shell helper `fs_temp_file`.

## Purpose and Context

A group study in FreeSurfer normally requires running several preparation tools
by hand: stats tables for the ROI analyses, concatenation and smoothing for the
vertex-wise (map) analyses, and a GLM fit for each. `groupstats` packages that
entire preparation into one command driven by a single subject list (or an FSGD
design file). The result is a self-describing output directory under `rois/` and
`maps/` that holds every intermediate table, concatenated map, smoothed map, and
GLM directory.

Its design intent is **regression QA**: run it on the same subjects under two
conditions (two FreeSurfer versions, two platforms, two parameter sets), then
hand the two output directories to [[groupstatsdiff]] to test for systematic
differences. Because it runs "more tests than one would normally do for a typical
study" ([`scripts/groupstats:552-559`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L552-L559)), it is comprehensive enough to also
be used as a real analysis driver. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] If you intend to diff versions later, keep subject names identical
> The help explicitly warns that to use [[groupstatsdiff]] across FreeSurfer
> versions, the subject names must be the same in both runs
> ([`scripts/groupstats:572-574`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L572-L574)), because the downstream
> [[stattablediff]] pairs subjects positionally and (by default) by name.

## Inputs

### Required Inputs

- **A subject specification** — either `--f <subjectfile>` (one subject ID per
  line, [`scripts/groupstats:321-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L321-L324)) **or** `--fsgd <group.fsgd>` (a
  FreeSurfer Group Descriptor file, which must contain a `Contrast` line,
  [`scripts/groupstats:326-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L326-L338)). At least one is required; if both are
  given, the subject list comes from `--f`
  ([`scripts/groupstats:453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L453)).
- **`--o <outdir>`** — the output group-analysis directory (created).
- **`--fwhm <mm>`** — at least one surface smoothing level; required even if you
  do not want to smooth (use `--fwhm 0`), [`scripts/groupstats:460-464`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L460-L464).
- Each subject must be a **finished recon-all** directory under `$SUBJECTS_DIR`
  with the surface ROI stats, aseg/wmparc stats, and surface measure overlays
  present.

### Input Assumptions

> [!assumption] Completed recon-all subjects sharing fsaverage space
> Every subject must have a `scripts/recon-all.done` file and **no**
> `recon-all.error` or stray `IsRunning.*` file
> ([`scripts/groupstats:466-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L466-L491)); otherwise the run aborts (unless
> `--wait` is used, which polls until the `.done` files appear). The map analyses
> resample each subject to **fsaverage** via the `sphere.reg` surface registration
> (override with `--srcsurfreg`), so all subjects must have been registered to
> fsaverage. The script auto-creates an `fsaverage` symlink in `$SUBJECTS_DIR` if
> missing ([`scripts/groupstats:111-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L111-L115)).

- **OSGM vs. design.** With `--f`, the script writes its own one-sample
  group-mean (OSGM) FSGD file ([`scripts/groupstats:77-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L77-L86)); with `--fsgd`,
  it copies your design to `group.fsgd` and your `Contrast` line drives the GLM.
- **Brodmann-area naming.** It probes `lh.BA.stats`; if absent it falls back to
  `lh.BA_exvivo.stats` and records the `_exvivo` suffix, so both old and new BA
  label naming are handled ([`scripts/groupstats:117-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L117-L128)).
- **Build consistency check.** It reads each subject's
  `scripts/build-stamp.txt`; if the subjects were processed with **different
  FreeSurfer builds**, it warns (and sleeps 5 s) but continues
  ([`scripts/groupstats:88-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L88-L101)).

## Outputs

All output lands under `--o <outdir>`, in `rois/` (table + GLM analyses) and
`maps/` (concatenated/smoothed surface maps + GLM analyses), plus several
manifest files at the top level.

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `group.fsgd` | `outdir/` | The design used: your `--fsgd` copy, or the auto-generated OSGM design. |
| `groupstats.log` | `outdir/` | Full command log (override with `--log`, suppress with `--no-log`). |
| `build-stamp.txt` | `outdir/` | Per-subject FreeSurfer build stamp (for the consistency check). |
| `subjectslist.txt`, `hemi.list.txt`, `aparc.list.txt`, `mapmeas.list.txt`, `fwhm.list.txt` | `outdir/` | Manifests of subjects, hemispheres, parcellations, measures, and smoothing levels — **read back verbatim by [[groupstatsdiff]]**. |
| `rois/<aparc>.<hemi>.<surf>.<meas>.dat` | `outdir/rois/` | ROI table from [[aparcstats2table]] for each parcellation/measure. |
| `rois/aseg.<hemi>.{volume,intensity}.dat`, `rois/wmparc.vol.dat` | `outdir/rois/` | Subcortical and WM-parcellation ROI tables from [[asegstats2table]]. |
| `rois/glm.<...>/` | `outdir/rois/` | One [[wiki/tools/mri_glmfit|mri_glmfit]] output directory per ROI table. |
| `maps/<meas>.<hemi>.sm00.mgh` | `outdir/maps/` | Unsmoothed concatenated surface map from [[mris_preproc]]. |
| `maps/<meas>.<hemi>.sm<NN>.mgh` | `outdir/maps/` | Map smoothed to FWHM `NN` mm by [[mris_fwhm]]. |
| `maps/glm.<meas>.<hemi>.sm<NN>/` | `outdir/maps/` | [[wiki/tools/mri_glmfit|mri_glmfit]] output (with `--eres-save`) per smoothed map; for `fwhm>0` also [[mri_glmfit-sim]] cluster correction. |

### Output Specifications

- ROI tables are whitespace-delimited stats tables (subjects×ROIs) consumable by
  [[wiki/tools/mri_glmfit|mri_glmfit]] `--table` and by [[stattablediff]].
- Surface maps are `.mgh` on the **fsaverage** surface (one frame per subject).
  GLMs are fit with `mri_glmfit --surface fsaverage <hemi> --eres-save`.
- The naming and the manifest files form an implicit contract with
  [[groupstatsdiff]], which reconstructs the exact filenames from
  `mapmeas.list.txt`/`hemi.list.txt`/`aparc.list.txt`/`fwhm.list.txt`.

## Mathematical Foundations

`groupstats` is an **orchestration script**; the statistics live in the tools it
calls. The general linear model, contrasts, and significance maps are computed
by [[wiki/tools/mri_glmfit|mri_glmfit]]; surface smoothing is Gaussian
smoothing on the surface performed by [[mris_fwhm]]; cluster-wise correction is
the Monte-Carlo / cached simulation in [[mri_glmfit-sim]].

> [!internal] The GLM and smoothing math are in the called tools
> See [[wiki/tools/mri_glmfit|mri_glmfit]] for the GLM ($y = X\beta + n$,
> contrast $C\beta$, t/F statistics), [[mris_fwhm]] for surface-based Gaussian
> smoothing and FWHM estimation, and [[mri_glmfit-sim]] for cluster-wise
> family-wise-error correction. `groupstats` only wires their inputs and outputs
> together.

The only direct numerical step is the w-g.pct surface-map format probe and the
FWHM string formatting (`printf %02d`, [`scripts/groupstats:253`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L253)).

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/groupstats:298-438`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L298-L438)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Output group-analysis directory. |
| `--f` | string (file) | — | Subject list file (one ID per line); triggers a one-sample group-mean (OSGM) design. |
| `--fsgd` | string (file) | — | FreeSurfer Group Descriptor design file; must contain a `Contrast` line. Subjects taken from its `Input` lines if `--f` not given. |
| `--fwhm` | float (repeatable) | *(required)* | Surface smoothing FWHM in mm; repeat for several levels. Use `--fwhm 0` for no smoothing. |
| `--sd` | string | `$SUBJECTS_DIR` | Set the subjects directory. |
| `--srcsurfreg` | string | `sphere.reg` | Surface registration used by [[mris_preproc]] to resample to fsaverage. |
| `--m` | string | thickness area volume curv sulc w-g.pct | Replace the default map-measure list with a single given measure. |
| `--lh` | bool | both | Analyze left hemisphere only. |
| `--rh` | bool | both | Analyze right hemisphere only. |
| `--no-maps` | bool | maps on | ROI analysis only; skip concat/smooth/map-GLM (also sets `fwhm=0`). |
| `--no-aparcstats` | bool | on | Skip the cortical (aparc/BA/a2009s) ROI tables and GLMs. |
| `--no-asegstats` | bool | on | Skip the aseg (volume + intensity) ROI tables and GLMs. |
| `--no-wmparcstats` | bool | on | Skip the wmparc volume ROI table and GLM. (Usage text spells it `--no-wparcstats`.) |
| `--no-stats` | bool | on | Skip **all** ROI stats (aparc + aseg + wmparc); maps still run. |
| `--new` | bool | off | Use `thickness.new.mris_make_surfaces area.new.mris_make_surfaces volume` as the map measures (compare experimental surface placement). |
| `--base` | bool | off | Map measures `thickness area volume curv sulc` (excludes `w-g.pct`); for longitudinal **base** templates that lack w-g.pct. |
| `--keep53`<br>`--no-replace53` | bool | replace on | Keep FreeSurfer 5.3 aseg names (e.g. `Thalamus-Proper`) instead of passing `--replace53` to [[asegstats2table]]. |
| `--wait` | int (sec) | off | Poll every *N* seconds until every subject has a `recon-all.done` file, then proceed (for running alongside in-progress recons). |
| `--log` | string | `outdir/groupstats.log` | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | log on | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Use a specific temporary directory (also sets `nocleanup`). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temporary files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--f` and `--fsgd` are not exclusive — `--f` wins for the subject list
> The mutual-exclusion check is commented out
> ([`scripts/groupstats:445-448`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L445-L448)); if both are given the subjects come from
> `--f` but the **design/contrast** still comes from `--fsgd` (because `--f` does
> not overwrite the FSGD path). You must give **at least one**
> ([`scripts/groupstats:449-452`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L449-L452)).

> [!gotcha] An FSGD without a Contrast line is rejected
> `--fsgd` is validated to contain a `Contrast` line at parse time
> ([`scripts/groupstats:333-337`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L333-L337)). A design with only `Class`/`Variables`
> but no contrast will not run; add e.g. `Contrast ad-hc 1 -1`.

> [!gotcha] `--fwhm` is mandatory even with `--no-maps`
> `check_params` aborts if no `--fwhm` was given
> ([`scripts/groupstats:460-464`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L460-L464)). `--no-maps` separately forces `fwhm=0`
> ([`scripts/groupstats:345-348`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L345-L348)), but you still cannot omit the flag
> entirely if you reach the check without it — pass `--fwhm 0` for ROI-only runs.

> [!gotcha] `--m` overrides, multiple `--fwhm` accumulate
> `--m` **replaces** the whole measure list with the single argument
> ([`scripts/groupstats:367-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L367-L370)), whereas repeated `--fwhm` **append** to a
> list ([`scripts/groupstats:316-319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L316-L319)). `--new` and `--base` also replace the
> measure list, so the last of `--m`/`--new`/`--base` on the command line wins.

> [!gotcha] Some measure/parcellation/surface combinations are skipped by design
> `curv`/`sulc` are excluded from the ROI loop because they break
> [[aparcstats2table]] ([`scripts/groupstats:137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L137)); `w-g.pct` is only done for
> `aparc`+`white` and is computed via [[asegstats2table]] on the
> `?h.w-g.pct.stats` file, not [[aparcstats2table]]
> ([`scripts/groupstats:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L138), [`scripts/groupstats:156-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L156-L167)); and
> `aparc.a2009s`+`pial` is skipped ([`scripts/groupstats:134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L134)). These are not
> user errors — they are built-in exclusions.

### Resume / overwrite behaviour

There is no `--overwrite` flag exposed in the parser; the internal `OverWrite`
variable stays `0`, so each ROI table and concatenated/smoothed map is **skipped
if it already exists** (`if(! -e $outfile || $OverWrite)`,
e.g. [`scripts/groupstats:144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L144), [`scripts/groupstats:244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L244)). This makes
re-runs resumable but means stale outputs are reused — delete the output
directory to force a clean rebuild.

## Typical Use Cases

### 1. One-sample group-mean analysis from a subject list

```bash
# Subjects in subjects.txt; OSGM design auto-generated; smooth at 0 and 10 mm.
groupstats --f subjects.txt --o groupana --fwhm 0 --fwhm 10
```

Builds all ROI tables and maps, fits an OSGM GLM to each.

### 2. Two-group contrast via an FSGD design

```bash
# group.fsgd has Class ad / Class hc and "Contrast ad-hc 1 -1"
groupstats --fsgd group.fsgd --o groupana.adhc --fwhm 10
```

### 3. Prepare two runs for a version regression diff

```bash
setenv SUBJECTS_DIR /data/v7
groupstats --f subjects.txt --o /data/diff/g.v7 --fwhm 10
setenv SUBJECTS_DIR /data/v8
groupstats --f subjects.txt --o /data/diff/g.v8 --fwhm 10
groupstatsdiff --g1 /data/diff/g.v7 --g2 /data/diff/g.v8 --o /data/diff/out --osgm
```

### 4. ROI-only run, no surface maps

```bash
groupstats --f subjects.txt --o roi_only --no-maps --fwhm 0
```

### 5. Run alongside in-progress recons

```bash
# Wait (polling every 300 s) until every subject's recon-all.done appears.
groupstats --f subjects.txt --o groupana --fwhm 10 --wait 300
```

## Pipeline Context

`groupstats` sits **downstream of** [[wiki/pipelines/recon-all|recon-all]] (it
consumes finished subjects) and **upstream of** [[groupstatsdiff]] (which
compares two `groupstats` output directories). It is not called by recon-all or
trac-all.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (per subject) →
**groupstats** → **Successor:** [[groupstatsdiff]] (regression QA) or direct
inspection of the GLM outputs.

Internally it chains: [[aparcstats2table]] / [[asegstats2table]] → ROI GLM
([[wiki/tools/mri_glmfit|mri_glmfit]]) for the ROI branch; and
[[mris_preproc]] → [[mris_fwhm]] → [[wiki/tools/mri_glmfit|mri_glmfit]] →
[[mri_glmfit-sim]] for the map branch.

## Gotchas and Caveats

> [!gotcha] aseg "other" hemisphere is a real third category
> The aseg loop iterates `lh rh other`; the `other` pass selects midline /
> non-lateralised structures from `ASegStatsLUT.txt`
> ([`scripts/groupstats:177-193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L177-L193)), producing `aseg.other.*` tables. Do not
> mistake `aseg.other.volume.dat` for an error.

> [!gotcha] Multiple-build warning does not stop the run
> If subjects were processed under different FreeSurfer builds, the script warns
> and sleeps 5 seconds but proceeds ([`scripts/groupstats:94-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L94-L100)). For a
> clean regression comparison you usually want all subjects from one build.

> [!gotcha] `mri_glmfit-sim` failures are non-fatal in the map branch
> The cluster-simulation step's status check is commented out
> ([`scripts/groupstats:272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L272)), so a failed simulation does not abort the run,
> unlike every other step which exits on non-zero status.

> [!gotcha] The wmparc volume table uses a hard-coded segid range
> The wmparc ROI table restricts to gyral WM labels in `3001–3035` and
> `4001–4035` (excluding `3004`/`4004`), [`scripts/groupstats:216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L216). Labels
> outside that range are not tabulated.

## Error Compensation and Guard Rails

- **Completion gating.** Before doing anything, every subject is checked for
  `recon-all.done` and the absence of error/IsRunning files; any inconsistency
  aborts ([`scripts/groupstats:466-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L466-L491)). `--wait` converts this into a
  polling loop.
- **fsaverage auto-link.** A missing `fsaverage` in `$SUBJECTS_DIR` is symlinked
  in automatically ([`scripts/groupstats:111-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L111-L115)).
- **BA naming auto-detect.** `BA` vs. `BA_exvivo` is detected from the first
  subject and applied throughout ([`scripts/groupstats:117-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L117-L128)).
- **Resume on existing outputs.** Existing tables/maps are reused
  (`OverWrite=0`), so an interrupted run can be restarted cheaply (above).
- **Exit-on-error.** Except for `mri_glmfit-sim`, every called tool's non-zero
  status aborts the script (`if($status) exit 1`), so a partial failure does not
  silently produce an incomplete directory.

## Related Tools

- [[aparcstats2table]] — builds the cortical ROI tables.
- [[asegstats2table]] — builds the subcortical/wmparc/w-g.pct ROI tables.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — fits the GLM to every table and map.
- [[mris_preproc]] — concatenates per-subject surface maps onto fsaverage.
- [[mris_fwhm]] — smooths the concatenated surface maps.
- [[mri_glmfit-sim]] — cluster-wise correction for the smoothed map GLMs.
- [[groupstatsdiff]] — compares two `groupstats` output directories (the primary downstream consumer).
- [[stattablediff]] — the table-diff engine `groupstatsdiff` runs on the ROI tables produced here.

## Confidence and Gaps

**High confidence:** the full flag set and aliases, the OSGM-vs-FSGD logic, the
required `--o`/subject-spec/`--fwhm`, the completion gating and `--wait` loop,
the BA-name auto-detect, the built-in measure/parc/surf exclusions, the
resume-on-existing-output behaviour, and the exact set of tools invoked — all
read directly from
[`scripts/groupstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats).

## References

- FreeSurfer source: [`scripts/groupstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats) (v8.2.0).
- Built-in help: `groupstats --help` (the `BEGINHELP` block, [`scripts/groupstats:550-574`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstats#L550-L574)).
- Companion: [`scripts/groupstatsdiff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/groupstatsdiff) (consumes this script's output).
