---
title: "FreeView — Surfaces"
type: gui-panel
parent_application: "[[freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/PanelSurface.cpp"
  - "freeview/LayerSurface.cpp"
  - "freeview/LayerPropertySurface.h"
  - "freeview/SurfaceOverlayProperty.cpp"
  - "freeview/WindowConfigureOverlay.cpp"
  - "freeview/DialogRepositionSurface.cpp"
  - "freeview/MainWindow.cpp"
data_formats_supported:
  - "[[surface-format]]"
  - "[[annotation-format]]"
  - "[[curv-format]]"
  - "[[label-format]]"
related_panels:
  - "[[freeview-volumes]]"
  - "[[freeview-editing]]"
related_tools:
  - "[[mris_convert]]"
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[mris_ca_label]]"
  - "[[mris_anatomical_stats]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "Spline data file format (.json?) needs documentation"
  - "Vector data display on surfaces (source file?) needs fuller investigation"
  - "GreenRed and BlueRed colour scales appear in enum but are commented out of UI — confirm permanently removed"
tags:
  - gui
  - freeview
  - surfaces
  - visualization
---

# FreeView — Surfaces

## Overview

Surface layers display FreeSurfer's triangulated cortical meshes — white matter boundary (`?h.white`), pial surface (`?h.pial`), inflated (`?h.inflated`), spherical (`?h.sphere`), and others. Surfaces can carry per-vertex data as overlays (curvature, thickness, functional maps) and per-vertex labels as annotations (cortical parcellations).

In 2D slice views, surfaces appear as **coloured contour lines** (edge intersections with the slice plane). In the 3D view, surfaces render as **3D meshes** with configurable shading, colour, and transparency.

## Loading Data

### Via GUI

**File → Load Surface…** opens a file browser. After selecting a surface file, a dialog may offer options for loading additional data (overlays, annotations, curvature).

### Via Command Line

```bash
# Basic surface load
freeview -f lh.white

# With edge colour for 2D views
freeview -f lh.white:edgecolor=yellow -f lh.pial:edgecolor=red

# With annotation
freeview -f lh.inflated:annot=aparc.annot

# With overlay and threshold
freeview -f lh.inflated:overlay=lh.sig.mgh:overlay_threshold=2,5

# With curvature
freeview -f lh.inflated:curvature=lh.curv

# Multiple properties
freeview -f lh.white:edgecolor=blue:edgethickness=2:opacity=0.8
```

### Supported File Formats

| Format | Extensions | What it contains |
|--------|-----------|-----------------|
| [[surface-format]] | (no ext), `.white`, `.pial`, `.inflated`, `.sphere` | Triangulated mesh (vertices + faces) |
| [[annotation-format]] | `.annot` | Per-vertex parcellation labels with colour table |
| [[curv-format]] | `.curv`, `.sulc`, `.thickness`, `.area` | Per-vertex scalar values |
| [[label-format]] | `.label` | Subset of vertices (ROI) |
| Overlay | `.mgh`, `.mgz`, `.nii` | Per-vertex or per-face scalar data |

## Panel Controls

When a surface layer is selected, the following controls appear in the side panel.

### Section: Display

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Edge Color** | colour picker | (none) | Colour of surface contour lines in 2D views. If not set, surface is invisible in 2D |
| **Edge Thickness** | spinbox | 2 | Width of contour lines in 2D views (pixels) |
| **Color** | dropdown + picker | Solid Color | Controls 3D surface colour. Options: "Solid Color" (uses colour picker), or any loaded RGB map, or "Load RGB map…" |
| **Opacity** | slider | 1.0 | Surface transparency in 3D view |
| **Render** | dropdown | Surface | Rendering mode: Surface, Wireframe, Surface and Wireframe |
| **Mesh Color** | dropdown | (hidden) | Colour for mesh in Wireframe/Surface+Wireframe modes. Options: Surface, Curvature, Overlay, Solid. Only visible when render mode is Wireframe or Surface+Wireframe |
| **Vertices** | checkbox | off | Show individual vertex positions as dots |
| **Position Offset** | text field | `0 0 0` | Translate surface position in Surface RAS (three space-separated floats). Useful for side-by-side comparison of two surfaces |
| **Use Surface Color in 2D** | checkbox | off | Use the 3D solid colour for the 2D edge contour (instead of the separate Edge Color) |
| **Hide in 3D View** | checkbox | off | Suppress rendering of this surface in the 3D view while keeping 2D contours visible |
| **Show Info** | checkbox | off | Show surface info label in viewport |
| **Map cursor to** | text field | (hidden) | Visible only when the surface filename contains "inflated". Specifies a target surface to map cursor position to (e.g. the corresponding white surface) |
| **Vector Display** | dropdown | (none) | Display vector data on the surface; linked to a loaded vector file |
| **Vector Color** | colour picker | (auto) | Colour of vector glyphs |
| **Vector Point Size** | spinbox | (auto) | Size of vector glyph points |

> [!contradiction] Flat Patches render mode
> The previous version of this page listed "Flat Patches" as a render mode.
> The `SuraceRenderMode` enum in `LayerPropertySurface.h` defines only:
> `SM_Surface = 0`, `SM_Wireframe`, `SM_SurfaceAndWireframe`. There is no
> flat-patch render mode in v8.2.0.

> [!gotcha] Edge colour is essential for 2D inspection
> By default, a loaded surface has NO edge colour set, making it invisible
> in 2D slice views. Always set `edgecolor=` when loading surfaces for
> quality checking in 2D. The FreeSurfer tutorial convention is:
> white surface → yellow or blue, pial surface → red.

### Section: Curvature

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Curvature Map** | dropdown | (none) | Select which curvature/scalar file to display on the surface |
| **Curvature Color** | binary / threshold / colour map | binary | How curvature is rendered (binary sulcus/gyrus colouring or full colour map) |

Curvature data (`.curv`, `.sulc`) paints the surface with a two-tone colour scheme (typically gray/dark-gray for sulci/gyri) in the 3D view, providing anatomical landmarks on the inflated and spherical representations.

### Section: Overlay

> [!contradiction] Threshold controls location
> The previous version of this page described "Threshold" spinboxes (min, mid,
> max) as being in the panel. They are NOT in the panel. The surface panel
> for overlays shows only: overlay dropdown, frame selector, Configure button,
> Remove button, and Z-Order spinbox. All threshold controls are inside the
> **Configure Overlay** dialog (WindowConfigureOverlay), opened via the
> Configure button.

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Overlay** | dropdown | (none) | Select the active overlay from loaded overlays, or load a new one |
| **Frame** | slider + spinbox | 0 | Select frame for multi-frame overlays (e.g. timeseries data) |
| **Z-Order** | spinbox | 0 | Drawing order when multiple overlays are loaded |
| **Configure** | button | | Open the overlay threshold/colour configuration dialog |
| **Remove** | button | | Remove the selected overlay |

#### Configure Overlay Dialog

The Configure Overlay window (`WindowConfigureOverlay`) exposes full threshold and colour control:

| Control | Description |
|---------|-------------|
| **Colour Scale** | Heat, Jet, Color Wheel, Custom, Embedded (colour table embedded in the overlay file) |
| **Method** | Linear, Linear Opaque, Piecewise |
| **Min / Max** | Threshold range. Below min: transparent (Linear) or colour of min (Linear Opaque). Above max: colour of max |
| **Mid** | Mid-point threshold. Editable in Piecewise mode. In Linear modes, auto-computed as (min+max)/2; can be pinned to min via "Set Mid to Min" checkbox |
| **Invert** | Invert the colour scale direction |
| **Truncate** | Do not show values below zero (negative map suppression) |
| **Clear Lower** | Transparent below min threshold |
| **Clear Higher** | Transparent above max threshold |
| **Smooth** | Apply smoothing steps to overlay values |
| **Mask** | Load a label file to use as an overlay mask |
| **Opacity** | Per-overlay opacity |

> [!gotcha] Threshold is 3-point internally, 2-point on command line
> Internally, `SurfaceOverlayProperty` uses a 3-point threshold (min, mid,
> max). The `overlay_threshold` command-line property accepts either 2 values
> (`min,max`) or 3 values (`min,mid,max`). With 2 values, mid is auto-set.
> In Linear and Linear Opaque modes mid is auto-computed; only in Piecewise
> mode are all three independently editable.

### Section: Annotation

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Annotation** | dropdown + selector | (none) | Select loaded annotation or load new file; "New…" creates an annotation from a colour table |
| **Frame** | slider + spinbox | 0 | Frame selector (visible only for multi-frame annotations) |
| **Show Outline Only** | checkbox | off | Show only the borders between parcellation regions instead of filling |
| **Z-Order** | spinbox | 0 | Drawing order |
| **Edit Annotation** | button | | Open the annotation editor (`WindowEditAnnotation`) |

When an annotation is loaded, the 3D surface is painted with parcellation colours. Clicking on a vertex shows the annotation label name in the cursor info panel.

> [!gotcha] Saving annotations
> The Save Annotation button is hidden in the panel (`pushButtonSaveAnnotation`
> is explicitly hidden in the constructor). To save annotation changes, use
> the Edit Annotation window (opened via the Edit Annotation button).

> [!gotcha] Custom colour tables in annotations
> Custom colour tables can only be supplied when **creating** a new annotation
> via "New…" in the annotation dropdown. Loading an existing `.annot` file
> uses the colour table embedded in the file; the embedded table cannot be
> overridden through the panel.

### Section: Label

Labels (`.label` files) define a subset of surface vertices. Multiple labels can be loaded simultaneously.

| Control | Type | Description |
|---------|------|-------------|
| **Label list** | tree widget | Shows all loaded labels with per-label visibility checkboxes, inline renaming, and Up/Down ordering buttons |
| **Label Color** | colour picker | Colour of the labelled region (for Solid Color mode) |
| **Color Code** | dropdown | Solid Color or Heatscale (maps per-vertex label values to a colour ramp) |
| **Heatscale Min / Max** | spinboxes | Colour ramp range when Color Code = Heatscale |
| **Label Threshold** | spinbox | Only show label vertices whose value exceeds this threshold |
| **Label Opacity** | spinbox | Per-label opacity |
| **Label Outline** | checkbox | Show only the label boundary instead of the filled patch |
| **Z-Order** | spinbox | Drawing order |
| **More Options** | tool button | Menu with: Go To Centroid, Resample, Dilate, Erode, Open, Close, Mask Overlay, Save As… |

### Section: Spline

FreeView supports spline data associated with surfaces (used in surface path operations).

| Control | Type | Description |
|---------|------|-------------|
| **Spline list** | tree widget | Shows loaded splines |
| **Color** | colour picker | Spline display colour |
| **Projection** | checkbox | Project spline onto surface |
| **Load** | button | Load a spline data file |
| **Delete** | button | Remove selected spline |

> [!gap] Spline file format
> The file format for spline data files is not yet documented. Investigate
> `SurfaceSpline.cpp` for the read/write code.

## Rendering in 2D Views

In 2D orthogonal slice views, surfaces are rendered as **intersection contours** — the lines where the surface mesh intersects the current slice plane. These contour lines are drawn using the `edgecolor` and `edgethickness` properties.

This is the primary method for inspecting surface accuracy:
- Is the white surface following the WM/GM boundary?
- Is the pial surface following the GM/CSF boundary?
- Are there locations where surfaces intersect brain tissue they shouldn't?

## Rendering in 3D View

In the 3D viewport, surfaces are rendered as shaded 3D meshes. Available render modes (from `LayerPropertySurface::SuraceRenderMode`):

| Mode | Description |
|------|-------------|
| **Surface** (`SM_Surface`) | Smooth Phong-shaded solid surface (default) |
| **Wireframe** (`SM_Wireframe`) | Shows the triangulation mesh edges only |
| **Surface and Wireframe** (`SM_SurfaceAndWireframe`) | Overlay of mesh edges on the solid surface |

When Wireframe or Surface+Wireframe is active, the **Mesh Color** dropdown becomes visible, allowing the mesh edges to be coloured by Surface, Curvature, Overlay data, or a Solid colour.

Overlay colour scales available (from `SurfaceOverlayProperty::COLOR_SCALE`):

| Scale | Description |
|-------|-------------|
| `CS_Heat` | Heat: transparent → yellow → red |
| `CS_ColorWheel` | Full colour wheel |
| `CS_Jet` | Blue → cyan → green → yellow → red |
| `CS_Custom` | User-defined colour stop file |
| `CS_Embedded` | Colour table embedded in the overlay file itself |

> [!gap] GreenRed and BlueRed scales
> `CS_GreenRed` and `CS_BlueRed` exist in the `COLOR_SCALE` enum but the
> corresponding UI radio buttons are commented out in the Configure Overlay
> dialog. These appear to be legacy values not exposed to users in v8.2.0.

## Inline Property Syntax (Command Line)

Source: `MainWindow::CommandLoadSurface()`.

```
-f filename[:property=value[:property=value[...]]]
```

### Display properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `edgecolor` | colour name or R,G,B | (none) | Contour line colour in 2D views |
| `edgethickness` | integer | 2 | Contour line width in pixels |
| `color` | colour name or R,G,B | gray | Surface colour in 3D (without overlay) |
| `opacity` | 0.0–1.0 | 1.0 | Surface transparency in 3D |
| `visible` | 0, 1 | 1 | Initial visibility |
| `hide_in_3d` | 0, 1 | 0 | Suppress 3D rendering of this surface |
| `no_shading` | 0, 1 | 0 | Disable Phong shading |
| `offset` | x,y,z | 0,0,0 | Translate surface position (Surface RAS) |
| `name` | string | filename | Override display name in layer list |
| `id` | integer | (auto) | Numeric layer identifier |
| `lock` / `locked` | 0, 1 | 0 | Lock layer against editing |

### Geometry-related properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `target_surf` / `target` | filepath | (none) | Target surface (used with patch files) |
| `patch` | filepath | (none) | Surface patch file |
| `sphere` | filepath | (none) | Spherical representation |
| `reg` / `affinexfm` | filepath (.lta) | (none) | Apply registration transform |
| `ignore_vg` | 0, 1 | 0 | Ignore volume geometry check |
| `all` | 0, 1 | 0 | Load all standard surface types for the subject |
| `sup_files` | filepath list | (none) | Supplementary surface files |
| `goto` | vertex_number | (none) | Centre view on a specific vertex |
| `current_vertex` | vertex_number | (none) | Set current (active) vertex |

### Curvature properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `curvature` | filepath | (auto) | Curvature file to load (e.g. `lh.curv`) |

### Overlay properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `overlay` | filepath | (none) | Overlay data file (`.mgh`, `.mgz`, `.nii`, `.curv`, etc.) |
| `overlay_threshold` | min,max or min,mid,max | (auto) | Overlay threshold (2 or 3 values) |
| `overlay_method` | linear, linearopaque, piecewise | linearopaque | Threshold colour method |
| `overlay_color` | comma-separated options | (auto) | Colour scale modifiers: `colorwheel`, `jet`, `inverse`, `truncate`, `clearlower`, `clearhigher` |
| `overlay_opacity` | 0.0–1.0 | 1.0 | Per-overlay opacity |
| `overlay_frame` | integer | 0 | Initial frame for multi-frame overlays |
| `overlay_smooth` | integer | 0 | Overlay smoothing steps |
| `overlay_custom` | filepath or stop-definitions | (none) | Custom colour scale specification |
| `overlay_mask` | filepath (.label) | (none) | Label file as overlay mask |
| `overlay_offset` | float | 0 | Shift all overlay values by constant |
| `overlay_name` | string | (auto) | Display name for the overlay |
| `overlay_reg` | filepath (.lta) | (none) | Registration file for the overlay |
| `overlay_zorder` | integer | 0 | Overlay drawing order |
| `overlay_rh` | 0, 1 | 0 | Use second hemisphere half of a bilateral overlay file |
| `link` / `linked` | 0, 1 | 0 | Link overlay display across loaded surfaces |
| `correlation` | filepath | (none) | Multi-frame overlay for seed-based correlation analysis |
| `mrisp` / `parameterization_overlay` | filepath | (none) | Overlay from surface parameterization file |
| `mrisps` | filepath | (none) | Surface parameterization file |

> [!contradiction] Default overlay method
> The previous version of this page stated the default overlay method is
> `linear`. The source code `CommandLoadSurface()` sets the default method
> to `linearopaque` when no `overlay_method` is specified.

### Annotation properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `annot` | filepath | (none) | Annotation file (`.annot`) |
| `annot_outline` / `annotation_outline` / `aparc_outline` | 0, 1 | 0 | Show annotation boundaries only |
| `annot_zorder` | integer | 0 | Annotation drawing order |

### Label properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `label` | filepath | (none) | Label file (`.label`) |
| `label_outline` | 0, 1 | 0 | Show label boundary only |
| `label_color` / `labelcolor` | colour name or R,G,B | (auto) | Label fill colour |
| `label_opacity` | 0.0–1.0 | 1.0 | Label opacity |
| `label_threshold` | float | 0 | Minimum per-vertex value to show |
| `label_centroid` | 0, 1 | 0 | Move view to label centroid on load |
| `label_visible` | 0, 1 | 1 | Initial label visibility |
| `label_zorder` | integer | 0 | Label drawing order |

### Other properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `vector` | filepath | (none) | Load surface-based vector data for display |
| `vertex` | 0, 1 | 0 | Enable vertex display |
| `spline` | filepath | (none) | Spline data file |

## Reposition Surface Vertex

**Tools → Reposition Surface Vertex** opens `DialogRepositionSurface`, which has three tabs.

### Tab 1 — Snap to Intensity / Coordinate

Requires an MRI volume to be loaded. The dialog determines the new vertex position by searching along the surface normal for an intensity edge in the reference volume.

| Control | Description |
|---------|-------------|
| **Vertex Number** | The index of the vertex to move |
| **Target** | "Intensity" (snap to intensity edge) or "Coordinate" (move to explicit XYZ) |
| **Intensity Value** | Target intensity for edge-snapping (visible when Target = Intensity) |
| **X, Y, Z** | Target coordinates in Surface RAS (visible when Target = Coordinate) |
| **Size** | Neighbourhood radius in vertices (how many adjacent vertices are co-moved) |
| **Sigma** | Gaussian smoothing applied to the local vertex neighbourhood |
| **Force Direction** | Any direction / Force In (`IPFLAG_FORCE_GRADIENT_IN`) / Force Out (`IPFLAG_FORCE_GRADIENT_OUT`) |
| **Allow Intersection** | Permits the repositioned surface to self-intersect (`IPFLAG_NO_SELF_INT_TEST`) |

### Tab 2 — Move to Coordinate

Moves the vertex to an explicit coordinate without requiring a reference volume.

| Control | Description |
|---------|-------------|
| **Vertex Number** | The index of the vertex to move |
| **Coordinate Type** | Surface RAS or Scanner RAS |
| **X, Y, Z** | Target position (auto-filled with the current vertex position) |

### Tab 3 — Smooth Vertex

Smooths a vertex and its neighbourhood by averaging neighbouring positions.

| Control | Description |
|---------|-------------|
| **Vertex Number** | The index of the vertex to smooth |
| **Neighbourhood Size** | Number of rings of neighbours to include |
| **Smoothing Steps** | Number of smoothing iterations |

All tabs share: **Apply**, **Undo**, **Save**, and **Save As** buttons.

## Vertex Information

When clicking on a surface in FreeView, the cursor info panel displays:

| Field | Description |
|-------|-------------|
| Vertex Number | Zero-based index of the nearest surface vertex |
| Surface RAS (TkReg RAS) | XYZ coordinates of the vertex in [[coordinate-systems#surface-ras-tkras|Surface RAS]] |
| Distance | Distance from cursor to nearest vertex |
| Overlay value | Value of the loaded overlay at this vertex |
| Annotation label | Name of the parcellation region at this vertex |

## Rendering in 2D Views

In 2D orthogonal slice views, surfaces are rendered as **intersection contours** at the slice plane. The contour line colour and width are controlled by `edgecolor` and `edgethickness`. The `Use Surface Color in 2D` panel option makes the contour use the 3D surface colour.

## Gotchas

> [!gotcha] Surface coordinates are in Surface RAS (tkRAS)
> All surface vertex coordinates displayed in FreeView are in the Surface
> RAS (tkRAS) coordinate system, NOT Scanner RAS. See [[coordinate-systems]]
> for the distinction.

> [!gotcha] Surfaces must match the volume geometry
> When loading surfaces with volumes, the surfaces must correspond to the
> same subject and have been generated from the same `orig.mgz`. Loading a
> surface from one subject with a volume from another will produce incorrect
> overlay alignment.

> [!gotcha] Inflated surfaces in 2D views
> Displaying an inflated surface in 2D slice views produces meaningless
> contour lines (since the inflated geometry doesn't correspond to the
> volume geometry). Inflated, sphere, and other derived surfaces should
> be viewed in 3D only. The "Map cursor to" field (visible for inflated
> surfaces) maps the cursor position back to the white surface geometry.

> [!gotcha] Overlay method default
> The default overlay method when loading via command line is `linearopaque`,
> not `linear`. With `linearopaque`, voxels below the minimum threshold are
> coloured with the minimum-threshold colour (not transparent). Use
> `overlay_method=linear` for transparent-below-threshold behaviour.

## Related Pages

- [[freeview]] — main application overview
- [[freeview-volumes]] — volume layer controls
- [[freeview-editing]] — editing modes including surface vertex repositioning workflow
- [[freeview-command-line]] — complete command-line option reference
- [[freeview-keyboard-mouse]] — keyboard shortcuts
- [[coordinate-systems]] — Surface RAS vs. Scanner RAS
- [[surface-format]] — FreeSurfer surface file format
- [[annotation-format]] — annotation file format

## References

- Source: `freeview/PanelSurface.cpp` (panel widget enumeration)
- Source: `freeview/LayerPropertySurface.h` (render mode enums, colour scale enums)
- Source: `freeview/SurfaceOverlayProperty.h` (overlay colour scale and method enums)
- Source: `freeview/WindowConfigureOverlay.cpp` (overlay configuration dialog)
- Source: `freeview/DialogRepositionSurface.cpp` (vertex repositioning dialog)
- Source: `freeview/MainWindow.cpp::CommandLoadSurface()` (inline property parsing)

> [!note] Audit noise from MainWindow.cpp
> This page's `source_files` includes `MainWindow.cpp::CommandLoadSurface()`. The CLI flag `--no-sphere-ignore-vg` appears in a separate `MainWindow.cpp` help-text printf and may be flagged as C1_MISSING by automated audits. CLI flags are documented in [[freeview-command-line]], not here.
