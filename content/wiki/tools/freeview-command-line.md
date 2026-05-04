---
title: "FreeView — Command-Line Reference"
type: gui-panel
parent_application: "[[wiki/tools/freeview|freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/main.cpp"
  - "freeview/MainWindow.cpp"
  - "freeview/MyCmdLineParser.cpp"
related_panels:
  - "[[freeview-volumes]]"
  - "[[freeview-surfaces]]"
  - "[[freeview-editing]]"
  - "[[freeview-pointsets]]"
  - "[[freeview-dti]]"
related_tools:
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps: []
tags:
  - gui
  - freeview
  - command-line
---

# FreeView — Command-Line Reference

## Overview

FreeView can be launched entirely from the command line with pre-loaded data and configured display properties. Two mechanisms are exposed:

1. **CLI flags** (declared in the `CmdLineEntry cmdLineDesc[]` array in `freeview/main.cpp`) — one-shot options parsed at startup by `MyCmdLineParser`.
2. **Internal scripting commands** (dispatched in `MainWindow::RunScript()`) — command tokens that can be collected from `-cmd <file>`, `-stdin`, or constructed internally by CLI-flag handlers.

Data-specific display properties are attached to filenames using a **colon-separated inline property syntax** (`file.mgz:key=val:key=val`). Every inline property is parsed inside one of the `CommandLoad*()` methods in `MainWindow.cpp`.

This page is derived from a complete read of `main.cpp` ([lines 144–336](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L144-L336)) and the `RunScript()` dispatcher (`MainWindow.cpp` lines 1844–2336).

---

## General Syntax

```
freeview [global_options]
         [-v volume[:properties] ...]
         [-f surface[:properties] ...]
         [-l label[:properties] ...]
         [-w waypoints[:properties] ...] [-c controlpoints[:properties] ...]
         [-dti vec fa ...] [-tv tract_volume ...] [-t tract ...] [-tc tract_cluster_dir]
         [-odf file [vertex face]] [-cmat cmat parc] [-fcd dir subj [suffix]]
         [-recon subject ...] [-p-labels ...]
         [--] [floating_volume_files...]
```

**Repeatability:** `-v`, `-f`, `-l`, `-w`, `-c`, `-dti`, `-tv`, `-t`, `-odf`, `-recon`, `-prefix`, `-p-labels` are **repeatable**: each occurrence adds a layer or argument group.

**Floating arguments:** File names given without a leading flag are treated as volumes (loaded via `loadvolume`). They are added *after* all `-v` volumes unless `-rorder` is set.

**Tilde expansion:** When `-cmd` or `stdin` input is parsed through `ParseCommand(const QString&)`, `~` is substituted with `QDir::homePath()` ([[`MainWindow.cpp:940`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L940)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L940)). The initial `argv[]` parse does not perform tilde expansion — rely on the shell.

---

## 1. Data Loading Flags

Each data-loading flag has a short form and a long-form alias, both registered in the `cmdLineDesc[]` array. Either form may be used interchangeably at the command line.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-v`<br>`-volume` | `<FILE>[:prop=val...]...` | — | Load one or more volumes. Repeatable. See §6 for inline properties. |
| `-f`<br>`-surface` | `<FILE>[:prop=val...]...` | — | Load one or more surfaces. Repeatable. See §7 for inline properties. |
| `-l`<br>`-label` | `<FILE>[:prop=val...]...` | — | Load one or more label / ROI files. Repeatable. Requires a prior volume. |
| `-w`<br>`-way-points` | `<FILE>[:prop=val...]...` | — | Load waypoints (red spheres with spline). Repeatable. |
| `-c`<br>`-control-points` | `<FILE>[:prop=val...]...` | — | Load control points (green spheres). Repeatable. |
| `-dti` | `<VEC> <FA>...` | — | Load one or more DTI volume pairs (eigenvector file then FA file). Repeatable. |
| `-t`<br>`-tract` | `<FILE>...` | — | Load tractography streamlines (TrackVis `.trk`). Repeatable. |
| `-tc`<br>`-tract-cluster` | `<DIR>` | — | Load a tract-cluster directory. |
| `-tv`<br>`-tract-volume` | `<FILE>...` | — | Load a tract-associated volume. Repeatable. |
| `-odf` | `<FILE> [<VERT> <FACE>]` | — | Load ODF data. Requires a prior volume. |
| `-p-labels` | `<FILE>...` | — | Load p-label volumes. Repeatable. |
| `-p-prefix` | `<PREFIX>` | — | Filename prefix for p-label name extraction. |
| `-p-lut` | `<NAME>` | FreeSurfer LUT | Look-up table name or file for p-label display. |
| `-cmat`<br>`-connectome-matrix` | `<CMAT_FILE> <PARC_FILE>` | — | Load connectome matrix data. |
| `-fcd` | `<SUBJECTS_DIR> <SUBJECT> [<SUFFIX>]` | — | Load FCD analysis output. |
| `-recon` | `<SUBJECT>...` | — | Load canonical recon-all output for subject(s). Requires `$SUBJECTS_DIR`. Repeatable. |
| `-lineprofile` | `<OUTPUT_CSV>` | — | Compute layer-thickness line profiles and export to CSV. |

---

### 1.1 Volumes: `-v`

```
-v <FILE>[:prop=val[:prop=val...]] ...
```

Repeatable. Loads one or more volumes. Files may be `.mgz`, `.mgh`, `.nii`, `.nii.gz`, DICOM, `.img`/`.hdr` (Analyze), or `.mnc` (MINC). See [[freeview-volumes]] for rendering details; the full inline-property table appears in §6 below.

### 1.2 Surfaces: `-f`

```
-f <SURFACE_FILE>[:prop=val...] ...
```

Repeatable. Loads a triangulated cortical mesh ([[surface-format]]). Inline properties load accompanying overlays ([[curv-format]], `.mgh`, `.nii`), annotations ([[annotation-format]]), labels ([[label-format]]), and splines, and control rendering in both 2D and 3D. Full property table in §7 below.

### 1.3 Labels / ROIs: `-l`

```
-l <LABEL_FILE>[:prop=val...] ...
```

Repeatable. Loads FreeSurfer [[label-format]] files as **volume ROIs**. A volume must already be loaded (enforced at [[`MainWindow.cpp:1165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1165)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1165)); otherwise a warning is shown and the `-l` flag is ignored. Inline properties:

| Property | Values | Description |
|----------|--------|-------------|
| `ref` | volume name | Reference volume the label is aligned to (selects among loaded volumes) |
| `color` | colour name / `R,G,B` | Label fill colour |
| `opacity` | 0.0–1.0 | Label transparency |
| `threshold` | float | Only show voxels whose label value exceeds this threshold |
| `centroid` | `1`/`true`/`yes` | On load, move cursor to the label centroid |

For surface labels attached to a surface, use `:label=...` inside a `-f` spec instead.

### 1.4 Waypoints: `-w`

```
-w <WAYPOINTS_FILE>[:prop=val...] ...
```

Repeatable. Loads a point set as **WayPoint type** (red spheres with spline). File is typically a FreeSurfer `.label`. See [[freeview-pointsets]]. Inline properties:

| Property | Values | Description |
|----------|--------|-------------|
| `color` | colour name / `R,G,B` | Waypoint sphere colour |
| `splinecolor` | colour name / `R,G,B` | Colour of the connecting spline tube |
| `splineheatmap` | `file,min,mid,max` | Heatmap data for colouring the spline |
| `radius` | float | Waypoint sphere radius (mm) |
| `splineradius` | float | Spline tube radius (mm) |
| `name` | string | Override display name in the layer list |
| `visible` | `0`/`1`/`true`/`false` | Initial visibility |

### 1.5 Control Points: `-c`

```
-c <CONTROL_POINTS_FILE>[:prop=val...] ...
```

Repeatable. Loads a point set as **ControlPoint type** (green spheres, no spline by default). File is typically a `.dat` plain-text control-point file used by [[mri_normalize]]. See [[freeview-pointsets]]. Inline properties:

| Property | Values | Description |
|----------|--------|-------------|
| `color` | colour name / `R,G,B` | Point colour |
| `radius` | float | Sphere radius |
| `name` | string | Override display name |
| `visible` | `0`/`1`/`true`/`false` | Initial visibility |
| `remind_edit` | flag (no value) | Remind user at exit if unsaved edits exist |
| `new` | flag (no value) | Create a new empty file if the named file does not exist |

### 1.6 DTI: `-dti`

```
-dti <VECTOR_FILE> <FA_FILE> [<VECTOR_FILE> <FA_FILE> ...]
```

Repeatable. Loads one or more DTI volume pairs. Argument order is **eigenvector file first, FA file second**. See [[freeview-dti]].

### 1.7 Tractography: `-t`, `-tc`, `-tv`

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-t`<br>`-tract` | `<FILE>...` | — | Load tractography streamlines from TrackVis `.trk` file(s). Repeatable. Inline: `color=<name>`, `render=line`/`tube` |
| `-tc`<br>`-tract-cluster` | `<DIR>` | — | Load a directory of tract clusters |
| `-tv`<br>`-tract-volume` | `<FILE>...` | — | Load a tract-associated volume. Repeatable. Inline: `frame=N` (show only one tract by frame number) |

### 1.8 ODF: `-odf`

```
-odf <ODF_FILE> [<VERTEX_FILE> <FACE_FILE>]
```

Loads orientation distribution function data. A volume must be loaded first (enforced at [[`MainWindow.cpp:1292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1292)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1292)). Optional vertex and face files describe the ODF sphere tessellation; if omitted, Diffusion Toolkit defaults are used. Inline properties:

| Property | Values | Description |
|----------|--------|-------------|
| `hemisphere` | `1` | Data is hemisphere-only |
| `permuted` | `1` | Data axis ordering is permuted (as emitted by DTK) |

### 1.9 p-Values: `-p-labels`, `-p-prefix`, `-p-lut`

```
-p-labels <FILE>... -p-prefix <PREFIX> -p-lut <LUT>
```

`-p-labels` is repeatable; multiple files from each occurrence are concatenated with `;` before being passed to `loadpvolumes`. `-p-prefix` sets the filename prefix used to extract label names. `-p-lut` specifies a stock LUT name or LUT file; default is the FreeSurfer LUT.

### 1.10 Connectome Matrix: `-cmat`

```
-cmat <CMAT_FILE> <PARCELLATION_VOLUME>
```

Loads a connectome matrix. Requires a `.cmat` file plus its associated parcellation volume. Inline property: `lut=<ctable>` (default: FreeSurfer LUT).

### 1.11 FCD: `-fcd`

```
-fcd <SUBJECTS_DIR> <SUBJECT> [<SUFFIX>]
```

Load focal cortical dysplasia analysis output. `SUFFIX` is optional. Side-effect: sets default display smoothing (`m_defaultSettings["Smoothed"] = true`).

### 1.12 Subject Shortcut: `-recon`

```
-recon <SUBJECT_NAME> [<SUBJECT_NAME> ...]
```

Repeatable. Requires `$SUBJECTS_DIR` to be set (failure at [[`MainWindow.cpp:2390`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L2390)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L2390)). Loads a canonical set of files for one or more reconstructed subjects:

- Volumes: `norm.mgz`, `T1.mgz`, `brainmask.mgz`, `wm.mgz` (colormap=heat, hidden, opacity 0.4), `aseg.mgz` (colormap=lut, opacity 0.22)
- Surfaces: `lh.white`, `rh.white`, `lh.pial`:edgecolor=red, `rh.pial`:edgecolor=red, `lh.inflated` + `rh.inflated` each with `aparc.annot` overlay (hidden by default)
- If `?h.orig.nofix` exist: load them with `defect_labels` overlay at percentile threshold (hidden)
- Initial viewport: coronal
- If `<subject>/tmp/control.dat` exists: load it as control points

This is implemented in `CommandLoadSubject()` ([[`MainWindow.cpp:2387`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L2387)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L2387)); it internally re-parses the assembled argument string via `ParseCommand()`.

### 1.13 Line Profile: `-lineprofile`

```
-lineprofile <OUTPUT_CSV>
```

Compute cortical-layer thicknesses along line profiles defined by the loaded waypoints and export them to a CSV file. Inline properties (post-colon on the flag argument):

| Property | Default | Description |
|----------|---------|-------------|
| `spacing` | 1.0 | Spacing between profile lines |
| `resolution` | 1.0 | Per-line sampling resolution |
| `offset` | 5 | Offset from the seed point |
| `segments` | 100 | Number of segments per profile line |

### 1.14 Floating Arguments

Any arguments given without a flag are treated as volume filenames and loaded as if they had been passed to `-v`. `-r` still applies if set globally. If `-percentile_all` is set, it is appended as `:percentile=1:grayscale=<min>,<max>` to each floating filename that does not already specify a colormap.

---

## 2. Global Display Options

### 2.1 Viewport and Layout

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-viewport` | `sagittal`/`sag`/`x`, `coronal`/`cor`/`y`, `axial`/`z`, `3d` | — | Set the main viewport orientation |
| `-layout` | `1` – `4` | — | View-panel layout: **1** = single, **2** = 2×2, **3** = 1+3 vertical, **4** = 1+3 horizontal. Values outside 1–4 are clamped ([[`MainWindow.cpp:1005`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1005)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1005)) |
| `-view` | `left`, `right`, `anterior`, `posterior`, `inferior`, `superior`, `lateral`, `medial` | — | Set the 3D view direction. `lateral`/`medial` require a visible surface to determine hemisphere |
| `-viewsize` | `<W> <H>` | — | Resize the main viewport to width × height pixels (the whole window resizes accordingly, adjusted per layout) |
| `-zoom` | `<FACTOR>` | — | Zoom factor (applied to all viewports). Zero is rejected |
| `-neuro-view`<br>`-neurological-view` | (switch) | radiological | Use **neurological** convention (L = L). Default is radiological (L = R) |
| `-orthographic` | (switch) | off | Parallel (orthographic) projection in the 3D view |

### 2.2 Cursor Position

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-ras` | `<X> <Y> <Z> [tkreg]` | — | Place the cursor at RAS coordinates. If the optional 4th argument is `tkreg`, coordinates are interpreted as Surface RAS (tkRAS); otherwise as Scanner RAS. See [[coordinate-systems]] |
| `-slice` | `<X> <Y> <Z>` | — | Place the cursor at voxel indices (CRS) of the **first loaded volume**. Integer arguments only |
| `-cc`<br>`-center-at-cursor` | (switch) | off | Centre all viewports at the cursor position after loading |

### 2.3 Scale and Cursor Visibility

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-colorscale` | (switch) | off | Show the colour-scale bar in the main view |
| `-nocursor` | (switch) | off | Hide the crosshair cursor |
| `-rotate-around-cursor` | (switch) | off | In 3D view, rotate around the cursor position rather than the view centre |

### 2.4 3D-Specific Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-hide-3d-slices` | (switch) | off | Hide all 2D slice planes in the 3D view |
| `-hide-3d-frames` | (switch) | off | Hide the coloured slice-frame borders in the 3D view |
| `-hide-x-slice` | (switch) | off | Hide only the sagittal (X) slice plane in 3D |
| `-hide-y-slice` | (switch) | off | Hide only the coronal (Y) slice plane in 3D |
| `-hide-z-slice` | (switch) | off | Hide only the axial (Z) slice plane in 3D |
| `-cam`<br>`-camera` | `<OP1> <F1> [<OP2> <F2> ...]` | — | Series of 3D camera operations — see §4 |

### 2.5 Resampling and Data Handling

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-r`<br>`-resample` | (switch) | off | **Resample oblique data to standard RAS.** When set, appended as an extra argument to `loadvolume`, `loadsurface`, `loaddti`, `loadtrackvolume`, and `loadwaypoints` scripts |
| `-conform` | (switch) | off | Conform every subsequently loaded volume to the **geometry of the first loaded volume** |
| `-trilinear` | (switch) | off | Set default resample method to `SAMPLE_TRILINEAR` for subsequent loads |
| `-cubic` | (switch) | off | Set default resample method to `SAMPLE_CUBIC_BSPLINE` for subsequent loads |
| `-smoothed` | (switch) | off | Enable display smoothing for all subsequently loaded volumes |
| `-colormap` | `<TYPE>` | — | Apply this colour map to every subsequent `-v` (unless the volume has an inline `:colormap=`). TYPE follows `:colormap=` vocabulary |
| `-edgecolor` | `<color>` | — | Apply this edge colour to every subsequent `-f` (unless the surface specifies `:edgecolor=`) |
| `-percentile_all` | `<MIN> <MAX>` | — | Global percentile window applied to every `-v` and floating-argument volume that does not supply its own colormap |
| `-sphere-ignore-vg` | (switch) | off | Set `FV_SPHERE_IGNORE_VG=1`: ignore the volume-geometry block when the surface filename contains "sphere" |
| `-no-sphere-ignore-vg` | (switch) | off | Set `FV_SPHERE_IGNORE_VG=0`: respect the volume-geometry block even for sphere surfaces |
| `-auto-load-surf` | (switch) | off | **Enable** automatic loading of `?h.sphere` and supplemental surface data when loading a surface. The default is *no autoload*; this flag flips it on |

> [!gotcha] `-auto-load-surf` help text is inverted
> The help string attached to this flag reads "Do not automatically load
> sphere or other supplemental surface data". In the code
> ([[`MainWindow.cpp:997`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L997)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L997)) the flag sets `m_defaultSettings["no_autoload"] = false`,
> which **turns auto-loading ON**. The flag enables the behaviour; it does
> not disable it. Treat the name as "enable auto-load of supplemental surf
> data"; the negation in the help text is stale.

> [!gotcha] Default resample method is nearest-neighbour
> `m_nDefaultSampleMethod` is initialised to `SAMPLE_NEAREST`
> ([[`MainWindow.cpp:147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L147)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L147)). Unless `-trilinear`, `-cubic`, or an inline
> `sample=` is given, each volume loads with nearest-neighbour
> resampling. For anatomical viewing prefer `-trilinear` globally or
> `:sample=trilinear` per volume.

---

## 3. Scripting and Automation

### 3.1 Command Files

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-cmd`<br>`-command` | `<FILE>` | — | Execute FreeView commands from a plain-text file on startup. One command per line; lines starting with `#` are comments. Lines whose first token begins with `-` or `freeview`/`fv` are re-parsed as CLI-flag lines via `ParseCommand()` and so may contain any CLI flag. Lines that do not begin with `-` are executed as internal scripting commands (see §5) |
| `-stdin` | (switch) | off | Continuously listen to stdin for FreeView commands, routed through the same dispatcher as `-cmd` (allowing external programs to drive the GUI) |

### 3.2 Screenshot and Movie

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-ss`<br>`-screenshot` | `<FILE> [<MAG>] [<AUTO_TRIM>]` | — | Save a screenshot of the main viewport. `MAG` is the resolution multiplier (default 1, minimum 1). `AUTO_TRIM` ∈ `autotrim`/`true`/`1` to crop whitespace. If `FILE` contains `%name`, FreeView cycles through every loaded MRI or Surface layer, hides the others, saves one file per layer (with `%name` replaced by the layer name) and optionally trims them. Unless combined with `-noquit`, `-ss` implies `-quit` |
| `-write-slice-intersection` | `<PLANE> <FNAME_FMT> <START> <END>` | — | For each slice in `[START, END]`, write a polyline file containing the intersection of loaded surfaces with that slice. `PLANE` is `sag`, `cor`, or `hor`. `FNAME_FMT` must contain `%d` which is substituted with the slice number |
| `-noquit` | (switch) | off | Cancel the implicit `-quit` that `-ss` would otherwise add |

### 3.3 Execution Flow

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-quit` | (switch) | off | Append a `quit` script at the end of parsing — FreeView exits after the last scripted command finishes |
| `-continue` | (switch) | off | Sets `m_bContinue = true`: continue processing subsequent scripts even if an earlier one failed |
| `-verbose` | (switch) | off | Print additional diagnostics (e.g. clicked coordinates) |
| `-sync`<br>`-sync-cursor` | `[<SYNC_FILE>]` | — | Synchronise cursor position across concurrent FreeView instances through a shared JSON file. Without argument, uses `/tmp/.freeview_coord_sync` (or a home-directory fallback if `/tmp` is not writable) |
| `-rorder`<br>`-reverse-order` | (switch) | off | Reverse the loading order of all `-v`, `-l`, `-f`, `-w` arguments (topmost layer in the list becomes the last loaded) |
| `-prefix` | `<prefix> <file1> [<file2> ...]` | — | Prepend `<prefix>/` to the displayed name of each named file in the layer panel. Repeatable |
| `-subtitle` | `<TEXT>` | — | Set a window-title subtitle (shown as `FreeView: <TEXT>`) |

### 3.4 Layer Management in Scripts

Used primarily inside `-cmd` command files between load operations:

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-hide` | `<LAYER_TYPE>` | — | Hide the currently active layer of the given type. `LAYER_TYPE`: `volume`/`mri`, `surface`/`surf`, `label`/`roi` |
| `-unload` | `<LAYER_TYPE>` | — | Close / unload the currently active layer of the given type (same vocabulary as `-hide`) |

### 3.5 Miscellaneous

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-timecourse` | (switch) | off | Open the time-course plot window on startup |
| `-transform-volume` | (switch) | off | Open the Transform Volume dialog on startup |

---

## 4. Camera Operations (`-cam`)

```
-cam <OP1> <F1> [<OP2> <F2> ...]
```

Pairs of operation + floating-point value. Order matters — operations are applied in sequence. Invalid arity (odd number of tokens) aborts parsing. Valid operations (VTK camera API):

| Operation | Effect |
|-----------|--------|
| `Load` | Load a camera state from the file given as its value-argument |
| `Azimuth` | Rotate about the view-up vector (horizontal rotation) by `F` degrees |
| `Elevation` | Rotate about the cross product of direction-of-projection and view-up (vertical rotation) by `F` degrees |
| `Roll` | Rotate about the direction of projection (spin the camera) by `F` degrees |
| `Dolly` | Divide distance from focal point by `F`. `>1` dolly-in, `<1` dolly-out |
| `Zoom` | Alias for `Dolly` |

Example:

```bash
freeview -f lh.inflated -viewport 3d -cam dolly 1.5 azimuth 30
```

Applies a 1.5× dolly-in, then rotates the camera 30° horizontally.

---

## 5. Internal Scripting Commands (`-cmd` Vocabulary)

The internal dispatcher is `MainWindow::RunScript()` ([[`MainWindow.cpp:1844`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1844)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1844)). Each scripted line is split on whitespace; the first token (case-insensitive) selects the command; remaining tokens are its arguments. Commands that also have a corresponding CLI flag accept the same inline-property syntax.

Unrecognised commands print `Command 'xxx' was not recognized.` to stderr and are skipped.

### 5.1 Loading Data

| Command | Arguments | Notes |
|---------|-----------|-------|
| `loadcommand <FILE>` | script file | Include another `-cmd` file |
| `loadsubject <NAME>` | subject name | Same as `-recon <NAME>` |
| `loadvolume <FILE[:props]>` | volume spec | Same as `-v`; see §6 |
| `loaddti <VEC> <FA>` | pair of files | Same as `-dti` |
| `loadtrackvolume <FILE>`<br>`loadvolumetrack <FILE>` | tract volume | Same as `-tv` |
| `loadsurface <FILE[:props]>` | surface spec | Same as `-f`; see §7 |
| `loadsurfacevector <FILE>` | vector file | Load a per-vertex vector file onto the active surface |
| `loadsurfacecurvature <FILE>` | curvature file | Load a `.curv` or scalar per-vertex file |
| `loadsurfaceoverlay <FILE[:props]>` | overlay spec | Load a per-vertex overlay |
| `loadsurfaceannotation <FILE>` | annotation file | Load an `.annot` file onto the active surface |
| `loadsurfacelabel <FILE>` | label file | Load a surface label |
| `loadsurfacespline <FILE>` | spline file | Load a surface spline |
| `loadsurfaceparameterization <FILE>` | mrisp file | Replace vertex coords from MRISP data |
| `loadroi <FILE>`<br>`loadlabel <FILE>` | label file | Same as `-l` |
| `loadwaypoints <FILE[:props]>` | waypoints | Same as `-w` |
| `loadcontrolpoints <FILE[:props]>` | control points | Same as `-c` |
| `loadpvolumes <file1;file2;...> <prefix> <lut>` | p-labels payload | Matches `-p-labels`/`-p-prefix`/`-p-lut` triple |
| `loadtrack <FILE>` | `.trk` file | Same as `-t` |
| `loadtractcluster <DIR>` | cluster dir | Same as `-tc` |
| `loadodf <FILE> [<VERT> <FACE>]` | ODF spec | Same as `-odf` |
| `loadfcd <DIR> <SUBJ> [<SUFFIX>]` | FCD spec | Same as `-fcd` |
| `loadconnectome <CMAT> <PARC>` | cmat + parc | Same as `-cmat` |
| `loadisosurfaceregion <FILE>` | region file | Load a surface-region constraint for the isosurface of the active volume |

### 5.2 View Control

| Command | Arguments | Notes |
|---------|-----------|-------|
| `setviewport <NAME>` | `sagittal`/`sag`/`x`, `coronal`/`cor`/`y`, `axial`/`z`, `3d` | Set main viewport |
| `setviewsize <W> <H>` | integers | Resize main viewport |
| `zoom <FACTOR>` | float | Zoom all viewports |
| `setcamera <OP1> <F1> ...` | operation pairs | Same vocabulary as `-cam` |
| `view <DIR>` | `left`/`right`/`anterior`/`posterior`/`inferior`/`superior`/`lateral`/`medial` | 3D view direction |
| `resetview` | — | Reset all viewports |
| `setorthographic` | — | Enable 3D orthographic projection |
| `center` | — | Centre every 2D and 3D viewport at the current cursor |
| `ras <X> <Y> <Z> [tkreg]` | coords | Same as `-ras` |
| `slice <X> <Y> <Z>` | integer CRS | Same as `-slice` |
| `showcolorscale` | — | Show the colour-scale bar |

### 5.3 Screenshot and Export

| Command | Arguments | Notes |
|---------|-----------|-------|
| `screenshot <FILE> [<MAG>] [<AUTO_TRIM>]` | per `-ss` | Save screenshot. `%name` in `FILE` iterates over loaded MRI/Surface layers |
| `writesurfaceintersection <PLANE> <FILE> <SLICE>` | `sag`/`cor`/`hor` | Write one polyline file for one slice |
| `exportlineprofile <CSV>` | output file | Export thickness per line profile |
| `saveisosurface <FILE>` | `.vtk`/`.stl` | Save the isosurface of the active volume |
| `savelayer` | — | Save the currently active layer (overwrite) |
| `quit`<br>`exit` | — | Close the application |

### 5.4 Layer Management

| Command | Arguments | Notes |
|---------|-----------|-------|
| `hidelayer <TYPE>` | `volume`/`mri`, `surface`/`surf`, `label`/`roi` | Hide active layer of that type |
| `unloadlayer <TYPE>` | same types | Close active layer of that type |
| `unloadlayers` | — | Close all layers |
| `reorderlayers` | per implementation | Reorder layers in the layer panel |
| `setactivelayer` | per implementation | Select a layer as active |
| `setlayername <NAME>` | string | Rename the current layer |
| `setnameprefix <PREFIX> <FILE1> [<FILE2>...]` | prefix + matches | Prepend `<PREFIX>/` to the display name of layers whose file matches |
| `locklayer <FLAG>` | `0`/`1`/`true`/`false` | Lock / unlock the current layer |
| `showlayer <FLAG>` | visibility flag | Show / hide the current layer |
| `linkmri <FLAG>` | flag | Link/unlink display settings across volumes |
| `linksurface <FLAG>` | flag | Link/unlink overlay settings across surfaces |

### 5.5 Volume Appearance

| Command | Arguments | Notes |
|---------|-----------|-------|
| `setcolormap <NAME>` | colormap keyword | Change active volume's colormap |
| `setlut <NAME_OR_FILE>` | LUT name or file | Set lookup table |
| `setselectedlabels <idx1,idx2,...>` | comma list | Show only listed label values (LUT colormap) |
| `setheatscaleoptions <opt[,opt...]>` | `truncate`, `invert`, `clearhigher`, `mid_to_min` | Heat-scale modifiers |
| `setheatscaleoffset <VAL>`<br>`mean` | float or `mean` | Heat-scale offset |
| `setopacity <VALUE>` | 0.0–1.0 | Layer opacity |
| `setsmoothed <FLAG>` | 0/1 | Display smoothing |
| `setrgb <FLAG>` | 0/1 | 3-frame volume as RGB |
| `setdisplayoutline <FLAG>` | 0/1 | Show label outlines |
| `setdisplayvector <FLAG>` | 0/1 | 3-frame volume as vectors |
| `setdisplaytensor <FLAG>` | 0/1 | 9-frame volume as tensors |
| `setdisplayisosurface <SPEC>` | `on`, `lo,hi`, or `voxelize` | Enable 3D isosurface with thresholds |
| `setisosurfacecolor <COLOR>` | colour | Isosurface colour |
| `setisosurfacesmooth <N>` | integer | Smoothing iterations (default 5) |
| `setisosurfaceupsample <FLAG>` | 0/1 | Upsample volume before extraction |
| `setextractallregions <FLAG>` | 0/1 | Extract all disconnected regions |
| `setactiveframe <N>` | frame index | Change active frame of 4D volume |
| `setautoadjustframecontrast <FLAG>` | 0/1 | Auto re-window on frame change |
| `setvolumemask <LAYER_NAME>` | layer name | Use another volume as a mask |
| `settrackvolumeframe <N>` | frame | Set visible frame of a tract volume |
| `gotolabel`<br>`gotostructure <NAME_OR_VALUE>` | label | Jump slice to best match |

### 5.6 Surface Appearance

| Command | Arguments | Notes |
|---------|-----------|-------|
| `setsurfacecolor <COLOR>` | colour | 3D solid colour |
| `setsurfaceopacity <VAL>` | 0.0–1.0 | 3D transparency |
| `setsurfaceedgecolor <COLOR>` | colour / `overlay` | 2D edge contour colour |
| `setsurfaceedgethickness <N>` | integer | 2D edge thickness |
| `setsurfaceoffset <X> <Y> <Z>` | floats | Translate surface |
| `displaysurfacevertex <FLAG>` | 0/1 | Show vertex dots |
| `setsurfacevertexcolor <COLOR>` | colour | Vertex dot colour |
| `hidesurfacein3d <FLAG>` | 0/1 | Hide in 3D only |
| `gotosurfacevertex <VERTEX>` | integer | Centre on vertex |
| `setcurrentvertex <N>` | integer | Set active vertex number |
| `setsurfacecurvaturemap <METHOD>` | `off`/`binary`/`threshold` | Curvature rendering |

### 5.7 Surface Overlays, Annotations, Labels

| Command | Arguments | Notes |
|---------|-----------|-------|
| `setsurfaceoverlaymethod <METHOD>` | `linear`/`linearopaque`/`piecewise` (optionally `,mid_to_min`) | Threshold method |
| `setsurfaceoverlaycolormap <NAME>` | `heat`/`jet`/`colorwheel`/`custom`/`embedded` | Colour scale |
| `setsurfaceoverlaycustom <SPEC>` | stop list or file | Custom colour scale |
| `setsurfaceoverlayopacity <VAL>` | 0.0–1.0 | Per-overlay opacity |
| `setsurfaceoverlayoffset <VAL>` | float | Shift overlay values |
| `setsurfaceoverlayframe <N>` | integer | Active frame for multi-frame overlay |
| `setsurfaceoverlaysmooth <N>` | integer | Smoothing steps |
| `setsurfaceoverlaymask <FILE[,invert]>` | label file | Mask overlay with a label |
| `setsurfaceoverlayname <NAME>` | string | Rename the active overlay |
| `setsurfaceannotationoutline <FLAG>` | 0/1 | Show annotation boundaries only |
| `setsurfacelabeloutline <FLAG>` | 0/1 | Show label boundary only |
| `setsurfacelabelcolor <COLOR>` | colour | Label fill colour |
| `setsurfacelabelopacity <VAL>` | 0.0–1.0 | Per-label opacity |
| `setsurfacelabelthreshold <VAL>` | float | Minimum per-vertex value |
| `hidesurfacelabel <FLAG>` | 0/1 | Hide the active label |
| `gotosurfacelabel` | — | Jump to the active label centroid |
| `gotocontralateralsurface` | (internal pointer) | Flip to the contralateral surface |
| `gotoroi` | — | Jump to the active ROI |

### 5.8 Point Set / Tract Appearance

| Command | Arguments | Notes |
|---------|-----------|-------|
| `setpointsetcolor <COLOR>` | colour | Point colour |
| `setpointsetradius <VAL>` | float | Sphere radius |
| `setpointsetheatmap <FILE,MIN,MID,MAX>` | heatmap spec | Heatmap along a spline |
| `settrackcolor <COLOR>` | colour | Tractography solid colour |
| `settrackrender <STYLE>` | `line`/`tube` | Render style for tracts |

---

## 6. Volume Inline Properties (`-v`, `loadvolume`)

Attached after the filename with `:`. Parsed by `MainWindow::CommandLoadVolume()` ([[`MainWindow.cpp:2465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L2465)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L2465)).

### 6.1 Colour map

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `colormap`<br>`lut` | `grayscale`, `lut`, `heat`, `jet`, `turbo`/`turboscale`, `gecolor`, `nih`, `pet`, `binary` | `grayscale` | Selects the colour mapping. The Hue colormap is GUI-only. DirectionCoded is DTI-only |
| `grayscale` | `min,max` | auto | Set the grayscale window as `min,max` |
| `heatscale` | `min,mid,max` or `min,max` | auto | Three-point heat-scale thresholds. Two values set `min==mid` |
| `heatscale_options` | `truncate`, `invert`, `clearhigher`, `mid_to_min` (comma-separated) | — | Heat-scale modifiers |
| `heatscale_offset` | float or `mean` | 0 | Shift heat scale; `mean` sets it to the volume's mean voxel value |
| `colorscale` | `min,max` | auto | Two-point thresholds for `jet`/`gecolor`/`nih`/`pet` |
| `binary_color` | colour name / `R,G,B` | white | Colour for non-zero voxels when colormap is `binary` |
| `percentile` | flag | — | Interpret min/mid/max thresholds as percentiles |
| `select_label` | `idx1,idx2,...` | — | Show only listed integer labels (LUT colormap only) |
| `outline` | `0`/`1`/`true`/`yes` | 0 | Show labels as outlines (LUT colormap) |

### 6.2 Display

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `opacity` | 0.0–1.0 | 1.0 | Layer opacity |
| `visible` | 0/1/true/false | 1 | Initial visibility |
| `smoothed` | 0/1/true/false | global `-smoothed` | Display smoothing (does not alter data) |
| `rgb` | 0/1/true/false | 0 | Display a 3-frame volume as RGB (values must be in 0–255) |
| `lock` | 0/1/true/false | 0 | Prevent the layer from being reordered or edited |
| `linked` | 0/1/true/false | 0 | Link display settings with other `linked` volumes |
| `name` | string | filename | Display name in the layer list |
| `id` | integer | auto | Numeric layer identifier |
| `structure` | label name or integer | — | After load, move slice to the label with the largest count |

### 6.3 Registration and geometry

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `reg`<br>`transform` | path (`.lta`/`.dat`/`.xfm`) | — | Apply registration transform |
| `resample`<br>`interpolation` | `nearest`, `trilinear`, `cubic` | `nearest` | Interpolation when resampling. Default is nearest — override globally with `-trilinear`/`-cubic` or locally with this property |
| `ignore_header` | 0/1/true/false | 0 | Ignore this volume's geometry header; use the first volume's geometry |
| `frame` | integer | 0 | Initial frame for 4D data |
| `auto_adjust_frame_contrast` | 0/1/true/false | 0 | Recompute window/level on frame change |
| `basis` | integer | auto | Basis volume index used by multi-volume registration (special token `:basis=1` in DoParseCommand triggers a layer-reorder so that this volume is loaded first) |

### 6.4 Mask

| Property | Values | Description |
|----------|--------|-------------|
| `mask` | name of another loaded volume | Binary mask: voxels of the mask volume gate display of this volume |

### 6.5 Isosurface

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `isosurface` | `on`, `threshold`, or `lo,hi`, or `voxelize` | — | Enable 3D isosurface; values set the threshold(s); `voxelize` shows a blocky voxel shell |
| `isosurface_color` | colour name / `R,G,B` | white | Isosurface colour |
| `isosurface_smooth` | integer | 5 | Laplacian smoothing iterations |
| `isosurface_output` | path (`.vtk`/`.stl`) | — | Save isosurface to file on load |
| `extract_all_regions` | 0/1/true/false | on | Extract all disconnected regions |
| `surface_region` | path | — | Load a surface-region constraint; enables isosurface automatically |

### 6.6 Vector / Tensor (DTI / vector volumes)

| Property | Values | Description |
|----------|--------|-------------|
| `vector` | 0/1 | Display 3-frame volume as vectors |
| `tensor` | 0/1 | Display 9-frame volume as tensors |
| `render` | `line`/`directional`/`bar` (vector) or `boxoid`/`ellipsoid` (tensor) | Glyph style |
| `inversion` | `x`, `y`, `z` | Invert component of the vector |
| `vector_width` | float | Glyph line width |
| `vector_scale` | float | Glyph length scale |
| `vector_normalize` | 0/1/true/yes | Normalise vector lengths |
| `vector_skip` | integer | Render every N-th voxel (default 0 = no skip) |
| `vector_norm_threshold` | float | Hide vectors with magnitude below this |

See also [[freeview-dti]].

---

## 7. Surface Inline Properties (`-f`, `loadsurface`)

Attached after the filename with `:`. Parsed by `MainWindow::CommandLoadSurface()` ([[`MainWindow.cpp:3714`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L3714)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L3714)).

### 7.1 Display

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `color` | colour name / `R,G,B` | gray | 3D solid colour |
| `edgecolor` | colour name / `R,G,B` or `overlay` | (none — invisible in 2D) | Contour-line colour in 2D slice views. `overlay` uses the overlay colours |
| `edgethickness` | integer | 2 | Contour-line width (pixels). Set 0 to hide edges |
| `opacity` | 0.0–1.0 | 1.0 | 3D transparency |
| `visible` | 0/1/true/false | 1 | Initial visibility |
| `hide_in_3d` | 0/1/true/on | 0 | Suppress rendering in 3D only |
| `no_shading` | 0/1/true/yes | 0 | Disable Phong shading (flat ambient colour) |
| `name` | string | filename | Display name |
| `id` | integer | auto | Numeric layer identifier |
| `lock`<br>`locked` | 0/1/true/false | 0 | Lock the layer |
| `linked` | 0/1/true | 0 | Link with other linked surfaces |
| `offset` | `x,y,z` | 0,0,0 | Translate vertex positions (Surface RAS) |
| `vertex` | 0/1/true/on | 0 | Show vertex dots in 2D and 3D |
| `vertexcolor` | colour | auto | Colour of vertex dots |
| `goto` | vertex number | — | Centre view on that vertex |

### 7.2 Geometry and auxiliary surfaces

| Property | Values | Description |
|----------|--------|-------------|
| `sphere` | path | Load the spherical representation corresponding to this surface |
| `patch` | path | Load a surface patch file |
| `target_surf`<br>`target` | path | Target surface for vectors / patches to project on |
| `reg`<br>`affinexfm` | path (`.lta`) | Apply an affine transform to the vertex coordinates (automatically converts to tkRAS) |
| `ignore_vg` | 0/1 | Ignore the volume-geometry block (useful for spheres; overrides `FV_SPHERE_IGNORE_VG`) |
| `all` | 0/1/true/yes | Load all standard surface types for this subject |
| `sup_files` | path list | Supplemental surface files |

### 7.3 Curvature

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `curvature` | path | auto (`?h.curv`) | Curvature / scalar file |
| `curvature_method` | `off`, `binary`, `threshold` | `threshold` | How curvature is rendered |
| `curvature_setting` | `midpoint,slope` | — | Curvature colour ramp anchors |

### 7.4 Overlays

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `overlay` | path | — | Overlay data (`.mgh`/`.mgz`/`.nii`/`.curv`) |
| `overlay_reg` | path | — | Registration file for the overlay |
| `overlay_method` | `linear`, `linearopaque`, `piecewise` (optionally `,mid_to_min`) | `linearopaque` | Threshold colour method |
| `overlay_color` | comma list of `colorwheel`, `jet`, `inverse`, `truncate`, `clearlower`, `clearhigher` | — | Colour-scale modifiers |
| `overlay_custom` | `file` or `v,r,g,b,v2,r2,g2,b2,...` | — | Custom colour-scale spec (inline or from file) |
| `overlay_opacity` | 0.0–1.0 | 1.0 | Per-overlay opacity |
| `overlay_threshold` | `low,high[,percentile]` or `low,mid,high[,percentile]` | auto | Threshold range. With 2 values and linear method, mid is auto-set. Add `,percentile` to interpret as percentiles |
| `overlay_offset` | float | 0 | Shift overlay values |
| `overlay_mask` | `file[,invert]` | — | Label-file mask; `,invert` inverts the mask |
| `overlay_frame` | integer | 0 | Initial frame of multi-frame overlay |
| `overlay_smooth` | integer | 0 | Smoothing steps |
| `overlay_zorder` | integer | 0 | Rendering z-order |
| `correlation` | path | — | Multi-frame overlay for seed-based correlation |
| `mrisp`<br>`parameterization_overlay` | path | — | Overlay derived from an MRISP parameterisation |

See [[freeview-surfaces]] for what each threshold method does visually.

### 7.5 Annotations

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `annot` | path (or comma list) | — | Annotation file(s). Multiple `.annot` files may be listed separated by commas |
| `annot_outline`<br>`annotation_outline`<br>`aparc_outline` | 0/1/true/yes | 0 | Show annotation borders only |
| `annot_zorder` | integer | 0 | Rendering z-order for annotations |

### 7.6 Labels

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `label` | path | — | Label file |
| `label_outline` | 0/1/true/yes | 0 | Show label boundary only |
| `label_color`<br>`labelcolor` | colour | auto | Fill colour |
| `label_opacity` | 0.0–1.0 | 1.0 | Per-label opacity |
| `label_threshold` | float | 0 | Minimum per-vertex value to show |
| `label_centroid` | 0/1/true/yes | 0 | Move view to label centroid |
| `label_visible` | 0/1 | 1 | Initial visibility |
| `label_zorder` | integer | 0 | Rendering z-order |

### 7.7 Other

| Property | Values | Description |
|----------|--------|-------------|
| `vector` | path | Load a surface-based vector file |
| `spline` | path | Load a surface spline |

---

## 8. Colour Specification

Colour arguments across the CLI accept any of the following forms, resolved by `MainWindow::ParseColorInput()`:

- **CSS/SVG named colour** — delegated to Qt's `QColor::isValidColor()`. The full W3C SVG colour keyword list applies (`red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `orange`, `purple`, `lightblue`, `darkred`, `gainsboro`, 140+ names total)
- **Hex string** — `#ff8000`, standard CSS hex notation
- **Comma-separated RGB** — `255,128,0` (three integers 0–255)

Inline properties that use colour include: `color`, `edgecolor`, `binary_color`, `isosurface_color`, `vertexcolor`, `label_color`/`labelcolor`, `splinecolor`.

---

## 9. Environment Variables

| Variable | Set by | Purpose |
|----------|--------|---------|
| `SUBJECTS_DIR` | user | Required for `-recon` / `loadsubject` |
| `FS_COPY_HEADER_CTAB` | main.cpp ([line 124](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L124)) | Set to `1` at startup so that edited volumes retain header colour tables on save |
| `FV_SPHERE_IGNORE_VG` | `-sphere-ignore-vg` / `-no-sphere-ignore-vg` | `1` = ignore volume geometry on sphere surfaces |
| `FV_PATIENT_ORIENTATION` | `tkmeditfv`/`tksurferfv` wrappers | Patient orientation mode (not read by the freeview binary itself) |
| `FV_ROTATE_AROUND_CURSOR` | `tkmeditfv` / `-rotate-around-cursor` | Rotate-around-cursor in 3D |
| `SURFER_FRONTDOOR` | main.cpp ([line 121](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L121)) | Cleared at startup to disable the licensing front door |
| `LANG` | main.cpp ([line 123](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L123)) | Forced to `en_US` unless `FS_DISABLE_LANG` is set |

---

## 10. Common Recipes

### 10.1 Quality-check recon-all surfaces

```bash
freeview -v $SUBJECTS_DIR/$subj/mri/brainmask.mgz \
         -f $SUBJECTS_DIR/$subj/surf/lh.white:edgecolor=yellow \
         -f $SUBJECTS_DIR/$subj/surf/lh.pial:edgecolor=red \
         -f $SUBJECTS_DIR/$subj/surf/rh.white:edgecolor=yellow \
         -f $SUBJECTS_DIR/$subj/surf/rh.pial:edgecolor=red \
         -viewport coronal
```

### 10.2 Parcellation overlay on anatomy

```bash
freeview -v $SUBJECTS_DIR/$subj/mri/brainmask.mgz \
         -v $SUBJECTS_DIR/$subj/mri/aparc+aseg.mgz:colormap=lut:opacity=0.25
```

### 10.3 Inflated surface + parcellation in 3D

```bash
freeview -f $SUBJECTS_DIR/$subj/surf/lh.inflated:annot=aparc.annot \
         -viewport 3d -view lateral
```

### 10.4 Functional overlay on surface

```bash
freeview -f $SUBJECTS_DIR/$subj/surf/lh.inflated \
            :overlay=sig.mgh:overlay_threshold=2,5:overlay_method=linearopaque \
         -viewport 3d
```

### 10.5 Batch screenshot (non-interactive)

```bash
freeview -v brain.mgz -viewport coronal -ss screenshot.png -quit
```

### 10.6 Screenshot of each loaded volume (cycling)

```bash
freeview -v T1.mgz -v aseg.mgz:colormap=lut:opacity=0.3 \
         -ss qc_%name.png 2 autotrim -quit
```

`%name` iterates over layers; magnification = 2, `autotrim` crops whitespace.

### 10.7 Load a full recon-all subject

```bash
export SUBJECTS_DIR=/path/to/subjects
freeview -recon bert
```

### 10.8 Driving the GUI from a script

Save as `view.cmd`:

```
# Load data
loadvolume /path/to/T1.mgz
loadsurface /path/to/lh.white:edgecolor=yellow
setviewport coronal

# Move to an anatomical landmark
ras 10 -20 15
zoom 2.0

# Export
screenshot /tmp/slice.png 2 autotrim
quit
```

Then:

```bash
freeview -cmd view.cmd
```

### 10.9 Continuous control from another program

```bash
freeview -stdin   # reads commands from stdin indefinitely
```

The driving program pipes lines like `loadvolume ...`, `ras ...`, `screenshot ...` to the freeview process.

### 10.10 3D camera tour

```bash
freeview -f lh.inflated:annot=aparc.annot \
         -viewport 3d \
         -cam azimuth 30 elevation 15 dolly 1.2 \
         -ss lateral30.png -quit
```

---

## 11. Source Notes and Known Quirks

- **Flag definitions**: [[`freeview/main.cpp:144–336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/main.cpp#L144-L336)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/main.cpp#L144-L336) (`cmdLineDesc[]` array).
- **CLI → script translation**: `MainWindow::DoParseCommand()` ([[`MainWindow.cpp:954`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L954)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L954)). Not every flag is handled there — some (e.g. `-verbose`, `-continue`, `-timecourse`, `-transform-volume`, `-rotate-around-cursor`, the `hide-*-slice` flags, the `-sphere-ignore-vg` env-var setters) act directly on the `MainWindow` instance without producing a script entry.
- **Script dispatch**: `MainWindow::RunScript()` ([[`MainWindow.cpp:1844–2336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1844-L2336)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1844-L2336)). Unrecognised commands produce a stderr warning and are skipped; a typo in a `-cmd` file does not abort the run.
- **Order of operations**: CLI flags accumulate into `m_scripts` during parsing; scripts run sequentially from `OnIdle()` once parsing has completed. Inline `basis=1` properties on `-v` cause the affected volume to be re-inserted at position 0 of the script queue ([[`MainWindow.cpp:1110–1117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1110-L1117)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1110-L1117)).
- **`-cmd` files can mix styles**: a line beginning with `-` or `freeview`/`fv` is re-parsed through the CLI parser; any other line is treated as an internal scripting command. Comments start with `#`.
- **Default resample method is `SAMPLE_NEAREST`** ([[`MainWindow.cpp:147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L147)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L147)), in contrast to both the inline-property help string (which says `nearest` is the default correctly) and common expectation.
- **`-auto-load-surf` naming is inverted**: the flag turns autoload ON (see gotcha above).
- **`-ss` implies `-quit` unless `-noquit` is also given** ([[`MainWindow.cpp:1455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1455)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/freeview/MainWindow.cpp#L1455)).
- **`-l` requires a prior volume**: loading a label before any volume prints a warning and drops the label request.
- **`-odf` requires a prior volume**: same pattern.

---

## References

- Source: `freeview/main.cpp` — complete `CmdLineEntry cmdLineDesc[]` table (definitive list of all CLI flags)
- Source: `freeview/MainWindow.cpp::DoParseCommand()` — CLI-flag dispatch and script-queue construction
- Source: `freeview/MainWindow.cpp::RunScript()` — complete internal-command dispatch table
- Source: `freeview/MainWindow.cpp::CommandLoadVolume()` — volume inline-property parser
- Source: `freeview/MainWindow.cpp::CommandLoadSurface()` — surface inline-property parser
- Source: `freeview/MainWindow.cpp::CommandLoadCommand()` — `-cmd` file reader
- Source: `freeview/MainWindow.cpp::CommandScreenCapture()` — `-ss` `%name` cycling logic
- Source: `freeview/MainWindow.cpp::ParseColorInput()` — Qt-backed colour parsing
