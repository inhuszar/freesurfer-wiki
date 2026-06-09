---
title: "tkregisterfv"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/tkregisterfv"
families:
  - "scripts"
  - "tktools"
recon_all_stage: null
related:
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tksurferfv]]"
  - "[[tkmeditfv]]"
  - "[[tkregister2]]"
  - "[[lta_convert]]"
  - "[[mri_coreg]]"
  - "[[bbregister]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact freeview behaviour of -transform-volume / the transform-config window (raised by default) is not documented here beyond that tkregisterfv requests it; that is freeview-side UI."
tags:
  - registration
  - visualization
  - GUI
  - freeview
  - wrapper
  - LTA
---

# tkregisterfv

## Summary

`tkregisterfv` is a tcsh wrapper that lets you inspect and adjust a **volume-to-volume registration** in [[wiki/tools/freeview|freeview]] using a `tkregister`-style command line. You point it at a moveable volume (`--mov`), a target volume (`--targ`), and a registration file (`--reg`, an **LTA**), and it launches freeview with the two volumes loaded and the registration applied, plus an interactive transform-configuration window so you can nudge the alignment and save the result. It is the registration-viewer sibling of [[tksurferfv]] (surfaces) and [[tkmeditfv]] (volumes), introduced so that workflows built around the deprecated `tkregister2` Tk GUI keep working under freeview. It can also convert and round-trip the Talairach transform (`--fstal`) and synthesize a header-based registration from scratch (`--regheader`/`--params`).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/tkregisterfv`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv)
- **Binary/script location:** `$FREESURFER_HOME/bin/tkregisterfv`
- **Tools invoked:** [`freeview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L145) (run through `fsvglrun`), [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L78) (Talairach xfm↔lta round-trip in `--fstal` mode), [`mri_coreg --par2mat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L132) (build a header/parameter registration for `--regheader`), and the helpers `getfullpath`, `reg2subject`, `isargflag`, `fs_temp_dir`.

## Purpose and Context

FreeSurfer's classic registration GUI, `tkregister2`, displayed a moveable and a target volume with a registration applied and let the user hand-tune the 9/12-DOF transform. With the move to [[wiki/tools/freeview|freeview]], `tkregisterfv` reproduces the common cases of that workflow by **translating tkregister-style arguments into a freeview command line**: it loads the target as the base volume, loads the moveable volume with `reg=<lta>` so freeview applies the transform, optionally overlays a segmentation and one or more surfaces, and (by default) raises freeview's transform-configuration panel (`-transform-volume`) so the registration can be edited and saved. Only **LTA** registration files are supported (the usage banner says so explicitly, [`scripts/tkregisterfv:690-691`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L690-L691)); it is not a full reimplementation of tkregister2.

It is used **interactively** — for checking and fixing a registration produced by [[bbregister]], [[mri_coreg]], or `mri_robust_register` — and is referenced from helper scripts (e.g. [[bbregister]] prints a ready-to-run `tkregisterfv …` line for QC). It is **not** part of [[wiki/pipelines/recon-all|recon-all]].

A convenience subcommand, `--fstal --s <subject>`, opens the subject's `talairach.xfm` for manual adjustment by converting it to LTA, launching `tkregisterfv` on the MNI305 target, and — if you changed it — converting the edited LTA back to `.xfm`.

## Inputs

### Required Inputs

The minimum is **a registration to display**. Three convenience patterns are supported ([`scripts/tkregisterfv:694-697`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L694-L697)):

- `--mov <vol>` + `--targ <vol>` + `--reg <reg.lta>` — fully explicit.
- `--reg <reg.lta>` alone — the moveable and target volume paths are read from the LTA's `filename` lines ([`scripts/tkregisterfv:592-600`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L592-L600)).
- `--reg <reg.lta> --mov <vol>` (target from LTA) or `--reg … --targ <vol>` (mov from LTA).
- `--s <subject>` — uses `$SUBJECTS_DIR/<subject>/mri/<fstarg>` (default `orig.mgz`) as the target and auto-loads `?h.white` surfaces.

`--mov`, `--targ`, `--aux`, and the `--reg*` inputs are checked for existence and canonicalised with `getfullpath`/`` `pwd` `` ([`scripts/tkregisterfv:240-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L240-L257)).

### Input Assumptions

> [!assumption] LTA registrations, RAS-sharing volumes for --regheader
> The registration file must be an **LTA** (`.lta`); vox2vox formats from the old `tkregister2` are not read. With `--regheader`, the moveable and target volumes are assumed to **share a scanner RAS** (the header-based registration is computed by [[mri_coreg]] `--par2mat`, optionally seeded by `--params`); if they do not, the resulting alignment will be wrong. In `--fstal` mode the subject must have `mri/transforms/talairach.xfm` and the standard `orig.mgz` (or `--fstarg`) target.

## Outputs

### Files Created

`tkregisterfv` is a viewer; it normally creates **no** persistent files — freeview writes the (possibly edited) registration only when the user saves it. The two mechanisms that *can* leave files behind:

| File | When | Notes |
|------|------|-------|
| The LTA named by `--reg` | when the user edits the registration in freeview and saves | freeview will not let the user **save** the registration unless it has actually been changed (a quirk this script designs around). |
| `<reg>.change-name.lta` | `--regheader` (no pre-existing reg) | A header registration is synthesized here by [[mri_coreg]]; after freeview exits the script keeps or deletes it based on whether a new reg was created (see gotcha). |
| `mri/transforms/talairach.xfm` (overwritten) | `--fstal`, only if you changed the transform | The edited LTA is converted back to `.xfm` with `lta_convert --inlta … --outmni` ([`scripts/tkregisterfv:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L104)); if unchanged, nothing is written and the script says "No change to registration". |

A temporary directory (`fs_temp_dir`) is created and removed each run.

### Output Specifications

The registration consumed and produced is an [[lta|LTA]] (linear transform array). `--fstal` exchanges between the MNI-style `talairach.xfm` and LTA via [[lta_convert]] (`--outmni` writes the MNI `.xfm` form).

## Mathematical Foundations

`tkregisterfv` performs no registration *estimation* itself; the geometry is delegated:

> [!internal] Transform math lives in the called tools and in freeview
> The header/parameter registration is built by [[mri_coreg]] `--par2mat`, which converts the 12 affine parameters (3 translations mm, 3 rotations deg, 3 scales, 3 shears) into a RAS-to-RAS matrix written as an LTA ([`scripts/tkregisterfv:132-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L132-L134)). The Talairach round-trip uses [[lta_convert]] (`--inxfm/--outlta`, `--inlta/--outmni`). Interactive re-estimation (dragging the volume) happens inside [[wiki/tools/freeview|freeview]]'s transform tool. The `--params` slot order is `tx ty tz ry rx rz sy sx sz hxy hxz hyz`, defaulting to the identity `(0 0 0 0 0 0 1 1 1 0 0 0)` (12-DOF, [`scripts/tkregisterfv:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L33)).

The `--flip-x/y/z` shortcuts simply set the corresponding rotation parameter to 180° and enable `--regheader` ([`scripts/tkregisterfv:348-361`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L348-L361)).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/tkregisterfv:234-541`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L234-L541)). Boolean flags take no argument. **Unrecognised flags are not errors** — they are collected into `altargs` and passed straight through to freeview ([`scripts/tkregisterfv:533-538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L533-L538)).

#### Core volumes and registration

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mov` | string | from `--reg` | Moveable volume; the registration maps this onto the target. Canonicalised; must exist. |
| `--targ` | string | from `--reg`/subject | Target (base) volume. If absent, taken from the subject's `mri/<fstarg>` or from the LTA filenames. |
| `--reg`<br>`--lta` | string (.lta) | — | The registration (LTA) to apply/edit. Can supply mov and/or targ when those are omitted. |
| `--fstarg` | string | `orig.mgz` | Subject-relative target volume name used when `--s` is given. |
| `--s`<br>`--subject` | string | — | Subject ID; sets the target to `mri/<fstarg>` and auto-loads `lh.white rh.white` (yellow). |
| `--sd` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `--aux` | `<vol> [reg]` | — | Load an additional moveable volume, optionally with its own reg (`0` = no reg). Repeatable. |
| `--mov2` | string | — | Second moveable volume. |
| `--reg2`<br>`--lta2` | string | — | Registration for `--mov2`. |
| `--mov3` | string | — | Third moveable volume. |
| `--reg3`<br>`--lta3` | string | — | Registration for `--mov3`. |

#### Header / parameter registration (synthesize a reg)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--regheader`<br>`--reg-header` | bool | off | Create the registration from the two volumes assuming a shared RAS (via [[mri_coreg]] `--par2mat`), rather than reading an existing one. The named `--reg` file must **not** already exist. |
| `--params` | 12 floats | identity | Affine parameters `tx ty tz ry rx rz sy sx sz hxy hxz hyz` (mm, deg) for the header reg; implies `--regheader`. |
| `--flip-x` | bool | off | Set `rx=180°`; implies `--regheader`. |
| `--flip-y` | bool | off | Set `ry=180°`; implies `--regheader`. |
| `--flip-z` | bool | off | Set `rz=180°`; implies `--regheader`. |

#### Surfaces, segmentation, display

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--surfs`<br>`--wm-surfs` | bool | off (on with `--s`) | Load `lh.white` + `rh.white` (yellow). |
| `--lh`<br>`--lh-only`<br>`--lh-white` | bool | off | Load `lh.white` only. |
| `--rh`<br>`--rh-only`<br>`--rh-white` | bool | off | Load `rh.white` only. |
| `--pial-surfs` | bool | off | Load `lh.pial` + `rh.pial` (red). |
| `--all-surfs` | bool | off | Load white **and** pial for both hemis (yellow/red). |
| `--no-surfs`<br>`--no-surf` | bool | — | Load no surfaces. |
| `--surf`<br>`--surface` | string | — | Explicit path to an extra "main" surface to load. Repeatable (appends). |
| `--aux-surf`<br>`--aux-surface` | string | — | Explicit path to an extra surface to load (appended to the same list). |
| `--seg` | `<vol> [lut]` | — | Load a segmentation volume (with optional colour LUT) as a `lut` colormap layer at opacity `--opacity`. |
| `--aseg` | bool | — | Shortcut for `--seg aseg.mgz`. |
| `--aparc+aseg` | bool | — | Shortcut for `--seg aparc+aseg.mgz`. |
| `--op`<br>`--opacity` | float | `0.3` | Segmentation overlay opacity. |
| `--plane` | `cor`/`sag`/`ax` | `cor` | Initial freeview viewport (`-viewport`). |
| `--heat` | bool | grayscale | Use the `heat` colormap for all volumes. |
| `--linear`<br>`--trilinear`<br>`--trilin` | bool | cubic | Trilinear interpolation. |
| `--cubic` | bool | **on** | Cubic interpolation. |
| `--no-config` | bool | config on | Do **not** auto-raise freeview's transform-configuration window (`ShowConfig`). |
| `--title` | string | — | Window title string (stored; see gaps). |

#### Talairach mode, orientation, VGL, housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fstal` | bool | off | Edit the subject's `talairach.xfm`: convert to LTA, view on MNI305, convert back if changed. Requires `--s`; forbids `--reg`. |
| `-radiological`<br>`-radio` | bool | **default** | Radiological orientation (`FV_PATIENT_ORIENTATION=1`). |
| `-neurological`<br>`-neuro` | bool | — | Neurological orientation (`FV_PATIENT_ORIENTATION=2`; adds freeview `-neuro-view`). |
| `-vgl`<br>`--vgl` | bool | — | Allow VirtualGL (`FS_ALLOW_VGLRUN=1`). |
| `-novgl`<br>`--novgl`<br>`--no-vgl`<br>`-no-vgl` | bool | — | Disallow VirtualGL. |
| `--tkregister`<br>`--tkr` | bool | off | Use legacy `tkregister` instead of freeview (largely vestigial; see gotcha). |
| `--nolog`<br>`--no-log` | bool | — | Send the (minimal) log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Use this temp dir; sets `cleanup=0`. |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temporary files. |
| `-debug`<br>`--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` / `-help`, `--version` | flag | — | Help / version. |
| *(anything else)* | — | — | Passed verbatim to freeview via `altargs`. |

### Configuration Interactions

> [!gotcha] --fstal is a self-contained mode and rejects --reg
> With `--fstal` the script takes an entirely separate path: it **requires** `--s <subject>` and **errors if `--reg` is given** ([`scripts/tkregisterfv:549-559`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L549-L559)). It builds its own LTA from `talairach.xfm`, recursively invokes `tkregisterfv --mov … --reg …`, and writes the result back only if the LTA changed. The help advertises this as "`--fstal --s subject` : only these two args".

> [!gotcha] --regheader refuses to overwrite an existing reg, and cleans up unpredictably
> When `--regheader` is requested, the named `--reg` file must **not** exist ([`scripts/tkregisterfv:664-670`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L664-L670)); the header reg is created as `<reg>.change-name.lta`. Because freeview only allows **saving** a registration that was actually edited, the post-run bookkeeping ([`scripts/tkregisterfv:196-222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L196-L222)) decides whether to keep or delete the synthesized files based on whether a new reg appeared — the source comments themselves note the intended file may not survive if the user just looked and quit. Treat `--regheader` output names with care.

> [!gotcha] --tkregister branch is effectively a stub
> Selecting `--tkregister`/`--tkr` sets `cmd = tkregister` (optionally `-surfs`) and runs it through `fsvglrun` ([`scripts/tkregisterfv:184-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L184-L188)). In FreeSurfer 8, the legacy Tk `tkregister` is generally unavailable, so this path will usually fail; the freeview path is the supported one.

> [!gotcha] Unknown flags are silently forwarded to freeview
> Unlike most FreeSurfer scripts, an unrecognised flag does **not** abort — it is appended to `altargs` and handed to freeview. A typo therefore fails (or is ignored) inside freeview rather than at parse time.

Other interactions: `--s`/`--subject`, `--surfs`, and the per-hemisphere/`--all-surfs` flags all set the surface list and a matching colour list (white=yellow, pial=red); the last surface-selection flag wins for the *base* set, while `--surf`/`--aux-surf` **append**. `--aseg`/`--aparc+aseg` are shortcuts that set `--seg`. `--params`, `--flip-*`, and `--regheader` are coupled: any `--flip-*` or `--params` turns on `--regheader`.

## Typical Use Cases

### Inspect a bbregister result

```bash
# Open the moveable EPI on the anatomical with the bbregister LTA applied;
# the transform-config window comes up so you can tweak and save.
tkregisterfv --mov func.nii.gz --reg register.lta --s bert --surfs
```

### Everything from the LTA

```bash
# mov and targ are read from the registration file's header.
tkregisterfv --reg register.lta
```

### Build and check a header registration

```bash
# Two volumes that share a scanner RAS; synthesize the reg, then edit in freeview.
tkregisterfv --mov b.mgz --targ a.mgz --reg b2a.lta --regheader
```

### Hand-edit the Talairach transform

```bash
# Opens orig.mgz vs MNI305; saves talairach.xfm back only if you change it.
tkregisterfv --fstal --s bert
```

## Pipeline Context

`tkregisterfv` is an **interactive QC/registration-editing** tool and is **not** called by [[wiki/pipelines/recon-all|recon-all]]. Other FreeSurfer scripts emit `tkregisterfv …` command lines for the user to run as a manual check — e.g. [[bbregister]] prints a `tkregisterfv --mov … --reg … --surfs … --sd …` line after computing a boundary-based registration ([`scripts/bbregister:492-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L492-L494)), and `dt_recon`, `fslregister`, `mni152reg`, `make_average_subject`, and others do likewise.

**Predecessor:** a registration producer — [[bbregister]], [[mri_coreg]], `mri_robust_register`, or `talairach`/[[lta_convert]] → **tkregisterfv** (view/adjust/save the LTA) → **Successor:** any tool that consumes the corrected registration (`mri_vol2vol`, `mri_vol2surf`, …).

## Gotchas and Caveats

> [!gotcha] LTA only
> The usage banner states it plainly: "Only uses LTA files." Registrations in the old tkregister2 vox2vox `.dat` format are not loaded; convert them with [[lta_convert]] first.

> [!gotcha] freeview won't let you save an unchanged registration
> Several of the script's design choices (the `--regheader` cleanup, the `--fstal` change-detection) exist because freeview disables saving a registration that has not been edited. If you intend to (re)write a reg file, you must actually move the volume in freeview.

> [!gotcha] -viewport may crash freeview
> A source comment flags `-viewport $Plane` as "currently causes FV to crash" ([`scripts/tkregisterfv:150`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L150)); if freeview dies on startup, the `--plane` argument is the first thing to suspect.

## Error Compensation and Guard Rails

- **Input existence checks** for `--mov`, `--targ`, `--aux`, `--reg`, and resolved surface paths, with explicit error messages.
- **Registration auto-discovery:** missing `--mov`/`--targ` are filled from the LTA `filename` lines or from the subject directory, so partial command lines still work.
- **Subject inference:** given only `--reg`, the subject is recovered with `reg2subject --r $reg` to locate the target ([`scripts/tkregisterfv:571`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L571)).
- **`--fstal` is non-destructive unless you edit:** it diffs the LTA before and after and only rewrites `talairach.xfm` when it actually changed.
- **Orientation defaulting:** `FV_PATIENT_ORIENTATION` and `FV_ROTATE_AROUND_CURSOR` are initialised if unset ([`scripts/tkregisterfv:36-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv#L36-L37)).

## Related Tools

- [[wiki/tools/freeview|freeview]] — the GUI this script drives; all interactive registration editing happens here.
- [[tksurferfv]] — sibling wrapper that maps `tksurfer` arguments to freeview (surfaces).
- [[tkmeditfv]] — sibling wrapper that maps `tkmedit` arguments to freeview (volumes).
- [[tkregister2]] — the deprecated Tk registration GUI whose command-line style this script emulates.
- [[lta_convert]] — converts registration formats; used here for the Talairach `.xfm`↔`.lta` round-trip.
- [[mri_coreg]] — builds the header/parameter registration (`--par2mat`) for `--regheader`.
- [[bbregister]] — a common producer of the LTA you would inspect with this tool.

## Confidence and Gaps

**High confidence.** The full argument parser and both execution paths (freeview and the `--fstal`/`--regheader` branches) were read directly from [`scripts/tkregisterfv`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv). Flag list, defaults, the LTA-only constraint, and the recursive `--fstal` behaviour are confirmed.

> [!gap] freeview-side transform UI
> What the transform-configuration window (`-transform-volume`) and `-viewport` do inside freeview is not detailed here; those are freeview behaviours. The `--title` value is stored but its propagation to freeview was not traced.

## References

- FreeSurfer source: [`scripts/tkregisterfv`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tkregisterfv) (v8.2.0).
- Sibling wrappers: [[tksurferfv]], [[tkmeditfv]]. Emitting caller example: [`scripts/bbregister:492-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L492-L494).
