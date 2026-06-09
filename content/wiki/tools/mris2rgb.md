---
title: "mris2rgb"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris2rgb/mris2rgb.cpp"
  - "mris2rgb/oglutil.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[wiki/tools/freeview|freeview]]"
  - "[[tksurfer]]"
  - "[[mris_convert]]"
  - "[[mris_curvature]]"
  - "[[mris_flatten]]"
  - "[[surface-representations]]"
  - "[[curv-format]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Requires a live X11/GLX display and OpenGL; could not be executed headless, so flag behaviour is taken from the source parser, not from a run."
  - "Several flags set spatio-temporal/statistical render modes (-time, -stan, -lin, -cscale, -legend, -fthresh family) whose visual effect lives in oglutil.cpp/OGLUcompile and was not rendered."
tags:
  - surface
  - visualization
  - rendering
  - rgb
  - tiff
  - opengl
  - legacy
---

# mris2rgb

## Summary

`mris2rgb` renders a FreeSurfer cortical surface to off-screen image files. It
loads one or more surfaces (or flattened patches), draws each from a set of
canonical anatomical viewpoints (lateral, medial, dorsal, ventral, frontal,
posterior) using OpenGL into an X11 pixmap, and saves each rendered view as an
SGI `.rgb` image — or, with `-tiff`, as a TIFF. It can colour the surface by a
curvature/overlay file, mark vertices or label regions, overlay a thresholded
statistical `.w` overlay (with optional soap-bubble interpolation), and apply
rigid view rotations. It is the batch, command-line ancestor of interactive
surface viewers like [[tksurfer]] and [[wiki/tools/freeview|freeview]], used
historically to produce surface "snapshot" galleries (e.g. via the
`morph_rgb-lh`/`morph_rgb-rh` scripts).

## Source Information

- **Language:** C++ (legacy C-style; OpenGL/GLX + X11)
- **Source files:** [`mris2rgb/mris2rgb.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp), [`mris2rgb/oglutil.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/oglutil.cpp) (the OpenGL surface compiler `OGLUcompile`, lighting, FOV, coordinate-line drawing)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris2rgb`
- **Output libraries:** SGI RGB (`rgb.h`, `iopen`/`putrow`) and libtiff (`TIFFOpen`/`TIFFWriteEncodedStrip`)

## Purpose and Context

Before interactive 3-D surface viewers became standard, FreeSurfer produced
surface visualisations as fixed-viewpoint raster images for QC galleries and
figures. `mris2rgb` is that batch renderer: feed it surfaces and it writes one
image per requested view, with the surface coloured by curvature, a parametric
overlay, marked vertices, or labels. The shipped `morph_rgb-lh`/`morph_rgb-rh`
scripts use it to snapshot a subject's registered sphere coloured by `sulc`.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is an optional
visualisation utility. For modern interactive surface viewing and screenshotting,
[[wiki/tools/freeview|freeview]] supersedes it. `mris2rgb` remains useful for
scripted, headless-style batch rendering — though it does require an X server
with GLX (see gotchas).

> [!gotcha] Needs a live X11 + OpenGL/GLX display
> `mris2rgb` opens an X display and a GLX context at start-up
> ([`mris2rgb/mris2rgb.cpp:1032-1051`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L1032-L1051)); it exits with "could not open display"
> or "X server has no OpenGL GLX extension" if none is available. The
> `morph_rgb-*` scripts set `DISPLAY :0.0` before calling it. It is not a true
> off-screen-only renderer.

## Inputs

### Required Inputs

- **One or more input surfaces** followed by an **output directory** — the last
  positional argument is the output directory, all preceding positionals are
  surfaces ([`mris2rgb/mris2rgb.cpp:221-244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L221-L244)). Surfaces are read with `MRISread`;
  see [[surface-representations]] and [[surface-format]].
- The **hemisphere** is inferred from the two characters before the first `.` in
  the surface file name (e.g. `lh`, `rh`), defaulting to `lh`
  ([`mris2rgb/mris2rgb.cpp:245-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L245-L251)).

### Optional / Auxiliary Inputs

- **`-c <curv>`** curvature/overlay file to colour the surface.
- **`-coord <fname>` / `-canon <fname>`** canonical coordinate surfaces (required
  for spherical point marking and for parameterization rendering).
- **`-w <wfile>`** a `.w` value overlay (paint file) — triggers soap-bubble
  interpolation of the values.
- **`-l <label>`** a [[label-format|label]] file whose vertices are marked.
- **`-param`/`-nparam <mrisp>`** a surface parameterization (`.tif`/MRISP) to map
  onto the surface.
- **`-centroids <file> <color>`** an ASCII centroid list to mark.

### Input Assumptions

> [!assumption] FreeSurfer surface geometry; flats need the orig surface alongside
> Inputs are FreeSurfer binary surfaces. For flattened input (a `.flat`/`.patch`
> file, or with `-p`), the tool reads the matching `<hemi>.orig` from the same
> directory and then applies the patch ([`mris2rgb/mris2rgb.cpp:253-268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L253-L268)); a `.geo`
> name is treated as non-flat. The two-letter hemisphere prefix convention
> (`lh.`/`rh.`) is assumed for correct left/right view orientation.

## Outputs

### Files Created

For each surface and each enabled view, one image is written into the output
directory. File names encode the view and the surface (or `-o` stem):

| Mode | File pattern | Source |
|------|--------------|--------|
| SGI RGB (default) | `<outdir>/<view>.<name>.rgb` | [`mris2rgb/mris2rgb.cpp:450`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L450) etc. |
| TIFF (`-tiff`) | `<outdir>/<view>.<name>.tiff` | [`mris2rgb/mris2rgb.cpp:455`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L455) etc. |

where `<view>` is one of `lateral`, `medial`, `dorsal`, `ventral`, `posterior`,
`frontal` (flattened/patch output is labelled `lateral`), and `<name>` is the
surface base name, or `<hemi>.<stem>` when `-o <stem>` is given
([`mris2rgb/mris2rgb.cpp:290-291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L290-L291)).

### Output Specifications

- Default image size is **600 × 600** pixels (`frame_xdim`/`frame_ydim`),
  multiplied by `-s <scale>` if given.
- SGI `.rgb` files are 3-channel, written via `iopen`/`putrow`
  ([`mris2rgb/mris2rgb.cpp:1055-1078`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L1055-L1078)); pixels are read back from OpenGL as
  16-bit per channel.
- TIFF files are 8-bit RGB, contiguous, top-left origin
  ([`mris2rgb/mris2rgb.cpp:1080-1100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L1080-L1100)).

## Mathematical Foundations

`mris2rgb` is primarily a **rendering** program; its quantitative content is the
surface-property computation it can do before colouring:

- **Second fundamental form** for mean (`-mean`) and Gaussian (`-g`) curvature:
  `MRIScomputeSecondFundamentalForm` followed by `MRISuseMeanCurvature` /
  `MRISuseGaussianCurvature` ([`mris2rgb/mris2rgb.cpp:408-416`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L408-L416)).
- **Area errors** (`-e`): compares current metric properties against the
  `smoothwm` surface to colour areal distortion ([`mris2rgb/mris2rgb.cpp:417-428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L417-L428)).
- **Curvature normalisation** (`-n`) and zero-meaning (`-z`):
  `MRISnormalizeCurvature` / `MRISzeroMeanCurvature`.
- **Soap-bubble interpolation** of a sparse `.w` overlay (`-soap N`): iterative
  averaging of marked values over the surface neighbourhood
  ([`mris2rgb/mris2rgb.cpp:1232-1283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L1232-L1283)).

> [!math] Soap-bubble value spreading
> Vertices with overlay value above `pre_fthresh` are fixed; over `N` iterations
> every other unripped vertex is replaced by the mean of its already-marked
> neighbours once enough neighbours are set, smoothly filling sparse overlays
> across the surface.

> [!internal] View transforms, lighting, and the colour scale live in oglutil.cpp
> The per-view rigid rotations are applied with `glRotatef`, but the surface
> tessellation, lighting model, field-of-view selection (`OGLUsetFOV`),
> coordinate-line drawing (`OGLUsetCoordParms`), colour-slope compression, and the
> mapping of scalar values to colours are all in
> [`mris2rgb/oglutil.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/oglutil.cpp)
> (`OGLUcompile`, `OGLUinit`, `OGLUsetLightingModel`). This page documents the
> driver's flags; the rendered appearance is governed by that module.

## Configuration Options

### Complete Flag Reference

Enumerated from `get_option` ([`mris2rgb/mris2rgb.cpp:673-967`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L673-L967)). Long flags
are matched case-insensitively; the trailing single-letter flags are matched on
the **uppercase** of the first letter.

#### Views

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-lateral` | bool | on if no view set | Render the lateral view (default when no view flag is given). |
| `-medial`<br>`-m` | bool | off | Render the medial view (`-m` is the single-letter equivalent). |
| `-dorsal` | bool | off | Render the dorsal (top) view. |
| `-basal`<br>`-ventral` | bool | off | Render the ventral (bottom) view. |
| `-frontal`<br>`-anterior` | bool | off | Render the frontal (anterior) view. |
| `-posterior` | bool | off | Render the posterior view. |
| `-b` | bool | off | Render **both** medial and lateral views. |
| `-t` | bool | off | Apply the Talairach transform to the surface before rendering. |

#### Colouring and overlays

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c <curv>` | string | none | Curvature/overlay file used to colour the surface. |
| `-mean` | bool | off | Colour by mean curvature (computes 2nd fundamental form). |
| `-g` | bool | off | Colour by Gaussian curvature. |
| `-e` | bool | off | Colour by areal distortion vs the `smoothwm` surface. |
| `-n` | bool | off | Normalise the curvature before colouring. |
| `-z` | bool | off | Subtract the mean curvature (zero-mean) before colouring. |
| `-w <wfile>` | string | none | Load a `.w` value overlay and soap-bubble interpolate it. |
| `-soap <N>` | int | `0` | Number of soap-bubble interpolation iterations for the `.w` overlay. |
| `-cslope <s>` | float | `10.0` | Colour-slope compression factor (contrast of the value→colour map). |
| `-cscale` | bool | off | Draw the colour scale bar. |
| `-legend` | bool | off | Write the colour-scale legend. |
| `-param <mrisp>` | string | none | Map a surface parameterization onto the surface (needs `-canon`). |
| `-nparam <mrisp[#k]>` | string | none | Like `-param` but normalised; optional `#k` selects parameter index. |

#### Marking

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-l <label>` | string | — | Mark all vertices in a label file (each label gets a new colour). |
| `-v <vno>` | int | — | Mark vertex number `vno` (repeatable). |
| `-mark <color>` | int | `1` | Colour index used for the next `-l`/marked vertices. |
| `-tpoint <x> <y> <z>` | 3 floats | — | Mark the nearest vertex to a Talairach point (repeatable). |
| `-spoint <phi> <theta>` | 2 floats | — | Mark the nearest vertex to a spherical (canonical) coordinate; needs `-canon`. |
| `-centroids <file> <color>` | string,int | — | Mark vertices nearest to centroids listed in `<file>` (repeatable). |

#### Geometry / coordinates

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-coord <fname>` | string | none | Read canonical coordinate locations and draw coordinate lines. |
| `-canon <fname>` | string | none | Read the canonical coordinate system (required by `-param`/`-spoint`). |
| `-cparms <thick> <nlines>` | float,int | — | Coordinate-line thickness and number of lines. |
| `-p` | bool | off | Treat input as a flattened patch (read `<hemi>.orig` then the patch). |
| `-rescale <f>` | float | `1.0` | Recenter and scale the brain by factor `f` before rendering. |
| `-scale` / `-noscale` | bool | noscale on | Enable / disable automatic isotropic scaling to the window (`OGLUnoscale`). |
| `-fov <n>` | int | auto | Fixed field of view; if unset, chosen automatically (e.g. BIG/SMALL for flats). |
| `-s <scale>` | float | `1.0` | Multiply the 600×600 window size by `scale`. |
| `-a <deg>` | float | `0.0` | Add a constant angle offset to the view rotation. |
| `-x <deg>` | float | `0.0` | Extra rotation about the X axis. |
| `-y <deg>` | float | `0.0` | Extra rotation about the Y axis. |
| `-xtrans`/`-ytrans`/`-ztrans <t>` | float | `0.0` | View translation along X/Y/Z (see gotcha — Z/Y wiring). |

#### Rendering style and output

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-tp` | bool | off | Set the `TP_FLAG` render style. |
| `-bw` | bool | off | Black-and-white rendering (`BW_FLAG`). |
| `-neg` | bool | off | `NEG_FLAG` rendering. |
| `-noborder` | bool | off | `NOBORDER_FLAG` rendering. |
| `-mesh` | bool | off | Draw the surface mesh (`MESH_FLAG`). |
| `-light <v>` | float | `0.0` | Lighting level passed to `OGLUsetLightingModel`. |
| `-tiff` | bool | off | Write TIFF images instead of SGI `.rgb`. |
| `-o <stem>` | string | none | Output filename stem → `<hemi>.<stem>` in place of the surface name. |

#### Statistical / temporal overlay tuning

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-time` | bool | off | Process temporal information (`TIME_FLAG`); changes soap-bubble marking. |
| `-stan` | bool | off | Spatio-temporal analysis mode (`STAN_FLAG`). |
| `-lin` | bool | off | Linear-estimation mode (`LIN_FLAG`). |
| `-fthresh <v>` | float | global | Overlay display threshold. |
| `-pre_fthresh <v>` | float | global | Pre-threshold used by soap-bubble (which vertices are fixed). |
| `-fmid <v>` | float | global | Overlay colour midpoint. |
| `-fslope <v>` | float | global | Overlay colour slope. |
| `-t_fthresh <v>` | float | global | Temporal threshold. |

#### Help / version

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-u`, `-?` | bool | — | Print usage and exit. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] No view flag → lateral only
> If none of `-medial`, `-posterior`, `-ventral`, `-frontal`, `-dorsal` is set,
> `lateral_flag` is forced on ([`mris2rgb/mris2rgb.cpp:238-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L238-L240)). `-b` is a
> shortcut that sets both lateral and medial. Multiple view flags can be combined;
> each enabled view produces its own image file, and the display is cleared
> between views.

> [!gotcha] `-param`/`-nparam` and `-spoint` require `-canon`
> Mapping a parameterization aborts with "must specify canonical coordinate system
> (-canon …)" if no canonical surface is given
> ([`mris2rgb/mris2rgb.cpp:389-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L389-L392)); marking a spherical point likewise needs a
> canonical coordinate file ([`mris2rgb/mris2rgb.cpp:331-334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L331-L334)).

> [!gotcha] Curvature-source flags are last-wins
> `-mean`, `-g` (Gaussian), and `-e` (area errors) all set the single
> `curvature_flag`; if you pass more than one, only the last takes effect. A
> `-c <curv>` file is loaded independently and is then overwritten by whichever
> curvature computation `curvature_flag` selects.

> [!gotcha] Flat/patch detection can be implicit
> A surface whose name contains `.flat` or `.patch` is auto-treated as a flattened
> patch even without `-p`, while a `.geo` name is forced non-flat
> ([`mris2rgb/mris2rgb.cpp:253-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L253-L255)). Naming therefore changes how the input is read
> (orig + patch vs. plain surface).

> [!gotcha] `-ztrans` and `-y`/`-z` letter wiring
> The Z-translation handler assigns to `y_trans` (apparent copy-paste), and the
> single-letter `-z` is wired to zero-mean curvature, not a Z rotation (the Z
> rotation case is `#if 0`-disabled) ([`mris2rgb/mris2rgb.cpp:836-839`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L836-L839),
> [`:943-952`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L943-L952)). Use `-x`/`-y` for view rotation; do not rely on a Z
> rotation, and treat `-ztrans` with caution.

## Typical Use Cases

### Use Case 1: Snapshot the registered sphere coloured by sulc (morph_rgb)

```bash
setenv DISPLAY :0.0
mris2rgb -o subj1.reg -both -c $SUBJECTS_DIR/subj1/surf/lh.sulc \
  -canon $SUBJECTS_DIR/subj1/surf/lh.sphere.reg \
  $SUBJECTS_DIR/subj1/surf/lh.sphere.reg \
  $SUBJECTS_DIR/subj1/rgb
```

This is exactly what the shipped `morph_rgb-lh` script runs: medial+lateral views
of the registered sphere, coloured by `sulc`, written to the subject's `rgb/`
directory.

### Use Case 2: Lateral + medial curvature views as TIFFs

```bash
mris2rgb -b -tiff -c lh.curv /path/to/subj/surf/lh.inflated /tmp/out
# → /tmp/out/lateral.lh.inflated.tiff and /tmp/out/medial.lh.inflated.tiff
```

### Use Case 3: All six anatomical views of the white surface

```bash
mris2rgb -lateral -medial -dorsal -ventral -frontal -posterior \
  lh.white /tmp/views
```

### Use Case 4: Render a thresholded .w overlay with soap-bubble fill

```bash
mris2rgb -w lh.sig.w -soap 50 -fthresh 2 -fmid 3 \
  lh.inflated /tmp/sig
```

## Pipeline Context

`mris2rgb` is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] (verified
by grep). It is reached only through the optional `morph_rgb-lh`/`morph_rgb-rh`
visualisation scripts, which a user runs by hand after surface reconstruction to
build a registered-sphere snapshot gallery.

**Predecessor:** surface reconstruction / registration producing `lh.sphere.reg`,
curvature, overlays → **mris2rgb** → **Successor:** the `.rgb`/`.tiff` images
(viewed or assembled into a QC montage). For interactive viewing instead,
[[wiki/tools/freeview|freeview]] or [[tksurfer]].

## Gotchas and Caveats

> [!gotcha] Output is SGI .rgb by default — an old format
> Unless `-tiff` is given, output is the SGI RGB image format
> ([`mris2rgb/mris2rgb.cpp:1062-1066`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L1062-L1066)), which most modern image viewers do not
> read directly. Prefer `-tiff` for portability.

> [!gotcha] Hemisphere is guessed from the filename
> Left/right view orientation depends on the two characters before the first dot
> in the surface filename; a non-standard name defaults to `lh` and may flip the
> lateral/medial assignment ([`mris2rgb/mris2rgb.cpp:245-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L245-L251)).

> [!gotcha] `-e` (area errors) silently depends on `smoothwm`
> The area-error colouring reads a `smoothwm` surface for comparison
> ([`mris2rgb/mris2rgb.cpp:421`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L421)); it must exist in the same location as the
> input surface.

## Error Compensation and Guard Rails

- **Display/GLX checks:** start-up aborts clearly if no X display or no GLX
  extension is present ([`mris2rgb/mris2rgb.cpp:1032-1042`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L1032-L1042)).
- **Read failures:** missing surfaces, patches, labels, overlays, parameterization
  files, or canonical coordinates all `ErrorExit` rather than rendering garbage.
- **Bounds clamping:** marked-vertex and label lists are clamped to the
  `MAX_MARKED` (20000) / `MAX_POINTS` (100) limits to avoid overflow
  ([`mris2rgb/mris2rgb.cpp:876-877`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L876-L877)).
- **Auto field-of-view** for flats: if `-fov` is unset, a BIG or SMALL FOV is
  chosen from the fraction of un-ripped vertices ([`mris2rgb/mris2rgb.cpp:365-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp#L365-L377)).

## Related Tools

- [[wiki/tools/freeview|freeview]] — the modern interactive surface viewer and
  screenshot tool that supersedes `mris2rgb` for visualisation.
- [[tksurfer]] — the legacy interactive surface viewer; `mris2rgb` is its batch,
  fixed-viewpoint counterpart.
- [[mris_convert]] — convert surfaces/overlays between formats before rendering.
- [[mris_curvature]] — compute the curvature maps that `mris2rgb` can colour by.
- [[mris_flatten]] — produces the flattened patches that `mris2rgb` can render
  (with auto `.flat`/`.patch` detection).
- [[surface-representations]] / [[curv-format]] — background on the surface and
  curvature inputs.

## Confidence and Gaps

**Medium confidence.** The full flag set (views, colouring, marking, geometry,
render style, statistical-overlay tuning), the output naming, the default 600×600
size, the SGI-vs-TIFF choice, and the flat/patch auto-detection were all read
directly from the parser and the I/O routines. Confidence is not "high" because
the program requires a live X11/OpenGL display and could not be run headless in
this environment, and because the rendered appearance of the statistical/temporal
modes lives in `oglutil.cpp`.

> [!gap] Not executed
> Requires X11 + GLX; no headless run was possible, so all flag descriptions come
> from the source, not from observed output.

> [!gap] Statistical/temporal render semantics
> `-time`, `-stan`, `-lin`, `-cscale`, `-legend`, and the `-fthresh`/`-fmid`/
> `-fslope` family steer `OGLUcompile` and the colour scale in
> [`mris2rgb/oglutil.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/oglutil.cpp);
> their exact visual effect was not rendered and is inferred from the flag names
> and the code paths.

## References

- FreeSurfer source: [`mris2rgb/mris2rgb.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/mris2rgb.cpp) and [`mris2rgb/oglutil.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris2rgb/oglutil.cpp) (v8.2.0).
- Shipped usage example: [`scripts/morph_rgb-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh) / [`scripts/morph_rgb-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh).
