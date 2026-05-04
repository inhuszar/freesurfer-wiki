---
title: "tksurfer"
type: tool
fs_version: "8.2.0"
source_language: "tcl"
source_files:
  - "tktools/scripts/tksurfer.tcl"
families:
  - "tktools"
recon_all_stage: null
related:
  - "[[tksurferfv]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tkmedit]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "tksurfer.tcl legacy script not read — exact historical interface details not verified."
tags:
  - visualization
  - GUI
  - surface
  - legacy
  - deprecated
---

# tksurfer

## Summary

`tksurfer` was FreeSurfer's original Tk/Tcl-based interactive surface viewer. In FreeSurfer 8.x, `tksurfer` is **deprecated**: the installed binary redirects to `tksurferfv`, which launches [[wiki/tools/freeview|freeview]] with the appropriate surface loaded. All surface viewing and analysis tasks should now be performed with [[wiki/tools/freeview|freeview]] directly.

## Source Information

- **Language:** Tcl (legacy script)
- **Source file(s):** `tktools/scripts/tksurfer.tcl`
- **Binary/script location:** `$FREESURFER_HOME/bin/tksurfer`
- **Note:** In FreeSurfer 8.x, `tksurfer` is a wrapper that calls `tksurferfv`, which launches [[wiki/tools/freeview|freeview]].

## Purpose and Context

`tksurfer` was the primary surface visualization tool in FreeSurfer through version 5.x. It displayed:

- 3D inflated, spherical, pial, and white surfaces.
- Per-vertex overlays (curvature, thickness, activation maps).
- Cortical parcellation annotations.
- Label files.
- Timecourse data on the surface.
- Functional data on surface.

All these capabilities are available in [[wiki/tools/freeview|freeview]], which has replaced `tksurfer`.

> [!gotcha] tksurfer is deprecated — use freeview
> In FreeSurfer 8.x, the `tksurfer` command launches `tksurferfv`, which redirects to freeview with the surface loaded. The original Tk-based tksurfer interface is no longer available. Scripts calling `tksurfer` will run freeview instead.

## Inputs

Legacy `tksurfer` accepted:

```
tksurfer <subject> <hemisphere> <surface> [options]
```

The `tksurferfv` wrapper translates these into freeview arguments. See [[tksurferfv]] for the current interface.

## Configuration Options

Since `tksurfer` now redirects to `tksurferfv` (and hence [[wiki/tools/freeview|freeview]]), see [[tksurferfv]] for flag documentation.

## Typical Use Cases

Historically: interactive surface visualization and overlay display.

```bash
# Legacy command — now redirects to freeview via tksurferfv
tksurfer subject lh inflated -curv -overlay subject/surf/lh.thickness

# Modern equivalent: use freeview directly
freeview -f $SUBJECTS_DIR/subject/surf/lh.inflated:overlay=lh.thickness
```

## Pipeline Context

`tksurfer` was historically used for surface visualization throughout the pipeline. Modern workflows use [[wiki/tools/freeview|freeview]].

## Gotchas and Caveats

> [!gotcha] All calls redirect to freeview
> Any script calling `tksurfer` will use freeview (via `tksurferfv`). Some legacy arguments may not translate correctly.

## Related Tools

- [[tksurferfv]] — current `tksurfer` wrapper launching freeview
- [[wiki/tools/freeview|freeview]] — the current FreeSurfer GUI (replaces tksurfer)
- [[tkmedit]] — analogous deprecated volume viewer (also redirects to freeview)

## Confidence and Gaps

Confidence is **high** for the deprecation status. Legacy interface details are historical.
