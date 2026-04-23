---
title: "FreeView"
type: gui-application
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/"
replaces:
  - "[[tkmedit]]"
  - "[[tksurfer]]"
related:
  - "[[coordinate-systems]]"
  - "[[mgz]]"
  - "[[surface-format]]"
  - "[[annotation-format]]"
  - "[[label-format]]"
  - "[[recon-all]]"
  - "[[tkmeditfv]]"
  - "[[tksurferfv]]"
  - "[[fsgd-format]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "Brainstem View menu item purpose unclear from source"
  - "Full -cmd command vocabulary not documented"
  - "Stereo render modes (anaglyph vs. quad-buffer) not confirmed"
tags:
  - gui
  - visualization
  - editing
  - freeview
---

# FreeView

## Summary

FreeView is FreeSurfer's primary interactive visualisation and editing application. It displays volumetric MRI data, cortical surfaces, overlays, labels, annotations, DTI data, tractography, and point sets in both 2D orthogonal slice views and a 3D rendering view. It replaces the legacy tools [[tkmedit]] (volume viewer/editor) and [[tksurfer]] (surface viewer) with a unified, multi-layer interface built on Qt.

FreeView is both a viewer and an editor: it supports manual correction of white matter segmentation, brain mask editing, control point placement, ROI drawing, and surface vertex repositioning — all operations that feed back into the [[recon-all]] pipeline for reprocessing.

## Source Information

- **Language:** C++ (Qt-based GUI)
- **GUI toolkit:** Qt 5 or Qt 6 (build-selectable via `CMakeLists.txt`; both supported in v8.2.0)
- **Source directory:** `freeview/`
- **Binary location:** `$FREESURFER_HOME/bin/freeview`
- **Replaces:** [[tkmedit]], [[tksurfer]], `scuba`

## Application Overview

FreeView uses a **layer-based data model**. Multiple data objects (volumes, surfaces, labels, etc.) can be loaded simultaneously and are displayed as stacked layers. The user controls visibility, ordering, opacity, and rendering properties for each layer independently.

The window is divided into four regions:

1. **Menu bar** — file operations, view layout, mode selection, tools
2. **Toolbar** — mode buttons, layout selectors, navigation controls, quick actions
3. **Side panel** (left) — layer list with visibility checkboxes, and context-sensitive property controls for the selected layer
4. **Viewing area** (centre) — 2D slice views and/or 3D rendering

## Data Types (Layers)

FreeView can load and display eight user-facing data categories, each with its own panel behaviour and rendering options. (Source: layer collection names in `MainWindow.cpp`.)

| Layer type | Description | Load flag | Detailed page |
|-----------|-------------|-----------|---------------|
| **Volume (MRI)** | 3D/4D MRI volumes (anatomy, segmentations, functional overlays) | `-v` | [[freeview-volumes]] |
| **Surface** | Triangulated cortical meshes with optional overlays and annotations | `-f` | [[freeview-surfaces]] |
| **ROI** | Regions of interest drawn on 2D slices | (via editing) | [[freeview-editing]] |
| **Point Set** | Waypoints and control points | `-w`, `-c` | [[freeview-pointsets]] |
| **Tract** | Tractography streamlines (`.trk`) | `-t` | [[freeview-dti]] |
| **CMAT** | Connectome matrix | (File → Load Connectome Matrix…) | (not yet documented) |
| **FCD** | Focal cortical dysplasia data | `-fcd` | (not yet documented) |
| **ODF** | Orientation distribution functions | `-odf` | [[freeview-dti]] |

Layers are listed in the side panel. The topmost visible layer is drawn on top in 2D views. Layers below are occluded unless the top layer has reduced opacity.

> [!gotcha] Layer ordering matters
> The side panel lists layers top-to-bottom. The topmost checked (visible)
> layer is drawn on top in 2D views. Double-clicking a layer jumps it to
> the top. `Alt+C` cycles the top layer to the bottom. This is the primary
> mechanism for toggling between multiple loaded volumes.

## Window Layout

### Menu Bar

> [!contradiction] Menu structure
> The previous version of this page described menus: File, Edit, View, Tools,
> Window. The actual v8.2.0 menus are: **File, Edit, View, Layer, Action,
> Tools, Help**. There is no "Window" menu. Mode switching is in the
> **Action** menu (not Tools). A new **Layer** menu manages layer
> visibility/selection. This is a major structural correction.

#### File
| Item | Shortcut | Description |
|------|----------|-------------|
| New Volume… | | Create an empty volume using an existing volume as geometry template |
| Load Volume… | `Ctrl+O` | Browse and load a volume file |
| Reload Volume… | | Reload the current volume from disk |
| Close Volume | | Close the selected volume |
| Load Surface… | | Browse and load a surface file |
| Reload Surface… | | Reload the current surface from disk |
| Load Patch… | | Load a surface patch file |
| Save Patch As… | | Save the current surface patch |
| Load Parameterization… | | Load surface parameterization (mrisp) |
| New ROI… | | Create a new (empty) ROI layer |
| Load ROI… | | Load an ROI label file |
| Save ROI… | | Save the current ROI |
| Save ROI As… | | Save ROI to a new file |
| New Point Set… | | Create a new empty point set |
| Load Point Set… | | Load a waypoints or control points file |
| Save Point Set… | | Save the current point set |
| Save Point Set As… | | Save to a new file |
| Load Connectome Matrix… | | Load CMAT connectome data |
| Close Connectome Matrix | | Close the current connectome layer |
| Load Tract… | | Load a `.trk` tractography file |
| Load Tract Cluster… | | Load a tract cluster directory |
| Close Tract | | Close the current tract layer |
| Load ODF… | | Load ODF data |
| Close ODF | | Close the ODF layer |
| Load FCD… | | Load FCD data |
| Close FCD | | Close the FCD layer |
| Save Volume | `Ctrl+S` | Save the currently selected volume (overwrites) |
| Save Volume As… | | Save to a new filename |
| Save All Volumes… | | Save all modified volumes |
| Save Surface | | Save the currently selected surface |
| Save Surface As… | | Save surface to a new filename |
| Save Movie Frames… | | Export animation frames |
| Save Screenshot | | Export the current viewport as an image file |
| Run Command… | | Execute a FreeView command interactively |
| Load Command… | | Execute a command file (`-cmd` equivalent) |
| Recent Files ▶ | | Submenu with recently opened Volumes and Surfaces |
| Exit | `Ctrl+Q` | Exit FreeView |

#### Edit
| Item | Shortcut | Description |
|------|----------|-------------|
| Undo | `Ctrl+Z` | Undo the last editing action |
| Redo | `Ctrl+Shift+Z` | Redo an undone action |
| Copy | `Ctrl+C` | Copy current slice image region |
| Copy Structure | `Ctrl+Alt+C` | Copy segmentation label at cursor |
| Paste | `Ctrl+V` | Paste copied content |

> [!contradiction] Redo shortcut is Ctrl+Shift+Z
> The previous version listed Redo as `Ctrl+Y`. The correct shortcut is
> `Ctrl+Shift+Z`, confirmed from `MainWindow.ui` (`actionRedo`).

#### View
| Item | Shortcut | Description |
|------|----------|-------------|
| Show Toolbar | | Toggle toolbar visibility |
| Show Control Panel | `Ctrl+P` | Toggle the side panel |
| Floating Panels | | Detach layer panels |
| Viewport Layout ▶ | | Submenu: 1×1, 2×2, 1+3, 1+3 Horizontal, Sagittal, Coronal, Axial, 3D |
| Reset View | `Ctrl+R` | Reset zoom, pan, and slice position |
| Reset View to Nearest Axis | `Ctrl+Alt+R` | Snap 3D camera to nearest standard axis |
| Rotate View 90° | `Ctrl+9` | Rotate current viewport 90° |
| Set Camera… | | Open camera preset dialog |
| Neurological View | | Toggle neurological/radiological convention |
| Brainstem View | | Switch to brainstem-oriented view |
| Show Command Console | | Open the FreeView command console |
| Show Time Course | | Open the timecourse plot window (for 4D volumes) |
| Show Coordinate Annotation | | Toggle coordinate overlay text in viewports |
| Show Color Scale | | Display colour scale bar for the active layer |
| Show Cursor | `Alt+1` | Toggle crosshair cursor visibility |
| Show Slices in 3D | `Ctrl+Shift+S` | Toggle 2D slice planes in the 3D viewport |
| Show Slice Frames (3D) | | Toggle slice border frames in 3D |
| Stereo Render | | Enable stereo rendering (3D view) |
| Sync With Other Instances | | Synchronise cursor with other FreeView windows |

#### Layer
| Item | Shortcut | Description |
|------|----------|-------------|
| Show All Layers | `Ctrl+Alt+S` | Make all layers visible |
| Hide All Layers | `Ctrl+Alt+H` | Hide all layers |
| Cycle Through Layer List | `Alt+C` | Move top layer to bottom |
| Reverse Cycle | `Alt+Shift+C` | Move bottom layer to top |
| Toggle Volume Visibility | `Alt+V` | Show/hide selected volume |
| Toggle Surface Visibility | `Alt+F` | Show/hide selected surface |
| Toggle ROI Visibility | `Alt+R` | Show/hide ROI |
| Toggle Point Set Visibility | `Alt+W` | Show/hide point set |
| Toggle All Surfaces | `Ctrl+F` | Show/hide ALL loaded surfaces |
| Cycle Through Overlays | | Cycle active overlay on selected surface |
| Cycle Through Annotations | `Meta+Alt+A` | Cycle active annotation |
| Select All Layers | `Ctrl+Shift+A` | Select all layers in panel |
| Deselect All Layers | `Ctrl+Shift+D` | Deselect all layers |

#### Action
| Item | Shortcut | Description |
|------|----------|-------------|
| Navigate | `Alt+N` | Switch to Navigate mode |
| Measure | | Switch to Measure mode |
| Voxel Edit | `Alt+E` | Switch to Voxel Edit mode |
| Recon Edit | `Ctrl+E` | Switch to Recon Edit mode |
| ROI Edit | | Switch to ROI Edit mode |
| Point Set Edit | `Ctrl+T` | Switch to Point Set Edit mode |

> [!contradiction] Modes are in Action menu, not Tools
> The previous version of this page placed mode switching under the Tools
> menu. In v8.2.0, modes are in a dedicated **Action** menu.

#### Tools
| Item | Description |
|------|-------------|
| Volume Filter ▶ | Submenu: Mean, Median, Convolve, Gradient, Sobel, Erode, Dilate, Open, Close, Boundary |
| Transform Volume… | Open manual volume transform dialog |
| Crop Volume… | Crop volume to bounding box |
| Threshold Volume… | (non-functional — slot is commented out in v8.2.0) |
| Create Optimal Combined Volume… | Combine multiple volumes optimally |
| Transform Surface… | Open surface transform dialog |
| Reposition Surface… | Open the Reposition Surface Vertex dialog |
| Smooth Surface… | Open surface smoothing dialog |
| Remove Intersections In Surface | Fix self-intersecting surface triangles |
| Line Profile… | Open line profile measurement tool |
| Save Point | Save current cursor position |
| Go To Saved Point | Navigate to previously saved cursor position |
| Sync With Other Instances | Synchronise cursor |
| Tile Synced Windows | Tile synchronised FreeView windows |
| Save Camera… | Save current 3D camera state |
| Load Camera… | Restore saved 3D camera state |
| Show Label/ROI Stats… | Display statistics for loaded labels/ROIs |
| Plot FSGD Data… | Plot [[fsgd-format\|FreeSurfer Group Descriptor]] data |
| Save GIF… | Export animated GIF |
| Preferences… | Open application preferences dialog |

### Toolbar

The toolbar is arranged in functional groups from left to right (from `MainWindow.ui`):

**Mode buttons** (mutually exclusive, one always active):
- Navigate
- Measure
- Voxel Edit
- Recon Edit
- ROI Edit
- Point Set Edit

**Edit history:** Undo, Redo

**Panel toggle:** Show Control Panel

**Layout buttons:** 1×1, 2×2, 1+3, 1+3 Horizontal

**Viewport orientation:** Sagittal, Coronal, Axial, 3D

**Reset view**

**Quick toggles:** Toggle All Surfaces, Show Coordinate Annotation, Show Color Scale, Show Time Course

**Screenshot:** Save Screenshot

**Navigation markers:** Save Point, Go To Saved Point

**View mode:** Neurological/Radiological toggle

### Side Panel (Layer Panel)

The left panel has two areas:

1. **Layer list** — shows all loaded layers of the currently selected type (Volumes, Surfaces, etc.), with visibility checkboxes, the layer name (filename), up/down arrows to reorder, and a lock icon for protected layers.

2. **Property controls** — context-sensitive controls that change depending on the selected layer's type. See [[freeview-volumes]] and [[freeview-surfaces]] for the full control sets.

### Viewing Area

The viewing area renders data in up to four viewports:

- **2D orthogonal views:** coronal (front-back), sagittal (left-right), axial (top-bottom). Each shows one slice from the volume stack, with surfaces rendered as intersection contours (edge lines).
- **3D view:** renders surfaces as 3D meshes (smooth or wireframe), optionally with 2D slice planes intersecting the volume. See [[freeview-3d-view]].

The **cursor** (red crosshair) is synchronised across all viewports. Clicking in any 2D view repositions the cursor and updates the other views to show the slice passing through that point.

### Status Bar / Cursor Information Panel

The cursor info panel (`InfoTreeWidget.cpp`) shows two side-by-side trees: **Cursor** (fixed reference point) and **Mouse** (moving with pointer). Fields per loaded volume:

| Field | Description | Coordinate system |
|-------|-------------|-------------------|
| **RAS** | Physical coordinates | Scanner RAS (from vox2ras) |
| **TkReg RAS** | Surface coordinate system | Surface RAS / tkRAS (from vox2ras-tkr); right-click to toggle display |
| **MNI305** | Atlas coordinates | MNI305 (labeled as "MNI305 (`<volname>`)" in the panel) |
| **Voxel** | Voxel indices | CRS (column-row-slice, zero-based) |
| **Intensity** | Voxel value | (scalar) |
| **Label** | Segmentation label name | (string from [[color-lut]]) |

Fields per loaded surface:
| Field | Description |
|-------|-------------|
| **Vertex** | Vertex index + Surface RAS coordinates |
| **Normal** | Surface normal vector |
| **Curvature** | Curvature value at vertex |
| **Overlay value(s)** | Per-vertex overlay value(s) |
| **Annotation label** | Parcellation region name |

> [!contradiction] MNI305, not Talairach
> The previous version of this page labeled the atlas coordinate field as
> "Talairach" and "MNI / Talairach MNI". The source (`InfoTreeWidget.cpp`)
> labels this field "MNI305" with the volume name in parentheses. There is
> no field labeled "Talairach" in the cursor info panel.

> [!gotcha] RAS vs. TkReg RAS
> The "RAS" row shows **Scanner RAS** (native vox2ras). Right-click on the
> cursor tree to toggle "TkReg RAS" display. Surface vertex coordinates shown
> when clicking on a surface are in **Surface RAS (tkRAS)**. These differ by
> the c_ras offset. See [[coordinate-systems]] for the full explanation.

## Interaction Modes

| Mode | Shortcut | Purpose | Editing | Detailed page |
|------|----------|---------|---------|---------------|
| Navigate | `Alt+N` | Browse slices, zoom, pan, inspect data | None | (this page) |
| Voxel Edit | `Alt+E` | Draw/erase voxels, fill regions, copy/paste | Modifies active volume | [[freeview-editing]] |
| Recon Edit | `Ctrl+E` | Edit WM/brainmask for recon-all corrections | Modifies volumes | [[freeview-editing]] |
| ROI Edit | | Draw labelled regions on 2D slices | Creates/modifies label files | [[freeview-editing]] |
| Point Set Edit | `Ctrl+T` | Place, move, delete control points | Modifies point set files | [[freeview-editing]] |
| Measure | | Draw measurement lines, read distances | No data modification | [[freeview-editing]] |

### Navigate Mode Details

When Navigate mode is active:

- **Left-click:** move cursor to clicked position; all viewports update
- **Scroll wheel** or **Ctrl+Right-click:** zoom out; **Ctrl+Left-click:** zoom in
- **Middle-click drag:** pan the view
- **Shift+Right-click drag:** adjust brightness (up/down) and contrast (left/right) of the active volume
- **Page Up / Page Down** or **Up / Down arrows:** scroll through slices
- **Ctrl+Arrow keys:** pan view (without moving cursor)
- **`+`:** next frame (4D volume)
- **`-`:** previous frame (4D volume)

> [!contradiction] Brightness/contrast is Shift+Right-click, not Shift+Left-click
> The previous version of this page stated "Shift+left-click drag" adjusts
> brightness and contrast. The correct action is **Shift+Right-click drag**,
> confirmed from `Interactor2D.cpp`.

> [!contradiction] `+`/`-` keys cycle frames, not zoom
> The previous version stated `+`/`=` zooms in and `-` zooms out. In the
> source (`Interactor2D.cpp` lines 336–347), these keys cycle through frames
> of a 4D volume. They are not zoom shortcuts.

## Command-Line Interface

FreeView supports extensive command-line loading with inline property syntax:

```bash
freeview -v brainmask.mgz \
         -v wm.mgz:colormap=heat:opacity=0.4 \
         -v aseg.mgz:colormap=lut:opacity=0.2 \
         -f lh.white:edgecolor=yellow \
         -f lh.pial:edgecolor=red \
         -viewport coronal
```

See [[freeview-command-line]] for the full reference.

## Keyboard and Mouse Reference

See [[freeview-keyboard-mouse]] for the complete reference. Essential shortcuts:

| Shortcut | Action |
|----------|--------|
| `Alt+C` | Cycle top layer to bottom |
| `Alt+V` | Toggle selected volume visibility |
| `Alt+F` | Toggle selected surface visibility |
| `Ctrl+F` | Toggle all surfaces on/off |
| `Alt+S` / `Alt+A` | Increase / decrease opacity of selected layer |
| `Ctrl+O` | Load volume |
| `Ctrl+S` | Save volume |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Shift+S` | Toggle 2D slices in 3D view |
| `PageUp` / `PageDown` | Previous / next slice |
| `+` / `-` | Next / previous frame (4D) |

## Scripting and Automation

FreeView supports limited automation via command files. The scripting engine is FreeView-native — no Python, Tcl, or other embedded language.

- **`-cmd <file>`** — execute a command file (plain-text, one FreeView command per line) on startup
- **`-stdin`** — read commands from standard input
- **`-quit`** — exit after completing all command-line operations
- **`-ss <filename>`** — save a screenshot and optionally quit
- **`-viewport <orientation>`** — set initial viewport
- **`-layout <n>`** — set viewport layout

See [[freeview-command-line]] for the `-cmd` command vocabulary.

## Coordinate Display Conventions

FreeView displays coordinates from multiple systems simultaneously. See [[coordinate-systems]] for definitions:

- **Volume cursor** shows Scanner RAS (labeled "RAS") and CRS (labeled "Voxel")
- **Surface vertex** clicks show Surface RAS (tkRAS), labeled "Vertex RAS" / "TkReg RAS"
- **MNI305** coordinate shown (labeled "MNI305"), not true Talairach
- Right-click the cursor tree to show/hide the TkReg RAS row

## Common Workflows

### Inspecting recon-all output

```bash
freeview -v $SUBJECTS_DIR/sub01/mri/brainmask.mgz \
         -v $SUBJECTS_DIR/sub01/mri/aseg.mgz:colormap=lut:opacity=0.2 \
         -f $SUBJECTS_DIR/sub01/surf/lh.white:edgecolor=yellow \
         -f $SUBJECTS_DIR/sub01/surf/lh.pial:edgecolor=red \
         -f $SUBJECTS_DIR/sub01/surf/rh.white:edgecolor=yellow \
         -f $SUBJECTS_DIR/sub01/surf/rh.pial:edgecolor=red
```

### Loading a full recon-all subject

```bash
export SUBJECTS_DIR=/path/to/subjects
freeview -recon sub01
```

### Editing white matter segmentation

See [[freeview-editing#recon-edit-mode]] for the full workflow.

### Viewing functional overlays on surfaces

```bash
freeview -f $SUBJECTS_DIR/sub01/surf/lh.inflated:overlay=lh.sig.mgh:overlay_threshold=2,5 \
         -viewport 3d
```

## Gotchas and Caveats

> [!gotcha] Legacy wrapper scripts
> `tkmeditfv` and `tksurferfv` are wrapper scripts that translate old
> `tkmedit`/`tksurfer` command-line arguments into FreeView equivalents.
> If you find old tutorials using `tkmedit` commands, use these wrappers
> or translate the commands manually.

> [!gotcha] Layer ordering matters
> The side panel lists layers top-to-bottom. In 2D views, the topmost
> checked (visible) layer is drawn on top. Double-clicking a layer jumps it
> to the top. `Alt+C` cycles the top layer to the bottom.

> [!gotcha] Surface edge colours in 2D views
> When surfaces are displayed in 2D slice views, they appear as contour
> lines (edge intersections with the slice plane). By default, surfaces
> have no edge colour set and are invisible in 2D views. Set explicit
> `edgecolor=` for quality checking.

> [!gotcha] Saving overwrites without confirmation
> `Ctrl+S` (Save Volume) overwrites the original file without prompting.
> Use Save As if you want to preserve the original. The recon-all pipeline
> uses `.auto.mgz` / `.mgz` pairs specifically to protect automatic results
> from manual edits.

## Related Pages

- [[freeview-volumes]] — volume layer controls, colour maps, opacity, windowing
- [[freeview-surfaces]] — surface layer controls, overlays, annotations, curvature
- [[freeview-editing]] — all editing modes
- [[freeview-command-line]] — complete command-line option reference
- [[freeview-keyboard-mouse]] — keyboard shortcuts and mouse actions
- [[freeview-3d-view]] — 3D rendering, camera controls, lighting
- [[freeview-dti]] — DTI volume display, vector fields, tractography
- [[freeview-pointsets]] — waypoints and control points
- [[coordinate-systems]] — coordinate system definitions and transforms

## References

- Source: `freeview/MainWindow.cpp` (menu construction, data type layer collections, cursor info)
- Source: `freeview/InfoTreeWidget.cpp` (cursor/mouse info panel field definitions)
- Source: `freeview/Interactor2D.cpp` (navigate mode mouse event handling)
- Source: `freeview/CMakeLists.txt` (Qt5/Qt6 build selection)
- FreeSurfer wiki: [FreeviewGuide](https://surfer.nmr.mgh.harvard.edu/fswiki/FreeviewGuide) (outdated — last substantive edits 2013–2017)
