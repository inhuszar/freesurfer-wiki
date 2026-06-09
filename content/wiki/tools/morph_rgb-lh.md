---
title: "morph_rgb-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_rgb-lh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mris2rgb]]"
  - "[[morph_rgb-rh]]"
  - "[[morph_subject-lh]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - visualization
  - rgb
  - rendering
  - legacy
---

# morph_rgb-lh

## Summary

`morph_rgb-lh` renders snapshot images of a subject's **registered left-hemisphere
spherical surface** to RGB (or TIFF) image files. It is a thin wrapper around
[[mris2rgb]]: it sets the X display, makes an output `rgb/` directory under the
subject, and runs a single `mris2rgb` command that paints the sulcal-depth map
(`lh.sulc`) onto the registered sphere (`lh.sphere.reg`) from both lateral and
medial views. It is the left-hemisphere member of the legacy `morph_rgb` family,
historically run after [[morph_subject-lh]] to produce QC/figure images of the
spherical registration.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/morph_rgb-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_rgb-lh`
- **FreeSurfer tools invoked:**
  [`mris2rgb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L49-L52)
  (the surface-to-RGB renderer).

## Purpose and Context

The `morph_*` morphometry workflow produces a registered spherical surface; this
script makes the **visual** product — RGB images of that surface coloured by
sulcal depth — for quality control or figures. It is a **legacy** helper: in
modern FreeSurfer the same snapshots are produced interactively with
[[wiki/tools/freeview|freeview]] or scripted via `freeview` screenshots, and the
old `.rgb`/SGI-RGB raster format is largely obsolete. The script is **not invoked
by `recon-all`**; the chaining call from [[morph_subject-lh]] that would have run
it is commented out
([`scripts/morph_subject-lh:74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L74)),
so it is now a manual step.

## Inputs

### Required Inputs

- **Subject ID** — single positional argument (`$1`), required; otherwise the
  script prints usage and exits 1
  ([`scripts/morph_rgb-lh:23-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L23-L26)).
- **An existing subject directory** `$SUBJECTS_DIR/<subjid>`, checked for
  existence
  ([`scripts/morph_rgb-lh:30-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L30-L33)).
- **`surf/lh.sulc`** — the sulcal-depth overlay (`-c` curvature/overlay argument).
- **`surf/lh.sphere.reg`** — the registered sphere, used **both** as the canonical
  surface (`-canon`) and as the surface to render.

### Input Assumptions

> [!assumption] Requires the morph pipeline's output and an X display
> The script assumes [[morph_subject-lh]] (or `recon-all`) has already produced
> `lh.sphere.reg` and that `lh.sulc` exists; these are not individually checked.
> It also assumes a usable X server — it hard-codes `setenv DISPLAY :0.0`
> ([`scripts/morph_rgb-lh:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L44)),
> because `mris2rgb` renders through OpenGL/X.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| RGB/TIFF snapshot images | `$SUBJECTS_DIR/<subjid>/rgb/` | rendered views of `lh.sphere.reg` coloured by `lh.sulc`, named from the `-o $1.reg` output stem; `-both` requests both hemispheric (lateral + medial) views. The `rgb/` directory is created with `mkdir -p` ([`scripts/morph_rgb-lh:45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L45)). |

It also appends a provenance block to `$SUBJECTS_DIR/<subjid>/NOTES`
([`scripts/morph_rgb-lh:35-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L35-L42)).

The exact filenames, image dimensions, and view set are determined entirely by
[[mris2rgb]] — see that page for the naming scheme and the `-tiff` option.

## Mathematical Foundations

None of its own — `morph_rgb-lh` only assembles a command line. All rendering
(surface projection, lighting, colour mapping of the curvature/sulc overlay) is
performed by [[mris2rgb]].

## Configuration Options

### Complete Flag Reference

`morph_rgb-lh` takes **no option flags** — only a single positional subject ID.
The hemisphere is hard-coded to `lh`. The `mris2rgb` options are fixed inside the
script.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `subjectid` | string (positional, required) | — | FreeSurfer subject ID under `$SUBJECTS_DIR`. Exactly one argument is required ([`scripts/morph_rgb-lh:23-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L23-L26)). |

The fixed `mris2rgb` invocation
([`scripts/morph_rgb-lh:49-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L49-L52))
is:

```bash
mris2rgb -o <subj>.reg -both -c <subj>/surf/lh.sulc \
  -canon <subj>/surf/lh.sphere.reg \
  <subj>/surf/lh.sphere.reg \
  <subj>/rgb
```

- `-o <subj>.reg` — output filename stem.
- `-both` — render both views (lateral and medial).
- `-c …/lh.sulc` — colour the surface by the sulcal-depth map.
- `-canon …/lh.sphere.reg` — use the registered sphere as the canonical surface.

To write TIFFs instead of `.rgb` rasters you would add `-tiff` to the `mris2rgb`
line — the script notes this in a comment
([`scripts/morph_rgb-lh:47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L47))
but does **not** expose it as an option; you must edit the script or call
[[mris2rgb]] directly.

### Configuration Interactions

None at the script level (no flags). The one hard-coded environmental coupling is
the display:

> [!gotcha] `DISPLAY` is forced to `:0.0`
> The script overrides whatever display you have with `setenv DISPLAY :0.0`
> ([`scripts/morph_rgb-lh:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L44)).
> On a headless machine, over SSH without X forwarding, or where display `:0.0`
> is not yours, `mris2rgb` will fail to open a rendering context. Use a virtual
> framebuffer (e.g. `Xvfb :0`) or run `mris2rgb` directly with the correct
> display.

## Typical Use Cases

### Use Case 1: Render the left registered sphere after morphing

```bash
export SUBJECTS_DIR=/data/subjects
morph_subject-lh bert       # produces lh.sphere.reg
morph_rgb-lh bert           # writes RGB views into $SUBJECTS_DIR/bert/rgb/
```

### Use Case 2: Headless rendering with a virtual framebuffer

```bash
Xvfb :0 -screen 0 1280x1024x24 &
morph_rgb-lh bert           # uses the forced DISPLAY :0.0
```

## Pipeline Context

Leaf of the legacy `morph_rgb` visualization family; **not** part of the
`recon-all` stream.

**Predecessor:** [[morph_subject-lh]] (produces `lh.sphere.reg`) → **This tool**
→ **internally:** [[mris2rgb]] → `.rgb`/TIFF images in `rgb/`.

## Gotchas and Caveats

> [!gotcha] Obsolete output format
> `mris2rgb` writes the legacy SGI `.rgb` raster format by default. Most modern
> viewers cannot open it directly; convert with ImageMagick, or use `-tiff`, or
> prefer [[wiki/tools/freeview|freeview]] screenshots.

> [!gotcha] "SUCCESSUFLLY" typo in the success message
> The completion banner is misspelled in the source
> ([`scripts/morph_rgb-lh:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L64));
> harmless, but do not grep logs for "SUCCESSFULLY".

## Error Compensation and Guard Rails

- **Argument-count check** (exactly one) and **subject-directory existence
  check** ([`scripts/morph_rgb-lh:23-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L23-L33)).
- **`mkdir -p rgb`** so the output directory always exists
  ([`scripts/morph_rgb-lh:45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L45)).
- **`mris2rgb` exit-status check** — if the renderer fails the script prints an
  error and exits 1
  ([`scripts/morph_rgb-lh:59-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh#L59-L62)).
- No check that `lh.sulc` / `lh.sphere.reg` exist (failure surfaces only when
  `mris2rgb` runs).

## Related Tools

- [[mris2rgb]] — the surface-to-RGB renderer this script wraps; all image output
  and options are defined there.
- [[morph_rgb-rh]] — the right-hemisphere twin (identical except hemi).
- [[morph_subject-lh]] — produces the `lh.sphere.reg` that this script renders;
  historically chained to call `morph_rgb-lh` (now commented out).
- [[wiki/tools/freeview|freeview]] — the modern replacement for generating surface
  snapshots.

## Confidence and Gaps

**High confidence:** the fixed `mris2rgb` command line, the forced display, the
argument/subject checks, the exit-status check, and the `-tiff` comment — all read
directly from
[`scripts/morph_rgb-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh).
Output filenames and view geometry are owned by [[mris2rgb]].

## References

- FreeSurfer source: [`scripts/morph_rgb-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-lh) (v8.2.0).
- Rendering tool: [[mris2rgb]].
