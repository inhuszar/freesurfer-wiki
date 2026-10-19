---
title: "qdec"
type: tool
fs_version: "8.2.0"
source_language: "C++"            # historical GUI (VTK/KWWidgets/Tcl); the installed v8.2.0 command is a bash deprecation stub
source_files:
  - "scripts/qdec"
  - "qdec/QdecMain.cxx"
  - "qdec/vtkKWQdecApp.cxx"
  - "qdec/vtkKWQdecWindow.cxx"
  - "qdec/vtkKWQdecView.cxx"
families:
  - "gui"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[qdec_glmfit]]"
  - "[[mris_preproc]]"
  - "[[mri_surf2surf]]"
  - "[[mri_glmfit-sim]]"
  - "[[fsgd-format]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "Detailed panel-by-panel GUI behaviour (Subjects/Design/Display tabs, the BLT plot, vertex selection, screenshot/TIFF export) is described from development_notes.txt and the app/command-line source, not from a running build; the vtkKWQdecWindow.cxx UI logic (~230 KB) was not read in full."
  - "The exact mri_glmfit command line that the GUI/back-end constructs lives in the qdecproject library (QdecProject / QdecGlmFit), not read here. See [[qdec_glmfit]] for the back-end front end."
tags:
  - gui
  - statistics
  - glm
  - surface
  - group-analysis
  - deprecated
---

# qdec

## Summary

**QDEC** (*Query, Design, Estimate, Contrast*) was FreeSurfer's interactive
graphical front end for vertex-wise group statistical analysis of cortical
surface data: you load a spreadsheet-style data table of subjects and measures,
visually design a General Linear Model (select discrete/continuous factors),
run the estimation, and explore the resulting significance maps on an inflated
`fsaverage`-style surface with linked factor plots. **In FreeSurfer 8.2.0 the
GUI is no longer shipped.** The installed `qdec` command is a short shell stub
that prints a deprecation notice and directs users to the command-line stream
([[mris_preproc]], [[mri_surf2surf]], [[wiki/tools/mri_glmfit|mri_glmfit]], and
[[mri_glmfit-sim]]). The historical C++/VTK/KWWidgets GUI source still lives in
the tree under `qdec/` but is not built by the v8.2.0 CMake configuration.

> [!contradiction] The GUI you may remember is gone in 8.2.0
> Older FreeSurfer documentation and tutorials describe `qdec` as a full
> interactive application. As of FreeSurfer (per a 2021 build-system change),
> the GUI binary is **no longer installed**; running `qdec` only prints a
> message saying it has been removed. The build comment is explicit:
> "*9/2021 - per Doug, no longer install qdec binary from ./tktools. Add/install
> qdec script here in order to echo qdec no longer supported.*"
> ([`scripts/CMakeLists.txt:1-2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L1-L2)).
> Code is authoritative; treat the GUI description below as historical context.

## Source Information

- **Language (installed command):** bash shell script — a deprecation stub.
- **Language (historical GUI):** C++ built on **VTK** + **KWWidgets**, with a
  **Tcl/Tk** interpreter layer (classes are `vtkKW*` and are Tcl-wrapped).
- **Source files:**
  - Installed `qdec` command (v8.2.0):
    [`scripts/qdec`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/qdec)
  - GUI entry point:
    [`qdec/QdecMain.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/QdecMain.cxx)
  - GUI application / command-line parsing:
    [`qdec/vtkKWQdecApp.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx)
  - GUI main window (UI + data management):
    [`qdec/vtkKWQdecWindow.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecWindow.cxx)
  - GUI 3-D view:
    [`qdec/vtkKWQdecView.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecView.cxx)
- **Statistical back end:** the `qdecproject` library
  (`QdecProject`, `QdecGlmDesign`, `QdecGlmFit`, `QdecContrast`,
  `QdecDataTable`, …), which is still built in v8.2.0 and is also driven by the
  command-line front end [[qdec_glmfit]].
- **Binary/script location:** `$FREESURFER_HOME/bin/qdec` (the stub in 8.2.0).
- **Build status in 8.2.0:** the `qdec/` GUI directory is **not** added via
  `add_subdirectory` in the top-level
  [`CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/CMakeLists.txt);
  only `qdecproject` and `qdec_glmfit` are built. The GUI used a legacy
  (non-CMake) `Makefile.am` build, described in
  [`qdec/development_notes.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/development_notes.txt),
  which is not part of the current build.

## Purpose and Context

Vertex-wise cortical group analysis in FreeSurfer follows a standard recipe:
resample each subject's surface measure (thickness, area, curvature, …) onto a
common template such as [[fsaverage]], smooth it, assemble a design matrix that
encodes the factors of interest, fit a GLM at every vertex, form contrasts, and
correct for multiple comparisons across the surface. QDEC was built to make this
accessible **without writing the command lines** — it wrapped the design and
estimation steps behind a tabbed GUI and rendered the significance maps
interactively.

Its place in the ecosystem: QDEC is a front end over the same machinery exposed
by the command-line tools. The estimation it performed is the surface GLM of
[[wiki/tools/mri_glmfit|mri_glmfit]]; the resampling/assembly corresponds to
[[mris_preproc]] / [[mri_surf2surf]]; the multiple-comparisons step corresponds
to [[mri_glmfit-sim]]. The non-GUI program [[qdec_glmfit]] is the present-day,
scriptable embodiment of the QDEC back end (it builds a design from a data table
and runs `mri_glmfit`, saving a `.qdec` project). The deprecation stub points
users to exactly this command-line stream.

> [!gotcha] Running `qdec` in 8.2.0 just prints a message and exits 1
> The installed command is:
> ```
> echo "Please note that qdec is no longer supported and has been removed from the freesurfer distribution."
> echo "Use the \"command line\" stream instead (ie, mris_preproc, mris_surf2surf, mri_glmfit, and mri_glmfit-sim)."
> exit 1
> ```
> ([`scripts/qdec`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/qdec)).
> It performs no analysis. (Note the message names `mris_surf2surf`; the
> surface-resampling tool documented in this wiki is [[mri_surf2surf]].)

## Inputs

### Installed command (8.2.0)

The stub takes **no inputs** and reads no data.

### Historical GUI inputs

The historical GUI accepted a data table plus optional surface/overlay files,
loadable from the command line or interactively. From the argument parser in
[`qdec/vtkKWQdecApp.cxx:114-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L114-L172):

- **Data table** (`--table`): a whitespace/CSV-style table whose first column is
  the subject ID and remaining columns are factors/measures (the basis for the
  Subjects and Design panels).
- **Project file** (`--project`): a previously saved `.qdec` project archive
  (encapsulates table, design, and results — the same artefact written by
  [[qdec_glmfit]]).
- **Surfaces / scalars / curvature / annotation / overlay / label**
  (`--surface`, `--scalar`, `--curvature`, `--annotation`, `--overlay`,
  `--label`): files to visualize on the displayed surface.
- **FSGD file** (`--gdf` / `--fsgd`): a FreeSurfer Group Descriptor (see
  [[fsgd-format]]) used to drive the per-vertex factor plot.
- **Average subject** (`--average`): name of the common-space subject (e.g.
  [[fsaverage]]) on which results are displayed.

> [!assumption] Data are in a common surface space
> Surface group analysis assumes every subject's measure has been resampled to a
> shared template (typically [[fsaverage]]); QDEC visualizes and analyzes data
> in that common space.

## Outputs

### Installed command (8.2.0)

No files. Exit status `1`; two informational lines on stdout.

### Historical GUI outputs

- **`.qdec` project files** — the project archive bundling the data table,
  the GLM design, and the fit results (written/loaded via the `qdecproject`
  library; the same format produced by [[qdec_glmfit]]).
- **GLM result volumes/overlays** on the surface (significance maps, etc.),
  produced by the underlying [[wiki/tools/mri_glmfit|mri_glmfit]] run and
  displayed in the view.
- **Screenshots** (TIFF) of the rendered surface, per the export code referenced
  in [`qdec/development_notes.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/development_notes.txt).

> [!gap] On-disk layout not verified here
> The precise contents/format of the `.qdec` archive and the exact result files
> are defined in the `qdecproject` library (`QdecProject`), which was not read
> for this page. See [[qdec_glmfit]].

## Mathematical Foundations

QDEC's statistics are the **mass-univariate General Linear Model**: at each
surface vertex $v$ a linear model $y_v = X\beta_v + \epsilon_v$ is fit, where
$X$ is the design matrix encoding the chosen discrete and continuous factors,
and contrasts $C\beta_v$ are tested to produce significance maps. This is exactly
the surface GLM implemented by [[wiki/tools/mri_glmfit|mri_glmfit]]; QDEC
constructs $X$ and the contrast vectors $C$ from the GUI selections and delegates
the fit.

> [!internal] The GLM and contrast construction live in `qdecproject`
> The design assembly, contrast generation, and the `mri_glmfit` invocation are
> implemented in the `QdecGlmDesign` / `QdecGlmFit` / `QdecContrast` classes of
> the `qdecproject` library (also used by [[qdec_glmfit]]). The mathematics of
> the fit itself is documented on [[wiki/tools/mri_glmfit|mri_glmfit]].

## Configuration Options

### Installed command (8.2.0)

None. The stub accepts no options.

### Historical GUI command-line options

Parsed in
[`qdec/vtkKWQdecApp.cxx:114-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L114-L172)
via `vtksys::CommandLineArguments`. All options preload files into the GUI; the
analysis itself is then driven interactively.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--help` | boolean | off | Print the usage/option list (to stderr) and exit. [`vtkKWQdecApp.cxx:115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L115), [`:181-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L181-L186) |
| `--table` | string (path) | none | Data table to load (subjects × factors/measures). [`vtkKWQdecApp.cxx:119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L119) |
| `--project` | string (path) | none | `.qdec` project file to load (restores table, design, results). [`vtkKWQdecApp.cxx:123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L123) |
| `--surface` | string / list | none | Surface file(s) to load and display. Accepts a list under VTK 5.x; a single path otherwise. [`vtkKWQdecApp.cxx:127-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L127-L134) |
| `--gdf`<br>`--fsgd` | string (path) | none | FreeSurfer Group Descriptor file (see [[fsgd-format]]) for the per-vertex factor plot. Both spellings map to the same target. [`vtkKWQdecApp.cxx:137-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L137-L140) |
| `--scalar` | string / list | none | Scalar overlay file(s) to display on the surface. List under VTK 5.x; single path otherwise. [`vtkKWQdecApp.cxx:143-150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L143-L150) |
| `--curvature` | string (path) | none | Curvature file used to shade the surface. [`vtkKWQdecApp.cxx:153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L153) |
| `--annotation` | string (path) | none | Annotation (parcellation) file to overlay. [`vtkKWQdecApp.cxx:157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L157) |
| `--overlay` | two strings | none | Overlay scalar file **and** its color file — requires **exactly two** arguments (VTK 5.x). [`vtkKWQdecApp.cxx:160-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L160-L164), validated at [`:195-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L195-L200) |
| `--label` | string (path) | none | Label file to load/display. [`vtkKWQdecApp.cxx:167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L167) |
| `--average` | string (name) | none | Name of the average (common-space) subject, e.g. [[fsaverage]]. [`vtkKWQdecApp.cxx:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L171) |

#### Influential environment variables (historical GUI)

| Variable | Effect |
|----------|--------|
| `SUBJECTS_DIR` | If unset, QDEC sets it to the current working directory at startup. [`qdec/QdecMain.cxx:47-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/QdecMain.cxx#L47-L52) |
| `FREESURFER_HOME` | Used to locate icon, splash, and resource files (`lib/resource/QdecIcons.txt`, `lib/images/qdec_splash.png`). [`qdec/vtkKWQdecApp.cxx:64-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L64-L71), [`:102-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L102-L107) |
| `QDEC_DONT_USE_HISTOGRAM_EDITOR` | If set (to anything), disables the histogram-based color-scale editor. [`qdec/vtkKWQdecApp.cxx:208-212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L208-L212) |
| `.Qdecrc` resource (`GDF_BUTTON`) | A `key = value` file at `$SUBJECTS_DIR/qdec/.Qdecrc` or `~/.Qdecrc`; `GDF_BUTTON = BUTTON_1` makes mouse Button-1 select a vertex (and graph the GDF) instead of rotating the camera. [`qdec/QdecUtilities.cxx:78-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/QdecUtilities.cxx#L78-L98), used at [`qdec/vtkKWQdecApp.cxx:410-425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L410-L425) |

### Configuration Interactions

- **`--overlay` is strict about arity:** supplying anything other than zero or
  two arguments is a fatal error
  ([`qdec/vtkKWQdecApp.cxx:195-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L195-L200)).
- **`--gdf` and `--fsgd` are aliases** for the same FSGD input; specifying both
  simply loads whichever path was parsed last.
- **VTK-version-dependent multiplicity:** under VTK 5.x, `--surface` and
  `--scalar` accept multiple files; otherwise they take a single path that is
  pushed onto the internal list
  ([`qdec/vtkKWQdecApp.cxx:188-192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L188-L192)).

## Typical Use Cases

### Use Case 1 (8.2.0): discover the replacement workflow

```bash
qdec
# -> prints that qdec is no longer supported and lists the command-line tools to use
```

### Use Case 2 (recommended replacement): command-line surface GLM

```bash
# Resample/assemble per-subject surface data to fsaverage and smooth
mris_preproc --fsgd group.fsgd --target fsaverage --hemi lh \
             --meas thickness --out lh.thickness.mgh
# Fit the GLM at every vertex
mri_glmfit --y lh.thickness.mgh --fsgd group.fsgd dods \
           --C contrast.mtx --surf fsaverage lh --glmdir lh.glmdir
# Cluster-wise multiple-comparisons correction
mri_glmfit-sim --glmdir lh.glmdir --cache 3.0 abs --cwp 0.05 --2spaces
```

This reproduces, on the command line, what QDEC did interactively. See
[[mris_preproc]], [[wiki/tools/mri_glmfit|mri_glmfit]], [[mri_glmfit-sim]], and
[[fsgd-format]].

### Use Case 3 (scriptable QDEC back end): `qdec_glmfit`

```bash
# Drive the same QDEC design/estimate back end without the GUI
qdec_glmfit --data qdec.table.dat --hemi lh --measure thickness \
            --continuous Age --output myproject.qdec
```

See [[qdec_glmfit]] for the project-file-producing back end.

## Pipeline Context

QDEC is **not** part of `recon-all` (`recon_all_stage: null`); it is a
post-`recon-all` group-analysis front end. Conceptually:

**Predecessor:** per-subject `recon-all` outputs → [[mris_preproc]] / [[mri_surf2surf]] (resample to [[fsaverage]]) → **QDEC / [[qdec_glmfit]]** (design + [[wiki/tools/mri_glmfit|mri_glmfit]]) → **Successor:** [[mri_glmfit-sim]] (multiple-comparisons correction)

## Gotchas and Caveats

> [!gotcha] `qdec` is a deprecation stub in 8.2.0
> The only thing the installed `qdec` does is print a removal notice and exit
> non-zero. Do not expect a window to open. Use the command-line stream or
> [[qdec_glmfit]].

> [!gotcha] SUBJECTS_DIR defaulted to the CWD (historical GUI)
> When run without `SUBJECTS_DIR` set, the GUI silently set it to the current
> directory ([`qdec/QdecMain.cxx:47-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/QdecMain.cxx#L47-L52)),
> which could make subject lookups resolve relative to wherever it was launched.

> [!gotcha] Mouse-button mapping depended on a resource file (historical GUI)
> Whether Button-1 rotates the camera or selects a vertex was controlled by the
> `GDF_BUTTON` key in `.Qdecrc`
> ([`qdec/vtkKWQdecApp.cxx:410-425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecApp.cxx#L410-L425)),
> so the interaction model could differ between users/sites.

## Error Compensation and Guard Rails

The 8.2.0 stub is itself a guard rail: rather than failing cryptically (the GUI
binary no longer exists), it returns a clear message naming the supported
replacement tools and exits `1`. The historical GUI's only notable
auto-correction was defaulting `SUBJECTS_DIR` to the working directory when
unset.

## Related Tools

- [[qdec_glmfit]] — the non-GUI command-line front end to the same QDEC back end (builds a design from a table and runs `mri_glmfit`, saving a `.qdec` project). The supported way to use QDEC's machinery today.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — the actual surface GLM estimator QDEC delegates to.
- [[mris_preproc]] — assembles/resamples per-subject surface measures to a common template (the data-preparation step).
- [[mri_surf2surf]] — resamples surface data between subjects/templates (named as `mris_surf2surf` in the deprecation message).
- [[mri_glmfit-sim]] — cluster-wise multiple-comparisons correction for the GLM results.
- [[fsgd-format]] — the FreeSurfer Group Descriptor format QDEC reads via `--gdf`/`--fsgd`.
- [[fsaverage]] — the common surface space results are displayed/analyzed on.

## Confidence and Gaps

The status of `qdec` in 8.2.0 (a deprecation stub) and the historical GUI's
command-line surface are read directly from source and documented with high
confidence. The interactive UI details are necessarily historical.

> [!gap] GUI internals not exhaustively read
> The full UI logic (tabbed Subjects/Design/Display panels, BLT factor plot,
> vertex selection, TIFF export) lives in
> [`qdec/vtkKWQdecWindow.cxx`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/vtkKWQdecWindow.cxx)
> (~230 KB), which was not read in full; panel behaviour here is summarized from
> [`qdec/development_notes.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/development_notes.txt)
> and the app/entry-point sources.

> [!gap] mri_glmfit invocation built in qdecproject
> The exact `mri_glmfit` command line and `.qdec` archive layout are produced by
> the `qdecproject` library, not read for this page. See [[qdec_glmfit]].

## References

- FreeSurfer QDEC wiki page (cited by the app's help/splash):
  <https://surfer.nmr.mgh.harvard.edu/fswiki/Qdec>
- [`qdec/development_notes.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/qdec/development_notes.txt) — developer notes on the GUI architecture (Subjects/Design/Display panels, VTK/KWWidgets design, TODOs).
- [`scripts/CMakeLists.txt:1-2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L1-L2) — the 2021 decision to stop installing the GUI binary and ship a stub instead.
