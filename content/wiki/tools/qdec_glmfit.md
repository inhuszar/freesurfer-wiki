---
title: "qdec_glmfit"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "qdec_glmfit/qdec_glmfit.cxx"
families: []                     # standalone QDEC back-end (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mris_preproc]]"
  - "[[fsaverage]]"
  - "[[mri_surf2surf]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The design construction, contrast generation, and the exact mri_glmfit command line are built inside the qdecproject library (QdecProject::CreateGlmDesign / RunGlmFit), not in this front end; the precise flags passed to mri_glmfit were not read from the library source."
  - "The on-disk layout of the .qdec project archive and of qdec.table.dat is inferred from the API names, not verified against a sample file."
tags:
  - qdec
  - glm
  - statistics
  - surface
  - group-analysis
---

# qdec_glmfit

## Summary

`qdec_glmfit` is the non-interactive command-line back end of QDEC, FreeSurfer's
graphical group-level surface analysis tool. It reads a QDEC data table
(`qdec.table.dat`) describing a set of subjects and their covariates, builds a
general linear model (GLM) design from a small number of named discrete and
continuous factors, runs the surface GLM by driving
[[wiki/tools/mri_glmfit|mri_glmfit]], and packages the design, the inputs, and
the fitted results into a single `.qdec` project archive that the QDEC GUI can
re-open. It is a thin C++ front end: all of the real work — assembling the
design matrix, generating contrasts, and invoking `mri_glmfit` — happens inside
the `qdecproject` library through the `QdecProject` class.

## Source Information

- **Language:** C++
- **Source file:** [`qdec_glmfit/qdec_glmfit.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx)
- **Original author:** Kevin Teich
- **Binary/script location:** `$FREESURFER_HOME/bin/qdec_glmfit`
- **Key dependency:** the `qdecproject` library (`QdecProject.h`); the front end
  calls `LoadDataTable`, `SetSubjectsDir`, `SetAverageSubject`, `SetWorkingDir`,
  `CreateGlmDesign`, `RunGlmFit`, and `SaveProjectFile`
  ([`qdec_glmfit/qdec_glmfit.cxx:195-248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L195-L248)).

## Purpose and Context

QDEC ("Query, Design, Estimate, Contrast") is FreeSurfer's tool for vertex-wise
group analysis of cortical surface measures (thickness, area, curvature, etc.).
The usual QDEC workflow is interactive: the user loads a spreadsheet of subjects
and covariates, picks one or two discrete factors (categorical grouping
variables) and one or two continuous factors (covariates such as age), chooses a
surface measure and a smoothing level, and clicks to fit the model. Behind that
GUI lives the same `QdecProject`/`QdecGlmDesign` machinery exposed here on the
command line.

`qdec_glmfit` exists so that the *same* analysis can be scripted and reproduced
without the GUI — for batch processing, for embedding in a pipeline, or for
regenerating a `.qdec` project file. It encapsulates the multi-step surface GLM
(stack subjects into a 4-D surface "volume", build $X$ and the contrasts, run
[[wiki/tools/mri_glmfit|mri_glmfit]] on the common surface, and store the
result) behind a single command.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]. It runs strictly
*after* every subject has been processed through `recon-all` and resampled to a
common surface (the average subject, typically [[fsaverage]]).

## Inputs

### Required Inputs

- **QDEC data table** (`--data-table`, `-d`): an ASCII `qdec.table.dat` file
  listing one row per subject plus columns for the factors. The first column is
  the subject identifier (the name of the `recon-all` output directory under the
  subjects directory). Loaded via `QdecProject::LoadDataTable`
  ([`qdec_glmfit/qdec_glmfit.cxx:195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L195)).
- **Average subject** (`--average-subject`, `-a`): the common surface onto which
  every subject's data has been resampled (e.g. [[fsaverage]]). Defaults to
  `fsaverage` if the flag is omitted, but the usage text still lists it as
  required ([`qdec_glmfit/qdec_glmfit.cxx:284-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L284-L285)).
- **Analysis name** (`--analysis-name`, `-n`): a label for the analysis; it is
  also appended to the working directory path
  ([`qdec_glmfit/qdec_glmfit.cxx:189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L189)).
- **Measurement** (`--measurement`, `-m`): the surface measure to analyse
  (`thickness`, `area`, `volume`, `curv`, `sulc`, …). This names the per-subject
  surface overlay that will be stacked across subjects.
- **Hemisphere** (`--hemisphere`, `-h`): `lh` or `rh`. A QDEC run analyses one
  hemisphere at a time.
- **Smoothness** (`--smoothness`, `-t`): the surface smoothing level (full width
  at half maximum, in mm) applied before fitting. The default is `-1`, which is
  treated as "unset" and triggers a required-argument error
  ([`qdec_glmfit/qdec_glmfit.cxx:174-179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L174-L179)).
- **Output project** (`--output`, `-o`): the `.qdec` file to write.
- **Subjects directory** (`--subjects-dir`, `-s`, or the `SUBJECTS_DIR`
  environment variable): where the average subject and the per-subject surface
  data live.

### Input Assumptions

> [!assumption] Per-subject data already exists on the common surface
> `qdec_glmfit` assumes every subject in the data table has been fully processed
> with [[wiki/pipelines/recon-all|recon-all]] and that the requested
> `--measurement` overlay has been resampled and smoothed onto the
> `--average-subject` surface for the requested hemisphere. The tool itself does
> not run `recon-all`, [[mris_preproc]], or [[mri_surf2surf]]; the design
> builder inside `qdecproject` locates the already-prepared surface data.

> [!gotcha] Subject identifiers in the table must match directory names
> Each row's subject id must correspond to an existing subject directory under
> the subjects directory. If a factor named in `--discrete-factor` or
> `--continuous-factor` is missing from the table, is the wrong type, or names a
> subject that does not exist, `CreateGlmDesign` fails and the tool prints the
> full set of input parameters before exiting
> ([`qdec_glmfit/qdec_glmfit.cxx:214-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L214-L233)).

## Outputs

### Files Created

- **`<output>.qdec`** — a single project archive (written by
  `QdecProject::SaveProjectFile`,
  [`qdec_glmfit/qdec_glmfit.cxx:244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L244)) bundling the data table, the
  design specification, and the `mri_glmfit` results. This is the file the QDEC
  GUI re-opens to browse the statistical maps.

The intermediate `mri_glmfit` outputs (the GLM β volumes, contrast maps, $\sigma^2$
map, etc.) are produced in a temporary working directory and then **deleted**:
after saving the project file, the front end runs `rm -rf <working-dir>`
([`qdec_glmfit/qdec_glmfit.cxx:250-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L250-L255)). The persistent record of the
analysis is therefore the `.qdec` archive, not a loose `glmdir`.

### Output Specifications

The statistical maps inside the archive are surface overlays defined on the
`--average-subject` mesh for the chosen hemisphere, produced by
[[wiki/tools/mri_glmfit|mri_glmfit]] (vertex-wise GLM β, variance, $t$/$F$, and
significance maps). Their geometry and number follow from the contrasts that
`qdecproject` generates for the requested factor design.

## Mathematical Foundations

`qdec_glmfit` performs no numerical computation itself; it parses options and
delegates. The statistics are the standard mass-univariate GLM solved
independently at every surface vertex by [[wiki/tools/mri_glmfit|mri_glmfit]]:

$$
y_v = X\beta_v + \varepsilon_v, \qquad
\hat\beta_v = (X^{\mathsf T}X)^{-1}X^{\mathsf T} y_v,
$$

where $y_v$ is the vector of the chosen surface measure across subjects at vertex
$v$, and $X$ is the design matrix built from the discrete and continuous factors.
Group differences and covariate effects are tested with contrasts $C\hat\beta_v$.

> [!internal] The design and contrasts are built in the qdecproject library
> The mapping from "one or two discrete factors + one or two continuous factors"
> to the columns of $X$ and to the set of contrast vectors is implemented in
> `QdecProject::CreateGlmDesign` / `QdecGlmDesign` inside the `qdecproject`
> library, not in this file. QDEC composes a DOSS/DODS-style design (Different
> Offset / Different or Same Slope across the discrete groups) for the
> continuous covariates; the precise column ordering and contrast set come from
> that library. The actual GLM solve, variance estimation, and significance maps
> are computed by [[wiki/tools/mri_glmfit|mri_glmfit]].

## Configuration Options

### Complete Flag Reference

All options are parsed with `getopt_long`
([`qdec_glmfit/qdec_glmfit.cxx:62-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L62-L140)). Every option takes a required
argument. There are no boolean flags and **no `--help` flag** (see gotcha).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--data-table`<br>`-d` | string | *(required)* | Path to the input `qdec.table.dat` data table (subjects × covariates). |
| `--working-dir`<br>`-w` | string | `/tmp` | Directory in which to generate temporary GLM data; the analysis name is appended to it. The whole tree is `rm -rf`'d on success. |
| `--subjects-dir`<br>`-s` | string | `$SUBJECTS_DIR` | Directory holding the average subject and per-subject surface data. Required if `SUBJECTS_DIR` is unset. |
| `--average-subject`<br>`-a` | string | `fsaverage` | Common surface subject the data has been resampled to (the analysis target mesh). |
| `--analysis-name`<br>`-n` | string | *(required)* | Label for the analysis; also appended to the working-directory path. |
| `--discrete-factor`<br>`-f` | string | `none` | A categorical grouping factor (column name in the data table). May be given **up to twice**; a third is ignored with a warning. |
| `--continuous-factor`<br>`-c` | string | `none` | A continuous covariate (column name). May be given **up to twice**; a third is ignored with a warning. |
| `--measurement`<br>`-m` | string | *(required)* | Surface measure to analyse (`thickness`, `area`, `volume`, `curv`, `sulc`, …). |
| `--hemisphere`<br>`-h` | `lh`\|`rh` | *(required)* | Hemisphere to analyse (one per run). |
| `--smoothness`<br>`-t` | integer | `-1` (= unset) | Surface smoothing FWHM in mm applied before fitting. A value must be given. |
| `--output`<br>`-o` | string | *(required)* | Output `.qdec` project filename. |

### Configuration Interactions

- **Up to two factors of each kind.** `-f`/`-c` accumulate into factor-1 then
  factor-2 slots; a third occurrence is dropped with a message to `stderr` and
  does *not* abort ([`qdec_glmfit/qdec_glmfit.cxx:103-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L103-L124)). Unspecified
  factor slots are passed to the design builder as the literal string `"none"`.
- **A design need not have any factors.** With no `-f`/`-c`, all four factor
  slots are `"none"` and the design reduces to a group-mean (one-sample) analysis
  of the measure. The required options are only the data table, analysis name,
  measurement, hemisphere, smoothness, and output.
- **`-h` is overloaded.** Unlike most FreeSurfer tools, here `-h` means
  *hemisphere*, not *help*. There is no help flag at all.

> [!gotcha] `-h` is hemisphere, and there is no `--help`
> `qdec_glmfit` uses `getopt_long`, so `-h`/`--hemisphere` consumes the next
> argument as the hemisphere. There is no `--help` option: running
> `qdec_glmfit --help` prints `unrecognized option '--help'` and then the
> argument-validation errors, which incidentally dump the usage block. To see
> usage cleanly, run the tool with no arguments (the missing-data-table check
> calls `PrintUsage`).

## Typical Use Cases

### 1. Two-group cortical thickness comparison

```bash
# Compare lh thickness between the levels of the "diagnosis" factor,
# on fsaverage, smoothed at 10 mm FWHM.
export SUBJECTS_DIR=/data/study/subjects
qdec_glmfit \
  --data-table  /data/study/qdec/qdec.table.dat \
  --average-subject fsaverage \
  --analysis-name diagnosis-thickness-lh \
  --discrete-factor diagnosis \
  --measurement thickness \
  --hemisphere lh \
  --smoothness 10 \
  --output /data/study/qdec/diagnosis-thickness-lh.qdec
```

### 2. Thickness vs. age, controlling for group

```bash
# Continuous covariate (age) plus a discrete grouping factor (group);
# QDEC builds a DODS/DOSS design relating thickness to age within groups.
qdec_glmfit -d qdec.table.dat -n age-by-group-rh \
  -f group -c age \
  -m thickness -h rh -t 15 \
  -a fsaverage -s "$SUBJECTS_DIR" \
  -o age-by-group-rh.qdec
```

### 3. One-sample (group mean) surface map

```bash
# No factors: test where the mean surface area differs from zero.
qdec_glmfit -d qdec.table.dat -n grandmean-lh \
  -m area -h lh -t 5 \
  -o grandmean-lh.qdec
```

## Pipeline Context

`qdec_glmfit` sits at the **group-statistics** end of a surface pipeline, well
downstream of anatomical reconstruction.

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (per subject) →
resampling/smoothing of the surface measure onto the common surface (via
[[mris_preproc]] / [[mri_surf2surf]], as orchestrated by `qdecproject`) → **this
tool**, which drives [[wiki/tools/mri_glmfit|mri_glmfit]] →
**Successor:** the QDEC GUI (or [[mri_glmfit-sim]] for
cluster-wise correction) to visualise and threshold the resulting maps.

It is the scriptable equivalent of clicking "Analyze" in the QDEC GUI, and it
produces the same `.qdec` project file that the GUI consumes.

## Gotchas and Caveats

> [!gotcha] The GLM working directory is deleted on success
> All intermediate `mri_glmfit` outputs are written under `--working-dir`/`<analysis-name>`
> and removed with `rm -rf` after the `.qdec` file is saved
> ([`qdec_glmfit/qdec_glmfit.cxx:250-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L250-L255)). If you need the raw GLM
> directory (e.g. for `mri_glmfit-sim`), run [[wiki/tools/mri_glmfit|mri_glmfit]]
> directly instead, or open the `.qdec` archive.

> [!gotcha] Default working directory is `/tmp`
> Unless `--working-dir` is given, the GLM is built under `/tmp/<analysis-name>`.
> On shared machines this can collide with other users or fill a small `/tmp`;
> point it at scratch space for large studies.

> [!gotcha] Errors dump every parameter, not a stack trace
> When the design cannot be created (bad factor name, wrong factor type, missing
> subject), the tool echoes all twelve input parameters to `stderr` and exits
> with status 1 ([`qdec_glmfit/qdec_glmfit.cxx:214-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L214-L233)). Read that
> block to see exactly what was passed to the design builder.

## Error Compensation and Guard Rails

- **Required-option checks.** Missing `--data-table`, subjects dir,
  `--analysis-name`, `--measurement`, `--hemisphere`, `--smoothness`, or
  `--output` each print a specific message plus the usage block and exit 1
  ([`qdec_glmfit/qdec_glmfit.cxx:143-185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L143-L185)).
- **Extra factors ignored, not fatal.** A third `-f` or `-c` is silently dropped
  (with a warning) rather than aborting the run.
- **Exceptions are caught.** Any exception thrown by the `qdecproject` library is
  caught at the top level and reported as `Error: <what>` with exit 1
  ([`qdec_glmfit/qdec_glmfit.cxx:257-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L257-L261)).
- **Working-directory cleanup is best-effort.** If `rm -rf` of the temp tree
  fails, a warning is printed but the run still succeeds.

## Related Tools

- [[wiki/tools/mri_glmfit|mri_glmfit]] — the surface GLM engine `qdec_glmfit` drives; use it directly when you need the raw GLM directory or cluster correction.
- [[mri_glmfit-sim]] — permutation/Monte-Carlo cluster-wise significance for `mri_glmfit` results.
- [[mris_preproc]] — stacks and resamples per-subject surface measures onto a common surface (the preparation step QDEC relies on).
- [[mri_surf2surf]] — resamples surface overlays between subjects / to the average surface.
- [[fsaverage]] — the usual common-surface target for QDEC analyses.

## Confidence and Gaps

**High confidence:** the complete option set, the short/long flag pairs, the
required-vs-optional split, the two-factor limit, the `-h`=hemisphere overload,
the `/tmp` default working dir, the deletion of the working directory, and the
high-level call sequence (`LoadDataTable` → `CreateGlmDesign` → `RunGlmFit` →
`SaveProjectFile`) — all read directly from
[`qdec_glmfit/qdec_glmfit.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx).

> [!gap] Exact mri_glmfit command line and design columns
> The flags `qdecproject` actually passes to `mri_glmfit`, the DOSS/DODS design
> column ordering, and the generated contrast set live in the `qdecproject`
> library (`QdecGlmDesign`/`QdecProject`), which was not read for this page.
> Treat the GLM-design details as inferred from QDEC's documented behaviour
> rather than verified here.

> [!gap] `.qdec` archive and `qdec.table.dat` layout
> The byte/format layout of the `.qdec` project archive and the exact column
> grammar of `qdec.table.dat` are not specified in this front end and were not
> cross-checked against sample files.

## References

- FreeSurfer source: [`qdec_glmfit/qdec_glmfit.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx) (v8.2.0).
- Built-in usage: run `qdec_glmfit` with no arguments (`PrintUsage`,
  [`qdec_glmfit/qdec_glmfit.cxx:266-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec_glmfit/qdec_glmfit.cxx#L266-L301)).
- FreeSurfer wiki: the QDEC group-analysis tutorial (interactive front end to the
  same `qdecproject` machinery).
