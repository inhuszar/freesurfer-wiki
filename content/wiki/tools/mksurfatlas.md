---
title: "mksurfatlas"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/mksurfatlas"
families: []                     # surface-registration atlas builder
recon_all_stage: null
related:
  - "[[mris_make_template]]"
  - "[[mris_register]]"
  - "[[mris_ca_train]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Help explicitly states the program is untested and unsupported; behaviour is documented from the source, not from a run."
tags:
  - atlas
  - surface-registration
  - template
  - tif
---

# mksurfatlas

## Summary

`mksurfatlas` is a small csh wrapper that builds a **surface-registration
atlas** — a `.tif` template file — by running [[mris_make_template]] over a set
of subjects. The atlas it produces is the target you register an individual
subject's spherical surface against (with [[mris_register]]) to bring per-vertex
data into a common surface space. Its intended use is to create a *custom*
registration target keyed to some per-vertex overlay (e.g. an fMRI map saved as
`?h.func.mgh`) rather than the standard folding-based atlas: you give it a
hemisphere, a surface overlay name (`--v`), a registration surface (`--r`), and
one or more subjects, and it emits the `.tif`. The built-in help bluntly warns
that the program is **not tested or supported**, so treat it as experimental.

## Source Information

- **Language:** csh shell script (original author: Doug Greve)
- **Source file:** [`scripts/mksurfatlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas)
- **Binary/script location:** `$FREESURFER_HOME/bin/mksurfatlas`
- **FreeSurfer tool invoked:** [`mris_make_template`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L66-L68) (exactly once).

## Purpose and Context

FreeSurfer aligns cortical surfaces across subjects by registering each
subject's sphere to a **template atlas** (a `.tif` file such as the distributed
`?h.average.curvature.filled.buckner40.tif`). [[mris_register]] performs that
registration; [[mris_make_template]] builds the template. `mksurfatlas` is a thin
convenience front-end for the *build* side, aimed at making an atlas based on an
arbitrary per-vertex overlay instead of (or in addition to) folding geometry.

The motivating example in the help is a **functional** atlas
([`scripts/mksurfatlas#L248-L291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L248-L291)): map each subject's fMRI result to the surface as
`?h.func.mgh`, build an initial atlas from one reference subject, register
everyone to it to get an initial registration surface, then rebuild the atlas
from all subjects and register again — the standard iterative atlas/registration
refinement loop.

It is a **developer / experimental** tool, run by hand. It is *not* part of
`recon-all`, which uses the pre-built distributed folding atlas. It is distinct
from the parcellation-atlas builders [[mris_ca_train]] / [[train-gcs-atlas]]
(those make a `.gcs` classifier used by [[mris_ca_label]]); `mksurfatlas` makes a
`.tif` *registration target* used by [[mris_register]].

> [!gotcha] Unsupported / untested
> The help opens with: "This program has not been tested, is not supported, and
> you should not use it." ([`scripts/mksurfatlas#L241-L242`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L241-L242)). The documented
> workflow nonetheless reflects the real intended use; proceed with caution and
> verify outputs.

## Inputs

### Required Inputs

- **Atlas output path** — `--a <file.tif>`; the result is written here
  ([`scripts/mksurfatlas#L89-L92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L89-L92), required at [`scripts/mksurfatlas#L164-L167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L164-L167)).
- **Hemisphere** — `--h`/`--hemi <hemi>` (required,
  [`scripts/mksurfatlas#L172-L175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L172-L175)).
- **One or more subjects** — `--s <subject>` (repeatable) and/or `--sf <file>`
  (one per line); at least one required ([`scripts/mksurfatlas#L176-L179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L176-L179)).
- **A per-vertex overlay name** — `--v <surfval>`; for each subject the script
  expects `<subject>/<surfvaldir>/<hemi>.<surfval>` (default `surfvaldir =
  label`).

For every subject the script checks that the registration surface
`surf/<hemi>.<regsurf>` (default `sphere.reg`) exists
([`scripts/mksurfatlas#L185-L189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L185-L189)).

### Input Assumptions

> [!assumption] Subjects share a registration surface and carry the named overlay
> Each subject is assumed to have a spherical registration surface
> (`?h.sphere.reg` by default, or whatever `--r` names) and the overlay
> `<surfvaldir>/<hemi>.<surfval>`. The overlay is what the atlas encodes, so all
> subjects' overlays must be the same quantity (e.g. all `func.mgh`).

## Outputs

### Files Created

| File | Where | Produced by | Contents |
|------|-------|-------------|----------|
| `<atlas>.tif` | the path given to `--a` | [[mris_make_template]] | the surface-registration template atlas ([[surface-format]]) |

### Output Specifications

The `.tif` is FreeSurfer's binary surface-template format consumed by
[[mris_register]]. The atlas is built with the `aparc` annotation and a single
overlay channel smoothed by a fixed **10** steps (`nsmooth = 10`,
[`scripts/mksurfatlas#L65-L68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L65-L68)). Rotation is disabled (`-norot`).

## Mathematical Foundations

None in the wrapper itself.

> [!internal] Template construction is in `mris_make_template`
> The averaging of the per-vertex overlay into a registration template, and the
> spherical-coordinate representation it produces, are implemented in
> [[mris_make_template]]; [[mris_register]] later minimises the mismatch between a
> subject's overlay and this template to compute the registration. The fixed
> 10-step smoothing applied here sets the spatial scale of the template's overlay
> channel.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/mksurfatlas#L81-L157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L81-L157)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--a` | string | *(required)* | Output atlas `.tif` path. Refuses to overwrite an existing file unless `--force` is given. |
| `--h`<br>`--hemi` | string | *(required)* | Hemisphere (`lh`/`rh`). |
| `--s` | string (repeatable) | — | Add a subject to the atlas. |
| `--sf` | string | — | Read additional subjects from a file (one per line); the file must exist. |
| `--v` | string | — | Per-vertex overlay base name; looked up at `<subject>/<surfvaldir>/<hemi>.<surfval>`. |
| `--d` | string | `label` | Directory under each subject holding the overlay (`surfvaldir`). |
| `--r` | string | `sphere.reg` | Registration surface (`surf/<hemi>.<regsurf>`) passed to [[mris_make_template]]. |
| `--force` | bool | off | Delete an existing output atlas and rebuild. |
| `--tmpdir` | string | — | Set a temp dir; also disables cleanup (cleanup is a no-op). |
| `--nocleanup` | bool | — | Do not clean up temp files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

The fixed [[mris_make_template]] command it builds is
([`scripts/mksurfatlas#L66-L68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L66-L68)):

```
mris_make_template -norot -annot aparc \
  -overlay <surfval> 10 -overlay-dir <surfvaldir> \
  <hemi> <regsurf> <subjects> <atlas>
```

> [!gotcha] `--r` help text understates the default
> The usage line says the `--r` default is `sphere`
> ([`scripts/mksurfatlas#L223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L223)), but the variable is actually initialised to
> `sphere.reg` ([`scripts/mksurfatlas#L31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L31)). Code is authoritative: the default
> registration surface is `?h.sphere.reg`.

### Configuration Interactions

> [!gotcha] Existing-atlas guard vs `--force`
> Without `--force`, an existing `--a` target makes the script exit with "…
> exists. Delete, rename, or run with -force" ([`scripts/mksurfatlas#L168-L171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L168-L171)).
> With `--force` it `rm -f`s the file first ([`scripts/mksurfatlas#L63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L63)) and
> rebuilds.

> [!gotcha] The overlay existence check is buggy (tests the wrong file)
> When validating each subject, the script computes the overlay path
> `sv = $SUBJECTS_DIR/$subject/$surfvaldir/$hemi.$surfval` but then re-tests
> `-e $sr` (the registration surface) instead of `-e $sv`
> ([`scripts/mksurfatlas#L190-L194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L190-L194)). A missing overlay therefore slips past this
> check and only fails later inside [[mris_make_template]]. Code is authoritative;
> do not rely on `mksurfatlas` to catch a missing `--v` file up front.

- `--s` and `--sf` are additive — you may combine explicit subjects with a list
  file; both accumulate into the subject list.
- `--d` and `--v` together define the overlay location; change `--d` when the
  overlay lives somewhere other than `label/` (e.g. `--d func` for `func.mgh`).

## Typical Use Cases

(From the help's functional-atlas workflow, [`scripts/mksurfatlas#L248-L291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L248-L291).)

### 1. Build an initial atlas from a single reference subject

```bash
mksurfatlas --a lh.func.atlas.init.tif --h lh --v func.mgh \
  --r sphere.reg --s refsubject
```

### 2. Build the final atlas from all subjects

```bash
mksurfatlas --a lh.func.atlas.tif --h lh --v func.mgh \
  --r $hemi.funcreg.init --s subject1 --s subject2 --s ...
```

These atlases are then used as the target argument to [[mris_register]] to create
per-subject registration surfaces (`?h.funcreg.init`, then `?h.funcreg`).

## Pipeline Context

A stand-alone, experimental **surface-registration-atlas builder**. It is **not**
part of [[wiki/pipelines/recon-all|recon-all]] (which uses the distributed
folding atlas).

**Predecessor:** per-subject surfaces from `recon-all` (sphere/`sphere.reg`) plus
a per-vertex overlay (e.g. an fMRI map mapped to the surface) →
**mksurfatlas** (→ [[mris_make_template]]) → **Successor:** [[mris_register]],
which registers each subject to the new `.tif` to produce a custom registration
surface that can be used in place of `?h.sphere`.

## Gotchas and Caveats

> [!gotcha] Hard-coded smoothing and annotation
> The wrapper always passes `-annot aparc` and `-overlay … 10` (10 smoothing
> steps) to [[mris_make_template]] ([`scripts/mksurfatlas#L66-L68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L66-L68)); neither is
> configurable from `mksurfatlas`. To change them, call [[mris_make_template]]
> directly.

> [!gotcha] No iteration logic — you drive the refinement loop
> `mksurfatlas` builds **one** atlas per call. The init→register→rebuild→register
> refinement in the help is something you orchestrate yourself by alternating
> `mksurfatlas` and [[mris_register]] runs.

## Error Compensation and Guard Rails

- **Required-argument checks** for `--a`, `--h`, and at least one subject, plus a
  per-subject check that the registration surface exists
  ([`scripts/mksurfatlas#L163-L195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L163-L195)).
- **Overwrite guard** on the output atlas unless `--force`
  ([`scripts/mksurfatlas#L168-L171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L168-L171)).
- **Fail-fast** on the [[mris_make_template]] return status
  ([`scripts/mksurfatlas#L71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L71)).
- *Caveat:* the overlay-file check is ineffective (tests the registration surface
  twice — see gotcha above), so a missing overlay is not caught early.

## Known Bugs

- [[00168]] — the per-subject overlay existence check tests the registration surface (`$sr`) instead of the `--v` overlay (`$sv`), so a missing overlay is not caught early.

## Related Tools

- [[mris_make_template]] — the binary this script runs to build the `.tif` atlas.
- [[mris_register]] — registers a subject's surface to the atlas this script produces.
- [[mris_ca_train]] — a different kind of surface atlas (`.gcs` parcellation classifier), for contrast.
- [[train-gcs-atlas]] — wrapper for building the `.gcs` parcellation atlas (not a `.tif` registration target).
- [[surface-format]] — FreeSurfer surface/template file formats.

## Confidence and Gaps

**High confidence:** the full flag set and defaults, the single fixed
[[mris_make_template]] command (with `-norot -annot aparc -overlay … 10`), the
overwrite/required-argument guards, and the two source bugs (the `--r` default
mismatch and the overlay-check testing the wrong file) — all read directly from
[`scripts/mksurfatlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas).

> [!gap] Unsupported program
> The help states the tool is untested and unsupported; the page describes its
> behaviour from the source, not from execution. The `.tif` it emits should be
> validated against [[mris_register]] before use.

## References

- FreeSurfer source: [`scripts/mksurfatlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas) (v8.2.0, original author Doug Greve).
- Built-in help: `mksurfatlas --help` (the `BEGINHELP` block, [`scripts/mksurfatlas#L239-L291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mksurfatlas#L239-L291)).
- Fischl B. et al., *High-resolution intersubject averaging and a coordinate system for the cortical surface*, Human Brain Mapping 8(4):272–284, 1999 — the spherical surface-registration framework underlying `mris_make_template`/`mris_register`.
