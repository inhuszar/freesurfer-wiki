---
title: "tksurferfv"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/tksurferfv"
families:
  - "scripts"
  - "tktools"
recon_all_stage: null
related:
  - "[[tksurfer]]"
  - "[[freeview]]"
  - "[[tkmeditfv]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument translation mapping from tksurfer syntax to freeview syntax not documented — script body after line 60 not fully read."
tags:
  - visualization
  - GUI
  - freeview
  - surface
  - wrapper
---

# tksurferfv

## Summary

`tksurferfv` is a tcsh wrapper script that translates `tksurfer`-style command-line arguments into [[freeview]] arguments and launches freeview for surface visualization. It provides backward compatibility for scripts and workflows calling `tksurfer`, mapping the classic three-argument syntax (`<subject> <hemi> <surface>`) and associated overlay/annotation options to their freeview equivalents.

## Source Information

- **Language:** tcsh shell script
- **Source file(s):** `scripts/tksurferfv`
- **Binary/script location:** `$FREESURFER_HOME/bin/tksurferfv`

## Purpose and Context

`tksurferfv` is the surface-viewer analogue of [[tkmeditfv]]. When FreeSurfer deprecated the original `tksurfer` Tk viewer, `tksurferfv` was introduced so that existing scripts and tutorials using `tksurfer <subject> <hemi> <surface>` would continue to work by launching freeview with equivalent arguments.

Key features supported:
- Loading a subject's surface (by subject ID + hemisphere + surface name).
- Per-vertex overlay files with custom thresholds.
- Annotation display (with outline option).
- Label files.
- Curvature display.
- All surfaces for the subject.
- Vertex number display.
- Timecourse volume overlay.
- Screenshot and non-interactive capture.
- Patch loading.
- View direction setting.

The script sets `FS_COPY_HEADER_CTAB=1` to preserve colour tables when saving from freeview.

## Inputs

### Command-Line Interface

```
tksurferfv <subject> <hemi> <surface> [options]
```

Or with just a surface file:

```
tksurferfv -f <surface_path> [options]
```

Key options (partial list from first 60 lines of script):

| Flag | Type | Description |
|---|---|---|
| `<subject>` | positional | Subject ID |
| `<hemi>` | positional | Hemisphere: `lh` or `rh` |
| `<surface>` | positional | Surface name: `inflated`, `pial`, `white`, `sphere`, etc. |
| `-overlay <file>` | string | Per-vertex overlay file |
| `-annot <name>` | string | Annotation file name |
| `-annot-outline` | boolean | Show annotation as outline only (default: on) |
| `-label <file>` | string | Label file to display |
| `-curv <name>` | string | Curvature file name (default: `curv`) |
| `-all-surfs` | boolean | Load all surfaces for subject |
| `-vtxno <n>` | integer | Jump to vertex number |
| `-view <direction>` | string | Set initial view direction |
| `-patch <file>` | string | Load surface patch |
| `-twf <vol>` | string | Timecourse volume (functional data) |
| `-twfreg <reg>` | string | Registration for timecourse |
| `-UseTkSurfer` | boolean | Force legacy tksurfer (if available) |
| `--version` | boolean | Print version and exit. |

> [!gap] Full argument list not read
> The complete argument parsing loop was not read. Additional flags not listed here may exist.

### Environment Variables

- `FS_COPY_HEADER_CTAB=1` — set automatically.
- `FV_PATIENT_ORIENTATION` — set to 1 by default.
- `FV_ROTATE_AROUND_CURSOR` — set to 0 by default.

## Outputs

Launches [[freeview]] as interactive GUI. No files produced unless the user saves or uses screenshot flags.

## Configuration Options

See Inputs table above.

### Configuration Interactions

- `-annot-outline` is on by default (`annotoutline = 1`); parcellation boundaries are shown as outlines on the surface.
- `-overlay` and `-annot` can be combined; both are displayed simultaneously in freeview.
- `-UseTkSurfer` has no effect in FreeSurfer 8.x where tksurfer is not available.

## Typical Use Cases

### Use Case 1: View inflated left hemisphere with annotation

```bash
tksurferfv subject lh inflated -annot aparc
```

### Use Case 2: View with thickness overlay

```bash
tksurferfv subject lh pial -overlay $SUBJECTS_DIR/subject/surf/lh.thickness
```

### Use Case 3: View sphere with registration

```bash
tksurferfv subject lh sphere.reg
```

## Pipeline Context

`tksurferfv` is not called by `recon-all`. It is used interactively for surface QC and analysis.

## Gotchas and Caveats

> [!gotcha] Annotation outline is on by default
> The default `annotoutline = 1` shows parcellation boundaries as outlines rather than filled regions. Use `annotoutline = 0` if filled annotation colours are needed.

> [!gotcha] Not all tksurfer flags supported
> Legacy tksurfer had many Tcl-level configuration options. Not all translate to freeview. Unsupported arguments may be passed in `altargs` and silently ignored.

## Related Tools

- [[freeview]] — the viewer launched by this script
- [[tksurfer]] — the deprecated legacy tool this script replaces
- [[tkmeditfv]] — analogous wrapper for volume viewing

## Confidence and Gaps

Confidence is **medium**. Key variables and feature set are clear from first 60 lines. Full argument mapping requires reading the complete script.

> [!gap] Full argument translation
> Read the complete `tksurferfv` script to document all flag translations from tksurfer to freeview syntax.
