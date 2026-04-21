---
title: "FreeView — 3D View"
type: gui-panel
parent_application: "[[freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/RenderView3D.cpp"
  - "freeview/Interactor3DNavigate.cpp"
  - "freeview/DialogSetCamera.cpp"
  - "freeview/LayerMRI.cpp"
related_panels:
  - "[[freeview]]"
  - "[[freeview-volumes]]"
  - "[[freeview-surfaces]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "Brainstem View menu item purpose unclear from source alone"
  - "Stereo render modes (anaglyph/quad-buffer?) not fully investigated"
tags:
  - gui
  - freeview
  - 3d
  - rendering
---

# FreeView — 3D View

## Overview

The 3D view renders surfaces as shaded 3D meshes and optionally displays volume slice planes intersecting the scene. It is one of the four viewport slots and is activated by clicking the **3D** button in the toolbar (`Alt+3`) or through **View → Viewport Layout**.

See [[freeview]] for the main application overview.

## Camera Controls

Camera interaction is handled by `vtkInteractorStyleMyTrackballCamera` (custom VTK trackball style defined in `RenderView3D.cpp`).

| Action | Mouse / Key | Description |
|--------|-------------|-------------|
| Rotate | Left-drag | Trackball rotation around the focal point |
| Pan | Middle-drag or Shift+Left-drag | Translate camera and focal point together |
| Zoom | Right-drag (up/down) or scroll wheel | Scroll uses `ZoomAtCursor()`: pans toward the pointer before zooming |
| Rotate around 3D cursor | Right-click menu → "Rotate Around Cursor" | Custom transform pivoting around the current cursor position |

### Camera Presets

Eight preset camera positions are available from the **View** menu:

| Preset | Shortcut | Description |
|--------|----------|-------------|
| Left | `Ctrl+1` | Reset to standard left hemisphere view |
| Right | `Ctrl+2` | Reset + Azimuth(180°) |
| Anterior | `Ctrl+3` | Reset + Azimuth(−90°) |
| Posterior | `Ctrl+4` | Reset + Azimuth(90°) |
| Superior | `Ctrl+5` | Posterior + Elevation(90°) |
| Inferior | `Ctrl+6` | Anterior + Elevation(−90°) |
| Lateral | (via menu) | Hemisphere-aware: checks active surface hemisphere, adjusts accordingly |
| Medial | (via menu) | Hemisphere-aware medial view |

The default camera is placed at view angle 30° and positioned 2.5× the larger of the Y/Z extents along the −X axis.

### Set Camera Dialog

**View → Set Camera…** (`DialogSetCamera`) provides manual camera control with four spinboxes: **Azimuth**, **Elevation**, **Roll**, and **Zoom**. Each "Apply" call first resets the camera to its default position and then applies the specified angles. `GetCameraInfo()` / `SetCamera()` exchange full camera state: Position, FocalPoint, ViewUp, ViewAngle, ViewSize.

**View → Save Camera…** and **View → Load Camera…** persist camera state to/from a file.

### Orthographic Projection

Right-click context menu → **Orthographic View** toggles `camera->SetParallelProjection(true/false)`. Also accessible via **View → Orthographic View** (if present in build).

## Slice Planes in 3D

Three wireframe-border actors represent the three orthogonal slice planes:

| Plane | Colour |
|-------|--------|
| Sagittal | Red |
| Coronal | Green |
| Axial | Blue |

Slice borders render at 2 px normally and switch to 4 px + white when highlighted (hover). **Left-drag on a highlighted border moves the corresponding slice**. Surface layer picking takes priority, so borders may be unclickable if a surface overlaps the border area.

Visibility is toggled individually via right-click context menu per plane, or globally via `Ctrl+Shift+S` (Show/Hide 2D Slices in 3D View).

## Volume Display in 3D

### Isosurface (Marching Cubes)

Volumes can be rendered as isosurfaces in the 3D view. Controlled from the [[freeview-volumes]] panel:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Min / Max Contour Threshold | (auto) | Intensity range for the isosurface |
| Smooth Iterations | 5 | Post-extraction Laplacian smoothing |
| Use Color Map | off | Color the isosurface using the volume's colour map |
| Extract All Regions | off | Extract all disconnected regions above threshold |
| Dilate First | off | Binary dilate before extraction |
| Voxelized Contour | off | Show blocky (unsmoothed) voxel surface |
| Upsample | off | Upsample volume before extraction for smoother result |
| Surface Color | white | Solid colour for the isosurface |

> [!gap] Direct Volume Rendering
> No direct volume rendering (DVR / ray casting) code path was found in
> `RenderView3D.cpp` or `LayerMRI.cpp`. The 3D view supports only isosurface
> and slice-plane display for volumes in v8.2.0.

## 3D Axes

A `vtkCubeAxesActor` is present, hidden by default. It can be shown via **right-click context menu → "Show 3D Scale"**. The fly mode defaults to `FLY_MODE_OUTER_EDGES`.

## Background

The 3D view background defaults to **black**. Background colour is shared across all views and is set in **Tools → Preferences**. Individual per-view background colour overrides are not available.

## Rendering Quality

- **Depth peeling** is enabled with `MaxPeels = 4`, providing correct transparency for overlapping surfaces.
- **Anti-aliasing**: Controlled per-screenshot (see below). Real-time AA depends on VTK/platform capability.

## Screenshots

Screenshots are taken via `RenderView::SaveScreenShot()`:

| Option | Description |
|--------|-------------|
| **Magnification** | Output resolution multiplier (e.g., 2 = double the screen resolution) |
| **Anti-Aliasing** | Apply anti-aliasing in the saved image |
| **Hide Cursor** | Omit the 3D cursor from the saved image |
| **Auto Trim** | Crop whitespace from the image borders |

File format is determined by the filename extension (`.png`, `.jpg`, `.tif`, etc.). The `-ss filename` command-line flag triggers a screenshot at startup; `-quit` causes FreeView to exit immediately after.

## Lighting

VTK's default headlight (camera-tied directional light) is used. There is no user-adjustable lighting dialog in v8.2.0.

## Neurological / Radiological View

**View → Neurological View** toggles between neurological (L=L) and radiological (L=R) display conventions. Also accessible via a toolbar toggle button.

## Gotchas

> [!gotcha] Slice border picking blocked by surfaces
> When a surface is rendered on top of a slice border, the surface intercepts
> the click before the border can be highlighted. To drag a slice plane in
> these situations, temporarily hide the surface or click in a region where
> the border is not occluded.

> [!gotcha] Camera resets on "Set Camera" Apply
> DialogSetCamera resets the camera to its initial default orientation
> before applying the requested Azimuth/Elevation/Roll. This means specifying
> Azimuth=90 always gives the same result regardless of the current camera
> orientation — it does not add 90° to the current position.

## Related Pages

- [[freeview]] — main application overview, mode descriptions
- [[freeview-surfaces]] — surface rendering options (smooth, wireframe, colour maps)
- [[freeview-volumes]] — volume isosurface controls, slice plane display
- [[freeview-keyboard-mouse]] — 3D view keyboard shortcuts

## References

- Source: `freeview/RenderView3D.cpp` (camera, slice actors, isosurface, lighting)
- Source: `freeview/Interactor3DNavigate.cpp` (mouse event handling)
- Source: `freeview/DialogSetCamera.cpp` (camera preset dialog)
- Source: `freeview/LayerMRI.cpp` (isosurface options)
