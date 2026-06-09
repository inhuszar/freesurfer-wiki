---
title: "FreeView — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 11
last_agent_update: 2026-06-09
tags:
  - faq
  - freeview
  - tkregisterfv
  - tksurferfv
  - gui
  - visualization
  - headless
---

# FreeView — Frequently Asked Questions

This FAQ collects recurring questions about [[wiki/tools/freeview|freeview]], FreeSurfer's
primary GUI for visualising and editing volumes, surfaces, labels,
segmentations, and tractography. It also covers the FreeView-based
replacements for the legacy TclTk tools — [[tkregisterfv]] (replaces
`tkregister2`) and [[tksurferfv]] (replaces `tksurfer`) — and headless
batch rendering with [[fsxvfb]]. Common topics include OpenGL/display
requirements, the native MNI305 coordinate readout, manual editing
workflows (volume edits, control points, surface labels), cross-version
compatibility of edit files, and running FreeView on WSL2 or HPC
clusters without a display.

> For tool reference, see [[wiki/tools/freeview|freeview]], [[freeview-editing]],
> [[freeview-volumes]], [[freeview-surfaces]], [[freeview-3d-view]],
> [[freeview-command-line]], and [[freeview-keyboard-mouse]].
> For the legacy tools, see [[tkregister2]] and [[tksurfer]].

---

## Display environment and OpenGL

### Why does FreeView display volumes but the Voxel Edit / Recon Edit pop-up menus stop responding?

**Short answer:** FreeView's editing pop-up menus require OpenGL
hardware acceleration for hit-testing; if the GPU is disabled or
software rendering is in use, the editing controls will not respond
even though the display itself works.

**Detail:** Wang (FreeSurfer developer) confirmed that FreeView uses an
OpenGL-accelerated hit test for its edit pop-up menus (Voxel Edit, Recon
Edit, surface label editing). When users disable a problematic GPU
(e.g. Intel Iris XE) to fix display problems, the side effect is that
the editing menus stop working — display works through software
rendering, but the hit-test path that maps mouse clicks to voxels
requires hardware OpenGL. This is most often seen on Windows with WSL2
plus an X-server. Mitigations:

- Update the GPU driver to the latest version.
- Switch from Xming to MobaXterm or VcxSrv (see WSL2 entry below).
- Use the official FreeSurfer Ubuntu VirtualBox VM, whose internal
  X-server provides full OpenGL support.

> [!gotcha] Mesa software rendering (`llvmpipe`) is generally
> insufficient for FreeView's editing features. If `glxgears` runs but
> shows the `LIBGL_ALWAYS_SOFTWARE` banner, edit pop-ups will likely
> remain unresponsive.

**Provenance:** Mailing list, 2023-06-23 (Wang / Fischl). See
`raw/mailing-list/2023-06-freeview-opengl-required-for-volume-editing.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[freeview-editing]], [[installation-and-platform]], [[fsvglrun]]

---

### My FreeView shows pial surfaces grossly misaligned from `brain.mgz` after a fresh install — what's wrong?

**Short answer:** FreeView is loading the wrong Qt libraries (system Qt
instead of the bundled FreeSurfer Qt) or the environment variable
`FS_DISABLE_LANG=true` is set in `.bashrc`; remove the offending
configuration and reinstall via the official `.deb`.

**Detail:** Two independent root causes were identified on Ubuntu 22.04
running FS 7.4.1:

1. **Qt library conflict** (fsbuild). FreeSurfer ships its own Qt
   libraries. Setting `LD_LIBRARY_PATH` or `Qt*` environment variables
   in your shell init file before sourcing `SetUpFreeSurfer.sh`, or
   installing `qt5-default` system-wide, can cause FreeView to load the
   wrong Qt runtime — visible as grossly misaligned surfaces over the
   underlying volume.
2. **`FS_DISABLE_LANG=true`** (Marina Fernández, corroborated by
   fsbuild). This stale variable from older VM images causes FreeView
   surface display problems. The official FS 7 installers do not set
   it; remove the line from `.bashrc`.

The recommended `.bashrc` for FreeSurfer is minimal:

```bash
export FREESURFER_HOME=/usr/local/freesurfer
source $FREESURFER_HOME/SetUpFreeSurfer.sh
```

If misalignment persists after a clean reinstall, inspect surface
geometry with `mris_info` (NOT [[mri_info]] — `mri_info` operates on
volumes only):

```bash
mris_info $SUBJECTS_DIR/SUBJECT/surf/lh.pial   # check vg.valid and c_(ras)
```

> [!gotcha] Do not pre-set `LD_LIBRARY_PATH` or any `Qt*` environment
> variable before sourcing `SetUpFreeSurfer.sh`. Doing so is the most
> common cause of subtle FreeView rendering bugs on Linux VMs.

**Provenance:** Mailing list, 2023-10-14 to 2023-10-17 (fsbuild /
Wang / Huang / Fernández). See
`raw/mailing-list/2023-10-freeview-misaligned-surfaces-qt-installation-fs-disable-lang.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[freeview-surfaces]], [[mri_info]],
[[installation-and-platform]]

---

### How do I get FreeView to work on Windows under WSL2?

**Short answer:** Install a Windows X-server (MobaXterm or VcxSrv are
more reliable than Xming for WSL2), validate connectivity with
`glxgears`, and follow the FreeSurfer WSL wiki page for the correct
`DISPLAY` setting.

**Detail:** WSL2 does not expose a native X display, so FreeView's
typical Qt error on first launch is

```
could not connect to display :0
This application failed to start because no Qt platform plugin
could be initialized.
Available platform plugins are: eglfs, linuxfb, minimal,
minimalegl, offscreen, vnc, wayland-egl, wayland, webgl, xcb.
```

The presence of `xcb` in the plugin list is misleading — the plugin is
present but cannot connect to an X server. fsbuild's diagnostic
sequence:

```bash
sudo apt install mesa-utils
glxgears   # spinning gears = X11 + OpenGL forwarding works
```

If `glxgears` opens a window, FreeView should also work. Server choices:

| X-server   | WSL2 reliability        |
|------------|-------------------------|
| Xming      | Often fails             |
| MobaXterm  | Usually works           |
| VcxSrv     | Usually works           |

The `DISPLAY` environment variable may need to be set explicitly
(`export DISPLAY=:0` or the Windows host IP — see the WSL setup
page below). Reference: `https://surfer.nmr.mgh.harvard.edu/fswiki/FS7_wsl_ubuntu`.

> [!gap] For remote HPC use, accelerated X-Windows over TigerVNC is a
> separate workflow from WSL2 X-server forwarding. The mailing list
> mentions it briefly but does not document the full setup.

**Provenance:** Mailing list, 2025-02-02 (fsbuild). See
`raw/mailing-list/2025-02-freeview-wsl2-display-xserver-tigervnc-mobaxterm.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[installation-and-platform]]

---

## Coordinate display

### How do I read MNI305 (Talairach) coordinates for a voxel in FreeView?

**Short answer:** Just look at the coordinate panel — FreeView shows
MNI305 coordinates natively alongside RAS and TkRegRAS, with no manual
matrix computation needed.

**Detail:** When a subject is loaded with a valid
`mri/transforms/talairach.xfm`, FreeView's coordinate readout panel
shows three coordinate systems simultaneously for whatever voxel the
cursor is on:

- **RAS** — scanner/native RAS coordinates of the volume.
- **TkRegRAS** — FreeSurfer's surface-space (tkr) RAS.
- **MNI305** — computed in real time by applying `talairach.xfm` to
  the RAS position.

```bash
freeview $SUBJECTS_DIR/SUBJECT/mri/T1.mgz
# click any voxel; the coordinate panel at the bottom shows all three
```

If MNI305 coordinates are absent from the panel, `talairach.xfm` is
missing or unreadable. The file is generated by `recon-all -autorecon1`
(the `gcareg` step):

```bash
ls $SUBJECTS_DIR/SUBJECT/mri/transforms/talairach.xfm
```

For a programmatic conversion, apply the matrix in `talairach.xfm` to
the RAS coordinates (or use `mri_vol2vol` to transform a point cloud
to MNI305 space).

**Provenance:** Mailing list, 2023-08-20 (Greve). See
`raw/mailing-list/2023-08-freeview-displays-mni305-coordinates-natively.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[freeview-volumes]], [[coordinate-systems]],
[[talairach.xfm]]

---

## Manual editing

### Can I generate a surface label that grows outward from a single seed vertex?

**Short answer:** Yes — either pick the vertex in FreeView and use its
morphological label dilation (graph distance, in iterations), or use
[[mri_binarize]] `--dilate-vertex` on the command line for a
millimeter-radius label.

**Detail:** Two complementary methods exist; pick by what you need:

| Method | Distance metric                    | Unit            |
|--------|------------------------------------|-----------------|
| FreeView morphological dilation | Graph distance (vertex hops) | iterations      |
| `mri_binarize --dilate-vertex`  | Euclidean approximation (area = πr²) | millimetres     |

**FreeView GUI workflow** (Fischl, 2023-08-22): select a single vertex,
make a label from that vertex, then dilate the label as many times as
needed using FreeView's surface morphological tools. Note: this is
graph distance, not true surface geodesic distance — close enough for
qualitative use.

**Command-line workflow** (Greve, 2023-08-23):

```bash
mri_binarize --dilate-vertex vno lh.white radius out.mgz
```

- `vno` — zero-based vertex index of the seed
- `lh.white` — surface to operate on
- `radius` — desired radius in millimetres
- The tool grows the label by progressively adding neighbours until
  the cumulative area equals π·r².

> [!gotcha] Neither method computes true geodesic distance along the
> surface manifold. Graph distance and area-equivalent radius diverge
> from geodesic extent in highly folded regions (gyral crowns, sulcal
> fundi). If precise geodesic extent matters, post-process with a
> dedicated geodesic algorithm.

**Provenance:** Mailing list, 2023-08-22 to 2023-08-23 (Fischl /
Greve). See
`raw/mailing-list/2023-08-freeview-surface-label-from-vertex-dilate-mri-binarize.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[freeview-surfaces]], [[freeview-editing]],
[[mri_binarize]]

---

### Can I make manual edits in an older FreeView (e.g. FS 5) on data processed by a newer recon-all (FS 7)?

**Short answer:** Yes — manual edit files (`wm.mgz`, `brainmask.mgz`,
control-point `.dat`, `.label`) have stable formats across major
versions, so older FreeView edits feed correctly into newer recon-all
reruns. It's possible, but not recommended.

**Detail:** Greve confirmed this works (2024-01-01). The edit files
written by FreeView are standard FreeSurfer formats whose layout has
not changed across major versions, so the round-trip is:

1. Process subject with `recon-all` in FS 7.x.
2. Open `wm.mgz` / `brainmask.mgz` / control points in FS 5.x FreeView,
   make edits, save.
3. Resume in FS 7.x with `recon-all -autorecon2-wm -autorecon3`.

fsbuild (2023-12-20) listed substantial improvements in FS 6/7 FreeView
that FS 5 lacks:

- `fsxvfb` headless rendering for batch screenshots.
- [[filled.mgz]] editing as an alternative to direct `wm.mgz` editing.
- Landmark-based surface repositioning via JSON point sets at
  `subject/surf/repos.$hemi.$surf.json`.
- ODF visualisation for diffusion data.
- Surface path / label editing and surface annotation editing.
- Geodesic Matting algorithm-assisted segmentation.

> [!gotcha] FS 5.x FreeView dates from 2013 and is no longer supported
> — bugs will not be fixed. The FreeSurfer team recommends updating to
> 7.4.1 or later before doing any new editing work.

**Provenance:** Mailing list, 2023-12-13 to 2024-01-01 (Edwards / Greve
/ fsbuild). See
`raw/mailing-list/2023-12-freeview-version-cross-compatibility-editing.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[freeview-editing]], [[wiki/pipelines/recon-all|recon-all]],
[[wm.mgz]], [[filled.mgz]], [[brainmask.mgz]]

---

### Should I edit `wm.mgz` directly, or is there an alternative?

**Short answer:** In FS 6+ you can edit [[filled.mgz]] instead of
[[wm.mgz]]; both routes feed the same `recon-all -autorecon2-wm
-autorecon3` rerun.

**Detail:** Direct `wm.mgz` editing is the classic workflow, but
`filled.mgz` editing was added in FS 6.x as an alternative further down
the pipeline. `filled.mgz` is shown in FreeView's outline mode by
default, which makes hemispheric topology corrections easier to see.
The downstream rerun command is identical for both:

```bash
recon-all -s SUBJECT -autorecon2-wm -autorecon3
```

> [!gap] The exact rules governing when `wm.mgz` edits are propagated
> versus when `filled.mgz` edits are preferred are not spelled out in
> the mailing list. Both are accepted by `recon-all`; choose by what is
> easier to edit visually for your defect.

**Provenance:** Mailing list, 2023-12-20 (fsbuild). See
`raw/mailing-list/2023-12-freeview-version-cross-compatibility-editing.md`.

**Related:** [[freeview-editing]], [[wiki/pipelines/recon-all|recon-all]], [[wm.mgz]],
[[filled.mgz]]

---

## Headless / batch rendering

### How do I take FreeView screenshots in an `sbatch` job (no display attached)?

**Short answer:** Wrap the FreeView call in `fsxvfb`, which provides a
virtual framebuffer and finds an unused display port automatically.

**Detail:** `fsxvfb` is a FreeSurfer wrapper around `Xvfb` (X virtual
framebuffer). It allocates a free display number (starting at 10),
runs the enclosed graphical command in that virtual display, and
releases the port on exit. Greve's example:

```bash
fsxvfb freeview -v orig.mgz -viewport x -ss pic1.jpg
```

Typical SLURM script for QC screenshots:

```bash
#!/bin/bash
#SBATCH --nodes=1
cd $SUBJECTS_DIR/$SUBJECT/mri
fsxvfb freeview -v orig.mgz -f ../surf/lh.white \
       -viewport x -ss qc_axial.jpg
```

Use multiple `-viewport` flags (`x`, `y`, `z`) to capture different
slice orientations in one invocation. `fsxvfb` is the officially
supported headless route for any graphical FreeSurfer command; it is
not limited to FreeView.

**Common error:** `could not connect to display :1.0`. This usually
means a previous `fsxvfb` process died without cleaning up its lock
file. Diagnose:

```bash
ls /tmp/.X*-lock      # one lock file per active display number
```

Delete stale lock files (or kill orphaned `Xvfb` processes); a reboot
clears them all.

> [!gotcha] `mri_snapshot` exists in some installations as a simpler
> volume-screenshot tool but is not present in every FS distribution.
> The [[fsxvfb]] + `freeview` combination is the supported route.

**Provenance:** Mailing list, 2024-12-02 (Greve). See
`raw/mailing-list/2024-12-fsxvfb-headless-freeview-screenshots-sbatch.md`.

**Related:** [[wiki/tools/freeview|freeview]], [[freeview-command-line]], [[fsxvfb]], [[nmovie_qt]]

---

## Replacements for legacy tkregister2 / tksurfer

### `tkregister2` fails with a TclTk error after upgrading FreeSurfer — what do I use instead?

**Short answer:** Use tkregisterfv — a FreeView-based wrapper that
takes the same `--mov`, `--targ`, and `--reg` arguments. TclTk-based
tools (including [[tkregister2]]) were deprecated in FS 7.4.1.

**Detail:** TclTk support was removed in FreeSurfer 7.4.1, so
`tkregister2` and other TclTk binaries no longer work in FS 7.4.1+
(including FS 8.x). The drop-in replacement is `tkregisterfv`:

```bash
# Old (deprecated):
tkregister2 --mov moving.mgz --targ target.mgz --reg reg.lta --s SUBJECT

# New:
tkregisterfv --mov moving.mgz --targ target.mgz --reg reg.lta
```

Common workflows:

```bash
# Inspect bbregister output quality
tkregisterfv --mov func.nii.gz --targ T1.mgz --reg bbregister.lta

# With surface overlay
tkregisterfv --mov func.nii.gz --reg bbregister.lta --s SUBJECT
```

> [!gotcha] Some older shell scripts and QC utilities (older
> `bbregister` wrappers, custom `tkmedit` wrappers) call `tkregister2`
> internally. After upgrading to FS 7.4.1+, those scripts must be
> updated to call `tkregisterfv` — they will otherwise hang or fail
> with TclTk errors.

**Provenance:** Mailing list, 2023-10-15 (Greve). See
`raw/mailing-list/2023-10-tkregister2-deprecated-use-tkregisterfv.md`.

**Related:** tkregisterfv, [[tkregister2]], [[bbregister]],
[[wiki/tools/freeview|freeview]]

---

### `tksurfer` is gone — how do I migrate my `tksurfer -tcl my.tcl` automation?

**Short answer:** [[tksurferfv]] replaces [[tksurfer]] for interactive
viewing, but FreeView does not support Tcl scripts; rewrite Tcl
automation as FreeView CLI flags, `-cmd` invocations, or Python
(PySurfer / nilearn).

**Detail:** `tksurferfv` is a bash wrapper that launches FreeView with
surface-viewing arguments equivalent to `tksurfer`. It does not
support `-tcl` and there is no FreeView equivalent — fsbuild
(2024-01-06) explicitly stated that running Tcl/Tk scripts is not
supported in FreeView. `tksurferfv --help`:

```
tksurferfv subject hemi surface ....

-tksurfer  : use tksurfer instead of freeview
-all       : load white, pial, inflated
-vgl / -no-vgl
-no-outline
-neuro     : neurological orientation
-rotate-around-cursor (-rca)
-linear, -linearopaque, -piecewise, -min_to_max (default)
```

Basic usage:

```bash
tksurferfv subject lh pial
tksurferfv subject lh pial -all
tksurferfv subject lh pial -overlay thickness.mgh
```

Migration paths for Tcl scripts:

- **Interactive workflows** — convert to FreeView GUI operations or
  rewrite in Python.
- **Batch screenshots** — use FreeView's `-screenshot`/`-ss` flag and
  command-line options, optionally inside `fsxvfb` for headless
  execution.
- **Limited scripted commands** — FreeView's `-cmd` flag accepts a
  small subset of operations.
- **Programmatic surface visualisation** — PySurfer (`surfer`),
  `nilearn`, or similar Python libraries.

The `-tksurfer` flag of `tksurferfv` falls back to the legacy
`tksurfer` binary if it is still present in your installation; this
is not guaranteed in current releases.

**Provenance:** Mailing list, 2024-01-06 (fsbuild). See
`raw/mailing-list/2024-01-tksurfer-deprecated-replaced-by-tksurferfv-no-tcl-support.md`.

**Related:** [[tksurferfv]], [[tksurfer]], [[wiki/tools/freeview|freeview]],
[[freeview-surfaces]], [[freeview-command-line]]

---

### Is there a single command that summarises which legacy GUI tools have FreeView replacements?

**Short answer:** `tkregister2 → tkregisterfv`, `tksurfer → tksurferfv`,
`tkmedit → tkmeditfv`; all three wrappers launch [[wiki/tools/freeview|freeview]] with
arguments matching the legacy tool, but Tcl scripts (`-tcl`) are not
supported.

**Detail:** Three TclTk-era GUI tools have FreeView-based shell-script
wrappers shipped with FS 7.4.1+:

| Legacy (deprecated) | Replacement     | Notes                                    |
|---------------------|-----------------|------------------------------------------|
| [[tkregister2]]     | tkregisterfv | Same `--mov`, `--targ`, `--reg` flags    |
| [[tksurfer]]        | [[tksurferfv]]   | No `-tcl` support; subset of flags       |
| [[tkmedit]]         | [[tkmeditfv]]    | Volume + segmentation viewer wrapper     |

All three are thin bash wrappers that call `freeview` with appropriate
arguments. Tcl scripting is not supported by any of them; convert
automation to FreeView CLI flags, `-cmd`, `fsxvfb` for headless mode,
or Python alternatives.

> [!gap] The exact set of `tksurfer` / `tkmedit` flags that have been
> ported to the `*fv` wrappers vs. silently dropped is not exhaustively
> documented. Run `<tool>fv --help` for the up-to-date list in your
> installation.

**Provenance:** Mailing list, 2023-10-15 (Greve) and 2024-01-06
(fsbuild). See
`raw/mailing-list/2023-10-tkregister2-deprecated-use-tkregisterfv.md`
and
`raw/mailing-list/2024-01-tksurfer-deprecated-replaced-by-tksurferfv-no-tcl-support.md`.

**Related:** tkregisterfv, [[tksurferfv]], [[tkmeditfv]],
[[wiki/tools/freeview|freeview]], [[freeview-command-line]]
