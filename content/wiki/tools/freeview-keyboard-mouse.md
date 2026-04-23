---
title: "FreeView — Keyboard and Mouse Reference"
type: gui-panel
parent_application: "[[freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/MainWindow.ui"
  - "freeview/Interactor2D.cpp"
  - "freeview/Interactor2DVolumeEdit.cpp"
  - "freeview/Interactor3DNavigate.cpp"
  - "freeview/RenderView3D.cpp"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "macOS Cmd vs Ctrl mapping for non-file operations not confirmed"
  - "Some Interactor3D mode-specific shortcuts may not be fully enumerated"
tags:
  - gui
  - freeview
  - keyboard
  - reference
---

# FreeView — Keyboard and Mouse Reference

## Mode Switching

| Shortcut | Mode |
|----------|------|
| `Alt+N` | Navigate mode |
| `Alt+E` | Voxel Edit mode |
| `Ctrl+E` | Recon Edit mode |
| (toolbar only) | ROI Edit mode |
| `Ctrl+T` | Point Set Edit mode |
| (toolbar only) | Measure mode |

## Viewport / View Controls

| Shortcut | Action |
|----------|--------|
| `Alt+X` | Switch active viewport to Sagittal |
| `Alt+Y` | Switch active viewport to Coronal |
| `Alt+Z` | Switch active viewport to Axial |
| `Alt+3` | Switch active viewport to 3D |
| `Ctrl+R` | Reset view |
| `Ctrl+Alt+R` | Reset 3D view to nearest axis |
| `Ctrl+9` | Rotate view 90° |
| `Ctrl+1` | 3D: Left view |
| `Ctrl+2` | 3D: Right view |
| `Ctrl+3` | 3D: Anterior view |
| `Ctrl+4` | 3D: Posterior view |
| `Ctrl+5` | 3D: Superior view |
| `Ctrl+6` | 3D: Inferior view |
| `Ctrl+Shift+S` | Toggle 2D slices in 3D view |
| `Alt+1` | Toggle cursor (crosshair) visibility |
| `Ctrl+P` | Show/hide control panel |
| `Alt+D` | Toggle Voxel/Decimal coordinate display |

## Layer Management

| Shortcut | Action |
|----------|--------|
| `Alt+C` | Cycle top layer to bottom |
| `Alt+Shift+C` | Reverse cycle (bottom to top) |
| `Alt+V` | Toggle selected **volume** layer visibility |
| `Alt+F` | Toggle selected **surface** layer visibility |
| `Alt+R` | Toggle ROI visibility |
| `Alt+W` | Toggle point set visibility |
| `Ctrl+F` | Toggle ALL loaded surfaces on/off |
| `Alt+S` | Increase opacity of selected layer |
| `Alt+A` | Decrease opacity of selected layer |
| `Alt+O` | Lock all other layers (toggle) |
| `Alt+L` | Cycle surface label |
| `Alt+H` (edit modes) | Toggle contour visibility |
| `Alt+Shift+S` | Toggle surface spline picking |
| `Ctrl+Alt+S` | Show all layers |
| `Ctrl+Alt+H` | Hide all layers |
| `Ctrl+Shift+A` | Select all layers |
| `Ctrl+Shift+D` | Deselect all layers |
| `Ctrl+Alt+N` | Rename selected layer |
| `Ctrl+I` | View layer info |

## Layer-Specific Toggles

| Shortcut | Action |
|----------|--------|
| `Ctrl+W` | Toggle wm.mgz volume |
| `Ctrl+A` | Toggle aseg volume |
| `Ctrl+D` | Toggle brainmask volume |
| `Ctrl+L` | Show/hide label outline |
| `Meta+Alt+A` | Cycle through annotations |

## File Operations

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Load volume |
| `Ctrl+S` | Save selected volume (overwrites without prompt) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Q` | Quit (Exit) |

> [!contradiction] Redo shortcut
> The previous version of this page listed Redo as `Ctrl+Y`. The correct
> shortcut is `Ctrl+Shift+Z`, confirmed from `MainWindow.ui` `actionRedo`.

## Slice Navigation (2D Views)

| Shortcut | Action |
|----------|--------|
| `PageUp`<br>`PageDown` | Previous / next slice |
| `Up`<br>`Down` arrows | Previous / next slice |
| `Ctrl+Arrow keys` | Pan view (without moving cursor) |
| `Shift+Up`<br>`Shift+Down` | Zoom in / zoom out (keyboard) |

> [!contradiction] `+` and `-` keys
> The previous version of this page stated `+`/`=` zooms in and `-` zooms
> out. In the source (`Interactor2D.cpp` lines 336–347), `+` cycles to the
> **next frame** of a 4D volume and `-` cycles to the **previous frame**.
> These are not zoom shortcuts.

## 4D Volume Frame Navigation

| Shortcut | Action |
|----------|--------|
| `+` | Next frame (4D volume) |
| `-` | Previous frame (4D volume) |

## Navigate Mode (Mouse — 2D Views)

| Action | Mouse |
|--------|-------|
| Move cursor | Left-click |
| Zoom in | Ctrl+Left-click |
| Zoom out | Ctrl+Right-click |
| Zoom (continuous) | Scroll wheel |
| Pan | Middle-click drag |
| Adjust brightness/contrast | **Shift+Right-click drag** (horizontal = contrast/Window, vertical = brightness/Level) |

> [!contradiction] Brightness/contrast mouse action
> The previous version of this page stated "Shift+Left-click drag" adjusts
> brightness and contrast. The correct action is **Shift+Right-click drag**,
> confirmed from `Interactor2D.cpp`.

## Navigate Mode (Mouse — 3D View)

| Action | Mouse |
|--------|-------|
| Rotate | Left-drag (trackball) |
| Pan | Middle-drag or Shift+Left-drag |
| Zoom | Right-drag (up = zoom in) or scroll wheel |
| Move slice plane | Left-drag on highlighted slice border |

## Editing Modes (Mouse)

These actions apply when Voxel Edit, Recon Edit, or ROI Edit mode is active:

| Action | Mouse |
|--------|-------|
| Move cursor (without drawing) | `Ctrl+Shift+Left-click` |
| Draw (Freehand) | Left-click drag |
| Erase (Freehand) | Shift+Left-click drag |
| Add polyline vertex | Left-click (in Polyline mode) |
| Stop polyline | Middle-click |
| Close polygon | Right-click |
| Fill (Freehand mode) | Ctrl+Left-click |
| Fill (Fill mode) | Left-click |
| Erase-fill | Shift+Left-click (in Fill mode) |

## Editing Operations (Keyboard)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy current 2D slice image region |
| `Ctrl+Alt+C` | Copy segmentation label structure at cursor |
| `Ctrl+V` | Paste copied content |
| `Shift+C` | Toggle ColorPicker sub-tool (in edit modes) |
| `Del` | Delete selected region (Measure mode, 3D view) |

## Miscellaneous

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Copy current viewport as image |
| `Ctrl+Shift+N` | Go to next label point |

## Quick Reference Card

```
NAVIGATE (2D)                         EDIT (Voxel/Recon/ROI)
─────────────                         ──────────────────────
Left-click        → move cursor       Left-click         → draw
Ctrl+Left-click   → zoom in           Shift+click        → erase
Ctrl+Right-click  → zoom out          Ctrl+Shift+click   → move cursor
Scroll            → zoom              Ctrl+click         → fill (Freehand)
Middle-drag       → pan               Right-click        → close polyline
Shift+Right-drag  → brightness/       Ctrl+Z             → undo
                    contrast          Ctrl+Shift+Z       → redo

NAVIGATE (3D)                         LAYERS
──────────────                        ──────
Left-drag         → rotate            Alt+C  → cycle layers
Middle-drag       → pan               Alt+V  → toggle volume visibility
Right-drag/scroll → zoom              Alt+F  → toggle surface visibility
                                      Alt+S  → more opacity
                                      Alt+A  → less opacity
                                      Ctrl+F → toggle all surfaces

MODES                                 FILES
─────                                 ─────
Alt+N  → Navigate                     Ctrl+O → load volume
Alt+E  → Voxel Edit                   Ctrl+S → save volume
Ctrl+E → Recon Edit                   Ctrl+Z → undo
Ctrl+T → Point Set Edit               Ctrl+Q → quit

VIEWPORTS                             4D VOLUMES
──────────                            ──────────
Alt+X  → Sagittal                     +      → next frame
Alt+Y  → Coronal                      -      → previous frame
Alt+Z  → Axial
Alt+3  → 3D
Ctrl+R → Reset view
```

## macOS Notes

On macOS, standard Qt key substitutions apply:
- `Ctrl` → `Cmd` (⌘) for standard file operations (⌘O, ⌘S, ⌘Z, ⌘Q)
- `Alt` remains `Option` (⌥) for layer operations (⌥C, ⌥V, ⌥S, ⌥A)
- `Ctrl` (not ⌘) is retained for viewport operations

> [!gap] macOS mappings
> The exact macOS key mappings should be verified against the running
> application. Qt on macOS remaps Ctrl↔Cmd differently for some categories.
