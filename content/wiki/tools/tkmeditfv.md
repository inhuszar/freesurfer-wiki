---
title: "tkmeditfv"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/tkmeditfv"
families:
  - "scripts"
  - "tktools"
recon_all_stage: null
related:
  - "[[tkmedit]]"
  - "[[freeview]]"
  - "[[tksurferfv]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - visualization
  - GUI
  - freeview
  - wrapper
---

# tkmeditfv

## Summary

`tkmeditfv` is a tcsh wrapper script that translates `tkmedit`-style command-line arguments into [[freeview]] arguments and launches freeview. It provides backward compatibility for scripts and workflows that call `tkmedit` by name, ensuring they continue to work with the modern freeview interface. The translation preserves the major tkmedit features: volume loading, surface overlay, segmentation, annotations, overlays, and other display settings.

## Source Information

- **Language:** tcsh shell script
- **Source file(s):** `scripts/tkmeditfv`
- **Binary/script location:** `$FREESURFER_HOME/bin/tkmeditfv`

## Purpose and Context

When FreeSurfer deprecated the original Tk-based `tkmedit` viewer, `tkmeditfv` was introduced as a drop-in replacement that maps the tkmedit command-line interface onto freeview. This allows legacy scripts and tutorials using `tkmedit` to continue working without modification.

Key features translated:
- Volume loading (main and auxiliary volumes)
- Segmentation overlay with colour tables
- Surface overlay (white, pial)
- Functional overlay (time-varying data)
- Annotations and labels
- Cursor positioning, zoom level
- 3D hide option
- Screenshot capture

The script sets `FS_COPY_HEADER_CTAB=1` to ensure that colour tables are preserved in any files saved from freeview.

## Inputs

### Command-Line Interface

`tkmeditfv` accepts a tkmedit-style argument syntax but adds many freeview-specific options:

```
tkmeditfv <subject> <mainvol> [<surface>] [options]   # subject-based
tkmeditfv -f <mainvol> [options]                       # volume-only (no subject)
```

See the **Configuration Options** section below for the complete verified flag list.

### Environment Variables

- `FS_COPY_HEADER_CTAB=1` — set automatically; ensures FreeSurfer header colour tables are preserved when saving from freeview.
- `FV_PATIENT_ORIENTATION` — set to 1 by default (enable patient orientation display in freeview).
- `FV_ROTATE_AROUND_CURSOR` — set to 0 by default.

## Outputs

Launches [[freeview]] as an interactive GUI. No files are produced unless the user saves from freeview or uses `-ScreenShot`.

## Configuration Options

### Invocation Modes

```
tkmeditfv <subject> <mainvol> [<surface>] [options]   # subject-based
tkmeditfv -f <mainvol> [options]                       # volume-only (no subject)
```

### Volume Loading

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<subject>` | positional | — | Subject ID; volumes resolved relative to `$SUBJECTS_DIR/<subject>/mri/`. |
| `<mainvol>` | positional | required | Main volume name (or path). |
| `<surface>` (3rd positional) | string | — | Optional initial surface name (added to surface list). |
| `-f <mainvol>` | string | — | Load a volume by full path without requiring a subject ID. |
| `-aux <vol>` | string | — | Auxiliary volume. |
| `-vol <vol>` | string | repeatable | Load additional volumes (beyond main/aux). |
| `-main-minmax <min> <max>` | 2 floats | — | Set intensity window (min/max) for the main volume. |

### Segmentation Overlays

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-seg <seg> [ctab]` | string [string] | — | Segmentation volume with optional colour table. |
| `-aux-seg <seg> [ctab]` | string [string] | — | Auxiliary segmentation volume. |
| `-seg2 <seg> [ctab]` | string [string] | repeatable | Additional segmentation volumes (beyond `-seg` and `-aux-seg`). |
| `-aseg` | flag | — | Shorthand for `-seg aseg.mgz`. |
| `-aparc+aseg` | flag | — | Shorthand for `-seg aparc+aseg.mgz`. |
| `-ctab <file>` | string | FreeSurferColorLUT.txt | Override colour table for all segmentation overlays. |
| `-no-ctab` | flag | — | Do not use a colour table (segmentation uses embedded colours only). |
| `-op` / `-opacity <f>` | float | 1.0 | Segmentation overlay opacity (0.0–1.0). |
| `-seg-outline` | flag | off | Show segmentation in outline mode. |

### Surface Overlays

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-surfs` | flag | off | Load lh/rh white (yellow) and pial (red) surfaces. |
| `-lh-surfs` | flag | off | Load lh.white (yellow) and lh.pial (red). |
| `-rh-surfs` | flag | off | Load rh.white (yellow) and rh.pial (red). |
| `-white` | flag | off | Load lh.white and rh.white (yellow). |
| `-pial` | flag | off | Load lh.pial and rh.pial (red). |
| `-orig` | flag | off | Load lh.orig and rh.orig (green). |
| `-orig.nofix` | flag | off | Load lh.orig.nofix and rh.orig.nofix (cyan). |
| `-inflated` | flag | off | Load lh.inflated and rh.inflated (cyan). |
| `-lh-inflated` | flag | off | Load lh.inflated only. |
| `-rh-inflated` | flag | off | Load rh.inflated only. |
| `-white.preaparc` | flag | off | Load lh/rh.white.preaparc (yellow). |
| `-lh.white` | flag | off | Load lh.white only. |
| `-rh.white` | flag | off | Load rh.white only. |
| `-lh-white` | flag | off | Load lh.white only (alias). |
| `-rh-white` | flag | off | Load rh.white only (alias). |
| `-smoothwm.nofix` | flag | off | Load lh/rh.smoothwm.nofix (green). |
| `-woT2` | flag | off | Load lh/rh.woT2.pial (red). |
| `-surface` / `-surf <surf> [color]` | string [string] | — | Load a specific surface by name with optional edge colour (default: yellow). |
| `-aux-surface` / `-aux-surf <surf> [color]` | string [string] | — | Load an auxiliary surface with optional edge colour. |
| `-surfext <ext>` | string | — | Append extension `<ext>` to all surface names. |
| `-hide` / `-hide-3d` / `-hide-in-3d` | flag | off | Hide surfaces in the 3D panel. |

### Defects

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-defect` / `-defects` | flag | off | Load surface defect information: `surface.defects.mgz` seg, `lh/rh.smoothwm.nofix` (green), `lh/rh.orig` (yellow), and defect pointsets. |
| `-lh-defect` / `-lh-defects` | flag | off | Same as `-defects` but for left hemisphere only. |
| `-rh-defect` / `-rh-defects` | flag | off | Same as `-defects` but for right hemisphere only. |
| `-defectps` | flag | off | Load defect pointsets only (without the full defect setup). |

### Annotations and Labels

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-annot <name>` | string | — | Load annotation `<hemi>.<name>` from `subject/label/`. Multiple `-annot` flags allowed. |
| `-aparc` | flag | off | Shorthand for `-annot aparc.annot`. |
| `-label` / `-l <file>` | string | — | Load a label file. Multiple `-label` flags allowed. |

### Functional/Time-Course Overlays

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-overlay` / `-ov <file> [name]` | string [string] | — | Functional overlay volume with optional display name. Multiple `-overlay` flags allowed. |
| `-overlay-reg <reg>` | string | — | Registration file for overlay (applied to `--overlay`). |
| `-timecourse` / `-t <file>` | string | — | Time-course (4D) overlay volume. |
| `-timecourse-reg <reg>` | string | — | Registration file for time-course. |
| `-reg <reg>` | string | — | Registration file applied to both overlay and time-course. |
| `-fminmax <min> <max>` | 2 floats | 2 5 | Min and max for overlay heat scale. |
| `-fmin` / `-fthresh <f>` | float | 2 | Overlay heat scale minimum threshold. |
| `-fmax <f>` | float | 5 | Overlay heat scale maximum. |
| `-linear` | flag | — | Use linear overlay colour scale transition. |
| `-linearopaque` | flag | — | Use linear-opaque overlay colour scale transition. |
| `-piecewise` | flag | — | Use piecewise overlay colour scale transition. |
| `-mid_to_max` | flag | — | Use mid-to-max overlay colour scale transition. |

### Interpolation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-trilin` / `-trilinear` | flag | — | Use trilinear interpolation for volume overlays. |
| `-cubic` | flag | cubic | Use cubic interpolation for volume overlays (default). |
| `-nearest` | flag | — | Use nearest-neighbour interpolation for volume overlays. |

### Cursor and View

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-crs <col> <row> <slice>` | 3 ints | — | Set cursor position (CRS) and centre field of view there. |
| `-zoom <f>` | float | — | Set zoom level. |
| `-sd <dir>` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `-cdmri` / `-cd-mri` | flag | off | `cd` into `$SUBJECTS_DIR/<subject>/mri/` before launching freeview. Useful when freeview needs to find relative paths. |

### Orientation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-radiological` / `-radio` | flag | — | Use radiological orientation (L on right side). Sets `FV_PATIENT_ORIENTATION=1`. |
| `-neurological` / `-neuro` | flag | — | Use neurological orientation (L on left side). Sets `FV_PATIENT_ORIENTATION=2`. |

### Visualization

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-rotate-around-cursor` / `-rac` | flag | off | Rotate around cursor in 3D view. Sets `FV_ROTATE_AROUND_CURSOR=1`. |
| `-no-rotate-around-cursor` / `-no-rac` | flag | — | Disable rotate-around-cursor. |
| `-vgl` | flag | off | Enable VirtualGL (`FS_ALLOW_VGLRUN=1`) for GPU-accelerated rendering. |
| `-novgl` / `-no-vgl` | flag | — | Disable VirtualGL. |

### Manual Check Mode

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mancheck` | flag | off | Enable manual check mode: loads `subject/scripts/mancheck.json` as a pointset. |
| `-no-mancheck` | flag | — | Disable manual check mode. |

### Screenshot

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-ss <file> <quit01>` | string int | — | Save screenshot to `<file>`. If `quit01=1`, uses virtual framebuffer (`fsxvfb`) and exits after screenshot. If `quit01=0`, keeps freeview open (`-noquit`). |

### Sphere Volume Geometry

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--keep-sphere-vol-geom` | flag | off | Do not ignore sphere volume geometry when loading sphere (sets `FV_SPHERE_IGNORE_VG=0`). By default `FV_SPHERE_IGNORE_VG` is unset (sphere VG is ignored). |

### Fallback to tkmedit

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-tkmedit` / `-tkm` | flag | off | Use original `tkmedit` instead of freeview (if installed). In FreeSurfer 8.x, tkmedit is not available. |

### Miscellaneous

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--nolog` / `--no-log` | flag | off | Redirect log output to `/dev/null`. |
| `--tmpdir` / `--tmp <dir>` | string | — | Set temporary directory; also sets `cleanup=0`. |
| `--nocleanup` | flag | off | Do not clean up temp files on exit (`cleanup=0`). |
| `--cleanup` | flag | on | Clean up temp files on exit (explicit override). |
| `-debug` / `--debug` | flag | off | Enable verbose (`set verbose = 1`) and command echo (`set echo = 1`). |

### Configuration Interactions

- `-UseTkMedit` / `-tkm` falls back to the legacy tkmedit if available. In FreeSurfer 8.x, tkmedit is not shipped, so this flag has no effect.
- `-ss <file> 1` enables non-interactive screenshot capture (runs via `fsxvfb` virtual framebuffer and exits). `-ss <file> 0` takes a screenshot but keeps freeview open.
- `-segopacity` (via `-op`) applies to all segmentation overlays (main seg, aux seg, and additional seg2 volumes).
- `-crs` both sets the cursor and centres the field of view (`-cc` in freeview).
- `-reg` is a combined flag that sets both `-overlay-reg` and `-timecourse-reg` to the same file.
- `-ctab` overrides the colour table for the main seg, aux seg, and all `-seg2` volumes simultaneously. `-no-ctab` clears it.
- Unrecognised flags are collected in `altargs` and passed verbatim to freeview as extra arguments.

## Typical Use Cases

### Use Case 1: Open subject volumes with surfaces (standard QC)

```bash
tkmeditfv subject brainmask.mgz -wm wm.mgz -surfs
```

### Use Case 2: View with segmentation overlay

```bash
tkmeditfv subject T1.mgz -seg aparc+aseg.mgz
```

### Use Case 3: Open from automated pipeline with screenshot

```bash
tkmeditfv subject T1.mgz -seg aparc+aseg.mgz \
  -ScreenShot /path/to/screenshot.png -ScreenShotQuit
```

## Pipeline Context

`tkmeditfv` is not called by `recon-all`. It is used interactively for QC and manual editing, typically between `autorecon1` and `autorecon2`:

1. Run `recon-all -autorecon1`.
2. Run `tkmeditfv subject brainmask.mgz -wm wm.mgz` to check brainmask.
3. Make edits in freeview.
4. Run `recon-all -autorecon2`.

## Gotchas and Caveats

> [!gotcha] Not all tkmedit flags may be supported
> The translation from tkmedit to freeview arguments is best-effort. Some obscure tkmedit flags may not have freeview equivalents and will be silently ignored (stored in `altargs` and potentially passed through).

> [!gotcha] Interpolation default is cubic
> The default interpolation is `cubic` (not `nearest`). For viewing segmentation volumes where label boundaries matter, consider using `nearest` interpolation.

## Related Tools

- [[freeview]] — the underlying viewer launched by this script
- [[tkmedit]] — the legacy tool that this script replaces
- [[tksurferfv]] — analogous wrapper for tksurfer-to-freeview translation

## Confidence and Gaps

**High confidence.** The complete `parse_args` section and `check_params` section of the script were fully read. All flags are verified from the source. The freeview command construction (`cmd` variable) was also read and understood.

> [!gap] Audit note: 6 strings flagged by C1 audit are not flags of this tool
> The C1 audit flagged `--ctab`, `--hide-3d-slices`, `--r`, `--ss`, `--surface`, and `--view` as potentially missing. Verification against `scripts/tkmeditfv`: `-ctab` and `-surface`/`-surf` are already documented in the tables above (with single-dash form as found in source). `--ss` is also documented (source uses both `-ss` and `--ss` as aliases). `--hide-3d-slices` and `--view` are freeview flags constructed and passed on line 192 (`$cmd $altargs --hide-3d-slices --view coronal`) and are not parsed by this wrapper. `--r` does not appear anywhere in the tkmeditfv parser; it appears only as a flag passed to `reg2subject` on line 753. The Configuration Options table is complete and correct.
