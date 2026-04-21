---
title: "FreeView — Point Sets"
type: gui-panel
parent_application: "[[freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/LayerPointSet.cpp"
  - "freeview/LayerPropertyPointSet.cpp"
  - "freeview/FSPointSet.cpp"
  - "freeview/DialogLoadPointSet.cpp"
  - "freeview/DialogNewPointSet.cpp"
  - "freeview/DialogControlPointComment.cpp"
related_panels:
  - "[[freeview]]"
  - "[[freeview-editing]]"
related_tools:
  - "[[mri_normalize]]"
  - "[[recon-all]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "Enhanced JSON format sub-fields (pathological_region, fixed, etc.) full specification"
  - "DialogControlPointComment .ui file checkbox text labels not confirmed"
  - "ScalarSet external scalar file format not documented"
tags:
  - gui
  - freeview
  - pointsets
  - waypoints
  - control-points
---

# FreeView — Point Sets

## Overview

Point sets represent collections of 3D coordinates used either as **waypoints** (for tractography analysis) or **control points** (for intensity normalisation corrections during [[recon-all]]). FreeView supports three distinct point set types, each with its own file format and display defaults.

See [[freeview-editing#point-set-edit-mode]] for editing operations (placing, moving, deleting points).

---

## Point Set Types

| Type | File format | Default display | Use case |
|------|-------------|-----------------|----------|
| **ControlPoint** | `.dat` plain-text | Green spheres, no spline | Intensity normalisation control points for [[mri_normalize]] |
| **WayPoint** | `.label` (FreeSurfer ASCII label) | Red spheres, with connecting spline | Tractography waypoints |
| **Enhanced** | `.json` with `"data_type": "fs_pointset"` | Red spheres, no spline | Extended annotations with metadata, comments, flags |

The type is selected by the user at load time (radio buttons in `DialogLoadPointSet`). JSON files are auto-detected as Enhanced type regardless of the radio button selection. There is no automatic type detection for `.dat` vs. `.label` files.

---

## File Formats

### Control Points (`.dat`)

Plain-text format, one point per line, followed by a footer:

```
x1 y1 z1
x2 y2 z2
...
info
numpoints N
useRealRAS 1
```

- If `useRealRAS 1`: coordinates are in **Scanner RAS**
- If `useRealRAS 0`: coordinates are in **TkReg RAS** (Surface RAS)

> [!gotcha] FreeView always writes `useRealRAS 1`
> FreeView saves control points in Scanner RAS (`useRealRAS 1`). If you
> load a file that previously used `useRealRAS 0` (TkReg RAS), FreeView
> prints a warning and converts coordinates on load. The saved file will
> use `useRealRAS 1`.

### Waypoints (`.label`)

FreeSurfer ASCII label format, read via `LabelRead()`. Coordinate system is specified in the label header (`LABEL_COORDS_TKREG_RAS`, `LABEL_COORDS_SCANNER_RAS`, or `LABEL_COORDS_VOXEL`).

### Enhanced JSON

```json
{
  "data_type": "fs_pointset",
  "vox2ras": "scanner_ras",
  "points": [
    {
      "coordinates": {"x": 1.0, "y": 2.0, "z": 3.0},
      "legacy_stat": 0,
      "comment": "optional annotation text",
      "fixed": false,
      "pathological_region": false
    }
  ],
  "color": [1.0, 0.0, 0.0]
}
```

The `vox2ras` field can be `"scanner_ras"`, `"tkreg"`, or `"voxel"`. FreeView writes `"scanner_ras"`. Per-point fields such as `fixed`, `pathological_region`, `comment`, and checklist items are stored in each point's metadata and are used by the `DialogControlPointComment` dialog and display filters.

---

## Loading

### Via GUI

**File → Load Point Set…** / **File → New Point Set…**

`DialogLoadPointSet` has:
- A file path field (multiple files can be separated by `;`)
- Two radio buttons: **Control Points** / **Way Points**

Type is set by radio selection; JSON files auto-override to Enhanced.

### Via Command Line

```bash
freeview -w waypoints.label          # loads as WayPoint type
freeview -c controlpoints.dat        # loads as ControlPoint type
```

---

## Panel Controls

Panel controls are defined by `LayerPropertyPointSet`:

| Control | Type | Default (ControlPoint / WayPoint) | Description |
|---------|------|----------------------------------|-------------|
| **Color** | colour picker | Green (0,1,0) / Red (1,0.1,0.1) | Sphere display colour |
| **Spline Color** | colour picker | Yellow (1,1,0) | Colour of connecting spline tube |
| **Opacity** | slider | 0.7 | Point opacity. Note: capped internally at 0.99999 (VTK artefact at exactly 1.0) |
| **Radius** | spinbox | 0.5 (Control) / 1.0 (Way) | Sphere radius in voxel units (persisted in QSettings) |
| **Spline Radius** | spinbox | 0.5 | Connecting tube radius |
| **Show Spline** | checkbox | off (Control) / on (Way) | Draw a tube connecting all points in order |
| **Closed Spline** | checkbox | off | Close the spline loop (last point connects to first) |
| **Snap to Voxel Center** | checkbox | off | Snaps newly placed points to the nearest voxel centre |
| **Color Map** | dropdown | SolidColor | SolidColor or HeatScale (scalar-driven colour ramp) |
| **Scalar Type** | radio | ScalarStat | ScalarStat (label stat field from label format), ScalarLayer (sampled from MRI layer), ScalarSet (external scalar file) |

### Enhanced-Type Display Filters

When type = Enhanced, additional filter checkboxes appear:

| Filter | Description |
|--------|-------------|
| **Show Unfixed Only** | Hides points with `"fixed": true` in JSON |
| **Show Lesions Only** | Shows only points with `"pathological_region": true` |
| **Show Non-Lesions Only** | Shows only points with `"pathological_region": false` |
| **Show VR Space Only** | Shows only points flagged for VR space |

---

## Coordinate System

Point coordinates are stored internally in VTK rendering space (target RAS of the loaded volume). On load, file coordinates (Scanner RAS, TkReg RAS, or voxel) are converted to native RAS via `FSVolume::TkRegToNativeRAS()` or `MRIvoxelToWorld()`, then to target space via `NativeRASToRAS()` + `RASToTarget()`. On save, the reverse transform is applied.

---

## Rendering

- **2D views**: Points render as circle cross-sections at the current slice.
- **3D view**: Points render as VTK spheres with the specified `Radius`.
- **Spline**: When `ShowSpline=true` and ≥2 points, a `vtkSplineFilter` subdivides the polyline, then a `vtkTubeFilter` with `NUM_OF_SIDES=10` creates the connecting tube. Subdivision uses length-based mode (`SetLength(scale × 2)`).

---

## Control Point Comments (Enhanced Type)

`DialogControlPointComment` attaches per-point annotations to Enhanced JSON points. The dialog provides:
- A free-text **comment** field
- **14 pre-filled checkbox items** organised into three groups:
  - **Main** (7 items)
  - **Solution** (4 items)
  - **Progress** (3 items)
- A label showing which point is being annotated

Comments and checked items are stored in the point's `info` QVariantMap and persisted in the JSON file.

> [!gap] Checkbox text labels
> The exact text for the 14 pre-filled checkbox items is defined in the
> `.ui` file (`DialogControlPointComment.ui`), which was not read during
> source analysis. The labels likely describe editing workflow states
> (e.g., "Reviewed", "Needs correction", etc.).

---

## Undo/Redo

`LayerPointSet` maintains `m_bufferUndo` and `m_bufferRedo` stacks of full point-list snapshots. `SaveForUndo()` is called before every edit operation. Undo/redo work with the standard `Ctrl+Z` / `Ctrl+Shift+Z` shortcuts.

---

## recon-all Control Points

The `.dat` format is read by [[mri_normalize]] as control points — locations in white matter where the normalisation algorithm should anchor its intensity model. The typical workflow:

1. Load `brainmask.mgz` or the T1 scan in FreeView
2. Switch to **Point Set Edit** mode (`Ctrl+T`)
3. Load or create a control points file (`-c` flag or via File → New Point Set → Control Points)
4. Place points in white matter regions where normalisation appears to have failed
5. Save the `.dat` file
6. Rerun: `recon-all -s subject -normalization2`

There is no automatic distinction between "this is a normalisation control point file" and "this is a waypoints file" — the distinction is purely by file format and user intent.

---

## Gotchas

> [!gotcha] Opacity capped at 0.99999
> A VTK transparency artefact causes incorrect rendering at exactly opacity=1.0.
> `LayerPropertyPointSet` internally clamps opacity to 0.99999 when the user
> sets it to 1.0. This is invisible in the UI but visible in the source.

> [!gotcha] Control point type is determined at load, not from file content
> `.dat` files can technically store anything. FreeView's interpretation
> (ControlPoint vs. WayPoint) depends entirely on which radio button the
> user selected in the Load dialog. Loading a waypoints `.label` file as
> "Control Points" will display it with control-point styling.

---

## Related Pages

- [[freeview]] — main application overview
- [[freeview-editing]] — Point Set Edit mode (placing, moving, deleting points)
- [[freeview-command-line]] — `-w` and `-c` flags
- [[mri_normalize]] — uses control points `.dat` files

## References

- Source: `freeview/FSPointSet.cpp` (file format read/write)
- Source: `freeview/LayerPointSet.cpp` (internal representation, rendering, undo)
- Source: `freeview/LayerPropertyPointSet.cpp` (panel property defaults)
- Source: `freeview/DialogLoadPointSet.cpp` (load dialog)
- Source: `freeview/DialogControlPointComment.cpp` (per-point comment dialog)
