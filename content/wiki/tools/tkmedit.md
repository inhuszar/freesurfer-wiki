---
title: "tkmedit"
type: tool
fs_version: "8.2.0"
source_language: "tcl"
source_files:
  - "tktools/scripts/tkmedit.tcl"
families:
  - "tktools"
recon_all_stage: null
related:
  - "[[tkmeditfv]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tksurfer]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The tkmedit.tcl script was not read — exact legacy interface details not verified."
tags:
  - visualization
  - GUI
  - legacy
  - deprecated
  - tkmedit
---

# tkmedit

## Summary

`tkmedit` was FreeSurfer's original Tk/Tcl-based interactive volume editor and viewer. In FreeSurfer 8.x, `tkmedit` is **deprecated and no longer functional as an independent tool**: the installed `tkmedit` binary in `$FREESURFER_HOME/bin/` redirects to `tkmeditfv`, which launches [[wiki/tools/freeview|freeview]] with equivalent arguments. Users should use [[wiki/tools/freeview|freeview]] directly for all volume viewing and editing tasks.

## Source Information

- **Language:** Tcl (legacy script)
- **Source file(s):** `tktools/scripts/tkmedit.tcl`
- **Binary/script location:** `$FREESURFER_HOME/bin/tkmedit`
- **Note:** The binary `tkmedit` in FreeSurfer 8.x is a wrapper that calls `tkmeditfv`, which in turn launches [[wiki/tools/freeview|freeview]].

## Purpose and Context

`tkmedit` was the primary volume editing tool in FreeSurfer from the early 1990s through FreeSurfer 5.x. Its capabilities included:

- Viewing MRI volumes in three orthogonal planes.
- Overlaying surfaces (white, pial) on slices.
- Manual editing of white matter masks and surface control points.
- Resampling volumes to COR space.
- Timecourse analysis (for functional data).

These capabilities have been superseded by [[wiki/tools/freeview|freeview]], which is the current FreeSurfer GUI for all visualization and manual editing tasks.

> [!gotcha] tkmedit is deprecated — use freeview
> In FreeSurfer 8.x, the `tkmedit` command launches `tkmeditfv`, which redirects to freeview. The original Tk-based tkmedit interface is no longer available. Scripts calling `tkmedit` directly will run `tkmeditfv` (freeview) instead.

## Inputs

Legacy `tkmedit` accepted:

```
tkmedit <subject> <main_volume> [options]
```

The `tkmeditfv` wrapper translates these arguments into equivalent `freeview` arguments. See [[tkmeditfv]] for the current interface.

## Configuration Options

Since `tkmedit` now redirects to `tkmeditfv` (and hence [[wiki/tools/freeview|freeview]]), the configuration options are those of `tkmeditfv`. See [[tkmeditfv]] for flag documentation.

## Typical Use Cases

Historically: interactive white matter editing during manual reconstruction QC. Now: use [[wiki/tools/freeview|freeview]] directly.

```bash
# Legacy command — now redirects to freeview via tkmeditfv
tkmedit subject brainmask.mgz -wm wm.mgz

# Modern equivalent: use freeview directly
freeview -v $SUBJECTS_DIR/subject/mri/T1.mgz \
         $SUBJECTS_DIR/subject/mri/wm.mgz:colormap=heat
```

## Pipeline Context

`tkmedit` was historically used for manual editing between `autorecon1` and `autorecon2`. Modern workflows use [[wiki/tools/freeview|freeview]] for the same purpose.

## Gotchas and Caveats

> [!gotcha] All calls redirect to freeview
> Any existing script calling `tkmedit` will silently use freeview (via `tkmeditfv`). Arguments that are not understood by `tkmeditfv` may be silently ignored or produce errors.

> [!gotcha] tcl/tk runtime no longer required
> The legacy tkmedit required Tcl/Tk libraries. These are no longer required since the binary now calls freeview.

## Related Tools

- [[tkmeditfv]] — the current `tkmedit` wrapper that launches freeview
- [[wiki/tools/freeview|freeview]] — the current FreeSurfer GUI (replaces tkmedit)
- [[tksurfer]] — the analogous legacy surface viewer (also deprecated, redirects to freeview via tksurferfv)

## Confidence and Gaps

Confidence is **high** for the deprecation status and redirect behavior. Legacy interface details are of historical interest only.
