---
title: "nmovie_qt"
type: tool
fs_version: "8.2.0"
source_language: "C++"          # Qt5/Qt6 GUI
source_files:
  - "nmovie_qt/main.cpp"
  - "nmovie_qt/MainWindow.cpp"
  - "nmovie_qt/MainWindow.h"
  - "nmovie_qt/RenderWidget.cpp"
  - "nmovie_qt/RenderWidget.h"
  - "nmovie_qt/MainWindow.ui"
families: []                     # standalone GUI viewer (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tkmedit]]"
  - "[[tksurfer]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The set of raster formats nmovie_qt accepts is whatever the host Qt build's QImageReader plugins support; it cannot read MGH/MGZ/NIfTI medical volumes directly. The exact plugin list was not enumerated on this install."
tags:
  - gui
  - visualization
  - movie
  - qt
---

# nmovie_qt

## Summary

`nmovie_qt` is a small Qt-based graphical viewer that plays a sequence of
2-D raster images (PNG, JPEG, BMP, TIFF, …) as a flip-book **movie**. You pass
it a list of image files on the command line; it loads each one, displays the
first frame in a resizable window, and gives you toolbar buttons to loop,
swing (ping-pong), step, and change playback speed, plus a frame slider and
keyboard/mouse scrubbing. It is the Qt re-implementation of the older X11/Athena
`nmovie` utility and exists purely to *display* pre-rendered images — it performs
no image computation and reads no medical-imaging volume formats.

## Source Information

- **Language:** C++ (Qt 5 or Qt 6 Widgets; built only when `BUILD_GUIS` is on — [`nmovie_qt/CMakeLists.txt:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/CMakeLists.txt#L3))
- **Source files:**
  - [`nmovie_qt/main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/main.cpp) — entry point and argument handling
  - [`nmovie_qt/MainWindow.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp) / [`MainWindow.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.h) — top-level window, file loading, key handling
  - [`nmovie_qt/RenderWidget.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp) / [`RenderWidget.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.h) — the image canvas, playback timer, mouse scrubbing
  - [`nmovie_qt/MainWindow.ui`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui) — Qt Designer layout (toolbar buttons, speed slider, frame slider)
- **Binary location:** `$FREESURFER_HOME/bin/nmovie_qt`
- **Predecessor:** [`nmovie/nmovie.c`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie/nmovie.c) — the legacy X11/Athena-widget viewer by RJ Wood that `nmovie_qt` replaces.

## Purpose and Context

FreeSurfer processing steps and QC scripts frequently emit a *stack* of snapshot
images — for example successive slices through a volume, frames of a 4-D
time-series rendered to PNG, tilted surface views, or per-iteration debug
renderings. `nmovie_qt` lets you riffle through such a stack as an animation so
you can spot motion, drift, or a misbehaving frame at a glance, without writing
a video file.

It is a **leaf utility**: nothing in [[wiki/pipelines/recon-all|recon-all]] calls
it, and it is not part of any automated pipeline (no reference appears under
`scripts/`). You invoke it interactively, usually pointed at images you produced
yourself (e.g. with `freeview --screenshot`, `convert`, or an `mri_*` tool that
writes raster output). For interactive inspection of the underlying *volumes* and
*surfaces* themselves, the heavyweight viewers
[[wiki/tools/freeview|freeview]], [[tkmedit]], and [[tksurfer]] are the right
tools; `nmovie_qt` is deliberately minimal and only knows about flat images.

The Qt version supersedes the original X11 `nmovie`, which depended on Xlib, the
Athena widget set (`X11/Xaw`), and MIT-SHM shared-memory pixmaps — a stack that
is awkward to build on modern Linux/macOS. The installed v8.2.0 tree ships only
the Qt binary (`nmovie_qt`); there is no `nmovie` binary.

## Inputs

### Required Inputs

- **One or more image files**, given as positional command-line arguments
  (`nmovie_qt img1 img2 img3 …`). At least one argument is required; with fewer
  than two `argv` entries the program prints a usage line and exits with `-1`
  ([`nmovie_qt/main.cpp:12-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/main.cpp#L12-L16)).
- Each file is loaded by constructing a Qt `QImage(filename)`
  ([`nmovie_qt/RenderWidget.cpp:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L20)). The acceptable formats are therefore
  exactly the raster formats your Qt build can decode — typically PNG, JPEG/JPG,
  BMP, GIF, PPM/PGM/PBM, XPM, TIFF, and WebP, depending on installed image
  plugins. There is no shell globbing inside the program; the **shell** expands
  any wildcards before `nmovie_qt` sees them.

### Input Assumptions

> [!assumption] Pre-rendered 2-D rasters, in display order
> `nmovie_qt` assumes its arguments are ordinary 2-D image files and that the
> **command-line order is the playback order** — the frame list is built by
> appending `argv[1] … argv[argc-1]` verbatim
> ([`nmovie_qt/MainWindow.cpp:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L32-L36)). To play frames in numeric
> sequence, name them so the shell sorts them correctly (e.g.
> `frame0001.png … frame0120.png`) or list them explicitly.

- The frames need **not** be the same size: each frame is scaled independently to
  fit the canvas when *Auto Rescale* is on (see [Outputs](#outputs) and
  [Mathematical Foundations](#mathematical-foundations)). With *Auto Rescale*
  off, frames are drawn at native pixel size anchored at the top-left.
- Files that Qt cannot decode are **silently skipped** with a warning rather than
  aborting the program (`QImage::isNull()` → `qWarning(...)`,
  [`nmovie_qt/RenderWidget.cpp:21-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L21-L31)).

> [!gotcha] Not a medical-volume viewer
> `nmovie_qt` reads only what `QImage` understands. It does **not** read
> [[mgz]], MGH, NIfTI, DICOM, or any FreeSurfer volume/surface format. Convert or
> screenshot those to PNG/JPEG first (e.g. via
> [[wiki/tools/freeview|freeview]] screenshots), then animate the PNGs.

## Outputs

`nmovie_qt` writes **no output files**. Its only product is the on-screen
animation. The single piece of persistent state it keeps is the main-window
geometry, which is saved to and restored from `QSettings`
([`nmovie_qt/MainWindow.cpp:18-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L18-L19), [`27-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L27-L29)) — on Linux this lands in a
per-user config file under `~/.config` keyed by the application/organisation name.

### Display Behaviour

- The window title is set to the current frame's file name plus `" - nmovie"`
  ([`nmovie_qt/MainWindow.cpp:56-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L56-L58)); each loaded `QImage` carries
  `FileName` and `FullPath` text fields set at load time
  ([`nmovie_qt/RenderWidget.cpp:23-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L23-L25)).
- A horizontal **frame slider** at the bottom is kept in sync with the current
  frame; dragging it jumps to that frame
  ([`nmovie_qt/MainWindow.cpp:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L22), [`60-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L60-L62)).

## Mathematical Foundations

None — `nmovie_qt` is a pure display utility and performs no image processing,
registration, or intensity transformation. The only quantitative operations are
bookkeeping for animation and one cosmetic geometric rescale:

> [!math] Per-frame fit-to-window scaling (cosmetic only)
> When *Auto Rescale* is on, each frame $I$ is resampled to the largest size that
> fits the canvas rectangle $R$ while preserving aspect ratio, using bilinear
> ("smooth") interpolation, then centred:
> $$\text{offset} = \left(\frac{R_w - I'_w}{2},\; \frac{R_h - I'_h}{2}\right)$$
> via `QImage::scaled(rc.size(), Qt::KeepAspectRatio, Qt::SmoothTransformation)`
> ([`nmovie_qt/RenderWidget.cpp:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L58), [`62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L62)). Rescaled frames are cached
> per-frame and the cache is invalidated on window resize
> ([`nmovie_qt/RenderWidget.cpp:55-59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L55-L59), [`68-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L68-L73)). This changes only how the
> image is *shown*, never the source pixels (no file is written).

> [!math] Playback timing
> Frame advance is driven by a `QTimer` whose interval (in milliseconds) is
> $\text{interval} = 100 - s$ for speed-slider value $s \in [0,100]$, clamped so
> intervals below 50 ms are nudged up by one
> ([`nmovie_qt/RenderWidget.cpp:194-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L194-L200)). Larger $s$ ⇒ shorter interval
> ⇒ faster movie; the slider's default value is 60 (≈40 ms ≈ 25 fps,
> [`nmovie_qt/MainWindow.ui:95-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui#L95-L99); the constructor default interval is 40 ms,
> [`nmovie_qt/RenderWidget.cpp:11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L11)).

## Configuration Options

### Complete Flag Reference

`nmovie_qt` has **no option parser**. It does not use FreeSurfer's
`handleVersionOption`/`get_option` machinery and recognises **no flags** — every
command-line token is treated as an image file path. The only command-line
contract is the positional argument list below.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<image file> …` | one or more file paths (positional) | *(at least one required)* | Raster image files to load as movie frames, in the given order. Parsed in [`nmovie_qt/main.cpp:12-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/main.cpp#L12-L22) and appended to the frame list in [`nmovie_qt/MainWindow.cpp:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L32-L36). |

> [!gotcha] `--help`, `-version`, and every other "flag" are read as filenames
> Because there is no flag parsing, `nmovie_qt --help` does **not** print help —
> it tries to open a file literally named `--help`, fails to decode it
> (`"--help can not be loaded as image file"`), loads zero frames, and then
> **crashes** when it indexes the empty frame list (see
> [Gotchas](#gotchas-and-caveats)). The usage string is only emitted when the
> argument list is empty ([`nmovie_qt/main.cpp:12-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/main.cpp#L12-L16)). This was confirmed by
> running the installed binary.

### Interactive Controls (the real "options")

All user configuration happens **inside the GUI**, not on the command line. The
controls come from the toolbar/layout in
[`nmovie_qt/MainWindow.ui`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui), wired to slots on the render widget.

| Control | Kind | Default | Effect | Source |
|---------|------|---------|--------|--------|
| **Loop** | button | — | Play forward continuously, wrapping `last → first`; starts the timer at the current speed and resets to frame 0. | [`RenderWidget.cpp:118-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L118-L123) |
| **Swing** | button | — | "Ping-pong" playback: advance to the last frame, then reverse to the first, repeating (bounces at both ends). | [`RenderWidget.cpp:125-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L125-L130), [`153-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L153-L186) |
| **Speed** (Slow ↔ Fast) | slider 0–100 | 60 | Sets playback rate; interval $=100-s$ ms (see [timing](#mathematical-foundations)). | [`RenderWidget.cpp:194-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L194-L200), [`MainWindow.ui:78-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui#L78-L105) |
| **Stop** | button | — | Stop the playback timer (freeze on the current frame). | [`RenderWidget.cpp:148-151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L148-L151) |
| **Back** | button | — | Step one frame backward, wrapping `first → last`. | [`RenderWidget.cpp:132-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L132-L138) |
| **Forward** | button | — | Step one frame forward, wrapping `last → first`. | [`RenderWidget.cpp:140-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L140-L146) |
| **Auto Rescale** | toggle | **on** | Scale each frame to fit the window (aspect-preserving, smooth); off ⇒ draw at native size, top-left anchored. | [`RenderWidget.cpp:48-66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L48-L66), [`188-192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L188-L192), [`MainWindow.ui:174-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui#L174-L189) |
| **Quit** | button | — | Close the window / exit. | [`MainWindow.ui:281-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui#L281-L296) |
| **Frame slider** | slider | range `0 … N-1` | Scrub directly to an arbitrary frame; stays in sync with playback. | [`MainWindow.cpp:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L22), [`43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L43) |

**Keyboard shortcuts** (handled in [`MainWindow::keyPressEvent`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L46-L54) and via a `QAction`):

| Key | Action | Source |
|-----|--------|--------|
| `←` (Left) | Step backward one frame | [`MainWindow.cpp:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L48-L49) |
| `→` (Right) | Step forward one frame | [`MainWindow.cpp:50-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L50-L51) |
| `Esc` | Close the window | [`MainWindow.cpp:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L52-L53) |
| `Ctrl+Q` | Quit the application | [`MainWindow.cpp:14-17`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L14-L17) |

**Mouse scrubbing:** press-and-drag the canvas **vertically** to step through
frames — dragging down advances, dragging up rewinds, one frame per pixel of
vertical motion ([`RenderWidget.cpp:75-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L75-L109)).

### Configuration Interactions

- **Loop vs. Swing** are alternative play modes selected by the same timer; the
  `m_bSwing` flag chosen by the last button pressed decides whether `OnTimer`
  wraps (`last→first`) or bounces (`OnLoop` sets `m_bSwing=false`, `OnSwing` sets
  it true — [`RenderWidget.cpp:118-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L118-L130), [`153-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L153-L186)). Pressing one after the
  other simply switches mode; **Stop** halts whichever is running.
- **Speed** can be changed live; it updates the running timer's interval
  immediately ([`RenderWidget.cpp:199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L199)).
- **Auto Rescale** interacts with window resizing: turning it on (or resizing the
  window) discards the per-frame scaled cache so frames are re-fit on next paint
  ([`RenderWidget.cpp:68-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L68-L73), [`188-192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L188-L192)).

## Typical Use Cases

### Use Case 1: Animate a stack of slice/snapshot PNGs

```bash
# Frames named so the shell sorts them in order; loaded in that order.
nmovie_qt /tmp/snap_*.png
```

Opens the viewer on the first frame. Click **Loop** to play, drag the **Speed**
slider toward *Fast*, and use **Stop** / the **frame slider** to inspect a
specific frame.

### Use Case 2: Compare two registrations by flipping between them

```bash
# Two co-registered overlays exported as PNG; "swing" flips A↔B↔A…
nmovie_qt before.png after.png
```

Press **Swing** (or just tap `←`/`→`) to flicker between the two images — a
classic way to see whether two volumes are aligned.

### Use Case 3: Review a rendered time-series at native resolution

```bash
nmovie_qt frame0001.png frame0002.png frame0003.png ... frame0120.png
```

Toggle **Auto Rescale** off to view frames at their original pixel size, then
drag the canvas up/down with the mouse to scrub frame-by-frame.

## Pipeline Context

`nmovie_qt` is **not** part of [[wiki/pipelines/recon-all|recon-all]] or any
automated stream — no `scripts/` entry invokes it (`grep -rn nmovie scripts/`
returns nothing). It is an optional, hand-run inspection aid that sits *after*
whatever step produced the raster frames.

**Predecessor:** any tool that writes raster snapshots (e.g.
[[wiki/tools/freeview|freeview]] `--screenshot`, ImageMagick `convert`, a custom
render script) → **nmovie_qt** (interactive review) → **Successor:** none (no
files are produced).

## Gotchas and Caveats

> [!gotcha] Launching with zero loadable images crashes the viewer
> If none of the arguments decodes to a valid image, the frame list is empty but
> the code unconditionally calls `SetCurrentImageIndex(0)` only when the list is
> non-empty ([`RenderWidget.cpp:32-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L32-L37)); however
> `MainWindow::Load` still sets the frame-slider range to `[0, -1]` and the warning
> dialog path can be reached ([`MainWindow.cpp:38-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L38-L43)). Passing a non-image
> token such as `--help` produces `"--help can not be loaded as image file"` and
> the process then dumps core (observed on the installed v8.2.0 binary). **Always
> pass real image files.**

> [!gotcha] Argument order is playback order — there is no internal sort
> Frames play in exactly the order given on the command line. Rely on the shell's
> glob expansion order (lexical) or list files explicitly; zero-pad numeric frame
> names (`frame0001.png`) so lexical order matches numeric order.

> [!gotcha] Speed slider is inverted relative to interval, and bottoms out
> Moving toward *Fast* increases the slider value $s$, which **decreases** the
> timer interval ($100-s$ ms). The interval is floored near 50 ms (with a +1
> nudge), so the very top of the slider does not keep getting arbitrarily faster
> ([`RenderWidget.cpp:194-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L194-L200)).

> [!gotcha] Mouse drag is vertical, not horizontal
> Scrubbing with the mouse responds to **up/down** motion on the canvas; left/right
> dragging does nothing ([`RenderWidget.cpp:84-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L84-L109)). The horizontal frame
> slider at the bottom is the horizontal scrubbing control.

> [!gotcha] No file dialog — files must be on the command line
> There is no "Open" menu. The only way to load images is to name them when
> launching; you cannot add or remove frames from within the running window.

## Error Compensation and Guard Rails

- **Undecodable files are skipped, not fatal.** Any argument Qt cannot read is
  reported with `qWarning` and dropped from the frame list
  ([`RenderWidget.cpp:21-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp#L21-L31)); the movie is built from whatever loaded.
- **"No image loaded" dialog.** If the loaded count is zero, `MainWindow::Load`
  pops a warning message box and closes the window
  ([`MainWindow.cpp:38-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L38-L43)) — though, per the gotcha above, certain
  inputs reach the empty-index path and crash first.
- **Mismatched frame sizes are handled** by the per-frame fit-to-window scaling
  (Auto Rescale on) rather than erroring; with it off, oversized frames are simply
  clipped to the canvas.
- **Window geometry is remembered** across sessions via `QSettings`
  ([`MainWindow.cpp:18-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L18-L19), [`27-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp#L27-L29)).

## Related Tools

- [[wiki/tools/freeview|freeview]] — the full-featured FreeSurfer viewer; use it
  to inspect volumes/surfaces interactively and to *generate* the PNG screenshots
  that `nmovie_qt` then animates.
- [[tkmedit]] — legacy volume viewer/editor; another source of slice snapshots.
- [[tksurfer]] — legacy surface viewer; can export the surface-view images you
  might flip through in `nmovie_qt`.
- `nmovie` *(legacy, no wiki page)* — the original X11/Athena image-display
  utility ([`nmovie/nmovie.c`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie/nmovie.c)) that `nmovie_qt` replaces; not built/installed in v8.2.0.

## Confidence and Gaps

**High confidence:** the complete (empty) flag set, the positional-argument
contract, every GUI control and its slot, the keyboard and mouse bindings, the
speed/interval relationship, the fit-to-window scaling, and the no-output nature
of the tool — all read directly from
[`nmovie_qt/main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/main.cpp),
[`MainWindow.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.cpp),
[`RenderWidget.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/RenderWidget.cpp), and
[`MainWindow.ui`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie_qt/MainWindow.ui). The `--help`-crash behaviour was confirmed by
running the installed binary.

> [!gap] Exact accepted image formats are build-dependent
> The readable formats are whatever the host Qt's `QImageReader` plugins provide
> (PNG/JPEG/BMP/TIFF/… are typical). The precise list on this install was not
> enumerated. Medical-imaging volume formats (MGH/MGZ/NIfTI/DICOM) are **not**
> supported.

## References

- FreeSurfer source (v8.2.0): [`nmovie_qt/`](https://github.com/freesurfer/freesurfer/tree/v8.2.0/nmovie_qt) — `main.cpp`, `MainWindow.cpp/.h`, `RenderWidget.cpp/.h`, `MainWindow.ui`.
- Legacy predecessor: [`nmovie/nmovie.c`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/nmovie/nmovie.c) (original X11/Athena viewer, "image display utility", RJ Wood).
- Qt documentation: `QImage`, `QImageReader` (supported image formats), `QTimer` — for the rendering, decoding, and timing primitives used here.
