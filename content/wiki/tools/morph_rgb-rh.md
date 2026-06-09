---
title: "morph_rgb-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_rgb-rh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mris2rgb]]"
  - "[[morph_rgb-lh]]"
  - "[[morph_subject-rh]]"
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

# morph_rgb-rh

## Summary

`morph_rgb-rh` renders snapshot images of a subject's **registered right-hemisphere
spherical surface** to RGB (or TIFF) files via [[mris2rgb]]. It is the
right-hemisphere twin of [[morph_rgb-lh]] and is identical to it apart from the
hemisphere (`set hemi = rh`,
[`scripts/morph_rgb-rh:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L20)).
**See [[morph_rgb-lh]] for the complete documentation.**

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/morph_rgb-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_rgb-rh`
- **FreeSurfer tools invoked:**
  [`mris2rgb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L48-L51).

## Purpose and Context

Identical in role to [[morph_rgb-lh]] but for the right hemisphere: it paints
`rh.sulc` onto the registered sphere `rh.sphere.reg` and renders both views to
the subject's `rgb/` directory. It is a **legacy** QC/figure helper, **not part of
`recon-all`**, normally run after [[morph_subject-rh]] (the chaining call in that
script is commented out). See [[morph_rgb-lh]] § *Purpose and Context*.

## Fixed Behaviour and Hemisphere-Specific Details

The script hard-codes the right hemisphere, forces `setenv DISPLAY :0.0`
([`scripts/morph_rgb-rh:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L43)),
`mkdir -p`s the `rgb/` directory, and runs the fixed command
([`scripts/morph_rgb-rh:48-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L48-L51)):

```bash
mris2rgb -o <subj>.reg -both -c <subj>/surf/rh.sulc \
  -canon <subj>/surf/rh.sphere.reg \
  <subj>/surf/rh.sphere.reg \
  <subj>/rgb
```

It takes a **single positional subject ID** (required, validated at
[`scripts/morph_rgb-rh:22-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L22-L25)),
checks the subject directory exists
([`:29-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L29-L32)),
appends provenance to `NOTES`, checks the `mris2rgb` exit status
([`:58-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L58-L61)),
and exposes **no option flags**.

> [!gotcha] Forced `DISPLAY :0.0`; legacy `.rgb` output; "SUCCESSUFLLY" typo
> As in the lh twin, the script overrides `DISPLAY` to `:0.0` (needs an X server
> / `Xvfb`), `mris2rgb` writes the obsolete SGI `.rgb` raster by default (add
> `-tiff` or use [[wiki/tools/freeview|freeview]]), and the success banner is
> misspelled ([`scripts/morph_rgb-rh:63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh#L63)).
> See [[morph_rgb-lh]] for details.

## Typical Use Cases

```bash
export SUBJECTS_DIR=/data/subjects
morph_subject-rh bert       # produces rh.sphere.reg
morph_rgb-rh bert           # writes RGB views into $SUBJECTS_DIR/bert/rgb/
```

## Pipeline Context

Leaf of the legacy `morph_rgb` family; **not** in the `recon-all` stream.

**Predecessor:** [[morph_subject-rh]] (produces `rh.sphere.reg`) → **This tool** →
**internally:** [[mris2rgb]] → `.rgb`/TIFF images.

## Related Tools

- [[morph_rgb-lh]] — the left-hemisphere twin; **canonical documentation**.
- [[mris2rgb]] — the surface-to-RGB renderer this script wraps.
- [[morph_subject-rh]] — produces the `rh.sphere.reg` rendered here.
- [[wiki/tools/freeview|freeview]] — modern replacement for surface snapshots.

## Confidence and Gaps

**High confidence.** This page documents only the hemisphere delta against
[[morph_rgb-lh]]; the scripts are identical apart from the hemisphere. All details
read directly from
[`scripts/morph_rgb-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh).

## References

- FreeSurfer source: [`scripts/morph_rgb-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_rgb-rh) (v8.2.0).
- Full behaviour and rendering options: see [[morph_rgb-lh]] and [[mris2rgb]].
