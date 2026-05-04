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
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tkmeditfv]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Full argument translation mapping from tksurfer syntax to freeview syntax not fully documented — freeview command construction logic not traced."
tags:
  - visualization
  - GUI
  - freeview
  - surface
  - wrapper
---

# tksurferfv

## Summary

`tksurferfv` is a tcsh wrapper script that translates `tksurfer`-style command-line arguments into [[wiki/tools/freeview|freeview]] arguments and launches freeview for surface visualization. It provides backward compatibility for scripts and workflows calling `tksurfer`, mapping the classic three-argument syntax (`<subject> <hemi> <surface>`) and associated overlay/annotation options to their freeview equivalents.

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

Key options:

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `<subject>` | — | — | Subject ID |
| `<hemi>` | — | — | Hemisphere: `lh` or `rh` |
| `<surface>` | — | — | Surface name: `inflated`, `pial`, `white`, `sphere`, etc. |
| `-overlay`<br>`-ov` | `<file> [name]` | — | Per-vertex overlay file; optional display name |
| `-annot` | `<name>` | — | Annotation file name (searches `label/<hemi>.<name>`) |
| `-aparc` | — | — | Shorthand for `-annot aparc.annot` |
| `-label`<br>`-l` | `<file>` | — | Label file to display |
| `-reg` | `<file>` | — | Registration file for overlay; also sets `-timecourse-reg` |
| `-overlay-reg` | `<file>` | — | Registration file for overlay only |
| `-timecourse-reg` | `<file>` | — | Registration file for timecourse only |
| `-timecourse`<br>`-t` | `<vol>` | — | Timecourse (functional) volume to display as overlay |
| `-aux-surf`<br>`-aux-surface`<br>`-surf` | `<surf>` | — | Additional surface to load (prepended to surface list) |
| `-pial` | — | — | Prepend `pial` surface to load list |
| `-white` | — | — | Prepend `white` surface to load list |
| `-surfs` | — | — | Load `white`, `pial`, and `inflated` surfaces |
| `-all` | — | off | Enable `all=true` for loaded surfaces (freeview `all` flag) |
| `-no-all` | — | off | Disable `all` flag for surfaces |
| `-fminmax` | `<fmin> <fmax>` | `2 5` | Overlay threshold: minimum and maximum |
| `-fmin`<br>`-fthresh` | `<f>` | `2` | Overlay minimum threshold |
| `-fmax` | `<f>` | `5` | Overlay maximum threshold |
| `-linear` | — | — | Overlay heat scale: linear method |
| `-linearopaque` | — | — | Overlay heat scale: linear opaque method |
| `-piecewise` | — | — | Overlay heat scale: piecewise method |
| `-min_to_max` | — | mid_to_min | Overlay heat scale: min to max method |
| `-outline` | — | on | Show annotation as coloured outlines |
| `-no-outline`<br>`--no-outline` | — | — | Show annotation as filled colours (disables outline) |
| `-patch` | `<file>` | — | Load surface patch |
| `-vtxno` | `<n>` | — | Place cursor on vertex number `n` on the first surface |
| `-medial` | — | — | Set initial view to medial |
| `-lateral` | — | — | Set initial view to lateral |
| `-inferior` | — | — | Set initial view to inferior |
| `-superior` | — | — | Set initial view to superior |
| `-tksurfer`<br>`-tkm` | — | off | Use legacy tksurfer instead of freeview |
| `-vgl` | — | — | Allow VirtualGL (`FS_ALLOW_VGLRUN=1`) |
| `-novgl`<br>`-no-vgl` | — | — | Disable VirtualGL |
| `-radiological`<br>`-radio` | — | on | Use radiological orientation (`FV_PATIENT_ORIENTATION=1`) |
| `-neurological`<br>`-neuro` | — | — | Use neurological orientation (`FV_PATIENT_ORIENTATION=2`) |
| `-rotate-around-cursor`<br>`-rac` | — | off | Rotate around cursor in 3D view |
| `-no-rotate-around-cursor`<br>`-no-rac` | — | off | Disable rotate-around-cursor |
| `--nolog`<br>`--no-log` | — | — | Suppress log file (redirect to `/dev/null`) |
| `--tmp`<br>`--tmpdir` | `<dir>` | auto | Use `dir` as temporary directory; sets `cleanup=0` |
| `--nocleanup` | — | — | Do not delete temporary files on exit |
| `--cleanup` | — | — | Delete temporary files on exit |
| `--keep-sphere-vol-geom` | — | — | Preserve sphere volume geometry (`FV_SPHERE_IGNORE_VG=0`) |
| `-debug`<br>`--debug` | — | — | Enable verbose/debug output |

### Environment Variables

- `FS_COPY_HEADER_CTAB=1` — set automatically.
- `FV_PATIENT_ORIENTATION` — set to 1 (radiological) by default.
- `FV_ROTATE_AROUND_CURSOR` — set to 0 by default.

## Outputs

Launches [[wiki/tools/freeview|freeview]] as interactive GUI. No files produced unless the user saves or uses screenshot flags.

## Configuration Interactions

- `-annot-outline` is on by default (`annotoutline = 1`); parcellation boundaries are shown as outlines on the surface.
- `-overlay` and `-annot` can be combined; both are displayed simultaneously in freeview.
- `-tksurfer`/`-tkm` has no effect in FreeSurfer 8.x where tksurfer is not available.
- `--tmp`/`--tmpdir` implicitly sets `cleanup = 0`; specify `--cleanup` afterwards to re-enable cleanup.
- `--nocleanup` and `--cleanup` are explicit overrides; the last one on the command line wins.
- `-reg` sets both the overlay registration and the timecourse registration; `-overlay-reg` sets only the overlay registration; `-timecourse-reg` sets only the timecourse registration.

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
> The default `annotoutline = 1` shows parcellation boundaries as outlines rather than filled regions. Use `-no-outline` if filled annotation colours are needed.

> [!gotcha] Not all tksurfer flags supported
> Legacy tksurfer had many Tcl-level configuration options. Not all translate to freeview. Unsupported arguments are collected in `altargs` and passed verbatim to freeview, where they may be silently ignored.

## Related Tools

- [[wiki/tools/freeview|freeview]] — the viewer launched by this script
- [[tksurfer]] — the deprecated legacy tool this script replaces
- [[tkmeditfv]] — analogous wrapper for volume viewing

## Confidence and Gaps

Confidence is **medium-high**. The complete argument-parsing loop has been read. The freeview command construction logic (how surface, overlay, annotation, and label arguments are assembled into `freeview -f` arguments) has not been fully traced.

> [!gap] Full argument translation
> The freeview command-construction block (the portion of the script that builds the `-f` argument string from overlays, annotations, and labels) has not been fully traced. The complete mapping from tksurfer flag values to freeview syntax is not yet documented.
