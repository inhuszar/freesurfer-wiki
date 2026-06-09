---
title: "fvcompare"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fvcompare"
families: []                     # QA convenience wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/freeview|freeview]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[fsvglrun]]"
  - "[[groupstatsdiff]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - qa
  - visualization
  - freeview
  - comparison
---

# fvcompare

## Summary

`fvcompare` launches [[wiki/tools/freeview|freeview]] preloaded with the volumes,
segmentations, and surfaces of **two (optionally up to four) FreeSurfer subjects
side by side**, so you can visually compare the same anatomy across time points,
across processing streams, or across `SUBJECTS_DIR`s. It loads each subject's
`brain.finalsurfs.mgz`, `aparc+aseg.mgz`, and `lh/rh.white`+`pial` by default
(all configurable), colour-codes and names each layer per subject, and starts
freeview in coronal view. **No registration is applied** — the subjects are
overlaid in their native voxel spaces. It is a QA helper that builds and runs one
big freeview command; it is not an image-processing tool.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fvcompare`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare)
- **Binary/script location:** `$FREESURFER_HOME/bin/fvcompare`
- **Launches:** [`freeview`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L65) via [`fsvglrun`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L194) (the VirtualGL wrapper for remote/headless GPU rendering). Sources `$FREESURFER_HOME/sources.csh` ([`scripts/fvcompare:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L57)).

## Purpose and Context

When you reprocess a subject (new FreeSurfer version, edited inputs, different
flags) or compare two time points, the fastest sanity check is to put both
results in the same viewer and flip between them: do the surfaces still follow the
grey/white boundary, did the segmentation change, did an edit propagate. Doing
that by hand means typing a long [[wiki/tools/freeview|freeview]] command with one
`-v`/`--surface` argument per file per subject, each with a colour and a name.
`fvcompare` generates that command automatically from just the subject IDs.

It is a stand-alone QA convenience script — **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`. The [[groupstatsdiff]] help
suggests `fvcompare` for eyeballing an individual subject when a group difference
is found, but does not call it directly. The canonical use is comparing a
"development" vs. "stable" reconstruction of the same subject across two
`SUBJECTS_DIR`s.

## Inputs

### Required Inputs

- **Subject 1** (`--s1`) and **Subject 2** (`--s2`) — FreeSurfer subject IDs.
  `--s <id>` is shorthand that sets **both** to the same ID (for the
  same-name/different-SUBJECTS_DIR case) ([`scripts/fvcompare:219-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L219-L223)). Subject 1
  is required; the absence of subject 2 is reported but **not fatal** (see
  gotcha) ([`scripts/fvcompare:483-502`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L483-L502)).
- Each subject directory must exist under its `SUBJECTS_DIR` (`$SD1/$subject1`,
  `$SD2/$subject2`), checked at [`scripts/fvcompare:487-492`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L487-L492).

Two more subjects may be added with `--s3`/`--s4` (and `--n3/--n4`, `--c3/--c4`,
`--sd3/--sd4`); when present they extend the per-subject loop
([`scripts/fvcompare:504-505`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L504-L505)).

### Input Assumptions

> [!assumption] Standard recon-all subject trees, no registration
> Each subject is expected to be a completed recon-all output: volumes are read
> from `<subject>/mri/`, segmentations from `<subject>/mri/`, surfaces from
> `<subject>/surf/`, and annotations from `<subject>/label/`
> ([`scripts/fvcompare:96-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L96-L129), [`scripts/fvcompare:162-169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L162-L169)). The subjects are loaded into a
> **single freeview session in their own voxel spaces** — `fvcompare` does not
> resample or align them, so if the two subjects are not already in the same
> space the overlays will not correspond voxel-for-voxel (the help states "No
> registration is applied", [`scripts/fvcompare:567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L567)).

> [!gotcha] Default loaded files differ from the help text
> The code defaults the volume list to `brain.finalsurfs.mgz` and the
> segmentation list to `aparc+aseg.mgz` ([`scripts/fvcompare:507-508`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L507-L508)), but the
> usage text says the volume default is `brainmask.mgz`
> ([`scripts/fvcompare:535`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L535)). **Code is authoritative:** the default volume is
> `brain.finalsurfs.mgz`. The default surfaces are `white` and `pial`
> ([`scripts/fvcompare:18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L18)).

## Outputs

### Files Created

None. `fvcompare` writes no files; its sole effect is to launch an interactive
[[wiki/tools/freeview|freeview]] window. (The `--log`/`--tmpdir`/`--cleanup`
options exist for symmetry with other scripts but no log or temp directory is
actually produced — see gotcha.)

### Output Specifications

An interactive freeview session, opened in **coronal** view with the 3D slice
planes hidden (`--hide-3d-slices --view coronal`, [`scripts/fvcompare:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L65)). The
echoed freeview command line is printed to stdout before launch
([`scripts/fvcompare:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L193)), so you can copy, edit, and rerun it by hand.

## Mathematical Foundations

None — `fvcompare` performs no computation. It concatenates a freeview command
line and runs it. All rendering is done by [[wiki/tools/freeview|freeview]].

> [!internal] Each layer is loaded with per-subject styling
> Volumes get `name=<cue><grayscale>`; segmentations get
> `lut=<ctab>:opacity=<op>:colormap=lut:name=<cue>`; surfaces get
> `edgecolor=<color>:name=<cue>` (plus `annot=…` when an annotation is requested),
> where `<cue>` is `<name>-<file>` so each subject's layer is individually
> labelled in freeview ([`scripts/fvcompare:97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L97), [`scripts/fvcompare:129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L129), [`scripts/fvcompare:161-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L161-L171)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/fvcompare:211-470`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L211-L470)). Boolean flags take no argument. **Unrecognised
arguments are not errors** — they are appended verbatim to the freeview command
line (see [Configuration Interactions](#configuration-interactions)).

#### Subjects, names, and SUBJECTS_DIRs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s1` | string | *(required)* | Subject ID for subject 1 ([`scripts/fvcompare:225-228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L225-L228)). |
| `--s2` | string | *(required)* | Subject ID for subject 2 ([`scripts/fvcompare:236-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L236-L239)). |
| `--s` | string | — | Set **both** subject 1 and subject 2 to this ID (use with `--sd1`/`--sd2` to compare the same subject in two directories) ([`scripts/fvcompare:219-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L219-L223)). |
| `--s3` / `--s4` | string | — | Optional third / fourth subject IDs ([`scripts/fvcompare:247-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L247-L261)). |
| `--n1`<br>`--name1` | string | `s1` | Label prepended to subject 1's layer names ([`scripts/fvcompare:230-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L230-L234)). |
| `--n2`<br>`--name2` | string | `s2` | Label for subject 2 ([`scripts/fvcompare:241-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L241-L245)). |
| `--n3`<br>`--name3` | string | `s3` | Label for subject 3 ([`scripts/fvcompare:252-256`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L252-L256)). |
| `--n4`<br>`--name4` | string | `s4` | Label for subject 4 ([`scripts/fvcompare:263-267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L263-L267)). |
| `--sd` | string | `$SUBJECTS_DIR` | Set the `SUBJECTS_DIR` environment variable for all subjects lacking an explicit `--sdN` ([`scripts/fvcompare:269-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L269-L272)). |
| `--sd1` / `--sd2` / `--sd3` / `--sd4` | string | `$SUBJECTS_DIR` | Per-subject `SUBJECTS_DIR` override ([`scripts/fvcompare:274-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L274-L292), [`scripts/fvcompare:478-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L478-L481)). |

#### Surface colours

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--c1` | 2 colours | `yellow red` | Edge colours for subject 1's two default surfaces (white, pial) ([`scripts/fvcompare:294-297`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L294-L297)). |
| `--c2` | 2 colours | `green blue` | Edge colours for subject 2 ([`scripts/fvcompare:299-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L299-L302)). |
| `--c3` / `--c4` | 2 colours | `green blue` | Edge colours for subjects 3 / 4 ([`scripts/fvcompare:304-312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L304-L312)). |

#### Volumes and segmentations

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol` | string (repeatable) | `brain.finalsurfs.mgz` | Add a volume (file name under `<subject>/mri/`) to load for every subject; may be given multiple times ([`scripts/fvcompare:314-317`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L314-L317)). |
| `--seg` | string (repeatable) | `aparc+aseg.mgz` | Add a segmentation (under `<subject>/mri/`) shown with the colour LUT ([`scripts/fvcompare:319-322`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L319-L322)). |
| `--aseg` | bool | off | Shortcut to add `aseg.mgz` to the segmentation list ([`scripts/fvcompare:324-326`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L324-L326)). |
| `--seg-color` | string | `$FREESURFER_HOME/FreeSurferColorLUT.txt` | Colour lookup table for segmentations ([`scripts/fvcompare:328-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L328-L331)). |
| `--opacity` | float | `1` | Segmentation opacity (0–1) ([`scripts/fvcompare:352-355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L352-L355)). |
| `--no-seg` | bool | off | Do not load any segmentation (empties the seg list at the end) ([`scripts/fvcompare:333-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L333-L335), [`scripts/fvcompare:510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L510)). |

#### Surfaces and annotations

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--surf` | string | `white pial` | Replace the surface list with a single named surface (e.g. `--surf white`) ([`scripts/fvcompare:380-383`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L380-L383)). |
| `--white` | bool | off | Show only the `white` surface ([`scripts/fvcompare:372-374`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L372-L374)). |
| `--pial` | bool | off | **Documented** as "show only pial", but the code sets the surface list to `white` (see [bug gotcha](#configuration-interactions)) ([`scripts/fvcompare:376-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L376-L378)). |
| `--inflated` | bool | off | **Append** the `inflated` surface to the current list ([`scripts/fvcompare:364-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L364-L366)). |
| `--orig` | bool | off | Replace the surface list with `orig orig.nofix` ([`scripts/fvcompare:368-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L368-L370)). |
| `--no-surf` | bool | off | Do not load any surface (empties the surface list) ([`scripts/fvcompare:347-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L347-L350)). |
| `--wot2`<br>`--woT2` | bool | off | Also load `lh/rh.woT2.pial` (the without-T2 pial) in magenta, for subjects 1 and 2 ([`scripts/fvcompare:337-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L337-L340), [`scripts/fvcompare:176-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L176-L187)). |
| `--no-wot2`<br>`--no-woT2` | bool | off | Turn the woT2.pial overlay back off ([`scripts/fvcompare:341-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L341-L344)). |
| `--annot` | string | off | Load `<subject>/label/<hemi>.<annot>` as an outline on the surfaces ([`scripts/fvcompare:405-408`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L405-L408), [`scripts/fvcompare:163-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L163-L170)). |
| `--aparc` | bool | off | Shortcut for `--annot aparc.annot` ([`scripts/fvcompare:420-422`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L420-L422)). |

#### Hemisphere, view, and viewer control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--lh` | bool | both | Show only the left hemisphere ([`scripts/fvcompare:357-359`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L357-L359)). |
| `--rh` | bool | both | Show only the right hemisphere ([`scripts/fvcompare:360-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L360-L362)). |
| `--gray`<br>`--grayscale` | 2 floats | `10,130` | Grayscale window `min max` applied to all volumes ([`scripts/fvcompare:385-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L385-L391)). |
| `--crs` | 3 ints | off | Place the cursor at column/row/slice and centre the field of view (also sets `-cc`) ([`scripts/fvcompare:393-398`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L393-L398), [`scripts/fvcompare:189-190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L189-L190)). |
| `--zoom` | float | off | Set the freeview zoom level ([`scripts/fvcompare:400-403`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L400-L403), [`scripts/fvcompare:191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L191)). |
| `--p`<br>`--c` | string | off | Load a freeview **point set** / control-point file (`-c`); must exist ([`scripts/fvcompare:410-418`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L410-L418), [`scripts/fvcompare:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L66)). |
| `--vgl` | bool | off | Set `FS_ALLOW_VGLRUN=1` so `fsvglrun` uses VirtualGL ([`scripts/fvcompare:424-426`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L424-L426)). |
| `--novgl`<br>`--no-vgl` | bool | off | Unset `FS_ALLOW_VGLRUN` ([`scripts/fvcompare:427-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L427-L430)). |

#### Housekeeping (mostly inert)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--log` | string | — | Accepted but unused (no log is written) ([`scripts/fvcompare:432-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L432-L435)). |
| `--nolog`<br>`--no-log` | bool | — | Accepted but unused ([`scripts/fvcompare:437-440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L437-L440)). |
| `--tmp`<br>`--tmpdir` | string | — | Set a scratch directory and `cleanup=0`; neither is actually used downstream ([`scripts/fvcompare:442-447`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L442-L447)). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle the (unused) cleanup flag ([`scripts/fvcompare:449-455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L449-L455)). |
| `--debug` | bool | off | Enable tcsh `set echo`/`verbose` tracing ([`scripts/fvcompare:457-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L457-L460)). |
| `--help` | bool | — | Print usage plus the help body and exit ([`scripts/fvcompare:46-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L46-L50)). |
| `--version` | bool | — | Print the version string and exit ([`scripts/fvcompare:51-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L51-L55)). |

### Configuration Interactions

> [!gotcha] `--pial` does **not** show the pial surface (code bug)
> The `--pial` case sets `surflist = (white)`, identical to `--white`
> ([`scripts/fvcompare:376-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L376-L378)) — almost certainly a copy-paste error
> (it should set `pial`). So `--pial` currently displays only the **white**
> surface, contradicting its help line ([`scripts/fvcompare:547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L547)). To see only
> the pial surface, use `--surf pial` instead.

> [!gotcha] Surface-selection flags overwrite vs. append
> `--white`, `--pial`, `--orig`, and `--surf` **replace** the whole surface list,
> while `--inflated` **appends** to it ([`scripts/fvcompare:364-383`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L364-L383)). Because
> flags are processed left to right, order matters: `--white --inflated` shows
> white+inflated, but `--inflated --white` shows only white (the later `--white`
> discards the appended inflated). Put the replacing flag first.

> [!gotcha] The `--surf` argument takes a single token
> `--surf` sets `surflist = $argv[1]` (one word), so it cannot load two named
> surfaces at once ([`scripts/fvcompare:380-383`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L380-L383)). For the default white+pial
> pair, simply omit `--surf`.

> [!gotcha] Unknown arguments are silently forwarded to freeview
> The `default:` case appends any unrecognised token to `altargs`, which is
> tacked onto the freeview command line ([`scripts/fvcompare:462-467`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L462-L467), [`scripts/fvcompare:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L192)).
> This is a feature — you can pass extra freeview options through `fvcompare` —
> but it also means a **mistyped flag is not caught**; it is handed to freeview,
> which may error or ignore it. The help advertises this behaviour
> ([`scripts/fvcompare:553`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L553)).

> [!gotcha] `--c1`/`--c2` give exactly two colours for the default two surfaces
> The colour arrays index by surface position ([`scripts/fvcompare:161-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L161-L162)). With
> the default white+pial list this is fine, but if you reduce to one surface
> (`--white`) only the first colour is used, and adding `--inflated` (a third
> surface) reuses colour index 3, which is undefined for `--c1`/`--c2` that only
> set two — leading to an empty colour. Keep the surface count and the supplied
> colour count consistent.

Other interactions:

- `--s` sets both subjects, intended for "same subject, different `SUBJECTS_DIR`"
  comparisons via `--sd1`/`--sd2`.
- `--no-seg` and `--no-surf` win over any `--seg`/`--vol`/`--surf` you added,
  because they are applied (or empty the list) at parse/check time
  ([`scripts/fvcompare:347-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L347-L350), [`scripts/fvcompare:510`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L510)).
- `--aseg` and `--aparc` are pure shortcuts (`--seg aseg.mgz`,
  `--annot aparc.annot`) and compose with explicit `--seg`/`--annot`.

## Typical Use Cases

### 1. Two subjects in the same SUBJECTS_DIR

```bash
fvcompare --s1 subj_v7 --s2 subj_v8
# loads brain.finalsurfs.mgz, aparc+aseg.mgz, and white/pial for both
```

### 2. Dev vs. stable reconstruction in different SUBJECTS_DIRs

```bash
fvcompare --s1 bert --sd1 $DEV_SUBJECTS_DIR \
          --s2 bert --sd2 $STABLE_SUBJECTS_DIR \
          --n1 dev --n2 stable
# or, since the subject name is the same:
fvcompare --s bert --sd1 $DEV_SUBJECTS_DIR --sd2 $STABLE_SUBJECTS_DIR \
          --n1 dev --n2 stable
```

### 3. Surface-only QA at a specific voxel, left hemi

```bash
fvcompare --s1 a --s2 b --no-seg --surf white --lh \
          --crs 128 128 128 --zoom 3
```

### 4. Compare aseg between two subjects with the aparc outline

```bash
fvcompare --s1 a --s2 b --aseg --no-surf
fvcompare --s1 a --s2 b --aparc        # aparc.annot outline on white/pial
```

## Pipeline Context

`fvcompare` is a stand-alone **visual QA** tool. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** two (or more) completed [[wiki/pipelines/recon-all|recon-all]]
reconstructions (e.g. two versions, two time points, or two streams) →
**fvcompare** assembles and launches a [[wiki/tools/freeview|freeview]] session →
**Successor:** human inspection. [[groupstatsdiff]] points users to `fvcompare`
for drilling into a specific subject behind a group difference.

## Gotchas and Caveats

> [!gotcha] Missing subject 2 is reported but not fatal
> If `--s2`'s directory does not exist, the script prints an error but **does not
> exit** ([`scripts/fvcompare:498-502`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L498-L502); the `exit 1` present for subject 1 at
> [`scripts/fvcompare:489-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L489-L491) is missing for subject 2). It then proceeds to
> build freeview paths under the non-existent directory, which freeview will fail
> to load. Double-check subject 2's ID/SUBJECTS_DIR if layers are missing.

> [!gotcha] No registration — overlays assume a shared space
> The subjects are loaded in their native voxel grids with no alignment. This is
> exactly right for comparing two reconstructions of the **same** acquisition,
> but two different acquisitions will not line up. The help states this plainly
> ([`scripts/fvcompare:567`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L567)).

> [!gotcha] Launched through `fsvglrun`
> freeview is started via [[fsvglrun]] ([`scripts/fvcompare:194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L194)), the VirtualGL
> wrapper. On a local display this is transparent; over SSH/headless nodes you
> may need `--vgl` (and a working VirtualGL setup) for hardware rendering.

> [!gotcha] `--log`/`--tmpdir`/`--cleanup` do nothing
> These flags are parsed but have no effect — `fvcompare` writes no log and uses
> no scratch space ([`scripts/fvcompare:432-455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L432-L455)). They exist only for
> consistency with other FreeSurfer scripts.

## Error Compensation and Guard Rails

- **Per-subject SUBJECTS_DIR defaulting.** Any of `SD1`–`SD4` not set explicitly
  falls back to `$SUBJECTS_DIR` ([`scripts/fvcompare:478-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L478-L481)).
- **Subject-1 existence is enforced** ([`scripts/fvcompare:487-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L487-L491)); subject 2
  existence is checked but not enforced (gotcha above).
- **Point-set existence is enforced** for `--p`/`--c` ([`scripts/fvcompare:414-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L414-L417)).
- **Annotation existence is enforced** when `--annot`/`--aparc` is used
  ([`scripts/fvcompare:164-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L164-L168)).
- **Forgiving argument handling.** Unknown flags are forwarded to freeview rather
  than rejected — convenient, but it removes typo protection (gotcha above).

## Known Bugs

- [[00174]] — `--pial` loads the WHITE surface (copy-paste error: the handler sets `surflist = (white)`), so the pial surface is never shown.

## Related Tools

- [[wiki/tools/freeview|freeview]] — the viewer `fvcompare` drives; every display option ultimately maps to a freeview argument.
- [[fsvglrun]] — the VirtualGL wrapper through which freeview is launched.
- [[wiki/pipelines/recon-all|recon-all]] — produces the subject reconstructions being compared.
- [[groupstatsdiff]] — group-level difference tool whose help suggests `fvcompare` for per-subject follow-up.

## Confidence and Gaps

**High confidence:** the complete flag set, the per-subject layer construction,
the overwrite-vs-append surface semantics, the inert housekeeping flags, the
non-fatal subject-2 check, and the `--pial`/`--white` collision are all read
directly from [`scripts/fvcompare`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare). Two discrepancies between the code and
the usage text (default volume `brain.finalsurfs.mgz` vs. `brainmask.mgz`; `--pial`
showing white) are resolved in favour of the code and flagged above.

> [!contradiction] Help vs. code: default volume and `--pial`
> The usage text says the default volume is `brainmask.mgz` and that `--pial`
> shows only the pial surface; the code defaults to `brain.finalsurfs.mgz`
> ([`scripts/fvcompare:507`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L507)) and makes `--pial` show **white**
> ([`scripts/fvcompare:376-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L376-L378)). Code is authoritative.

## References

- FreeSurfer source: [`scripts/fvcompare`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare) (v8.2.0).
- Built-in help: `fvcompare --help` (usage at [`scripts/fvcompare:527-554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L527-L554); explanatory body `BEGINHELP` at [`scripts/fvcompare:562-583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fvcompare#L562-L583)).
- Viewer documentation: [[wiki/tools/freeview|freeview]].
