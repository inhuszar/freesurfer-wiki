---
title: "FreeView — Editing Modes"
type: gui-panel
parent_application: "[[freeview]]"
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "freeview/ToolWindowEdit.cpp"
  - "freeview/BrushProperty.cpp"
  - "freeview/Interactor2DVolumeEdit.cpp"
  - "freeview/Interactor2DROIEdit.cpp"
  - "freeview/ToolWindowMeasure.cpp"
  - "freeview/LayerROI.cpp"
  - "freeview/LivewireTool.cpp"
  - "freeview/DialogRepositionSurface.cpp"
  - "freeview/MainWindow.cpp"
related_panels:
  - "[[freeview-volumes]]"
  - "[[freeview-surfaces]]"
  - "[[freeview-pointsets]]"
related_tools:
  - "[[recon-all]]"
  - "[[mri_normalize]]"
  - "[[mri_edit_wm_with_aseg]]"
  - "[[mris_reposition_surface]]"
  - "[[mris_nudge]]"
  - "[[mris_smooth]]"
  - "[[mris_remove_intersection]]"
  - "[[mris_transform]]"
  - "[[mris_remesh]]"
  - "[[mris_mesh_subdivide]]"
  - "[[mri_tessellate]]"
status: review
confidence: high
last_agent_update: 2026-04-20
gaps:
  - "ScribblePrompt AI segmentation tool requires PyTorch — verify conditions under which it is available"
  - "AutoSeg (geodesic segmentation) exact algorithm and workflow needs documentation"
  - "ToolWindowEdit.ui text labels for some checkboxes could not be read from cpp alone"
tags:
  - gui
  - freeview
  - editing
  - voxel-edit
  - recon-edit
---

# FreeView — Editing Modes

## Overview

FreeView exposes two distinct categories of editing functionality:

1. **Five interaction modes** (Voxel Edit, Recon Edit, ROI Edit, Point Set Edit, Measure) that change how mouse clicks and drags are interpreted in the viewing area. Modes are mutually exclusive — only one is active at a time. They operate on **volumes**, **ROIs**, **point sets**, or **measurements** — never on surface meshes.
2. **Surface-mesh editing tools** accessed from the **Tools** menu (Reposition Surface…, Smooth Surface…, Remove Intersections In Surface, Transform Surface…). These act directly on the vertex positions of the currently active surface layer. See §"Surface Mesh Editing" below.

Interaction modes are selected from the **toolbar** or the **Action** menu. When an editing mode is active, drawing sub-tool options appear in the toolbar. Surface-mesh tools open modal dialogs instead of rebinding mouse behaviour.

> [!gotcha] Cursor movement in edit modes
> In editing modes, **left-click draws** instead of moving the cursor.
> To reposition the cursor without drawing, use `Ctrl+Shift+Left Click`.

## Voxel Edit Mode

### Purpose

Manually modify voxel values in a volume layer. Used for correcting segmentation errors, adding or removing voxels, and creating custom masks.

### When to Use

- Editing `brainmask.mgz` to fix skull stripping errors
- Editing `wm.mgz` to fix white matter segmentation errors
- Creating custom binary masks
- Correcting parcellation volumes

### Drawing Sub-tools

There are ten drawing sub-tools, forming a `QActionGroup` in `ToolWindowEdit.cpp`:

| Sub-tool | Action | How to draw |
|----------|--------|-------------|
| **Freehand** | Draw a continuous stroke | Left-click and drag |
| **Polyline** | Draw connected line segments | Left-click for each vertex; middle-click to stop; right-click to close the polygon |
| **Livewire** | Semi-automatic edge-following path (vtkDijkstraImageGeodesicPath on gradient-magnitude cost image with anisotropic diffusion preprocessing) | Left-click to set anchor points; path snaps to intensity edges |
| **Fill** | Flood-fill a connected region | Left-click inside the region; Ctrl+Left-click in Freehand mode |
| **Contour** | Draw closed contour | Left-click and drag |
| **ColorPicker** | Pick the intensity value of the clicked voxel as the Draw Value | Left-click on voxel |
| **Clone** | Clone/copy region | Left-click and drag |
| **AutoSeg** | Geodesic segmentation | Left-click to initialise |
| **ScribblePrompt** | AI-assisted segmentation (requires PyTorch) | Left-click to place prompt points |
| **Shift** | Shift/translate the drawn region | Left-click and drag |

> [!gotcha] Livewire is implemented
> Livewire uses `vtkDijkstraImageGeodesicPath` on a gradient-magnitude cost
> image (with anisotropic diffusion preprocessing). `LivewireTool.cpp` exists
> and is wired into `Interactor2DVolumeEdit.cpp`. It is fully functional, not
> a stub.

### Panel Controls (when Voxel Edit mode is active)

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| **Brush Size** | slider / spinbox | 1 | Size of the drawing brush in voxels (min=1, max=512) |
| **Draw Value** | line edit (float) | 1.0 | Voxel intensity to assign when drawing |
| **Erase Value** | line edit (float) | 0.0 | Voxel intensity to assign when erasing |
| **Draw Range** | two float fields | [0, 1000000] | Only draw on voxels within this intensity range |
| **Exclude Range** | two float fields | (none) | Do not draw on voxels within this intensity range |
| **Erase Range** | two float fields | (none) | Only erase voxels within this intensity range |
| **Erase Exclude Range** | two float fields | (none) | Do not erase voxels within this intensity range |
| **Fill 3D** | checkbox | off | Extend flood-fill across all slices (volumetric fill) |
| **Tolerance** | spinbox | 0 | Intensity tolerance for Fill mode (replaces Brush Size when Fill is active) |

> [!contradiction] Brush shape
> The previous version of this page stated there is a "Brush Shape" dropdown
> with Round and Square options. No such control exists in the source. The
> `BrushProperty` class has no shape field. All brushes are point-based.

> [!contradiction] Draw/Erase are not spinboxes
> The previous page described Draw Value and Erase Value as spinboxes.
> The source (`ToolWindowEdit.ui`) uses `QLineEdit` widgets for these,
> accepting floating-point text input.

### Actions

| Action | Mouse/Key | Description |
|--------|-----------|-------------|
| Draw | Left-click (or drag in Freehand) | Set voxels to Draw Value |
| Erase | Shift+Left-click (or Shift+drag) | Set voxels to Erase Value |
| Fill | Left-click (in Fill sub-tool) | Flood-fill connected region with Draw Value |
| Fill (from Freehand) | Ctrl+Left-click | Fill the region enclosed by the current draw |
| Erase Fill | Shift+Left-click (in Fill sub-tool) | Erase a connected region with Erase Value |
| Contour close | Right-click | Closes the polyline/contour polygon |
| Move cursor | Ctrl+Shift+Left-click | Reposition cursor without drawing |
| Toggle contour | Alt+H | Toggle contour visibility |
| Toggle ColorPicker | Shift+C | Switch to color-picking mode |
| Undo | Ctrl+Z | Undo last edit |
| Redo | Ctrl+Shift+Z | Redo an undone edit |
| Copy slice region | Ctrl+C | Copy the current 2D slice image region |
| Copy structure | Ctrl+Alt+C | Copy segmentation label structure at cursor position |
| Paste | Ctrl+V | Paste copied content at cursor position |

> [!gotcha] Editing is per-slice
> All drawing operations affect only the currently visible 2D slice unless
> Fill 3D is enabled. There is no volumetric brush for Freehand/Polyline.
> To edit a region spanning multiple slices, edit each slice individually
> or use Fill 3D mode.

## Recon Edit Mode

### Purpose

A specialised editing mode for correcting [[recon-all]] errors. Activating it changes the default Draw Value to 255 and Erase Value to 1, and enables ExcludeRange=[5, 250] as a constraint.

### When to Use

- White matter surface cuts into cortex → add WM voxels to `wm.mgz`
- White matter surface includes non-WM tissue → remove WM voxels
- Brain mask missing brain tissue → add voxels to `brainmask.mgz`
- Brain mask includes non-brain tissue (dura, sinuses) → remove from `brainmask.mgz`
- Pial surface extends into skull → edit `brainmask.mgz`

> [!contradiction] Recon Edit panel controls
> The previous version of this page described radio buttons "Edit WM Volume"
> and "Edit Brain Mask" that automatically target the correct volume. These
> do not exist in the v8.2.0 source. The Recon Edit panel has a single
> `checkBoxReconEditing` ("Recon editing") checkbox. When checked, it
> automatically sets: FillValue=255, EraseValue=1, ExcludeRange=[5,250].
> The user must manually ensure the correct volume (wm.mgz or brainmask.mgz)
> is the active layer in the layer panel.

### Typical Workflow

1. Load the subject's data:
   ```bash
   freeview -v brainmask.mgz \
            -v wm.mgz:colormap=heat:opacity=0.4 \
            -f lh.white:edgecolor=blue \
            -f lh.pial:edgecolor=red \
            -f rh.white:edgecolor=blue \
            -f rh.pial:edgecolor=red
   ```

2. Use `Alt+V` to toggle volume visibility, or `Alt+C` to cycle layers
3. Switch to Voxel Edit mode (`Alt+E`); enable the **Recon Editing** checkbox in the panel
4. Select the volume to edit (wm.mgz or brainmask.mgz) in the layer panel
5. Draw corrections slice by slice using Freehand or Polyline
6. Save the edited volume(s) (`Ctrl+S`)
7. Rerun [[recon-all]] from the appropriate stage:
   ```bash
   # After WM edits:
   recon-all -s subject -autorecon2-wm -autorecon3
   # After brainmask edits:
   recon-all -s subject -autorecon2 -autorecon3
   ```

### Recon Edit Values

When `checkBoxReconEditing` is enabled:
- **Fill Value** → 255 (marks white matter)
- **Erase Value** → 1 (non-zero, so erased voxels remain in brain mask)
- **Exclude Range** → [5, 250] (protects already-segmented tissue from accidental overwrite)

## ROI Edit Mode

### Purpose

Draw and edit regions of interest on 2D slices. ROIs are saved as FreeSurfer label files.

### Panel Controls

| Control | Type | Description |
|---------|------|-------------|
| **Brush Size** | slider | ROI drawing brush size |
| **Draw Value** | line edit | Label value to assign |
| **ROI Name** | text field | Name for the current ROI |

### Actions

| Action | Mouse/Key | Description |
|--------|-----------|-------------|
| Draw ROI | Left-click / drag | Add voxels to the ROI |
| Erase ROI | Shift+Left-click / drag | Remove voxels from the ROI |

### Output Format

ROIs are saved as **FreeSurfer ASCII label files** (`.label`) via `FSLabel::LabelWrite()` (`LayerROI.cpp`, line ~357). The label stores RAS coordinates and stat values per marked voxel. When an ROI is drawn on a surface layer, the label contains vertex indices.

## Point Set Edit Mode

### Purpose

Place, move, and delete control points or waypoints. See [[freeview-pointsets]] for full documentation of point set types and file formats.

### Actions

| Action | Mouse/Key | Description |
|--------|-----------|-------------|
| Place point | Left-click | Add a control/waypoint at the cursor position |
| Move point | Left-click and drag | Reposition an existing point |
| Delete point | Shift+Left-click on point | Remove a point |

Point sets are saved as `.dat` (control points), `.label` (waypoints), or `.json` (enhanced format). See [[freeview-pointsets]] for details.

## Measure Mode

### Purpose

Draw measurement regions on 2D and 3D views to measure distances and label statistics.

### Tools

| Sub-tool (`MeasureMode` enum) | Description |
|-------------------------------|-------------|
| **Line** (`MM_Line`) | Straight line between two points; displays distance in mm |
| **Polyline** (`MM_Polyline`) | Connected line segments; displays total path length in mm |
| **Spline** (`MM_Spline`) | Curved spline measurement |
| **Rectangle** (`MM_Rectangle`) | Rectangular region |
| **Label** | Label statistics mode — counts voxels per segmentation label ID and reports count, mean intensity, SD on the current slice. Not a text-annotation tool |
| **Surface Region** (`MM_SurfaceRegion`) | 3D freehand contour on a surface |
| **Draw on Surface** (`MM_DrawOnSurface`) | 3D freehand path on a surface |

> [!contradiction] No Angle tool; "Label" is statistics, not annotation
> The previous version of this page listed "Label" as a text annotation tool
> and implied an Angle measurement tool exists. Neither is correct.
> `ToolWindowMeasure.cpp` confirms: Label mode reports voxel statistics per
> segmentation label (count, mean, SD). There is no Angle tool.

### Measurement Display

Distances are computed in **millimetres** from `MousePositionToRAS()` world coordinates (VTK rendering space = target RAS of the loaded volume), with auto-scaling to nm/μm/mm as appropriate. For standard isotropic 1mm data, physical mm = voxel distance.

### Saving Measurements

3D measure regions can be deleted with `Delete` key. Measurement lines and polylines persist until FreeView is closed (no save mechanism for line measurements).

## Surface Mesh Editing

Besides the five interaction modes (which act on volumes, ROIs, point sets, or measurements), FreeView has a distinct set of **surface-mesh editing tools** accessed from the **Tools** menu. These operate on the currently active surface layer (see [[freeview-surfaces]] for how surfaces are loaded and displayed) and modify vertex **positions** directly. They do not rebind mouse behaviour — each tool opens a modal dialog.

| Tools menu item | Effect | Detailed documentation |
|-----------------|--------|------------------------|
| **Reposition Surface…** | Three-tab dialog that moves one or more vertices by snapping to an intensity edge, moving to an explicit RAS coordinate, or smoothing a local patch | [[freeview-surfaces]] §"Reposition Surface Vertex" |
| **Smooth Surface…** | Apply iterative Laplacian smoothing to the whole active surface (same primitive as [[mris_smooth]]) | — |
| **Remove Intersections In Surface** | Automatically detect and repair self-intersecting triangles (calls `MRISremoveIntersections`, same as [[mris_remove_intersection]]) | — |
| **Transform Surface…** | Apply an affine or morph transform to every vertex at once | — |

All four act on **existing vertices only**. Save the modified surface with **File → Save Surface** or **File → Save Surface As…**.

### Reposition Surface Vertex — capabilities

`Tools → Reposition Surface…` opens `DialogRepositionSurface`, the primary interface for targeted white-matter / pial surface correction. Its three tabs all call `MRISrepositionSurface` — the same primitive used by the CLI tools [[mris_reposition_surface]] and [[mris_nudge]]:

1. **Snap to Intensity / Coordinate** — search along the surface normal for an intensity edge in a reference volume, then move the selected vertex and its neighbourhood onto that edge. Parameters: vertex number, target intensity (or target XYZ), neighbourhood size, Gaussian σ, force-direction (`Force In` / `Force Out` / any), and an allow-self-intersection flag.
2. **Move to Coordinate** — place the selected vertex at an explicit Surface RAS or Scanner RAS coordinate.
3. **Smooth Vertex** — average a vertex with its N-ring neighbours for K iterations.

Every tab has **Apply**, **Undo**, **Save**, and **Save As**. See [[freeview-surfaces]] for the complete per-control enumeration.

> [!gotcha] Vertex count is fixed at tessellation
> FreeView's surface-mesh tools only reposition existing vertices. They
> do not add or remove vertices, split or merge triangles, or change
> mesh connectivity. The vertex count of a surface is set by
> [[mri_tessellate]] and remains invariant through inflation, spherical
> mapping, registration, and all editing operations. Source-code search
> of the `freeview/` tree for `addVertex` / `insertVertex` /
> `deleteVertex` primitives returns no hits relevant to surface meshes
> (the only match is in `LayerROI.cpp`, which handles ROI labels, not
> meshes). To change vertex density globally, use [[mris_remesh]] or
> [[mris_mesh_subdivide]] from the command line.

### Command-line counterparts

Every FreeView surface-mesh operation has a CLI counterpart — useful for batch processing or reproducible scripts:

| FreeView | CLI equivalent | Notes |
|----------|----------------|-------|
| Reposition Surface… (intensity-guided) | [[mris_reposition_surface]] | Takes a JSON pointset saved from FreeView |
| Reposition Surface… (seed + target intensity) | [[mris_nudge]] | One seed vertex per invocation |
| Smooth Surface… | [[mris_smooth]] | Global Laplacian surface smoothing |
| Remove Intersections In Surface | [[mris_remove_intersection]] | Wraps the same `MRISremoveIntersections` routine |
| Transform Surface… | [[mris_transform]] | Applies LTA / GCA-morph transforms |

### Direct vs. indirect white-matter surface correction

For white-matter surface errors specifically, FreeSurfer offers **two alternative correction strategies**:

| Strategy | Tool | When to use |
|----------|------|-------------|
| **Indirect — edit the volume, regenerate the surface** | **Voxel Edit** / **Recon Edit** on `wm.mgz` (see §Recon Edit Mode above), then `recon-all -s subject -autorecon2-wm -autorecon3` | Preferred. Keeps the surface consistent with the downstream topology-fixed, atlas-registered processing chain. Use whenever the root cause is a WM voxel classification error |
| **Direct — move surface vertices in place** | Tools → Reposition Surface… (or [[mris_nudge]] / [[mris_reposition_surface]] on the CLI) | Use for narrow localised errors in regions where volume-based correction is impractical (e.g., chronic-contrast regions, fine-scale boundary shifts that would otherwise require single-voxel edits across many slices) |

Both strategies can be applied to the same subject; run the indirect workflow first, then the direct one on residual local errors.

> [!gotcha] mris_nudge unrips all vertices
> `mris_nudge` calls `MRISunrip()` at the end of every invocation,
> which permanently unrips any previously-ripped vertices (e.g.,
> midline vertices that `recon-all` had ripped). This can have
> non-local effects on downstream analyses; prefer
> [[mris_reposition_surface]] or FreeView's dialog when rip flags
> matter.

## Volume Filters and Transforms (Tools Menu)

The following volume-level operations are accessible from the **Tools** menu:

| Item | Description |
|------|-------------|
| **Volume Filter → Mean** | Apply mean filter |
| **Volume Filter → Median** | Apply median filter |
| **Volume Filter → Convolve** | Convolve with a kernel |
| **Volume Filter → Gradient** | Gradient magnitude filter |
| **Volume Filter → Sobel** | Sobel edge detection |
| **Volume Filter → Erode** | Binary erosion |
| **Volume Filter → Dilate** | Binary dilation |
| **Volume Filter → Open** | Morphological opening (erosion + dilation) |
| **Volume Filter → Close** | Morphological closing (dilation + erosion) |
| **Volume Filter → Boundary** | Extract boundary voxels |
| **Transform Volume…** | Manual affine transform dialog |
| **Crop Volume…** | Crop to bounding box |

> [!gotcha] Threshold Volume is non-functional
> A "Threshold Volume…" menu item exists but the corresponding slot
> `OnVolumeFilterThreshold()` is entirely commented out in v8.2.0.
> The menu item does nothing.

## BrushProperty

The `BrushProperty` class manages the shared brush state:

| Property | Default | Notes |
|----------|---------|-------|
| `m_nBrushSize` | 1 | Range 1–512 |
| `m_nBrushTolerance` | 0 | Fill tolerance |
| `m_dFillValue` | 1.0 | Draw value |
| `m_dEraseValue` | 0.0 | Erase value |
| `m_dDrawRange[2]` | [0, 1000000] | Draw constraint range |
| `m_dExcludeRange[2]` | (none) | Draw exclude range |
| `m_dEraseRange[2]` | (none) | Erase constraint range |
| `m_dEraseExcludeRange[2]` | (none) | Erase exclude range |
| `m_bDrawConnectedOnly` | false | Restrict drawing to connected voxels |
| `m_bFill3D` | false | 3D flood fill |

## Saving Edits

- **Volumes:** `Ctrl+S` saves the selected volume. **File → Save Volume As…** creates a new file.
- **Surfaces:** **File → Save Surface** saves vertex positions after [[freeview-surfaces#reposition-surface-vertex|vertex repositioning]].
- **Point Sets:** Saved via the Point Set panel save button.
- **ROIs:** Saved via the ROI panel save button.

> [!gotcha] Save before rerunning recon-all
> After editing volumes for recon-all correction, you MUST save the edited
> volume before closing FreeView and rerunning recon-all. FreeView does not
> auto-save. All in-memory edits are lost on exit.

## Common Editing Scenarios

### Fixing a white matter segmentation error

**Symptom:** The white surface cuts through cortex (surface extends beyond WM boundary).

**Fix:**
1. Load brainmask.mgz and `wm.mgz:colormap=heat:opacity=0.4` with surfaces
2. Identify the slice(s) where wm.mgz includes non-WM tissue
3. Switch to Voxel Edit (`Alt+E`), enable Recon Editing checkbox
4. Make wm.mgz the active layer in the layer panel
5. Erase (Shift+click) the incorrectly labelled voxels
6. Save wm.mgz
7. `recon-all -s subject -autorecon2-wm -autorecon3`

### Fixing a pial surface extending into skull/dura

**Symptom:** The pial surface (red) extends beyond the brain boundary into dura or sinuses.

**Fix:**
1. Load brainmask.mgz with pial surfaces
2. Identify where brainmask.mgz includes non-brain tissue
3. Voxel Edit, enable Recon Editing → make brainmask.mgz the active layer
4. Erase the non-brain voxels from brainmask.mgz
5. Save brainmask.mgz
6. `recon-all -s subject -autorecon2 -autorecon3`

### Nudging a white-matter surface vertex directly

**Symptom:** A few vertices of `lh.white` sit inside cortex in a region where the underlying `wm.mgz` is already anatomically correct — so rerunning `recon-all` would produce the same error.

**Fix (direct):**
1. Load `brainmask.mgz` and the offending surface (`lh.white:edgecolor=yellow`).
2. Switch the active layer to the surface and enable 2D contour display.
3. Click the misplaced vertex in the 2D view to read off its vertex number from the cursor info panel.
4. **Tools → Reposition Surface…** → Tab 1 (Snap to Intensity).
5. Enter the vertex number, set Target = Intensity, Intensity Value = 110 (WM peak), Size = 3–5, σ = 2.
6. **Apply**, inspect, **Save** (`lh.white` is overwritten unless Save As is used).
7. Optionally re-run downstream stages that depend on the surface (e.g., `-autorecon3`) if the edit is large enough to affect parcellation.

Alternatively, from the command line:

```bash
mris_nudge lh.white brain.mgz <vertex_number> 110.0 5 lh.white.nudged
```

## Related Pages

- [[freeview]] — main application overview
- [[freeview-volumes]] — volume panel controls
- [[freeview-surfaces]] — surface panel and the full Reposition Surface Vertex dialog reference
- [[freeview-pointsets]] — point set and control point management
- [[freeview-keyboard-mouse]] — keyboard shortcuts
- [[recon-all]] — the pipeline that consumes the edited volumes
- [[mris_reposition_surface]] — CLI counterpart to Reposition Surface (JSON pointsets)
- [[mris_nudge]] — CLI counterpart to Reposition Surface (seed + target intensity)
- [[mris_smooth]] — CLI counterpart to Smooth Surface
- [[mris_remove_intersection]] — CLI counterpart to Remove Intersections In Surface
- [[mris_transform]] — CLI counterpart to Transform Surface
- [[mri_tessellate]] — the step that fixes surface vertex count

## References

- Source: `freeview/ToolWindowEdit.cpp` (sub-tool QActionGroup, panel controls)
- Source: `freeview/BrushProperty.cpp` (brush property fields and defaults)
- Source: `freeview/LivewireTool.cpp` (livewire geodesic path implementation)
- Source: `freeview/Interactor2DVolumeEdit.cpp` (mouse event handling, key shortcuts)
- Source: `freeview/ToolWindowMeasure.cpp` (measure mode tools)
- Source: `freeview/LayerROI.cpp` (ROI save format: FSLabel::LabelWrite)
- Source: `freeview/DialogRepositionSurface.cpp` (Reposition Surface three-tab dialog)
- Source: `freeview/MainWindow.cpp` — `OnRepositionSurface()`, Tools-menu dispatch for surface-mesh operations
- Dialogue archive: `raw/dialogue/1776738853-ih967-wm-surface-manual-editing.md` (direct vs. indirect WM-surface correction)
- FreeSurfer wiki: [WhiteMatterEdits_freeview](https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/WhiteMatterEdits_freeview)
- FreeSurfer wiki: [TopologicalDefect_freeview](https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/TopologicalDefect_freeview)

> [!note] Audit noise from MainWindow.cpp
> This page's `source_files` includes `MainWindow.cpp` for the surface-mesh operation context. The CLI flag `--no-sphere-ignore-vg` appears in a `MainWindow.cpp` help-text printf and may be flagged as C1_MISSING by automated audits. CLI flags are documented in [[freeview-command-line]], not here.
