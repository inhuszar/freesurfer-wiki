---
type: dialogue-archive
unix_timestamp: 1778867483
username: "ih967"
date_utc: "2026-05-15T17:51:23Z"
question_slug: "freeview-annotate-surface-points"
question_summary: "What is the best way for clinicians to annotate points on an existing surface in FreeView with per-point comments, and export to a tabular file?"
answer_sources:
  - wiki: "[[freeview-pointsets]]"
  - wiki: "[[freeview-editing]]"
  - code: "freeview/FSPointSet.cpp"
  - code: "freeview/DialogControlPointComment.cpp"
  - code: "freeview/LayerPropertyPointSet.cpp"
answer_status: final
update_count: 0
tags:
  - freeview
  - pointsets
  - annotation
  - clinical-review
  - quality-control
---

## Question

What is the best way to annotate points on an existing surface in FreeView so clinicians can mark surface anomalies (serrated sections, overshoot/undershoot relative to the white-matter boundary) with a per-point comment, and then export the annotations to a tabular text file? Are there built-in solutions in FreeView for this?

## Answer

The right native tool is FreeView's **Enhanced point set** type, which is the only one of the three point-set formats that supports per-point free-text comments and metadata flags.

### The three point-set types in FreeView

| Type | File format | Per-point comment? | Default use case |
|------|-------------|--------------------|------------------|
| ControlPoint | `.dat` plain-text | No (coordinates only) | Intensity-normalisation anchors for [[mri_normalize]] |
| WayPoint | `.label` ASCII | No (one numeric stat field) | Tractography waypoints |
| **Enhanced** | **`.json`** | **Yes (free text + 14 checklist flags)** | Extended annotations with metadata |

The Enhanced type is auto-detected purely from the `.json` file extension — the radio button choice in `DialogLoadPointSet` is ignored when the extension is `.json`.

### Recommended clinician workflow

1. Open the subject with surfaces overlaid:
   ```bash
   freeview T1.mgz lh.white:edgecolor=yellow rh.white:edgecolor=yellow
   ```
2. **File → New Point Set…** and save with a `.json` extension to trigger Enhanced type.
3. **Ctrl+T** to enter Point Set Edit mode.
4. **Left-click** in any 2D slice or the 3D view to place a marker on the suspect location. Drag to reposition; **Shift+click** to delete. **Ctrl+Z** / **Ctrl+Shift+Z** undo/redo.
5. After placing a point, the `DialogControlPointComment` dialog opens with:
   - A free-text **comment** field (most flexible — use for descriptions like "serrated edge over precentral gyrus", "WM overshoot anterior to central sulcus")
   - **14 pre-filled checkboxes** grouped into Main / Solution / Progress (workflow-state oriented; exact labels are defined in `DialogControlPointComment.ui`)
6. Save from the Point Set panel. The resulting JSON looks like:
   ```json
   {
     "data_type": "fs_pointset",
     "vox2ras": "scanner_ras",
     "points": [
       {
         "coordinates": {"x": 1.0, "y": 2.0, "z": 3.0},
         "comment": "serrated section on lateral occipital",
         "pathological_region": true,
         "fixed": false
       }
     ]
   }
   ```
   Coordinates are written in **Scanner RAS** (the FreeView default), which is the most portable choice for downstream cross-subject scripting.

### Tabular export

FreeView itself has **no built-in TSV/CSV export** for point sets. A short post-processing step is required. With `jq`:

```bash
jq -r '.points[] | [.coordinates.x, .coordinates.y, .coordinates.z, .pathological_region, (.comment // "")] | @tsv' \
    subject_findings.json > subject_findings.tsv
```

This yields a clean `x  y  z  pathological  comment` table per subject, easily concatenable across a cohort.

### Caveats and gotchas

- **No "snap to surface" exists.** Points are stored in volume coordinates. The only snap option is `Snap to Voxel Center`. Clinicians should place markers while clicking on the visible surface (either the yellow surface edge in 2D slices or the surface in the 3D view) — the world coordinate is captured at the click location, not projected to the nearest surface vertex.
- **`.json` extension is mandatory** to get the Enhanced type. A file saved without `.json` will fall back to ControlPoint/WayPoint behaviour and lose the comment metadata.
- Point sets re-open with comments and flags intact (round-trip safe).
- Display filters available for Enhanced type include "Show Lesions Only" (points with `pathological_region: true`), "Show Unfixed Only", and "Show Non-Lesions Only" — useful when reviewing accumulated annotations.
- Opacity is internally capped at 0.99999 (VTK transparency artefact at exactly 1.0), invisible in the UI.

### Why not the alternatives

- **`.dat` control points** — no metadata fields; designed for [[mri_normalize]], not annotation.
- **`.label` waypoints** — one numeric `stat` field per point; no free text.
- **Screenshots with text overlays** — what the clinicians were already doing; no coordinate fidelity, no machine-parseable output.

## Sources Consulted

- [[freeview-pointsets]] — full reference for the three point-set types, the Enhanced JSON schema, the `DialogControlPointComment` dialog, coordinate-system handling, panel controls, and display filters
- [[freeview-editing#point-set-edit-mode]] — mouse/keyboard actions for placing, moving, deleting points; Ctrl+T mode toggle
- Source: `freeview/FSPointSet.cpp` — JSON read/write, `data_type: "fs_pointset"` detection, `vox2ras` field semantics
- Source: `freeview/DialogControlPointComment.cpp` — per-point comment dialog with 14 checkbox items in Main/Solution/Progress groups
- Source: `freeview/LayerPropertyPointSet.cpp` — Enhanced-type-only display filter checkboxes (Show Lesions Only, etc.)

## Revision History

### Initial answer (1778867483)
First answer recommending Enhanced JSON point set type for per-point comments, with `jq` post-processing for TSV export. Flagged the absence of snap-to-surface and the need for `.json` file extension to trigger Enhanced-type detection.
