---
title: "FreeView — Volumes"
type: gui-panel
parent_application: "[[freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/PanelVolume.cpp"
  - "freeview/LayerPropertyMRI.h"
  - "freeview/LayerMRI.cpp"
  - "freeview/MainWindow.cpp"
data_formats_supported:
  - "[[mgz]]"
  - "nifti"
  - "DICOM"
  - "Analyze"
  - "MINC"
related_panels:
  - "[[freeview-surfaces]]"
  - "[[freeview-editing]]"
related_tools:
  - "[[mri_convert]]"
  - "[[mri_binarize]]"
  - "[[mri_info]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "Vector/tensor panel control widget labels need .ui file verification"
  - "AutoSeg and ScribblePrompt editing tools need further documentation"
tags:
  - gui
  - freeview
  - volumes
  - visualization
---

# FreeView — Volumes

## Overview

Volumes are the most common data type in FreeView. A volume layer represents a 3D (or 4D) grid of voxel values, displayed as 2D slices in the orthogonal views and optionally as isosurfaces or slice planes in the 3D view. Volumes include anatomical scans (T1, T2, FLAIR), segmentation maps (aseg.mgz), functional overlays (sig.mgh), and binary masks (brainmask.mgz, wm.mgz).

## Loading Data

### Via GUI

**File → Load Volume…** (`Ctrl+O`) opens a dialog. After selection, a secondary dialog may offer:
- Colour map selection
- Registration file (.lta, .dat) to apply during loading
- Frame selection (for 4D volumes)
- Resampling method (nearest, trilinear, cubic)

### Via Command Line

```bash
# Basic load
freeview -v T1.mgz

# Multiple volumes
freeview -v brainmask.mgz -v wm.mgz -v aseg.mgz

# With inline properties
freeview -v wm.mgz:colormap=heat:opacity=0.4
freeview -v aseg.mgz:colormap=lut:opacity=0.2
freeview -v sig.nii:reg=register.lta:colormap=heat:heatscale=2,2,4
```

### Supported File Formats

| Format | Extensions | Notes |
|--------|-----------|-------|
| [[mgz]] | `.mgz`, `.mgh` | FreeSurfer native. `.mgz` is gzip-compressed |
| NIfTI | `.nii`, `.nii.gz` | NIFTI-1 and NIFTI-2 |
| DICOM | (varies) | Reads entire series from a single file |
| Analyze | `.img` / `.hdr` | Legacy format |
| MINC | `.mnc` | MNI format |

## Panel Controls

When a volume layer is selected in the side panel, the following controls appear.

### Toolbar

The volume panel toolbar has 10 action buttons: New Volume, Load Volume, Close Volume, Save Volume, Move Up, Move Down, Lock Layer, Copy Settings, Paste Settings, Paste Settings to All.

### Section: Color Map

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Color Map** | dropdown | Grayscale | Determines how voxel values map to display colours |
| **Window** | slider + spinbox | (auto) | Width of the intensity window (contrast). Larger = lower contrast |
| **Level** | slider + spinbox | (auto) | Centre of the intensity window (brightness) |
| **Min** | spinbox | (auto) | Minimum intensity mapped to the low end of the colour scale |
| **Max** | spinbox | (auto) | Maximum intensity mapped to the high end |
| **Percentile** | checkbox | off | Interpret Min/Max as percentiles rather than absolute values |
| **Auto Window Level on Frame Change** | checkbox | off | Automatically recalculate Window/Level when changing 4D frames |
| **Reset** | button | | Reset Window/Level to auto-computed values |

**Available colour maps** (from `LayerPropertyMRI::ColorMapType` enum in `LayerPropertyMRI.h`):

| Colour map | Keyword | Use case |
|-----------|---------|----------|
| Grayscale | `grayscale` | Anatomical volumes (T1, T2, brainmask) |
| Lookup Table (LUT) | `lut` | Segmentation volumes (aseg.mgz) — maps integer labels to colours from [[color-lut]] |
| Heat | `heat` | Overlays, significance maps |
| Jet | `jet` | Alternative overlay — blue → cyan → green → yellow → red |
| **Turbo** | `turbo` / `turboscale` | Google Turbo colourmap; perceptually improved alternative to Jet |
| GE Color | `gecolor` | GE scanner colour convention |
| NIH | `nih` | NIH colour convention |
| PET | `pet` | PET imaging colour convention |
| Binary | `binary` | Two-value display: below threshold = transparent, at/above = opaque colour |
| **Hue** | (GUI only) | Hue-wheel colour map |
| DirectionCoded | (DTI only) | Direction-encoded colour for DTI layers |

> [!contradiction] Missing colour maps
> The previous version of this page listed 8 colour maps and omitted Turbo
> and Hue. The `ColorMapType` enum in `LayerPropertyMRI.h` defines 11 entries
> (excluding NoColorMap=-1). Turbo and Hue were not documented.

> [!gotcha] LUT vs. Grayscale for segmentations
> Segmentation volumes (aseg.mgz, aparc+aseg.mgz) contain integer labels.
> They MUST be displayed with `colormap=lut` to show meaningful colours.
> In Grayscale mode, they appear as dark, nearly-black images since label
> values are small integers.

### Section: Heat Scale (visible when Color Map = Heat)

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Min** | spinbox | (auto) | Lower threshold: values below are transparent |
| **Mid** | spinbox | (auto) | Middle point of colour ramp |
| **Max** | spinbox | (auto) | Upper threshold: values above are saturated |
| **Offset** | spinbox | 0 | Shift all heat scale thresholds by constant |
| **Autoset Mid** | button | | Set Mid to (Min+Max)/2 |
| **Set Mid to Min** | checkbox | off | Pin Mid to Min value |
| **Set Offset to Mean** | button | | Set Offset to the mean voxel value |
| **Truncate** | checkbox | off | Do not show values below zero |
| **Invert** | checkbox | off | Invert the colour direction |
| **Clear Higher Values** | checkbox | off | Transparent above Max threshold |

### Section: Opacity

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Opacity** | slider | 1.0 | Layer opacity 0 (transparent) to 1 (opaque) |

**Shortcuts:** `Alt+S` increases opacity, `Alt+A` decreases opacity of the selected volume.

### Section: Smooth

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Smooth** | checkbox | off | Apply display smoothing (does NOT modify the underlying data) |

### Section: Mask

| Control | Type | Description |
|---------|------|-------------|
| **Mask** | dropdown | Select another loaded volume as a binary mask |
| **Mask Threshold** | float field | Voxels below this value in the mask volume are hidden |

### Section: Frames (4D volumes only)

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Frame** | slider + spinbox | 0 | Select which 3D frame to display (0 to nFrames−1, wrapping) |
| **Remember Each Frame's Threshold** | checkbox | off | Preserve separate Window/Level for each frame |
| **Auto Adjust Window Level Each Frame** | checkbox | off | Recompute Window/Level on each frame change |

> [!contradiction] No animation play button
> The previous version of this page listed an "Auto-play" button for 4D
> volumes. No such button exists in PanelVolume.cpp in v8.2.0. Frame
> navigation is manual (slider/spinbox) or via the `+`/`-` keyboard
> shortcuts. There is no timecourse plot panel.

### Section: Projection Map

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Projection Map** | dropdown | None | Maximum Intensity Projection (MIP) or Average projection across a slice range |
| **Slice Range** | spinbox | (auto) | Number of slices to project over |

### Section: Label Outline

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Label Outline** | checkbox | off | Show outlines of segmentation labels instead of filled regions (shortcut `Ctrl+L`) |

### Section: Isosurface (3D)

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Show Isosurface** | checkbox | off | Render a 3D isosurface in the 3D viewport |
| **Show Outline on 2D** | checkbox | off | Show isosurface contours in 2D slice views |
| **Label Volume Mode** | checkbox | off | Isosurface per integer label value |
| **Min Threshold** | spinbox | (varies) | Lower isosurface threshold |
| **Max Threshold** | spinbox | (varies) | Upper isosurface threshold |
| **Extract All Regions** | checkbox | off | Extract all disconnected regions above threshold |
| **Dilate First** | checkbox | off | Binary dilate before isosurface extraction |
| **Smooth Iterations** | spinbox (0–20) | 5 | Laplacian smoothing steps after extraction |
| **Use Color Map** | checkbox | off | Colour isosurface using the volume's colour map |
| **Voxelize** | checkbox | off | Show blocky voxelized (unsmoothed) contour |
| **Upsample** | checkbox | off | Upsample volume before extraction for smoother result |
| **Surface Color** | colour picker | white | Solid colour for the isosurface |
| **Save** | button | | Save isosurface as a surface file |
| **Update** | button | | Recompute isosurface after threshold changes |

### Section: Vector / Tensor Display

Appears when the volume has 3, 6, or 9 frames:

| Control | Type | Description |
|---------|------|-------------|
| **Display as Vectors** | checkbox | 3-frame → vector field; 6-frame → DTI eigenvectors |
| **Display as RGB Map** | checkbox | 3-frame → RGB colour display |
| **Display as Tensors** | checkbox | 9-frame → symmetric tensor glyphs |
| **Render** | dropdown | Line / Line-with-Direction / 3D-Bar (for vectors); Boxoid / Ellipsoid (for tensors) |
| **Width Scale** | spinbox | Glyph width multiplier |
| **Length Scale** | spinbox | Glyph length multiplier |
| **Norm Threshold** | spinbox | Minimum vector magnitude to display |
| **Skip** | spinbox | Display every N-th voxel (performance) |
| **Normalize** | checkbox | Normalize all vectors to unit length |
| **Inversion** | dropdown | Flip vector direction (None / X / Y / Z / XY / XZ / YZ) |

## Rendering Options

### 2D Slice View

Volumes are displayed as 2D cross-sections in coronal, sagittal, and axial viewports. Slice navigation: click in viewport (repositions cursor), `PageUp`/`PageDown` or `Up`/`Down` arrow keys.

**Brightness/contrast**: Shift+Right-click drag in the viewport — horizontal motion changes contrast (Window), vertical changes brightness (Level).

### 3D View

In the 3D viewport, volumes appear as:
- **Slice planes** intersecting the 3D scene (`Ctrl+Shift+S` to toggle)
- **Isosurface** at a specified threshold (enabled in panel)

There is no direct volume rendering (DVR) in v8.2.0.

## Inline Property Syntax (Command Line)

Source: `MainWindow::CommandLoadVolume()` and `LayerMRI` property parsing.

```
-v filename.mgz[:property=value[:property=value[...]]]
```

### Colour map properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `colormap` / `lut` | grayscale, lut, heat, jet, turbo, gecolor, nih, pet, binary | grayscale | Colour mapping |
| `grayscale` | min,max | (auto) | Set grayscale window as min,max (alias for setting window/level) |
| `heatscale` | min,mid,max | (auto) | Three-point heat scale thresholds |
| `heatscaleoptions` | truncate, invert, clearupper | (none) | Heat scale behaviour modifiers |
| `heatscale_offset` | float | 0 | Shift heat scale by constant |
| `binary_color` | colour name or R,G,B | white | Colour for Binary map display |
| `percentile` | (flag, no value) | (none) | Interpret thresholds as percentiles |

### Display properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `opacity` | 0.0–1.0 | 1.0 | Layer opacity |
| `visible` | 0, 1 | 1 | Initial visibility |
| `smoothed` | 0, 1 | 0 | Apply display smoothing |
| `outline` | 0, 1 | 0 | Show label outlines |
| `rgb` | 0, 1 | 0 | Force RGB display for 3-frame volumes |
| `lock` | 0, 1 | 0 | Lock layer against editing |
| `name` | string | filename | Override display name |
| `id` | integer | (auto) | Numeric layer identifier |
| `selected` | 0, 1 | 0 | Make this layer selected on load |
| `linked` | 0, 1 | 0 | Link display settings with other volumes |

### Registration and geometry

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `reg` | filepath (.lta, .dat, .xfm) | (none) | Apply registration transform |
| `sample` | nearest, trilinear, cubic | trilinear | Resampling interpolation (use `nearest` for segmentations) |
| `keep_original_resolution` | 0, 1 | 0 | Do not resample to match other volumes |
| `ignore_header` | 0, 1 | 0 | Ignore volume geometry header |
| `basis` | integer | (auto) | Basis volume for registration |

### Frame/4D properties

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `frame` | integer | 0 | Initial frame for 4D volumes |
| `auto_adjust_frame_contrast` | 0, 1 | 0 | Recompute Window/Level on each frame change |

### Mask

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `mask` | layer_name_or_index | (none) | Mask display using another loaded volume |
| `select_label` | integer | (none) | Show only the specified integer label value |

### Isosurface

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `isosurface` | threshold or min,max | (none) | Show 3D isosurface at threshold |
| `isosurface_color` | colour | white | Isosurface colour |
| `isosurface_smooth` | integer | 5 | Smoothing iterations |
| `isosurface_output` | filepath | (none) | Save isosurface to file on load |
| `upsample_isosurface` | 0, 1 | 0 | Upsample before extraction |
| `extract_all_regions` | 0, 1 | 0 | Extract all disconnected regions |
| `surface_region` | filepath | (none) | Load surface region constraint for isosurface |

### Vector/tensor

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `vector` | 0, 1 | 0 | Enable vector field display |
| `tensor` | 0, 1 | 0 | Enable tensor glyph display |
| `render` | line, line_direction, bar, boxoid, ellipsoid | line | Glyph render style |
| `inversion` | none, x, y, z, xy, xz, yz | none | Flip vector axes |
| `vector_width` | float | (auto) | Glyph width scale |
| `vector_scale` | float | (auto) | Glyph length scale |
| `vector_normalize` | 0, 1 | 0 | Normalize vectors |
| `vector_skip` | integer | 1 | Display every N-th voxel |
| `vector_norm_threshold` | float | 0 | Minimum magnitude threshold |

### Navigation

| Property | Values | Default | Description |
|----------|--------|---------|-------------|
| `structure` | label_name_or_id | (none) | Navigate to named structure on load |
| `gotolabel` | label_name_or_id | (none) | Alias for `structure` |

> [!contradiction] `editable` and `percentthreshold` do not exist
> The previous version of this page listed `editable` and `percentthreshold`
> as inline properties. Neither exists in the source. Use `lock=1` to prevent
> editing; use `percentile` (as a flag with no value) for percentile
> thresholds.

> [!contradiction] `colorscale` inline vs. standalone
> The previous page described `colorscale` as an inline property meaning
> "show colour scale bar". The standalone `-colorscale` global flag shows
> the colour scale bar. When used inline (as `colorscale=min,max`), it is
> treated as an alias for setting the heat scale range, not the colour bar.

## Interactions with Other Layers

- **Surface contours on volumes:** When both volumes and surfaces are loaded, surfaces appear as coloured edge lines in 2D slice views.
- **Segmentation over anatomy:** Load anatomy at opacity 1.0, segmentation above it with LUT colourmap and reduced opacity (0.1–0.3). Toggle with `Alt+V`.
- **Functional over anatomy:** Load significance maps with `colormap=heat` and `reg=` for registration. Use `heatscale` to control threshold.

## Editing Capabilities

Volumes can be edited in **Voxel Edit** and **Recon Edit** modes. See [[freeview-editing]] for details.

## Saving

- **Ctrl+S** saves the selected volume, overwriting the original file
- **File → Save Volume As…** saves to a new file
- A progress indicator appears; do NOT exit until saving completes
- Changes are in-memory until saved — unsaved changes are lost on exit

> [!gotcha] Saving segmentations
> When editing and saving segmentation volumes, ensure you save to the
> `.mgz` file that [[recon-all]] reads (e.g., `brainmask.mgz`, `wm.mgz`),
> not the `.auto.mgz` version. The `.auto.mgz` files are the unedited
> automatic results; recon-all uses the plain `.mgz` files.

## Related Pages

- [[freeview]] — main application overview
- [[freeview-surfaces]] — surface layer controls
- [[freeview-editing]] — editing volumes
- [[freeview-command-line]] — complete command-line reference
- [[freeview-keyboard-mouse]] — keyboard shortcuts
- [[mgz]] — MGZ/MGH file format
- [[color-lut]] — FreeSurfer colour lookup table

## References

- Source: `freeview/PanelVolume.cpp` (panel widget enumeration)
- Source: `freeview/LayerPropertyMRI.h` (ColorMapType enum, all property definitions)
- Source: `freeview/LayerMRI.cpp` (inline property parsing, isosurface rendering)
- Source: `freeview/MainWindow.cpp::CommandLoadVolume()` (CLI inline property parser)
